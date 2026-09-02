'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('Feeling the Heat hero serves WebP with a JPEG fallback', () => {
  const webpName = 'feeling-the-heat.webp';
  const jpegName = 'feeling-the-heat.jpg';
  const webpPath = path.join(publicDir, 'images', webpName);
  const jpegPath = path.join(publicDir, 'images', jpegName);

  assert.match(homepage, new RegExp(`background-image: url\\('/images/${jpegName}'\\)`));
  assert.match(homepage, new RegExp(`image-set\\(url\\('/images/${webpName}'\\)`));
  assert.ok(fs.existsSync(webpPath), `${webpName} must exist`);
  assert.ok(fs.existsSync(jpegPath), `${jpegName} must exist`);

  const webpHeader = fs.readFileSync(webpPath).subarray(0, 12);
  assert.equal(webpHeader.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(webpHeader.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(fs.statSync(webpPath).size < 250_000, 'hero WebP must stay below 250 KB');
  assert.equal(fs.readFileSync(jpegPath).subarray(0, 2).toString('hex'), 'ffd8');
  assert.ok(fs.statSync(jpegPath).size < 300_000, 'hero JPEG must stay below 300 KB');
});

test('homepage gallery picture elements retain JPEG fallbacks', () => {
  assert.match(homepage, /<source srcset="\/images\/garage-black-country-bmw\.webp"[^>]*><img[^>]*src="\/images\/garage-black-country-bmw\.jpg"/);
  assert.match(homepage, /<source srcset="\/images\/gallery-black-luxury\.webp"[^>]*><img[^>]*src="\/images\/gallery-black-luxury\.jpg"/);
  assert.match(homepage, /<source srcset="\/images\/garage-double-charcoal\.webp"[^>]*><img[^>]*src="\/images\/garage-double-charcoal\.jpg"/);
});
