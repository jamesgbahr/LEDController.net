import dgram from 'node:dgram';
import os from 'node:os';
import { buildPtrQuery, parseDnsMessage } from './dns.mjs';

const MDNS_ADDRESS = '224.0.0.251';
const MDNS_PORT = 5353;

export function localIPv4Interfaces() {
  const rows = [];
  const all = os.networkInterfaces();
  for (const [name, entries] of Object.entries(all)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        rows.push({ name, address: entry.address, netmask: entry.netmask, cidr: entry.cidr, mac: entry.mac });
      }
    }
  }
  return rows;
}

function normalizeDevice(device) {
  return {
    id: device.id || device.ip || device.hostname || crypto.randomUUID(),
    name: device.name || device.hostname || device.ip || 'Unknown device',
    hostname: device.hostname || '',
    ip: device.ip || '',
    port: Number(device.port || 80),
    vendor: device.vendor || 'Unknown',
    model: device.model || '',
    version: device.version || '',
    leds: Number.isFinite(device.leds) ? device.leds : null,
    source: device.source || 'unknown',
    protocols: [...new Set(device.protocols || [])],
    lastSeen: new Date().toISOString(),
    details: device.details || {}
  };
}

async function fetchJson(url, timeoutMs = 650) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function identifyWled(ip, timeoutMs = 650) {
  const info = await fetchJson(`http://${ip}/json/info`, timeoutMs);
  if (!info || typeof info !== 'object') return null;
  const looksLikeWled = Boolean(info.ver || info.vid || info.arch || info.brand === 'WLED');
  if (!looksLikeWled) return null;
  return normalizeDevice({
    id: `wled:${ip}`,
    name: info.name || info.friendly_name || info.mac || `WLED ${ip}`,
    hostname: info.name || '',
    ip,
    port: 80,
    vendor: info.brand || 'WLED',
    model: info.product || info.arch || '',
    version: info.ver || '',
    leds: Number(info.leds?.count ?? info.leds?.lc ?? info.leds ?? NaN),
    source: 'subnet-scan',
    protocols: ['DDP', 'WLED HTTP'],
    details: info
  });
}

function closeSocket(socket) {
  if (!socket) return;
  try { socket.close(); } catch { /* already closed */ }
}

async function bindSocket(socket, port, address = '0.0.0.0') {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      socket.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      socket.off('error', onError);
      resolve();
    };
    socket.once('error', onError);
    socket.once('listening', onListening);
    socket.bind(port, address);
  });
}

function sendQueries(socket, interfaces, { unicastResponse }) {
  const names = ['_wled._tcp.local', '_http._tcp.local'];
  for (const name of names) {
    const packet = buildPtrQuery(name, { unicastResponse });
    for (const iface of interfaces) {
      try { socket.setMulticastInterface(iface.address); } catch { /* best effort */ }
      try { socket.send(packet, 0, packet.length, MDNS_PORT, MDNS_ADDRESS, () => {}); } catch { /* best effort */ }
    }
  }
}

