# Navigation Dropdown and Resources Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four direct product navigation links with an accessible Our Products click dropdown, then combine Accessories and Resources into one canonical Resources hub.

**Architecture:** Use native HTML `details`/`summary` for a no-JavaScript-compatible dropdown, one small shared stylesheet for dropdown presentation, and shared `site.js` only for outside-click and Escape closing. Migrate Accessories content and the unchanged `parts-request` Netlify form into `resources.html`, then retire every Accessories route with permanent redirects.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node.js test runner, Netlify Forms and redirects, Selenium/BrowserStack.

**Spec:** `docs/superpowers/specs/2026-09-02-resources-hub-design.md`

## Global Constraints

- Perform all work on `carousel-buttons-captcha-fix`; do not create another branch.
- Dropdown label is `Our Products` and contains exactly Garage Doors, Exterior Shades, Interior Shades, and Shutters.
- `/resources/` is the only Resources/Accessories content page.
- Preserve the `parts-request` form name, field names, CAPTCHA, honeypot, notifications, and `/thanks/` action.
- Do not add file inputs or request customer photos.
- Do not repeat a product gallery directory on Resources; product pages remain available through Our Products.

---

### Task 1: Accessible Our Products Dropdown

**Files:**
- Create: `public/assets/navigation.css`
- Modify: `public/assets/site.js`
- Modify: every `public/*.html` file containing `id="primary-nav"`
- Modify: `test/site-navigation.test.js`

**Interfaces:**
- Consumes: existing `.site-header`, `.site-nav`, `.menu-toggle`, and `#primary-nav` markup.
- Produces: `.nav-products` native details menu with four canonical product links.

- [ ] **Step 1: Write failing navigation tests**

Add assertions that every primary navigation contains exactly one `<details class="nav-products">`, one `<summary>Our Products</summary>`, and these four links inside it:

```js
const productLinks = [
  ['/garage-doors/', 'Garage Doors'],
  ['/exterior-shades/', 'Exterior Shades'],
  ['/interior-shades/', 'Interior Shades'],
  ['/shutters/', 'Shutters']
];
```

Assert those links no longer occur as direct children of `.site-nav`, `navigation.css` is linked, and `site.js` contains Escape/outside-click handling for `.nav-products`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/site-navigation.test.js`

Expected: FAIL because current headers contain four direct product links and no dropdown.

- [ ] **Step 3: Add shared dropdown markup and styling**

Replace the four direct links in each primary nav with:

```html
<details class="nav-products">
  <summary>Our Products</summary>
  <div class="nav-products-menu">
    <a href="/garage-doors/">Garage Doors</a>
    <a href="/exterior-shades/">Exterior Shades</a>
    <a href="/interior-shades/">Interior Shades</a>
    <a href="/shutters/">Shutters</a>
  </div>
</details>
```

Link `/assets/navigation.css` after each page's inline style block. Style the summary to match existing nav links, position a high-contrast black/gold dropdown below it on desktop, and make the menu static/full-width inside the existing mobile navigation panel below 1180px.

- [ ] **Step 4: Add progressive enhancement behavior**

In `site.js`, close open `.nav-products` elements when Escape is pressed, focus the summary after Escape, close when clicking outside the details element, and close it when the main mobile menu closes. Do not prevent the native summary click.

- [ ] **Step 5: Verify and commit**

Run: `node --test test/site-navigation.test.js`

Expected: PASS.

Run: `npm test && npm run validate`

Commit: `Add accessible product navigation dropdown`

---

### Task 2: Consolidated Resources Content and Parts Form

**Files:**
- Modify: `public/resources.html`
- Delete: `public/accessories.html`
- Modify: `test/resources-page.test.js`
- Modify: `test/captcha-integration.test.js`

**Interfaces:**
- Consumes: existing Resources documents and Accessories parts content/form.
- Produces: one Resources hub containing documents, planning, controls, guidance, and `parts-request`.

- [ ] **Step 1: Write failing consolidation tests**

Assert `resources.html` contains the three jump targets `documents`, `controls`, and `parts-request`; all four supported accessory category headings; and the `parts-request` form. Assert `accessories.html` does not exist, Resources does not repeat a product-gallery directory, and its parts area contains neither `type="file"` nor the words `photo` or `photos`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/resources-page.test.js test/captcha-integration.test.js`

