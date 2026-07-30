import { isMatrixFriendlyPattern, renderVisualFrame } from './visual-engine.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const smoothstep = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export const SHOW_STYLES = Object.freeze([
  { value: 'festival', label: 'Festival mainstage' },
  { value: 'club', label: 'Nightclub / EDM' },
  { value: 'cinematic', label: 'Cinematic journey' },
  { value: 'ambient', label: 'Ambient / lounge' },
  { value: 'corporate', label: 'Polished corporate' }
]);

const PALETTES = Object.freeze({
  neon: ['#00f5ff', '#ff1b8d'],
  ultraviolet: ['#9d5cff', '#13052f'],
  sunset: ['#ffcc48', '#ff265f'],
  inferno: ['#fff16a', '#ff2300'],
  ice: ['#d8ffff', '#1167ff'],
  acid: ['#c8ff24', '#00a884'],
  royal: ['#5d74ff', '#ff38d1'],
  ocean: ['#65ffe2', '#073c8c'],
  gold: ['#fff0a6', '#c17100'],
  mono: ['#ffffff', '#091124'],
  corporate: ['#42b7ff', '#102b70'],
  magenta: ['#ff4bd8', '#3412a8']
});



export const BUSKING_LOOKS = Object.freeze({
  flow: { pattern: 'matrix-flow-x', label: 'FLOW', palette: 'neon', speed: 0.38, scale: 1.45 },
  scanner: { pattern: 'scanner-dual', label: 'SCANNER', palette: 'inferno', speed: 0.44, scale: 1.15 },
  bars: { pattern: 'bars', label: 'BARS', palette: 'royal', speed: 0.30, scale: 1.35 },
  wipe: { pattern: 'color-wipe-dual', label: 'WIPE', palette: 'sunset', speed: 0.28, scale: 1.35 },
  spectrum: { pattern: 'audio-spectrum-mirror', label: 'SPECTRUM', palette: 'neon', speed: 0.16, scale: 1.15 },
  vu: { pattern: 'audio-vu-bars', label: 'VU BARS', palette: 'ice', speed: 0.12, scale: 1.25 },
  pulse: { pattern: 'audio-bass-pulse', label: 'PULSE', palette: 'acid', speed: 0.18, scale: 1.35 },
  gradient: { pattern: 'flowing-gradient', label: 'GRADIENT', palette: 'ocean', speed: 0.22, scale: 1.55 }
});

// Deliberately small show-safe library for short matrices such as 16x4. These looks
// preserve recognizable horizontal structure instead of collapsing into flicker/noise.
const MATRIX_SHOW_SCENES = Object.freeze({
  intro: [
    ['flowing-gradient', 'Wide gradient', 'ocean', 0.18, 1.55],
    ['breathe', 'Color breathe', 'ultraviolet', 0.16, 1.45],
    ['matrix-flow-x', 'Slow matrix flow', 'neon', 0.28, 1.45]
  ],
  groove: [
    ['bars', 'Wide rhythm bars', 'royal', 0.26, 1.35],
    ['scanner-dual', 'Dual scanner', 'inferno', 0.36, 1.15],
    ['audio-vu-bars', 'Live VU bars', 'ice', 0.12, 1.25],
    ['audio-spectrum-mirror', 'Mirrored spectrum', 'neon', 0.14, 1.15]
  ],
  build: [
    ['color-wipe-dual', 'Dual color wipe', 'sunset', 0.30, 1.35],
    ['matrix-flow-diagonal', 'Diagonal build', 'royal', 0.30, 1.45],
    ['audio-color-bands', 'Audio color bands', 'acid', 0.16, 1.25]
  ],
  peak: [
    ['audio-bass-pulse', 'Bass pulse', 'acid', 0.16, 1.35],
    ['audio-palette-pulse', 'Palette pulse', 'sunset', 0.16, 1.30],
    ['scanner-dual', 'Peak scanner', 'inferno', 0.42, 1.10]
  ],
  release: [
    ['flowing-gradient', 'Gradient release', 'ocean', 0.16, 1.60],
    ['palette-bands', 'Palette settle', 'corporate', 0.18, 1.40],
    ['breathe', 'Breathing close', 'ultraviolet', 0.14, 1.45]
  ]
});

function buskingScene(id, direction = 1) {
  const look = BUSKING_LOOKS[id] || BUSKING_LOOKS.flow;
  const palette = PALETTES[look.palette] || PALETTES.neon;
  return { pattern: look.pattern, label: look.label, color: palette[0], secondaryColor: palette[1], speed: look.speed, scale: look.scale, direction };
}

