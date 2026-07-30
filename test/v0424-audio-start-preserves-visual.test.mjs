import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('audio panel startup never assigns a default visual', () => {
  const block = app.match(/async function openAudioMode\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(block, /openAudioPanel\(\)/);
  assert.match(block, /startAudioCapture\('microphone'/);
  assert.doesNotMatch(block, /pattern.*audio-spectrum/);
  assert.doesNotMatch(block, /dispatchEvent/);
});

test('direct microphone startup remains independent of visual controls', () => {
  const block = app.match(/async function startAudioCapture\([\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(block, /\$\('pattern'\)\.value\s*=/);
  assert.doesNotMatch(block, /\$\('patternB'\)\.value\s*=/);
});

test('v0.4.24 UI explains visual-preserving audio startup', () => {
  assert.match(html, /Audio controls · start mic/);
  assert.match(html, /Starting audio preserves the current visual/);
  assert.match(pkg.version, /^0\.4\.(?:24|25|26|27|28|29|30|31|32|33|34|35|36)$/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