export async function discoverMdns({ timeoutMs = 4200, queryIntervalMs = 700 } = {}) {
  const interfaces = localIPv4Interfaces();
  if (!interfaces.length) return [];

  const records = [];
  const sockets = [];
  const collect = (message) => {
    try { records.push(...parseDnsMessage(message)); } catch { /* ignore malformed replies */ }
  };

  // An ephemeral query socket requests unicast replies. This avoids conflicts with
  // Bonjour and other Windows services that may already own UDP port 5353.
  const querySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  querySocket.on('message', collect);
  await bindSocket(querySocket, 0);
  querySocket.setMulticastTTL(255);
  querySocket.setMulticastLoopback(false);
  sockets.push(querySocket);

  // Also listen on the standard mDNS port when Windows allows it. Some devices
  // ignore the unicast-response bit and answer only to multicast port 5353.
  const multicastSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  multicastSocket.on('message', collect);
  try {
    await bindSocket(multicastSocket, MDNS_PORT);
    multicastSocket.setMulticastTTL(255);
    multicastSocket.setMulticastLoopback(false);
    for (const iface of interfaces) {
      try { multicastSocket.addMembership(MDNS_ADDRESS, iface.address); } catch { /* adapter may reject membership */ }
    }
    sockets.push(multicastSocket);
  } catch {
    closeSocket(multicastSocket);
  }

  const startedAt = Date.now();
  sendQueries(querySocket, interfaces, { unicastResponse: true });
  if (sockets.includes(multicastSocket)) sendQueries(multicastSocket, interfaces, { unicastResponse: false });

  const timer = setInterval(() => {
    sendQueries(querySocket, interfaces, { unicastResponse: true });
    if (sockets.includes(multicastSocket)) sendQueries(multicastSocket, interfaces, { unicastResponse: false });
  }, Math.max(350, Number(queryIntervalMs) || 700));

  await new Promise((resolve) => setTimeout(resolve, Math.max(1000, Number(timeoutMs) || 4200)));
  clearInterval(timer);
  sockets.forEach(closeSocket);

  const addresses = new Map();
  const services = new Map();
  for (const record of records) {
    if (record.type === 1 && record.address) addresses.set(record.name.toLowerCase(), record.address);
    if (record.type === 33 && record.target) {
      services.set(record.name.toLowerCase(), { target: record.target, port: record.port });
    }
  }

  const candidates = new Map();
  for (const record of records) {
    if (record.type !== 12 || !record.ptr) continue;
    const serviceName = record.name.toLowerCase();
    if (!serviceName.includes('_wled._tcp') && !serviceName.includes('_http._tcp')) continue;
    const instance = record.ptr;
    const service = services.get(instance.toLowerCase());
    const host = service?.target || instance;
    const ip = addresses.get(host.toLowerCase());
    if (!ip) continue;
    const key = ip;
    const existing = candidates.get(key) || {
      id: `mdns:${ip}`,
      name: instance.split('._')[0] || host,
      hostname: host,
      ip,
      port: service?.port || 80,
      vendor: serviceName.includes('_wled._tcp') ? 'WLED' : 'Unknown',
      source: 'mDNS',
      protocols: serviceName.includes('_wled._tcp') ? ['DDP', 'WLED HTTP'] : ['HTTP'],
      details: { discoveryMs: Date.now() - startedAt }
    };
    candidates.set(key, existing);
  }

  const devices = [];
  for (const candidate of candidates.values()) {
    const wled = await identifyWled(candidate.ip, 700);
    devices.push(wled ? { ...wled, source: 'mDNS + WLED API' } : normalizeDevice(candidate));
  }
  return devices;
}

function hostsForSlash24(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return [];
  const prefix = parts.slice(0, 3).join('.');
  const hosts = [];
  for (let i = 1; i <= 254; i += 1) hosts.push(`${prefix}.${i}`);
  return hosts;
}

async function mapLimit(items, concurrency, worker) {
  const results = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index++];
      const result = await worker(current);
      if (result) results.push(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function scanLocalSubnets({ timeoutMs = 450, concurrency = 48 } = {}) {
  const local = localIPv4Interfaces();
  const hostSet = new Set();
  for (const iface of local) {
    // Intentionally constrain scans to the local /24 for predictable, safe diagnostics.
    for (const host of hostsForSlash24(iface.address)) {
      if (host !== iface.address) hostSet.add(host);
    }
  }
  return mapLimit([...hostSet], concurrency, (ip) => identifyWled(ip, timeoutMs));
}

export function isWledDevice(device) {
  const protocols = device?.protocols || [];
  return String(device?.vendor || '').toLowerCase() === 'wled'
    || protocols.includes('WLED HTTP')
    || protocols.includes('DDP');
}

export function needsWledFallback(devices) {
  return !(devices || []).some(isWledDevice);
}

export function mergeDevices(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const device of list || []) {
      const key = device.ip || device.hostname || device.id;
      const existing = merged.get(key);
      if (!existing) merged.set(key, normalizeDevice(device));
      else {
        merged.set(key, normalizeDevice({
          ...existing,
          ...device,
          protocols: [...new Set([...(existing.protocols || []), ...(device.protocols || [])])],
          source: [...new Set(String(existing.source).split(' + ').concat(String(device.source).split(' + ')))].join(' + '),
          details: { ...(existing.details || {}), ...(device.details || {}) }
        }));
      }
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}
