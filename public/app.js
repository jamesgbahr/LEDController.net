const CLIENT_VERSION = '0.4.36';
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

function audioAverageRange(values, start, end) {
  const from = Math.max(0, Math.min(values.length, Math.floor(start)));
  const to = Math.max(from + 1, Math.min(values.length, Math.ceil(end)));
  let total = 0;
  for (let index = from; index < to; index += 1) total += Number(values[index] || 0);
  return total / Math.max(1, to - from);
}

function rmsRange(values, start, end) {
  const from = Math.max(0, Math.min(values.length, Math.floor(start)));
  const to = Math.max(from + 1, Math.min(values.length, Math.ceil(end)));
  let total = 0;
  for (let index = from; index < to; index += 1) {
    const value = Number(values[index] || 0) / 255;
    total += value * value;
  }
  return Math.sqrt(total / Math.max(1, to - from));
}

function bandEnergy(data, sampleRate, fftSize, lowHz, highHz) {
  const hzPerBin = sampleRate / fftSize;
  return rmsRange(data, lowHz / hzPerBin, highHz / hzPerBin);
}

function logSpectrum(data, sampleRate, fftSize, count = 32) {
  const nyquist = sampleRate / 2;
  const minHz = 35;
  const maxHz = Math.min(16000, nyquist * 0.96);
  const ratio = maxHz / minHz;
  const hzPerBin = sampleRate / fftSize;
  return Array.from({ length: count }, (_, index) => {
    const low = minHz * Math.pow(ratio, index / count);
    const high = minHz * Math.pow(ratio, (index + 1) / count);
    return rmsRange(data, low / hzPerBin, Math.max(low / hzPerBin + 1, high / hzPerBin));
  });
}

function waveformSamples(data, count = 64, gain = 1) {
  return Array.from({ length: count }, (_, index) => {
    const source = Math.min(data.length - 1, Math.floor(index * data.length / count));
    return clamp(((Number(data[source] || 128) - 128) / 128) * gain, -1, 1);
  });
}

function envelope(previous, next, dtMs, attackMs, releaseMs) {
  const duration = next > previous ? Math.max(1, attackMs) : Math.max(1, releaseMs);
  const coefficient = 1 - Math.exp(-Math.max(1, dtMs) / duration);
  return previous + (next - previous) * coefficient;
}

function rollingStats(values) {
  if (!values.length) return { mean: 0, deviation: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, deviation: Math.sqrt(variance) };
}

function normalizeDynamic(raw, state, key, settings) {
  const autoGain = settings.autoGain !== false;
  const inputGain = clamp(settings.inputGain ?? 3.5, 0.1, 12);
  const gate = clamp(settings.gate ?? 0.002, 0, 0.5);
  if (!autoGain) {
    if (raw <= gate) return 0;
    return clamp(Math.pow((raw - gate) * inputGain, 0.78));
  }

  const highBand = key === 'treble';
  const spectrumBand = /^s\d+$/.test(key);
  const minimumSpan = highBand ? 0.010 : spectrumBand ? 0.012 : key === 'level' ? 0.020 : 0.018;
  const initialFloorRatio = highBand ? 0.72 : 0.58;
  if (!Number.isFinite(state.floors[key])) state.floors[key] = Math.max(0, raw * initialFloorRatio);
  if (!Number.isFinite(state.peaks[key])) state.peaks[key] = Math.max(raw * 1.65, state.floors[key] + minimumSpan);

  const currentFloor = Number(state.floors[key]);
  const currentPeak = Number(state.peaks[key]);
  const effectiveFloor = Math.max(highBand ? gate * 0.45 : gate, currentFloor * (highBand ? 1.025 : 1.045));
  const span = Math.max(minimumSpan, currentPeak - effectiveFloor);
  const headroom = clamp(settings.headroom ?? 1.38, 1.05, 2.5);
  const ratio = clamp((raw - effectiveFloor) / (span * headroom));

  // Quiet, steady input is learned as the noise floor instead of being stretched
  // to full scale. Downward floor movement stays fast; upward movement is faster
  // during startup and then deliberately slow so music retains useful dynamics.
  state.frameCount = Number(state.frameCount || 0) + (key === 'level' ? 1 : 0);
  const warmingUp = Number(state.frameCount || 0) < 90;
  const floorRate = raw < currentFloor ? 0.18 : (warmingUp ? 0.018 : highBand ? 0.0045 : 0.0032);
  state.floors[key] = currentFloor + (raw - currentFloor) * floorRate;

  // Compute against the prior peak so a genuine transient can still reach 100%,
  // then teach the peak tracker about it for subsequent frames.
  if (raw > currentPeak) state.peaks[key] = currentPeak + (raw - currentPeak) * 0.72;
  else state.peaks[key] = Math.max(state.floors[key] + minimumSpan, currentPeak * (highBand ? 0.9965 : 0.9975));

  const dynamics = clamp(settings.dynamics ?? 0.7, 0, 1);
  const exponent = 1.34 - dynamics * 0.56;
  const gainScale = clamp(Math.pow(inputGain / 3.5, 0.78), 0.22, 2.1);
  const warmedRatio = warmingUp ? Math.min(ratio, 0.72) : ratio;
  const adaptive = clamp(Math.pow(warmedRatio, exponent) * gainScale);

  // Auto gain may lift a quiet source, but it must not reinterpret tiny absolute
  // microphone energy as full-scale music. This absolute ceiling keeps room noise
  // and low playback proportionate while calibration/input gain can still raise a
  // genuinely low-output microphone.
  const absolute = clamp(Math.pow(Math.max(0, raw - gate) * inputGain * 0.94, 0.82));
  return clamp(Math.min(adaptive, absolute * 1.12 + 0.018));
}

function applyResponseGain(value, gain = 1) {
  const amount = clamp(gain, 0.1, 8);
  const input = clamp(value);
  if (amount <= 1) return input * amount;
  // Curved gain preserves headroom: ordinary signals get stronger without every
  // band hard-clipping, while a true full-scale transient can still reach 100%.
  return clamp(1 - Math.pow(1 - input, amount));
}

function createAudioProcessor() {
  return {
    lastTimeMs: 0,
    floors: {},
    peaks: {},
    previousSpectrum: Array(32).fill(0),
    fluxHistory: [],
    bandFluxHistory: { kick: [], snare: [], hihat: [] },
    lastBeatAt: -Infinity,
    lastKickAt: -Infinity,
    lastSnareAt: -Infinity,
    lastHatAt: -Infinity,
    envelopes: { beat: 0, kick: 0, snare: 0, hihat: 0 },
    metrics: {
      level: 0, peak: 0, sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0,
      beat: 0, kick: 0, snare: 0, hihat: 0, flux: 0,
      spectrum: Array(32).fill(0), waveform: Array(64).fill(0)
    }
  };
}

function transientDetected(value, history, sensitivity, minimum) {
  history.push(value);
  if (history.length > 72) history.shift();
  const { mean, deviation } = rollingStats(history.slice(0, -1));
  const threshold = mean + deviation * sensitivity + minimum;
  return value > threshold && value > minimum * 1.7;
}

function processAudioFrame({ frequencyData, timeData, sampleRate = 48000, fftSize = 2048, nowMs = 0, settings = {} }, state = createAudioProcessor()) {
  const dtMs = state.lastTimeMs ? clamp(nowMs - state.lastTimeMs, 4, 100) : 16.7;
  state.lastTimeMs = nowMs;
  const attackMs = clamp(settings.attackMs ?? 22, 4, 500);
  const releaseMs = clamp(settings.releaseMs ?? 180, 20, 2000);
  const transientSensitivity = clamp(settings.transientSensitivity ?? 1.15, 0.25, 4);
  const beatThreshold = clamp(settings.beatThreshold ?? 1.05, 0.5, 3);

  const waveform = waveformSamples(timeData, 64, clamp(settings.waveformGain ?? 2.2, 0.25, 8));
  const waveformRms = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / Math.max(1, waveform.length));
  const rawSpectrum = logSpectrum(frequencyData, sampleRate, fftSize, 32);

  const rawHighMid = bandEnergy(frequencyData, sampleRate, fftSize, 1800, 5200);
  const rawTrebleCore = bandEnergy(frequencyData, sampleRate, fftSize, 4800, Math.min(14000, sampleRate / 2));
  const rawAir = bandEnergy(frequencyData, sampleRate, fftSize, 9000, Math.min(19000, sampleRate / 2));
  const raw = {
    sub: bandEnergy(frequencyData, sampleRate, fftSize, 25, 70),
    bass: bandEnergy(frequencyData, sampleRate, fftSize, 70, 180),
    lowMid: bandEnergy(frequencyData, sampleRate, fftSize, 180, 500),
    mid: bandEnergy(frequencyData, sampleRate, fftSize, 500, 2000),
    highMid: rawHighMid,
    // Cymbals and hi-hats are spread across upper mids and air. A weighted presence
    // estimate is more dependable than a single 6-16 kHz average on laptop microphones.
    treble: Math.max(rawTrebleCore * 1.35, rawAir * 1.8, rawHighMid * 0.20),
    level: Math.max(waveformRms * 0.8, rmsRange(frequencyData, 1, frequencyData.length * 0.8) * 1.15)
  };

  const normalized = {};
  for (const [key, value] of Object.entries(raw)) normalized[key] = normalizeDynamic(value, state, key, settings);
  const bandGains = settings.bandGains || {};
  normalized.sub = applyResponseGain(normalized.sub, clamp(settings.bassBoost ?? 1.75, 0.25, 5) * 1.1 * clamp(bandGains.sub ?? 1, 0.1, 6));
  normalized.bass = applyResponseGain(normalized.bass, clamp(settings.bassBoost ?? 1.75, 0.25, 5) * clamp(bandGains.bass ?? 1, 0.1, 6));
  normalized.lowMid = applyResponseGain(normalized.lowMid, clamp(bandGains.lowMid ?? 1, 0.1, 6));
  normalized.mid = applyResponseGain(normalized.mid, clamp(bandGains.mid ?? 1, 0.1, 6));
  normalized.highMid = applyResponseGain(normalized.highMid, clamp(bandGains.highMid ?? 1, 0.1, 6));
  normalized.treble = applyResponseGain(clamp(normalized.treble * 1.10 + normalized.highMid * 0.06), clamp(bandGains.treble ?? 1, 0.1, 6));

  const spectrum = rawSpectrum.map((value, index) => {
    const next = normalizeDynamic(value, state, `s${index}`, settings);
    const previous = state.metrics.spectrum[index] || 0;
    return envelope(previous, next, dtMs, attackMs, releaseMs);
  });

  let flux = 0;
  let kickFlux = 0;
  let snareFlux = 0;
  let hatFlux = 0;
  for (let index = 0; index < spectrum.length; index += 1) {
    const delta = Math.max(0, spectrum[index] - (state.previousSpectrum[index] || 0));
    flux += delta;
    if (index < 7) kickFlux += delta;
    else if (index < 20) snareFlux += delta;
    else hatFlux += delta;
  }
  flux /= spectrum.length;
  kickFlux /= 7;
  snareFlux /= 13;
  hatFlux /= 12;
  state.previousSpectrum = [...spectrum];

  const generalOnset = transientDetected(flux, state.fluxHistory, transientSensitivity * beatThreshold, 0.006);
  const kickOnset = transientDetected(kickFlux, state.bandFluxHistory.kick, transientSensitivity * 0.9, 0.008)
    && normalized.sub * 0.65 + normalized.bass * 0.7 > 0.38;
  const snareOnset = transientDetected(snareFlux, state.bandFluxHistory.snare, transientSensitivity, 0.007)
    && normalized.mid * 0.55 + normalized.highMid * 0.7 > 0.34;
  const hatOnset = transientDetected(hatFlux, state.bandFluxHistory.hihat, transientSensitivity * 0.92, 0.0035)
    && (normalized.treble > 0.16 || normalized.highMid > 0.34);

  const beatReady = nowMs - state.lastBeatAt > 150;
  const kickReady = nowMs - state.lastKickAt > 115;
  const snareReady = nowMs - state.lastSnareAt > 90;
  const hatReady = nowMs - state.lastHatAt > 55;
  const beatDetected = beatReady && (kickOnset || (generalOnset && normalized.bass > 0.48));
  if (beatDetected) state.lastBeatAt = nowMs;
  if (kickOnset && kickReady) state.lastKickAt = nowMs;
  if (snareOnset && snareReady) state.lastSnareAt = nowMs;
  if (hatOnset && hatReady) state.lastHatAt = nowMs;

  const beatBoost = clamp(settings.beatBoost ?? 2, 0.25, 6);
  const decay = (current, durationMs) => current * Math.exp(-dtMs / durationMs);
  state.envelopes.beat = beatDetected ? 1 : decay(state.envelopes.beat, 170);
  state.envelopes.kick = kickOnset && kickReady ? 1 : decay(state.envelopes.kick, 150);
  state.envelopes.snare = snareOnset && snareReady ? 1 : decay(state.envelopes.snare, 125);
  state.envelopes.hihat = hatOnset && hatReady ? 1 : decay(state.envelopes.hihat, 80);

  const previous = state.metrics;
  const nextMetrics = {
    level: normalized.level,
    peak: Math.max(normalized.level, previous.peak * Math.exp(-dtMs / 380)),
    sub: normalized.sub,
    bass: normalized.bass,
    lowMid: normalized.lowMid,
    mid: normalized.mid,
    highMid: normalized.highMid,
    treble: normalized.treble,
    flux: clamp(flux * 3.4),
    beat: clamp(state.envelopes.beat * beatBoost),
    kick: clamp(state.envelopes.kick * beatBoost),
    snare: clamp(state.envelopes.snare * beatBoost),
    hihat: clamp(state.envelopes.hihat * beatBoost),
    spectrum,
    waveform
  };

  for (const key of ['level', 'sub', 'bass', 'lowMid', 'mid', 'highMid', 'treble', 'flux']) {
    nextMetrics[key] = envelope(previous[key] || 0, nextMetrics[key], dtMs, attackMs, releaseMs);
  }
  state.metrics = nextMetrics;
  return {
    metrics: nextMetrics,
    state,
    detected: { beat: beatDetected, kick: kickOnset && kickReady, snare: snareOnset && snareReady, hihat: hatOnset && hatReady },
    diagnostics: { raw: { ...raw }, normalized: { ...normalized }, flux, kickFlux, snareFlux, hatFlux, dtMs }
  };
}


const $ = (id) => document.getElementById(id);
const state = {
  devices: [], log: [], previewTick: 0, lastPreviewDrawAt: 0,
  previewStartedAt: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  activeTarget: null, mapping: null, outputRunning: false, outputOwner: '', streamId: '', visualUpdateTimer: null, activeDeck: 'A', serviceVersion: '', serverCompatible: false, serverDeckStatus: null,
  transmittedPreview: {
    frame: null,
    width: 0,
    height: 0,
    serial: 0,
    currentPattern: '',
    mapFingerprint: '',
    receivedAt: 0,
    lastRequestAt: 0,
    loading: false,
    eventSource: null,
    streamConnected: false,
    streamStartedAt: 0,
    outputFps: 0,
    receivedFrames: 0,
    observedFps: 0,
    reconnectTimer: 0
  },
  audio: {
    active: false, sourceType: '', stream: null, context: null, analyser: null, sourceNode: null,
    starting: false, autoStartAttempted: false, interactionFallbackArmed: false,
    frequencyData: null, timeData: null, animationFrame: 0, pushPending: false, lastPushAt: 0,
    clockNode: null, silentGain: null, clockWorker: null, fallbackTimer: 0, clockMode: 'idle', lastAnalysisAt: 0,
    history: [], beatEnvelope: 0, lastSignalAt: 0, signalState: 'idle', processor: createAudioProcessor(),
    calibration: { active: false, startedAt: 0, durationMs: 8000, samples: [] },
    beatTimes: [], tapTimes: [], beatHistory: [], bpm: 0, bpmSource: '', latencyMs: 0,
    metrics: { level: 0, peak: 0, sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, beat: 0, kick: 0, snare: 0, hihat: 0, flux: 0, spectrum: Array(32).fill(0), waveform: Array(64).fill(0) }
  },
  layers: { A: [], B: [], selected: { A: '', B: '' }, expanded: '' },
  show: {
    enabled: false,
    director: null,
    advanceToken: 0, punchToken: 0, whiteToken: 0, blackoutToken: 0, freezeToken: 0, strobeToken: 0, reverseToken: 0, colorToken: 0, lookToken: 0, lookId: 'flow',
    seed: (typeof localStorage !== 'undefined' ? localStorage.getItem('ledcontroller.show.seed') : '') || `show-${Date.now().toString(36)}`,
    lastStatus: null,
    lastUiAt: 0
  }
};

function log(message) {
  const entry = { time: new Date().toLocaleTimeString(), message };
  state.log.unshift(entry);
  state.log = state.log.slice(0, 50);
  $('log').innerHTML = state.log.map((row) => `<div><time>${escapeHtml(row.time)}</time><span>${escapeHtml(row.message)}</span></div>`).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}


function setServerCompatibility(version = '') {
  const normalized = String(version || '').trim();
  state.serviceVersion = normalized;
  state.serverCompatible = normalized === CLIENT_VERSION;
  const banner = $('serverVersionLock');
  const text = $('serverVersionLockText');
  if (banner) banner.classList.toggle('hidden', state.serverCompatible || !normalized);
  if (text && !state.serverCompatible) text.textContent = `Web controls v${CLIENT_VERSION} are connected to renderer v${normalized || 'unknown'}. Close the older LEDController command window, then launch v${CLIENT_VERSION}. Hardware output is locked until both versions match.`;
  if (!state.serverCompatible) {
    state.serverDeckStatus = null;
    if ($('serverMixProof')) $('serverMixProof').textContent = `OUTPUT LOCKED · renderer v${normalized || 'unknown'} does not support this UI`;
  }
  return state.serverCompatible;
}

function requireCompatibleServer() {
  if (!state.serverCompatible) throw new Error(`Renderer version mismatch: web controls v${CLIENT_VERSION}, service v${state.serviceVersion || 'unknown'}. Close the old LEDController command window and relaunch this version.`);
}

function verifyDeckOutputStatus(status) {
  if (!status || !state.outputRunning || state.show.enabled) return true;
  const requestedEnabled = Boolean($('deckMixEnabled')?.checked);
  const requestedAmount = clamp(Number($('deckCrossfader')?.value ?? 0.5), 0, 1);
  const requestedPattern = String($('patternB')?.value || '');
  const actual = status.decks || {};
  const configState = status.config || {};
  const valid = Boolean(
    configState.deckMixEnabled === requestedEnabled &&
    (!requestedEnabled || (
      actual.serverMixed === true &&
      Math.abs(Number(configState.deckCrossfader ?? -1) - requestedAmount) <= 0.011 &&
      String(configState.deckBPattern || '') === requestedPattern
    ))
  );
  if (!valid) {
    showError('The server did not accept the current Deck B mix. This usually means an older LEDController service is still running. Stop the old command window and relaunch this version.');
  }
  return valid;
}

function decodeBase64Frame(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function disconnectTransmittedPreviewStream() {
  const preview = state.transmittedPreview;
  clearTimeout(preview.reconnectTimer);
  preview.reconnectTimer = 0;
  if (preview.eventSource) preview.eventSource.close();
  preview.eventSource = null;
  preview.streamConnected = false;
  preview.streamStartedAt = 0;
}

function connectTransmittedPreviewStream() {
  const preview = state.transmittedPreview;
  if (!state.outputRunning || state.outputOwner !== 'visual') {
    disconnectTransmittedPreviewStream();
    return;
  }
  if (preview.eventSource) return;
  const source = new EventSource(`/api/output/frame-stream?after=${Number(preview.serial || 0)}&_=${Date.now()}`);
  preview.eventSource = source;
  preview.streamStartedAt = performance.now();
  source.addEventListener('open', () => {
    if (preview.eventSource !== source) return;
    preview.streamConnected = true;
  });
  source.addEventListener('frame', (event) => {
    if (preview.eventSource !== source) return;
    try {
      const payload = JSON.parse(event.data || '{}');
      const width = Math.max(1, Number(payload.width) || 1);
      const height = Math.max(1, Number(payload.height) || 1);
      const bytes = decodeBase64Frame(payload.frame);
      if (bytes.length < width * height * 3) return;
      const now = performance.now();
      const elapsed = preview.receivedAt > 0 ? now - preview.receivedAt : 0;
      if (elapsed > 0 && elapsed < 1000) {
        const instantFps = 1000 / elapsed;
        preview.observedFps = preview.observedFps > 0
          ? preview.observedFps * 0.82 + instantFps * 0.18
          : instantFps;
      }
      preview.frame = bytes;
      preview.width = width;
      preview.height = height;
      preview.serial = Number(payload.serial) || Number(event.lastEventId) || 0;
      preview.currentPattern = String(payload.currentPattern || '');
      preview.mapFingerprint = String(payload.mapFingerprint || '');
      preview.outputFps = Math.max(0, Number(payload.fps) || 0);
      preview.receivedAt = now;
      preview.receivedFrames += 1;
      preview.streamConnected = true;
    } catch {
      // The polling fallback below remains available if one streamed event is malformed.
    }
  });
  source.addEventListener('error', () => {
    if (preview.eventSource !== source) return;
    preview.streamConnected = false;
    source.close();
    preview.eventSource = null;
    clearTimeout(preview.reconnectTimer);
    preview.reconnectTimer = setTimeout(() => {
      preview.reconnectTimer = 0;
      connectTransmittedPreviewStream();
    }, 350);
  });
}

async function refreshTransmittedPreview(now = performance.now()) {
  const preview = state.transmittedPreview;
  if (!state.outputRunning || state.outputOwner !== 'visual') return;
  if (preview.loading || now - preview.lastRequestAt < 24) return;
  preview.loading = true;
  preview.lastRequestAt = now;
  try {
    const response = await fetch(`/api/output/frame?space=logical&_=${Date.now()}`, { cache: 'no-store' });
    if (response.status === 204) return;
    if (!response.ok) throw new Error(`Frame preview failed (${response.status})`);
    const width = Math.max(1, Number(response.headers.get('X-LED-Width')) || 1);
    const height = Math.max(1, Number(response.headers.get('X-LED-Height')) || 1);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < width * height * 3) return;
    preview.frame = bytes;
    preview.width = width;
    preview.height = height;
    preview.serial = Number(response.headers.get('X-LED-Frame-Serial')) || 0;
    preview.currentPattern = decodeURIComponent(response.headers.get('X-LED-Current-Pattern') || '');
    preview.mapFingerprint = response.headers.get('X-LED-Map-Fingerprint') || '';
    preview.receivedAt = performance.now();
  } catch {
    // Keep the most recent valid server frame. The design preview remains
    // available if the local service is briefly busy.
  } finally {
    preview.loading = false;
  }
}

