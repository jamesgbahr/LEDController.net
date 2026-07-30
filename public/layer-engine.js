import { clamp, parseHexColor, renderVisualFrame } from './visual-engine.js';

export const MAX_LAYERS_PER_DECK = 4;
export const LAYER_SCHEMA_VERSION = 1;

export const LAYER_BLEND_MODES = Object.freeze([
  { value: 'normal', label: 'Normal' },
  { value: 'add', label: 'Add' },
  { value: 'screen', label: 'Screen' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'darken', label: 'Darken' },
  { value: 'difference', label: 'Difference' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'maximum', label: 'Maximum' },
  { value: 'minimum', label: 'Minimum' },
  { value: 'luma-mask', label: 'Luma mask' }
]);

export const LAYER_MODIFIERS = Object.freeze([
  { value: 'blur', label: 'Blur' },
  { value: 'glow', label: 'Glow' },
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'posterize', label: 'Posterize' },
  { value: 'threshold', label: 'Threshold' },
  { value: 'hue-rotate', label: 'Hue rotate' },
  { value: 'saturation', label: 'Saturation boost' },
  { value: 'contrast', label: 'Contrast boost' },
  { value: 'mirror-x', label: 'Mirror X' },
  { value: 'mirror-y', label: 'Mirror Y' },
  { value: 'kaleidoscope', label: 'Kaleidoscope' },
  { value: 'edge', label: 'Edge detect' }
]);

export const LAYER_MASK_TYPES = Object.freeze([
  { value: 'none', label: 'No mask' },
  { value: 'circle', label: 'Circle' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'linear-gradient', label: 'Linear gradient' },
  { value: 'radial-gradient', label: 'Radial gradient' },
  { value: 'stripes', label: 'Stripes' },
  { value: 'checkerboard', label: 'Checkerboard' },
  { value: 'noise', label: 'Noise' },
  { value: 'audio-spectrum', label: 'Audio spectrum' }
]);

export const LAYER_MOD_SOURCES = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'level', label: 'Overall level' },
  { value: 'bass', label: 'Bass' },
  { value: 'mid', label: 'Mid' },
  { value: 'treble', label: 'Treble' },
  { value: 'beat', label: 'Beat' },
  { value: 'kick', label: 'Kick' },
  { value: 'snare', label: 'Snare' },
  { value: 'hihat', label: 'Hi-hat' },
  { value: 'lfo-sine', label: 'Sine LFO' },
  { value: 'lfo-triangle', label: 'Triangle LFO' },
  { value: 'lfo-saw', label: 'Saw LFO' }
]);

export const LAYER_MOD_TARGETS = Object.freeze([
  { value: 'opacity', label: 'Opacity' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'speed', label: 'Speed' },
  { value: 'scale', label: 'Scale' },
  { value: 'hue', label: 'Hue' }
]);

const BLEND_SET = new Set(LAYER_BLEND_MODES.map((item) => item.value));
const MODIFIER_SET = new Set(LAYER_MODIFIERS.map((item) => item.value));
const MASK_SET = new Set(LAYER_MASK_TYPES.map((item) => item.value));
const MOD_SOURCE_SET = new Set(LAYER_MOD_SOURCES.map((item) => item.value));
const MOD_TARGET_SET = new Set(LAYER_MOD_TARGETS.map((item) => item.value));

