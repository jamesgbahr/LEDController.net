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

function asyncFunctionBody(source, name, nextName) {
  const start = source.indexOf(`async function ${name}`);
  const end = source.indexOf(`\nfunction ${nextName}`, start);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return source.slice(start, end);
}

test('preset snapshot records an explicit audio auto-start preference', () => {
  assert.match(app, /audioAutoStart: Boolean\(state\.audio\.active \|\| \$\('audioEnabled'\)\?\.checked\)/);
});

test('legacy and current audio presets qualify for automatic capture', () => {
  const body = asyncFunctionBody(app, 'loadPresetById', 'saveNewPreset');
  assert.match(body, /savedAudioEnabled/);
  assert.match(body, /savedAudioPattern/);
  assert.match(body, /audioAutoStart \|\| preset\.runtime\?\.audioCaptureActive/);
});

test('capture request begins before preset restoration reaches asynchronous target persistence', () => {
  const body = asyncFunctionBody(app, 'loadPresetById', 'saveNewPreset');
  const startIndex = body.indexOf('const audioStartPromise');
  const persistIndex = body.indexOf('await persistTarget');
  const awaitStartIndex = body.indexOf('await audioStartPromise');
  assert.ok(startIndex >= 0, 'preset recall must create the audio start promise');
  assert.ok(persistIndex > startIndex, 'capture must be initiated before target persistence');
  assert.ok(awaitStartIndex > persistIndex, 'preset restoration may await the already-started request later');
});

test('startAudioCapture requests new media before its first cleanup await when capture is off', () => {
  const start = app.indexOf('async function startAudioCapture');
  const end = app.indexOf('\nasync function poll', start);
  const body = app.slice(start, end);
  const requestIndex = body.indexOf('const immediateStreamRequest');
  const stopAwaitIndex = body.indexOf('await stopAudioCapture');
  assert.ok(requestIndex >= 0);
  assert.ok(stopAwaitIndex > requestIndex);
  assert.match(body, /immediateStreamRequest \|\| requestCaptureStream\(\)/);
});

test('v0.4.23 UI and release metadata describe preset microphone auto-start', () => {
  assert.match(html, /audio preset starts its saved source directly from the Load click/);
  assert.match(css, /v0\.4\.23 — immediate saved-microphone auto-start/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
  assert.match(JSON.parse(pkg).version, /^0\.4\.(?:23|24|25|26|27|28|29|30|31|32|33|34|35|36)$/);
});
