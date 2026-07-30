import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame } from '../public/visual-engine.js';

const root = new URL('../', import.meta.url);

function nonBlackPixels(frame) {
  let count = 0;
  for (let i = 0; i < frame.length; i += 3) if (frame[i] || frame[i + 1] || frame[i + 2]) count += 1;
  return count;
}

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return true;
  return false;
}

test('silent dedicated audio modes keep a visible idle frame instead of blacking out', () => {
  for (const pattern of ['audio-spectrum', 'audio-bass-pulse', 'audio-kaleidoscope', 'audio-oscilloscope']) {
    const frame = renderVisualFrame({ width: 8, height: 8, pattern, brightness: 0.35, audioEnabled: true, audio: {}, timeSeconds: 1.4 });
    assert.ok(nonBlackPixels(frame) >= 8, `${pattern} should remain visibly active during silence`);
  }
});

test('real audio still overrides the idle fallback', () => {
  const quiet = renderVisualFrame({ width: 8, height: 8, pattern: 'audio-spectrum', brightness: 0.35, audioEnabled: true, audio: {}, timeSeconds: 1.4 });
  const loud = renderVisualFrame({ width: 8, height: 8, pattern: 'audio-spectrum', brightness: 0.35, audioEnabled: true, audio: { level: .8, bass: .9, mid: .6, treble: .7, spectrum: Array.from({length:32}, (_,i)=>i/31), waveform: Array(64).fill(.3) }, timeSeconds: 1.4 });
  assert.equal(differs(quiet, loud), true);
});

test('audio mode and start visual both request microphone capture automatically', async () => {
  const app = await fs.readFile(new URL('public/app.js', root), 'utf8');
  assert.match(app, /async function openAudioMode\(\)[\s\S]*startAudioCapture\('microphone'/);
  assert.match(app, /async function startOutput\(\)[\s\S]*audioMode[\s\S]*startAudioCapture\('microphone'/);
  assert.match(app, /audioCalibrationVersion:\s*3/);
  assert.match(app, /no sound detected/);
});
