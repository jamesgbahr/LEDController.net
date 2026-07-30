const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

function averageRange(values, start, end) {
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

export function createAudioProcessor() {
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

export function processAudioFrame({ frequencyData, timeData, sampleRate = 48000, fftSize = 2048, nowMs = 0, settings = {} }, state = createAudioProcessor()) {
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