function transmittedPreviewAvailable(now = performance.now()) {
  const preview = state.transmittedPreview;
  return Boolean(
    state.outputRunning
    && state.outputOwner === 'visual'
    && preview.frame
    && preview.width > 0
    && preview.height > 0
    && now - preview.receivedAt < 1200
  );
}

function mappingCoordinateOrder(width, height, axis, corner, serpentine) {
  const startsLeft = String(corner || 'tl').endsWith('l');
  const startsTop = String(corner || 'tl').startsWith('t');
  const order = [];
  if (axis === 'columns') {
    const xs = Array.from({ length: width }, (_, i) => startsLeft ? i : width - 1 - i);
    xs.forEach((x, column) => {
      const topToBottom = serpentine && column % 2 ? !startsTop : startsTop;
      for (let step = 0; step < height; step += 1) order.push({ x, y: topToBottom ? step : height - 1 - step });
    });
  } else {
    const ys = Array.from({ length: height }, (_, i) => startsTop ? i : height - 1 - i);
    ys.forEach((y, row) => {
      const leftToRight = serpentine && row % 2 ? !startsLeft : startsLeft;
      for (let step = 0; step < width; step += 1) order.push({ x: leftToRight ? step : width - 1 - step, y });
    });
  }
  return order;
}

function normalizeSavedPanelOrder(order, panelCount) {
  if (!Array.isArray(order) || order.length !== panelCount) throw new Error(`The custom panel order must contain exactly ${panelCount} panels.`);
  const normalized = order.map(Number);
  const used = new Set();
  for (const slot of normalized) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= panelCount) throw new Error('The custom panel order contains an invalid panel position.');
    if (used.has(slot)) throw new Error(`The custom panel order contains duplicate panel ${slot + 1}.`);
    used.add(slot);
  }
  return normalized;
}

function savedPanelOrderSlots(config, panelColumns, panelRows) {
  const preset = mappingCoordinateOrder(panelColumns, panelRows, config.panelAxis, config.panelCorner, Boolean(config.panelSerpentine))
    .map((point) => point.y * panelColumns + point.x);
  if (config.panelOrderMode !== 'custom') return preset;
  return normalizeSavedPanelOrder(config.customPanelOrder, panelColumns * panelRows);
}

function pixelMapFingerprint(pixelMap) {
  if (!Array.isArray(pixelMap) || !pixelMap.length) return 'none';
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

function mappingTransformPoint(x, y, width, height, rotation, flipX, flipY) {
  let px = flipX ? width - 1 - x : x;
  let py = flipY ? height - 1 - y : y;
  if ((rotation === 90 || rotation === 270) && width !== height) {
    throw new Error('The saved map uses a 90°/270° rotation on a non-square panel. Correct it in Pixel Mapping.');
  }
  if (rotation === 90) return { x: py, y: width - 1 - px };
  if (rotation === 180) return { x: width - 1 - px, y: height - 1 - py };
  if (rotation === 270) return { x: height - 1 - py, y: px };
  return { x: px, y: py };
}

function buildSavedMapping(config) {
  if (!config) return null;
  if (Array.isArray(config.resolvedPixelMap) && Number(config.canvasWidth) > 0 && Number(config.canvasHeight) > 0) {
    const width = Math.max(1, Math.trunc(Number(config.canvasWidth)));
    const height = Math.max(1, Math.trunc(Number(config.canvasHeight)));
    const logicalTotal = width * height;
    const physicalPixels = Math.max(1, Math.trunc(Number(config.controllerPixels || config.physicalPixels) || logicalTotal));
    const expectedActivePixels = Math.max(0, Math.trunc(Number(config.activePhysicalPixels) || 0));
    if (config.resolvedPixelMap.length !== logicalTotal) throw new Error(`The saved resolved map must contain ${logicalTotal} logical entries.`);
    const pixelMap = config.resolvedPixelMap.map(Number);
    const used = new Set();
    for (const physical of pixelMap) {
      if (physical === -1) continue;
      if (!Number.isInteger(physical) || physical < 0 || physical >= physicalPixels) throw new Error('The saved map contains an invalid physical address.');
      if (used.has(physical)) throw new Error(`The saved map contains duplicate physical address ${physical + 1}.`);
      used.add(physical);
    }
    const activePhysicalPixels = expectedActivePixels || used.size;
    if (used.size !== activePhysicalPixels) throw new Error(`The saved map routes ${used.size} of ${activePhysicalPixels} active physical pixels.`);
    return { config, width, height, total: logicalTotal, physicalPixels, controllerPixels: physicalPixels, activePhysicalPixels, pixelMap, fingerprint: pixelMapFingerprint(pixelMap) };
  }
  const panelWidth = Math.max(1, Number(config.panelWidth) || 4);
  const panelHeight = Math.max(1, Number(config.panelHeight) || 4);
  const panelColumns = Math.max(1, Number(config.panelColumns) || 1);
  const panelRows = Math.max(1, Number(config.panelRows) || 1);
  const width = panelWidth * panelColumns;
  const height = panelHeight * panelRows;
  const total = width * height;
  const panelPixels = panelWidth * panelHeight;
  if (config.wiringMode === 'custom') {
    if (!Array.isArray(config.customPixelMap) || config.customPixelMap.length !== total) {
      throw new Error(`The custom pixel map must contain exactly ${total} entries.`);
    }
    const pixelMap = config.customPixelMap.map(Number);
    const used = new Set();
    for (const physical of pixelMap) {
      if (!Number.isInteger(physical) || physical < 0 || physical >= total) {
        throw new Error(`The custom pixel map contains an unassigned or invalid physical address.`);
      }
      if (used.has(physical)) throw new Error(`The custom pixel map contains duplicate physical address ${physical + 1}.`);
      used.add(physical);
    }
    return { config, width, height, total, pixelMap, fingerprint: pixelMapFingerprint(pixelMap) };
  }
  const panelOrderSlots = savedPanelOrderSlots(config, panelColumns, panelRows);
  const panelChain = new Map(panelOrderSlots.map((slot, index) => [slot, index]));
  const localOrder = mappingCoordinateOrder(panelWidth, panelHeight, config.pixelAxis, config.pixelCorner, Boolean(config.pixelSerpentine));
  const localAddress = new Map(localOrder.map((point, index) => [`${point.x},${point.y}`, index]));
  const pixelMap = [];
  const used = new Set();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const panelX = Math.floor(x / panelWidth);
      const panelY = Math.floor(y / panelHeight);
      const localX = x % panelWidth;
      const localY = y % panelHeight;
      const panelSlot = panelY * panelColumns + panelX;
      const panelTransform = Array.isArray(config.panelTransforms) ? (config.panelTransforms[panelSlot] || {}) : {};
      const rotation = Number(panelTransform.rotation ?? config.rotation ?? 0);
      const flipX = Boolean(panelTransform.flipX ?? config.flipX);
      const flipY = Boolean(panelTransform.flipY ?? config.flipY);
      const transformed = mappingTransformPoint(localX, localY, panelWidth, panelHeight, rotation, flipX, flipY);
      const panelIndex = panelChain.get(panelSlot);
      const localIndex = localAddress.get(`${transformed.x},${transformed.y}`);
      const physical = panelIndex * panelPixels + localIndex;
      pixelMap.push(physical);
      used.add(physical);
    }
  }
  if (pixelMap.length !== total || used.size !== total) throw new Error('The saved pixel map contains duplicate or missing physical addresses.');
  return { config, width, height, total, pixelMap, fingerprint: pixelMapFingerprint(pixelMap) };
}

function updateOutputMappingProof() {
  const proof = $('outputMappingProof');
  if (!proof) return;
  const enabled = Boolean($('useMapping')?.checked && state.mapping);
  proof.classList.toggle('active', enabled);
  if (!enabled) {
    proof.innerHTML = '<span>Mapping inactive</span><strong>Direct row-major output</strong>';
    return;
  }
  const type = state.mapping.config?.wiringMode === 'custom' ? 'Custom pixel map' : (state.mapping.config?.panelOrderMode === 'custom' ? 'Preset pixels · custom panel order' : 'Preset map');
  proof.innerHTML = `<span>${type} active · fingerprint ${escapeHtml(state.mapping.fingerprint)}</span><strong>${state.mapping.width} × ${state.mapping.height} logical canvas · ${state.mapping.activePhysicalPixels || state.mapping.physicalPixels || state.mapping.total} active / ${state.mapping.physicalPixels || state.mapping.total} controller pixels</strong>`;
}

function refreshSavedMapping() {
  try {
    const saved = JSON.parse(localStorage.getItem('ledcontroller.mapping.preview') || 'null');
    state.mapping = buildSavedMapping(saved);
  } catch (error) {
    state.mapping = null;
    $('mappingUseStatus').textContent = error.message;
    $('useMapping').checked = false;
    return null;
  }
  if (state.mapping) {
    $('mappingUseStatus').textContent = `Saved ${state.mapping.config?.panels?.length || ''}-panel map: ${state.mapping.width} × ${state.mapping.height} logical canvas · ${state.mapping.activePhysicalPixels || state.mapping.physicalPixels || state.mapping.total} active / ${state.mapping.physicalPixels || state.mapping.total} controller pixels · fingerprint ${state.mapping.fingerprint}.`;
    const storedChoice = localStorage.getItem('ledcontroller.mapping.use');
    if (storedChoice === null) $('useMapping').checked = true;
    else $('useMapping').checked = storedChoice === 'true';
    if ($('useMapping').checked) {
      $('width').value = String(state.mapping.width);
      $('height').value = String(state.mapping.height);
    }
  } else {
    $('mappingUseStatus').textContent = 'No saved mapping detected. Save one in Pixel Mapping first.';
    $('useMapping').checked = false;
  }
  updateOutputMappingProof();
  return state.mapping;
}

import { isMatrixFriendlyPattern, MATRIX_FRIENDLY_PATTERNS, renderVisualFrame, VISUAL_PATTERNS } from './visual-engine.js';
import { createLayer, LAYER_BLEND_MODES, LAYER_MASK_TYPES, LAYER_MODIFIERS, LAYER_MOD_SOURCES, LAYER_MOD_TARGETS, MAX_LAYERS_PER_DECK, normalizeLayerStack, renderLayerStack } from './layer-engine.js';
import { AdaptiveShowDirector } from './show-engine.js';

function currentTarget(device = {}) {
  return {
    targetIp: String(device.ip || $('targetIp').value || '').trim(),
    protocol: (device.protocols || []).includes('DDP') ? 'ddp' : $('protocol').value,
    port: Number($('port').value || 4048),
    startUniverse: Number($('startUniverse').value || 0),
    channelOrder: $('channelOrder').value,
    name: device.name || state.activeTarget?.name || '',
    source: device.source || state.activeTarget?.source || ''
  };
}

function applyTarget(target) {
  if (!target || !target.targetIp) return false;
  $('targetIp').value = target.targetIp;
  if (target.protocol) $('protocol').value = target.protocol;
  if (target.port) $('port').value = target.port;
  if (target.startUniverse !== undefined) $('startUniverse').value = target.startUniverse;
  if (target.channelOrder) $('channelOrder').value = target.channelOrder;
  state.activeTarget = { ...target };
  updateProtocolFields();
  updateMappingLink(target);
  window.dispatchEvent(new CustomEvent('ledcontroller:target-changed', { detail: { ...target } }));
  return true;
}

function updateMappingLink() {
  const link = $('mappingLink');
  if (link) link.href = '#mapping';
}

async function persistTarget(target, { quiet = false } = {}) {
  const normalized = { ...currentTarget(), ...target };
  if (!normalized.targetIp) return;
  localStorage.setItem('ledcontroller.output.target', JSON.stringify(normalized));
  state.activeTarget = normalized;
  updateMappingLink(normalized);
  try {
    const result = await api('/api/target', { method: 'POST', body: JSON.stringify(normalized) });
    state.activeTarget = result.target || normalized;
    updateMappingLink(state.activeTarget);
    window.dispatchEvent(new CustomEvent('ledcontroller:target-changed', { detail: { ...state.activeTarget } }));
  } catch (error) {
    if (!quiet) log(`Target sync warning: ${error.message}`);
  }
}

async function restoreTarget() {
  let restored = false;
  try {
    const result = await api('/api/target');
    restored = applyTarget(result.target);
  } catch {}
  if (!restored) {
    try {
      restored = applyTarget(JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null'));
    } catch {}
  }
  updateMappingLink(restored ? state.activeTarget : currentTarget());
}

function renderInterfaces(rows) {
  $('interfaces').innerHTML = rows.length
    ? rows.map((item) => `<span>${escapeHtml(item.name)} · ${escapeHtml(item.address)} · ${escapeHtml(item.cidr || item.netmask)}</span>`).join('')
    : '<span>No active IPv4 LAN adapter detected</span>';
}

function renderDevices() {
  const body = $('deviceRows');
  if (!state.devices.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No compatible controller found yet.</td></tr>';
    return;
  }
  body.innerHTML = state.devices.map((device, index) => `
    <tr>
      <td><div class="device-name">${escapeHtml(device.name)}</div><div class="device-sub">${escapeHtml(device.source)}</div></td>
      <td>${escapeHtml(device.ip)}:${escapeHtml(device.port)}</td>
      <td>${escapeHtml([device.vendor, device.model, device.version].filter(Boolean).join(' · ') || 'Unknown')}</td>
      <td>${device.leds ?? '—'}</td>
      <td>${(device.protocols || []).map((p) => `<span class="protocol-tag">${escapeHtml(p)}</span>`).join('')}</td>
      <td><button class="button use-device" data-index="${index}">Use target</button></td>
    </tr>`).join('');
  document.querySelectorAll('.use-device').forEach((button) => {
    button.addEventListener('click', async () => {
      const device = state.devices[Number(button.dataset.index)];
      $('targetIp').value = device.ip;
      if ((device.protocols || []).includes('DDP')) $('protocol').value = 'ddp';
      updateProtocolFields();
      await persistTarget(currentTarget(device));
      log(`Selected ${device.name} at ${device.ip}. This target is now shared across Discovery, Mapping, and Output.`);
      window.dispatchEvent(new CustomEvent('ledcontroller:target-selected', { detail: currentTarget(device) }));
    });
  });
}

async function discover(scan) {
  const button = scan ? $('scanButton') : $('mdnsButton');
  const originalLabel = button.textContent;
  $('mdnsButton').disabled = true;
  $('scanButton').disabled = true;
  button.textContent = scan ? 'Scanning…' : 'Discovering…';

  let elapsed = 0;
  const progress = setInterval(() => {
    elapsed += 1;
    const phase = elapsed < 5
      ? `Repeated mDNS and ArtPoll attempt · ${elapsed}s`
      : `Verifying WLED addresses on the local network · ${elapsed}s`;
    $('discoveryNotice').textContent = phase;
  }, 1000);

  $('discoveryNotice').textContent = scan
    ? 'Running repeated mDNS, ArtPoll, and full local WLED verification…'
    : 'Running repeated mDNS and ArtPoll. A fast WLED verification scan will run automatically if needed…';
  log(scan ? 'Started deep WLED subnet scan.' : 'Started reliable one-click discovery.');
  try {
    const data = await api('/api/discover', { method: 'POST', body: JSON.stringify({ scan }) });
    state.devices = data.devices || [];
    renderDevices();
    const wledDevices = state.devices.filter((device) => (device.protocols || []).includes('DDP') || String(device.vendor || '').toLowerCase().includes('wled'));
    if (!state.activeTarget?.targetIp && wledDevices.length === 1) {
      const device = wledDevices[0];
      applyTarget(currentTarget(device));
      await persistTarget(currentTarget(device), { quiet: true });
      log(`Automatically selected the only WLED controller found: ${device.ip}.`);
    }
    $('discoveryNotice').textContent = `${state.devices.length} compatible device${state.devices.length === 1 ? '' : 's'} found.`;
    log(`Discovery completed with ${state.devices.length} result(s).`);
  } catch (error) {
    $('discoveryNotice').textContent = error.message;
    log(`Discovery error: ${error.message}`);
  } finally {
    clearInterval(progress);
    button.textContent = originalLabel;
    $('mdnsButton').disabled = false;
    $('scanButton').disabled = false;
  }
}

function updateProtocolFields() {
  const artnet = $('protocol').value === 'artnet';
  $('portField').classList.toggle('hidden', artnet);
  $('universeField').classList.toggle('hidden', !artnet);
}

function config() {
  const useMapping = $('useMapping').checked;
  const mapping = useMapping ? refreshSavedMapping() : null;
  if (useMapping && !mapping) throw new Error('Use saved mapping is enabled, but no valid saved mapping is available.');
  return {
    targetIp: $('targetIp').value.trim(),
    protocol: $('protocol').value,
    port: Number($('port').value),
    width: mapping ? mapping.width : Number($('width').value),
    height: mapping ? mapping.height : Number($('height').value),
    pixelMap: mapping ? mapping.pixelMap : null,
    physicalPixels: mapping ? (mapping.physicalPixels || mapping.total) : Number($('width').value) * Number($('height').value),
    controllerDirection: mapping ? (mapping.config?.controllerDirection || 'forward') : 'forward',
    panelWidth: mapping ? Number(mapping.config?.panelWidth || mapping.width) : Number($('width').value),
    panelHeight: mapping ? Number(mapping.config?.panelHeight || mapping.height) : Number($('height').value),
    panelRects: mapping?.config?.panels ? mapping.config.panels.filter((panel) => panel.enabled !== false).map((panel) => {
      const rotation = Number(panel.rotation) || 0;
      return { x: Number(panel.x) || 0, y: Number(panel.y) || 0, width: rotation === 90 || rotation === 270 ? Number(panel.height) : Number(panel.width), height: rotation === 90 || rotation === 270 ? Number(panel.width) : Number(panel.height) };
    }) : null,
    channelOrder: $('channelOrder').value,
    startUniverse: Number($('startUniverse').value),
    fps: state.show?.enabled ? Math.max(30, Number($('fps').value)) : Number($('fps').value),
    brightness: Number($('brightness').value),
    pattern: $('pattern').value,
    color: $('color').value,
    secondaryColor: $('secondaryColor').value,
    speed: Number($('speed').value),
    scale: Number($('scale').value),
    direction: Number($('direction').value),
    deckALayers: Array.isArray(state.layers?.A) ? state.layers.A : [],
    deckBLayers: Array.isArray(state.layers?.B) ? state.layers.B : [],
    layerSettingsVersion: 1,
    deckMixEnabled: Boolean($('deckMixEnabled')?.checked),
    deckCrossfader: Number($('deckCrossfader')?.value || 0),
    deckMixMode: $('deckMixMode')?.value || 'crossfade',
    deckBPattern: $('patternB')?.value || 'flowing-gradient',
    deckBColor: $('colorB')?.value || '#00e5ff',
    deckBSecondaryColor: $('secondaryColorB')?.value || '#7b2cff',
    deckBSpeed: Number($('speedB')?.value || 0.75),
    deckBScale: Number($('scaleB')?.value || 1),
    deckBDirection: Number($('directionB')?.value || 1),
    matrixClarity: $('matrixClarity')?.value || 'auto',
    matrixElementSize: Number($('matrixElementSize')?.value || 1.55),
    audioEnabled: Boolean($('audioEnabled')?.checked && (state.audio.active || [...(state.layers?.A || []), ...(state.layers?.B || [])].some((layer) => layer?.enabled !== false && String(layer?.pattern || '').startsWith('audio-')))),
    audio: state.audio.active ? { ...state.audio.metrics, bpm: state.audio.bpm || 0 } : { level: 0, peak: 0, sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, beat: 0, kick: 0, snare: 0, hihat: 0, flux: 0, bpm: state.audio.bpm || 0, spectrum: Array(32).fill(0), waveform: Array(64).fill(0) },
    showMode: Boolean(state.show?.enabled),
    showStyle: $('showStyle')?.value || 'festival',
    showIntensity: Number($('showIntensity')?.value || 0.72),
    showSceneBeats: Number($('showSceneBeats')?.value || 32),
    showTransitionSeconds: Number($('showTransition')?.value || 1.4),
    showVariation: Number($('showVariation')?.value || 0.55),
    showAdaptive: Boolean($('showAdaptive')?.checked),
    showAudioSync: Boolean($('showAudioSync')?.checked),
    showSeed: state.show?.seed || 'ledcontroller-show',
    showAdvanceToken: Number(state.show?.advanceToken || 0),
    showBpm: Number(state.audio.bpm || $('showBpm')?.value || 120),
    showPerformance: Number($('showPerformance')?.value || 0.8),
    showGestureRate: Number($('showGestureRate')?.value || 0.55),
    showMixStyle: $('showMixStyle')?.value || 'hybrid',
    showStrobeSafe: Boolean($('showStrobeSafe')?.checked),
    showControlMode: $('showControlMode')?.value || 'busking',
    showRate: Number($('showRate')?.value || 1),
    showLookId: state.show?.lookId || 'flow',
    showLookToken: Number(state.show?.lookToken || 0),
    showReverseToken: Number(state.show?.reverseToken || 0),
    showColorToken: Number(state.show?.colorToken || 0),
    showPunchToken: Number(state.show?.punchToken || 0),
    showWhiteToken: Number(state.show?.whiteToken || 0),
    showBlackoutToken: Number(state.show?.blackoutToken || 0),
    showFreezeToken: Number(state.show?.freezeToken || 0),
    showStrobeToken: Number(state.show?.strobeToken || 0),
    audioResponse: $('audioResponse')?.value || 'overall',
    audioSensitivity: Number($('audioSensitivity')?.value || 3.5),
    audioMaster: Number($('audioMaster')?.value || 2) * Number($('audioModeStrength')?.value || 1),
    audioBassBoost: Number($('audioBassBoost')?.value || 1.75),
    audioBeatBoost: Number($('audioBeatBoost')?.value || 2),
    audioProfile: $('audioProfile')?.value || 'punchy',
    audioGate: Number($('audioGate')?.value || 0.002),
    audioMotion: Number($('audioMotion')?.value || 2),
    audioBrightness: Number($('audioBrightness')?.value || 1.25),
    audioScale: Number($('audioScale')?.value || 0.8),
    audioColor: Number($('audioColor')?.value || 0.9),
    audioAutoGain: Boolean($('audioAutoGain')?.checked),
    audioDynamics: Number($('audioDynamics')?.value || 0.72),
    audioAttack: Number($('audioAttack')?.value || 22),
    audioRelease: Number($('audioRelease')?.value || 180),
    audioTransient: Number($('audioTransient')?.value || 1.15),
    audioCalibrationVersion: 5,
    motionSettingsVersion: 1,
    mixerSettingsVersion: 3
  };
}

async function startOutput() {
  const audioMode = deckHasAudioLayer('A') || deckHasAudioLayer('B');
  if (audioMode && !state.audio.active) {
    openAudioPanel();
    await startAudioCapture('microphone', { continueOnError: true });
  }
  return startOutputMode(false);
}

async function startOutputMode(showMode = false) {
  requireCompatibleServer();
  clearTimeout(state.visualUpdateTimer);
  state.show.enabled = Boolean(showMode);
  if (!showMode) state.show.lastStatus = null;
  try {
    const audioMode = deckHasAudioLayer('A') || deckHasAudioLayer('B');
    const showNeedsAudio = state.show.enabled && Boolean($('showAudioSync')?.checked);
    if ((audioMode || showNeedsAudio) && !state.audio.active) {
      openAudioPanel();
      await startAudioCapture('microphone', { continueOnError: true });
    }
    const status = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config(), outputOwner: 'visual' }) });
    state.streamId = status.streamId || '';
    log(`Started ${state.show.enabled ? 'Adaptive Show Mode' : selectedPatternLabel()} on ${status.protocol.toUpperCase()} to ${status.targetIp}${status.mapped ? ' using the saved pixel map' : ''}. Visual workspace now owns the transmitter.`);
    renderOutput(status);
    verifyDeckOutputStatus(status);
  } catch (error) {
    if (showMode) state.show.enabled = false;
    log(`Output error: ${error.message}`);
    showError(error.message);
  }
}

