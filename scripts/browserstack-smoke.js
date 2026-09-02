'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { Builder, By, until, logging } = require('selenium-webdriver');

const publicDir = path.resolve(__dirname, '..', 'public');
const resultsDir = path.resolve(__dirname, '..', 'test-results', 'browserstack');
const localUrl = 'http://localhost:4173/';
const commercialUrl = new URL('commercial.html', localUrl).href;
const resourcesUrl = new URL('resources.html', localUrl).href;
const hubUrl = 'https://hub-cloud.browserstack.com/wd/hub';

const browserMatrix = [
  { name: 'Chrome', browserName: 'Chrome', os: 'Windows', osVersion: '11' },
  { name: 'Edge', browserName: 'Edge', os: 'Windows', osVersion: '11' },
  { name: 'Firefox', browserName: 'Firefox', os: 'Windows', osVersion: '11' },
  { name: 'Safari', browserName: 'Safari', os: 'OS X', osVersion: 'Sequoia' }
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function requireCredentials() {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  if (!username || !accessKey) {
    throw new Error(
      'Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY before running BrowserStack tests.'
    );
  }
  return { username, accessKey };
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, localUrl).pathname);
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
    server.listen(4173, '0.0.0.0', () => resolve(server));
  });
}

function buildCapabilities(browser, credentials, buildName) {
  const capabilities = {
    browserName: browser.browserName,
    browserVersion: 'latest',
    pageLoadStrategy: 'eager',
    'bstack:options': {
      accessKey: credentials.accessKey,
      buildName,
      local: 'true',
      os: browser.os,
      osVersion: browser.osVersion,
      projectName: 'TMAX Website',
      sessionName: `Site smoke - ${browser.name}`,
      userName: credentials.username
    }
  };

  if (browser.browserName === 'Chrome' || browser.browserName === 'Edge') {
    capabilities['goog:loggingPrefs'] = { browser: 'ALL' };
  }
  return capabilities;
}

async function setSessionStatus(driver, status, reason) {
  const payload = JSON.stringify({ action: 'setSessionStatus', arguments: { status, reason } });
  await driver.executeScript(`browserstack_executor: ${payload}`);
}

async function saveFailureScreenshot(driver, browserName) {
  fs.mkdirSync(resultsDir, { recursive: true });
  const screenshot = await driver.takeScreenshot();
  const filename = `${browserName.toLowerCase()}-site-failure.png`;
  fs.writeFileSync(path.join(resultsDir, filename), screenshot, 'base64');
}

async function assertNoSevereConsoleErrors(driver) {
  try {
    const entries = await driver.manage().logs().get(logging.Type.BROWSER);
    const severe = entries.filter((entry) => entry.level.value >= logging.Level.SEVERE.value);
    assert.deepEqual(severe.map((entry) => entry.message), [], 'browser console contains severe errors');
  } catch (error) {
    if (!/log type|not supported|unsupported|unknown command|method not allowed/i.test(String(error.message))) {
      throw error;
    }
  }
}

async function verifyHomepage(driver, browser) {
  console.log('  navigate to local homepage');
  await driver.get(localUrl);
  await driver.manage().window().setRect({ width: 1280, height: 900 });
  console.log('  verify title');
  await driver.wait(async () => {
    const title = await driver.executeScript('return document.title;');
    return typeof title === 'string' && title.includes('TMAX Roll Ups');
  }, 20_000);
  console.log('  verify hero and DOM readiness');
  await driver.wait(until.elementLocated(By.css('[data-hero-slider]')), 20_000);
  await driver.wait(async () => driver.executeScript(
    'return document.readyState === "interactive" || document.readyState === "complete";'
  ), 20_000);

  const initialSlide = await driver.findElement(By.css('[data-hero-slide].active'));
  assert.match(await initialSlide.getText(), /Feeling the Heat\?/);

  console.log('  verify evenly spaced desktop navigation');
  const navLayout = await driver.executeScript(() => {
    const header = document.querySelector('.header-inner');
    const nav = document.querySelector('.site-nav');
    const items = Array.from(nav.children);
    const itemRects = items.map((item) => item.getBoundingClientRect());
    const gaps = itemRects.slice(1).map((rect, index) => rect.left - itemRects[index].right);
    const styles = getComputedStyle(nav);
    return {
      flexGrow: styles.flexGrow,
      gapSpread: Math.max(...gaps) - Math.min(...gaps),
      justifyContent: styles.justifyContent,
      quoteFitsHeader: itemRects.at(-1).right <= header.getBoundingClientRect().right + 1
    };
  });
  assert.equal(navLayout.flexGrow, '1');
  assert.equal(navLayout.justifyContent, 'space-between');
  assert.ok(navLayout.gapSpread < 2, 'desktop navigation gaps must be evenly distributed');
  assert.equal(navLayout.quoteFitsHeader, true, 'quote button must remain inside the header');

  console.log('  verify optimized media behavior');
  const heroImage = await driver.executeScript(
    'return getComputedStyle(document.querySelector("[data-hero-slide].active .hero-bg"), "::before").backgroundImage;'
  );
  assert.match(heroImage, /feeling-the-heat\.(webp|jpg)/);

  const galleryState = await driver.executeScript(() => {
    const gallery = document.querySelector('.homepage-gallery');
    const container = gallery.closest('.container');
    const galleryRect = gallery.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      centered: Math.abs(
        (galleryRect.left + galleryRect.right) / 2 - (containerRect.left + containerRect.right) / 2
      ) < 2,
      imagesLazy: Array.from(gallery.querySelectorAll('img')).every((image) => image.loading === 'lazy'),
      videoPresent: Boolean(document.querySelector('.works-video-card video'))
    };
  });
  assert.deepEqual(galleryState, { centered: true, imagesLazy: true, videoPresent: false });

  console.log('  verify manual hero navigation');
  await driver.findElement(By.css('.hero-next')).click();
  await driver.wait(async () => {
    const active = await driver.findElement(By.css('[data-hero-slide].active'));
    return /Reclaim Your Space/.test(await active.getText());
  }, 10_000);

  if (browser.browserName === 'Chrome' || browser.browserName === 'Edge') {
    console.log('  verify browser console');
    await assertNoSevereConsoleErrors(driver);
  } else {
    console.log('  browser console logs unavailable; page checks completed');
  }
}

