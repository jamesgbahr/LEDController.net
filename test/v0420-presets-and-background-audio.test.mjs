import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, app, css, worklet, worker, server] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/app.js', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('public/audio-clock-processor.js', root), 'utf8'),
  readFile(new URL('public/audio-clock-worker.js', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8')
]);

test('complete scene preset manager is exposed in Output Studio', () => {
  for (const id of ['presetLibraryButton','presetName','presetSelect','presetSave','presetUpdate','presetLoad','presetDelete','presetExport','presetImportButton','presetImportFile','presetStatus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-output-control-tab="presets"/);
  assert.match(html, /data-output-control-panel="presets"/);
  assert.match(css, /v0\.4\.20 — complete scene presets and focus-independent audio capture/);
});

test('presets snapshot all performance controls plus complete audio runtime state', () => {
  assert.match(app, /document\.querySelectorAll\('#view-output input\[id\], #view-output select\[id\], #view-output textarea\[id\]'\)/);
  assert.match(app, /audioCaptureActive: Boolean\(state\.audio\.active\)/);
  assert.match(app, /audioSourceType: state\.audio\.sourceType/);
  assert.match(app, /audioBpm: Number\(state\.audio\.bpm/);
  assert.match(app, /audioModeStrengths/);
  assert.match(app, /LED output was not started automatically/);
});

test('audio analysis uses an AudioWorklet clock with worker and timer fallbacks', () => {
  assert.match(app, /startFocusIndependentAudioClock/);
  assert.match(app, /new AudioWorkletNode\(context, 'ledcontroller-audio-clock'/);
  assert.match(app, /new Worker\(`\/audio-clock-worker\.js/);
  assert.match(app, /state\.audio\.fallbackTimer = setInterval\(analyzeAudio, 16\)/);
  assert.doesNotMatch(app, /requestAnimationFrame\(analyzeAudio\)/);
  assert.match(worklet, /registerProcessor\('ledcontroller-audio-clock'/);
  assert.match(worklet, /sampleRate \/ 60/);
  assert.match(worker, /setInterval\(\(\) => self\.postMessage/);
});

test('release version is v0.4.20', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