const SCENES = Object.freeze({
  festival: {
    intro: [
      ['aurora', 'Aurora opening', 'ocean', 0.45, 1.15],
      ['starfield', 'Starfield opening', 'royal', 0.55, 1.0],
      ['flowing-gradient', 'Color atmosphere', 'sunset', 0.42, 1.2]
    ],
    groove: [
      ['audio-spectrum-mirror', 'Mirrored rhythm', 'neon', 0.9, 1.0],
      ['waves', 'Mainstage waves', 'royal', 0.85, 1.12],
      ['kaleidoscope', 'Kaleidoscope groove', 'neon', 0.72, 1.08],
      ['scanner-dual', 'Dual scanner groove', 'inferno', 1.05, 0.9]
    ],
    build: [
      ['vortex', 'Vortex build', 'magenta', 1.0, 1.15],
      ['warp-tunnel', 'Tunnel build', 'royal', 1.12, 1.05],
      ['zoom-boxes', 'Zoom build', 'acid', 1.0, 1.0],
      ['audio-ripple', 'Ripple build', 'ocean', 0.95, 1.15]
    ],
    peak: [
      ['audio-kaleidoscope', 'Kaleidoscope peak', 'neon', 1.2, 1.18],
      ['audio-beat-rings', 'Beat-ring peak', 'sunset', 1.25, 1.05],
      ['audio-starburst', 'Starburst peak', 'ice', 1.15, 1.0],
      ['lightning', 'Lightning peak', 'mono', 1.35, 1.0]
    ],
    release: [
      ['rainbow-radial', 'Rainbow release', 'royal', 0.65, 1.2],
      ['ocean', 'Ocean release', 'ocean', 0.55, 1.2],
      ['plasma', 'Plasma release', 'magenta', 0.65, 1.1]
    ]
  },
  club: {
    intro: [
      ['smoke', 'Dark room atmosphere', 'ultraviolet', 0.42, 1.15],
      ['twinkle', 'Club twinkle', 'royal', 0.45, 1.0],
      ['scanner', 'Scanner intro', 'inferno', 0.7, 0.9]
    ],
    groove: [
      ['audio-eq-grid', 'EQ groove', 'neon', 0.95, 1.0],
      ['audio-scanner', 'Audio scanner', 'inferno', 1.1, 0.9],
      ['diagonal-bars', 'Diagonal rhythm', 'royal', 0.9, 0.95],
      ['audio-color-bands', 'Color bands', 'acid', 0.9, 1.05]
    ],
    build: [
      ['pinwheel', 'Pinwheel build', 'magenta', 1.05, 1.08],
      ['audio-tunnel', 'Audio tunnel', 'royal', 1.15, 1.1],
      ['grid-pulse', 'Grid build', 'neon', 1.0, 0.95],
      ['pixel-sort', 'Digital build', 'acid', 1.1, 1.0]
    ],
    peak: [
      ['audio-kick-flash', 'Kick flash peak', 'mono', 1.3, 1.0],
      ['audio-beat-grid', 'Beat grid peak', 'neon', 1.25, 0.95],
      ['glitch', 'Glitch peak', 'magenta', 1.25, 1.0],
      ['audio-particles', 'Particle peak', 'ice', 1.2, 1.0]
    ],
    release: [
      ['lava', 'Lava release', 'sunset', 0.5, 1.2],
      ['audio-aurora', 'Aurora release', 'ocean', 0.6, 1.2],
      ['color-scroll', 'Color release', 'royal', 0.6, 1.15]
    ]
  },
  cinematic: {
    intro: [
      ['starfield', 'Cinematic stars', 'mono', 0.28, 1.05],
      ['smoke', 'Cinematic haze', 'ultraviolet', 0.28, 1.25],
      ['aurora', 'Cinematic aurora', 'ocean', 0.32, 1.25]
    ],
    groove: [
      ['ocean', 'Ocean movement', 'ocean', 0.45, 1.25],
      ['rings', 'Expanding score', 'gold', 0.48, 1.1],
      ['mandala', 'Mandala movement', 'royal', 0.42, 1.15]
    ],
    build: [
      ['warp-tunnel', 'Cinematic tunnel', 'royal', 0.68, 1.15],
      ['vortex', 'Cinematic vortex', 'magenta', 0.65, 1.2],
      ['lightning', 'Storm build', 'ice', 0.72, 1.05]
    ],
    peak: [
      ['audio-starburst', 'Score starburst', 'gold', 0.85, 1.15],
      ['audio-ripple', 'Impact ripple', 'ocean', 0.82, 1.2],
      ['kaleidoscope', 'Cinematic climax', 'royal', 0.78, 1.2]
    ],
    release: [
      ['flowing-gradient', 'Closing gradient', 'sunset', 0.3, 1.3],
      ['twinkle', 'Closing stars', 'ice', 0.32, 1.0],
      ['aurora', 'Closing aurora', 'ocean', 0.3, 1.3]
    ]
  },
  ambient: {
    intro: [
      ['flowing-gradient', 'Ambient gradient', 'ocean', 0.2, 1.4],
      ['aurora', 'Ambient aurora', 'ultraviolet', 0.22, 1.35],
      ['twinkle', 'Ambient twinkle', 'ice', 0.2, 1.0]
    ],
    groove: [
      ['waves', 'Ambient waves', 'ocean', 0.3, 1.3],
      ['lava', 'Ambient lava', 'sunset', 0.26, 1.35],
      ['metaballs', 'Ambient metaballs', 'royal', 0.28, 1.3]
    ],
    build: [
      ['ripple-pool', 'Ambient ripples', 'ocean', 0.38, 1.2],
      ['mandala', 'Ambient mandala', 'magenta', 0.34, 1.25],
      ['plasma', 'Ambient plasma', 'royal', 0.36, 1.25]
    ],
    peak: [
      ['audio-aurora', 'Reactive aurora', 'ocean', 0.48, 1.25],
      ['audio-kaleidoscope', 'Soft kaleidoscope', 'royal', 0.45, 1.25],
      ['rainbow-radial', 'Soft rainbow', 'ice', 0.42, 1.25]
    ],
    release: [
      ['smoke', 'Ambient release', 'ultraviolet', 0.2, 1.4],
      ['ocean', 'Ocean release', 'ocean', 0.2, 1.35],
      ['gradient', 'Color rest', 'royal', 0.18, 1.2]
    ]
  },
  corporate: {
    intro: [
      ['flowing-gradient', 'Brand opening', 'corporate', 0.28, 1.25],
      ['grid-pulse', 'Precision opening', 'corporate', 0.35, 1.0],
      ['twinkle', 'Premium sparkle', 'ice', 0.28, 1.0]
    ],
    groove: [
      ['waves', 'Polished waves', 'corporate', 0.42, 1.15],
      ['palette-bands', 'Brand bands', 'corporate', 0.4, 1.0],
      ['scanner-dual', 'Precision scanner', 'ice', 0.52, 0.95]
    ],
    build: [
      ['zoom-boxes', 'Presentation build', 'corporate', 0.55, 1.0],
      ['rings', 'Launch rings', 'gold', 0.52, 1.05],
      ['mandala', 'Premium geometry', 'corporate', 0.5, 1.08]
    ],
    peak: [
      ['audio-spectrum-mirror', 'Event spectrum', 'corporate', 0.65, 1.0],
      ['kaleidoscope', 'Launch moment', 'royal', 0.62, 1.08],
      ['audio-starburst', 'Reveal starburst', 'gold', 0.68, 1.0]
    ],
    release: [
      ['gradient', 'Brand settle', 'corporate', 0.25, 1.2],
      ['ocean', 'Cool settle', 'ocean', 0.28, 1.2],
      ['twinkle', 'Premium close', 'ice', 0.25, 1.0]
    ]
  }
});

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value || 'show')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function randomAt(seed, index) {
  let value = (seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function normalizedAudio(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    level: clamp(source.level), sub: clamp(source.sub), bass: clamp(source.bass), lowMid: clamp(source.lowMid),
    mid: clamp(source.mid), highMid: clamp(source.highMid), treble: clamp(source.treble), beat: clamp(source.beat),
    kick: clamp(source.kick), snare: clamp(source.snare), hihat: clamp(source.hihat), flux: clamp(source.flux),
    spectrum: Array.isArray(source.spectrum) || ArrayBuffer.isView(source.spectrum) ? Array.from(source.spectrum) : Array(32).fill(0),
    waveform: Array.isArray(source.waveform) || ArrayBuffer.isView(source.waveform) ? Array.from(source.waveform) : Array(64).fill(0)
  };
}

function sectionForIndex(index) {
  const sequence = ['intro', 'groove', 'build', 'peak', 'groove', 'build', 'peak', 'release'];
  return sequence[((index % sequence.length) + sequence.length) % sequence.length];
}

function energyTier(energy, section) {
  if (section === 'intro' || section === 'release') return section;
  if (energy > 0.72) return 'peak';
  if (energy > 0.46) return section === 'build' ? 'build' : 'groove';
  if (energy > 0.25) return 'groove';
  return 'intro';
}

function sceneFromTuple(tuple, paletteName, direction = 1) {
  const [pattern, label, ownPalette, speed, scale] = tuple;
  const palette = PALETTES[ownPalette || paletteName] || PALETTES.neon;
  return { pattern, label, color: palette[0], secondaryColor: palette[1], speed, scale, direction };
}

function blendFrames(a, b, amount) {
  const t = smoothstep(amount);
  const length = Math.min(a.length, b.length);
  const frame = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) frame[index] = Math.round(a[index] * (1 - t) + b[index] * t);
  return frame;
}

