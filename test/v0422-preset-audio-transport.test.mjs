import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, app, css, server, pkg] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/app.js', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8'),
  readFile(new URL('package.json', root), 'utf8')
]);

function functionBody(source, name, nextName) {
  const start = source.indexOf(`async function ${name}`);
  const end = source.indexOf(`\nfunction ${nextName}`, start);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return source.slice(start, end);
}

test('preset recall treats live audio capture as an independent transport', () => {
  const body = functionBody(app, 'loadPresetById', 'saveNewPreset');
  assert.match(body, /const liveAudioWasActive = Boolean\(state\.audio\.active\)/);
  assert.match(body, /if \(!liveAudioWasActive && requestedAudio\)/);
  assert.match(body, /Existing audio capture preserved/);
  assert.doesNotMatch(body, /await stopAudioCapture/);
  assert.doesNotMatch(body, /restartAudio/);
});

test('preset recall keeps the active microphone device reflected in the UI', () => {
  assert.match(app, /function activeMicrophoneDeviceId\(\)/);
  assert.match(app, /track\?\.getSettings\?\.\(\)\.deviceId/);
  assert.match(app, /function preserveLiveAudioSelection/);
  assert.match(app, /preserveLiveAudioSelection\(liveSource, liveDevice, liveSelectedDevice\)/);
});

test('preset UI explains that live audio is not restarted', () => {
  assert.match(html, /A running microphone or system-audio stream stays live during preset recall/);
  assert.match(css, /v0\.4\.22 — preserve live microphone and system-audio capture during preset recall/);
});

test('release version is v0.4.22 or newer', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(JSON.parse(pkg).version, /^0\.4\.(?:22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)$/);
});
