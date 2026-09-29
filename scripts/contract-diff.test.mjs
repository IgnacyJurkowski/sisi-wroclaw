import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSeoEntry, descDistance, diffSeoEntry, kindOf, DESC_MAX, DESC_MIN } from './contract/lib/seo.mjs';
import { diffRedirects } from './contract/lib/netlify.mjs';
import { createReport } from './contract/lib/report.mjs';
import { createServer } from 'node:http';
import { classifyHead, headCheck } from './contract/lib/net.mjs';
import { fetchProductionSnapshot, productionRefreshHint } from './contract/lib/production.mjs';
import { stableStringify } from './contract/lib/snapshot.mjs';

const text = (n) => 'x'.repeat(n);

function entry(overrides = {}) {
  return {
    kind: 'page', inSitemap: true, indexable: true, lang: 'pl', title: 'Tytuł', description: text(120),
    canonical: 'https://www.sisiwroclaw.pl/pl/menu/', robots: 'index, follow',
    hreflang: { pl: 'https://www.sisiwroclaw.pl/pl/menu/', en: 'https://www.sisiwroclaw.pl/en/menu/', 'x-default': 'https://www.sisiwroclaw.pl/pl/menu/' },
    og: { 'og:title': 'Tytuł', 'og:image': 'https://www.sisiwroclaw.pl/a.webp', 'og:locale:alternate': ['de_DE', 'en_GB'] },
    twitter: { 'twitter:card': 'summary_large_image' },
    jsonld: { types: ['NightClub', 'WebSite'], ids: ['https://x/#club'] },
    sitemapAlternates: { pl: 'https://www.sisiwroclaw.pl/pl/menu/', en: 'https://www.sisiwroclaw.pl/en/menu/' },
    ...overrides,
  };
}

const fields = (result) => result.failures.map((f) => f.field);

test('identical entries pass with nothing to report', () => {
  const result = diffSeoEntry(entry(), entry());
  assert.deepEqual(result, { failures: [], improvements: [] });
});

test('a removed hreflang, a re-pointed hreflang and a lost x-default all fail', () => {
  const dropped = entry({ hreflang: { pl: 'https://www.sisiwroclaw.pl/pl/menu/', 'x-default': 'https://www.sisiwroclaw.pl/pl/menu/' } });
  assert.deepEqual(fields(diffSeoEntry(entry(), dropped)), ['hreflang[en]']);
  const repointed = entry({ hreflang: { ...entry().hreflang, en: 'https://www.sisiwroclaw.pl/en/other/' } });
  assert.match(diffSeoEntry(entry(), repointed).failures[0].message, /changed/);
  const noDefault = entry({ hreflang: { pl: entry().hreflang.pl, en: entry().hreflang.en } });
  assert.deepEqual(fields(diffSeoEntry(entry(), noDefault)), ['hreflang[x-default]']);
});

test('a NEW hreflang alternate is an improvement, never a failure', () => {
  const more = entry({ hreflang: { ...entry().hreflang, de: 'https://www.sisiwroclaw.pl/de/menu/' } });
  const result = diffSeoEntry(entry(), more);
  assert.equal(result.failures.length, 0);
  assert.deepEqual(result.improvements.map((i) => i.field), ['hreflang[de]']);
});

test('description is better only when its length moves toward 70-160', () => {
  assert.equal(descDistance(text(DESC_MIN)), 0);
  assert.equal(descDistance(text(DESC_MAX)), 0);
  assert.equal(descDistance(text(40)), 30);
  assert.equal(descDistance(text(200)), 40);

  const tooShort = entry({ description: text(40) });
  const better = diffSeoEntry(tooShort, entry({ description: text(100) }));
  assert.equal(better.failures.length, 0);
  assert.equal(better.improvements[0].field, 'description');

  const stillLong = diffSeoEntry(entry({ description: text(220) }), entry({ description: text(190) }));
  assert.equal(stillLong.failures.length, 0, 'closer to the band counts even if still outside it');

  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ description: text(80) }))), ['description'], 'in-band text rewritten is a silent change');
  assert.deepEqual(fields(diffSeoEntry(entry({ description: text(100) }), entry({ description: text(30) }))), ['description'], 'moving away fails');
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ description: null }))), ['description'], 'removal fails');
});

test('fields that were absent may appear; present ones may not vanish or change', () => {
  const added = diffSeoEntry(entry({ title: null, canonical: null }), entry());
  assert.equal(added.failures.length, 0);
  assert.deepEqual(added.improvements.map((i) => i.field).sort(), ['canonical', 'title']);

  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ title: '' }))), ['title']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ title: 'Inny' }))), ['title']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ canonical: 'https://www.sisiwroclaw.pl/pl/x/' }))), ['canonical']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ lang: 'en' }))), ['lang']);
});