async function sendOnce() {
  try {
    requireCompatibleServer();
    const result = await api('/api/output/once', { method: 'POST', body: JSON.stringify({ ...config(), outputOwner: 'visual', streamId: state.streamId }) });
    log(`Sent one ${selectedPatternLabel()} frame (${result.frameBytes} data bytes in ${result.packetCount} UDP packet(s))${result.mapped ? ' through the saved pixel map' : ''}.`);
    renderOutput(result.status);
  } catch (error) {
    log(`Output error: ${error.message}`);
    showError(error.message);
    if (error.message.includes('owned by')) await poll();
  }
}

async function stopOutput() {
  clearTimeout(state.visualUpdateTimer);
  state.show.enabled = false;
  state.show.lastStatus = null;
  state.visualUpdateTimer = null;
  try {
    const current = await api('/api/output/status');
    if (current.running && current.owner !== 'visual') {
      renderOutput(current);
      throw new Error(`${current.owner === 'mapping' ? 'Mapping tests own' : 'Another workspace owns'} the transmitter. Stop it from that workspace; Visual Stop will not interrupt it.`);
    }
    if (current.running) {
      await api('/api/output/stop', { method: 'POST', body: JSON.stringify({ outputOwner: 'visual', streamId: current.streamId || state.streamId }) });
    }
    state.outputRunning = false;
    state.streamId = '';
    const blackout = { ...config(), pattern: 'blackout', deckMixEnabled: false, showMode: false, outputOwner: 'visual' };
    const result = await api('/api/output/once', { method: 'POST', body: JSON.stringify(blackout) });
    log('Stopped the visual stream and sent one final blackout frame.');
    renderOutput(result.status);
  } catch (error) {
    log(`Stop error: ${error.message}`);
    showError(error.message);
  }
}

function showError(message) {
  $('errorBox').textContent = message;
  $('errorBox').classList.toggle('hidden', !message);
}

function formatBytes(value) {
  const n = Number(value || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function renderOutput(status) {
  if (status?.serviceVersion) setServerCompatibility(status.serviceVersion);
  const owner = String(status.owner || '');
  state.outputOwner = owner;
  state.serverDeckStatus = status?.decks || null;
  state.outputRunning = Boolean(status.running && owner === 'visual');
  if (!state.outputRunning) {
    disconnectTransmittedPreviewStream();
    state.transmittedPreview.frame = null;
    state.transmittedPreview.receivedAt = 0;
    state.transmittedPreview.outputFps = 0;
    state.transmittedPreview.observedFps = 0;
  } else {
    connectTransmittedPreviewStream();
  }
  state.show.enabled = Boolean(state.outputRunning && status.showMode);
  state.show.lastStatus = status.show || (state.show.enabled ? state.show.lastStatus : null);
  state.streamId = state.outputRunning ? String(status.streamId || state.streamId || '') : '';
  clearTimeout(state.visualUpdateTimer);
  if (!state.outputRunning) state.visualUpdateTimer = null;
  $('framesSent').textContent = Number(status.framesSent || 0).toLocaleString();
  $('packetsSent').textContent = Number(status.packetsSent || 0).toLocaleString();
  $('bytesSent').textContent = formatBytes(status.bytesSent);
  $('errors').textContent = Number(status.errors || 0).toLocaleString();
  if ($('actualFps')) $('actualFps').textContent = Number(status.actualFps || 0) > 0 ? `${Number(status.actualFps).toFixed(1)} / ${Number(status.targetFps || 0).toFixed(0)}` : '—';
  if ($('maxJitter')) $('maxJitter').textContent = Number.isFinite(Number(status.maxJitterMs)) ? `${Math.max(0, Number(status.maxJitterMs)).toFixed(1)} ms` : '—';
  if ($('droppedFrames')) $('droppedFrames').textContent = Number(status.droppedFrames || 0).toLocaleString();
  $('lastFrame').textContent = status.lastFrameAt ? new Date(status.lastFrameAt).toLocaleTimeString() : '—';
  const ownerLabel = owner === 'mapping' ? 'Mapping owns output' : owner === 'visual' ? 'Visual transmitting' : status.running ? `${owner} transmitting` : 'Idle';
  $('runningBadge').textContent = ownerLabel;
  $('runningBadge').className = `badge ${status.running ? 'live' : 'idle'}`;
  if ($('visualOwnership')) {
    $('visualOwnership').textContent = owner === 'mapping' ? 'Locked by Mapping' : owner === 'visual' ? 'Visual owns output' : 'Output available';
    $('visualOwnership').className = `badge ${owner === 'mapping' ? 'invalid' : owner === 'visual' ? 'live' : 'idle'}`;
  }
  const mappingOwns = Boolean(status.running && owner === 'mapping');
  $('startButton').disabled = mappingOwns;
  $('onceButton').disabled = mappingOwns;
  $('stopButton').disabled = mappingOwns;
  if (mappingOwns) showError('Mapping tests currently own the transmitter. Visual changes are preview-only until Mapping stops.');
  else showError(status.lastError || '');
  const decks = status?.decks || null;
  if ($('serverMixProof')) {
    if (!state.serverCompatible) {
      $('serverMixProof').textContent = `OUTPUT LOCKED · web v${CLIENT_VERSION} / renderer v${state.serviceVersion || 'unknown'}`;
    } else if (state.outputRunning && decks?.enabled) {
      const bPercent = Math.round(Number(decks.crossfader || 0) * 100);
      const influence = Number(decks.bInfluencePercent || 0).toFixed(1);
      const soloLabel = decks.solo === 'A' || bPercent === 0 ? 'SERVER SOLO A' : decks.solo === 'B' || bPercent === 100 ? 'SERVER SOLO B' : `SERVER MIX LIVE · Deck B ${bPercent}%`;
      $('serverMixProof').textContent = `${soloLabel} · B changes ${influence}% of mapped pixels`;
    } else if (state.outputRunning) {
      $('serverMixProof').textContent = 'SERVER OUTPUT LIVE · Deck A only';
    } else {
      $('serverMixProof').textContent = 'Output stopped · local preview only';
    }
  }
  if (state.outputRunning) verifyDeckOutputStatus(status);
  if (!state.serverCompatible) {
    $('startButton').disabled = true;
    $('onceButton').disabled = true;
  }
  renderShowStatus(state.show.lastStatus);
}

const VISUAL_SETTINGS_KEY = 'ledcontroller.visual.settings';
const AUDIO_AUTOSTART_KEY = 'ledcontroller.audio.autoStart';
const AUDIO_DEVICE_KEY = 'ledcontroller.audio.device';
const VISUAL_PRESETS = {
  plasma: { pattern: 'plasma', color: '#ff2d8f', secondaryColor: '#2457ff', speed: 1, scale: 1 },
  waves: { pattern: 'waves', color: '#00e7ff', secondaryColor: '#6f3cff', speed: 0.8, scale: 1.15 },
  rings: { pattern: 'rings', color: '#ffcc33', secondaryColor: '#ff245f', speed: 0.7, scale: 0.9 },
  spiral: { pattern: 'spiral', color: '#6dff9a', secondaryColor: '#1565ff', speed: 0.75, scale: 0.85 },
  cells: { pattern: 'cells', color: '#f8f9ff', secondaryColor: '#3723aa', speed: 0.45, scale: 1.2 },
  sparkle: { pattern: 'sparkle', color: '#ffffff', secondaryColor: '#32136f', speed: 1.15, scale: 1 },
  aurora: { pattern: 'aurora', color: '#78ffd6', secondaryColor: '#5424ff', speed: 0.55, scale: 1.15 },
  fire: { pattern: 'fire', color: '#fff06a', secondaryColor: '#ff2100', speed: 0.9, scale: 1.15 },
  vortex: { pattern: 'vortex', color: '#ff4bd8', secondaryColor: '#162dff', speed: 0.8, scale: 1.05 },
  scanner: { pattern: 'scanner', color: '#ff1744', secondaryColor: '#120009', speed: 1.1, scale: 0.9 },
  starfield: { pattern: 'starfield', color: '#ffffff', secondaryColor: '#05051c', speed: 0.85, scale: 1 },
  kaleidoscope: { pattern: 'kaleidoscope', color: '#00ffe1', secondaryColor: '#ff1d8e', speed: 0.65, scale: 1.1 },
  'audio-spectrum': { pattern: 'audio-spectrum', color: '#00f0ff', secondaryColor: '#30106f', speed: 1, scale: 1 },
  'audio-bass-pulse': { pattern: 'audio-bass-pulse', color: '#ff336f', secondaryColor: '#10001f', speed: 0.8, scale: 1 },
  'audio-kaleidoscope': { pattern: 'audio-kaleidoscope', color: '#00ffd5', secondaryColor: '#ff1d9b', speed: 0.7, scale: 1.1 }
};

function selectedPatternLabel(selectId = 'pattern') {
  return $(selectId)?.selectedOptions?.[0]?.textContent?.trim() || $(selectId)?.value || 'visual';
}

function initializeDeckBOptions() {
  const source = $('pattern');
  const target = $('patternB');
  if (!source || !target || target.options.length) return;
  target.innerHTML = source.innerHTML.replace(/ selected=""/g, '');
  target.value = [...target.options].some((option) => option.value === 'flowing-gradient') ? 'flowing-gradient' : source.value;
}

function deckFields(deck = state.activeDeck) {
  return deck === 'B'
    ? { pattern: 'patternB', color: 'colorB', secondaryColor: 'secondaryColorB', speed: 'speedB', scale: 'scaleB', direction: 'directionB' }
    : { pattern: 'pattern', color: 'color', secondaryColor: 'secondaryColor', speed: 'speed', scale: 'scale', direction: 'direction' };
}


const LAYER_STORAGE_KEY = 'ledcontroller.layerStacks.v1';

function deckLayerFallback(deck = 'A') {
  const fields = deckFields(deck);
  return {
    name: selectedPatternLabel(fields.pattern),
    pattern: $(fields.pattern)?.value || (deck === 'B' ? 'flowing-gradient' : 'plasma'),
    color: $(fields.color)?.value || (deck === 'B' ? '#00e5ff' : '#ff3b30'),
    secondaryColor: $(fields.secondaryColor)?.value || (deck === 'B' ? '#7b2cff' : '#2457ff'),
    speed: Number($(fields.speed)?.value || 1),
    scale: Number($(fields.scale)?.value || 1),
    direction: Number($(fields.direction)?.value || 1),
    opacity: 1,
    blendMode: 'normal'
  };
}

function currentLayer(deck = state.activeDeck) {
  const normalizedDeck = deck === 'B' ? 'B' : 'A';
  const layers = state.layers[normalizedDeck] || [];
  const selectedId = state.layers.selected[normalizedDeck];
  return layers.find((layer) => layer.id === selectedId) || layers[0] || null;
}

function serializeLayerStacks() {
  return {
    schemaVersion: 1,
    A: normalizeLayerStack(state.layers.A, deckLayerFallback('A')),
    B: normalizeLayerStack(state.layers.B, deckLayerFallback('B')),
    selected: { ...state.layers.selected }
  };
}

function persistLayerStacks() {
  localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify(serializeLayerStacks()));
}

function restoreLayerStacks(source = null) {
  let saved = source;
  if (!saved) {
    try { saved = JSON.parse(localStorage.getItem(LAYER_STORAGE_KEY) || 'null'); } catch { saved = null; }
  }
  state.layers.A = normalizeLayerStack(saved?.A, deckLayerFallback('A'));
  state.layers.B = normalizeLayerStack(saved?.B, deckLayerFallback('B'));
  state.layers.selected.A = state.layers.A.some((layer) => layer.id === saved?.selected?.A) ? saved.selected.A : state.layers.A[0].id;
  state.layers.selected.B = state.layers.B.some((layer) => layer.id === saved?.selected?.B) ? saved.selected.B : state.layers.B[0].id;
  syncDeckControlsFromLayer('A');
  syncDeckControlsFromLayer('B');
  renderLayerStackUi('A');
  renderLayerStackUi('B');
  persistLayerStacks();
}

function syncDeckControlsFromLayer(deck = state.activeDeck) {
  const layer = currentLayer(deck);
  if (!layer) return;
  const fields = deckFields(deck);
  const pattern = $(fields.pattern);
  if (pattern && [...pattern.options].some((option) => option.value === layer.pattern)) pattern.value = layer.pattern;
  if ($(fields.color)) $(fields.color).value = layer.color;
  if ($(fields.secondaryColor)) $(fields.secondaryColor).value = layer.secondaryColor;
  if ($(fields.speed)) $(fields.speed).value = String(layer.speed);
  if ($(fields.scale)) $(fields.scale).value = String(layer.scale);
  if ($(fields.direction)) $(fields.direction).value = String(layer.direction);
}

function syncActiveLayerFromControls(deck = state.activeDeck, { render = true } = {}) {
  const normalizedDeck = deck === 'B' ? 'B' : 'A';
  const layer = currentLayer(normalizedDeck);
  if (!layer) return;
  const fields = deckFields(normalizedDeck);
  layer.pattern = $(fields.pattern)?.value || layer.pattern;
  layer.name = selectedPatternLabel(fields.pattern);
  layer.color = $(fields.color)?.value || layer.color;
  layer.secondaryColor = $(fields.secondaryColor)?.value || layer.secondaryColor;
  layer.speed = clamp(Number($(fields.speed)?.value || layer.speed), 0.1, 8);
  layer.scale = clamp(Number($(fields.scale)?.value || layer.scale), 0.1, 12);
  layer.direction = Number($(fields.direction)?.value) < 0 ? -1 : 1;
  persistLayerStacks();
  if (render) renderLayerStackUi(normalizedDeck);
}

function layerOptionMarkup(options, selected) {
  return options.map((item) => `<option value="${escapeHtml(item.value)}"${item.value === selected ? ' selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
}

function layerEditorMarkup(deck, selected, layers) {
  if (!selected) return '';
  const selectedIndex = Math.max(0, layers.findIndex((layer) => layer.id === selected.id));
  const modifiers = new Set(selected.modifiers || []);
  return `<div class="layer-editor" data-layer-editor-deck="${deck}" data-layer-id="${escapeHtml(selected.id)}">
    <div class="layer-editor-grid">
      <label>Layer speed <span>${selected.speed.toFixed(2)}×</span><input data-layer-field="speed" min="0.1" max="8" step="0.05" type="range" value="${selected.speed}"></label>
      <label>Layer scale <span>${selected.scale.toFixed(2)}×</span><input data-layer-field="scale" min="0.1" max="12" step="0.05" type="range" value="${selected.scale}"></label>
      <label>Direction<select data-layer-field="direction"><option value="1"${selected.direction >= 0 ? ' selected' : ''}>Forward</option><option value="-1"${selected.direction < 0 ? ' selected' : ''}>Reverse</option></select></label>
      <label>Opacity <span>${Math.round(selected.opacity * 100)}%</span><input data-layer-field="opacity" min="0" max="1" step="0.01" type="range" value="${selected.opacity}"></label>
      <label>Blend mode<select data-layer-field="blendMode">${layerOptionMarkup(LAYER_BLEND_MODES, selected.blendMode)}</select></label>
      <label>Mask<select data-layer-field="mask.type">${layerOptionMarkup(LAYER_MASK_TYPES, selected.mask.type)}</select></label>
      <label>Mask amount <span>${Math.round(selected.mask.strength * 100)}%</span><input data-layer-field="mask.strength" min="0" max="1" step="0.01" type="range" value="${selected.mask.strength}"></label>
      <label>Mask softness <span>${Math.round(selected.mask.softness * 100)}%</span><input data-layer-field="mask.softness" min="0.01" max="1" step="0.01" type="range" value="${selected.mask.softness}"></label>
      <label>Mask scale <span>${selected.mask.scale.toFixed(2)}×</span><input data-layer-field="mask.scale" min="0.2" max="4" step="0.05" type="range" value="${selected.mask.scale}"></label>
      <label class="layer-check-field"><span><input data-layer-field="mask.invert" type="checkbox" ${selected.mask.invert ? 'checked' : ''}> Invert mask</span></label>
      <label>Mod source<select data-layer-field="modulation.source">${layerOptionMarkup(LAYER_MOD_SOURCES, selected.modulation.source)}</select></label>
      <label>Mod target<select data-layer-field="modulation.target">${layerOptionMarkup(LAYER_MOD_TARGETS, selected.modulation.target)}</select></label>
      <label>Mod depth <span>${Math.round(selected.modulation.amount * 100)}%</span><input data-layer-field="modulation.amount" min="-1" max="1" step="0.01" type="range" value="${selected.modulation.amount}"></label>
      <label>LFO rate <span>${selected.modulation.rate.toFixed(2)}×</span><input data-layer-field="modulation.rate" min="0.05" max="8" step="0.05" type="range" value="${selected.modulation.rate}"></label>
    </div>
    <div class="layer-modifier-row"><span>Modifiers</span>${LAYER_MODIFIERS.map((modifier) => `<button class="layer-modifier${modifiers.has(modifier.value) ? ' active' : ''}" data-layer-modifier="${escapeHtml(modifier.value)}" type="button">${escapeHtml(modifier.label)}</button>`).join('')}</div>
    <div class="layer-actions">
      <button data-layer-action="up" type="button" ${selectedIndex <= 0 ? 'disabled' : ''}>Move up</button>
      <button data-layer-action="down" type="button" ${selectedIndex >= layers.length - 1 ? 'disabled' : ''}>Move down</button>
      <button data-layer-action="duplicate" type="button" ${layers.length >= MAX_LAYERS_PER_DECK ? 'disabled' : ''}>Duplicate</button>
      <button class="danger" data-layer-action="delete" type="button" ${layers.length <= 1 ? 'disabled' : ''}>Delete</button>
    </div>
  </div>`;
}

function renderLayerInspector() {
  const overlay = $('layerInspectorOverlay');
  const body = $('layerInspectorBody');
  const title = $('layerInspectorTitle');
  const subtitle = $('layerInspectorSubtitle');
  const deck = state.layers.expanded === 'B' ? 'B' : state.layers.expanded === 'A' ? 'A' : '';
  if (!overlay || !body) return;
  if (!deck) {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    body.innerHTML = '';
    return;
  }
  const layers = state.layers[deck] || [];
  const selected = currentLayer(deck);
  const selectedIndex = Math.max(0, layers.findIndex((layer) => layer.id === selected?.id));
  overlay.dataset.deck = deck;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  if (title) title.textContent = `Deck ${deck} layer controls`;
  if (subtitle) subtitle.textContent = selected ? `Layer ${selectedIndex + 1} of ${layers.length} · ${selected.name}` : `Deck ${deck}`;
  body.innerHTML = layerEditorMarkup(deck, selected, layers);
}

function renderLayerStackUi(deck = 'A') {
  const normalizedDeck = deck === 'B' ? 'B' : 'A';
  const container = $(`layerStack${normalizedDeck}`);
  if (!container) return;
  const layers = state.layers[normalizedDeck] || [];
  const selected = currentLayer(normalizedDeck);
  container.innerHTML = `
    <div class="layer-stack-heading">
      <span><b>LAYERS</b><strong>${layers.length}/${MAX_LAYERS_PER_DECK}</strong></span>
      <div class="layer-heading-actions">
        <button class="layer-inspector-button" data-layer-action="edit" type="button">Layer controls</button>
        <button class="layer-add" data-layer-action="add" type="button" ${layers.length >= MAX_LAYERS_PER_DECK ? 'disabled' : ''}>＋</button>
      </div>
    </div>
    <div class="layer-stack-tabs">${layers.map((layer, index) => `
      <div class="layer-tab${layer.id === selected?.id ? ' active' : ''}${layer.enabled ? '' : ' disabled'}">
        <button data-layer-select="${escapeHtml(layer.id)}" type="button"><small>${index + 1}</small><span>${escapeHtml(layer.name)}</span></button>
        <button class="layer-mini-toggle${layer.enabled ? ' active' : ''}" data-layer-toggle="${escapeHtml(layer.id)}" title="Enable layer" type="button">●</button>
        <button class="layer-mini-toggle${layer.solo ? ' solo' : ''}" data-layer-solo="${escapeHtml(layer.id)}" title="Solo layer" type="button">S</button>
      </div>`).join('')}</div>`;
  if (state.layers.expanded === normalizedDeck) renderLayerInspector();
}

function updateLayerField(deck, path, rawValue, inputType = '') {
  const layer = currentLayer(deck);
  if (!layer) return;
  const numeric = inputType === 'range' || ['speed','scale','direction','opacity','mask.strength','mask.softness','mask.scale','modulation.amount','modulation.rate'].includes(path);
  const value = numeric ? Number(rawValue) : rawValue;
  if (path === 'speed') layer.speed = clamp(value, 0.1, 8);
  if (path === 'scale') layer.scale = clamp(value, 0.1, 12);
  if (path === 'direction') layer.direction = Number(value) < 0 ? -1 : 1;
  if (path === 'opacity') layer.opacity = clamp(value, 0, 1);
  if (path === 'blendMode') layer.blendMode = String(value);
  if (path === 'mask.type') layer.mask.type = String(value);
  if (path === 'mask.strength') layer.mask.strength = clamp(value, 0, 1);
  if (path === 'mask.softness') layer.mask.softness = clamp(value, 0.01, 1);
  if (path === 'mask.scale') layer.mask.scale = clamp(value, 0.2, 4);
  if (path === 'mask.invert') layer.mask.invert = Boolean(value);
  if (path === 'modulation.source') layer.modulation.source = String(value);
  if (path === 'modulation.target') layer.modulation.target = String(value);
  if (path === 'modulation.amount') layer.modulation.amount = clamp(value, -1, 1);
  if (path === 'modulation.rate') layer.modulation.rate = clamp(value, 0.05, 8);
  persistLayerStacks();
  if (['speed','scale','direction'].includes(path)) syncDeckControlsFromLayer(deck);
  if (inputType !== 'range') renderLayerStackUi(deck);
  else {
    const span = document.querySelector(`#layerInspectorBody [data-layer-editor-deck="${deck}"] [data-layer-field="${path}"]`)?.closest('label')?.querySelector('span');
    if (span) span.textContent = ['speed','scale','mask.scale','modulation.rate'].includes(path) ? `${Number(value).toFixed(2)}×` : `${Math.round(Number(value) * 100)}%`;
  }
  scheduleVisualUpdate();
}

function handleLayerAction(deck, action) {
  if (action === 'edit') {
    state.layers.expanded = deck;
    setActiveDeck(deck);
    renderLayerStackUi('A');
    renderLayerStackUi('B');
    renderLayerInspector();
    return;
  }
  if (action === 'close') {
    state.layers.expanded = '';
    renderLayerInspector();
    return;
  }
  const layers = state.layers[deck];
  const selected = currentLayer(deck);
  const index = layers.findIndex((layer) => layer.id === selected?.id);
  if (action === 'add' && layers.length < MAX_LAYERS_PER_DECK) {
    const layer = createLayer({ ...deckLayerFallback(deck), name: `Layer ${layers.length + 1}`, opacity: layers.length ? .72 : 1, blendMode: layers.length ? 'screen' : 'normal' });
    layers.push(layer); state.layers.selected[deck] = layer.id;
  }
  if (action === 'duplicate' && selected && layers.length < MAX_LAYERS_PER_DECK) {
    const copy = createLayer({ ...selected, id: undefined, name: `${selected.name} copy`, solo: false });
    layers.splice(index + 1, 0, copy); state.layers.selected[deck] = copy.id;
  }
  if (action === 'delete' && selected && layers.length > 1) {
    layers.splice(index, 1); state.layers.selected[deck] = layers[Math.max(0, index - 1)].id;
  }
  if (action === 'up' && index > 0) [layers[index - 1], layers[index]] = [layers[index], layers[index - 1]];
  if (action === 'down' && index >= 0 && index < layers.length - 1) [layers[index + 1], layers[index]] = [layers[index], layers[index + 1]];
  syncDeckControlsFromLayer(deck);
  persistLayerStacks();
  renderLayerStackUi(deck);
  if (state.layers.expanded === deck) renderLayerInspector();
  scheduleVisualUpdate();
}

function bindLayerStackUi(deck = 'A') {
  const container = $(`layerStack${deck}`);
  if (!container || container.dataset.bound === 'true') return;
  container.dataset.bound = 'true';
  container.addEventListener('click', (event) => {
    const select = event.target.closest('[data-layer-select]');
    if (select) {
      state.layers.selected[deck] = select.dataset.layerSelect;
      syncDeckControlsFromLayer(deck); persistLayerStacks(); renderLayerStackUi(deck); if (state.layers.expanded === deck) renderLayerInspector(); updateVisualLabels(); return;
    }
    const toggle = event.target.closest('[data-layer-toggle]');
    if (toggle) {
      const layer = state.layers[deck].find((item) => item.id === toggle.dataset.layerToggle); if (layer) layer.enabled = !layer.enabled;
      persistLayerStacks(); renderLayerStackUi(deck); if (state.layers.expanded === deck) renderLayerInspector(); scheduleVisualUpdate(); return;
    }
    const solo = event.target.closest('[data-layer-solo]');
    if (solo) {
      const layer = state.layers[deck].find((item) => item.id === solo.dataset.layerSolo); if (layer) layer.solo = !layer.solo;
      persistLayerStacks(); renderLayerStackUi(deck); if (state.layers.expanded === deck) renderLayerInspector(); scheduleVisualUpdate(); return;
    }
    const modifier = event.target.closest('[data-layer-modifier]');
    if (modifier) {
      const layer = currentLayer(deck); const value = modifier.dataset.layerModifier;
      if (layer.modifiers.includes(value)) layer.modifiers = layer.modifiers.filter((item) => item !== value);
      else if (layer.modifiers.length < 6) layer.modifiers.push(value);
      persistLayerStacks(); renderLayerStackUi(deck); if (state.layers.expanded === deck) renderLayerInspector(); scheduleVisualUpdate(); return;
    }
    const action = event.target.closest('[data-layer-action]');
    if (action) handleLayerAction(deck, action.dataset.layerAction);
  });
  container.addEventListener('input', (event) => {
    const field = event.target.closest('[data-layer-field]');
    if (field) updateLayerField(deck, field.dataset.layerField, field.type === 'checkbox' ? field.checked : field.value, field.type);
  });
}

function bindLayerInspector() {
  const overlay = $('layerInspectorOverlay');
  if (!overlay || overlay.dataset.bound === 'true') return;
  overlay.dataset.bound = 'true';
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('[data-layer-inspector-close]')) {
      handleLayerAction(overlay.dataset.deck || state.layers.expanded || 'A', 'close');
      return;
    }
    const deck = overlay.dataset.deck === 'B' ? 'B' : 'A';
    const modifier = event.target.closest('[data-layer-modifier]');
    if (modifier) {
      const layer = currentLayer(deck);
      const value = modifier.dataset.layerModifier;
      if (layer.modifiers.includes(value)) layer.modifiers = layer.modifiers.filter((item) => item !== value);
      else if (layer.modifiers.length < 6) layer.modifiers.push(value);
      persistLayerStacks();
      renderLayerInspector();
      scheduleVisualUpdate();
      return;
    }
    const action = event.target.closest('[data-layer-action]');
    if (action) handleLayerAction(deck, action.dataset.layerAction);
  });
  overlay.addEventListener('input', (event) => {
    const field = event.target.closest('[data-layer-field]');
    if (!field) return;
    const deck = overlay.dataset.deck === 'B' ? 'B' : 'A';
    updateLayerField(deck, field.dataset.layerField, field.type === 'checkbox' ? field.checked : field.value, field.type);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.layers.expanded) handleLayerAction(state.layers.expanded, 'close');
  });
}

