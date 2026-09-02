'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('desktop navigation labels stay on one line on every page', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    if (!page.includes('class="site-nav"')) continue;

    assert.match(
      page,
      /\.site-nav a\s*\{[^}]*white-space:\s*nowrap[^}]*\}/,
      `${pageName} must prevent desktop navigation labels from wrapping`
    );
  }
});
