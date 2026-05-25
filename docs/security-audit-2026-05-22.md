# Security Audit Archive - 2026-05-22

Scope: defensive code review for common web app risks, including auth, JWT, CORS, token storage, rate limiting, file upload, payment webhook, dependency vulnerabilities, SQL injection patterns, access control, and security headers.

This is not a guarantee that the system is fully secure. It is an archive of risks found from source review and `npm audit --omit=dev`.

## Priority Findings

1. Critical - Xendit webhook payment status is not verified.
   - Backend path: `/Users/HP15/Documents/GitHub/PMS/backend/app/controllers/api/v1/webhooks/xendit/invoices_controller.rb`
   - Route: `/Users/HP15/Documents/GitHub/PMS/backend/config/routes.rb`
   - Risk: a public request can mark a payment as paid if it can supply a known invoice id and `status=PAID`.
   - Fix: verify Xendit callback token/signature before mutating payment state.

2. Critical/High - Frontend dependency vulnerabilities.
   - Command run: `npm audit --omit=dev`
   - Result: 9 vulnerabilities: 1 critical, 4 high, 4 moderate.
   - Affected packages include `jspdf`, `next`, `axios`, `protobufjs`, `xlsx`, `dompurify`, `follow-redirects`, and `postcss`.
   - Fix: run safe dependency updates first, then review breaking upgrades, especially Next.js and `xlsx` because audit reported no fix for `xlsx`.

3. High - JWT secret has a public fallback.
   - Backend path: `/Users/HP15/Documents/GitHub/PMS/backend/config/initializers/jwt.rb`
   - Risk: if `JWT_SECRET_KEY` is missing in production, tokens can be forged with the known fallback string.
   - Fix: fail boot in production/staging when `JWT_SECRET_KEY` is blank or default.

4. High - Login, refresh, OTP, and email verification lack global/IP rate limiting.
   - Backend paths:
     - `/Users/HP15/Documents/GitHub/PMS/backend/app/services/auth_service.rb`
     - `/Users/HP15/Documents/GitHub/PMS/backend/app/services/auth/otp_request_service.rb`
   - Risk: brute force, credential stuffing, OTP abuse, and endpoint DoS.
   - Fix: add `rack-attack` or equivalent throttles by IP, email, phone number, and endpoint.

5. High/Medium - Tokens are stored in browser-readable storage.
   - Frontend paths:
     - `src/lib/axios.ts`
     - `src/lib/auth-cookies.ts`
   - Risk: any XSS can steal access and refresh tokens from `localStorage` or JavaScript-readable cookies.
   - Fix: move refresh token to server-set `HttpOnly; Secure; SameSite` cookie, keep access token short-lived, and add CSRF protections where needed.

6. Medium - Backend CORS allows all origins.
   - Backend path: `/Users/HP15/Documents/GitHub/PMS/backend/config/initializers/cors.rb`
   - Risk: any website can call the API from a browser. With stolen tokens or XSS, this increases blast radius.
   - Fix: restrict origins to production frontend domains and local dev origins only.

7. Medium - Security headers and forced HTTPS are incomplete.
   - Backend path: `/Users/HP15/Documents/GitHub/PMS/backend/config/environments/production.rb`
   - Frontend path: `next.config.mjs`
   - Risk: weaker browser-side defense against clickjacking, MIME sniffing, referrer leakage, and XSS.
   - Fix: enable HTTPS/HSTS and add CSP, X-Frame-Options or frame-ancestors, Referrer-Policy, X-Content-Type-Options, and Permissions-Policy.

8. Medium - Upload limits are inconsistent.
   - Backend paths:
     - `/Users/HP15/Documents/GitHub/PMS/backend/app/models/property.rb`
     - `/Users/HP15/Documents/GitHub/PMS/backend/app/models/unit.rb`
     - `/Users/HP15/Documents/GitHub/PMS/backend/app/models/rental_booking.rb`
   - Risk: large file upload can consume storage or processing resources. Content type checks rely on blob metadata.
   - Fix: add byte-size limits, count limits, and content sniffing where possible.

9. Low/Medium - Public auth diagnostics exposes operational data.
   - Backend path: `/Users/HP15/Documents/GitHub/PMS/backend/app/controllers/api/v1/auth_controller.rb`
   - Route: `/Users/HP15/Documents/GitHub/PMS/backend/config/routes.rb`
   - Risk: attackers can learn config status and admin counts.
   - Fix: protect diagnostics with admin auth or disable in production.

## Positive Notes

- SQL injection risk was not obvious in reviewed filters; most dynamic queries use parameter binding or sort whitelists.
- Self role escalation through user update appears mitigated in the service layer.
- Google identity verification checks issuer and audience.
- Sensitive auth parameters are included in Rails filter parameter logging.

## Suggested Fix Order

1. Verify Xendit webhook before updating payment status.
2. Force production JWT secret configuration.
3. Add rate limiting for auth and verification endpoints.
4. Update or replace vulnerable frontend dependencies.
5. Restrict CORS.
6. Move refresh tokens to HttpOnly cookies and tighten CSP.
7. Add security headers and force HTTPS.
8. Add upload size limits and stronger file validation.
9. Lock down or remove diagnostics route in production.

## Verification Notes

- `npm audit --omit=dev` ran successfully after network approval and found the dependency issues above.
- Backend Brakeman and bundle-audit were not available in the bundle, so static backend scanner output is not included.
