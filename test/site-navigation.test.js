'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const siteScript = fs.readFileSync(path.join(publicDir, 'assets', 'site.js'), 'utf8');
const navigationStyles = fs.readFileSync(path.join(publicDir, 'assets', 'navigation.css'), 'utf8');
const browserStackSmoke = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'browserstack-smoke.js'), 'utf8');
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

test('all navigation labels use uppercase styling and never wrap', () => {
  const labelRule = navigationStyles.match(/\.site-nav\s*>\s*a,[\s\S]*?\.nav-products-menu a\s*\{[^}]*\}/)?.[0] || '';

  assert.match(labelRule, /text-transform:\s*uppercase/);
  assert.match(labelRule, /letter-spacing:\s*0\.055em/);
  assert.match(labelRule, /white-space:\s*nowrap/);
  assert.match(navigationStyles, /@media\s*\(min-width:\s*1181px\)[\s\S]*?\.site-nav\s*\{[^}]*flex-wrap:\s*nowrap[^}]*\}/);
});

test('desktop navigation keeps labels compact and centered without moving the quote button', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    if (!page.includes('class="site-nav"')) continue;

    assert.match(page, /\.site-nav\s*\{[^}]*\bflex:\s*1\b[^}]*\}/, `${pageName} navigation must fill available header space`);
  }

  const desktopRules = navigationStyles.match(/@media\s*\(min-width:\s*1181px\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  const navRule = desktopRules.match(/\.site-nav\s*\{[^}]*\}/)?.[0] || '';
  assert.match(navRule, /justify-content:\s*center/, 'desktop labels must be centered');
  assert.match(navRule, /gap:\s*clamp\(/, 'desktop labels must have a compact responsive gap');
  assert.match(navRule, /padding-left:\s*0/, 'desktop labels must not reserve space beside the logo');
  assert.match(navRule, /padding-right:\s*158px/, 'desktop labels must balance the logo footprint');
  assert.match(navRule, /position:\s*relative/, 'desktop navigation must anchor the quote button');
  assert.match(
    desktopRules,
    /\.site-nav\s*>\s*\.btn-primary\s*\{[^}]*position:\s*absolute[^}]*right:\s*0[^}]*\}/,
    'the quote button must remain anchored at the right edge'
  );
});

test('BrowserStack sizes the CSS viewport before checking the desktop breakpoint', () => {
  assert.match(browserStackSmoke, /async function setViewportSize\(driver, width, height\)/);
  assert.match(browserStackSmoke, /window\.innerWidth/);
  assert.match(browserStackSmoke, /setViewportSize\(driver, 1181, 900\)/);
  assert.doesNotMatch(browserStackSmoke, /setRect\(\{ width: 1181, height: 900 \}\)/);
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
    assert.match(page, /<link\b[^>]*href="\/assets\/navigation\.css\?v=20260902-1"[^>]*rel="stylesheet"[^>]*>/i);
  }
});

test('product dropdown has progressive close behavior', () => {
  assert.match(siteScript, /querySelectorAll\('\.nav-products'/);
  assert.match(siteScript, /event\.key === 'Escape'/);
  assert.match(siteScript, /contains\(event\.target\)/);
});
