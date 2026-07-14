import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const CANONICAL_ORIGIN = 'https://sisiwroclaw.pl';
const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_CONCURRENCY = 8;
const ASSET_CONCURRENCY = 12;
const SECURITY_HEADERS = [
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];
const ASSET_PATH = /(?:^\/(?:assets|fonts|framerusercontent\.com|video)\/|\.(?:avif|css|gif|ico|jpe?g|js|mjs|mp4|png|svg|webm|webp|woff2?|ttf|otf)(?:$|[?#]))/i;

function usage() {
  return 'Usage: node scripts/smoke-host.mjs <origin> <expected-robots>';
}

function parseArguments(argv) {
  const [originValue, expectedRobots] = argv;
  assert.ok(originValue && expectedRobots, usage());
  const origin = new URL(originValue);
  assert.ok(['http:', 'https:'].includes(origin.protocol), 'origin must use http or https');
  assert.equal(origin.username, '', 'origin must not contain credentials');
  assert.equal(origin.password, '', 'origin must not contain credentials');
  assert.equal(origin.pathname, '/', 'origin must not contain a path');
  assert.equal(origin.search, '', 'origin must not contain a query');
  assert.equal(origin.hash, '', 'origin must not contain a fragment');
  assert.equal(expectedRobots.trim(), expectedRobots, 'expected robots value must be trimmed');
  return { origin, expectedRobots };
}

async function request(url, options = {}) {
  return fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...options,
    headers: { 'user-agent': 'sisi-launch-smoke/1.0', ...options.headers },
  });
}

function assertNoWildcardCors(response, label) {
  assert.notEqual(
    response.headers.get('access-control-allow-origin'),
    '*',
    `${label} exposes wildcard CORS`,
  );
}

function assertSecurityHeaders(response, label) {
  for (const name of SECURITY_HEADERS) {
    assert.ok(response.headers.get(name), `${label} is missing ${name}`);
  }
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${label} must disable sniffing`);
  assertNoWildcardCors(response, label);
}

function decodeEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function attributes(tag) {
  const result = new Map();
  const body = tag.replace(/^<\/?[^\s>]+\s*/i, '').replace(/\/?\s*>$/, '');
  for (const match of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return result;
}

function activeHtml(html) {
  let output = html;
  let previous;
  do {
    previous = output;
    output = output
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  } while (output !== previous);
  return output;
}

function tags(html, name) {
  return [...activeHtml(html).matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function robotsValues(html) {
  const values = [];
  for (const tag of tags(html, 'meta')) {
    const attrs = attributes(tag);
    if (attrs.get('name')?.toLowerCase() === 'robots') values.push(attrs.get('content') ?? '');
  }
  return values;
}

export function assertRobots(html, expected, label) {
  const values = robotsValues(html);
  assert.equal(values.length, 1, `${label} must emit exactly one active robots directive`);
  assert.equal(values[0], expected, `${label} has the wrong robots directive`);
}

function linkMetadata(html) {
  const canonical = [];
  const alternates = [];
  for (const tag of tags(html, 'link')) {
    const attrs = attributes(tag);
    const rel = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
    const href = attrs.get('href');
    if (!href) continue;
    if (rel.includes('canonical')) canonical.push(href);
    if (rel.includes('alternate') && attrs.has('hreflang')) {
      alternates.push({ hreflang: attrs.get('hreflang'), href });
    }
  }
  return { canonical, alternates };
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1].trim()));
}

function mappedUrl(value, origin) {
  const source = new URL(value, origin);
  assert.ok(
    source.origin === origin.origin || source.origin === CANONICAL_ORIGIN,
    `URL escapes the audited origins: ${source.href}`,
  );
  return new URL(`${source.pathname}${source.search}`, origin);
}

function referencedAssets(html, documentUrl, origin) {
  const values = [];
  for (const match of html.matchAll(/\b(?:href|poster|src)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/gi)) {
    values.push(match[1] ?? match[2] ?? match[3]);
  }
  for (const match of html.matchAll(/\bsrcset\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    for (const candidate of (match[1] ?? match[2]).split(',')) values.push(candidate.trim().split(/\s+/, 1)[0]);
  }
  for (const match of html.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi)) {
    values.push(match[1] ?? match[2] ?? match[3]);
  }

  const assets = [];
  for (const rawValue of values) {
    const value = decodeEntities(rawValue ?? '');
    if (!value || /^(?:data:|mailto:|tel:|javascript:|#)/i.test(value)) continue;
    const source = new URL(value, documentUrl);
    if (source.origin !== origin.origin && source.origin !== CANONICAL_ORIGIN) continue;
    if (!ASSET_PATH.test(`${source.pathname}${source.search}`)) continue;
    source.hash = '';
    assets.push(mappedUrl(source, origin).href);
  }
  return assets;
}

function assertCanonicalMetadata(html, route, expectedRobots) {
  assertRobots(html, expectedRobots, route);
  const { canonical, alternates } = linkMetadata(html);
  assert.equal(canonical.length, 1, `${route} must emit exactly one canonical URL`);
  assert.equal(new URL(canonical[0]).origin, CANONICAL_ORIGIN, `${route} canonical uses the wrong origin`);
  assert.ok(alternates.length >= 6, `${route} is missing localized hreflang links`);
  for (const alternate of alternates) {
    assert.equal(
      new URL(alternate.href).origin,
      CANONICAL_ORIGIN,
      `${route} hreflang ${alternate.hreflang} uses the wrong origin`,
    );
  }
}

export function assertCorporateForm(html) {
  const forms = activeHtml(html).match(/<form\b[^>]*\bname="b2b-enquiry"[^>]*>[\s\S]*?<\/form>/gi) ?? [];
  assert.equal(forms.length, 1, 'corporate route must contain exactly one active detected b2b-enquiry form');
  const form = forms[0];
  const open = form.match(/^<form\b[^>]*>/i)?.[0] ?? '';
  const attrs = attributes(open);
  assert.equal(attrs.get('method')?.toUpperCase(), 'POST', 'corporate form must POST');
  assert.equal(attrs.get('data-netlify'), 'true', 'corporate form must enable Netlify detection');
  assert.equal(attrs.get('netlify-honeypot'), 'bot-field', 'corporate form must declare its honeypot');
  assert.match(form, /<input\b[^>]*\btype="hidden"[^>]*\bname="form-name"[^>]*\bvalue="b2b-enquiry"/i);
  assert.match(form, /<input\b[^>]*\bname="bot-field"/i);
}

async function mapLimit(items, concurrency, worker) {
  let index = 0;
  const outputs = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      outputs[current] = await worker(items[current], current);
    }
  }));
  return outputs;
}

async function smoke(origin, expectedRobots) {
  const summary = {
    ok: false,
    origin: origin.origin,
    expectedRobots,
    rootRedirects: 0,
    sitemapRoutes: 0,
    pagesChecked: 0,
    assetsChecked: 0,
    formDetected: false,
    utility404Noindex: false,
  };

  const root = await request(new URL('/', origin));
  assert.equal(root.status, 301, `root returned ${root.status}, expected 301`);
  assertNoWildcardCors(root, 'root redirect');
  const location = root.headers.get('location');
  assert.ok(location, 'root redirect is missing Location');
  const redirectTarget = new URL(location, origin);
  assert.equal(redirectTarget.href, new URL('/pl/', origin).href, 'root must redirect directly to /pl/');
  if (root.body) await root.body.cancel();
  const rootTarget = await request(redirectTarget);
  assert.equal(rootTarget.status, 200, '/pl/ must terminate the root redirect with 200');
  assertSecurityHeaders(rootTarget, '/pl/');
  await rootTarget.body?.cancel();
  summary.rootRedirects = 1;
  console.log('PASS root redirects once to /pl/');

  const sitemapResponse = await request(new URL('/sitemap.xml', origin));
  assert.equal(sitemapResponse.status, 200, `sitemap returned ${sitemapResponse.status}`);
  assert.match(sitemapResponse.headers.get('content-type') ?? '', /xml/i, 'sitemap has a non-XML content type');
  assertSecurityHeaders(sitemapResponse, 'sitemap');
  const sitemap = await sitemapResponse.text();
  const locations = sitemapLocations(sitemap);
  assert.ok(locations.length > 0, 'sitemap contains no routes');
  for (const locationValue of locations) {
    assert.equal(new URL(locationValue).origin, CANONICAL_ORIGIN, `sitemap URL is not canonical: ${locationValue}`);
  }
  summary.sitemapRoutes = locations.length;
  console.log(`PASS sitemap exposes ${locations.length} canonical route(s)`);

  const pages = await mapLimit(locations, PAGE_CONCURRENCY, async (locationValue) => {
    const canonicalUrl = new URL(locationValue);
    const target = mappedUrl(canonicalUrl, origin);
    const response = await request(target);
    assert.equal(response.status, 200, `${canonicalUrl.pathname} returned ${response.status}`);
    assertSecurityHeaders(response, canonicalUrl.pathname);
    const html = await response.text();
    assertCanonicalMetadata(html, canonicalUrl.pathname, expectedRobots);
    return { canonicalUrl, target, html };
  });
  summary.pagesChecked = pages.length;
  console.log(`PASS ${pages.length}/${locations.length} sitemap route(s) return canonical secured HTML`);

  const corporate = pages.find(({ canonicalUrl }) => canonicalUrl.pathname === '/pl/eventy-firmowe/');
  assert.ok(corporate, 'Polish corporate route is absent from the sitemap');
  assertCorporateForm(corporate.html);
  summary.formDetected = true;
  console.log('PASS corporate Netlify form detection markup is present');

  const assetUrls = [...new Set(pages.flatMap(({ html, target }) => referencedAssets(html, target, origin)))].sort();
  assert.ok(assetUrls.length > 0, 'no same-origin assets were discovered');
  await mapLimit(assetUrls, ASSET_CONCURRENCY, async (assetUrl) => {
    const response = await request(assetUrl, { method: 'HEAD' });
    assert.equal(response.status, 200, `${new URL(assetUrl).pathname} returned ${response.status}`);
    assertNoWildcardCors(response, new URL(assetUrl).pathname);
    await response.body?.cancel();
  });
  summary.assetsChecked = assetUrls.length;
  console.log(`PASS ${assetUrls.length}/${assetUrls.length} referenced same-origin asset(s) return 200`);

  const missingPath = `/__launch-smoke-missing-${Date.now()}/`;
  const missing = await request(new URL(missingPath, origin));
  assert.equal(missing.status, 404, `utility path returned ${missing.status}, expected 404`);
  assertSecurityHeaders(missing, 'utility 404');
  const missingHtml = await missing.text();
  const missingRobots = robotsValues(missingHtml);
  assert.equal(missingRobots.length, 1, 'utility 404 must emit exactly one active robots directive');
  assert.match(missingRobots[0], /^noindex(?:,|$)/, 'utility 404 is indexable');
  summary.utility404Noindex = true;
  console.log('PASS utility 404 is secured and non-indexable');

  summary.ok = true;
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { origin, expectedRobots } = parseArguments(process.argv.slice(2));
  smoke(origin, expectedRobots).catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
