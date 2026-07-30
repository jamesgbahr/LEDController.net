import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderLayerStack } from '../public/layer-engine.js';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const visual = fs.readFileSync(new URL('../public/visual-engine.js', import.meta.url), 'utf8');

function rainbowFrame(timeSeconds, speed = 1, direction = 1) {
  return renderLayerStack({
    width: 24,
    height: 8,
    brightness: 1,
    timeSeconds,
    layers: [{
      id: 'rainbow', name: 'Rainbow sweep', enabled: true, solo: false,
      pattern: 'rainbow', color: '#ffffff', secondaryColor: '#000000',
      speed, scale: 1, direction, opacity: 1, blendMode: 'normal',
      modifiers: [], mask: { type: 'none', strength: 1, invert: false, softness: .18, scale: 1, rotation: 0, x: .5, y: .5 },
      modulation: { source: 'none', target: 'opacity', amount: 0, rate: 1 }
    }]
  });
}

function difference(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += Math.abs(a[i] - b[i]);
  return total;
}

test('Layer Inspector exposes synchronized speed, scale, and direction controls', () => {
  assert.match(app, /data-layer-field="speed"/);
  assert.match(app, /data-layer-field="scale"/);
  assert.match(app, /data-layer-field="direction"/);
  assert.match(app, /\['speed','scale','direction'\]\.includes\(path\).*syncDeckControlsFromLayer/s);
});

test('Rainbow Sweep visibly changes over time and responds to speed', () => {
  const start = rainbowFrame(0, 1, 1);
  const slow = rainbowFrame(0.5, 0.25, 1);
  const normal = rainbowFrame(0.5, 1, 1);
  const fast = rainbowFrame(0.5, 3, 1);
  assert.ok(difference(start, normal) > 8000, 'rainbow should visibly travel over time');
  assert.notEqual(difference(start, slow), difference(start, fast), 'speed must change rainbow travel distance');
  assert.match(visual, /position-based sweep|true traveling sweep/);
});

test('Rainbow Sweep reverse direction differs from forward direction', () => {
  const forward = rainbowFrame(0.75, 1, 1);
  const reverse = rainbowFrame(0.75, 1, -1);
  assert.ok(difference(forward, reverse) > 12000, 'reverse direction should be visibly distinct');
});
