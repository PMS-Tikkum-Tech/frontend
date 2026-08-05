# KIKOST authentication migration runbook

Dokumen ini memisahkan perubahan yang aman di repository dari tindakan eksternal
yang memerlukan data produksi, akses DNS/control panel, atau persetujuan eksplisit.

## Arsitektur dan urutan deployment

1. Backup database dan catat jumlah user per kategori tanpa mengekspor email.
2. Deploy migration `password_setup_required`, `session_version`, reset-token
   hash, case-insensitive email index, serta `public_id` katalog.
3. Deploy Rails login/password reset dan validasi cookie. Jangan hapus
   `user_auth_identities` atau UID lama.
4. Kirim kampanye setup password hanya ke email terverifikasi akun yang
   `password_setup_required=true`; jangan membuat password sementara.
5. Deploy frontend email/password. Pantau login berhasil/gagal, reset delivery,
   dan jumlah akun yang masih membutuhkan setup.
6. Endpoint auth lama tetap `410 Gone` selama satu release observasi. Pantau
   hit rate per versi client tanpa mencatat token atau email mentah.
7. Setelah nol client lama dalam periode yang disetujui, hapus route transisi.
8. Inventaris project authentication lama: Authentication, Firestore, Storage,
   Realtime Database, Analytics, App Check, Cloud Messaging, Functions, dan
   integrasi aplikasi lain. Simpan bukti inventory dan backup yang relevan.
9. Hanya setelah inventory bersih dan pemilik sistem menyetujui: revoke service
   credential/API key yang tidak dipakai, nonaktifkan provider auth, lalu
   pertimbangkan penghapusan project. Repository ini tidak menjalankan langkah 9.

Query agregat yang boleh dijalankan operator pada replica/read-only production:

```sql
SELECT COUNT(*) AS users_total FROM users;
SELECT password_setup_required, COUNT(*) FROM users GROUP BY 1;
SELECT provider, COUNT(*) FROM user_auth_identities GROUP BY 1;
SELECT COUNT(*) FROM users WHERE password_digest IS NULL OR password_digest = '';
```

Jangan mencetak baris user/email. `password_digest` yang terisi tidak membuktikan
password diketahui pengguna; akun hasil passwordless lama tetap harus memperoleh
setup link.

## Environment production

Wajib: `SECRET_KEY_BASE`, `JWT_SECRET_KEY`, `FRONTEND_URL`, `CORS_ORIGINS`,
`AUTH_COOKIE_DOMAIN`, `REDIS_URL`, `MAIL_FROM`, `SMTP_ADDRESS`, `SMTP_USERNAME`,
`SMTP_PASSWORD`. Opsional sesuai provider: `SMTP_PORT`, `SMTP_DOMAIN`,
`SMTP_AUTHENTICATION`, `SMTP_SSL`, `SMTP_ENABLE_STARTTLS_AUTO`.

Setelah langkah observasi selesai, hapus dari secret manager/deployment frontend
semua `NEXT_PUBLIC_FIREBASE_*`, alias phone Firebase, dan Google OAuth client ID.
Hapus dari backend `FIREBASE_PROJECT_ID`, service-account credential terkait, dan
`GOOGLE_OAUTH_CLIENT_IDS` setelah dipastikan tidak dipakai aplikasi lain. Jangan
menyalin nilai secret ke tiket atau log.

## DNS dan provider manual

Nilai persis SPF/DKIM/CAA harus berasal dari provider aktif; jangan mengarang
selector atau CA.

| Type | Host | Value | TTL | Tujuan / verifikasi |
|---|---|---|---:|---|
| A/AAAA/CNAME | `www` | target frontend resmi | 300 | arahkan ke router frontend |
| HTTP router | `www.kikost.com` | redirect 308 ke `https://kikost.com` | n/a | pertahankan path/query; uji loop |
| TLS | `www.kikost.com` | sertifikat ACME valid | n/a | `openssl s_client -connect www.kikost.com:443 -servername www.kikost.com` |
| TXT | `@` | SPF yang diberikan SMTP provider | 300 | `dig +short TXT kikost.com` |
| TXT/CNAME | selector provider | DKIM yang diberikan provider | 300 | verifikasi di control panel provider |
| TXT | `_dmarc` | mulai `v=DMARC1; p=none; ...` dengan mailbox laporan yang disetujui | 300 | pantau, lalu naikkan `quarantine`, kemudian `reject` |
| DS | registrar/parent | hasil enable DNSSEC dari DNS provider | provider | `dig +dnssec kikost.com` |
| CAA | `@` | CA yang benar-benar menerbitkan sertifikat | 300 | uji renewal sebelum memperketat |

Jika domain tidak menerima email, pilih Null MX (`MX 0 .`), SPF
`v=spf1 -all`, dan DMARC `p=reject`; jangan terapkan bila sistem mengirim atau
menerima email melalui domain tersebut.

Jangan aktifkan HSTS `includeSubDomains`/`preload` sampai `www`, API, booking,
app, dashboard, dan seluruh subdomain lain memiliki HTTPS valid. Rollback DNS:
turunkan TTL lebih dulu, simpan record lama, dan kembalikan router/record lama
bila health check atau ACME renewal gagal.

## CSP dan security.txt

CSP frontend dimulai sebagai `Content-Security-Policy-Report-Only`. Kumpulkan
violation tanpa URL/token sensitif, tambahkan nonce untuk script Next.js, lalu
enforce hanya setelah report bersih. Allowlist auth lama tidak boleh dikembalikan.

`/.well-known/security.txt` belum dibuat karena alamat Contact dan URL Policy
belum ditentukan dan tidak boleh dikarang. Pemilik harus menyetujui:

- mailbox keamanan atau URL disclosure yang dipantau;
- URL policy publik;
- tanggal `Expires` maksimal satu tahun;
- canonical URL `https://kikost.com/.well-known/security.txt`;
- `Preferred-Languages: id, en` bila tim mampu melayani keduanya.

## Rollback

- Rollback frontend ke versi sebelumnya hanya bila endpoint lama masih dalam
  jendela `410`/compatibility yang disepakati; jangan mengembalikan token browser
  atau OTP debug.
- Migration awal tidak menghapus UID/identity. Rollback kolom public ID/reset
  hanya setelah memastikan tidak ada release baru yang memakainya.
- Rate limits boleh dituning, tidak dinonaktifkan. Pastikan Redis sehat.
- Jika email delivery gagal, rollback konfigurasi SMTP/provider; response publik
  harus tetap generik.
- Jangan menghapus project/provider eksternal sebagai bagian rollback otomatis.
