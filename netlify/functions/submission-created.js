// Netlify Forms event function: sends validated form submissions by email via Resend.
'use strict';

const FORM_FIELDS = {
  'consultation': ['name','email','phone','zip','interest','message','referral_source','source_page','subject'],
  'contact-message': ['name','email','phone','message','source_page','subject'],
  'dealer-application': ['first_name','last_name','email','phone','business_name','website','city','state','biz-type','years_in_business','employees','monthly_volume','products_of_interest','why_partner','source_page','subject'],
  'parts-request': ['name','email','phone','zip','product_interest','part_description','source_page','subject'],
  'quote-garage-doors': ['name','email','phone','zip','product_interest','install_type','selected_color','rail_housing_color','selected_width','selected_height','notes','source_page','subject'],
  'quote-exterior-shades': ['name','email','phone','zip','product_interest','message','source_page','subject'],
  'quote-interior-shades': ['name','email','phone','zip','product_interest','message','source_page','subject'],
  'quote-shutters': ['name','email','phone','zip','product_interest','message','source_page','subject'],
  'quote-commercial': ['name','email','phone','zip','product_interest','message','source_page','subject']
};

const FORM_TITLES = {
  'consultation': 'Consultation Request',
  'contact-message': 'Contact Message',
  'dealer-application': 'Dealer Application',
  'parts-request': 'Parts & Accessories Request',
  'quote-garage-doors': 'Quote Request — Garage Doors',
  'quote-exterior-shades': 'Quote Request — Exterior Shades',
  'quote-interior-shades': 'Quote Request — Interior Shades',
  'quote-shutters': 'Quote Request — Shutters',
  'quote-commercial': 'Quote Request — Commercial Solutions'
};

const MAX_FIELD_LENGTH = 4000;
const MAX_FIELDS = 40;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /https?:\/\/|www\./ig;
const SPAM_PHRASES = /(?:crypto|casino|viagra|seo services|guest post|backlinks|loan offer)/i;

