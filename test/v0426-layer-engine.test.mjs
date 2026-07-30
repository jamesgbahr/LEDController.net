import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { VISUAL_PATTERNS } from '../public/visual-engine.js';
import {
  LAYER_BLEND_MODES,
  LAYER_MASK_TYPES,
  LAYER_MODIFIERS,
  MAX_LAYERS_PER_DECK,
  normalizeLayerStack,
  renderLayerStack
} from '../public/layer-engine.js';
import { generateLogicalFrame, OutputTester } from '../src/output.mjs';

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return true;
  return false;
}

const base = { width: 8, height: 8, brightness: 1, timeSeconds: 1.25, audioEnabled: true, audio: { level: .7, bass: .8, spectrum: Array(32).fill(.65) } };

function layer(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(36), name: 'Test layer', enabled: true, pattern: 'solid', color: '#ff0000', secondaryColor: '#000000',
    speed: 1, scale: 1, direction: 1, opacity: 1, blendMode: 'normal', modifiers: [],
    mask: { type: 'none', strength: 1, invert: false, softness: .18, scale: 1, rotation: 0, x: .5, y: .5 },
    modulation: { source: 'none', target: 'opacity', amount: .5, rate: 1 }, ...overrides
  };
}

test('v0.4.26 normalizes a maximum of four layers per deck', () => {
  const layers = normalizeLayerStack(Array.from({ length: 7 }, (_, index) => layer({ id: `l${index}`, opacity: 2, blendMode: 'invalid' })));
  assert.equal(layers.length, MAX_LAYERS_PER_DECK);
  assert.equal(layers[0].opacity, 1);
  assert.equal(layers[0].blendMode, 'normal');
});

test('layer blend modes, modifiers, masks, and audio modulation alter composed frames', () => {
  const red = layer({ id: 'red' });
  const blue = layer({ id: 'blue', color: '#0000ff', opacity: .7, blendMode: 'screen' });
  const plain = renderLayerStack({ ...base, layers: [red] });
  const blended = renderLayerStack({ ...base, layers: [red, blue] });
  const masked = renderLayerStack({ ...base, layers: [red, { ...blue, mask: { ...blue.mask, type: 'circle' } }] });
  const modified = renderLayerStack({ ...base, layers: [{ ...red, pattern: 'plasma', modifiers: ['kaleidoscope', 'posterize'] }] });
  const modulated = renderLayerStack({ ...base, layers: [{ ...blue, modulation: { source: 'bass', target: 'opacity', amount: -1, rate: 1 } }] });
  assert.equal(differs(plain, blended), true);
  assert.equal(differs(blended, masked), true);
  assert.equal(differs(plain, modified), true);
  assert.equal(differs(renderLayerStack({ ...base, audio: { bass: 0 }, layers: [blue] }), modulated), true);
  assert.equal(LAYER_BLEND_MODES.length, 12);
  assert.equal(LAYER_MODIFIERS.length, 12);
  assert.ok(LAYER_MASK_TYPES.length >= 8);
});

test('fifteen new layer-friendly generators are registered and animate', () => {
  const names = ['hex-tunnel','triangle-tunnel','polygon-orbit','geometric-lattice','isometric-cubes','concentric-diamonds','radial-spokes','perspective-grid','gothic-window','flow-field','reaction-diffusion','electric-arcs','aurora-ribbons','particle-fountain','comet-vortex'];
  assert.ok(VISUAL_PATTERNS.length >= 115);
  for (const pattern of names) {
    assert.equal(VISUAL_PATTERNS.some((item) => item.value === pattern), true, pattern);
    const first = renderLayerStack({ ...base, timeSeconds: .2, layers: [layer({ pattern })] });
    const second = renderLayerStack({ ...base, timeSeconds: 1.7, layers: [layer({ pattern })] });
    assert.equal(differs(first, second), true, `${pattern} should animate`);
  }
});

test('server logical output uses the same layer composition engine before mapping', () => {
  const single = generateLogicalFrame({ ...base, layers: [layer({ id: 'a' })] });
  const composed = generateLogicalFrame({ ...base, layers: [layer({ id: 'a' }), layer({ id: 'b', pattern: 'hex-tunnel', color: '#00ffff', blendMode: 'add', opacity: .55 })] });
  assert.equal(single.length, 8 * 8 * 3);
  assert.equal(composed.length, single.length);
  assert.equal(differs(single, composed), true);
});

test('output service preserves independent normalized layer stacks for both decks', () => {
  const tester = new OutputTester();
  try {
    const config = tester.buildConfig({
      targetIp: '127.0.0.1', width: 4, height: 4,
      deckALayers: [layer({ id: 'a1' }), layer({ id: 'a2', blendMode: 'add' })],
      deckBLayers: [layer({ id: 'b1', pattern: 'gothic-window' })]
    });
    assert.equal(config.deckALayers.length, 2);
    assert.equal(config.deckBLayers.length, 1);
    assert.equal(config.deckALayers[1].blendMode, 'add');
    assert.equal(config.deckBLayers[0].pattern, 'gothic-window');
  } finally {
    tester.socket.close();
  }
});

test('layer UI and preset memory publish the complete v0.4.26 workflow', async () => {
  const [html, app, css, workspaceCss, pkg, server] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/styles.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/workspace.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../package.json', import.meta.url), 'utf8'),
    fs.readFile(new URL('../server.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="layerStackA"/);
  assert.match(html, /id="layerStackB"/);
  assert.match(html, /Selected layer generator/);
  assert.match(html, /id="layerInspectorOverlay"/);
  assert.match(html, /id="layerInspectorBody"/);
  assert.match(app, /layerStacks: serializeLayerStacks\(\)/);
  assert.match(app, /restoreLayerStacks\(preset\.auxiliary\.layerStacks\)/);
  assert.match(app, /MAX_LAYERS_PER_DECK/);
  assert.match(css, /v0\.4\.26 per-deck layer engine/);
  assert.match(workspaceCss, /compact four-layer strips and full-screen layer inspector/);
  assert.match(app, /function renderLayerInspector\(\)/);
  assert.match(app, /deckHasAudioLayer\('A'\) \|\| deckHasAudioLayer\('B'\)/);
  assert.match(JSON.parse(pkg).version, /^0\.4\.(?:26|27|28|29|30|31|32|33|34|35|36)$/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:26|27|28|29|30|31|32|33|34|35|36)'/);
});
