import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame } from '../public/visual-engine.js';
import { generateFrame } from '../src/output.mjs';

function rgb(frame, index) {
  return Array.from(frame.subarray(index * 3, index * 3 + 3));
}

function energy(frame, index) {
  return rgb(frame, index).reduce((sum, value) => sum + value, 0);
}

test('global horizontal matrix flow crosses a panel seam without restarting', () => {
  const width = 8;
  const height = 4;
  const timeSeconds = 0.5 / 0.22;
  const frame = renderVisualFrame({
    width,
    height,
    pattern: 'matrix-flow-x',
    color: '#ffffff',
    secondaryColor: '#000000',
    brightness: 1,
    speed: 1,
    scale: 1,
    timeSeconds
  });
  const leftOfSeam = 1 * width + 3;
  const rightOfSeam = 1 * width + 4;
  const farEdge = 1 * width;
  assert.ok(energy(frame, leftOfSeam) > 300, 'pixel immediately left of seam should be lit');
  assert.ok(energy(frame, rightOfSeam) > 300, 'pixel immediately right of seam should be lit');
  assert.ok(energy(frame, farEdge) < energy(frame, leftOfSeam), 'flow should be a global moving band, not a per-panel restart');
});

test('global XY flow is remapped only after the logical matrix frame is rendered', () => {
  const width = 8;
  const height = 4;
  const total = width * height;
  const pixelMap = Array.from({ length: total }, (_, logical) => total - 1 - logical);
  const config = {
    width,
    height,
    pattern: 'matrix-flow-x',
    color: '#ffffff',
    secondaryColor: '#000000',
    brightness: 1,
    speed: 1,
    scale: 1,
    timeSeconds: 0.5 / 0.22,
    pixelMap
  };
  const logical = generateFrame({ ...config, pixelMap: null });
  const mapped = generateFrame(config);
  for (const logicalIndex of [11, 12]) {
    assert.deepEqual(rgb(mapped, pixelMap[logicalIndex]), rgb(logical, logicalIndex));
  }
});

test('matrix flow proof controls and exclusive ownership are exposed in the unified UI', async () => {
  const [html, app, mapping, server] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/mapping-preview.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8')
  ]);
  for (const id of ['mappedFlowX', 'mappedFlowY', 'mappedFlowDiagonal', 'mappedSeams', 'visualOwnership']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /outputOwner: 'visual'/);
  assert.match(mapping, /outputOwner: 'mapping'/);
  assert.match(server, /OutputOwnershipError/);
  assert.match(server, /streamId/);
});
