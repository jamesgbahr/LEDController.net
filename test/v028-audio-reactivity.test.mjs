import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame, VISUAL_PATTERNS } from '../public/visual-engine.js';
import { OutputTester } from '../src/output.mjs';

const root = new URL('../', import.meta.url);

function differs(a, b) {
  if (a.length !== b.length) return true;
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return true;
  return false;
}

const loudAudio = {
  level: 0.72,
  peak: 0.9,
  bass: 0.86,
  mid: 0.58,
  treble: 0.7,
  beat: 1,
  spectrum: Array.from({ length: 32 }, (_, index) => Math.min(1, index / 24)),
  waveform: Array.from({ length: 64 }, (_, index) => Math.sin(index / 64 * Math.PI * 6))
};

test('v0.4.26 audio library remains available in later releases', () => {
  assert.ok(VISUAL_PATTERNS.length >= 115);
  const audioModes = VISUAL_PATTERNS.filter((entry) => entry.group === 'Audio reactive');
  assert.ok(audioModes.length >= 30);
  for (const mode of ['audio-spectrum', 'audio-oscilloscope', 'audio-bass-pulse', 'audio-fire', 'audio-kaleidoscope']) {
    assert.equal(audioModes.some((entry) => entry.value === mode), true, `${mode} should be registered`);
  }
});

test('audio metrics change both dedicated and normal visual modes', () => {
  for (const pattern of ['audio-spectrum', 'audio-oscilloscope', 'audio-bass-pulse', 'plasma']) {
    const quiet = renderVisualFrame({ width: 12, height: 8, pattern, brightness: 0.45, audioEnabled: true, audio: {}, timeSeconds: 1.2 });
    const loud = renderVisualFrame({ width: 12, height: 8, pattern, brightness: 0.45, audioEnabled: true, audio: loudAudio, audioMotion: 1.5, audioBrightness: 1, audioScale: 0.6, audioColor: 0.7, timeSeconds: 1.2 });
    assert.equal(differs(quiet, loud), true, `${pattern} should react to audio metrics`);
  }
});

test('running mapped output accepts low-latency audio updates without restarting', async () => {
  const tester = new OutputTester();
  try {
    const started = await tester.start({ targetIp: '127.0.0.1', protocol: 'ddp', port: 49058, width: 4, height: 4, fps: 10, pattern: 'audio-spectrum', audioEnabled: true }, { owner: 'visual' });
    const updated = tester.updateAudio(loudAudio, { owner: 'visual', streamId: started.streamId });
    assert.equal(updated.running, true);
    assert.equal(updated.streamId, started.streamId);
    assert.equal(updated.audioEnabled, true);
    assert.ok(updated.audio.bass > 0.8);
    assert.equal(updated.audio.spectrum.length, 32);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('audio capture controls and server streaming endpoint are exposed', async () => {
  const [html, app, server] = await Promise.all([
    fs.readFile(new URL('public/index.html', root), 'utf8'),
    fs.readFile(new URL('public/app.js', root), 'utf8'),
    fs.readFile(new URL('server.mjs', root), 'utf8')
  ]);
  for (const id of ['startMic', 'startSystemAudio', 'stopAudio', 'audioEnabled', 'audioDevice', 'audioResponse', 'audioSensitivity', 'audioSmoothing', 'audioGate', 'beatSensitivity', 'audioMotion', 'audioBrightness', 'audioScale', 'audioColor', 'audioScope']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /getUserMedia/);
  assert.match(app, /getDisplayMedia/);
  assert.match(app, /createAnalyser/);
  assert.match(app, /\/api\/output\/audio/);
  assert.match(server, /\/api\/output\/audio/);
});
