#!/usr/bin/env node
/* Export src/content/venue to JSON for the offline playground, and the gap log
 * to Markdown.
 *
 *   node scripts/venue-export.mjs
 *       writes docs/sisi-elevate/playground-src/content/venue.json
 *   node scripts/venue-export.mjs --copy-to /path/to/venue.json
 *       also copies the file there
 *   node scripts/venue-export.mjs --gaps-md /path/to/GAPS.md
 *       writes the gap log (generated from src/content/venue/gaps.ts)
 *   node scripts/venue-export.mjs --check
 *       exits 1 when the file on disk is not what the data would produce
 *
 * The output has no timestamp, so running it twice gives the same bytes.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadVenue, REPO_ROOT } from './lib/load-venue.mjs';
import { walkVenue } from './lib/venue-verify.mjs';

export const DEFAULT_OUT = 'docs/sisi-elevate/playground-src/content/venue.json';
const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];

/** The bar rows and food rows exactly as the pages print them, per language. */
function menuRows(venue) {
  const { MENU, describeItem, formatPriceOptions, formatVolumeOptions, formatSizedPrices, portionLabel } = venue;
  const rows = {};
  for (const locale of LOCALES) {
    const bar = [];
    for (const section of MENU.sections) {
      const sized = section.id === 'champagne';
      for (const item of section.items) {
        bar.push({
          section: section.id,
          group: item.group ?? null,
          name: item.name.value,
          description: describeItem(item, locale, MENU.glossary, section.id === 'beer') || null,
          volume: sized ? null : formatVolumeOptions(item.options) || null,
          price: sized ? formatSizedPrices(item.options) : formatPriceOptions(item.options) || null,
        });
      }
    }
    const food = MENU.food.sections.flatMap((section) =>
      section.dishes.map((dish) => ({
        section: section.id,
        name: dish.name[locale].value,
        description: dish.desc?.[locale].value ?? null,
        prices: dish.options.map((option) => ({
          portion: option.portion ? portionLabel(option.portion.value, locale, MENU.labels) : null,
          price: formatPriceOptions([option]),
        })),
      })),
    );
    rows[locale] = { bar, food };
  }
  return rows;
}

/** Everything the playground needs, as a plain object. */
export function buildExport(venue) {
  const { VENUE, GAPS, totalForParty, reservationUrl } = venue;
  let facts = 0;
  let gaps = 0;
  let confirmed = 0;
  for (const { kind, node } of walkVenue(VENUE)) {
    if (kind === 'gap') gaps += 1;
    else {
      facts += 1;
      if (node.status === 'CONFIRMED') confirmed += 1;
    }
  }
  const parties = [1, 2, 4, 6, 8, 10];
  return {
    _meta: {
      schema: 'sisi-venue/1',
      generator: 'scripts/venue-export.mjs',
      source: 'src/content/venue/venue.ts',
      snapshot: VENUE.snapshot,
      counts: { facts, gapPlaceholders: gaps, pending: facts - confirmed, confirmed },
      note: 'Every fact is PENDING until Ignacy confirms it. A value of null with a `gap` id is a missing fact: show its placeholder, never a guess.',
    },
    venue: VENUE,
    gaps: GAPS,
    derived: {
      hoursDisplay: `${VENUE.hours.daysLabel.en.value}, ${VENUE.hours.displayRange.value}`,
      partyTotals: Object.fromEntries(
        ['friday', 'saturday'].map((day) => [day, Object.fromEntries(parties.map((n) => [n, totalForParty(day, n)]))]),
      ),
      reservationUrls: Object.fromEntries(LOCALES.map((locale) => [locale, reservationUrl('playground', locale)])),
      menuRows: menuRows(venue),
    },
  };
}

export const toJson = (data) => `${JSON.stringify(data, null, 2)}\n`;

