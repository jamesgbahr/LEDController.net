import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { discoverMdns, localIPv4Interfaces, mergeDevices, needsWledFallback, scanLocalSubnets } from './src/discovery.mjs';
import { OutputOwnershipError, OutputTester } from './src/output.mjs';
import { discoverArtNet } from './src/artnet-discovery.mjs';
import { mergeActiveTargetIntoOutput, normalizeTarget } from './src/target.mjs';
import { probeTarget } from './src/connection.mjs';
import { MappingStore } from './src/mapping-store.mjs';

const APP_VERSION = '0.4.36';
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8087);
const OPEN_BROWSER = process.argv.includes('--open');

function openLocalBrowser(url) {
  try {
    let command;
    let args;
    if (process.platform === 'win32') {
      command = 'cmd.exe';
      args = ['/d', '/s', '/c', 'start', '', url];
    } else if (process.platform === 'darwin') {
      command = 'open';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    return true;
  } catch (error) {
    console.warn(`Could not open the browser automatically: ${error.message}`);
    return false;
  }
}
const tester = new OutputTester();
const mappingStore = new MappingStore();
let devices = [];
let activeTarget = normalizeTarget();
let discoveryState = { running: false, startedAt: null, finishedAt: null, error: '' };
let targetHealth = { online: false, state: 'idle', checkedAt: null, targetIp: '', protocol: 'ddp', detail: 'No controller selected' };
let targetHealthPromise = null;

async function refreshTargetHealth({ force = false } = {}) {
  const age = targetHealth.checkedAt ? Date.now() - new Date(targetHealth.checkedAt).getTime() : Infinity;
  const sameTarget = targetHealth.targetIp === activeTarget.targetIp && targetHealth.protocol === activeTarget.protocol;
  if (!force && sameTarget && age < 2500) return targetHealth;
  if (targetHealthPromise) return targetHealthPromise;
  targetHealthPromise = probeTarget(activeTarget, { discoveredDevices: devices })
    .then((result) => { targetHealth = result; return targetHealth; })
    .finally(() => { targetHealthPromise = null; });
  return targetHealthPromise;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};


function outputStatus(status = tester.status()) {
  return { serviceVersion: APP_VERSION, ...status };
}

function json(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function runDiscovery({ scan = false } = {}) {
  if (discoveryState.running) return devices;
  discoveryState = { running: true, startedAt: new Date().toISOString(), finishedAt: null, error: '' };
  try {
    const [mdns, artnet] = await Promise.all([
      discoverMdns({ timeoutMs: 4200, queryIntervalMs: 700 }),
      discoverArtNet({ timeoutMs: 2600 })
    ]);
    const preliminary = mergeDevices(devices, mdns, artnet);
    const useFallbackScan = scan || needsWledFallback(preliminary);
    const scanned = useFallbackScan
      ? await scanLocalSubnets({ timeoutMs: scan ? 450 : 300, concurrency: scan ? 56 : 96 })
      : [];
    devices = mergeDevices(preliminary, scanned);
    if (activeTarget.targetIp) await refreshTargetHealth({ force: true }).catch(() => {});
    discoveryState.finishedAt = new Date().toISOString();
    return devices;
  } catch (error) {
    discoveryState.error = error.message;
    throw error;
  } finally {
    discoveryState.running = false;
  }
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, relative);
  const relativeCheck = path.relative(PUBLIC_DIR, resolved);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

    if (url.pathname === '/api/status' && req.method === 'GET') {
      return json(res, 200, {
        version: APP_VERSION,
        app: 'LEDController Pixel Workspace',
        root: ROOT,
        publicDir: PUBLIC_DIR,
        interfaces: localIPv4Interfaces(),
        discovery: discoveryState,
        activeTarget,
        targetHealth,
        output: tester.status(),
        mappingStorage: { path: mappingStore.activePath }
      });
    }
    if (url.pathname === '/api/devices' && req.method === 'GET') {
      return json(res, 200, { devices, discovery: discoveryState, activeTarget });
    }
    if (url.pathname === '/api/target' && req.method === 'GET') {
      return json(res, 200, { target: activeTarget, health: targetHealth });
    }
    if (url.pathname === '/api/target/health' && req.method === 'GET') {
      const health = await refreshTargetHealth({ force: url.searchParams.get('force') === '1' });
      return json(res, 200, { target: activeTarget, health });
    }
    if (url.pathname === '/api/target' && req.method === 'POST') {
      const body = await readBody(req);
      activeTarget = normalizeTarget(body, activeTarget);
      targetHealth = { online: null, state: activeTarget.targetIp ? 'checking' : 'idle', checkedAt: null, targetIp: activeTarget.targetIp, protocol: activeTarget.protocol, detail: activeTarget.targetIp ? 'Checking controller' : 'No controller selected' };
      return json(res, 200, { target: activeTarget, health: targetHealth });
    }
    if (url.pathname === '/api/discover' && req.method === 'POST') {
      const body = await readBody(req);
      const found = await runDiscovery({ scan: Boolean(body.scan) });
      return json(res, 200, { devices: found, discovery: discoveryState });
    }
    if (url.pathname === '/api/mapping' && req.method === 'GET') {
      return json(res, 200, await mappingStore.load());
    }
    if (url.pathname === '/api/mapping' && req.method === 'POST') {
      const body = await readBody(req);
      const mapping = body.mapping && typeof body.mapping === 'object' ? body.mapping : body;
      return json(res, 200, await mappingStore.save(mapping));
    }
    if (url.pathname === '/api/output/status' && req.method === 'GET') {
      return json(res, 200, outputStatus());
    }
    if (url.pathname === '/api/output/frame' && req.method === 'GET') {
      const snapshot = tester.frameSnapshot(url.searchParams.get('space') || 'logical');
      if (!snapshot.frame.length) {
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        return res.end();
      }
      const headers = {
        'Content-Type': 'application/octet-stream',
        'Content-Length': snapshot.frame.length,
        'Cache-Control': 'no-store',
        'X-LED-Frame-Serial': String(snapshot.meta.serial || 0),
        'X-LED-Width': String(snapshot.meta.width || 0),
        'X-LED-Height': String(snapshot.meta.height || 0),
        'X-LED-Coordinate-Space': snapshot.meta.coordinateSpace || 'logical-matrix',
        'X-LED-Show-Mode': snapshot.meta.showMode ? '1' : '0',
        'X-LED-Current-Pattern': encodeURIComponent(snapshot.meta.currentPattern || ''),
        'X-LED-Map-Fingerprint': snapshot.meta.mapFingerprint || '',
        'X-LED-Updated-At': snapshot.meta.updatedAt || ''
      };
      res.writeHead(200, headers);
      return res.end(snapshot.frame);
    }
    if (url.pathname === '/api/output/frame-stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write(': LEDController live transmitted-frame stream\n\n');
      let lastSerial = Math.max(0, Number(url.searchParams.get('after')) || 0);
      let closed = false;
      const sendSnapshot = ({ frame, meta }) => {
        const serial = Number(meta?.serial || 0);
        if (closed || !frame?.length || serial <= lastSerial) return;
        lastSerial = serial;
        const payload = JSON.stringify({
          serial,
          width: Number(meta.width) || 0,
          height: Number(meta.height) || 0,
          fps: Number(meta.fps) || 0,
          currentPattern: meta.currentPattern || '',
          mapFingerprint: meta.mapFingerprint || '',
          updatedAt: meta.updatedAt || '',
          frame: frame.toString('base64')
        });
        res.write(`id: ${serial}\nevent: frame\ndata: ${payload}\n\n`);
      };
      const unsubscribe = tester.subscribeFrames(sendSnapshot, { sendCurrent: true });
      const heartbeat = setInterval(() => {
        if (!closed) res.write(': heartbeat\n\n');
      }, 15000);
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };
      req.on('close', cleanup);
      req.on('aborted', cleanup);
      res.on('close', cleanup);
      return;
    }
    if (url.pathname === '/api/output/start' && req.method === 'POST') {
      const body = await readBody(req);
      const outputConfig = mergeActiveTargetIntoOutput(body, activeTarget);
      activeTarget = normalizeTarget(outputConfig, activeTarget);
      const status = await tester.start(outputConfig, { owner: body.outputOwner });
      return json(res, 200, outputStatus(status));
    }
    if (url.pathname === '/api/output/once' && req.method === 'POST') {
      const body = await readBody(req);
      const current = tester.status();
      if (current.running && (String(body.outputOwner || '') !== current.owner || String(body.streamId || '') !== current.streamId)) {
        throw new OutputOwnershipError(`Output is owned by ${current.owner}; the one-frame command was ignored.`, {
          requestedOwner: String(body.outputOwner || ''),
          requestedStreamId: String(body.streamId || ''),
          activeOwner: current.owner,
          activeStreamId: current.streamId
        });
      }
      const outputConfig = mergeActiveTargetIntoOutput(body, activeTarget);
      activeTarget = normalizeTarget(outputConfig, activeTarget);
      const built = tester.buildConfig(outputConfig);
      const result = await tester.sendOnce(built);
      return json(res, 200, { ok: true, ...result, status: outputStatus() });
    }
    if (url.pathname === '/api/output/update' && req.method === 'POST') {
      const body = await readBody(req);
      const outputConfig = mergeActiveTargetIntoOutput(body, activeTarget);
      activeTarget = normalizeTarget(outputConfig, activeTarget);
      const status = await tester.update(outputConfig, { owner: body.outputOwner, streamId: body.streamId });
      return json(res, 200, outputStatus(status));
    }
    if (url.pathname === '/api/output/audio' && req.method === 'POST') {
      const body = await readBody(req);
      const status = tester.updateAudio(body.audio || {}, { owner: body.outputOwner, streamId: body.streamId });
      return json(res, 200, outputStatus(status));
    }
    if (url.pathname === '/api/output/stop' && req.method === 'POST') {
      const body = await readBody(req);
      return json(res, 200, outputStatus(tester.stop({ owner: body.outputOwner, streamId: body.streamId, force: Boolean(body.force) })));
    }

    const filePath = safePublicPath(url.pathname);
    if (!filePath) return json(res, 403, { error: 'Forbidden' });
    try {
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Content-Length': data.length,
        'Cache-Control': 'no-store'
      });
      res.end(data);
    } catch (error) {
      if (error.code === 'ENOENT') return json(res, 404, { error: 'Not found' });
      throw error;
    }
  } catch (error) {
    const status = Number(error?.statusCode) || (error instanceof OutputOwnershipError ? 409 : 500);
    json(res, status, { error: error.message, details: error?.details || undefined, output: tester.status() });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Close the older server or set a different PORT.\n`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', async () => {
  const homepage = path.join(PUBLIC_DIR, 'index.html');
  console.log('');
  console.log(`LEDController Pixel Workspace v${APP_VERSION}`);
  console.log(`Application root: ${ROOT}`);
  console.log(`Homepage:        ${homepage}`);
  console.log(`Mapping backup:  ${mappingStore.activePath}`);
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Open:            ${localUrl}`);
  console.log('');
  if (OPEN_BROWSER) {
    // Launch only after the HTTP listener is ready so the first browser request succeeds.
    setTimeout(() => openLocalBrowser(localUrl), 150);
  }
  try {
    await fs.access(homepage);
  } catch {
    console.error(`Missing homepage: ${homepage}`);
  }
});
