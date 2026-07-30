import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { generateFrame } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

async function loadBuildSavedMapping() {
  const source = await fs.readFile(new URL('public/app.js', root), 'utf8');
  const cutoff = source.indexOf('function refreshSavedMapping');
  assert.ok(cutoff > 0, 'mapping function block must be present');
  const context = {
    document: { getElementById: () => ({}) },
    fetch: async () => { throw new Error('not used'); },
    console, Date, String, Number, Boolean, Math, Map, Set, Array, Error
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(0, cutoff)}\nthis.__buildSavedMapping = buildSavedMapping;`, context);
  return context.__buildSavedMapping;
}

const customPanelConfig = {
  panelWidth: 2,
  panelHeight: 1,
  panelColumns: 2,
  panelRows: 2,
  panelOrderMode: 'custom',
  customPanelOrder: [0, 3, 1, 2],
  panelAxis: 'rows',
  panelCorner: 'tl',
  panelSerpentine: false,
  pixelAxis: 'rows',
  pixelCorner: 'tl',
  pixelSerpentine: false,
  panelTransforms: [
    { rotation: 0, flipX: false, flipY: false },
    { rotation: 0, flipX: false, flipY: false },
    { rotation: 0, flipX: false, flipY: false },
    { rotation: 0, flipX: false, flipY: false }
  ]
};

test('custom panel order assigns physical panel blocks in exact cable sequence', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const result = buildSavedMapping(customPanelConfig);
  assert.deepEqual(Array.from(result.pixelMap), [0, 1, 4, 5, 6, 7, 2, 3]);
});

test('custom panel order rejects duplicate panel positions', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  assert.throws(() => buildSavedMapping({
    ...customPanelConfig,
    customPanelOrder: [0, 0, 1, 2]
  }), /duplicate panel 1/);
});

test('mapped output follows the custom panel chain before packet generation', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const mapping = buildSavedMapping(customPanelConfig);
  const frame = generateFrame({
    width: mapping.width,
    height: mapping.height,
    pattern: 'manual-pixel',
    pixelIndex: 6,
    color: '#ff0000',
    brightness: 1,
    pixelMap: mapping.pixelMap
  });
  const lit = [];
  for (let pixel = 0; pixel < frame.length / 3; pixel += 1) {
    if (frame[pixel * 3] > 0) lit.push(pixel);
  }
  assert.deepEqual(lit, [2]);
});

test('custom panel-order controls are exposed in the unified mapper', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const app = await fs.readFile(new URL('public/app.js', root), 'utf8');
  assert.match(html, /id="panelOrderMode"/);
  assert.match(html, /id="panelOrderSummary"/);
  assert.match(html, /id="usePresetPanelOrder"/);
  assert.match(mapping, /customPanelOrder/);
  assert.match(mapping, /data-panel-order-position/);
  assert.match(app, /savedPanelOrderSlots/);
});