function screenAccent(frame, accent, amount) {
  const t = clamp(amount);
  if (t <= 0.001) return frame;
  const result = new Uint8Array(frame.length);
  for (let index = 0; index < frame.length; index += 1) {
    const base = frame[index] / 255;
    const add = accent[index] / 255 * t;
    result[index] = Math.round((1 - (1 - base) * (1 - add)) * 255);
  }
  return result;
}

function hexToRgb(color = '#ffffff') {
  const value = String(color || '#ffffff').replace('#', '').trim();
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value.padEnd(6, 'f').slice(0, 6);
  return [parseInt(normalized.slice(0, 2), 16) || 0, parseInt(normalized.slice(2, 4), 16) || 0, parseInt(normalized.slice(4, 6), 16) || 0];
}

function gainFrame(frame, gain = 1, contrast = 1) {
  const output = new Uint8Array(frame.length);
  for (let index = 0; index < frame.length; index += 1) {
    const centered = ((frame[index] / 255) - 0.5) * contrast + 0.5;
    output[index] = Math.round(clamp(centered * gain) * 255);
  }
  return output;
}

function tintFrame(frame, color, amount = 0) {
  const t = clamp(amount);
  if (t <= 0.001) return frame;
  const [r, g, b] = hexToRgb(color);
  const output = new Uint8Array(frame.length);
  for (let index = 0; index < frame.length; index += 3) {
    output[index] = Math.round(frame[index] * (1 - t) + r * t);
    output[index + 1] = Math.round(frame[index + 1] * (1 - t) + g * t);
    output[index + 2] = Math.round(frame[index + 2] * (1 - t) + b * t);
  }
  return output;
}

