export const VISUAL_PATTERNS = Object.freeze([
  { value: 'solid', label: 'Solid color', group: 'Utility' },
  { value: 'breathe', label: 'Color breathe', group: 'Utility' },
  { value: 'heartbeat', label: 'Heartbeat pulse', group: 'Utility' },
  { value: 'strobe', label: 'Strobe', group: 'Utility' },
  { value: 'blackout', label: 'Blackout', group: 'Utility' },
  { value: 'gradient', label: 'Two-color gradient', group: 'Color' },
  { value: 'color-scroll', label: 'Color scroll', group: 'Color' },
  { value: 'color-wipe', label: 'Color wipe', group: 'Color' },
  { value: 'color-wipe-dual', label: 'Dual color wipe', group: 'Color' },
  { value: 'palette-bands', label: 'Palette bands', group: 'Color' },
  { value: 'rainbow', label: 'Rainbow sweep', group: 'Color' },
  { value: 'rainbow-diagonal', label: 'Diagonal rainbow', group: 'Color' },
  { value: 'rainbow-radial', label: 'Radial rainbow', group: 'Color' },
  { value: 'hue-breathe', label: 'Rainbow breathe', group: 'Color' },
  { value: 'matrix-flow-x', label: 'Global horizontal matrix flow', group: 'Matrix proof' },
  { value: 'matrix-flow-y', label: 'Global vertical matrix flow', group: 'Matrix proof' },
  { value: 'matrix-flow-diagonal', label: 'Global diagonal matrix flow', group: 'Matrix proof' },
  { value: 'matrix-seams', label: 'Panel seam grid proof', group: 'Matrix proof' },
  { value: 'waves', label: 'Flowing waves', group: 'Organic' },
  { value: 'rings', label: 'Expanding rings', group: 'Organic' },
  { value: 'spiral', label: 'Rotating spiral', group: 'Organic' },
  { value: 'plasma', label: 'Plasma', group: 'Organic' },
  { value: 'aurora', label: 'Aurora curtains', group: 'Organic' },
  { value: 'lava', label: 'Lava lamp', group: 'Organic' },
  { value: 'ocean', label: 'Ocean caustics', group: 'Organic' },
  { value: 'fire', label: 'Fire field', group: 'Organic' },
  { value: 'embers', label: 'Rising embers', group: 'Organic' },
  { value: 'smoke', label: 'Drifting smoke', group: 'Organic' },
  { value: 'liquid', label: 'Liquid interference', group: 'Organic' },
  { value: 'ripple-pool', label: 'Ripple pool', group: 'Organic' },
  { value: 'vortex', label: 'Vortex', group: 'Organic' },
  { value: 'warp-tunnel', label: 'Warp tunnel', group: 'Organic' },
  { value: 'bars', label: 'Moving bars', group: 'Geometric' },
  { value: 'diagonal-bars', label: 'Diagonal bars', group: 'Geometric' },
  { value: 'checker', label: 'Checkerboard', group: 'Geometric' },
  { value: 'cells', label: 'Cell field', group: 'Geometric' },
  { value: 'diamonds', label: 'Diamond field', group: 'Geometric' },
  { value: 'pinwheel', label: 'Pinwheel', group: 'Geometric' },
  { value: 'kaleidoscope', label: 'Kaleidoscope', group: 'Geometric' },
  { value: 'zoom-boxes', label: 'Zooming boxes', group: 'Geometric' },
  { value: 'grid-pulse', label: 'Pulsing grid', group: 'Geometric' },
  { value: 'crosshatch', label: 'Crosshatch', group: 'Geometric' },
  { value: 'sine-dots', label: 'Sine dot lattice', group: 'Geometric' },
  { value: 'noise', label: 'Animated noise', group: 'Texture' },
  { value: 'static-noise', label: 'TV static', group: 'Texture' },
  { value: 'sparkle', label: 'Sparkle field', group: 'Texture' },
  { value: 'twinkle', label: 'Soft twinkle', group: 'Texture' },
  { value: 'confetti', label: 'Confetti', group: 'Texture' },
  { value: 'starfield', label: 'Starfield', group: 'Texture' },
  { value: 'rain', label: 'Digital rain', group: 'Texture' },
  { value: 'snow', label: 'Snowfall', group: 'Texture' },
  { value: 'scanner', label: 'Scanner', group: 'Motion' },
  { value: 'scanner-dual', label: 'Dual scanner', group: 'Motion' },
  { value: 'comet-x', label: 'Horizontal comet', group: 'Motion' },
  { value: 'comet-y', label: 'Vertical comet', group: 'Motion' },
  { value: 'theater-chase', label: 'Theater chase', group: 'Motion' },
  { value: 'bouncing-dot', label: 'Bouncing dot', group: 'Motion' },
  { value: 'bouncing-bars', label: 'Bouncing bars', group: 'Motion' },
  { value: 'metaballs', label: 'Metaballs', group: 'Organic' },
  { value: 'nebula-clouds', label: 'Nebula clouds', group: 'Organic' },
  { value: 'bio-cells', label: 'Bioluminescent cells', group: 'Organic' },
  { value: 'oil-slick', label: 'Oil slick', group: 'Organic' },
  { value: 'flame-tunnel', label: 'Flame tunnel', group: 'Organic' },
  { value: 'water-ribbons', label: 'Water ribbons', group: 'Organic' },
  { value: 'moire', label: 'Moiré interference', group: 'Geometric' },
  { value: 'flowing-gradient', label: 'Flowing gradient', group: 'Color' },
  { value: 'prism-wave', label: 'Prism wave', group: 'Color' },
  { value: 'chroma-stripes', label: 'Chroma stripes', group: 'Color' },
  { value: 'sunset-cycle', label: 'Sunset cycle', group: 'Color' },
  { value: 'radar', label: 'Radar sweep', group: 'Motion' },
  { value: 'orbiters', label: 'Orbiting particles', group: 'Motion' },
  { value: 'lightning', label: 'Lightning field', group: 'Texture' },
  { value: 'glitch', label: 'Digital glitch', group: 'Texture' },
  { value: 'laser-speckle', label: 'Laser speckle', group: 'Texture' },
  { value: 'data-mosaic', label: 'Data mosaic', group: 'Texture' },
  { value: 'pixel-sort', label: 'Pixel sort bands', group: 'Geometric' },
  { value: 'mandala', label: 'Animated mandala', group: 'Geometric' },
  { value: 'honeycomb-pulse', label: 'Honeycomb pulse', group: 'Geometric' },
  { value: 'rotating-tiles', label: 'Rotating tiles', group: 'Geometric' },
  { value: 'fractal-cross', label: 'Fractal cross', group: 'Geometric' },
  { value: 'tunnel-checker', label: 'Checker tunnel', group: 'Geometric' },
  { value: 'cathedral-rose', label: 'Cathedral rose', group: 'Geometric' },
  { value: 'hex-tunnel', label: 'Hexagon tunnel', group: 'Layers · new' },
  { value: 'triangle-tunnel', label: 'Triangle tunnel', group: 'Layers · new' },
  { value: 'polygon-orbit', label: 'Polygon orbit', group: 'Layers · new' },
  { value: 'geometric-lattice', label: 'Geometric lattice', group: 'Layers · new' },
  { value: 'isometric-cubes', label: 'Isometric cubes', group: 'Layers · new' },
  { value: 'concentric-diamonds', label: 'Concentric diamonds', group: 'Layers · new' },
  { value: 'radial-spokes', label: 'Radial spokes', group: 'Layers · new' },
  { value: 'perspective-grid', label: 'Perspective grid', group: 'Layers · new' },
  { value: 'gothic-window', label: 'Gothic window', group: 'Layers · new' },
  { value: 'flow-field', label: 'Flow field', group: 'Layers · new' },
  { value: 'reaction-diffusion', label: 'Reaction diffusion', group: 'Layers · new' },
  { value: 'electric-arcs', label: 'Electric arcs', group: 'Layers · new' },
  { value: 'aurora-ribbons', label: 'Aurora ribbons', group: 'Layers · new' },
  { value: 'particle-fountain', label: 'Particle fountain', group: 'Layers · new' },
  { value: 'comet-vortex', label: 'Comet vortex', group: 'Layers · new' },
  { value: 'audio-vu-bars', label: 'VU bars', group: 'Audio reactive' },
  { value: 'audio-spectrum', label: 'Spectrum analyzer', group: 'Audio reactive' },
  { value: 'audio-spectrum-mirror', label: 'Mirrored spectrum', group: 'Audio reactive' },
  { value: 'audio-spectrum-radial', label: 'Radial spectrum', group: 'Audio reactive' },
  { value: 'audio-eq-grid', label: 'EQ grid', group: 'Audio reactive' },
  { value: 'audio-oscilloscope', label: 'Oscilloscope', group: 'Audio reactive' },
  { value: 'audio-waveform-fill', label: 'Waveform fill', group: 'Audio reactive' },
  { value: 'audio-level-meter', label: 'Level meter', group: 'Audio reactive' },
  { value: 'audio-bass-pulse', label: 'Bass pulse', group: 'Audio reactive' },
  { value: 'audio-beat-rings', label: 'Beat rings', group: 'Audio reactive' },
  { value: 'audio-kick-flash', label: 'Kick flash', group: 'Audio reactive' },
  { value: 'audio-beat-grid', label: 'Beat grid', group: 'Audio reactive' },
  { value: 'audio-beat-strobe', label: 'Beat strobe', group: 'Audio reactive' },
  { value: 'audio-heart', label: 'Audio heartbeat', group: 'Audio reactive' },
  { value: 'audio-plasma', label: 'Audio plasma', group: 'Audio reactive' },
  { value: 'audio-waves', label: 'Audio waves', group: 'Audio reactive' },
  { value: 'audio-fire', label: 'Audio fire', group: 'Audio reactive' },
  { value: 'audio-ripple', label: 'Audio ripple', group: 'Audio reactive' },
  { value: 'audio-aurora', label: 'Audio aurora', group: 'Audio reactive' },
  { value: 'audio-vortex', label: 'Audio vortex', group: 'Audio reactive' },
  { value: 'audio-comet', label: 'Audio comet', group: 'Audio reactive' },
  { value: 'audio-scanner', label: 'Audio scanner', group: 'Audio reactive' },
  { value: 'audio-starburst', label: 'Audio starburst', group: 'Audio reactive' },
  { value: 'audio-particles', label: 'Audio particles', group: 'Audio reactive' },
  { value: 'audio-rain', label: 'Audio rain', group: 'Audio reactive' },
  { value: 'audio-tunnel', label: 'Audio tunnel', group: 'Audio reactive' },
  { value: 'audio-rainbow', label: 'Audio rainbow', group: 'Audio reactive' },
  { value: 'audio-kaleidoscope', label: 'Audio kaleidoscope', group: 'Audio reactive' },
  { value: 'audio-color-bands', label: 'Audio color bands', group: 'Audio reactive' },
  { value: 'audio-palette-pulse', label: 'Audio palette pulse', group: 'Audio reactive' },
  { value: 'audio-laser-fan', label: 'Audio laser fan', group: 'Audio reactive' },
  { value: 'audio-nebula', label: 'Audio nebula', group: 'Audio reactive' },
  { value: 'audio-shockwave-grid', label: 'Audio shockwave grid', group: 'Audio reactive' },
  { value: 'audio-dna-helix', label: 'Audio DNA helix', group: 'Audio reactive' },
  { value: 'audio-particle-ring', label: 'Audio particle ring', group: 'Audio reactive' },
  { value: 'chase', label: 'Single-pixel chase', group: 'Test' },
  { value: 'columns', label: 'Column scan', group: 'Test' },
  { value: 'rows', label: 'Row scan', group: 'Test' }
]);

