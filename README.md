# Frontend PMS

Frontend ini sudah disiapkan untuk terhubung ke backend repo:

`git@github.com:PMS-Tikkum-Tech/backend.git`

## Setup lokal

1. Install dependency frontend:

```bash
npm ci
```

2. Buat `.env.local` dari `.env.example`:

```bash
cp .env.example .env.local
```

3. Isi env berikut:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_WEB_APP_ID
```

4. Jalankan frontend:

```bash
npm run dev
```

Frontend default berjalan di `http://127.0.0.1:3000`.

## Kontrak backend untuk login Google

- Endpoint: `POST /api/v1/auth/google`
- Payload utama yang dipakai frontend:
  - `id_token`
  - `phone_verification_token` saat backend meminta verifikasi nomor HP
- Frontend tidak meminta scope tambahan Google selain identitas dasar. Flow yang dipakai hanya mengandalkan `id_token` dari Google Identity Services.

## Backend yang perlu aktif

Backend lokal harus hidup di `http://127.0.0.1:3001` dan dikonfigurasi dengan Google OAuth client ID yang sama:

- frontend: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- backend: `GOOGLE_OAUTH_CLIENT_IDS`
- backend Firebase: `FIREBASE_PROJECT_ID` harus sama dengan `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

Jika `GOOGLE_OAUTH_CLIENT_IDS` belum diisi di backend, endpoint `/api/v1/auth/google` akan menolak login Google.

## Firebase Authentication

Flow daftar tenant memakai Firebase Phone Auth untuk OTP SMS dan menautkan provider Email/Password pada user Firebase yang sama. Setelah OTP valid, frontend mengirim Firebase ID token ke endpoint backend `POST /api/v1/auth/tenant/register`, lalu session aplikasi tetap berasal dari backend.

Yang perlu aktif di Firebase Authentication:

- Sign-in method `Email/Password`
- Sign-in method `Phone`
- Authorized domain untuk domain frontend, termasuk `localhost` saat development

## Deploy production

Saat build production, pastikan `NEXT_PUBLIC_API_URL` diisi dengan URL backend yang bisa diakses browser.

Contoh domain KIKOST:

```bash
NEXT_PUBLIC_API_URL=https://api.kikost.com
```

Untuk deployment Dockerfile di Coolify, tandai seluruh variabel
`NEXT_PUBLIC_*` yang dipakai sebagai **Build Variable**. Next.js memasukkan
nilai tersebut ke browser bundle ketika `next build`; mengubah runtime variable
tanpa rebuild tidak akan mengubah frontend. Docker build sengaja dihentikan jika
`NEXT_PUBLIC_API_URL` kosong agar image yang mengarah ke API yang salah tidak
sempat dipublikasikan.

Health check frontend dapat memakai path `/` pada internal port `3000`.

Setelah env diubah, lakukan rebuild dan redeploy frontend karena variabel `NEXT_PUBLIC_*` dibaca saat build Next.js.

Struktur domain yang disarankan:

- `https://kikost.com` untuk situs utama
- `https://booking.kikost.com` untuk calon penghuni
- `https://app.kikost.com` atau `https://dashboard.kikost.com` untuk tenant, admin, dan owner

Jika memakai domain terpisah, set `NEXT_PUBLIC_SITE_URL` ke domain kanonis yang dipakai untuk metadata dan link berbagi.

## Geocoding alamat properti admin

Form tambah/edit properti admin akan mencoba mengubah alamat menjadi latitude dan longitude otomatis memakai Google Maps Geocoding API dari browser.

Yang perlu disiapkan:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Aktifkan Geocoding API pada project Google Cloud yang sama
- Batasi API key dengan HTTP referrer untuk domain frontend yang digunakan
