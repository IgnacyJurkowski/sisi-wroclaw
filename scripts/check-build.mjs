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

// --- localized dates from Europe/Warsaw (same ISO -> localized month) ---
assert('pl date label "czerwca"', read('pl/wydarzenia/index.html').includes('czerwca'));
assert('en date label "June"', read('en/events/index.html').includes('June'));
assert('de date label "Juni"', read('de/veranstaltungen/index.html').includes('Juni'));
assert('event <time datetime +02:00>', read('pl/wydarzenia/index.html').includes('datetime="2026-06-26T22:00:00+02:00"'));

// --- B2B verified facts shown exactly; 150 scoped to The Cork ---
const enB2B = read('en/corporate-events/index.html');
assert('fact 663 m²', enB2B.includes('663 m²'));
assert('fact up to 150', enB2B.includes('up to 150'));
assert('150 scoped to The Cork', enB2B.includes('seated guests at The Cork'));
assert('fact 2 screens', enB2B.includes('2 screens'));
assert('enquiry CTA targets #b2b-enquiry', enB2B.includes('href="#b2b-enquiry"'));
assert('form section id present', enB2B.includes('id="b2b-enquiry"'));
assert('FAQ rendered (FAQPage matches visible Q&A)', enB2B.includes('"@type":"FAQPage"') && enB2B.includes('How many seated guests'));

// --- case studies: no published project -> neutral empty state, no fake client ---
assert('empty projects state shown', enB2B.includes('Selected projects will be added soon'));
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
assert('age is 21+ (terms)', read('en/terms/index.html').includes('over 21'));

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
const leaked = htmls.filter((f) => /\{(privacy|cookies|email|example|legalName|nip|regon)\}/.test(readFileSync(f, 'utf8')));
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
