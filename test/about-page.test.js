'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const aboutPage = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'about-us.html'),
  'utf8'
);

test('About TMAX section includes a company-story heading and supporting copy', () => {
  const section = aboutPage.match(
    /<section class="section section-white">\s*<div class="container container-narrow"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/
  );

  assert.ok(section, 'About TMAX section must exist');
  assert.match(section[1], /<h2>[^<]+<\/h2>/, 'company story must have a heading');
  assert.equal(
    (section[1].match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/g) || []).length,
    3,
    'section must include its eyebrow and two supporting paragraphs'
  );
});
