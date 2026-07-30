import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function defaultMappingDirectory({ homeDir = os.homedir() } = {}) {
  return path.join(homeDir, 'Documents', 'LEDController.net', 'Mappings');
}

export function validateMappingPayload(mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw new TypeError('Mapping must be a JSON object.');
  }
  if (!Array.isArray(mapping.panels) || mapping.panels.length < 1) {
    throw new TypeError('Mapping must contain at least one panel.');
  }
  const controllerPixels = Number(mapping.controllerPixels || mapping.physicalPixels);
  if (!Number.isInteger(controllerPixels) || controllerPixels < 1 || controllerPixels > 262144) {
    throw new RangeError('Mapping controller pixel count is invalid.');
  }
  if (!Array.isArray(mapping.resolvedPixelMap)) {
    throw new TypeError('Mapping must contain a resolved pixel map.');
  }
  return mapping;
}

export class MappingStore {
  constructor({ directory = defaultMappingDirectory(), maxBackups = 20 } = {}) {
    this.directory = directory;
    this.backupDirectory = path.join(directory, 'Backups');
    this.activePath = path.join(directory, 'active-mapping.json');
    this.maxBackups = Math.max(1, Number(maxBackups) || 20);
  }

  async load() {
    try {
      const [raw, stat] = await Promise.all([
        fs.readFile(this.activePath, 'utf8'),
        fs.stat(this.activePath)
      ]);
      const mapping = validateMappingPayload(JSON.parse(raw));
      return {
        mapping,
        storagePath: this.activePath,
        savedAt: stat.mtime.toISOString()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { mapping: null, storagePath: this.activePath, savedAt: null };
      }
      throw error;
    }
  }

  async save(mapping) {
    validateMappingPayload(mapping);
    await fs.mkdir(this.backupDirectory, { recursive: true });
    const savedAt = new Date();
    const payload = `${JSON.stringify(mapping, null, 2)}\n`;
    const tempPath = `${this.activePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = path.join(this.backupDirectory, `mapping-${timestampForFilename(savedAt)}.json`);

    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.activePath);
    await fs.writeFile(backupPath, payload, 'utf8');
    await this.pruneBackups();

    return {
      ok: true,
      storagePath: this.activePath,
      backupPath,
      savedAt: savedAt.toISOString()
    };
  }

  async pruneBackups() {
    let entries;
    try {
      entries = await fs.readdir(this.backupDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    const files = entries
      .filter((entry) => entry.isFile() && /^mapping-.*\.json$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    await Promise.all(files.slice(this.maxBackups).map((name) => fs.rm(path.join(this.backupDirectory, name), { force: true })));
  }
}
