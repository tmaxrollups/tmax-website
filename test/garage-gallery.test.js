'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const page = fs.readFileSync(path.join(publicDir, 'garage-doors.html'), 'utf8');
const browserStackSmoke = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'browserstack-smoke.js'), 'utf8');
const hero = 'garage-woodgrain-exterior.webp';
const intro = 'garage-woodgrain-interior-new.webp';
const galleryImages = [
  'garage-country-bmw-new.webp',
  'garage-three-black-interior.webp',
  'garage-black-modern-interior.webp',
  'garage-commercial-white.webp',
  'garage-white-residential.webp',
  'garage-brown-closeup.webp',
  'garage-black-stone-home.webp'
];
const colorImages = {
  White: 'garage-color-white-ral9002.webp',
  Beige: 'garage-color-beige-ral1019.webp',
  Bronze: 'garage-color-bronze-ral7022.webp',
  Black: 'garage-color-black.webp',
  'Light Wood': 'garage-color-light-wood.webp',
  'Dark Wood': 'garage-color-dark-wood.webp'
};

test('garage page uses the approved replacement photo set', () => {
  assert.match(page, new RegExp(`--hero-image: url\\('/images/${hero}'\\)`));
  assert.match(page, new RegExp(`src="/images/${intro}"`));

  const galleryStart = page.indexOf('<h2 class="section-title">Roll-up garage-door installations</h2>');
  const galleryEnd = page.indexOf('<!-- FOOTER -->', galleryStart);
  const gallery = page.slice(galleryStart, galleryEnd);
  const sources = Array.from(gallery.matchAll(/<img[^>]+src="\/images\/([^"]+)"/g), (match) => match[1]);

  assert.deepEqual(sources, galleryImages);
});

test('replacement garage photos are optimized WebP assets', () => {
  for (const name of [hero, intro, ...galleryImages]) {
    const filePath = path.join(publicDir, 'images', name);
    assert.ok(fs.existsSync(filePath), `${name} must exist`);
    const header = fs.readFileSync(filePath).subarray(0, 12);
    assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must be RIFF`);
    assert.equal(header.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must be WebP`);
    assert.ok(fs.statSync(filePath).size < 500_000, `${name} must stay below 500 KB`);
  }
});

test('garage configurator uses the supplied finish images instead of generated swatches', () => {
  for (const [label, name] of Object.entries(colorImages)) {
    assert.match(
      page,
      new RegExp(`<button[^>]+data-color="${label}"[^>]*>[\\s\\S]*?<img[^>]+loading="lazy"[^>]+src="/images/${name}"[^>]*>[\\s\\S]*?<span class="tmax-swatch-label">${label}</span>`)
    );
    assert.ok(fs.existsSync(path.join(publicDir, 'images', name)), `${name} must exist`);
  }

  assert.doesNotMatch(page, /class="tmax-swatch-chip" style="background:/);
});

test('BrowserStack verifies every garage finish image loads', () => {
  assert.match(browserStackSmoke, /const garageUrl = new URL\('garage-doors\.html', localUrl\)\.href/);
  assert.match(browserStackSmoke, /verifyGaragePage\(driver, browser\)/);
  assert.match(browserStackSmoke, /for \(const image of finishImages\)[\s\S]*?scrollIntoView[\s\S]*?naturalWidth > 0 && image\.complete/);
  assert.doesNotMatch(browserStackSmoke, /Array\.from\(document\.querySelectorAll\('\.tmax-swatch-chip'\)\)[\s\S]*?\.every/);
  assert.match(browserStackSmoke, /finishImages\.length, 6/);
});
