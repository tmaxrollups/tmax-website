'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const submissionFunction = require('../netlify/functions/submission-created.js');

const publicDir = path.join(__dirname, '..', 'public');
const siteScript = fs.readFileSync(path.join(publicDir, 'assets', 'site.js'), 'utf8');
const allowedFields = {
  consultation: ['name', 'email', 'phone', 'zip', 'interest', 'message', 'referral_source', 'source_page', 'subject'],
  'contact-message': ['name', 'email', 'phone', 'message', 'source_page', 'subject'],
  'dealer-application': ['first_name', 'last_name', 'email', 'phone', 'business_name', 'website', 'city', 'state', 'biz-type', 'years_in_business', 'employees', 'monthly_volume', 'products_of_interest', 'why_partner', 'source_page', 'subject'],
  'parts-request': ['name', 'email', 'phone', 'zip', 'product_interest', 'part_description', 'source_page', 'subject'],
  'quote-garage-doors': ['name', 'email', 'phone', 'zip', 'product_interest', 'install_type', 'selected_color', 'rail_housing_color', 'selected_width', 'selected_height', 'notes', 'source_page', 'subject'],
  'quote-exterior-shades': ['name', 'email', 'phone', 'zip', 'product_interest', 'message', 'source_page', 'subject'],
  'quote-interior-shades': ['name', 'email', 'phone', 'zip', 'product_interest', 'message', 'source_page', 'subject'],
  'quote-shutters': ['name', 'email', 'phone', 'zip', 'product_interest', 'message', 'source_page', 'subject'],
  'quote-commercial': ['name', 'email', 'phone', 'zip', 'product_interest', 'message', 'source_page', 'subject']
};

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] ?? null;
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('Netlify handles CAPTCHA validation without a client-side timeout guard', () => {
  assert.doesNotMatch(siteScript, /initCaptchaGuard/);
  assert.doesNotMatch(siteScript, /Verification is not available right now/);
  assert.doesNotMatch(siteScript, /setInterval/);
  assert.doesNotMatch(siteScript, /button\[type="submit"\].*disabled/s);
});

test('every Netlify form has valid metadata, controls, labels, and server field handling', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));
  const formNames = [];

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const forms = page.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];

    for (const form of forms) {
      const formTag = form.match(/^<form\b[^>]*>/i)?.[0] || '';
      const formName = attribute(formTag, 'name');
      const controls = form.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];
      const fieldNames = [...new Set(
        controls
          .map((control) => attribute(control, 'name'))
          .filter((name) => name && !['bot-field', 'form-name'].includes(name))
      )];

      assert.ok(formName && allowedFields[formName], `${pageName} must use a recognized unique form name`);
      if (formName === 'parts-request') assert.equal(pageName, 'resources.html');
      formNames.push(formName);
      assert.equal(attribute(formTag, 'method')?.toUpperCase(), 'POST', `${formName} must POST`);
      assert.equal(attribute(formTag, 'action'), '/thanks/', `${formName} must use the success route`);
      assert.equal(attribute(formTag, 'data-netlify'), 'true', `${formName} must be registered with Netlify`);
      assert.equal(attribute(formTag, 'data-netlify-recaptcha'), 'true', `${formName} must enable CAPTCHA`);
      assert.equal(attribute(formTag, 'netlify-honeypot'), 'bot-field', `${formName} must declare its honeypot`);
      assert.match(form, new RegExp(`<input\\b[^>]*name="form-name"[^>]*value="${escapePattern(formName)}"`, 'i'));
      assert.match(form, /<input\b[^>]*name="subject"/i, `${formName} must include an email subject`);
      assert.match(form, /<input\b[^>]*name="source_page"/i, `${formName} must identify its source page`);
      assert.match(form, /<input\b[^>]*name="bot-field"/i, `${formName} must include its honeypot input`);
      assert.equal((form.match(/<div\b[^>]*data-netlify-recaptcha="true"[^>]*><\/div>/gi) || []).length, 1);
      const submitButtons = form.match(/<button\b[^>]*type="submit"[^>]*>[\s\S]*?<\/button>/gi) || [];
      assert.equal(submitButtons.length, 1);
      assert.doesNotMatch(submitButtons[0], /\bdisabled\b/i, `${formName} submit button must be enabled`);
      assert.match(submitButtons[0], />\s*[^<]+\s*<\/button>$/i, `${formName} submit button must have visible text`);
      assert.deepEqual(
        fieldNames.sort(),
        [...allowedFields[formName]].sort(),
        `${formName} HTML fields must exactly match the notification-function allowlist`
      );

      for (const control of controls) {
        const type = (attribute(control, 'type') || '').toLowerCase();
        const name = attribute(control, 'name');
        if (!name || type === 'hidden') continue;
        const id = attribute(control, 'id');
        const explicitLabel = id && new RegExp(`<label\\b[^>]*for="${escapePattern(id)}"`, 'i').test(form);
        const controlIndex = form.indexOf(control);
        const labelStart = form.lastIndexOf('<label', controlIndex);
        const labelEnd = form.indexOf('</label>', labelStart);
        const wrappedLabel = labelStart >= 0 && labelEnd > controlIndex;
        assert.ok(explicitLabel || wrappedLabel, `${formName} control ${name} must have an accessible label`);
      }
    }
  }

  assert.equal(formNames.length, 9);
  assert.deepEqual([...new Set(formNames)].sort(), Object.keys(allowedFields).sort());
});

