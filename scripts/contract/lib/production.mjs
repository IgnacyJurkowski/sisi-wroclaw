// --refresh-from-production: rebuild contract/urls.json from the live site.
// GET is used once (sitemap.xml); every other request is HEAD. Nothing is
// followed automatically, so a redirect is recorded as the 301 it is. Unused in
// the sandbox where production is unreachable; covered by unit tests with an
// injected fetch. Never POSTs, never touches a booking or form endpoint.

import { parseSitemap, pathOf } from './sitemap.mjs';
import { CANONICAL_ORIGIN } from './constants.mjs';

const FILES = ['/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap.xml'];

export function productionRefreshHint(snapshot) {
  if (/^production/i.test(snapshot?.source ?? '')) return null;
  return `urls.json source is "${snapshot?.source}", not production. Expected statuses come from a local build; production has not been compared (run with --refresh-from-production from a machine that can reach ${CANONICAL_ORIGIN}).`;
}

/**
 * @param {{ fetchImpl?: typeof fetch, origin?: string, legacyPaths?: string[], today?: string, delayMs?: number }} options
 */
export async function fetchProductionSnapshot({
  fetchImpl = fetch,
  origin = CANONICAL_ORIGIN,
  legacyPaths = [],
  today = new Date().toISOString().slice(0, 10),
  delayMs = 150,
} = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const head = async (path) => {
    const res = await fetchImpl(new URL(path, origin), { method: 'HEAD', redirect: 'manual' });
    await sleep(delayMs);
    return { status: res.status, location: res.headers.get('location') };
  };
  const sitemapRes = await fetchImpl(new URL('/sitemap.xml', origin), { method: 'GET', redirect: 'manual' });
  if (sitemapRes.status !== 200) throw new Error(`GET ${origin}/sitemap.xml answered ${sitemapRes.status}`);
  const entries = parseSitemap(await sitemapRes.text());
  const urls = {};
  for (const entry of entries) urls[pathOf(entry.loc, origin)] = (await head(pathOf(entry.loc, origin))).status;
  const files = {};
  for (const file of FILES) files[file] = (await head(file)).status;
  const legacy = {};
  for (const path of legacyPaths) {
    const res = await head(path);
    legacy[path] = { status: res.status, location: res.location ? pathOf(res.location, origin) : null };
  }
  return {
    source: `production ${today}`,
    origin,
    note: 'Fetched with GET (sitemap.xml only) and HEAD. nonIndexable is carried over from the previous snapshot by the caller.',
    urls,
    files,
    legacy,
  };
}
