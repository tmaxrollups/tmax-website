'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');

const additions = {
  'commercial.html': ['commercial-white-storefront-shutters.webp'],
  'exterior-shades.html': [
    'exterior-shades-estate.webp',
    'exterior-shades-modern-pool-house.webp',
    'exterior-shades-screened-balcony.webp'
  ],
  'garage-doors.html': [
    'garage-black-entry-door.webp',
    'garage-black-residential-door.webp'
  ],
  'shutters.html': [
    'shutters-black-compact.webp',
    'shutters-white-residential.webp'
  ]
};

function galleryMarkup(page) {
  const start = page.indexOf('<div class="gallery"');
  const end = page.indexOf('</section>', start);
  assert.ok(start >= 0 && end > start, 'product gallery must exist');
  return page.slice(start, end);
}

test('new still images are optimized and assigned to the appropriate product galleries', () => {
  for (const [pageName, imageNames] of Object.entries(additions)) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const gallery = galleryMarkup(page);
    for (const imageName of imageNames) {
      assert.match(gallery, new RegExp(`src="/images/${imageName}"`), `${imageName} must be in ${pageName}`);
      const imagePath = path.join(imagesDir, imageName);
      assert.ok(fs.existsSync(imagePath), `${imageName} must exist`);
      assert.ok(fs.statSync(imagePath).size < 500_000, `${imageName} must stay below 500 KB`);
    }
  }
});

test('each product carousel contains unique image sources', () => {
  for (const pageName of Object.keys(additions).concat('interior-shades.html')) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const sources = Array.from(galleryMarkup(page).matchAll(/<img[^>]+src="([^"]+)"/g), (match) => match[1]);
    assert.equal(new Set(sources).size, sources.length, `${pageName} carousel must not repeat an image`);
  }
});

test('high-resolution interior shade photo replaces both headers but is not repeated in its carousel', () => {
  const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const interior = fs.readFileSync(path.join(publicDir, 'interior-shades.html'), 'utf8');
  const imageName = 'interior-shade-modern-living-room.webp';
  const carouselImageName = 'interior-shade-blue-sofa.webp';

  assert.match(homepage, new RegExp(`--hero-image: url\\('/images/${imageName}'\\)`));
  assert.match(interior, new RegExp(`--hero-image: url\\('/images/${imageName}'\\)`));
  assert.doesNotMatch(galleryMarkup(interior), new RegExp(imageName));
  assert.match(galleryMarkup(interior), new RegExp(`src="/images/${carouselImageName}"`));
  assert.doesNotMatch(galleryMarkup(interior), /interior-hallway-shades\.webp/);

  for (const optimizedImage of [imageName, carouselImageName]) {
    const imagePath = path.join(imagesDir, optimizedImage);
    assert.ok(fs.existsSync(imagePath), `${optimizedImage} must exist`);
    assert.ok(fs.statSync(imagePath).size < 500_000, `${optimizedImage} must stay below 500 KB`);
  }
});
