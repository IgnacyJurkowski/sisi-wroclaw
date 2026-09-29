import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  addToInventory, blogFlags, contradictions, extractFacts, factsFromHref, normalizePhone, serialiseInventory, splitSentences,
} from './contract/lib/facts.mjs';
import { checkAllowListAgainstSource, eventSlugs, pageKind } from './contract/contracts/facts.mjs';
import { normalizeFixtures } from './contract/contracts/blog.mjs';
import { ACCEPTED, REJECTED } from './contract/blog-fixtures.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const config = JSON.parse(read('contract/facts.json'));
const values = (text, kind) => extractFacts(text).filter((f) => f.kind === kind).map((f) => f.value);

test('extractFacts finds amounts in every notation the site uses', () => {
  assert.deepEqual(values('Koszt 100 zł od osoby, wstęp 40 zł.', 'currency'), ['100 zł', '40 zł']);
  assert.deepEqual(values('The fee is PLN 100 per person; entry PLN 30.', 'currency'), ['100 zł', '30 zł']);
  assert.deepEqual(values('od 50–100 zł oraz 1 200,50 PLN', 'currency'), ['50 zł', '100 zł', '1200,50 zł']);
  assert.deepEqual(values('12,5 zł', 'currency'), ['12,5 zł']);
  assert.deepEqual(values('Bilet €20', 'currency'), ['20 €']);
  assert.deepEqual(values('brak kwot 2026-06-26', 'currency'), []);
});

test('extractFacts finds clock times, ranges and worded hours', () => {
  assert.deepEqual(values('Otwarte 22:00 - 04:00, odbiór 22:00-23:00', 'timeRange'), ['22:00-04:00', '22:00-23:00']);
  assert.deepEqual(values('o 9:30 i 22:00', 'time'), ['09:30', '22:00']);
  assert.deepEqual(values('do 4 rano', 'time'), ['4 rano']);
  assert.deepEqual(values('bis 4 Uhr', 'time'), ['4 uhr']);
  assert.deepEqual(values('wersja 1.2.3 i 12.05.2026', 'time'), []);
});

test('extractFacts normalises phones, emails and addresses; ids are not phones', () => {
  assert.deepEqual(values('Tel. +48 515 126 260 lub 514 032 930', 'phone'), ['+48515126260', '+48514032930']);
  assert.deepEqual(values('NIP 8971933394, REGON 527683726, KRS 0001085945', 'phone'), []);
  assert.deepEqual(values('Pisz: Biuro@R32.com.pl', 'email'), ['biuro@r32.com.pl']);
  assert.deepEqual(values('Rzeźnicza 32-33, 50-130 Wrocław', 'address'), ['Rzeźnicza 32-33']);
  assert.deepEqual(values('ul. Rzeźnicza 32–33', 'address'), ['Rzeźnicza 32-33']);
  assert.deepEqual(values('Rzeźnicza 32 Sp. z o.o.', 'address'), [], 'the legal name is not an address');
  assert.deepEqual(values('ul. Stawki 2, 00-193 Warszawa', 'address'), ['ul. Stawki 2']);
  assert.equal(normalizePhone('0048 515-126-260'), '+48515126260');
  assert.deepEqual(factsFromHref('tel:+48515126260').map((f) => f.value), ['+48515126260']);
  assert.deepEqual(factsFromHref('mailto:events@r32.com.pl?subject=x').map((f) => f.value), ['events@r32.com.pl']);
});

test('reservation copy on site pages may only quote the allow-listed amounts', () => {
  const site = { kind: 'site', page: '/pl/rezerwacje/' };
  const rules = (text) => contradictions(text, site, config).map((c) => `${c.rule}:${c.value}`);
  assert.deepEqual(rules('Koszt rezerwacji wynosi 100 zł od osoby.'), []);
  assert.deepEqual(rules('W soboty doliczany jest wstęp w wysokości 40 zł od osoby.'), []);
  assert.deepEqual(rules('Koszt rezerwacji wynosi 120 zł od osoby.'), ['price-contradicts-allow-list:120 zł']);
  assert.deepEqual(rules('The reservation fee is PLN 100; on Saturdays an entry fee of PLN 30 is added.'), ['price-contradicts-allow-list:30 zł']);
  assert.deepEqual(rules('Mojito kosztuje 32 zł.'), [], 'menu prices are not reservation claims');
});

test('hours, phones, emails and the street are checked on site pages', () => {
  const site = { kind: 'site', page: '/pl/kontakt/' };
  const rules = (text) => contradictions(text, site, config).map((c) => c.rule);
  assert.deepEqual(rules('Otwarte w piątki i soboty, 22:00 - 04:00.'), []);
  assert.deepEqual(rules('Rezerwację należy odebrać w godzinach 22:00-23:30.'), []);
  assert.deepEqual(rules('Otwarte w piątki i soboty, 21:00 - 03:00.'), ['hours-range-contradicts-allow-list']);
  assert.deepEqual(rules('Godziny otwarcia: od 20:00.'), ['hours-contradicts-allow-list']);
  assert.deepEqual(rules('Zadzwoń: +48 600 000 000'), ['phone-not-on-allow-list']);
  assert.deepEqual(rules('Pisz na biuro@example.com'), ['email-not-on-allow-list']);
  assert.deepEqual(rules('Adres: Rzeźnicza 31, Wrocław'), ['address-not-on-allow-list']);
  assert.deepEqual(rules('Adres: Rzeźnicza 32-33, Wrocław, tel. +48 515 126 260, biuro@r32.com.pl'), []);
});

