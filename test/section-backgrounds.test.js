'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

function backgroundFor(classes) {
  if (classes.includes('consult-section')) return 'tint';
  if (classes.includes('dealer-cta')) return 'accent';
  if (classes.includes('section-alt')) return 'soft';
  if (classes.includes('section-white') || classes.includes('intro-section')) return 'white';
  return null;
}

test('content section backgrounds alternate on every page', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const sectionTags = Array.from(page.matchAll(/<section\b[^>]*>/g), (match) => match[0]);
    let previousBackground = null;

    for (const tag of sectionTags) {
      const classes = (tag.match(/class="([^"]*)"/)?.[1] || '').split(/\s+/).filter(Boolean);
      const background = backgroundFor(classes);

      if (classes.includes('section')) {
        assert.ok(background, `${pageName} has a content section without an explicit background: ${tag}`);
      }
      if (!background) continue;

      assert.notEqual(
        background,
        previousBackground,
        `${pageName} has consecutive ${background} content sections`
      );
      previousBackground = background;
    }
  }
});
