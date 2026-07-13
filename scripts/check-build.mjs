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
const englishNoticeText = 'This site stores only the dismissal of this notice and essential form and navigation state. Details are in our Cookie Policy and Privacy Policy.';
const noticeCopy = {
  pl: 'Ta strona przechowuje wyłącznie informację o zamknięciu tego komunikatu oraz niezbędny stan formularzy i nawigacji. Szczegóły znajdziesz w Polityce cookies oraz Polityce prywatności.',
  en: englishNoticeText,
  de: englishNoticeText,
  it: englishNoticeText,
  cs: englishNoticeText,
};
const noticeDismiss = { pl: 'Rozumiem', en: 'Got it', de: 'Got it', it: 'Got it', cs: 'Got it' };
const noticeFallbackLocales = new Set(['de', 'it', 'cs']);
const englishCookieMeta = 'SiSi Wrocław cookie policy - essential storage used for notice dismissal and form and navigation state.';
const englishCookieOgMeta = 'How SiSi Wrocław uses essential storage for the notice, forms and navigation.';

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

// --- form: Netlify contract, submitted fields, fallback contacts ---
assert('form required indicator (*)', enB2B.includes('class="req"'));
assert('form hidden locale field', enB2B.includes('name="locale" value="en"'));
assert('form honeypot', enB2B.includes('netlify-honeypot="bot-field"'));
assert('form consent required', /name="consent"[^>]*required/.test(enB2B));
assert('form netlify-enabled', enB2B.includes('data-netlify="true"'));
assert('form name and POST method preserved', /<form[^>]*name="b2b-enquiry"[^>]*method="POST"/.test(enB2B));
assert('form-name field preserved', enB2B.includes('name="form-name" value="b2b-enquiry"'));
const enB2BForm = enB2B.match(/<form\b[^>]*data-b2b-form[^>]*>[\s\S]*?<\/form>/)?.[0] ?? '';
const submittedFields = [
  'form-name', 'locale', 'page', 'utm', 'bot-field', 'company', 'contact_person', 'email', 'phone',
  'event_type', 'guests', 'preferred_date', 'preferred_date_iso', 'date_flexible', 'space', 'duration', 'presentation', 'catering',
  'technical', 'message', 'consent',
];
assert(
  'all existing submitted fields preserved, including preferred_date_iso',
  submittedFields.includes('preferred_date_iso')
    && submittedFields.every((name) => enB2BForm.includes(`name="${name}"`)),
);
assert('localized form messages use a data attribute', /<form\b[^>]*data-messages="[^"]+"[^>]*data-b2b-form/.test(enB2B));
assert('form fallback phone remains in HTML', enB2B.includes('href="tel:+48514032930"'));
assert('form fallback email remains in HTML', enB2B.includes('href="mailto:events@r32.com.pl"'));

// --- essential-storage notice: one truthful dismissal action per locale ---
for (const locale of LOCALES) {
  const home = read(`${locale}/index.html`);
  const bannerTag = home.match(/<div id="cookie-banner"\s[^>]*>/)?.[0] ?? '';
  const bannerBody = home.match(/<div id="cookie-banner"\s[^>]*>[\s\S]*?<\/div><script\b/)?.[0] ?? '';
  const renderedText = (bannerBody.match(/<p class="cookie-text">([\s\S]*?)<\/p>/)?.[1] ?? '')
    .replace(/<[^>]+>/g, '');
  assert(`${locale} notice has exact essential-storage text`, renderedText === noticeCopy[locale]);
  assert(
    `${locale} notice has one localized dismissal button`,
    (home.match(/<button\b[^>]*data-cookie-dismiss[^>]*>/g) || []).length === 1
      && home.includes(`>${noticeDismiss[locale]}</button>`),
  );
  assert(
    `${locale} notice language-of-parts marker is correct`,
    noticeFallbackLocales.has(locale) ? bannerTag.includes('lang="en"') : !/\blang=/.test(bannerTag),
  );
  assert(`${locale} notice has no accept/reject choice pair`, !home.includes('data-cookie='));
}
const fallbackCookieRoutes = { de: 'cookie-richtlinie', it: 'cookie', cs: 'zasady-cookies' };
for (const [locale, route] of Object.entries(fallbackCookieRoutes)) {
  assert(
    `${locale} cookie metadata uses the English fallback`,
    read(`${locale}/${route}/index.html`).includes(`content="${englishCookieMeta}"`)
      && read(`${locale}/${route}/index.html`).includes(`content="${englishCookieOgMeta}"`),
  );
}

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

