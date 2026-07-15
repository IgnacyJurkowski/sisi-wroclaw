/* Post-build verification: asserts on the real rendered output in dist/.
   Run with `npm test` (builds first) or `node scripts/check-build.mjs` after a
   build. Exits non-zero on the first batch of failures. No external deps. */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, relative, sep } from 'node:path';

import { cacheAssetInventory, headersForPath, parseHeaderRules } from './generate-headers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
const BARE_ORIGIN = CANONICAL_ORIGIN.replace('www.', '');
const FACEBOOK_URL = 'https://www.facebook.com/sisimusicclub';

if (!existsSync(DIST)) {
  console.error('dist/ not found - run `npm run build` first.');
  process.exit(1);
}

const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const exists = (rel) => existsSync(join(DIST, rel));
const results = [];
const assert = (label, cond) => results.push([label, !!cond]);

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
const EVENT_ROUTES = { pl: 'wydarzenia', en: 'events', de: 'veranstaltungen', it: 'eventi', cs: 'akce' };
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
  de: 'Diese Website speichert ausschließlich, dass dieser Hinweis geschlossen wurde, sowie notwendige Formular- und Navigationszustände. Einzelheiten findest du in unserer Cookie-Richtlinie und unserer Datenschutzerklärung.',
  it: 'Questo sito memorizza esclusivamente la chiusura di questo avviso e lo stato essenziale dei moduli e della navigazione. I dettagli sono disponibili nella nostra informativa sui cookie e nella nostra informativa sulla privacy.',
  cs: 'Tento web ukládá pouze informaci o zavření tohoto oznámení a nezbytný stav formulářů a navigace. Podrobnosti najdete v našich zásadách používání souborů cookie a zásadách ochrany soukromí.',
};
const noticeDismiss = { pl: 'Rozumiem', en: 'Got it', de: 'Verstanden', it: 'Ho capito', cs: 'Rozumím' };
const noticeDialogLabel = {
  pl: 'Informacja o niezbędnej pamięci',
  en: 'Essential storage notice',
  de: 'Hinweis zur notwendigen Speicherung',
  it: 'Avviso sull\'archiviazione essenziale',
  cs: 'Oznámení o nezbytném ukládání',
};
const cookieMeta = {
  de: {
    route: 'cookie-richtlinie',
    description: 'Cookie-Richtlinie von SiSi Wrocław - notwendige Speicherung für das Schließen des Hinweises sowie für Formular- und Navigationszustände.',
    ogDescription: 'Wie SiSi Wrocław notwendige Speicherung für den Hinweis, Formulare und die Navigation verwendet.',
  },
  it: {
    route: 'cookie',
    description: 'Informativa sui cookie di SiSi Wrocław - archiviazione essenziale usata per la chiusura dell\'avviso e lo stato dei moduli e della navigazione.',
    ogDescription: 'Come SiSi Wrocław usa l\'archiviazione essenziale per l\'avviso, i moduli e la navigazione.',
  },
  cs: {
    route: 'zasady-cookies',
    description: 'Zásady používání souborů cookie SiSi Wrocław - nezbytné ukládání informace o zavření oznámení a stavu formulářů a navigace.',
    ogDescription: 'Jak SiSi Wrocław používá nezbytné ukládání pro oznámení, formuláře a navigaci.',
  },
};

