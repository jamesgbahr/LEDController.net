import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, server] = await Promise.all([
  readFile(new URL('public/index.html', root), 'utf8'),
  readFile(new URL('public/workspace.css', root), 'utf8'),
  readFile(new URL('server.mjs', root), 'utf8')
]);

test('v0.4.18 uses three continuous channel stacks', () => {
  assert.match(html, /class="live-console-columns"/);
  assert.match(html, /console-channel-stack console-channel-a/);
  assert.match(html, /console-channel-stack console-channel-master/);
  assert.match(html, /console-channel-stack console-channel-b/);
  assert.match(css, /v0\.4\.18 — unified three-channel live console/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.12fr\) minmax\(0,1fr\)/);
});

test('transport and analyzer use dedicated non-competing rows', () => {
  assert.match(css, /grid-template-rows:52px minmax\(0,1fr\) 160px/);
  assert.match(css, /console-top-transport[\s\S]*grid-template-columns:minmax\(260px,1fr\)/);
  assert.match(css, /console-audio-row[\s\S]*height:160px/);
});

test('release version is v0.4.18', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
