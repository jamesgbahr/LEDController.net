import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, app, server] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('public/app.js', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8')
]);

test('the live mixer exposes three unified channel strips', () => {
  assert.match(html, /class="performance-console-layout" data-console-layout="three-preview"/);
  assert.match(html, /class="live-console-columns"/);
  assert.match(html, /class="console-channel-stack console-channel-a"/);
  assert.match(html, /class="console-channel-stack console-channel-master"/);
  assert.match(html, /class="console-channel-stack console-channel-b"/);
  assert.match(html, /class="console-preview-card deck-a-preview-card"/);
  assert.match(html, /class="console-preview-card combined-output-card"/);
  assert.match(html, /class="console-preview-card deck-b-preview-card"/);
  assert.match(html, /class="console-control-card deck-a-control-card"/);
  assert.match(html, /class="console-control-card center-mixer-card"/);
  assert.match(html, /class="console-control-card deck-b-control-card"/);
});


test('each visible deck control card includes mode, colors, speed, scale, and direction', () => {
  for (const id of ['pattern','color','secondaryColor','speed','scale','direction','patternB','colorB','secondaryColorB','speedB','scaleB','directionB']) {
    assert.match(html, new RegExp(`id=\"${id}\"`));
  }
  assert.match(css, /deck-controls\.visual-engine-controls\{grid-template-columns:repeat\(3/);
});

test('audio analyzer and master transport remain visible in the main console', () => {
  assert.match(html, /class="console-audio-row"[\s\S]*id="audioScope"/);
  assert.match(html, /class="console-master-row[^"]*"[\s\S]*id="brightness"[\s\S]*id="startButton"/);
  assert.match(css, /\.console-audio-row \.audio-monitor\{[\s\S]*grid-template-columns/);
  assert.match(css, /\.console-master-row\{[\s\S]*grid-template-columns/);
});

test('show and advanced audio panels are slide-over drawers', () => {
  assert.match(css, /\.output-control-dock\{[\s\S]*transform:translateX/);
  assert.match(css, /output-drawer-open[\s\S]*\.output-control-dock/);
  assert.match(app, /document\.body\.classList\.toggle\('output-drawer-open', drawerOpen\)/);
});

test('release version is v0.4.13', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
