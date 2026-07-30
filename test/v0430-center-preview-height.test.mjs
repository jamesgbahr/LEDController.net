import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');

test('center output channel has an independent compact mixer row', () => {
  assert.match(css, /v0\.4\.30 — restore the center mapped-output window/);
  assert.match(css, /\.console-channel-master[\s\S]*grid-template-rows:minmax\(190px,1fr\) 220px!important/);
  assert.match(css, /grid-template-rows:minmax\(150px,1fr\) 205px!important/);
});

test('side decks remain fixed and do not gain internal scrolling', () => {
  assert.match(css, /\.console-channel-a[\s\S]*\.console-channel-b[\s\S]*overflow:hidden!important/);
  assert.match(css, /\.console-channel-a>\.console-control-card[\s\S]*\.console-channel-b>\.console-control-card[\s\S]*overflow:hidden!important/);
  assert.doesNotMatch(css.slice(css.indexOf('/* v0.4.30')), /overflow-y\s*:\s*auto/);
  assert.doesNotMatch(css.slice(css.indexOf('/* v0.4.30')), /overflow\s*:\s*scroll/);
});
