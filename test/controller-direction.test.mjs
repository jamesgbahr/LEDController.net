import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateFrame, applyControllerDirection } from '../src/output.mjs';

test('reverse controller direction sends cable LED 1 to the last WLED address', () => {
  const frame = Buffer.from([
    255,0,0,
    0,255,0,
    0,0,255,
    255,255,255
  ]);
  assert.deepEqual([...applyControllerDirection(frame, 'reverse')], [
    255,255,255,
    0,0,255,
    0,255,0,
    255,0,0
  ]);
});

test('mapped physical addresses stay intuitive while the final controller frame reverses', () => {
  const frame = generateFrame({
    width: 2,
    height: 1,
    pattern: 'manual-pixel',
    pixelIndex: 0,
    color: '#ff0000',
    channelOrder: 'RGB',
    pixelMap: [0, 1],
    physicalPixels: 4,
    controllerDirection: 'reverse'
  });
  assert.deepEqual([...frame], [
    0,0,0,
    0,0,0,
    0,0,0,
    255,0,0
  ]);
});

test('controller chain direction control is exposed and persisted by the mapper', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../public/mapping-preview.js', import.meta.url), 'utf8');
  assert.match(html, /id="controllerDirection"/);
  assert.match(html, /Reverse — first connected LED is the last address/);
  assert.match(js, /controllerDirection/);
  assert.match(js, /reverse chain/);
});