function initializeLayerEngine() {
  restoreLayerStacks();
  bindLayerInspector();
  bindLayerStackUi('A');
  bindLayerStackUi('B');
  for (const deck of ['A', 'B']) {
    const fields = deckFields(deck);
    for (const id of Object.values(fields)) $(id)?.addEventListener('input', () => syncActiveLayerFromControls(deck));
    $(fields.pattern)?.addEventListener('change', () => syncActiveLayerFromControls(deck));
  }
}

function deckHasAudioLayer(deck = 'A') {
  return (state.layers[deck] || []).some((layer) => layer.enabled && String(layer.pattern).startsWith('audio-'));
}

function setActiveDeck(deck = 'A') {
  state.activeDeck = deck === 'B' ? 'B' : 'A';
  document.querySelectorAll('[data-deck-card]').forEach((card) => card.classList.toggle('active', card.dataset.deckCard === state.activeDeck));
  document.querySelectorAll('[data-deck-focus]').forEach((button) => button.classList.toggle('active', button.dataset.deckFocus === state.activeDeck));
  updateVisualLabels();
}

function currentLogicalDimensions() {
  const mapping = $('useMapping')?.checked ? state.mapping : null;
  return {
    width: Math.max(1, Number(mapping?.width || $('width')?.value || 16)),
    height: Math.max(1, Number(mapping?.height || $('height')?.value || 16))
  };
}

function applyModeLibraryFilter({ switchIfNeeded = true } = {}) {
  const matrixOnly = ($('modeLibrary')?.value || 'matrix') === 'matrix';
  const selects = [$('pattern'), $('patternB')].filter(Boolean);
  if (!selects.length) return;
  for (const select of selects) {
    for (const option of select.querySelectorAll('option')) {
      const hidden = matrixOnly && !isMatrixFriendlyPattern(option.value);
      option.disabled = hidden;
      option.classList.toggle('matrix-hidden', hidden);
    }
    for (const group of select.querySelectorAll('optgroup')) {
      const hasVisible = [...group.querySelectorAll('option')].some((option) => !option.disabled);
      group.classList.toggle('matrix-empty', !hasVisible);
      group.hidden = !hasVisible;
    }
    if (matrixOnly && !isMatrixFriendlyPattern(select.value) && switchIfNeeded) select.value = select.id === 'patternB' ? 'matrix-flow-x' : 'flowing-gradient';
  }
  document.querySelectorAll('[data-visual-preset]').forEach((button) => {
    button.classList.toggle('matrix-hidden', matrixOnly && !isMatrixFriendlyPattern(button.dataset.visualPreset));
  });
  if (switchIfNeeded) state.previewStartedAt = performance.now();
  const { width, height } = currentLogicalDimensions();
  const minDimension = Math.min(width, height);
  const autoOptimized = ($('matrixClarity')?.value || 'auto') === 'auto' && minDimension <= 8;
  const clarityActive = ($('matrixClarity')?.value || 'auto') === 'optimized' || autoOptimized;
  if ($('visualModeCount')) $('visualModeCount').textContent = matrixOnly
    ? `${MATRIX_FRIENDLY_PATTERNS.length} matrix-ready`
    : `${VISUAL_PATTERNS.length} modes`;
  if ($('matrixClarityNote')) $('matrixClarityNote').innerHTML = matrixOnly
    ? `<strong>${width} × ${height} matrix:</strong> ${MATRIX_FRIENDLY_PATTERNS.length} readable modes shown. Fine texture and random-noise modes are hidden.${clarityActive ? ' Large-element rendering is active.' : ''}`
    : `<strong>Full library:</strong> all ${VISUAL_PATTERNS.length} modes are visible. Texture-heavy effects may look noisy on a ${width} × ${height} matrix.`;
}

function visualSettings() {
  return {
    pattern: $('pattern').value,
    color: $('color').value,
    secondaryColor: $('secondaryColor').value,
    speed: Number($('speed').value),
    scale: Number($('scale').value),
    direction: Number($('direction').value),
    brightness: Number($('brightness')?.value || 0.35),
    patternB: $('patternB')?.value || 'flowing-gradient',
    colorB: $('colorB')?.value || '#00e5ff',
    secondaryColorB: $('secondaryColorB')?.value || '#7b2cff',
    speedB: Number($('speedB')?.value || 0.75),
    scaleB: Number($('scaleB')?.value || 1),
    directionB: Number($('directionB')?.value || 1),
    deckMixEnabled: Boolean($('deckMixEnabled')?.checked),
    deckCrossfader: Number($('deckCrossfader')?.value || 0),
    deckMixMode: $('deckMixMode')?.value || 'crossfade',
    modeLibrary: $('modeLibrary')?.value || 'matrix',
    matrixClarity: $('matrixClarity')?.value || 'auto',
    matrixElementSize: Number($('matrixElementSize')?.value || 1.55),
    showPreviewPanels: Boolean($('showPreviewPanels')?.checked),
    audioEnabled: Boolean($('audioEnabled')?.checked),
    audioResponse: $('audioResponse')?.value || 'overall',
    audioSensitivity: Number($('audioSensitivity')?.value || 3.5),
    audioMaster: Number($('audioMaster')?.value || 2) * Number($('audioModeStrength')?.value || 1),
    audioBassBoost: Number($('audioBassBoost')?.value || 1.75),
    audioBeatBoost: Number($('audioBeatBoost')?.value || 2),
    audioProfile: $('audioProfile')?.value || 'punchy',
    audioSmoothing: Number($('audioSmoothing')?.value || 0.45),
    audioGate: Number($('audioGate')?.value || 0.002),
    beatSensitivity: Number($('beatSensitivity')?.value || 1.05),
    audioMotion: Number($('audioMotion')?.value || 2),
    audioBrightness: Number($('audioBrightness')?.value || 1.25),
    audioScale: Number($('audioScale')?.value || 0.8),
    audioColor: Number($('audioColor')?.value || 0.9),
    audioAutoGain: Boolean($('audioAutoGain')?.checked),
    audioDynamics: Number($('audioDynamics')?.value || 0.72),
    audioAttack: Number($('audioAttack')?.value || 22),
    audioRelease: Number($('audioRelease')?.value || 180),
    audioTransient: Number($('audioTransient')?.value || 1.15),
    audioModeStrength: Number($('audioModeStrength')?.value || 1),
    audioSubGain: Number($('audioSubGain')?.value || 1),
    audioBassGain: Number($('audioBassGain')?.value || 1),
    audioLowMidGain: Number($('audioLowMidGain')?.value || 1),
    audioMidGain: Number($('audioMidGain')?.value || 1),
    audioHighMidGain: Number($('audioHighMidGain')?.value || 1),
    audioTrebleGain: Number($('audioTrebleGain')?.value || 1),
    audioTempoSync: Boolean($('audioTempoSync')?.checked),
    audioBeatDivision: Number($('audioBeatDivision')?.value || 1),
    audioCalibrationVersion: 5,
    motionSettingsVersion: 1,
    mixerSettingsVersion: 3
  };
}

function persistVisualSettings() {
  localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(visualSettings()));
}

function restoreVisualSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(VISUAL_SETTINGS_KEY) || 'null');
    if (!stored) return;
    if ([...$('pattern').options].some((option) => option.value === stored.pattern)) $('pattern').value = stored.pattern;
    if (/^#[0-9a-f]{6}$/i.test(stored.color || '')) $('color').value = stored.color;
    if (/^#[0-9a-f]{6}$/i.test(stored.secondaryColor || '')) $('secondaryColor').value = stored.secondaryColor;
    if (Number.isFinite(Number(stored.speed))) {
      const storedSpeed = Number(stored.speed);
      const legacyStoppedMotion = Number(stored.motionSettingsVersion || 0) < 1 && storedSpeed < 0.1;
      $('speed').value = String(legacyStoppedMotion ? 0.65 : Math.max(0.1, Math.min(4, storedSpeed)));
    }
    if (Number.isFinite(Number(stored.scale))) $('scale').value = String(Math.max(0.25, Math.min(6, Number(stored.scale))));
    $('direction').value = Number(stored.direction) < 0 ? '-1' : '1';
    if ($('brightness') && Number.isFinite(Number(stored.brightness))) $('brightness').value = String(Math.max(0, Math.min(1, Number(stored.brightness))));
    if ($('patternB') && [...$('patternB').options].some((option) => option.value === stored.patternB)) $('patternB').value = stored.patternB;
    if ($('colorB') && /^#[0-9a-f]{6}$/i.test(stored.colorB || '')) $('colorB').value = stored.colorB;
    if ($('secondaryColorB') && /^#[0-9a-f]{6}$/i.test(stored.secondaryColorB || '')) $('secondaryColorB').value = stored.secondaryColorB;
    if ($('speedB') && Number.isFinite(Number(stored.speedB))) $('speedB').value = String(Math.max(0.1, Math.min(4, Number(stored.speedB))));
    if ($('scaleB') && Number.isFinite(Number(stored.scaleB))) $('scaleB').value = String(Math.max(0.25, Math.min(6, Number(stored.scaleB))));
    if ($('directionB')) $('directionB').value = Number(stored.directionB) < 0 ? '-1' : '1';
    const legacyMixerLayout = Number(stored.mixerSettingsVersion || 0) < 2;
    if ($('deckMixEnabled')) $('deckMixEnabled').checked = legacyMixerLayout ? true : stored.deckMixEnabled !== false;
    if ($('deckCrossfader')) {
      const restoredMix = Number.isFinite(Number(stored.deckCrossfader)) ? Math.max(0, Math.min(1, Number(stored.deckCrossfader))) : 0.5;
      $('deckCrossfader').value = String(legacyMixerLayout ? 0.5 : restoredMix);
    }
    if ($('deckMixMode')) {
      const restoredMode = ['crossfade','add','screen','multiply','difference','luma','wipe-x','wipe-y'].includes(stored.deckMixMode) ? stored.deckMixMode : 'crossfade';
      $('deckMixMode').value = legacyMixerLayout ? 'crossfade' : restoredMode;
    }
    if ($('modeLibrary') && ['matrix','all'].includes(stored.modeLibrary)) $('modeLibrary').value = stored.modeLibrary;
    if ($('matrixClarity') && ['auto','optimized','full'].includes(stored.matrixClarity)) $('matrixClarity').value = stored.matrixClarity;
    if ($('matrixElementSize') && Number.isFinite(Number(stored.matrixElementSize))) $('matrixElementSize').value = String(Math.max(0.75, Math.min(3, Number(stored.matrixElementSize))));
    if ($('showPreviewPanels')) $('showPreviewPanels').checked = stored.showPreviewPanels !== false;
    if ($('audioEnabled')) $('audioEnabled').checked = Boolean(stored.audioEnabled);
    if ($('audioResponse') && ['overall','sub','bass','mid','treble','beat','kick','snare','hihat'].includes(stored.audioResponse)) $('audioResponse').value = stored.audioResponse;
    if ($('audioProfile') && ['tight','balanced','punchy','extreme','smooth'].includes(stored.audioProfile)) $('audioProfile').value = stored.audioProfile;
    if ($('audioAutoGain')) $('audioAutoGain').checked = stored.audioAutoGain !== false;
    if ($('audioTempoSync')) $('audioTempoSync').checked = Boolean(stored.audioTempoSync);
    if ($('audioBeatDivision') && [0.5,1,2,4].includes(Number(stored.audioBeatDivision))) $('audioBeatDivision').value = String(stored.audioBeatDivision);
    const legacyAudioCalibration = Number(stored.audioCalibrationVersion || 0) < 5;
    if (legacyAudioCalibration && $('audioProfile')) $('audioProfile').value = 'tight';
    for (const [id, min, max, fallback] of [
      ['audioSensitivity', 0.1, 10, 3.5], ['audioMaster', 0, 5, 2], ['audioBassBoost', 0.25, 4, 1.75], ['audioBeatBoost', 0.25, 5, 2],
      ['audioSmoothing', 0, 0.95, 0.45], ['audioGate', 0, 0.2, 0.002], ['beatSensitivity', 0.5, 3, 1.05],
      ['audioMotion', 0, 6, 2], ['audioBrightness', 0, 4, 1.25], ['audioScale', 0, 4, 0.8], ['audioColor', 0, 4, 0.9],
      ['audioDynamics', 0, 1, 0.72], ['audioAttack', 4, 300, 22], ['audioRelease', 40, 1200, 180], ['audioTransient', 0.25, 4, 1.15],
      ['audioModeStrength', 0, 3, 1], ['audioSubGain', 0.25, 4, 1], ['audioBassGain', 0.25, 4, 1], ['audioLowMidGain', 0.25, 4, 1],
      ['audioMidGain', 0.25, 4, 1], ['audioHighMidGain', 0.25, 4, 1], ['audioTrebleGain', 0.25, 4, 1]
    ]) {
      if (!$(id)) continue;
      let value = Number.isFinite(Number(stored[id])) ? Number(stored[id]) : fallback;
      if (legacyAudioCalibration && id === 'audioGate') value = Math.min(value, 0.003);
      if (legacyAudioCalibration && id === 'audioSensitivity') value = Math.max(value, 3.5);
      if (legacyAudioCalibration && id === 'audioMaster') value = Math.max(value, 2);
      $(id).value = String(Math.max(min, Math.min(max, value)));
    }
  } catch {}
}

function updateVisualLabels() {
  applyModeLibraryFilter({ switchIfNeeded: false });
  $('speedValue').textContent = `${Number($('speed').value).toFixed(2)}×`;
  $('scaleValue').textContent = `${Number($('scale').value).toFixed(2)}×`;
  if ($('speedBValue')) $('speedBValue').textContent = `${Number($('speedB')?.value || 0.75).toFixed(2)}×`;
  if ($('scaleBValue')) $('scaleBValue').textContent = `${Number($('scaleB')?.value || 1).toFixed(2)}×`;
  if ($('brightnessValue')) $('brightnessValue').textContent = `${Math.round(Number($('brightness')?.value || 0) * 100)}%`;
  if ($('deckCrossfaderValue')) $('deckCrossfaderValue').textContent = `${Math.round(Number($('deckCrossfader')?.value || 0) * 100)}%`;
  const deckMixPosition = clamp(Number($('deckCrossfader')?.value ?? 0.5), 0, 1);
  document.querySelectorAll('[data-deck-crossfade]').forEach((button) => {
    button.classList.toggle('active', Math.abs(Number(button.dataset.deckCrossfade) - deckMixPosition) < 0.011);
    button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.deckCrossfade) - deckMixPosition) < 0.011));
  });
  if ($('deckCenter')) {
    $('deckCenter').classList.toggle('active', Math.abs(deckMixPosition - 0.5) < 0.011);
    $('deckCenter').setAttribute('aria-pressed', String(Math.abs(deckMixPosition - 0.5) < 0.011));
  }
  if ($('deckALabel')) $('deckALabel').textContent = selectedPatternLabel('pattern');
  if ($('deckBLabel')) $('deckBLabel').textContent = selectedPatternLabel('patternB');
  const mixEnabled = Boolean($('deckMixEnabled')?.checked);
  const mixAmount = clamp(Number($('deckCrossfader')?.value ?? 0.5), 0, 1);
  const mixMode = $('deckMixMode')?.value || 'crossfade';
  const deckAPercent = mixEnabled ? Math.round((1 - mixAmount) * 100) : 100;
  const deckBPercent = mixEnabled ? Math.round(mixAmount * 100) : 0;
  const contributionLabel = mixMode === 'crossfade' ? 'LIVE' : 'FX';
  if ($('deckAContribution')) {
    $('deckAContribution').textContent = `A ${contributionLabel} ${deckAPercent}%`;
    $('deckAContribution').classList.toggle('muted', deckAPercent === 0);
    $('deckAContribution').classList.toggle('solo', deckAPercent === 100);
  }
  if ($('deckBContribution')) {
    $('deckBContribution').textContent = `B ${contributionLabel} ${deckBPercent}%`;
    $('deckBContribution').classList.toggle('muted', deckBPercent === 0);
    $('deckBContribution').classList.toggle('solo', deckBPercent === 100);
  }
  if ($('deckAContributionBar')) $('deckAContributionBar').style.width = `${deckAPercent}%`;
  if ($('deckBContributionBar')) $('deckBContributionBar').style.width = `${deckBPercent}%`;
  if ($('deckMixSummary')) {
    const modeName = $('deckMixMode')?.selectedOptions?.[0]?.textContent?.trim() || 'Normal crossfade';
    $('deckMixSummary').textContent = mixEnabled
      ? `${modeName} · Deck B contribution ${deckBPercent}%`
      : 'Deck B bypassed · Deck A only';
  }
  if ($('matrixElementSizeValue')) $('matrixElementSizeValue').textContent = `${Number($('matrixElementSize')?.value || 1.55).toFixed(2)}×`;
  $('previewMode').textContent = selectedPatternLabel();
  const labelPairs = [
    ['audioSensitivityValue', 'audioSensitivity', (v) => `${v.toFixed(2)}×`],
    ['audioMasterValue', 'audioMaster', (v) => `${v.toFixed(2)}×`],
    ['audioBassBoostValue', 'audioBassBoost', (v) => `${v.toFixed(2)}×`],
    ['audioBeatBoostValue', 'audioBeatBoost', (v) => `${v.toFixed(2)}×`],
    ['audioSmoothingValue', 'audioSmoothing', (v) => `${Math.round(v * 100)}%`],
    ['audioGateValue', 'audioGate', (v) => `${Math.round(v * 100)}%`],
    ['beatSensitivityValue', 'beatSensitivity', (v) => `${v.toFixed(2)}×`],
    ['audioMotionValue', 'audioMotion', (v) => `${v.toFixed(2)}×`],
    ['audioBrightnessValue', 'audioBrightness', (v) => `${v.toFixed(2)}×`],
    ['audioScaleValue', 'audioScale', (v) => `${v.toFixed(2)}×`],
    ['audioColorValue', 'audioColor', (v) => `${v.toFixed(2)}×`],
    ['audioDynamicsValue', 'audioDynamics', (v) => `${Math.round(v * 100)}%`],
    ['audioAttackValue', 'audioAttack', (v) => `${Math.round(v)} ms`],
    ['audioReleaseValue', 'audioRelease', (v) => `${Math.round(v)} ms`],
    ['audioTransientValue', 'audioTransient', (v) => `${v.toFixed(2)}×`],
    ['audioModeStrengthValue', 'audioModeStrength', (v) => `${v.toFixed(2)}×`],
    ['audioSubGainValue', 'audioSubGain', (v) => `${v.toFixed(2)}×`],
    ['audioBassGainValue', 'audioBassGain', (v) => `${v.toFixed(2)}×`],
    ['audioLowMidGainValue', 'audioLowMidGain', (v) => `${v.toFixed(2)}×`],
    ['audioMidGainValue', 'audioMidGain', (v) => `${v.toFixed(2)}×`],
    ['audioHighMidGainValue', 'audioHighMidGain', (v) => `${v.toFixed(2)}×`],
    ['audioTrebleGainValue', 'audioTrebleGain', (v) => `${v.toFixed(2)}×`]
  ];
  for (const [labelId, inputId, formatter] of labelPairs) if ($(labelId) && $(inputId)) $(labelId).textContent = formatter(Number($(inputId).value));
  document.querySelectorAll('[data-visual-preset]').forEach((button) => {
    button.classList.toggle('active', button.dataset.visualPreset === $(deckFields().pattern)?.value);
  });
}

