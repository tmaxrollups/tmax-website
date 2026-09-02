'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const commercialPage = fs.readFileSync(path.join(publicDir, 'commercial.html'), 'utf8');

function readVideoDimensions(filePath) {
  const file = fs.readFileSync(filePath);
  const trackHeader = Buffer.from('tkhd');
  let offset = 0;

  while ((offset = file.indexOf(trackHeader, offset)) !== -1) {
    const boxStart = offset - 4;
    const boxSize = file.readUInt32BE(boxStart);
    const boxEnd = boxStart + boxSize;
    const width = file.readUInt32BE(boxEnd - 8) / 65536;
    const height = file.readUInt32BE(boxEnd - 4) / 65536;

    if (width > 0 && height > 0) return { width, height };
    offset += trackHeader.length;
  }

  throw new Error(`video track dimensions not found in ${filePath}`);
}

test('commercial page references only existing local media and scripts', () => {
  const references = Array.from(
    commercialPage.matchAll(/\b(?:poster|src|srcset)="(\/[^"\s]+)"/g),
    (match) => match[1]
  );

  assert.ok(references.length > 0, 'commercial page must contain local resources');
  for (const reference of references) {
    const filePath = path.join(publicDir, ...reference.slice(1).split('/'));
    assert.ok(fs.existsSync(filePath), `missing local resource: ${reference}`);
  }
});

test('commercial video remains user-initiated and defers network loading', () => {
  const [videoTag] = commercialPage.match(/<video\b[^>]*id="commercial-shutter-video"[^>]*>/) || [];

  assert.ok(videoTag, 'commercial shutter video must exist');
  assert.match(videoTag, /\bcontrols(?:="")?\b/);
  assert.match(videoTag, /\bpreload="none"/);
  assert.doesNotMatch(videoTag, /\bautoplay\b/);
});

test('commercial page title remains on one line at narrow viewport widths', () => {
  assert.match(commercialPage, /<section class="page-header commercial-page-header">/);
  assert.match(
    commercialPage,
    /\.commercial-page-header h1\s*\{[^}]*white-space:\s*nowrap[^}]*font-size:\s*clamp\(30px,\s*8vw,\s*56px\)[^}]*\}/
  );
});

test('commercial video is vertically cropped and uses a distinct poster frame', () => {
  const videoPath = path.join(publicDir, 'videos', 'IMG_6156.mp4');
  const posterPath = path.join(publicDir, 'images', 'commercial-shutter-video-poster.webp');
  const duplicateImagePath = path.join(publicDir, 'images', 'commercial-retail-perforated.webp');
  const dimensions = readVideoDimensions(videoPath);

  assert.deepEqual(dimensions, { width: 720, height: 1024 });
  assert.match(commercialPage, /poster="\/images\/commercial-shutter-video-poster\.webp"/);
  assert.ok(fs.existsSync(posterPath), 'cropped commercial video poster must exist');
  assert.notDeepEqual(
    fs.readFileSync(posterPath),
    fs.readFileSync(duplicateImagePath),
    'commercial video poster must not repeat the preceding image'
  );
});
