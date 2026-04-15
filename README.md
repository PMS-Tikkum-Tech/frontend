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

Jika `GOOGLE_OAUTH_CLIENT_IDS` belum diisi di backend, endpoint `/api/v1/auth/google` akan menolak login Google.

## Geocoding alamat properti admin

Form tambah/edit properti admin akan mencoba mengubah alamat menjadi latitude dan longitude otomatis memakai Google Maps Geocoding API dari browser.

Yang perlu disiapkan:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Aktifkan Geocoding API pada project Google Cloud yang sama
- Batasi API key dengan HTTP referrer untuk domain frontend yang digunakan
