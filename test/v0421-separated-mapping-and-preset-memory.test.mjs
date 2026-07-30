import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, app, css, mapping, server] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/app.js', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('public/mapping-preview.js', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8')
]);

test('preset memory exposes explicit local save and one-click recall controls', () => {
  for (const id of ['presetName','presetSelect','presetSave','presetUpdate','presetLoad','presetMemoryList','presetMemoryCount']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /Save to memory/);
  assert.match(html, /Load from memory/);
  assert.match(html, /Quick recall/);
  assert.match(app, /data-preset-memory-load/);
  assert.match(app, /ledcontroller\.output\.presets\.v2/);
  assert.match(css, /v0\.4\.21 — separate mapping storage and one-click preset memory/);
});

test('performance presets exclude mapping controls and never replace the active map', () => {
  assert.match(app, /PRESET_MAPPING_CONTROL_IDS = new Set\(\['width', 'height', 'useMapping'\]\)/);
  assert.match(app, /const \{ mapping: _legacyMapping, \.\.\.withoutMapping \} = source/);
  assert.doesNotMatch(app, /localStorage\.setItem\('ledcontroller\.mapping\.preview', JSON\.stringify\(preset\.mapping\)\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\('ledcontroller\.mapping\.draft', JSON\.stringify\(preset\.mapping\)\)/);
  assert.match(app, /The active pixel mapping was left unchanged/);
  assert.match(html, /Presets and mappings are separate/);
});

test('mapping remains independently saved by the Mapping workspace', () => {
  assert.match(html, /id="saveMapping">Save active mapping/);
  assert.match(html, /Mapping storage is independent from performance presets/);
  assert.match(mapping, /localStorage\.setItem\('ledcontroller\.mapping\.preview', JSON\.stringify\(savedConfig\)\)/);
  assert.match(mapping, /localStorage\.setItem\('ledcontroller\.mapping\.draft', JSON\.stringify\(savedConfig\)\)/);
});

test('legacy v0.4.20 presets migrate into memory without embedded mappings', () => {
  assert.match(app, /LEGACY_PRESET_STORAGE_KEY = 'ledcontroller\.output\.presets\.v1'/);
  assert.match(app, /const migrated = readPresetArray\(LEGACY_PRESET_STORAGE_KEY\)/);
  assert.match(app, /Any legacy embedded mappings were intentionally ignored/);
});

test('separated mapping and preset memory remain present in v0.4.24', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
