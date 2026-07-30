import dgram from 'node:dgram';
import { clamp, parseHexColor, renderVisualFrame } from '../public/visual-engine.js';
import { normalizeLayerStack, renderLayerStack } from '../public/layer-engine.js';
import { AdaptiveShowDirector, renderShowFrame } from '../public/show-engine.js';

export { parseHexColor };

export class OutputOwnershipError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'OutputOwnershipError';
    this.statusCode = 409;
    this.details = details;
  }
}

function normalizeOwner(value) {
  const owner = String(value || 'anonymous').trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(owner) ? owner : 'anonymous';
}

function reorder(rgb, order) {
  const map = { R: rgb[0], G: rgb[1], B: rgb[2] };
  const normalized = /^[RGB]{3}$/.test(order) ? order : 'RGB';
  return [map[normalized[0]], map[normalized[1]], map[normalized[2]]];
}

export function pixelMapFingerprint(pixelMap) {
  if (!Array.isArray(pixelMap) || !pixelMap.length) return '';
  let hash = 0x811c9dc5;
  for (const value of pixelMap) {
    const number = Number(value) >>> 0;
    for (let shift = 0; shift < 32; shift += 8) {
      hash ^= (number >>> shift) & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, '0').toUpperCase();
}

export function normalizePixelMap(pixelMap, pixels, physicalPixels = pixels) {
  if (pixelMap === undefined || pixelMap === null) return null;
  if (!Array.isArray(pixelMap) || pixelMap.length !== pixels) {
    throw new Error(`Pixel map must contain exactly ${pixels} logical entries`);
  }
  const physicalCount = clamp(Math.trunc(Number(physicalPixels) || pixels), 1, 262144);
  const normalized = pixelMap.map((value) => Number(value));
  const seen = new Set();
  for (const physical of normalized) {
    if (physical === -1) continue;
    if (!Number.isInteger(physical) || physical < 0 || physical >= physicalCount) {
      throw new Error(`Pixel map addresses must be -1 or integers from 0 to ${physicalCount - 1}`);
    }
    if (seen.has(physical)) throw new Error(`Pixel map contains duplicate physical address ${physical}`);
    seen.add(physical);
  }
  return normalized;
}

export function applyPixelMap(frame, pixelMap, physicalPixels = null) {
  if (!pixelMap) return frame;
  const logicalPixels = frame.length / 3;
  const inferredPhysical = physicalPixels ?? (Math.max(-1, ...pixelMap.map(Number)) + 1);
  const physicalCount = clamp(Math.trunc(Number(inferredPhysical) || logicalPixels), 1, 262144);
  const normalized = normalizePixelMap(pixelMap, logicalPixels, physicalCount);
  const mapped = Buffer.alloc(physicalCount * 3);
  for (let logical = 0; logical < logicalPixels; logical += 1) {
    const physical = normalized[logical];
    if (physical < 0) continue;
    frame.copy(mapped, physical * 3, logical * 3, logical * 3 + 3);
  }
  return mapped;
}


export function applyControllerDirection(frame, direction = 'forward') {
  if (String(direction).toLowerCase() !== 'reverse') return frame;
  const pixels = Math.floor(frame.length / 3);
  const reversed = Buffer.alloc(frame.length);
  for (let cablePixel = 0; cablePixel < pixels; cablePixel += 1) {
    const controllerPixel = pixels - 1 - cablePixel;
    frame.copy(reversed, controllerPixel * 3, cablePixel * 3, cablePixel * 3 + 3);
  }
  return reversed;
}

export function encodeLogicalFrame(raw, {
  width,
  height,
  channelOrder = 'RGB',
  pixelMap = null,
  physicalPixels = null,
  controllerDirection = 'forward'
} = {}) {
  const w = clamp(Number(width) || 16, 1, 512);
  const h = clamp(Number(height) || 16, 1, 512);
  const pixels = w * h;
  if (!raw || raw.length < pixels * 3) throw new Error(`Logical frame must contain ${pixels * 3} RGB bytes`);
  const logicalFrame = Buffer.alloc(pixels * 3);
  for (let index = 0; index < pixels; index += 1) {
    const rgb = [raw[index * 3], raw[index * 3 + 1], raw[index * 3 + 2]];
    const ordered = reorder(rgb, channelOrder);
    logicalFrame[index * 3] = ordered[0];
    logicalFrame[index * 3 + 1] = ordered[1];
    logicalFrame[index * 3 + 2] = ordered[2];
  }
  const mappedFrame = applyPixelMap(logicalFrame, pixelMap, physicalPixels);
  return applyControllerDirection(mappedFrame, controllerDirection);
}

export function generateLogicalFrame(config = {}) {
  const w = clamp(Number(config.width) || 16, 1, 512);
  const h = clamp(Number(config.height) || 16, 1, 512);
  const renderConfig = {
    brightness: 1,
    secondaryColor: '#2457ff',
    speed: 1,
    scale: 1,
    direction: 1,
    ...config,
    width: w,
    height: h
  };
  return Buffer.from(Array.isArray(config.layers) ? renderLayerStack(renderConfig) : renderVisualFrame(renderConfig));
}

export function generateFrame(config = {}) {
  const w = clamp(Number(config.width) || 16, 1, 512);
  const h = clamp(Number(config.height) || 16, 1, 512);
  const raw = generateLogicalFrame({ ...config, width: w, height: h });
  return encodeLogicalFrame(raw, { ...config, width: w, height: h });
}


function frameHash(frame = Buffer.alloc(0)) {
  const bytes = Buffer.from(frame || []);
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function frameAverageRgb(frame = Buffer.alloc(0)) {
  const bytes = Buffer.from(frame || []);
  const pixels = Math.max(1, Math.floor(bytes.length / 3));
  let red = 0, green = 0, blue = 0;
  for (let index = 0; index + 2 < bytes.length; index += 3) {
    red += bytes[index]; green += bytes[index + 1]; blue += bytes[index + 2];
  }
  return {
    r: Math.round(red / pixels),
    g: Math.round(green / pixels),
    b: Math.round(blue / pixels)
  };
}

function frameDifferencePercent(left = Buffer.alloc(0), right = Buffer.alloc(0)) {
  const a = Buffer.from(left || []);
  const b = Buffer.from(right || []);
  const pixels = Math.min(Math.floor(a.length / 3), Math.floor(b.length / 3));
  if (!pixels) return 0;
  let changed = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 3;
    const delta = Math.abs(a[offset] - b[offset]) + Math.abs(a[offset + 1] - b[offset + 1]) + Math.abs(a[offset + 2] - b[offset + 2]);
    if (delta >= 6) changed += 1;
  }
  return Math.round(changed / pixels * 1000) / 10;
}

export function mixVisualFrames(frameA, frameB, amount = 0, mode = 'crossfade', width = 1, height = 1) {
  const a = Buffer.from(frameA || []);
  const b = Buffer.from(frameB || []);
  if (a.length !== b.length) throw new Error('Deck frames must have the same RGB byte length');
  const mix = clamp(Number(amount) || 0, 0, 1);
  // The crossfader endpoints are hard solos in every blend mode.
  // A/B cut buttons must never leave the opposite deck in the physical frame.
  if (mix <= 0) return a;
  if (mix >= 1) return b;
  const output = Buffer.alloc(a.length);
  const pixels = Math.floor(a.length / 3);
  const w = Math.max(1, Math.trunc(Number(width) || pixels));
  const h = Math.max(1, Math.trunc(Number(height) || 1));
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const x = pixel % w;
    const y = Math.floor(pixel / w);
    const lumaB = (Number(b[pixel * 3]) * 0.2126 + Number(b[pixel * 3 + 1]) * 0.7152 + Number(b[pixel * 3 + 2]) * 0.0722) / 255;
    let spatial = mix;
    if (mode === 'wipe-x') spatial = (x + 0.5) / w <= mix ? 1 : 0;
    if (mode === 'wipe-y') spatial = (y + 0.5) / h <= mix ? 1 : 0;
    if (mode === 'luma') spatial = clamp((lumaB - (1 - mix)) * 6 + 0.5, 0, 1);
    for (let channel = 0; channel < 3; channel += 1) {
      const av = Number(a[pixel * 3 + channel] || 0);
      const bv = Number(b[pixel * 3 + channel] || 0);
      let value;
      if (mode === 'add') value = av + bv * mix;
      else if (mode === 'screen') value = 255 - (255 - av) * (255 - bv * mix) / 255;
      else if (mode === 'multiply') value = av * ((1 - mix) + mix * bv / 255);
      else if (mode === 'difference') value = Math.abs(av - bv * mix);
      else value = av * (1 - spatial) + bv * spatial;
      output[pixel * 3 + channel] = clamp(Math.round(value), 0, 255);
    }
  }
  return output;
}

