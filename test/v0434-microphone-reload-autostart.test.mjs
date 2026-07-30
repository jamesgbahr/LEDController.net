import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/workspace.css', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('microphone auto-start is enabled by default and exposed as a persistent preference', () => {
  assert.match(html, /<input[^>]*checked[^>]*id="audioAutoStartOnLaunch"/);
  assert.match(html, /Start microphone automatically/);
  assert.match(html, /<input[^>]*checked[^>]*id="audioEnabled"/);
  assert.match(app, /const AUDIO_AUTOSTART_KEY = 'ledcontroller\.audio\.autoStart'/);
  assert.match(app, /stored === null \? true : stored === 'true'/);
  assert.match(app, /persistAudioLaunchPreference\(Boolean\(event\.target\.checked\)\)/);
});

test('page initialization restores the remembered microphone and selected device', () => {
  assert.match(app, /async function initializeAudioOnLaunch\(\)[\s\S]*await enumerateAudioDevices\(\)[\s\S]*startAudioCapture\('microphone', \{ continueOnError: true, automatic: true \}\)/);
  assert.match(app, /initializeAudioOnLaunch\(\);[\s\S]*restoreTarget\(\)/);
  assert.match(app, /const AUDIO_DEVICE_KEY = 'ledcontroller\.audio\.device'/);
  assert.match(app, /const remembered = localStorage\.getItem\(AUDIO_DEVICE_KEY\)/);
  assert.match(app, /rememberSelectedMicrophone\(trackDeviceId\)/);
});

test('manual stop disables reload startup while internal restarts preserve it', () => {
  assert.match(app, /async function stopAudioCapture\(\{ quiet = false, preserveAutoStart = false \} = \{\}\)/);
  assert.match(app, /if \(!preserveAutoStart\) persistAudioLaunchPreference\(false\)/);
  assert.match(app, /stopAudioCapture\(\{ quiet: true, preserveAutoStart: true \}\)/);
  assert.match(app, /\$\('stopAudio'\)\?\.addEventListener\('click', \(\) => stopAudioCapture\(\)\)/);
});

test('blocked automatic startup falls back to the next normal interaction without changing visuals', () => {
  assert.match(app, /function armMicrophoneStartOnInteraction\(\)[\s\S]*state\.audio\.active\) resumeAudioContext\(\)[\s\S]*document\.addEventListener\('pointerdown', retry/);
  assert.match(app, /Microphone ready · click anywhere to resume/);
  assert.match(app, /connected · click anywhere to activate/);
  assert.match(app, /Audio capture is a global input transport, not a visual-selection command/);
  assert.doesNotMatch(app, /function initializeAudioOnLaunch\(\)[\s\S]{0,1000}\$\('pattern'\)\.value/);
});

test('microphone launch preference remains global and is not stored inside performance presets', () => {
  assert.match(app, /const PRESET_GLOBAL_CONTROL_IDS = new Set\(\['audioAutoStartOnLaunch'\]\)/);
  assert.match(app, /PRESET_GLOBAL_CONTROL_IDS\.has\(id\)/);
  assert.match(app, /PRESET_GLOBAL_CONTROL_IDS\.has\(element\.id\)/);
});

test('v0.4.34 metadata and release marker are consistent', () => {
  assert.match(app, /CLIENT_VERSION = '0\.4\.(?:34|35|36)'/);
  assert.match(server, /APP_VERSION = '0\.4\.(?:34|35|36)'/);
  assert.match(pkg.version, /^0\.4\.(?:34|35|36)$/);
  assert.match(css, /v0\.4\.34 — remembered microphone auto-start/);
});
