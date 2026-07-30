const $ = (id) => document.getElementById(id);
let activeTargetKey = '';
let healthBusy = false;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function workspaceNameFromHash() {
  const hash = location.hash.replace('#', '').toLowerCase();
  return ['discovery', 'mapping', 'output', 'monitor'].includes(hash) ? hash : 'mapping';
}

function showWorkspace(name, { updateHash = true } = {}) {
  const selected = ['discovery', 'mapping', 'output', 'monitor'].includes(name) ? name : 'mapping';
  document.querySelectorAll('[data-workspace-view]').forEach((view) => {
    view.classList.toggle('active', view.dataset.workspaceView === selected);
  });
  document.querySelectorAll('[data-workspace-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.workspaceTab === selected);
  });
  const outputSelected = selected === 'output';
  document.body.classList.toggle('output-workspace-active', outputSelected);
  if (outputSelected) {
    // Output is a studio surface by default. Browser fullscreen still requires a user gesture.
    setOutputStudioFullscreen(true, { browserFullscreen: false });
  } else if (document.body.classList.contains('output-studio-fullscreen')) {
    setOutputStudioFullscreen(false, { browserFullscreen: false });
  }
  if (updateHash && location.hash !== `#${selected}`) history.replaceState(null, '', `#${selected}`);
  localStorage.setItem('ledcontroller.workspace.tab', selected);
  window.dispatchEvent(new CustomEvent('ledcontroller:workspace-changed', { detail: { tab: selected } }));
}

function showMappingPane(name) {
  const selected = ['layout', 'panels', 'custom', 'mapped', 'raw'].includes(name) ? name : 'layout';
  document.querySelectorAll('[data-mapping-pane]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mappingPane === selected);
  });
  document.querySelectorAll('[data-mapping-pane-content]').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.mappingPaneContent === selected);
  });
  localStorage.setItem('ledcontroller.mapping.pane', selected);
}

function outputWorkspaceIsActive() {
  return document.querySelector('[data-workspace-view="output"]')?.classList.contains('active') === true;
}

const STUDIO_DENSITY_MODES = ['auto', '1', '0.9', '0.8', '0.75'];
let studioDensityResizeTimer = null;

function clampStudioScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(1, Math.max(0.72, numeric));
}

function studioDensityMode() {
  const stored = localStorage.getItem('ledcontroller.output.uiDensity') || 'auto';
  return STUDIO_DENSITY_MODES.includes(stored) ? stored : 'auto';
}

function resolveStudioScale(mode = studioDensityMode()) {
  if (mode !== 'auto') return clampStudioScale(mode);
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  // Normalize Windows display scaling / browser zoom so the studio keeps the
  // same physical density used by the release screenshots. Do not enlarge UI.
  return clampStudioScale(1 / dpr);
}

function applyStudioDensity() {
  const mode = studioDensityMode();
  const scale = resolveStudioScale(mode);
  // CSS zoom already compensates the element box in Chromium. Keeping the
  // studio at 100% prevents double expansion and horizontal clipping.
  const extent = '100%';
  const effectiveWidth = window.innerWidth / scale;
  const effectiveHeight = window.innerHeight / scale;
  const body = document.body;

  body.style.setProperty('--studio-density-scale', scale.toFixed(4));
  body.style.setProperty('--studio-density-extent', extent);
  body.classList.toggle('studio-density-scaled', scale < 0.985);
  body.classList.toggle('studio-effective-wide', effectiveWidth >= 1380);
  body.classList.toggle('studio-effective-tall', effectiveHeight >= 780);
  body.dataset.studioDensity = mode;

  const button = $('outputDensityButton');
  if (button) {
    const percent = Math.round(scale * 100);
    button.textContent = mode === 'auto' ? `UI AUTO · ${percent}%` : `UI ${percent}%`;
    button.title = `Output Studio density: ${mode === 'auto' ? 'automatic DPI/zoom normalization' : `${percent}%`}. Click to cycle.`;
    button.setAttribute('aria-pressed', String(mode !== 'auto'));
  }
  window.dispatchEvent(new CustomEvent('ledcontroller:studio-density', {
    detail: { mode, scale, effectiveWidth, effectiveHeight }
  }));
}

function cycleStudioDensity() {
  const current = studioDensityMode();
  const index = STUDIO_DENSITY_MODES.indexOf(current);
  const next = STUDIO_DENSITY_MODES[(index + 1) % STUDIO_DENSITY_MODES.length];
  localStorage.setItem('ledcontroller.output.uiDensity', next);
  applyStudioDensity();
  window.dispatchEvent(new Event('resize'));
}

function scheduleStudioDensityRefresh() {
  clearTimeout(studioDensityResizeTimer);
  studioDensityResizeTimer = setTimeout(() => {
    applyStudioDensity();
  }, 80);
}

