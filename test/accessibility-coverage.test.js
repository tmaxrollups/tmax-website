'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const auditScript = path.join(rootDir, 'scripts', 'pa11y-audit.js');
const sharedStylesheet = '/assets/accessibility.css';

test('pa11y command audits every public page at desktop and mobile sizes', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['test:a11y'], 'node scripts/pa11y-audit.js');
  assert.ok(packageJson.devDependencies.pa11y, 'pa11y must be a development dependency');
  assert.ok(fs.existsSync(auditScript), 'the pa11y audit script must exist');

  const { listPages, viewports } = require(auditScript);
  const source = fs.readFileSync(auditScript, 'utf8');
  const publicPages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html')).sort();

  assert.deepEqual(listPages(), publicPages);
  assert.deepEqual(viewports, [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ]);
  assert.match(source, /server\.listen\(0, host/);
  assert.match(source, /process\.argv\.includes\('\-\-no-sandbox'\)/);
  assert.match(source, /chromeLaunchConfig\s*=\s*process\.argv[\s\S]*?\?\s*\{\s*args:\s*\['--no-sandbox'\]/);
  assert.doesNotMatch(source, /const port\s*=\s*4175/);
});

test('every public page loads the shared accessibility styles last', () => {
  for (const pageName of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    assert.match(html, new RegExp(`<link[^>]+href=["']${sharedStylesheet.replace('/', '\\/')}["'][^>]*>\\s*</head>`), pageName);
  }
});

test('shared styles preserve readable text and controls', () => {
  const css = fs.readFileSync(path.join(publicDir, 'assets', 'accessibility.css'), 'utf8');
  assert.match(css, /--tmax-gold-dark:\s*#7a591c/i);
  assert.match(css, /\.site-nav \.btn-primary\s*{[^}]*color:\s*#000/is);
  assert.match(css, /\.media-video\s*{[^}]*color:\s*#fff/is);
  assert.match(css, /\.hero h1,[^}]*\.hero-desc\s*{[^}]*background:\s*#000/is);
  assert.match(css, /\.page-header \.hero-eyebrow,[^}]*\.page-header-desc\s*{[^}]*background:\s*#000/is);
  assert.doesNotMatch(css, /\.hero \.hero-content\s*{[^}]*background:/is);
  assert.doesNotMatch(css, /\.page-header-content\s*{[^}]*background:/is);
  assert.match(css, /\.tmax-price-display\s*{[^}]*background:\s*#fbf7ee\s*!important/is);
  assert.match(css, /\.warranty-badge\s*{[^}]*background:\s*#f3cf7a\s*!important/is);
  assert.match(css, /\.warranty-badge::before\s*{[^}]*content:\s*"✓"/is);
});

test('carousel semantics and media captions require no audit exclusions', () => {
  const galleryScript = fs.readFileSync(path.join(publicDir, 'assets', 'gallery.js'), 'utf8');
  const pa11yScript = fs.readFileSync(auditScript, 'utf8');

  assert.match(galleryScript, /gallery\.setAttribute\('role', 'region'\)/);
  for (const pageName of ['commercial.html', 'exterior-shades.html', 'interior-shades.html']) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    assert.match(html, /<track[^>]+kind="captions"[^>]+src="\/captions\//, pageName);
  }
  assert.doesNotMatch(pa11yScript, /hideElements/);
  assert.doesNotMatch(pa11yScript, /ignoreRules|rules:\s*\{|ignore:\s*\[/);
});

test('contact location uses an accessible external map link without an unauditable frame', () => {
  const contact = fs.readFileSync(path.join(publicDir, 'contact-us.html'), 'utf8');
  assert.doesNotMatch(contact, /<iframe\b/i);
  assert.match(contact, /href="https:\/\/www\.google\.com\/maps\/dir\//);
});

test('the deploy gate excludes browser automation while the full CI gate includes pa11y', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const netlify = fs.readFileSync(path.join(rootDir, 'netlify.toml'), 'utf8');
  assert.equal(packageJson.scripts['test:deploy'], 'npm test && npm run validate');
  assert.equal(packageJson.scripts['test:ci'], 'npm test && npm run test:a11y && npm run validate');
  assert.match(netlify, /\[build\][\s\S]*?command\s*=\s*"npm run test:deploy"/);
});

test('homepage slider controls expose a valid group name', () => {
  const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(homepage, /<div aria-label="Choose featured product" class="hero-slider-controls" role="group">/);
});

test('every hero title and image uses the deterministic contrast layers', () => {
  for (const pageName of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    for (const heading of html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []) {
      assert.match(heading, /<span class="hero-title-text">/, `${pageName}: ${heading}`);
    }
    for (const layer of html.match(/<div class="(?:hero-bg|page-header-bg)"[^>]*>/gi) || []) {
      assert.match(layer, /--hero-image:/, `${pageName}: ${layer}`);
      assert.doesNotMatch(layer, /(?:^|;\s*)background-image:/, `${pageName}: ${layer}`);
    }
  }

  const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const wrappedSlideTitles = homepage.match(/<h2><span class="hero-title-text">[^<]+<\/span><\/h2>/gi) || [];
  assert.equal(wrappedSlideTitles.length, 4);
});

test('BrowserStack verifies the hero image on its rendered pseudo-element', () => {
  const smokeScript = fs.readFileSync(path.join(rootDir, 'scripts', 'browserstack-smoke.js'), 'utf8');
  assert.match(smokeScript, /getComputedStyle\([^,]+,\s*["']::before["']\)\.backgroundImage/);
});

test('decorative warranty checkmarks are hidden from assistive technology', () => {
  for (const pageName of ['exterior-shades.html', 'garage-doors.html', 'interior-shades.html', 'shutters.html']) {
    const html = fs.readFileSync(path.join(publicDir, pageName), 'utf8');
    assert.match(html, /<div aria-hidden="true" class="warranty-badge"><\/div>/, pageName);
  }
});
