/* Post-build verification: asserts on the real rendered output in dist/.
   Run with `npm test` (builds first) or `node scripts/check-build.mjs` after a
   build. Exits non-zero on the first batch of failures. No external deps. */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('dist/ not found - run `npm run build` first.');
  process.exit(1);
}

const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const exists = (rel) => existsSync(join(DIST, rel));
const results = [];
const assert = (label, cond) => results.push([label, !!cond]);

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
const emptyEventCopy = {
  pl: 'Wkrótce ogłosimy kolejne wydarzenia - śledź nas na Instagramie.',
  en: 'More events coming soon - follow us on Instagram.',
  de: 'Weitere Veranstaltungen folgen bald - folge uns auf Instagram.',
  it: 'Presto annunceremo nuovi eventi - seguici su Instagram.',
  cs: 'Brzy ohlásíme další akce - sledujte nás na Instagramu.',
};

// --- i18n: every locale homepage + B2B route builds ---
for (const l of LOCALES) assert(`home builds: /${l}/`, exists(`${l}/index.html`));
const B2B = { pl: 'eventy-firmowe', en: 'corporate-events', de: 'firmenevents', it: 'eventi-aziendali', cs: 'firemni-akce' };
for (const l of LOCALES) assert(`b2b builds: /${l}/${B2B[l]}/`, exists(`${l}/${B2B[l]}/index.html`));

// --- html lang changes per locale ---
for (const l of LOCALES) assert(`<html lang="${l}">`, new RegExp(`<html lang="${l}">`).test(read(`${l}/index.html`)));

// --- hreflang complete + locale-specific canonical ---
const plHome = read('pl/index.html');
assert('hreflang has 5 locales', (plHome.match(/rel="alternate" hreflang="(pl|en|de|it|cs)"/g) || []).length === 5);
assert('hreflang x-default present', plHome.includes('hreflang="x-default"'));
assert('pl canonical is /pl/', plHome.includes('href="https://sisiwroclaw.pl/pl/"'));
assert('en canonical is locale-specific (not pl)', read('en/index.html').includes('rel="canonical" href="https://sisiwroclaw.pl/en/"'));

// --- B2B verified facts shown exactly; 150 scoped to The Cork ---
const enB2B = read('en/corporate-events/index.html');
assert('fact up to 150', enB2B.includes('up to 150'));
assert('150 scoped to The Cork', enB2B.includes('seated guests at The Cork'));
assert('fact 2 screens', enB2B.includes('2 screens'));
assert('enquiry CTA targets #b2b-enquiry', enB2B.includes('href="#b2b-enquiry"'));
assert('form section id present', enB2B.includes('id="b2b-enquiry"'));
assert('FAQ rendered (FAQPage matches visible Q&A)', enB2B.includes('"@type":"FAQPage"') && enB2B.includes('How many seated guests'));

// --- case studies: no published project -> neutral empty state, no fake client ---
assert('empty projects state shown', enB2B.includes('Write-ups of our first projects are in the works'));
assert('no dev example client leaked', !enB2B.includes('example-conference') && !enB2B.includes('TODO: nazwa'));

// --- form: required markers, hidden locale, honeypot, consent required ---
assert('form required indicator (*)', enB2B.includes('class="req"'));
assert('form hidden locale field', enB2B.includes('name="locale" value="en"'));
assert('form honeypot', enB2B.includes('netlify-honeypot="bot-field"'));
assert('form consent required', /name="consent"[^>]*required/.test(enB2B));
assert('form netlify-enabled', enB2B.includes('data-netlify="true"'));

// --- legal: en = convenience note; de/it/cs = English body + "shown in English" banner ---
assert('en terms convenience note', read('en/terms/index.html').includes('provided for convenience'));
assert('de legal english-fallback banner', read('de/datenschutz/index.html').includes('bewusst auf Englisch'));
assert('de legal body is English fallback', read('de/datenschutz/index.html').includes('Data controller'));
const LEGAL_ROUTES = {
  de: ['agb', 'datenschutz', 'cookie-richtlinie'],
  it: ['regolamento', 'privacy', 'cookie'],
  cs: ['pravidla', 'ochrana-soukromi', 'zasady-cookies'],
};
for (const [locale, routes] of Object.entries(LEGAL_ROUTES)) {
  for (const route of routes) {
    assert(
      `${locale}/${route} English fallback body is marked lang=en`,
      read(`${locale}/${route}/index.html`).includes('<div class="legal-body" lang="en">'),
    );
  }
}

// --- redirects configured ---
const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8');
assert('root redirect / -> /pl/', toml.includes('from = "/"') && toml.includes('to = "/pl/"'));
assert('legacy /menu redirect', toml.includes('from = "/menu"'));

// --- sitemap + no token leakage ---
// Event detail pages are dynamic (one per event x locale), so derive their count
// from the build instead of hardcoding it - otherwise adding an event in Drive
// would fail CI and block the sync from publishing.
const eventsDir = join(DIST, 'pl/wydarzenia');
const eventCount = existsSync(eventsDir)
  ? readdirSync(eventsDir).filter((e) => statSync(join(eventsDir, e)).isDirectory()).length
  : 0;
assert('sitemap.xml built', exists('sitemap.xml'));
assert(`sitemap urls = 50 base + ${eventCount} events x5`, (read('sitemap.xml').match(/<loc>/g) || []).length === 50 + eventCount * 5);

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}
const htmls = walk(DIST);
const allHtml = htmls.map((file) => readFileSync(file, 'utf8')).join('\n');
// Ignore encoded binary asset payloads when checking human-readable claims.
// The inlined WOFF2 happens to contain `21+` in its base64 bytes.
const searchableHtml = allHtml.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, '');
const leaked = htmls.filter((f) => /\{(privacy|cookies|email|example|legalName|nip|regon)\}/.test(readFileSync(f, 'utf8')));
const unverifiedRenderedClaims = [
  ['663 m area claim', /663\s*m/i],
  ['over-21 claim', /over[-\s]?21/i],
  ['21+ claim', /21\+/i],
  ['Polish over-21 claim', /powyżej 21/i],
  ['German over-21 claim', /(?:\bab|über) 21/i],
  ['Italian over-21 claim', /maggiori di 21/i],
  ['Czech over-21 claim', /(?:\bod|starším) 21/i],
  ['120-minute claim', /120 minut/i],
  ['120-minutes claim', /120 minutes/i],
  ['GeoCoordinates metadata', /GeoCoordinates/],
  ['geo meta tags', /<meta name="geo\./i],
  ['ICBM coordinate metadata', /<meta name="ICBM"/i],
  ['InStock availability claim', /\bInStock\b/],
];
for (const [label, pattern] of unverifiedRenderedClaims) {
  assert(`no ${label} in html`, !pattern.test(searchableHtml));
}
assert('no sample event copy', !allHtml.includes('Krótki opis wydarzenia') && !allHtml.includes('JungleW'));
assert('no stale June event routes', !existsSync(join(DIST, 'pl/wydarzenia/2026-06-26-friday-at-sisi/index.html')));
for (const locale of ['pl', 'en', 'de', 'it', 'cs']) {
  assert(`${locale} home has empty event state`, read(`${locale}/index.html`).includes(emptyEventCopy[locale]));
}
assert('no leaked {tokens} in html', leaked.length === 0);
assert(`html pages = 52 base + ${eventCount} events x5`, htmls.length === 52 + eventCount * 5);

// --- report ---
let failed = 0;
for (const [label, ok] of results) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
if (leaked.length) console.log('leaked tokens in:', leaked.map((f) => f.replace(DIST, '')).join(', '));
process.exit(failed ? 1 : 0);
