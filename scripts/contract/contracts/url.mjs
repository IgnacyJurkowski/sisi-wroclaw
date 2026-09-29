// Contract 1: URLs and redirects.
//   - every sitemap URL of the snapshot still answers with the same status, or
//     301s to its new home declared in contract/moves.json;
//   - the sitemap and dist agree (no sitemap URL missing from dist, no
//     indexable page missing from the sitemap);
//   - netlify.toml redirects are pinned: removing or retargeting one fails.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANONICAL_ORIGIN, DOCUMENTED_EXTERNAL_TARGETS, UTILITY_PAGES,
} from '../lib/constants.mjs';
import { classifyTarget, diffRedirects, matchRedirect, parseRedirects } from '../lib/netlify.mjs';
import { readSnapshot, writeSnapshot } from '../lib/snapshot.mjs';
import { productionRefreshHint } from '../lib/production.mjs';

const FILES = ['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml'];
const PROBE_404 = '/__contract-probe-404__/';

export function loadRedirects(repoRoot) {
  return parseRedirects(readFileSync(join(repoRoot, 'netlify.toml'), 'utf8'));
}

export function loadMoves(contractDir) {
  const data = readSnapshot(contractDir, 'moves.json');
  return Array.isArray(data?.moves) ? data.moves : [];
}

/** Path-only, exact-match 301 rules: the "legacy" URLs the site promises. */
export function legacyRules(rules) {
  return rules.filter((r) => r.status === 301 && r.from.startsWith('/') && !r.from.includes('*'));
}

export async function buildUrlSnapshot(ctx) {
  const { model, server, rules, source } = ctx;
  const urls = {};
  for (const entry of [...model.sitemap].sort((a, b) => a.path.localeCompare(b.path))) urls[entry.path] = (await server.head(entry.path)).status;
  const files = {};
  for (const file of FILES) files[file] = (await server.head(file)).status;
  const legacy = {};
  for (const rule of legacyRules(rules)) {
    const hit = matchRedirect(rules, { path: rule.from }, model.exists);
    legacy[rule.from] = { status: hit?.rule.status ?? 0, location: hit?.target ?? null };
  }
  const sitemapPaths = new Set(model.sitemap.map((e) => [e.path]).flat());
  // Production-context dist: the robots meta is the truth. Otherwise every page
  // says noindex, so "not in the sitemap" is the best available stand-in.
  const nonIndexable = [...model.pages.entries()]
    .filter(([path, page]) => (model.buildContext === 'production' ? /noindex/i.test(page.robots ?? '') : !sitemapPaths.has(path)))
    .map(([path]) => path)
    .sort();
  return {
    source,
    buildContext: model.buildContext,
    origin: CANONICAL_ORIGIN,
    note: 'Sitemap URLs with their expected status; legacy redirect sources with their expected 301 target; nonIndexable = pages that carry noindex (production-context build) or, for a non-production build, are absent from the sitemap. lastmod is not tracked.',
    urls,
    files,
    probes: { [PROBE_404]: (await server.head(PROBE_404)).status },
    legacy,
    nonIndexable,
  };
}

export function buildRedirectSnapshot(ctx) {
  return {
    source: ctx.source,
    note: 'netlify.toml [[redirects]] in file order. Removing or retargeting a rule fails the contract; adding one does not.',
    rules: ctx.rules.map((r) => ({ from: r.from, to: r.to, status: r.status, force: r.force })),
  };
}

