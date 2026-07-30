import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
test('v0.3.0 exposes audio and mapping layout controls', async () => {
  const html = await read('public/index.html');
  assert.match(html, /id="audioModeButton"/);
  assert.match(html, /id="fitMappingPreview"/);
  assert.match(html, /id="togglePanelLabels"/);
});
test('v0.3.0 transport is non-sticky and canvas fits visible viewport', async () => {
  const css = await read('public/workspace.css');
  const mapping = await read('public/mapping-preview.js');
  assert.match(css, /\.visual-engine-card>\.visual-actions\{[\s\S]*position:static!important/);
  assert.match(mapping, /stage\?\.clientWidth/);
  assert.match(mapping, /showPanelLabels/);
  assert.match(mapping, /cable \$\{panel\.cablePosition \+ 1\}/);
});
