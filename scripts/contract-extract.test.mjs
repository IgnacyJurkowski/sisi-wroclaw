import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { extractPage, groupMeta } from './contract/lib/html.mjs';
import { parseSitemap, pathOf } from './contract/lib/sitemap.mjs';
import { allowedAgents, blockedAgents, parseRobots } from './contract/lib/robots.mjs';
import { parseRedirects, matchRedirect, classifyTarget } from './contract/lib/netlify.mjs';
import { ctaProblems, parseReservationSource } from './contract/lib/cta.mjs';
import { urlForFile } from './contract/lib/dist.mjs';
import { parseArgs } from './contract/args.mjs';

const PAGE = `<!DOCTYPE html><html lang="pl"><head>
<meta charset="utf-8"><title> Tytuł  strony </title>
<meta name="description" content="Opis strony">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://www.sisiwroclaw.pl/pl/menu/">
<link rel="alternate" hreflang="pl" href="https://www.sisiwroclaw.pl/pl/menu/">
<link rel="alternate" hreflang="en" href="https://www.sisiwroclaw.pl/en/menu/">
<link rel="alternate" hreflang="x-default" href="https://www.sisiwroclaw.pl/pl/menu/">
<link rel="preload" as="font" href="/fonts/a.woff2">
<meta property="og:title" content="OG tytuł"><meta property="og:locale:alternate" content="en_GB"><meta property="og:locale:alternate" content="de_DE">
<meta property="article:published_time" content="2026-01-01T00:00:00Z">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://x/#org"},{"@type":["NightClub","LocalBusiness"],"@id":"https://x/#club","potentialAction":{"@type":"ReserveAction","target":{"@type":"EntryPoint","urlTemplate":"https://emenago.com/inner/cart/1/abc/pl"}}}]}</script>
<script type="application/ld+json">{"@type":"BlogPosting","@id":"https://x/a/#article","mainEntityOfPage":{"@type":"WebPage","@id":"https://x/a/"}}</script>
<script type="application/ld+json">{broken</script>
<script>var hidden = "22:00";</script>
</head><body>
<nav><a href="/pl/kontakt/">Kontakt</a></nav>
<main id="main"><h1>Nagłówek <span>główny</span></h1>
<p>Rezerwacja: <a href="https://emenago.com/inner/cart/6619/abc/pl?utm_source=website&amp;utm_medium=cta&amp;utm_campaign=reservation&amp;utm_content=hero">Zarezerwuj</a></p>
<img src="/a.webp"><img src="/b.webp" alt="b">
<div class="ba-body"><h2>Sekcja</h2><p onclick="x()">Tekst <a href="javascript:alert(1)">zły</a></p><iframe src="//e"></iframe><img src="https://h/i.jpg" alt=""></div>
<dl class="ba-faq"><div class="ba-faq-item"><dt>Q</dt><dd>A</dd></div></dl>
<a href="tel:+48515126260">tel</a><a href="#top" name="top">top</a></main>
<footer><a href="mailto:biuro@r32.com.pl">mail</a></footer></body></html>`;

test('extractPage reads head metadata, hreflang and social tags', () => {
  const page = extractPage(PAGE);
  assert.equal(page.lang, 'pl');
  assert.equal(page.title, 'Tytuł strony');
  assert.equal(page.description, 'Opis strony');
  assert.equal(page.robots, 'index, follow');
  assert.equal(page.canonical, 'https://www.sisiwroclaw.pl/pl/menu/');
  assert.deepEqual(Object.keys(page.hreflang), ['en', 'pl', 'x-default']);
  assert.equal(page.og['og:title'], 'OG tytuł');
  assert.deepEqual(page.og['og:locale:alternate'], ['de_DE', 'en_GB']);
  assert.equal(page.og['article:published_time'], '2026-01-01T00:00:00Z');
  assert.equal(page.twitter['twitter:card'], 'summary_large_image');
  assert.deepEqual(page.h1, ['Nagłówek główny']);
});

test('extractPage summarises JSON-LD types, ids and reserve targets', () => {
  const page = extractPage(PAGE);
  assert.deepEqual(page.jsonLd.types, ['BlogPosting', 'LocalBusiness', 'NightClub', 'Organization']);
  assert.deepEqual(page.jsonLd.ids, ['https://x/#club', 'https://x/#org', 'https://x/a/#article']);
  assert.equal(page.jsonLdErrors, 1);
  assert.equal(page.jsonLd.reserveTargets.length, 1);
  assert.match(page.jsonLd.reserveTargets[0].url, /emenago\.com/);
});

test('extractPage collects links, CTAs with position and region, ids and visible text', () => {
  const page = extractPage(PAGE);
  const urls = page.links.map((l) => `${l.tag}:${l.url}`);
  assert.ok(urls.includes('a:/pl/kontakt/'));
  assert.ok(urls.includes('link:/fonts/a.woff2'));
  assert.ok(urls.includes('img:/a.webp'));
  const [cta] = page.links.filter((l) => l.cta);
  assert.equal(cta.position, 1);
  assert.equal(cta.region, 'main');
  assert.ok(page.ids.has('main') && page.ids.has('top'));
  assert.ok(page.blocks.includes('Nagłówek główny'));
  assert.ok(!page.blocks.some((b) => b.includes('hidden')), 'script text is not visible text');
  assert.equal(page.imgsWithoutAlt, 1);
});

test('extractPage inspects the syndicated article body', () => {
  const page = extractPage(PAGE);
  assert.equal(page.article.tags.iframe, 1);
  assert.equal(page.article.eventAttrs, 1);
  assert.equal(page.article.jsHrefs, 1);
  assert.deepEqual(page.article.headings, [{ level: 2, text: 'Sekcja' }]);
  assert.equal(page.article.faqItems, 1);
});