function updateOutputStudioButtons() {
  const studio = document.body.classList.contains('output-studio-fullscreen');
  const browserFullscreen = Boolean(document.fullscreenElement);
  const setupCollapsed = document.body.classList.contains('output-setup-collapsed');
  const fullscreenButton = $('outputFullscreenButton');
  const exitStudioButton = $('outputExitStudioButton');
  const setupButton = $('outputSetupToggle');
  if (fullscreenButton) {
    fullscreenButton.classList.toggle('active', browserFullscreen);
    fullscreenButton.setAttribute('aria-pressed', String(browserFullscreen));
    fullscreenButton.textContent = browserFullscreen ? '⤢ Exit browser full screen' : '⛶ Browser full screen';
    fullscreenButton.title = browserFullscreen ? 'Exit browser full screen (F or Escape)' : 'Browser full screen (F)';
  }
  if (exitStudioButton) exitStudioButton.classList.toggle('hidden', !studio);
  if (setupButton) {
    setupButton.classList.toggle('active', setupCollapsed);
    setupButton.setAttribute('aria-pressed', String(setupCollapsed));
    setupButton.textContent = setupCollapsed ? 'Show setup' : 'Hide setup';
  }
}

function setOutputSetupCollapsed(collapsed) {
  document.body.classList.toggle('output-setup-collapsed', Boolean(collapsed));
  localStorage.setItem('ledcontroller.output.setupCollapsed', collapsed ? '1' : '0');
  updateOutputStudioButtons();
  window.dispatchEvent(new Event('resize'));
}

async function setOutputStudioFullscreen(enabled, { browserFullscreen = true } = {}) {
  const next = Boolean(enabled);
  document.body.classList.toggle('output-studio-fullscreen', next);
  applyStudioDensity();
  updateOutputStudioButtons();
  window.dispatchEvent(new Event('resize'));
  if (!browserFullscreen) return;
  try {
    if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } else if (!next && document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    // The CSS studio still fills the application when browser fullscreen is denied.
  }
}

async function toggleOutputBrowserFullscreen() {
  if (!outputWorkspaceIsActive()) showWorkspace('output');
  if (!document.body.classList.contains('output-studio-fullscreen')) {
    await setOutputStudioFullscreen(true, { browserFullscreen: false });
  }
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // Browser fullscreen may be denied; the application-level studio remains active.
  }
  updateOutputStudioButtons();
  window.dispatchEvent(new Event('resize'));
}

function protocolLabel(target) {
  return String(target?.protocol || 'ddp').toUpperCase();
}

function healthTime(value) {
  if (!value) return 'Not checked';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not checked';
  return `Checked ${date.toLocaleTimeString()}`;
}

