#!/usr/bin/env node
/* Venue consistency probe.
 *
 * Reads the built site (dist/) and the source dictionaries, finds every place
 * that states a venue fact (each price, hour range, phone, e-mail, address, rule
 * sentence, capacity figure, menu row), and diffs what it finds against
 * src/content/venue. Nothing is fixed: the probe reports.
 *
 *   npm run build && node scripts/venue-inventory.mjs
 *   node scripts/venue-inventory.mjs --verbose            every occurrence
 *   node scripts/venue-inventory.mjs --markdown out.md    the report as Markdown
 *   node scripts/venue-inventory.mjs --json out.json      the raw findings
 *   node scripts/venue-inventory.mjs --verify-sources     also check every citation in venue.ts
 *   node scripts/venue-inventory.mjs --fail-on-diff       exit 1 when anything disagrees
 *
 * When two places disagree the probe keeps both and picks neither: the venue
 * value is only "what venue.ts holds", never proof.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { loadTs } from './lib/load-ts.mjs';
import { loadVenue, REPO_ROOT } from './lib/load-venue.mjs';
import {
  RULES,
  extractFacts,
  htmlToSurface,
  parseMenuPage,
  ruleHits,
  splitSentences,
} from './lib/venue-extract.mjs';
import { checkContradictions, checkSources, makeReader, walkVenue } from './lib/venue-verify.mjs';

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dist: join(REPO_ROOT, 'dist'), verbose: false, all: false, markdown: null, json: null, verifySources: false, failOnDiff: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dist') args.dist = argv[++i];
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--all') args.all = true;
    else if (arg === '--markdown') args.markdown = argv[++i];
    else if (arg === '--json') args.json = argv[++i];
    else if (arg === '--verify-sources') args.verifySources = true;
    else if (arg === '--fail-on-diff') args.failOnDiff = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'));
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Expectations from the venue record
// ---------------------------------------------------------------------------

function expectations(V) {
  const R = V.reservations;
  const night = V.hours.nights[0];
  return {
    deposit: [R.days.friday.depositPerPersonPln.value, R.days.saturday.depositPerPersonPln.value],
    entrySaturday: R.days.saturday.entryPerPersonPln.value,
    entryFriday: R.days.friday.entryPerPersonPln.value,
    opens: night.opens.value,
    closes: night.closes.value,
    arrival: [R.arrivalWindow.from.value, R.arrivalWindow.to.value],
    phones: new Map([
      [V.contacts.phone.value.e164, { fact: 'contacts.phone', display: V.contacts.phone.value.display }],
      [V.contacts.eventsPhone.value.e164, { fact: 'contacts.eventsPhone', display: V.contacts.eventsPhone.value.display }],
    ]),
    emails: new Map([
      [V.contacts.email.value, 'contacts.email'],
      [V.contacts.eventsEmail.value, 'contacts.eventsEmail'],
    ]),
    street: V.address.street.value.replace(/^\D+\s*/, ''),
    postal: V.address.postalCode.value,
    area: V.b2b.areaSqm.value,
    seated: V.b2b.theCorkSeated.value,
    standing: V.b2b.standingBuffet.value,
    screens: V.b2b.presentationScreens.value,
  };
}

const FACT_LABEL = {
  'reservation.deposit': 'Reservation deposit per person (PLN)',
  'reservation.saturday.entry': 'Saturday entry per person (PLN)',
  'reservation.friday.entry': 'Friday entry per person (PLN)',
  'reservation.arrivalWindow': 'Arrival window',
  'hours.range': 'Opening hours (opens - closes)',
  'hours.opens': 'Opening time',
  'hours.closes': 'Closing time',
  'contacts.phone': 'Reservations phone',
  'contacts.eventsPhone': 'Events phone',
  'contacts.email': 'Reservations e-mail',
  'contacts.eventsEmail': 'Events e-mail',
  'address.street': 'Street number',
  'address.postalCode': 'Postal code',
  'b2b.areaSqm': 'Event space (m2)',
  'b2b.theCorkSeated': 'The Cork seated guests',
  'b2b.standingBuffet': 'Standing guests (buffet)',
  'b2b.presentationScreens': 'Presentation screens',
  'identity.brandName': 'Brand spelling',
};

