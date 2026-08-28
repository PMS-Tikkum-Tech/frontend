# Remediasi Audit Keamanan KIKOST — 25 Agustus 2026

## Ringkasan

Perbaikan ini menutup jalur file sensitif yang sebelumnya dapat bergantung pada
signed URL umum, memindahkan sesi browser ke cookie HttpOnly same-origin,
memperketat otorisasi finance, dan mewajibkan TOTP untuk admin serta finance.
Perubahan juga mencakup sanitasi ekspor CSV, penyamaan respons OTP, proses
container non-root, dan pembaruan runtime Node.js.

## Perbaikan utama

- Dokumen identitas, selfie, bukti transfer, dan receipt hanya dikirim melalui
  endpoint yang memeriksa pengguna serta kepemilikan/role. Default Active
  Storage routes dinonaktifkan.
- Browser tidak lagi menerima atau menyimpan access/refresh token di JavaScript.
  Frontend memakai BFF same-origin dan backend memasang cookie host-only dengan
  `HttpOnly`, `Secure` di production, dan `SameSite=Lax`.
- Login password admin dan finance kini berhenti pada enrollment/verifikasi
  TOTP sebelum sesi diterbitkan. Secret TOTP dienkripsi AES-256-GCM.
- Enrollment menghasilkan sepuluh recovery code acak yang hanya disimpan dalam
  bentuk HMAC digest dan hanya dapat dipakai satu kali.
- Percobaan MFA dibatasi berdasarkan IP dan akun; kode TOTP pada time-step yang
  sama tidak dapat diputar ulang.
- Migration MFA mencabut sesi admin/finance lama dengan menaikkan
  `session_version` serta menghapus refresh token.
- Akses area financial dipisahkan secara eksplisit untuk role finance; role ini
  tidak memperoleh akses umum ke seluruh dashboard admin.
- Nilai CSV yang diawali formula spreadsheet dinetralisasi sebelum ekspor.
- Respons permintaan kode email tidak lagi membocorkan apakah akun terdaftar.
- Frontend dan backend container berjalan sebagai user non-root; runtime
  frontend diselaraskan ke Node.js 24.

## Verifikasi lokal

- Frontend ESLint: 0 error; satu warning performa lama pada carousel `<img>`.
- Frontend production build Next.js 16.3.1: berhasil, TypeScript lolos, 45
  halaman dihasilkan.
- Rails Zeitwerk: berhasil (`All is good!`).
- Brakeman 8.0.6: 0 error dan 0 security warning.
- Pemeriksaan syntax seluruh file MFA: berhasil.
- Smoke test TOTP RFC 6238 dan round-trip AES-256-GCM: berhasil.
- Frontend merespons HTTP 200 di `http://127.0.0.1:4000`.

Test Rails yang membutuhkan database belum dapat dijalankan karena PostgreSQL
lokal pada `127.0.0.1:5433` tidak aktif. Test baru untuk enrollment, challenge,
anti-replay TOTP, dan pemakaian recovery code satu kali sudah ditambahkan dan
harus dijalankan sebelum deployment ketika database test tersedia.

## Catatan deployment

Jalankan migration sebelum mengalihkan trafik, pertahankan `SECRET_KEY_BASE`
yang sama, lalu uji enrollment/login satu akun admin dan satu akun finance.
Perubahan `SECRET_KEY_BASE` membuat secret MFA lama tidak dapat didekripsi dan
memerlukan reset serta enrollment terkontrol.