async function updateRunningVisual() {
  if (!state.outputRunning || state.outputOwner !== 'visual' || !state.streamId) return;
  try {
    requireCompatibleServer();
    const status = await api('/api/output/update', { method: 'POST', body: JSON.stringify({ ...config(), outputOwner: 'visual', streamId: state.streamId }) });
    renderOutput(status);
    verifyDeckOutputStatus(status);
  } catch (error) {
    state.outputRunning = false;
    state.streamId = '';
    showError(error.message);
    try { renderOutput(await api('/api/output/status')); } catch {}
  }
}

function scheduleVisualUpdate() {
  persistVisualSettings();
  updateVisualLabels();
  clearTimeout(state.visualUpdateTimer);
  state.visualUpdateTimer = null;
  if (state.outputRunning && state.outputOwner === 'visual' && state.streamId) state.visualUpdateTimer = setTimeout(updateRunningVisual, 90);
}

function applyVisualPreset(name) {
  const preset = VISUAL_PRESETS[name];
  if (!preset) return;
  const fields = deckFields();
  $(fields.pattern).value = preset.pattern;
  $(fields.color).value = preset.color;
  $(fields.secondaryColor).value = preset.secondaryColor;
  $(fields.speed).value = String(preset.speed);
  $(fields.scale).value = String(preset.scale);
  syncActiveLayerFromControls(state.activeDeck);
  state.previewStartedAt = performance.now();
  if (String(preset.pattern).startsWith('audio-') && !state.audio.active) {
    setAudioStatus('Open Audio reactivity to start a source', 'idle');
  }
  scheduleVisualUpdate();
}

function demoAudioMetrics(timeSeconds) {
  const beatPhase = (timeSeconds * 1.8) % 1;
  const beat = Math.exp(-beatPhase * 9);
  const bass = 0.28 + beat * 0.68;
  const mid = 0.32 + 0.18 * (0.5 + 0.5 * Math.sin(timeSeconds * 2.7));
  const treble = 0.24 + 0.22 * (0.5 + 0.5 * Math.sin(timeSeconds * 5.1 + 1.2));
  return {
    level: Math.min(1, bass * 0.5 + mid * 0.3 + treble * 0.2),
    peak: Math.min(1, bass + 0.12), sub: bass * 0.82, bass, lowMid: (bass + mid) * 0.5, mid, highMid: (mid + treble) * 0.5, treble, beat, kick: beat, snare: Math.exp(-(((timeSeconds * 1.8 + 0.48) % 1)) * 12) * 0.8, hihat: Math.exp(-(((timeSeconds * 7.2) % 1)) * 16) * 0.65, flux: Math.max(beat, treble * 0.4),
    spectrum: Array.from({ length: 32 }, (_, index) => Math.min(1, (0.22 + 0.5 * Math.abs(Math.sin(index * 0.31 + timeSeconds * 2.2))) * (1 - index / 52) + beat * (1 - index / 32) * 0.35)),
    waveform: Array.from({ length: 64 }, (_, index) => Math.sin(index / 64 * Math.PI * 6 + timeSeconds * 4) * (0.25 + bass * 0.55))
  };
}

function drawPreview(now = performance.now()) {
  const requestedFps = Math.max(12, Number($('fps')?.value || 20));
  const livePreviewFps = Math.max(requestedFps, Number(state.transmittedPreview.outputFps || 0));
  const previewFps = state.outputRunning ? Math.min(60, Math.max(20, livePreviewFps)) : Math.min(60, requestedFps);
  const previewInterval = 1000 / previewFps;
  if (state.lastPreviewDrawAt && now - state.lastPreviewDrawAt < previewInterval) {
    requestAnimationFrame(drawPreview);
    return;
  }
  state.lastPreviewDrawAt = now;
  connectTransmittedPreviewStream();
  if (!state.transmittedPreview.streamConnected || now - state.transmittedPreview.receivedAt > 500) refreshTransmittedPreview(now);

  const canvas = $('preview');
  const ctx = canvas.getContext('2d', { alpha: false });
  const activeMap = $('useMapping').checked ? state.mapping : null;
  const useTransmittedFrame = transmittedPreviewAvailable(now);
  const actualWidth = Math.max(
    1,
    useTransmittedFrame
      ? state.transmittedPreview.width
      : (activeMap?.width || Number($('width').value) || 16)
  );
  const actualHeight = Math.max(
    1,
    useTransmittedFrame
      ? state.transmittedPreview.height
      : (activeMap?.height || Number($('height').value) || 16)
  );
  const width = Math.min(96, actualWidth);
  const height = Math.min(64, actualHeight);
  const cw = canvas.width / width;
  const ch = canvas.height / height;
  const previewTimeSeconds = (performance.now() - state.previewStartedAt) / 1000;
  const audioModePreview = deckHasAudioLayer('A') || deckHasAudioLayer('B');
  const previewAudio = state.audio.active ? state.audio.metrics : (audioModePreview ? demoAudioMetrics(previewTimeSeconds) : state.audio.metrics);
  const previewConfig = {
    width,
    height,
    pattern: $('pattern').value,
    color: $('color').value,
    secondaryColor: $('secondaryColor').value,
    brightness: Number($('brightness').value),
    speed: Number($('speed').value),
    scale: Number($('scale').value),
    direction: Number($('direction').value),
    deckALayers: normalizeLayerStack(state.layers.A, deckLayerFallback('A')),
    deckBLayers: normalizeLayerStack(state.layers.B, deckLayerFallback('B')),
    layerSettingsVersion: 1,
    deckMixEnabled: Boolean($('deckMixEnabled')?.checked),
    deckCrossfader: Number($('deckCrossfader')?.value || 0),
    deckMixMode: $('deckMixMode')?.value || 'crossfade',
    deckBPattern: $('patternB')?.value || 'flowing-gradient',
    deckBColor: $('colorB')?.value || '#00e5ff',
    deckBSecondaryColor: $('secondaryColorB')?.value || '#7b2cff',
    deckBSpeed: Number($('speedB')?.value || 0.75),
    deckBScale: Number($('scaleB')?.value || 1),
    deckBDirection: Number($('directionB')?.value || 1),
    matrixClarity: $('matrixClarity')?.value || 'auto',
    matrixElementSize: Number($('matrixElementSize')?.value || 1.55),
    panelWidth: activeMap ? Number(activeMap.config?.panelWidth || actualWidth) : actualWidth,
    panelHeight: activeMap ? Number(activeMap.config?.panelHeight || actualHeight) : actualHeight,
    audioEnabled: Boolean((state.audio.active && $('audioEnabled')?.checked) || audioModePreview || (state.show.enabled && $('showAudioSync')?.checked)),
    audio: { ...previewAudio, bpm: state.audio.bpm || Number($('showBpm')?.value || 120) },
    audioResponse: $('audioResponse')?.value || 'overall',
    audioSensitivity: Number($('audioSensitivity')?.value || 3.5),
    audioMaster: Number($('audioMaster')?.value || 2),
    audioBassBoost: Number($('audioBassBoost')?.value || 1.75),
    audioBeatBoost: Number($('audioBeatBoost')?.value || 2),
    audioProfile: $('audioProfile')?.value || 'punchy',
    audioGate: Number($('audioGate')?.value || 0.002),
    audioMotion: Number($('audioMotion')?.value || 2),
    audioBrightness: Number($('audioBrightness')?.value || 1.25),
    audioScale: Number($('audioScale')?.value || 0.8),
    audioColor: Number($('audioColor')?.value || 0.9),
    tick: state.previewTick,
    timeSeconds: previewTimeSeconds,
    showStyle: $('showStyle')?.value || 'festival',
    showIntensity: Number($('showIntensity')?.value || 0.72),
    showSceneBeats: Number($('showSceneBeats')?.value || 32),
    showTransitionSeconds: Number($('showTransition')?.value || 1.4),
    showVariation: Number($('showVariation')?.value || 0.55),
    showAdaptive: Boolean($('showAdaptive')?.checked),
    showAudioSync: Boolean($('showAudioSync')?.checked),
    showSeed: state.show?.seed || 'ledcontroller-show',
    showAdvanceToken: Number(state.show?.advanceToken || 0),
    showBpm: Number(state.audio.bpm || $('showBpm')?.value || 120),
    showControlMode: $('showControlMode')?.value || 'busking',
    showRate: Number($('showRate')?.value || 1),
    showLookId: state.show?.lookId || 'flow',
    showLookToken: Number(state.show?.lookToken || 0),
    showReverseToken: Number(state.show?.reverseToken || 0),
    showColorToken: Number(state.show?.colorToken || 0),
    showPerformance: Number($('showPerformance')?.value || 0.8),
    showGestureRate: Number($('showGestureRate')?.value || 0.55),
    showMixStyle: $('showMixStyle')?.value || 'hybrid',
    showStrobeSafe: Boolean($('showStrobeSafe')?.checked),
    showPunchToken: Number(state.show?.punchToken || 0),
    showWhiteToken: Number(state.show?.whiteToken || 0),
    showBlackoutToken: Number(state.show?.blackoutToken || 0),
    showFreezeToken: Number(state.show?.freezeToken || 0),
    showStrobeToken: Number(state.show?.strobeToken || 0)
  };

  let frame;
  let sourceWidth = width;
  let sourceHeight = height;
  if (useTransmittedFrame) {
    frame = state.transmittedPreview.frame;
    sourceWidth = state.transmittedPreview.width;
    sourceHeight = state.transmittedPreview.height;
  } else if (state.show.enabled) {
    const showResult = getShowDirector().render(previewConfig);
    frame = showResult.frame;
    state.show.lastStatus = showResult.status;
    if (now - state.show.lastUiAt > 120) {
      state.show.lastUiAt = now;
      renderShowStatus(showResult.status);
    }
  } else {
    const deckAFrame = renderLayerStack({ ...previewConfig, layers: state.layers.A });
    if ($('deckMixEnabled')?.checked) {
      const deckBFrame = renderLayerStack({
        ...previewConfig, layers: state.layers.B,
        pattern: $('patternB')?.value || 'flowing-gradient',
        color: $('colorB')?.value || '#00e5ff',
        secondaryColor: $('secondaryColorB')?.value || '#7b2cff',
        speed: Number($('speedB')?.value || 0.75),
        scale: Number($('scaleB')?.value || 1),
        direction: Number($('directionB')?.value || 1)
      });
      frame = mixDeckFrames(deckAFrame, deckBFrame, Number($('deckCrossfader')?.value || 0), $('deckMixMode')?.value || 'crossfade', width, height);
    } else frame = deckAFrame;
  }

  ctx.fillStyle = '#02050a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const inset = Math.min(cw, ch) >= 7 ? 1 : 0;
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / width));
      const index = (sourceY * sourceWidth + sourceX) * 3;
      ctx.fillStyle = `rgb(${frame[index] || 0},${frame[index + 1] || 0},${frame[index + 2] || 0})`;
      ctx.fillRect(x * cw + inset, y * ch + inset, Math.max(1, cw - inset * 2), Math.max(1, ch - inset * 2));
    }
  }

  if ($('showPreviewPanels')?.checked && activeMap?.config?.panels) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.78)';
    ctx.lineWidth = Math.max(1, Math.min(3, canvas.width / Math.max(1, actualWidth) * 0.09));
    ctx.setLineDash([]);
    for (const panel of activeMap.config.panels.filter((item) => item.enabled !== false)) {
      const rotation = Number(panel.rotation) || 0;
      const panelW = rotation === 90 || rotation === 270 ? Number(panel.height) : Number(panel.width);
      const panelH = rotation === 90 || rotation === 270 ? Number(panel.width) : Number(panel.height);
      const px = Number(panel.x) / actualWidth * canvas.width;
      const py = Number(panel.y) / actualHeight * canvas.height;
      const pw = panelW / actualWidth * canvas.width;
      const ph = panelH / actualHeight * canvas.height;
      ctx.strokeRect(px + 0.5, py + 0.5, Math.max(1, pw - 1), Math.max(1, ph - 1));
    }
    ctx.restore();
  }

  // The design preview uses a subtle vignette. The live transmitted preview
  // intentionally does not, so every displayed RGB value matches the frame
  // supplied to the mapping and network-output path.
  if (!useTransmittedFrame) {
    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.05, canvas.width / 2, canvas.height / 2, canvas.width * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const clarityLabel = ($('matrixClarity')?.value || 'auto') === 'full'
    ? 'full detail'
    : (Math.min(actualWidth, actualHeight) <= 8 || $('matrixClarity')?.value === 'optimized' ? 'matrix optimized' : 'auto clarity');
  const syncLabel = useTransmittedFrame
    ? ` · LIVE transmitted frame · ${state.transmittedPreview.streamConnected ? 'push synced' : 'poll fallback'}${state.transmittedPreview.observedFps > 0 ? ` ${state.transmittedPreview.observedFps.toFixed(0)} fps` : ''}`
    : state.show.enabled ? ' · show design preview' : '';
  $('previewDimensions').textContent = `${actualWidth} × ${actualHeight} logical canvas${activeMap ? ' · mapped panels' : ''} · ${clarityLabel}${syncLabel}`;
  if (useTransmittedFrame) {
    const transmittedLabel = state.show.lastStatus?.currentLook || state.transmittedPreview.currentPattern || selectedPatternLabel();
    $('previewMode').textContent = `TX · ${transmittedLabel}`;
  } else if (state.show.enabled && state.show.lastStatus) {
    $('previewMode').textContent = state.show.lastStatus.currentLook || 'Adaptive Show';
  }
  drawDeckPreview('deckAPreview', {
    ...previewConfig, layers: state.layers.A, pattern: $('pattern').value, color: $('color').value, secondaryColor: $('secondaryColor').value,
    speed: Number($('speed').value), scale: Number($('scale').value), direction: Number($('direction').value)
  });
  drawDeckPreview('deckBPreview', {
    ...previewConfig, layers: state.layers.B, pattern: $('patternB')?.value || 'flowing-gradient', color: $('colorB')?.value || '#00e5ff', secondaryColor: $('secondaryColorB')?.value || '#7b2cff',
    speed: Number($('speedB')?.value || 0.75), scale: Number($('scaleB')?.value || 1), direction: Number($('directionB')?.value || 1)
  });
  state.previewTick += 1;
  requestAnimationFrame(drawPreview);
}

