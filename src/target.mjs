function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

export function isIPv4(value) {
  const text = String(value || '').trim();
  const parts = text.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function normalizeTarget(input = {}, previous = {}) {
  const targetIp = String(input.targetIp ?? previous.targetIp ?? '').trim();
  const protocol = String(input.protocol ?? previous.protocol ?? 'ddp').toLowerCase() === 'artnet' ? 'artnet' : 'ddp';
  const port = clampInteger(input.port ?? previous.port, 4048, 1, 65535);
  const startUniverse = clampInteger(input.startUniverse ?? previous.startUniverse, 0, 0, 32767);
  const channelOrder = /^[RGB]{3}$/.test(String(input.channelOrder ?? previous.channelOrder ?? 'RGB'))
    ? String(input.channelOrder ?? previous.channelOrder ?? 'RGB')
    : 'RGB';
  const name = String(input.name ?? previous.name ?? '').trim();
  const source = String(input.source ?? previous.source ?? '').trim();
  const updatedAt = new Date().toISOString();

  if (targetIp && !isIPv4(targetIp)) throw new Error('A valid target IPv4 address is required');
  return { targetIp, protocol, port, startUniverse, channelOrder, name, source, updatedAt };
}


export function mergeActiveTargetIntoOutput(input = {}, previous = {}) {
  const targetInput = { ...input };
  if (!String(targetInput.targetIp || '').trim()) delete targetInput.targetIp;
  if (!String(targetInput.protocol || '').trim()) delete targetInput.protocol;
  if (targetInput.port === '' || targetInput.port === null) delete targetInput.port;
  if (targetInput.startUniverse === '' || targetInput.startUniverse === null) delete targetInput.startUniverse;
  if (!String(targetInput.channelOrder || '').trim()) delete targetInput.channelOrder;

  const activeTarget = normalizeTarget(targetInput, previous);
  return {
    ...input,
    targetIp: activeTarget.targetIp,
    protocol: activeTarget.protocol,
    port: activeTarget.port,
    startUniverse: activeTarget.startUniverse,
    channelOrder: activeTarget.channelOrder
  };
}
