let timer = 0;

function stopClock() {
  if (timer) clearInterval(timer);
  timer = 0;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'stop') {
    stopClock();
    return;
  }
  if (event.data?.type === 'start') {
    stopClock();
    const intervalMs = Math.max(12, Number(event.data.intervalMs) || 16);
    timer = setInterval(() => self.postMessage({ type: 'tick', now: performance.now() }), intervalMs);
    self.postMessage({ type: 'started' });
  }
});