function solidFrame(length, color = '#ffffff', brightness = 1) {
  const [r, g, b] = hexToRgb(color);
  const frame = new Uint8Array(length);
  for (let index = 0; index < length; index += 3) {
    frame[index] = Math.round(r * brightness);
    frame[index + 1] = Math.round(g * brightness);
    frame[index + 2] = Math.round(b * brightness);
  }
  return frame;
}

function performanceMix(a, b, amount, width, height, mode = 'crossfade') {
  const t = smoothstep(amount);
  if (t <= 0.001) return a;
  if (t >= 0.999) return b;
  if (mode === 'crossfade') return blendFrames(a, b, t);
  const output = new Uint8Array(Math.min(a.length, b.length));
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  for (let pixel = 0; pixel < Math.floor(output.length / 3); pixel += 1) {
    const x = pixel % w;
    const y = Math.floor(pixel / w);
    let local = t;
    if (mode === 'wipe') {
      const edge = t * (w + 2) - 1;
      local = clamp(edge - x + 0.5);
    } else if (mode === 'vertical') {
      const edge = t * (h + 2) - 1;
      local = clamp(edge - y + 0.5);
    } else if (mode === 'checker') {
      const order = ((x & 1) + (y & 1) * 2) / 4;
      local = clamp((t - order) * 3.2 + 0.5);
    } else if (mode === 'luma') {
      const base = pixel * 3;
      const luminance = (b[base] * 0.2126 + b[base + 1] * 0.7152 + b[base + 2] * 0.0722) / 255;
      local = clamp((t - (1 - luminance)) * 4 + 0.5);
    }
    const base = pixel * 3;
    for (let channel = 0; channel < 3; channel += 1) output[base + channel] = Math.round(a[base + channel] * (1 - local) + b[base + channel] * local);
  }
  return output;
}

function gestureEnvelope(now, gesture) {
  if (!gesture || now < gesture.startedAt || now > gesture.startedAt + gesture.duration) return 0;
  const phase = clamp((now - gesture.startedAt) / Math.max(0.001, gesture.duration));
  return Math.sin(Math.PI * (0.12 + phase * 0.88));
}

function showSignature(input) {
  return [input.showStyle, input.showSeed, input.showSceneBeats, input.width, input.height, input.matrixClarity].join('|');
}

const GESTURE_LABELS = Object.freeze({
  punch: 'Fader punch', white: 'White hit', blackout: 'Blackout tap', freeze: 'Frame freeze', strobe: 'Strobe burst',
  color: 'Palette hit', tease: 'Deck B tease', ride: 'Intensity ride', reverse: 'Reverse nudge', shimmer: 'Hi-hat shimmer'
});

export class AdaptiveShowDirector {
  constructor() { this.reset(); }

  reset(input = {}) {
    const now = Number(input.timeSeconds) || 0;
    this.signature = showSignature(input);
    this.seed = hashString(input.showSeed || `${input.showStyle || 'festival'}-ledcontroller`);
    this.sceneIndex = 0;
    this.sceneStartedAt = now;
    this.currentScene = null;
    this.queuedScene = null;
    this.queuedSection = null;
    this.mixStartedAt = null;
    this.mixMode = 'crossfade';
    this.energy = 0;
    this.previousEnergy = 0;
    this.recentPatterns = [];
    this.lastAdvanceToken = Number(input.showAdvanceToken) || 0;
    this.lastLookToken = Number(input.showLookToken) || 0;
    this.manualLookId = String(input.showLookId || 'flow');
    this.lastReverseToken = Number(input.showReverseToken) || 0;
    this.lastColorToken = Number(input.showColorToken) || 0;
    this.manualTokens = {
      punch: Number(input.showPunchToken) || 0, white: Number(input.showWhiteToken) || 0,
      blackout: Number(input.showBlackoutToken) || 0, freeze: Number(input.showFreezeToken) || 0,
      strobe: Number(input.showStrobeToken) || 0
    };
    this.lastTime = now;
    this.lastSection = 'intro';
    this.lastReason = 'show started';
    this.lastBeatIndex = -1;
    this.lastBarIndex = -1;
    this.gesture = null;
    this.frozenFrame = null;
    this.lastRenderedFrame = null;
    this.operatorMove = 'Establishing first look';
    this.teaseUntil = 0;
    this.teaseAmount = 0;
    this.lastKickAt = -10;
    this.lastSnareAt = -10;
    this.lastHatAt = -10;
  }