function uid() {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createLayer(input = {}) {
  return normalizeLayer({
    id: input.id || uid(),
    name: input.name || input.label || 'Layer',
    enabled: input.enabled !== false,
    solo: Boolean(input.solo),
    pattern: input.pattern || 'plasma',
    color: input.color || '#ff3b30',
    secondaryColor: input.secondaryColor || '#2457ff',
    speed: input.speed ?? 1,
    scale: input.scale ?? 1,
    direction: input.direction ?? 1,
    opacity: input.opacity ?? 1,
    blendMode: input.blendMode || 'normal',
    modifiers: input.modifiers || [],
    mask: input.mask || { type: 'none', strength: 1, invert: false, softness: 0.18, scale: 1, rotation: 0, x: 0.5, y: 0.5 },
    modulation: input.modulation || { source: 'none', target: 'opacity', amount: 0.5, rate: 1 }
  });
}

export function normalizeLayer(input = {}, index = 0) {
  const mask = input.mask || {};
  const modulation = input.modulation || {};
  return {
    id: String(input.id || `layer-${index + 1}`).slice(0, 80),
    name: String(input.name || `Layer ${index + 1}`).slice(0, 48),
    enabled: input.enabled !== false,
    solo: Boolean(input.solo),
    pattern: String(input.pattern || 'solid'),
    color: /^#[0-9a-f]{6}$/i.test(String(input.color || '')) ? String(input.color) : '#ffffff',
    secondaryColor: /^#[0-9a-f]{6}$/i.test(String(input.secondaryColor || '')) ? String(input.secondaryColor) : '#2457ff',
    speed: clamp(Number(input.speed ?? 1), 0.1, 8),
    scale: clamp(Number(input.scale ?? 1), 0.1, 12),
    direction: Number(input.direction) < 0 ? -1 : 1,
    opacity: clamp(Number(input.opacity ?? 1), 0, 1),
    blendMode: BLEND_SET.has(String(input.blendMode)) ? String(input.blendMode) : 'normal',
    modifiers: Array.from(new Set(Array.isArray(input.modifiers) ? input.modifiers.filter((value) => MODIFIER_SET.has(String(value))).map(String) : [])).slice(0, 6),
    mask: {
      type: MASK_SET.has(String(mask.type)) ? String(mask.type) : 'none',
      strength: clamp(Number(mask.strength ?? 1), 0, 1),
      invert: Boolean(mask.invert),
      softness: clamp(Number(mask.softness ?? 0.18), 0.01, 1),
      scale: clamp(Number(mask.scale ?? 1), 0.2, 4),
      rotation: clamp(Number(mask.rotation ?? 0), -180, 180),
      x: clamp(Number(mask.x ?? 0.5), 0, 1),
      y: clamp(Number(mask.y ?? 0.5), 0, 1)
    },
    modulation: {
      source: MOD_SOURCE_SET.has(String(modulation.source)) ? String(modulation.source) : 'none',
      target: MOD_TARGET_SET.has(String(modulation.target)) ? String(modulation.target) : 'opacity',
      amount: clamp(Number(modulation.amount ?? 0.5), -1, 1),
      rate: clamp(Number(modulation.rate ?? 1), 0.05, 8)
    }
  };
}

export function normalizeLayerStack(input, fallbackLayer = {}) {
  const source = Array.isArray(input) && input.length ? input : [createLayer(fallbackLayer)];
  return source.slice(0, MAX_LAYERS_PER_DECK).map((layer, index) => normalizeLayer(layer, index));
}

function rgbToHsv([r8, g8, b8]) {
  const r = r8 / 255, g = g8 / 255, b = b8 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, max ? d / max : 0, max];
}

