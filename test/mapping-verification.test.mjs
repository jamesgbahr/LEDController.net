import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pixelMapFingerprint, OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

test('mapping fingerprint is stable and changes with route order', () => {
  assert.equal(pixelMapFingerprint([2,0,3,1]), pixelMapFingerprint([2,0,3,1]));
  assert.notEqual(pixelMapFingerprint([2,0,3,1]), pixelMapFingerprint([0,1,2,3]));
});

test('output status exposes the exact active custom map fingerprint', async () => {
  const tester = new OutputTester();
  const config = tester.buildConfig({ targetIp:'127.0.0.1', width:2, height:2, pixelMap:[2,0,3,1] });
  assert.equal(config.mapFingerprint, pixelMapFingerprint([2,0,3,1]));
  tester.socket.close();
});

test('mapping verification controls are present', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  const mapping = await fs.readFile(new URL('public/mapping-preview.js', root), 'utf8');
  const app = await fs.readFile(new URL('public/app.js', root), 'utf8');
  for (const id of ['mappingProofType','mappingProofFingerprint','mappingProofRoute','mappedLogicalNumber','mappedSlowChase','outputMappingProof']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(mapping, /Slow logical mapping proof/);
  assert.match(mapping, /mappingFingerprint/);
  assert.match(app, /const mapping = useMapping \? refreshSavedMapping\(\) : null/);
});
