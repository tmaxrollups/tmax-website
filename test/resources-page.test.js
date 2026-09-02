'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const resourcesPage = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'resources.html'),
  'utf8'
);
const publicDir = path.join(__dirname, '..', 'public');

test('catalog and warranty actions align at the bottom of equal-height cards', () => {
  assert.match(
    resourcesPage,
    /\.resource-feature-card\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*\}/
  );
  assert.match(
    resourcesPage,
    /\.resource-feature-card \.btn-secondary\s*\{[^}]*margin-top:\s*auto[^}]*align-self:\s*flex-start[^}]*\}/
  );
});

test('Resources is the single documents, controls, galleries, and parts hub', () => {
  for (const target of ['documents', 'controls', 'galleries', 'parts-request']) {
    assert.match(resourcesPage, new RegExp(`id="${target}"`, 'i'), `Resources must expose the ${target} jump target`);
  }

  for (const heading of ['Replacement Motors', 'Wi-Fi Hubs', 'Remotes &amp; Wall Controls', 'TMAX Keypad']) {
    assert.match(resourcesPage, new RegExp(`<h3>\\s*${heading}\\s*<\\/h3>`, 'i'));
  }

  for (const href of ['/garage-doors/', '/shutters/', '/exterior-shades/', '/interior-shades/', '/commercial/', '/#our-work']) {
    assert.match(resourcesPage, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i'));
  }

  assert.match(resourcesPage, /<form\b[^>]*name="parts-request"[^>]*>/i);
  assert.equal(fs.existsSync(path.join(publicDir, 'accessories.html')), false, 'Accessories must not remain as a page');
});

test('parts request does not ask for or accept photo uploads', () => {
  const form = resourcesPage.match(/<form\b[^>]*name="parts-request"[^>]*>[\s\S]*?<\/form>/i)?.[0] || '';
  assert.ok(form, 'Resources must contain the parts-request form');
  assert.doesNotMatch(form, /type="file"/i);
  assert.doesNotMatch(form, /\bphotos?\b/i);
  assert.doesNotMatch(resourcesPage, /photos? of the (?:motor|original)/i);
});
