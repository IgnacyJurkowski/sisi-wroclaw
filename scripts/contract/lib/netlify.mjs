// netlify.toml [[redirects]] parsing and a small simulator for the rule shapes
// this site uses (exact paths, trailing /* splats, host-qualified sources).

/** @returns {{ from: string, to: string, status: number, force: boolean, extra?: object }[]} */
export function parseRedirects(source) {
  const blocks = String(source).split(/(?=^\[\[redirects\]\]\s*$)/m).filter((b) => /^\[\[redirects\]\]\s*$/m.test(b));
  return blocks.map((block) => {
    const rule = {};
    for (const line of block.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('[') ) break; // next table (headers, build...) ends this block
      const m = trimmed.match(/^([A-Za-z_]+)\s*=\s*(?:"([^"]*)"|(true|false)|(\d+))\s*(?:#.*)?$/);
      if (!m) {
        (rule.unparsed ??= []).push(trimmed);
        continue;
      }
      rule[m[1]] = m[2] ?? (m[3] ? m[3] === 'true' : Number(m[4]));
    }
    const { from, to, status = 301, force = false, unparsed, ...rest } = rule;
    const out = { from, to, status, force };
    const extra = { ...rest, ...(unparsed ? { unparsed } : {}) };
    if (Object.keys(extra).length) out.extra = extra;
    return out;
  });
}

function splitSource(from) {
  const m = from.match(/^(https?):\/\/([^/]+)(\/.*)?$/i);
  return m ? { scheme: m[1].toLowerCase(), host: m[2].toLowerCase(), path: m[3] ?? '/' } : { path: from };
}

function matchPath(pattern, path) {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1); // keeps the trailing slash
    return path.startsWith(prefix) ? { splat: path.slice(prefix.length) } : null;
  }
  return pattern === path ? { splat: '' } : null;
}

/**
 * First matching rule for a request, Netlify style (top-down, first match).
 * @param {{from:string,to:string,status:number,force:boolean}[]} rules
 * @param {{ scheme?: string, host?: string, path: string }} request
 * @param {(path:string)=>boolean} [fileExists] non-forced rules yield to real files
 */
export function matchRedirect(rules, request, fileExists = () => false) {
  for (const rule of rules) {
    const src = splitSource(rule.from);
    if (src.host) {
      if (src.host !== request.host || (src.scheme && src.scheme !== (request.scheme ?? 'https'))) continue;
    }
    const m = matchPath(src.path, request.path);
    if (!m) continue;
    if (!rule.force && fileExists(request.path)) continue;
    return { rule, target: rule.to.replace(':splat', m.splat) };
  }
  return null;
}

/** Destination classification used by the redirect contract. */
export function classifyTarget(target, canonicalOrigin) {
  if (target.startsWith('/')) return { kind: 'internal', path: target };
  const url = new URL(target);
  if (url.origin === canonicalOrigin) return { kind: 'internal', path: url.pathname + url.search };
  return { kind: 'external', origin: url.origin, url };
}

/** Compare a stored rule list with the current one. */
export function diffRedirects(snapshot, current, moves = []) {
  const key = (r) => `${r.from}`;
  const now = new Map(current.map((r) => [key(r), r]));
  const failures = [];
  const added = [];
  for (const old of snapshot) {
    const cur = now.get(key(old));
    if (!cur) {
      failures.push({ from: old.from, message: `redirect removed (was -> ${old.to} ${old.status})` });
      continue;
    }
    const sameStatus = cur.status === old.status && cur.force === old.force;
    if (cur.to !== old.to) {
      const declared = moves.some((m) => sameTarget(m.from, old.to) && sameTarget(m.to, cur.to));
      if (!declared) failures.push({ from: old.from, message: `redirect retargeted ${old.to} -> ${cur.to} (no matching entry in contract/moves.json)` });
    }
    if (!sameStatus) failures.push({ from: old.from, message: `redirect status/force changed ${old.status}${old.force ? ' force' : ''} -> ${cur.status}${cur.force ? ' force' : ''}` });
  }
  const before = new Set(snapshot.map(key));
  for (const cur of current) if (!before.has(key(cur))) added.push(cur);
  return { failures, added };
}

const sameTarget = (a, b) => normalizeTarget(a) === normalizeTarget(b);
function normalizeTarget(value) {
  try {
    const u = new URL(value, 'https://www.sisiwroclaw.pl');
    return u.pathname + u.search;
  } catch {
    return value;
  }
}
