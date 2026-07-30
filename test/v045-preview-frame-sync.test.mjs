import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { OutputTester } from '../src/output.mjs';

test('frame subscribers receive each authoritative output frame with increasing serials', async () => {
  const tester = new OutputTester();
  const serials = [];
  const unsubscribe = tester.subscribeFrames(({ frame, meta }) => {
    assert.equal(frame.length, 16 * 4 * 3);
    serials.push(Number(meta.serial));
  }, { sendCurrent: false });
  try {
    await tester.start({
      protocol: 'ddp', targetIp: '127.0.0.1', port: 4048,
      width: 16, height: 4, fps: 30, pattern: 'waves',
      brightness: 0.35, speed: 1.5, scale: 1,
      color: '#00e7ff', secondaryColor: '#6f3cff'
    }, { owner: 'visual' });
    await delay(180);
    assert.ok(serials.length >= 4, `expected pushed frames, received ${serials.length}`);
    for (let index = 1; index < serials.length; index += 1) {
      assert.ok(serials[index] > serials[index - 1], 'frame serials must increase');
    }
  } finally {
    unsubscribe();
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('browser uses the pushed frame stream and is no longer capped at 30 fps', async () => {
  const app = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const server = await fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(app, /new EventSource\(`\/api\/output\/frame-stream/);
  assert.match(app, /push synced/);
  assert.match(app, /Math\.min\(60/);
  assert.doesNotMatch(app, /previewFps = Math\.min\(30/);
  assert.match(server, /url\.pathname === '\/api\/output\/frame-stream'/);
  assert.match(server, /text\/event-stream/);
});
