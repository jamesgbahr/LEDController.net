import dgram from 'node:dgram';
import { localIPv4Interfaces } from './discovery.mjs';

const ARTNET_PORT = 6454;

export function buildArtPoll() {
  const packet = Buffer.alloc(14);
  packet.write('Art-Net\0', 0, 'ascii');
  packet.writeUInt16LE(0x2000, 8); // OpPoll
  packet.writeUInt16BE(14, 10); // protocol version
  packet[12] = 0x02; // request diagnostics only when changed
  packet[13] = 0x00;
  return packet;
}

function uint32(ip) {
  return ip.split('.').map(Number).reduce((acc, value) => ((acc << 8) | value) >>> 0, 0);
}

function ipFromUint32(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function broadcastAddress(address, netmask) {
  const ip = uint32(address);
  const mask = uint32(netmask);
  return ipFromUint32((ip | (~mask >>> 0)) >>> 0);
}

function cleanText(buffer) {
  return buffer.toString('utf8').replace(/\0.*$/s, '').trim();
}

export function parseArtPollReply(message, remoteAddress = '') {
  if (message.length < 174) return null;
  if (message.subarray(0, 8).toString('ascii') !== 'Art-Net\0') return null;
  if (message.readUInt16LE(8) !== 0x2100) return null;
  const packetIp = [...message.subarray(10, 14)].join('.');
  const ip = packetIp === '0.0.0.0' ? remoteAddress : packetIp;
  const port = message.readUInt16LE(14) || ARTNET_PORT;
  const shortName = cleanText(message.subarray(26, 44));
  const longName = cleanText(message.subarray(44, 108));
  const report = cleanText(message.subarray(108, 172));
  const numPorts = message.readUInt16BE(172);
  return {
    id: `artnet:${ip}`,
    name: shortName || longName || `Art-Net ${ip}`,
    hostname: '',
    ip,
    port,
    vendor: 'Art-Net',
    model: longName && longName !== shortName ? longName : '',
    version: '',
    leds: null,
    source: 'ArtPoll',
    protocols: ['Art-Net'],
    details: { shortName, longName, report, numPorts }
  };
}

export async function discoverArtNet({ timeoutMs = 1600 } = {}) {
  const interfaces = localIPv4Interfaces();
  if (!interfaces.length) return [];
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const found = new Map();

  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(ARTNET_PORT, '0.0.0.0', () => {
      try {
        socket.setBroadcast(true);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });

  socket.on('message', (message, remote) => {
    const device = parseArtPollReply(message, remote.address);
    if (device?.ip) found.set(device.ip, device);
  });

  const packet = buildArtPoll();
  const destinations = new Set(['255.255.255.255']);
  for (const iface of interfaces) destinations.add(broadcastAddress(iface.address, iface.netmask));
  for (const destination of destinations) {
    socket.send(packet, ARTNET_PORT, destination, () => {});
  }

  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  socket.close();
  return [...found.values()];
}
