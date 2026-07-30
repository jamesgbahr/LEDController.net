import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AdaptiveShowDirector } from '../public/show-engine.js';
import { isMatrixFriendlyPattern, MATRIX_FRIENDLY_PATTERNS, renderVisualFrame, VISUAL_PATTERNS } from '../public/visual-engine.js';

function spatialVariation(frame, width, height) {
  let total = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      if (x + 1 < width) {
        const next = index + 3;
        for (let channel = 0; channel < 3; channel += 1) {
          total += Math.abs(frame[index + channel] - frame[next + channel]);
          samples += 1;
        }
      }
      if (y + 1 < height) {
        const next = index + width * 3;
        for (let channel = 0; channel < 3; channel += 1) {
          total += Math.abs(frame[index + channel] - frame[next + channel]);
          samples += 1;
        }
      }
    }
  }
  return total / Math.max(1, samples);
}

test('matrix optimized library excludes texture-heavy noise modes', () => {
  assert.ok(MATRIX_FRIENDLY_PATTERNS.length >= 60);
  assert.ok(MATRIX_FRIENDLY_PATTERNS.length < VISUAL_PATTERNS.length);
  for (const pattern of ['noise', 'static-noise', 'glitch', 'moire', 'pixel-sort']) {
    assert.equal(isMatrixFriendlyPattern(pattern), false, `${pattern} should be hidden from the matrix-ready library`);
  }
  for (const pattern of ['matrix-flow-x', 'waves', 'rings', 'scanner', 'audio-spectrum']) {
    assert.equal(isMatrixFriendlyPattern(pattern), true, `${pattern} should remain matrix-ready`);
  }
});

test('resolution-aware clarity lowers unresolved spatial noise on a 16 by 4 matrix', () => {
  const common = { width: 16, height: 4, pattern: 'noise', brightness: 1, speed: 1, scale: 1, timeSeconds: 1.25 };
  const full = renderVisualFrame({ ...common, matrixClarity: 'full' });
  const optimized = renderVisualFrame({ ...common, matrixClarity: 'optimized', matrixElementSize: 1.55 });
  assert.ok(spatialVariation(optimized, 16, 4) < spatialVariation(full, 16, 4) * 0.65);
});

test('show director selects only matrix-readable looks on a low-resolution canvas', () => {
  const director = new AdaptiveShowDirector();
  const seen = [];
  for (let index = 0; index < 30; index += 1) {
    const result = director.render({
      width: 16,
      height: 4,
      brightness: 0.4,
      showStyle: 'festival',
      showAdaptive: true,
      showVariation: 0.8,
      showSceneBeats: 8,
      showTransitionSeconds: 0,
      showAdvanceToken: index,
      showBpm: 120,
      matrixClarity: 'auto',
      timeSeconds: index * 4.1,
      audioEnabled: false
    });
    seen.push(result.status.currentPattern);
    assert.equal(isMatrixFriendlyPattern(result.status.currentPattern), true, result.status.currentPattern);
    assert.equal(result.status.matrixOptimized, true);
  }
  assert.ok(new Set(seen).size >= 4);
});

test('matrix clarity controls and exact panel preview are exposed in Output', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const id of ['modeLibrary', 'matrixClarity', 'matrixElementSize', 'showPreviewPanels', 'matrixClarityNote']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /MATRIX_FRIENDLY_PATTERNS/);
  assert.match(app, /showPreviewPanels/);
  assert.match(app, /strokeRect\(px/);
});
