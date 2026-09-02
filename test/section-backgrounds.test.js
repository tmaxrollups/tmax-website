'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

function backgroundFor(classes) {
  if (classes.includes('section-alt')) return 'tan';
  if (classes.includes('section-white') || classes.includes('intro-section')) return 'white';
  return null;
}

test('content sections start white and alternate white and tan on every page', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));

  for (const pageName of pages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const sectionTags = Array.from(page.matchAll(/<section\b[^>]*>/g), (match) => match[0]);
    const contentBackgrounds = [];

    for (const tag of sectionTags) {
      const classes = (tag.match(/class="([^"]*)"/)?.[1] || '').split(/\s+/).filter(Boolean);
      if (classes.includes('dealer-cta')) {
        assert.equal(pageName, 'index.html', 'only the homepage may use the black dealer CTA');
        assert.equal(tag, sectionTags.at(-1), 'the black dealer CTA must be the final homepage section');
        continue;
      }

      const background = backgroundFor(classes);
      const isContentSection = classes.includes('section') ||
        classes.includes('intro-section') ||
        classes.includes('consult-section');

      if (isContentSection) {
        assert.ok(background, `${pageName} has a content section without an explicit background: ${tag}`);
      }
      if (background) contentBackgrounds.push(background);
    }

    for (const [index, background] of contentBackgrounds.entries()) {
      const expected = index % 2 === 0 ? 'white' : 'tan';
      assert.equal(
        background,
        expected,
        `${pageName} content section ${index + 1} must be ${expected}, received ${background}`
      );
    }
  }
});