// --- i18n: every locale homepage + B2B route builds ---
for (const l of LOCALES) assert(`home builds: /${l}/`, exists(`${l}/index.html`));
for (const locale of LOCALES) {
  const home = read(`${locale}/index.html`);
  const images = home.match(/<img\b[^>]*>/g) ?? [];
  const hasPositiveDimension = (image, name) => Number(
    image.match(new RegExp(`\\b${name}="([0-9]+)"`))?.[1] ?? 0,
  ) > 0;
  assert(
    `${locale} home images declare positive width and height`,
    images.length > 0
      && images.every((image) => hasPositiveDimension(image, 'width') && hasPositiveDimension(image, 'height')),
  );
  assert(
    `${locale} social links use the durable official Facebook profile`,
    home.split(`href="${FACEBOOK_URL}"`).length - 1 === 3
      && !home.includes('facebook.com/share/'),
  );
}
const RESERVATIONS = { pl: 'rezerwacje', en: 'reservations', de: 'reservierungen', it: 'prenotazioni', cs: 'rezervace' };
const EMENAGO_LOCALES = { pl: 'pl', en: 'en', de: 'de', it: 'it', cs: 'pl' };
for (const locale of LOCALES) {
  const home = read(`${locale}/index.html`);
  const internalPath = `/${locale}/${RESERVATIONS[locale]}/`;
  const internalCtas = ['nav-cta', 'btn-cta mobile-cta', 'btn-cta'].map((className) => (
    home.match(new RegExp(`<a\\b(?=[^>]*href="${internalPath}")(?=[^>]*class="${className}")[^>]*>`))?.[0] ?? ''
  ));
  assert(
    `${locale} header, mobile, and hero CTAs use the internal reservation page`,
    internalCtas.every((tag) => tag && !/\\btarget=/.test(tag)),
  );

  const reservationPage = read(`${locale}/${RESERVATIONS[locale]}/index.html`);
  assert(
    `${locale} reservation page uses its verified Emenago locale and retains tracking`,
    reservationPage.includes(`https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/${EMENAGO_LOCALES[locale]}`)
      && reservationPage.includes('utm_content=reservations_section'),
  );
}
const B2B = { pl: 'eventy-firmowe', en: 'corporate-events', de: 'firmenevents', it: 'eventi-aziendali', cs: 'firemni-akce' };
for (const l of LOCALES) assert(`b2b builds: /${l}/${B2B[l]}/`, exists(`${l}/${B2B[l]}/index.html`));
const b2bPages = Object.fromEntries(LOCALES.map((locale) => [locale, read(`${locale}/${B2B[locale]}/index.html`)]));
const plMenu = read('pl/menu/index.html');

function renderedBlocks(html, className) {
  const marker = `<div class="${className}"`;
  const starts = [];
  let cursor = 0;
  while ((cursor = html.indexOf(marker, cursor)) !== -1) {
    starts.push(cursor);
    cursor += marker.length;
  }
  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
}

const hasRenderedText = (html, text) => html.includes(`>${text}<`);
const wineRows = renderedBlocks(plMenu, 'prow wine-row');
const menuItems = renderedBlocks(plMenu, 'menu-item');
const wineRow = (name) => wineRows.find((row) => hasRenderedText(row, name)) ?? '';
const menuItemRow = (name, volume) => menuItems.find((row) => (
  hasRenderedText(row, name) && (!volume || hasRenderedText(row, volume))
)) ?? '';
const winePrice = (row, volume) => row.match(
  new RegExp(`<span\\b[^>]*class="pcell"[^>]*data-vol="${volume}"[^>]*>([^<]*)</span>`),
)?.[1] ?? '';

const expectedWines = [
  ['Halka', '37 zł', '220 zł'],
  ['Hibernal', '—', '330 zł'],
  ['Solaris', '—', '360 zł'],
  ['Chardonnay Barrique 2024', '—', '420 zł'],
  ['Triada', '40 zł', '240 zł'],
  ['Rege', '—', '330 zł'],
  ['Pinot Noir', '—', '420 zł'],
  ['Yacobus Orange', '—', '390 zł'],
  ['Rosé', '—', '330 zł'],
];
for (const [name, glassPrice, bottlePrice] of expectedWines) {
  const row = wineRow(name);
  assert(
    `${name} has the requested glass and bottle availability`,
    winePrice(row, '150 ml') === glassPrice && winePrice(row, '750 ml') === bottlePrice,
  );
}

for (const [name, price] of [['Ostoya Black', '289 zł'], ['Chivas Crystal', '379 zł']]) {
  const row = menuItemRow(name, '700 ml');
  assert(`${name} has the requested bottle price`, hasRenderedText(row, price));
}

for (const [name, volume] of [
  ['Cappy', '250 ml'],
  ['Fuze Tea', '250 ml'],
  ['Red Bull', '250 ml'],
  ['3 Cents', '250 ml'],
  ['Karafka lemoniady', '1000 ml'],
]) {
  assert(`${name} has the requested volume`, hasRenderedText(menuItemRow(name), volume));
}

// --- html lang changes per locale ---
for (const l of LOCALES) assert(`<html lang="${l}">`, new RegExp(`<html lang="${l}">`).test(read(`${l}/index.html`)));

