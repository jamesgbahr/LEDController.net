import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/workspace.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('v0.3.3 separates preview, transport, and tabbed controls', () => {
  assert.match(html, /class="output-studio-grid(?: [^"]+)?"/);
  assert.match(html, /class="(?:output-preview-column|performance-console-layout)[^"]*"/);
  assert.match(html, /class="output-control-dock"/);
  assert.match(html, /data-output-control-tab="visual"/);
  assert.match(html, /data-output-control-tab="audio"/);
  assert.match(html, /data-output-control-panel="visual"/);
  assert.match(html, /data-output-control-panel="audio"/);
});

test('transport stays visible and preset chips wrap without horizontal scrolling', () => {
  assert.match(css, /\.output-preview-column>\.visual-actions\{[\s\S]*position:static!important/);
  assert.match(css, /\.output-control-panel \.visual-preset-row\{[\s\S]*flex-wrap:wrap[\s\S]*overflow:visible!important/);
  assert.match(css, /\.output-control-dock\{[\s\S]*overflow:hidden/);
});

test('audio mode switches to the audio control tab', () => {
  assert.match(app, /function setOutputControlTab/);
  assert.match(app, /setOutputControlTab\('audio'\)/);
});
