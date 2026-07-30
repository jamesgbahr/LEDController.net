import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('v0.3.2 exposes long-panel presets and visible audio controls', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['arrangePanelsHorizontal','arrangePanelsVertical','arrangePanelsGrid','audioProfile','audioMaster','audioBassBoost','audioBeatBoost']) assert.match(html, new RegExp(`id=[\"']${id}[\"']`));
  assert.doesNotMatch(html, /<details class=\"audio-reactive-panel/);
  assert.match(html, /audio-controls-visible/);
});

test('mapping UI wires horizontal and vertical arrangements', async () => {
  const source = await readFile(new URL('../public/mapping-preview.js', import.meta.url), 'utf8');
  assert.match(source, /arrangePanelsInLine\('horizontal'\)/);
  assert.match(source, /arrangePanelsInLine\('vertical'\)/);
});

import { renderVisualFrame } from '../public/visual-engine.js';

function frameEnergy(frame) {
  return Array.from(frame).reduce((sum, value) => sum + value, 0);
}

test('punchy audio controls create a stronger response for a quiet source', () => {
  const base = { width: 8, height: 8, pattern: 'audio-bass-pulse', brightness: .25, audioEnabled: true, audio: { level: .06, bass: .08, beat: .12, spectrum: Array(32).fill(.05), waveform: Array(64).fill(.05) }, timeSeconds: 1 };
  const balanced = renderVisualFrame({ ...base, audioProfile: 'balanced', audioSensitivity: 1.2, audioMaster: 1, audioBassBoost: 1, audioBeatBoost: 1 });
  const punchy = renderVisualFrame({ ...base, audioProfile: 'punchy', audioSensitivity: 3.5, audioMaster: 2, audioBassBoost: 1.75, audioBeatBoost: 2 });
  assert.ok(frameEnergy(punchy) > frameEnergy(balanced), 'punchy settings should visibly increase output energy');
});