// --- hreflang complete + locale-specific canonical ---
const plHome = read('pl/index.html');
const plJsonLd = [...plHome.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const siteEntityGraph = plJsonLd.find((value) => Array.isArray(value['@graph']));
const siteEntityIds = new Set((siteEntityGraph?.['@graph'] ?? []).map((node) => node['@id']));
const siteNightClub = (siteEntityGraph?.['@graph'] ?? []).find(
  (node) => node['@id'] === `${CANONICAL_ORIGIN}/#nightclub`,
);
assert(
  'site JSON-LD connects legal organization, R32 venue, nightclub, and website in one graph',
  siteEntityIds.size === 4
    && siteEntityIds.has(`${CANONICAL_ORIGIN}/#organization`)
    && siteEntityIds.has('https://www.r32.com.pl/#eventvenue')
    && siteEntityIds.has(`${CANONICAL_ORIGIN}/#nightclub`)
    && siteEntityIds.has(`${CANONICAL_ORIGIN}/#website`),
);
assert(
  'nightclub sameAs uses the durable official Facebook profile',
  Array.isArray(siteNightClub?.sameAs)
    && siteNightClub.sameAs.includes(FACEBOOK_URL)
    && siteNightClub.sameAs.every((url) => !/facebook\.com\/share\//.test(url)),
);
assert('hreflang has 5 locales', (plHome.match(/rel="alternate" hreflang="(pl|en|de|it|cs)"/g) || []).length === 5);
assert('hreflang x-default present', plHome.includes('hreflang="x-default"'));
assert('pl canonical is final /pl/', plHome.includes(`href="${CANONICAL_ORIGIN}/pl/"`));
assert('en canonical is final locale-specific URL', read('en/index.html').includes(`rel="canonical" href="${CANONICAL_ORIGIN}/en/"`));

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
for (const locale of LOCALES) {
  const html = b2bPages[locale];
  const forms = html.match(/<form\b[^>]*\bname="b2b-enquiry"[^>]*>[\s\S]*?<\/form>/g) ?? [];
  const form = forms[0] ?? '';
  const openTag = form.match(/^<form\b[^>]*>/)?.[0] ?? '';
  const errorStatus = form.match(/<div class="b2b-form-status b2b-status-error"[\s\S]*?<\/div>/)?.[0] ?? '';

  assert(`${locale} has exactly one b2b-enquiry form`, forms.length === 1);
  assert(
    `${locale} form has Netlify POST and honeypot attributes`,
    openTag.includes('method="POST"')
      && openTag.includes('data-netlify="true"')
      && openTag.includes('netlify-honeypot="bot-field"'),
  );
  assert(
    `${locale} form has the static form-name detector`,
    form.includes('type="hidden" name="form-name" value="b2b-enquiry"'),
  );
  assert(
    `${locale} form has the bot-field detector`,
    /<input\b[^>]*\btype="text"[^>]*\bname="bot-field"/.test(form),
  );
  assert(
    `${locale} error fallback contains the launch contacts`,
    errorStatus.includes('events@r32.com.pl') && errorStatus.includes('+48 514 032 930'),
  );
}
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
  'event_type', 'guests', 'preferred_date', 'preferred_date_iso', 'date_flexible', 'space', 'duration', 'message', 'consent',
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
    !/\blang=/.test(bannerTag),
  );
  assert(
    `${locale} notice dialog label is localized`,
    bannerTag.includes(`aria-label="${noticeDialogLabel[locale]}"`),
  );
  assert(`${locale} notice has no accept/reject choice pair`, !home.includes('data-cookie='));
}
for (const [locale, { route, description, ogDescription }] of Object.entries(cookieMeta)) {
  const page = read(`${locale}/${route}/index.html`);
  assert(
    `${locale} cookie metadata is localized`,
    page.includes(`<meta name="description" content="${description}">`)
      && page.includes(`<meta property="og:description" content="${ogDescription}">`)
      && page.includes(`<meta name="twitter:description" content="${ogDescription}">`),
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

// --- generated response policy: exact CSP/security headers + bounded caching ---
const headersOutput = exists('_headers') ? read('_headers') : '';
let headerRules = [];
let headerParseError;
try {
  headerRules = parseHeaderRules(headersOutput);
} catch (error) {
  headerParseError = error;
}
const bootstrapHash = "'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw='";
const expectedCsp = [
  "default-src 'self'",
  `script-src 'self' ${bootstrapHash}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');
const revalidate = 'public, max-age=0, must-revalidate';
const immutable = 'public, max-age=31536000, immutable';
const expectedRulePatterns = ['/*', '/assets/*', '/fonts/*'];
const expectedSecurityHeaders = {
  'Content-Security-Policy': expectedCsp,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
assert('dist/_headers generated', exists('_headers'));
assert('dist/_headers parses as deterministic path rules', !headerParseError);
assert(
  'response rules use exact Netlify merge order',
  headerRules.length === expectedRulePatterns.length
    && headerRules.every(({ pattern }, index) => pattern === expectedRulePatterns[index]),
);
assert(
  'every response rule repeats the complete security tuple',
  headerRules.length === expectedRulePatterns.length
    && headerRules.every(({ headers }) => Object.entries(expectedSecurityHeaders)
      .every(([name, value]) => headers[name] === value)),
);
assert(
  'root CSP is the exact launch policy',
  headerRules[0]?.pattern === '/*'
    && headerRules[0]?.headers['Content-Security-Policy'] === expectedCsp,
);
assert(
  'root security headers are complete',
  Object.entries(expectedSecurityHeaders)
    .every(([name, value]) => headerRules[0]?.headers[name] === value),
);
assert(
  'each CSP contains exactly the permitted inline hash',
  headerRules.length === expectedRulePatterns.length
    && headerRules.every(({ headers }) => {
      const hashes = headers['Content-Security-Policy']?.match(/'sha256-[A-Za-z0-9+/]+=*'/g) ?? [];
      return hashes.length === 1 && hashes[0] === bootstrapHash;
    }),
);
assert(
  'cache policy: content-addressed assets are immutable',
  headerRules[1]?.headers['Cache-Control'] === immutable,
);
assert(
  'cache policy: fonts are immutable',
  headerRules[2]?.headers['Cache-Control'] === immutable,
);
assert(
  'cache policy: safe request-path fallback revalidates',
  headerRules[0]?.headers['Cache-Control'] === revalidate,
);
for (const pathname of ['/', '/pl/', '/menu', '/definitely-missing/', '/404']) {
  assert(
    `request path ${pathname} safely revalidates`,
    headersForPath(headerRules, pathname)['Cache-Control'] === revalidate,
  );
}
assert(
  'request-path precedence keeps content-addressed assets immutable',
  headersForPath(headerRules, '/assets/app.abcdef12.js')['Cache-Control'] === immutable,
);
assert(
  'request-path precedence keeps approved local fonts immutable',
  headersForPath(headerRules, '/fonts/cal-sans-400-latin.woff2')['Cache-Control'] === immutable,
);
assert(
  'wildcard CORS is absent from generated and Netlify headers',
  !/Access-Control-Allow-Origin/i.test(headersOutput) && !/Access-Control-Allow-Origin/i.test(toml),
);
assert('generated _headers is the only cache-policy authority', !/\bCache-Control\s*=/i.test(toml));

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
const assetFiles = files.filter((file) => file.startsWith(join(DIST, 'assets') + '/'));
const cacheKinds = new Map([
  ['.png', 'image'], ['.jpg', 'image'], ['.jpeg', 'image'], ['.webp', 'image'],
  ['.avif', 'image'], ['.svg', 'image'], ['.gif', 'image'], ['.ico', 'image'],
  ['.mp4', 'media'], ['.webm', 'media'],
  ['.woff', 'font'], ['.woff2', 'font'], ['.ttf', 'font'], ['.otf', 'font'],
]);
const expectedCacheFiles = files
  .filter((file) => cacheKinds.has(extname(file).toLowerCase()))
  .map((file) => ({
    requestPath: `/${relative(DIST, file).split(sep).join('/')}`,
    kind: cacheKinds.get(extname(file).toLowerCase()),
  }))
  .sort((a, b) => a.requestPath.localeCompare(b.requestPath));
const expectedCacheTotals = {
  image: expectedCacheFiles.filter(({ kind }) => kind === 'image').length,
  media: expectedCacheFiles.filter(({ kind }) => kind === 'media').length,
  font: expectedCacheFiles.filter(({ kind }) => kind === 'font').length,
};
let cacheInventory = { files: [], totals: { image: 0, media: 0, font: 0, total: 0, immutable: 0, revalidate: 0 } };
let cacheInventoryError;
try {
  cacheInventory = cacheAssetInventory(DIST, headerRules);
} catch (error) {
  cacheInventoryError = error;
}
const allHtml = htmls.map((file) => readFileSync(file, 'utf8')).join('\n');
const sitemapXml = read('sitemap.xml');
const robotsSource = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8');
assert('rendered HTML uses the final www origin', allHtml.includes(CANONICAL_ORIGIN));
assert('rendered HTML contains no bare absolute origin', !allHtml.includes(BARE_ORIGIN));
assert('sitemap uses the final www origin', sitemapXml.includes(`<loc>${CANONICAL_ORIGIN}/`));
assert('sitemap contains no bare absolute origin', !sitemapXml.includes(BARE_ORIGIN));
assert(
  'robots.txt names the final-host sitemap',
  robotsSource.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`) && !robotsSource.includes(BARE_ORIGIN),
);
const externalScriptBodies = scripts.map((file) => readFileSync(file, 'utf8'));
const inlineScriptBodies = htmls.flatMap((file) => executableInlineScripts(readFileSync(file, 'utf8')));
const executableBuiltText = [...externalScriptBodies, ...inlineScriptBodies].join('\n');
assert(
  'rendered pages omit the stacked summer-hours modal and its storage key',
  !allHtml.includes('data-popup') && !executableBuiltText.includes('sisi-summer-fri-dismissed'),
);
assert('build inventory finds external JavaScript', scripts.length > 0);
assert(
  'immutable asset cache rule covers emitted content-addressed files',
  assetFiles.length > 0
    && assetFiles.every((file) => /\.[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(file)),
);
assert('every emitted image/media/font resolves through the generated matcher', !cacheInventoryError);
assert(
  `cache inventory covers exactly ${expectedCacheFiles.length} emitted image/media/font files`,
  cacheInventory.files.length === expectedCacheFiles.length
    && cacheInventory.files.every(({ requestPath }, index) => requestPath === expectedCacheFiles[index]?.requestPath),
);
for (const kind of ['image', 'media', 'font']) {
  assert(
    `cache inventory ${kind} total = ${expectedCacheTotals[kind]}`,
    expectedCacheTotals[kind] > 0 && cacheInventory.totals[kind] === expectedCacheTotals[kind],
  );
}
assert(
  `cache policy totals cover all ${expectedCacheFiles.length} emitted files`,
  cacheInventory.totals.total === expectedCacheFiles.length
    && cacheInventory.totals.immutable + cacheInventory.totals.revalidate === expectedCacheFiles.length,
);
assert(
  'root icons, Framer assets, Google fonts, and nested Framer fonts are inventoried',
  [
    (path) => path === '/favicon.svg',
    (path) => path.startsWith('/framerusercontent.com/assets/'),
    (path) => path.startsWith('/fonts.gstatic.com/'),
    (path) => path.startsWith('/framerusercontent.com/third-party-assets/'),
  ].every((matches) => cacheInventory.files.some(({ requestPath }) => matches(requestPath))),
);
assert(
  'immutable caching is limited to approved /fonts and content-addressed /assets paths',
  cacheInventory.files.every(({ requestPath, cacheControl }) => {
    const approved = requestPath.startsWith('/fonts/') || requestPath.startsWith('/assets/');
    return approved ? cacheControl === immutable : cacheControl === revalidate;
  }),
);
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
  // 663 m² and up-to-500 standing are owner-verified (2026-07-14); the remaining
  // patterns still block unverified age, timing and schema claims in the html.
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
assert(
  'SiSi Fridays placeholder is not published',
  !allHtml.includes('SiSi Fridays')
    && !allHtml.includes('DJ Marta Kwiatek')
    && !existsSync(join(DIST, 'pl/wydarzenia/2026-07-17-sisi-fridays/index.html'))
    && !existsSync(join(DIST, 'events/2026-07-17-sisi-fridays.webp')),
);
assert('no stale June event routes', !existsSync(join(DIST, 'pl/wydarzenia/2026-06-26-friday-at-sisi/index.html')));
// The home shows the empty-event copy only while there is nothing to list;
// once staff publish an event in Drive it renders the lineup instead. So this
// invariant applies to the zero-event build only - the same reason eventCount
// is derived dynamically above (publishing an event must never fail CI).
if (eventCount === 0) {
  for (const locale of LOCALES) {
    const home = read(`${locale}/index.html`);
    const eventOutlineCtas = home.match(new RegExp(
      `<a\\b(?=[^>]*href="/${locale}/${EVENT_ROUTES[locale]}/")(?=[^>]*class="btn-outline")[^>]*>`,
      'g',
    )) ?? [];
    assert(`${locale} home has empty event state`, home.includes(emptyEventCopy[locale]));
    assert(`${locale} home hides event CTAs while the event feed is empty`, eventOutlineCtas.length === 0);
  }
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
