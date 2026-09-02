'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const page = fs.readFileSync(path.join(publicDir, 'interior-shades.html'), 'utf8');
const galleryImages = [
  'interior-bedroom-shades.webp',
  'interior-hallway-shades.webp',
  'interior-coordinated-shades.webp',
  'interior-neolux-dual-shades.webp'
];

test('interior gallery uses the approved replacement photos', () => {
  const galleryStart = page.indexOf('<h2 class="section-title">Interior shade installations</h2>');
  const galleryEnd = page.indexOf('<section class="consult-section"', galleryStart);
  const gallery = page.slice(galleryStart, galleryEnd);
  const sources = Array.from(
    gallery.matchAll(/<img[^>]+src="\/images\/([^"]+)"/g),
    (match) => match[1]
  );

  assert.ok(galleryStart >= 0 && galleryEnd > galleryStart, 'interior installation gallery must exist');
  assert.deepEqual(sources, galleryImages);
  assert.equal((gallery.match(/loading="lazy"/g) || []).length, galleryImages.length);
  assert.equal((gallery.match(/decoding="async"/g) || []).length, galleryImages.length);
});

test('replacement interior photos are optimized WebP assets', () => {
  for (const name of galleryImages) {
    const filePath = path.join(publicDir, 'images', name);
    assert.ok(fs.existsSync(filePath), `${name} must exist`);
    const header = fs.readFileSync(filePath).subarray(0, 12);
    assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must be RIFF`);
    assert.equal(header.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must be WebP`);
    assert.ok(fs.statSync(filePath).size < 300_000, `${name} must stay below 300 KB`);
  }
});

test('interior demonstration video remains unchanged', () => {
  const [video] = page.match(/<video\b[^>]*>[\s\S]*?<\/video>/) || [];

  assert.ok(video, 'interior demonstration video must exist');
  assert.match(video, /poster="\/images\/new\/interior-shades-video-poster\.webp"/);
  assert.match(video, /src="\/videos\/interior-shades-demo\.mp4"/);
});
