import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'workspace.css'), 'utf8');

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} function must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) { escaped = false; continue; }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

function fakeElement(value, checked = false) {
  return { value: String(value), checked };
}

test('browser output config builds without preview-only variables', () => {
  const source = extractFunction(appSource, 'config');
  assert.doesNotMatch(source, /audioModePreview|previewAudio/);
  const elements = {
    useMapping: fakeElement('', false), targetIp: fakeElement('127.0.0.1'), protocol: fakeElement('ddp'),
    port: fakeElement(4048), width: fakeElement(8), height: fakeElement(8), channelOrder: fakeElement('RGB'),
    startUniverse: fakeElement(0), fps: fakeElement(20), brightness: fakeElement(.25), pattern: fakeElement('plasma'),
    color: fakeElement('#ff0000'), secondaryColor: fakeElement('#0000ff'), speed: fakeElement(1), scale: fakeElement(1),
    direction: fakeElement(1), audioEnabled: fakeElement('', false), audioResponse: fakeElement('overall'),
    audioSensitivity: fakeElement(1.5), audioGate: fakeElement(.03), audioMotion: fakeElement(1),
    audioBrightness: fakeElement(.8), audioScale: fakeElement(.45), audioColor: fakeElement(.55)
  };
  const state = { audio: { active: false, metrics: null } };
  const run = new Function('$', 'refreshSavedMapping', 'state', `${source}; return config();`);
  const result = run((id) => elements[id], () => null, state);
  assert.equal(result.targetIp, '127.0.0.1');
  assert.equal(result.pattern, 'plasma');
  assert.equal(result.audioEnabled, false);
  assert.equal(result.audio.spectrum.length, 32);
  assert.equal(result.audio.waveform.length, 64);
});

test('audio controls remain visible without covering preview or transport controls', () => {
  assert.match(html, /<section[^>]*class="audio-reactive-panel audio-controls-visible"/);
  assert.match(css, /\.visual-engine-card>\.visual-actions\{[\s\S]*position:static!important/);
  assert.match(css, /\.visual-engine-card>\.audio-reactive-panel\{grid-row:5/);
  assert.match(css, /\.visual-engine-card>\.visual-preview-wrap\{grid-row:6/);
  assert.match(css, /audio-controls-visible \.audio-control-grid\{max-height:none!important;overflow:visible!important/);
});
