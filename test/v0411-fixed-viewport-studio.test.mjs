import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const css = await readFile(new URL('public/workspace.css', root), 'utf8');
const workspace = await readFile(new URL('public/workspace.js', root), 'utf8');
const server = await readFile(new URL('server.mjs', root), 'utf8');

test('Output Studio is locked to the browser viewport', () => {
  assert.match(css, /\.workspace-body\.output-studio-fullscreen \.workspace-shell\{[\s\S]*position:fixed;[\s\S]*height:100dvh!important;[\s\S]*overflow:hidden/);
  assert.match(css, /\.workspace-body\.output-studio-fullscreen #view-output\{[\s\S]*height:100%!important;[\s\S]*overflow:hidden!important/);
  assert.match(css, /\.workspace-body\.output-studio-fullscreen \.output-control-panel\{[\s\S]*overflow-y:auto!important/);
});

test('Output setup is a slide-over drawer and defaults closed after migration', () => {
  assert.match(css, /\.workspace-body\.output-studio-fullscreen \.output-config-card\{[\s\S]*position:absolute;[\s\S]*z-index:60/);
  assert.match(css, /output-setup-collapsed \.output-config-card\{[\s\S]*transform:translateX/);
  assert.match(workspace, /studioLayoutVersion !== '0\.4\.11'/);
  assert.match(workspace, /localStorage\.setItem\('ledcontroller\.output\.setupCollapsed', '1'\)/);
});

test('release version is v0.4.11 or newer', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
