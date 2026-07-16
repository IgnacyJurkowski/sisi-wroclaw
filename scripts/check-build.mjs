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
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=SISI%20%7C%20Music%20Club%20Wroc%C5%82aw&query_place_id=ChIJS14DTYDDD0cRWrK8z0wRcsM';
const MAPS_HREF = `href="${MAPS_URL.replaceAll('&', '&amp;')}"`;

if (!existsSync(DIST)) {
  console.error('dist/ not found - run `npm run build` first.');
  process.exit(1);
}

const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const exists = (rel) => existsSync(join(DIST, rel));
const results = [];
const assert = (label, cond) => results.push([label, !!cond]);

// --- navigation: approved desktop spacing and compact breakpoint ---
const globalCssSource = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');
assert(
  'desktop nav uses the approved 1120px width',
  globalCssSource.includes('width: min(1120px, calc(100vw - 2rem));'),
);
assert(
  'desktop nav separates its center and right clusters by 40px',
  /#main-nav\s*\{[\s\S]*?display: flex; align-items: center; gap: 40px;/.test(globalCssSource),
);
assert(
  'desktop nav separates the last link and reservation CTA by 40px',
  globalCssSource.includes('.nav-center { display: flex; align-items: center; gap: 40px; flex-shrink: 0; }'),
);
assert(
  'desktop nav separates links by 32px',
  globalCssSource.includes('.nav-links { display: flex; align-items: center; gap: 32px; }'),
);
assert(
  'compact navigation begins at 1100px',
  globalCssSource.includes('@media (max-width: 1100px) {'),
);
assert(
  'compact navigation no longer waits until 860px',
  !globalCssSource.includes('@media (max-width: 860px) {'),
);
assert(
  'mobile reservation CTA dimensions stay unchanged',
  globalCssSource.includes('.nav-cta { padding: 8px 13px; font-size: 10px; letter-spacing: 0.05em; }'),
);

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
const PAGE_TITLES = {
  pl: {
    home: 'Klub muzyczny i bar koktajlowy we Wrocławiu | SiSi',
    menu: 'Karta baru i koktajle | SiSi Wrocław',
    contact: 'Kontakt i dane firmy | SiSi Wrocław',
  },
  en: {
    home: 'Music Club & Cocktail Bar in Wrocław | SiSi',
    menu: 'Bar Menu & Cocktails | SiSi Wrocław',
    contact: 'Contact & Company Details | SiSi Wrocław',
  },
  de: {
    home: 'Musikclub & Cocktailbar in Breslau | SiSi',
    menu: 'Barkarte & Cocktails | SiSi Wrocław',
    contact: 'Kontakt & Unternehmensdaten | SiSi Wrocław',
  },
  it: {
    home: 'Music club e cocktail bar a Breslavia | SiSi',
    menu: 'Menu bar e cocktail | SiSi Wrocław',
    contact: 'Contatti e dati societari | SiSi Wrocław',
  },
  cs: {
    home: 'Hudební klub a koktejlový bar ve Vratislavi | SiSi',
    menu: 'Barové menu a koktejly | SiSi Wrocław',
    contact: 'Kontakt a firemní údaje | SiSi Wrocław',
  },
};
const HERO_DESCRIPTORS = {
  pl: 'Klub muzyczny, live acts, DJ-e i koktajle w centrum Wrocławia.',
  en: 'Music club, live acts, DJs and cocktails in central Wrocław.',
  de: 'Musikclub, Live-Acts, DJs und Cocktails im Zentrum von Breslau.',
  it: 'Music club, live act, DJ e cocktail nel centro di Breslavia.',
  cs: 'Hudební klub, živá vystoupení, DJové a koktejly v centru Vratislavi.',
};
const TITLE_ROUTES = {
  pl: { home: '', menu: 'menu', contact: 'kontakt' },
  en: { home: '', menu: 'menu', contact: 'contact' },
  de: { home: '', menu: 'menu', contact: 'kontakt' },
  it: { home: '', menu: 'menu', contact: 'contatti' },
  cs: { home: '', menu: 'menu', contact: 'kontakt' },
};
const EVENT_ROUTES = { pl: 'wydarzenia', en: 'events', de: 'veranstaltungen', it: 'eventi', cs: 'akce' };
const emptyEventCopy = {
  pl: 'Wkrótce ogłosimy kolejne wydarzenia - śledź nas na Instagramie.',
  en: 'More events coming soon - follow us on Instagram.',
  de: 'Weitere Veranstaltungen folgen bald - folge uns auf Instagram.',
  it: 'Presto annunceremo nuovi eventi - seguici su Instagram.',
  cs: 'Brzy ohlásíme další akce - sledujte nás na Instagramu.',
};
const noticeCopy = {
  pl: 'Ta strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji. Szczegóły znajdziesz w Polityce cookies oraz Polityce prywatności.',
  en: 'This site stores only information that notices were dismissed and essential form and navigation state. Details are in our Cookie Policy and Privacy Policy.',
  de: 'Diese Website speichert ausschließlich, dass Hinweise geschlossen wurden, sowie notwendige Formular- und Navigationszustände. Einzelheiten findest du in unserer Cookie-Richtlinie und unserer Datenschutzerklärung.',
  it: 'Questo sito memorizza esclusivamente la chiusura degli avvisi e lo stato essenziale dei moduli e della navigazione. I dettagli sono disponibili nella nostra informativa sui cookie e nella nostra informativa sulla privacy.',
  cs: 'Tento web ukládá pouze informace o zavření oznámení a nezbytný stav formulářů a navigace. Podrobnosti najdete v našich zásadách používání souborů cookie a zásadách ochrany soukromí.',
};
const summerPopupCopy = {
  pl: 'W wakacje SiSi jest zamknięte w piątki — do 28 sierpnia 2026 r. włącznie.',
  en: 'During the summer, SiSi is closed on Fridays — through 28 August 2026 inclusive.',
  de: 'Im Sommer ist SiSi freitags geschlossen — bis einschließlich 28. August 2026.',
  it: 'Durante l’estate SiSi è chiuso il venerdì, fino al 28 agosto 2026 compreso.',
  cs: 'Během léta je SiSi v pátek zavřené — až do 28. srpna 2026 včetně.',
};
const summerPopupEyebrow = {
  pl: 'Wakacyjne godziny',
  en: 'Summer hours',
  de: 'Sommer-Öffnungszeiten',
  it: 'Orari estivi',
  cs: 'Letní otevírací doba',
};
const summerPopupDismiss = { pl: 'Rozumiem', en: 'Got it', de: 'Verstanden', it: 'Ho capito', cs: 'Rozumím' };
const summerPopupClose = { pl: 'Zamknij', en: 'Close', de: 'Schließen', it: 'Chiudi', cs: 'Zavřít' };
const noticeDismiss = { pl: 'Rozumiem', en: 'Got it', de: 'Verstanden', it: 'Ho capito', cs: 'Rozumím' };
const noticeDialogLabel = {
  pl: 'Informacja o niezbędnej pamięci',
  en: 'Essential storage notice',
  de: 'Hinweis zur notwendigen Speicherung',
  it: 'Avviso sull\'archiviazione essenziale',
  cs: 'Oznámení o nezbytném ukládání',
};
const cookieMeta = {
  pl: {
    route: 'polityka-cookies',
    description: 'Polityka cookies klubu SiSi Wrocław - pamięć niezbędna do zamknięcia komunikatów oraz obsługi formularzy i nawigacji.',
    ogDescription: 'Jak SiSi Wrocław korzysta z pamięci niezbędnej do obsługi komunikatów, formularzy i nawigacji.',
  },
  en: {
    route: 'cookie-policy',
    description: 'SiSi Wrocław cookie policy - essential storage used for notice dismissals and form and navigation state.',
    ogDescription: 'How SiSi Wrocław uses essential storage for notices, forms and navigation.',
  },
  de: {
    route: 'cookie-richtlinie',
    description: 'Cookie-Richtlinie von SiSi Wrocław - notwendige Speicherung für das Schließen von Hinweisen sowie für Formular- und Navigationszustände.',
    ogDescription: 'Wie SiSi Wrocław notwendige Speicherung für Hinweise, Formulare und die Navigation verwendet.',
  },
  it: {
    route: 'cookie',
    description: 'Informativa sui cookie di SiSi Wrocław - archiviazione essenziale usata per la chiusura degli avvisi e lo stato dei moduli e della navigazione.',
    ogDescription: 'Come SiSi Wrocław usa l\'archiviazione essenziale per gli avvisi, i moduli e la navigazione.',
  },
  cs: {
    route: 'zasady-cookies',
    description: 'Zásady používání souborů cookie SiSi Wrocław - nezbytné ukládání informací o zavření oznámení a stavu formulářů a navigace.',
    ogDescription: 'Jak SiSi Wrocław používá nezbytné ukládání pro oznámení, formuláře a navigaci.',
  },
};

