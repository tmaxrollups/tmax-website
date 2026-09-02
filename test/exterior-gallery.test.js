'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'exterior-shades.html'),
  'utf8'
);

test('exterior installation gallery omits the two open-patio images', () => {
  const galleryStart = page.indexOf('<h2 class="section-title">Exterior shade and screen installations</h2>');
  const galleryEnd = page.indexOf('<!-- QUOTE FORM -->', galleryStart);
  const gallery = page.slice(galleryStart, galleryEnd);

  assert.ok(galleryStart >= 0 && galleryEnd > galleryStart, 'exterior installation gallery must exist');
  assert.doesNotMatch(gallery, /patio-open-exterior\.webp/);
  assert.doesNotMatch(gallery, /patio-open-view\.webp/);
  assert.equal((gallery.match(/class="gal-cell(?: featured)?"/g) || []).length, 10);
});