/** Decide what an extracted value means and whether it agrees with venue.ts. */
function judge(occ, X, ctx) {
  const { type, role, value } = occ;
  if (type === 'money') {
    if (role === 'reservation-deposit') {
      return { fact: 'reservation.deposit', expected: X.deposit[0], verdict: X.deposit.includes(value) ? 'match' : 'diff' };
    }
    if (role === 'entry-fee') {
      if (occ.day === 'friday') return { fact: 'reservation.friday.entry', expected: X.entryFriday, verdict: value === X.entryFriday ? 'match' : 'diff' };
      return { fact: 'reservation.saturday.entry', expected: X.entrySaturday, verdict: value === X.entrySaturday ? 'match' : 'diff', note: occ.day === 'unspecified' ? 'day not stated' : undefined };
    }
    return { fact: null, verdict: 'ignore' };
  }
  if (type === 'time') {
    if (role === 'arrival-window') {
      const ok = occ.from === X.arrival[0] && occ.to === X.arrival[1];
      return { fact: 'reservation.arrivalWindow', expected: `${X.arrival[0]}-${X.arrival[1]}`, verdict: ok ? 'match' : 'diff' };
    }
    if (role === 'time-range') {
      if (occ.from === X.opens && occ.to === X.closes) return { fact: 'hours.range', expected: `${X.opens}-${X.closes}`, verdict: 'match' };
      if (occ.from === X.arrival[0] && occ.to === X.arrival[1]) return { fact: 'reservation.arrivalWindow', expected: `${X.arrival[0]}-${X.arrival[1]}`, verdict: 'match' };
      return { fact: 'hours.range', expected: `${X.opens}-${X.closes}`, verdict: ctx.sisi ? 'diff' : 'ignore', note: 'a time range that is neither the opening hours nor the arrival window' };
    }
    if (role === 'time') {
      if (value === X.opens) return { fact: 'hours.opens', expected: X.opens, verdict: 'match' };
      if (value === X.closes) return { fact: 'hours.closes', expected: X.closes, verdict: 'match' };
      if (value === X.arrival[1]) return { fact: 'reservation.arrivalWindow', expected: X.arrival[1], verdict: 'match' };
      return { fact: 'hours.opens', expected: `${X.opens} / ${X.closes}`, verdict: ctx.sisi ? 'diff' : 'ignore', note: 'a single time that is neither opening nor closing' };
    }
  }
  if (type === 'phone') {
    const known = X.phones.get(value);
    if (!known) return { fact: 'contacts.phone', expected: [...X.phones.keys()].join(' or '), verdict: 'diff', note: 'unknown number' };
    return { fact: known.fact, expected: known.display, verdict: occ.raw === known.display ? 'match' : 'format', note: occ.raw === known.display ? undefined : `written "${occ.raw}"` };
  }
  if (type === 'email') {
    const fact = X.emails.get(value);
    return fact ? { fact, expected: value, verdict: 'match' } : { fact: 'contacts.email', expected: [...X.emails.keys()].join(' or '), verdict: 'diff', note: 'unknown e-mail' };
  }
  if (type === 'address') {
    if (role === 'street-number') return { fact: 'address.street', expected: X.street, verdict: value === X.street ? 'match' : 'diff' };
    if (role === 'postal-code') return { fact: 'address.postalCode', expected: X.postal, verdict: value === X.postal ? 'match' : 'diff' };
  }
  if (type === 'capacity') {
    const map = { 'area-sqm': ['b2b.areaSqm', X.area], seated: ['b2b.theCorkSeated', X.seated], standing: ['b2b.standingBuffet', X.standing], screens: ['b2b.presentationScreens', X.screens] };
    const [fact, expected] = map[role];
    return { fact, expected, verdict: value === expected ? 'match' : 'diff' };
  }
  if (type === 'brand') {
    return { fact: 'identity.brandName', expected: 'SiSi', verdict: value === 'SiSi' ? 'match' : 'variant' };
  }
  if (type === 'closure') return { fact: 'hours.closures', expected: 'no mention of the ended closure', verdict: 'closure-mention' };
  return { fact: null, verdict: 'ignore' };
}

// ---------------------------------------------------------------------------
// Surfaces: built pages, generated text files, source files
// ---------------------------------------------------------------------------

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

function pageInfo(urlPath, routes) {
  const parts = urlPath.split('/').filter(Boolean);
  const locale = LOCALES.includes(parts[0]) ? parts[0] : null;
  if (!locale) return { locale: null, kind: parts.length === 0 ? 'root' : '404' };
  if (parts.length === 1) return { locale, kind: 'home' };
  const [, slug, extra] = parts;
  for (const key of routes.ROUTE_KEYS) {
    if (routes.SLUGS[key][locale] !== slug) continue;
    if (key === 'blog') return { locale, kind: extra ? 'blog-article' : 'blog' };
    if (key === 'events') return { locale, kind: extra ? 'event' : 'events' };
    return { locale, kind: key };
  }
  return { locale, kind: 'other' };
}

const SISI_MARK = /sisi|nasz|napisz do nas|u nas\b|zarezerwuj stolik/i;

/** Sentences of a block that make a claim about the club (blog posts talk about many venues). */
function isAboutSisi(pageKind, block, value, type) {
  if (pageKind !== 'blog-article') return true;
  if (SISI_MARK.test(block)) return true;
  return type === 'money' && [100, 40, 30].includes(value);
}

const WALK_IN = /bez (?:wcześniejszej )?rezerwacji/i;
const UNTIL_MORNING = /do (?:samego )?rana|do świtu/i;
const LIVE_MUSIC = /muzyk\w* na żywo/i;

