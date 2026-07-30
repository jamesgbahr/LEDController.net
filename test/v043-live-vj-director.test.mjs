import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import dgram from 'node:dgram';
import { AdaptiveShowDirector } from '../public/show-engine.js';
import { OutputTester } from '../src/output.mjs';

const energy = (frame) => Array.from(frame).reduce((sum, value) => sum + value, 0);

function input(overrides = {}) {
  return {
    width: 16, height: 4, showStyle: 'festival', showSeed: 'vj-test', showIntensity: 0.8,
    showSceneBeats: 32, showTransitionSeconds: 1.4, showVariation: 0.6, showAdaptive: true,
    showAudioSync: true, showBpm: 120, showPerformance: 0.85, showGestureRate: 0.6,
    showMixStyle: 'hybrid', showStrobeSafe: true, brightness: 0.5, audioEnabled: true,
    audio: { level: 0.55, sub: 0.5, bass: 0.6, mid: 0.35, highMid: 0.2, treble: 0.2, kick: 0.15, snare: 0.1, hihat: 0.1 },
    ...overrides
  };
}

test('live VJ director cues deck B before moving the crossfader', () => {
  const director = new AdaptiveShowDirector();
  const first = director.render(input({ timeSeconds: 0 }));
  const cued = director.render(input({ timeSeconds: 14.2 }));
  director.render(input({ timeSeconds: 16.05 }));
  const mixing = director.render(input({ timeSeconds: 16.35 }));
  assert.equal(first.status.deckB, 'Not cued');
  assert.notEqual(cued.status.deckB, 'Not cued');
  assert.equal(cued.status.crossfader, 0);
  assert.ok(mixing.status.crossfader > 0 && mixing.status.crossfader < 1);
  assert.match(mixing.status.mixMode, /crossfade|wipe|luma|checker|vertical/);
  assert.notEqual(mixing.status.deckA, mixing.status.deckB);
});

test('manual performance pads alter the exact show frame', () => {
  const normal = new AdaptiveShowDirector();
  const punched = new AdaptiveShowDirector();
  normal.render(input({ timeSeconds: 0 }));
  punched.render(input({ timeSeconds: 0 }));
  const normalFrame = normal.render(input({ timeSeconds: 1.1 })).frame;
  const punchResult = punched.render(input({ timeSeconds: 1.1, showPunchToken: 1 }));
  assert.notDeepEqual(Array.from(normalFrame), Array.from(punchResult.frame));
  assert.ok(energy(punchResult.frame) >= energy(normalFrame));
  assert.equal(punchResult.status.operatorMove, 'Fader punch');
});

test('manual blackout and freeze gestures are recognized', () => {
  const director = new AdaptiveShowDirector();
  director.render(input({ timeSeconds: 0 }));
  const blackout = director.render(input({ timeSeconds: 1, showBlackoutToken: 1 }));
  const freeze = director.render(input({ timeSeconds: 2, showFreezeToken: 1 }));
  assert.equal(blackout.status.operatorMove, 'Blackout tap');
  assert.equal(freeze.status.operatorMove, 'Frame freeze');
});

test('output tester accepts live VJ settings and gesture tokens', async () => {
  const receiver = dgram.createSocket('udp4');
  await new Promise((resolve) => receiver.bind(49143, '127.0.0.1', resolve));
  const packets = [];
  receiver.on('message', (message) => packets.push(message));
  const tester = new OutputTester();
  try {
    await tester.start({
      targetIp: '127.0.0.1', protocol: 'ddp', port: 49143, fps: 20,
      ...input({ timeSeconds: undefined }), showMode: true, showPunchToken: 0
    }, { owner: 'visual' });
    const before = tester.status().framesSent;
    await tester.update({ showPunchToken: 1 }, { owner: 'visual', streamId: tester.status().streamId });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const status = tester.status();
    assert.equal(status.showMode, true);
    assert.equal(status.config.showPerformance, 0.85);
    assert.equal(status.config.showMixStyle, 'hybrid');
    assert.ok(status.framesSent > before);
    assert.equal(status.show?.operatorMove, 'Fader punch');
    assert.ok(packets.length > 0);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
    receiver.close();
  }
});

test('live VJ controls and deck telemetry are exposed in the frontend', async () => {
  const [html, app, css] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/workspace.css', import.meta.url), 'utf8')
  ]);
  for (const id of ['showPerformance','showGestureRate','showMixStyle','showStrobeSafe','showPunch','showWhiteHit','showBlackoutTap','showFreeze','showStrobeTap','showDeckA','showDeckB','showCrossfaderBar','showOperatorMove']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /triggerShowGesture/);
  assert.match(css, /\.show-performance-pads/);
  assert.match(css, /\.show-crossfader/);
});