  forceNext() { this.lastAdvanceToken -= 1; }

  chooseScene(input, section, energy, indexOffset = 0) {
    const style = SCENES[input.showStyle] ? input.showStyle : 'festival';
    const adaptive = input.showAdaptive !== false;
    const tier = adaptive ? energyTier(energy, section) : section;
    const minDimension = Math.max(1, Math.min(Number(input.width) || 16, Number(input.height) || 16));
    const matrixOptimized = input.matrixClarity === 'optimized' || (input.matrixClarity !== 'full' && minDimension <= 8);
    const library = matrixOptimized
      ? (MATRIX_SHOW_SCENES[tier] || MATRIX_SHOW_SCENES.groove)
      : (SCENES[style][tier] || SCENES[style].groove);
    const variation = clamp(input.showVariation ?? 0.55);
    const choiceIndex = this.sceneIndex + indexOffset;
    const candidateOffset = Math.floor(randomAt(this.seed, choiceIndex * 11 + Math.round(variation * 17)) * library.length);
    let selected = null;
    let matrixFallback = null;
    for (let offset = 0; offset < library.length; offset += 1) {
      const tuple = library[(candidateOffset + offset) % library.length];
      if (matrixOptimized && !isMatrixFriendlyPattern(tuple[0])) continue;
      if (!matrixFallback) matrixFallback = tuple;
      if (!this.recentPatterns.includes(tuple[0]) || offset === library.length - 1) { selected = tuple; break; }
    }
    if (!selected) selected = matrixFallback || ['matrix-flow-x', 'Matrix flow', 'neon', 0.65, 1];
    const direction = randomAt(this.seed, choiceIndex * 19 + 3) > 0.38 ? 1 : -1;
    return sceneFromTuple(selected, null, direction);
  }

  establishInitial(input, now) {
    this.lastSection = sectionForIndex(0);
    this.currentScene = String(input.showControlMode || 'auto') === 'busking'
      ? buskingScene(input.showLookId || 'flow', 1)
      : this.chooseScene(input, this.lastSection, this.energy, 0);
    this.sceneStartedAt = now;
    this.recentPatterns = [this.currentScene.pattern];
    this.lastReason = 'show started · deck A live';
    this.operatorMove = 'Deck A established';
  }

  cueNext(input, now, reason = 'deck B cued') {
    if (this.queuedScene) return;
    this.queuedSection = sectionForIndex(this.sceneIndex + 1);
    this.queuedScene = this.chooseScene(input, this.queuedSection, this.energy, 1);
    this.lastReason = reason;
    this.operatorMove = `Cueing ${this.queuedScene.label}`;
    this.teaseUntil = now + Math.min(1.2, 60 / clamp(input.showBpm || 120, 45, 220) * 2);
    this.teaseAmount = 0.12 + clamp(input.showPerformance ?? 0.8) * 0.12;
  }

  startMix(input, now, reason = 'crossfader move') {
    if (!this.queuedScene) this.cueNext(input, now, reason);
    if (!this.queuedScene || this.mixStartedAt !== null) return;
    this.mixStartedAt = now;
    const modes = input.showMixStyle === 'smooth' ? ['crossfade', 'wipe']
      : input.showMixStyle === 'cuts' ? ['checker', 'wipe', 'vertical', 'luma']
        : ['crossfade', 'wipe', 'luma', 'checker', 'vertical'];
    this.mixMode = modes[Math.floor(randomAt(this.seed, this.sceneIndex * 29 + 7) * modes.length) % modes.length];
    this.lastReason = reason;
    this.operatorMove = `${this.mixMode} mix to deck B`;
  }

  promoteQueued(now) {
    if (!this.queuedScene) return;
    this.currentScene = this.queuedScene;
    this.queuedScene = null;
    this.lastSection = this.queuedSection || sectionForIndex(this.sceneIndex + 1);
    this.queuedSection = null;
    this.sceneIndex += 1;
    this.sceneStartedAt = now;
    this.mixStartedAt = null;
    this.recentPatterns.push(this.currentScene.pattern);
    if (this.recentPatterns.length > 5) this.recentPatterns.shift();
    this.operatorMove = 'Crossfader landed on deck A';
  }

  triggerGesture(type, now, duration, amount = 1, manual = false) {
    if (this.gesture && this.gesture.manual && !manual && now < this.gesture.startedAt + this.gesture.duration) return;
    this.gesture = { type, startedAt: now, duration: Math.max(0.05, duration), amount: clamp(amount), manual };
    this.operatorMove = GESTURE_LABELS[type] || type;
    if (type === 'freeze') this.frozenFrame = this.lastRenderedFrame ? new Uint8Array(this.lastRenderedFrame) : null;
  }

