'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const requiredFiles = [
  'public/index.html',
  'public/garage-doors.html',
  'public/sitemap.xml',
  'public/assets/site.js',
  'public/assets/garage-configurator.js',
  'netlify/functions/submission-created.js',
  'netlify/functions/health.js'
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${rel}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
if (/thanks\.html/.test(sitemap)) {
  throw new Error('sitemap.xml still includes thanks.html');
}

const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8');
if (!/^\/health\s+\/\.netlify\/functions\/health\s+200$/m.test(redirects)) {
  throw new Error('public/_redirects is missing the health check route');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts || pkg.scripts.test !== 'node --test' || pkg.scripts.validate !== 'node validate_repo.js') {
  throw new Error('package.json scripts are not configured as expected');
}

console.log('repo validation passed');
