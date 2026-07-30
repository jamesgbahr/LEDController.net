import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAudioProcessor, processAudioFrame } from '../public/audio-engine.js';

test('v0.3.6 exposes calibration, tempo and band controls', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['audioCalibrate','audioSaveProfile','audioLoadProfile','audioSubGain','audioBassGain','audioLowMidGain','audioMidGain','audioHighMidGain','audioTrebleGain','audioTapTempo','audioTempoSync','audioBeatDivision','audioBeatHistory','audioLatencyText','audioModeStrength']) assert.match(html, new RegExp(`id="${id}"`));
});

test('per-band calibration gain changes analyzed bass response', () => {
  const frequencyData = new Uint8Array(1024);
  for (let i = 3; i < 9; i += 1) frequencyData[i] = 170;
  const timeData = new Uint8Array(2048).fill(128);
  const base = processAudioFrame({ frequencyData, timeData, sampleRate: 48000, fftSize: 2048, nowMs: 20, settings: { autoGain: false, inputGain: 0.5, gate: 0, bandGains: { bass: 1 } } }, createAudioProcessor());
  const boosted = processAudioFrame({ frequencyData, timeData, sampleRate: 48000, fftSize: 2048, nowMs: 20, settings: { autoGain: false, inputGain: 0.5, gate: 0, bandGains: { bass: 3 } } }, createAudioProcessor());
  assert.ok(boosted.metrics.bass > base.metrics.bass);
  assert.ok(boosted.diagnostics.raw.bass > 0);
});

test('server recognizes tight profile and transient response bands', () => {
  const source = fs.readFileSync(new URL('../src/output.mjs', import.meta.url), 'utf8');
  assert.match(source, /'tight', 'balanced'/);
  assert.match(source, /'kick', 'snare', 'hihat'/);
});
