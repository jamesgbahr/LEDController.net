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

test('Deck B contribution is explicit and normal crossfade is the visible default', () => {
  assert.match(html, /id="deckBContribution"/);
  assert.match(html, /id="deckMixSummary"/);
  assert.match(html, /id="deckCrossfader"[^>]*value="0\.5"/);
  assert.match(html, /selected="" value="crossfade">Normal crossfade/);
  assert.match(app, /mixerSettingsVersion: (?:2|3)/);
  assert.match(app, /legacyMixerLayout \? 0\.5/);
});

test('quick modes move to the drawer and the main console has four spacious rows', () => {
  const analyzerAt = html.indexOf('class="console-audio-row"');
  const utilityAt = html.indexOf('class="console-utility-row"');
  const drawerAt = html.indexOf('data-output-control-panel="visual"');
  assert.ok(drawerAt >= 0 && utilityAt > drawerAt);
  assert.ok(analyzerAt >= 0 && analyzerAt < drawerAt);
  assert.match(css, /v0\.4\.18 — unified three-channel live console/);
  assert.match(css, /\.live-console-columns\{/);
  assert.match(css, /\.output-control-panel \.console-utility-row/);
  assert.match(html, /id="visualLibraryButton"/);
  assert.match(app, /setOutputControlTab\('visual', \{ forceOpen: true \}\)/);
});

test('release version is v0.4.14 or newer', () => {
  assert.match(server, /APP_VERSION = '0\.4\.(?:14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36)'/);
});
