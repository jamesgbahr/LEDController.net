import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('public/index.html', root), 'utf8');
const workspace = await readFile(new URL('public/workspace.js', root), 'utf8');
const server = await readFile(new URL('server.mjs', root), 'utf8');

test('Output automatically enters the application studio', () => {
  assert.match(workspace, /if \(outputSelected\) \{[\s\S]*setOutputStudioFullscreen\(true, \{ browserFullscreen: false \}\)/);
  assert.match(workspace, /localStorage\.getItem\('ledcontroller\.workspace\.tab'\) \|\| 'output'/);
});

test('browser fullscreen is independent from application studio', () => {
  assert.match(html, /id="outputFullscreenButton"[^>]*>⛶ Browser full screen</);
  assert.match(html, /id="outputExitStudioButton"/);
  assert.match(workspace, /async function toggleOutputBrowserFullscreen/);
  assert.match(workspace, /Exiting browser fullscreen must not collapse the application-level Output Studio/);
  assert.doesNotMatch(workspace, /fullscreenchange'[\s\S]{0,220}setOutputStudioFullscreen\(false/);
});

test('release version remains v0.4.10 or newer', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
