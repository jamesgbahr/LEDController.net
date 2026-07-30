import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPtrQuery } from '../src/dns.mjs';
import { isWledDevice, needsWledFallback } from '../src/discovery.mjs';

test('mDNS query can request a unicast response for Windows reliability', () => {
  const packet = buildPtrQuery('_wled._tcp.local', { unicastResponse: true });
  assert.equal(packet.readUInt16BE(packet.length - 2), 0x8001);
});

test('quick discovery requests fallback scan when WLED is missing', () => {
  assert.equal(needsWledFallback([{ vendor: 'Art-Net', protocols: ['Art-Net'] }]), true);
  assert.equal(needsWledFallback([{ vendor: 'WLED', protocols: ['DDP'] }]), false);
  assert.equal(isWledDevice({ protocols: ['WLED HTTP'] }), true);
});