  handleManualLook(input, now) {
    const token = Number(input.showLookToken) || 0;
    const lookId = String(input.showLookId || 'flow');
    if (token === this.lastLookToken && lookId === this.manualLookId) return;
    this.lastLookToken = token;
    this.manualLookId = lookId;
    this.queuedScene = buskingScene(lookId, randomAt(this.seed, token + 91) > 0.45 ? 1 : -1);
    this.queuedSection = 'live';
    this.mixStartedAt = now;
    this.mixMode = String(input.showMixStyle || 'hybrid') === 'cuts' ? 'checker' : 'crossfade';
    this.lastReason = `operator selected ${this.queuedScene.label}`;
    this.operatorMove = `TAKE ${this.queuedScene.label}`;
  }

  handleManualGestures(input, now) {
    const definitions = [
      ['punch', 'showPunchToken', 0.42, 1], ['white', 'showWhiteToken', 0.22, 1],
      ['blackout', 'showBlackoutToken', 0.28, 1], ['freeze', 'showFreezeToken', 0.9, 1],
      ['strobe', 'showStrobeToken', input.showStrobeSafe === false ? 0.9 : 0.65, 1]
    ];
    for (const [type, field, duration, amount] of definitions) {
      const token = Number(input[field]) || 0;
      if (token !== this.manualTokens[type]) {
        this.manualTokens[type] = token;
        this.triggerGesture(type, now, duration, amount, true);
        this.lastReason = `manual ${GESTURE_LABELS[type].toLowerCase()}`;
      }
    }
    const reverseToken = Number(input.showReverseToken) || 0;
    if (reverseToken !== this.lastReverseToken) {
      this.lastReverseToken = reverseToken;
      this.triggerGesture('reverse', now, 60 / clamp(input.showBpm || 120, 45, 220) * 4, 1, true);
      this.lastReason = 'manual direction flip';
    }
    const colorToken = Number(input.showColorToken) || 0;
    if (colorToken !== this.lastColorToken) {
      this.lastColorToken = colorToken;
      this.triggerGesture('color', now, 0.45, 1, true);
      this.lastReason = 'manual palette hit';
    }
  }

  scheduleOperatorMove(input, now, audio, newBeat, newBar) {
    const performance = clamp(input.showPerformance ?? 0.8);
    const density = clamp(input.showGestureRate ?? 0.30);
    // Transients are handled immediately instead of waiting for the internal beat clock.
    if (audio.kick > 0.62 && now - this.lastKickAt > 0.24) {
      this.lastKickAt = now;
      this.triggerGesture('punch', now, 0.22, clamp(audio.kick * performance * 1.15), false);
    } else if (audio.snare > 0.68 && now - this.lastSnareAt > 0.28) {
      this.lastSnareAt = now;
      this.triggerGesture('color', now, 0.18, clamp(audio.snare * performance), false);
    } else if (audio.hihat > 0.74 && now - this.lastHatAt > 0.20) {
      this.lastHatAt = now;
      this.triggerGesture('shimmer', now, 0.12, clamp(audio.hihat * performance * 0.75), false);
    }
    if (!newBar || performance < 0.15) return;
    const beatSeconds = 60 / clamp(input.showBpm || 120, 45, 220);
    if (now - this.sceneStartedAt < beatSeconds * 2) return;
    const chance = randomAt(this.seed, this.lastBarIndex * 37 + this.sceneIndex * 13);
    if (chance > density * (0.35 + performance * 0.55)) return;
    const matrixOptimized = input.matrixClarity === 'optimized' || (input.matrixClarity !== 'full' && Math.min(Number(input.width) || 16, Number(input.height) || 16) <= 8);
    const highEnergy = this.energy > 0.62;
    const choices = matrixOptimized
      ? (highEnergy ? ['tease', 'ride', 'color', 'reverse'] : ['tease', 'ride', 'color'])
      : (highEnergy ? ['tease', 'ride', 'white', 'blackout', 'reverse', 'strobe', 'color'] : ['tease', 'ride', 'color', 'reverse', 'freeze']);
    const choice = choices[Math.floor(randomAt(this.seed, this.lastBarIndex * 41 + 5) * choices.length) % choices.length];
    if (choice === 'tease' && this.queuedScene) {
      this.teaseUntil = now + 60 / clamp(input.showBpm || 120, 45, 220) * 2;
      this.teaseAmount = 0.16 + performance * 0.18;
      this.operatorMove = 'Deck B tease on the bar';
    } else if (choice === 'ride') this.triggerGesture('ride', now, 60 / clamp(input.showBpm || 120, 45, 220) * 4, performance, false);
    else if (choice === 'white' && performance > 0.55) this.triggerGesture('white', now, 0.16, performance * 0.75, false);
    else if (choice === 'blackout' && performance > 0.68) this.triggerGesture('blackout', now, 0.16, performance, false);
    else if (choice === 'strobe' && performance > 0.75) this.triggerGesture('strobe', now, input.showStrobeSafe === false ? 0.75 : 0.5, performance * 0.75, false);
    else if (choice === 'freeze') this.triggerGesture('freeze', now, 0.45, performance * 0.7, false);
    else if (choice === 'reverse') this.triggerGesture('reverse', now, 60 / clamp(input.showBpm || 120, 45, 220) * 4, performance, false);
    else this.triggerGesture('color', now, 0.35, performance * 0.8, false);
  }