async function verifyCommercialPage(driver, browser) {
  console.log('  navigate to commercial page');
  await driver.get(commercialUrl);
  await driver.wait(async () => {
    const title = await driver.executeScript('return document.title;');
    return typeof title === 'string' && title.includes('Commercial Roll-Up');
  }, 20_000);

  const heading = await driver.findElement(By.css('.page-header h1'));
  assert.equal(await heading.getText(), 'Commercial Systems');

  await driver.manage().window().setRect({ width: 320, height: 800 });
  const headingLayout = await driver.executeScript(() => {
    const title = document.querySelector('.commercial-page-header h1');
    const container = document.querySelector('.commercial-page-header .container');
    const titleRect = title.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    return {
      fitsContainer: titleRect.left >= containerRect.left && titleRect.right <= containerRect.right,
      lineCount: titleRect.height / lineHeight,
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      whiteSpace: getComputedStyle(title).whiteSpace
    };
  });
  assert.equal(headingLayout.whiteSpace, 'nowrap');
  assert.ok(headingLayout.lineCount < 1.2, 'commercial page title must remain on one line');
  assert.equal(headingLayout.fitsContainer, true, 'commercial page title must fit its container');
  assert.equal(headingLayout.pageOverflows, false, 'commercial page must not overflow horizontally');
  await driver.manage().window().setRect({ width: 1280, height: 900 });

  const logoPath = await driver.executeScript(() =>
    new URL(document.querySelector('.site-logo').href).pathname
  );
  assert.ok(logoPath === '/' || logoPath === '/index.html', `unexpected logo destination: ${logoPath}`);

  console.log('  verify commercial video and gallery');
  const videoState = await driver.executeScript(() => {
    const video = document.querySelector('#commercial-shutter-video');
    return {
      autoplay: video.autoplay,
      paused: video.paused,
      playable: video.canPlayType('video/mp4'),
      preload: video.preload
    };
  });
  assert.equal(videoState.autoplay, false);
  assert.equal(videoState.paused, true);
  assert.notEqual(videoState.playable, '', 'browser must report MP4 playback support');
  assert.equal(videoState.preload, 'none');

  await driver.wait(async () => driver.executeScript(
    'return document.querySelector(".gallery")?.getAttribute("aria-roledescription") === "carousel";'
  ), 20_000);
  const initialGalleryImage = await driver.executeScript(
    'return document.querySelector(".gallery .gal-cell.active img").getAttribute("src");'
  );
  await driver.findElement(By.css('.gallery .carousel-next')).click();
  await driver.wait(async () => driver.executeScript(
    'return document.querySelector(".gallery .gal-cell.active img").getAttribute("src");'
  ).then((source) => source !== initialGalleryImage), 10_000);

  console.log('  verify commercial navigation and form responsiveness');
  const menuState = await driver.executeScript(() => {
    const button = document.querySelector('.menu-toggle');
    button.click();
    return {
      expanded: button.getAttribute('aria-expanded'),
      open: document.querySelector('#primary-nav').classList.contains('open')
    };
  });
  assert.deepEqual(menuState, { expanded: 'true', open: true });

  await driver.sleep(750);
  const formState = await driver.executeScript(() => ({
    disabled: document.querySelector('form[name="quote-commercial"] button[type="submit"]').disabled,
    falseFailureNotice: Boolean(document.querySelector('[id$="-captcha-notice"]')),
    present: Boolean(document.querySelector('form[name="quote-commercial"]'))
  }));
  assert.deepEqual(formState, { disabled: false, falseFailureNotice: false, present: true });

  if (browser.browserName === 'Chrome' || browser.browserName === 'Edge') {
    console.log('  verify commercial browser console');
    await assertNoSevereConsoleErrors(driver);
  }
}

