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

  assert.match(homepage, new RegExp(`--hero-image: image-set\\(url\\('/images/${webpName}'\\)`));
  assert.match(homepage, new RegExp(`url\\('/images/${jpegName}'\\) type\\('image/jpeg'\\)`));
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

test('homepage Our Work section contains only a centered installation carousel', () => {
  assert.doesNotMatch(homepage, /works-video-card|Exterior Shade Demonstration|From covered patio to open air|in motion/);
  assert.doesNotMatch(homepage, /exterior-shade-pool-demo\.mp4/);
  assert.match(homepage, /<div class="homepage-gallery">\s*<div class="gallery"/);
  assert.match(homepage, /\.homepage-gallery\s*\{[^}]*max-width:\s*900px[^}]*margin:\s*0 auto[^}]*\}/);
});

test('carousel quote buttons have a high-contrast translucent background', () => {
  const quoteButtons = homepage.match(/<a class="btn-ghost-dark" href="\/contact-us\/">Request a Quote<\/a>/g) || [];

  assert.equal(quoteButtons.length, 5);
  assert.match(
    homepage,
    /\.hero-slider \.btn-primary\s*\{[^}]*border-color:\s*#000[^}]*\}/
  );
  assert.match(
    homepage,
    /\.hero-slider \.btn-ghost-dark\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.82\)[^}]*color:\s*var\(--tmax-gold\)[^}]*border-color:\s*var\(--tmax-gold\)[^}]*font-weight:\s*700[^}]*\}/
  );
  assert.match(
    homepage,
    /\.hero-slider \.btn-ghost-dark:hover\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.9\)[^}]*color:\s*var\(--tmax-gold\)[^}]*border-color:\s*var\(--tmax-gold\)[^}]*\}/
  );
});
