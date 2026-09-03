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

test('carousel actions use aligned high-contrast TMAX button styling', () => {
  const quoteButtons = homepage.match(/<a class="btn-ghost-dark" href="\/contact-us\/">Request a Quote<\/a>/g) || [];

  assert.equal(quoteButtons.length, 5);
  assert.match(
    homepage,
    /\.hero-slider \.hero-btns\s*\{[^}]*align-items:\s*stretch[^}]*gap:\s*12px[^}]*\}/
  );
  assert.match(
    homepage,
    /\.hero-slider \.hero-btns \.btn-primary,[\s\S]*?\.hero-slider \.hero-btns \.btn-ghost-dark\s*\{[^}]*min-height:\s*54px[^}]*padding:\s*14px 24px[^}]*border-radius:\s*3px[^}]*font-size:\s*13px[^}]*font-weight:\s*700[^}]*letter-spacing:\s*0\.055em[^}]*text-transform:\s*uppercase[^}]*\}/
  );
  assert.match(
    homepage,
    /\.hero-slider \.btn-primary\s*\{[^}]*background:\s*var\(--tmax-gold\)[^}]*color:\s*#000[^}]*border-color:\s*#000[^}]*\}/
  );
  assert.match(homepage, /\.hero-slider \.btn-ghost-dark\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.88\)[^}]*color:\s*var\(--tmax-gold\)[^}]*border-color:\s*var\(--tmax-gold\)[^}]*\}/);
  assert.match(homepage, /\.hero-slider \.hero-btns a:focus-visible\s*\{[^}]*outline:\s*3px solid #fff[^}]*outline-offset:\s*3px[^}]*\}/);
});

test('homepage hero cards omit decorative eyebrow labels', () => {
  assert.doesNotMatch(homepage, /<span class="hero-eyebrow">/);
});

test('homepage hero uses one full-image left-to-right overlay with aligned controls', () => {
  assert.doesNotMatch(homepage, /hero-panel-frame/);
  assert.equal((homepage.match(/<div class="hero-copy">/g) || []).length, 5);
  assert.match(homepage, /\.hero-slider \.hero-copy\s*\{[^}]*width:\s*min\(100%,\s*540px\)[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*\}/);
  assert.doesNotMatch(homepage, /\.hero-slider \.hero-copy::after/);
  assert.match(homepage, /\.hero-slider \.hero-slide h1,[\s\S]*?\.hero-slider \.hero-slide h2\s*\{[^}]*max-width:\s*540px[^}]*\}/);
  assert.match(homepage, /\.hero-slider \.hero-desc\s*\{[^}]*max-width:\s*540px[^}]*\}/);
  assert.doesNotMatch(homepage, /\.hero \.hero-desc\s*\{[^}]*max-width:\s*720px[^}]*\}/);
  assert.match(homepage, /\.hero:not\(\.hero-slider\) \.hero-desc\s*\{[^}]*max-width:\s*720px[^}]*\}/);
  assert.match(
    homepage,
    /\.hero-slider \.hero-content\s*\{[^}]*position:\s*absolute[^}]*left:\s*var\(--hero-panel-left\)[^}]*width:\s*var\(--hero-panel-width\)[^}]*border:\s*1px solid rgba\(213,\s*170,\s*81,\s*\.72\)[^}]*background:\s*transparent[^}]*z-index:\s*2[^}]*\}/
  );
  assert.match(homepage, /\.hero-slider-controls\s*\{[^}]*left:\s*var\(--hero-panel-left\)[^}]*width:\s*var\(--hero-panel-width\)[^}]*justify-content:\s*center[^}]*\}/);
  assert.match(homepage, /@media \(max-width:\s*720px\)[^{]*\{[^}]*\.hero-slider\s*\{[^}]*--hero-panel-left:\s*12px[^}]*--hero-panel-width:\s*calc\(100% - 24px\)[^}]*\}/);
  assert.match(homepage, /\.hero-slider \.hero-bg::after\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(0,\s*0,\s*0,\s*\.7\)\s*0%,\s*rgba\(0,\s*0,\s*0,\s*0\)\s*100%\)[^}]*\}/);
});