export function buildDdpPackets(frame, { destination = 1, maxPayload = 1440, sequence = 0 } = {}) {
  const packets = [];
  let offset = 0;
  while (offset < frame.length) {
    const length = Math.min(maxPayload, frame.length - offset);
    const last = offset + length >= frame.length;
    const header = Buffer.alloc(10);
    header[0] = 0x40 | (last ? 0x01 : 0x00);
    header[1] = sequence & 0x0f;
    header[2] = 0x01;
    header[3] = destination & 0xff;
    header.writeUInt32BE(offset, 4);
    header.writeUInt16BE(length, 8);
    packets.push(Buffer.concat([header, frame.subarray(offset, offset + length)]));
    offset += length;
  }
  return packets;
}

export function buildArtNetPackets(frame, { startUniverse = 0, sequence = 1 } = {}) {
  const packets = [];
  const channelsPerUniverse = 510;
  let offset = 0;
  let universe = Number(startUniverse) || 0;
  while (offset < frame.length) {
    const length = Math.min(channelsPerUniverse, frame.length - offset);
    const evenLength = length % 2 === 0 ? length : length + 1;
    const packet = Buffer.alloc(18 + evenLength);
    packet.write('Art-Net\0', 0, 'ascii');
    packet.writeUInt16LE(0x5000, 8);
    packet.writeUInt16BE(14, 10);
    packet[12] = sequence & 0xff;
    packet[13] = 0;
    packet.writeUInt16LE(universe & 0x7fff, 14);
    packet.writeUInt16BE(evenLength, 16);
    frame.copy(packet, 18, offset, offset + length);
    packets.push(packet);
    offset += length;
    universe += 1;
  }
  return packets;
}


