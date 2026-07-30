import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { generateFrame, buildDdpPackets, normalizePixelMap } from '../src/output.mjs';

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

test('remaining panels can stay at LEDs 33-64 inside a padded 64-pixel frame', () => {
  const pixelMap = Array.from({ length: 32 }, (_, logical) => logical + 32);
  assert.deepEqual(normalizePixelMap(pixelMap, 32, 64), pixelMap);
  const frame = generateFrame({
    width: 8,
    height: 4,
    physicalPixels: 64,
    pattern: 'manual-pixel',
    pixelIndex: 0,
    color: '#ff0000',
    brightness: 1,
    pixelMap
  });
  assert.equal(frame.length, 64 * 3);
  const lit = [];
  for (let pixel = 0; pixel < 64; pixel += 1) {
    if (frame[pixel * 3] > 0) lit.push(pixel);
  }
  assert.deepEqual(lit, [32]);
  assert.ok(frame.subarray(0, 32 * 3).every((value) => value === 0), 'reserved LEDs 1-32 must stay black');
  const packets = buildDdpPackets(frame);
  assert.equal(packets[0].readUInt16BE(8), 192);
});

test('saved mapping distinguishes active pixels from controller frame length', async () => {
  const buildSavedMapping = await loadBuildSavedMapping();
  const pixelMap = Array.from({ length: 32 }, (_, logical) => logical + 32);
  const mapping = buildSavedMapping({
    version: 6,
    canvasWidth: 8,
    canvasHeight: 4,
    controllerPixels: 64,
    physicalPixels: 64,
    activePhysicalPixels: 32,
    resolvedPixelMap: pixelMap,
    panels: [
      { id: 'panel-3', enabled: true, physicalStart: 32, x: 0, y: 0, width: 4, height: 4, rotation: 0 },
      { id: 'panel-4', enabled: true, physicalStart: 48, x: 4, y: 0, width: 4, height: 4, rotation: 0 }
    ]
  });
  assert.equal(mapping.physicalPixels, 64);
  assert.equal(mapping.activePhysicalPixels, 32);
  assert.deepEqual(Array.from(mapping.pixelMap), pixelMap);
});

test('panel disable and physical-start controls are exposed', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const output = await fs.readFile(new URL('src/output.mjs', root), 'utf8');
  assert.match(html, /id="controllerPixels"/);
  assert.match(html, /id="repackPhysicalStarts"/);
  assert.match(html, /id="matchControllerPixels"/);
  assert.match(mapping, /data-panel-field="enabled"/);
  assert.match(mapping, /data-panel-field="physicalStart"/);
  assert.match(mapping, /activePhysicalPixels/);
  assert.match(output, /262144/);
});
