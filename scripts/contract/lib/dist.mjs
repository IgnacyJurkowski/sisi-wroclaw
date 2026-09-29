// Reads a built dist/ into a model the contracts share: parsed pages, the
// sitemap, robots.txt and the llms files. Parsing happens once per run.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { extractPage } from './html.mjs';
import { parseSitemap, pathOf } from './sitemap.mjs';
import { INDEXABLE_MARK } from './constants.mjs';

/** 'pl/menu/index.html' -> '/pl/menu/', '404.html' -> '/404.html', 'index.html' -> '/'. */
export function urlForFile(rel) {
  const posix = rel.split(sep).join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) return `/${posix.slice(0, -'index.html'.length)}`;
  return `/${posix}`;
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, base, out);
    else out.push(full.slice(base.length + 1));
  }
  return out;
}

/**
 * Build context of a dist, inferred from its robots meta tags. Netlify sets
 * CONTEXT=production for the production deploy; every other build (local, CI,
 * deploy preview) emits "noindex, nofollow" on every page.
 */
export function detectBuildContext(pages) {
  const indexable = [...pages.values()].some((p) => p.robots?.startsWith(INDEXABLE_MARK));
  return indexable ? 'production' : 'non-production';
}

export function loadDist(distDir, { origin = 'https://www.sisiwroclaw.pl' } = {}) {
  const dist = resolve(distDir);
  if (!existsSync(join(dist, 'sitemap.xml'))) {
    throw new Error(`${dist} has no sitemap.xml - run "npm run build" first or pass --dist <dir>.`);
  }
  const files = walk(dist);
  const pages = new Map();
  for (const rel of files.filter((f) => f.endsWith('.html'))) {
    pages.set(urlForFile(rel), { file: rel, ...extractPage(readFileSync(join(dist, rel), 'utf8')) });
  }
  const sitemap = parseSitemap(readFileSync(join(dist, 'sitemap.xml'), 'utf8')).map((entry) => ({
    ...entry,
    path: pathOf(entry.loc, origin),
    origin: new URL(entry.loc).origin,
  }));
  const read = (name) => (existsSync(join(dist, name)) ? readFileSync(join(dist, name), 'utf8') : null);
  return {
    dist,
    origin,
    files: new Set(files.map((f) => f.split(sep).join('/'))),
    pages,
    sitemap,
    robotsTxt: read('robots.txt'),
    llmsTxt: read('llms.txt'),
    llmsFull: read('llms-full.txt'),
    buildContext: detectBuildContext(pages),
    exists: (urlPath) => distHas(dist, files, urlPath),
  };
}

function distHas(dist, files, urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const rel = clean.replace(/^\/+/, '');
  if (!rel) return files.includes('index.html');
  if (clean.endsWith('/')) return files.includes(`${rel}index.html`);
  return files.includes(rel);
}
