import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { renderVisualFrame } from '../public/visual-engine.js';
import { OutputTester } from '../src/output.mjs';

function brightestColumn(frame, width, height) {
  let bestColumn = 0;
  let bestValue = -1;
  for (let x = 0; x < width; x += 1) {
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 3;
      total += frame[index] + frame[index + 1] + frame[index + 2];
    }
    if (total > bestValue) {
      bestValue = total;
      bestColumn = x;
    }
  }
  return bestColumn;
}

const loudAudio = {
  level: 1, peak: 1, sub: 1, bass: 1, lowMid: 1, mid: 1, highMid: 1, treble: 1,
  beat: 1, kick: 1, snare: 1, hihat: 1, flux: 1,
  spectrum: Array(32).fill(1), waveform: Array(64).fill(0.8)
};

test('live audio cannot change the master motion position at a fixed server time', () => {
  const base = {
    width: 16, height: 4, pattern: 'columns', color: '#ffffff', secondaryColor: '#000000',
    brightness: 0.25, speed: 0.75, scale: 1, direction: 1, timeSeconds: 1.375,
    matrixClarity: 'auto', audioMotion: 6, audioMaster: 4
  };
  const quiet = renderVisualFrame({ ...base, audioEnabled: false });
  const active = renderVisualFrame({ ...base, audioEnabled: true, audio: loudAudio });
  assert.equal(brightestColumn(active, 16, 4), brightestColumn(quiet, 16, 4));
});

test('output service uses a monotonic server clock and decays stale browser audio', () => {
  const tester = new OutputTester();
  try {
    tester.audioUpdatedAtNs = process.hrtime.bigint() - 2_000_000_000n;
    const resolved = tester.resolveAudioForFrame({ audioEnabled: true, audio: loudAudio });
    assert.ok(resolved.level < 0.2);
    assert.ok(resolved.kick < 0.01);
    assert.ok(resolved.treble < 0.2);
  } finally {
    tester.socket.close();
  }
});

test('show rate and standard visual rate contain no audio or intensity speed multiplier', async () => {
  const visual = await fs.readFile(new URL('../public/visual-engine.js', import.meta.url), 'utf8');
  const show = await fs.readFile(new URL('../public/show-engine.js', import.meta.url), 'utf8');
  const output = await fs.readFile(new URL('../src/output.mjs', import.meta.url), 'utf8');
  assert.match(visual, /const speed = clamp\(baseSpeed \* matrixMotionFactor, 0, 12\)/);
  assert.match(visual, /const phase = timeSeconds \* speed \* direction;/);
  assert.doesNotMatch(visual, /speed = clamp\(baseSpeed[^\n]*audioEnergy/);
  assert.match(show, /speed: clamp\(scene\.speed \* clamp\(Number\(input\.speed\)[^\n]*showRate/);
  assert.doesNotMatch(show, /speed:[^\n]*(?:intensity|this\.energy)/);
  assert.match(output, /process\.hrtime\.bigint\(\)/);
  assert.match(output, /resolveAudioForFrame/);
});