function collectDist(distDir, routes, X, out) {
  const pages = [];
  const files = [...walk(distDir)].sort();
  for (const file of files) {
    const rel = relative(distDir, file).split(sep).join('/');
    if (rel.endsWith('.html')) {
      const urlPath = `/${rel.replace(/index\.html$/, '').replace(/\.html$/, '')}`.replace(/\/+$/, '/') || '/';
      const info = pageInfo(urlPath, routes);
      const html = readFileSync(file, 'utf8');
      const surface = htmlToSurface(html, { spansBreak: info.kind !== 'blog-article' });
      pages.push({ path: urlPath, file: rel, ...info, surface });
    }
  }

  for (const page of pages) {
    const { surface } = page;
    const blocks = [
      ...Object.entries(surface.regions).flatMap(([region, lines]) => lines.map((text) => ({ region, text }))),
      ...['description', 'og:description', 'twitter:description'].filter((k) => surface.meta[k]).map((k) => ({ region: `meta:${k}`, text: surface.meta[k] })),
    ];
    if (page.kind === 'menu') {
      // Prices on the menu page are compared row by row in the menu diff.
      out.menuPages.push(page);
    }
    for (const block of blocks) {
      for (const sentence of splitSentences(block.text)) {
        for (const occ of extractFacts(sentence)) {
          if (page.kind === 'menu' && occ.type === 'money') continue;
          const sisi = isAboutSisi(page.kind, block.text, occ.value, occ.type);
          const verdict = sisi ? judge(occ, X, { sisi: true }) : { fact: null, verdict: 'ignore' };
          if (verdict.verdict === 'ignore') continue;
          out.occurrences.push({ ...occ, ...verdict, place: { kind: 'dist', path: page.path, pageKind: page.kind, locale: page.locale, region: block.region, sentence } });
        }
        if (page.kind === 'blog-article' && SISI_MARK.test(block.text)) {
          if (WALK_IN.test(sentence) && /wst[ęe]p/i.test(sentence)) {
            out.claims.push({ claim: 'walk-in-entry', text: sentence, place: { kind: 'dist', path: page.path, locale: page.locale } });
          }
          if (UNTIL_MORNING.test(sentence) && SISI_MARK.test(block.text)) {
            out.claims.push({ claim: LIVE_MUSIC.test(sentence) ? 'live-music-until-morning' : 'until-morning', text: sentence, place: { kind: 'dist', path: page.path, locale: page.locale } });
          }
        }
      }
    }
    // links: tel, mailto, maps, social
    for (const link of surface.links) {
      out.links.push({ ...link, page: page.path, locale: page.locale, region: 'link' });
    }
  }
  out.pages = pages;
  return pages;
}

function collectLlms(distDir, X, out) {
  for (const name of ['llms.txt']) {
    const file = join(distDir, name);
    if (!existsSync(file)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const sentence of splitSentences(line)) {
        for (const occ of extractFacts(sentence)) {
          const verdict = judge(occ, X, { sisi: true });
          if (verdict.verdict === 'ignore') continue;
          out.occurrences.push({ ...occ, ...verdict, place: { kind: 'llms', path: `/${name}`, line: i + 1, locale: 'pl', region: 'text', sentence } });
        }
      }
    });
  }
}

const SOURCE_FILES = [
  'src/i18n/ui/pl.ts',
  'src/i18n/ui/en.ts',
  'src/i18n/ui/de.ts',
  'src/i18n/ui/it.ts',
  'src/i18n/ui/cs.ts',
  'src/i18n/legal.ts',
  'src/data/site.ts',
  'src/data/home-night.ts',
  'src/lib/opening-hours.mjs',
  'src/lib/llms-map.ts',
  'src/components/pages/MenuPage.astro',
  'src/components/EventCard.astro',
  'src/components/pages/EventDetailPage.astro',
];

