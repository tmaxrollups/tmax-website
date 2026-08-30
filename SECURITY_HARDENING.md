# TMAX website security hardening

## Implemented in source
- Publish directory changed to `public/` so setup notes and source-only files are not exposed.
- Site-wide CSP, HSTS, clickjacking, MIME sniffing, referrer, permissions, and cross-domain policy headers added in `netlify.toml`.
- Inline JavaScript/event handlers removed; browser JS is served from `/assets/` so CSP does not need `unsafe-inline` for scripts.
- Existing Netlify honeypots retained. Netlify also applies Akismet spam filtering to form submissions.
- Form input length constraints and browser input hints added.
- Submission email function validates known forms/fields and does not expose provider error bodies to visitors.
- WordPress/admin/probe paths explicitly return 404.
- Static assets receive cache headers.

## Netlify dashboard actions required
1. Require MFA/passkeys for every Netlify team member and remove stale users.
2. Keep `RESEND_API_KEY`, `NOTIFY_EMAIL`, and `FROM_EMAIL` in Netlify environment variables only. Never add secrets to Git or HTML.
3. Use a Resend-verified `@tmaxrollups.com` FROM address in production; do not rely on `onboarding@resend.dev`.
4. Review deploy previews and branch deploy visibility before production.
5. Check deploy logs after each security/routing change.
6. Consider Netlify-provided reCAPTCHA 2 on public lead forms if spam volume warrants the conversion tradeoff. Honeypot + Netlify spam filtering remain enabled now.

## Hostinger/domain actions required
1. Enable MFA on the Hostinger account.
2. Enable registrar/domain lock.
3. Enable DNSSEC if supported for the final DNS configuration.
4. Remove obsolete A/AAAA/CNAME records left from WordPress hosting after verifying they are no longer needed for mail or other services.
5. Point the production domain only to the intended Netlify records; do not leave an unused Hostinger web origin publicly reachable.
6. Verify HTTPS and redirects on the final custom domain before enabling HSTS preload or `includeSubDomains`.

## Live-launch verification
- Verify TLS and HTTP -> HTTPS behavior.
- Verify all security headers on HTML responses.
- Verify CSP in browser devtools, especially Google Maps and Google Fonts.
- Submit every form and verify expected delivery and spam behavior.
- Probe retired WordPress paths and sensitive filenames.
- Confirm no environment/config/source-only files are publicly retrievable.
