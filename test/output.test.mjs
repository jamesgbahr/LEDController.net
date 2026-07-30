import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtNetPackets, buildDdpPackets, generateFrame } from '../src/output.mjs';

test('generates RGB frame at expected size', () => {
  const frame = generateFrame({ width: 16, height: 16, pattern: 'solid', color: '#ff0000', brightness: 1, channelOrder: 'RGB' });
  assert.equal(frame.length, 16 * 16 * 3);
  assert.deepEqual([...frame.subarray(0, 3)], [255, 0, 0]);
});

test('applies channel order', () => {
  const frame = generateFrame({ width: 1, height: 1, pattern: 'solid', color: '#ff8001', brightness: 1, channelOrder: 'GRB' });
  assert.deepEqual([...frame], [128, 255, 1]);
});

test('DDP packet carries final push flag and payload length', () => {
  const frame = Buffer.alloc(2000, 7);
  const packets = buildDdpPackets(frame);
  assert.equal(packets.length, 2);
  assert.equal(packets[0][0], 0x40);
  assert.equal(packets[1][0], 0x41);
  assert.equal(packets[0].readUInt16BE(8), 1440);
  assert.equal(packets[1].readUInt16BE(8), 560);
});

test('Art-Net splits at 510 RGB channels', () => {
  const frame = Buffer.alloc(900, 1);
  const packets = buildArtNetPackets(frame, { startUniverse: 5, sequence: 3 });
  assert.equal(packets.length, 2);
  assert.equal(packets[0].subarray(0, 8).toString('ascii'), 'Art-Net\0');
  assert.equal(packets[0].readUInt16LE(14), 5);
  assert.equal(packets[1].readUInt16LE(14), 6);
  assert.equal(packets[0].readUInt16BE(16), 510);
  assert.equal(packets[1].readUInt16BE(16), 390);
});

test('manual pixel lights only the selected physical address', () => {
  const frame = generateFrame({
    width: 8,
    height: 1,
    pattern: 'manual-pixel',
    pixelIndex: 5,
    color: '#ffffff',
    brightness: 1,
    channelOrder: 'RGB'
  });
  for (let pixel = 0; pixel < 8; pixel += 1) {
    const rgb = [...frame.subarray(pixel * 3, pixel * 3 + 3)];
    assert.deepEqual(rgb, pixel === 5 ? [255, 255, 255] : [0, 0, 0]);
  }
});

test('slow chase can insert a completely dark separation frame', () => {
  const lit = generateFrame({ width: 4, height: 1, pattern: 'slow-chase', tick: 2, pixelOn: true, color: '#ff0000', brightness: 1 });
  assert.deepEqual([...lit], [0,0,0, 0,0,0, 255,0,0, 0,0,0]);
  const dark = generateFrame({ width: 4, height: 1, pattern: 'slow-chase', tick: 2, pixelOn: false, color: '#ff0000', brightness: 1 });
  assert.ok([...dark].every((value) => value === 0));
});

test('pixel map reorders a logical frame into physical output order', () => {
  const frame = generateFrame({
    width: 2,
    height: 2,
    pattern: 'manual-pixel',
    pixelIndex: 0,
    color: '#ff0000',
    brightness: 1,
    channelOrder: 'RGB',
    pixelMap: [3, 2, 1, 0]
  });
  for (let physical = 0; physical < 4; physical += 1) {
    const rgb = [...frame.subarray(physical * 3, physical * 3 + 3)];
    assert.deepEqual(rgb, physical === 3 ? [255, 0, 0] : [0, 0, 0]);
  }
});

test('mapped row pattern uses logical coordinates before physical reordering', () => {
  const frame = generateFrame({
    width: 2,
    height: 2,
    pattern: 'rows',
    tick: 0,
    color: '#00ff00',
    brightness: 1,
    channelOrder: 'RGB',
    pixelMap: [2, 0, 3, 1]
  });
  assert.deepEqual([...frame], [0,255,0, 0,0,0, 0,255,0, 0,0,0]);
});

test('invalid duplicate pixel maps are rejected', () => {
  assert.throws(() => generateFrame({
    width: 2,
    height: 2,
    pattern: 'solid',
    color: '#ffffff',
    pixelMap: [0, 1, 1, 3]
  }), /duplicate physical address/);
});
