// Netlify Forms event function: sends validated form submissions by email via Resend.
'use strict';

const FORM_FIELDS = {
  'consultation': ['name','email','phone','zip','interest','message','referral_source','source_page','subject'],
  'contact-message': ['name','email','phone','message','source_page','subject'],
  'dealer-application': ['first_name','last_name','email','phone','business_name','website','city','state','biz-type','years_in_business','employees','monthly_volume','products_of_interest','why_partner','source_page','subject'],
  'parts-request': ['name','email','phone','zip','product_interest','part_description','source_page','subject'],
  'quote-garage-doors': ['name','email','phone','zip','product_interest','install_type','selected_color','selected_width','selected_height','calculated_price','notes','source_page','subject'],
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
    if (!RESEND_API_KEY || !NOTIFY_EMAIL || !FROM_EMAIL) {
      console.error('Required email environment variables are not configured');
      return { statusCode: 500, body: 'Submission accepted; notification unavailable' };
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

    const res = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify(emailPayload)
    });
    if (!res.ok) {
      console.error('Resend API failure:', res.status);
      return { statusCode: 502, body: 'Submission accepted; notification delivery failed' };
    }
    const result = await res.json().catch(() => ({}));
    console.log('Form notification sent:', formName, result.id || 'no-id');
    return { statusCode: 200, body: JSON.stringify({ sent:true }) };
  } catch (error) {
    console.error('Submission function error:', error && error.message ? error.message : 'unknown error');
    return { statusCode: 500, body: 'Unable to process submission' };
  }
};