test('og and twitter tags: removal and change fail, additions are improvements', () => {
  const noImage = entry({ og: { 'og:title': 'Tytuł', 'og:locale:alternate': ['de_DE', 'en_GB'] } });
  assert.deepEqual(fields(diffSeoEntry(entry(), noImage)), ['og:image']);
  const changedList = entry({ og: { ...entry().og, 'og:locale:alternate': ['de_DE'] } });
  assert.deepEqual(fields(diffSeoEntry(entry(), changedList)), ['og:locale:alternate']);
  const added = entry({ twitter: { 'twitter:card': 'summary_large_image', 'twitter:title': 'T' } });
  assert.deepEqual(diffSeoEntry(entry(), added).improvements.map((i) => i.field), ['twitter:title']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ twitter: {} }))), ['twitter:card']);
});

test('JSON-LD types and ids may be added, never lost', () => {
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ jsonld: { types: ['WebSite'], ids: ['https://x/#club'] } }))), ['jsonld.types']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ jsonld: { types: ['NightClub', 'WebSite'], ids: [] } }))), ['jsonld.ids']);
  const richer = entry({ jsonld: { types: ['FAQPage', 'NightClub', 'WebSite'], ids: ['https://x/#club', 'https://x/#faq'] } });
  const result = diffSeoEntry(entry(), richer);
  assert.equal(result.failures.length, 0);
  assert.equal(result.improvements.length, 2);
});

test('sitemap alternates follow the hreflang rule and leaving the sitemap fails', () => {
  const lost = entry({ sitemapAlternates: { pl: entry().sitemapAlternates.pl } });
  assert.deepEqual(fields(diffSeoEntry(entry(), lost)), ['sitemap.alternate[en]']);
  assert.deepEqual(fields(diffSeoEntry(entry(), entry({ inSitemap: false }))), ['sitemap']);
});

test('robots is compared only between builds of the same context', () => {
  const changed = entry({ robots: 'noindex, nofollow' });
  assert.deepEqual(fields(diffSeoEntry(entry(), changed)), ['robots']);
  assert.deepEqual(fields(diffSeoEntry(entry(), changed, { robotsComparable: false })), []);
});

test('article pages keep vendor-authored text out of the equality check but not its presence', () => {
  const old = entry({ kind: 'article', title: 'Stary tytuł', description: text(100), og: { 'og:title': 'A', 'og:image': 'https://www.sisiwroclaw.pl/a.webp' } });
  const edited = entry({ kind: 'article', title: 'Nowy tytuł', description: text(140), og: { 'og:title': 'B', 'og:image': 'https://www.sisiwroclaw.pl/b.webp' } });
  assert.equal(diffSeoEntry(old, edited).failures.length, 0);
  assert.deepEqual(fields(diffSeoEntry(old, { ...edited, title: null })), ['title']);
  assert.deepEqual(fields(diffSeoEntry(old, { ...edited, canonical: 'https://www.sisiwroclaw.pl/other/' })), ['canonical']);
});

test('kindOf classifies utility, page, article and event paths', () => {
  assert.equal(kindOf('/404.html'), 'utility');
  assert.equal(kindOf('/'), 'utility');
  assert.equal(kindOf('/pl/menu/'), 'page');
  assert.equal(kindOf('/pl/blog/'), 'page');
  assert.equal(kindOf('/pl/blog/a-post/'), 'article');
  assert.equal(kindOf('/pl/wydarzenia/2026-01-01-x/'), 'event');
});

test('buildSeoEntry shapes an extracted page for the snapshot', () => {
  const page = { lang: 'pl', title: 'T', description: 'D', canonical: 'c', robots: 'r', hreflang: { pl: 'c' }, og: {}, twitter: {}, jsonLd: { types: ['A'], ids: ['i'] } };
  const built = buildSeoEntry(page, { path: '/pl/blog/x/', inSitemap: true, indexable: true, sitemapAlternates: { pl: 'c' } });
  assert.equal(built.kind, 'article');
  assert.deepEqual(built.jsonld, { types: ['A'], ids: ['i'] });
});

