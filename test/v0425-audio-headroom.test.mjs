import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createAudioProcessor, processAudioFrame } from '../public/audio-engine.js';

const settings = {
  autoGain: true,
  inputGain: 3.5,
  bassBoost: 1.75,
  beatBoost: 2,
  gate: 0.002,
  dynamics: 0.72,
  attackMs: 22,
  releaseMs: 180,
  transientSensitivity: 1.15
};

function audioFrame({ floor = 8, low = floor, mid = floor, high = floor, waveform = 1 } = {}) {
  const frequencyData = new Uint8Array(1024).fill(floor);
  for (let index = 2; index < 9; index += 1) frequencyData[index] = low;
  for (let index = 25; index < 90; index += 1) frequencyData[index] = mid;
  for (let index = 220; index < 600; index += 1) frequencyData[index] = high;
  const timeData = new Uint8Array(2048);
  for (let index = 0; index < timeData.length; index += 1) {
    timeData[index] = 128 + Math.round(Math.sin(index * 0.12) * waveform);
  }
  return { frequencyData, timeData, sampleRate: 48000, fftSize: 2048 };
}

test('automatic gain learns steady room noise instead of expanding it to full scale', () => {
  let state = createAudioProcessor();
  let result;
  for (let frame = 0; frame < 180; frame += 1) {
    result = processAudioFrame({ ...audioFrame(), nowMs: frame * 17, settings }, state);
    state = result.state;
  }
  assert.ok(result.metrics.level < 0.15, `level ${result.metrics.level}`);
  assert.ok(result.metrics.bass < 0.20, `bass ${result.metrics.bass}`);
  assert.ok(result.metrics.mid < 0.15, `mid ${result.metrics.mid}`);
  assert.ok(result.metrics.treble < 0.20, `treble ${result.metrics.treble}`);
  assert.ok(Math.max(...result.metrics.spectrum) < 0.15);
});

test('low audio retains proportional meter headroom while a strong transient can still peak', () => {
  let state = createAudioProcessor();
  for (let frame = 0; frame < 180; frame += 1) {
    state = processAudioFrame({ ...audioFrame(), nowMs: frame * 17, settings }, state).state;
  }
  let low;
  for (let frame = 0; frame < 12; frame += 1) {
    low = processAudioFrame({ ...audioFrame({ low: 12, mid: 10, high: 9, waveform: 1 }), nowMs: 3100 + frame * 17, settings }, state);
    state = low.state;
  }
  assert.ok(low.metrics.bass < 0.65, `low bass ${low.metrics.bass}`);
  assert.ok(low.metrics.mid < 0.45, `low mid ${low.metrics.mid}`);
  assert.ok(low.metrics.treble < 0.45, `low treble ${low.metrics.treble}`);
  assert.ok(Math.max(...low.metrics.spectrum) < 0.50);

  const hit = processAudioFrame({ ...audioFrame({ low: 225, mid: 180, high: 160, waveform: 20 }), nowMs: 3400, settings }, state);
  assert.ok(hit.metrics.level > 0.75);
  assert.ok(hit.metrics.bass > 0.80);
  assert.ok(hit.metrics.kick > 0.80);
});

test('v0.4.25 publishes the headroom behavior in both analyzer implementations and the UI', async () => {
  const [engine, app, html, css, pkg, server] = await Promise.all([
    fs.readFile(new URL('../public/audio-engine.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/workspace.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../package.json', import.meta.url), 'utf8'),
    fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8')
  ]);
  for (const source of [engine, app]) {
    assert.match(source, /absolute ceiling keeps room noise/);
    assert.match(source, /function applyResponseGain/);
    assert.match(source, /settings\.headroom \?\? 1\.38/);
  }
  assert.match(html, /quiet input is not stretched to 100%/);
  assert.match(css, /v0\.4\.25 — audio analyzer noise-floor headroom/);
  assert.match(JSON.parse(pkg).version, /^0\.4\.(?:25|26|27|28|29|30|31|32|33|34|35|36)$/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
