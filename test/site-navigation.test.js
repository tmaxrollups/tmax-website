'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const siteScript = fs.readFileSync(path.join(publicDir, 'assets', 'site.js'), 'utf8');
const productLinks = [
  ['/garage-doors/', 'Garage Doors'],
  ['/exterior-shades/', 'Exterior Shades'],
  ['/interior-shades/', 'Interior Shades'],
  ['/shutters/', 'Shutters']
];

function navigationFor(page) {
  return page.match(/<nav\b[^>]*id="primary-nav"[^>]*>([\s\S]*?)<\/nav>/i)?.[1] || '';
}

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

test('every primary navigation groups the four product pages under Our Products', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    if (!page.includes('id="primary-nav"')) continue;
    const navigation = navigationFor(page);
    const details = navigation.match(/<details\b[^>]*class="[^"]*nav-products[^"]*"[^>]*>([\s\S]*?)<\/details>/gi) || [];

    assert.equal(details.length, 1, `${pageName} must have one Our Products dropdown`);
    assert.match(details[0], /<summary>\s*Our Products\s*<\/summary>/i);
    for (const [href, label] of productLinks) {
      assert.match(details[0], new RegExp(`<a\\b[^>]*href="${href}"[^>]*>\\s*${label}\\s*<\\/a>`, 'i'));
      const withoutDropdown = navigation.replace(details[0], '');
      assert.doesNotMatch(withoutDropdown, new RegExp(`href="${href}"`, 'i'), `${pageName} must not duplicate ${label} at the top level`);
    }
    assert.match(page, /<link\b[^>]*href="\/assets\/navigation\.css"[^>]*rel="stylesheet"[^>]*>/i);
  }
});

test('product dropdown has progressive close behavior', () => {
  assert.match(siteScript, /querySelectorAll\('\.nav-products'/);
  assert.match(siteScript, /event\.key === 'Escape'/);
  assert.match(siteScript, /contains\(event\.target\)/);
});