export async function runUrlContract(ctx) {
  const { model, server, report, contractDir, repoRoot, opts } = ctx;
  const C = 'url';
  const rules = ctx.rules ?? loadRedirects(repoRoot);
  const moves = loadMoves(contractDir);
  const c = { ...ctx, rules };

  if (opts.updateSnapshot) {
    writeSnapshot(contractDir, 'urls.json', await buildUrlSnapshot(c));
    writeSnapshot(contractDir, 'redirects.json', buildRedirectSnapshot(c));
    report.note(C, { message: 'wrote contract/urls.json and contract/redirects.json' });
  }
  const snap = readSnapshot(contractDir, 'urls.json');
  const redirectSnap = readSnapshot(contractDir, 'redirects.json');
  if (!snap || !redirectSnap) {
    report.fail(C, { message: 'contract/urls.json or contract/redirects.json is missing; run with --update-snapshot' });
    return;
  }

  // --- sitemap <-> dist consistency (absolute rules) ---------------------
  const sitemapPaths = new Map(model.sitemap.map((e) => [e.path, e]));
  for (const entry of model.sitemap) {
    report.check(C, entry.origin === CANONICAL_ORIGIN, {
      url: entry.path, field: 'sitemap.origin', message: `sitemap loc uses ${entry.origin}, expected ${CANONICAL_ORIGIN}`,
    });
    const res = await server.head(entry.path);
    report.check(C, model.exists(entry.path) && res.status === 200, {
      url: entry.path, field: 'sitemap->dist', message: `sitemap URL does not resolve in dist (HTTP ${res.status})`,
    });
  }
  const knownNonIndexable = new Set(snap.nonIndexable ?? []);
  for (const [path, page] of model.pages) {
    if (sitemapPaths.has(path) || UTILITY_PAGES.has(path)) continue;
    const noindex = /noindex/i.test(page.robots ?? '');
    const declaredElsewhere = model.buildContext === 'production' ? noindex : knownNonIndexable.has(path);
    report.check(C, declaredElsewhere, {
      url: path, field: 'dist->sitemap',
      message: model.buildContext === 'production'
        ? 'indexable page (no noindex) is missing from sitemap.xml'
        : 'page is in dist but not in sitemap.xml and not in the snapshot nonIndexable list (build is non-production, so its robots meta cannot say)',
    });
  }
  if (model.buildContext === 'production') {
    for (const entry of model.sitemap) {
      const page = model.pages.get(entry.path);
      report.check(C, !/noindex/i.test(page?.robots ?? ''), {
        url: entry.path, field: 'sitemap->robots', message: 'sitemap lists a URL whose robots meta says noindex',
      });
    }
  } else {
    report.unverified(C, { message: 'dist was built without CONTEXT=production, so every page says "noindex, nofollow"; sitemap/robots agreement is checked against the snapshot nonIndexable list instead (use --build for the production-shaped check)' });
  }

  // --- snapshot URLs still resolve, or move via a declared 301 -------------
  const moveFor = new Map(moves.map((m) => [m.from, m]));
  for (const [path, expected] of Object.entries(snap.urls)) {
    const res = await server.head(path);
    if (res.status === expected && model.exists(path)) {
      report.pass(C);
      if (moveFor.has(path)) report.note(C, { url: path, message: 'moves.json declares a move for a URL that still resolves 200; remove the entry once the redirect is unnecessary' });
      continue;
    }
    const move = moveFor.get(path);
    if (!move) {
      report.fail(C, { url: path, field: 'status', message: `expected ${expected}, got ${res.status}; not in contract/moves.json` });
      continue;
    }
    const hit = matchRedirect(rules, { path }, model.exists);
    const targetOk = hit && hit.rule.status === 301 && sameTarget(hit.target, move.to);
    const destination = await server.head(pathOnly(move.to));
    report.check(C, targetOk && destination.status === 200 && sitemapPaths.has(pathOnly(move.to)), {
      url: path, field: 'move',
      message: `declared move to ${move.to} is not honoured: rule ${hit ? `${hit.rule.status} -> ${hit.target}` : 'missing in netlify.toml'}, destination HTTP ${destination.status}, ${sitemapPaths.has(pathOnly(move.to)) ? 'in' : 'NOT in'} sitemap`,
    });
  }
  for (const [file, expected] of Object.entries(snap.files)) {
    const res = await server.head(file);
    report.check(C, res.status === expected, { url: file, field: 'status', message: `expected ${expected}, got ${res.status}` });
  }
  for (const [probe, expected] of Object.entries(snap.probes ?? {})) {
    const res = await server.head(probe);
    report.check(C, res.status === expected, { url: probe, field: 'status', message: `unknown URLs must answer ${expected} (the 404 page), got ${res.status}` });
  }
  const added = model.sitemap.filter((e) => !(e.path in snap.urls));
  if (added.length) {
    report.note(C, { message: `${added.length} sitemap URL(s) not in the snapshot (new content is fine; --update-snapshot records it): ${added.slice(0, 5).map((e) => e.path).join(', ')}${added.length > 5 ? ', ...' : ''}` });
  }

  // --- legacy redirects: same 301 target, or the declared new home -----------
  for (const [from, expected] of Object.entries(snap.legacy)) {
    const hit = matchRedirect(rules, { path: from }, model.exists);
    const moved = moves.find((m) => sameTarget(m.from, expected.location));
    const acceptable = [expected.location, moved?.to].filter(Boolean);
    const ok = hit && hit.rule.status === expected.status && acceptable.some((t) => sameTarget(hit.target, t));
    report.check(C, ok, {
      url: from, field: 'legacy 301',
      message: hit ? `expected ${expected.status} -> ${expected.location}, got ${hit.rule.status} -> ${hit.target}` : `expected ${expected.status} -> ${expected.location}, no redirect rule matches`,
    });
    if (hit) {
      const res = await server.head(pathOnly(hit.target));
      report.check(C, res.status === 200, { url: from, field: 'legacy target', message: `${hit.target} answers HTTP ${res.status}, not 200` });
    }
  }

  // --- redirect rules pinned ----------------------------------------------
  const diff = diffRedirects(redirectSnap.rules, rules, moves);
  for (const f of diff.failures) report.fail(C, { url: f.from, field: 'netlify.toml', message: f.message });
  report.pass(C, redirectSnap.rules.length - diff.failures.length);
  for (const r of diff.added) report.note(C, { url: r.from, field: 'netlify.toml', message: `new redirect ${r.status} -> ${r.to} (not in snapshot)` });

  // --- every rule resolves to something real -----------------------------------
  const sources = new Set(rules.map((r) => r.from));
  for (const rule of rules) {
    await checkRuleTarget({ rule, rules, model, server, report, sources });
  }
  for (const rule of legacyRules(rules)) {
    // A non-forced rule yields to a real file: the legacy path must not exist in dist.
    if (!rule.force) {
      report.check(C, !model.exists(rule.from) && !model.exists(`${rule.from}/`), {
        url: rule.from, field: 'shadowed', message: 'non-forced redirect source exists as a file/dir in dist, so Netlify would serve it instead of redirecting',
      });
    }
  }
  const hint = productionRefreshHint(snap);
  if (hint) report.unverified(C, { message: hint });
}

