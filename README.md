# KIKOST Frontend

Next.js frontend untuk KIKOST. Rails API adalah satu-satunya identity provider;
login menggunakan email/kata sandi dan session disimpan dalam cookie `Secure`,
`HttpOnly`, `SameSite=Lax` yang dibuat backend.

## Setup lokal

```bash
npm ci
cp .env.example .env.local
npm run dev -- --port 3001
```

Gunakan konfigurasi lokal berikut (sesuaikan port backend bila perlu):

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3002
```

Frontend tidak memerlukan API key Firebase atau OAuth client ID. Google Maps
untuk geocoding properti adalah fitur terpisah dan, bila dipakai, dikonfigurasi
melalui `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` yang dibatasi berdasarkan HTTP referrer.

## Authentication

- `POST /api/v1/auth/login` — email/kata sandi.
- `GET /api/v1/auth/me` — identitas dan role dari Rails.
- `POST /api/v1/auth/refresh` — rotasi session dari cookie HttpOnly.
- `DELETE /api/v1/auth/logout` — revoke session dan hapus cookie.
- `POST /api/v1/auth/password/request` — permintaan setup/reset generik.
- `POST /api/v1/auth/password/reset` — password baru dengan token single-use.
- Registrasi tenant menggunakan kode verifikasi email, lalu nama dan kata sandi.

Frontend tidak menyimpan access token, refresh token, atau role di
`localStorage`. Authorization tetap wajib dilakukan Rails pada setiap endpoint.

## Production

Set `NEXT_PUBLIC_API_URL=https://api.kikost.com`, build ulang, dan pastikan CDN
tidak melakukan cache terhadap `/auth`, dashboard, atau response dengan
`Set-Cookie`. Domain target adalah `kikost.com` untuk frontend dan
`api.kikost.com` untuk API.
