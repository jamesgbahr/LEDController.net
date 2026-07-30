import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const release = css.slice(css.indexOf('/* v0.4.31'));

test('v0.4.31 gives Deck A and Deck B more width than the center channel', () => {
  assert.match(release, /grid-template-columns:minmax\(0,1\.06fr\) minmax\(0,\.94fr\) minmax\(0,1\.06fr\)!important/);
});

test('side previews gain height while fixed controls remain visible', () => {
  assert.match(release, /grid-template-rows:minmax\(145px,1fr\) 286px!important/);
  assert.match(release, /grid-template-rows:minmax\(132px,1fr\) 280px!important/);
  assert.match(release, /console-channel-a>\.console-control-card[\s\S]*console-channel-b>\.console-control-card[\s\S]*overflow:hidden!important/);
});

test('v0.4.31 adds no side-deck scrolling', () => {
  assert.doesNotMatch(release, /overflow-y\s*:\s*auto/);
  assert.doesNotMatch(release, /overflow\s*:\s*scroll/);
});