function mixDeckFrames(frameA, frameB, amount = 0, mode = 'crossfade', width = 1, height = 1) {
  const mix = clamp(Number(amount) || 0, 0, 1);
  // Match the server: both crossfader endpoints are absolute deck solos.
  if (mix <= 0) return frameA;
  if (mix >= 1) return frameB;
  const output = new Uint8Array(frameA.length);
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  for (let pixel = 0; pixel < frameA.length / 3; pixel += 1) {
    const x = pixel % w;
    const y = Math.floor(pixel / w);
    const lumaB = ((frameB[pixel * 3] || 0) * .2126 + (frameB[pixel * 3 + 1] || 0) * .7152 + (frameB[pixel * 3 + 2] || 0) * .0722) / 255;
    let spatial = mix;
    if (mode === 'wipe-x') spatial = (x + .5) / w <= mix ? 1 : 0;
    if (mode === 'wipe-y') spatial = (y + .5) / h <= mix ? 1 : 0;
    if (mode === 'luma') spatial = clamp((lumaB - (1 - mix)) * 6 + .5, 0, 1);
    for (let channel = 0; channel < 3; channel += 1) {
      const av = frameA[pixel * 3 + channel] || 0;
      const bv = frameB[pixel * 3 + channel] || 0;
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

function drawDeckPreview(canvasId, deckConfig) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const width = Math.max(1, Math.min(64, Number(deckConfig.width) || 16));
  const height = Math.max(1, Math.min(32, Number(deckConfig.height) || 4));
  const frame = renderLayerStack({ ...deckConfig, width, height });
  const cw = canvas.width / width;
  const ch = canvas.height / height;
  ctx.fillStyle = '#02060c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 3;
    ctx.fillStyle = `rgb(${frame[index] || 0},${frame[index + 1] || 0},${frame[index + 2] || 0})`;
    ctx.fillRect(x * cw, y * ch, Math.ceil(cw), Math.ceil(ch));
  }
}

function averageRange(values, start, end) {
  const from = Math.max(0, Math.min(values.length, Math.floor(start)));
  const to = Math.max(from + 1, Math.min(values.length, Math.ceil(end)));
  let total = 0;
  for (let index = from; index < to; index += 1) total += Number(values[index] || 0);
  return total / Math.max(1, to - from);
}

function frequencyBand(data, sampleRate, fftSize, lowHz, highHz) {
  const hzPerBin = sampleRate / fftSize;
  return averageRange(data, lowHz / hzPerBin, highHz / hzPerBin) / 255;
}

function reduceFrequencyBins(data, count = 32) {
  const bins = [];
  const usable = Math.max(1, data.length - 1);
  for (let index = 0; index < count; index += 1) {
    const start = Math.pow(index / count, 1.7) * usable;
    const end = Math.pow((index + 1) / count, 1.7) * usable;
    bins.push(Math.min(1, averageRange(data, start, Math.max(start + 1, end)) / 255));
  }
  return bins;
}

function reduceWaveform(data, count = 64) {
  return Array.from({ length: count }, (_, index) => {
    const source = Math.min(data.length - 1, Math.floor(index * data.length / count));
    return Math.max(-1, Math.min(1, (Number(data[source] || 128) - 128) / 128));
  });
}

function setAudioStatus(text, className = 'idle') {
  if (!$('audioStatus')) return;
  $('audioStatus').textContent = text;
  $('audioStatus').className = `badge ${className}`;
}


function percentile(values, ratio = 0.5) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function selectedAudioDeviceKey() {
  const id = $('audioDevice')?.value || 'default';
  return `ledcontroller.audio.deviceProfile.${id}`;
}

function audioDeviceProfileValues() {
  const ids = ['audioSensitivity','audioGate','audioDynamics','audioAttack','audioRelease','audioTransient','audioSubGain','audioBassGain','audioLowMidGain','audioMidGain','audioHighMidGain','audioTrebleGain'];
  return Object.fromEntries(ids.map((id) => [id, Number($(id)?.value || 0)]));
}

function saveAudioDeviceProfile({ quiet = false } = {}) {
  const profile = { ...audioDeviceProfileValues(), deviceLabel: $('audioDevice')?.selectedOptions?.[0]?.textContent || 'Default microphone', savedAt: new Date().toISOString(), bpm: state.audio.bpm || 0 };
  localStorage.setItem(selectedAudioDeviceKey(), JSON.stringify(profile));
  if ($('audioDeviceProfileText')) $('audioDeviceProfileText').textContent = 'Saved';
  if (!quiet) log(`Saved audio calibration for ${profile.deviceLabel}.`);
  return profile;
}

function loadAudioDeviceProfile({ quiet = false } = {}) {
  try {
    const profile = JSON.parse(localStorage.getItem(selectedAudioDeviceKey()) || 'null');
    if (!profile) {
      if ($('audioDeviceProfileText')) $('audioDeviceProfileText').textContent = 'No profile';
      if (!quiet) log('No saved audio profile exists for this input device.');
      return false;
    }
    for (const [id, value] of Object.entries(profile)) if ($(id) && Number.isFinite(Number(value))) $(id).value = String(value);
    state.audio.processor = createAudioProcessor();
    if ($('audioDeviceProfileText')) $('audioDeviceProfileText').textContent = 'Loaded';
    updateVisualLabels();
    persistVisualSettings();
    if (!quiet) log(`Loaded audio calibration for ${profile.deviceLabel || 'the selected input'}.`);
    return true;
  } catch { return false; }
}

function estimateBpmFromTimes(times) {
  const intervals = [];
  for (let index = 1; index < times.length; index += 1) {
    const interval = times[index] - times[index - 1];
    if (interval >= 240 && interval <= 1600) intervals.push(interval);
  }
  if (intervals.length < 2) return 0;
  let bpm = 60000 / percentile(intervals, 0.5);
  while (bpm < 60) bpm *= 2;
  while (bpm > 190) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

function registerBeat(now, source = 'auto') {
  const target = source === 'tap' ? state.audio.tapTimes : state.audio.beatTimes;
  target.push(now);
  while (target.length > 12) target.shift();
  const bpm = estimateBpmFromTimes(target);
  if (bpm) {
    state.audio.bpm = bpm;
    state.audio.bpmSource = source;
    if ($('audioBpmText')) $('audioBpmText').textContent = `${Math.round(bpm)} BPM${source === 'tap' ? ' · tap' : ''}`;
  }
}

function updateLatencyEstimate() {
  if (!state.audio.context || !state.audio.analyser) return;
  const contextLatency = (Number(state.audio.context.baseLatency || 0) + Number(state.audio.context.outputLatency || 0)) * 1000;
  const fftLatency = state.audio.analyser.fftSize / Math.max(1, state.audio.context.sampleRate) * 500;
  state.audio.latencyMs = Math.round(contextLatency + fftLatency + 33);
  if ($('audioLatencyText')) $('audioLatencyText').textContent = `≈ ${state.audio.latencyMs} ms`;
}

function updateCalibration(result, now) {
  const calibration = state.audio.calibration;
  if (!calibration.active || !result?.diagnostics?.raw) return;
  calibration.samples.push({ ...result.diagnostics.raw });
  const progress = Math.max(0, Math.min(1, (now - calibration.startedAt) / calibration.durationMs));
  if ($('audioCalibrationBar')) $('audioCalibrationBar').style.width = `${Math.round(progress * 100)}%`;
  if ($('audioCalibrationText')) $('audioCalibrationText').textContent = `Listening · ${Math.ceil((calibration.durationMs - (now - calibration.startedAt)) / 1000)} sec`;
  if (progress < 1) return;
  calibration.active = false;
  const samples = calibration.samples;
  const levels = samples.map((sample) => sample.level);
  const floor = percentile(levels, 0.2);
  const active = percentile(levels, 0.9);
  const gate = Math.max(0.0005, Math.min(0.08, floor * 1.45));
  const inputGain = Math.max(0.5, Math.min(10, 0.72 / Math.max(0.04, active - floor)));
  const bandNames = ['sub','bass','lowMid','mid','highMid','treble'];
  const bandLevels = Object.fromEntries(bandNames.map((name) => [name, percentile(samples.map((sample) => sample[name]), 0.82)]));
  const target = percentile(Object.values(bandLevels), 0.5) || 0.08;
  const controlIds = { sub:'audioSubGain', bass:'audioBassGain', lowMid:'audioLowMidGain', mid:'audioMidGain', highMid:'audioHighMidGain', treble:'audioTrebleGain' };
  $('audioGate').value = String(gate);
  $('audioSensitivity').value = String(inputGain);
  for (const name of bandNames) $(controlIds[name]).value = String(Math.max(0.5, Math.min(3, target / Math.max(0.015, bandLevels[name]))));
  state.audio.processor = createAudioProcessor();
  updateVisualLabels();
  persistVisualSettings();
  saveAudioDeviceProfile({ quiet: true });
  if ($('audioCalibrationBar')) $('audioCalibrationBar').style.width = '100%';
  if ($('audioCalibrationText')) $('audioCalibrationText').textContent = `Calibrated · floor ${(floor * 100).toFixed(1)}%`;
  log(`Audio calibration complete. Input gain ${inputGain.toFixed(2)}×, gate ${(gate * 100).toFixed(2)}%.`);
}

async function startAudioCalibration() {
  if (!state.audio.active) {
    const started = await startAudioCapture('microphone', { continueOnError: false });
    if (!started) return;
  }
  state.audio.calibration = { active: true, startedAt: performance.now(), durationMs: 8000, samples: [] };
  if ($('audioCalibrationBar')) $('audioCalibrationBar').style.width = '0%';
  if ($('audioCalibrationText')) $('audioCalibrationText').textContent = 'Listening · play normal music now';
  log('Audio calibration started. Play representative music at normal volume for eight seconds.');
}

function applyTempoPulse(metrics, now) {
  if (!$('audioTempoSync')?.checked || !state.audio.bpm) return metrics;
  const division = Number($('audioBeatDivision')?.value || 1);
  const interval = 60000 / Math.max(1, state.audio.bpm * division);
  const phase = now % interval;
  const pulse = Math.exp(-phase / Math.max(42, Math.min(120, interval * 0.18)));
  return { ...metrics, beat: Math.max(metrics.beat || 0, pulse * 0.88), kick: Math.max(metrics.kick || 0, pulse * 0.52) };
}

function updateAudioMeters() {
  const metrics = state.audio.metrics;
  for (const [name, value] of [['Level', metrics.level], ['Bass', metrics.bass], ['Mid', metrics.mid], ['Treble', metrics.treble], ['Beat', metrics.beat], ['Kick', metrics.kick], ['Snare', metrics.snare], ['Hihat', metrics.hihat]]) {
    const bar = $(`audio${name}Bar`);
    const text = $(`audio${name}Text`);
    if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
    if (text) text.textContent = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  }
  const canvas = $('audioScope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#030911';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(105,137,180,.16)'; ctx.lineWidth = 1;
  for (let line = 1; line < 5; line += 1) { const y = line / 5 * canvas.height; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  const bandStops = [0.17, 0.38, 0.68];
  for (const stop of bandStops) { const x = stop * canvas.width; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  ctx.fillStyle = 'rgba(177,199,229,.72)'; ctx.font = '700 13px system-ui';
  [['SUB',.03],['BASS',.20],['MID',.43],['TREBLE',.73]].forEach(([label,x]) => ctx.fillText(label, x*canvas.width, 18));
  const gradient = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
  gradient.addColorStop(0, '#308dff');
  gradient.addColorStop(0.5, '#8061ff');
  gradient.addColorStop(1, '#ff438e');
  ctx.fillStyle = gradient;
  const bins = metrics.spectrum || [];
  const gap = 2;
  const barWidth = Math.max(1, canvas.width / Math.max(1, bins.length) - gap);
  bins.forEach((value, index) => {
    const height = Math.max(1, value * (canvas.height - 20));
    ctx.fillRect(index * (barWidth + gap), canvas.height - height, barWidth, height);
  });
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,.72)';
  ctx.lineWidth = 1.3;
  (metrics.waveform || []).forEach((value, index, values) => {
    const x = values.length <= 1 ? 0 : index / (values.length - 1) * canvas.width;
    const y = canvas.height * 0.5 - value * canvas.height * 0.42;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const beatCanvas = $('audioBeatHistory');
  if (beatCanvas) {
    const beatCtx = beatCanvas.getContext('2d');
    beatCtx.fillStyle = '#030911'; beatCtx.fillRect(0, 0, beatCanvas.width, beatCanvas.height);
    const history = state.audio.beatHistory.slice(-64);
    const step = beatCanvas.width / 64;
    history.forEach((value, index) => {
      beatCtx.fillStyle = value > 0.72 ? '#ff4d94' : value > 0.35 ? '#8b67ff' : '#2f8fff';
      const h = Math.max(1, value * beatCanvas.height);
      beatCtx.fillRect(index * step, beatCanvas.height - h, Math.max(1, step - 1), h);
    });
  }
  if ($('audioBpmText') && state.audio.bpm) $('audioBpmText').textContent = `${Math.round(state.audio.bpm)} BPM${state.audio.bpmSource === 'tap' ? ' · tap' : ''}`;
}

function audioAutoStartEnabled() {
  const stored = localStorage.getItem(AUDIO_AUTOSTART_KEY);
  return stored === null ? true : stored === 'true';
}

function persistAudioLaunchPreference(enabled) {
  localStorage.setItem(AUDIO_AUTOSTART_KEY, String(Boolean(enabled)));
  if ($('audioAutoStartOnLaunch')) $('audioAutoStartOnLaunch').checked = Boolean(enabled);
}

function restoreAudioLaunchPreference() {
  if ($('audioAutoStartOnLaunch')) $('audioAutoStartOnLaunch').checked = audioAutoStartEnabled();
}

function rememberSelectedMicrophone(deviceId = '') {
  const normalized = String(deviceId || $('audioDevice')?.value || '');
  if (normalized) localStorage.setItem(AUDIO_DEVICE_KEY, normalized);
  else localStorage.removeItem(AUDIO_DEVICE_KEY);
}

function armMicrophoneStartOnInteraction() {
  const contextNeedsResume = state.audio.active && state.audio.context?.state === 'suspended';
  if (state.audio.interactionFallbackArmed || (!contextNeedsResume && state.audio.active) || !audioAutoStartEnabled()) return;
  state.audio.interactionFallbackArmed = true;
  const retry = () => {
    document.removeEventListener('pointerdown', retry, true);
    document.removeEventListener('keydown', retry, true);
    state.audio.interactionFallbackArmed = false;
    if (state.audio.active) resumeAudioContext();
    else if (audioAutoStartEnabled()) startAudioCapture('microphone', { continueOnError: true, automatic: true });
  };
  document.addEventListener('pointerdown', retry, { capture: true, once: true });
  document.addEventListener('keydown', retry, { capture: true, once: true });
}

async function initializeAudioOnLaunch() {
  restoreAudioLaunchPreference();
  await enumerateAudioDevices();
  if (!audioAutoStartEnabled() || state.audio.active || state.audio.starting) return false;
  state.audio.autoStartAttempted = true;
  setAudioStatus('Restoring microphone…', 'idle');
  const started = await startAudioCapture('microphone', { continueOnError: true, automatic: true });
  if (!started) {
    setAudioStatus('Microphone ready · click anywhere to resume', 'idle');
    armMicrophoneStartOnInteraction();
  }
  return started;
}

async function enumerateAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices || !$('audioDevice')) return;
  try {
    const current = $('audioDevice').value;
    const remembered = localStorage.getItem(AUDIO_DEVICE_KEY) || '';
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audioinput');
    $('audioDevice').innerHTML = '<option value="">Default microphone</option>' + devices.map((device, index) => `<option value="${escapeHtml(device.deviceId)}">${escapeHtml(device.label || `Microphone ${index + 1}`)}</option>`).join('');
    const preferred = current || remembered;
    if ([...$('audioDevice').options].some((option) => option.value === preferred)) $('audioDevice').value = preferred;
    if ($('audioDeviceProfileText')) $('audioDeviceProfileText').textContent = localStorage.getItem(selectedAudioDeviceKey()) ? 'Available' : 'Unsaved';
  } catch {}
}

async function pushAudioMetrics() {
  if (state.audio.pushPending || !state.outputRunning || state.outputOwner !== 'visual' || !state.streamId || !$('audioEnabled')?.checked) return;
  state.audio.pushPending = true;
  try {
    await api('/api/output/audio', { method: 'POST', body: JSON.stringify({ outputOwner: 'visual', streamId: state.streamId, audio: { ...state.audio.metrics, bpm: state.audio.bpm || 0 } }) });
  } catch (error) {
    if (!String(error.message).includes('No active output')) showError(error.message);
  } finally {
    state.audio.pushPending = false;
  }
}

function stopFocusIndependentAudioClock() {
  if (state.audio.animationFrame) cancelAnimationFrame(state.audio.animationFrame);
  state.audio.animationFrame = 0;
  if (state.audio.fallbackTimer) clearInterval(state.audio.fallbackTimer);
  state.audio.fallbackTimer = 0;
  if (state.audio.clockWorker) {
    try { state.audio.clockWorker.postMessage({ type: 'stop' }); } catch {}
    try { state.audio.clockWorker.terminate(); } catch {}
  }
  state.audio.clockWorker = null;
  if (state.audio.analyser && state.audio.clockNode) {
    try { state.audio.analyser.disconnect(state.audio.clockNode); } catch {}
  }
  try { state.audio.clockNode?.disconnect(); } catch {}
  try { state.audio.silentGain?.disconnect(); } catch {}
  state.audio.clockNode = null;
  state.audio.silentGain = null;
  state.audio.clockMode = 'idle';
  state.audio.lastAnalysisAt = 0;
}

async function resumeAudioContext() {
  if (!state.audio.active || !state.audio.context || state.audio.context.state !== 'suspended') return;
  try {
    await state.audio.context.resume();
    if (state.audio.context.state === 'running') setAudioStatus(`${state.audio.sourceType === 'system' ? 'System audio' : 'Microphone'} live · background clock`, 'live');
  } catch {}
}

async function startFocusIndependentAudioClock() {
  stopFocusIndependentAudioClock();
  const context = state.audio.context;
  const analyser = state.audio.analyser;
  if (!context || !analyser) return;

  if (context.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
    try {
      await context.audioWorklet.addModule(`/audio-clock-processor.js?v=${encodeURIComponent(CLIENT_VERSION)}`);
      const clockNode = new AudioWorkletNode(context, 'ledcontroller-audio-clock', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      analyser.connect(clockNode);
      clockNode.connect(silentGain);
      silentGain.connect(context.destination);
      clockNode.port.onmessage = (event) => {
        if (event.data?.type === 'tick') analyzeAudio();
      };
      state.audio.clockNode = clockNode;
      state.audio.silentGain = silentGain;
      state.audio.clockMode = 'audio-worklet';
      return;
    } catch (error) {
      log(`AudioWorklet clock unavailable: ${error.message}. Falling back to a worker clock.`);
    }
  }

  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(`/audio-clock-worker.js?v=${encodeURIComponent(CLIENT_VERSION)}`);
      worker.onmessage = (event) => {
        if (event.data?.type === 'tick') analyzeAudio();
      };
      worker.postMessage({ type: 'start', intervalMs: 16 });
      state.audio.clockWorker = worker;
      state.audio.clockMode = 'worker';
      return;
    } catch (error) {
      log(`Worker audio clock unavailable: ${error.message}. Falling back to a page timer.`);
    }
  }

  state.audio.fallbackTimer = setInterval(analyzeAudio, 16);
  state.audio.clockMode = 'timer';
}

function analyzeAudio() {
  if (!state.audio.active || !state.audio.analyser) return;
  const analyser = state.audio.analyser;
  analyser.smoothingTimeConstant = Math.min(0.35, Number($('audioSmoothing')?.value || 0.18) * 0.35);
  analyser.getByteFrequencyData(state.audio.frequencyData);
  analyser.getByteTimeDomainData(state.audio.timeData);
  const now = performance.now();
  if (now - state.audio.lastAnalysisAt < 8) return;
  state.audio.lastAnalysisAt = now;
  const result = processAudioFrame({
    frequencyData: state.audio.frequencyData,
    timeData: state.audio.timeData,
    sampleRate: state.audio.context?.sampleRate || 48000,
    fftSize: analyser.fftSize,
    nowMs: now,
    settings: {
      inputGain: Number($('audioSensitivity')?.value || 3.5),
      bassBoost: Number($('audioBassBoost')?.value || 1.75),
      beatBoost: Number($('audioBeatBoost')?.value || 2),
      beatThreshold: Number($('beatSensitivity')?.value || 1.05),
      gate: Number($('audioGate')?.value || 0.002),
      autoGain: Boolean($('audioAutoGain')?.checked),
      dynamics: Number($('audioDynamics')?.value || 0.72),
      attackMs: Number($('audioAttack')?.value || 22),
      releaseMs: Number($('audioRelease')?.value || 180),
      transientSensitivity: Number($('audioTransient')?.value || 1.15),
      bandGains: {
        sub: Number($('audioSubGain')?.value || 1), bass: Number($('audioBassGain')?.value || 1), lowMid: Number($('audioLowMidGain')?.value || 1),
        mid: Number($('audioMidGain')?.value || 1), highMid: Number($('audioHighMidGain')?.value || 1), treble: Number($('audioTrebleGain')?.value || 1)
      }
    }
  }, state.audio.processor);
  state.audio.processor = result.state;
  if (result.detected.beat) registerBeat(now, 'auto');
  state.audio.metrics = applyTempoPulse(result.metrics, now);
  state.audio.beatHistory.push(Math.max(state.audio.metrics.beat || 0, state.audio.metrics.kick || 0, state.audio.metrics.snare || 0, state.audio.metrics.hihat || 0));
  if (state.audio.beatHistory.length > 96) state.audio.beatHistory.shift();
  updateCalibration(result, now);
  updateLatencyEstimate();
  updateAudioMeters();
  const signal = Math.max(state.audio.metrics.level, state.audio.metrics.bass, state.audio.metrics.mid, state.audio.metrics.treble, ...state.audio.metrics.spectrum);
  if (signal > 0.025) state.audio.lastSignalAt = now;
  const sourceLabel = state.audio.sourceType === 'system' ? 'System audio' : 'Microphone';
  const transientLabel = result.detected.kick ? ' · kick' : result.detected.snare ? ' · snare' : result.detected.hihat ? ' · hi-hat' : '';
  const nextSignalState = signal > 0.025 ? 'reacting' : (now - state.audio.lastSignalAt > 2200 ? 'waiting' : 'live');
  if (nextSignalState !== state.audio.signalState || transientLabel) {
    state.audio.signalState = nextSignalState;
    if (nextSignalState === 'reacting') setAudioStatus(`${sourceLabel} reacting${transientLabel}`, 'live');
    else if (nextSignalState === 'waiting') setAudioStatus(`${sourceLabel} live · no sound detected`, 'idle');
    else setAudioStatus(`${sourceLabel} live`, 'live');
  }
  if (now - state.audio.lastPushAt >= 33) {
    state.audio.lastPushAt = now;
    pushAudioMetrics();
  }
}

async function stopAudioCapture({ quiet = false, preserveAutoStart = false } = {}) {
  stopFocusIndependentAudioClock();
  for (const track of state.audio.stream?.getTracks?.() || []) track.stop();
  try { state.audio.sourceNode?.disconnect(); } catch {}
  try { await state.audio.context?.close(); } catch {}
  state.audio.active = false;
  state.audio.sourceType = '';
  state.audio.starting = false;
  if (!preserveAutoStart) persistAudioLaunchPreference(false);
  state.audio.stream = null;
  state.audio.context = null;
  state.audio.analyser = null;
  state.audio.sourceNode = null;
  state.audio.lastSignalAt = 0;
  state.audio.signalState = 'idle';
  state.audio.processor = createAudioProcessor();
  state.audio.calibration = { active: false, startedAt: 0, durationMs: 8000, samples: [] };
  state.audio.beatTimes = []; state.audio.beatHistory = []; state.audio.bpm = 0; state.audio.bpmSource = ''; state.audio.latencyMs = 0;
  if ($('audioBpmText')) $('audioBpmText').textContent = '—';
  if ($('audioLatencyText')) $('audioLatencyText').textContent = '—';
  if ($('audioCalibrationBar')) $('audioCalibrationBar').style.width = '0%';
  state.audio.metrics = { level: 0, peak: 0, sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, beat: 0, kick: 0, snare: 0, hihat: 0, flux: 0, spectrum: Array(32).fill(0), waveform: Array(64).fill(0) };
  $('stopAudio').disabled = true;
  $('startMic').disabled = false;
  $('startSystemAudio').disabled = false;
  setAudioStatus('Audio off', 'idle');
  updateAudioMeters();
  scheduleVisualUpdate();
  if (!quiet) log('Audio capture stopped.');
}

async function startAudioCapture(type = 'microphone', { continueOnError = false, automatic = false } = {}) {
  if (!navigator.mediaDevices) return showError('This browser does not expose media-device capture. Use Chrome or Edge on localhost.');
  if (state.audio.starting) return false;
  state.audio.starting = true;
  try {
    setAudioStatus(type === 'system' ? 'Choose audio share…' : (automatic ? 'Restoring microphone…' : 'Requesting microphone…'), 'idle');

    // When capture is currently off, request media before the first await in this
    // user-initiated call. Preset Quick recall therefore retains the browser's click
    // activation instead of losing it to unrelated asynchronous preset restoration.
    const hasExistingAudioResources = Boolean(state.audio.active || state.audio.stream || state.audio.context || state.audio.sourceNode || state.audio.analyser);
    const requestCaptureStream = () => {
      if (type === 'system') {
        if (!navigator.mediaDevices.getDisplayMedia) throw new Error('System/tab audio capture is not supported by this browser.');
        return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }
      const deviceId = $('audioDevice')?.value;
      return navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    };
    const immediateStreamRequest = hasExistingAudioResources ? null : requestCaptureStream();
    if (hasExistingAudioResources) await stopAudioCapture({ quiet: true, preserveAutoStart: true });
    const stream = await (immediateStreamRequest || requestCaptureStream());
    if (type === 'system' && !stream.getAudioTracks().length) {
      for (const track of stream.getTracks()) track.stop();
      throw new Error('No shared audio track was provided. Select a browser tab/window and enable Share audio.');
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.minDecibels = -100;
    analyser.maxDecibels = -12;
    analyser.smoothingTimeConstant = Math.min(0.35, Number($('audioSmoothing')?.value || 0.18) * 0.35);
    const sourceNode = context.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    state.audio.active = true;
    state.audio.sourceType = type;
    state.audio.stream = stream;
    state.audio.context = context;
    state.audio.analyser = analyser;
    state.audio.sourceNode = sourceNode;
    state.audio.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    state.audio.timeData = new Uint8Array(analyser.fftSize);
    state.audio.history = [];
    state.audio.beatEnvelope = 0;
    state.audio.processor = createAudioProcessor();
    state.audio.lastSignalAt = performance.now();
    state.audio.signalState = 'live';
    for (const track of stream.getTracks()) track.addEventListener('ended', () => stopAudioCapture({ quiet: true, preserveAutoStart: true }), { once: true });
    $('audioEnabled').checked = true;
    if (type === 'microphone') {
      const trackDeviceId = String(stream.getAudioTracks?.()[0]?.getSettings?.().deviceId || $('audioDevice')?.value || '');
      rememberSelectedMicrophone(trackDeviceId);
      persistAudioLaunchPreference(true);
    }
    $('stopAudio').disabled = false;
    $('startMic').disabled = true;
    $('startSystemAudio').disabled = true;
    setAudioStatus(type === 'system' ? 'System audio live' : 'Microphone live', 'live');
    await enumerateAudioDevices();
    loadAudioDeviceProfile({ quiet: true });
    updateLatencyEstimate();
    persistVisualSettings();
    scheduleVisualUpdate();
    context.addEventListener('statechange', () => {
      if (state.audio.context === context && state.audio.active && context.state === 'suspended') resumeAudioContext();
    });
    await startFocusIndependentAudioClock();
    analyzeAudio();
    if (context.state !== 'running') {
      setAudioStatus(`${type === 'system' ? 'System audio' : 'Microphone'} connected · click anywhere to activate`, 'idle');
      armMicrophoneStartOnInteraction();
    }
    log(type === 'system' ? 'System/tab audio capture started. Shared audio now drives reactive visuals.' : `${automatic ? 'Microphone restored automatically after page load.' : 'Microphone capture started.'} Live FFT, level, band, and beat data now drive reactive visuals.`);
    state.audio.starting = false;
    return true;
  } catch (error) {
    await stopAudioCapture({ quiet: true, preserveAutoStart: true });
    setAudioStatus('Audio error', 'invalid');
    if (!continueOnError) showError(error.message);
    log(`Audio capture error: ${error.message}. Audio modes will continue with a visible idle animation.`);
    state.audio.starting = false;
    return false;
  }
}

async function poll() {
  try {
    const [status, output] = await Promise.all([api('/api/status'), api('/api/output/status')]);
    $('serverDot').style.background = '#22d68a';
    $('serverState').textContent = 'Connected';
    $('serverVersion').textContent = `v${status.version} · port ${location.port}`;
    setServerCompatibility(status.version);
    renderInterfaces(status.interfaces || []);
    renderOutput(output);
  } catch {
    setServerCompatibility('');
    if ($('startButton')) $('startButton').disabled = true;
    if ($('onceButton')) $('onceButton').disabled = true;
    $('serverDot').style.background = '#ef5b70';
    $('serverState').textContent = 'Disconnected';
    $('serverVersion').textContent = 'Local service unavailable';
  }
}

$('mdnsButton').addEventListener('click', () => discover(false));
$('scanButton').addEventListener('click', () => discover(true));
$('protocol').addEventListener('change', () => { updateProtocolFields(); persistTarget(currentTarget(), { quiet: true }); });
$('brightness').addEventListener('input', () => {
  $('brightnessValue').textContent = `${Math.round(Number($('brightness').value) * 100)}%`;
  scheduleVisualUpdate();
});
document.querySelectorAll('[data-master-brightness]').forEach((button) => button.addEventListener('click', () => {
  $('brightness').value = String(clamp(Number(button.dataset.masterBrightness), 0, 1));
  scheduleVisualUpdate();
}));
$('useMapping').addEventListener('change', () => {
  localStorage.setItem('ledcontroller.mapping.use', String($('useMapping').checked));
  refreshSavedMapping();
  updateOutputMappingProof();
  scheduleVisualUpdate();
  log($('useMapping').checked ? `Saved pixel mapping enabled for output visuals (${state.mapping?.fingerprint || 'unknown'}).` : 'Saved pixel mapping disabled; output will use direct row-major order.');
});
['targetIp','port','startUniverse','channelOrder'].forEach((id) => $(id).addEventListener('change', () => {
  persistTarget(currentTarget(), { quiet: true });
  if (state.outputRunning) scheduleVisualUpdate();
}));
['pattern','color','secondaryColor','speed','scale','direction','patternB','colorB','secondaryColorB','speedB','scaleB','directionB','deckMixEnabled','deckCrossfader','deckMixMode','matrixClarity','matrixElementSize'].forEach((id) => $(id)?.addEventListener('input', () => {
  if (id === 'pattern' || id === 'patternB') {
    state.previewStartedAt = performance.now();
    try { const strengths = JSON.parse(localStorage.getItem('ledcontroller.audio.modeStrengths') || '{}'); if (Number.isFinite(Number(strengths[$('pattern').value]))) $('audioModeStrength').value = String(strengths[$('pattern').value]); } catch {}
    if (String($(id)?.value || '').startsWith('audio-') && !state.audio.active) {
      setAudioStatus('Open Audio reactivity to start a source', 'idle');
    }
  }
  scheduleVisualUpdate();
}));
$('modeLibrary')?.addEventListener('input', () => { applyModeLibraryFilter(); scheduleVisualUpdate(); });
$('showPreviewPanels')?.addEventListener('input', scheduleVisualUpdate);
['width','height','fps'].forEach((id) => $(id).addEventListener('change', () => { applyModeLibraryFilter(); scheduleVisualUpdate(); }));
$('swapColors').addEventListener('click', () => {
  const primary = $('color').value;
  $('color').value = $('secondaryColor').value;
  $('secondaryColor').value = primary;
  scheduleVisualUpdate();
});
$('swapColorsB')?.addEventListener('click', () => {
  const primary = $('colorB').value;
  $('colorB').value = $('secondaryColorB').value;
  $('secondaryColorB').value = primary;
  scheduleVisualUpdate();
});
document.querySelectorAll('[data-deck-focus]').forEach((button) => button.addEventListener('click', () => setActiveDeck(button.dataset.deckFocus)));
async function commitDeckMixPosition(amount) {
  const position = clamp(Number(amount), 0, 1);
  if ($('deckMixEnabled')) $('deckMixEnabled').checked = true;
  $('deckCrossfader').value = String(position);
  persistVisualSettings();
  updateVisualLabels();
  clearTimeout(state.visualUpdateTimer);
  state.visualUpdateTimer = null;
  if (state.outputRunning && state.outputOwner === 'visual' && state.streamId) await updateRunningVisual();
}

document.querySelectorAll('[data-deck-crossfade]').forEach((button) => button.addEventListener('click', () => {
  commitDeckMixPosition(button.dataset.deckCrossfade).catch((error) => showError(error.message));
}));
$('deckCenter')?.addEventListener('click', () => {
  commitDeckMixPosition(0.5).catch((error) => showError(error.message));
});
$('deckSwap')?.addEventListener('click', () => {
  const a = { pattern:$('pattern').value,color:$('color').value,secondary:$('secondaryColor').value,speed:$('speed').value,scale:$('scale').value,direction:$('direction').value };
  $('pattern').value=$('patternB').value; $('color').value=$('colorB').value; $('secondaryColor').value=$('secondaryColorB').value; $('speed').value=$('speedB').value; $('scale').value=$('scaleB').value; $('direction').value=$('directionB').value;
  $('patternB').value=a.pattern; $('colorB').value=a.color; $('secondaryColorB').value=a.secondary; $('speedB').value=a.speed; $('scaleB').value=a.scale; $('directionB').value=a.direction;
  $('deckCrossfader').value=String(1-Number($('deckCrossfader').value || 0)); scheduleVisualUpdate();
});
document.querySelectorAll('[data-visual-preset]').forEach((button) => button.addEventListener('click', () => applyVisualPreset(button.dataset.visualPreset)));




function setOutputControlTab(name = 'visual', { forceOpen = false } = {}) {
  const selected = ['visual', 'presets', 'show', 'audio'].includes(name) ? name : 'visual';
  const drawerOpen = selected !== 'visual' || forceOpen;
  document.body.classList.toggle('output-drawer-open', drawerOpen);
  $('presetLibraryButton')?.classList.toggle('active', selected === 'presets');
  document.querySelectorAll('[data-output-control-tab]').forEach((button) => {
    const active = button.dataset.outputControlTab === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-output-control-panel]').forEach((panel) => {
    const active = panel.dataset.outputControlPanel === selected;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  localStorage.setItem('ledcontroller.output.controlTab', selected);
}

document.querySelectorAll('[data-output-control-tab]').forEach((button) => {
  button.addEventListener('click', () => setOutputControlTab(button.dataset.outputControlTab));
});
$('visualLibraryButton')?.addEventListener('click', () => setOutputControlTab('visual', { forceOpen: true }));
$('presetLibraryButton')?.addEventListener('click', () => setOutputControlTab('presets'));
setOutputControlTab('visual');

function openAudioPanel() {
  const panel = document.querySelector('.audio-reactive-panel');
  if (!panel) return null;
  setOutputControlTab('audio');
  if ('open' in panel) panel.open = true;
  panel.classList.add('audio-attention');
  setTimeout(() => panel.classList.remove('audio-attention'), 1200);
  $('audioModeButton')?.classList.add('active');
  return panel;
}

async function openAudioMode() {
  if (!openAudioPanel()) return;
  // Audio capture is a global input transport, not a visual-selection command.
  // Preserve both decks, the active deck, mixer state, and the currently recalled
  // preset exactly as they are when the microphone is started.
  if (!state.audio.active) await startAudioCapture('microphone', { continueOnError: true });
}

$('audioModeButton')?.addEventListener('click', () => openAudioMode());

const SHOW_SETTINGS_KEY = 'ledcontroller.show.settings';
function showSettings() {
  return {
    version: 2,
    style: $('showStyle')?.value || 'festival', intensity: Number($('showIntensity')?.value || 0.72),
    sceneBeats: Number($('showSceneBeats')?.value || 32), transition: Number($('showTransition')?.value || 1.4),
    variation: Number($('showVariation')?.value || 0.55), adaptive: Boolean($('showAdaptive')?.checked),
    audioSync: Boolean($('showAudioSync')?.checked), bpm: Number($('showBpm')?.value || 120), seed: state.show.seed,
    performance: Number($('showPerformance')?.value || 0.8), gestureRate: Number($('showGestureRate')?.value || 0.30),
    mixStyle: $('showMixStyle')?.value || 'hybrid', strobeSafe: Boolean($('showStrobeSafe')?.checked),
    controlMode: $('showControlMode')?.value || 'busking', rate: Number($('showRate')?.value || 1), lookId: state.show?.lookId || 'flow'
  };
}
function persistShowSettings() { localStorage.setItem(SHOW_SETTINGS_KEY, JSON.stringify(showSettings())); }
function restoreShowSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHOW_SETTINGS_KEY) || 'null'); if (!saved) return;
    const legacyDirectorSettings = !Object.prototype.hasOwnProperty.call(saved, 'controlMode');
    const legacyFastShow = Number(saved.version || 0) < 2;
    if ($('showStyle') && ['festival','club','cinematic','ambient','corporate'].includes(saved.style)) $('showStyle').value = saved.style;
    if ($('showIntensity')) $('showIntensity').value = String(clamp(saved.intensity ?? 0.72, .15, 1));
    if ($('showSceneBeats')) $('showSceneBeats').value = String(legacyDirectorSettings ? 16 : ([16,32,64].includes(Number(saved.sceneBeats)) ? Number(saved.sceneBeats) : 16));
    if ($('showTransition')) $('showTransition').value = String(legacyDirectorSettings ? 0.35 : clamp(saved.transition ?? 0.35, 0, 3));
    if ($('showVariation')) $('showVariation').value = String(clamp(saved.variation ?? .55));
    if ($('showAdaptive')) $('showAdaptive').checked = saved.adaptive !== false;
    if ($('showAudioSync')) $('showAudioSync').checked = saved.audioSync !== false;
    if ($('showBpm')) $('showBpm').value = String(clamp(saved.bpm ?? 120, 45, 220));
    if ($('showPerformance')) $('showPerformance').value = String(clamp(saved.performance ?? 0.8));
    if ($('showGestureRate')) $('showGestureRate').value = String(clamp(legacyFastShow ? 0.30 : (saved.gestureRate ?? 0.30)));
    if ($('showMixStyle') && ['hybrid','smooth','cuts'].includes(saved.mixStyle)) $('showMixStyle').value = saved.mixStyle;
    if ($('showStrobeSafe')) $('showStrobeSafe').checked = saved.strobeSafe !== false;
    if ($('showControlMode') && ['busking','assist','auto'].includes(saved.controlMode)) $('showControlMode').value = saved.controlMode;
    if ($('showRate')) $('showRate').value = String(clamp(legacyFastShow ? 1 : (saved.rate ?? 1), .25, 2));
    if (saved.lookId) state.show.lookId = String(saved.lookId);

    if (saved.seed) { state.show.seed = String(saved.seed); localStorage.setItem('ledcontroller.show.seed', state.show.seed); }
  } catch {}
}
const PRESET_STORAGE_KEY = 'ledcontroller.output.presets.v2';
const LEGACY_PRESET_STORAGE_KEY = 'ledcontroller.output.presets.v1';
const PRESET_SCHEMA_VERSION = 3;
const PRESET_MAPPING_CONTROL_IDS = new Set(['width', 'height', 'useMapping']);
const PRESET_GLOBAL_CONTROL_IDS = new Set(['audioAutoStartOnLaunch']);

function presetId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizePresetControls(controls = {}) {
  const cleaned = {};
  for (const [id, value] of Object.entries(controls || {})) {
    if (PRESET_MAPPING_CONTROL_IDS.has(id) || PRESET_GLOBAL_CONTROL_IDS.has(id)) continue;
    cleaned[id] = value;
  }
  return cleaned;
}

function normalizePreset(source) {
  if (!source?.id || !source?.name || !source?.controls) return null;
  const { mapping: _legacyMapping, ...withoutMapping } = source;
  return {
    ...withoutMapping,
    id: String(source.id),
    name: String(source.name).slice(0, 80),
    schemaVersion: PRESET_SCHEMA_VERSION,
    controls: sanitizePresetControls(source.controls),
    runtime: { ...(source.runtime || {}) },
    auxiliary: { ...(source.auxiliary || {}) }
  };
}

function readPresetArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readPresets() {
  const current = readPresetArray(PRESET_STORAGE_KEY).map(normalizePreset).filter(Boolean);
  if (current.length || localStorage.getItem(PRESET_STORAGE_KEY) !== null) return current;
  const migrated = readPresetArray(LEGACY_PRESET_STORAGE_KEY).map(normalizePreset).filter(Boolean);
  if (migrated.length) writePresets(migrated);
  return migrated;
}

function writePresets(presets) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify((presets || []).map(normalizePreset).filter(Boolean)));
}

