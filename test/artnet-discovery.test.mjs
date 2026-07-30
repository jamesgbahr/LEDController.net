import test from 'node:test';
import assert from 'node:assert/strict';
import { broadcastAddress, buildArtPoll, parseArtPollReply } from '../src/artnet-discovery.mjs';

test('builds ArtPoll packet', () => {
  const packet = buildArtPoll();
  assert.equal(packet.length, 14);
  assert.equal(packet.subarray(0, 8).toString('ascii'), 'Art-Net\0');
  assert.equal(packet.readUInt16LE(8), 0x2000);
});

test('calculates subnet broadcast address', () => {
  assert.equal(broadcastAddress('192.168.10.22', '255.255.255.0'), '192.168.10.255');
  assert.equal(broadcastAddress('10.1.5.12', '255.255.252.0'), '10.1.7.255');
});

test('parses ArtPollReply identity', () => {
  const packet = Buffer.alloc(239);
  packet.write('Art-Net\0', 0, 'ascii');
  packet.writeUInt16LE(0x2100, 8);
  Buffer.from([192, 168, 1, 40]).copy(packet, 10);
  packet.writeUInt16LE(6454, 14);
  packet.write('MatrixNode', 26, 'ascii');
  packet.write('LED Matrix Art-Net Node', 44, 'ascii');
  packet.write('#0001 [0000] Power On Tests successful', 108, 'ascii');
  packet.writeUInt16BE(4, 172);
  const result = parseArtPollReply(packet, '192.168.1.40');
  assert.equal(result.ip, '192.168.1.40');
  assert.equal(result.name, 'MatrixNode');
  assert.equal(result.details.numPorts, 4);
});