  renderScene(input, scene, audio, intensity, variation, directionMultiplier = 1) {
    return renderVisualFrame({
      ...input,
      pattern: scene.pattern,
      color: scene.color,
      secondaryColor: scene.secondaryColor,
      // Motion rate is fully literal. Neither audio energy nor show intensity may
      // alter the master animation clock, so browser focus cannot change LED speed.
      speed: clamp(scene.speed * clamp(Number(input.speed) || 1, 0.1, 8) * clamp(Number(input.showRate) || 1, 0.25, 4), 0.16, 8),
      scale: scene.scale * (0.92 + variation * 0.2),
      direction: scene.direction * directionMultiplier,
      brightness: clamp((Number(input.brightness) || 0.35) * (0.78 + intensity * 0.34 + this.energy * 0.13), 0.02, 1),
      audioEnabled: input.showAudioSync !== false && input.audioEnabled !== false,
      // Show Mode uses the same browser-independent master clock as normal output.
      // Audio remains available to the pattern and performance-gesture layers, but
      // it cannot alter accumulated motion speed or animation phase.
      audioMotion: 0,
      audio
    });
  }

  applyPerformance(frame, input, now, scene, audio) {
    const envelope = gestureEnvelope(now, this.gesture);
    if (!this.gesture || envelope <= 0) {
      if (this.gesture && now > this.gesture.startedAt + this.gesture.duration) {
        this.gesture = null;
        this.frozenFrame = null;
      }
      return frame;
    }
    const amount = envelope * this.gesture.amount;
    switch (this.gesture.type) {
      case 'punch': return gainFrame(frame, 1 + amount * 0.8, 1 + amount * 0.45);
      case 'white': return blendFrames(frame, solidFrame(frame.length, '#ffffff'), amount * 0.9);
      case 'blackout': return gainFrame(frame, 1 - amount * 0.98, 1);
      case 'freeze': return this.frozenFrame ? new Uint8Array(this.frozenFrame) : frame;
      case 'strobe': {
        const frequency = input.showStrobeSafe === false ? 8 : 4;
        const on = Math.floor((now - this.gesture.startedAt) * frequency * 2) % 2 === 0;
        return on ? blendFrames(frame, solidFrame(frame.length, '#ffffff'), amount * 0.75) : gainFrame(frame, 0.1, 1);
      }
      case 'color': return tintFrame(frame, scene.secondaryColor, amount * 0.62);
      case 'ride': return gainFrame(frame, 0.82 + amount * 0.65, 1 + amount * 0.18);
      case 'shimmer': return tintFrame(gainFrame(frame, 1 + amount * 0.25, 1.05), '#ffffff', amount * 0.18);
      default: return frame;
    }
  }