// ---------------------------------------------------------------------------
// GAPS.md
// ---------------------------------------------------------------------------

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function gapsMarkdown(venue) {
  const { GAPS, GAP_IDS, VENUE } = venue;
  const rows = GAP_IDS.map((id) => GAPS[id]);
  const missing = rows.filter((row) => row.kind === 'missing');
  const decisions = rows.filter((row) => row.kind === 'decision');
  const table = (list) =>
    [
      '| ID | What | Why it matters (guest task blocked) | Where it would appear | Suggested owner | Placeholder | Status | Basis | Evidence |',
      '|---|---|---|---|---|---|---|---|---|',
      ...list.map((row) =>
        `| ${cell(row.id)} | ${cell(row.what)}${row.notes ? ` ${cell(row.notes)}` : ''} | ${cell(row.why)} | ${cell(row.where)} | ${cell(row.owner)} | \`${row.placeholder}\` | ${row.status} | ${row.basis} | ${row.evidence.map((e) => `\`${cell(e.split(' (')[0])}\`${e.includes(' (') ? ` ${cell(e.slice(e.indexOf(' (')))}` : ''}`).join('<br>')} |`,
      ),
    ].join('\n');

  return `# GAPS: facts the site needs and nobody has supplied

Generated by \`node scripts/venue-export.mjs --gaps-md\` from \`src/content/venue/gaps.ts\` (repo commit ${VENUE.snapshot.repoCommit}, ${VENUE.snapshot.capturedOn}). Edit the TypeScript table, not this file: the tests fail when a gap id used in \`venue.ts\` has no row.

**Labels.** Every claim in the Basis column is **Confirmed** (seen in code or in the local build output, with the file:line in Evidence), **Assumption**, **Inference** or **Rec**. Status of every row is **PENDING**: nothing is filled in, and nothing is CONFIRMED until Ignacy says so. Production could not be reached from the build container, so no row was checked against the live site.

**Rows.** ${rows.length} in total: ${missing.length} missing facts and ${decisions.length} decisions (two places in the repo state different values and the owner has to pick).

**How a placeholder works.** \`venue.ts\` holds each missing fact as \`{ value: null, status: 'PENDING', gap: 'ID', placeholder: '[TEXT?]' }\`. A page that needs the fact shows the placeholder text in review builds and leaves the element out in production. It never invents a value.

## Missing facts

${table(missing)}

## Decisions for the owner

${table(decisions)}

## Suggested order for the conversation with Ignacy (Rec)

1. **Money and rules first** (they change what a guest pays or is promised): SATURDAY_ENTRY_CONFLICT, ARRIVAL_WINDOW_CONFLICT, PREPAYMENT_TERM, REFUND_RULES, PARTY_PRICE, TABLE_MINIMUM.
2. **What is on tonight** (drives the events pages and the hero): EVENT_DATES, LINEUP, ARTISTS, DJ_START.
3. **Getting in**: ENTRANCE, STEP_FREE, PARKING, TRANSPORT, COORDINATES, AGE_NOTICE, DRESS_CODE_DETAIL, CLOAKROOM, PAYMENT_METHODS, CAPACITY.
4. **The menu**: ALLERGENS, ABV, TASTE_TAGS, DISH_PRICE, FOOD_MENU, THE_CORK_HOURS, MENU_VERIFIED.
5. **Proof and people**: REVIEWS, PRESS, PHOTO_RIGHTS.
6. **Languages**: CS_BOOKING, LEGAL_TRANSLATIONS.
7. **Legal and brand questions for Ignacy and a lawyer, not answered here**: CHIVAS_ZONE, AGE_NOTICE wording, PREPAYMENT_TERM, REFUND_RULES.
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, copyTo: [], gapsMd: [], check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i];
    else if (arg === '--copy-to') args.copyTo.push(argv[++i]);
    else if (arg === '--gaps-md') args.gapsMd.push(argv[++i]);
    else if (arg === '--check') args.check = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { venue, cleanup } = await loadVenue();
  try {
    const json = toJson(buildExport(venue));
    const out = resolve(REPO_ROOT, args.out);
    if (args.check) {
      const current = existsSync(out) ? readFileSync(out, 'utf8') : null;
      if (current !== json) {
        console.error(`${args.out} is out of date. Run: node scripts/venue-export.mjs`);
        process.exitCode = 1;
      }
      return;
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, json);
    console.log(`wrote ${args.out} (${json.length} bytes)`);
    for (const target of args.copyTo) {
      const dest = resolve(target);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(out, dest);
      console.log(`copied to ${dest}`);
    }
    for (const target of args.gapsMd) {
      const dest = resolve(target);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, gapsMarkdown(venue));
      console.log(`wrote ${dest}`);
    }
  } finally {
    cleanup();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
