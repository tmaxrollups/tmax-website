# Form spam protection — v19

Implemented on all public Netlify forms:

- Existing Netlify honeypot retained.
- Netlify-provided reCAPTCHA 2 enabled on every form page.
- Netlify Akismet filtering remains automatic.
- Server-side form allowlists, field-count limits, length limits, email/phone validation retained.
- Added conservative rejection of free-text submissions containing more than three URLs or common unrelated spam phrases before Resend is called.
- CSP expanded only as needed for the Netlify/Google reCAPTCHA challenge.
- Resend remains server-side only; the API key is never exposed to the browser.

## Billing guardrails to configure in dashboards

1. Keep Resend on Free while normal website volume fits the free quota.
2. Do not enable a paid plan or transactional overages/pay-as-you-go unless intentionally needed.
3. Keep Netlify auto recharge disabled unless intentionally needed.
4. Confirm each form shows Extra spam prevention in Netlify after deployment.
5. Test one legitimate submission from every form after deployment.

Note: Netlify-provided reCAPTCHA 2 supports one challenge per page. The current TMAX pages each contain no more than one protected form.
