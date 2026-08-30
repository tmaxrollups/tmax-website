# TMAX final refinement audit — v20

## Applied before form-control upload
- Corrected footer logo distortion on every page by explicitly preserving the logo aspect ratio (`width: 170px; height: auto; object-fit: contain`).
- Standardized the footer navigation label to **Controls & Accessories**.
- Tightened long/overbroad meta descriptions, including removal of the About-page implication that the whole TMAX product line is motorized.
- Added sensible cache headers for finalized videos and public documents.

## Verified
- No duplicate HTML IDs found.
- All image elements have alt attributes and intrinsic dimensions.
- No missing local image/video/script references were found in the public build (clean-URL links are handled by Netlify redirects).
- Nine public forms retain Netlify Forms, honeypots, and reCAPTCHA markup.
- Product-page headers retain Request a Quote actions without phone-number buttons.
- Contact hours remain Monday–Friday, 9:00 AM–5:00 PM CST.
- Active videos remain the 18-second natural-speed trims and stay in their existing page locations.
- WordPress/admin probe paths remain explicitly retired in `_redirects`.
- Security headers/CSP remain configured in `netlify.toml`.

## Hold until production-domain cutover
Do not add final canonical URLs, sitemap URLs, or production indexing directives until the new build is ready to replace the current WordPress site on `tmaxrollups.com`. This avoids creating conflicting canonical/indexing signals while the WordPress site is still live.

## After the new form controls are uploaded
Run the final functional QA against the deployed Netlify build: submit every form once, verify reCAPTCHA and spam handling, confirm Netlify submission capture, verify Resend delivery/reply-to behavior, test mobile navigation and carousel controls, and check live CSP/security headers in-browser.
