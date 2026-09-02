'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const assetVersion = '20260902-1';

test('every shared CSS and JavaScript reference uses the current cache-reset version', () => {
  for (const pageName of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const sharedAssets = [...html.matchAll(/(?:href|src)=["'](\/assets\/[^"'?]+\.(?:css|js)(?:\?[^"']*)?)["']/gi)]
      .map((match) => match[1]);

    assert.ok(sharedAssets.length > 0, `${pageName} must load shared assets`);
    for (const asset of sharedAssets) {
      assert.match(asset, new RegExp(`\\?v=${assetVersion}$`), `${pageName}: ${asset}`);
    }
  }
});

test('Netlify revalidates mutable shared asset filenames instead of caching them as immutable', () => {
  const config = fs.readFileSync(path.join(rootDir, 'netlify.toml'), 'utf8');
  const assetHeaders = config.match(/\[\[headers\]\]\s*for = "\/assets\/\*"[\s\S]*?(?=\[\[headers\]\]|$)/)?.[0] || '';

  assert.match(assetHeaders, /Cache-Control = "public, max-age=0, must-revalidate"/);
  assert.doesNotMatch(assetHeaders, /immutable/i);
});