export const MATRIX_FRIENDLY_PATTERNS = Object.freeze([
  'solid','breathe','heartbeat','gradient','color-scroll','flowing-gradient','prism-wave','chroma-stripes','sunset-cycle','color-wipe','color-wipe-dual','palette-bands',
  'rainbow','rainbow-diagonal','rainbow-radial','hue-breathe','matrix-flow-x','matrix-flow-y','matrix-flow-diagonal','matrix-seams',
  'waves','rings','spiral','plasma','aurora','lava','ocean','fire','smoke','liquid','ripple-pool','vortex','warp-tunnel','metaballs','nebula-clouds','bio-cells','oil-slick','flame-tunnel','water-ribbons',
  'bars','diagonal-bars','checker','diamonds','pinwheel','zoom-boxes','grid-pulse','scanner','scanner-dual','comet-x','comet-y',
  'theater-chase','bouncing-dot','bouncing-bars','radar','honeycomb-pulse','rotating-tiles','fractal-cross','tunnel-checker','cathedral-rose','hex-tunnel','triangle-tunnel','polygon-orbit','geometric-lattice','isometric-cubes','concentric-diamonds','radial-spokes','perspective-grid','gothic-window','flow-field','reaction-diffusion','electric-arcs','aurora-ribbons','particle-fountain','comet-vortex','audio-vu-bars','audio-spectrum','audio-spectrum-mirror','audio-eq-grid',
  'audio-oscilloscope','audio-waveform-fill','audio-level-meter','audio-bass-pulse','audio-beat-rings','audio-kick-flash','audio-beat-grid',
  'audio-heart','audio-waves','audio-ripple','audio-aurora','audio-comet','audio-scanner','audio-starburst','audio-rainbow',
  'audio-color-bands','audio-palette-pulse','audio-laser-fan','audio-nebula','audio-shockwave-grid','audio-dna-helix','audio-particle-ring','chase','columns','rows'
]);

const MATRIX_FRIENDLY_SET = new Set(MATRIX_FRIENDLY_PATTERNS);
const MATRIX_SMOOTH_PATTERNS = new Set(['noise','static-noise','sparkle','confetti','starfield','rain','snow','lightning','glitch','laser-speckle','data-mosaic','moire','pixel-sort','cells','kaleidoscope','audio-particles','audio-rain']);

export function isMatrixFriendlyPattern(pattern) {
  return MATRIX_FRIENDLY_SET.has(String(pattern || ''));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function parseHexColor(hex, fallback = [255, 255, 255]) {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return [...fallback];
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
}

export function hsvToRgb(h, s = 1, v = 1) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const saturation = clamp(Number(s), 0, 1);
  const value = clamp(Number(v), 0, 1);
  const c = value * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - c;
  let rgb;
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((channel) => Math.round((channel + m) * 255));
}


function rgbToHsv(rgb) {
  const [r, g, b] = rgb.map((value) => clamp(Number(value) / 255, 0, 1));
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return [hue, max === 0 ? 0 : delta / max, max];
}

function shiftHue(rgb, degrees) {
  if (!degrees) return rgb;
  const [h, s, v] = rgbToHsv(rgb);
  return hsvToRgb(h + degrees, s, v);
}

function normalizedArray(values, length, { signed = false } = {}) {
  const source = Array.isArray(values) || ArrayBuffer.isView(values) ? Array.from(values) : [];
  return Array.from({ length }, (_, index) => {
    const sourceIndex = source.length <= 1 ? 0 : Math.min(source.length - 1, Math.floor(index * source.length / length));
    const value = Number(source[sourceIndex] ?? 0);
    return signed ? clamp(value, -1, 1) : clamp(value, 0, 1);
  });
}

function normalizeAudioData(input = {}) {
  input = input && typeof input === 'object' ? input : {};
  return {
    level: clamp(Number(input.level) || 0, 0, 1),
    peak: clamp(Number(input.peak) || 0, 0, 1),
    sub: clamp(Number(input.sub) || 0, 0, 1),
    bass: clamp(Number(input.bass) || 0, 0, 1),
    lowMid: clamp(Number(input.lowMid) || 0, 0, 1),
    mid: clamp(Number(input.mid) || 0, 0, 1),
    highMid: clamp(Number(input.highMid) || 0, 0, 1),
    treble: clamp(Number(input.treble) || 0, 0, 1),
    beat: clamp(Number(input.beat) || 0, 0, 1),
    kick: clamp(Number(input.kick) || 0, 0, 1),
    snare: clamp(Number(input.snare) || 0, 0, 1),
    hihat: clamp(Number(input.hihat) || 0, 0, 1),
    flux: clamp(Number(input.flux) || 0, 0, 1),
    spectrum: normalizedArray(input.spectrum, 32),
    waveform: normalizedArray(input.waveform, 64, { signed: true })
  };
}

function spectrumAt(spectrum, position) {
  if (!spectrum?.length) return 0;
  const index = clamp(Math.floor(clamp(position, 0, 0.999999) * spectrum.length), 0, spectrum.length - 1);
  return Number(spectrum[index]) || 0;
}

function mixRgb(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return [0, 1, 2].map((index) => Math.round(a[index] + (b[index] - a[index]) * t));
}

function multiplyRgb(rgb, amount) {
  const factor = Math.max(0, Number(amount) || 0);
  return rgb.map((channel) => clamp(Math.round(channel * factor), 0, 255));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(value) {
  return value - Math.floor(value);
}

function hash2(x, y, seed = 0) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
}

