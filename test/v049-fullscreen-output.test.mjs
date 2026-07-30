import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('public/index.html', root), 'utf8');
const css = await readFile(new URL('public/workspace.css', root), 'utf8');
const workspace = await readFile(new URL('public/workspace.js', root), 'utf8');
const server = await readFile(new URL('server.mjs', root), 'utf8');


test('v0.4.9 exposes full-screen and setup-collapse controls', () => {
  assert.match(html, /id="outputFullscreenButton"/);
  assert.match(html, /id="outputSetupToggle"/);
  assert.match(html, /Browser full screen/);
  assert.match(html, /F toggles browser full screen · S hides setup/);
});

test('full-screen studio fills the viewport and keeps panel scrolling isolated', () => {
  assert.match(css, /\.workspace-body\.output-studio-fullscreen \.workspace-topbar\{display:none!important\}/);
  assert.match(css, /\.workspace-body\.output-studio-fullscreen \.workspace-main\{height:100dvh/);
  assert.match(css, /\.workspace-body\.output-studio-fullscreen #view-output\{display:block!important;height:100%/);
  assert.match(css, /\.workspace-body\.output-setup-collapsed \.output-config-card\{display:none\}/);
  assert.match(css, /\.output-control-panel\{min-height:0;overflow-y:auto;overflow-x:hidden/);
});

test('studio supports browser fullscreen, keyboard access, and resize notifications', () => {
  assert.match(workspace, /requestFullscreen\(\{ navigationUI: 'hide' \}\)/);
  assert.match(workspace, /document\.exitFullscreen\(\)/);
  assert.match(workspace, /event\.key\.toLowerCase\(\) === 'f'/);
  assert.match(workspace, /event\.key\.toLowerCase\(\) === 's'/);
  assert.match(workspace, /window\.dispatchEvent\(new Event\('resize'\)\)/);
});

test('release remains on the v0.4 line or newer', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
