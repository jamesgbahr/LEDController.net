function encodeName(name) {
  const labels = name.replace(/\.$/, '').split('.');
  const parts = [];
  for (const label of labels) {
    const bytes = Buffer.from(label, 'utf8');
    if (bytes.length > 63) throw new Error('DNS label too long');
    parts.push(Buffer.from([bytes.length]), bytes);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

export function buildPtrQuery(name, { unicastResponse = false } = {}) {
  const qname = encodeName(name);
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0, 0); // transaction id
  header.writeUInt16BE(0, 2); // flags
  header.writeUInt16BE(1, 4); // questions
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(12, 0); // PTR
  tail.writeUInt16BE(unicastResponse ? 0x8001 : 1, 2); // IN, optionally request unicast response
  return Buffer.concat([header, qname, tail]);
}

export function readName(buffer, offset, depth = 0) {
  if (depth > 20) throw new Error('DNS compression pointer loop');
  const labels = [];
  let cursor = offset;
  let consumed = 0;
  let jumped = false;

  while (cursor < buffer.length) {
    const len = buffer[cursor];
    if ((len & 0xc0) === 0xc0) {
      if (cursor + 1 >= buffer.length) throw new Error('Truncated DNS pointer');
      const pointer = ((len & 0x3f) << 8) | buffer[cursor + 1];
      const nested = readName(buffer, pointer, depth + 1);
      labels.push(nested.name);
      if (!jumped) consumed += 2;
      jumped = true;
      break;
    }
    if (len === 0) {
      if (!jumped) consumed += 1;
      break;
    }
    cursor += 1;
    if (cursor + len > buffer.length) throw new Error('Truncated DNS label');
    labels.push(buffer.subarray(cursor, cursor + len).toString('utf8'));
    if (!jumped) consumed += 1 + len;
    cursor += len;
  }

  return { name: labels.filter(Boolean).join('.'), bytes: consumed };
}

export function parseDnsMessage(buffer) {
  if (buffer.length < 12) return [];
  const qd = buffer.readUInt16BE(4);
  const an = buffer.readUInt16BE(6);
  const ns = buffer.readUInt16BE(8);
  const ar = buffer.readUInt16BE(10);
  let offset = 12;

  for (let i = 0; i < qd; i += 1) {
    const qname = readName(buffer, offset);
    offset += qname.bytes + 4;
    if (offset > buffer.length) return [];
  }

  const records = [];
  const count = an + ns + ar;
  for (let i = 0; i < count; i += 1) {
    if (offset >= buffer.length) break;
    const name = readName(buffer, offset);
    offset += name.bytes;
    if (offset + 10 > buffer.length) break;
    const type = buffer.readUInt16BE(offset);
    const klass = buffer.readUInt16BE(offset + 2);
    const ttl = buffer.readUInt32BE(offset + 4);
    const rdlength = buffer.readUInt16BE(offset + 8);
    offset += 10;
    if (offset + rdlength > buffer.length) break;
    const dataOffset = offset;
    const data = buffer.subarray(offset, offset + rdlength);
    offset += rdlength;

    const record = { name: name.name, type, klass, ttl, data };
    try {
      if (type === 1 && rdlength === 4) {
        record.address = [...data].join('.');
      } else if (type === 12) {
        record.ptr = readName(buffer, dataOffset).name;
      } else if (type === 33 && rdlength >= 6) {
        record.priority = buffer.readUInt16BE(dataOffset);
        record.weight = buffer.readUInt16BE(dataOffset + 2);
        record.port = buffer.readUInt16BE(dataOffset + 4);
        record.target = readName(buffer, dataOffset + 6).name;
      } else if (type === 16) {
        const txt = {};
        let p = 0;
        while (p < data.length) {
          const len = data[p];
          p += 1;
          const entry = data.subarray(p, p + len).toString('utf8');
          p += len;
          const eq = entry.indexOf('=');
          if (eq >= 0) txt[entry.slice(0, eq)] = entry.slice(eq + 1);
          else if (entry) txt[entry] = true;
        }
        record.txt = txt;
      }
    } catch {
      // Keep the raw record if one field is malformed.
    }
    records.push(record);
  }
  return records;
}