async function verifyResourcesPage(driver, browser) {
  console.log('  navigate to Resources page');
  await driver.get(resourcesUrl);
  await driver.manage().window().setRect({ width: 1280, height: 900 });
  await driver.wait(until.elementLocated(By.css('form[name="parts-request"]')), 20_000);

  const heading = await driver.findElement(By.css('.page-header h1'));
  assert.equal(await heading.getText(), 'Product Resources');

  console.log('  verify product dropdown and document links');
  await driver.findElement(By.css('.nav-products summary')).click();
  const dropdownState = await driver.executeScript(() => {
    const menu = document.querySelector('.nav-products');
    return {
      labels: Array.from(menu.querySelectorAll('.nav-products-menu a'), (link) => link.textContent.trim()),
      open: menu.open
    };
  });
  assert.deepEqual(dropdownState, {
    labels: ['Garage Doors', 'Exterior Shades', 'Interior Shades', 'Shutters'],
    open: true
  });

  console.log('  verify mobile product dropdown and Resources layout');
  await driver.findElement(By.css('.nav-products summary')).click();
  await driver.manage().window().setRect({ width: 390, height: 900 });
  await driver.findElement(By.css('.menu-toggle')).click();
  await driver.findElement(By.css('.nav-products summary')).click();
  const mobileState = await driver.executeScript(() => ({
    menuOpen: document.querySelector('.site-nav').classList.contains('open'),
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    productsOpen: document.querySelector('.nav-products').open
  }));
  assert.deepEqual(mobileState, {
    menuOpen: true,
    pageOverflows: false,
    productsOpen: true
  });
  await driver.manage().window().setRect({ width: 1280, height: 900 });

  const documentPaths = await driver.executeScript(() => Array.from(
    document.querySelectorAll('a[href*="TMAX-Product-Catalog-2026.pdf"], a[href*="TMAX-Product-Warranty.pdf"]'),
    (link) => new URL(link.href).pathname
  ));
  assert.ok(documentPaths.includes('/documents/TMAX-Product-Catalog-2026.pdf'));
  assert.ok(documentPaths.includes('/documents/TMAX-Product-Warranty.pdf'));

  console.log('  verify Resources layout and parts form');
  const pageState = await driver.executeScript(() => {
    const form = document.querySelector('form[name="parts-request"]');
    const ids = Array.from(document.querySelectorAll('[id]'), (element) => element.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    return {
      captchaPlaceholder: Boolean(form.querySelector('[data-netlify-recaptcha="true"]')),
      duplicateIds,
      formAction: new URL(form.action).pathname,
      formMethod: form.method,
      netlifyEnabled: form.getAttribute('data-netlify'),
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      submitDisabled: form.querySelector('button[type="submit"]').disabled
    };
  });
  assert.deepEqual(pageState, {
    captchaPlaceholder: true,
    duplicateIds: [],
    formAction: '/thanks/',
    formMethod: 'post',
    netlifyEnabled: 'true',
    pageOverflows: false,
    submitDisabled: false
  });

  if (browser.browserName === 'Chrome' || browser.browserName === 'Edge') {
    console.log('  verify Resources browser console');
    await assertNoSevereConsoleErrors(driver);
  }
}

async function runBrowser(browser, credentials, buildName) {
  let driver;
  try {
    console.log(`START ${browser.name}`);
    driver = await new Builder()
      .usingServer(hubUrl)
      .withCapabilities(buildCapabilities(browser, credentials, buildName))
      .build();
    console.log(`  ${browser.name} session created`);
    await verifyHomepage(driver, browser);
    await verifyResourcesPage(driver, browser);
    await verifyCommercialPage(driver, browser);
    await setSessionStatus(driver, 'passed', 'Homepage, Resources, and Commercial smoke checks passed');
    console.log(`PASS ${browser.name}`);
  } catch (error) {
    if (driver) {
      try { await saveFailureScreenshot(driver, browser.name); } catch {}
      try { await setSessionStatus(driver, 'failed', String(error.message).slice(0, 240)); } catch {}
    }
    console.error(`FAIL ${browser.name}: ${error.message}`);
    throw error;
  } finally {
    if (driver) await driver.quit();
  }
}

async function main() {
  const credentials = requireCredentials();
  const buildName = process.env.BROWSERSTACK_BUILD_NAME || `Local ${new Date().toISOString()}`;
  const server = await startStaticServer();
  const failures = [];
  try {
    for (const browser of browserMatrix) {
      try {
        await runBrowser(browser, credentials, buildName);
      } catch (error) {
        failures.push(`${browser.name}: ${error.message}`);
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (failures.length) {
    throw new Error(`BrowserStack failures:\n${failures.join('\n')}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