test('all accepted form submissions trigger internal and customer notifications', async () => {
  const originalFetch = global.fetch;
  const originalLog = console.log;
  const originalEnvironment = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
    FROM_EMAIL: process.env.FROM_EMAIL
  };
  const requests = [];

  process.env.RESEND_API_KEY = 'test-key';
  process.env.NOTIFY_EMAIL = 'requests@tmaxrollups.com';
  process.env.FROM_EMAIL = 'website@tmaxrollups.com';
  console.log = () => {};
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'test-message' }) };
  };

  try {
    for (const [formName, fields] of Object.entries(allowedFields)) {
      const data = Object.fromEntries(fields.map((field) => [field, 'Audit value']));
      data.email = `${formName}@example.com`;
      data.phone = '7137729988';
      if (formName === 'quote-garage-doors') {
        data.selected_color = 'White';
        data.rail_housing_color = 'Black';
        data.selected_width = '8';
        data.selected_height = '8';
      }

      const response = await submissionFunction.handler({
        body: JSON.stringify({
          payload: { form_name: formName, data, created_at: '2026-09-02T12:00:00.000Z' }
        })
      });
      const responseBody = JSON.parse(response.body);
      assert.equal(response.statusCode, 200, `${formName} event must be accepted`);
      assert.deepEqual(responseBody, {
        accepted: true,
        internal_notification_sent: true,
        customer_confirmation_sent: true
      });
    }

    assert.equal(requests.length, Object.keys(allowedFields).length * 2);
    for (let index = 0; index < requests.length; index += 2) {
      const internal = requests[index];
      const customer = requests[index + 1];
      assert.equal(internal.url, 'https://api.resend.com/emails');
      assert.equal(internal.body.to, 'requests@tmaxrollups.com');
      assert.ok(internal.body.attachments?.[0]?.content, 'internal notification must include the form record');
      assert.equal(customer.body.from, 'website@tmaxrollups.com');
      assert.match(customer.body.to, /@example\.com$/);
      assert.equal(customer.body.reply_to, 'requests@tmaxrollups.com');
    }
  } finally {
    global.fetch = originalFetch;
    console.log = originalLog;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('the shared form success route resolves to the thank-you page', () => {
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8');
  assert.match(redirects, /^\/thanks\/\s+\/thanks\.html\s+200$/m);
  assert.match(fs.readFileSync(path.join(publicDir, 'thanks.html'), 'utf8'), /<h1[^>]*><span class="hero-title-text">Thank You<\/span><\/h1>/i);
});
