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
    console,
    Date,
    String,
    Number,
    Boolean,
    Math,
    Map,
    Set,
    Array,
    Error
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(0, cutoff)}\nthis.__buildSavedMapping = buildSavedMapping;`, context);
  return context.__buildSavedMapping;
}

test('each panel rotation is applied independently in saved output mapping', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const result = buildSavedMapping({
    panelWidth: 2,
    panelHeight: 2,
    panelColumns: 2,
    panelRows: 1,
    panelAxis: 'rows',
    panelCorner: 'tl',
    panelSerpentine: false,
    pixelAxis: 'rows',
    pixelCorner: 'tl',
    pixelSerpentine: false,
    panelTransforms: [
      { rotation: 0, flipX: false, flipY: false },
      { rotation: 180, flipX: false, flipY: false }
    ]
  });
  assert.deepEqual(Array.from(result.pixelMap), [0, 1, 7, 6, 2, 3, 5, 4]);
});

test('legacy global rotation migrates when panelTransforms are absent', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const result = buildSavedMapping({
    panelWidth: 2,
    panelHeight: 2,
    panelColumns: 1,
    panelRows: 1,
    panelAxis: 'rows',
    panelCorner: 'tl',
    panelSerpentine: false,
    pixelAxis: 'rows',
    pixelCorner: 'tl',
    pixelSerpentine: false,
    rotation: 180,
    flipX: false,
    flipY: false
  });
  assert.deepEqual(Array.from(result.pixelMap), [3, 2, 1, 0]);
});


test('mapped output sends a logical pixel through the independently rotated panel', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const mapping = buildSavedMapping({
    panelWidth: 2, panelHeight: 2, panelColumns: 2, panelRows: 1,
    panelAxis: 'rows', panelCorner: 'tl', panelSerpentine: false,
    pixelAxis: 'rows', pixelCorner: 'tl', pixelSerpentine: false,
    panelTransforms: [
      { rotation: 0, flipX: false, flipY: false },
      { rotation: 180, flipX: false, flipY: false }
    ]
  });
  const frame = generateFrame({
    width: mapping.width,
    height: mapping.height,
    pattern: 'manual-pixel',
    pixelIndex: 2,
    color: '#ff0000',
    brightness: 1,
    pixelMap: mapping.pixelMap
  });
  const lit = [];
  for (let pixel = 0; pixel < frame.length / 3; pixel += 1) {
    if (frame[pixel * 3] > 0) lit.push(pixel);
  }
  assert.deepEqual(lit, [7]);
});
