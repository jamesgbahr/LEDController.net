import test from 'node:test';
import assert from 'node:assert/strict';
import { isIPv4, mergeActiveTargetIntoOutput, normalizeTarget } from '../src/target.mjs';

test('normalizes a shared WLED target for cross-page use', () => {
  const target = normalizeTarget({
    targetIp: '192.168.1.44',
    protocol: 'ddp',
    port: 4048,
    channelOrder: 'GRB',
    name: 'WLED-Matrix'
  });
  assert.equal(target.targetIp, '192.168.1.44');
  assert.equal(target.protocol, 'ddp');
  assert.equal(target.port, 4048);
  assert.equal(target.channelOrder, 'GRB');
  assert.equal(target.name, 'WLED-Matrix');
});

test('rejects invalid active-target addresses', () => {
  assert.equal(isIPv4('192.168.1.50'), true);
  assert.equal(isIPv4('999.168.1.50'), false);
  assert.throws(() => normalizeTarget({ targetIp: 'not-an-ip' }), /valid target IPv4/);
});


test('remembered target is merged into mapping output when page fields are blank', () => {
  const merged = mergeActiveTargetIntoOutput({
    width: 64,
    height: 1,
    pattern: 'manual-pixel',
    targetIp: ''
  }, {
    targetIp: '192.168.1.77',
    protocol: 'ddp',
    port: 4048,
    startUniverse: 0,
    channelOrder: 'GRB'
  });
  assert.equal(merged.targetIp, '192.168.1.77');
  assert.equal(merged.protocol, 'ddp');
  assert.equal(merged.port, 4048);
  assert.equal(merged.channelOrder, 'GRB');
  assert.equal(merged.pattern, 'manual-pixel');
});
