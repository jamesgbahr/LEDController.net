import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { OutputTester } from '../src/output.mjs';
import { AdaptiveShowDirector, renderShowFrame } from '../public/show-engine.js';

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return true;
  return false;
}

test('legacy zero speed is given a safe moving floor by the output service', async () => {
  const tester = new OutputTester();
  try {
    const started = await tester.start({
      targetIp: '127.0.0.1', protocol: 'ddp', port: 49068,
      width: 16, height: 4, fps: 30, pattern: 'flowing-gradient',
      speed: 0, brightness: 0.5, scale: 1
    });
    assert.equal(started.config.speed, 0.1);
    const first = Buffer.from(tester.latestLogicalFrame);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const second = Buffer.from(tester.latestLogicalFrame);
    assert.equal(differs(first, second), true);
    assert.ok(tester.status().motionTimeSeconds > 0.55);
    assert.equal(tester.status().motionClock, 'accumulated-monotonic');
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('frequent audio snapshots do not stop the accumulated motion clock', async () => {
  const tester = new OutputTester();
  try {
    const started = await tester.start({
      targetIp: '127.0.0.1', protocol: 'ddp', port: 49069,
      width: 16, height: 4, fps: 30, pattern: 'scanner-dual',
      speed: 0.8, brightness: 0.5, audioEnabled: true
    }, { owner: 'visual' });
    const first = Buffer.from(tester.latestLogicalFrame);
    for (let index = 0; index < 12; index += 1) {
      tester.updateAudio({ level: 0.2, treble: 0.4, spectrum: Array(32).fill(index / 12) }, { owner: 'visual', streamId: started.streamId });
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const second = Buffer.from(tester.latestLogicalFrame);
    assert.equal(differs(first, second), true);
    assert.ok(tester.status().motionTimeSeconds > 0.2);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('show mode preserves visible movement even with legacy minimum controls', () => {
  const director = new AdaptiveShowDirector();
  const base = {
    width: 16, height: 4, showMode: true, showControlMode: 'busking', showLookId: 'flow',
    showLookToken: 1, showStyle: 'festival', showRate: 0.25, speed: 0,
    brightness: 0.5, matrixClarity: 'auto', audioEnabled: false, showAudioSync: false
  };
  const first = renderShowFrame({ ...base, timeSeconds: 0 }, director).frame;
  const second = renderShowFrame({ ...base, timeSeconds: 2 }, director).frame;
  assert.equal(differs(first, second), true);
});

test('frontend migrates old zero-speed settings and prevents a dead speed slider', async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="speed"[^>]*min="0\.1"/);
  assert.match(app, /legacyStoppedMotion/);
  assert.match(app, /motionSettingsVersion:\s*1/);
});