function valueNoise(x, y, seed = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fract(x);
  const fy = fract(y);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

function normalizedConfig(config = {}) {
  const width = clamp(Math.trunc(Number(config.width) || 16), 1, 512);
  const height = clamp(Math.trunc(Number(config.height) || 16), 1, 512);
  const baseBrightness = clamp(Number(config.brightness ?? 0.35), 0, 1);
  const baseSpeed = clamp(Number(config.speed ?? 1), 0.1, 8);
  const baseScale = clamp(Number(config.scale ?? 1), 0.1, 12);
  const rawPattern = String(config.pattern || 'solid');
  const clarityBypass = rawPattern.startsWith('matrix-') || ['chase','slow-chase','manual-pixel','columns','rows','blackout'].includes(rawPattern);
  const matrixClarity = ['auto', 'optimized', 'full'].includes(String(config.matrixClarity || 'auto')) ? String(config.matrixClarity || 'auto') : 'auto';
  const minDimension = Math.max(1, Math.min(width, height));
  const matrixOptimized = !clarityBypass && (matrixClarity === 'optimized' || (matrixClarity === 'auto' && (minDimension <= 8 || width * height <= 128)));
  const matrixElementSize = clamp(Number(config.matrixElementSize ?? 1.55), 0.75, 3);
  const resolutionDetail = matrixOptimized ? clamp(minDimension / 8, 0.34, 1) : 1;
  const matrixDetailFactor = matrixOptimized ? resolutionDetail / matrixElementSize : 1;
  const matrixMotionFactor = matrixOptimized ? clamp(0.72 + minDimension / 40, 0.72, 0.92) : 1;
  const direction = Number(config.direction) < 0 ? -1 : 1;
  const tick = Number(config.tick) || 0;
  const timeSeconds = Number.isFinite(Number(config.timeSeconds))
    ? Number(config.timeSeconds)
    : tick / 20;
  const pattern = rawPattern;
  const audioEnabled = config.audioEnabled === true;
  const rawAudio = normalizeAudioData(config.audio);
  const audioSensitivity = clamp(Number(config.audioSensitivity ?? 3.5), 0.1, 12);
  const audioMaster = clamp(Number(config.audioMaster ?? 2), 0, 6);
  const audioBassBoost = clamp(Number(config.audioBassBoost ?? 1.75), 0.1, 6);
  const audioBeatBoost = clamp(Number(config.audioBeatBoost ?? 2), 0.1, 8);
  const audioProfile = String(config.audioProfile || 'punchy');
  const audioGate = clamp(Number(config.audioGate ?? 0.002), 0, 0.9);
  const profileCurve = audioProfile === 'extreme' ? 0.42 : audioProfile === 'punchy' ? 0.58 : audioProfile === 'smooth' ? 0.9 : 0.72;
  const profileMultiplier = audioProfile === 'extreme' ? 1.5 : audioProfile === 'punchy' ? 1.18 : audioProfile === 'smooth' ? 0.82 : 1;
  const processAudio = (value, boost = 1) => {
    if (value <= audioGate) return 0;
    const normalized = ((value - audioGate) / Math.max(0.001, 1 - audioGate)) * audioSensitivity * boost * profileMultiplier;
    return clamp(Math.pow(Math.max(0, normalized), profileCurve), 0, 1);
  };
  const rawSignal = Math.max(rawAudio.level, rawAudio.peak, rawAudio.bass, rawAudio.mid, rawAudio.treble, rawAudio.beat, ...rawAudio.spectrum);
  const audioPattern = pattern.startsWith('audio-');
  const useIdleAudio = audioPattern && rawSignal < 0.002;
  const idlePulse = 0.16 + 0.05 * (0.5 + 0.5 * Math.sin(timeSeconds * 1.7));
  const idleBeat = Math.exp(-fract(timeSeconds * 1.35) * 11) * 0.22;
  const idleHat = Math.exp(-fract(timeSeconds * 5.4) * 17) * 0.12;
  const audio = useIdleAudio ? {
    level: idlePulse,
    peak: idlePulse + 0.04,
    sub: 0.10 + 0.03 * (0.5 + 0.5 * Math.sin(timeSeconds * 0.93)),
    bass: 0.12 + 0.04 * (0.5 + 0.5 * Math.sin(timeSeconds * 1.15)),
    lowMid: 0.10 + 0.035 * (0.5 + 0.5 * Math.sin(timeSeconds * 1.38 + 0.6)),
    mid: 0.10 + 0.035 * (0.5 + 0.5 * Math.sin(timeSeconds * 1.63 + 1.2)),
    highMid: 0.09 + 0.03 * (0.5 + 0.5 * Math.sin(timeSeconds * 1.84 + 1.8)),
    treble: 0.08 + 0.03 * (0.5 + 0.5 * Math.sin(timeSeconds * 2.05 + 2.4)),
    beat: idleBeat, kick: idleBeat, snare: idleBeat * 0.55, hihat: idleHat, flux: 0.04 + idleBeat * 0.18,
    spectrum: Array.from({ length: 32 }, (_, index) => 0.06 + 0.12 * Math.pow(0.5 + 0.5 * Math.sin(index * 0.62 + timeSeconds * 1.9), 2)),
    waveform: Array.from({ length: 64 }, (_, index) => Math.sin(index / 64 * Math.PI * 4 + timeSeconds * 1.4) * 0.12)
  } : {
    level: processAudio(rawAudio.level),
    peak: processAudio(rawAudio.peak),
    sub: processAudio(rawAudio.sub, audioBassBoost * 1.1),
    bass: processAudio(rawAudio.bass, audioBassBoost),
    lowMid: processAudio(rawAudio.lowMid),
    mid: processAudio(rawAudio.mid),
    highMid: processAudio(rawAudio.highMid),
    treble: processAudio(rawAudio.treble),
    beat: clamp(rawAudio.beat * audioSensitivity * audioBeatBoost * profileMultiplier, 0, 1),
    kick: clamp(rawAudio.kick * audioSensitivity * audioBeatBoost * profileMultiplier, 0, 1),
    snare: clamp(rawAudio.snare * audioSensitivity * audioBeatBoost * profileMultiplier, 0, 1),
    hihat: clamp(rawAudio.hihat * audioSensitivity * audioBeatBoost * profileMultiplier, 0, 1),
    flux: processAudio(rawAudio.flux),
    spectrum: rawAudio.spectrum.map((value, index) => processAudio(value, index < 9 ? audioBassBoost : 1)),
    waveform: rawAudio.waveform
  };
  const audioResponse = String(config.audioResponse || 'overall');
  const selectedAudio = audioResponse === 'sub' ? audio.sub
    : audioResponse === 'bass' ? audio.bass
      : audioResponse === 'mid' ? audio.mid
        : audioResponse === 'treble' ? audio.treble
          : audioResponse === 'beat' ? audio.beat
            : audioResponse === 'kick' ? audio.kick
              : audioResponse === 'snare' ? audio.snare
                : audioResponse === 'hihat' ? audio.hihat
                  : audio.level;
  const audioEnergy = audioEnabled ? clamp(selectedAudio * audioMaster, 0, 1) : 0;
  const beatEnergy = audioEnabled ? clamp(audio.beat * audioMaster, 0, 1) : 0;
  const kickEnergy = audioEnabled ? clamp(audio.kick * audioMaster, 0, 1) : 0;
  const snareEnergy = audioEnabled ? clamp(audio.snare * audioMaster, 0, 1) : 0;
  const hatEnergy = audioEnabled ? clamp(audio.hihat * audioMaster, 0, 1) : 0;
  const transientEnergy = Math.max(kickEnergy, snareEnergy, hatEnergy, beatEnergy);
  const audioMotion = clamp(Number(config.audioMotion ?? 1), 0, 6);
  const audioBrightness = clamp(Number(config.audioBrightness ?? 0.8), 0, 4);
  const audioScale = clamp(Number(config.audioScale ?? 0.45), 0, 4);
  const audioColor = clamp(Number(config.audioColor ?? 0.55), 0, 4);
  // The animation clock is intentionally independent of live-audio update cadence.
  // Browser requestAnimationFrame is throttled when a tab is hidden; allowing audio
  // snapshots to multiply speed or jump phase made the physical LEDs change pace
  // whenever the browser gained or lost focus. Audio still drives shape, scale,
  // brightness, color, and dedicated reactive pattern structure below.
  const speed = clamp(baseSpeed * matrixMotionFactor, 0, 12);
  const scale = clamp(baseScale * matrixDetailFactor * (1 + audioEnergy * audioScale), 0.08, 24);
  const brightness = clamp(baseBrightness * (1 + audioEnergy * audioBrightness + transientEnergy * audioBrightness * 0.62), 0, 1);
  const phase = timeSeconds * speed * direction;
  const hueShift = audioEnabled ? audioColor * (audioEnergy * 105 + kickEnergy * 55 + snareEnergy * 85 + hatEnergy * 115) : 0;
  return {
    width,
    height,
    pixels: width * height,
    brightness,
    baseBrightness,
    speed,
    baseSpeed,
    scale,
    baseScale,
    direction,
    tick,
    timeSeconds,
    phase,
    pattern,
    primary: shiftHue(parseHexColor(config.color || '#ffffff'), hueShift),
    secondary: shiftHue(parseHexColor(config.secondaryColor || '#2457ff', [36, 87, 255]), -hueShift * 0.55),
    pixelIndex: clamp(Math.trunc(Number(config.pixelIndex) || 0), 0, width * height - 1),
    pixelOn: config.pixelOn !== false,
    panelWidth: clamp(Math.trunc(Number(config.panelWidth) || width), 1, width),
    panelHeight: clamp(Math.trunc(Number(config.panelHeight) || height), 1, height),
    panelRects: Array.isArray(config.panelRects) ? config.panelRects.map((rect) => ({
      x: Math.max(0, Math.trunc(Number(rect.x) || 0)),
      y: Math.max(0, Math.trunc(Number(rect.y) || 0)),
      width: Math.max(1, Math.trunc(Number(rect.width) || 1)),
      height: Math.max(1, Math.trunc(Number(rect.height) || 1))
    })) : [],
    audioEnabled,
    audio,
    audioEnergy,
    beatEnergy,
    kickEnergy,
    snareEnergy,
    hatEnergy,
    transientEnergy,
    audioResponse,
    audioMaster,
    audioBassBoost,
    audioBeatBoost,
    audioProfile,
    audioMotion,
    audioBrightness,
    audioScale,
    audioColor,
    matrixClarity,
    matrixOptimized,
    matrixElementSize,
    matrixDetailFactor,
    minDimension,
    audioSignalPresent: !useIdleAudio
  };
}

function colorForPixel(x, y, index, config) {
  const {
    width, height, brightness, scale, phase, pattern, primary, secondary,
    pixelIndex, pixelOn, timeSeconds, speed, direction, panelWidth, panelHeight, panelRects,
    audio, audioEnergy, beatEnergy, kickEnergy, snareEnergy, hatEnergy, transientEnergy, matrixOptimized
  } = config;
  const nx = width <= 1 ? 0.5 : (x + 0.5) / width;
  const ny = height <= 1 ? 0.5 : (y + 0.5) / height;
  const cx = (x + 0.5 - width / 2) / Math.max(width, height);
  const cy = (y + 0.5 - height / 2) / Math.max(width, height);
  const radius = Math.sqrt(cx * cx + cy * cy);
  const angle = Math.atan2(cy, cx);
  const step = Math.floor(timeSeconds * Math.max(0.05, speed) * 8 * direction);
  let rgb = primary;

  switch (pattern) {
    case 'blackout':
      return [0, 0, 0];
    case 'checker': {
      const cell = Math.max(1, Math.round(3 / Math.max(0.25, scale)));
      const active = (Math.floor(x / cell) + Math.floor(y / cell) + Math.floor(phase * 2)) % 2 === 0;
      rgb = active ? primary : secondary;
      break;
    }
    case 'chase': {
      const active = ((step % config.pixels) + config.pixels) % config.pixels;
      rgb = pixelOn && index === active ? primary : [0, 0, 0];
      break;
    }
    case 'slow-chase': {
      const active = ((Math.trunc(config.tick) % config.pixels) + config.pixels) % config.pixels;
      rgb = pixelOn && index === active ? primary : [0, 0, 0];
      break;
    }
    case 'manual-pixel':
      rgb = pixelOn && index === pixelIndex ? primary : [0, 0, 0];
      break;
    case 'columns': {
      const active = ((step % width) + width) % width;
      rgb = x === active ? primary : [0, 0, 0];
      break;
    }
    case 'rows': {
      const active = ((step % height) + height) % height;
      rgb = y === active ? primary : [0, 0, 0];
      break;
    }
    case 'gradient': {
      const amount = clamp(nx * 0.72 + ny * 0.28, 0, 1);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'color-scroll': {
      const amount = 0.5 + 0.5 * Math.sin((nx * 2.2 + ny * 0.6) * Math.PI * scale - phase * 2.2);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'rainbow': {
      // v0.4.28: an unmistakable position-based sweep. At 1× the rainbow
      // travels about 6.7 logical columns per second on a 16-column matrix,
      // so movement is visible frame-to-frame instead of looking like a static
      // gradient with a slowly changing hue. Speed and direction directly
      // control travel while scale controls the number of color bands.
      const bandScale = clamp(scale, 0.35, 6);
      const sweepOffset = phase * 0.42;
      const travel = fract(nx * bandScale + ny * 0.12 - sweepOffset);
      const crestPosition = fract(sweepOffset * 0.73);
      const rawCrestDistance = Math.abs(fract(nx + ny * 0.08) - crestPosition);
      const crestDistance = Math.min(rawCrestDistance, 1 - rawCrestDistance);
      const crest = 1 - smoothstep(0.015, 0.18, crestDistance);
      const value = clamp(brightness * (0.58 + crest * 0.42), 0, 1);
      return hsvToRgb(travel * 360, 1, value);
    }
    case 'matrix-flow-x':
    case 'matrix-flow-y':
    case 'matrix-flow-diagonal': {
      const position = fract(phase * 0.22);
      const coordinate = pattern === 'matrix-flow-x'
        ? nx
        : pattern === 'matrix-flow-y'
          ? ny
          : fract((nx + ny) * 0.5);
      const rawDistance = Math.abs(coordinate - position);
      const distance = Math.min(rawDistance, 1 - rawDistance);
      const pixelSpan = pattern === 'matrix-flow-x'
        ? 1 / Math.max(1, width)
        : pattern === 'matrix-flow-y'
          ? 1 / Math.max(1, height)
          : 1 / Math.max(1, Math.max(width, height));
      const bandWidth = Math.max(pixelSpan * 1.35, 0.025) * Math.max(0.45, Math.min(2.5, scale));
      const head = 1 - smoothstep(bandWidth * 0.25, bandWidth, distance);
      const trailDistance = fract(coordinate - position + 1);
      const trail = Math.exp(-trailDistance * 12 / Math.max(0.35, scale));
      const amount = clamp(Math.max(head, trail * 0.42), 0, 1);
      rgb = mixRgb(secondary, primary, amount);
      break;
    }
    case 'matrix-seams': {
      let seam = false;
      if (panelRects.length) {
        seam = panelRects.some((rect) => {
          const inside = x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
          if (!inside) return false;
          return x === rect.x || x === rect.x + rect.width - 1 || y === rect.y || y === rect.y + rect.height - 1;
        });
      } else {
        const verticalSeam = x === 0 || x === width - 1 || (panelWidth < width && (x % panelWidth === 0 || x % panelWidth === panelWidth - 1));
        const horizontalSeam = y === 0 || y === height - 1 || (panelHeight < height && (y % panelHeight === 0 || y % panelHeight === panelHeight - 1));
        seam = verticalSeam || horizontalSeam;
      }
      const pulse = 0.55 + 0.45 * Math.sin(phase * 3);
      rgb = seam ? mixRgb(secondary, primary, pulse) : multiplyRgb(secondary, 0.08);
      break;
    }
    case 'waves': {
      const waveA = Math.sin((nx * 8 + ny * 2.5) * scale + phase * 3);
      const waveB = Math.sin((ny * 7 - nx * 1.8) * scale - phase * 2.1);
      const amount = clamp(0.5 + 0.25 * waveA + 0.25 * waveB, 0, 1);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'rings': {
      const ring = 0.5 + 0.5 * Math.sin(radius * 30 * scale - phase * 5);
      rgb = mixRgb(primary, secondary, ring);
      break;
    }
    case 'spiral': {
      const spiral = angle * 2.2 + radius * 28 * scale - phase * 4;
      const amount = 0.5 + 0.5 * Math.sin(spiral);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'plasma': {
      const px = nx * 7 * scale;
      const py = ny * 7 * scale;
      const value = (
        Math.sin(px + phase * 2.1) +
        Math.sin(py - phase * 1.7) +
        Math.sin((px + py) * 0.72 + phase * 1.2) +
        Math.sin(Math.sqrt(px * px + py * py) * 1.3 - phase * 2.6)
      ) / 4;
      const hue = 190 + value * 145 + phase * 26;
      return hsvToRgb(hue, 0.92, brightness * (0.7 + Math.abs(value) * 0.3));
    }
    case 'bars': {
      const coordinate = nx * Math.max(2, 8 * scale) - phase * 2.5;
      const band = fract(coordinate);
      const amount = smoothstep(0.04, 0.28, band) * (1 - smoothstep(0.72, 0.96, band));
      rgb = mixRgb(secondary, primary, amount);
      break;
    }
    case 'cells': {
      const gridScale = Math.max(2, 5 * scale);
      const gx = nx * gridScale;
      const gy = ny * gridScale;
      const cellX = Math.floor(gx);
      const cellY = Math.floor(gy);
      let nearest = 10;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const phaseX = hash2(cellX + ox, cellY + oy, 11) * Math.PI * 2;
          const phaseY = hash2(cellX + ox, cellY + oy, 29) * Math.PI * 2;
          const px = cellX + ox + 0.5 + Math.sin(phaseX + phase * 0.6) * 0.38;
          const py = cellY + oy + 0.5 + Math.cos(phaseY - phase * 0.52) * 0.38;
          nearest = Math.min(nearest, Math.hypot(gx - px, gy - py));
        }
      }
      const edge = 1 - smoothstep(0.08, 0.52, nearest);
      rgb = mixRgb(secondary, primary, edge);
      break;
    }
    case 'noise': {
      const density = matrixOptimized ? 4.2 : 9;
      const value = valueNoise(nx * density * scale + phase * 0.55, ny * density * scale - phase * 0.42, matrixOptimized ? 2 : 4);
      rgb = mixRgb(primary, secondary, value);
      break;
    }
    case 'sparkle': {
      const frameSeed = Math.floor(timeSeconds * Math.max(0.7, speed * (matrixOptimized ? 3.5 : 12)));
      const blockX = matrixOptimized ? Math.floor(x / 2) : x;
      const random = hash2(blockX, y, frameSeed);
      const threshold = matrixOptimized ? 0.82 : 0.91;
      const glow = random > threshold ? Math.pow((random - threshold) / (1 - threshold), 0.45) : 0;
      rgb = glow > 0 ? mixRgb(secondary, primary, glow) : multiplyRgb(secondary, 0.04);
      break;
    }
    case 'breathe': {
      const pulse = 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(phase * 2.4));
      rgb = mixRgb(multiplyRgb(secondary, 0.08), primary, pulse);
      break;
    }
    case 'heartbeat': {
      const beatPhase = fract(Math.abs(phase) * 0.62);
      const first = Math.exp(-Math.pow((beatPhase - 0.12) / 0.045, 2));
      const second = 0.72 * Math.exp(-Math.pow((beatPhase - 0.25) / 0.06, 2));
      const glow = clamp(0.06 + first + second, 0, 1);
      rgb = mixRgb(multiplyRgb(secondary, 0.06), primary, glow);
      break;
    }
    case 'strobe': {
      const on = Math.floor(Math.abs(phase) * 8) % 2 === 0;
      rgb = on ? primary : [0, 0, 0];
      break;
    }
    case 'color-wipe': {
      const head = fract(phase * 0.24);
      const distance = fract(nx - head + 1);
      const amount = 1 - smoothstep(0.0, Math.max(0.025, 0.18 / scale), distance);
      rgb = mixRgb(secondary, primary, amount);
      break;
    }
    case 'color-wipe-dual': {
      const head = fract(phase * 0.18);
      const forward = 1 - smoothstep(0, Math.max(0.03, 0.16 / scale), fract(nx - head + 1));
      const backward = 1 - smoothstep(0, Math.max(0.03, 0.16 / scale), fract((1 - nx) - head + 1));
      rgb = mixRgb(secondary, primary, Math.max(forward, backward));
      break;
    }
    case 'palette-bands': {
      const band = fract((nx * 4.2 + ny * 1.4) * scale - phase * 0.9);
      const amount = 0.5 + 0.5 * Math.sin(band * Math.PI * 2);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'rainbow-diagonal': {
      const hue = (nx + ny) * 220 * scale + phase * 80;
      return hsvToRgb(hue, 1, brightness);
    }
    case 'rainbow-radial': {
      const hue = radius * 720 * scale - phase * 95 + angle * 24;
      return hsvToRgb(hue, 1, brightness);
    }
    case 'hue-breathe': {
      const value = brightness * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(phase * 2)));
      return hsvToRgb(phase * 55 + nx * 40 + ny * 20, 1, value);
    }
    case 'aurora': {
      const curtainA = Math.sin(nx * 10 * scale + phase * 1.4 + Math.sin(ny * 6 - phase));
      const curtainB = Math.sin(nx * 17 * scale - phase * 0.9 + ny * 4.5);
      const verticalFade = Math.pow(1 - ny, 0.45);
      const amount = clamp((curtainA + curtainB + 2) * 0.25 * verticalFade, 0, 1);
      rgb = mixRgb(multiplyRgb(secondary, 0.12), primary, amount);
      break;
    }
    case 'lava': {
      const n1 = valueNoise(nx * 4.8 * scale + phase * 0.34, ny * 4.8 * scale - phase * 0.18, 7);
      const n2 = valueNoise(nx * 9.5 * scale - phase * 0.22, ny * 9.5 * scale + phase * 0.27, 17);
      const blob = smoothstep(0.38, 0.78, n1 * 0.7 + n2 * 0.3);
      rgb = mixRgb(multiplyRgb(secondary, 0.18), primary, blob);
      break;
    }
    case 'ocean': {
      const caustic = Math.sin((nx * 13 + Math.sin(ny * 9 + phase)) * scale + phase * 1.6)
        + Math.sin((ny * 15 - Math.cos(nx * 8 - phase)) * scale - phase * 1.15);
      const amount = clamp(0.42 + caustic * 0.22, 0, 1);
      rgb = mixRgb(multiplyRgb(secondary, 0.35), primary, amount);
      break;
    }
    case 'fire': {
      const rise = valueNoise(nx * 7 * scale + Math.sin(phase) * 0.3, (1 - ny) * 8 * scale + phase * 1.8, 21);
      const lick = Math.sin(nx * 18 * scale + phase * 4 + ny * 7) * 0.12;
      const heat = clamp((1 - ny) * 1.35 + rise * 0.55 + lick - 0.35, 0, 1);
      const hot = mixRgb(secondary, primary, smoothstep(0.25, 0.8, heat));
      rgb = multiplyRgb(hot, smoothstep(0.03, 0.62, heat));
      break;
    }
    case 'embers': {
      const travel = fract(ny + phase * 0.18 + hash2(x, 0, 8));
      const lane = hash2(x, Math.floor(phase * 0.35), 19);
      const spark = lane > 0.72 ? Math.exp(-travel * 16) : 0;
      rgb = spark > 0.02 ? mixRgb(secondary, primary, spark) : multiplyRgb(secondary, 0.025);
      break;
    }
    case 'smoke': {
      const drift = valueNoise(nx * 5.2 * scale + phase * 0.18, ny * 5.2 * scale - phase * 0.13, 31);
      const detail = valueNoise(nx * 12 * scale - phase * 0.1, ny * 12 * scale + phase * 0.08, 43);
      const amount = smoothstep(0.22, 0.82, drift * 0.72 + detail * 0.28);
      rgb = mixRgb(multiplyRgb(secondary, 0.08), primary, amount * 0.72);
      break;
    }
    case 'liquid': {
      const field = Math.sin((nx * 9 + Math.sin(ny * 7 + phase)) * scale + phase)
        * Math.cos((ny * 10 + Math.cos(nx * 6 - phase)) * scale - phase * 1.3);
      rgb = mixRgb(primary, secondary, 0.5 + field * 0.5);
      break;
    }
    case 'ripple-pool': {
      const sourceA = Math.hypot(nx - 0.3 - Math.sin(phase * 0.4) * 0.12, ny - 0.42);
      const sourceB = Math.hypot(nx - 0.72, ny - 0.62 - Math.cos(phase * 0.33) * 0.1);
      const ripple = Math.sin(sourceA * 42 * scale - phase * 5) + Math.sin(sourceB * 36 * scale - phase * 4.2);
      rgb = mixRgb(primary, secondary, 0.5 + ripple * 0.25);
      break;
    }
    case 'vortex': {
      const v = angle * 5 + Math.log(radius + 0.035) * 8 * scale - phase * 4;
      const amount = 0.5 + 0.5 * Math.sin(v);
      rgb = mixRgb(primary, secondary, amount * smoothstep(0.01, 0.22, radius));
      break;
    }
    case 'warp-tunnel': {
      const tunnel = Math.sin((1 / (radius + 0.055)) * 2.4 * scale + angle * 3 - phase * 6);
      const fade = smoothstep(0.03, 0.42, radius);
      rgb = mixRgb(secondary, primary, (0.5 + 0.5 * tunnel) * fade);
      break;
    }
    case 'diagonal-bars': {
      const band = fract((nx + ny) * 5 * scale - phase * 1.5);
      const amount = smoothstep(0.05, 0.22, band) * (1 - smoothstep(0.58, 0.92, band));
      rgb = mixRgb(secondary, primary, amount);
      break;
    }
    case 'diamonds': {
      const dx = Math.abs(fract(nx * 4 * scale - phase * 0.25) - 0.5);
      const dy = Math.abs(fract(ny * 4 * scale + phase * 0.18) - 0.5);
      const amount = 1 - smoothstep(0.22, 0.5, dx + dy);
      rgb = mixRgb(secondary, primary, amount);
      break;
    }
    case 'pinwheel': {
      const blades = 0.5 + 0.5 * Math.sin(angle * 8 - phase * 4 + radius * 8 * scale);
      rgb = mixRgb(primary, secondary, blades);
      break;
    }
    case 'kaleidoscope': {
      const folded = Math.abs(Math.sin(angle * 4 + phase * 0.65));
      const patternValue = Math.sin((radius * 38 * scale) + folded * 9 - phase * 3);
      rgb = mixRgb(primary, secondary, 0.5 + patternValue * 0.5);
      break;
    }
    case 'zoom-boxes': {
      const squareRadius = Math.max(Math.abs(cx), Math.abs(cy));
      const boxes = 0.5 + 0.5 * Math.sin(squareRadius * 65 * scale - phase * 5);
      rgb = mixRgb(primary, secondary, boxes);
      break;
    }
    case 'grid-pulse': {
      const gx = Math.abs(Math.sin(nx * Math.PI * 8 * scale));
      const gy = Math.abs(Math.sin(ny * Math.PI * 8 * scale));
      const grid = Math.pow(Math.max(gx, gy), 8);
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(phase * 3));
      rgb = mixRgb(multiplyRgb(secondary, 0.06), primary, grid * pulse);
      break;
    }
    case 'crosshatch': {
      const a = Math.abs(Math.sin((nx + ny) * Math.PI * 7 * scale - phase * 2));
      const b = Math.abs(Math.sin((nx - ny) * Math.PI * 7 * scale + phase * 1.7));
      const lines = Math.pow(Math.max(a, b), 10);
      rgb = mixRgb(secondary, primary, lines);
      break;
    }
    case 'sine-dots': {
      const gridX = fract(nx * Math.max(2, 7 * scale));
      const gridY = fract(ny * Math.max(2, 7 * scale));
      const offset = Math.sin(Math.floor(nx * 7 * scale) + phase * 2) * 0.18;
      const dot = 1 - smoothstep(0.06, 0.32, Math.hypot(gridX - 0.5, gridY - 0.5 - offset));
      rgb = mixRgb(secondary, primary, dot);
      break;
    }
    case 'static-noise': {
      const seed = Math.floor(timeSeconds * Math.max(matrixOptimized ? 3 : 8, speed * (matrixOptimized ? 7 : 30)));
      const sampleX = matrixOptimized ? Math.floor(x / 2) : x;
      const value = hash2(sampleX, y, seed);
      rgb = mixRgb(primary, secondary, matrixOptimized ? smoothstep(0.28, 0.72, value) : (value > 0.5 ? 1 : 0));
      break;
    }
    case 'twinkle': {
      const cycle = Math.floor(timeSeconds * Math.max(1, speed * 3));
      const local = fract(timeSeconds * Math.max(1, speed * 3));
      const start = hash2(x, y, cycle);
      const next = hash2(x, y, cycle + 1);
      const glow = Math.pow(start * (1 - local) + next * local, 5);
      rgb = mixRgb(multiplyRgb(secondary, 0.03), primary, glow);
      break;
    }
    case 'confetti': {
      const seed = Math.floor(timeSeconds * Math.max(1, speed * (matrixOptimized ? 3 : 8)));
      const active = hash2(matrixOptimized ? Math.floor(x / 2) : x, y, seed) > (matrixOptimized ? 0.76 : 0.82);
      if (!active) rgb = multiplyRgb(secondary, 0.025);
      else return hsvToRgb(hash2(x, y, seed + 10) * 360, 0.95, brightness);
      break;
    }
    case 'starfield': {
      const depth = hash2(x, y, 91);
      const travel = fract(depth + phase * (0.08 + depth * 0.2));
      const star = hash2(x, y, 53) > 0.82 ? Math.pow(1 - travel, 8) : 0;
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, star);
      break;
    }
    case 'rain': {
      const laneSeed = hash2(x, 0, 17);
      const drop = fract(ny - phase * (0.35 + laneSeed * 0.25) + laneSeed);
      const lit = laneSeed > 0.35 ? Math.exp(-drop * 18) : 0;
      rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, lit);
      break;
    }
    case 'snow': {
      const seed = hash2(x, 0, 71);
      const driftX = Math.sin(ny * 8 + phase + seed * 6) * 0.08;
      const fx = fract(nx + driftX + seed);
      const fy = fract(ny - phase * (0.08 + seed * 0.08) + seed);
      const flake = hash2(Math.floor((nx + driftX) * width), Math.floor(fy * height), 27) > 0.82
        ? 1 - smoothstep(0.0, 0.18, Math.hypot(fract(fx * width) - 0.5, fract(fy * height) - 0.5)) : 0;
      rgb = mixRgb(multiplyRgb(secondary, 0.04), primary, flake);
      break;
    }
    case 'scanner': {
      const position = 0.5 + 0.5 * Math.sin(phase * 1.6);
      const distance = Math.abs(nx - position);
      const beam = Math.exp(-distance * Math.max(18, 45 / scale));
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, beam);
      break;
    }
    case 'scanner-dual': {
      const position = 0.5 + 0.5 * Math.sin(phase * 1.45);
      const beam = Math.max(Math.exp(-Math.abs(nx - position) * 34 / scale), Math.exp(-Math.abs(ny - position) * 34 / scale));
      rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, beam);
      break;
    }
    case 'comet-x': {
      const head = fract(phase * 0.22);
      const trail = fract(head - nx + 1);
      const glow = Math.exp(-trail * Math.max(8, 22 / scale));
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, glow);
      break;
    }
    case 'comet-y': {
      const head = fract(phase * 0.22);
      const trail = fract(head - ny + 1);
      const glow = Math.exp(-trail * Math.max(8, 22 / scale));
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, glow);
      break;
    }
    case 'theater-chase': {
      const spacing = Math.max(2, Math.round(4 / Math.max(0.35, scale)));
      const active = ((x + y * width + step) % spacing + spacing) % spacing === 0;
      rgb = active ? primary : multiplyRgb(secondary, 0.04);
      break;
    }
    case 'bouncing-dot': {
      const px = 0.5 + 0.46 * Math.sin(phase * 1.7);
      const py = 0.5 + 0.46 * Math.sin(phase * 2.13 + 1.2);
      const dot = 1 - smoothstep(0.015, Math.max(0.055, 0.16 / scale), Math.hypot(nx - px, ny - py));
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, dot);
      break;
    }
    case 'bouncing-bars': {
      const px = 0.5 + 0.5 * Math.sin(phase * 1.5);
      const py = 0.5 + 0.5 * Math.sin(phase * 1.9 + 1.1);
      const vx = Math.exp(-Math.abs(nx - px) * 30 / scale);
      const vy = Math.exp(-Math.abs(ny - py) * 30 / scale);
      rgb = mixRgb(secondary, primary, Math.max(vx, vy));
      break;
    }

    case 'flowing-gradient': {
      const amount = 0.5 + 0.5 * Math.sin((nx * 1.4 + ny * 0.9) * Math.PI * 2 * scale - phase * 1.4);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'metaballs': {
      const centers = [
        [0.5 + 0.32 * Math.sin(phase * 0.73), 0.5 + 0.28 * Math.cos(phase * 0.91)],
        [0.5 + 0.30 * Math.cos(phase * 0.57 + 2), 0.5 + 0.35 * Math.sin(phase * 0.67 + 1)],
        [0.5 + 0.24 * Math.sin(phase * 1.11 + 4), 0.5 + 0.26 * Math.cos(phase * 0.49 + 3)]
      ];
      let field = 0;
      for (const [mx, my] of centers) field += 0.018 * scale / (Math.pow(nx - mx, 2) + Math.pow(ny - my, 2) + 0.006);
      rgb = mixRgb(secondary, primary, smoothstep(0.52, 1.45, field));
      break;
    }
    case 'moire': {
      const first = Math.sin((nx * Math.cos(phase * 0.13) + ny * Math.sin(phase * 0.13)) * 48 * scale);
      const second = Math.sin((nx * Math.cos(-phase * 0.11 + 0.12) + ny * Math.sin(-phase * 0.11 + 0.12)) * 51 * scale);
      rgb = mixRgb(primary, secondary, 0.5 + 0.25 * (first + second));
      break;
    }
    case 'radar': {
      const sweep = Math.atan2(cy, cx) - phase * 1.7;
      const wrapped = Math.atan2(Math.sin(sweep), Math.cos(sweep));
      const beam = Math.exp(-Math.abs(wrapped) * 9 / Math.max(0.4, scale));
      const rings = Math.pow(0.5 + 0.5 * Math.sin(radius * 85), 12) * 0.28;
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, clamp(beam + rings, 0, 1));
      break;
    }
    case 'orbiters': {
      let glow = 0;
      for (let i = 0; i < 5; i += 1) {
        const orbit = 0.12 + i * 0.055;
        const a = phase * (0.65 + i * 0.11) + i * 1.256;
        const px = 0.5 + Math.cos(a) * orbit;
        const py = 0.5 + Math.sin(a) * orbit;
        glow = Math.max(glow, Math.exp(-Math.hypot(nx - px, ny - py) * 40 / scale));
      }
      rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, glow);
      break;
    }
    case 'lightning': {
      const seed = Math.floor(timeSeconds * Math.max(3, speed * 7));
      const center = 0.5 + (valueNoise(ny * 4, seed * 0.1, seed) - 0.5) * 0.65;
      const bolt = Math.exp(-Math.abs(nx - center) * 85 / scale);
      const flash = hash2(seed, 0, 91) > 0.72 ? 1 : 0.18;
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, clamp(bolt * flash + flash * 0.1, 0, 1));
      break;
    }
    case 'glitch': {
      const seed = Math.floor(timeSeconds * Math.max(4, speed * 13));
      const stripe = hash2(Math.floor(ny * height), seed, 44);
      const shifted = fract(nx + (stripe > 0.72 ? (stripe - 0.72) * 2 : 0));
      const block = hash2(Math.floor(shifted * width / Math.max(1, scale)), Math.floor(ny * height / 2), seed);
      rgb = mixRgb(primary, secondary, block > 0.48 ? 1 : 0);
      if (stripe > 0.88) rgb = [rgb[2], rgb[0], rgb[1]];
      break;
    }
    case 'pixel-sort': {
      const band = Math.floor((ny + phase * 0.08) * Math.max(2, 10 * scale));
      const threshold = hash2(band, Math.floor(phase), 13);
      const amount = fract(nx + threshold * 0.75);
      rgb = mixRgb(primary, secondary, amount > threshold ? amount : threshold * 0.25);
      break;
    }
    case 'mandala': {
      const folds = 8;
      const folded = Math.abs(Math.sin(angle * folds + phase * 0.8));
      const petals = 0.5 + 0.5 * Math.sin(radius * 72 * scale - phase * 3 + folded * 9);
      rgb = mixRgb(primary, secondary, petals * smoothstep(0.02, 0.46, radius));
      break;
    }
    case 'hex-tunnel': {
      const hexAngle = Math.atan2(cy, cx);
      const hexRadius = radius * (1 + 0.18 * Math.cos(hexAngle * 6));
      const bands = 0.5 + 0.5 * Math.sin(hexRadius * 86 * scale - phase * 4);
      rgb = mixRgb(multiplyRgb(secondary, 0.04), primary, smoothstep(0.45, 0.82, bands));
      break;
    }
    case 'triangle-tunnel': {
      const tri = Math.max(Math.abs(cx), Math.abs(cy) * 0.58 + Math.abs(cx) * 0.42);
      const bands = 0.5 + 0.5 * Math.sin(tri * 104 * scale - phase * 4.5 + Math.sin(angle * 3));
      rgb = mixRgb(secondary, primary, smoothstep(0.42, 0.8, bands));
      break;
    }
    case 'polygon-orbit': {
      const sides = 5;
      const polygon = Math.cos(Math.floor(0.5 + angle / (Math.PI * 2 / sides)) * (Math.PI * 2 / sides) - angle) * radius;
      const ring = Math.exp(-Math.abs(polygon - (0.18 + 0.08 * Math.sin(phase * 1.6))) * 50 / scale);
      const orb = Math.exp(-Math.hypot(cx - Math.cos(phase) * 0.25, cy - Math.sin(phase) * 0.25) * 42);
      rgb = mixRgb(multiplyRgb(secondary, 0.03), primary, clamp(ring + orb, 0, 1));
      break;
    }
    case 'geometric-lattice': {
      const a = Math.abs(Math.sin((nx + ny) * 24 * scale + phase));
      const b = Math.abs(Math.sin((nx - ny) * 24 * scale - phase * 0.8));
      const lattice = smoothstep(0.78, 0.98, Math.max(a, b));
      rgb = mixRgb(multiplyRgb(secondary, 0.06), primary, lattice);
      break;
    }
    case 'isometric-cubes': {
      const gx = fract((nx + ny * 0.5 + phase * 0.05) * 8 * scale);
      const gy = fract((ny + phase * 0.035) * 8 * scale);
      const edge = Math.max(Math.exp(-Math.min(gx, 1 - gx) * 22), Math.exp(-Math.min(gy, 1 - gy) * 22), Math.exp(-Math.abs(gx - gy) * 18));
      rgb = mixRgb(secondary, primary, clamp(edge, 0, 1));
      break;
    }
    case 'concentric-diamonds': {
      const diamond = Math.abs(cx) + Math.abs(cy);
      const band = 0.5 + 0.5 * Math.sin(diamond * 92 * scale - phase * 4);
      rgb = mixRgb(primary, secondary, smoothstep(0.25, 0.78, band));
      break;
    }
    case 'radial-spokes': {
      const spokes = smoothstep(0.74, 0.98, Math.abs(Math.sin(angle * 12 + phase * 1.2)));
      const pulse = 0.5 + 0.5 * Math.sin(radius * 72 * scale - phase * 4);
      rgb = mixRgb(multiplyRgb(secondary, 0.04), primary, spokes * (0.3 + pulse * 0.7));
      break;
    }
    case 'perspective-grid': {
      const depth = 1 / Math.max(0.08, ny + 0.08);
      const vertical = Math.exp(-Math.abs(fract((nx - 0.5) * depth * 8 * scale + 0.5) - 0.5) * 24);
      const horizontal = Math.exp(-Math.abs(fract(depth * 0.42 + phase * 0.18) - 0.5) * 24);
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, clamp(Math.max(vertical, horizontal) * smoothstep(0.05, 0.45, ny), 0, 1));
      break;
    }
    case 'gothic-window': {
      const arch = Math.abs(Math.sqrt(Math.max(0, 0.12 - cx * cx)) - (0.18 - cy));
      const ribs = Math.abs(Math.sin(angle * 5 + phase * 0.15));
      const lead = Math.max(Math.exp(-arch * 80), smoothstep(0.92, 0.99, ribs) * smoothstep(0.08, 0.46, radius));
      rgb = mixRgb(multiplyRgb(secondary, 0.03), primary, clamp(lead, 0, 1));
      break;
    }
    case 'flow-field': {
      const n = valueNoise(nx * 7 * scale + phase * 0.18, ny * 7 * scale - phase * 0.13, 17);
      const flow = 0.5 + 0.5 * Math.sin((nx + ny + n * 1.8) * 22 - phase * 2.5);
      rgb = mixRgb(primary, secondary, flow);
      break;
    }
    case 'reaction-diffusion': {
      const n1 = valueNoise(nx * 13 * scale + phase * 0.07, ny * 13 * scale, 31);
      const n2 = valueNoise(nx * 25 * scale - phase * 0.05, ny * 25 * scale + phase * 0.04, 71);
      const cells = smoothstep(0.46, 0.54, Math.abs(n1 - n2));
      rgb = mixRgb(multiplyRgb(secondary, 0.08), primary, cells);
      break;
    }
    case 'electric-arcs': {
      const lane = Math.sin(ny * 7 + phase * 0.7) * 0.16;
      const bolt = Math.exp(-Math.abs(cx - lane - (valueNoise(ny * 18, phase * 0.4, 9) - 0.5) * 0.18) * 70 / scale);
      const branch = Math.exp(-Math.abs(cx + lane * 0.7 + 0.18) * 55) * smoothstep(0.25, 0.8, Math.sin(ny * 32 + phase * 3) * 0.5 + 0.5);
      rgb = mixRgb(multiplyRgb(secondary, 0.01), primary, clamp(bolt + branch * 0.65, 0, 1));
      break;
    }
    case 'aurora-ribbons': {
      const ribbonA = Math.exp(-Math.abs(ny - 0.5 - Math.sin(nx * 7 + phase) * 0.17) * 18 / scale);
      const ribbonB = Math.exp(-Math.abs(ny - 0.5 - Math.sin(nx * 11 - phase * 0.7 + 1.8) * 0.24) * 20 / scale);
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, clamp(ribbonA + ribbonB * 0.72, 0, 1));
      break;
    }
    case 'particle-fountain': {
      let glow = 0;
      for (let p = 0; p < 5; p += 1) {
        const age = fract(timeSeconds * speed * (0.22 + p * 0.03) + p * 0.19);
        const px = 0.5 + Math.sin(p * 2.7 + age * 5) * age * 0.28;
        const py = 0.92 - age + age * age * 0.48;
        glow = Math.max(glow, Math.exp(-Math.hypot(nx - px, ny - py) * 70 / scale));
      }
      rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, glow);
      break;
    }
    case 'comet-vortex': {
      const spin = angle + phase * 1.8 + radius * 15;
      const arm = Math.exp(-Math.abs(Math.sin(spin * 1.5)) * 12 / scale) * smoothstep(0.03, 0.48, radius);
      const head = Math.exp(-Math.hypot(cx - Math.cos(phase * 1.8) * 0.28, cy - Math.sin(phase * 1.8) * 0.28) * 55);
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, clamp(arm * 0.7 + head, 0, 1));
      break;
    }
    case 'prism-wave': {
      const wave = Math.sin((nx * 7.5 + ny * 3.2) * Math.PI * scale - phase * 2.4)
        + 0.55 * Math.sin((ny * 8.8 - nx * 2.1) * Math.PI * scale + phase * 1.65);
      const hue = fract(nx * 0.62 + ny * 0.23 - phase * 0.055 + wave * 0.065) * 360;
      const glow = clamp(0.64 + Math.abs(wave) * 0.2, 0, 1);
      return hsvToRgb(hue, 0.96, brightness * glow);
    }
    case 'chroma-stripes': {
      const stripe = fract((nx * 6.5 + ny * 1.3) * scale - phase * 0.72);
      const edge = 1 - smoothstep(0.34, 0.49, Math.abs(stripe - 0.5));
      const hue = fract(stripe + phase * 0.035 + ny * 0.18) * 360;
      return hsvToRgb(hue, 0.94, brightness * (0.38 + edge * 0.62));
    }
    case 'sunset-cycle': {
      const horizon = clamp(1 - ny, 0, 1);
      const sunX = 0.5 + Math.sin(phase * 0.31) * 0.27;
      const sunY = 0.58 + Math.cos(phase * 0.21) * 0.08;
      const sun = Math.exp(-Math.hypot(nx - sunX, ny - sunY) * 13 / Math.max(0.45, scale));
      const glow = Math.exp(-Math.abs(ny - sunY) * 7) * 0.45;
      const hue = 318 + horizon * 95 + Math.sin(phase * 0.23) * 12;
      const sky = hsvToRgb(hue, 0.78, clamp(0.34 + horizon * 0.45 + glow + sun * 0.7, 0, 1));
      rgb = mixRgb(secondary, sky, clamp(0.42 + horizon * 0.58 + sun, 0, 1));
      break;
    }
    case 'nebula-clouds': {
      const n1 = valueNoise(nx * 4.8 * scale + phase * 0.12, ny * 4.8 * scale - phase * 0.08, 131);
      const n2 = valueNoise(nx * 10.5 * scale - phase * 0.07, ny * 10.5 * scale + phase * 0.11, 197);
      const cloud = smoothstep(0.28, 0.86, n1 * 0.72 + n2 * 0.42);
      const stars = hash2(x, y, Math.floor(timeSeconds * Math.max(1, speed * 2))) > 0.965 ? 1 : 0;
      const hue = 210 + n1 * 105 + phase * 8;
      const nebula = hsvToRgb(hue, 0.82, clamp(0.22 + cloud * 0.78, 0, 1));
      rgb = mixRgb(nebula, primary, stars);
      break;
    }
    case 'bio-cells': {
      const gx = nx * Math.max(3, 7 * scale);
      const gy = ny * Math.max(3, 7 * scale);
      const cellX = Math.floor(gx);
      const cellY = Math.floor(gy);
      let nearest = 10;
      let secondNearest = 10;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const seed = hash2(cellX + ox, cellY + oy, 223);
          const px = cellX + ox + 0.5 + Math.sin(seed * 19 + phase * 0.72) * 0.34;
          const py = cellY + oy + 0.5 + Math.cos(seed * 23 - phase * 0.61) * 0.34;
          const d = Math.hypot(gx - px, gy - py);
          if (d < nearest) { secondNearest = nearest; nearest = d; }
          else if (d < secondNearest) secondNearest = d;
        }
      }
      const membrane = 1 - smoothstep(0.015, 0.16, secondNearest - nearest);
      const nucleus = 1 - smoothstep(0.05, 0.42, nearest);
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, clamp(membrane * 0.85 + nucleus * 0.35, 0, 1));
      break;
    }
    case 'oil-slick': {
      const drift = valueNoise(nx * 5.5 * scale + phase * 0.13, ny * 5.5 * scale - phase * 0.09, 271);
      const interference = Math.sin((nx + ny + drift * 1.7) * 26 * scale - phase * 2.1);
      const hue = fract(drift * 0.85 + interference * 0.08 + phase * 0.018) * 360;
      return hsvToRgb(hue, 0.92, brightness * (0.5 + 0.5 * smoothstep(-0.9, 0.9, interference)));
    }
    case 'flame-tunnel': {
      const tunnel = 1 / (radius + 0.055);
      const turbulence = valueNoise(angle * 1.6 + phase * 0.2, tunnel * 0.2 - phase * 0.11, 307);
      const heat = clamp(0.5 + 0.5 * Math.sin(tunnel * 3.1 * scale + angle * 4 + turbulence * 5 - phase * 6.2), 0, 1);
      const fade = smoothstep(0.025, 0.44, radius);
      return hsvToRgb(4 + heat * 58, 1, brightness * heat * fade);
    }
    case 'water-ribbons': {
      const ribbonA = Math.exp(-Math.abs(ny - 0.35 - Math.sin(nx * 8 * scale - phase * 1.5) * 0.16) * 20);
      const ribbonB = Math.exp(-Math.abs(ny - 0.62 - Math.sin(nx * 10 * scale + phase * 1.15 + 1.8) * 0.19) * 18);
      const caustic = 0.5 + 0.5 * Math.sin((nx - ny) * 19 * scale + phase * 2.2);
      rgb = mixRgb(multiplyRgb(secondary, 0.04), primary, clamp((ribbonA + ribbonB * 0.82) * (0.55 + caustic * 0.45), 0, 1));
      break;
    }
    case 'honeycomb-pulse': {
      const hexScale = Math.max(2.5, 7 * scale);
      const px = nx * hexScale;
      const py = ny * hexScale * 1.15;
      const row = Math.floor(py);
      const hx = fract(px + (row % 2) * 0.5) - 0.5;
      const hy = fract(py) - 0.5;
      const edgeDistance = Math.max(Math.abs(hx) * 0.866 + Math.abs(hy) * 0.5, Math.abs(hy));
      const edge = smoothstep(0.34, 0.46, edgeDistance);
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(phase * 2.4 + row * 0.7 + Math.floor(px) * 0.4));
      rgb = mixRgb(multiplyRgb(secondary, 0.035), primary, edge * pulse);
      break;
    }
    case 'rotating-tiles': {
      const rotation = phase * 0.22;
      const rx = cx * Math.cos(rotation) - cy * Math.sin(rotation) + 0.5;
      const ry = cx * Math.sin(rotation) + cy * Math.cos(rotation) + 0.5;
      const tileScale = Math.max(2, 6 * scale);
      const tx = fract(rx * tileScale) - 0.5;
      const ty = fract(ry * tileScale) - 0.5;
      const tile = 1 - smoothstep(0.26, 0.49, Math.max(Math.abs(tx), Math.abs(ty)));
      const parity = (Math.floor(rx * tileScale) + Math.floor(ry * tileScale)) & 1;
      rgb = mixRgb(parity ? secondary : multiplyRgb(secondary, 0.05), primary, tile);
      break;
    }
    case 'fractal-cross': {
      let fx = Math.abs(cx) * 2;
      let fy = Math.abs(cy) * 2;
      let cross = 0;
      for (let octave = 0; octave < 3; octave += 1) {
        const arm = Math.min(Math.abs(fx - 0.5), Math.abs(fy - 0.5));
        cross = Math.max(cross, Math.exp(-arm * (38 + octave * 10) / scale));
        fx = fract(fx * 2 + phase * (0.025 + octave * 0.012));
        fy = fract(fy * 2 - phase * (0.022 + octave * 0.01));
      }
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, cross);
      break;
    }
    case 'tunnel-checker': {
      const depth = 1 / (radius + 0.06);
      const ring = Math.floor(depth * 0.7 * scale - phase * 1.25);
      const sector = Math.floor((angle + Math.PI) / (Math.PI / 6));
      const active = ((ring + sector) & 1) === 0;
      const fade = smoothstep(0.03, 0.45, radius);
      rgb = mixRgb(secondary, primary, active ? fade : fade * 0.08);
      break;
    }
    case 'cathedral-rose': {
      const petals = Math.pow(Math.abs(Math.sin(angle * 8 + phase * 0.35)), 5);
      const tracery = Math.pow(0.5 + 0.5 * Math.sin(radius * 82 * scale - phase * 1.8 + petals * 7), 10);
      const hub = Math.exp(-radius * 22);
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, clamp(tracery * (0.35 + petals * 0.65) + hub, 0, 1));
      break;
    }
    case 'laser-speckle': {
      const seed = Math.floor(timeSeconds * Math.max(5, speed * 18));
      const driftX = Math.floor((x + phase * 2.3) / Math.max(1, 2 / scale));
      const driftY = Math.floor((y - phase * 1.4) / Math.max(1, 2 / scale));
      const random = hash2(driftX, driftY, seed);
      const speckle = random > 0.84 ? Math.pow((random - 0.84) / 0.16, 0.35) : 0;
      const sweep = Math.exp(-Math.abs(fract(nx + phase * 0.18) - 0.5) * 11);
      rgb = mixRgb(multiplyRgb(secondary, 0.008), primary, clamp(speckle + sweep * 0.22, 0, 1));
      break;
    }
    case 'data-mosaic': {
      const blockSize = Math.max(1, Math.round(4 / Math.max(0.35, scale)));
      const bx = Math.floor(x / blockSize);
      const by = Math.floor(y / blockSize);
      const seed = Math.floor(timeSeconds * Math.max(1, speed * 3));
      const value = hash2(bx + Math.floor(phase * 0.35), by, seed);
      const pulse = 0.5 + 0.5 * Math.sin(phase * 2 + value * Math.PI * 2);
      rgb = mixRgb(primary, secondary, smoothstep(0.28, 0.72, value * 0.7 + pulse * 0.3));
      break;
    }
    case 'audio-laser-fan': {
      const position = clamp((angle + Math.PI) / (Math.PI * 2), 0, 0.999999);
      const band = spectrumAt(audio.spectrum, position);
      const rayCount = 7 + Math.round(audio.treble * 10 + hatEnergy * 7);
      const ray = Math.pow(0.5 + 0.5 * Math.cos(angle * rayCount - phase * 2.2), 18);
      const beam = ray * (0.08 + band * 0.72 + hatEnergy * 0.55 + snareEnergy * 0.25) * smoothstep(0.01, 0.46, radius);
      rgb = mixRgb(multiplyRgb(secondary, 0.008), primary, clamp(beam, 0, 1));
      break;
    }
    case 'audio-nebula': {
      const n1 = valueNoise(nx * 5 * scale + phase * (0.08 + audio.bass * 0.16), ny * 5 * scale - phase * 0.06, 401);
      const n2 = valueNoise(nx * 11 * scale - phase * 0.05, ny * 11 * scale + phase * (0.07 + audio.mid * 0.12), 443);
      const cloud = smoothstep(0.22, 0.88, n1 * 0.65 + n2 * 0.48 + audio.level * 0.28 + kickEnergy * 0.22);
      const hue = 195 + n1 * 125 + audio.treble * 75 + hatEnergy * 55;
      return hsvToRgb(hue, 0.86, brightness * clamp(0.12 + cloud * 0.88, 0, 1));
    }
    case 'audio-shockwave-grid': {
      const shockRadius = fract(phase * 0.11 + kickEnergy * 0.18 + beatEnergy * 0.08) * 0.52;
      const ring = Math.exp(-Math.abs(radius - shockRadius) * (65 + audio.treble * 35) / scale);
      const grid = Math.pow(Math.max(Math.abs(Math.sin(nx * Math.PI * 9)), Math.abs(Math.sin(ny * Math.PI * 9))), 16);
      const power = clamp(0.08 + audio.level * 0.25 + kickEnergy * 0.85 + snareEnergy * 0.42, 0, 1);
      rgb = mixRgb(multiplyRgb(secondary, 0.012), primary, clamp(ring * power + grid * power * 0.28, 0, 1));
      break;
    }
    case 'audio-dna-helix': {
      const wave = Math.sin(nx * Math.PI * (5 + audio.mid * 4) * scale - phase * (2 + audio.bass * 2.5));
      const centerA = 0.5 + wave * (0.16 + audio.level * 0.16);
      const centerB = 0.5 - wave * (0.16 + audio.level * 0.16);
      const strandA = Math.exp(-Math.abs(ny - centerA) * (55 + audio.treble * 30) / scale);
      const strandB = Math.exp(-Math.abs(ny - centerB) * (55 + audio.treble * 30) / scale);
      const rungs = Math.pow(0.5 + 0.5 * Math.sin(nx * Math.PI * 12 * scale - phase * 2), 12)
        * smoothstep(0.0, 0.32, Math.min(Math.abs(ny - centerA), Math.abs(ny - centerB)));
      rgb = mixRgb(multiplyRgb(secondary, 0.01), primary, clamp(strandA + strandB + rungs * snareEnergy * 0.55, 0, 1));
      break;
    }
    case 'audio-particle-ring': {
      const ringRadius = 0.12 + audio.bass * 0.24 + kickEnergy * 0.12;
      let glow = 0;
      const particles = 10;
      for (let p = 0; p < particles; p += 1) {
        const a = p / particles * Math.PI * 2 + phase * (0.7 + audio.treble * 0.9) + hash2(p, 0, 509) * 0.35;
        const wobble = 1 + Math.sin(phase * 2 + p * 1.7) * (0.04 + snareEnergy * 0.08);
        const px = 0.5 + Math.cos(a) * ringRadius * wobble;
        const py = 0.5 + Math.sin(a) * ringRadius * wobble;
        glow = Math.max(glow, Math.exp(-Math.hypot(nx - px, ny - py) * (48 + hatEnergy * 36) / scale));
      }
      const coreRing = Math.exp(-Math.abs(radius - ringRadius) * 48 / scale) * (0.08 + audio.level * 0.28);
      rgb = mixRgb(multiplyRgb(secondary, 0.008), primary, clamp(glow * (0.3 + audio.level * 0.7) + coreRing, 0, 1));
      break;
    }
    case 'audio-vu-bars':
    case 'audio-level-meter': {
      const level = pattern === 'audio-level-meter' ? audio.peak : audio.level;
      const threshold = 1 - ny;
      const lit = threshold <= Math.max(0.03, level) ? 1 : 0;
      const hue = 120 - threshold * 120;
      rgb = lit ? hsvToRgb(hue, 1, 1) : multiplyRgb(secondary, 0.025);
      break;
    }
    case 'audio-spectrum':
    case 'audio-spectrum-mirror': {
      const sx = pattern === 'audio-spectrum-mirror' ? Math.abs(nx * 2 - 1) : nx;
      const amplitude = spectrumAt(audio.spectrum, sx);
      const lit = 1 - ny <= amplitude ? 1 : 0;
      const hue = 220 + sx * 160 + audio.treble * 70;
      rgb = lit ? mixRgb(primary, hsvToRgb(hue, 1, 1), ny) : multiplyRgb(secondary, 0.018);
      break;
    }
    case 'audio-spectrum-radial': {
      const position = fract((angle + Math.PI) / (Math.PI * 2));
      const amplitude = spectrumAt(audio.spectrum, position);
      const targetRadius = 0.10 + amplitude * 0.36;
      const line = Math.exp(-Math.abs(radius - targetRadius) * 70 / scale);
      rgb = mixRgb(multiplyRgb(secondary, 0.015), hsvToRgb(position * 360 + phase * 15, 1, 1), line);
      break;
    }
    case 'audio-eq-grid': {
      const amplitude = spectrumAt(audio.spectrum, nx);
      const column = Math.pow(Math.abs(Math.sin(nx * width * Math.PI)), 10);
      const row = Math.pow(Math.abs(Math.sin(ny * height * Math.PI)), 10);
      const lit = 1 - ny <= amplitude ? Math.max(column, row * 0.35) : 0;
      rgb = mixRgb(multiplyRgb(secondary, 0.018), primary, lit);
      break;
    }
    case 'audio-oscilloscope':
    case 'audio-waveform-fill': {
      const waveIndex = clamp(Math.floor(nx * audio.waveform.length), 0, audio.waveform.length - 1);
      const waveY = 0.5 - (audio.waveform[waveIndex] || 0) * 0.44;
      if (pattern === 'audio-waveform-fill') {
        const fill = ny >= Math.min(0.5, waveY) && ny <= Math.max(0.5, waveY) ? 1 : 0;
        rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, fill);
      } else {
        const line = Math.exp(-Math.abs(ny - waveY) * Math.max(45, 100 / scale));
        rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, line);
      }
      break;
    }
    case 'audio-bass-pulse': {
      const pulse = audio.sub * 0.35 + audio.bass * 0.45 + kickEnergy * 0.85;
      const ring = Math.exp(-Math.abs(radius - (0.05 + pulse * 0.38)) * 55 / scale);
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, Math.max(ring, pulse * Math.exp(-radius * 8)));
      break;
    }
    case 'audio-beat-rings': {
      const spacing = Math.max(0.035, 0.12 / scale);
      const rings = Math.pow(0.5 + 0.5 * Math.sin((radius - phase * 0.04 - kickEnergy * 0.18) / spacing * Math.PI), 12);
      rgb = mixRgb(multiplyRgb(secondary, 0.02), primary, rings * (0.14 + audio.level * 0.46 + kickEnergy * 0.8));
      break;
    }
    case 'audio-kick-flash':
    case 'audio-beat-strobe': {
      const power = pattern === 'audio-kick-flash' ? Math.max(audio.sub, audio.bass, kickEnergy) : Math.max(beatEnergy, kickEnergy);
      rgb = mixRgb(multiplyRgb(secondary, 0.01), primary, power);
      break;
    }
    case 'audio-beat-grid': {
      const grid = Math.pow(Math.max(Math.abs(Math.sin(nx * Math.PI * 8)), Math.abs(Math.sin(ny * Math.PI * 8))), 14);
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, grid * (0.08 + kickEnergy * 0.62 + snareEnergy * 0.72));
      break;
    }
    case 'audio-heart': {
      const pulse = clamp(audio.bass * 0.45 + kickEnergy * 1.15, 0, 1);
      const hx = cx * 2.7 / (0.72 + pulse * 0.22);
      const hy = -cy * 2.7 / (0.72 + pulse * 0.22);
      const equation = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);
      rgb = equation <= 0 ? multiplyRgb(primary, 0.35 + pulse * 0.65) : multiplyRgb(secondary, 0.012);
      break;
    }
    case 'audio-plasma': {
      const value = Math.sin(nx * 12 * scale + phase * 2 + audio.bass * 6 + kickEnergy * 3) + Math.sin(ny * 15 * scale - phase * 1.7 + audio.mid * 7 + snareEnergy * 4) + Math.sin((nx + ny) * 10 * scale + audio.treble * 9 + hatEnergy * 5);
      rgb = mixRgb(primary, secondary, 0.5 + value / 6);
      break;
    }
    case 'audio-waves': {
      const wave = 0.5 + 0.5 * Math.sin((nx * 1.3 + ny * 0.7) * Math.PI * (4 + audio.mid * 7 + snareEnergy * 5) * scale - phase * (2 + audio.bass * 2 + kickEnergy * 4));
      rgb = mixRgb(primary, secondary, wave);
      break;
    }
    case 'audio-fire': {
      const n = valueNoise(nx * 6 * scale + phase * 0.7, ny * 7 * scale - phase * 1.8, 18);
      const heat = clamp((1 - ny) * (0.45 + audio.sub * 0.7 + audio.bass * 0.65) + n * 0.6 + kickEnergy * 0.72 - 0.32, 0, 1);
      rgb = hsvToRgb(8 + heat * 52, 1, heat);
      break;
    }
    case 'audio-ripple': {
      const ripples = 0.5 + 0.5 * Math.sin(radius * (38 + audio.highMid * 42 + snareEnergy * 30) * scale - phase * (2.5 + audio.bass * 2.5 + kickEnergy * 4));
      rgb = mixRgb(secondary, primary, ripples * (0.18 + audio.level * 0.82));
      break;
    }
    case 'audio-aurora': {
      const curtain = 0.5 + 0.5 * Math.sin(nx * 13 * scale + valueNoise(nx * 4, phase * 0.2, 7) * 8 + phase);
      const lift = clamp(1 - ny + audio.mid * 0.45, 0, 1);
      rgb = mixRgb(multiplyRgb(secondary, 0.025), primary, curtain * lift * (0.18 + audio.mid * 0.48 + audio.highMid * 0.35 + snareEnergy * 0.55));
      break;
    }
    case 'audio-vortex': {
      const spin = 0.5 + 0.5 * Math.sin(angle * (5 + audio.treble * 6 + hatEnergy * 4) + Math.log(radius + 0.04) * (8 + audio.mid * 7 + snareEnergy * 5) - phase * (3 + audio.bass * 2 + kickEnergy * 5));
      rgb = mixRgb(primary, secondary, spin * smoothstep(0.01, 0.42, radius));
      break;
    }
    case 'audio-comet': {
      const head = fract(phase * 0.19 + audio.bass * 0.12 + kickEnergy * 0.28);
      const trail = fract(head - nx + 1);
      const glow = Math.exp(-trail * (10 + audio.treble * 20) / scale) * (0.3 + audio.level * 0.7);
      rgb = mixRgb(multiplyRgb(secondary, 0.012), primary, glow);
      break;
    }
    case 'audio-scanner': {
      const position = 0.5 + 0.48 * Math.sin(phase * (1.2 + audio.mid * 2));
      const beam = Math.exp(-Math.abs(nx - position) * (22 + audio.treble * 28 + hatEnergy * 32) / scale);
      rgb = mixRgb(multiplyRgb(secondary, 0.015), primary, beam * (0.15 + audio.level * 0.45 + snareEnergy * 0.65));
      break;
    }
    case 'audio-starburst': {
      const rays = Math.pow(0.5 + 0.5 * Math.sin(angle * (8 + Math.round(audio.treble * 10 + hatEnergy * 6)) + phase * 2 + snareEnergy * 2), 8);
      const burst = Math.exp(-radius * (5 - audio.bass * 3.2));
      rgb = mixRgb(multiplyRgb(secondary, 0.012), primary, rays * burst * (0.25 + audio.level));
      break;
    }
    case 'audio-particles': {
      const seed = Math.floor(timeSeconds * Math.max(4, speed * 10));
      const chance = 0.94 - audio.treble * 0.16 - hatEnergy * 0.28 - snareEnergy * 0.08;
      const active = hash2(x, y, seed) > chance;
      const glow = active ? 0.45 + hash2(x, y, seed + 3) * 0.55 : 0;
      rgb = mixRgb(multiplyRgb(secondary, 0.01), primary, glow);
      break;
    }
    case 'audio-rain': {
      const lane = hash2(x, 0, 39);
      const drop = fract(ny - phase * (0.16 + audio.highMid * 0.45 + hatEnergy * 0.95 + lane * 0.25) + lane);
      const glow = Math.exp(-drop * (12 + audio.treble * 16)) * (0.18 + audio.level * 0.82);
      rgb = mixRgb(multiplyRgb(secondary, 0.012), primary, glow);
      break;
    }
    case 'audio-tunnel': {
      const tunnel = Math.sin((1 / (radius + 0.055)) * (2.2 + audio.treble * 1.8 + hatEnergy * 1.6) * scale + angle * (3 + audio.mid * 3 + snareEnergy * 3) - phase * (5 + audio.bass * 2 + kickEnergy * 6));
      rgb = mixRgb(secondary, primary, (0.5 + 0.5 * tunnel) * smoothstep(0.03, 0.42, radius));
      break;
    }
    case 'audio-rainbow': {
      const hue = nx * 280 + ny * 80 + phase * 55 + audio.bass * 65 + kickEnergy * 75 + audio.treble * 95 + hatEnergy * 150;
      return hsvToRgb(hue, 1, brightness);
    }
    case 'audio-kaleidoscope': {
      const folded = Math.abs(Math.sin(angle * (4 + Math.round(audio.treble * 5 + hatEnergy * 4)) + phase + snareEnergy * 1.5));
      const value = 0.5 + 0.5 * Math.sin(radius * (32 + audio.mid * 28 + snareEnergy * 25) * scale + folded * 10 - phase * (2 + audio.bass * 2 + kickEnergy * 5));
      rgb = mixRgb(primary, secondary, value);
      break;
    }
    case 'audio-color-bands': {
      const band = spectrumAt(audio.spectrum, fract(nx + phase * 0.03));
      const hue = 210 + nx * 180 + audio.treble * 80;
      rgb = mixRgb(multiplyRgb(secondary, 0.015), hsvToRgb(hue, 1, 1), clamp(band * 1.25 + audio.level * 0.18, 0, 1));
      break;
    }
    case 'audio-palette-pulse': {
      const amount = clamp(audio.level * 0.35 + kickEnergy * 0.75 + snareEnergy * 0.55 + hatEnergy * 0.35 + 0.08 * Math.sin(phase * 2), 0, 1);
      rgb = mixRgb(primary, secondary, amount);
      break;
    }
    case 'solid':
    default:
      rgb = primary;
      break;
  }

  return multiplyRgb(rgb, brightness);
}

