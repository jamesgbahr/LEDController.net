import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import dgram from 'node:dgram';
import { AdaptiveShowDirector, SHOW_STYLES } from '../public/show-engine.js';
import { OutputTester } from '../src/output.mjs';

function illuminated(frame) { return Array.from(frame).some((value) => value > 0); }

test('show director publishes professional show styles and visible frames', () => {
  assert.deepEqual(SHOW_STYLES.map((style) => style.value), ['festival','club','cinematic','ambient','corporate']);
  const director = new AdaptiveShowDirector();
  const first = director.render({ width: 16, height: 4, timeSeconds: 0, showStyle: 'festival', showSeed: 'test', showIntensity: .8, showSceneBeats: 16, showTransitionSeconds: 1, showVariation: .6, showAdaptive: true, showAudioSync: true, showBpm: 120, audioEnabled: true, audio: { level: .5, bass: .7, kick: 1, snare: .2, hihat: .2 } });
  assert.equal(first.frame.length, 16 * 4 * 3);
  assert.equal(illuminated(first.frame), true);
  assert.equal(first.status.enabled, true);
  assert.ok(first.status.currentLook);
});

test('show director changes looks on phrase boundaries and avoids immediate repeats', () => {
  const director = new AdaptiveShowDirector();
  const input = { width: 8, height: 8, showStyle: 'club', showSeed: 'repeat-test', showIntensity: .8, showSceneBeats: 8, showTransitionSeconds: .5, showVariation: .7, showAdaptive: true, showAudioSync: true, showBpm: 120, audioEnabled: true, audio: { level: .6, bass: .7, kick: .8, snare: .4, hihat: .3 } };
  const a = director.render({ ...input, timeSeconds: 0 });
  const b = director.render({ ...input, timeSeconds: 4.2 });
  assert.notEqual(a.status.currentPattern, b.status.currentPattern);
  assert.equal(b.status.reason, 'musical phrase complete');
});

test('show director supports manual next-look token', () => {
  const director = new AdaptiveShowDirector();
  const input = { width: 8, height: 8, showStyle: 'cinematic', showSeed: 'manual', showSceneBeats: 64, showBpm: 120, showAdvanceToken: 0, audioEnabled: false };
  const a = director.render({ ...input, timeSeconds: 0 });
  const b = director.render({ ...input, timeSeconds: 1, showAdvanceToken: 1 });
  assert.notEqual(a.status.currentPattern, b.status.currentPattern);
  assert.equal(b.status.reason, 'manual next look');
});

test('output tester transmits adaptive show frames through DDP', async () => {
  const receiver = dgram.createSocket('udp4');
  await new Promise((resolve) => receiver.bind(49140, '127.0.0.1', resolve));
  const packets = [];
  receiver.on('message', (message) => packets.push(message));
  const tester = new OutputTester();
  try {
    const status = await tester.start({ targetIp: '127.0.0.1', protocol: 'ddp', port: 49140, width: 16, height: 4, fps: 20, brightness: .4, showMode: true, showStyle: 'festival', showSeed: 'udp-show', showIntensity: .8, showSceneBeats: 16, showTransitionSeconds: .8, showVariation: .6, showAdaptive: true, showAudioSync: true, showBpm: 120, audioEnabled: true, audio: { level: .6, bass: .7, kick: 1, snare: .3, hihat: .2 } }, { owner: 'visual' });
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal(status.showMode, true);
    assert.ok(tester.status().show?.currentLook);
    assert.ok(packets.length >= 1);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
    receiver.close();
  }
});

test('show mode controls are exposed in the unified output workspace', async () => {
  const [html, app, css] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/workspace.css', import.meta.url), 'utf8')
  ]);
  for (const id of ['showModeButton','startShowButton','nextShowLook','stopShowButton','showStyle','showIntensity','showSceneBeats','showTransition','showAdaptive','showAudioSync','showCurrentLook']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /data-output-control-tab="show"/);
  assert.match(app, /AdaptiveShowDirector/);
  assert.match(app, /startShowMode/);
  assert.match(css, /\.show-director-panel/);
});
