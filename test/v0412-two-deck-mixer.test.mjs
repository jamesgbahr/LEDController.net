import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateLogicalFrame, mixVisualFrames, OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

test('A/B mixer provides deterministic crossfade and performance blend modes', () => {
  const a = Buffer.from([255,0,0, 0,0,255]);
  const b = Buffer.from([0,255,0, 255,255,255]);
  assert.deepEqual([...mixVisualFrames(a,b,0,'crossfade',2,1)], [...a]);
  assert.deepEqual([...mixVisualFrames(a,b,1,'crossfade',2,1)], [...b]);
  assert.deepEqual([...mixVisualFrames(a,b,.5,'crossfade',2,1)], [128,128,0,128,128,255]);
  assert.equal(mixVisualFrames(a,b,.5,'add',2,1).length, a.length);
  assert.equal(mixVisualFrames(a,b,.5,'screen',2,1).length, a.length);
  assert.equal(mixVisualFrames(a,b,.5,'multiply',2,1).length, a.length);
  assert.equal(mixVisualFrames(a,b,.5,'difference',2,1).length, a.length);
  assert.equal(mixVisualFrames(a,b,.5,'luma',2,1).length, a.length);
});

test('output engine mixes decks before mapping and transmission', async () => {
  const tester = new OutputTester();
  try {
    await tester.start({
      targetIp:'127.0.0.1', protocol:'ddp', port:49212, width:4, height:2, fps:10,
      pattern:'solid', color:'#ff0000', secondaryColor:'#ff0000', brightness:1,
      deckMixEnabled:true, deckCrossfader:1, deckMixMode:'crossfade',
      deckBPattern:'solid', deckBColor:'#0000ff', deckBSecondaryColor:'#0000ff', deckBSpeed:1, deckBScale:1, deckBDirection:1
    }, { owner:'visual' });
    const status=tester.status();
    assert.equal(status.config.deckBPattern,'solid');
    assert.equal(status.decks.enabled,true);
    assert.equal(status.decks.crossfader,1);
    assert.deepEqual([...tester.latestLogicalFrame.slice(0,3)], [0,0,255]);
  } finally { tester.stop({force:true}); tester.socket.close(); }
});

test('frontend exposes permanent brightness, two deck views, and enlarged analyzer', async () => {
  const [html, app, css, server] = await Promise.all([
    readFile(new URL('public/index.html', root),'utf8'),
    readFile(new URL('public/app.js', root),'utf8'),
    readFile(new URL('public/workspace.css', root),'utf8'),
    readFile(new URL('server.mjs', root),'utf8')
  ]);
  for (const id of ['brightness','deckAPreview','deckBPreview','patternB','deckCrossfader','deckMixMode','deckMixEnabled','audioScope']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/MASTER BRIGHTNESS/);
  assert.match(html,/height="240" id="audioScope"/);
  assert.match(app,/mixDeckFrames/);
  assert.match(app,/initializeDeckBOptions/);
  assert.match(css,/\.deck-mixer-workspace/);
  assert.match(css,/\.audio-spectrum-head/);
  assert.match(server,/APP_VERSION = '0\.4\.(?:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
