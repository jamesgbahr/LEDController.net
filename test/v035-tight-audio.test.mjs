import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createAudioProcessor, processAudioFrame } from '../public/audio-engine.js';
import { renderVisualFrame } from '../public/visual-engine.js';
import { OutputTester } from '../src/output.mjs';

function frameData({ kick = false, snare = false, hihat = false } = {}) {
  const frequencyData = new Uint8Array(1024).fill(3);
  if (kick) for (let index = 1; index < 9; index += 1) frequencyData[index] = 225;
  if (snare) for (let index = 18; index < 130; index += 1) frequencyData[index] = 205;
  if (hihat) for (let index = 260; index < 620; index += 1) frequencyData[index] = 195;
  return { frequencyData, timeData: new Uint8Array(2048).fill(128) };
}

function differs(a, b) {
  return a.some((value, index) => value !== b[index]);
}

test('tight analyzer separates kick, snare, and hi-hat transients', () => {
  let state = createAudioProcessor();
  const settings = { autoGain: true, inputGain: 3.2, bassBoost: 1.9, beatBoost: 2.5, attackMs: 14, releaseMs: 135, transientSensitivity: 1 };
  for (let frame = 0; frame < 24; frame += 1) ({ state } = processAudioFrame({ ...frameData(), sampleRate: 48000, fftSize: 2048, nowMs: frame * 17, settings }, state));
  let result = processAudioFrame({ ...frameData({ kick: true }), sampleRate: 48000, fftSize: 2048, nowMs: 430, settings }, state);
  assert.ok(result.metrics.kick > 0.8);
  assert.ok(result.metrics.beat > 0.8);
  state = result.state;
  for (let frame = 0; frame < 16; frame += 1) ({ state } = processAudioFrame({ ...frameData(), sampleRate: 48000, fftSize: 2048, nowMs: 470 + frame * 17, settings }, state));
  result = processAudioFrame({ ...frameData({ snare: true }), sampleRate: 48000, fftSize: 2048, nowMs: 780, settings }, state);
  assert.ok(result.metrics.snare > 0.7);
  state = result.state;
  for (let frame = 0; frame < 12; frame += 1) ({ state } = processAudioFrame({ ...frameData(), sampleRate: 48000, fftSize: 2048, nowMs: 820 + frame * 17, settings }, state));
  result = processAudioFrame({ ...frameData({ hihat: true }), sampleRate: 48000, fftSize: 2048, nowMs: 1050, settings }, state);
  assert.ok(result.metrics.hihat > 0.65);
});

test('audio modes react differently to kick and high-frequency transients', () => {
  const base = { width: 16, height: 4, brightness: 0.35, audioEnabled: true, timeSeconds: 1.2, audioSensitivity: 1, audioMaster: 1 };
  const quiet = { level: .2, sub: .1, bass: .1, mid: .1, treble: .1, spectrum: Array(32).fill(.1), waveform: Array(64).fill(0) };
  const kick = { ...quiet, sub: .9, bass: .85, kick: 1, beat: 1 };
  const hat = { ...quiet, treble: .9, hihat: 1, spectrum: Array.from({ length: 32 }, (_, i) => i > 20 ? .95 : .1) };
  const bassQuiet = renderVisualFrame({ ...base, pattern: 'audio-bass-pulse', audio: quiet });
  const bassKick = renderVisualFrame({ ...base, pattern: 'audio-bass-pulse', audio: kick });
  const particleQuiet = renderVisualFrame({ ...base, pattern: 'audio-particles', audio: quiet });
  const particleHat = renderVisualFrame({ ...base, pattern: 'audio-particles', audio: hat });
  assert.equal(differs(bassQuiet, bassKick), true);
  assert.equal(differs(particleQuiet, particleHat), true);
});

test('server preserves transient metrics during a live audio update', async () => {
  const tester = new OutputTester();
  try {
    const started = await tester.start({ targetIp: '127.0.0.1', protocol: 'ddp', port: 49085, width: 4, height: 4, fps: 10, pattern: 'audio-beat-grid', audioEnabled: true }, { owner: 'visual' });
    const status = tester.updateAudio({ level: .5, bass: .7, kick: 1, snare: .8, hihat: .6, flux: .9 }, { owner: 'visual', streamId: started.streamId });
    assert.equal(status.audio.kick, 1);
    assert.equal(status.audio.snare, .8);
    assert.equal(status.audio.hihat, .6);
    assert.equal(status.audio.flux, .9);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('tight audio controls are exposed in the frontend', async () => {
  const [html, app] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8')
  ]);
  for (const id of ['audioAutoGain','audioDynamics','audioAttack','audioRelease','audioTransient','audioKickBar','audioSnareBar','audioHihatBar']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /processAudioFrame/);
  assert.match(app, /fftSize = 2048/);
  assert.match(app, /AUDIO_RESPONSE_PROFILES/);
  assert.match(app, /audioCalibrationVersion:\s*4/);
});
