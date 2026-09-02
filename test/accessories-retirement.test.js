'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('all Accessories URLs permanently redirect to Resources', () => {
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8');
  for (const route of ['/accessories', '/accessories/', '/accessories.html', '/product/accessories', '/product/accessories/*']) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(redirects, new RegExp(`^${escaped}\\s+/resources/\\s+301$`, 'm'), `${route} must redirect permanently`);
  }
});

test('public pages and sitemap no longer reference Accessories URLs', () => {
  const files = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html') || name === 'sitemap.xml');
  for (const fileName of files) {
    const contents = fs.readFileSync(path.join(publicDir, fileName), 'utf8');
    assert.doesNotMatch(contents, /(?:href="|<loc>[^<]*)[^"<]*\/accessories(?:[/.]|$)/i, `${fileName} must use Resources`);
    if (fileName.endsWith('.html')) {
      const footer = contents.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] || '';
      assert.ok((footer.match(/href="\/resources\/"/g) || []).length <= 1, `${fileName} footer must not duplicate Resources`);
    }
  }

  const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
  const resourcesEntries = sitemap.match(/<loc>https:\/\/tmax-rollups\.netlify\.app\/resources(?:\.html|\/)?<\/loc>/g) || [];
  assert.equal(resourcesEntries.length, 1, 'sitemap must contain one canonical Resources entry');
});
