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

test('desktop navigation fills the header and spaces links evenly on every page', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    if (!page.includes('class="site-nav"')) continue;

    const [navRule] = page.match(/\.site-nav\s*\{[^}]*\}/) || [];
    assert.ok(navRule, `${pageName} must define desktop navigation layout`);
    assert.match(navRule, /\bflex:\s*1\b/, `${pageName} navigation must fill available header space`);
    assert.match(
      navRule,
      /justify-content:\s*space-between/,
      `${pageName} navigation links must be evenly distributed`
    );
  }
});
