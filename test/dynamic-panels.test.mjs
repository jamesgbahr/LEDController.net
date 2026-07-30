import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { generateFrame, normalizePixelMap } from '../src/output.mjs';
import { renderVisualFrame } from '../public/visual-engine.js';

const root = new URL('../', import.meta.url);

async function loadBuildSavedMapping() {
  const source = await fs.readFile(new URL('public/app.js', root), 'utf8');
  const cutoff = source.indexOf('function refreshSavedMapping');
  const context = {
    document: { getElementById: () => ({}) },
    fetch: async () => { throw new Error('not used'); },
    console, Date, String, Number, Boolean, Math, Map, Set, Array, Error
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(0, cutoff)}\nthis.__buildSavedMapping = buildSavedMapping;`, context);
  return context.__buildSavedMapping;
}

test('sparse resolved maps transmit only real physical panel pixels', () => {
  const map = [0, 1, -1, -1, 2, 3];
  assert.deepEqual(normalizePixelMap(map, 6, 4), map);
  const frame = generateFrame({
    width: 3,
    height: 2,
    physicalPixels: 4,
    pattern: 'manual-pixel',
    pixelIndex: 4,
    color: '#ff0000',
    brightness: 1,
    pixelMap: map
  });
  assert.equal(frame.length, 12);
  const lit = [];
  for (let pixel = 0; pixel < frame.length / 3; pixel += 1) {
    if (frame[pixel * 3] > 0) lit.push(pixel);
  }
  assert.deepEqual(lit, [2]);
});

test('main output accepts a saved mixed-resolution resolved route table', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const mapping = buildSavedMapping({
    version: 5,
    canvasWidth: 5,
    canvasHeight: 2,
    physicalPixels: 8,
    resolvedPixelMap: [0, 1, 2, -1, -1, 3, 4, 5, 6, 7],
    panels: [
      { id: 'a', x: 0, y: 0, width: 3, height: 1, rotation: 0 },
      { id: 'b', x: 0, y: 1, width: 5, height: 1, rotation: 0 }
    ]
  });
  assert.equal(mapping.width, 5);
  assert.equal(mapping.height, 2);
  assert.equal(mapping.physicalPixels, 8);
  assert.deepEqual(Array.from(mapping.pixelMap), [0, 1, 2, -1, -1, 3, 4, 5, 6, 7]);
});

test('panel seam proof follows independent panel rectangles', () => {
  const frame = renderVisualFrame({
    width: 6,
    height: 3,
    pattern: 'matrix-seams',
    color: '#ffffff',
    secondaryColor: '#000000',
    brightness: 1,
    panelRects: [
      { x: 0, y: 0, width: 2, height: 3 },
      { x: 2, y: 0, width: 4, height: 3 }
    ]
  });
  const brightnessAt = (x, y) => frame[(y * 6 + x) * 3] + frame[(y * 6 + x) * 3 + 1] + frame[(y * 6 + x) * 3 + 2];
  assert.ok(brightnessAt(1, 1) > brightnessAt(3, 1), 'small panel edge should be highlighted independently');
  assert.ok(brightnessAt(5, 1) > 0, 'large panel outside edge should be highlighted');
});

test('dynamic panel controls are exposed in the unified mapping workspace', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const output = await fs.readFile(new URL('src/output.mjs', root), 'utf8');
  assert.match(html, /id="addPanel"/);
  assert.match(html, /id="autoArrangePanels"/);
  assert.match(html, /id="panelResolutionPreset"/);
  assert.match(mapping, /function addPanel/);
  assert.match(mapping, /data-remove-panel/);
  assert.match(mapping, /data-panel-field="width"/);
  assert.match(mapping, /resolvedPixelMap/);
  assert.match(output, /physicalPixels/);
  assert.match(output, /physical === -1/);
});