// --- i18n: every locale homepage + B2B route builds ---
for (const l of LOCALES) assert(`home builds: /${l}/`, exists(`${l}/index.html`));
for (const locale of LOCALES) {
  for (const page of ['home', 'menu', 'contact']) {
    const route = TITLE_ROUTES[locale][page];
    const path = route ? `${locale}/${route}/index.html` : `${locale}/index.html`;
    const renderedTitle = read(path).match(/<title>([^<]*)<\/title>/)?.[1].replaceAll('&amp;', '&') ?? '';
    assert(`${locale} ${page} title is localized`, renderedTitle === PAGE_TITLES[locale][page]);
  }
}
for (const locale of LOCALES) {
  const home = read(`${locale}/index.html`);
  const heroTitleEnd = home.indexOf('</h1>');
  const heroDescriptor = home.match(
    /<p\b(?=[^>]*\bclass="hero-descriptor")(?=[^>]*\bdata-hero(?:\s|=|>))[^>]*>([^<]*)<\/p>/,
  );
  const heroDescriptorAt = heroDescriptor ? home.indexOf(heroDescriptor[0]) : -1;
  const heroActionsAt = home.search(
    /<div\b(?=[^>]*\bclass="hero-actions")(?=[^>]*\bdata-hero(?:\s|=|>))[^>]*>/,
  );
  assert(
    `${locale} hero names the venue category before its actions`,
    heroDescriptor?.[1] === HERO_DESCRIPTORS[locale]
      && heroDescriptorAt > heroTitleEnd
      && heroDescriptorAt < heroActionsAt
      && home.split('class="hero-descriptor"').length - 1 === 1,
  );
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
  assert(
    `${locale} footer uses the verified Google Maps place`,
    home.split(MAPS_HREF).length - 1 === 1
      && !home.includes('google.com/maps/dir//'),
  );
}
const RESERVATIONS = { pl: 'rezerwacje', en: 'reservations', de: 'reservierungen', it: 'prenotazioni', cs: 'rezervace' };
const CONTACTS = { pl: 'kontakt', en: 'contact', de: 'kontakt', it: 'contatti', cs: 'kontakt' };
const EMENAGO_LOCALES = { pl: 'pl', en: 'en', de: 'de', it: 'it', cs: 'pl' };
const RESERVATION_SECTION_TITLES = {
  pl: { practical: 'Informacje praktyczne', terms: 'Warunki rezerwacji' },
  en: { practical: 'Practical information', terms: 'Reservation terms' },
  de: { practical: 'Praktische Informationen', terms: 'Reservierungsbedingungen' },
  it: { practical: 'Informazioni pratiche', terms: 'Condizioni di prenotazione' },
  cs: { practical: 'Praktické informace', terms: 'Podmínky rezervace' },
};
const reservationSection = (html, section) => html.match(
  new RegExp(`<article\\b(?=[^>]*\\bdata-reservation-section="${section}")[^>]*>([\\s\\S]*?)<\\/article>`),
)?.[1] ?? '';
const renderedListItemCount = (html) => html.match(/<li\b/g)?.length ?? 0;
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
  assert(
    `${locale} reservation page uses the verified Google Maps place`,
    reservationPage.split(MAPS_HREF).length - 1 === 2
      && !reservationPage.includes('query=Rze%C5%BAnicza'),
  );
  const practicalSection = reservationSection(reservationPage, 'practical');
  const termsSection = reservationSection(reservationPage, 'terms');
  assert(
    `${locale} reservation facts are split into practical information and reservation terms`,
    Boolean(practicalSection && termsSection)
      && reservationPage.split('data-reservation-section=').length - 1 === 2
      && reservationPage.indexOf('data-reservation-section="practical"')
        < reservationPage.indexOf('data-reservation-section="terms"')
      && practicalSection.includes(`>${RESERVATION_SECTION_TITLES[locale].practical}</h2>`)
      && termsSection.includes(`>${RESERVATION_SECTION_TITLES[locale].terms}</h2>`)
      && renderedListItemCount(practicalSection) === 6
      && renderedListItemCount(termsSection) === 4
      && !practicalSection.includes('class="res-terms-note"')
      && termsSection.split('class="res-terms-note"').length - 1 === 1,
  );

  const contactPage = read(`${locale}/${CONTACTS[locale]}/index.html`);
  assert(
    `${locale} contact page uses the verified Google Maps place`,
    contactPage.split(MAPS_HREF).length - 1 === 2
      && !contactPage.includes('query=Rze%C5%BAnicza'),
  );
}
const B2B = { pl: 'eventy-firmowe', en: 'corporate-events', de: 'firmenevents', it: 'eventi-aziendali', cs: 'firemni-akce' };
for (const l of LOCALES) assert(`b2b builds: /${l}/${B2B[l]}/`, exists(`${l}/${B2B[l]}/index.html`));
const b2bPages = Object.fromEntries(LOCALES.map((locale) => [locale, read(`${locale}/${B2B[locale]}/index.html`)]));
const PRIVATE_EVENTS = {
  pl: 'imprezy-prywatne',
  en: 'private-events',
  de: 'private-feiern',
  it: 'eventi-privati',
  cs: 'soukrome-akce',
};
const PRIVATE_EVENT_TITLES = {
  pl: 'Imprezy prywatne i urodziny we Wrocławiu | SiSi',
  en: 'Private Events & Birthday Parties in Wrocław | SiSi',
  de: 'Private Feiern & Geburtstage in Breslau | SiSi',
  it: 'Eventi privati e compleanni a Breslavia | SiSi',
  cs: 'Soukromé akce a narozeniny ve Vratislavi | SiSi',
};
const PRIVATE_FORM_INTROS = {
  pl: 'Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję.',
  en: 'Share your preferred date, guest count and occasion. Our team will prepare a tailored proposal.',
  de: 'Nenne uns deinen Wunschtermin, die Gästezahl und den Anlass. Unser Team erstellt ein individuelles Angebot.',
  it: 'Indicaci la data prevista, il numero di ospiti e l\'occasione. Il nostro team preparerà una proposta personalizzata.',
  cs: 'Uveďte plánovaný termín, počet hostů a typ příležitosti. Náš tým připraví individuální nabídku.',
};
for (const locale of LOCALES) {
  assert(
    `private events builds: /${locale}/${PRIVATE_EVENTS[locale]}/`,
    exists(`${locale}/${PRIVATE_EVENTS[locale]}/index.html`),
  );
}
const privateEventPages = Object.fromEntries(LOCALES.map((locale) => {
  const path = `${locale}/${PRIVATE_EVENTS[locale]}/index.html`;
  return [locale, exists(path) ? read(path) : ''];
}));
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
const siteEventVenue = (siteEntityGraph?.['@graph'] ?? []).find(
  (node) => node['@id'] === 'https://www.r32.com.pl/#eventvenue',
);
const expectedVenueGeo = {
  '@type': 'GeoCoordinates',
  latitude: 51.1106472,
  longitude: 17.0279287,
};
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
assert('nightclub hasMap uses the verified Google Maps place', siteNightClub?.hasMap === MAPS_URL);
assert(
  'nightclub and R32 expose the verified venue coordinates',
  JSON.stringify(siteNightClub?.geo) === JSON.stringify(expectedVenueGeo)
    && JSON.stringify(siteEventVenue?.geo) === JSON.stringify(expectedVenueGeo),
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

// --- private events: approved Polish source copy + faithful localized journey ---
for (const locale of LOCALES) {
  const html = privateEventPages[locale];
  const routePath = `/${locale}/${PRIVATE_EVENTS[locale]}/`;
  const renderedTitle = html.match(/<title>([^<]*)<\/title>/)?.[1].replaceAll('&amp;', '&') ?? '';
  assert(`${locale} private-events title is localized`, renderedTitle === PRIVATE_EVENT_TITLES[locale]);
  assert(
    `${locale} private-events route is linked from desktop, mobile, footer, and locale navigation`,
    html.split(`href="${routePath}"`).length - 1 === 4,
  );
  assert(
    `${locale} private-events canonical and five hreflang alternates are present`,
    html.includes(`rel="canonical" href="${CANONICAL_ORIGIN}${routePath}"`)
      && (html.match(/rel="alternate" hreflang="(pl|en|de|it|cs)"/g) || []).length === 5
      && html.includes('hreflang="x-default"'),
  );
  const retainedSections = [
    'class="private-hero"',
    'class="private-occasions"',
    'class="private-pricing"',
    'id="private-enquiry"',
  ];
  const retainedSectionPositions = retainedSections.map((marker) => html.indexOf(marker));
  assert(
    `${locale} private-events journey is exactly hero, occasions, pricing, then form`,
    retainedSections.every((marker) => html.split(marker).length - 1 === 1)
      && retainedSectionPositions.every((position) => position >= 0)
      && retainedSectionPositions.every((position, index) => index === 0 || position > retainedSectionPositions[index - 1]),
  );
  assert(
    `${locale} private-events omits the broad B2B sections, FAQ, and spaces CTA`,
    [
      'class="b2b-facts"',
      'class="b2b-included"',
      'id="private-spaces"',
      'class="b2b-process"',
      'class="private-faq"',
      '"@type":"FAQPage"',
      'href="#private-spaces"',
    ].every((marker) => !html.includes(marker)),
  );
  assert(
    `${locale} private-events form intro matches the approved concise journey`,
    html.includes(PRIVATE_FORM_INTROS[locale].replaceAll("'", '&#39;')),
  );
}

const plPrivateEvents = privateEventPages.pl;
for (const approvedCopy of [
  'Imprezy prywatne w centrum Wrocławia',
  'Imprezy prywatne w sercu Wrocławia',
  'Urodziny, rocznice i prywatne przyjęcia w SiSi, The Cork lub całym R32. Wybierz przestrzeń na wyłączność i ustal z naszym zespołem bar, catering, muzykę oraz oprawę wydarzenia.',
  'Prywatne okazje w R32',
  'Kolacja, bar i muzyka w formacie ustalonym z naszym zespołem.',
  'Prywatna kolacja lub wieczorne przyjęcie w wybranej przestrzeni.',
  'Wydarzenia dla zaproszonych gości z cateringiem, barem i oprawą muzyczną.',
  'SiSi, The Cork lub cały kompleks R32 mogą być wynajęte na wyłączność.',
  'Wycena indywidualna',
  'Koszt ustalamy indywidualnie po omówieniu szczegółów wydarzenia. Termin potwierdzamy umową i zaliczką, a pozostała część jest płatna przed wydarzeniem.',
  'Opowiedz nam o swojej okazji',
  'Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję.',
  'Dziękujemy za zapytanie. Odezwiemy się z indywidualną propozycją.',
]) {
  assert(`private-events Polish copy: ${approvedCopy.slice(0, 48)}`, plPrivateEvents.includes(approvedCopy));
}
assert(
  'private-events page includes only approved individual-pricing terms',
  !/minimum spend|minimaln(?:a|y)|cena od|\b[0-9]+\s*zł\b/i.test(plPrivateEvents),
);

// --- private consumer form: separate Netlify identity, no company field ---
for (const locale of LOCALES) {
  const html = privateEventPages[locale];
  const forms = html.match(/<form\b[^>]*\bname="private-enquiry"[^>]*>[\s\S]*?<\/form>/g) ?? [];
  const form = forms[0] ?? '';
  const openTag = form.match(/^<form\b[^>]*>/)?.[0] ?? '';
  const errorStatus = form.match(/<div class="private-form-status private-status-error"[\s\S]*?<\/div>/)?.[0] ?? '';
  const submittedFields = [
    'form-name', 'subject', 'locale', 'page', 'utm', 'bot-field', 'name', 'email', 'phone',
    'occasion', 'guests', 'preferred_date', 'preferred_date_iso', 'message', 'consent',
  ];
  const renderedFields = [...form.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="([^"]+)"/g)]
    .map((match) => match[1]);
  const requiredFields = ['name', 'email', 'occasion', 'guests', 'preferred_date', 'message', 'consent'];

  assert(`${locale} has exactly one private-enquiry form`, forms.length === 1);
  assert(
    `${locale} private form has Netlify POST and honeypot attributes`,
    openTag.includes('method="POST"')
      && openTag.includes('data-netlify="true"')
      && openTag.includes('netlify-honeypot="bot-field"')
      && openTag.includes('data-private-events-form'),
  );
  assert(
    `${locale} private form has its own detector and notification subject`,
    form.includes('type="hidden" name="form-name" value="private-enquiry"')
      && form.includes('type="hidden" name="subject"'),
  );
  assert(
    `${locale} private form submits exactly the approved field set`,
    JSON.stringify(renderedFields) === JSON.stringify(submittedFields),
  );
  assert(
    `${locale} private form requires the approved consumer fields`,
    requiredFields.every((name) => new RegExp(`<(?:input|select|textarea)\\b(?=[^>]*\\bname="${name}")(?=[^>]*\\brequired(?:\\s|=|>))[^>]*>`).test(form)),
  );
  assert(
    `${locale} private form has no company or flexible-date field`,
    !/\bname="company"/.test(form) && !/\bname="date_flexible"/.test(form),
  );
  assert(
    `${locale} private form error fallback contains the events contacts`,
    errorStatus.includes('events@r32.com.pl') && errorStatus.includes('+48 514 032 930'),
  );
}
// --- case studies: publish proof only when a real, approved project exists ---
for (const locale of LOCALES) {
  assert(
    `${locale} omits the case-study section while no project is published`,
    !b2bPages[locale].includes('<section class="b2b-projects">')
      && !b2bPages[locale].includes('b2b-projects-empty'),
  );
}
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
assert(
  'corporate form has a neutral notification subject',
  enB2BForm.includes('type="hidden" name="subject"'),
);
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
  const popupStart = home.indexOf('<div class="sisi-popup"');
  const popupEnd = home.indexOf('<div id="cookie-banner"', popupStart);
  const popupMarkup = popupStart >= 0 && popupEnd > popupStart ? home.slice(popupStart, popupEnd) : '';
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
  assert(`${locale} has one summer-hours popup`, (home.match(/data-summer-popup/g) || []).length === 1);
  assert(`${locale} has exact summer-hours copy`, home.includes(summerPopupCopy[locale]));
  assert(
    `${locale} has exact summer-hours eyebrow`,
    popupMarkup.includes(`>${summerPopupEyebrow[locale]}</p>`),
  );
  assert(
    `${locale} has exact summer-hours confirmation copy`,
    popupMarkup.includes(`>${summerPopupDismiss[locale]}</button>`),
  );
  assert(
    `${locale} summer popup is an accessible modal`,
    home.includes('role="dialog" aria-modal="true"')
      && (home.match(/data-popup-focus/g) || []).length === 1
      && home.includes(`aria-label="${summerPopupClose[locale]}"`),
  );
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
const sitemapBaseCount = eventCount > 0 ? 55 : 50;
assert(
  `sitemap urls = ${sitemapBaseCount} base + ${eventCount} events x5`,
  (read('sitemap.xml').match(/<loc>/g) || []).length === sitemapBaseCount + eventCount * 5,
);

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
  'rendered pages include the time-bounded summer-hours modal and season-specific key',
  allHtml.includes('data-summer-popup')
    && executableBuiltText.includes('sisi-summer-fri-2026-dismissed')
    && executableBuiltText.includes('2026-08-28T22:00:00.000Z')
    && !/[`'"]sisi-summer-fri-dismissed[`'"]/.test(executableBuiltText),
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
  'notice runtimes use only the disclosed dismissal records and values',
  [
    'sisi-cookie-notice',
    'sisi-summer-fri-2026-dismissed',
    'dismissed',
    'localStorage.removeItem',
    'localStorage.getItem',
    'localStorage.setItem',
  ].every((token) => executableBuiltText.includes(token))
    && !/[`'"](?:accepted|rejected)[`'"]/.test(executableBuiltText),
);
const popupSourcePath = join(ROOT, 'src/components/Popup.astro');
const popupSource = existsSync(popupSourcePath) ? readFileSync(popupSourcePath, 'utf8') : '';
assert(
  'summer notice storage reads, cleanup, and writes are guarded',
  /try\s*\{[\s\S]*?localStorage\.removeItem\(SUMMER_FRIDAY_NOTICE\.storageKey\)[\s\S]*?localStorage\.getItem\(SUMMER_FRIDAY_NOTICE\.storageKey\)[\s\S]*?\}\s*catch\s*\{\}/.test(popupSource)
    && /try\s*\{\s*localStorage\.setItem\(SUMMER_FRIDAY_NOTICE\.storageKey,\s*['"]dismissed['"]\);?\s*\}\s*catch\s*\{\}/.test(popupSource),
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
  /let dismissed = false;[\s\S]*?catch\s*\{\}[\s\S]*?const reveal\s*=\s*\(\)\s*=>\s*\{\s*if\s*\(!dismissed\s*&&\s*banner\)\s*banner\.hidden\s*=\s*false;\s*\};/.test(cookieSource)
    && /addEventListener\(['"]click['"][\s\S]*?try\s*\{\s*localStorage\.setItem\(KEY,\s*['"]dismissed['"]\);?\s*\}\s*catch\s*\{\}[\s\S]*?banner\.hidden\s*=\s*true;/.test(cookieSource),
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
// While Drive has no real event, keep every empty-calendar entry point out of
// the public journey. The components and sitemap restore automatically once a
// validated event is published, so a future sync must not require code edits.
if (eventCount === 0) {
  const sitemap = read('sitemap.xml');
  for (const locale of LOCALES) {
    const home = read(`${locale}/index.html`);
    const eventHref = `/${locale}/${EVENT_ROUTES[locale]}/`;
    assert(
      `${locale} home omits the empty event block and placeholder copy`,
      !home.includes('<section id="wydarzenia"') && !home.includes(emptyEventCopy[locale]),
    );
    assert(
      `${locale} shared navigation omits the empty event hub`,
      !home.includes(`href="${eventHref}"`),
    );
    assert(
      `${locale} sitemap omits the empty event hub`,
      !sitemap.includes(`<loc>${CANONICAL_ORIGIN}${eventHref}</loc>`),
    );
  }
}
assert('no leaked {tokens} in html', leaked.length === 0);
assert(`html pages = 57 base + ${eventCount} events x5`, htmls.length === 57 + eventCount * 5);

// --- report ---
let failed = 0;
for (const [label, ok] of results) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
if (leaked.length) console.log('leaked tokens in:', leaked.map((f) => f.replace(DIST, '')).join(', '));
process.exit(failed ? 1 : 0);
