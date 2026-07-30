import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, server] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8')
]);

test('master brightness and transport are the first row of the live console', () => {
  const layoutAt = html.indexOf('class="performance-console-layout"');
  const transportAt = html.indexOf('class="console-master-row console-top-transport"');
  const previewsAt = html.indexOf('class="live-console-columns"');
  const analyzerAt = html.indexOf('class="console-audio-row"');
  assert.ok(layoutAt >= 0 && transportAt > layoutAt);
  assert.ok(transportAt < previewsAt);
  assert.ok(transportAt < analyzerAt);
  assert.match(html, /console-top-transport[\s\S]*id="brightness"[\s\S]*id="startButton"[\s\S]*id="stopButton"[\s\S]*id="onceButton"/);
});

test('fixed viewport reserves a permanent transport row', () => {
  assert.match(css, /v0\.4\.15 — keep brightness and output transport permanently visible/);
  assert.match(css, /grid-template-rows:54px minmax\(156px,1fr\)/);
  assert.match(css, /\.console-master-row\.console-top-transport\{[\s\S]*z-index:20/);
});

test('release version is v0.4.15', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