Expected: FAIL because Accessories still exists and the parts form is not on Resources.

- [ ] **Step 3: Build the combined hub**

Retain the Resources header, catalog/warranty cards, measuring cards, and control guidance. Add an in-page jump navigation after the header. Merge category-level Accessories copy into the controls section, remove SKU labels and the redundant product-gallery directory, add parts/service guidance without photo language, and move the exact `parts-request` form to the final section.

Update `source_page` to `Resources page` and its subject to `New parts / accessories request - TMAX website`; do not change submitted field names.

- [ ] **Step 4: Delete the retired page and verify GREEN**

Delete `public/accessories.html` after its supported content and form are represented on Resources.

Run: `node --test test/resources-page.test.js test/captcha-integration.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `Combine accessories and parts support into Resources`

---

### Task 3: Retire Accessories Routes and References

**Files:**
- Modify: `public/_redirects`
- Modify: `public/sitemap.xml`
- Modify: all `public/*.html` files containing `/accessories/`
- Create: `test/accessories-retirement.test.js`

**Interfaces:**
- Consumes: canonical `/resources/` route from Task 2.
- Produces: permanent legacy redirects and zero internal links to Accessories.

- [ ] **Step 1: Write failing retirement tests**

Assert `_redirects` maps `/accessories`, `/accessories/`, `/accessories.html`, `/product/accessories`, and `/product/accessories/*` to `/resources/` with status 301. Scan all HTML and `sitemap.xml` to ensure no `/accessories` references remain and the sitemap contains one canonical Resources URL.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test test/accessories-retirement.test.js`

Expected: FAIL on current redirects, footer/homepage links, and sitemap entry.

- [ ] **Step 3: Implement canonical routing and links**

Replace homepage and footer Accessories links with `/resources/` and user-facing text `Resources`. Replace the legacy `/product/accessories` mappings and clean URL mappings with explicit 301 redirects to `/resources/`. Remove the Accessories sitemap entry and retain Resources.

- [ ] **Step 4: Verify and commit**

Run: `node --test test/accessories-retirement.test.js`

Expected: PASS.

Run: `npm test && npm run validate`

Commit: `Retire Accessories routes in favor of Resources`

---

### Task 4: BrowserStack Resources Coverage and Final Integration

**Files:**
- Modify: `scripts/browserstack-smoke.js`
- Modify: `test/resources-page.test.js`

**Interfaces:**
- Consumes: final `/resources/` page and existing BrowserStack local server/matrix.
- Produces: `verifyResourcesPage(driver, browser)` coverage in Chrome, Edge, Firefox, and Safari.

- [ ] **Step 1: Write failing smoke-script coverage assertion**

Assert the script defines `resourcesUrl`, defines `verifyResourcesPage`, invokes it from `runBrowser`, and checks Resources navigation, both document links, the parts form, enabled submit button, CAPTCHA placeholder/injection state, and duplicate IDs.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/resources-page.test.js`

Expected: FAIL because the current BrowserStack script only checks the homepage and Commercial page.

- [ ] **Step 3: Implement Resources browser smoke coverage**

Add `resourcesUrl = new URL('resources.html', localUrl).href` and `verifyResourcesPage`. Check page title/header, dropdown operation, catalog and warranty URLs, `parts-request` metadata, enabled submit button, zero duplicate IDs, and browser console errors where logging is supported. Local static testing should accept the original CAPTCHA placeholder because Netlify injection occurs only after deployment.

- [ ] **Step 4: Run all local verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run validate`

Expected: `repo validation passed`.

Run: `node --check public/assets/site.js && node --check scripts/browserstack-smoke.js && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 5: Run BrowserStack when Local is connected**

Run: `npm run test:browserstack`

Expected: PASS in Chrome, Edge, Firefox, and Safari. If BrowserStack Local is disconnected, report the run as blocked and do not characterize it as a pass.

- [ ] **Step 6: Commit, push, and integrate**

Commit: `Add Resources hub browser coverage`

Push `carousel-buttons-captcha-fix`, then update remote `main` from this verified branch. Do not include `.idea/`. Because Netlify production publishing is locked, manually publish the new `main` deploy or unlock publishing before expecting production to change.
