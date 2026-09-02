'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const resourcesPage = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'resources.html'),
  'utf8'
);

test('catalog and warranty actions align at the bottom of equal-height cards', () => {
  assert.match(
    resourcesPage,
    /\.resource-feature-card\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*\}/
  );
  assert.match(
    resourcesPage,
    /\.resource-feature-card \.btn-secondary\s*\{[^}]*margin-top:\s*auto[^}]*align-self:\s*flex-start[^}]*\}/
  );
});
