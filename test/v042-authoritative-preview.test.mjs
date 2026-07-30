import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { OutputTester, encodeLogicalFrame } from '../src/output.mjs';

test('server retains the exact logical frame used to build mapped show output', async () => {
  const tester = new OutputTester();
  const pixelMap = [3, 2, 1, 0];
  try {
    await tester.start({
      protocol: 'ddp', targetIp: '127.0.0.1', port: 4048,
      width: 4, height: 1, physicalPixels: 4, pixelMap,
      controllerDirection: 'reverse', channelOrder: 'RGB', fps: 20,
      brightness: 0.35, pattern: 'flowing-gradient', color: '#00f5ff', secondaryColor: '#ff1b8d',
      showMode: true, showStyle: 'festival', showSeed: 'preview-authority-test',
      showSceneBeats: 16, showTransitionSeconds: 0.4, showVariation: 0.4,
      showAdaptive: true, showAudioSync: false, showBpm: 120,
      matrixClarity: 'optimized', matrixElementSize: 1.6
    }, { owner: 'visual' });

    const logical = tester.frameSnapshot('logical');
    const physical = tester.frameSnapshot('physical');
    assert.equal(logical.frame.length, 12);
    assert.equal(physical.frame.length, 12);
    assert.equal(logical.meta.width, 4);
    assert.equal(logical.meta.height, 1);
    assert.equal(logical.meta.showMode, true);
    assert.ok(logical.meta.currentPattern);
    assert.deepEqual(
      physical.frame,
      encodeLogicalFrame(logical.frame, {
        width: 4, height: 1, physicalPixels: 4, pixelMap,
        controllerDirection: 'reverse', channelOrder: 'RGB'
      })
    );
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('browser preview uses the server-transmitted frame while output is live', async () => {
  const app = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const server = await fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(app, /\/api\/output\/frame\?space=logical/);
  assert.match(app, /LIVE transmitted frame/);
  assert.match(app, /transmittedPreviewAvailable/);
  assert.match(server, /url\.pathname === '\/api\/output\/frame'/);
});
