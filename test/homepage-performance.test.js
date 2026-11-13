'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('fall hero uses an existing JPEG source with responsive WebP delivery', () => {
  const imagePath = path.join(publicDir, 'images', 'customer-patio-fall-hero.jpg');
  assert.equal(fs.readFileSync(imagePath).subarray(0, 2).toString('hex'), 'ffd8');
  assert.ok(fs.statSync(imagePath).size < 1_500_000, 'source image must stay below 1.5 MB');
  assert.match(homepage, /Fresh Air\. <em>Favorite Chair\.<\/em>/);
  assert.match(homepage, /url=\/images\/customer-patio-fall-hero\.jpg&amp;w=1920&amp;q=75&amp;fm=webp/);
  assert.match(homepage, /url=\/images\/customer-patio-fall-hero\.jpg&w=960&q=75&fm=webp/);
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
  const quoteButtons = homepage.match(/<a class="btn-ghost-dark" href="\/contact-us\/">(?:<svg[\s\S]*?<\/svg>)?Request a Quote<\/a>/g) || [];

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

test('homepage hero uses one borderless full-image overlay with wrapping copy', () => {
  assert.doesNotMatch(homepage, /hero-panel-frame/);
  assert.equal((homepage.match(/<div class="hero-copy">/g) || []).length, 5);
  assert.match(homepage, /\.hero-slider \.hero-copy\s*\{[^}]*width:\s*calc\(100vw - var\(--hero-panel-left\) - 24px\)[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*\}/);
  assert.doesNotMatch(homepage, /\.hero-slider \.hero-copy::after/);
  assert.match(homepage, /\.hero-slider \.hero-slide h1,[\s\S]*?\.hero-slider \.hero-slide h2\s*\{[^}]*font-size:\s*clamp\([^}]*white-space:\s*normal[^}]*\}/);
  assert.match(homepage, /\.hero-slider \.hero-desc\s*\{[^}]*font-size:\s*clamp\([^}]*white-space:\s*normal[^}]*\}/);
  assert.doesNotMatch(homepage, /\.hero \.hero-desc\s*\{[^}]*max-width:\s*720px[^}]*\}/);
  assert.match(homepage, /\.hero:not\(\.hero-slider\) \.hero-desc\s*\{[^}]*max-width:\s*720px[^}]*\}/);
  assert.match(
    homepage,
    /\.hero-slider \.hero-content\s*\{[^}]*position:\s*absolute[^}]*left:\s*var\(--hero-panel-left\)[^}]*width:\s*var\(--hero-panel-width\)[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none[^}]*z-index:\s*2[^}]*\}/
  );
  assert.match(homepage, /\.hero-slider-controls\s*\{[^}]*left:\s*50%[^}]*bottom:\s*24px[^}]*width:\s*max-content[^}]*transform:\s*translateX\(-50%\)[^}]*display:\s*grid[^}]*\}/);
  assert.match(homepage, /\.hero-arrow\s*\{[^}]*width:\s*44px[^}]*height:\s*44px[^}]*display:\s*grid[^}]*place-items:\s*center[^}]*padding:\s*0[^}]*\}/);
  assert.match(homepage, /@media \(max-width:\s*720px\)[^{]*\{[^}]*\.hero-slider\s*\{[^}]*--hero-panel-left:\s*12px[^}]*--hero-panel-width:\s*calc\(100% - 24px\)[^}]*\}/);
  assert.match(homepage, /@media \(max-width:\s*720px\)[\s\S]*?\.hero-slider \.hero-copy\s*\{[^}]*width:\s*100%[^}]*\}[\s\S]*?\.hero-slider \.hero-slide h1,[^}]*white-space:\s*normal[^}]*\}[\s\S]*?\.hero-slider \.hero-desc\s*\{[^}]*white-space:\s*normal[^}]*\}/);
  assert.match(homepage, /\.hero-slider \.hero-bg::after\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(0,\s*0,\s*0,\s*\.7\)\s*0%,\s*rgba\(0,\s*0,\s*0,\s*\.5\)\s*50%,\s*rgba\(0,\s*0,\s*0,\s*0\)\s*100%\)[^}]*\}/);
});
