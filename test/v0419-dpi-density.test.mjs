import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../public/workspace.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('Output Studio exposes automatic DPI and zoom normalization', () => {
  assert.match(html, /id="outputDensityButton"/);
  assert.match(workspace, /window\.devicePixelRatio/);
  assert.match(workspace, /--studio-density-scale/);
  assert.match(workspace, /--studio-density-extent/);
  assert.match(workspace, /studio-effective-wide/);
  assert.match(workspace, /studio-effective-tall/);
  assert.match(css, /v0\.4\.19 — DPI\/browser-zoom normalized Output Studio/);
  assert.match(css, /zoom:var\(--studio-density-scale,1\)/);
});

test('density control supports automatic and manual display modes', () => {
  assert.match(workspace, /\['auto', '1', '0\.9', '0\.8', '0\.75'\]/);
  assert.match(workspace, /ledcontroller\.output\.uiDensity/);
  assert.match(workspace, /UI AUTO/);
});

test('release version is v0.4.19', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
