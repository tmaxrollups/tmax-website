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
const browserstackSmoke = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'browserstack-smoke.js'),
  'utf8'
);

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

test('Resources is the single documents, controls, and parts hub', () => {
  for (const target of ['documents', 'controls', 'parts-request']) {
    assert.match(resourcesPage, new RegExp(`id="${target}"`, 'i'), `Resources must expose the ${target} jump target`);
  }

  for (const heading of ['Replacement Motors', 'Wi-Fi Hubs', 'Remotes &amp; Wall Controls', 'TMAX Keypad']) {
    assert.match(resourcesPage, new RegExp(`<h3>\\s*${heading}\\s*<\\/h3>`, 'i'));
  }

  assert.match(resourcesPage, /<form\b[^>]*name="parts-request"[^>]*>/i);
  assert.doesNotMatch(resourcesPage, /id="galleries"|Product Galleries/i);
  assert.equal(fs.existsSync(path.join(publicDir, 'accessories.html')), false, 'Accessories must not remain as a page');
});

test('parts request does not ask for or accept photo uploads', () => {
  const form = resourcesPage.match(/<form\b[^>]*name="parts-request"[^>]*>[\s\S]*?<\/form>/i)?.[0] || '';
  assert.ok(form, 'Resources must contain the parts-request form');
  assert.doesNotMatch(form, /type="file"/i);
  assert.doesNotMatch(form, /\bphotos?\b/i);
  assert.match(form, /<textarea\b[^>]*name="part_description"[^>]*required/i);
  assert.doesNotMatch(resourcesPage, /photos? of the (?:motor|original)/i);
});

test('BrowserStack smoke coverage includes Resources navigation, documents, and form', () => {
  assert.match(browserstackSmoke, /const resourcesUrl = new URL\('resources\.html', localUrl\)\.href/);
  assert.match(browserstackSmoke, /async function verifyResourcesPage\(driver, browser\)/);
  assert.match(browserstackSmoke, /await verifyResourcesPage\(driver, browser\)/);
  assert.match(browserstackSmoke, /TMAX-Product-Catalog-2026\.pdf/);
  assert.match(browserstackSmoke, /TMAX-Product-Warranty\.pdf/);
  assert.match(browserstackSmoke, /form\[name="parts-request"\]/);
  assert.match(browserstackSmoke, /duplicateIds/);
  assert.match(browserstackSmoke, /setViewportSize\(driver, 390, 900\)/);
  assert.match(browserstackSmoke, /\.menu-toggle/);
});