function normalizeAudioMetrics(input = {}) {
  input = input && typeof input === 'object' ? input : {};
  const clamp01 = (value) => clamp(Number(value) || 0, 0, 1);
  const normalizeArray = (values, length, signed = false) => {
    const source = Array.isArray(values) || ArrayBuffer.isView(values) ? Array.from(values) : [];
    return Array.from({ length }, (_, index) => {
      const sourceIndex = source.length <= 1 ? 0 : Math.min(source.length - 1, Math.floor(index * source.length / length));
      const value = Number(source[sourceIndex] ?? 0);
      return signed ? clamp(value, -1, 1) : clamp01(value);
    });
  };
  return {
    level: clamp01(input.level),
    peak: clamp01(input.peak),
    sub: clamp01(input.sub),
    bass: clamp01(input.bass),
    lowMid: clamp01(input.lowMid),
    mid: clamp01(input.mid),
    highMid: clamp01(input.highMid),
    treble: clamp01(input.treble),
    beat: clamp01(input.beat),
    kick: clamp01(input.kick),
    snare: clamp01(input.snare),
    hihat: clamp01(input.hihat),
    flux: clamp01(input.flux),
    bpm: clamp(Number(input.bpm) || 0, 0, 240),
    beatPhase: clamp01(input.beatPhase),
    spectrum: normalizeArray(input.spectrum, 32),
    waveform: normalizeArray(input.waveform, 64, true),
    updatedAt: new Date().toISOString()
  };
}

export class OutputTester {
  constructor() {
    this.socket = dgram.createSocket('udp4');
    this.timer = null;
    this.loopGeneration = 0;
    this.nextFrameAtNs = 0n;
    this.frameInFlight = false;
    this.lastFrameStartedAtNs = 0n;
    this.lastFrameFinishedAtNs = 0n;
    this.config = null;
    this.showDirector = new AdaptiveShowDirector();
    this.tick = 0;
    this.patternStartedAt = 0;
    this.patternStartedAtNs = 0n;
    this.motionTimeSeconds = 0;
    this.lastMotionAtNs = 0n;
    this.audioUpdatedAtNs = 0n;
    this.streamSerial = 0;
    this.latestLogicalFrame = Buffer.alloc(0);
    this.latestPhysicalFrame = Buffer.alloc(0);
    this.frameSubscribers = new Set();
    this.latestFrameMeta = {
      serial: 0,
      width: 0,
      height: 0,
      updatedAt: null,
      coordinateSpace: 'none',
      showMode: false,
      currentPattern: '',
      mapFingerprint: ''
    };
    this.stats = {
      running: false,
      owner: '',
      streamId: '',
      previousOwner: '',
      protocol: '',
      targetIp: '',
      framesSent: 0,
      packetsSent: 0,
      bytesSent: 0,
      errors: 0,
      lastError: '',
      startedAt: null,
      lastFrameAt: null,
      mapped: false,
      activePixel: null,
      activeLogicalPixel: null,
      activePhysicalPixel: null,
      activeControllerPixel: null,
      pixelOn: false,
      audioEnabled: false,
      audio: normalizeAudioMetrics(),
      showMode: false,
      show: null,
      decks: null,
      scheduler: 'monotonic',
      targetFps: 0,
      actualFps: 0,
      lastFrameDurationMs: 0,
      maxFrameDurationMs: 0,
      lastJitterMs: 0,
      maxJitterMs: 0,
      lateFrames: 0,
      droppedFrames: 0,
      frameInFlight: false,
      previewFrameSerial: 0,
      previewFrameSource: 'server-transmitted',
      motionTimeSeconds: 0,
      motionClock: 'accumulated-monotonic'
    };
  }

  status() {
    return { ...this.stats, config: this.config };
  }

  frameSnapshot(space = 'logical') {
    const requested = String(space || 'logical').toLowerCase();
    const frame = requested === 'physical' ? this.latestPhysicalFrame : this.latestLogicalFrame;
    return {
      frame: Buffer.from(frame || Buffer.alloc(0)),
      meta: { ...this.latestFrameMeta, coordinateSpace: requested === 'physical' ? 'physical-controller' : 'logical-matrix' }
    };
  }

  subscribeFrames(listener, { sendCurrent = true } = {}) {
    if (typeof listener !== 'function') throw new TypeError('Frame subscriber must be a function');
    this.frameSubscribers.add(listener);
    if (sendCurrent && this.latestLogicalFrame.length) {
      queueMicrotask(() => {
        if (!this.frameSubscribers.has(listener)) return;
        listener(this.frameSnapshot('logical'));
      });
    }
    return () => this.frameSubscribers.delete(listener);
  }

  publishFrame() {
    if (!this.frameSubscribers.size || !this.latestLogicalFrame.length) return;
    const snapshot = this.frameSnapshot('logical');
    for (const listener of [...this.frameSubscribers]) {
      try {
        listener(snapshot);
      } catch {
        this.frameSubscribers.delete(listener);
      }
    }
  }

  nextStreamId(owner) {
    this.streamSerial += 1;
    return `${owner}-${Date.now().toString(36)}-${this.streamSerial.toString(36)}`;
  }

  assertOwnership({ owner, streamId, action = 'change' } = {}) {
    const requestedOwner = normalizeOwner(owner);
    if (!this.stats.running || !this.config) {
      throw new OutputOwnershipError(`Cannot ${action} output because no stream is running. Start a new stream first.`, {
        requestedOwner,
        activeOwner: '',
        activeStreamId: ''
      });
    }
    const internalAnonymous = requestedOwner === 'anonymous' && this.stats.owner === 'anonymous' && !streamId;
    if (!internalAnonymous && (requestedOwner !== this.stats.owner || !streamId || streamId !== this.stats.streamId)) {
      throw new OutputOwnershipError(`Output is owned by ${this.stats.owner || 'another workspace'}; the stale ${requestedOwner} command was ignored.`, {
        requestedOwner,
        requestedStreamId: String(streamId || ''),
        activeOwner: this.stats.owner,
        activeStreamId: this.stats.streamId
      });
    }
  }

