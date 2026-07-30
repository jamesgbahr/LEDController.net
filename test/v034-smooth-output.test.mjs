import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { OutputTester } from '../src/output.mjs';

test('monotonic scheduler never overlaps slow frame sends and reports skipped deadlines', async () => {
  const tester = new OutputTester();
  let active = 0;
  let maxActive = 0;
  let calls = 0;
  tester.sendOnce = async function mockSend() {
    active += 1;
    maxActive = Math.max(maxActive, active);
    calls += 1;
    await delay(36);
    active -= 1;
    this.stats.framesSent += 1;
    this.stats.lastFrameAt = new Date().toISOString();
    return { frameBytes: 3, packetCount: 1 };
  };

  await tester.start({ targetIp: '127.0.0.1', protocol: 'ddp', port: 4048, width: 1, height: 1, fps: 50, pattern: 'solid' }, { owner: 'visual' });
  await delay(280);
  const status = tester.status();
  tester.stop({ force: true });

  assert.equal(maxActive, 1, 'frame sends must never overlap');
  assert.ok(calls >= 4, `expected multiple scheduled frames, received ${calls}`);
  assert.ok(status.droppedFrames >= 1, 'missed deadlines should be counted instead of burst-sent');
  assert.equal(status.scheduler, 'monotonic');
});

test('smooth-output telemetry and preview throttling are exposed in the UI', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const output = fs.readFileSync(new URL('../src/output.mjs', import.meta.url), 'utf8');

  assert.match(html, /id="actualFps"/);
  assert.match(html, /id="maxJitter"/);
  assert.match(html, /id="droppedFrames"/);
  assert.match(app, /const previewFps = state\.outputRunning \? Math\.min\(60/);
  assert.match(output, /scheduler = 'monotonic'/);
  assert.match(output, /setTimeout\(runFrame/);
  assert.doesNotMatch(output, /setInterval\(\(\) => \{\s*this\.sendOnce/);
});
