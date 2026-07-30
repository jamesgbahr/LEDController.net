import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame, VISUAL_PATTERNS } from '../public/visual-engine.js';
import { generateFrame, OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return true;
  return false;
}

test('visual engine publishes the new generator library', () => {
  const names = new Set(VISUAL_PATTERNS.map((entry) => entry.value));
  for (const pattern of ['plasma', 'waves', 'rings', 'spiral', 'bars', 'cells', 'noise', 'sparkle', 'gradient', 'color-scroll']) {
    assert.equal(names.has(pattern), true, `${pattern} should be registered`);
  }
});

test('animated generators produce sized frames that evolve over time', () => {
  for (const pattern of ['plasma', 'waves', 'rings', 'spiral', 'bars', 'cells', 'noise', 'sparkle', 'color-scroll']) {
    const first = renderVisualFrame({ width: 8, height: 8, pattern, color: '#ff0033', secondaryColor: '#0055ff', brightness: 0.5, timeSeconds: 0, speed: 1, scale: 1 });
    const second = renderVisualFrame({ width: 8, height: 8, pattern, color: '#ff0033', secondaryColor: '#0055ff', brightness: 0.5, timeSeconds: 1.75, speed: 1, scale: 1 });
    assert.equal(first.length, 8 * 8 * 3);
    assert.equal(differs(first, second), true, `${pattern} should animate`);
    assert.equal(first.some((value) => value > 0), true, `${pattern} should illuminate pixels`);
  }
});

test('server frame generation uses the shared visual engine before mapping', () => {
  const direct = generateFrame({ width: 2, height: 2, pattern: 'gradient', color: '#ff0000', secondaryColor: '#0000ff', brightness: 1 });
  const mapped = generateFrame({ width: 2, height: 2, pattern: 'gradient', color: '#ff0000', secondaryColor: '#0000ff', brightness: 1, pixelMap: [3, 2, 1, 0] });
  assert.equal(direct.length, 12);
  assert.deepEqual(Array.from(mapped.subarray(9, 12)), Array.from(direct.subarray(0, 3)));
});

test('running output can update visual parameters without restarting statistics', async () => {
  const tester = new OutputTester();
  try {
    const started = await tester.start({ targetIp: '127.0.0.1', protocol: 'ddp', port: 49049, width: 4, height: 4, fps: 5, pattern: 'plasma', speed: 1 });
    const startedAt = started.startedAt;
    const framesBefore = started.framesSent;
    const updated = await tester.update({ targetIp: '127.0.0.1', protocol: 'ddp', port: 49049, width: 4, height: 4, fps: 5, pattern: 'waves', speed: 2.5, secondaryColor: '#00ffcc' });
    assert.equal(updated.running, true);
    assert.equal(updated.startedAt, startedAt);
    assert.equal(updated.config.pattern, 'waves');
    assert.equal(updated.config.speed, 2.5);
    assert.ok(updated.framesSent > framesBefore);
  } finally {
    tester.stop();
    tester.socket.close();
  }
});

test('visual engine controls and live update endpoint are exposed', async () => {
  const [html, app, server] = await Promise.all([
    fs.readFile(new URL('public/index.html', root), 'utf8'),
    fs.readFile(new URL('public/app.js', root), 'utf8'),
    fs.readFile(new URL('server.mjs', root), 'utf8')
  ]);
  for (const id of ['secondaryColor', 'speed', 'scale', 'direction', 'swapColors', 'previewMode']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /value="plasma"/);
  assert.match(html, /value="waves"/);
  assert.match(app, /renderVisualFrame/);
  assert.match(app, /\/api\/output\/update/);
  assert.match(server, /\/api\/output\/update/);
});