  resolveFrameState(config, useRuntimeClock) {
    let tick = this.tick++;
    let pixelOn = config.pixelOn !== false;
    let activeLogicalPixel = null;
    const nowNs = process.hrtime.bigint();
    let timeSeconds;
    if (useRuntimeClock) {
      if (!this.lastMotionAtNs) this.lastMotionAtNs = nowNs;
      const rawDeltaSeconds = Math.max(0, Number(nowNs - this.lastMotionAtNs) / 1e9);
      const deltaSeconds = Number.isFinite(rawDeltaSeconds) ? Math.min(rawDeltaSeconds, 0.25) : 0;
      this.motionTimeSeconds += deltaSeconds;
      this.lastMotionAtNs = nowNs;
      timeSeconds = this.motionTimeSeconds;
    } else {
      timeSeconds = tick / Math.max(1, Number(config.fps) || 20);
    }
    const elapsedMs = timeSeconds * 1000;

    if (config.pattern === 'slow-chase') {
      if (useRuntimeClock && this.patternStartedAtNs) {
        const onMs = clamp(Number(config.stepSeconds) || 2, 0.1, 30) * 1000;
        const gapMs = clamp(Number(config.gapSeconds) || 0, 0, 10) * 1000;
        const cycleMs = Math.max(100, onMs + gapMs);
        const elapsed = elapsedMs;
        tick = Math.floor(elapsed / cycleMs);
        pixelOn = (elapsed % cycleMs) < onMs;
      }
      activeLogicalPixel = tick % Math.max(1, Number(config.width) * Number(config.height));
    } else if (config.pattern === 'manual-pixel') {
      activeLogicalPixel = clamp(Math.trunc(Number(config.pixelIndex) || 0), 0, Math.max(0, Number(config.width) * Number(config.height) - 1));
    } else if (config.pattern === 'chase') {
      const pixels = Math.max(1, Number(config.width) * Number(config.height));
      const step = Math.floor(timeSeconds * Math.max(0.05, Number(config.speed) || 1) * 8 * (Number(config.direction) < 0 ? -1 : 1));
      activeLogicalPixel = ((step % pixels) + pixels) % pixels;
    }

    const mappedAddress = Number.isInteger(activeLogicalPixel)
      ? (config.pixelMap?.[activeLogicalPixel] ?? activeLogicalPixel)
      : null;
    const activePhysicalPixel = Number.isInteger(mappedAddress) && mappedAddress >= 0 ? mappedAddress : null;
    const activeControllerPixel = Number.isInteger(activePhysicalPixel)
      ? (config.controllerDirection === 'reverse' ? config.physicalPixels - 1 - activePhysicalPixel : activePhysicalPixel)
      : null;

    return {
      tick,
      timeSeconds,
      pixelOn,
      activePixel: activePhysicalPixel,
      activeLogicalPixel,
      activePhysicalPixel,
      activeControllerPixel
    };
  }

  resolveAudioForFrame(config) {
    const normalized = normalizeAudioMetrics(config?.audio);
    if (!config?.audioEnabled || !this.audioUpdatedAtNs) return normalized;
    const ageMs = Math.max(0, Number(process.hrtime.bigint() - this.audioUpdatedAtNs) / 1e6);
    if (ageMs <= 90) return normalized;
    const continuous = Math.exp(-Math.max(0, ageMs - 90) / 720);
    const transient = Math.exp(-Math.max(0, ageMs - 60) / 115);
    const scaleArray = (values, factor, signed = false) => Array.from(values || [], (value) => {
      const scaled = Number(value || 0) * factor;
      return signed ? clamp(scaled, -1, 1) : clamp(scaled, 0, 1);
    });
    return {
      ...normalized,
      level: normalized.level * continuous,
      peak: normalized.peak * continuous,
      sub: normalized.sub * continuous,
      bass: normalized.bass * continuous,
      lowMid: normalized.lowMid * continuous,
      mid: normalized.mid * continuous,
      highMid: normalized.highMid * continuous,
      treble: normalized.treble * continuous,
      flux: normalized.flux * transient,
      beat: normalized.beat * transient,
      kick: normalized.kick * transient,
      snare: normalized.snare * transient,
      hihat: normalized.hihat * transient,
      spectrum: scaleArray(normalized.spectrum, continuous),
      waveform: scaleArray(normalized.waveform, continuous, true),
      ageMs
    };
  }

