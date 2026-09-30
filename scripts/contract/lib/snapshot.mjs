// Snapshot files under contract/: pretty JSON, one trailing newline.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Callers build objects in a deliberate order (header first, maps sorted), so keep it. */
export function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function readSnapshot(dir, name) {
  const file = join(dir, name);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeSnapshot(dir, name, value) {
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, stableStringify(value));
  return file;
}
