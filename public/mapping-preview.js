(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const controls = ['panelWidth','panelHeight','panelColumns','panelRows','controllerPixels','controllerDirection','panelOrderMode','panelAxis','panelCorner','panelSerpentine','pixelAxis','pixelCorner','pixelSerpentine','wiringMode','labelMode'];
  const targetFields = ['mapTargetIp','mapProtocol','mapPort','mapStartUniverse','mapChannelOrder'];
  const testFields = ['mapBrightness','mapColor','mapStepSeconds','mapGapSeconds'];
  const state = {
    cells: [],
    map: null,
    selected: null,
    activePhysical: null,
    activePixelOn: false,
    outputRunning: false,
    outputOwner: '',
    streamId: '',
    lastOutputSignature: '',
    activeTarget: null,
    savedMappingSignature: '',
    panelTransforms: [],
    panels: [],
    panelSerial: 0,
    customPanelOrder: [],
    customWiringOrder: [],
    customEditing: false,
    showPanelLabels: true
  };

  function intValue(id, fallback, min, max) {
    const value = Number.parseInt($(id).value, 10);
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }

  function numberValue(id, fallback, min, max) {
    const value = Number($(id).value);
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  function coordinateOrder(width, height, axis, corner, serpentine) {
    const startsLeft = corner.endsWith('l');
    const startsTop = corner.startsWith('t');
    const order = [];
    if (axis === 'rows') {
      const ys = Array.from({ length: height }, (_, i) => startsTop ? i : height - 1 - i);
      ys.forEach((y, row) => {
        const leftToRight = serpentine && row % 2 ? !startsLeft : startsLeft;
        for (let step = 0; step < width; step += 1) order.push({ x: leftToRight ? step : width - 1 - step, y });
      });
    } else {
      const xs = Array.from({ length: width }, (_, i) => startsLeft ? i : width - 1 - i);
      xs.forEach((x, column) => {
        const topToBottom = serpentine && column % 2 ? !startsTop : startsTop;
        for (let step = 0; step < height; step += 1) order.push({ x, y: topToBottom ? step : height - 1 - step });
      });
    }
    return order;
  }

  function transformPoint(x, y, width, height, rotation, flipX, flipY) {
    let px = flipX ? width - 1 - x : x;
    let py = flipY ? height - 1 - y : y;
    if ((rotation === 90 || rotation === 270) && width !== height) return { x: px, y: py, warning: '90° and 270° preview require square panels.' };
    if (rotation === 90) return { x: py, y: width - 1 - px };
    if (rotation === 180) return { x: width - 1 - px, y: height - 1 - py };
    if (rotation === 270) return { x: height - 1 - py, y: px };
    return { x: px, y: py };
  }

  function normalizePanelTransform(value = {}, fallback = {}) {
    const allowed = new Set([0, 90, 180, 270]);
    const rotation = Number(value.rotation ?? fallback.rotation ?? 0);
    return {
      rotation: allowed.has(rotation) ? rotation : 0,
      flipX: Boolean(value.flipX ?? fallback.flipX),
      flipY: Boolean(value.flipY ?? fallback.flipY)
    };
  }


  function mountedPanelSize(panel) {
    const rotation = Number(panel.rotation) || 0;
    return rotation === 90 || rotation === 270
      ? { width: panel.height, height: panel.width }
      : { width: panel.width, height: panel.height };
  }

  function logicalToPhysicalLocal(x, y, panel) {
    const size = mountedPanelSize(panel);
    let lx = panel.flipX ? size.width - 1 - x : x;
    let ly = panel.flipY ? size.height - 1 - y : y;
    if (panel.rotation === 90) return { x: ly, y: panel.height - 1 - lx };
    if (panel.rotation === 180) return { x: panel.width - 1 - lx, y: panel.height - 1 - ly };
    if (panel.rotation === 270) return { x: panel.width - 1 - ly, y: lx };
    return { x: lx, y: ly };
  }

  function normalizePanel(value = {}, index = 0) {
    const transform = normalizePanelTransform(value);
    const id = String(value.id || `panel-${index + 1}`);
    const rawPhysicalStart = Number(value.physicalStart);
    return {
      id,
      name: String(value.name || `Panel ${index + 1}`),
      x: Math.max(0, Math.trunc(Number(value.x) || 0)),
      y: Math.max(0, Math.trunc(Number(value.y) || 0)),
      width: Math.max(1, Math.min(128, Math.trunc(Number(value.width) || 4))),
      height: Math.max(1, Math.min(128, Math.trunc(Number(value.height) || 4))),
      rotation: transform.rotation,
      flipX: transform.flipX,
      flipY: transform.flipY,
      enabled: value.enabled !== false,
      physicalStart: Number.isInteger(rawPhysicalStart) && rawPhysicalStart >= 0 ? rawPhysicalStart : null,
      cablePosition: Math.max(0, Math.trunc(Number(value.cablePosition ?? index)))
    };
  }

  function panelPixelCount(panel) {
    return Math.max(1, Number(panel.width) * Number(panel.height));
  }

  function ensurePanelPhysicalStarts(panels) {
    const sorted = panels.slice().sort((a, b) => a.cablePosition - b.cablePosition);
    let cursor = 0;
    for (const panel of sorted) {
      if (!Number.isInteger(panel.physicalStart) || panel.physicalStart < 0) panel.physicalStart = cursor;
      cursor = Math.max(cursor, panel.physicalStart + panelPixelCount(panel));
    }
    return panels;
  }

  function highestPanelAddressEnd(panels = ensurePanels()) {
    return panels.reduce((highest, panel) => Math.max(highest, panel.physicalStart + panelPixelCount(panel)), 1);
  }

  function activePhysicalAddressSequence(panels = ensurePanels()) {
    const addresses = [];
    for (const panel of panels.filter((item) => item.enabled).sort((a, b) => a.physicalStart - b.physicalStart || a.cablePosition - b.cablePosition)) {
      for (let offset = 0; offset < panelPixelCount(panel); offset += 1) addresses.push(panel.physicalStart + offset);
    }
    return addresses;
  }

  function normalizePanelCablePositions(panels) {
    const sorted = panels.map((panel, index) => ({ panel, index }))
      .sort((a, b) => a.panel.cablePosition - b.panel.cablePosition || a.index - b.index);
    sorted.forEach(({ panel }, cablePosition) => { panel.cablePosition = cablePosition; });
    return panels;
  }

  function legacyPanelsFromConfig(source = {}) {
    const columns = Math.max(1, Math.trunc(Number(source.panelColumns) || intValue('panelColumns', 2, 1, 16)));
    const rows = Math.max(1, Math.trunc(Number(source.panelRows) || 2));
    const width = Math.max(1, Math.trunc(Number(source.panelWidth) || intValue('panelWidth', 4, 1, 128)));
    const height = Math.max(1, Math.trunc(Number(source.panelHeight) || intValue('panelHeight', 4, 1, 128)));
    const count = columns * rows;
    const transforms = Array.isArray(source.panelTransforms) ? source.panelTransforms : [];
    const legacyFallback = normalizePanelTransform(source);
    const preset = coordinateOrder(columns, rows, source.panelAxis || 'rows', source.panelCorner || 'tl', Boolean(source.panelSerpentine ?? true))
      .map((point) => point.y * columns + point.x);
    const order = source.panelOrderMode === 'custom'
      ? normalizeCustomPanelOrder(source.customPanelOrder, count, preset)
      : preset;
    const cableBySlot = new Map(order.map((slot, position) => [slot, position]));
    return Array.from({ length: count }, (_, slot) => {
      const panelX = slot % columns;
      const panelY = Math.floor(slot / columns);
      return normalizePanel({
        id: `panel-${slot + 1}`,
        name: `Panel ${slot + 1}`,
        x: panelX * width,
        y: panelY * height,
        width,
        height,
        ...normalizePanelTransform(transforms[slot], legacyFallback),
        cablePosition: cableBySlot.get(slot) ?? slot
      }, slot);
    });
  }

  function ensurePanels(source = null) {
    const candidates = Array.isArray(source) && source.length
      ? source
      : (state.panels.length ? state.panels : legacyPanelsFromConfig());
    const usedIds = new Set();
    state.panels = candidates.slice(0, 64).map((value, index) => {
      const panel = normalizePanel(value, index);
      let id = panel.id;
      while (usedIds.has(id)) id = `${panel.id}-${index + 1}`;
      panel.id = id;
      usedIds.add(id);
      return panel;
    });
    if (!state.panels.length) state.panels = [normalizePanel({ id: 'panel-1' }, 0)];
    normalizePanelCablePositions(state.panels);
    ensurePanelPhysicalStarts(state.panels);
    state.panelSerial = Math.max(state.panelSerial, state.panels.length);
    return state.panels;
  }

  function layoutMetrics(panels = ensurePanels(), requestedControllerPixels = null) {
    let width = 1;
    let height = 1;
    let activePhysicalPixels = 0;
    let configuredPhysicalPixels = 0;
    for (const panel of panels) {
      const mounted = mountedPanelSize(panel);
      width = Math.max(width, panel.x + mounted.width);
      height = Math.max(height, panel.y + mounted.height);
      const end = panel.physicalStart + panelPixelCount(panel);
      configuredPhysicalPixels = Math.max(configuredPhysicalPixels, end);
      if (panel.enabled) activePhysicalPixels += panelPixelCount(panel);
    }
    const requested = Number(requestedControllerPixels);
    const controllerPixels = Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : configuredPhysicalPixels);
    return { width, height, logicalPixels: width * height, activePhysicalPixels, configuredPhysicalPixels, controllerPixels, physicalPixels: activePhysicalPixels };
  }

  function captureCustomAssignments() {
    if (!state.customWiringOrder.length || !state.map?.cells?.length) return [];
    const byLogical = new Map(state.map.cells.map((cell) => [cell.logical, cell]));
    return state.customWiringOrder.map((logical) => {
      const cell = byLogical.get(logical);
      return cell ? { panelId: cell.panelId, localX: cell.localX, localY: cell.localY } : null;
    }).filter(Boolean);
  }

  function restoreCustomAssignments(assignments, panels) {
    if (!assignments.length) return false;
    const panelById = new Map(panels.map((panel) => [panel.id, panel]));
    const width = layoutMetrics(panels).width;
    const restored = [];
    const seen = new Set();
    for (const assignment of assignments) {
      const panel = panelById.get(assignment.panelId);
      if (!panel) continue;
      const logical = (panel.y + assignment.localY) * width + panel.x + assignment.localX;
      if (seen.has(logical)) continue;
      seen.add(logical);
      restored.push(logical);
    }
    state.customWiringOrder = restored;
    return restored.length === assignments.length;
  }

  function arrangePanelsInLine(axis = 'horizontal') {
    const panels = ensurePanels();
    const savedAssignments = captureCustomAssignments();
    let cursor = 0;
    for (const panel of panels) {
      if (axis === 'vertical') {
        panel.x = 0;
        panel.y = cursor;
        cursor += mountedPanelSize(panel).height;
      } else {
        panel.x = cursor;
        panel.y = 0;
        cursor += mountedPanelSize(panel).width;
      }
    }
    $('panelColumns').value = axis === 'vertical' ? '1' : String(Math.max(1, panels.length));
    $('panelRows').value = axis === 'vertical' ? String(Math.max(1, panels.length)) : '1';
    const preserved = restoreCustomAssignments(savedAssignments, panels);
    state.customEditing = false;
    render();
    $('mappingSaveMessage').textContent = `${panels.length} panels arranged in one ${axis === 'vertical' ? 'vertical column' : 'horizontal row'}.${savedAssignments.length ? (preserved ? ' Existing custom pixel assignments were preserved panel-by-panel.' : ' Some custom assignments could not be preserved and should be verified.') : ''} Press Save mapping.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function arrangePanelsGrid(columns = 2) {
    const panels = ensurePanels();
    const savedAssignments = captureCustomAssignments();
    const columnCount = Math.max(1, columns);
    let y = 0;
    for (let start = 0; start < panels.length; start += columnCount) {
      const row = panels.slice(start, start + columnCount);
      let x = 0;
      let rowHeight = 1;
      for (const panel of row) {
        panel.x = x;
        panel.y = y;
        const mounted = mountedPanelSize(panel);
        x += mounted.width;
        rowHeight = Math.max(rowHeight, mounted.height);
      }
      y += rowHeight;
    }
    $('panelColumns').value = String(columnCount);
    $('panelRows').value = String(Math.max(1, Math.ceil(panels.length / columnCount)));
    restoreCustomAssignments(savedAssignments, panels);
    state.customEditing = false;
    render();
    $('mappingSaveMessage').textContent = `${panels.length} panels arranged in a ${columnCount}-column grid. Existing custom assignments were preserved where possible. Press Save mapping.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function autoArrangePanelPositions() {
    const panels = ensurePanels();
    const columns = intValue('panelColumns', 2, 1, 16);
    let y = 0;
    for (let start = 0; start < panels.length; start += columns) {
      const row = panels.slice(start, start + columns);
      let x = 0;
      let rowHeight = 1;
      for (const panel of row) {
        panel.x = x;
        panel.y = y;
        const mounted = mountedPanelSize(panel);
        x += mounted.width;
        rowHeight = Math.max(rowHeight, mounted.height);
      }
      y += rowHeight;
    }
    $('panelRows').value = String(Math.max(1, Math.ceil(panels.length / columns)));
    state.customWiringOrder = [];
    state.customEditing = false;
    render();
    $('mappingSaveMessage').textContent = `Auto-arranged ${panels.length} panels across ${columns} columns. Custom click wiring was cleared because logical coordinates changed.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function addPanel() {
    const panels = ensurePanels();
    if (panels.length >= 64) return;
    state.panelSerial += 1;
    const width = intValue('panelWidth', 4, 1, 128);
    const height = intValue('panelHeight', 4, 1, 128);
    const transform = defaultPanelTransform();
    panels.push(normalizePanel({
      id: `panel-${Date.now().toString(36)}-${state.panelSerial}`,
      name: `Panel ${panels.length + 1}`,
      width,
      height,
      ...transform,
      cablePosition: panels.length,
      physicalStart: highestPanelAddressEnd(panels),
      enabled: true
    }, panels.length));
    autoArrangePanelPositions();
  }

  function removePanel(panelId) {
    const panels = ensurePanels();
    if (panels.length <= 1) {
      $('mappingSaveMessage').textContent = 'At least one panel is required.';
      return;
    }
    state.panels = panels.filter((panel) => panel.id !== panelId);
    normalizePanelCablePositions(state.panels);
    state.customWiringOrder = [];
    state.customEditing = false;
    autoArrangePanelPositions();
  }

  function repackPhysicalStarts() {
    const panels = ensurePanels().slice().sort((a, b) => a.cablePosition - b.cablePosition);
    let cursor = 0;
    for (const panel of panels) {
      panel.physicalStart = cursor;
      cursor += panelPixelCount(panel);
    }
    $('controllerPixels').value = String(Math.max(intValue('controllerPixels', cursor, 1, 262144), cursor));
    state.customWiringOrder = [];
    state.customEditing = false;
    render();
    $('mappingSaveMessage').textContent = `Repacked panel physical ranges from LED 1 through LED ${cursor}. Custom click wiring was cleared.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function matchControllerPixels() {
    const highest = highestPanelAddressEnd();
    $('controllerPixels').value = String(highest);
    render();
    $('mappingSaveMessage').textContent = `Controller pixel count set to ${highest}, matching the highest reserved panel address.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function presetDynamicPanelOrder(config) {
    const panels = config.panels || [];
    const columns = Math.max(1, Number(config.panelColumns) || 1);
    const rows = Math.max(1, Math.ceil(panels.length / columns));
    return coordinateOrder(columns, rows, config.panelAxis, config.panelCorner, Boolean(config.panelSerpentine))
      .map((point) => point.y * columns + point.x)
      .filter((slot) => slot < panels.length);
  }

  function resolvedDynamicPanelOrder(config) {
    if (config.panelOrderMode !== 'custom') return presetDynamicPanelOrder(config);
    return config.panels.map((_, index) => index)
      .sort((a, b) => config.panels[a].cablePosition - config.panels[b].cablePosition || a - b);
  }

  function defaultPanelTransform() {
    return normalizePanelTransform({
      rotation: Number($('rotation').value),
      flipX: $('flipX').checked,
      flipY: $('flipY').checked
    });
  }

  function ensurePanelTransforms(panelCount, source = null, fallback = defaultPanelTransform()) {
    const candidates = Array.isArray(source) ? source : state.panelTransforms;
    state.panelTransforms = Array.from({ length: panelCount }, (_, index) =>
      normalizePanelTransform(candidates[index], fallback)
    );
    return state.panelTransforms;
  }

  function presetPanelOrderSlots(panelColumns, panelRows, axis = $('panelAxis').value, corner = $('panelCorner').value, serpentine = $('panelSerpentine').checked) {
    return coordinateOrder(panelColumns, panelRows, axis, corner, Boolean(serpentine))
      .map((point) => point.y * panelColumns + point.x);
  }

  function normalizeCustomPanelOrder(order, panelCount, fallback = []) {
    const normalized = [];
    const seen = new Set();
    for (const value of Array.isArray(order) ? order : []) {
      const slot = Number(value);
      if (!Number.isInteger(slot) || slot < 0 || slot >= panelCount || seen.has(slot)) continue;
      seen.add(slot);
      normalized.push(slot);
    }
    for (const value of Array.isArray(fallback) ? fallback : []) {
      const slot = Number(value);
      if (!Number.isInteger(slot) || slot < 0 || slot >= panelCount || seen.has(slot)) continue;
      seen.add(slot);
      normalized.push(slot);
    }
    for (let slot = 0; slot < panelCount; slot += 1) {
      if (!seen.has(slot)) normalized.push(slot);
    }
    return normalized.slice(0, panelCount);
  }

  function ensureCustomPanelOrder(panelCount, source = null) {
    const preset = presetPanelOrderSlots(
      intValue('panelColumns', 2, 1, 16),
      intValue('panelRows', 2, 1, 16)
    );
    state.customPanelOrder = normalizeCustomPanelOrder(
      Array.isArray(source) ? source : state.customPanelOrder,
      panelCount,
      preset
    );
    return state.customPanelOrder;
  }

  function resolvedPanelOrderSlots(config) {
    const panelCount = config.panelColumns * config.panelRows;
    const preset = presetPanelOrderSlots(config.panelColumns, config.panelRows, config.panelAxis, config.panelCorner, config.panelSerpentine);
    if (config.panelOrderMode !== 'custom') return preset;
    return normalizeCustomPanelOrder(config.customPanelOrder, panelCount, preset);
  }

  function totalPixelsFromControls() {
    return layoutMetrics(ensurePanels(), intValue('controllerPixels', highestPanelAddressEnd(), 1, 262144)).activePhysicalPixels;
  }

  function normalizeCustomWiringOrder(order, total) {
    const result = [];
    const seen = new Set();
    for (const value of Array.isArray(order) ? order : []) {
      const logical = Number(value);
      if (!Number.isInteger(logical) || logical < 0 || logical >= total || seen.has(logical)) continue;
      seen.add(logical);
      result.push(logical);
    }
    return result;
  }

  function customPixelMapFromOrder(total, physicalAddresses = activePhysicalAddressSequence()) {
    state.customWiringOrder = normalizeCustomWiringOrder(state.customWiringOrder, total);
    const pixelMap = Array(total).fill(-1);
    state.customWiringOrder.slice(0, physicalAddresses.length).forEach((logical, index) => { pixelMap[logical] = physicalAddresses[index]; });
    return pixelMap;
  }

  function customOrderFromPixelMap(pixelMap, total, physicalAddresses = activePhysicalAddressSequence()) {
    if (!Array.isArray(pixelMap)) return [];
    const logicalByPhysical = new Map();
    pixelMap.forEach((physical, logical) => {
      const address = Number(physical);
      if (Number.isInteger(address) && address >= 0 && !logicalByPhysical.has(address)) logicalByPhysical.set(address, logical);
    });
    const compact = [];
    for (const address of physicalAddresses) {
      if (!logicalByPhysical.has(address)) break;
      compact.push(logicalByPhysical.get(address));
    }
    return normalizeCustomWiringOrder(compact, total);
  }

  function mappingFingerprint(pixelMap) {
    if (!Array.isArray(pixelMap) || !pixelMap.length) return 'none';
    let hash = 0x811c9dc5;
    for (const value of pixelMap) {
      const number = Number(value) >>> 0;
      for (let shift = 0; shift < 32; shift += 8) {
        hash ^= (number >>> shift) & 0xff;
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
    }
    return hash.toString(16).padStart(8, '0').toUpperCase();
  }

  function isCustomMode() {
    return $('wiringMode').value === 'custom';
  }

  function readConfig() {
    const panels = ensurePanels().map((panel) => ({ ...panel }));
    const metrics = layoutMetrics(panels, intValue('controllerPixels', highestPanelAddressEnd(panels), 1, 262144));
    const panelColumns = intValue('panelColumns', 2, 1, 16);
    const panelRows = Math.max(1, Math.ceil(panels.length / panelColumns));
    $('panelRows').value = String(panelRows);
    return {
      layoutMode: 'dynamic-panels',
      panels,
      controllerPixels: metrics.controllerPixels,
      controllerDirection: $('controllerDirection')?.value === 'reverse' ? 'reverse' : 'forward',
      activePhysicalPixels: metrics.activePhysicalPixels,
      panelWidth: intValue('panelWidth', 4, 1, 128),
      panelHeight: intValue('panelHeight', 4, 1, 128),
      panelColumns,
      panelRows,
      panelOrderMode: $('panelOrderMode').value,
      customPanelOrder: panels.map((_, index) => index).sort((a, b) => panels[a].cablePosition - panels[b].cablePosition),
      panelAxis: $('panelAxis').value,
      panelCorner: $('panelCorner').value,
      panelSerpentine: $('panelSerpentine').checked,
      pixelAxis: $('pixelAxis').value,
      pixelCorner: $('pixelCorner').value,
      pixelSerpentine: $('pixelSerpentine').checked,
      wiringMode: $('wiringMode').value,
      customPixelMap: customPixelMapFromOrder(metrics.logicalPixels, activePhysicalAddressSequence(panels)),
      flipX: $('flipX').checked,
      flipY: $('flipY').checked,
      rotation: Number($('rotation').value),
      panelTransforms: panels.map(({ rotation, flipX, flipY }) => ({ rotation, flipX, flipY })),
      labelMode: $('labelMode').value
    };
  }

  function buildMap(config) {
    const panels = ensurePanels(config.panels).map((panel) => ({ ...panel }));
    config = { ...config, panels };
    const metrics = layoutMetrics(panels, config.controllerPixels);
    const width = metrics.width;
    const height = metrics.height;
    const logicalTotal = metrics.logicalPixels;
    const activePhysicalPixels = metrics.activePhysicalPixels;
    const controllerPixels = metrics.controllerPixels;
    const order = resolvedDynamicPanelOrder(config);
    const chainBySlot = new Map(order.map((slot, index) => [slot, index]));
    const activeAddresses = activePhysicalAddressSequence(panels);
    const customMode = config.wiringMode === 'custom';
    const customPixelMap = Array.isArray(config.customPixelMap)
      ? config.customPixelMap.map(Number)
      : Array(logicalTotal).fill(-1);
    const cells = [];
    const occupiedLogical = new Set();
    const usedPhysical = new Set();
    const warnings = new Set();
    let assigned = 0;
    let overlap = false;

    panels.forEach((panel, panelSlot) => {
      const mounted = mountedPanelSize(panel);
      const localOrder = coordinateOrder(panel.width, panel.height, config.pixelAxis, config.pixelCorner, config.pixelSerpentine);
      const localAddress = new Map(localOrder.map((point, index) => [`${point.x},${point.y}`, index]));
      const panelIndex = chainBySlot.get(panelSlot);
      const baseOffset = panel.physicalStart;
      for (let localY = 0; localY < mounted.height; localY += 1) {
        for (let localX = 0; localX < mounted.width; localX += 1) {
          const x = panel.x + localX;
          const y = panel.y + localY;
          const logical = y * width + x;
          if (occupiedLogical.has(logical)) {
            overlap = true;
            warnings.add(`Panel ${panelSlot + 1} overlaps another panel at logical (${x}, ${y}).`);
          }
          occupiedLogical.add(logical);
          const physicalLocal = logicalToPhysicalLocal(localX, localY, panel);
          const localIndex = localAddress.get(`${physicalLocal.x},${physicalLocal.y}`);
          const presetPhysical = panel.enabled ? baseOffset + localIndex : -1;
          const physical = panel.enabled ? (customMode ? customPixelMap[logical] : presetPhysical) : -1;
          const addressValid = Number.isInteger(physical) && physical >= 0 && physical < controllerPixels;
          if (addressValid) {
            assigned += 1;
            if (usedPhysical.has(physical)) warnings.add(`Duplicate physical address ${physical + 1}.`);
            usedPhysical.add(physical);
          }
          cells.push({
            x, y, logical, panelX: panel.x, panelY: panel.y, panelSlot, panelId: panel.id,
            panelIndex, localX, localY, physical: addressValid ? physical : -1,
            presetPhysical, panelTransform: panel, panel
          });
        }
      }
    });
    cells.sort((a, b) => a.logical - b.logical);
    const uniqueActiveAddresses = usedPhysical.size === activePhysicalPixels;
    const valid = !overlap && uniqueActiveAddresses && (!customMode || assigned === activePhysicalPixels);
    if (customMode && assigned < activePhysicalPixels) warnings.add(`Custom wiring is incomplete: ${assigned} of ${activePhysicalPixels} active physical pixels assigned.`);
    if (metrics.configuredPhysicalPixels > controllerPixels) warnings.add(`Controller pixel count ${controllerPixels} is smaller than the highest configured panel address ${metrics.configuredPhysicalPixels}.`);
    if (occupiedLogical.size < logicalTotal) warnings.add(`${logicalTotal - occupiedLogical.size} logical canvas cells are empty; visuals pass through them without sending physical pixels.`);
    return {
      config, width, height, logicalTotal, physicalPixels: controllerPixels, controllerPixels, activePhysicalPixels, configuredPhysicalPixels: metrics.configuredPhysicalPixels, total: controllerPixels,
      panelPixels: null, cells, valid, assigned, customMode, activeAddresses, warnings: [...warnings]
    };
  }

  function panelColor(index, alpha = 1) {
    const hue = (index * 137.508) % 360;
    return `hsla(${hue},70%,48%,${alpha})`;
  }

  function selectedDetails(map) {
    if (!state.selected) return '';
    const item = map.cells.find((cell) => cell.x === state.selected.x && cell.y === state.selected.y);
    if (!item) return `Logical (${state.selected.x}, ${state.selected.y}) is empty.`;
    const address = item.physical >= 0 ? item.physical + 1 : 'unassigned';
    return `Logical (${item.x}, ${item.y}) · ${item.panel.name}${item.panel.enabled ? '' : ' · DISABLED'} · ${item.panel.width}×${item.panel.height} · cable position ${item.panelIndex + 1} · physical range ${item.panel.physicalStart + 1}–${item.panel.physicalStart + panelPixelCount(item.panel)} · ${item.panel.rotation}°${item.panel.flipX ? ' · mirror X' : ''}${item.panel.flipY ? ' · mirror Y' : ''} · Physical address ${address}`;
  }

  function renderPanelTransformEditors(config) {
    const container = $('panelTransformGrid');
    if (!container) return;
    const panels = ensurePanels(config.panels);
    const order = resolvedDynamicPanelOrder({ ...config, panels });
    const chainBySlot = new Map(order.map((slot, index) => [slot, index]));
    if ($('panelOrderSummary')) {
      $('panelOrderSummary').innerHTML = order.map((slot, index) => {
        const panel = panels[slot];
        return `<span class="${panel.enabled ? '' : 'panel-disabled'}"><strong>${index + 1}</strong> ${panel.name}<small>${panel.enabled ? 'Active' : 'Disabled'} · LEDs ${panel.physicalStart + 1}–${panel.physicalStart + panelPixelCount(panel)} · ${panel.width}×${panel.height} @ ${panel.x},${panel.y}</small></span>`;
      }).join('<i>→</i>');
    }
    container.innerHTML = panels.map((panel, slot) => {
      const chain = chainBySlot.get(slot) ?? slot;
      const options = [0, 90, 180, 270].map((angle) => `<option value="${angle}"${panel.rotation === angle ? ' selected' : ''}>${angle}°</option>`).join('');
      const chainOptions = Array.from({ length: panels.length }, (_, position) =>
        `<option value="${position}"${position === chain ? ' selected' : ''}>Cable position ${position + 1}</option>`
      ).join('');
      const mounted = mountedPanelSize(panel);
      return `<article class="panel-transform-card dynamic-panel-card${panel.enabled ? '' : ' panel-disabled'}" data-panel-id="${panel.id}">
        <div class="panel-transform-head"><div><strong>${panel.name}</strong><span>${panel.enabled ? 'Active' : 'Disabled'} · LEDs ${panel.physicalStart + 1}–${panel.physicalStart + panelPixelCount(panel)} · ${panel.width}×${panel.height} · mounted ${mounted.width}×${mounted.height} · cable #${chain + 1}</span></div><button class="panel-remove-button" type="button" data-remove-panel title="Remove panel">×</button></div>
        <label class="toggle panel-enabled-toggle"><input data-panel-field="enabled" type="checkbox"${panel.enabled ? ' checked' : ''}> Panel enabled for mapped output</label>
        <div class="panel-resolution-grid">
          <label>Logical X<input data-panel-field="x" type="number" min="0" max="8192" value="${panel.x}"></label>
          <label>Logical Y<input data-panel-field="y" type="number" min="0" max="8192" value="${panel.y}"></label>
          <label>Width<input data-panel-field="width" type="number" min="1" max="128" value="${panel.width}"></label>
          <label>Height<input data-panel-field="height" type="number" min="1" max="128" value="${panel.height}"></label>
          <label class="span-2">Physical start LED<input data-panel-field="physicalStart" type="number" min="1" max="262144" value="${panel.physicalStart + 1}"></label>
        </div>
        <label>Cable order<select data-panel-order-position>${chainOptions}</select></label>
        <div class="panel-order-buttons"><button class="button" type="button" data-panel-order-move="-1"${chain === 0 ? ' disabled' : ''}>Earlier</button><button class="button" type="button" data-panel-order-move="1"${chain === panels.length - 1 ? ' disabled' : ''}>Later</button></div>
        <label>Rotation<select data-panel-field="rotation">${options}</select></label>
        <label class="toggle"><input data-panel-field="flipX" type="checkbox"${panel.flipX ? ' checked' : ''}> Mirror horizontally</label>
        <label class="toggle"><input data-panel-field="flipY" type="checkbox"${panel.flipY ? ' checked' : ''}> Mirror vertically</label>
      </article>`;
    }).join('');

    container.querySelectorAll('[data-remove-panel]').forEach((button) => {
      button.addEventListener('click', () => removePanel(button.closest('[data-panel-id]').dataset.panelId));
    });

    container.querySelectorAll('[data-panel-order-position]').forEach((element) => {
      element.addEventListener('change', () => {
        const card = element.closest('[data-panel-id]');
        const panel = panels.find((item) => item.id === card.dataset.panelId);
        const desired = Number(element.value);
        const sorted = panels.slice().sort((a, b) => a.cablePosition - b.cablePosition);
        const current = sorted.indexOf(panel);
        if (current >= 0 && desired >= 0 && desired < panels.length && desired !== current) {
          [sorted[current], sorted[desired]] = [sorted[desired], sorted[current]];
          sorted.forEach((item, position) => { item.cablePosition = position; });
          $('panelOrderMode').value = 'custom';
          render();
        }
      });
    });

    container.querySelectorAll('[data-panel-order-move]').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = panels.find((item) => item.id === button.closest('[data-panel-id]').dataset.panelId);
        const sorted = panels.slice().sort((a, b) => a.cablePosition - b.cablePosition);
        const current = sorted.indexOf(panel);
        const next = Math.max(0, Math.min(sorted.length - 1, current + Number(button.dataset.panelOrderMove)));
        if (current !== next) {
          [sorted[current], sorted[next]] = [sorted[next], sorted[current]];
          sorted.forEach((item, position) => { item.cablePosition = position; });
          $('panelOrderMode').value = 'custom';
          render();
        }
      });
    });

    container.querySelectorAll('[data-panel-field]').forEach((element) => {
      element.addEventListener('change', () => {
        const panel = panels.find((item) => item.id === element.closest('[data-panel-id]').dataset.panelId);
        const field = element.dataset.panelField;
        const geometryField = ['x','y','width','height'].includes(field);
        const addressField = field === 'physicalStart';
        if (field === 'flipX' || field === 'flipY' || field === 'enabled') panel[field] = element.checked;
        else if (addressField) panel[field] = Math.max(0, Number(element.value) - 1);
        else panel[field] = Number(element.value);
        Object.assign(panel, normalizePanel(panel, panels.indexOf(panel)));
        if (geometryField || addressField || field === 'enabled') {
          state.customWiringOrder = [];
          state.customEditing = false;
        }
        render();
        $('mappingSaveMessage').textContent = geometryField || addressField || field === 'enabled'
          ? `${panel.name} output layout updated. Physical address gaps are preserved; custom click wiring was cleared. Press Save mapping after verification.`
          : `${panel.name} orientation updated. Press Save mapping to activate it.`;
        $('mappingSaveMessage').classList.remove('saved');
      });
    });
  }

  function usePresetAsCustomPanelOrder() {
    const config = readConfig();
    const order = presetDynamicPanelOrder(config);
    order.forEach((slot, position) => { state.panels[slot].cablePosition = position; });
    $('panelOrderMode').value = 'custom';
    render();
    $('mappingSaveMessage').textContent = `Loaded the current travel preset as a custom ${state.panels.length}-panel cable order. Reorder panels in the Panels tab, then press Save mapping.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function applyDefaultTransformToAllPanels() {
    const transform = defaultPanelTransform();
    ensurePanels().forEach((panel) => Object.assign(panel, transform));
    render();
    $('mappingSaveMessage').textContent = `Applied ${transform.rotation}°${transform.flipX ? ' + horizontal mirror' : ''}${transform.flipY ? ' + vertical mirror' : ''} to all ${state.panels.length} panels. Press Save mapping to make it active.`;
    $('mappingSaveMessage').classList.remove('saved');
  }

  function updateCustomWiringUi(map) {
    const panel = $('customWiringPanel');
    if (!panel) return;
    const custom = map.customMode;
    panel.classList.toggle('hidden', !custom);
    $('customAssignedCount').textContent = String(map.assigned);
    $('customTotalCount').textContent = String(map.activePhysicalPixels);
    $('customNextAddress').textContent = map.assigned < map.activeAddresses.length ? String(map.activeAddresses[map.assigned] + 1) : 'Complete';
    const complete = map.valid;
    $('customWiringBadge').textContent = complete ? 'Complete' : (state.customEditing ? 'Clicking active' : `${map.assigned}/${map.activePhysicalPixels}`);
    $('customWiringBadge').className = `badge ${complete ? 'live' : (state.customEditing ? 'live' : 'idle')}`;
    $('customStart').textContent = state.customEditing ? 'Pause clicking' : 'Start / resume clicking';
    $('customUndo').disabled = state.customWiringOrder.length === 0;
    if (!custom) state.customEditing = false;
  }

  function customMessage(message, error = false) {
    $('customWiringMessage').textContent = message;
    $('customWiringMessage').classList.toggle('output-error', error);
  }

  function toggleCustomEditing() {
    $('wiringMode').value = 'custom';
    const total = state.map?.activePhysicalPixels || totalPixelsFromControls();
    if (!state.customEditing && state.customWiringOrder.length >= total) {
      state.customEditing = false;
      render();
      customMessage('The custom map is complete. Press Save mapping, or Clear custom map to trace a different cable path.');
      return;
    }
    state.customEditing = !state.customEditing;
    render();
    customMessage(state.customEditing
      ? `Click the logical pixel connected to physical LED ${(state.map?.activeAddresses?.[state.customWiringOrder.length] ?? state.customWiringOrder.length) + 1}.`
      : `Click assignment paused at physical LED ${(state.map?.activeAddresses?.[state.customWiringOrder.length] ?? state.customWiringOrder.length) + 1}.`);
  }

  function undoCustomWiring() {
    if (!state.customWiringOrder.length) return;
    const removed = state.customWiringOrder.pop();
    state.customEditing = true;
    state.selected = { x: removed % state.map.width, y: Math.floor(removed / state.map.width) };
    $('selectedPixel').textContent = 'Unassigned';
    render();
    customMessage(`Removed the last assignment. Click the pixel connected to physical LED ${(state.map?.activeAddresses?.[state.customWiringOrder.length] ?? state.customWiringOrder.length) + 1}.`);
  }

  function clearCustomWiring() {
    state.customWiringOrder = [];
    state.customEditing = true;
    $('wiringMode').value = 'custom';
    state.selected = null;
    $('selectedPixel').textContent = '—';
    render();
    customMessage(`Custom map cleared. Click the pixel connected to physical LED ${(state.map?.activeAddresses?.[0] ?? 0) + 1}.`);
  }

  function usePresetAsCustomMap() {
    const config = readConfig();
    const preset = buildMap({ ...config, wiringMode: 'preset', customPixelMap: [] });
    const logicalByPhysical = new Map(preset.cells.filter((cell) => cell.physical >= 0).map((cell) => [cell.physical, cell.logical]));
    const order = preset.activeAddresses.map((address) => logicalByPhysical.get(address)).filter(Number.isInteger);
    state.customWiringOrder = normalizeCustomWiringOrder(order, preset.logicalTotal);
    $('wiringMode').value = 'custom';
    state.customEditing = false;
    render();
    customMessage('Loaded the current panel layout as a complete custom map. Use Clear map to retrace a fully arbitrary cable path.');
  }

  function assignCustomLogical(logical) {
    const physicalTotal = state.map?.activePhysicalPixels || totalPixelsFromControls();
    const logicalTotal = state.map?.logicalTotal || layoutMetrics().logicalPixels;
    state.customWiringOrder = normalizeCustomWiringOrder(state.customWiringOrder, logicalTotal);
    const targetCell = state.map?.cells.find((cell) => cell.logical === logical);
    if (!targetCell || !targetCell.panel.enabled) {
      customMessage('That logical canvas cell is empty or belongs to a disabled panel. Click an active panel pixel.', true);
      return;
    }
    const existing = state.customWiringOrder.indexOf(logical);
    if (existing >= 0) {
      customMessage(`That pixel is already assigned to physical LED ${state.map.activeAddresses[existing] + 1}. Use Undo last or Clear custom map before assigning it again.`, true);
      return;
    }
    if (state.customWiringOrder.length >= physicalTotal) {
      state.customEditing = false;
      customMessage('The custom map is already complete. Save mapping to activate it.');
      render();
      return;
    }
    state.customWiringOrder.push(logical);
    const assignedAddress = state.map.activeAddresses[state.customWiringOrder.length - 1];
    state.selected = { x: logical % state.map.width, y: Math.floor(logical / state.map.width) };
    $('selectedPixel').textContent = `P${assignedAddress + 1}`;
    if (state.customWiringOrder.length >= physicalTotal) {
      state.customEditing = false;
      customMessage(`Custom wiring complete: ${physicalTotal} active pixels assigned across the preserved controller address space. Press Save mapping.`);
    } else {
      const nextAddress = state.map.activeAddresses[state.customWiringOrder.length];
      customMessage(`Assigned physical LED ${assignedAddress + 1}. Now click the pixel connected to physical LED ${nextAddress + 1}.`);
    }
    render();
  }

  function occupiedLogicalIndexes(map) {
    return map.cells.filter((cell) => cell.panel.enabled).map((cell) => cell.logical).sort((a, b) => a - b);
  }

  function nearestOccupiedLogical(map, requested) {
    const occupied = occupiedLogicalIndexes(map);
    if (!occupied.length) return 0;
    if (occupied.includes(requested)) return requested;
    return occupied.find((value) => value >= requested) ?? occupied[0];
  }

  function mappedLogicalIndex(map) {
    const field = $('mappedLogicalNumber');
    const fallback = state.selected ? state.selected.y * map.width + state.selected.x : occupiedLogicalIndexes(map)[0] || 0;
    const raw = field ? Number.parseInt(field.value, 10) - 1 : fallback;
    const requested = Math.max(0, Math.min(map.logicalTotal - 1, Number.isFinite(raw) ? raw : fallback));
    return nearestOccupiedLogical(map, requested);
  }

  function selectMappedLogical(logical) {
    const map = state.map || buildMap(readConfig());
    const clamped = nearestOccupiedLogical(map, Math.max(0, Math.min(map.logicalTotal - 1, Number(logical) || 0)));
    const item = map.cells.find((cell) => cell.logical === clamped);
    if (!item) return;
    state.selected = { x: item.x, y: item.y };
    if ($('mappedLogicalNumber')) $('mappedLogicalNumber').value = String(clamped + 1);
    $('selectedPixel').textContent = item.physical >= 0 ? `P${item.physical + 1}` : 'Unassigned';
    if (item.physical >= 0) {
      $('mapPixelNumber').value = String(item.physical + 1);
      $('mapPixelDisplay').textContent = String(item.physical + 1);
    }
    render();
  }

  function updateMappingProof(map) {
    if (!$('mappingProofType')) return;
    const pixelMap = pixelMapFor(map);
    const logical = mappedLogicalIndex(map);
    const physical = pixelMap[logical];
    $('mappingProofType').textContent = map.customMode ? 'Custom click map' : (map.config.panelOrderMode === 'custom' ? 'Dynamic panels · custom order' : 'Dynamic panel preset');
    $('mappingProofFingerprint').textContent = mappingFingerprint(pixelMap);
    $('mappingProofRoute').textContent = Number.isInteger(physical) && physical >= 0
      ? `Logical ${logical + 1} (${logical % map.width},${Math.floor(logical / map.width)}) → Physical ${physical + 1}`
      : `Logical ${logical + 1} → Empty canvas cell`;
    $('mappedLogicalNumber').max = String(map.logicalTotal);
    $('mappedLogicalNumber').value = String(logical + 1);
  }

  function stepMappedLogical(delta) {
    const map = state.map || buildMap(readConfig());
    const occupied = occupiedLogicalIndexes(map);
    const current = mappedLogicalIndex(map);
    const position = Math.max(0, occupied.indexOf(current));
    selectMappedLogical(occupied[(position + delta + occupied.length) % occupied.length]);
  }

  function render() {
    const map = buildMap(readConfig());
    state.map = map;
    if ($('panelOrderModeHint')) {
      $('panelOrderModeHint').textContent = map.config.panelOrderMode === 'custom'
        ? 'Custom cable order active. Use the Panels tab to assign each panel position.'
        : 'Preset cable order follows travel, start corner, and serpentine settings.';
    }
    state.cells = map.cells;
    updateMappingProof(map);
    renderPanelTransformEditors(map.config);
    updateCustomWiringUi(map);
    const canvas = $('mappingCanvas');
    canvas.classList.toggle('custom-editing', map.customMode && state.customEditing);
    const ctx = canvas.getContext('2d');
    const stage = canvas.closest('.mapping-stage-wrap');
    const visibleWidth = Math.max(260, Number(stage?.clientWidth || 0) - 28);
    const visibleHeight = Math.max(240, Number(stage?.clientHeight || 0) - 28);
    const maxWidth = visibleWidth > 280 ? visibleWidth : 980;
    const maxHeight = visibleHeight > 260 ? visibleHeight : 720;
    const cell = Math.max(3, Math.min(72, Math.floor(Math.min(maxWidth / map.width, maxHeight / map.height))));
    canvas.width = map.width * cell + 2;
    canvas.height = map.height * cell + 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${Math.max(9, Math.floor(cell * .18))}px ui-monospace,Consolas,monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of map.cells) {
      const px = item.x * cell + 1;
      const py = item.y * cell + 1;
      const live = state.activePixelOn && state.activePhysical === item.physical;
      ctx.fillStyle = item.panel.enabled ? (live ? '#ff2d55' : panelColor(item.panelIndex, .3)) : '#1b2433';
      ctx.fillRect(px, py, cell - 1, cell - 1);
      const mounted = mountedPanelSize(item.panel);
      const edge = item.localX === 0 || item.localY === 0 || item.localX === mounted.width - 1 || item.localY === mounted.height - 1;
      ctx.strokeStyle = item.panel.enabled ? (edge ? panelColor(item.panelIndex, .95) : '#263955') : '#68758a';
      ctx.lineWidth = edge ? 2 : 1;
      ctx.strokeRect(px + .5, py + .5, cell - 2, cell - 2);
      const selected = state.selected && state.selected.x === item.x && state.selected.y === item.y;
      if (selected || live) {
        ctx.strokeStyle = live ? '#ffffff' : '#b8c6ff';
        ctx.lineWidth = live ? 4 : 3;
        ctx.strokeRect(px + 2, py + 2, cell - 5, cell - 5);
      }
      const mode = map.config.labelMode;
      ctx.fillStyle = '#eef3ff';
      if (mode === 'physical' || mode === 'both') ctx.fillText(item.panel.enabled ? (item.physical >= 0 ? String(item.physical + 1) : '—') : 'OFF', px + cell / 2, py + cell * (mode === 'both' ? .4 : .5));
      if (mode === 'logical' || mode === 'both') {
        ctx.fillStyle = '#9badc9';
        ctx.fillText(`${item.x},${item.y}`, px + cell / 2, py + cell * (mode === 'both' ? .68 : .5));
      }
    }

    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 2;
    const physicalOrder = map.cells.filter((cell) => cell.physical >= 0).sort((a, b) => a.physical - b.physical);
    for (let i = 1; i < physicalOrder.length; i += 1) {
      const previous = physicalOrder[i - 1];
      const current = physicalOrder[i];
      ctx.beginPath();
      ctx.moveTo(previous.x * cell + cell / 2, previous.y * cell + cell / 2);
      ctx.lineTo(current.x * cell + cell / 2, current.y * cell + cell / 2);
      ctx.stroke();
    }

    if (state.showPanelLabels) {
      map.config.panels.forEach((panel, panelIndex) => {
        const mounted = mountedPanelSize(panel);
        const x = panel.x * cell + 1;
        const y = panel.y * cell + 1;
        const width = mounted.width * cell;
        const height = mounted.height * cell;
        ctx.save();
        ctx.strokeStyle = panel.enabled ? panelColor(panelIndex, 1) : '#8793a6';
        ctx.lineWidth = Math.max(3, Math.min(7, cell * .09));
        ctx.strokeRect(x + 1, y + 1, Math.max(1, width - 3), Math.max(1, height - 3));
        const label = `P${panelIndex + 1} · ${panel.width}×${panel.height} · cable ${panel.cablePosition + 1}`;
        const compact = `P${panelIndex + 1}`;
        const text = cell >= 18 ? label : compact;
        ctx.font = `${Math.max(10, Math.min(16, cell * .22))}px Inter,system-ui,sans-serif`;
        const metrics = ctx.measureText(text);
        const labelWidth = Math.min(width - 8, metrics.width + 14);
        if (labelWidth > 16 && height > 14) {
          const labelHeight = Math.max(18, cell * .32);
          ctx.fillStyle = panel.enabled ? '#06101de6' : '#1b2433e6';
          ctx.fillRect(x + 5, y + 5, labelWidth, labelHeight);
          ctx.fillStyle = '#f4f7ff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, x + 11, y + 5 + labelHeight / 2, Math.max(1, labelWidth - 10));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
        }
        ctx.restore();
      });
    }

    $('canvasSize').textContent = `${map.width} × ${map.height}`;
    $('panelCount').textContent = String(map.config.panels.length);
    $('pixelCount').textContent = `${map.activePhysicalPixels} / ${map.controllerPixels}`;
    $('mapPixelTotal').textContent = String(map.controllerPixels);
    $('mapPixelNumber').max = String(map.controllerPixels);
    if ($('panelLayoutSummary')) $('panelLayoutSummary').textContent = `${map.config.panels.length} panel${map.config.panels.length === 1 ? '' : 's'} · ${map.config.panels.filter((panel) => panel.enabled).length} active · ${map.width} × ${map.height} canvas · ${map.activePhysicalPixels} active pixels · ${map.controllerPixels} controller pixels${map.logicalTotal > map.config.panels.reduce((sum, panel) => sum + panelPixelCount(panel), 0) ? ` · sparse logical layout` : ''} · ${map.config.controllerDirection === 'reverse' ? `reverse chain ${map.controllerPixels}→1` : `forward chain 1→${map.controllerPixels}`}`;
    clampPixelInput();
    $('mappingStatus').textContent = map.valid ? (map.customMode ? 'Custom valid' : (map.warnings.length ? 'Valid with warning' : 'Valid')) : (map.customMode ? `${map.assigned}/${map.activePhysicalPixels} assigned` : 'Invalid');
    $('mappingStatus').className = `badge ${map.valid ? 'live' : 'invalid'}`;

    const details = selectedDetails(map);
    $('mappingMessage').textContent = details || (map.warnings.length ? map.warnings.join(' ') : 'Click a pixel to inspect it and load that physical address into the live tester.');
    localStorage.setItem('ledcontroller.mapping.draft', JSON.stringify(map.config));
  }

  function reset() {
    const defaults = { controllerPixels:64,controllerDirection:'forward',panelWidth:4,panelHeight:4,panelColumns:2,panelRows:2,panelOrderMode:'preset',panelAxis:'rows',panelCorner:'tl',panelSerpentine:true,pixelAxis:'rows',pixelCorner:'tl',pixelSerpentine:true,flipX:false,flipY:false,rotation:0,wiringMode:'preset',labelMode:'physical' };
    for (const [key, value] of Object.entries(defaults)) {
      const element = $(key);
      if (!element) continue;
      if (element.type === 'checkbox') element.checked = value;
      else element.value = String(value);
    }
    state.panels = legacyPanelsFromConfig(defaults);
    state.customWiringOrder = [];
    state.customEditing = false;
    state.selected = null;
    $('selectedPixel').textContent = '—';
    if ($('panelResolutionPreset')) $('panelResolutionPreset').value = '4x4';
    render();
  }

  function targetFromForm(extra = {}) {
    return {
      targetIp: $('mapTargetIp').value.trim(),
      protocol: $('mapProtocol').value,
      port: numberValue('mapPort', 4048, 1, 65535),
      startUniverse: intValue('mapStartUniverse', 0, 0, 32767),
      channelOrder: $('mapChannelOrder').value,
      name: extra.name || state.activeTarget?.name || '',
      source: extra.source || state.activeTarget?.source || ''
    };
  }

  function updateTargetState(target = targetFromForm()) {
    const ip = target?.targetIp || '';
    const protocol = String(target?.protocol || 'ddp').toUpperCase();
    const name = target?.name ? `${target.name} · ` : '';
    $('mapTargetState').textContent = ip ? `${name}${ip} · ${protocol}` : 'No controller selected';
  }

  function applyTargetSettings(target) {
    if (!target || !target.targetIp) return false;
    $('mapTargetIp').value = target.targetIp;
    if (target.protocol) $('mapProtocol').value = target.protocol;
    if (target.port) $('mapPort').value = target.port;
    if (target.startUniverse !== undefined) $('mapStartUniverse').value = target.startUniverse;
    if (target.channelOrder) $('mapChannelOrder').value = target.channelOrder;
    state.activeTarget = { ...target };
    updateProtocolFields();
    updateTargetState(state.activeTarget);
    return true;
  }

  function targetFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const targetIp = params.get('targetIp');
    if (!targetIp) return null;
    return {
      targetIp,
      protocol: params.get('protocol') || 'ddp',
      port: Number(params.get('port') || 4048),
      startUniverse: Number(params.get('startUniverse') || 0),
      channelOrder: params.get('channelOrder') || 'RGB',
      name: params.get('name') || '',
      source: 'Discovery page'
    };
  }

  function applyStoredMapping(saved) {
    if (!saved || typeof saved !== 'object') return false;
    for (const [key, value] of Object.entries(saved)) {
      if (['panelTransforms','customPanelOrder','panels','resolvedPixelMap','canvasWidth','canvasHeight','physicalPixels','activePhysicalPixels'].includes(key)) continue;
      const element = $(key);
      if (!element) continue;
      if (element.type === 'checkbox') element.checked = Boolean(value);
      else element.value = String(value);
    }
    state.panels = Array.isArray(saved.panels) && saved.panels.length
      ? ensurePanels(saved.panels)
      : legacyPanelsFromConfig(saved);
    const storedControllerPixels = Math.max(1, Number(saved.controllerPixels || saved.physicalPixels || highestPanelAddressEnd(state.panels)));
    $('controllerPixels').value = String(storedControllerPixels);
    const metrics = layoutMetrics(state.panels, storedControllerPixels);
    const customSource = Array.isArray(saved.customPixelMap) ? saved.customPixelMap : saved.resolvedPixelMap;
    state.customWiringOrder = customOrderFromPixelMap(customSource, metrics.logicalPixels, activePhysicalAddressSequence(state.panels));
    return true;
  }

  function restore() {
    let mappingRestored = false;
    try {
      const saved = JSON.parse(localStorage.getItem('ledcontroller.mapping.preview') || localStorage.getItem('ledcontroller.mapping.draft') || 'null');
      if (saved) mappingRestored = applyStoredMapping(saved);
      else state.panels = legacyPanelsFromConfig();
      const target = JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null');
      applyTargetSettings(target);
      const test = JSON.parse(localStorage.getItem('ledcontroller.mapping.test') || 'null');
      if (test) {
        for (const [key, value] of Object.entries(test)) {
          const element = $(key);
          if (element) element.value = String(value);
        }
      }
    } catch {
      state.panels = legacyPanelsFromConfig();
    }
    updateTargetState(state.activeTarget || targetFromForm());
    return mappingRestored;
  }

  async function restoreServerMappingIfNeeded(localMappingRestored) {
    if (localMappingRestored) return false;
    try {
      const result = await api('/api/mapping');
      if (!result.mapping || !applyStoredMapping(result.mapping)) return false;
      localStorage.setItem('ledcontroller.mapping.preview', JSON.stringify(result.mapping));
      localStorage.setItem('ledcontroller.mapping.draft', JSON.stringify(result.mapping));
      state.savedMappingSignature = JSON.stringify(result.mapping);
      render();
      const when = result.savedAt ? new Date(result.savedAt).toLocaleString() : 'an earlier session';
      $('mappingSaveMessage').textContent = `Recovered the active mapping from disk backup saved ${when}.`;
      $('mappingSaveMessage').classList.add('saved');
      return true;
    } catch (error) {
      console.warn('Mapping disk recovery was unavailable:', error);
      return false;
    }
  }

  async function syncActiveTarget() {
    let serverTarget = null;
    try {
      const result = await api('/api/target');
      if (result.target?.targetIp) serverTarget = result.target;
    } catch {}

    if (serverTarget) {
      applyTargetSettings(serverTarget);
      localStorage.setItem('ledcontroller.output.target', JSON.stringify(serverTarget));
      return;
    }

    const urlTarget = targetFromUrl();
    if (urlTarget) {
      applyTargetSettings(urlTarget);
      await saveTargetSettings({ syncServer: true, quiet: true });
      return;
    }

    if (state.activeTarget?.targetIp) {
      await saveTargetSettings({ syncServer: true, quiet: true });
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null');
      if (applyTargetSettings(stored)) {
        await saveTargetSettings({ syncServer: true, quiet: true });
        return;
      }
    } catch {}

    try {
      const result = await api('/api/devices');
      const wled = (result.devices || []).filter((device) => (device.protocols || []).includes('DDP') || String(device.vendor || '').toLowerCase().includes('wled'));
      if (wled.length === 1) {
        applyTargetSettings({
          targetIp: wled[0].ip,
          protocol: 'ddp',
          port: 4048,
          startUniverse: 0,
          channelOrder: 'RGB',
          name: wled[0].name,
          source: wled[0].source
        });
        await saveTargetSettings({ syncServer: true, quiet: true });
      }
    } catch {}
  }

  function saveMapping() {
    const map = state.map || buildMap(readConfig());
    if (!map.valid) {
      const message = 'Mapping was not saved because panels overlap or physical addresses are incomplete/duplicated.';
      $('mappingSaveMessage').textContent = message;
      $('mappingSaveMessage').classList.remove('saved');
      if ($('customSaveMessage')) {
        $('customSaveMessage').textContent = message;
        $('customSaveMessage').classList.remove('saved');
      }
      return false;
    }
    const resolvedPixelMap = pixelMapFor(map);
    const savedConfig = {
      ...map.config,
      version: 7,
      canvasWidth: map.width,
      canvasHeight: map.height,
      physicalPixels: map.controllerPixels,
      controllerPixels: map.controllerPixels,
      activePhysicalPixels: map.activePhysicalPixels,
      resolvedPixelMap
    };
    localStorage.setItem('ledcontroller.mapping.preview', JSON.stringify(savedConfig));
    localStorage.setItem('ledcontroller.mapping.draft', JSON.stringify(savedConfig));
    state.savedMappingSignature = JSON.stringify(savedConfig);
    const fingerprint = mappingFingerprint(resolvedPixelMap);
    const chainLabel = map.config.controllerDirection === 'reverse' ? `reverse chain ${map.controllerPixels}→1` : `forward chain 1→${map.controllerPixels}`;
    const savedMessage = `Saved ${map.config.panels.length}-panel mapping: ${map.width} × ${map.height} logical canvas, ${map.activePhysicalPixels} active pixels in a ${map.controllerPixels}-pixel controller frame · ${chainLabel} · fingerprint ${fingerprint}.`;
    $('mappingSaveMessage').textContent = savedMessage;
    $('mappingSaveMessage').classList.add('saved');
    if ($('customSaveMessage')) {
      $('customSaveMessage').textContent = `${savedMessage} Custom click wiring is now active for mapped tests and visuals.`;
      $('customSaveMessage').classList.add('saved');
    }
    window.dispatchEvent(new CustomEvent('ledcontroller:mapping-saved', { detail: savedConfig }));
    const savedSignature = state.savedMappingSignature;
    api('/api/mapping', { method: 'POST', body: JSON.stringify({ mapping: savedConfig }) })
      .then((result) => {
        if (state.savedMappingSignature !== savedSignature) return;
        const diskMessage = `${savedMessage} Disk backup: ${result.storagePath}.`;
        $('mappingSaveMessage').textContent = diskMessage;
        if ($('customSaveMessage')) $('customSaveMessage').textContent = `${diskMessage} Custom click wiring is now active for mapped tests and visuals.`;
      })
      .catch((error) => {
        if (state.savedMappingSignature !== savedSignature) return;
        $('mappingSaveMessage').textContent = `${savedMessage} Browser save succeeded, but disk backup failed: ${error.message}`;
      });
    return true;
  }

  function pixelMapFor(map) {
    const pixelMap = Array(map.logicalTotal).fill(-1);
    for (const cell of map.cells) pixelMap[cell.logical] = cell.physical;
    return pixelMap;
  }

  function selectedLogicalIndex(map) {
    return mappedLogicalIndex(map);
  }

  function exportJson() {
    const map = state.map || buildMap(readConfig());
    const payload = {
      version: 7,
      type: 'LEDController dynamic panel mapping',
      ...map.config,
      canvasWidth: map.width,
      canvasHeight: map.height,
      physicalPixels: map.controllerPixels,
      controllerPixels: map.controllerPixels,
      activePhysicalPixels: map.activePhysicalPixels,
      resolvedPixelMap: pixelMapFor(map)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ledcontroller-dynamic-panel-mapping.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function updateProtocolFields() {
    const artnet = $('mapProtocol').value === 'artnet';
    $('mapPortField').classList.toggle('hidden', artnet);
    $('mapUniverseField').classList.toggle('hidden', !artnet);
  }

  function clampPixelInput() {
    const total = Math.max(1, state.map?.total || 1);
    const value = intValue('mapPixelNumber', 1, 1, total);
    $('mapPixelNumber').value = String(value);
    $('mapPixelDisplay').textContent = String(value);
    return value;
  }

  function selectPhysical(physical) {
    // Raw physical-chain testing must remain usable before a logical map exists.
    // Always move the raw address first; linking it to a logical cell is optional.
    const map = state.map || buildMap(readConfig());
    const total = Math.max(1, map.controllerPixels || map.total || 1);
    const clamped = Math.max(0, Math.min(total - 1, Number.isFinite(Number(physical)) ? Number(physical) : 0));
    $('mapPixelNumber').value = String(clamped + 1);
    $('mapPixelDisplay').textContent = String(clamped + 1);

    const item = map.cells.find((cell) => cell.physical === clamped);
    if (item) {
      state.selected = { x: item.x, y: item.y };
      $('selectedPixel').textContent = `P${clamped + 1}`;
    } else {
      state.selected = null;
      $('selectedPixel').textContent = `Raw P${clamped + 1}`;
    }
    render();
    return clamped;
  }

  async function saveTargetSettings({ syncServer = false, quiet = false } = {}) {
    const target = targetFromForm();
    if (target.targetIp) {
      localStorage.setItem('ledcontroller.output.target', JSON.stringify(target));
      state.activeTarget = { ...target };
      updateTargetState(state.activeTarget);
      if (syncServer) {
        try {
          const result = await api('/api/target', { method: 'POST', body: JSON.stringify(target) });
          state.activeTarget = result.target || target;
          updateTargetState(state.activeTarget);
          window.dispatchEvent(new CustomEvent('ledcontroller:target-changed', { detail: { ...state.activeTarget } }));
        } catch (error) {
          if (!quiet) outputMessage(`Target sync warning: ${error.message}`, true);
        }
      }
    } else {
      updateTargetState(target);
    }
    localStorage.setItem('ledcontroller.mapping.test', JSON.stringify({
      mapBrightness: $('mapBrightness').value,
      mapColor: $('mapColor').value,
      mapStepSeconds: $('mapStepSeconds').value,
      mapGapSeconds: $('mapGapSeconds').value
    }));
  }

  async function ensureActiveTarget() {
    const formTarget = targetFromForm();
    if (formTarget.targetIp) {
      try {
        const result = await api('/api/target', { method: 'POST', body: JSON.stringify(formTarget) });
        applyTargetSettings(result.target || formTarget);
        localStorage.setItem('ledcontroller.output.target', JSON.stringify(result.target || formTarget));
        return result.target || formTarget;
      } catch (error) {
        throw new Error(`Could not restore the selected controller: ${error.message}`);
      }
    }

    try {
      const result = await api('/api/target');
      if (applyTargetSettings(result.target)) {
        localStorage.setItem('ledcontroller.output.target', JSON.stringify(result.target));
        return result.target;
      }
    } catch {}

    try {
      const stored = JSON.parse(localStorage.getItem('ledcontroller.output.target') || 'null');
      if (applyTargetSettings(stored)) {
        const result = await api('/api/target', { method: 'POST', body: JSON.stringify(stored) });
        applyTargetSettings(result.target || stored);
        return result.target || stored;
      }
    } catch {}

    throw new Error('No WLED controller is selected. Open Discover, choose Use target, then return to Mapping.');
  }

  async function outputConfig(pattern) {
    const map = state.map || buildMap(readConfig());
    const pixelNumber = clampPixelInput();
    const target = await ensureActiveTarget();
    await saveTargetSettings({ syncServer: true, quiet: true });
    return {
      targetIp: target.targetIp,
      protocol: target.protocol || 'ddp',
      port: Number(target.port || 4048),
      width: map.controllerPixels,
      height: 1,
      fps: 20,
      brightness: numberValue('mapBrightness', 0.2, 0, 1),
      pattern,
      color: $('mapColor').value,
      secondaryColor: '#06162f',
      speed: 0.65,
      scale: 1,
      direction: 1,
      channelOrder: target.channelOrder || $('mapChannelOrder').value,
      startUniverse: Number(target.startUniverse || 0),
      destination: 1,
      pixelIndex: pixelNumber - 1,
      stepSeconds: numberValue('mapStepSeconds', 2, 0.1, 30),
      gapSeconds: numberValue('mapGapSeconds', 0.3, 0, 10),
      pixelOn: true,
      controllerDirection: state.map?.config?.controllerDirection || $('controllerDirection')?.value || 'forward'
    };
  }

  async function mappedOutputConfig(pattern) {
    const map = state.map || buildMap(readConfig());
    if (!map.valid) throw new Error('The current mapping is invalid. Correct duplicate or missing addresses before output.');
    saveMapping();
    const target = await ensureActiveTarget();
    await saveTargetSettings({ syncServer: true, quiet: true });
    return {
      targetIp: target.targetIp,
      protocol: target.protocol || 'ddp',
      port: Number(target.port || 4048),
      width: map.width,
      height: map.height,
      panelWidth: map.config.panelWidth,
      panelHeight: map.config.panelHeight,
      panelRects: map.config.panels.filter((panel) => panel.enabled).map((panel) => {
        const mounted = mountedPanelSize(panel);
        return { x: panel.x, y: panel.y, width: mounted.width, height: mounted.height };
      }),
      fps: 20,
      brightness: numberValue('mapBrightness', 0.2, 0, 1),
      pattern,
      color: $('mapColor').value,
      secondaryColor: '#06162f',
      speed: 0.65,
      scale: 1,
      direction: 1,
      channelOrder: target.channelOrder || $('mapChannelOrder').value,
      startUniverse: Number(target.startUniverse || 0),
      destination: 1,
      pixelIndex: selectedLogicalIndex(map),
      stepSeconds: numberValue('mapStepSeconds', 2, 0.1, 30),
      gapSeconds: numberValue('mapGapSeconds', 0.3, 0, 10),
      pixelOn: true,
      pixelMap: pixelMapFor(map),
      physicalPixels: map.controllerPixels,
      controllerPixels: map.controllerPixels,
      controllerDirection: map.config.controllerDirection || 'forward' 
    };
  }

  async function startMappedPattern(pattern, label) {
    try {
      const config = await mappedOutputConfig(pattern);
      const status = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
      state.outputRunning = true;
      state.outputOwner = 'mapping';
      state.streamId = status.streamId || '';
      const logical = config.pixelIndex + 1;
      const physical = config.pixelMap[config.pixelIndex] + 1;
      const controllerAddress = config.controllerDirection === 'reverse' ? config.controllerPixels - physical + 1 : physical;
      if (pattern === 'manual-pixel') {
        mappedMessage(`Holding logical pixel ${logical} at cable LED ${physical} → WLED address ${controllerAddress}${config.controllerDirection === 'reverse' ? ' (reverse chain)' : ''}. Mapping exclusively owns output.`);
      } else {
        mappedMessage(`${label} started across the full ${config.width} × ${config.height} logical matrix. Mapping exclusively owns output.`);
      }
      renderOutputStatus(status);
      render();
    } catch (error) {
      mappedMessage(error.message, true);
    }
  }

  async function mappedBlackout() {
    try {
      const config = await mappedOutputConfig('blackout');
      const current = await api('/api/output/status');
      if (current.running && current.owner === 'mapping') {
        await api('/api/output/stop', { method: 'POST', body: JSON.stringify({ outputOwner: 'mapping', streamId: current.streamId || state.streamId }) });
      } else if (current.running) {
        const claimed = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
        await api('/api/output/stop', { method: 'POST', body: JSON.stringify({ outputOwner: 'mapping', streamId: claimed.streamId }) });
      }
      const result = await api('/api/output/once', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
      state.outputRunning = false;
      state.outputOwner = '';
      state.streamId = '';
      state.activePhysical = null;
      state.activePixelOn = false;
      mappedMessage('Mapped output stopped, its ownership lease was released, and all pixels were set to black.');
      renderOutputStatus(result.status);
      render();
    } catch (error) {
      mappedMessage(error.message, true);
    }
  }

  function mappedMessage(message, error = false) {
    $('mappedOutputMessage').textContent = message;
    $('mappedOutputMessage').classList.toggle('output-error', error);
  }

  function outputMessage(message, error = false) {
    $('mappingOutputMessage').textContent = message;
    $('mappingOutputMessage').classList.toggle('output-error', error);
  }

  async function holdPixel() {
    try {
      const config = await outputConfig('manual-pixel');
      const status = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
      state.outputRunning = true;
      state.outputOwner = 'mapping';
      state.streamId = status.streamId || '';
      state.activePhysical = config.pixelIndex;
      state.activePixelOn = true;
      outputMessage(`Holding physical pixel ${config.pixelIndex + 1} ON. Every other pixel is OFF.`);
      renderOutputStatus(status);
      render();
    } catch (error) {
      outputMessage(error.message, true);
    }
  }

  async function startSlowChase() {
    try {
      const config = await outputConfig('slow-chase');
      const status = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
      state.outputRunning = true;
      state.outputOwner = 'mapping';
      state.streamId = status.streamId || '';
      outputMessage(`Slow chase started: ${config.stepSeconds}s ON, ${config.gapSeconds}s dark gap, ${state.map.controllerPixels} controller pixels (${state.map.activePhysicalPixels} active mapped pixels).`);
      renderOutputStatus(status);
    } catch (error) {
      outputMessage(error.message, true);
    }
  }

  async function blackout() {
    try {
      const config = await outputConfig('blackout');
      const current = await api('/api/output/status');
      if (current.running && current.owner === 'mapping') {
        await api('/api/output/stop', { method: 'POST', body: JSON.stringify({ outputOwner: 'mapping', streamId: current.streamId || state.streamId }) });
      } else if (current.running) {
        const claimed = await api('/api/output/start', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
        await api('/api/output/stop', { method: 'POST', body: JSON.stringify({ outputOwner: 'mapping', streamId: claimed.streamId }) });
      }
      const result = await api('/api/output/once', { method: 'POST', body: JSON.stringify({ ...config, outputOwner: 'mapping' }) });
      state.outputRunning = false;
      state.outputOwner = '';
      state.streamId = '';
      state.activePhysical = null;
      state.activePixelOn = false;
      outputMessage('All physical pixels are OFF and Mapping released the transmitter.');
      renderOutputStatus(result.status);
      render();
    } catch (error) {
      outputMessage(error.message, true);
    }
  }

  async function stepPixel(delta) {
    const total = Math.max(1, state.map?.total || 1);
    const current = clampPixelInput() - 1;
    const next = (current + delta + total) % total;
    selectPhysical(next);
    await holdPixel();
  }

  function renderOutputStatus(status) {
    const owner = String(status.owner || '');
    state.outputOwner = owner;
    state.outputRunning = Boolean(status.running && owner === 'mapping');
    state.streamId = state.outputRunning ? String(status.streamId || state.streamId || '') : '';
    state.activePhysical = Number.isInteger(status.activePhysicalPixel) ? status.activePhysicalPixel : (Number.isInteger(status.activePixel) ? status.activePixel : null);
    state.activePixelOn = Boolean(status.pixelOn);
    const mapped = Boolean(status.mapped || status.config?.pixelMap);
    $('mappingOutputBadge').textContent = status.running && owner === 'mapping' && !mapped ? 'Mapping owns output' : status.running && owner === 'visual' ? 'Visual active' : 'Idle';
    $('mappingOutputBadge').className = `badge ${status.running ? (owner === 'mapping' ? 'live' : 'invalid') : 'idle'}`;
    $('mappedOutputBadge').textContent = status.running && owner === 'mapping' && mapped ? 'Mapped matrix output' : status.running && owner === 'visual' ? 'Visual active' : 'Idle';
    $('mappedOutputBadge').className = `badge ${status.running ? (owner === 'mapping' ? 'live' : 'invalid') : 'idle'}`;

    if (status.running && Number.isInteger(state.activePhysical)) {
      const currentPhysical = state.activePhysical + 1;
      if (!mapped) $('mapPixelDisplay').textContent = String(currentPhysical);
      if (!mapped && status.config?.pattern === 'slow-chase') {
        const phase = status.pixelOn ? 'ON' : 'dark gap';
        const signature = `${currentPhysical}:${phase}`;
        if (signature !== state.lastOutputSignature) {
          state.lastOutputSignature = signature;
          outputMessage(`Slow chase · physical pixel ${currentPhysical} of ${state.map?.total || status.config.width} · ${phase}.`);
        }
      }
      if (mapped && Number.isInteger(status.activeLogicalPixel)) {
        const logical = status.activeLogicalPixel + 1;
        const signature = `mapped:${logical}:${currentPhysical}:${status.pixelOn}`;
        if (signature !== state.lastOutputSignature && ['manual-pixel','chase','slow-chase'].includes(status.config?.pattern)) {
          state.lastOutputSignature = signature;
          mappedMessage(`Logical pixel ${logical} is being sent to physical address ${currentPhysical}${status.pixelOn ? '' : ' · dark gap'}.`);
        }
      }
    }
  }

  async function pollOutput() {
    try {
      const status = await api('/api/output/status');
      const previousActive = state.activePhysical;
      const previousOn = state.activePixelOn;
      renderOutputStatus(status);
      if (previousActive !== state.activePhysical || previousOn !== state.activePixelOn) render();
    } catch {
      $('mappingOutputBadge').textContent = 'Disconnected';
      $('mappingOutputBadge').className = 'badge invalid';
    }
  }

  controls.forEach((id) => $(id).addEventListener('input', () => {
    if (id === 'wiringMode' && !isCustomMode()) state.customEditing = false;
    if (id === 'panelOrderMode' && $('panelOrderMode').value === 'custom') {
      const preset = presetDynamicPanelOrder(readConfig());
      preset.forEach((slot, position) => { state.panels[slot].cablePosition = position; });
    }
    $('mappingSaveMessage').classList.remove('saved');
    render();
  }));
  ['rotation','flipX','flipY'].forEach((id) => $(id).addEventListener('input', () => {
    $('mappingSaveMessage').textContent = 'Default orientation changed. Use Apply default to all panels, or adjust each panel independently below.';
    $('mappingSaveMessage').classList.remove('saved');
  }));
  targetFields.forEach((id) => {
    $(id).addEventListener('input', () => {
      saveTargetSettings();
      if (id === 'mapProtocol') updateProtocolFields();
    });
    $(id).addEventListener('change', () => saveTargetSettings({ syncServer: true, quiet: true }));
  });
  testFields.forEach((id) => $(id).addEventListener('input', () => {
    saveTargetSettings();
    if (id === 'mapBrightness') $('mapBrightnessValue').textContent = `${Math.round(Number($('mapBrightness').value) * 100)}%`;
  }));
  $('resetMapping').addEventListener('click', reset);
  $('addPanel').addEventListener('click', addPanel);
  $('autoArrangePanels').addEventListener('click', autoArrangePanelPositions);
  $('arrangePanelsHorizontal')?.addEventListener('click', () => arrangePanelsInLine('horizontal'));
  $('arrangePanelsVertical')?.addEventListener('click', () => arrangePanelsInLine('vertical'));
  $('arrangePanelsGrid')?.addEventListener('click', () => arrangePanelsGrid(2));
  $('matchControllerPixels').addEventListener('click', matchControllerPixels);
  $('repackPhysicalStarts').addEventListener('click', repackPhysicalStarts);
  $('panelResolutionPreset').addEventListener('change', () => {
    const value = $('panelResolutionPreset').value;
    if (value === 'custom') return;
    const [width, height] = value.split('x').map(Number);
    $('panelWidth').value = String(width);
    $('panelHeight').value = String(height);
  });
  $('applyPanelDefaults').addEventListener('click', applyDefaultTransformToAllPanels);
  $('usePresetPanelOrder').addEventListener('click', usePresetAsCustomPanelOrder);
  $('customStart').addEventListener('click', toggleCustomEditing);
  $('customUndo').addEventListener('click', undoCustomWiring);
  $('customPreset').addEventListener('click', usePresetAsCustomMap);
  $('customClear').addEventListener('click', clearCustomWiring);
  $('customSaveMapping')?.addEventListener('click', saveMapping);
  $('saveMapping').addEventListener('click', saveMapping);
  $('exportMapping').addEventListener('click', exportJson);
  $('mappedLogicalNumber').addEventListener('input', () => selectMappedLogical(Number($('mappedLogicalNumber').value) - 1));
  $('mappedPreviousLogical').addEventListener('click', () => stepMappedLogical(-1));
  $('mappedNextLogical').addEventListener('click', () => stepMappedLogical(1));
  $('mappedHoldSelected').addEventListener('click', () => startMappedPattern('manual-pixel', 'Mapped selected-pixel test'));
  $('mappedSlowChase').addEventListener('click', () => startMappedPattern('slow-chase', 'Slow logical mapping proof'));
  $('mappedChase').addEventListener('click', () => startMappedPattern('chase', 'Mapped XY chase'));
  $('mappedRows').addEventListener('click', () => startMappedPattern('rows', 'Mapped row scan'));
  $('mappedColumns').addEventListener('click', () => startMappedPattern('columns', 'Mapped column scan'));
  $('mappedChecker').addEventListener('click', () => startMappedPattern('checker', 'Mapped checker'));
  $('mappedRainbow').addEventListener('click', () => startMappedPattern('rainbow', 'Mapped rainbow'));
  $('mappedFlowX').addEventListener('click', () => startMappedPattern('matrix-flow-x', 'Global horizontal matrix flow'));
  $('mappedFlowY').addEventListener('click', () => startMappedPattern('matrix-flow-y', 'Global vertical matrix flow'));
  $('mappedFlowDiagonal').addEventListener('click', () => startMappedPattern('matrix-flow-diagonal', 'Global diagonal matrix flow'));
  $('mappedSeams').addEventListener('click', () => startMappedPattern('matrix-seams', 'Panel seam grid proof'));
  $('mappedBlackout').addEventListener('click', mappedBlackout);
  $('mapPixelNumber').addEventListener('input', () => {
    const physical = clampPixelInput() - 1;
    selectPhysical(physical);
  });
  $('mapPreviousPixel').addEventListener('click', () => stepPixel(-1));
  $('mapHoldPixel').addEventListener('click', holdPixel);
  $('mapNextPixel').addEventListener('click', () => stepPixel(1));
  $('mapSlowChase').addEventListener('click', startSlowChase);
  $('mapBlackout').addEventListener('click', blackout);
  $('mappingCanvas').addEventListener('click', (event) => {
    const canvas = $('mappingCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const map = buildMap(readConfig());
    const cellWidth = (canvas.width - 2) / map.width;
    const cellHeight = (canvas.height - 2) / map.height;
    const logicalX = Math.max(0, Math.min(map.width - 1, Math.floor(x / cellWidth)));
    const logicalY = Math.max(0, Math.min(map.height - 1, Math.floor(y / cellHeight)));
    const item = map.cells.find((cell) => cell.x === logicalX && cell.y === logicalY);
    if (!item) return;
    if (isCustomMode() && state.customEditing) {
      assignCustomLogical(item.logical);
      return;
    }
    state.selected = { x: logicalX, y: logicalY };
    if ($('mappedLogicalNumber')) $('mappedLogicalNumber').value = String(item.logical + 1);
    $('selectedPixel').textContent = item.physical >= 0 ? `P${item.physical + 1}` : 'Unassigned';
    if (item.physical >= 0) {
      $('mapPixelNumber').value = String(item.physical + 1);
      $('mapPixelDisplay').textContent = String(item.physical + 1);
    }
    render();
  });

  window.addEventListener('ledcontroller:target-changed', (event) => {
    if (event.detail?.targetIp) applyTargetSettings(event.detail);
  });

  $('fitMappingPreview')?.addEventListener('click', () => {
    render();
    const stage = $('mappingCanvas')?.closest('.mapping-stage-wrap');
    if (stage) { stage.scrollLeft = 0; stage.scrollTop = 0; }
  });
  $('togglePanelLabels')?.addEventListener('click', () => {
    state.showPanelLabels = !state.showPanelLabels;
    $('togglePanelLabels').textContent = state.showPanelLabels ? 'Hide panel labels' : 'Show panel labels';
    render();
  });
  let layoutResizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(layoutResizeTimer);
    layoutResizeTimer = setTimeout(() => render(), 120);
  });
  window.addEventListener('ledcontroller:workspace-changed', (event) => {
    if (event.detail?.tab === 'mapping') setTimeout(() => render(), 30);
  });

  const localMappingRestored = restore();
  updateProtocolFields();
  syncActiveTarget();
  window.addEventListener('pageshow', () => syncActiveTarget());
  window.addEventListener('online', () => syncActiveTarget());
  window.addEventListener('focus', () => syncActiveTarget());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncActiveTarget(); });
  $('mapBrightnessValue').textContent = `${Math.round(Number($('mapBrightness').value) * 100)}%`;
  render();
  restoreServerMappingIfNeeded(localMappingRestored);
  pollOutput();
  setInterval(pollOutput, 400);
})();
