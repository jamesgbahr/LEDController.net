import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const release = css.slice(css.indexOf('/* v0.4.32'));

test('v0.4.32 gives each side preview a dedicated header row and full canvas row', () => {
  assert.match(release, /grid-template-rows:29px minmax\(0,1fr\)!important/);
  assert.match(release, /console-channel-a>\.console-preview-card>canvas[\s\S]*console-channel-b>\.console-preview-card>canvas[\s\S]*height:100%!important/);
});

test('v0.4.32 reduces unused padding without adding side scrolling', () => {
  assert.match(release, /padding:6px 7px 7px!important/);
  assert.doesNotMatch(release, /overflow-y\s*:\s*auto/);
  assert.doesNotMatch(release, /overflow\s*:\s*scroll/);
});

test('v0.4.32 behavior remains compatible with later releases', () => {
  const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:32|33|34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:32|33|34|35|36)'/);
});