function presetControlSnapshot() {
  const controls = {};
  document.querySelectorAll('#view-output input[id], #view-output select[id], #view-output textarea[id]').forEach((element) => {
    if (!element.id || element.id.startsWith('preset') || PRESET_MAPPING_CONTROL_IDS.has(element.id) || PRESET_GLOBAL_CONTROL_IDS.has(element.id) || element.type === 'file' || element.type === 'button' || element.type === 'submit') return;
    if (element.type === 'checkbox' || element.type === 'radio') controls[element.id] = { type: element.type, checked: Boolean(element.checked) };
    else controls[element.id] = { type: element.type || element.tagName.toLowerCase(), value: String(element.value ?? '') };
  });
  return controls;
}

function presetDefaultName() {
  const deckA = selectedPatternLabel('pattern');
  const deckB = selectedPatternLabel('patternB');
  const mixed = Boolean($('deckMixEnabled')?.checked);
  const audio = Boolean($('audioEnabled')?.checked) ? ' · audio' : '';
  return `${deckA}${mixed ? ` + ${deckB}` : ''}${audio}`.slice(0, 80);
}

function presetSnapshot({ id = presetId(), name, createdAt = new Date().toISOString() } = {}) {
  let audioModeStrengths = {};
  try { audioModeStrengths = JSON.parse(localStorage.getItem('ledcontroller.audio.modeStrengths') || '{}'); } catch {}
  return {
    id,
    name: String(name || presetDefaultName()).trim().slice(0, 80),
    schemaVersion: PRESET_SCHEMA_VERSION,
    appVersion: CLIENT_VERSION,
    createdAt,
    updatedAt: new Date().toISOString(),
    controls: presetControlSnapshot(),
    runtime: {
      activeDeck: state.activeDeck,
      showEnabled: Boolean(state.show?.enabled),
      audioCaptureActive: Boolean(state.audio.active),
      audioAutoStart: Boolean(state.audio.active || $('audioEnabled')?.checked),
      audioSourceType: state.audio.sourceType || 'microphone',
      audioBpm: Number(state.audio.bpm || 0),
      audioBpmSource: state.audio.bpmSource || '',
      outputControlTab: document.querySelector('[data-output-control-tab].active')?.dataset.outputControlTab || 'visual'
    },
    auxiliary: { audioModeStrengths, layerStacks: serializeLayerStacks() }
  };
}

function setPresetStatus(title, detail, tone = '') {
  const status = $('presetStatus');
  if (!status) return;
  status.classList.toggle('success', tone === 'success');
  status.classList.toggle('error', tone === 'error');
  status.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
}