test('blog posts are judged only on sentences about SiSi', () => {
  const blog = { kind: 'blog', page: '/pl/blog/x/' };
  const rules = (text) => contradictions(text, blog, config).map((c) => `${c.rule}:${c.value}`);
  assert.deepEqual(rules('Rezerwacja stolika w innym lokalu kosztuje około 80 zł od osoby.'), [], 'another venue');
  assert.deepEqual(rules('W SiSi rezerwacja stolika wynosi 100 zł od osoby.'), []);
  assert.deepEqual(rules('W SiSi rezerwacja stolika wynosi 150 zł od osoby.'), ['price-contradicts-allow-list:150 zł']);
  assert.deepEqual(rules('SiSi otwiera się o 20:00.'), ['hours-contradicts-allow-list:20:00']);
  assert.deepEqual(rules('Nocne menu serwują do 05:00 w wielu klubach.'), []);
});

test('blogFlags marks SiSi sentences that state a price, an hour or a rule', () => {
  const flags = (text) => blogFlags(text, config).map((f) => f.kinds.join('+'));
  assert.deepEqual(flags('W SiSi rezerwacja stolika wynosi 100 zł od osoby, a wstęp w soboty 40 zł.'), ['price+rule']);
  assert.deepEqual(flags('SiSi działa od 22:00 do 4:00.'), ['hour']);
  assert.deepEqual(flags('W SiSi obowiązuje dress code smart casual.'), ['rule']);
  assert.deepEqual(flags('Aperol Spritz pije się latem.'), []);
  assert.deepEqual(flags('Zapraszamy do SiSi na koncert.'), []);
});

test('inventory lists each distinct value with the pages that carry it', () => {
  const inventory = {};
  addToInventory(inventory, '/a/', 'Cena 100 zł, tel. +48 515 126 260');
  addToInventory(inventory, '/b/', 'Cena 100 zł');
  addToInventory(inventory, '/b/', 'Cena 100 zł');
  const out = serialiseInventory(inventory);
  assert.deepEqual(out.currency['100 zł'], { count: 2, pages: ['/a/', '/b/'] });
  assert.deepEqual(out.phone['+48515126260'].pages, ['/a/']);
});

test('splitSentences splits within a block on sentence ends only', () => {
  assert.deepEqual(splitSentences('Pierwsze zdanie. Drugie zdanie! Trzecie 22:00-04:00.'), ['Pierwsze zdanie.', 'Drugie zdanie!', 'Trzecie 22:00-04:00.']);
});

test('facts.json still agrees with src/data/site.ts and src/i18n/ui/pl.ts', () => {
  assert.deepEqual(checkAllowListAgainstSource({ config, siteSource: read('src/data/site.ts'), plSource: read('src/i18n/ui/pl.ts') }), []);
  const drifted = { ...config, phones: ['+48000000000'] };
  assert.ok(checkAllowListAgainstSource({ config: drifted, siteSource: read('src/data/site.ts'), plSource: read('src/i18n/ui/pl.ts') }).length >= 2);
});

test('pageKind separates blog posts and event pages from site pages', () => {
  const slugs = eventSlugs(read('src/i18n/routes.ts'));
  assert.deepEqual([...slugs].sort(), ['akce', 'eventi', 'events', 'veranstaltungen', 'wydarzenia']);
  assert.equal(pageKind('/pl/blog/a-post/', slugs), 'blog');
  assert.equal(pageKind('/pl/blog/', slugs), 'site');
  assert.equal(pageKind('/pl/wydarzenia/', slugs), 'event');
  assert.equal(pageKind('/en/events/2026-01-01-x/', slugs), 'event');
  assert.equal(pageKind('/pl/menu/', slugs), 'site');
});

test('BLG fixtures: accepted payloads normalise, rejected ones are skipped, with the real normaliser', async () => {
  const { accepted, rejected, problems } = await normalizeFixtures(new URL('..', import.meta.url).pathname);
  assert.deepEqual(problems, []);
  assert.equal(accepted.length, ACCEPTED.length);
  assert.ok(rejected.every((row) => row.article === null && row.errors.length > 0), 'bad rows stay skipped');
  assert.equal(rejected.length, REJECTED.length);

  const bySlug = Object.fromEntries(accepted.map((f) => [`${f.article.locale}/${f.article.slug}`, f.article]));
  assert.ok(bySlug['pl/contract-fixture-camel-case'], 'camelCase keys and a messy slug are normalised');
  assert.equal(bySlug['en/contract-fixture-standard'].locale, 'en', 'en-GB maps to en');
  assert.equal(bySlug['pl/contract-fixture-standard'].faq.length, 2);
  assert.equal(bySlug['pl/contract-fixture-no-hero'].faq.length, 1);
  assert.equal(bySlug['pl/contract-fixture-no-hero'].heroSource, undefined);
  assert.equal(bySlug['pl/contract-fixture-standard'].keywords.length, 3);

  const stress = bySlug['pl/contract-fixture-stress'].html;
  for (const forbidden of ['<script', '<iframe', '<form', '<style', '<svg', 'onclick', 'javascript:', 'SCRIPT-MARKER', 'IFRAME-FALLBACK-MARKER']) {
    assert.ok(!stress.includes(forbidden), `${forbidden} must not survive the sanitiser`);
  }
  assert.ok(stress.includes('<table>') && stress.includes('<blockquote'), 'tables and quotes survive');
  assert.ok(!/<h1[\s>]/.test(stress), 'h1 in the body is demoted');
});