function syncTargetFields(target) {
  if (!target?.targetIp) return;
  const key = [target.targetIp, target.protocol, target.port, target.startUniverse, target.channelOrder, target.name].join('|');
  if (key === activeTargetKey) return;
  activeTargetKey = key;

  const assignments = [
    ['targetIp', target.targetIp],
    ['protocol', target.protocol || 'ddp'],
    ['port', target.port || 4048],
    ['startUniverse', target.startUniverse || 0],
    ['channelOrder', target.channelOrder || 'RGB'],
    ['mapTargetIp', target.targetIp],
    ['mapProtocol', target.protocol || 'ddp'],
    ['mapPort', target.port || 4048],
    ['mapStartUniverse', target.startUniverse || 0],
    ['mapChannelOrder', target.channelOrder || 'RGB']
  ];
  assignments.forEach(([id, value]) => {
    const element = $(id);
    if (!element) return;
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  if ($('mapTargetState')) $('mapTargetState').textContent = `${target.name ? `${target.name} · ` : ''}${target.targetIp} · ${protocolLabel(target)}`;
  localStorage.setItem('ledcontroller.output.target', JSON.stringify(target));
}

function renderConnection(target, health = {}) {
  const dot = $('connectionDot');
  if (!target?.targetIp) {
    dot.className = 'connection-dot idle';
    $('connectionName').textContent = 'No WLED selected';
    $('connectionMeta').textContent = 'Run discovery and choose Use target';
    $('connectionState').textContent = 'Not connected';
    $('connectionLastSeen').textContent = '—';
    return;
  }

  syncTargetFields(target);
  const state = health.state || (health.online === true ? 'online' : health.online === false ? 'offline' : 'checking');
  dot.className = `connection-dot ${state}`;
  $('connectionName').textContent = health.name || target.name || (target.protocol === 'artnet' ? 'Art-Net node' : 'WLED controller');
  const extra = [target.targetIp, protocolLabel(target), health.leds ? `${health.leds} LEDs` : '', health.version ? `v${health.version}` : ''].filter(Boolean);
  $('connectionMeta').textContent = extra.join(' · ');
  $('connectionState').textContent = state === 'online' ? 'Online' : state === 'offline' ? 'Offline' : state === 'selected' ? 'Selected' : 'Checking';
  $('connectionLastSeen').textContent = healthTime(health.checkedAt);
}

async function restoreStoredTarget() {
  try {
    const existing = await api('/api/target');
    if (existing.target?.targetIp) return existing.target;
  } catch {}
  try {
    const stored = JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null');
    if (stored?.targetIp) {
      const result = await api('/api/target', { method: 'POST', body: JSON.stringify(stored) });
      return result.target || stored;
    }
  } catch {}
  return null;
}

async function pollConnection({ force = false } = {}) {
  if (healthBusy) return;
  healthBusy = true;
  try {
    const result = await api(`/api/target/health${force ? '?force=1' : ''}`);
    renderConnection(result.target, result.health);
  } catch {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null'); } catch {}
    renderConnection(stored, stored?.targetIp ? { state: 'offline', online: false, detail: 'Local service unavailable' } : {});
  } finally {
    healthBusy = false;
  }
}

function syncCustomPane() {
  const custom = $('wiringMode')?.value === 'custom';
  const panel = $('customWiringPanel');
  const empty = $('customEmptyState');
  if (panel) panel.classList.toggle('hidden', !custom);
  if (empty) empty.classList.toggle('hidden', custom);
}

$('outputDensityButton')?.addEventListener('click', cycleStudioDensity);
$('outputFullscreenButton')?.addEventListener('click', toggleOutputBrowserFullscreen);
$('outputExitStudioButton')?.addEventListener('click', () => setOutputStudioFullscreen(false, { browserFullscreen: false }));
$('outputSetupToggle')?.addEventListener('click', () => {
  setOutputSetupCollapsed(!document.body.classList.contains('output-setup-collapsed'));
});

document.addEventListener('fullscreenchange', () => {
  // Exiting browser fullscreen must not collapse the application-level Output Studio.
  updateOutputStudioButtons();
  window.dispatchEvent(new Event('resize'));
});

document.addEventListener('keydown', (event) => {
  if (!outputWorkspaceIsActive()) return;
  const target = event.target;
  const editing = target instanceof HTMLElement && (target.matches('input,select,textarea') || target.isContentEditable);
  if (editing) return;
  if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    toggleOutputBrowserFullscreen();
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    setOutputSetupCollapsed(!document.body.classList.contains('output-setup-collapsed'));
  } else if (event.key === 'Escape' && document.body.classList.contains('output-studio-fullscreen') && !document.fullscreenElement) {
    setOutputStudioFullscreen(false, { browserFullscreen: false });
  }
});

document.querySelectorAll('[data-workspace-tab]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    showWorkspace(button.dataset.workspaceTab);
  });
});

document.querySelectorAll('[data-mapping-pane]').forEach((button) => {
  button.addEventListener('click', () => showMappingPane(button.dataset.mappingPane));
});

$('connectionDiscover')?.addEventListener('click', () => showWorkspace('discovery'));
$('changeControllerInline')?.addEventListener('click', () => showWorkspace('discovery'));
$('wiringMode')?.addEventListener('input', () => {
  syncCustomPane();
  if ($('wiringMode').value === 'custom') showMappingPane('custom');
});

window.addEventListener('resize', scheduleStudioDensityRefresh);
window.addEventListener('hashchange', () => showWorkspace(workspaceNameFromHash(), { updateHash: false }));
window.addEventListener('ledcontroller:target-changed', (event) => {
  if (event.detail?.targetIp) {
    syncTargetFields(event.detail);
    renderConnection(event.detail, { state: 'checking', online: null });
    setTimeout(() => pollConnection({ force: true }), 120);
  }
});
window.addEventListener('ledcontroller:target-selected', () => setTimeout(() => pollConnection({ force: true }), 120));
window.addEventListener('online', () => pollConnection({ force: true }));
window.addEventListener('focus', () => pollConnection());
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollConnection(); });

const preferredWorkspace = location.hash ? workspaceNameFromHash() : (localStorage.getItem('ledcontroller.workspace.tab') || 'output');
const preferredPane = localStorage.getItem('ledcontroller.mapping.pane') || 'layout';
// v0.4.11 migrates Output to a true viewport studio. Start with setup closed once,
// then preserve the operator's explicit Show setup / Hide setup choice.
const studioLayoutVersion = localStorage.getItem('ledcontroller.output.studioLayoutVersion');
if (studioLayoutVersion !== '0.4.11') {
  localStorage.setItem('ledcontroller.output.setupCollapsed', '1');
  localStorage.setItem('ledcontroller.output.studioLayoutVersion', '0.4.11');
}
setOutputSetupCollapsed(localStorage.getItem('ledcontroller.output.setupCollapsed') !== '0');
applyStudioDensity();
showWorkspace(preferredWorkspace, { updateHash: !location.hash });
updateOutputStudioButtons();
showMappingPane(preferredPane);
syncCustomPane();

restoreStoredTarget().then((target) => {
  if (target) syncTargetFields(target);
  return pollConnection({ force: true });
});
setInterval(() => pollConnection(), 3000);
