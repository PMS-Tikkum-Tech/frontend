# Catatan Perubahan Security — 19 Agustus 2026

## Ruang lingkup

Pekerjaan ini mengamankan alur pembayaran transfer manual tanpa mengubah
tampilan utama atau proses bisnis: tenant tetap mengunggah bukti transfer dan
admin tetap memeriksa lalu menyetujui atau menolak pembayaran dari dashboard.

Nomor 5 dari daftar tindak lanjut, yaitu penerapan Content Security Policy
(CSP) frontend, sengaja ditunda sesuai arahan. CSP tidak diaktifkan diam-diam.

## Backup

- Snapshot sebelum hardening tetap tersedia di
  `backups/Backup 18 Agustus 2026/`.
- Snapshot memuat arsip source, bundle Git frontend/backend, dan dump PostgreSQL.
- Salinan terenkripsi dibuat sebagai
  `backups/Backup 18 Agustus 2026.tar.gz.enc` menggunakan AES-256-CBC,
  PBKDF2, salt, dan 310.000 iterasi.
- SHA-256 paket terenkripsi:
  `d6d5a091e7b04b8b4f51177551f42d08049eb8388564d5d4a757426af9790e4b`.
- Kunci dekripsi disimpan terpisah dengan permission `0600` di
  `/Users/HP15/.config/pms-backup-keys/backup-18-agustus-2026.key`.
- Paket berhasil didekripsi ulang saat verifikasi; hash arsip sebelum dan
  sesudah dekripsi identik.
- Upload offsite belum dilakukan karena belum ada tujuan cloud/server atau
  kredensial. Jangan menyimpan file kunci di lokasi offsite yang sama dengan
  arsip terenkripsi.

## Pembayaran dan bukti transfer

- Integrasi Xendit yang tidak digunakan dihapus dari route, controller webhook,
  service, skema database, seed, presenter, API frontend, dan dashboard billing.
- Kolom Xendit lama dihapus melalui migration
  `20260819091000_remove_xendit_from_payments.rb`.
- Bukti transfer tidak lagi diberikan sebagai URL Active Storage publik.
  Frontend mengambil file melalui endpoint terautentikasi yang hanya dapat
  diakses tenant pemilik booking, admin, atau owner properti terkait.
- Response bukti transfer memakai `Cache-Control: no-store`.
- Upload dibatasi maksimal 5 MB, hanya PDF/JPEG/PNG, dan isi/signature file
  diverifikasi agar ekstensi atau Content-Type palsu ditolak.
- Identitas tenant dan waktu submit ditentukan server, bukan dipercaya dari
  input browser.
- Booking, unit, settlement, dan proses approval memakai database lock untuk
  mencegah approval ganda atau race condition.
- Index unik parsial database mencegah lebih dari satu lease aktif per unit dan
  lebih dari satu settlement aktif per booking.
- Hard delete hanya diizinkan untuk data uji yang belum diproses. Payment yang
  sudah paid/cancelled dan booking yang sudah memiliki ledger, lease, deposit,
  atau settlement tidak dapat dihapus permanen.
- Konfirmasi kode/nama invoice diperiksa di dalam lock yang sama dengan delete.
- Submit pembayaran tenant dibatasi 20 kali per jam per akun dan 60 kali per
  jam per IP. Aksi review admin dibatasi 120 kali per jam per admin dan 240 kali
  per jam per IP.

## Rotasi URL lama

- Ditambahkan task `security:rotate_transfer_proofs` dengan mode dry-run sebagai
  default dan mode perubahan eksplisit melalui `APPLY=true`.
- Task mengganti blob bukti transfer, memasang blob baru, lalu menghapus blob
  lama yang tidak dipakai sehingga signed URL lama berhenti bekerja.
- Dry-run dan apply lokal selesai dengan `failed=0`; database lokal tidak
  memiliki bukti transfer aktif (`scanned=0`).
- Setelah deploy ke production, jalankan dry-run lalu apply satu kali sesuai
  petunjuk di `backend/COOLIFY_DEPLOY.md`.

## HTTPS, rate limit, dan konfigurasi produksi

- Rails production memaksa HTTPS. Endpoint health internal dikecualikan agar
  probe platform tetap bekerja.
- HSTS dan security response headers tetap aktif pada response HTTPS.
- Production/staging wajib memiliki `REDIS_URL` yang valid (`redis://` atau
  `rediss://`) supaya limiter konsisten pada semua instance.
- Deployment proxy wajib meneruskan `X-Forwarded-Proto: https`.
- Parameter rahasia dan data bukti transfer ditambahkan ke filter logging.
- Error internal/provider dikembalikan sebagai pesan generik dan detailnya
  hanya masuk ke log server.

## Upgrade dependency security

Frontend:

- Next.js `16.3.1`
- React dan React DOM `19.2.0`
- React Leaflet `5.0.0`
- Middleware Next diganti menjadi Proxy sesuai Next 16.
- Dynamic route params diperbarui ke kontrak async Next 16.
- Build production menggunakan opsi Webpack eksplisit agar stabil pada mesin
  dengan ruang cache terbatas.

Backend:

- Ruby `3.3.12`
- Rails `8.0.5.1`
- Puma `7.2.1`
- Bundler `2.6.9`
- Docker image dan `.ruby-version` diselaraskan dengan Ruby baru.
- Rails dinaikkan dari 7.2 karena scanner menandai jalur tersebut sudah keluar
  dari masa dukungan security.
- Puma dinaikkan lagi ke 7.2.1 setelah advisory scanner menemukan dua CVE high
  severity pada Puma 6.6.1.
- Deklarasi enum dipindahkan ke sintaks Rails 8 yang setara tanpa mengubah nilai
  integer atau nama status.
- `brakeman`, `bundler-audit`, dan `minitest-mock` ditambahkan untuk audit dan
  kompatibilitas test.
- Parameter `role` dan `account_status` kini baru diteruskan controller jika
  requester adalah admin, sebagai defense in depth terhadap privilege change.

## Hasil verifikasi

- Backend boot: Ruby 3.3.12 / Rails 8.0.5.1 / Puma 7.2.1.
- Backend test: **136 runs, 893 assertions, 0 failure, 0 error**.
- Brakeman 8.0.6: **0 security warning, 0 error**.
- Bundler Audit: **No vulnerabilities found**.
- Frontend `npm audit --omit=dev`: **0 vulnerabilities**.
- Frontend lint: **0 error**, satu warning performa lama untuk elemen `<img>`;
  bukan temuan security.
- Frontend production build: berhasil, TypeScript dan 43 static pages selesai.
- Frontend hidup di `127.0.0.1:3000`.
- Backend health hidup di `127.0.0.1:3001/api/v1/health`.

## Langkah deployment yang masih membutuhkan lingkungan production

1. Sediakan Redis production dan isi `REDIS_URL`.
2. Deploy frontend dan backend, lalu jalankan migration database.
3. Jalankan `bundle exec rails security:rotate_transfer_proofs` dan periksa
   jumlah data, kemudian jalankan ulang dengan `APPLY=true`.
4. Upload arsip `.enc` ke penyimpanan offsite yang dipilih dan simpan kunci di
   lokasi terpisah.
5. Verifikasi HTTPS, header HSTS, login, upload bukti transfer, review admin,
   serta health check dari domain production.

## Ditunda

- Nomor 5: CSP frontend. Perlu observasi/report-only terhadap script, map,
  image, dan koneksi API production sebelum diberlakukan agar UI tidak rusak.
