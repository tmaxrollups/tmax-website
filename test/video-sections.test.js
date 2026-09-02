'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const videoPages = ['index.html', 'exterior-shades.html', 'interior-shades.html', 'commercial.html'];

test('below-the-fold videos remain user-initiated and defer network loading', () => {
  for (const pageName of videoPages) {
    const page = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    const videoTags = page.match(/<video\b[^>]*>/g) || [];

    assert.ok(videoTags.length > 0, `${pageName} must contain a video`);
    for (const videoTag of videoTags) {
      assert.match(videoTag, /\bcontrols(?:="")?\b/, `${pageName} video must show controls`);
      assert.match(videoTag, /\bpreload="none"/, `${pageName} video must defer loading`);
      assert.doesNotMatch(videoTag, /\bautoplay\b/, `${pageName} video must not autoplay`);
    }
  }
});
