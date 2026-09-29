/* Checks on the venue record that need no browser and no build:
 *
 *   walkVenue()   every Fact and Gap in the record, with its path
 *   bareLeaves()  primitive values that sit outside a Fact (there should be none)
 *   checkSources() does each cited file:line really contain the value?
 *
 * Used by scripts/venue.test.mjs and scripts/venue-inventory.mjs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const isObject = (node) => node !== null && typeof node === 'object';
export const isFact = (node) => isObject(node) && 'status' in node && 'source' in node && 'value' in node;
export const isGap = (node) => isObject(node) && 'status' in node && 'gap' in node && node.value === null;

/** Yield `{ path, kind: 'fact' | 'gap', node }` for every leaf record. */
export function* walkVenue(node, path = 'VENUE') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) yield* walkVenue(node[i], `${path}[${i}]`);
    return;
  }
  if (!isObject(node)) return;
  if (isFact(node)) return void (yield { path, kind: 'fact', node });
  if (isGap(node)) return void (yield { path, kind: 'gap', node });
  for (const [key, value] of Object.entries(node)) yield* walkVenue(value, `${path}.${key}`);
}

// Keys that hold structure (an id, a weekday, a display unit), not a claim.
const STRUCTURAL_KEYS = new Set(['id', 'day', 'days', 'category', 'group', 'state', 'volumeUnit']);
const UNSOURCED_PATHS = ['VENUE.snapshot'];

/** Primitive values outside any Fact or Gap, other than structural keys. */
export function bareLeaves(node, path = 'VENUE', key = '') {
  if (UNSOURCED_PATHS.includes(path)) return [];
  if (Array.isArray(node)) return node.flatMap((item, i) => bareLeaves(item, `${path}[${i}]`, key));
  if (isObject(node)) {
    if (isFact(node) || isGap(node)) return [];
    return Object.entries(node).flatMap(([k, v]) => bareLeaves(v, `${path}.${k}`, k));
  }
  return STRUCTURAL_KEYS.has(key) ? [] : [{ path, value: node }];
}

// ---------------------------------------------------------------------------
// Source references
// ---------------------------------------------------------------------------

export const toRefs = (source) => (typeof source === 'string' ? [source] : [...source]);

/** `path:12`, `path:12-15` or `https://...` -> parts, or null when malformed. */
export function parseRef(ref) {
  if (typeof ref !== 'string') return null;
  if (/^https:\/\/\S+$/.test(ref)) return { kind: 'url', url: ref };
  const match = ref.match(/^([^\s:]+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const from = Number(match[2]);
  const to = match[3] ? Number(match[3]) : from;
  return { kind: 'file', file: match[1], from, to };
}

const normalize = (text) =>
  String(text)
    .replace(/\\(['"`\\])/g, '$1')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();

/** Strings to look for on the cited lines: the quote if there is one, else the value itself. */
export function needlesFor(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return value.split('\n').map((part) => part.trim()).filter(Boolean);
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'boolean') return [];
  if (Array.isArray(value)) return value.flatMap(needlesFor);
  return Object.values(value).flatMap(needlesFor);
}

export function factNeedles(fact) {
  return fact.quote === undefined ? needlesFor(fact.value) : [].concat(fact.quote);
}

export function makeReader(root) {
  const cache = new Map();
  return (file) => {
    if (!cache.has(file)) {
      const path = join(root, file);
      cache.set(file, existsSync(path) ? readFileSync(path, 'utf8').split('\n') : null);
    }
    return cache.get(file);
  };
}

/**
 * Check every source of one fact.
 * Levels: `hard` = the citation is wrong (malformed, missing file, line out of
 * range, or the value is not in the cited file at all); `soft` = the value is in
 * the file but not on the cited lines (a line moved).
 */
export function checkSources(fact, read) {
  const problems = [];
  const needles = factNeedles(fact).map(normalize);
  const refs = toRefs(fact.source);
  const lineHits = new Set();
  const fileHits = new Set();

  for (const ref of refs) {
    const parsed = parseRef(ref);
    if (!parsed) {
      problems.push({ level: 'hard', ref, message: 'malformed source' });
      continue;
    }
    if (parsed.kind === 'url') continue;
    const lines = read(parsed.file);
    if (!lines) {
      problems.push({ level: 'hard', ref, message: 'cited file does not exist' });
      continue;
    }
    if (parsed.from < 1 || parsed.to < parsed.from || parsed.to > lines.length) {
      problems.push({ level: 'hard', ref, message: `line range outside the file (${lines.length} lines)` });
      continue;
    }
    if (needles.length === 0) continue;
    const range = normalize(lines.slice(parsed.from - 1, parsed.to).join(' '));
    const whole = normalize(lines.join(' '));
    const lineHit = needles.filter((needle) => range.includes(needle));
    const fileHit = needles.filter((needle) => whole.includes(needle));
    lineHit.forEach((needle) => lineHits.add(needle));
    fileHit.forEach((needle) => fileHits.add(needle));
    if (fileHit.length === 0) problems.push({ level: 'hard', ref, message: 'cited file does not contain the value' });
    else if (lineHit.length === 0) problems.push({ level: 'soft', ref, message: 'value is in the file but not on the cited lines' });
  }

  const citesFile = refs.some((ref) => parseRef(ref)?.kind === 'file');
  if (citesFile) {
    for (const needle of needles) {
      if (!fileHits.has(needle)) problems.push({ level: 'hard', ref: refs.join(', '), message: `"${needle}" is in none of the cited files` });
      else if (!lineHits.has(needle)) problems.push({ level: 'soft', ref: refs.join(', '), message: `"${needle}" is on none of the cited lines` });
    }
  }
  return problems;
}

/** The contradicting values that are numbers or times can be checked like any fact. */
export function checkContradictions(fact, read) {
  const problems = [];
  for (const other of fact.contradictedBy ?? []) {
    const checkable = typeof other.value === 'number' || /^\d/.test(String(other.value));
    problems.push(
      ...checkSources({ value: checkable ? other.value : null, source: other.source }, read).map((problem) => ({ ...problem, contradiction: true })),
    );
  }
  return problems;
}

/** A gap row's evidence entries start with a file:line reference. */
export function evidenceRef(entry) {
  const match = String(entry).match(/^([^\s:]+:\d+(?:-\d+)?)/);
  return match ? match[1] : null;
}
