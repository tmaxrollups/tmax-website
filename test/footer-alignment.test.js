'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('footer brand content is centered together on every page', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    assert.match(
      page,
      /\.footer-social\s*\{[^}]*justify-content:\s*center[^}]*\}/,
      `${pageName} must center its social icon row`
    );
    assert.match(
      page,
      /\.footer-grid \.footer-col:first-child\s*\{[^}]*text-align:\s*center[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*align-items:\s*center[^}]*\}/,
      `${pageName} must center its logo, tagline, and social icons as one group`
    );
  }
});
