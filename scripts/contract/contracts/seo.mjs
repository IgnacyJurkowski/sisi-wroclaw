// Contract 2: SEO. Per URL: title, description, canonical, hreflang (+ x-default),
// robots meta, og:* / twitter:*, JSON-LD types and @ids, <html lang>, sitemap
// alternates. Snapshot in contract/seo.json, diffed "same or better" (see
// lib/seo.mjs for the exact definition of better).

import { CANONICAL_ORIGIN, DEFAULT_LOCALE, EXTERNAL_IMAGE_HOSTS, LOCALES, UTILITY_PAGES } from '../lib/constants.mjs';
import { allowedAgents, blockedAgents, parseRobots } from '../lib/robots.mjs';
import { buildSeoEntry, descDistance, diffSeoEntry, DESC_MAX, DESC_MIN } from '../lib/seo.mjs';
import { headCheck } from '../lib/net.mjs';
import { readSnapshot, writeSnapshot } from '../lib/snapshot.mjs';

const C = 'seo';

export function currentEntries(model) {
  const sitemap = new Map(model.sitemap.map((e) => [e.path, e]));
  const entries = {};
  for (const path of [...model.pages.keys()].sort()) {
    const page = model.pages.get(path);
    const inSitemap = sitemap.has(path);
    entries[path] = buildSeoEntry(page, {
      path, inSitemap, indexable: inSitemap, sitemapAlternates: sitemap.get(path)?.alternates,
    });
  }
  return entries;
}

export function robotsSummary(model) {
  if (model.robotsTxt === null) return null;
  const parsed = parseRobots(model.robotsTxt);
  return { allowedAgents: allowedAgents(parsed), blockedAgents: blockedAgents(parsed), sitemaps: parsed.sitemaps };
}

const firstLine = (text) => (text ?? '').split('\n')[0].trim();

export async function runSeoContract(ctx) {
  const { model, report, contractDir, opts, source } = ctx;

  if (opts.updateSnapshot) {
    writeSnapshot(contractDir, 'seo.json', {
      source,
      buildContext: model.buildContext,
      note: 'Per-URL SEO surface. robots values are only comparable between builds of the same context. lastmod is not tracked. Article and event pages keep vendor-authored text out of the equality check (presence only).',
      robotsTxt: robotsSummary(model),
      llms: { 'llms.txt': firstLine(model.llmsTxt), 'llms-full.txt': firstLine(model.llmsFull) },
      pages: currentEntries(model),
    });
    report.note(C, { message: 'wrote contract/seo.json' });
  }
  const snap = readSnapshot(contractDir, 'seo.json');
  if (!snap) {
    report.fail(C, { message: 'contract/seo.json is missing; run with --update-snapshot' });
    return;
  }

  const entries = currentEntries(model);
  const robotsComparable = snap.buildContext === model.buildContext;
  if (!robotsComparable) {
    report.unverified(C, { message: `robots meta not compared: snapshot was taken from a ${snap.buildContext} build, this dist is ${model.buildContext}. Absolute indexability rules still run when the dist is production-shaped.` });
  }

  // --- diff against the snapshot ------------------------------------------------
  for (const [path, old] of Object.entries(snap.pages)) {
    const cur = entries[path];
    if (!cur) {
      report.note(C, { url: path, message: 'page is gone from dist (reported by the url contract)' });
      continue;
    }
    const { failures, improvements } = diffSeoEntry(old, cur, { robotsComparable });
    if (!failures.length) report.pass(C);
    for (const f of failures) report.fail(C, { url: path, field: f.field, message: f.message });
    for (const i of improvements) {
      report.note(C, { url: path, field: i.field, message: `IMPROVED ${i.message} (run --update-snapshot to lock it in)` });
    }
  }
  const fresh = Object.keys(entries).filter((p) => !(p in snap.pages));
  if (fresh.length) report.note(C, { message: `${fresh.length} page(s) not in the SEO snapshot (new content; --update-snapshot records them): ${fresh.slice(0, 4).join(', ')}${fresh.length > 4 ? ', ...' : ''}` });

  // --- absolute rules for every URL in the sitemap ------------------------------
  const byCanonical = new Map();
  for (const [path, page] of model.pages) if (page.canonical) byCanonical.set(page.canonical, { path, page });
  const imageUrls = new Map();
  for (const entry of model.sitemap) {
    const path = entry.path;
    const page = model.pages.get(path);
    if (!page) continue;
    const abs = CANONICAL_ORIGIN + path;
    const locale = path.split('/')[1];
    const ck = (ok, field, message) => report.check(C, ok, { url: path, field, message });

    ck(Boolean(page.title), 'title', 'title is missing');
    ck(Boolean(page.description), 'description', 'meta description is missing');
    ck(page.canonical === abs, 'canonical', `canonical is ${page.canonical}, expected the page itself (${abs})`);
    ck(page.og['og:url'] === page.canonical, 'og:url', `og:url ${page.og['og:url']} differs from canonical`);
    ck(LOCALES.includes(locale) && page.lang === locale, 'lang', `<html lang="${page.lang}">, expected "${locale}"`);
    ck(page.jsonLdErrors === 0, 'jsonld', `${page.jsonLdErrors} JSON-LD block(s) do not parse`);
    ck(page.twitter['twitter:card'] === 'summary_large_image', 'twitter:card', 'twitter:card is not summary_large_image');
    ck(page.og['og:image'] === page.twitter['twitter:image'], 'twitter:image', 'twitter:image differs from og:image');
    if (model.buildContext === 'production') {
      ck(/^index, follow/.test(page.robots ?? ''), 'robots', `indexable URL carries robots "${page.robots}"`);
    }

    // hreflang: self-reference, x-default rule, reciprocity, sitemap parity.
    const hl = page.hreflang;
    ck(hl[locale] === abs, 'hreflang', `hreflang set has no self-reference (${locale} -> ${hl[locale]})`);
    const pl = hl[DEFAULT_LOCALE];
    ck(pl ? hl['x-default'] === pl : !hl['x-default'], 'hreflang[x-default]', `x-default is ${hl['x-default']}, expected ${pl ?? 'absent (no pl alternate)'}`);
    for (const [lang, href] of Object.entries(hl)) {
      if (lang === 'x-default' || href === abs) continue;
      const target = byCanonical.get(href);
      const back = target && Object.values(target.page.hreflang).includes(abs);
      ck(Boolean(back), `hreflang[${lang}]`, `${href} does not link back (hreflang is not reciprocal)`);
    }
    const sm = entry.alternates;
    ck(JSON.stringify(Object.entries(sm)) === JSON.stringify(Object.entries(hl)), 'sitemap alternates',
      `sitemap alternates ${Object.keys(sm).join(',')} differ from page hreflang ${Object.keys(hl).join(',')}`);

    // description length is advice, not a gate: report the pages outside the band.
    if (page.description && descDistance(page.description) > 0) {
      report.note(C, { url: path, field: 'description', message: `length ${[...page.description].length} is outside ${DESC_MIN}-${DESC_MAX}` });
    }
    const img = page.og['og:image'];
    if (img) {
      if (!imageUrls.has(img)) imageUrls.set(img, []);
      imageUrls.get(img).push(path);
    } else {
      ck(false, 'og:image', 'og:image is missing');
    }
  }

  await checkOgImages({ ctx, imageUrls });
  checkSiteFiles({ ctx, snap });
}

