// Minimal read client for the BabyLoveGrowth integrations API. Plain REST over
// the global fetch, so the dependency surface stays tiny (same shape as the
// Drive client used by the events sync).
//
//   BABYLOVEGROWTH_API_KEY   the integration key, sent as X-API-Key (CI secret)
//   BABYLOVEGROWTH_API_BASE  optional base-URL override (tests / staging)
//
// The API is rate limited, so the sync pulls everything once per run into the
// repo and the site never calls it at request time. Requests are sequential,
// spaced, and retried with exponential backoff on 429/5xx.

const DEFAULT_BASE = 'https://api.babylovegrowth.ai/api/integrations';
const PAGE_SIZE = 50;
const MAX_PAGES = 20; // hard stop: 1000 articles is far past anything realistic
const REQUEST_TIMEOUT_MS = 20_000;
const RETRIES = 3;
const RETRY_BASE_MS = 2000;
const SPACING_MS = 250;

export function apiBase() {
  return (process.env.BABYLOVEGROWTH_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
}

export function apiKey() {
  return (process.env.BABYLOVEGROWTH_API_KEY || '').trim();
}

/** One page of article summaries. */
export async function listArticles({ limit = PAGE_SIZE, offset = 0 } = {}) {
  const payload = await get(`/v1/articles?limit=${limit}&offset=${offset}`);
  return asArticleList(payload);
}

/** One article with its full content_html / content_markdown. */
export async function getArticle(id) {
  return asArticle(await get(`/v1/articles/${encodeURIComponent(id)}`));
}

/** Every article summary. Pagination advances by what the server actually
    returned, not by what we asked for: a server that caps page size below
    PAGE_SIZE would otherwise look like the end of the feed on page one and
    silently drop every article past the cap. A page that adds nothing new
    (empty, or all-duplicate ids) ends the walk. */
export async function listAllArticles({ pageSize = PAGE_SIZE, sleep = delay } = {}) {
  const all = [];
  const seen = new Set();
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await listArticles({ limit: pageSize, offset });
    if (!batch.length) return all;

    const fresh = batch.filter((summary) => {
      const id = articleId(summary) ?? summary?.slug;
      if (id == null || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    all.push(...fresh);
    if (!fresh.length) return all;

    offset += batch.length;
    await sleep(SPACING_MS);
  }
  console.warn(`Articles sync: stopped paginating at ${MAX_PAGES} pages.`);
  return all;
}

/** The article id used by GET /v1/articles/{id}. */
export function articleId(summary) {
  for (const key of ['id', 'article_id', 'articleId', 'uuid', '_id']) {
    const value = summary?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

/** Fetch a hero image; returns a Buffer, or null when it is not a usable image. */
export async function downloadImage(url, { fetchImpl = fetch } = {}) {
  // No API key on this request, so following the CDN's redirects is safe.
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`hero image ${url} -> ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (type && !/^image\//i.test(type)) throw new Error(`hero image ${url} is ${type}`);
  return Buffer.from(await res.arrayBuffer());
}

async function get(path) {
  const key = apiKey();
  if (!key) throw new Error('BABYLOVEGROWTH_API_KEY is not set');

  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await delay(RETRY_BASE_MS * 2 ** (attempt - 1));
    let res;
    try {
      res = await fetch(`${apiBase()}${path}`, {
        headers: { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // fetch only strips Authorization/Cookie across origins, so a redirect
        // would forward the integration key verbatim to whatever host the
        // Location names. The endpoint is exact; refuse redirects instead.
        redirect: 'manual',
      });
    } catch (error) {
      lastError = new Error(`GET ${path} failed: ${error.message}`);
      continue;
    }

    if (res.status >= 300 && res.status < 400) {
      throw new Error(`GET ${path} -> ${res.status} redirect; refusing to forward the API key`);
    }
    if (res.ok) {
      try {
        return await res.json();
      } catch (error) {
        throw new Error(`GET ${path} returned invalid JSON: ${error.message}`);
      }
    }
    // 4xx other than rate limiting is a configuration problem, not a blip.
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`GET ${path} -> ${res.status} ${truncate(await res.text())}`);
    }
    lastError = new Error(`GET ${path} -> ${res.status}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) await delay(Math.min(retryAfter, 30) * 1000);
  }
  throw lastError;
}

/** The list endpoint may answer with a bare array or wrap it in a container. */
export function asArticleList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['articles', 'data', 'items', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

/** Likewise, a single article may be wrapped in { article } / { data }. */
export function asArticle(payload) {
  if (!payload || typeof payload !== 'object') return null;
  for (const key of ['article', 'data', 'result']) {
    const value = payload[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return payload;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(text, max = 200) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
}
