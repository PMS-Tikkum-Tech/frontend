# Laporan Security KIKOST — 21 Agustus 2026

## Ringkasan eksekutif

Security production telah diperketat pada aplikasi, domain, VPS, Coolify,
database, backup, dan autentikasi email. Seluruh domain publik dan API sehat
setelah deployment, reboot, upgrade platform, dan aktivasi firewall.

Status saat laporan dibuat: **layak deploy/operasional dengan risiko residual
yang terdokumentasi**, bukan jaminan bahwa sistem 100% bebas risiko.

## Perubahan aplikasi

Frontend:

- Menambahkan canonical domain routing dan redirect aman antar-domain.
- Mengaktifkan CSP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, Referrer Policy, Permissions Policy, dan
  Cross-Origin Opener Policy.
- Production build menolak API URL atau site URL yang tidak memakai domain
  resmi KIKOST.
- Menghapus modul registrasi Firebase lama yang menyimpan password mentah di
  `sessionStorage`/`localStorage` hingga 24 jam.
- Commit security yang sudah dikirim ke branch `Production`:
  - `8b91250` — Harden production domain routing and headers
  - `1bd5e07` — Remove legacy client-side password storage

Backend:

- CORS hanya mengizinkan origin resmi secara exact match.
- Origin tidak dikenal ditolak dan tidak memperoleh header izin CORS.
- HTTPS, host authorization, security headers, secure cookie, dan pembatasan
  respons token production telah diterapkan.
- Rate limit tersedia untuk login, refresh token, OTP/email, reset/change
  password, pembayaran, dan mutasi kritis.
- Commit security: `70f17e4` — Harden production origins and HTTPS.

## VPS dan Coolify

- Membuat snapshot VPS manual sebelum perubahan; backup VPS harian Hostinger
  tetap aktif dan tersimpan terpisah dari VPS.
- Menginstal seluruh patch OS yang tersedia, memperbarui Docker/containerd,
  lalu melakukan reboot terkontrol.
- Kernel aktif setelah reboot: `6.8.0-138-generic`.
- `unattended-upgrades`, Docker, dan fail2ban berstatus aktif.
- Fail2ban jail SSH aktif.
- SSH diperketat:
  - `PasswordAuthentication no`
  - `KbdInteractiveAuthentication no`
  - `PermitRootLogin prohibit-password`
  - `PubkeyAuthentication yes`
  - `PermitEmptyPasswords no`
  - `MaxAuthTries 3`
  - `LoginGraceTime 30`
- Koneksi SSH berbasis kunci diuji kembali dan berhasil.
- Coolify di-upgrade dari `v4.0.0-beta.472` ke `v4.3.9`.
- Auto-upgrade Coolify tanpa pengawasan dinonaktifkan untuk production;
  pemeriksaan versi berkala tetap aktif.
- Registrasi publik dan API Coolify dinonaktifkan, DNS validation serta
  konfirmasi aksi destruktif aktif, dan hanya ada satu anggota tim/owner.
- Provider firewall `KIKOST production` diaktifkan dengan default deny dan
  hanya membuka TCP 22, TCP 80, TCP 443, serta UDP 443.
- Port manajemen 8000, 6001, 6002, dan 8080 telah diuji dari internet dan
  semuanya timeout/tertutup; port SSH 22 tetap dapat dijangkau.

## Database dan backup

- PostgreSQL dan Redis tidak dipublikasikan ke host/internet.
- Menambahkan backup PostgreSQL harian pukul 01:00 WIB.
- Retensi lokal: maksimum 14 backup, 30 hari, dan 10 GB.
- Backup perdana berhasil untuk database `Kyrastay_production`.
- Backup penuh VPS harian Hostinger dan snapshot manual memberikan jalur
  pemulihan terpisah dari backup logis database.

## Domain, TLS, dan email

- Semua trafik HTTP untuk frontend, API, dan Coolify dialihkan ke HTTPS.
- Sertifikat Let's Encrypt valid untuk `kikost.com`, `api.kikost.com`, dan
  `coolify.kikost.com`.
- TLS 1.0 ditolak; TLS 1.2 berhasil.
- Canonical routing terverifikasi:
  - `www.kikost.com` → `kikost.com`
  - `booking.kikost.com` → `/booking/v2`
  - `dashboard.kikost.com` → `app.kikost.com`
- CAA hanya mengizinkan Let's Encrypt.
- SPF diperketat menjadi
  `v=spf1 include:_spf.mail.hostinger.com -all`.
- DMARC dinaikkan bertahap menjadi
  `p=quarantine; pct=25` dengan aggregate report ke `support@kikost.com`.
- DKIM Hostinger selector aktif terverifikasi dan MX hanya menunjuk Hostinger.

## Hasil pengujian

- Frontend production build: berhasil, 43/43 static pages.
- Frontend lint: 0 error; satu warning performa `<img>` lama.
- `npm audit`: 0 vulnerability, termasuk production dependency.
- Backend test: **140 runs, 924 assertions, 0 failure, 0 error**.
- Brakeman 8.0.6: **0 warning** dari 79 checks.
- Bundler Audit: **0 vulnerability**.
- Deployment frontend commit `1bd5e07`: sukses dan container healthy.
- `kikost.com`, `www`, `booking`, `app`, `dashboard`, API, serta
  `coolify.kikost.com`: merespons setelah firewall aktif.
- API health: `{"success":true,"message":"Service healthy"}`.
- Origin resmi mendapat `Access-Control-Allow-Origin`; origin tidak dikenal
  tidak mendapatkannya.

## Tindakan pemilik yang masih diperlukan

1. Aktifkan MFA pada akun Coolify. Proses ini memerlukan pemilik memindai QR
   dan menyimpan recovery codes.
2. Nonaktifkan dashboard terminal Coolify bila tidak dibutuhkan. Finalisasi
   memerlukan password pemilik; dialog dibatalkan tanpa membaca password.
3. Aktifkan DNSSEC setelah penyedia DNS menyediakan DNSKEY/DS yang valid.
   Hostinger saat ini hanya menyediakan form DS dan tidak menghasilkan key.
4. Tambahkan bucket S3 kompatibel untuk backup logis database off-server.
   Saat ini backup penuh VPS sudah off-server, tetapi dump PostgreSQL terjadwal
   masih disimpan lokal pada VPS.
5. Audit dan aktifkan MFA serta branch protection GitHub. Sesi GitHub yang
   tersedia belum login sehingga status repository tidak dapat diverifikasi.
6. Jadwalkan rotasi secret JWT, database, Redis, SMTP, Firebase, dan credential
   integrasi. Rotasi harus dilakukan dalam maintenance window karena dapat
   memutus sesi dan layanan aktif.
7. Setelah DMARC report dipantau dan seluruh pengirim sah terkonfirmasi,
   naikkan bertahap dari `quarantine; pct=25` ke `quarantine; pct=100`, lalu
   `reject`.

## Referensi operasional

- Coolify firewall:
  https://coolify.io/docs/knowledge-base/server/firewall
- Coolify update:
  https://coolify.io/docs/knowledge-base/self-update
- Hostinger managed VPS firewall:
  https://www.hostinger.com/support/8172641-how-to-use-a-managed-vps-firewall-at-hostinger/
- Hostinger two-factor authentication:
  https://www.hostinger.com/support/4888148-how-to-set-up-two-factor-authentication-on-your-hostinger-account/
