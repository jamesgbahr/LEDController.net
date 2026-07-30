function cleanText(value) {
  return String(value ?? '').trim();
}

export async function probeTarget(target, {
  timeoutMs = 1400,
  fetchImpl = globalThis.fetch,
  discoveredDevices = []
} = {}) {
  const targetIp = cleanText(target?.targetIp);
  const protocol = cleanText(target?.protocol || 'ddp').toLowerCase();
  const checkedAt = new Date().toISOString();

  if (!targetIp) {
    return { online: false, state: 'idle', checkedAt, targetIp: '', protocol, detail: 'No controller selected' };
  }

  const known = discoveredDevices.find((device) => cleanText(device.ip) === targetIp);
  if (protocol === 'artnet' && !known) {
    return {
      online: null,
      state: 'selected',
      checkedAt,
      targetIp,
      protocol,
      detail: 'Art-Net target selected; run discovery to verify the node'
    };
  }

  if (protocol === 'artnet' && known) {
    return {
      online: true,
      state: 'online',
      checkedAt,
      targetIp,
      protocol,
      name: cleanText(known.name),
      detail: 'Art-Net node present in the discovery cache'
    };
  }

  if (typeof fetchImpl !== 'function') {
    return { online: null, state: 'selected', checkedAt, targetIp, protocol, detail: 'WLED target selected' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`http://${targetIp}/json/info`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const info = await response.json().catch(() => ({}));
    const leds = info?.leds?.count ?? info?.leds?.maxpwr ?? known?.leds ?? null;
    return {
      online: true,
      state: 'online',
      checkedAt,
      targetIp,
      protocol,
      name: cleanText(info?.name || known?.name || target?.name || 'WLED'),
      version: cleanText(info?.ver || known?.version),
      leds: Number.isFinite(Number(leds)) ? Number(leds) : null,
      detail: 'WLED responded to /json/info'
    };
  } catch (error) {
    return {
      online: false,
      state: 'offline',
      checkedAt,
      targetIp,
      protocol,
      name: cleanText(known?.name || target?.name),
      detail: error?.name === 'AbortError' ? 'WLED health check timed out' : `WLED health check failed: ${error.message}`
    };
  } finally {
    clearTimeout(timer);
  }
}