  async sendOnce(config, { useRuntimeClock = false } = {}) {
    const startedAtNs = process.hrtime.bigint();
    const frameState = this.resolveFrameState(config, useRuntimeClock);
    const frameConfig = { ...config, audio: this.resolveAudioForFrame(config) };
    let logicalFrame;
    let frame;
    let currentPattern = config.pattern || '';
    if (config.showMode) {
      const showResult = renderShowFrame({ ...frameConfig, ...frameState }, this.showDirector);
      logicalFrame = Buffer.from(showResult.frame);
      frame = encodeLogicalFrame(logicalFrame, config);
      currentPattern = showResult.status?.currentPattern || currentPattern;
      this.stats.showMode = true;
      this.stats.show = showResult.status;
      this.stats.decks = null;
    } else {
      const deckAFrame = generateLogicalFrame({ ...frameConfig, ...frameState, layers: config.deckALayers });
      let deckBFrame = null;
      if (config.deckMixEnabled) {
        deckBFrame = generateLogicalFrame({
          ...frameConfig, ...frameState,
          layers: config.deckBLayers,
          pattern: config.deckBPattern,
          color: config.deckBColor,
          secondaryColor: config.deckBSecondaryColor,
          speed: config.deckBSpeed,
          scale: config.deckBScale,
          direction: config.deckBDirection
        });
        logicalFrame = mixVisualFrames(deckAFrame, deckBFrame, config.deckCrossfader, config.deckMixMode, config.width, config.height);
        currentPattern = `A:${config.pattern} + B:${config.deckBPattern} · ${config.deckMixMode} ${Math.round(config.deckCrossfader * 100)}%`;
      } else {
        logicalFrame = deckAFrame;
      }
      frame = encodeLogicalFrame(logicalFrame, config);
      this.stats.showMode = false;
      this.stats.show = null;
      this.stats.decks = {
        enabled: Boolean(config.deckMixEnabled),
        a: config.pattern,
        b: config.deckBPattern,
        aLayers: config.deckALayers.map((layer) => ({ id: layer.id, name: layer.name, pattern: layer.pattern, enabled: layer.enabled, solo: layer.solo, blendMode: layer.blendMode, opacity: layer.opacity })),
        bLayers: config.deckBLayers.map((layer) => ({ id: layer.id, name: layer.name, pattern: layer.pattern, enabled: layer.enabled, solo: layer.solo, blendMode: layer.blendMode, opacity: layer.opacity })),
        crossfader: config.deckCrossfader,
        mixMode: config.deckMixMode,
        serverMixed: Boolean(config.deckMixEnabled && deckBFrame),
        aHash: frameHash(deckAFrame),
        bHash: deckBFrame ? frameHash(deckBFrame) : '',
        mixedHash: frameHash(logicalFrame),
        physicalHash: frameHash(frame),
        aAverage: frameAverageRgb(deckAFrame),
        bAverage: deckBFrame ? frameAverageRgb(deckBFrame) : null,
        mixedAverage: frameAverageRgb(logicalFrame),
        bInfluencePercent: deckBFrame ? frameDifferencePercent(deckAFrame, logicalFrame) : 0,
        solo: config.deckCrossfader <= 0 ? 'A' : config.deckCrossfader >= 1 ? 'B' : 'MIX'
      };
    }
    this.latestLogicalFrame = Buffer.from(logicalFrame);
    this.latestPhysicalFrame = Buffer.from(frame);
    this.latestFrameMeta = {
      serial: Number(this.latestFrameMeta.serial || 0) + 1,
      width: Number(config.width) || 0,
      height: Number(config.height) || 0,
      updatedAt: new Date().toISOString(),
      coordinateSpace: 'logical-matrix',
      showMode: Boolean(config.showMode),
      currentPattern,
      mapFingerprint: config.mapFingerprint || pixelMapFingerprint(config.pixelMap),
      fps: Number(config.fps) || 0
    };
    const protocol = String(config.protocol || 'ddp').toLowerCase();
    const packets = protocol === 'artnet'
      ? buildArtNetPackets(frame, { startUniverse: config.startUniverse, sequence: this.tick })
      : buildDdpPackets(frame, { destination: config.destination, sequence: this.tick });
    const port = protocol === 'artnet' ? 6454 : Number(config.port || 4048);

    await Promise.all(packets.map((packet) => new Promise((resolve) => {
      this.socket.send(packet, port, config.targetIp, (error) => {
        if (error) {
          this.stats.errors += 1;
          this.stats.lastError = error.message;
        } else {
          this.stats.packetsSent += 1;
          this.stats.bytesSent += packet.length;
        }
        resolve();
      });
    })));
    this.publishFrame();

    const finishedAtNs = process.hrtime.bigint();
    const durationMs = Number(finishedAtNs - startedAtNs) / 1e6;
    if (this.lastFrameFinishedAtNs) {
      const intervalMs = Number(finishedAtNs - this.lastFrameFinishedAtNs) / 1e6;
      const instantFps = intervalMs > 0 ? 1000 / intervalMs : 0;
      this.stats.actualFps = this.stats.actualFps > 0
        ? this.stats.actualFps * 0.82 + instantFps * 0.18
        : instantFps;
    }
    this.lastFrameStartedAtNs = startedAtNs;
    this.lastFrameFinishedAtNs = finishedAtNs;
    this.stats.lastFrameDurationMs = durationMs;
    this.stats.maxFrameDurationMs = Math.max(Number(this.stats.maxFrameDurationMs || 0), durationMs);
    this.stats.framesSent += 1;
    this.stats.lastFrameAt = new Date().toISOString();
    this.stats.previewFrameSerial = this.latestFrameMeta.serial;
    this.stats.previewFrameSource = 'server-transmitted';
    this.stats.activePixel = frameState.activePhysicalPixel;
    this.stats.activeLogicalPixel = frameState.activeLogicalPixel;
    this.stats.activePhysicalPixel = frameState.activePhysicalPixel;
    this.stats.activeControllerPixel = frameState.activeControllerPixel;
    this.stats.pixelOn = frameState.pixelOn;
    this.stats.motionTimeSeconds = frameState.timeSeconds;
    this.stats.motionClock = 'accumulated-monotonic';
    return {
      frameBytes: frame.length,
      packetCount: packets.length,
      mapped: Boolean(config.pixelMap),
      mapFingerprint: config.mapFingerprint || pixelMapFingerprint(config.pixelMap),
      activePixel: frameState.activePhysicalPixel,
      activeLogicalPixel: frameState.activeLogicalPixel,
      activePhysicalPixel: frameState.activePhysicalPixel,
      activeControllerPixel: frameState.activeControllerPixel,
      controllerDirection: config.controllerDirection,
      pixelOn: frameState.pixelOn,
      frameDurationMs: durationMs
    };
  }

