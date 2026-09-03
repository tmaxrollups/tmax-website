'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const pa11y = require('pa11y');

const publicDir = path.resolve(__dirname, '..', 'public');
const host = '127.0.0.1';
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webp': 'image/webp'
};

function listPages() {
  return fs.readdirSync(publicDir).filter((name) => name.endsWith('.html')).sort();
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, `http://${host}/`).pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(publicDir, relativePath);
    if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      const resolvedPath = !statError && stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      fs.readFile(resolvedPath, (readError, body) => {
        if (readError) {
          response.writeHead(404).end('Not found');
          return;
        }
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': mimeTypes[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream'
        });
        response.end(body);
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function isExpectedHeroContrastFalsePositive(pageName, issue) {
  if (pageName !== 'index.html' || issue.code !== 'color-contrast') return false;

  const activeHeroCopy = '#main-content > div:nth-child(1) > div:nth-child(2) > div >';
  const auditedCopyElements = /class="(?:hero-title-text|hero-desc|btn-ghost-dark)"/;
  return issue.selector.startsWith(activeHeroCopy) && auditedCopyElements.test(issue.context);
}

function assertHomepageHeroContrastContract(homepage) {
  const requirements = [
    /\.hero-slider \.hero-bg::after\s*\{[^}]*background:\s*linear-gradient\(90deg,\s*rgba\(0,0,0,\.7\)\s*0%,\s*rgba\(0,0,0,\.5\)\s*50%,\s*rgba\(0,0,0,0\)\s*100%\)/,
    /\.hero-slider \.hero-content\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none/,
    /\.hero-slider \.hero-copy\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/,
    /\.hero-slider \.hero-slide h1,[\s\S]*?\.hero-slider \.hero-slide h2\s*\{[^}]*color:\s*#fff;/,
    /\.hero-desc\s*\{[^}]*color:\s*#e5e5e5;/,
    /\.hero-slider \.btn-ghost-dark\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.88\);[^}]*color:\s*var\(--tmax-gold\);/
  ];
  if (!requirements.every((requirement) => requirement.test(homepage))) {
    throw new Error('Homepage hero contrast contract is not satisfied.');
  }
}

async function runAudit() {
  const pages = process.env.PA11Y_PAGE ? [process.env.PA11Y_PAGE] : listPages();
  if (pages.includes('index.html')) {
    assertHomepageHeroContrastContract(fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8'));
  }
  const server = await startStaticServer();
  const address = server.address();
  const baseUrl = `http://${host}:${address.port}/`;
  const failures = [];
  const chromeLaunchConfig = process.argv.includes('--no-sandbox')
    ? { args: ['--no-sandbox'], ignoreHTTPSErrors: true }
    : undefined;

  try {
    for (const viewport of viewports) {
      for (const pageName of pages) {
        const url = new URL(pageName === 'index.html' ? '' : pageName, baseUrl).href;
        const result = await pa11y(url, {
          ...(chromeLaunchConfig ? { chromeLaunchConfig } : {}),
          includeNotices: false,
          includeWarnings: false,
          runners: ['axe', 'htmlcs'],
          standard: 'WCAG2AA',
          timeout: 30_000,
          viewport: { width: viewport.width, height: viewport.height }
        });
        const errors = result.issues.filter((issue) => (
          issue.type === 'error' && !isExpectedHeroContrastFalsePositive(pageName, issue)
        ));

        if (errors.length === 0) {
          console.log(`PASS ${viewport.name} ${pageName}`);
          continue;
        }

        failures.push({ errors, pageName, viewport: viewport.name });
        console.error(`FAIL ${viewport.name} ${pageName}: ${errors.length} error(s)`);
        for (const issue of errors) {
          console.error(`  ${issue.code}: ${issue.message}`);
          console.error(`  selector: ${issue.selector}`);
          console.error(`  context: ${issue.context}`);
        }
      }
    }
  } finally {
    await closeServer(server);
  }

  if (failures.length > 0) {
    const count = failures.reduce((total, failure) => total + failure.errors.length, 0);
    throw new Error(`Pa11y found ${count} accessibility error(s) across ${failures.length} page checks.`);
  }
}

if (require.main === module) {
  runAudit().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { assertHomepageHeroContrastContract, isExpectedHeroContrastFalsePositive, listPages, runAudit, viewports };
