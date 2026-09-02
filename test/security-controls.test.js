'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('health endpoint reports readiness without deployment or environment details', async () => {
  const health = require('../netlify/functions/health.js');
  const response = await health.handler();
  const body = JSON.parse(response.body);

  assert.deepEqual(Object.keys(body).sort(), ['email_notifications_ready', 'ok']);
  assert.equal(body.ok, response.statusCode === 200);
  assert.equal(typeof body.email_notifications_ready, 'boolean');
  assert.doesNotMatch(response.body, /BRANCH|HEAD|DEPLOY|URL|RESEND|NOTIFY|FROM/i);
});

test('Netlify security headers constrain executable and embedded content', () => {
  const config = fs.readFileSync(path.join(rootDir, 'netlify.toml'), 'utf8');
  const csp = config.match(/Content-Security-Policy\s*=\s*"([^"]+)"/)?.[1] || '';

  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.doesNotMatch(csp, /'unsafe-eval'/);
  assert.match(config, /X-Content-Type-Options\s*=\s*"nosniff"/);
  assert.match(config, /Referrer-Policy\s*=\s*"strict-origin-when-cross-origin"/);
});
