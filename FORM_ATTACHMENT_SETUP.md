# TMAX Forms — Email + Attachment Setup

## What this adds

Every form submission on the site now triggers a Netlify serverless function that:

1. **Formats the customer's info into a printable HTML "form record"** (looks like a filled-in form with TMAX branding)
2. **Emails tmaxrollupsit@gmail.com** *(testing address — swap to info@tmaxrollups.com when ready for production)* with the info in the email body **and** the HTML form record attached
3. **Sets Reply-To to the customer's email** so you can hit "Reply" and it goes straight to them

The attached HTML file is named like:
`quote-garage-doors_2026-07-15_john-smith.html`

Open it in any browser — it renders as a clean form document that can be printed to PDF or filed for tracking.

---

## Setup (one-time)

### 1. Create a Resend account (free — 3,000 emails/month)

Resend is the email service the function uses. Go to https://resend.com and sign up **using `tmaxrollupsit@gmail.com`** (takes 60 seconds).

**Important:** Sign up with the SAME email that will receive test emails. Until you verify a domain, Resend will only deliver emails to the address you signed up with.

### 2. Get an API key

Once logged in:
1. Click **API Keys** in the sidebar
2. Click **Create API Key**
3. Name it something like `TMAX Netlify`
4. Copy the key (starts with `re_...`)

### 3. Add the key to Netlify

In your Netlify dashboard:
1. Site settings → **Environment variables**
2. Click **Add a variable**
3. Key: `RESEND_API_KEY`
4. Value: paste the key from step 2
5. Save

### 4. Verify a sending domain (recommended for production)

By default the function sends from `onboarding@resend.dev` (Resend's testing sender). This works but only sends to the same email address you signed up with, and emails may go to spam.

For real production use:
1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter `tmaxrollups.com`
3. Add the DNS records Resend shows you to your domain host (Namecheap, GoDaddy, wherever)
4. Wait a few minutes for verification
5. Then in Netlify environment variables, also add:
   - Key: `FROM_EMAIL`
   - Value: `TMAX Website <notifications@tmaxrollups.com>` (or any email @tmaxrollups.com)

### 5. Deploy the site

Drag `netlify_site` into Netlify's Deploys tab. Netlify will detect the `netlify/functions/` directory and register the function automatically.

You can confirm it's registered by going to **Site → Functions** — you should see `submission-created` listed.

### 6. Turn OFF Netlify's default form notification (optional)

Since the function is now sending its own richer email, you probably don't need the default Netlify notification too (otherwise you get 2 emails per submission).

1. Site → Forms → click a form → Settings & usage → **Form notifications**
2. Delete any existing email notifications

If you want a backup notification (in case the function fails), keep them enabled.

---

## Test it

1. Submit a test form on the deployed site
2. Within a minute, check `tmaxrollupsit@gmail.com`
3. You should get an email:
   - Subject: something like "Consultation Request — John Smith"
   - Body: all the info the customer filled in, styled with TMAX colors
   - Attachment: `consultation_2026-07-15_john-smith.html`
   - Reply-to: the customer's email

Open the attachment — it should look like a clean filled-in form ready to print or file.

---

## Troubleshooting

**Nothing arrives after test submission:**
- Check Netlify Site → **Functions → submission-created** → View logs. Any red errors here mean something's wrong (usually missing/wrong RESEND_API_KEY)
- Check Resend dashboard → **Emails** — if submissions are being sent but bouncing, you'll see them here
- Check spam folder

**Function shows "RESEND_API_KEY not set" in logs:**
- The env var isn't wired up. Go back to Setup step 3.

**Emails arrive but go to spam:**
- You're using `onboarding@resend.dev` as the sender. Do Setup step 4 (verify your domain).

**Function errors on `fetch is not defined`:**
- Netlify may be running an older Node version. In `netlify.toml`, add:
  ```
  [functions]
    node_bundler = "esbuild"
    node_version = "18"
  ```
  Node 18+ has fetch built in.

---

## What if I want PDFs instead of HTML attachments?

The current setup uses HTML because it's zero-dependency. If you want PDFs (identical rendering everywhere, cleaner for archiving), swap the attachment generation to use a library like `pdfkit` or `@react-pdf/renderer`, or use a service like Documint/PDFShift.

Ping me and I'll swap it. HTML is more than enough for most tracking purposes though — every browser can print an HTML file to PDF in one click.

---

## Cost

- **Resend free tier:** 3,000 emails/month (100/day)
- **Netlify Functions free tier:** 125,000 invocations/month, 100 hours of runtime
- TMAX's form volume is nowhere near these limits, so you're not going to hit paid usage.

---

## Switching from testing to production

When you're ready to have real customer submissions go to `info@tmaxrollups.com` instead of `tmaxrollupsit@gmail.com`:

**Option A: Via Netlify dashboard (no code changes)**
- Site settings → Environment variables → Add a variable
- Key: `NOTIFY_EMAIL`
- Value: `info@tmaxrollups.com`
- Save and trigger a new deploy

**Option B: Edit the function code**
- Open `netlify/functions/submission-created.js`
- Change the line `const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'tmaxrollupsit@gmail.com';`
- To: `const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'info@tmaxrollups.com';`
- Deploy

**Important:** By the time you switch, you should have completed Setup Step 4 (verified `tmaxrollups.com` as a Resend sending domain) so emails to info@tmaxrollups.com don't land in spam.
