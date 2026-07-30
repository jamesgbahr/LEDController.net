import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mixVisualFrames, OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

const red = Buffer.from([255, 0, 0, 255, 0, 0]);
const blue = Buffer.from([0, 0, 255, 0, 0, 255]);
const modes = ['crossfade', 'add', 'screen', 'multiply', 'difference', 'luma', 'wipe-x', 'wipe-y'];

test('A and B crossfader endpoints are hard solos in every mixer mode', () => {
  for (const mode of modes) {
    assert.deepEqual([...mixVisualFrames(red, blue, 0, mode, 2, 1)], [...red], `${mode} must solo Deck A at 0`);
    assert.deepEqual([...mixVisualFrames(red, blue, 1, mode, 2, 1)], [...blue], `${mode} must solo Deck B at 1`);
  }
});

test('physical output reports exact A and B solos after mapping and reversal', async () => {
  const tester = new OutputTester();
  const base = {
    targetIp: '127.0.0.1', protocol: 'ddp', port: 49417,
    width: 2, height: 1, controllerPixels: 2, fps: 10, brightness: 1,
    pattern: 'solid', color: '#ff0000', secondaryColor: '#ff0000',
    deckMixEnabled: true, deckMixMode: 'multiply',
    deckBPattern: 'solid', deckBColor: '#0000ff', deckBSecondaryColor: '#0000ff',
    deckBSpeed: 1, deckBScale: 1, deckBDirection: 1,
    pixelMap: [1, 0], controllerDirection: 'reverse', channelOrder: 'RGB'
  };
  try {
    await tester.start({ ...base, deckCrossfader: 0 }, { owner: 'visual' });
    assert.equal(tester.status().decks.solo, 'A');
    assert.deepEqual([...tester.latestPhysicalFrame.slice(0, 3)], [255, 0, 0]);
    await tester.update({ ...base, deckCrossfader: 1 }, { owner: 'visual', streamId: tester.status().streamId });
    assert.equal(tester.status().decks.solo, 'B');
    assert.deepEqual([...tester.latestPhysicalFrame.slice(0, 3)], [0, 0, 255]);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('cut buttons commit immediately and the console uses comfortable internal scrolling', async () => {
  const [html, app, css, server] = await Promise.all([
    readFile(new URL('public/index.html', root), 'utf8'),
    readFile(new URL('public/app.js', root), 'utf8'),
    readFile(new URL('public/workspace.css', root), 'utf8'),
    readFile(new URL('server.mjs', root), 'utf8')
  ]);
  assert.match(html, />SOLO A<\/button>/);
  assert.match(html, />SOLO B<\/button>/);
  assert.match(app, /async function commitDeckMixPosition/);
  assert.match(app, /await updateRunningVisual\(\)/);
  assert.match(app, /if \(mix >= 1\) return frameB/);
  assert.match(css, /v0\.4\.18 — unified three-channel live console/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(css, /grid-template-rows:52px minmax\(0,1fr\) 160px/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
