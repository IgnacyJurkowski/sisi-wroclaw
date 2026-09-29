/* Invariants of the venue record (src/content/venue).
 *
 * 1. Provenance: every fact carries a source that points at a real file, real
 *    lines and the value; nothing outside a Fact holds data; nothing is CONFIRMED
 *    without a named person and a date.
 * 2. Gaps: every missing fact is a Gap with a row in gaps.ts, and the brief's list
 *    of required gaps is complete.
 * 3. Arithmetic: totalForParty() and the reservation rules.
 * 4. Hours: the business-night rule and the closure history.
 * 5. Menu: ids, numbers, the real dish count, and that the migration from
 *    bar-menu.ts and food-menu.ts lost nothing.
 * 6. Agreement with the code that renders the pages today (site.ts).
 *
 * Set VENUE_STRICT_LINES=1 to fail (not just report) when a value is in the cited
 * file but no longer on the cited line.
 */

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadTs } from './lib/load-ts.mjs';
import { loadVenue, REPO_ROOT } from './lib/load-venue.mjs';
import {
  bareLeaves,
  checkContradictions,
  checkSources,
  evidenceRef,
  makeReader,
  parseRef,
  toRefs,
  walkVenue,
} from './lib/venue-verify.mjs';
import { buildExport, gapsMarkdown, toJson } from './venue-export.mjs';

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
const STRICT_LINES = process.env.VENUE_STRICT_LINES === '1';

let venue;
let VENUE;
let read;
let records;
const cleanups = [];

before(async () => {
  const loaded = await loadVenue();
  venue = loaded.venue;
  VENUE = venue.VENUE;
  cleanups.push(loaded.cleanup);
  read = makeReader(REPO_ROOT);
  records = [...walkVenue(VENUE)];
});
after(() => cleanups.forEach((fn) => fn()));

const facts = () => records.filter((r) => r.kind === 'fact');
const gaps = () => records.filter((r) => r.kind === 'gap');
const loadSource = async (file) => {
  const loaded = await loadTs(join(REPO_ROOT, file), { root: REPO_ROOT });
  cleanups.push(loaded.cleanup);
  return loaded.module;
};

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

test('the record is not empty and every leaf is a Fact or a Gap', () => {
  assert.ok(facts().length > 1000, `expected the full record, found ${facts().length} facts`);
  assert.ok(gaps().length > 100);
  assert.deepEqual(
    bareLeaves(VENUE),
    [],
    'a value outside a Fact has no source: wrap it with pending(value, "file:line")',
  );
});

test('every fact names where it appears, in a valid form', () => {
  for (const { path, node } of facts()) {
    const refs = toRefs(node.source);
    assert.ok(refs.length > 0, `${path} has no source`);
    for (const ref of refs) assert.ok(parseRef(ref), `${path} has a malformed source: ${ref}`);
    assert.ok(['PENDING', 'CONFIRMED'].includes(node.status), `${path} has status ${node.status}`);
  }
});