function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb;
  if (h < 60) rgb = [c, x, 0]; else if (h < 120) rgb = [x, c, 0]; else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c]; else if (h < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
  return `#${rgb.map((value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function rotateHex(hex, degrees) {
  const [h, s, v] = rgbToHsv(parseHexColor(hex));
  return hsvToHex(((h + degrees) % 360 + 360) % 360, s, v);
}

function modulationValue(modulation, audio = {}, timeSeconds = 0) {
  const source = modulation.source;
  if (source === 'none') return 0;
  if (source === 'lfo-sine') return 0.5 + 0.5 * Math.sin(timeSeconds * Math.PI * 2 * modulation.rate);
  if (source === 'lfo-triangle') return 1 - Math.abs(((timeSeconds * modulation.rate) % 1) * 2 - 1);
  if (source === 'lfo-saw') return (timeSeconds * modulation.rate) % 1;
  return clamp(Number(audio[source] || 0), 0, 1);
}

function modulatedLayer(layer, audio, timeSeconds) {
  const value = modulationValue(layer.modulation, audio, timeSeconds);
  const centered = layer.modulation.source.startsWith('lfo-') ? value * 2 - 1 : value;
  const depth = layer.modulation.amount;
  const output = { ...layer };
  let opacity = layer.opacity;
  if (layer.modulation.source !== 'none') {
    if (layer.modulation.target === 'opacity') opacity = clamp(layer.opacity * (1 + centered * depth), 0, 1);
    if (layer.modulation.target === 'brightness') output.brightnessMultiplier = clamp(1 + centered * depth * 1.8, 0, 3);
    if (layer.modulation.target === 'speed') output.speed = clamp(layer.speed * (1 + centered * depth * 2.5), 0.1, 8);
    if (layer.modulation.target === 'scale') output.scale = clamp(layer.scale * (1 + centered * depth * 2.2), 0.1, 12);
    if (layer.modulation.target === 'hue') {
      output.color = rotateHex(layer.color, centered * depth * 180);
      output.secondaryColor = rotateHex(layer.secondaryColor, -centered * depth * 140);
    }
  }
  return { layer: output, opacity };
}

function sample(frame, width, height, x, y, channel) {
  const sx = Math.max(0, Math.min(width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(y)));
  return frame[(sy * width + sx) * 3 + channel] || 0;
}

function transformFrame(frame, width, height, modifier) {
  const output = new Uint8Array(frame.length);
  if (modifier === 'blur' || modifier === 'glow' || modifier === 'edge') {
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) for (let c = 0; c < 3; c += 1) {
      let total = 0, weight = 0;
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const w = ox === 0 && oy === 0 ? 4 : 1;
        total += sample(frame, width, height, x + ox, y + oy, c) * w;
        weight += w;
      }
      const index = (y * width + x) * 3 + c;
      const average = total / weight;
      if (modifier === 'edge') output[index] = clamp(Math.abs((frame[index] || 0) - average) * 3.2, 0, 255);
      else if (modifier === 'glow') output[index] = clamp((frame[index] || 0) + average * 0.45, 0, 255);
      else output[index] = average;
    }
    return output;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let sx = x, sy = y;
    if (modifier === 'mirror-x') sx = x < width / 2 ? x : width - 1 - x;
    if (modifier === 'mirror-y') sy = y < height / 2 ? y : height - 1 - y;
    if (modifier === 'kaleidoscope') {
      const cx = x - (width - 1) / 2, cy = y - (height - 1) / 2;
      const radius = Math.sqrt(cx * cx + cy * cy);
      const segment = Math.PI / 4;
      let angle = Math.atan2(cy, cx);
      angle = Math.abs(((angle + segment / 2) % segment + segment) % segment - segment / 2);
      sx = (width - 1) / 2 + Math.cos(angle) * radius;
      sy = (height - 1) / 2 + Math.sin(angle) * radius;
    }
    if (modifier === 'pixelate') { sx = Math.floor(x / 2) * 2; sy = Math.floor(y / 2) * 2; }
    const index = (y * width + x) * 3;
    let r = sample(frame, width, height, sx, sy, 0), g = sample(frame, width, height, sx, sy, 1), b = sample(frame, width, height, sx, sy, 2);
    if (modifier === 'posterize') { r = Math.round(r / 64) * 64; g = Math.round(g / 64) * 64; b = Math.round(b / 64) * 64; }
    if (modifier === 'threshold') { const v = r * .2126 + g * .7152 + b * .0722 >= 110 ? 255 : 0; r = g = b = v; }
    if (modifier === 'contrast') { r = (r - 128) * 1.45 + 128; g = (g - 128) * 1.45 + 128; b = (b - 128) * 1.45 + 128; }
    if (modifier === 'saturation' || modifier === 'hue-rotate') {
      let [h, s, v] = rgbToHsv([r, g, b]);
      if (modifier === 'saturation') s = clamp(s * 1.55, 0, 1);
      else h = (h + 55) % 360;
      [r, g, b] = parseHexColor(hsvToHex(h, s, v));
    }
    output[index] = clamp(Math.round(r), 0, 255); output[index + 1] = clamp(Math.round(g), 0, 255); output[index + 2] = clamp(Math.round(b), 0, 255);
  }
  return output;
}

function applyModifiers(frame, width, height, modifiers) {
  let output = frame;
  for (const modifier of modifiers || []) output = transformFrame(output, width, height, modifier);
  return output;
}

function fract(value) { return value - Math.floor(value); }
function noise2(x, y) { return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123); }

function maskAlpha(mask, x, y, width, height, audio = {}) {
  if (!mask || mask.type === 'none') return 1;
  const nx = (x + .5) / width, ny = (y + .5) / height;
  const dx0 = nx - mask.x, dy0 = ny - mask.y;
  const angle = -mask.rotation * Math.PI / 180;
  const dx = (dx0 * Math.cos(angle) - dy0 * Math.sin(angle)) * mask.scale;
  const dy = (dx0 * Math.sin(angle) + dy0 * Math.cos(angle)) * mask.scale;
  let value = 1;
  if (mask.type === 'circle') value = clamp(1 - (Math.sqrt(dx * dx + dy * dy) - .24) / mask.softness, 0, 1);
  if (mask.type === 'rectangle') value = clamp(1 - (Math.max(Math.abs(dx), Math.abs(dy)) - .23) / mask.softness, 0, 1);
  if (mask.type === 'linear-gradient') value = clamp(.5 + dx / Math.max(.02, mask.softness), 0, 1);
  if (mask.type === 'radial-gradient') value = clamp(1 - Math.sqrt(dx * dx + dy * dy) / Math.max(.12, .5 * mask.softness + .25), 0, 1);
  if (mask.type === 'stripes') value = Math.sin((dx + .5) * 30) > 0 ? 1 : 0;
  if (mask.type === 'checkerboard') value = (Math.floor((nx * mask.scale) * 8) + Math.floor((ny * mask.scale) * 8)) % 2 === 0 ? 1 : 0;
  if (mask.type === 'noise') value = noise2(Math.floor(nx * width / 2), Math.floor(ny * height / 2));
  if (mask.type === 'audio-spectrum') {
    const spectrum = Array.isArray(audio.spectrum) ? audio.spectrum : [];
    const bin = Math.min(spectrum.length - 1, Math.max(0, Math.floor(nx * spectrum.length)));
    value = ny >= 1 - clamp(Number(spectrum[bin] || audio.level || 0), 0, 1) ? 1 : 0;
  }
  if (mask.invert) value = 1 - value;
  return clamp(1 - mask.strength + value * mask.strength, 0, 1);
}

function blendChannel(base, top, mode) {
  if (mode === 'add') return Math.min(255, base + top);
  if (mode === 'screen') return 255 - (255 - base) * (255 - top) / 255;
  if (mode === 'multiply') return base * top / 255;
  if (mode === 'overlay') return base < 128 ? 2 * base * top / 255 : 255 - 2 * (255 - base) * (255 - top) / 255;
  if (mode === 'lighten' || mode === 'maximum') return Math.max(base, top);
  if (mode === 'darken' || mode === 'minimum') return Math.min(base, top);
  if (mode === 'difference') return Math.abs(base - top);
  if (mode === 'subtract') return Math.max(0, base - top);
  return top;
}

export function blendLayerFrames(baseFrame, topFrame, opacity = 1, mode = 'normal', width = 1, height = 1, mask = null, audio = {}) {
  const base = baseFrame || new Uint8Array(topFrame.length);
  const output = new Uint8Array(topFrame.length);
  for (let pixel = 0; pixel < topFrame.length / 3; pixel += 1) {
    const x = pixel % width, y = Math.floor(pixel / width);
    const topLuma = ((topFrame[pixel * 3] || 0) * .2126 + (topFrame[pixel * 3 + 1] || 0) * .7152 + (topFrame[pixel * 3 + 2] || 0) * .0722) / 255;
    let alpha = clamp(opacity, 0, 1) * maskAlpha(mask, x, y, width, height, audio);
    if (mode === 'luma-mask') alpha *= topLuma;
    for (let channel = 0; channel < 3; channel += 1) {
      const bottom = base[pixel * 3 + channel] || 0;
      const top = topFrame[pixel * 3 + channel] || 0;
      const blended = blendChannel(bottom, top, mode);
      output[pixel * 3 + channel] = clamp(Math.round(bottom * (1 - alpha) + blended * alpha), 0, 255);
    }
  }
  return output;
}

export function renderLayerStack(input = {}) {
  const width = clamp(Math.trunc(Number(input.width) || 16), 1, 512);
  const height = clamp(Math.trunc(Number(input.height) || 16), 1, 512);
  const fallback = {
    pattern: input.pattern || 'solid', color: input.color || '#ffffff', secondaryColor: input.secondaryColor || '#2457ff',
    speed: input.speed ?? 1, scale: input.scale ?? 1, direction: input.direction ?? 1, name: 'Base layer'
  };
  const layers = normalizeLayerStack(input.layers, fallback);
  const soloLayers = layers.filter((layer) => layer.enabled && layer.solo);
  const activeLayers = soloLayers.length ? soloLayers : layers.filter((layer) => layer.enabled);
  let output = new Uint8Array(width * height * 3);
  const timeSeconds = Number(input.timeSeconds || 0);
  for (const layer of activeLayers) {
    const modulated = modulatedLayer(layer, input.audio || {}, timeSeconds);
    const layerFrame = renderVisualFrame({
      ...input,
      width, height,
      pattern: modulated.layer.pattern,
      color: modulated.layer.color,
      secondaryColor: modulated.layer.secondaryColor,
      speed: modulated.layer.speed,
      scale: modulated.layer.scale,
      direction: modulated.layer.direction,
      brightness: clamp(Number(input.brightness ?? 1) * Number(modulated.layer.brightnessMultiplier || 1), 0, 1)
    });
    const processed = applyModifiers(layerFrame, width, height, modulated.layer.modifiers);
    output = blendLayerFrames(output, processed, modulated.opacity, modulated.layer.blendMode, width, height, modulated.layer.mask, input.audio || {});
  }
  return output;
}
