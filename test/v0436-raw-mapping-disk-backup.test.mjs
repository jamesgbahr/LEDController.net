import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MappingStore, validateMappingPayload } from '../src/mapping-store.mjs';

const root = new URL('../', import.meta.url);

function sampleMapping(id = 1) {
  return {
    version: 7,
    controllerPixels: 4,
    physicalPixels: 4,
    panels: [{ id: `panel-${id}`, width: 2, height: 2, x: 0, y: 0, physicalStart: 0, enabled: true }],
    resolvedPixelMap: [0, 1, 2, 3]
  };
}

test('raw physical arrows advance independently of logical mapping assignments', async () => {
  const source = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const functionStart = source.indexOf('function selectPhysical(physical)');
  const functionEnd = source.indexOf('\n  async function saveTargetSettings', functionStart);
  const block = source.slice(functionStart, functionEnd);
  assert.ok(functionStart >= 0);
  assert.ok(block.indexOf("$('mapPixelNumber').value = String(clamped + 1)") < block.indexOf('map.cells.find'));
  assert.match(block, /state\.selected = null/);
  assert.match(block, /Raw P\$\{clamped \+ 1\}/);
  assert.match(source, /async function stepPixel\(delta\)[\s\S]*selectPhysical\(next\);[\s\S]*await holdPixel\(\);/);
});

test('raw slow chase uses the raw test timing fields', async () => {
  const source = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const start = source.indexOf('async function outputConfig(pattern)');
  const end = source.indexOf('async function mappedOutputConfig(pattern)', start);
  const block = source.slice(start, end);
  assert.match(block, /numberValue\('mapStepSeconds'/);
  assert.match(block, /numberValue\('mapGapSeconds'/);
  assert.doesNotMatch(block, /mappedStepSeconds|mappedGapSeconds/);
});

test('mapping store writes an active mapping and restores it from disk', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ledcontroller-map-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new MappingStore({ directory, maxBackups: 3 });
  const mapping = sampleMapping();
  const saved = await store.save(mapping);
  assert.equal(saved.ok, true);
  assert.equal(saved.storagePath, path.join(directory, 'active-mapping.json'));
  const restored = await store.load();
  assert.deepEqual(restored.mapping, mapping);
  assert.ok(restored.savedAt);
});

test('mapping store keeps timestamped backups and rejects invalid payloads', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ledcontroller-map-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new MappingStore({ directory, maxBackups: 2 });
  await store.save(sampleMapping(1));
  await new Promise((resolve) => setTimeout(resolve, 3));
  await store.save(sampleMapping(2));
  await new Promise((resolve) => setTimeout(resolve, 3));
  await store.save(sampleMapping(3));
  const backups = await fs.readdir(path.join(directory, 'Backups'));
  assert.equal(backups.length, 2);
  assert.throws(() => validateMappingPayload({ panels: [] }), /at least one panel/);
});

test('server exposes mapping disk persistence endpoints', async () => {
  const source = await fs.readFile(new URL('server.mjs', root), 'utf8');
  assert.match(source, /url\.pathname === '\/api\/mapping' && req\.method === 'GET'/);
  assert.match(source, /url\.pathname === '\/api\/mapping' && req\.method === 'POST'/);
  assert.match(source, /mappingStore\.save\(mapping\)/);
});