const GARAGE_PRICING_VERSION = '2026-08-30';
const GARAGE_PRICES = Object.freeze({
  '6': Object.freeze({'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530}),
  '7': Object.freeze({'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530}),
  '8': Object.freeze({'3':2600,'4':2735,'5':2870,'6':3000,'7':3130,'8':3130,'9':3265,'10':3531,'11':4065,'12':4065,'13':4465,'14':4465,'15':4465,'16':4465,'17':4595,'18.5':4730}),
  '9': Object.freeze({'3':3730,'4':3865,'5':3995,'6':4135,'7':4265,'8':4265,'9':4395,'10':4660,'11':5195,'12':5195,'13':5595,'14':5595,'15':5595,'16':5595,'17':5730,'18.5':5860})
});
const GARAGE_WIDTHS = Object.freeze(['3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18.5']);
const GARAGE_HEIGHTS = Object.freeze(['6','7','8','9','10','11','12']);
const GARAGE_QUOTE_HEIGHTS = new Set(['10','11','12']);
const GARAGE_DOOR_COLORS = new Set(['White','Beige','Brown','Black','Light Wood','Dark Wood']);
const GARAGE_RAIL_COLORS = new Set(['White','Brown','Black','Bronze']);

function isProductionEnvironment() {
  return !process.env.DEPLOY_PRIME_URL && process.env.BRANCH !== 'dev';
}

function getEmailEnvironmentStatus() {
  return {
    resend_api_key: Boolean(process.env.RESEND_API_KEY),
    notify_email: Boolean(process.env.NOTIFY_EMAIL),
    from_email: Boolean(process.env.FROM_EMAIL)
  };
}

function validateGarageColor(value) {
  const color = cleanValue(value);
  // Case-insensitive matching against allowed colors — return the canonical allowed value when matched
  const normalized = String(color).toLowerCase();
  const allowedLower = new Set([...GARAGE_DOOR_COLORS].map(c => String(c).toLowerCase()));
  if (!allowedLower.has(normalized)) throw new Error('Invalid garage door color');
  const matched = [...GARAGE_DOOR_COLORS].find(c => String(c).toLowerCase() === normalized);
  return matched || color;
}

function validateRailColor(value) {
  const color = cleanValue(value);
  const normalized = String(color).toLowerCase();
  const allowedLower = new Set([...GARAGE_RAIL_COLORS].map(c => String(c).toLowerCase()));
  if (!allowedLower.has(normalized)) throw new Error('Invalid rail/housing color');
  const matched = [...GARAGE_RAIL_COLORS].find(c => String(c).toLowerCase() === normalized);
  return matched || color;
}

function calculateGarageEstimate(widthValue, heightValue) {
  const width = cleanValue(widthValue);
  const height = cleanValue(heightValue);
  if (!GARAGE_WIDTHS.includes(width)) throw new Error('Invalid garage width');
  if (!GARAGE_HEIGHTS.includes(height)) throw new Error('Invalid garage height');
  if (GARAGE_QUOTE_HEIGHTS.has(height)) return null;
  const price = GARAGE_PRICES[height] && GARAGE_PRICES[height][width];
  if (!Number.isFinite(price)) throw new Error('Garage price unavailable');
  return price;
}

const formatCurrency = (amount) => '$' + Number(amount).toLocaleString('en-US');

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function cleanValue(value) {
  if (Array.isArray(value)) return value.slice(0, 25).map(cleanValue);
  if (value === null || value === undefined) return '';
  return String(value).replace(/\0/g, '').slice(0, MAX_FIELD_LENGTH).trim();
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid submission payload');
  const formName = String(payload.form_name || '');
  if (!Object.prototype.hasOwnProperty.call(FORM_FIELDS, formName)) throw new Error('Unknown form');
  const raw = payload.data && typeof payload.data === 'object' ? payload.data : {};
  if (Object.keys(raw).length > MAX_FIELDS) throw new Error('Too many fields');
  const allowed = new Set(FORM_FIELDS[formName]);
  const data = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowed.has(key)) data[key] = cleanValue(value);
  }
  if (data.email && !EMAIL_RE.test(String(data.email)) ) throw new Error('Invalid email');
  if (data.phone && String(data.phone).replace(/\D/g, '').length > 15) throw new Error('Invalid phone');
  if (formName === 'quote-garage-doors') {
    data.selected_color = cleanValue(data.selected_color);
    data.rail_housing_color = cleanValue(data.rail_housing_color);
    data.selected_width = cleanValue(data.selected_width);
    data.selected_height = cleanValue(data.selected_height);
    if (data.selected_color) data.selected_color = validateGarageColor(data.selected_color);
    if (data.rail_housing_color) data.rail_housing_color = validateRailColor(data.rail_housing_color);
    if (data.selected_width && !GARAGE_WIDTHS.includes(data.selected_width)) throw new Error('Invalid garage width');
    if (data.selected_height && !GARAGE_HEIGHTS.includes(data.selected_height)) throw new Error('Invalid garage height');
    const hasCompleteConfiguration = data.selected_color && data.rail_housing_color && data.selected_width && data.selected_height;
    const verifiedPrice = hasCompleteConfiguration
      ? calculateGarageEstimate(data.selected_width, data.selected_height)
      : null;
    data.server_verified_estimate = verifiedPrice === null ? 'Request quote' : formatCurrency(verifiedPrice);
    data.pricing_table_version = GARAGE_PRICING_VERSION;
  }
  const freeText = ['message','notes','part_description','why_partner'].map(k => data[k] || '').join(' ');
  const urlCount = (freeText.match(URL_RE) || []).length;
  if (urlCount > 3) throw new Error('Too many links');
  if (SPAM_PHRASES.test(freeText)) throw new Error('Spam pattern');
  return { formName, data };
}

const formatLabel = (key) => ({zip:'ZIP Code',email:'Email Address',phone:'Phone Number'}[key] || key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()));
const formatPhone = (val) => {
  const digits = String(val).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1')) return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return val;
};
const formatValue = (key, val) => {
  if (Array.isArray(val)) return escapeHtml(val.join(', '));
  if (val === '') return '<em style="color:#a0a0a0;">(not provided)</em>';
  if (key === 'email') return `<a href="mailto:${escapeHtml(val)}" style="color:#bf9749;text-decoration:none;">${escapeHtml(val)}</a>`;
  if (key === 'phone') {
    const digits = String(val).replace(/\D/g, '');
    return `<a href="tel:${digits}" style="color:#bf9749;text-decoration:none;">${escapeHtml(formatPhone(val))}</a>`;
  }
  return escapeHtml(String(val)).replace(/\n/g, '<br>');
};

async function sendNotifications({ formName, data, emailPayload, formTitle }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
  const FROM_EMAIL = process.env.FROM_EMAIL;

  // Helper to send via Resend. Uses RESEND_API_KEY from environment and never logs it.
  async function sendEmail(payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (RESEND_API_KEY) headers.Authorization = `Bearer ${RESEND_API_KEY}`;
    if (typeof fetch !== 'function') throw new Error('fetch unavailable in runtime');
    return fetch('https://api.resend.com/emails', { method: 'POST', headers, body: JSON.stringify(payload) });
  }

  // Send internal notification
  let internalSent = false;
  try {
    const resInternal = await sendEmail(emailPayload);
    if (!resInternal || !resInternal.ok) {
      const status = resInternal && resInternal.status; console.error('Resend API internal notification failure:', status || 'no-response');
    } else {
      const result = await resInternal.json().catch(() => ({}));
      console.log('Form notification sent:', formName, result.id || 'no-id');
      internalSent = true;
    }
  } catch (err) {
    console.error('Resend API internal error:', err && err.message ? err.message : err);
  }

  // Customer confirmation
  let customerSent = false;
  if (data && data.email) {
    try {
      const customerSubjects = {
        'dealer-application': 'We received your dealer application — TMAX Roll Ups',
        'parts-request': 'We received your parts request — TMAX Roll Ups',
        'consultation': 'We received your consultation request — TMAX Roll Ups',
        'contact-message': 'Thanks for contacting TMAX Roll Ups'
      };
      const quoteForms = new Set(['quote-garage-doors','quote-exterior-shades','quote-interior-shades','quote-shutters','quote-commercial']);
      const customerSubject = customerSubjects[formName] || (quoteForms.has(formName) ? 'We received your project request — TMAX Roll Ups' : `We received your request — TMAX Roll Ups`);

      const customerHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="620" style="background:#ffffff;margin:20px auto;border-radius:6px;overflow:hidden;border:1px solid #e9e9e9"><tr><td style="background:#59461f;padding:18px 24px;color:#ffffff;text-align:left"><h1 style="margin:0;font-size:20px;font-weight:700">TMAX Roll Ups</h1></td></tr><tr><td style="padding:20px 24px;color:#212121"><p style="font-size:16px;margin:0 0 12px">Thanks — we received your ${escapeHtml((formTitle||'request').toLowerCase())} and will review it shortly.</p><p style="font-size:14px;margin:0 0 16px;color:#555">Next steps: A TMAX representative will contact you to confirm details and provide an estimated timeline.</p><p style="font-size:14px;margin:0">If you need immediate assistance call <strong>713-772-9988</strong> or email <a href=\"mailto:info@tmaxrollups.com\">info@tmaxrollups.com</a>.</p></td></tr><tr><td style="background:#f4f4f4;padding:14px 24px;color:#777;font-size:13px;text-align:center">3831 Pinemont Dr, Houston, TX 77018 · 713-772-9988</td></tr></table></td></tr></table></body></html>`;

      const customerPayload = {
        from: FROM_EMAIL,
        to: data.email,
        reply_to: NOTIFY_EMAIL,
        subject: customerSubject,
        html: customerHtml
      };

      const resCust = await sendEmail(customerPayload);
      if (!resCust || !resCust.ok) {
        const status = resCust && resCust.status; console.error('Resend API customer confirmation failure:', status || 'no-response');
      } else {
        customerSent = true;
      }
    } catch (err) {
      console.error('Resend API customer confirmation error:', err && err.message ? err.message : err);
    }
  }

  return { internalSent, customerSent };
}

exports.handler = async function(event) {
  try {
    if (!event || !event.body) return { statusCode: 400, body: 'Invalid request' };
    let envelope;
    try { envelope = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid request' }; }
    const payload = envelope && envelope.payload;
    let validated;
    try { validated = validateSubmission(payload); }
    catch (err) {
      console.warn('Rejected form submission:', err.message);
      return { statusCode: 400, body: 'Invalid submission' };
    }

    const { formName, data } = validated;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
    const FROM_EMAIL = process.env.FROM_EMAIL;
    const emailEnabled = Boolean(RESEND_API_KEY && NOTIFY_EMAIL && FROM_EMAIL);
    if (!emailEnabled) {
      const envStatus = getEmailEnvironmentStatus();
      console.error('Required email environment variables are not configured; skipping notification step', envStatus);
      if (isProductionEnvironment()) {
        console.warn('Production environment is missing one or more required email variables', envStatus);
      }
    }

    const createdAt = payload.created_at ? new Date(payload.created_at) : new Date();
    const validDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
    const submittedAt = validDate.toLocaleString('en-US', {timeZone:'America/Chicago',dateStyle:'long',timeStyle:'short'});
    const formTitle = FORM_TITLES[formName];
    const sourcePage = data.source_page || null;
    const displayData = Object.entries(data).filter(([key]) => !['subject','source_page'].includes(key));

    const formRecordHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(formTitle)} — ${escapeHtml(submittedAt)}</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:760px;margin:32px auto;padding:40px 48px;color:#212121;line-height:1.5;background:#fff;border:1px solid #e5e5e5}.header{border-bottom:3px solid #d5aa51;padding-bottom:20px;margin-bottom:32px}.brand{font-size:22px;font-weight:800;color:#59461f}.field{margin-bottom:20px}.label{font-size:11px;text-transform:uppercase;font-weight:700;color:#7a7a7a}.value{font-size:17px;padding:10px 0;border-bottom:1px solid #e5e5e5;word-wrap:break-word}.footer{margin-top:48px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:13px;color:#7a7a7a;text-align:center}</style></head><body><div class="header"><div class="brand">TMAX Roll Ups</div><h1>${escapeHtml(formTitle)}</h1><p><strong>Submitted:</strong> ${escapeHtml(submittedAt)} CT${sourcePage ? ` &middot; <strong>Source:</strong> ${escapeHtml(sourcePage)}` : ''}</p></div>${displayData.map(([key,val]) => `<div class="field"><div class="label">${escapeHtml(formatLabel(key))}</div><div class="value">${formatValue(key,val)}</div></div>`).join('')}<div class="footer">Generated automatically from a TMAX Roll Ups website submission.<br>3831 Pinemont Dr, Houston, TX 77018 · 713-772-9988 · info@tmaxrollups.com</div></body></html>`;

    const emailHTML = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;color:#212121"><div style="border-bottom:3px solid #d5aa51;padding-bottom:12px;margin-bottom:20px"><strong style="color:#59461f">TMAX Roll Ups</strong><h2 style="color:#59461f">${escapeHtml(formTitle)}</h2><p style="color:#7a7a7a">${escapeHtml(submittedAt)} CT${sourcePage ? ` · from ${escapeHtml(sourcePage)}` : ''}</p></div>${displayData.map(([key,val]) => `<p><strong style="display:inline-block;min-width:140px;color:#59461f">${escapeHtml(formatLabel(key))}:</strong> ${formatValue(key,val)}</p>`).join('')}</div>`;

    const customerName = data.name || [data.first_name,data.last_name].filter(Boolean).join(' ') || 'submission';
    const dateStamp = validDate.toISOString().slice(0,10);
    const safeName = String(customerName).replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,40) || 'submission';
    const emailPayload = {
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `${formTitle}${customerName !== 'submission' ? ` — ${String(customerName).slice(0,100)}` : ''}`,
      html: emailHTML,
      attachments: [{ filename: `${formName}_${dateStamp}_${safeName}.html`, content: Buffer.from(formRecordHTML).toString('base64') }]
    };
    if (data.email) emailPayload.reply_to = data.email;

    const notifyResult = emailEnabled ? await sendNotifications({ formName, data, emailPayload, formTitle }) : { internalSent: false, customerSent: false };

    return { statusCode: 200, body: JSON.stringify({ accepted: true, internal_notification_sent: notifyResult.internalSent, customer_confirmation_sent: notifyResult.customerSent }) };
  } catch (error) {
    console.error('Submission function error:', error && error.message ? error.message : 'unknown error');
    return { statusCode: 500, body: 'Unable to process submission' };
  }
};

exports.calculateGarageEstimate = calculateGarageEstimate;
exports.validateGarageColor = validateGarageColor;
exports.validateRailColor = validateRailColor;
exports.validateSubmission = validateSubmission;
exports.sendNotifications = sendNotifications;
