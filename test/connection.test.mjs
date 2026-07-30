import test from 'node:test';
import assert from 'node:assert/strict';
import { probeTarget } from '../src/connection.mjs';

test('WLED health probe reports online details', async () => {
  const result = await probeTarget({ targetIp: '192.168.1.50', protocol: 'ddp', name: 'Saved WLED' }, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ name: 'Stage Wall', ver: '0.15.0', leds: { count: 64 } }) })
  });
  assert.equal(result.online, true);
  assert.equal(result.name, 'Stage Wall');
  assert.equal(result.leds, 64);
});

test('WLED health probe reports an unreachable controller', async () => {
  const result = await probeTarget({ targetIp: '192.168.1.50', protocol: 'ddp' }, {
    fetchImpl: async () => { throw new Error('unreachable'); }
  });
  assert.equal(result.online, false);
  assert.equal(result.state, 'offline');
});

test('Art-Net health uses the discovery cache', async () => {
  const result = await probeTarget({ targetIp: '192.168.1.60', protocol: 'artnet' }, {
    discoveredDevices: [{ ip: '192.168.1.60', name: 'ArtNode' }]
  });
  assert.equal(result.online, true);
  assert.equal(result.name, 'ArtNode');
});
