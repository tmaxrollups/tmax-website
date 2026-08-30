# TMAX Forms — Netlify Email Notification Setup

## What's now in the HTML (all 9 forms)

Every form on the site now submits these fields to Netlify with proper `name` attributes so they appear in email notifications:

### Standard fields on every form
| Field name | Purpose |
|---|---|
| `form-name` | Required by Netlify to route the submission |
| `subject` | Used automatically as the email subject line |
| `source_page` | Which page the form was submitted from |
| `bot-field` | Honeypot for spam (leave empty) |

### Customer info fields (vary by form)
- `name`, `first_name`, `last_name` — Customer name
- `email` — Customer email *(Netlify auto-uses this as the Reply-To address)*
- `phone` — Customer phone
- `zip` — Installation ZIP code
- `message` / `notes` — Free-text message
- `interest` — Checkbox group (which products they're interested in)
- `referral_source` — How they heard about TMAX
- Product-specific fields on quote forms:
  - Garage doors: `selected_color`, `selected_width`, `selected_height`, `calculated_price`, `install_type`
  - Others: `product_interest`
- Dealer form: `business_name`, `city`, `state`, `years_in_business`, `employees`, `website`, `products_of_interest`, `monthly_volume`, `why_partner`

---

## Configure Netlify email notifications (do this ONCE per form)

Every form needs to have email notifications enabled in the Netlify dashboard. Here's how:

1. Go to **your Netlify site → Forms** (in the sidebar)
2. Click on a form (e.g., `consultation`)
3. Click **Settings & usage** → scroll to **Form notifications**
4. Click **Add notification → Email notification**
5. Fill in:
   - **Event to listen for**: `New form submission`
   - **Email to notify**: `info@tmaxrollups.com`
   - **Custom subject** *(optional)*: leave blank — the hidden `subject` field on each form already provides one
6. Save

Repeat for each of the 9 forms:
- `consultation` (homepage)
- `contact-message` (contact page)
- `dealer-application` (dealer page)
- `parts-request` (accessories page)
- `quote-garage-doors`, `quote-exterior-shades`, `quote-interior-shades`, `quote-shutters`, `quote-commercial`

**Shortcut:** In Netlify's notification setup, you can select **"Any form"** to have one notification cover all 9 forms with a single email destination.

---

## What the email will look like

By default Netlify sends a nicely-formatted email containing **every field** the customer filled in, plus the values of the hidden fields. For example, a consultation submission would result in:

```
Subject: New consultation request — TMAX website

A new form submission was made on TMAX Roll Ups:

  form-name:        consultation
  subject:          New consultation request — TMAX website
  source_page:      Homepage
  name:             John Smith
  zip:              77018
  email:            john@example.com     ← Netlify sets this as Reply-To
  phone:            (713) 555-0100
  interest:         Garage Doors, Exterior Shades
  message:          Interested in a 16x8 wood-grain door for my Spring Branch home.
                    Looking to install within 60 days.
  referral_source:  Google search

[View this submission in your Netlify dashboard →]
```

Every field labeled by its `name` attribute. Nothing dropped.

---

## If you want a fancier email template (HTML with branding)

Netlify's default email is functional but plain. For a branded HTML email (TMAX gold colors, formatted tables, logo), you have three options:

### Option A: Zapier / Make integration
Netlify → Zapier → SendGrid (or Gmail) with a custom HTML template.
- Netlify site → Forms → [form] → Settings → **Add notification → Outgoing webhook**
- Point webhook at Zapier's "Catch Hook" trigger
- Format email in Zapier with the field variables

### Option B: Netlify Functions
Write a Netlify serverless function that triggers on form submission and sends an HTML email via SendGrid/Mailgun/Resend. Requires code.

### Option C: Just stick with the default
The default email is already readable and contains everything. If the goal is just "know what came in," the default works fine.

---

## Testing after deploy

1. Deploy the updated site (drag the `netlify_site` folder to Netlify's Deploys tab)
2. On the deployed site, submit a form with test data
3. Check `info@tmaxrollups.com` — email should arrive within a minute
4. Also check **Netlify → Forms → [form-name]** in the dashboard — you'll see the submission listed with every field

If a field is missing from the email, check the HTML form — that field probably doesn't have a `name` attribute. All fields should now have them, but this is the test.

---

## Dynamic variables reference (for custom notification templates)

If you set up a Zapier/Make webhook or Netlify function later, these are the variables you can reference in your custom email templates:

**Every form has these:**
- `{{ form_name }}` — the form's name attribute
- `{{ subject }}` — the subject line hidden field
- `{{ source_page }}` — which page the form was on
- `{{ site_name }}`, `{{ site_url }}` — provided by Netlify

**Customer fields:** any field with a `name="..."` attribute is accessible as `{{ NAME }}` in the template. So `<input name="phone">` → `{{ phone }}` in your email template.