async function checkOgImages({ ctx, imageUrls }) {
  const { model, report, opts } = ctx;
  const external = new Map();
  for (const [url, pages] of imageUrls) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      report.fail(C, { url: pages[0], field: 'og:image', message: `og:image ${url} is not an absolute URL` });
      continue;
    }
    if (parsed.origin === CANONICAL_ORIGIN) {
      report.check(C, model.exists(parsed.pathname), { url: pages[0], field: 'og:image', message: `og:image ${url} has no file in dist (${pages.length} page(s))` });
    } else if (EXTERNAL_IMAGE_HOSTS.includes(parsed.hostname)) {
      external.set(url, pages);
    } else {
      report.fail(C, { url: pages[0], field: 'og:image', message: `og:image host ${parsed.hostname} is not on the allow-list (${EXTERNAL_IMAGE_HOSTS.join(', ')})` });
    }
  }
  for (const [url, pages] of external) {
    if (opts.offline) {
      report.unverified(C, { url: pages[0], field: 'og:image', message: `external image ${url} on ${pages.length} page(s) not fetched (--offline)` });
      continue;
    }
    const res = await headCheck(url);
    if (res.verdict === 'ok') report.pass(C);
    else if (res.verdict === 'fail') report.fail(C, { url: pages[0], field: 'og:image', message: `external image ${url} answers HTTP ${res.status}` });
    else report.unverified(C, { url: pages[0], field: 'og:image', message: `external image ${url} could not be verified (${res.status ?? res.error})` });
  }
}

function checkSiteFiles({ ctx, snap }) {
  const { model, report } = ctx;
  const robots = robotsSummary(model);
  report.check(C, robots !== null, { url: '/robots.txt', message: 'robots.txt is missing from dist' });
  if (robots && snap.robotsTxt) {
    for (const agent of snap.robotsTxt.allowedAgents) {
      report.check(C, robots.allowedAgents.includes(agent), { url: '/robots.txt', field: `User-agent: ${agent}`, message: 'AI/search crawler no longer explicitly allowed (removed, or its group disallows /)' });
    }
    for (const agent of robots.blockedAgents) {
      report.check(C, snap.robotsTxt.blockedAgents.includes(agent), { url: '/robots.txt', field: `User-agent: ${agent}`, message: 'a user agent is now blocked from the whole site' });
    }
    for (const sitemap of snap.robotsTxt.sitemaps) {
      report.check(C, robots.sitemaps.includes(sitemap), { url: '/robots.txt', field: 'Sitemap', message: `Sitemap line ${sitemap} was removed` });
    }
    for (const agent of robots.allowedAgents) {
      if (!snap.robotsTxt.allowedAgents.includes(agent)) report.note(C, { url: '/robots.txt', field: `User-agent: ${agent}`, message: 'IMPROVED newly allowed crawler' });
    }
  }
  for (const [name, text] of [['llms.txt', model.llmsTxt], ['llms-full.txt', model.llmsFull]]) {
    report.check(C, Boolean(text && text.trim().length > 200), { url: `/${name}`, message: `${name} is missing or nearly empty` });
    if (text && snap.llms?.[name]) {
      report.check(C, firstLine(text) === snap.llms[name], { url: `/${name}`, field: 'title line', message: `first line "${firstLine(text)}" differs from "${snap.llms[name]}"` });
    }
  }
}
