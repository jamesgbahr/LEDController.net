import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame, VISUAL_PATTERNS, MATRIX_FRIENDLY_PATTERNS } from '../public/visual-engine.js';

const newVisuals = [
  'prism-wave','chroma-stripes','sunset-cycle','nebula-clouds','bio-cells','oil-slick','flame-tunnel','water-ribbons',
  'honeycomb-pulse','rotating-tiles','fractal-cross','tunnel-checker','cathedral-rose','laser-speckle','data-mosaic',
  'audio-laser-fan','audio-nebula','audio-shockwave-grid','audio-dna-helix','audio-particle-ring'
];

const audioVisuals = ['audio-laser-fan','audio-nebula','audio-shockwave-grid','audio-dna-helix','audio-particle-ring'];
const loudAudio = {
  level: .72, peak: .9, bass: .84, mid: .61, treble: .76, kick: .92, snare: .68, hihat: .81, beat: .9,
  spectrum: Array.from({ length: 32 }, (_, index) => (index % 7) / 6)
};

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return true;
  return false;
}

test('v0.4.35 publishes 135 visual generators including twenty new options', () => {
  assert.equal(VISUAL_PATTERNS.length, 135);
  assert.equal(new Set(VISUAL_PATTERNS.map((item) => item.value)).size, 135);
  for (const pattern of newVisuals) assert.equal(VISUAL_PATTERNS.some((item) => item.value === pattern), true, pattern);
  assert.equal(VISUAL_PATTERNS.filter((item) => item.group === 'Audio reactive').length, 35);
});

test('all twenty new visuals render non-empty frames and animate', () => {
  for (const pattern of newVisuals) {
    const first = renderVisualFrame({ width: 16, height: 8, pattern, brightness: 1, speed: 1, scale: 1, timeSeconds: .2, audioEnabled: true, audio: loudAudio });
    const second = renderVisualFrame({ width: 16, height: 8, pattern, brightness: 1, speed: 1, scale: 1, timeSeconds: 1.2, audioEnabled: true, audio: loudAudio });
    assert.equal(first.length, 16 * 8 * 3, `${pattern} frame size`);
    assert.ok(first.some((value) => value > 0), `${pattern} should not be black`);
    assert.equal(differs(first, second), true, `${pattern} should animate`);
  }
});

test('the five new audio visuals respond to live audio at a fixed frame time', () => {
  for (const pattern of audioVisuals) {
    const quiet = renderVisualFrame({ width: 16, height: 8, pattern, brightness: 1, speed: 1, scale: 1, timeSeconds: 1.2, audioEnabled: true, audio: {} });
    const loud = renderVisualFrame({ width: 16, height: 8, pattern, brightness: 1, speed: 1, scale: 1, timeSeconds: 1.2, audioEnabled: true, audio: loudAudio });
    assert.equal(differs(quiet, loud), true, `${pattern} should react to audio`);
  }
});

test('new low-resolution-safe visuals are included in matrix optimized mode', () => {
  for (const pattern of newVisuals.filter((name) => !['laser-speckle','data-mosaic'].includes(name))) {
    assert.ok(MATRIX_FRIENDLY_PATTERNS.includes(pattern), pattern);
  }
});

test('v0.4.35 metadata and release notes are consistent', async () => {
  const [pkg, app, server, readme] = await Promise.all([
    fs.readFile(new URL('../package.json', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8'),
    fs.readFile(new URL('../README-v0.4.35.md', import.meta.url), 'utf8')
  ]);
  assert.match(JSON.parse(pkg).version, /^0\.4\.(?:35|36)$/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:35|36)'/);
  assert.match(readme, /135 generators/);
});
