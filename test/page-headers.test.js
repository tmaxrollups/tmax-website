'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const sharedStyles = fs.readFileSync(path.join(publicDir, 'assets', 'accessibility.css'), 'utf8');

test('non-home heroes omit decorative eyebrow labels', () => {
  let heroCount = 0;

  for (const pageName of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html') && name !== 'index.html')) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const hero = html.match(/<section\b[^>]*class="[^"]*\b(?:page-header|hero)\b[^"]*"[^>]*>[\s\S]*?<\/section>/i)?.[0];
    if (!hero) continue;

    heroCount += 1;
    assert.doesNotMatch(hero, /class="hero-eyebrow"/, `${pageName} must not show a decorative hero label`);
  }

  assert.equal(heroCount, 13, 'every non-home hero must be checked');
});

test('non-home hero content is centered horizontally and vertically', () => {
  const pageHeaderRule = sharedStyles.match(/\.page-header\s*\{[^}]*\}/)?.[0] || '';
  const containerRule = sharedStyles.match(/\.page-header\s*>\s*\.container\s*\{[^}]*\}/)?.[0] || '';
  const contentRule = sharedStyles.match(/\.page-header-content,[\s\S]*?\.hero:not\(\.hero-slider\) \.hero-content\s*\{[^}]*\}/)?.[0] || '';
  const actionsRule = sharedStyles.match(/\.hero:not\(\.hero-slider\) \.hero-btns\s*\{[^}]*\}/)?.[0] || '';

  assert.match(pageHeaderRule, /display:\s*flex/);
  assert.match(pageHeaderRule, /align-items:\s*center/);
  assert.match(pageHeaderRule, /justify-content:\s*center/);
  assert.match(pageHeaderRule, /min-height:\s*280px/);
  assert.match(pageHeaderRule, /padding:\s*56px 0/);
  assert.match(containerRule, /width:\s*100%/);
  assert.match(contentRule, /display:\s*flex/);
  assert.match(contentRule, /flex-direction:\s*column/);
  assert.match(contentRule, /align-items:\s*center/);
  assert.match(contentRule, /justify-content:\s*center/);
  assert.match(contentRule, /text-align:\s*center/);
  assert.match(actionsRule, /justify-content:\s*center/);

  const thankYouPage = fs.readFileSync(path.join(publicDir, 'thanks.html'), 'utf8');
  assert.match(thankYouPage, /<section class="hero" style="min-height:\s*auto;\s*padding:\s*90px 0;">/);
});