async function checkRuleTarget({ rule, rules, model, server, report, sources }) {
  const C = 'url';
  const dest = classifyTarget(rule.to, CANONICAL_ORIGIN);
  if (dest.kind === 'external') {
    const documented = DOCUMENTED_EXTERNAL_TARGETS[dest.origin];
    if (documented) {
      report.note(C, { url: rule.from, field: 'netlify.toml', message: `external/proxy target ${dest.origin} (documented: ${documented})` });
      report.pass(C);
    } else {
      report.fail(C, { url: rule.from, field: 'netlify.toml', message: `redirect target ${rule.to} is external and not a documented rule (add it to DOCUMENTED_EXTERNAL_TARGETS with a reason)` });
    }
    return;
  }
  // Wildcard rules are exercised with a real page path.
  const target = dest.path.replace(':splat', rule.from.includes('*') ? 'pl/menu/' : '');
  const path = pathOnly(target);
  const res = await server.head(path);
  report.check(C, res.status === 200 && model.exists(path), {
    url: rule.from, field: 'netlify.toml', message: `redirect target ${rule.to} (probed as ${path}) answers HTTP ${res.status}, not a page in dist`,
  });
  // One hop only: the destination must not itself be a redirect source.
  const chained = sources.has(path) || (path !== '/' && sources.has(path.replace(/\/$/, '')));
  report.check(C, !chained, { url: rule.from, field: 'netlify.toml', message: `redirect target ${path} is itself a redirect source (chain)` });
}

const pathOnly = (value) => {
  try {
    return new URL(value, CANONICAL_ORIGIN).pathname;
  } catch {
    return value;
  }
};
const sameTarget = (a, b) => pathOnly(a) === pathOnly(b);
