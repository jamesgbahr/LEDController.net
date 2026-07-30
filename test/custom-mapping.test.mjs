import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { generateFrame } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

async function loadBuildSavedMapping() {
  const source = await fs.readFile(new URL('public/app.js', root), 'utf8');
  const cutoff = source.indexOf('function refreshSavedMapping');
  assert.ok(cutoff > 0);
  const context = {
    document: { getElementById: () => ({}) },
    fetch: async () => { throw new Error('not used'); },
    console, Date, String, Number, Boolean, Math, Map, Set, Array, Error
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(0, cutoff)}\nthis.__buildSavedMapping = buildSavedMapping;`, context);
  return context.__buildSavedMapping;
}

test('custom click mapping is used exactly as saved', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const result = buildSavedMapping({
    panelWidth: 2,
    panelHeight: 2,
    panelColumns: 1,
    panelRows: 1,
    wiringMode: 'custom',
    customPixelMap: [2, 0, 3, 1]
  });
  assert.deepEqual(Array.from(result.pixelMap), [2, 0, 3, 1]);
});

test('custom mapping rejects incomplete assignments', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  assert.throws(() => buildSavedMapping({
    panelWidth: 2,
    panelHeight: 2,
    panelColumns: 1,
    panelRows: 1,
    wiringMode: 'custom',
    customPixelMap: [2, 0, -1, 1]
  }), /unassigned or invalid/);
});

test('logical output follows an arbitrary custom cable order', async () => {
  const pixelMap = [2, 0, 3, 1];
  const frame = generateFrame({
    width: 2,
    height: 2,
    pattern: 'manual-pixel',
    pixelIndex: 0,
    color: '#ff0000',
    brightness: 1,
    pixelMap
  });
  const lit = [];
  for (let pixel = 0; pixel < frame.length / 3; pixel += 1) {
    if (frame[pixel * 3] > 0) lit.push(pixel);
  }
  assert.deepEqual(lit, [2]);
});

test('custom wiring editor is exposed in the mapping UI', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const js = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  assert.match(html, /id="wiringMode"/);
  assert.match(html, /id="customWiringPanel"/);
  assert.match(html, /id="customStart"/);
  assert.match(html, /id="customUndo"/);
  assert.match(js, /customWiringOrder/);
  assert.match(js, /assignCustomLogical/);
  assert.match(js, /customPixelMap/);
});