test('redirect diff: removed, retargeted and changed rules fail; new rules are only reported', () => {
  const snapshot = [
    { from: '/menu', to: '/pl/menu/', status: 301, force: false },
    { from: '/kontakt', to: '/pl/kontakt/', status: 301, force: false },
  ];
  assert.deepEqual(diffRedirects(snapshot, snapshot), { failures: [], added: [] });
  assert.match(diffRedirects(snapshot, [snapshot[0]]).failures[0].message, /removed/);
  const retargeted = [snapshot[0], { ...snapshot[1], to: '/pl/contact/' }];
  assert.match(diffRedirects(snapshot, retargeted).failures[0].message, /retargeted/);
  const declared = diffRedirects(snapshot, retargeted, [{ from: '/pl/kontakt/', to: '/pl/contact/' }]);
  assert.equal(declared.failures.length, 0, 'a move declared in moves.json allows the retarget');
  const status = [snapshot[0], { ...snapshot[1], status: 302 }];
  assert.match(diffRedirects(snapshot, status).failures[0].message, /status/);
  const extra = diffRedirects(snapshot, [...snapshot, { from: '/x', to: '/pl/', status: 301, force: false }]);
  assert.equal(extra.failures.length, 0);
  assert.equal(extra.added.length, 1);
});

test('report counts pass/fail/unverified and waivers only hide what they name', () => {
  const report = createReport();
  report.pass('links', 3);
  report.fail('links', { url: '/pl/blog/a/', field: 'a', message: '#x anchors to #x, which is not an id' });
  report.fail('links', { url: '/pl/menu/', field: 'a', message: 'missing' });
  report.unverified('seo', { message: 'offline' });
  report.applyWaivers([
    { id: 'toc', contract: 'links', urlRegex: '^/pl/blog/', messageRegex: 'anchors to #', reason: 'known' },
    { id: 'stale', contract: 'links', urlRegex: '^/never/', reason: 'nothing matches' },
  ]);
  assert.deepEqual(report.counts('links'), { pass: 3, fail: 1, unverified: 0, note: 0, waived: 1 });
  assert.equal(report.failed(), true);
  const lines = [];
  report.print({ contracts: ['links', 'seo'], log: (line) => lines.push(line) });
  const out = lines.join('\n');
  assert.match(out, /WAIVED toc x1/);
  assert.match(out, /STALE WAIVER stale/);
  assert.match(out, /FAIL \[\/pl\/menu\/ a\] missing/);
  assert.match(out, /RESULT: FAIL/);
});

test('classifyHead separates gone from unverifiable', () => {
  assert.equal(classifyHead(200), 'ok');
  assert.equal(classifyHead(301), 'ok');
  assert.equal(classifyHead(404), 'fail');
  assert.equal(classifyHead(500), 'fail');
  for (const status of [401, 403, 405, 429]) assert.equal(classifyHead(status), 'unverified');
});

test('refresh-from-production issues one GET (the sitemap) and HEAD for everything else', async () => {
  const calls = [];
  const sitemap = '<urlset><url><loc>https://www.sisiwroclaw.pl/pl/</loc></url><url><loc>https://www.sisiwroclaw.pl/en/</loc></url></urlset>';
  const fetchImpl = async (url, init) => {
    calls.push(`${init.method} ${new URL(url).pathname}`);
    const path = new URL(url).pathname;
    if (init.method === 'GET') return new Response(sitemap, { status: 200 });
    if (path === '/menu') return new Response(null, { status: 301, headers: { location: 'https://www.sisiwroclaw.pl/pl/menu/' } });
    return new Response(null, { status: 200 });
  };
  const snap = await fetchProductionSnapshot({ fetchImpl, legacyPaths: ['/menu'], today: '2026-10-01', delayMs: 0 });
  assert.equal(snap.source, 'production 2026-10-01');
  assert.deepEqual(snap.urls, { '/pl/': 200, '/en/': 200 });
  assert.deepEqual(snap.legacy['/menu'], { status: 301, location: '/pl/menu/' });
  assert.deepEqual(calls.filter((c) => c.startsWith('GET')), ['GET /sitemap.xml']);
  assert.ok(calls.every((c) => c.startsWith('GET') || c.startsWith('HEAD')), 'never POST/PUT');
  assert.equal(productionRefreshHint(snap), null);
  assert.match(productionRefreshHint({ source: 'local-build main e1feb25' }), /not production/);
});

test('snapshots are written as pretty JSON with a trailing newline', () => {
  assert.equal(stableStringify({ a: 1 }), '{\n  "a": 1\n}\n');
});

test('headCheck sends HEAD only and reports the verdict', async () => {
  const methods = [];
  const server = createServer((req, res) => {
    methods.push(req.method);
    res.writeHead(req.url === '/gone' ? 404 : req.url === '/wall' ? 403 : 200);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await headCheck(`${base}/ok`), { verdict: 'ok', status: 200 });
    assert.deepEqual(await headCheck(`${base}/gone`), { verdict: 'fail', status: 404 });
    assert.deepEqual(await headCheck(`${base}/wall`), { verdict: 'unverified', status: 403 });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.deepEqual(methods, ['HEAD', 'HEAD', 'HEAD']);
  assert.equal((await headCheck('http://127.0.0.1:1/', { timeoutMs: 500 })).verdict, 'unverified', 'an unreachable host is unverified, not a failure');
});
