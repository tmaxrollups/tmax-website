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
const garageUrl = new URL('garage-doors.html', localUrl).href;
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

async function setViewportSize(driver, width, height) {
  const windowManager = driver.manage().window();
  let requestedRect = { width, height };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await windowManager.setRect(requestedRect);
    const viewport = await driver.executeScript(() => ({
      height: window.innerHeight,
      width: window.innerWidth
    }));
    if (viewport.width === width && viewport.height === height) return;

    const actualRect = await windowManager.getRect();
    requestedRect = {
      height: actualRect.height + height - viewport.height,
      width: actualRect.width + width - viewport.width
    };
  }

  const viewport = await driver.executeScript(() => ({
    height: window.innerHeight,
    width: window.innerWidth
  }));
  assert.deepEqual(viewport, { height, width }, 'browser viewport must match the requested CSS size');
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
  await setViewportSize(driver, 1280, 900);
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

  console.log('  verify compact centered desktop navigation');
  const navLayout = await driver.executeScript(() => {
    const header = document.querySelector('.header-inner');
    const logo = document.querySelector('.site-logo');
    const nav = document.querySelector('.site-nav');
    const items = Array.from(nav.children);
    const labels = items.slice(0, -1);
    const quote = items.at(-1);
    const navRect = nav.getBoundingClientRect();
    const labelRects = labels.map((item) => item.getBoundingClientRect());
    const itemRects = items.map((item) => item.getBoundingClientRect());
    const gaps = labelRects.slice(1).map((rect, index) => rect.left - labelRects[index].right);
    const styles = getComputedStyle(nav);
    const headerStyles = getComputedStyle(header);
    const headerContentLeft = header.getBoundingClientRect().left + parseFloat(headerStyles.paddingLeft);
    const headerContentRight = header.getBoundingClientRect().right - parseFloat(headerStyles.paddingRight);
    return {
      flexGrow: styles.flexGrow,
      gapSpread: Math.max(...gaps) - Math.min(...gaps),
      largestGap: Math.max(...gaps),
      justifyContent: styles.justifyContent,
      labelsCentered: Math.abs(
        (labelRects[0].left + labelRects.at(-1).right) / 2
          - (header.getBoundingClientRect().left + header.getBoundingClientRect().right) / 2
      ) < 4,
      logoAtLeft: Math.abs(logo.getBoundingClientRect().left - headerContentLeft) < 2,
      quoteAtRight: Math.abs(quote.getBoundingClientRect().right - headerContentRight) < 2,
      quoteFitsHeader: itemRects.at(-1).right <= headerContentRight + 1
    };
  });
  assert.equal(navLayout.flexGrow, '1');
  assert.equal(navLayout.justifyContent, 'center');
  assert.ok(navLayout.gapSpread < 2, 'desktop navigation label gaps must be consistent');
  assert.ok(navLayout.largestGap <= 25, 'desktop navigation labels must stay close together');
  assert.equal(navLayout.labelsCentered, true, 'desktop navigation labels must be centered');
  assert.equal(navLayout.logoAtLeft, true, 'logo must remain at the left edge');
  assert.equal(navLayout.quoteAtRight, true, 'quote button must remain at the right edge');
  assert.equal(navLayout.quoteFitsHeader, true, 'quote button must remain inside the header');
  const navTypography = await driver.executeScript(() => Array.from(document.querySelectorAll(
    '.site-nav > a, .nav-products summary, .nav-products-menu a'
  )).every((item) => {
    const styles = getComputedStyle(item);
    return styles.textTransform === 'uppercase' && styles.whiteSpace === 'nowrap';
  }));
  assert.equal(navTypography, true, 'navigation labels must render uppercase on one line');

  await setViewportSize(driver, 1181, 900);
  const boundaryLayout = await driver.executeScript(() => {
    const navItems = Array.from(document.querySelector('.site-nav').children);
    const logoRect = document.querySelector('.site-logo').getBoundingClientRect();
    const firstLabelRect = navItems[0].getBoundingClientRect();
    const lastLabelRect = navItems.at(-2).getBoundingClientRect();
    const quoteRect = navItems.at(-1).getBoundingClientRect();
    return {
      clearsLogo: firstLabelRect.left >= logoRect.right + 12,
      clearsQuote: lastLabelRect.right <= quoteRect.left - 12
    };
  });
  assert.deepEqual(boundaryLayout, { clearsLogo: true, clearsQuote: true });

  const productsToggle = await driver.findElement(By.css('.nav-products summary'));
  await productsToggle.click();
  const dropdownFits = await driver.executeScript(() => {
    const menu = document.querySelector('.nav-products-menu').getBoundingClientRect();
    return menu.left >= 0 && menu.right <= window.innerWidth;
  });
  assert.equal(dropdownFits, true, 'product dropdown must fit at the desktop breakpoint');
  await productsToggle.sendKeys('\uE00C');
  await setViewportSize(driver, 1280, 900);

  console.log('  verify optimized media behavior');
  const heroImage = await driver.executeScript(
    'return getComputedStyle(document.querySelector("[data-hero-slide].active .hero-bg"), "::before").backgroundImage;'
  );
  assert.match(heroImage, /feeling-the-heat\.(webp|jpg)/);
  const heroPresentation = await driver.executeScript(() => {
    const overlay = getComputedStyle(document.querySelector('[data-hero-slide].active .hero-bg'), '::after');
    const panel = document.querySelector('[data-hero-slide].active .hero-content');
    const copy = document.querySelector('[data-hero-slide].active .hero-copy');
    const panelStyles = getComputedStyle(panel);
    const panelRect = panel.getBoundingClientRect();
    const controlsRect = document.querySelector('.hero-slider-controls').getBoundingClientRect();
    return {
      controlsAligned: Math.abs(panelRect.left - controlsRect.left) < 1 && Math.abs(panelRect.width - controlsRect.width) < 1,
      controlsOnLowerEdge: panelRect.bottom >= controlsRect.top && panelRect.bottom <= controlsRect.bottom,
      copyBackground: getComputedStyle(copy).backgroundColor,
      descriptionMaxWidth: getComputedStyle(document.querySelector('[data-hero-slide].active .hero-desc')).maxWidth,
      headingMaxWidth: getComputedStyle(document.querySelector('[data-hero-slide].active h1, [data-hero-slide].active h2')).maxWidth,
      overlayColor: overlay.backgroundColor,
      panelBackground: panelStyles.backgroundImage,
      panelBorder: panelStyles.borderTopColor
    };
  });
  assert.equal(heroPresentation.controlsAligned, true);
  assert.equal(heroPresentation.controlsOnLowerEdge, true);
  assert.equal(heroPresentation.copyBackground, 'rgba(0, 0, 0, 0)');
  assert.equal(heroPresentation.descriptionMaxWidth, '540px');
  assert.equal(heroPresentation.headingMaxWidth, '540px');
  assert.equal(heroPresentation.overlayColor, 'rgba(0, 0, 0, 0)');
  assert.match(heroPresentation.panelBackground, /linear-gradient\(90deg, rgba\(0, 0, 0, 0\.7\) 0%, rgba\(0, 0, 0, 0\.13\) 100%\)/);
  assert.equal(heroPresentation.panelBorder, 'rgba(213, 170, 81, 0.72)');
  assert.equal(await driver.findElements(By.css('[data-hero-slide] .hero-eyebrow')).then((items) => items.length), 0);

  await setViewportSize(driver, 390, 844);
  await driver.sleep(250);
  const mobileHeroPresentation = await driver.executeScript(() => {
    const panelRect = document.querySelector('[data-hero-slide].active .hero-content').getBoundingClientRect();
    const controlsRect = document.querySelector('.hero-slider-controls').getBoundingClientRect();
    return {
      controlsAligned: Math.abs(panelRect.left - controlsRect.left) < 1 && Math.abs(panelRect.width - controlsRect.width) < 1,
      controlsOnLowerEdge: panelRect.bottom >= controlsRect.top && panelRect.bottom <= controlsRect.bottom,
      copyBackground: getComputedStyle(document.querySelector('[data-hero-slide].active .hero-copy')).backgroundColor,
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  assert.deepEqual(mobileHeroPresentation, {
    controlsAligned: true,
    controlsOnLowerEdge: true,
    copyBackground: 'rgba(0, 0, 0, 0)',
    pageOverflows: false
  });
  await setViewportSize(driver, 1280, 900);

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

  const heroAlignment = await driver.executeScript(() => {
    const hero = document.querySelector('.commercial-page-header');
    const content = hero.querySelector('.page-header-content');
    const heroRect = hero.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      centeredHorizontally: Math.abs(
        (contentRect.left + contentRect.right) / 2 - (heroRect.left + heroRect.right) / 2
      ) < 2,
      centeredVertically: Math.abs(
        (contentRect.top + contentRect.bottom) / 2 - (heroRect.top + heroRect.bottom) / 2
      ) < 3,
      eyebrowPresent: Boolean(hero.querySelector('.hero-eyebrow')),
      textAlign: getComputedStyle(content).textAlign
    };
  });
  assert.deepEqual(heroAlignment, {
    centeredHorizontally: true,
    centeredVertically: true,
    eyebrowPresent: false,
    textAlign: 'center'
  });

  await setViewportSize(driver, 320, 800);
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
  await setViewportSize(driver, 1280, 900);

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

async function verifyGaragePage(driver, browser) {
  console.log('  navigate to garage door configurator');
  await driver.get(garageUrl);
  await driver.wait(until.elementLocated(By.css('.tmax-color-swatches')), 20_000);

  const finishImages = await driver.findElements(By.css('.tmax-swatch-chip'));
  assert.equal(finishImages.length, 6);
  for (const image of finishImages) {
    await driver.executeScript((element) => element.scrollIntoView({ block: 'center' }), image);
    await driver.wait(async () => driver.executeScript(
      (image) => image.naturalWidth > 0 && image.complete,
      image
    ), 20_000);
  }
  const finishLabels = await driver.executeScript(() => (
    Array.from(document.querySelectorAll('.tmax-swatch'), (swatch) => swatch.dataset.color)
  ));
  assert.deepEqual(finishLabels, ['White', 'Beige', 'Bronze', 'Black', 'Light Wood', 'Dark Wood']);

  await setViewportSize(driver, 390, 844);
  const mobileState = await driver.executeScript(() => ({
    columns: getComputedStyle(document.querySelector('.tmax-color-swatches')).gridTemplateColumns.split(' ').length,
    pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
  assert.deepEqual(mobileState, { columns: 3, pageOverflows: false });

  if (browser.browserName === 'Chrome' || browser.browserName === 'Edge') {
    await assertNoSevereConsoleErrors(driver);
  }
}

async function verifyResourcesPage(driver, browser) {
  console.log('  navigate to Resources page');
  await driver.get(resourcesUrl);
  await setViewportSize(driver, 1280, 900);
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
  await setViewportSize(driver, 390, 900);
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
  await setViewportSize(driver, 1280, 900);

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
    await verifyGaragePage(driver, browser);
    await verifyResourcesPage(driver, browser);
    await verifyCommercialPage(driver, browser);
    await setSessionStatus(driver, 'passed', 'Homepage, Garage, Resources, and Commercial smoke checks passed');
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
