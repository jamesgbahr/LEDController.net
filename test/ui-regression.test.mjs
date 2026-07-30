import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('mapping controls cannot overlay the physical test section', async () => {
  const css = await fs.readFile(new URL('public/mapping-preview.css', root), 'utf8');
  assert.match(css, /\.mapping-controls-card\{[^}]*position:static/);
  assert.match(css, /\.mapping-test-card\{[^}]*grid-column:1\/-1/);
  assert.doesNotMatch(css, /\.mapping-controls-card\{[^}]*position:sticky/);
});

test('discovery and mapping share the active target endpoint', async () => {
  const discovery = await fs.readFile(new URL('public/app.js', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  assert.match(discovery, /\/api\/target/);
  assert.match(mapping, /\/api\/target/);
  assert.match(discovery, /mappingLink/);
  assert.match(mapping, /targetFromUrl/);
});


test('mapping re-resolves the selected target before every output action', async () => {
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const server = await fs.readFile(new URL('server.mjs', root), 'utf8');
  assert.match(mapping, /async function ensureActiveTarget/);
  assert.match(mapping, /const target = await ensureActiveTarget\(\)/);
  assert.match(server, /mergeActiveTargetIntoOutput\(body, activeTarget\)/);
  assert.match(server, /tester\.start\(outputConfig, \{ owner: body\.outputOwner \}\)/);
  assert.match(server, /tester\.sendOnce\(built\)/);
});

test('saved mapping is available to both mapping tests and main output', async () => {
  const index = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const app = await fs.readFile(new URL('public/app.js', root), 'utf8');
  const mappingHtml = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mappingJs = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const output = await fs.readFile(new URL('src/output.mjs', root), 'utf8');
  assert.match(index, /id="useMapping"/);
  assert.match(app, /pixelMap: mapping \? mapping\.pixelMap/);
  assert.match(mappingHtml, /id="mappedChase"/);
  assert.match(mappingJs, /pixelMap: pixelMapFor\(map\)/);
  assert.match(output, /applyPixelMap/);
  assert.match(output, /normalizePixelMap/);
});


test('mapping exposes and persists independent panel transforms', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const app = await fs.readFile(new URL('public/app.js', root), 'utf8');
  assert.match(html, /id="panelTransformGrid"/);
  assert.match(html, /id="applyPanelDefaults"/);
  assert.match(mapping, /panelTransforms/);
  assert.match(mapping, /data-panel-field="rotation"/);
  assert.match(app, /config\.panelTransforms/);
});
