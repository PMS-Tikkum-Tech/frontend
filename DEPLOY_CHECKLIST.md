# Deployment Checklist

## Frontend application

- Repository: `PMS-Tikkum-Tech/frontend`
- Build pack: Dockerfile
- Internal port: `3000`
- Health path: `/`
- Attach all canonical frontend domains to the same Coolify application before
  deploying the hostname-routing build:
  - `https://kikost.com`
  - `https://www.kikost.com` (redirect-only)
  - `https://booking.kikost.com`
  - `https://app.kikost.com`
  - `https://dashboard.kikost.com` (redirect-only)
- Confirm Coolify has issued a trusted certificate for every hostname. A
  Traefik default certificate means the domain is not ready for deployment.
- Set `NEXT_PUBLIC_API_URL=https://api.kikost.com` as a Coolify Build Variable
- Set `BACKEND_API_URL=https://api.kikost.com` as a frontend runtime variable;
  browser API traffic is routed through the same-origin `/api/v1/*` BFF.
- Set `NEXT_PUBLIC_SITE_URL=https://kikost.com` as a Coolify Build Variable.
  The production Docker build rejects any other API/site origin.
- Set every enabled Firebase, Google Maps, support, and booking
  `NEXT_PUBLIC_*` variable as a Build Variable
- Rebuild the image whenever a `NEXT_PUBLIC_*` value changes

## Backend web application

- Repository: `PMS-Tikkum-Tech/backend`
- Build pack: Dockerfile
- Internal port: `3000`
- Health path: `/api/v1/health`
- Domain: `https://api.kikost.com`
- Persistent volume: `/app/storage`
- Required: `SECRET_KEY_BASE`, `JWT_SECRET_KEY`, `REDIS_URL`, and either
  `DATABASE_URL` or the documented individual PostgreSQL variables
- Required for email flows: `SMTP_ADDRESS`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
  `SMTP_PORT`, `SMTP_DOMAIN`, and `MAIL_FROM`
- Set `FRONTEND_URL=https://app.kikost.com`. Remove `AUTH_COOKIE_DOMAIN`;
  authentication cookies must remain host-only.
- Ensure the persistent `/app/storage` volume is writable by UID/GID `1001`
  because the backend container runs as the non-root `rails` user.
- Set `CORS_ORIGINS` to only the canonical applications that execute frontend
  code: `https://kikost.com,https://booking.kikost.com,https://app.kikost.com`.
  Do not include redirect-only domains.

## Backend worker application

- Use the same backend image and environment variables
- Start command: `bin/coolify-worker`
- Connect it to the same PostgreSQL and Redis services

## Safe deployment order

1. Confirm the encrypted source/database backup and a separate storage-volume
   backup are recoverable.
2. Deploy PostgreSQL and Redis.
3. Mount the existing `/app/storage` volume before starting the backend.
4. Deploy backend web; `bin/coolify-web` runs `rails db:prepare` before Puma.
5. Confirm migration `20260825090000_add_privileged_mfa.rb` completed. It
   revokes existing admin/finance sessions; those users must enroll TOTP on
   their next login and securely store the ten one-time recovery codes.
6. Keep `SECRET_KEY_BASE` stable. Changing it makes existing encrypted MFA
   secrets unreadable and requires a controlled MFA reset/re-enrollment.
7. Run `bundle exec rails deployment:verify` in the new backend container.
8. Run the transfer-proof URL rotation dry-run and apply command documented in
   `backend/COOLIFY_DEPLOY.md` when it has not yet run in production.
9. Deploy the Sidekiq worker.
10. Attach all frontend hostnames in Coolify and wait until every TLS
   certificate is valid.
11. Build the frontend with the production `NEXT_PUBLIC_*` values.
12. Verify the public domains, CORS, login/logout, admin/finance MFA enrollment
    and login, tenant proof upload, admin approval, image delivery, and HTTPS
    headers.
13. Keep the previous images and database/storage backup until verification is
    complete; roll back all three together if needed.

## Current local storage status

The five demo image blobs referenced by Property `8` and Units `41`–`44` were
restored on 20 August 2026 from the checksum-identical source asset. All five
objects now exist and their MD5 checksums match the Active Storage database.

The standalone volume backup is stored at
`backups/Deployment Ready 20 Agustus 2026/active-storage.tar.gz`, with its
SHA-256 checksum in the adjacent `.sha256` file. Extract the archive so its
`storage/` directory is mounted as `/app/storage`, then run
`bundle exec rails deployment:verify` before switching production traffic.

The older `Backup 18 Agustus 2026` remains unchanged and does not contain these
storage objects.
