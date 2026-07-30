import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('unified workspace contains discovery, mapping, output, and monitor views', async () => {
  const html = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['view-discovery','view-mapping','view-output','view-monitor','persistentTarget','connectionState','mappingCanvas','deviceRows','preview']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-mapping-pane="layout"/);
  assert.match(html, /data-mapping-pane="raw"/);
});

test('workspace client continuously restores and health-checks the active target', async () => {
  const script = await fs.readFile(new URL('../public/workspace.js', import.meta.url), 'utf8');
  assert.match(script, /ledcontroller\.output\.target/);
  assert.match(script, /\/api\/target\/health/);
  assert.match(script, /setInterval\(\(\) => pollConnection\(\), 3000\)/);
});