function smoothMatrixFrame(frame, width, height, strength = 0.42) {
  const result = new Uint8Array(frame.length);
  const blend = clamp(strength, 0, 0.9);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      for (let channel = 0; channel < 3; channel += 1) {
        let total = 0;
        let weight = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = Math.max(0, Math.min(width - 1, x + ox));
            const sy = Math.max(0, Math.min(height - 1, y + oy));
            const sampleWeight = ox === 0 && oy === 0 ? 4 : (ox === 0 || oy === 0 ? 2 : 1);
            total += frame[(sy * width + sx) * 3 + channel] * sampleWeight;
            weight += sampleWeight;
          }
        }
        const original = frame[index * 3 + channel];
        result[index * 3 + channel] = Math.round(original * (1 - blend) + total / weight * blend);
      }
    }
  }
  return result;
}

export function renderVisualFrame(input = {}) {
  const config = normalizedConfig(input);
  let frame = new Uint8Array(config.pixels * 3);
  for (let index = 0; index < config.pixels; index += 1) {
    const x = index % config.width;
    const y = Math.floor(index / config.width);
    const rgb = colorForPixel(x, y, index, config);
    frame[index * 3] = rgb[0];
    frame[index * 3 + 1] = rgb[1];
    frame[index * 3 + 2] = rgb[2];
  }
  if (config.matrixOptimized && MATRIX_SMOOTH_PATTERNS.has(config.pattern) && config.width > 2 && config.height > 1) {
    frame = smoothMatrixFrame(frame, config.width, config.height, config.minDimension <= 4 ? 0.56 : 0.38);
  }
  return frame;
}