function inventory(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(inventory(p));
    else out.push(p);
  }
  return out;
}
function executableInlineScripts(html) {
  const bodies = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const typeMatch = attrs.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const type = (typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').toLowerCase();
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    bodies.push(match[2]);
  }
  return bodies;
}
const files = inventory(DIST);
const htmls = files.filter((file) => file.endsWith('.html'));
const scripts = files.filter((file) => file.endsWith('.js'));
const allHtml = htmls.map((file) => readFileSync(file, 'utf8')).join('\n');
const externalScriptBodies = scripts.map((file) => readFileSync(file, 'utf8'));
const inlineScriptBodies = htmls.flatMap((file) => executableInlineScripts(readFileSync(file, 'utf8')));
const executableBuiltText = [...externalScriptBodies, ...inlineScriptBodies].join('\n');
assert('build inventory finds external JavaScript', scripts.length > 0);
assert('executable build text is non-empty', executableBuiltText.trim().length > 0);
assert('executable build text excludes JSON-LD payloads', !executableBuiltText.includes('"@context":"https://schema.org"'));
assert(
  'notice runtime stores dismissed and removes only the obsolete consent record',
  ['sisi-cookie-notice', 'sisi-cookie-consent', 'dismissed', 'localStorage.removeItem', 'localStorage.getItem', 'localStorage.setItem']
    .every((token) => executableBuiltText.includes(token))
    && !/[`'"](?:accepted|rejected)[`'"]/.test(executableBuiltText),
);
assert(
  'B2B UTM call site passes location.search through the bounded helper',
  /\.value\s*=\s*[$\w]+\(\s*location\.search\s*\)/.test(executableBuiltText)
    && ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
      .every((key) => executableBuiltText.includes(key)),
);
assert(
  'B2B attribution never assigns the whole query',
  !/\.value\s*=\s*location\.search(?:\b|\.replace)/.test(executableBuiltText)
    && !executableBuiltText.includes('location.search.replace'),
);
assert('B2B AJAX posts to the current path', /fetch\(\s*location\.pathname\b/.test(executableBuiltText));
const cookieSource = readFileSync(join(ROOT, 'src/components/CookieBanner.astro'), 'utf8');
assert(
  'notice storage read and legacy removal are guarded',
  /try\s*\{[\s\S]*?localStorage\.removeItem\(LEGACY_KEY\);[\s\S]*?localStorage\.getItem\(KEY\)[\s\S]*?\}\s*catch\s*\{\}/.test(cookieSource),
);
assert(
  'notice storage write is guarded',
  /try\s*\{\s*localStorage\.setItem\(KEY,\s*['"]dismissed['"]\);?\s*\}\s*catch\s*\{\}/.test(cookieSource),
);
assert(
  'obsolete consent key is removal-only',
  (cookieSource.match(/sisi-cookie-consent/g) || []).length === 1
    && cookieSource.includes('localStorage.removeItem(LEGACY_KEY)')
    && !/localStorage\.(?:getItem|setItem)\(LEGACY_KEY/.test(cookieSource),
);
assert(
  'storage denial falls back to visible page-local dismissal',
  /let dismissed = false;[\s\S]*?catch\s*\{\}\s*if\s*\(!dismissed\s*&&\s*banner\)\s*\{[\s\S]*?banner\.hidden\s*=\s*false;[\s\S]*?addEventListener\(['"]click['"][\s\S]*?banner\.hidden\s*=\s*true;/.test(cookieSource),
);
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