function sourceLocale(file, line, state) {
  const ui = file.match(/ui\/(pl|en|de|it|cs)\.ts$/);
  if (ui) return ui[1];
  if (file.endsWith('legal.ts')) {
    const decl = line.match(/^const (pl|en)_(terms|privacy|cookies)\b/);
    if (decl) state.legal = decl[1];
    else if (/^const LEGAL\b/.test(line)) state.legal = null;
    return state.legal ?? '-';
  }
  if (file.endsWith('home-night.ts') || file.endsWith('home-menu.ts')) {
    const open = line.match(/^ {2}(pl|en|de|it|cs): \{/);
    if (open) state.nested = open[1];
    return state.nested ?? '-';
  }
  return file.endsWith('llms-map.ts') || file.endsWith('opening-hours.mjs') || file.endsWith('site.ts') ? 'pl' : '-';
}

function collectSource(X, out) {
  for (const file of SOURCE_FILES) {
    const path = join(REPO_ROOT, file);
    if (!existsSync(path)) continue;
    const state = {};
    readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
      const locale = sourceLocale(file, line, state);
      const text = line.replace(/\\'/g, "'");
      for (const sentence of splitSentences(text)) {
        for (const occ of extractFacts(sentence)) {
          if (occ.type === 'brand' || occ.type === 'closure') continue;
          const verdict = judge(occ, X, { sisi: true });
          if (verdict.verdict === 'ignore') continue;
          out.occurrences.push({ ...occ, ...verdict, place: { kind: 'source', path: file, line: index + 1, locale, region: 'source', sentence: sentence.trim() } });
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Rule coverage
// ---------------------------------------------------------------------------

function ruleMatrix(pages, llmsText) {
  const surfaces = [];
  for (const kind of ['reservations', 'terms']) {
    for (const locale of LOCALES) {
      const page = pages.find((p) => p.kind === kind && p.locale === locale);
      if (!page) continue;
      const text = [...page.surface.regions.main, page.surface.meta.description ?? ''].join('\n');
      surfaces.push({ id: `${kind}/${locale}`, kind, locale, path: page.path, hits: new Set(ruleHits(text)) });
    }
  }
  if (llmsText) surfaces.push({ id: 'llms.txt', kind: 'llms', locale: 'pl', path: '/llms.txt', hits: new Set(ruleHits(llmsText)) });
  const rows = RULES.map((rule) => ({
    rule: rule.id,
    label: rule.label,
    cells: Object.fromEntries(surfaces.map((s) => [s.id, s.hits.has(rule.id)])),
  }));
  const missingFromTerms = [];
  for (const locale of LOCALES) {
    const res = surfaces.find((s) => s.id === `reservations/${locale}`);
    const terms = surfaces.find((s) => s.id === `terms/${locale}`);
    if (!res || !terms) continue;
    for (const rule of RULES) {
      if (res.hits.has(rule.id) && !terms.hits.has(rule.id)) missingFromTerms.push({ locale, rule: rule.id, label: rule.label });
    }
  }
  return { surfaces: surfaces.map(({ id, kind, locale, path }) => ({ id, kind, locale, path })), rows, missingFromTerms };
}

// ---------------------------------------------------------------------------
// Menu diff
// ---------------------------------------------------------------------------

function expectedMenu(venue, locale) {
  const { MENU, describeItem, formatPriceOptions, formatVolumeOptions, formatSizedPrices, formatPln, portionLabel } = venue;
  const bar = [];
  for (const section of MENU.sections) {
    for (const item of section.items) {
      if (section.id === 'champagne') {
        bar.push({ kind: 'champ', name: item.name.value, price: formatSizedPrices(item.options) });
      } else if (section.id === 'wines') {
        const info = item.wine;
        const glass = item.options.find((o) => o.volumeMl?.value === 150);
        const bottle = item.options.find((o) => o.volumeMl?.value === 750);
        const meta = [info.dryness && MENU.labels.dryness[info.dryness.value][locale].value, info.grapes?.value.join(', ')].filter(Boolean).join(' · ');
        bar.push({
          kind: 'wine',
          name: `${item.name.value}${info.vintage ? ` ${info.vintage.value}` : ''}`,
          winery: `– ${info.winery.value}`,
          featured: info.featured ? MENU.labels.featured[locale].value : undefined,
          meta: meta || undefined,
          region: info.region?.value,
          glass: glass ? formatPln(glass.pricePln.value) : '—',
          bottle: formatPln(bottle.pricePln.value),
        });
      } else {
        bar.push({
          kind: 'item',
          name: item.name.value,
          desc: describeItem(item, locale, MENU.glossary, section.id === 'beer') || undefined,
          vol: formatVolumeOptions(item.options) || undefined,
          price: formatPriceOptions(item.options),
        });
      }
    }
  }
  const food = MENU.food.sections.flatMap((section) =>
    section.dishes.map((dish) => ({
      name: dish.name[locale].value,
      badges: [dish.diet && MENU.labels.diet[dish.diet.value][locale].value, dish.spicy && MENU.labels.spicy[locale].value].filter(Boolean),
      desc: dish.desc?.[locale].value,
      prices: dish.options.map((option) => ({
        qty: option.portion ? portionLabel(option.portion.value, locale, MENU.labels) : undefined,
        price: formatPln(option.pricePln.value),
      })),
    })),
  );
  return { bar, food, foodSections: MENU.food.sections.map((s) => s.title[locale].value) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function menuDiff(venue, menuPages) {
  const result = [];
  for (const page of menuPages) {
    const printed = parseMenuPage(page.surface.html);
    const expected = expectedMenu(venue, page.locale);
    const problems = [];
    const clean = (row) => JSON.parse(JSON.stringify(row));
    const n = Math.max(printed.bar.length, expected.bar.length);
    for (let i = 0; i < n; i += 1) {
      const got = printed.bar[i] && clean(printed.bar[i]);
      const want = expected.bar[i] && clean(expected.bar[i]);
      if (!same(got, want)) problems.push({ where: `bar row ${i + 1}`, printed: got, venue: want });
    }
    const m = Math.max(printed.food.length, expected.food.length);
    for (let i = 0; i < m; i += 1) {
      const got = printed.food[i] && clean(printed.food[i]);
      const want = expected.food[i] && clean(expected.food[i]);
      if (!same(got, want)) problems.push({ where: `food dish ${i + 1}`, printed: got, venue: want });
    }
    if (!same(printed.foodSections, expected.foodSections)) problems.push({ where: 'food section titles', printed: printed.foodSections, venue: expected.foodSections });
    result.push({
      locale: page.locale,
      path: page.path,
      barPrinted: printed.bar.length,
      barVenue: expected.bar.length,
      foodPrinted: printed.food.length,
      foodVenue: expected.food.length,
      pricedFoodPrinted: printed.food.filter((d) => d.prices.length > 0).length,
      problems,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Links and JSON-LD
// ---------------------------------------------------------------------------

function checkLinks(V, links, out) {
  const problems = [];
  const counts = { emenago: 0, tel: 0, mailto: 0, maps: 0, social: 0 };
  const R = V.reservations;
  const known = {
    tel: new Set([`tel:${V.contacts.phone.value.e164}`, `tel:${V.contacts.eventsPhone.value.e164}`]),
    mailto: new Set([V.contacts.email.value, V.contacts.eventsEmail.value].map((e) => `mailto:${e}`)),
    social: new Set([V.socials.instagram.value, V.socials.facebook.value, V.socials.tripadvisor.value]),
  };
  for (const link of links) {
    const { href, page, locale } = link;
    if (/emenago\.com/.test(href)) {
      counts.emenago += 1;
      const url = new URL(href);
      const base = `${url.origin}${url.pathname.replace(/\/[^/]+$/, '')}`;
      const segment = url.pathname.split('/').pop();
      const want = R.provider.localeSegment[locale]?.value;
      if (base !== R.provider.baseUrl.value) problems.push({ page, href, message: 'base URL differs from venue provider.baseUrl' });
      if (want && segment !== want) problems.push({ page, href, message: `segment "${segment}" but venue says "${want}" for ${locale}` });
      const utm = R.provider.utm.value;
      if (url.search) {
        const params = url.searchParams;
        if (params.get('utm_source') !== utm.source || params.get('utm_medium') !== utm.medium || params.get('utm_campaign') !== utm.campaign) {
          problems.push({ page, href, message: 'utm parameters differ from venue provider.utm' });
        }
        if (!R.provider.ctaLocations.value.includes(params.get('utm_content'))) problems.push({ page, href, message: `utm_content "${params.get('utm_content')}" is not a listed CTA location` });
      }
    } else if (href.startsWith('tel:')) {
      counts.tel += 1;
      if (!known.tel.has(href)) problems.push({ page, href, message: 'tel: link is not a venue phone' });
    } else if (href.startsWith('mailto:')) {
      counts.mailto += 1;
      const address = href.split('?')[0];
      if (!known.mailto.has(address)) problems.push({ page, href, message: 'mailto: link is not a venue e-mail' });
    } else if (/google\.[a-z.]+\/maps/.test(href)) {
      counts.maps += 1;
      if (href !== V.address.mapsUrl.value) problems.push({ page, href, message: 'maps link differs from venue address.mapsUrl' });
    } else if (/instagram\.com|facebook\.com|tripadvisor\./.test(href)) {
      counts.social += 1;
      if (!known.social.has(href)) problems.push({ page, href, message: 'social link is not a venue social' });
    }
  }
  out.links = { counts, problems };
}

function checkJsonLd(V, pages) {
  const checks = [];
  const fail = [];
  const R = V.reservations;
  const expectAddress = () => ({
    streetAddress: V.address.street.value,
    addressLocality: V.address.city.value,
    addressRegion: V.address.region.value,
    postalCode: V.address.postalCode.value,
    addressCountry: V.address.country.value,
  });
  const cmp = (page, node, key, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    checks.push({ page: page.path, node, key, ok });
    if (!ok) fail.push({ page: page.path, node, key, actual, expected });
  };
  for (const page of pages) {
    if (!page.locale) continue;
    const graph = page.surface.jsonld.flatMap((doc) => doc['@graph'] ?? []);
    const byType = (type) => graph.find((n) => n['@type'] === type);
    const org = byType('Organization');
    const venue = byType('EventVenue');
    const club = byType('NightClub');
    const site = byType('WebSite');
    if (!org || !venue || !club || !site) continue;
    const le = V.identity.legalEntity;
    const id = (name) => org.identifier?.find((i) => i.propertyID === name)?.value;
    cmp(page, 'Organization', 'name', org.name, le.legalName.value);
    cmp(page, 'Organization', 'alternateName', org.alternateName, le.tradeName.value);
    cmp(page, 'Organization', 'taxID', org.taxID, le.nip.value);
    cmp(page, 'Organization', 'KRS', id('KRS'), le.krs.value);
    cmp(page, 'Organization', 'REGON', id('REGON'), le.regon.value);
    cmp(page, 'Organization', 'address', org.address && { ...org.address, '@type': undefined }, { ...expectAddress(), '@type': undefined });
    cmp(page, 'Organization', 'email', org.email, V.contacts.email.value);
    cmp(page, 'Organization', 'telephone', org.telephone, V.contacts.phone.value.e164);
    cmp(page, 'EventVenue', 'name', venue.name, V.identity.complexName.value);
    cmp(page, 'EventVenue', 'url', venue.url, V.identity.complexUrl.value);
    cmp(page, 'EventVenue', 'email', venue.email, V.contacts.eventsEmail.value);
    cmp(page, 'EventVenue', 'telephone', venue.telephone, V.contacts.eventsPhone.value.e164);
    cmp(page, 'EventVenue', 'geo', [venue.geo?.latitude, venue.geo?.longitude], [V.address.coordinates.latitude.value, V.address.coordinates.longitude.value]);
    cmp(page, 'NightClub', 'name', club.name, V.identity.brandName.value);
    cmp(page, 'NightClub', 'description', club.description, V.identity.description[page.locale].value);
    cmp(page, 'NightClub', 'telephone', club.telephone, V.contacts.phone.value.e164);
    cmp(page, 'NightClub', 'email', club.email, V.contacts.email.value);
    cmp(page, 'NightClub', 'priceRange', club.priceRange, V.identity.priceRangeSymbol.value);
    cmp(page, 'NightClub', 'geo', [club.geo?.latitude, club.geo?.longitude], [V.address.coordinates.latitude.value, V.address.coordinates.longitude.value]);
    cmp(page, 'NightClub', 'hasMap', club.hasMap, V.address.mapsUrl.value);
    cmp(
      page,
      'NightClub',
      'openingHoursSpecification',
      club.openingHoursSpecification?.map((h) => [h.dayOfWeek, h.opens, h.closes]),
      V.hours.nights.map((n) => [n.day[0].toUpperCase() + n.day.slice(1), n.opens.value, n.closes.value]),
    );
    cmp(page, 'NightClub', 'sameAs', club.sameAs, [V.socials.instagram.value, V.socials.facebook.value, V.socials.tripadvisor.value]);
    cmp(
      page,
      'NightClub',
      'reserve urlTemplate',
      club.potentialAction?.target?.urlTemplate,
      `${R.provider.baseUrl.value}/${R.provider.localeSegment[page.locale].value}`,
    );
    cmp(page, 'WebSite', 'name', site.name, V.identity.brandName.value);
  }
  return { checks: checks.length, failed: fail };
}

function checkTagline(V, pages) {
  const results = [];
  for (const locale of LOCALES) {
    const home = pages.find((p) => p.kind === 'home' && p.locale === locale);
    if (!home) continue;
    const h1 = home.surface.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '';
    const text = h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    results.push({ locale, printed: text, venue: V.identity.tagline[locale].value, ok: text === V.identity.tagline[locale].value });
  }
  return results;
}

function checkFooter(V, pages) {
  const bad = [];
  let checked = 0;
  for (const page of pages) {
    if (!page.locale) continue;
    const footer = page.surface.regions.footer.join(' | ');
    checked += 1;
    const want = [V.hours.daysLabel[page.locale].value, V.hours.displayRange.value, V.contacts.email.value, V.contacts.phone.value.display, V.address.oneLine.value];
    for (const w of want) if (!footer.includes(w)) bad.push({ page: page.path, missing: w });
  }
  return { checked, bad };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function placeLabel(p) {
  const where = p.kind === 'source' ? `${p.path}:${p.line}` : p.kind === 'llms' ? `${p.path}:${p.line}` : p.path;
  const loc = p.locale && p.locale !== '-' ? ` (${p.locale})` : '';
  const region = p.region && !['source', 'main', 'text'].includes(p.region) ? ` [${p.region}]` : '';
  return `${where}${loc}${region}`;
}

function summarizePlaces(places, limit) {
  const seen = new Set();
  const labels = [];
  for (const p of places) {
    const label = placeLabel(p);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  if (labels.length <= limit) return labels.join('; ');
  return `${labels.slice(0, limit).join('; ')}; +${labels.length - limit} more`;
}

/** Group by fact, then by found value. */
function groupOccurrences(occurrences) {
  const facts = new Map();
  for (const occ of occurrences) {
    if (!occ.fact) continue;
    if (!facts.has(occ.fact)) facts.set(occ.fact, new Map());
    const key = `${occ.verdict}|${occ.value}${occ.note ? `|${occ.note}` : ''}`;
    const values = facts.get(occ.fact);
    if (!values.has(key)) values.set(key, { verdict: occ.verdict, value: occ.value, raw: occ.raw, expected: occ.expected, note: occ.note, places: [] });
    values.get(key).places.push(occ.place);
  }
  return facts;
}

function buildReport(ctx) {
  const { V, out, args } = ctx;
  const grouped = groupOccurrences(out.occurrences);
  const limit = args.all ? Infinity : 8;

  const disagreements = [];
  for (const [fact, values] of grouped) {
    const rows = [...values.values()];
    const bad = rows.filter((r) => r.verdict === 'diff');
    if (bad.length === 0) continue;
    const venueValue = rows.find((r) => r.expected !== undefined)?.expected;
    for (const r of bad) {
      disagreements.push({
        fact,
        label: FACT_LABEL[fact] ?? fact,
        venue: String(r.expected ?? venueValue),
        found: r.raw && r.value !== r.raw ? `${r.value} ("${r.raw}")` : String(r.value),
        note: r.note,
        count: r.places.length,
        places: summarizePlaces(r.places, limit),
        placesFull: r.places.map(placeLabel),
        sources: [...new Set(r.places.filter((p) => p.kind === 'source').map((p) => `${p.path}:${p.line}`))],
      });
    }
  }
  return { grouped, disagreements };
}

const md = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function renderMarkdown(ctx, report) {
  const { V, out, rules, menu, jsonld, tagline, footer, citations } = ctx;
  const lines = [];
  const p = (s = '') => lines.push(s);

  p('## Generated by scripts/venue-inventory.mjs');
  p();
  p(`Input: ${out.pages.length} built pages under dist/ (${out.pages.filter((x) => x.kind === 'blog-article').length} blog posts), llms.txt, ${SOURCE_FILES.length} source files. Venue record: repo commit ${V.snapshot.repoCommit}. **Confirmed (local build)**: nothing here was seen on production.`);
  p();

  p('### Disagreements between places and venue.ts');
  p();
  if (report.disagreements.length === 0) p('None found.');
  else {
    p('| Fact | venue.ts holds | Found | Places | Where |');
    p('|---|---|---|---|---|');
    for (const d of report.disagreements) {
      p(`| ${md(d.label)} | ${md(d.venue)} | ${md(d.found)}${d.note ? ` (${md(d.note)})` : ''} | ${d.count} | ${md(d.places)} |`);
    }
  }
  p();

  p('### Rule coverage: which page states which rule');
  p();
  const cols = rules.surfaces.map((s) => s.id);
  p(`| Rule | ${cols.join(' | ')} |`);
  p(`|---|${cols.map(() => '---').join('|')}|`);
  for (const row of rules.rows) p(`| ${row.rule} | ${cols.map((c) => (row.cells[c] ? 'yes' : '**no**')).join(' | ')} |`);
  p();
  p('Stated on the reservations page and absent from the terms of the same language:');
  p();
  if (rules.missingFromTerms.length === 0) p('None.');
  else {
    const byRule = new Map();
    for (const m of rules.missingFromTerms) byRule.set(m.rule, [...(byRule.get(m.rule) ?? []), m.locale]);
    for (const [rule, locales] of byRule) p(`- ${rule}: ${locales.join(', ')}`);
  }
  p();

  p('### Menu: printed rows against venue.ts');
  p();
  p('| Locale | Bar rows printed | Bar rows in venue.ts | Dishes printed | Dishes in venue.ts | Dishes with a price | Rows that differ |');
  p('|---|---|---|---|---|---|---|');
  for (const m of menu) p(`| ${m.locale} | ${m.barPrinted} | ${m.barVenue} | ${m.foodPrinted} | ${m.foodVenue} | ${m.pricedFoodPrinted} | ${m.problems.length} |`);
  p();

  p('### JSON-LD, links, footer, hero');
  p();
  p(`- JSON-LD: ${jsonld.checks} field comparisons on ${out.pages.filter((x) => x.locale).length} pages, ${jsonld.failed.length} differ.`);
  p(`- Links: ${out.links.counts.emenago} booking, ${out.links.counts.tel} tel:, ${out.links.counts.mailto} mailto:, ${out.links.counts.maps} maps, ${out.links.counts.social} social; ${out.links.problems.length} differ.`);
  p(`- Footer: ${footer.checked} pages checked for days, hours, e-mail, phone, address; ${footer.bad.length} gaps.`);
  p(`- Hero slogan equals the venue tagline: ${tagline.filter((t) => t.ok).length} of ${tagline.length} locales.`);
  p();

  p('### Every value found, by fact');
  p();
  p('| Fact | Value found | Verdict | Places | Where (first 6) |');
  p('|---|---|---|---|---|');
  for (const [fact, values] of [...report.grouped].sort(([a], [b]) => a.localeCompare(b))) {
    for (const r of [...values.values()].sort((a, b) => String(a.value).localeCompare(String(b.value)))) {
      p(`| ${md(FACT_LABEL[fact] ?? fact)} | ${md(r.raw && r.value !== r.raw ? `${r.value} ("${r.raw}")` : r.value)} | ${r.verdict}${r.note ? ` (${md(r.note)})` : ''} | ${r.places.length} | ${md(summarizePlaces(r.places, 6))} |`);
    }
  }
  p();

  if (out.claims.length) {
    p('### Blog claims about the club that the site does not state');
    p();
    const byClaim = new Map();
    for (const c of out.claims) byClaim.set(c.claim, [...(byClaim.get(c.claim) ?? []), c]);
    for (const [claim, list] of byClaim) {
      p(`- **${claim}** (${list.length}):`);
      for (const c of list) p(`  - ${c.place.path}: "${md(c.text.slice(0, 220))}"`);
    }
    p();
  }

  p('### Citations in venue.ts');
  p();
  p(`${citations.facts} facts checked: ${citations.hard} citations point at a file that lacks the value or a wrong range, ${citations.soft} point at a line that moved.`);
  p();
  return lines.join('\n');
}

function printConsole(ctx, report) {
  const { out, rules, menu, jsonld, tagline, footer, citations, args } = ctx;
  const line = (s = '') => console.log(s);
  line(`Venue inventory: ${out.pages.length} pages, ${out.occurrences.length} occurrences kept, ${SOURCE_FILES.length} source files`);
  line();
  line('== Disagreements between places and venue.ts ==');
  if (report.disagreements.length === 0) line('  none');
  for (const d of report.disagreements) {
    line(`  ${d.label}: venue.ts holds ${d.venue}; found ${d.found}${d.note ? ` (${d.note})` : ''} at ${d.count} place(s)`);
    line(`      ${d.places}`);
  }
  line();
  line('== Rule coverage (reservations page vs terms) ==');
  for (const m of rules.missingFromTerms) line(`  ${m.locale}: "${m.rule}" is on the reservations page and not in the terms`);
  if (rules.missingFromTerms.length === 0) line('  none missing');
  line();
  line('== Menu ==');
  for (const m of menu) line(`  ${m.locale}: ${m.barPrinted}/${m.barVenue} bar rows, ${m.foodPrinted}/${m.foodVenue} dishes (${m.pricedFoodPrinted} priced), ${m.problems.length} row(s) differ`);
  for (const m of menu) for (const prob of m.problems.slice(0, 3)) line(`      ${m.locale} ${prob.where}: printed ${JSON.stringify(prob.printed)} venue ${JSON.stringify(prob.venue)}`);
  line();
  line('== JSON-LD, links, footer, hero ==');
  line(`  JSON-LD: ${jsonld.checks} comparisons, ${jsonld.failed.length} differ`);
  for (const f of jsonld.failed.slice(0, 10)) line(`      ${f.page} ${f.node}.${f.key}: ${JSON.stringify(f.actual)} vs ${JSON.stringify(f.expected)}`);
  line(`  links: ${JSON.stringify(out.links.counts)}, ${out.links.problems.length} differ`);
  for (const f of out.links.problems.slice(0, 10)) line(`      ${f.page}: ${f.message} (${f.href})`);
  line(`  footer: ${footer.checked} pages, ${footer.bad.length} gaps`);
  line(`  hero slogan: ${tagline.filter((t) => t.ok).length}/${tagline.length} locales equal the venue tagline`);
  for (const t of tagline.filter((x) => !x.ok)) line(`      ${t.locale}: printed "${t.printed}" venue "${t.venue}"`);
  line();
  line('== Every value found, by fact ==');
  for (const [fact, values] of [...report.grouped].sort(([a], [b]) => a.localeCompare(b))) {
    line(`  ${FACT_LABEL[fact] ?? fact}`);
    for (const r of [...values.values()].sort((a, b) => String(a.value).localeCompare(String(b.value)))) {
      line(`    ${String(r.value).padEnd(24)} ${r.verdict.padEnd(15)} x${String(r.places.length).padEnd(4)} ${args.verbose ? '' : summarizePlaces(r.places, 4)}`);
      if (args.verbose) for (const place of r.places) line(`        ${placeLabel(place)}  "${(place.sentence ?? '').slice(0, 110)}"`);
    }
  }
  if (out.claims.length) {
    line();
    line('== Blog claims the site does not state ==');
    for (const c of out.claims) line(`  [${c.claim}] ${c.place.path}: "${c.text.slice(0, 160)}"`);
  }
  line();
  line('== Citations in venue.ts ==');
  line(`  ${citations.facts} facts, ${citations.hard} wrong citation(s), ${citations.soft} moved line(s)`);
  for (const c of citations.problems.slice(0, 20)) line(`      [${c.level}] ${c.path}: ${c.ref}: ${c.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.dist)) {
    console.error(`No build at ${args.dist}. Run \`npm run build\` first.`);
    process.exit(2);
  }
  const { venue, cleanup } = await loadVenue();
  const routesLoad = await loadTs(join(REPO_ROOT, 'src/i18n/routes.ts'), { root: REPO_ROOT });
  try {
    const V = venue.VENUE;
    const X = expectations(V);
    const out = { occurrences: [], claims: [], links: [], menuPages: [], pages: [] };

    const pages = collectDist(args.dist, routesLoad.module, X, out);
    collectLlms(args.dist, X, out);
    collectSource(X, out);
    const llmsPath = join(args.dist, 'llms.txt');
    const llmsText = existsSync(llmsPath) ? readFileSync(llmsPath, 'utf8') : '';

    const links = out.links;
    checkLinks(V, links, out);
    const rules = ruleMatrix(pages, llmsText);
    const menu = menuDiff(venue, out.menuPages);
    const jsonld = checkJsonLd(V, pages);
    const tagline = checkTagline(V, pages);
    const footer = checkFooter(V, pages);

    const read = makeReader(REPO_ROOT);
    const problems = [];
    let facts = 0;
    for (const { path, kind, node } of walkVenue(V)) {
      if (kind !== 'fact') continue;
      facts += 1;
      for (const problem of [...checkSources(node, read), ...checkContradictions(node, read)]) problems.push({ path, ...problem });
    }
    const citations = {
      facts,
      hard: problems.filter((x) => x.level === 'hard').length,
      soft: problems.filter((x) => x.level === 'soft').length,
      problems,
    };

    const ctx = { V, out, rules, menu, jsonld, tagline, footer, citations, args };
    const report = buildReport(ctx);
    printConsole(ctx, report);

    if (args.markdown) writeFileSync(args.markdown, `${renderMarkdown(ctx, report)}\n`);
    if (args.json) {
      writeFileSync(
        args.json,
        `${JSON.stringify(
          {
            disagreements: report.disagreements,
            occurrences: out.occurrences.map(({ place, ...rest }) => ({ ...rest, place })),
            rules,
            menu,
            jsonld,
            links: out.links,
            tagline,
            footer,
            claims: out.claims,
            citations: { facts, hard: citations.hard, soft: citations.soft, problems },
          },
          null,
          2,
        )}\n`,
      );
    }

    const failed =
      report.disagreements.length > 0 ||
      menu.some((m) => m.problems.length > 0) ||
      jsonld.failed.length > 0 ||
      out.links.problems.length > 0 ||
      (args.verifySources && citations.hard + citations.soft > 0);
    if (args.failOnDiff && failed) process.exitCode = 1;
    if (args.verifySources && citations.hard > 0) process.exitCode = 1;
  } finally {
    cleanup();
    routesLoad.cleanup();
  }
}

await main();