test('every cited file exists and every cited line is inside it', () => {
  const structural = /malformed|does not exist|outside the file/;
  const bad = [];
  for (const { path, node } of facts()) {
    for (const problem of [...checkSources(node, read), ...checkContradictions(node, read)]) {
      if (structural.test(problem.message)) bad.push(`${path}: ${problem.ref}: ${problem.message}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('the value of every fact is in the file it cites', () => {
  const bad = [];
  for (const { path, node } of facts()) {
    for (const problem of checkSources(node, read)) {
      if (problem.level === 'hard') bad.push(`${path}: ${problem.ref}: ${problem.message}`);
    }
  }
  assert.deepEqual(bad, [], 'a cited file no longer holds the value: update the fact or the source');
});

test('the value of every fact is on the line it cites', (t) => {
  const moved = [];
  for (const { path, node } of facts()) {
    for (const problem of checkSources(node, read)) {
      if (problem.level === 'soft') moved.push(`${path}: ${problem.ref}: ${problem.message}`);
    }
  }
  if (moved.length) t.diagnostic(`${moved.length} citation(s) point at a line that moved:\n${moved.slice(0, 20).join('\n')}`);
  if (STRICT_LINES) assert.deepEqual(moved, []);
});

test('contradicting values cite real lines that hold them', () => {
  const withContradictions = facts().filter(({ node }) => node.contradictedBy?.length);
  assert.ok(withContradictions.length >= 3, 'the Saturday fee, the arrival window and the ID rule are recorded');
  const bad = [];
  for (const { path, node } of withContradictions) {
    for (const problem of checkContradictions(node, read)) {
      if (problem.level === 'hard') bad.push(`${path}: ${problem.ref}: ${problem.message}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('nothing is CONFIRMED unless a named person and a date say so', () => {
  const confirmed = facts().filter(({ node }) => node.status === 'CONFIRMED');
  for (const { path, node } of confirmed) {
    assert.ok(node.confirmedBy && !/claude|agent|bot|\bai\b/i.test(node.confirmedBy), `${path} needs a human confirmedBy`);
    assert.match(node.confirmedOn ?? '', /^\d{4}-\d{2}-\d{2}$/, `${path} needs a confirmedOn date`);
  }
  // Phase 3a ships every fact PENDING. Ignacy confirms; when he does, raise this number.
  const EXPECTED_CONFIRMED = 0;
  assert.equal(confirmed.length, EXPECTED_CONFIRMED);
});

test('the types reject an unsourced fact at compile time', () => {
  const guard = readFileSync(join(REPO_ROOT, 'src/content/venue/types.check.ts'), 'utf8');
  const expected = guard.match(/@ts-expect-error/g) ?? [];
  assert.ok(expected.length >= 10, 'types.check.ts must keep its @ts-expect-error examples; `npm run check` enforces them');
  assert.match(guard, /a fact without a source does not compile/);
});

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

test('every Gap points at a row in the gap log and shows that row\'s placeholder', () => {
  const { GAPS } = venue;
  for (const { path, node } of gaps()) {
    const row = GAPS[node.gap];
    assert.ok(row, `${path} uses gap ${node.gap}, which has no row in gaps.ts`);
    assert.equal(node.value, null, `${path} must not carry a value`);
    assert.equal(node.status, 'PENDING');
    assert.equal(node.placeholder, row.placeholder);
  }
});

test('every missing fact is used in the record and every decision has a contradiction', () => {
  const { GAPS, GAP_IDS } = venue;
  const used = new Set(gaps().map(({ node }) => node.gap));
  const contradicted = new Set(
    facts().flatMap(({ node }) => (node.contradictedBy ?? []).map((other) => other.gap).filter(Boolean)),
  );
  for (const id of GAP_IDS) {
    const row = GAPS[id];
    assert.equal(row.id, id);
    if (row.kind === 'missing') assert.ok(used.has(id), `${id} is logged but no field in venue.ts is a Gap for it`);
    else assert.ok(contradicted.has(id), `${id} is a decision but no fact lists a contradiction for it`);
  }
  assert.deepEqual(Object.keys(GAPS).sort(), [...GAP_IDS].sort());
});

test('gap rows are complete, PENDING, and cite evidence that exists', () => {
  const { GAPS } = venue;
  const placeholders = new Set();
  for (const row of Object.values(GAPS)) {
    for (const key of ['what', 'why', 'where']) assert.ok(row[key].length > 10, `${row.id}.${key} is empty`);
    assert.ok(row.owner.length >= 5, `${row.id}.owner is empty`);
    assert.equal(row.status, 'PENDING');
    assert.match(row.placeholder, /^\[[A-Z0-9/-]+\?\]$/, `${row.id} placeholder`);
    assert.ok(['Confirmed', 'Assumption', 'Inference', 'Rec'].includes(row.basis));
    assert.ok(row.evidence.length > 0, `${row.id} has no evidence`);
    for (const entry of row.evidence) {
      const ref = parseRef(evidenceRef(entry));
      assert.ok(ref, `${row.id} evidence is not a file:line: ${entry}`);
      const lines = read(ref.file);
      assert.ok(lines, `${row.id} evidence file is missing: ${ref.file}`);
      assert.ok(ref.to <= lines.length, `${row.id} evidence line is outside ${ref.file}`);
    }
    if (row.placeholder !== '[PRICE?]') assert.ok(!placeholders.has(row.placeholder), `${row.id} placeholder is not unique`);
    placeholders.add(row.placeholder);
  }
});

test('the gaps the brief asks for are all logged', () => {
  const required = [
    'LINEUP', 'ARTISTS', 'EVENT_DATES', 'DJ_START', 'ALLERGENS', 'ABV', 'FOOD_MENU', 'CAPACITY', 'TABLE_MINIMUM',
    'PARTY_PRICE', 'ENTRANCE', 'STEP_FREE', 'PARKING', 'TRANSPORT', 'COORDINATES', 'CHIVAS_ZONE', 'PHOTO_RIGHTS',
    'PRESS', 'REVIEWS', 'AGE_NOTICE', 'PREPAYMENT_TERM', 'REFUND_RULES', 'CS_BOOKING', 'LEGAL_TRANSLATIONS',
  ];
  for (const id of required) assert.ok(venue.GAPS[id], `gap ${id} is missing`);
  assert.match(venue.GAPS.CHIVAS_ZONE.owner, /Ignacy and a lawyer/);
  assert.match(venue.GAPS.LINEUP.placeholder, /LINEUP/);
});

test('the generated gap log lists every row', () => {
  const markdown = gapsMarkdown(venue);
  for (const id of venue.GAP_IDS) assert.ok(markdown.includes(`| ${id} |`), `${id} missing from GAPS.md output`);
  assert.doesNotMatch(markdown, /—/, 'no em dashes in the generated document');
});

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

test('totalForParty: Saturday for 6 is 600 credited + 240 entry = 840 out of pocket', () => {
  assert.deepEqual(venue.totalForParty('saturday', 6), {
    day: 'saturday',
    people: 6,
    creditedPln: 600,
    entryPln: 240,
    outOfPocketPln: 840,
  });
});

test('totalForParty: Friday for 6 is 600 credited and no entry', () => {
  assert.deepEqual(venue.totalForParty('friday', 6), {
    day: 'friday',
    people: 6,
    creditedPln: 600,
    entryPln: 0,
    outOfPocketPln: 600,
  });
});

test('totalForParty is linear and credits exactly the deposit', () => {
  for (const day of ['friday', 'saturday']) {
    const one = venue.totalForParty(day, 1);
    for (const n of [2, 3, 7, 12]) {
      const total = venue.totalForParty(day, n);
      assert.equal(total.creditedPln, one.creditedPln * n);
      assert.equal(total.entryPln, one.entryPln * n);
      assert.equal(total.outOfPocketPln, total.creditedPln + total.entryPln);
    }
  }
  assert.equal(venue.totalForParty('saturday', 1).outOfPocketPln, 140);
});

test('totalForParty refuses a day without a rule and a party that is not a whole number', () => {
  assert.throws(() => venue.totalForParty('monday', 2), RangeError);
  assert.throws(() => venue.totalForParty('sunday', 2), RangeError);
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => venue.totalForParty('friday', bad), RangeError, String(bad));
  }
  assert.throws(() => venue.totalForParty('friday', '4'), RangeError);
});

test('reservation rules per day hold the values in the brief', () => {
  const { RESERVATIONS: R } = venue;
  assert.deepEqual(Object.keys(R.days).sort(), ['friday', 'saturday']);
  assert.equal(R.days.friday.depositPerPersonPln.value, 100);
  assert.equal(R.days.friday.depositCreditedToBill.value, true);
  assert.equal(R.days.friday.entryPerPersonPln.value, 0);
  assert.equal(R.days.saturday.depositPerPersonPln.value, 100);
  assert.equal(R.days.saturday.depositCreditedToBill.value, true);
  assert.equal(R.days.saturday.entryPerPersonPln.value, 40);
  assert.equal(R.arrivalWindow.from.value, '22:00');
  assert.equal(R.arrivalWindow.to.value, '23:00');
  assert.equal(R.tableReleaseAfterLateMinutes.value, 30);
  for (const key of ['validIdRequired', 'smartCasualDressCode', 'doorSelection', 'staffMayDenyEntry', 'refundOnDeniedEntry', 'prepaymentConfirmsBooking']) {
    assert.equal(R[key].value, true, key);
  }
});

test('both disagreements in the repo are kept, and neither value is chosen over the other silently', () => {
  const { RESERVATIONS: R } = venue;
  const saturday = R.days.saturday.entryPerPersonPln;
  assert.deepEqual(saturday.contradictedBy.map((c) => c.value), [30, 30]);
  assert.ok(saturday.contradictedBy.every((c) => c.gap === 'SATURDAY_ENTRY_CONFLICT'));
  const arrival = R.arrivalWindow.to;
  assert.deepEqual(arrival.contradictedBy.map((c) => c.value), ['23:30', '23:30']);
  assert.ok(arrival.contradictedBy.every((c) => c.gap === 'ARRIVAL_WINDOW_CONFLICT'));
  // The sentences the pages show still say 40 and 23:00 in every language.
  for (const locale of LOCALES) {
    assert.match(R.copy.practical[2][locale].value, /40/, `${locale} Saturday sentence`);
    assert.match(R.copy.practical[3][locale].value, /23:00/, `${locale} arrival sentence`);
  }
});

test('provider hand-off: per-locale segment, the cs to pl fallback and its reason', () => {
  const { RESERVATIONS: R } = venue;
  assert.equal(R.provider.baseUrl.value, 'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661');
  assert.deepEqual(
    Object.fromEntries(LOCALES.map((l) => [l, R.provider.localeSegment[l].value])),
    { pl: 'pl', en: 'en', de: 'de', it: 'it', cs: 'pl' },
  );
  assert.deepEqual(R.provider.csFallback.value.from, 'cs');
  assert.deepEqual(R.provider.csFallback.value.to, 'pl');
  assert.match(R.provider.csFallback.value.reason, /renders English/);
  assert.equal(
    venue.reservationUrl('hero', 'cs'),
    'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=hero',
  );
});

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------

test('opening hours: Friday and Saturday, 22:00 to 04:00, printed as "22:00 - 04:00"', () => {
  const { HOURS } = venue;
  assert.deepEqual(HOURS.nights.map((n) => n.day), ['friday', 'saturday']);
  for (const n of HOURS.nights) {
    assert.equal(n.opens.value, '22:00');
    assert.equal(n.closes.value, '04:00');
    assert.equal(HOURS.displayRange.value, `${n.opens.value} - ${n.closes.value}`);
  }
  assert.equal(HOURS.timezone.value, 'Europe/Warsaw');
  assert.equal(HOURS.eventNightHours.value, 6);
});

test('the summer Friday closure is history: 17 July to 28 August 2026, Fridays only', () => {
  const { HOURS } = venue;
  assert.equal(HOURS.closures.length, 1);
  const [summer] = HOURS.closures;
  assert.equal(summer.state, 'ended');
  assert.deepEqual(summer.days, ['friday']);
  assert.equal(summer.from.value, '2026-07-17');
  assert.equal(summer.through.value, '2026-08-28');
  const dayOf = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
  assert.equal(dayOf(summer.from.value), 5, 'the window opens on a Friday');
  assert.equal(dayOf(summer.through.value), 5, 'the last closed day is a Friday');
});

test('nightOf: a 02:00 visit on Saturday belongs to Friday\'s night', () => {
  assert.deepEqual(venue.nightOf('2026-09-05', '02:00'), { night: '2026-09-04', day: 'friday' });
  assert.deepEqual(venue.nightOf('2026-09-06', '02:00'), { night: '2026-09-05', day: 'saturday' });
});

test('nightOf: edges of a night', () => {
  const at = (date, time) => venue.nightOf(date, time);
  // Friday 4 September 2026
  assert.equal(at('2026-09-04', '21:59'), null, 'one minute before opening');
  assert.deepEqual(at('2026-09-04', '22:00'), { night: '2026-09-04', day: 'friday' }, 'opening minute');
  assert.deepEqual(at('2026-09-04', '23:59'), { night: '2026-09-04', day: 'friday' });
  assert.deepEqual(at('2026-09-05', '00:00'), { night: '2026-09-04', day: 'friday' }, 'midnight stays with Friday');
  assert.deepEqual(at('2026-09-05', '03:59'), { night: '2026-09-04', day: 'friday' });
  assert.equal(at('2026-09-05', '04:00'), null, 'closing minute is outside the night');
  assert.equal(at('2026-09-05', '12:00'), null, 'Saturday daytime is closed');
  assert.deepEqual(at('2026-09-05', '22:00'), { night: '2026-09-05', day: 'saturday' });
  assert.deepEqual(at('2026-09-06', '03:59'), { night: '2026-09-05', day: 'saturday' }, 'Sunday small hours belong to Saturday');
  assert.equal(at('2026-09-06', '04:00'), null);
  assert.equal(at('2026-09-07', '02:00'), null, 'Monday small hours: Sunday has no night');
  assert.equal(at('2026-09-09', '23:00'), null, 'Wednesday');
});

test('nightOf: nights inside the summer closure are closed, the Friday after it is open', () => {
  const at = (date, time) => venue.nightOf(date, time);
  assert.equal(at('2026-08-14', '23:00'), null, 'Friday 14 August was closed');
  assert.equal(at('2026-08-15', '02:00'), null, 'and so is its small-hours tail');
  assert.deepEqual(at('2026-08-15', '23:00'), { night: '2026-08-15', day: 'saturday' }, 'Saturday stayed open');
  assert.equal(at('2026-08-28', '22:00'), null, 'last closed Friday');
  assert.equal(at('2026-08-29', '03:00'), null, 'its tail on Saturday 29 August');
  assert.deepEqual(at('2026-08-29', '22:00'), { night: '2026-08-29', day: 'saturday' });
  assert.deepEqual(at('2026-09-04', '22:00'), { night: '2026-09-04', day: 'friday' }, 'Fridays are back');
  assert.deepEqual(at('2026-07-10', '23:00'), { night: '2026-07-10', day: 'friday' }, 'the Friday before the window');
});

test('nightOf rejects malformed input', () => {
  for (const [d, t] of [['2026-9-4', '22:00'], ['2026-09-04', '2200'], ['2026-09-04', '24:00'], ['2026-09-04', '22:60'], ['', '']]) {
    assert.throws(() => venue.nightOf(d, t), RangeError, `${d} ${t}`);
  }
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

const allBarItems = () => venue.MENU.sections.flatMap((section) => section.items);
const allDishes = () => venue.MENU.food.sections.flatMap((section) => section.dishes);

test('menu: every item has a unique id, a name and positive numeric prices', () => {
  const ids = [...allBarItems().map((i) => i.id), ...allDishes().map((d) => d.id)];
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const item of allBarItems()) {
    assert.ok(item.name.value.length > 0);
    assert.ok(item.options.length >= 1, `${item.id} has no price`);
    for (const option of item.options) {
      assert.ok(Number.isFinite(option.pricePln.value) && option.pricePln.value > 0, `${item.id} price`);
      if (option.volumeMl) assert.ok(Number.isFinite(option.volumeMl.value) && option.volumeMl.value > 0, `${item.id} volume`);
    }
  }
  assert.equal(venue.MENU.currency.value, 'PLN');
});

test('menu: the full bar is there, section by section', () => {
  const counts = Object.fromEntries(venue.MENU.sections.map((s) => [s.id, s.items.length]));
  assert.deepEqual(counts, {
    cocktails: 33,
    nonAlcoholic: 11,
    vodka: 9,
    gin: 14,
    whisky: 31,
    rum: 10,
    tequila: 10,
    champagne: 9,
    wines: 9,
    cognac: 3,
    liqueurs: 6,
    vermouth: 9,
    bottleService: 15,
    beer: 8,
    drinks: 10,
  });
  for (const section of venue.MENU.sections) {
    for (const locale of LOCALES) assert.ok(section.title[locale].value, `${section.id} title in ${locale}`);
    if (section.pourMl) assert.equal(section.pourMl.value, 40, `${section.id} pours 4 cl = 40 ml`);
  }
  assert.equal(venue.MENU.sections.find((s) => s.id === 'beer').bottleMl.value, 330);
});

test('menu: The Cork has 9 dishes in 2 sections, 8 with a price, Crostini without one', () => {
  const sections = venue.MENU.food.sections;
  assert.deepEqual(sections.map((s) => s.dishes.length), [7, 2]);
  const dishes = allDishes();
  assert.equal(dishes.length, 9);
  const unpriced = dishes.filter((d) => d.options.length === 0);
  assert.deepEqual(unpriced.map((d) => d.id), ['crostini']);
  assert.equal(unpriced[0].missingPrice.placeholder, '[PRICE?]');
  assert.equal(dishes.filter((d) => d.options.length > 0).length, 8);
  assert.deepEqual(dishes.filter((d) => d.diet).map((d) => d.id), ['the-cork-cheese-board']);
  assert.deepEqual(dishes.filter((d) => d.spicy).map((d) => d.id), ['blue-fin-tuna-a-la-chinoise', 'buffalo-crispy-chicken']);
  for (const dish of dishes) for (const locale of LOCALES) assert.ok(dish.name[locale].value, `${dish.id} ${locale}`);
});

test('menu: abvPercent, allergens and tags are Gaps everywhere except the eight beers with a stated ABV', () => {
  for (const item of allBarItems()) {
    assert.equal(item.allergens.value, null, `${item.id} allergens`);
    assert.equal(item.allergens.placeholder, '[ALLERGENS?]');
    assert.equal(item.tags.value, null, `${item.id} tags`);
    assert.equal(item.tags.placeholder, '[TAGS?]');
  }
  for (const dish of allDishes()) {
    assert.equal(dish.allergens.value, null);
    assert.equal(dish.tags.value, null);
  }
  const withAbv = allBarItems().filter((i) => i.abvPercent.value !== null);
  assert.deepEqual(withAbv.map((i) => i.id), [
    'beer/stella-artois', 'beer/hoegaarden', 'beer/leffe-blonde', 'beer/corona-extra',
    'beer/corona-cero', 'beer/leffe', 'beer/beck-s', 'beer/bud',
  ]);
  for (const item of withAbv) assert.equal(item.abvPercent.status, 'PENDING');
  const without = allBarItems().filter((i) => i.abvPercent.value === null);
  assert.ok(without.length > 150);
  assert.ok(without.every((i) => i.abvPercent.placeholder === '[ABV?]'));
});

test('menu: Leffe Blonde is 6.5% on draught and 6.6% in the bottle, and both are kept', () => {
  const byId = Object.fromEntries(allBarItems().map((i) => [i.id, i]));
  assert.equal(byId['beer/leffe-blonde'].abvPercent.value, 6.5);
  assert.deepEqual(byId['beer/leffe'].abvPercent.value, { Blonde: 6.6, Brune: 6.5 });
  assert.equal(venue.abvText(byId['beer/leffe'].abvPercent.value), 'Blonde 6.6% / Brune 6.5%');
});

test('format helpers rebuild the strings the pages print', () => {
  const { formatPln, formatVolume } = venue;
  assert.equal(formatPln(44), '44 zł');
  assert.equal(formatVolume(160), '160 ml');
  assert.equal(formatVolume(40, 'cl'), '4 cl');
  assert.equal(formatVolume(1750, 'l'), '1,75 l');
  assert.equal(formatVolume(1500, 'l'), '1,5 l');
  assert.equal(formatVolume(3000, 'l'), '3 l');
  assert.equal(formatVolume(1000), '1000 ml');
});

test('menu migration is lossless: every price, volume and description equals bar-menu.ts', async () => {
  const bar = await loadSource('src/data/bar-menu.ts');
  const { MENU, describeItem, formatPriceOptions, formatVolumeOptions, formatSizedPrices } = venue;
  const section = (id) => MENU.sections.find((s) => s.id === id);

  const sourceOf = {
    cocktails: bar.koktajle,
    vodka: bar.wodka,
    gin: bar.gin,
    whisky: bar.whisky,
    rum: bar.rum,
    tequila: bar.tequila,
    cognac: bar.koniak,
    liqueurs: bar.likiery,
    vermouth: bar.wermuty,
    bottleService: bar.bottleService,
    drinks: bar.napoje,
    nonAlcoholic: [...bar.mocktails, ...bar.spirits0],
    beer: [...bar.piwoLane, ...bar.piwoButelkowe],
  };
  for (const [id, source] of Object.entries(sourceOf)) {
    const items = section(id).items;
    assert.equal(items.length, source.length, `${id} count`);
    source.forEach((row, i) => {
      const item = items[i];
      assert.equal(item.name.value, row.name, `${id}[${i}] name`);
      assert.equal(formatPriceOptions(item.options), row.price, `${row.name} price`);
      assert.equal(formatVolumeOptions(item.options), row.vol ?? '', `${row.name} volume`);
      for (const locale of LOCALES) {
        const expected = row.desc ? bar.localizeDesc(row.desc, locale) : '';
        assert.equal(describeItem(item, locale, MENU.glossary, id === 'beer'), expected, `${row.name} description in ${locale}`);
      }
    });
  }

  // champagne + prosecco
  const champagne = section('champagne').items;
  const rows = bar.CHAMPAGNE_HOUSES.flatMap((h) => h.items.map((c) => ({ house: h.house, c })));
  rows.forEach(({ house, c }, i) => {
    const expected = c.prices.map((p, k) => (p ? `${bar.CHAMP_VOLS[k]} ${p}` : null)).filter(Boolean).join(' · ');
    assert.equal(champagne[i].name.value, c.name);
    assert.equal(champagne[i].group, house);
    assert.equal(formatSizedPrices(champagne[i].options), expected, `${c.name} sizes`);
  });
  assert.equal(formatSizedPrices(champagne.at(-1).options), '150 ml 25 zł · 750 ml 120 zł');

  // wines
  const wines = section('wines').items;
  assert.equal(wines.length, bar.WINES.length);
  bar.WINES.forEach((w, i) => {
    const item = wines[i];
    assert.equal(item.name.value, w.name);
    assert.equal(item.wine.winery.value, w.winery);
    assert.equal(item.wine.category, w.category);
    assert.deepEqual(item.wine.grapes?.value, w.grapes);
    assert.equal(item.wine.region?.value, w.region);
    assert.equal(item.wine.vintage?.value, w.vintage);
    assert.equal(item.wine.dryness?.value, w.dryness);
    assert.equal(Boolean(item.wine.featured?.value), Boolean(w.featured));
    const glass = item.options.find((o) => o.volumeMl.value === 150);
    const bottle = item.options.find((o) => o.volumeMl.value === 750);
    assert.equal(glass ? `${glass.pricePln.value} zł` : undefined, w.glassPrice);
    assert.equal(`${bottle.pricePln.value} zł`, w.bottlePrice);
  });
  assert.deepEqual(wines.filter((w) => w.options.length === 2).map((w) => w.name.value), ['Halka', 'Triada']);

  // glossary
  for (const [word, translations] of Object.entries(bar.INGREDIENTS)) {
    assert.deepEqual(MENU.glossary[word].value, translations, word);
  }
  assert.equal(Object.keys(MENU.glossary).length, Object.keys(bar.INGREDIENTS).length);
});

test('menu migration is lossless: The Cork equals food-menu.ts in five languages', async () => {
  const food = await loadSource('src/data/food-menu.ts');
  const { MENU, portionLabel, formatPln } = venue;
  assert.equal(MENU.food.sections.length, food.SECTIONS.length);
  food.SECTIONS.forEach((source, s) => {
    const section = MENU.food.sections[s];
    assert.equal(section.dishes.length, source.dishes.length);
    for (const locale of LOCALES) assert.equal(section.title[locale].value, source.title[locale]);
    source.dishes.forEach((row, d) => {
      const dish = section.dishes[d];
      for (const locale of LOCALES) {
        assert.equal(dish.name[locale].value, row.name[locale], `${row.name.en} name ${locale}`);
        assert.equal(dish.desc?.[locale].value, row.desc?.[locale], `${row.name.en} desc ${locale}`);
      }
      assert.equal(dish.options.length, row.tiers.length, `${row.name.en} tiers`);
      row.tiers.forEach((tier, k) => {
        assert.equal(formatPln(dish.options[k].pricePln.value), tier.price);
        for (const locale of LOCALES) {
          const label = dish.options[k].portion ? portionLabel(dish.options[k].portion.value, locale, MENU.labels) : undefined;
          assert.equal(label, tier.qty?.[locale], `${row.name.en} portion ${locale}`);
        }
      });
      assert.equal(dish.diet?.value, row.diet);
      assert.equal(Boolean(dish.spicy?.value), Boolean(row.spicy));
    });
  });
  for (const locale of LOCALES) {
    assert.equal(MENU.food.heading[locale].value, food.TAGLINE.heading[locale]);
    assert.equal(MENU.food.sub[locale].value, food.TAGLINE.sub[locale]);
    assert.equal(MENU.labels.spicy[locale].value, food.SPICY[locale]);
    for (const diet of ['vegetarian', 'vegan']) assert.equal(MENU.labels.diet[diet][locale].value, food.DIET[diet][locale]);
  }
});

// ---------------------------------------------------------------------------
// Agreement with the code that renders the pages today
// ---------------------------------------------------------------------------

test('venue.ts agrees with src/data/site.ts (contacts, company, B2B facts, coordinates)', async () => {
  const site = await loadSource('src/data/site.ts');
  const { CONTACT, COMPANY, VENUE_FACTS, BUSINESS } = site;
  const v = VENUE;
  assert.equal(v.contacts.phone.value.display, CONTACT.phone);
  assert.equal(`tel:${v.contacts.phone.value.e164}`, CONTACT.phoneHref);
  assert.equal(v.contacts.eventsPhone.value.display, CONTACT.eventsPhone);
  assert.equal(`tel:${v.contacts.eventsPhone.value.e164}`, CONTACT.eventsPhoneHref);
  assert.equal(v.contacts.email.value, CONTACT.email);
  assert.equal(v.contacts.eventsEmail.value, CONTACT.eventsEmail);
  assert.equal(v.address.oneLine.value, CONTACT.address);
  assert.equal(v.address.mapsUrl.value, CONTACT.mapsUrl);
  assert.equal(v.hours.displayRange.value, CONTACT.hours);
  assert.equal(v.socials.instagram.value, CONTACT.instagram);
  assert.equal(v.socials.facebook.value, CONTACT.facebook);
  assert.equal(v.socials.tripadvisor.value, CONTACT.tripadvisor);

  const le = v.identity.legalEntity;
  assert.equal(le.legalName.value, COMPANY.legalName);
  assert.equal(le.tradeName.value, COMPANY.tradeName);
  assert.equal(le.nip.value, COMPANY.nip);
  assert.equal(le.regon.value, COMPANY.regon);
  assert.equal(le.krs.value, COMPANY.krs);
  assert.equal(le.registeredStreet.value, COMPANY.street);
  assert.equal(le.registeredPostalCity.value, COMPANY.postalCity);

  assert.equal(v.b2b.areaSqm.value, VENUE_FACTS.areaSqm);
  assert.equal(v.b2b.theCorkSeated.value, VENUE_FACTS.theCorkSeated);
  assert.equal(v.b2b.standingBuffet.value, VENUE_FACTS.standingBuffet);
  assert.equal(v.b2b.presentationScreens.value, VENUE_FACTS.presentationScreens);

  assert.equal(v.identity.brandName.value, BUSINESS.name);
  assert.equal(v.identity.siteUrl.value, BUSINESS.url);
  assert.equal(v.address.street.value, BUSINESS.streetAddress);
  assert.equal(v.address.city.value, BUSINESS.locality);
  assert.equal(v.address.region.value, BUSINESS.region);
  assert.equal(v.address.postalCode.value, BUSINESS.postalCode);
  assert.equal(v.address.country.value, BUSINESS.country);
  assert.equal(v.address.coordinates.latitude.value, BUSINESS.latitude);
  assert.equal(v.address.coordinates.longitude.value, BUSINESS.longitude);
  assert.equal(v.identity.priceRangeSymbol.value, BUSINESS.priceRange);
  assert.equal(v.hours.eventNightHours.value * 60 * 60 * 1000, site.EVENT_DURATION_MS);
});

test('reservationUrl() builds the same link as src/data/site.ts for every language', async () => {
  const site = await loadSource('src/data/site.ts');
  for (const locale of LOCALES) {
    for (const content of ['hero', 'reservations_section', 'event_card', 'menu', 'event_detail']) {
      assert.equal(venue.reservationUrl(content, locale), site.reservationUrl(content, locale), `${locale} ${content}`);
    }
  }
});

test('the JSON-LD opening hours agree with the opening nights in venue.ts', async () => {
  const hours = await loadSource('src/lib/opening-hours.mjs');
  const fromVenue = VENUE.hours.nights.map((n) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: n.day[0].toUpperCase() + n.day.slice(1),
    opens: n.opens.value,
    closes: n.closes.value,
  }));
  assert.deepEqual([...hours.NIGHTCLUB_OPENING_HOURS], fromVenue);
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

test('the JSON export is deterministic, round-trips, and carries the counts', () => {
  const first = toJson(buildExport(venue));
  const second = toJson(buildExport(venue));
  assert.equal(first, second);
  const data = JSON.parse(first);
  assert.equal(data._meta.counts.confirmed, 0);
  assert.equal(data._meta.counts.facts, facts().length);
  assert.equal(data.venue.contacts.phone.value.display, '+48 515 126 260');
  assert.equal(data.derived.partyTotals.saturday['6'].outOfPocketPln, 840);
  assert.equal(data.derived.partyTotals.friday['6'].entryPln, 0);
  assert.equal(data.derived.hoursDisplay, 'Friday - Saturday, 22:00 - 04:00');
  assert.equal(data.derived.menuRows.pl.food.length, 9);
  assert.equal(data.derived.menuRows.en.bar.find((r) => r.name === 'Hugo Spritz').price, '44 zł');
  assert.equal(data.derived.menuRows.en.bar.find((r) => r.name === 'Hugo Spritz').description, 'St-Germain / Lime / Mint / Martini Prosecco / Sparkling water');
  assert.equal(data.gaps.LINEUP.placeholder, '[LINEUP?]');
});
