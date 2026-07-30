import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const release = css.slice(css.indexOf('/* v0.4.33'));

test('v0.4.33 gives the center preview the same compact header and full canvas row', () => {
  assert.match(release, /console-channel-master>\.combined-output-card[\s\S]*grid-template-rows:29px minmax\(0,1fr\)!important/);
  assert.match(release, /combined-output-card>\.output-preview-toolbar[\s\S]*height:29px!important/);
  assert.match(release, /combined-output-card>\.visual-preview-wrap[\s\S]*height:100%!important/);
});

test('v0.4.33 keeps the center card non-scrolling and leaves side-deck rules intact', () => {
  assert.match(release, /combined-output-card[\s\S]*overflow:hidden!important/);
  assert.doesNotMatch(release, /overflow-y\s*:\s*auto/);
  assert.doesNotMatch(release, /overflow\s*:\s*scroll/);
  assert.match(css, /v0\.4\.32 — let the Deck A and Deck B canvases fill their preview cards/);
});

test('v0.4.33 alignment remains compatible with later releases', () => {
  const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:33|34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:33|34|35|36)'/);
  assert.match(pkg.version, /^0\.4\.(?:33|34|35|36)$/);
});