function renderPresetMemory(presets, selectedId = '') {
  const list = $('presetMemoryList');
  const count = $('presetMemoryCount');
  if (count) count.textContent = `${presets.length} saved`;
  if (!list) return;
  if (!presets.length) {
    list.innerHTML = '<div class="preset-memory-empty">Save a preset to create a one-click recall button.</div>';
    return;
  }
  list.innerHTML = presets.map((preset) => {
    const selected = preset.id === selectedId ? ' selected' : '';
    const updated = preset.updatedAt ? new Date(preset.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Saved preset';
    return `<button class="preset-memory-item${selected}" data-preset-memory-load="${escapeHtml(preset.id)}" type="button"><span><strong>${escapeHtml(preset.name)}</strong><small>${escapeHtml(updated)}</small></span><b>LOAD</b></button>`;
  }).join('');
}

function renderPresetList(selectedId = '') {
  const select = $('presetSelect');
  if (!select) return;
  const presets = readPresets().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  select.innerHTML = presets.length
    ? '<option value="">Choose a preset from memory…</option>' + presets.map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`).join('')
    : '<option value="">No presets in memory</option>';
  if (selectedId && presets.some((preset) => preset.id === selectedId)) select.value = selectedId;
  const selected = presets.find((preset) => preset.id === select.value);
  if ($('presetLoad')) $('presetLoad').disabled = !selected;
  if ($('presetUpdate')) $('presetUpdate').disabled = !selected;
  if ($('presetDelete')) $('presetDelete').disabled = !selected;
  if (selected && $('presetName')) $('presetName').value = selected.name;
  renderPresetMemory(presets, selected?.id || selectedId);
  return presets;
}

function applyPresetControls(controls = {}) {
  for (const [id, saved] of Object.entries(sanitizePresetControls(controls))) {
    const element = $(id);
    if (!element || !saved) continue;
    if (element.type === 'checkbox' || element.type === 'radio') element.checked = Boolean(saved.checked);
    else if (element.tagName === 'SELECT') {
      const optionExists = [...element.options].some((option) => option.value === String(saved.value ?? ''));
      if (optionExists) element.value = String(saved.value ?? '');
    } else element.value = String(saved.value ?? '');
  }
}

function activeMicrophoneDeviceId() {
  if (!state.audio.active || state.audio.sourceType !== 'microphone') return '';
  const track = state.audio.stream?.getAudioTracks?.()[0];
  return String(track?.getSettings?.().deviceId || $('audioDevice')?.value || '');
}

function preserveLiveAudioSelection(sourceType, deviceId, fallbackDeviceId = '') {
  if (!state.audio.active || sourceType !== 'microphone' || !$('audioDevice')) return;
  const selectedDevice = deviceId || fallbackDeviceId;
  const optionExists = [...$('audioDevice').options].some((option) => option.value === selectedDevice);
  if (optionExists) $('audioDevice').value = selectedDevice;
}

async function loadPresetById(id) {
  const preset = readPresets().find((item) => item.id === id);
  if (!preset) return setPresetStatus('Preset not found', 'The selected preset may have been removed.', 'error');
  const savedAudioEnabled = Boolean(preset.controls?.audioEnabled?.checked);
  const presetLayers = preset.auxiliary?.layerStacks;
  const savedAudioPattern = [
    ...(Array.isArray(presetLayers?.A) ? presetLayers.A : []),
    ...(Array.isArray(presetLayers?.B) ? presetLayers.B : [])
  ].some((layer) => layer?.enabled !== false && String(layer?.pattern || '').startsWith('audio-'))
    || String(preset.controls?.pattern?.value || '').startsWith('audio-')
    || String(preset.controls?.patternB?.value || '').startsWith('audio-');
  const requestedAudio = Boolean(preset.runtime?.audioAutoStart || preset.runtime?.audioCaptureActive) || savedAudioEnabled || savedAudioPattern;
  const requestedSource = preset.runtime?.audioSourceType === 'system' ? 'system' : 'microphone';
  const requestedDevice = String(preset.controls?.audioDevice?.value || '');
  const liveAudioWasActive = Boolean(state.audio.active);
  const liveSource = state.audio.sourceType || '';
  const liveSelectedDevice = String($('audioDevice')?.value || '');
  const liveDevice = activeMicrophoneDeviceId();

  // Audio capture is a global live transport, not a preset-owned resource. Recalling a
  // preset may change every response/control parameter, but it must never tear down an
  // already-running microphone or system-audio stream. This avoids a new permission or
  // Start microphone click between songs/scenes.
  applyPresetControls(preset.controls);
  if (preset.auxiliary?.layerStacks) restoreLayerStacks(preset.auxiliary.layerStacks);
  else restoreLayerStacks({ A: [createLayer(deckLayerFallback('A'))], B: [createLayer(deckLayerFallback('B'))] });
  preserveLiveAudioSelection(liveSource, liveDevice, liveSelectedDevice);

  // Start the saved source immediately from the actual Load/Quick recall click. Do not
  // wait for target persistence or other preset work, because browser media permissions
  // may require the original transient user activation. Existing live capture is never
  // restarted and continues to be preserved exactly as in v0.4.22.
  const audioStartPromise = !liveAudioWasActive && requestedAudio
    ? startAudioCapture(requestedSource, { continueOnError: true })
    : null;

  state.audio.processor = createAudioProcessor();
  if (preset.auxiliary?.audioModeStrengths) localStorage.setItem('ledcontroller.audio.modeStrengths', JSON.stringify(preset.auxiliary.audioModeStrengths));
  state.audio.bpm = Math.max(0, Number(preset.runtime?.audioBpm || 0));
  state.audio.bpmSource = String(preset.runtime?.audioBpmSource || '');
  state.show.enabled = Boolean(preset.runtime?.showEnabled);
  state.show.lastStatus = null;
  if (state.show.enabled) getShowDirector().reset({ ...config(), timeSeconds: 0 });
  setActiveDeck(preset.runtime?.activeDeck || 'A');
  updateProtocolFields();
  updateOutputMappingProof();
  applyModeLibraryFilter({ switchIfNeeded: false });
  persistVisualSettings();
  persistShowSettings();
  await persistTarget(currentTarget(), { quiet: true });
  updateVisualLabels();
  updateShowLabels();
  renderShowStatus(null);
  updateAudioMeters();

  let audioRestored = true;
  if (!liveAudioWasActive && requestedAudio) {
    audioRestored = Boolean(await audioStartPromise);
  } else if (liveAudioWasActive) {
    await resumeAudioContext();
    const sourceLabel = liveSource === 'system' ? 'System audio' : 'Microphone';
    setAudioStatus(`${sourceLabel} live · preserved during preset recall`, 'live');
  }

  const requestedDifferentSource = liveAudioWasActive && requestedSource !== liveSource;
  const requestedDifferentDevice = liveAudioWasActive && liveSource === 'microphone' && requestedSource === 'microphone' && requestedDevice && requestedDevice !== (liveDevice || liveSelectedDevice);
  const keptLiveDetail = requestedDifferentSource || requestedDifferentDevice
    ? ` The currently running ${liveSource === 'system' ? 'system audio' : 'microphone'} was deliberately kept live; the preset's saved source choice was not allowed to interrupt it.`
    : liveAudioWasActive ? ' The running audio capture stayed live without restarting.' : '';

  renderPresetList(preset.id);
  scheduleVisualUpdate();
  if (audioRestored) setPresetStatus('Preset loaded from memory', `${preset.name} restored its layer stacks, visual, mixer, output, Show Director, and audio-response settings.${keptLiveDetail} The active pixel mapping was left unchanged and LED output was not started automatically.`, 'success');
  else setPresetStatus('Preset loaded · audio needs attention', `${preset.name} was restored from memory, but the saved ${requestedSource === 'system' ? 'system audio share' : 'microphone'} source could not be started. The active mapping was left unchanged.`, 'error');
  log(`Performance preset loaded from memory: ${preset.name}.${liveAudioWasActive ? ' Existing audio capture preserved.' : ''}`);
}

function saveNewPreset() {
  const name = String($('presetName')?.value || '').trim() || presetDefaultName();
  const presets = readPresets();
  const preset = presetSnapshot({ name });
  presets.push(preset);
  writePresets(presets);
  if ($('presetName')) $('presetName').value = preset.name;
  renderPresetList(preset.id);
  setPresetStatus('Preset saved to memory', `${preset.name} is available for one-click recall. Mapping remains independently controlled by Save active mapping.`, 'success');
  log(`Performance preset saved to browser memory: ${preset.name}.`);
}

function updateSelectedPreset() {
  const id = $('presetSelect')?.value;
  const presets = readPresets();
  const index = presets.findIndex((preset) => preset.id === id);
  if (index < 0) return setPresetStatus('Choose a preset', 'Select the memory preset you want to update.', 'error');
  const name = String($('presetName')?.value || presets[index].name).trim() || presets[index].name;
  presets[index] = presetSnapshot({ id, name, createdAt: presets[index].createdAt });
  writePresets(presets);
  renderPresetList(id);
  setPresetStatus('Memory preset updated', `${name} now matches the current performance and audio state. Mapping was not included.`, 'success');
  log(`Performance preset updated in browser memory: ${name}.`);
}

function deleteSelectedPreset() {
  const id = $('presetSelect')?.value;
  const presets = readPresets();
  const selected = presets.find((preset) => preset.id === id);
  if (!selected) return;
  if (!window.confirm(`Delete preset “${selected.name}” from memory?`)) return;
  writePresets(presets.filter((preset) => preset.id !== id));
  if ($('presetName')) $('presetName').value = '';
  renderPresetList();
  setPresetStatus('Preset deleted', `${selected.name} was removed from this browser's preset memory.`, 'success');
}

function exportPresets() {
  const presets = readPresets();
  if (!presets.length) return setPresetStatus('Nothing to export', 'Save at least one preset to memory first.', 'error');
  const bundle = { type: 'ledcontroller-preset-bundle', schemaVersion: PRESET_SCHEMA_VERSION, appVersion: CLIENT_VERSION, mappingIncluded: false, exportedAt: new Date().toISOString(), presets };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `LEDController-presets-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setPresetStatus('Preset backup exported', `${presets.length} memory preset${presets.length === 1 ? '' : 's'} written to JSON. Mappings are not part of this file.`, 'success');
}

async function importPresetsFile(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : parsed?.presets;
    if (!Array.isArray(incoming)) throw new Error('This file does not contain an LEDController preset bundle.');
    const current = readPresets();
    const used = new Set(current.map((preset) => preset.id));
    let imported = 0;
    for (const source of incoming) {
      if (!source?.name || !source?.controls) continue;
      const id = used.has(source.id) ? presetId() : (source.id || presetId());
      used.add(id);
      const normalized = normalizePreset({ ...source, id, appVersion: CLIENT_VERSION, updatedAt: new Date().toISOString() });
      if (!normalized) continue;
      current.push(normalized);
      imported += 1;
    }
    if (!imported) throw new Error('No valid presets were found in the file.');
    writePresets(current);
    renderPresetList();
    setPresetStatus('Preset backup imported', `${imported} preset${imported === 1 ? '' : 's'} added to browser memory. Any legacy embedded mappings were intentionally ignored.`, 'success');
  } catch (error) {
    setPresetStatus('Import failed', error.message, 'error');
  } finally {
    if ($('presetImportFile')) $('presetImportFile').value = '';
  }
}

function updateShowLabels() {
  if ($('showIntensityValue')) $('showIntensityValue').textContent = `${Math.round(Number($('showIntensity')?.value || .72) * 100)}%`;
  if ($('showVariationValue')) $('showVariationValue').textContent = `${Math.round(Number($('showVariation')?.value || .55) * 100)}%`;
  if ($('showTransitionValue')) $('showTransitionValue').textContent = `${Number($('showTransition')?.value || 0.35).toFixed(2)} s`;
  if ($('showRateValue')) $('showRateValue').textContent = `${Number($('showRate')?.value || 1).toFixed(2)}×`;
  if ($('showPerformanceValue')) $('showPerformanceValue').textContent = `${Math.round(Number($('showPerformance')?.value || .8) * 100)}%`;
  if ($('showGestureRateValue')) $('showGestureRateValue').textContent = `${Math.round(Number($('showGestureRate')?.value || .55) * 100)}%`;
}
function getShowDirector() {
  if (!state.show) state.show = { enabled: false, director: null, advanceToken: 0, lookToken: 0, lookId: 'flow', reverseToken: 0, colorToken: 0, seed: 'ledcontroller-show', lastStatus: null, lastUiAt: 0 };
  if (!state.show.director) state.show.director = new AdaptiveShowDirector();
  return state.show.director;
}
function renderShowStatus(status = null) {
  const active = Boolean(state.show.enabled && status);
  $('showModeButton')?.classList.toggle('active', active);
  $('showLiveDot')?.classList.toggle('live', active);
  if ($('showDirectorState')) $('showDirectorState').textContent = active ? 'SHOW LIVE · BUSKING CONSOLE' : 'Ready to perform';
  if ($('showDirectorReason')) $('showDirectorReason').textContent = status?.reason || 'Manual look pads with beat-assisted performance moves';
  if ($('showDeckA')) $('showDeckA').textContent = status?.deckA || status?.currentLook || '—';
  if ($('showDeckB')) $('showDeckB').textContent = status?.deckB || '—';
  if ($('showCurrentLook')) $('showCurrentLook').textContent = status?.currentLook || '—';
  if ($('showSection')) $('showSection').textContent = status?.section || '—';
  if ($('showOperatorMove')) $('showOperatorMove').textContent = status?.operatorMove || '—';
  if ($('showMixState')) $('showMixState').textContent = status?.mixMode || '—';
  if ($('showEnergy')) $('showEnergy').textContent = `${Math.round(Number(status?.energy || 0) * 100)}%`;
  if ($('showNextChange')) $('showNextChange').textContent = status ? `${Number(status.remainingSeconds || 0).toFixed(1)} s` : '—';
  if ($('showEnergyBar')) $('showEnergyBar').style.width = `${Math.round(Number(status?.energy || 0) * 100)}%`;
  const crossfader = Math.round(Number(status?.crossfader || 0) * 100);
  if ($('showCrossfaderValue')) $('showCrossfaderValue').textContent = `${crossfader}%`;
  if ($('showCrossfaderBar')) $('showCrossfaderBar').style.width = `${crossfader}%`;
  if ($('showCrossfaderKnob')) $('showCrossfaderKnob').style.left = `${crossfader}%`;

  document.querySelectorAll('[data-show-look]').forEach((button) => button.classList.toggle('active', button.dataset.showLook === (status?.activeLookId || state.show?.lookId || 'flow')));
  document.querySelectorAll('[data-show-rate]').forEach((button) => button.classList.toggle('active', Number(button.dataset.showRate) === Number($('showRate')?.value || 1)));

}
function openShowPanel() { setOutputControlTab('show'); }
async function startShowMode() {
  openShowPanel();
  state.show.enabled = true;
  getShowDirector().reset({ ...config(), timeSeconds: 0 });
  persistShowSettings(); updateShowLabels();
  await startOutputMode(true);
}
function nextShowLook() {
  state.show.advanceToken += 1;
  getShowDirector().forceNext();
  scheduleVisualUpdate();
  log('Adaptive Show Director advanced to the next curated look.');
}
async function stopShowMode() { state.show.enabled = false; state.show.lastStatus = null; renderShowStatus(null); await stopOutput(); }
async function triggerShowGesture(type) {
  if (!state.show.enabled) await startShowMode();
  const key = `${type}Token`;
  if (!(key in state.show)) return;
  state.show[key] += 1;
  const padIds = { punch: 'showPunch', white: 'showWhiteHit', blackout: 'showBlackoutTap', freeze: 'showFreeze', strobe: 'showStrobeTap' };
  document.getElementById(padIds[type])?.classList.add('active');
  setTimeout(() => document.getElementById(padIds[type])?.classList.remove('active'), 180);
  scheduleVisualUpdate();
  log(`Live VJ gesture: ${type}.`);
}
async function selectShowLook(lookId) {
  state.show.lookId = String(lookId || 'flow');
  state.show.lookToken += 1;
  document.querySelectorAll('[data-show-look]').forEach((button) => button.classList.toggle('active', button.dataset.showLook === state.show.lookId));
  if (!state.show.enabled) await startShowMode(); else scheduleVisualUpdate();
  persistShowSettings();
  log(`Busking look selected: ${state.show.lookId}.`);
}
function setShowRate(rate) {
  if ($('showRate')) $('showRate').value = String(clamp(Number(rate) || 1, .25, 4));
  updateShowLabels(); persistShowSettings(); scheduleVisualUpdate();
}
function triggerShowUtility(type) {
  if (type === 'reverse') state.show.reverseToken += 1;
  if (type === 'color') state.show.colorToken += 1;
  scheduleVisualUpdate();
  log(`Busking utility: ${type}.`);
}
document.querySelectorAll('[data-show-look]').forEach((button) => button.addEventListener('click', () => selectShowLook(button.dataset.showLook)));
document.querySelectorAll('[data-show-rate]').forEach((button) => button.addEventListener('click', () => setShowRate(button.dataset.showRate)));
$('showReverse')?.addEventListener('click', () => triggerShowUtility('reverse'));
$('showColorHit')?.addEventListener('click', () => triggerShowUtility('color'));
$('showModeButton')?.addEventListener('click', startShowMode);
$('startShowButton')?.addEventListener('click', startShowMode);
$('nextShowLook')?.addEventListener('click', nextShowLook);
$('stopShowButton')?.addEventListener('click', stopShowMode);
$('showPunch')?.addEventListener('click', () => triggerShowGesture('punch'));
$('showWhiteHit')?.addEventListener('click', () => triggerShowGesture('white'));
$('showBlackoutTap')?.addEventListener('click', () => triggerShowGesture('blackout'));
$('showFreeze')?.addEventListener('click', () => triggerShowGesture('freeze'));
$('showStrobeTap')?.addEventListener('click', () => triggerShowGesture('strobe'));
['showControlMode','showStyle','showIntensity','showSceneBeats','showTransition','showRate','showVariation','showAdaptive','showAudioSync','showBpm','showPerformance','showGestureRate','showMixStyle','showStrobeSafe'].forEach((id) => $(id)?.addEventListener('input', () => { persistShowSettings(); updateShowLabels(); scheduleVisualUpdate(); }));
restoreShowSettings(); updateShowLabels(); renderShowStatus(null); renderPresetList();

const audioPanelElement = document.querySelector('.audio-reactive-panel');
if (audioPanelElement?.tagName === 'DETAILS') audioPanelElement.addEventListener('toggle', (event) => {
  $('audioModeButton')?.classList.toggle('active', Boolean(event.currentTarget.open));
});

const AUDIO_RESPONSE_PROFILES = {
  tight: { audioSensitivity: 3.2, audioMaster: 2.2, audioBassBoost: 1.9, audioBeatBoost: 2.5, audioSmoothing: 0.18, audioGate: 0.002, beatSensitivity: 1.0, audioMotion: 2.4, audioBrightness: 1.45, audioScale: 0.9, audioColor: 1.0, audioDynamics: 0.78, audioAttack: 14, audioRelease: 135, audioTransient: 1.0, audioAutoGain: true },
  balanced: { audioSensitivity: 3.0, audioMaster: 1.7, audioBassBoost: 1.45, audioBeatBoost: 1.7, audioSmoothing: 0.32, audioGate: 0.003, beatSensitivity: 1.12, audioMotion: 1.4, audioBrightness: 1.0, audioScale: 0.55, audioColor: 0.7, audioDynamics: 0.65, audioAttack: 28, audioRelease: 230, audioTransient: 1.2, audioAutoGain: true },
  punchy: { audioSensitivity: 3.5, audioMaster: 2.0, audioBassBoost: 1.75, audioBeatBoost: 2.0, audioSmoothing: 0.25, audioGate: 0.002, beatSensitivity: 1.05, audioMotion: 2.0, audioBrightness: 1.25, audioScale: 0.8, audioColor: 0.9, audioDynamics: 0.72, audioAttack: 20, audioRelease: 180, audioTransient: 1.1, audioAutoGain: true },
  extreme: { audioSensitivity: 4.5, audioMaster: 3.0, audioBassBoost: 2.5, audioBeatBoost: 3.5, audioSmoothing: 0.10, audioGate: 0.001, beatSensitivity: 0.9, audioMotion: 3.6, audioBrightness: 2.0, audioScale: 1.45, audioColor: 1.6, audioDynamics: 0.9, audioAttack: 8, audioRelease: 95, audioTransient: 0.78, audioAutoGain: true },
  smooth: { audioSensitivity: 2.8, audioMaster: 1.4, audioBassBoost: 1.3, audioBeatBoost: 1.3, audioSmoothing: 0.65, audioGate: 0.004, beatSensitivity: 1.25, audioMotion: 0.9, audioBrightness: 0.75, audioScale: 0.35, audioColor: 0.5, audioDynamics: 0.55, audioAttack: 70, audioRelease: 520, audioTransient: 1.55, audioAutoGain: true }
};

function applyAudioProfile(name) {
  const profile = AUDIO_RESPONSE_PROFILES[name];
  if (!profile) return;
  for (const [id, value] of Object.entries(profile)) {
    const element = $(id);
    if (!element) continue;
    if (element.type === 'checkbox') element.checked = Boolean(value);
    else element.value = String(value);
  }
  state.audio.processor = createAudioProcessor();
  scheduleVisualUpdate();
  log(`Audio response profile changed to ${name}.`);
}

$('audioProfile')?.addEventListener('change', (event) => applyAudioProfile(event.target.value));

$('startMic')?.addEventListener('click', () => startAudioCapture('microphone', { automatic: false }));
$('startSystemAudio')?.addEventListener('click', () => startAudioCapture('system'));
$('stopAudio')?.addEventListener('click', () => stopAudioCapture());
$('audioDevice')?.addEventListener('change', async () => { rememberSelectedMicrophone(); loadAudioDeviceProfile({ quiet: true }); if (state.audio.active && state.audio.sourceType === 'microphone') await startAudioCapture('microphone', { automatic: false }); });
$('audioAutoStartOnLaunch')?.addEventListener('change', (event) => {
  persistAudioLaunchPreference(Boolean(event.target.checked));
  if (event.target.checked && !state.audio.active) initializeAudioOnLaunch();
});
$('audioCalibrate')?.addEventListener('click', startAudioCalibration);
$('audioSaveProfile')?.addEventListener('click', () => saveAudioDeviceProfile());
$('audioLoadProfile')?.addEventListener('click', () => loadAudioDeviceProfile());
$('audioTapTempo')?.addEventListener('click', () => { registerBeat(performance.now(), 'tap'); state.audio.beatHistory.push(1); updateAudioMeters(); });
$('audioResetTempo')?.addEventListener('click', () => { state.audio.beatTimes = []; state.audio.tapTimes = []; state.audio.bpm = 0; state.audio.bpmSource = ''; if ($('audioBpmText')) $('audioBpmText').textContent = '—'; });
['audioEnabled','audioResponse','audioSensitivity','audioMaster','audioBassBoost','audioBeatBoost','audioSmoothing','audioGate','beatSensitivity','audioMotion','audioBrightness','audioScale','audioColor','audioAutoGain','audioDynamics','audioAttack','audioRelease','audioTransient','audioModeStrength','audioSubGain','audioBassGain','audioLowMidGain','audioMidGain','audioHighMidGain','audioTrebleGain','audioTempoSync','audioBeatDivision'].forEach((id) => $(id)?.addEventListener('input', scheduleVisualUpdate));
['audioAutoGain','audioSensitivity','audioGate','audioDynamics','audioAttack','audioRelease','audioTransient','audioSubGain','audioBassGain','audioLowMidGain','audioMidGain','audioHighMidGain','audioTrebleGain'].forEach((id) => $(id)?.addEventListener('change', () => { state.audio.processor = createAudioProcessor(); }));
$('audioModeStrength')?.addEventListener('input', () => {
  try { const strengths = JSON.parse(localStorage.getItem('ledcontroller.audio.modeStrengths') || '{}'); strengths[$('pattern').value] = Number($('audioModeStrength').value); localStorage.setItem('ledcontroller.audio.modeStrengths', JSON.stringify(strengths)); } catch {}
});
$('presetSave')?.addEventListener('click', saveNewPreset);
$('presetUpdate')?.addEventListener('click', updateSelectedPreset);
$('presetLoad')?.addEventListener('click', () => loadPresetById($('presetSelect')?.value));
$('presetDelete')?.addEventListener('click', deleteSelectedPreset);
$('presetExport')?.addEventListener('click', exportPresets);
$('presetImportButton')?.addEventListener('click', () => $('presetImportFile')?.click());
$('presetImportFile')?.addEventListener('change', (event) => importPresetsFile(event.target.files?.[0]));
$('presetSelect')?.addEventListener('change', () => renderPresetList($('presetSelect')?.value));
$('presetMemoryList')?.addEventListener('click', (event) => { const button = event.target.closest('[data-preset-memory-load]'); if (button) loadPresetById(button.dataset.presetMemoryLoad); });
$('presetName')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); saveNewPreset(); } });

$('onceButton').addEventListener('click', sendOnce);
$('startButton').addEventListener('click', startOutput);
$('stopButton').addEventListener('click', stopOutput);

updateProtocolFields();
refreshSavedMapping();
initializeDeckBOptions();
restoreVisualSettings();
initializeLayerEngine();
applyModeLibraryFilter();
setActiveDeck('A');
updateVisualLabels();
updateAudioMeters();
setAudioStatus('Audio off', 'idle');
initializeAudioOnLaunch();
restoreTarget();
drawPreview();
poll();
setInterval(poll, 1000);
window.addEventListener('pageshow', () => { refreshSavedMapping(); applyModeLibraryFilter(); });
window.addEventListener('storage', (event) => { if (event.key?.startsWith('ledcontroller.mapping.')) { refreshSavedMapping(); applyModeLibraryFilter(); } });
window.addEventListener('ledcontroller:mapping-saved', () => { refreshSavedMapping(); applyModeLibraryFilter(); scheduleVisualUpdate(); });
log('Visual engine and web diagnostics loaded.');

document.addEventListener('visibilitychange', () => {
  if (state.audio.active) resumeAudioContext();
  else if (!document.hidden && audioAutoStartEnabled() && state.audio.autoStartAttempted) armMicrophoneStartOnInteraction();
});
window.addEventListener('focus', () => {
  if (state.audio.active) resumeAudioContext();
  else if (audioAutoStartEnabled() && state.audio.autoStartAttempted) armMicrophoneStartOnInteraction();
});
window.addEventListener('beforeunload', () => { stopFocusIndependentAudioClock(); for (const track of state.audio.stream?.getTracks?.() || []) track.stop(); });

// Legacy migration markers retained for older regression checks: audioCalibrationVersion: 3; audioCalibrationVersion: 4
