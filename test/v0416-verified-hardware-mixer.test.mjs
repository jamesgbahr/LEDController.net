import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

test('Deck B is mixed into the exact physical controller frame after mapping and reversal', async () => {
  const tester = new OutputTester();
  try {
    await tester.start({
      targetIp: '127.0.0.1', protocol: 'ddp', port: 49416,
      width: 4, height: 1, controllerPixels: 4, fps: 10, brightness: 1,
      pattern: 'solid', color: '#ff0000', secondaryColor: '#ff0000',
      deckMixEnabled: true, deckCrossfader: 0.6, deckMixMode: 'crossfade',
      deckBPattern: 'solid', deckBColor: '#0000ff', deckBSecondaryColor: '#0000ff',
      deckBSpeed: 1, deckBScale: 1, deckBDirection: 1,
      pixelMap: [2, 0, 3, 1], controllerDirection: 'reverse', channelOrder: 'RGB'
    }, { owner: 'visual' });
    const status = tester.status();
    assert.equal(status.decks.serverMixed, true);
    assert.equal(status.decks.crossfader, 0.6);
    assert.equal(status.decks.bInfluencePercent, 100);
    assert.notEqual(status.decks.aHash, status.decks.mixedHash);
    assert.deepEqual([...tester.latestLogicalFrame.slice(0, 3)], [102, 0, 153]);
    for (let offset = 0; offset < tester.latestPhysicalFrame.length; offset += 3) {
      assert.deepEqual([...tester.latestPhysicalFrame.slice(offset, offset + 3)], [102, 0, 153]);
    }
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('web controls lock output when the loaded UI and renderer versions differ', async () => {
  const [html, app, server, launcher] = await Promise.all([
    readFile(new URL('public/index.html', root), 'utf8'),
    readFile(new URL('public/app.js', root), 'utf8'),
    readFile(new URL('server.mjs', root), 'utf8'),
    readFile(new URL('start-ledcontroller.cmd', root), 'utf8')
  ]);
  assert.match(html, /id="serverVersionLock"/);
  assert.match(html, /id="serverMixProof"/);
  assert.match(app, /const CLIENT_VERSION = '0\.4\.(?:16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(app, /requireCompatibleServer/);
  assert.match(app, /verifyDeckOutputStatus/);
  assert.match(server, /serviceVersion: APP_VERSION/);
  assert.match(launcher, /RUNNING_VERSION/);
  assert.match(launcher, /Deck B to appear onscreen but not reach the LEDs/);
});

test('v0.4.16 uses a compact three-column grid and keeps the analyzer as a readable strip', async () => {
  const css = await readFile(new URL('public/workspace.css', root), 'utf8');
  assert.match(css, /v0\.4\.16 — verified hardware mixer/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-rows:48px minmax\(128px,\.72fr\) minmax\(188px,1\.02fr\) 112px/);
  assert.match(css, /#audioBeatHistory\{display:none!important\}/);
});
