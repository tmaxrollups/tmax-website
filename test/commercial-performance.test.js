'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const commercialPage = fs.readFileSync(path.join(publicDir, 'commercial.html'), 'utf8');

test('commercial page references only existing local media and scripts', () => {
  const references = Array.from(
    commercialPage.matchAll(/\b(?:poster|src|srcset)="(\/[^"\s]+)"/g),
    (match) => match[1]
  );

  assert.ok(references.length > 0, 'commercial page must contain local resources');
  for (const reference of references) {
    const filePath = path.join(publicDir, ...reference.slice(1).split('/'));
    assert.ok(fs.existsSync(filePath), `missing local resource: ${reference}`);
  }
});

test('commercial video remains user-initiated and defers network loading', () => {
  const [videoTag] = commercialPage.match(/<video\b[^>]*id="commercial-shutter-video"[^>]*>/) || [];

  assert.ok(videoTag, 'commercial shutter video must exist');
  assert.match(videoTag, /\bcontrols(?:="")?\b/);
  assert.match(videoTag, /\bpreload="none"/);
  assert.doesNotMatch(videoTag, /\bautoplay\b/);
});