  render(input = {}) {
    const now = Math.max(0, Number(input.timeSeconds) || 0);
    if (now < this.lastTime || this.signature !== showSignature(input)) this.reset(input);
    this.lastTime = now;
    const audio = normalizedAudio(input.audio);
    const hasAudio = input.showAudioSync !== false && input.audioEnabled !== false;
    const fallbackPulse = 0.42 + 0.2 * Math.sin(now * 0.7) + 0.12 * Math.sin(now * 1.7 + 1.1);
    const rawEnergy = hasAudio
      ? clamp(audio.level * 0.2 + audio.sub * 0.18 + audio.bass * 0.2 + audio.mid * 0.12 + audio.highMid * 0.07 + audio.treble * 0.05 + audio.kick * 0.12 + audio.snare * 0.06)
      : clamp(fallbackPulse);
    this.previousEnergy = this.energy;
    this.energy += (rawEnergy - this.energy) * (rawEnergy > this.energy ? 0.2 : 0.06);

    const bpm = clamp(input.showBpm || 120, 45, 220);
    const beatFloat = now * bpm / 60;
    const beatIndex = Math.floor(beatFloat);
    const barIndex = Math.floor(beatIndex / 4);
    const newBeat = beatIndex !== this.lastBeatIndex;
    const newBar = barIndex !== this.lastBarIndex;
    this.lastBeatIndex = beatIndex;
    this.lastBarIndex = barIndex;

    if (!this.currentScene) this.establishInitial(input, now);
    this.handleManualLook(input, now);
    this.handleManualGestures(input, now);
    this.scheduleOperatorMove(input, now, audio, newBeat, newBar);

    const sceneBeats = clamp(input.showSceneBeats || 32, 8, 128);
    const sceneDuration = Math.max(4, sceneBeats * 60 / bpm);
    const beatSeconds = 60 / bpm;
    const transitionSeconds = clamp(input.showTransitionSeconds ?? 1.4, 0, 8);
    const elapsed = now - this.sceneStartedAt;
    const cueLead = Math.max(transitionSeconds + beatSeconds, beatSeconds * 4);
    const advanceToken = Number(input.showAdvanceToken) || 0;
    const manualAdvance = advanceToken !== this.lastAdvanceToken;
    if (manualAdvance) this.lastAdvanceToken = advanceToken;
    const dramaticPeak = input.showAdaptive !== false && elapsed > sceneDuration * 0.4 && this.energy > 0.82 && this.previousEnergy < 0.68 && audio.kick > 0.65;
    const dramaticDrop = input.showAdaptive !== false && elapsed > sceneDuration * 0.5 && this.previousEnergy > 0.55 && this.energy < 0.2;

    const controlMode = String(input.showControlMode || 'auto');
    const autoChanges = controlMode === 'auto' || (controlMode === 'assist' && elapsed >= sceneDuration);
    if (autoChanges && !this.queuedScene && elapsed >= Math.max(0, sceneDuration - cueLead)) this.cueNext(input, now, 'assistant cued the next look');
    if (manualAdvance) this.startMix(input, now, 'manual next look');
    else if (controlMode === 'auto' && dramaticPeak) this.startMix(input, now, 'operator caught a musical peak');
    else if (controlMode === 'auto' && dramaticDrop) this.startMix(input, now, 'operator cut on a musical drop');
    else if (autoChanges && elapsed >= sceneDuration) this.startMix(input, now, controlMode === 'auto' ? 'musical phrase complete' : 'assisted phrase change');

    let crossfader = 0;
    if (this.mixStartedAt !== null) {
      crossfader = transitionSeconds <= 0 ? 1 : clamp((now - this.mixStartedAt) / transitionSeconds);
      if (crossfader >= 1) {
        this.promoteQueued(now);
        crossfader = 0;
      }
    }

    const intensity = clamp(input.showIntensity ?? 0.72);
    const variation = clamp(input.showVariation ?? 0.55);
    const reverseNudge = this.gesture?.type === 'reverse' && gestureEnvelope(now, this.gesture) > 0 ? -1 : 1;
    let frame = this.renderScene(input, this.currentScene, audio, intensity, variation, reverseNudge);
    let deckBFrame = null;
    if (this.queuedScene) deckBFrame = this.renderScene(input, this.queuedScene, audio, intensity, variation, 1);
    if (deckBFrame && this.mixStartedAt !== null) frame = performanceMix(frame, deckBFrame, crossfader, input.width, input.height, this.mixMode);
    else if (deckBFrame && now < this.teaseUntil) {
      const teasePhase = 1 - clamp((this.teaseUntil - now) / Math.max(0.1, beatSeconds * 2));
      const pulse = Math.sin(Math.PI * teasePhase);
      frame = performanceMix(frame, deckBFrame, this.teaseAmount * pulse, input.width, input.height, 'checker');
    }

    if (hasAudio && intensity > 0.4 && (audio.kick > 0.22 || audio.snare > 0.34)) {
      const accent = renderVisualFrame({
        ...input, pattern: audio.kick >= audio.snare ? 'audio-kick-flash' : 'audio-starburst',
        color: '#ffffff', secondaryColor: this.currentScene.color,
        brightness: clamp(intensity * 0.75), scale: 1, audioEnabled: true, audio
      });
      frame = screenAccent(frame, accent, clamp((audio.kick * 0.24 + audio.snare * 0.16) * intensity));
    }

    frame = this.applyPerformance(frame, input, now, this.currentScene, audio);
    this.lastRenderedFrame = new Uint8Array(frame);
    const remainingSeconds = Math.max(0, sceneDuration - (now - this.sceneStartedAt));
    const activeGesture = this.gesture && gestureEnvelope(now, this.gesture) > 0 ? GESTURE_LABELS[this.gesture.type] : this.operatorMove;
    return {
      frame,
      status: {
        enabled: true, style: input.showStyle || 'festival',
        currentLook: this.mixStartedAt !== null && this.queuedScene ? `${this.currentScene.label} → ${this.queuedScene.label}` : this.currentScene.label,
        currentPattern: this.mixStartedAt !== null && this.queuedScene ? this.queuedScene.pattern : this.currentScene.pattern,
        deckA: this.currentScene.label, deckB: this.queuedScene?.label || 'Not cued',
        section: this.lastSection, energy: this.energy, sceneIndex: this.sceneIndex,
        sceneDuration, remainingSeconds, transitionProgress: crossfader, crossfader,
        mixMode: this.mixStartedAt !== null ? this.mixMode : (this.queuedScene ? 'deck B cued' : 'deck A live'),
        operatorMove: activeGesture || 'Holding the look',
        beat: beatIndex % 4 + 1, bar: barIndex + 1,
        adaptive: input.showAdaptive !== false, audioSync: hasAudio, reason: this.lastReason,
        performance: clamp(input.showPerformance ?? 0.8), gestureRate: clamp(input.showGestureRate ?? 0.30),
        controlMode: String(input.showControlMode || 'auto'), showRate: clamp(Number(input.showRate) || 1, 0.25, 4), activeLookId: this.manualLookId,
        matrixOptimized: input.matrixClarity === 'optimized' || (input.matrixClarity !== 'full' && Math.min(Number(input.width) || 16, Number(input.height) || 16) <= 8),
        palette: [this.currentScene.color, this.currentScene.secondaryColor]
      }
    };
  }
}

export function renderShowFrame(input = {}, director = new AdaptiveShowDirector()) { return director.render(input); }
