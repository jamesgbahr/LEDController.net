import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createAudioProcessor, processAudioFrame } from '../public/audio-engine.js';
import { AdaptiveShowDirector, BUSKING_LOOKS } from '../public/show-engine.js';

function audioFrame(kind = 'quiet') {
  const frequencyData = new Uint8Array(1024).fill(2);
  if (kind === 'treble') for (let index = 220; index < 760; index += 1) frequencyData[index] = 180;
  return { frequencyData, timeData: new Uint8Array(2048).fill(128) };
}

test('treble and hi-hat detection rises on cymbal-band energy after a quiet floor', () => {
  let state = createAudioProcessor();
  const settings = { autoGain: true, inputGain: 3.5, gate: 0.002, attackMs: 14, releaseMs: 135, transientSensitivity: 1 };
  let quiet;
  for (let frame = 0; frame < 30; frame += 1) {
    quiet = processAudioFrame({ ...audioFrame(), sampleRate: 48000, fftSize: 2048, nowMs: frame * 17, settings }, state);
    state = quiet.state;
  }
  assert.ok(quiet.metrics.treble < 0.25);
  const cymbal = processAudioFrame({ ...audioFrame('treble'), sampleRate: 48000, fftSize: 2048, nowMs: 540, settings }, state);
  assert.ok(cymbal.metrics.treble > 0.75);
  assert.ok(cymbal.metrics.hihat > 0.65);
  assert.equal(cymbal.detected.hihat, true);
});

test('busking bank contains only broad low-resolution-safe looks with controlled speeds', () => {
  const expected = ['flow', 'scanner', 'bars', 'wipe', 'spectrum', 'vu', 'pulse', 'gradient'];
  assert.deepEqual(Object.keys(BUSKING_LOOKS), expected);
  for (const look of Object.values(BUSKING_LOOKS)) assert.ok(look.speed <= 0.44, `${look.label} speed should stay controlled`);
});

test('16x4 autopilot selects only the strict show-safe pattern library', () => {
  const safe = new Set(['flowing-gradient','breathe','matrix-flow-x','bars','scanner-dual','audio-vu-bars','audio-spectrum-mirror','color-wipe-dual','matrix-flow-diagonal','audio-color-bands','audio-bass-pulse','audio-palette-pulse','palette-bands']);
  const director = new AdaptiveShowDirector();
  const base = { width: 16, height: 4, matrixClarity: 'auto', showStyle: 'club', showSeed: 'safe-show', showIntensity: .8, showSceneBeats: 8, showTransitionSeconds: .2, showVariation: .8, showAdaptive: true, showAudioSync: true, showBpm: 120, showControlMode: 'auto', speed: 1, showRate: 1, audioEnabled: true, audioMotion: 2, audio: { level: .5, bass: .6, treble: .5, kick: .2, snare: .2, hihat: .2 } };
  for (const timeSeconds of [0, 4.2, 8.4, 12.6, 16.8, 21]) {
    const result = director.render({ ...base, timeSeconds });
    assert.equal(safe.has(result.status.currentPattern), true, `unsafe show pattern: ${result.status.currentPattern}`);
  }
});

test('frontend exposes the cleaned show bank and cymbal meter label', async () => {
  const html = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const look of ['flow','scanner','bars','wipe','spectrum','vu','pulse','gradient']) assert.match(html, new RegExp(`data-show-look="${look}"`));
  for (const removed of ['rings','tunnel','kaleido']) assert.doesNotMatch(html, new RegExp(`data-show-look="${removed}"`));
  assert.match(html, /Treble \/ cymbals/);
  assert.match(html, /Motion pace/);
});
