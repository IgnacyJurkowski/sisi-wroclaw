// Contract 5: facts (skeleton). Phase 3 creates the single source of truth;
// until then this prints an inventory of every currency amount, clock time,
// phone, email and street address on the built site, and fails only on values
// that contradict the small allow-list in contract/facts.json.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '../lib/constants.mjs';
import {
  addToInventory, blogFlags, contradictions, factsFromHref, normalizePhone, recordFact,
  serialiseInventory,
} from '../lib/facts.mjs';
import { readSnapshot, writeSnapshot } from '../lib/snapshot.mjs';

const C = 'facts';

/** events slug per locale, read from src/i18n/routes.ts. */
export function eventSlugs(routesSource) {
  const line = routesSource.match(/^\s*events:\s*\{([^}]*)\}/m)?.[1] ?? '';
  return new Set([...line.matchAll(/\w+:\s*'([^']+)'/g)].map((m) => m[1]));
}

export function pageKind(path, eventSlugSet) {
  const parts = path.split('/').filter(Boolean);
  if (LOCALES.includes(parts[0]) && parts[1] === 'blog' && parts.length === 3) return 'blog';
  if (LOCALES.includes(parts[0]) && eventSlugSet.has(parts[1])) return 'event';
  return 'site';
}

/** The allow-list must still agree with the code it was derived from. */
export function checkAllowListAgainstSource({ config, siteSource, plSource }) {
  const problems = [];
  const stripped = siteSource.replace(/^\s*\/\/.*$/gm, '');
  const contact = stripped.match(/export const CONTACT = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  const grab = (key) => contact.match(new RegExp(`\\b${key}:\\s*'([^']*)'`))?.[1];
  const phone = grab('phone');
  const eventsPhone = grab('eventsPhone');
  for (const [label, value] of [['CONTACT.phone', phone], ['CONTACT.eventsPhone', eventsPhone]]) {
    if (!value) problems.push(`${label} not found in src/data/site.ts`);
    else if (!config.phones.includes(normalizePhone(value))) problems.push(`${label} ${value} is not in facts.json phones`);
  }
  for (const key of ['email', 'eventsEmail']) {
    const value = grab(key);
    if (!value) problems.push(`CONTACT.${key} not found in src/data/site.ts`);
    else if (!config.emails.includes(value.toLowerCase())) problems.push(`CONTACT.${key} ${value} is not in facts.json emails`);
  }
  const address = grab('address');
  if (!address || !address.startsWith(config.address.street)) problems.push(`CONTACT.address "${address}" does not start with facts.json street "${config.address.street}"`);
  const hours = grab('hours')?.replace(/\s/g, '');
  if (hours !== config.hours.open) problems.push(`CONTACT.hours "${hours}" differs from facts.json hours.open "${config.hours.open}"`);
  for (const amount of config.reservation.allowedAmounts) {
    if (!plSource.includes(amount)) problems.push(`src/i18n/ui/pl.ts no longer contains "${amount}"`);
  }
  return problems;
}

export async function runFactsContract(ctx) {
  const { model, report, contractDir, repoRoot, opts, source } = ctx;
  const config = readSnapshot(contractDir, 'facts.json');
  if (!config) {
    report.fail(C, { message: 'contract/facts.json is missing' });
    return;
  }
  const routesSource = readFileSync(join(repoRoot, 'src/i18n/routes.ts'), 'utf8');
  const slugs = eventSlugs(routesSource);

  // 1. Allow-list vs the code it was derived from.
  const drift = checkAllowListAgainstSource({
    config,
    siteSource: readFileSync(join(repoRoot, 'src/data/site.ts'), 'utf8'),
    plSource: readFileSync(join(repoRoot, 'src/i18n/ui/pl.ts'), 'utf8'),
  });
  if (drift.length) for (const message of drift) report.fail(C, { field: 'facts.json vs source', message });
  else report.pass(C);

  // 2. Scan every page, llms.txt and llms-full.txt.
  const inventory = {};
  const found = [];
  const flags = [];
  const seen = new Set();
  const scan = (page, kind, texts) => {
    for (const text of texts) {
      addToInventory(inventory, page, text);
      for (const c of contradictions(text, { kind, page }, config)) {
        const key = `${page}|${c.rule}|${c.value}|${c.sentence}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({ page, ...c });
      }
    }
  };
  for (const [path, page] of model.pages) {
    const kind = pageKind(path, slugs);
    scan(path, kind, [...page.blocks, ...page.metaText, ...page.jsonLd.strings]);
    for (const link of page.links) for (const fact of factsFromHref(link.url)) recordFact(inventory, path, fact);
    if (kind === 'blog') {
      const flagged = new Set();
      for (const block of page.blocks) {
        for (const flag of blogFlags(block, config)) {
          if (flagged.has(flag.sentence)) continue;
          flagged.add(flag.sentence);
          flags.push({ page: path, ...flag });
        }
      }
    }
  }
  // llms-full.txt is the index plus every article body, so it follows the blog
  // rules (only sentences about SiSi are judged); llms.txt is site copy.
  const paragraphs = (text) => (text ?? '').split(/\n+/).map((line) => line.replace(/^[#>\-*\s]+/, '').trim()).filter(Boolean);
  scan('/llms.txt', 'site', paragraphs(model.llmsTxt));
  scan('/llms-full.txt', 'blog', paragraphs(model.llmsFull));

  // 3. Judge the contradictions.
  for (const f of found) {
    report.fail(C, { url: f.page, field: f.rule, message: `${f.value} in: "${f.sentence.slice(0, 170)}"` });
  }
  report.pass(C, model.pages.size + 2 - new Set(found.map((f) => f.page)).size);
  for (const message of config.hours.knownConflicts ?? []) report.note(C, { field: 'known conflict', message });

  const summary = serialiseInventory(inventory);
  const counts = Object.entries(summary).map(([kind, values]) => `${kind} ${Object.keys(values).length}`).join(', ');
  report.lines(C, [
    `  Inventory: ${counts}. Blog posts that state a price, hour or rule about SiSi: ${new Set(flags.map((f) => f.page)).size} post(s), ${flags.length} sentence(s).`,
    ...[...new Set(flags.map((f) => f.page))].map((page) => `    flagged ${page}: ${flags.filter((f) => f.page === page).map((f) => f.kinds.join('+')).join(', ')}`),
  ]);

  if (opts.updateSnapshot || opts.writeInventory) {
    writeSnapshot(contractDir, 'facts-inventory.json', {
      source,
      note: 'Every distinct currency amount, clock time, phone, email and street address found in built pages, llms.txt and llms-full.txt, with the pages carrying it. blogFlags lists sentences in blog posts that state a price, an hour or a rule about SiSi (audit input). contradictions lists values that break contract/facts.json. Regenerated with --update-snapshot or --write-inventory; not a snapshot to diff.',
      buildContext: model.buildContext,
      values: summary,
      blogFlags: flags.sort((a, b) => a.page.localeCompare(b.page)),
      contradictions: found.map(({ page, rule, value, sentence }) => ({ page, rule, value, sentence })).sort((a, b) => a.page.localeCompare(b.page) || a.rule.localeCompare(b.rule)),
    });
    report.note(C, { message: 'wrote contract/facts-inventory.json' });
  }
}
