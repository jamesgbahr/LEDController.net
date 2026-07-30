import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderLayerStack } from '../public/layer-engine.js';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const visual = fs.readFileSync(new URL('../public/visual-engine.js', import.meta.url), 'utf8');

function frame(timeSeconds, speed = 1, direction = 1) {
  return renderLayerStack({
    width: 16, height: 4, brightness: 1, timeSeconds,
    layers: [{
      id: 'rainbow', name: 'Rainbow sweep', enabled: true, solo: false,
      pattern: 'rainbow', color: '#ffffff', secondaryColor: '#000000',
      speed, scale: 1, direction, opacity: 1, blendMode: 'normal', modifiers: [],
      mask: { type: 'none', strength: 1, invert: false, softness: .18, scale: 1, rotation: 0, x: .5, y: .5 },
      modulation: { source: 'none', target: 'opacity', amount: 0, rate: 1 }
    }]
  });
}

function difference(a, b) {
  let total = 0;
  let max = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = Math.abs(a[i] - b[i]);
    total += delta;
    max = Math.max(max, delta);
  }
  return { total, max };
}

test('each deck publishes an always-visible motion control row', () => {
  assert.match(html, /class="deck-motion-row" aria-label="Deck A motion controls"/);
  assert.match(html, /class="deck-motion-row" aria-label="Deck B motion controls"/);
  assert.match(css, /v0\.4\.28 — keep deck motion controls physically visible/);
  assert.match(css, /grid-template-rows:auto auto auto auto/);
  assert.match(css, /\.deck-motion-row\{/);
});

test('Rainbow Sweep changes visibly between adjacent 22 fps frames', () => {
  const first = frame(0, 1, 1);
  const next = frame(1 / 22, 1, 1);
  const delta = difference(first, next);
  assert.ok(delta.total > 900, `expected visible adjacent-frame change, got ${delta.total}`);
  assert.ok(delta.max >= 12, `expected strong per-channel motion, got ${delta.max}`);
  assert.match(visual, /sweepOffset = phase \* 0\.42/);
});

test('Rainbow Sweep speed and direction remain functional', () => {
  const slow = frame(.5, .25, 1);
  const fast = frame(.5, 3, 1);
  const reverse = frame(.5, 1, -1);
  assert.ok(difference(slow, fast).total > 6000);
  assert.ok(difference(frame(.5, 1, 1), reverse).total > 9000);
});