test('groupMeta keeps single values as strings and repeats as sorted arrays', () => {
  assert.deepEqual(groupMeta([['b', '2'], ['a', '1'], ['b', '1']]), { a: '1', b: ['1', '2'] });
});

test('parseSitemap reads loc, lastmod and alternates', () => {
  const xml = `<urlset><url><loc>https://www.sisiwroclaw.pl/pl/</loc><lastmod>2026-09-29</lastmod>
    <xhtml:link rel="alternate" hreflang="pl" href="https://www.sisiwroclaw.pl/pl/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.sisiwroclaw.pl/pl/"/></url>
    <url><loc>https://www.sisiwroclaw.pl/en/?a=1&amp;b=2</loc></url></urlset>`;
  const entries = parseSitemap(xml);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].alternates, { pl: 'https://www.sisiwroclaw.pl/pl/', 'x-default': 'https://www.sisiwroclaw.pl/pl/' });
  assert.equal(entries[1].loc, 'https://www.sisiwroclaw.pl/en/?a=1&b=2');
  assert.equal(pathOf('https://www.sisiwroclaw.pl/en/menu/'), '/en/menu/');
});

test('robots parsing lists explicitly allowed agents and spots blocked ones', () => {
  const parsed = parseRobots(`# c
User-agent: *
Allow: /

User-agent: GPTBot
User-agent: ClaudeBot
Allow: /

User-agent: BadBot
Disallow: /

Sitemap: https://www.sisiwroclaw.pl/sitemap.xml`);
  assert.deepEqual(allowedAgents(parsed), ['*', 'ClaudeBot', 'GPTBot']);
  assert.deepEqual(blockedAgents(parsed), ['BadBot']);
  assert.deepEqual(parsed.sitemaps, ['https://www.sisiwroclaw.pl/sitemap.xml']);
});

test('parseRedirects reads the real netlify.toml and matchRedirect applies it', () => {
  const rules = parseRedirects(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'));
  assert.ok(rules.length >= 14);
  const legacy = matchRedirect(rules, { path: '/kontakt' });
  assert.equal(legacy.rule.status, 301);
  assert.equal(legacy.target, '/pl/kontakt/');
  const bare = matchRedirect(rules, { scheme: 'https', host: 'sisiwroclaw.pl', path: '/pl/menu/' });
  assert.equal(bare.target, 'https://www.sisiwroclaw.pl/pl/menu/');
  assert.equal(matchRedirect(rules, { path: '/' }).target, '/pl/');
  assert.equal(matchRedirect(rules, { path: '/ph/e/' }).rule.status, 200);
  assert.equal(matchRedirect(rules, { path: '/pl/menu/' }), null);
});

test('a non-forced redirect yields to a real file, a forced one does not', () => {
  const rules = [
    { from: '/a', to: '/b/', status: 301, force: false },
    { from: '/c', to: '/d/', status: 301, force: true },
  ];
  assert.equal(matchRedirect(rules, { path: '/a' }, () => true), null);
  assert.equal(matchRedirect(rules, { path: '/c' }, () => true).target, '/d/');
});

test('classifyTarget separates internal from external destinations', () => {
  const origin = 'https://www.sisiwroclaw.pl';
  assert.deepEqual(classifyTarget('/pl/', origin), { kind: 'internal', path: '/pl/' });
  assert.equal(classifyTarget('https://www.sisiwroclaw.pl/pl/', origin).kind, 'internal');
  assert.equal(classifyTarget('https://eu.i.posthog.com/:splat', origin).origin, 'https://eu.i.posthog.com');
});

test('reservation rules are read from src/data/site.ts (cs deliberately maps to pl)', () => {
  const rules = parseReservationSource(readFileSync(new URL('../src/data/site.ts', import.meta.url), 'utf8'));
  assert.deepEqual(rules.localeMap, { pl: 'pl', en: 'en', de: 'de', it: 'it', cs: 'pl' });
  assert.equal(rules.fixed.utm_source, 'website');
  assert.equal(rules.fixed.utm_medium, 'cta');
  assert.equal(rules.fixed.utm_campaign, 'reservation');

  const ok = `${rules.base}/pl?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=hero`;
  assert.deepEqual(ctaProblems(ok, 'cs', rules), []);
  assert.deepEqual(ctaProblems(ok, 'pl', rules), []);
  assert.match(ctaProblems(ok, 'en', rules).join(), /locale segment "en"/);
  assert.match(ctaProblems(ok.replace('&utm_content=hero', ''), 'pl', rules).join(), /missing utm_content/);
  assert.match(ctaProblems(ok.replace('utm_medium=cta', 'utm_medium=x'), 'pl', rules).join(), /utm_medium=x/);
  assert.match(ctaProblems(ok.replace('https:', 'http:'), 'pl', rules).join(), /protocol/);
});

test('urlForFile maps dist files to URLs', () => {
  assert.equal(urlForFile('pl/menu/index.html'), '/pl/menu/');
  assert.equal(urlForFile('404.html'), '/404.html');
  assert.equal(urlForFile('index.html'), '/');
});

test('parseArgs validates flags', () => {
  const opts = parseArgs(['--only', 'seo,url', '--offline', '--update-snapshot', '--dist', 'x', '--max-failures', '3']);
  assert.deepEqual(opts.only, ['seo', 'url']);
  assert.equal(opts.offline, true);
  assert.equal(opts.updateSnapshot, true);
  assert.equal(opts.dist, 'x');
  assert.equal(opts.maxFailures, 3);
  assert.throws(() => parseArgs(['--only', 'nope']), /--only accepts/);
  assert.throws(() => parseArgs(['--wat']), /unknown option/);
  assert.throws(() => parseArgs(['--dist']), /needs a value/);
});