  buildConfig(config) {
    const width = clamp(Number(config.width) || 16, 1, 512);
    const height = clamp(Number(config.height) || 16, 1, 512);
    const pixels = width * height;
    const normalized = {
      protocol: String(config.protocol || 'ddp').toLowerCase(),
      targetIp: String(config.targetIp || ''),
      port: Number(config.port || 4048),
      width,
      height,
      fps: clamp(Number(config.fps) || 20, 1, 60),
      brightness: clamp(Number(config.brightness ?? 0.35), 0, 1),
      pattern: config.pattern || 'solid',
      color: config.color || '#ffffff',
      secondaryColor: config.secondaryColor || '#2457ff',
      speed: clamp(Number(config.speed ?? 1), 0.1, 8),
      scale: clamp(Number(config.scale ?? 1), 0.1, 12),
      direction: Number(config.direction) < 0 ? -1 : 1,
      deckALayers: normalizeLayerStack(config.deckALayers, { pattern: config.pattern || 'solid', color: config.color || '#ffffff', secondaryColor: config.secondaryColor || '#2457ff', speed: config.speed ?? 1, scale: config.scale ?? 1, direction: config.direction ?? 1 }),
      deckBLayers: normalizeLayerStack(config.deckBLayers, { pattern: config.deckBPattern || 'flowing-gradient', color: config.deckBColor || '#00e5ff', secondaryColor: config.deckBSecondaryColor || '#7b2cff', speed: config.deckBSpeed ?? .75, scale: config.deckBScale ?? 1, direction: config.deckBDirection ?? 1 }),
      layerSettingsVersion: 1,
      deckMixEnabled: config.deckMixEnabled === true,
      deckCrossfader: clamp(Number(config.deckCrossfader ?? 0), 0, 1),
      deckMixMode: ['crossfade','add','screen','multiply','difference','luma','wipe-x','wipe-y'].includes(String(config.deckMixMode)) ? String(config.deckMixMode) : 'crossfade',
      deckBPattern: String(config.deckBPattern || 'flowing-gradient'),
      deckBColor: String(config.deckBColor || '#00e5ff'),
      deckBSecondaryColor: String(config.deckBSecondaryColor || '#7b2cff'),
      deckBSpeed: clamp(Number(config.deckBSpeed ?? 0.75), 0.1, 8),
      deckBScale: clamp(Number(config.deckBScale ?? 1), 0.1, 12),
      deckBDirection: Number(config.deckBDirection) < 0 ? -1 : 1,
      controllerDirection: String(config.controllerDirection || 'forward').toLowerCase() === 'reverse' ? 'reverse' : 'forward',
      channelOrder: config.channelOrder || 'RGB',
      startUniverse: clamp(Number(config.startUniverse) || 0, 0, 32767),
      destination: clamp(Number(config.destination) || 1, 1, 255),
      pixelIndex: clamp(Math.trunc(Number(config.pixelIndex) || 0), 0, pixels - 1),
      stepSeconds: clamp(Number(config.stepSeconds) || 2, 0.1, 30),
      gapSeconds: clamp(Number(config.gapSeconds) || 0, 0, 10),
      pixelOn: config.pixelOn !== false,
      panelWidth: clamp(Math.trunc(Number(config.panelWidth) || width), 1, width),
      panelHeight: clamp(Math.trunc(Number(config.panelHeight) || height), 1, height),
      physicalPixels: clamp(Math.trunc(Number(config.controllerPixels ?? config.physicalPixels) || pixels), 1, 262144),
      panelRects: Array.isArray(config.panelRects) ? config.panelRects.map((rect) => ({
        x: Math.max(0, Math.trunc(Number(rect.x) || 0)),
        y: Math.max(0, Math.trunc(Number(rect.y) || 0)),
        width: Math.max(1, Math.trunc(Number(rect.width) || 1)),
        height: Math.max(1, Math.trunc(Number(rect.height) || 1))
      })) : [],
      audioEnabled: config.audioEnabled === true,
      audio: normalizeAudioMetrics(config.audio),
      audioResponse: ['overall', 'sub', 'bass', 'mid', 'treble', 'beat', 'kick', 'snare', 'hihat'].includes(String(config.audioResponse)) ? String(config.audioResponse) : 'overall',
      audioSensitivity: clamp(Number(config.audioSensitivity ?? 1.5), 0.1, 10),
      audioMaster: clamp(Number(config.audioMaster ?? 2), 0, 6),
      audioBassBoost: clamp(Number(config.audioBassBoost ?? 1.75), 0.1, 6),
      audioBeatBoost: clamp(Number(config.audioBeatBoost ?? 2), 0.1, 8),
      audioProfile: ['tight', 'balanced', 'punchy', 'extreme', 'smooth'].includes(String(config.audioProfile)) ? String(config.audioProfile) : 'punchy',
      audioGate: clamp(Number(config.audioGate ?? 0.03), 0, 0.9),
      audioMotion: clamp(Number(config.audioMotion ?? 1), 0, 6),
      audioBrightness: clamp(Number(config.audioBrightness ?? 0.8), 0, 4),
      audioScale: clamp(Number(config.audioScale ?? 0.45), 0, 4),
      audioColor: clamp(Number(config.audioColor ?? 0.55), 0, 4),
      showMode: config.showMode === true,
      showStyle: ['festival', 'club', 'cinematic', 'ambient', 'corporate'].includes(String(config.showStyle)) ? String(config.showStyle) : 'festival',
      showIntensity: clamp(Number(config.showIntensity ?? 0.72), 0, 1),
      showSceneBeats: clamp(Math.trunc(Number(config.showSceneBeats) || 32), 8, 128),
      showTransitionSeconds: clamp(Number(config.showTransitionSeconds ?? 1.4), 0, 8),
      showVariation: clamp(Number(config.showVariation ?? 0.55), 0, 1),
      showAdaptive: config.showAdaptive !== false,
      showAudioSync: config.showAudioSync !== false,
      showSeed: String(config.showSeed || 'ledcontroller-show'),
      showAdvanceToken: Math.trunc(Number(config.showAdvanceToken) || 0),
      showBpm: clamp(Number(config.showBpm || config.audio?.bpm || 120), 45, 220),
      showPerformance: clamp(Number(config.showPerformance ?? 0.8), 0, 1),
      showGestureRate: clamp(Number(config.showGestureRate ?? 0.30), 0, 1),
      showMixStyle: ['hybrid', 'smooth', 'cuts'].includes(String(config.showMixStyle)) ? String(config.showMixStyle) : 'hybrid',
      showStrobeSafe: config.showStrobeSafe !== false,
      showControlMode: ['busking', 'assist', 'auto'].includes(String(config.showControlMode)) ? String(config.showControlMode) : 'busking',
      showRate: clamp(Number(config.showRate ?? 1), 0.25, 4),
      showLookId: String(config.showLookId || 'flow'),
      showLookToken: Math.trunc(Number(config.showLookToken) || 0),
      showReverseToken: Math.trunc(Number(config.showReverseToken) || 0),
      showColorToken: Math.trunc(Number(config.showColorToken) || 0),
      showPunchToken: Math.trunc(Number(config.showPunchToken) || 0),
      showWhiteToken: Math.trunc(Number(config.showWhiteToken) || 0),
      showBlackoutToken: Math.trunc(Number(config.showBlackoutToken) || 0),
      showFreezeToken: Math.trunc(Number(config.showFreezeToken) || 0),
      showStrobeToken: Math.trunc(Number(config.showStrobeToken) || 0),
      pixelMap: null
    };
    normalized.pixelMap = normalizePixelMap(config.pixelMap, pixels, normalized.physicalPixels);
    normalized.mapFingerprint = pixelMapFingerprint(normalized.pixelMap);
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized.targetIp)) throw new Error('A valid target IPv4 address is required');
    return normalized;
  }

  scheduleTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const generation = ++this.loopGeneration;
    const intervalMs = Math.max(16, 1000 / Math.max(1, Number(this.config?.fps) || 20));
    const intervalNs = BigInt(Math.round(intervalMs * 1e6));
    this.stats.scheduler = 'monotonic';
    this.stats.targetFps = Number(this.config?.fps) || 20;
    this.nextFrameAtNs = process.hrtime.bigint() + intervalNs;

    const runFrame = async () => {
      if (generation !== this.loopGeneration || !this.stats.running || !this.config) return;
      const nowNs = process.hrtime.bigint();
      const jitterMs = Number(nowNs - this.nextFrameAtNs) / 1e6;
      this.stats.lastJitterMs = jitterMs;
      this.stats.maxJitterMs = Math.max(Number(this.stats.maxJitterMs || 0), Math.max(0, jitterMs));
      if (jitterMs > intervalMs * 0.5) this.stats.lateFrames += 1;

      if (this.frameInFlight) {
        this.stats.droppedFrames += 1;
      } else {
        this.frameInFlight = true;
        this.stats.frameInFlight = true;
        try {
          await this.sendOnce(this.config, { useRuntimeClock: true });
        } catch (error) {
          this.stats.errors += 1;
          this.stats.lastError = error.message;
        } finally {
          this.frameInFlight = false;
          this.stats.frameInFlight = false;
        }
      }

      if (generation !== this.loopGeneration || !this.stats.running || !this.config) return;
      this.nextFrameAtNs += intervalNs;
      const afterNs = process.hrtime.bigint();
      if (afterNs >= this.nextFrameAtNs + intervalNs) {
        const missed = Number((afterNs - this.nextFrameAtNs) / intervalNs);
        this.stats.droppedFrames += missed;
        this.nextFrameAtNs += BigInt(missed) * intervalNs;
      }
      const delayMs = Math.max(0, Number(this.nextFrameAtNs - afterNs) / 1e6);
      this.timer = setTimeout(runFrame, delayMs);
    };

    const initialDelayMs = Math.max(0, Number(this.nextFrameAtNs - process.hrtime.bigint()) / 1e6);
    this.timer = setTimeout(runFrame, initialDelayMs);
  }

  async start(config, { owner = 'anonymous' } = {}) {
    const normalizedOwner = normalizeOwner(owner);
    const previousOwner = this.stats.running ? this.stats.owner : '';
    this.stop({ force: true });
    this.config = this.buildConfig(config);
    this.showDirector.reset({ ...this.config, timeSeconds: 0 });
    const streamId = this.nextStreamId(normalizedOwner);
    this.stats = {
      running: true,
      owner: normalizedOwner,
      streamId,
      previousOwner,
      protocol: this.config.protocol,
      targetIp: this.config.targetIp,
      framesSent: 0,
      packetsSent: 0,
      bytesSent: 0,
      errors: 0,
      lastError: '',
      startedAt: new Date().toISOString(),
      lastFrameAt: null,
      mapped: Boolean(this.config.pixelMap),
      mapFingerprint: this.config.mapFingerprint,
      coordinateSpace: this.config.pixelMap ? 'logical-matrix' : 'direct-linear',
      activePixel: null,
      activeLogicalPixel: null,
      activePhysicalPixel: null,
      activeControllerPixel: null,
      pixelOn: false,
      audioEnabled: this.config.audioEnabled,
      audio: this.config.audio,
      showMode: this.config.showMode,
      show: null,
      scheduler: 'monotonic',
      targetFps: this.config.fps,
      actualFps: 0,
      lastFrameDurationMs: 0,
      maxFrameDurationMs: 0,
      lastJitterMs: 0,
      maxJitterMs: 0,
      lateFrames: 0,
      droppedFrames: 0,
      frameInFlight: false,
      previewFrameSerial: 0,
      previewFrameSource: 'server-transmitted',
      motionTimeSeconds: 0,
      motionClock: 'accumulated-monotonic'
    };
    this.tick = 0;
    this.lastFrameStartedAtNs = 0n;
    this.lastFrameFinishedAtNs = 0n;
    this.patternStartedAt = Date.now();
    this.patternStartedAtNs = process.hrtime.bigint();
    this.motionTimeSeconds = 0;
    this.lastMotionAtNs = process.hrtime.bigint();
    this.audioUpdatedAtNs = this.config.audioEnabled ? process.hrtime.bigint() : 0n;
    await this.sendOnce(this.config, { useRuntimeClock: true });
    this.scheduleTimer();
    return this.status();
  }

  async update(config, { owner = 'anonymous', streamId = '' } = {}) {
    this.assertOwnership({ owner, streamId, action: 'update' });
    const previous = this.config;
    const next = this.buildConfig({ ...previous, ...config });
    const restartClock = next.pattern !== previous.pattern || next.width !== previous.width || next.height !== previous.height || next.showMode !== previous.showMode;
    const resetShow = next.showMode && (next.showStyle !== previous.showStyle || next.showSeed !== previous.showSeed || next.showSceneBeats !== previous.showSceneBeats || next.showAdaptive !== previous.showAdaptive || next.showVariation !== previous.showVariation || next.showControlMode !== previous.showControlMode);
    const reschedule = next.fps !== previous.fps;
    this.config = next;
    this.stats.protocol = next.protocol;
    this.stats.targetIp = next.targetIp;
    this.stats.mapped = Boolean(next.pixelMap);
    this.stats.mapFingerprint = next.mapFingerprint;
    this.stats.coordinateSpace = next.pixelMap ? 'logical-matrix' : 'direct-linear';
    this.stats.audioEnabled = next.audioEnabled;
    this.stats.audio = next.audio;
    this.stats.showMode = next.showMode;
    if (!next.showMode) this.stats.show = null;
    if (resetShow) this.showDirector.reset({ ...next, timeSeconds: 0 });
    this.stats.lastError = '';
    if (restartClock) {
      this.tick = 0;
      this.patternStartedAt = Date.now();
      this.patternStartedAtNs = process.hrtime.bigint();
      this.motionTimeSeconds = 0;
      this.lastMotionAtNs = process.hrtime.bigint();
    }
    if (!this.frameInFlight) {
      this.frameInFlight = true;
      this.stats.frameInFlight = true;
      try {
        await this.sendOnce(this.config, { useRuntimeClock: true });
      } finally {
        this.frameInFlight = false;
        this.stats.frameInFlight = false;
      }
    }
    // Re-anchor the deadline after an explicit live update so the immediate
    // frame is never followed by a bunched timer frame.
    if (this.stats.running) this.scheduleTimer();
    return this.status();
  }

  updateAudio(audio, { owner = 'anonymous', streamId = '' } = {}) {
    this.assertOwnership({ owner, streamId, action: 'audio update' });
    if (!this.config) throw new OutputOwnershipError('No active output stream is available for audio updates.');
    this.config.audio = normalizeAudioMetrics(audio);
    this.audioUpdatedAtNs = process.hrtime.bigint();
    this.config.audioEnabled = true;
    this.stats.audioEnabled = true;
    this.stats.audio = this.config.audio;
    return this.status();
  }

  stop({ owner = '', streamId = '', force = false } = {}) {
    if (this.stats.running && !force) this.assertOwnership({ owner, streamId, action: 'stop' });
    const previousOwner = this.stats.owner || this.stats.previousOwner || '';
    this.loopGeneration += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.frameInFlight = false;
    this.stats.frameInFlight = false;
    this.patternStartedAt = 0;
    this.patternStartedAtNs = 0n;
    this.motionTimeSeconds = 0;
    this.lastMotionAtNs = 0n;
    this.audioUpdatedAtNs = 0n;
    this.config = null;
    this.stats.running = false;
    this.stats.previousOwner = previousOwner;
    this.stats.owner = '';
    this.stats.streamId = '';
    this.stats.coordinateSpace = 'idle';
    this.stats.activePixel = null;
    this.stats.activeLogicalPixel = null;
    this.stats.activePhysicalPixel = null;
    this.stats.activeControllerPixel = null;
    this.stats.pixelOn = false;
    this.stats.audioEnabled = false;
    this.stats.audio = normalizeAudioMetrics();
    return this.status();
  }
}
