import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame, VISUAL_PATTERNS } from '../public/visual-engine.js';

const root = new URL('../', import.meta.url);

test('v0.2.7 publishes a large organized visual library', () => {
  assert.ok(VISUAL_PATTERNS.length >= 60, `expected at least 60 modes, received ${VISUAL_PATTERNS.length}`);
  const groups = new Set(VISUAL_PATTERNS.map((entry) => entry.group));
  for (const group of ['Utility', 'Color', 'Organic', 'Geometric', 'Texture', 'Motion', 'Test']) assert.equal(groups.has(group), true);
  const values = new Set(VISUAL_PATTERNS.map((entry) => entry.value));
  for (const value of ['aurora', 'fire', 'vortex', 'warp-tunnel', 'kaleidoscope', 'starfield', 'scanner', 'comet-x', 'rain', 'snow']) {
    assert.equal(values.has(value), true, `${value} should be registered`);
  }
});

test('every published mode renders a valid RGB frame', () => {
  for (const { value } of VISUAL_PATTERNS) {
    const frame = renderVisualFrame({
      width: 12,
      height: 8,
      pattern: value,
      color: '#ff4b8b',
      secondaryColor: '#184cff',
      brightness: 0.55,
      speed: 1,
      scale: 1,
      timeSeconds: 1.37,
      panelWidth: 4,
      panelHeight: 4
    });
    assert.equal(frame.length, 12 * 8 * 3, `${value} frame size`);
    for (const channel of frame) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255, `${value} channel range`);
    if (value !== 'blackout') assert.equal(frame.some((channel) => channel > 0), true, `${value} should illuminate at least one channel`);
  }
});

test('custom wiring tab exposes its own save action and handler', async () => {
  const [html, mapping] = await Promise.all([
    fs.readFile(new URL('public/index.html', root), 'utf8'),
    fs.readFile(new URL('public/mapping-preview.js', root), 'utf8')
  ]);
  assert.match(html, /id="customSaveMapping"/);
  assert.match(html, /id="customSaveMessage"/);
  assert.match(mapping, /\$\('customSaveMapping'\)\?\.addEventListener\('click', saveMapping\)/);
  assert.match(mapping, /Custom click wiring is now active/);
});

test('the visual selector exposes every registered public mode', async () => {
  const html = await fs.readFile(new URL('public/index.html', root), 'utf8');
  for (const { value } of VISUAL_PATTERNS) assert.match(html, new RegExp(`value="${value}"`), `${value} option`);
  assert.match(html, /id="visualModeCount"/);
});
