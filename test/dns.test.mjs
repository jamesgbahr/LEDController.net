import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPtrQuery, readName } from '../src/dns.mjs';

test('builds an mDNS PTR query', () => {
  const packet = buildPtrQuery('_wled._tcp.local');
  assert.equal(packet.readUInt16BE(4), 1);
  assert.equal(packet.readUInt16BE(packet.length - 4), 12);
});

test('reads an uncompressed DNS name', () => {
  const data = Buffer.from([4, 95, 116, 99, 112, 5, 108, 111, 99, 97, 108, 0]);
  const name = readName(data, 0);
  assert.equal(name.name, '_tcp.local');
  assert.equal(name.bytes, data.length);
});
