# Resources Hub Consolidation Design

## Objective

Replace the separate Resources and Accessories pages with one comprehensive Resources hub at `/resources/`. Preserve all current, supported resources and parts-request behavior while retiring Accessories as a page.

## Page Structure

The combined Resources page will contain these sections in order:

1. Page header with concise Resources positioning and in-page jump links.
2. Current catalog and warranty downloads.
3. Measuring and product-planning guidance.
4. Controls and replacement-parts categories.
5. Product gallery links.
6. Parts and service guidance.
7. The existing Parts Request form.

The jump links will target Documents, Controls, Galleries, and Parts Request. The page will follow the site's existing typography, header, responsive behavior, and alternating white/tinted section backgrounds.

## Content Rules

The Resources page will retain the current catalog, warranty, measuring guidance, product gallery links, and these accessory categories:

- Replacement motors
- Wi-Fi hubs
- Remotes and wall controls
- TMAX keypad

Unverified SKU-style labels will be removed. Compatibility language will direct customers to provide their product type, motor/control model, installation address, approximate installation date, and a written problem description before ordering.

The page and form will not request photographs and will not contain file-upload controls. Existing unsupported references to supplying photos will be removed.

## Form Behavior

The migrated form will retain the Netlify form name `parts-request` so its existing dashboard record, server allowlist, email title, and customer-confirmation behavior remain stable. It will preserve:

- Native `POST` submission to `/thanks/`
- Netlify form detection
- Netlify reCAPTCHA
- Honeypot protection
- Existing field names and server allowlist
- Internal Resend notification
- Customer confirmation email

No custom submit interception, upload processing, or client-side CAPTCHA timeout will be introduced.

## Route Retirement

`public/accessories.html` will be deleted. These routes will permanently redirect to `/resources/`:

- `/accessories`
- `/accessories/`
- `/accessories.html`
- `/product/accessories`
- `/product/accessories/` and descendants

All internal links, homepage product cards, footer links, and sitemap entries will point directly to `/resources/`. The sitemap will contain only the canonical Resources URL for this content.

## Failure Handling

Browser field constraints prevent incomplete submissions. Netlify rejects failed CAPTCHA or honeypot checks before accepting a submission. Accepted submissions remain stored in Netlify even if the asynchronous Resend notification later fails; notification failures remain visible in function logs. Successful browser submissions continue to `/thanks/`.

Legacy Accessories requests will receive a permanent redirect rather than a removed-page response, preserving bookmarks and search-engine equity.

## Verification

Automated tests will verify:

- The Parts Request form exists only on `resources.html`.
- Its Netlify identity, fields, CAPTCHA, honeypot, submit control, and success route remain valid.
- No file input or photo-request language exists in the Resources parts area.
- Every Accessories URL has a permanent redirect to `/resources/`.
- Internal HTML and sitemap references no longer target Accessories.
- Catalog, warranty, gallery, and local asset links resolve.
- Page sections alternate backgrounds correctly.
- Repository validation and the full unit test suite pass.
- BrowserStack checks Resources navigation, downloads, CAPTCHA injection, enabled submit behavior, and browser console output in current Chrome, Edge, Firefox, and Safari.

If BrowserStack Local cannot connect, the cross-browser result will be reported as blocked rather than treated as passing.

## Delivery Constraint

All design, implementation, tests, and integration work will remain on the existing `carousel-buttons-captcha-fix` branch until it is ready to push and integrate into remote `main`.
