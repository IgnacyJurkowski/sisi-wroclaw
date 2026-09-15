/* The Cork restaurant's party offer, ported from the restaurant's own party
 * configurator (thecork.pl/konfigurator_imprez/, captured 2026-09-15) so the
 * R32 configurator can price a dinner at The Cork without sending visitors to
 * a second tool. The restaurant owns these numbers: change them here only when
 * The Cork changes its offer. Plain JS (not TS) so scripts/check-build.mjs can
 * import the same module and assert that every restaurant price on the page
 * comes from this file.
 *
 * Dish and package names are the restaurant's Polish menu wording and are
 * shown as-is in every language, like event titles; the UI labels around them
 * live in the dictionaries.
 */

/** Groups smaller than this are booked as ordinary table reservations. */
export const CORK_MIN_GUESTS = 10;
/** From this size the whole restaurant can be hired exclusively (individual quote). */
export const CORK_EXCLUSIVE_FROM = 60;
/** Service charge applied to the whole restaurant offer, à la carte included. */
export const CORK_SERVICE_FEE = 0.1;
/** Deposit share, payable 7 days before the event; the rest at the end. */
export const CORK_DEPOSIT_SHARE = 0.5;
/** Children 6-15 pay half of the food menu; 0-5 eat free. */
export const CORK_CHILD_SHARE = 0.5;

/** Included base time by adult head-count, then the paid extensions. */
export const CORK_BASE_HOURS = [
  { minGuests: 10, hours: 3 },
  { minGuests: 12, hours: 4 },
  { minGuests: 15, hours: 5 },
  { minGuests: CORK_EXCLUSIVE_FROM, hours: null }, // agreed individually
];
export const CORK_EXTENSIONS = [
  { key: 'none', hours: 0, surcharge: 0 },
  { key: 'plus1', hours: 1, surcharge: 0.1 },
  { key: 'plus2', hours: 2, surcharge: 0.2 },
];

/** Start-time windows (first and last slot, 30-minute steps) by weekday, 0 = Sunday. */
export const CORK_START_WINDOWS = {
  0: ['13:00', '18:30'],
  1: ['17:00', '20:30'],
  2: ['17:00', '20:30'],
  3: ['17:00', '20:30'],
  4: ['17:00', '20:30'],
  5: ['17:00', '21:00'],
  6: ['14:00', '21:00'],
};

/**
 * Sharing-menu courses. `packages` are priced per adult; `dishes` are the
 * choices a package draws from (pick up to `size`).
 * @typedef {{ key: string, label: string, size: number, unit: string, price: number | null }} CorkPackage
 * @typedef {{ name: string, desc: string, note?: string }} CorkDish
 * @type {{ key: string, numeral: string, title: string, included?: boolean, optional?: boolean, packages: CorkPackage[], defaultPackage?: string, dishes: CorkDish[] }[]}
 */
export const CORK_COURSES = [
  {
    key: 'welcome',
    numeral: 'I',
    title: 'Rytuał oliwy',
    included: true,
    packages: [],
    dishes: [{ name: 'Chleb & oliwa Albania Gold', desc: 'Domowy chleb · oliwa Velagosh · Dukkah pistacjowa' }],
  },
  {
    key: 'starters',
    numeral: 'II',
    title: 'Pierwsze odkrycie',
    packages: [
      { key: 'four', label: 'Cztery pierwsze odkrycia', size: 4, unit: 'przystawki', price: 80 },
      { key: 'five', label: 'Pięć pierwszych odkryć', size: 5, unit: 'przystawek', price: 95 },
      { key: 'alacarte', label: 'Decyzja Gości przy stole', size: 0, unit: 'à la carte', price: null },
    ],
    defaultPackage: 'four',
    dishes: [
      { name: 'Matjas', desc: 'Grzanka żytnia · twarożek z czosnkiem niedźwiedzim · młody bób · pikle · oliwa koperkowa' },
      { name: 'Burrata Pugliese & pomidory', desc: 'Lokalne pomidory · bazylia · purée malinowe · oliwa Coratina · pistacja' },
      { name: 'Siekana polędwica wołowa & borowiki', desc: 'Ogórki · szalotka · musztarda · lubczyk · żółtko · chilli · kapelusze borowika · Emilgrana', note: '100 g · porcja 200 g: 86 zł' },
      { name: 'Przegrzebki św. Jakuba', desc: 'Krem z trawy cytrynowej · oliwa kolendrowa · bliny z dzikiego ryżu · chilli' },
      { name: 'Green Plate', desc: 'Młode sałaty · zioła · pomidor · shiitake · seler · czerwona cebula · estragon · chipsy warzywne', note: 'Kurczak +29 zł · krewetki +44 zł · polędwica +59 zł' },
      { name: 'Talerz Corka', desc: 'Jamon Duroc Gran Reserva · Spianata · Bresaola · rillettes z kaczki · oliwki · marynowane warzywa' },
      { name: 'Sery dla Corka', desc: 'Sery kozie, owcze i krowie · oliwki · musztarda pomarańczowa · orzech włoski' },
      { name: 'Mix Corka', desc: 'Wędliny · rillettes z kaczki · warzywa · sery · oliwki · konfitura pomarańczowa' },
      { name: 'Pieczone chorizo & chrupiąca kaszanka', desc: 'Warzywa · Pimentón de la Vera' },
    ],
  },
  {
    key: 'mains',
    numeral: 'III',
    title: 'Serce kulinarnej podróży',
    packages: [
      { key: 'four', label: 'Cztery kierunki podróży', size: 4, unit: 'dania główne', price: 139 },
      { key: 'five', label: 'Pięć kierunków podróży', size: 5, unit: 'dań głównych', price: 159 },
      { key: 'alacarte', label: 'Decyzja Gości przy stole', size: 0, unit: 'à la carte', price: null },
    ],
    defaultPackage: 'four',
    dishes: [
      { name: 'Domowe spaghetti & pomidory', desc: 'Lokalne pomidory · bazylia · pieprz młotkowany · stracciatella di burrata' },
      { name: 'Risotto & kurki', desc: 'Pieczone kurki · suszone pomidory · Gorgonzola Dolce · młody szpinak · oliwa ziołowa', note: 'Kurczak +29 zł · krewetki +44 zł · polędwica +59 zł' },
      { name: 'Wołowina Rubia Gallega', desc: 'Polędwica · pieczone pomidory · beza ziemniaczana · kurki w śmietanie · sos z palonego masła i zielonego pieprzu' },
      { name: 'Wołowina Wagyu Tataki A5/A5+', desc: 'Rostbef · dziki brokuł · piklowana rzodkiew · sos brązowy · frytka z majonezem truflowym' },
      { name: 'Schab Iberico z kością', desc: 'Chrupiący kotlet · kremowe purée ziemniaczane · sałatka z pomidorów · cebulka' },
      { name: 'Kurczak filet supreme & pomidory', desc: 'Duszone lokalne pomidory · domowe gnocchi · ricotta · pesto bazyliowe · dziki brokuł' },
      { name: 'Tuńczyk Tataki', desc: 'Domowe guacamole · pico de gallo · papadamy · czarnuszka' },
      { name: 'Krewetki & ośmiornica', desc: 'Czosnek · masło · natka · chilli · oliwki Sarasa · papryczka Padrón · chrupiące ziemniaki' },
      { name: 'Sandacz & kurki', desc: 'Młody szpinak · kurki · śmietanka · kremowe purée ziemniaczane · czosnek · koper' },
    ],
  },
  {
    key: 'desserts',
    numeral: 'IV',
    title: 'Słodki finał',
    optional: true,
    packages: [
      { key: 'three', label: 'Pakiet finałowy', size: 3, unit: 'słodkie finały', price: 38 },
      { key: 'alacarte', label: 'Decyzja Gości przy stole', size: 0, unit: 'à la carte', price: null },
    ],
    defaultPackage: 'alacarte',
    dishes: [
      { name: 'Tarta morelowa & kwiat bzu', desc: 'Morele · migdały · kwiaty bzu · sorbet prosecco · likier St-Germain' },
      { name: 'Fondant pistacjowy', desc: 'Sos z białej czekolady i fasoli Tonka · lody śmietankowe' },
      { name: 'Beza & jagoda & borówki', desc: 'Mascarpone · jagody · borówki · lody z kwaśnej śmietany · oliwa miętowa' },
      { name: 'Lody & oliwa', desc: 'Pistacja Sicilian Bronte lub lody z liścia figowca', note: '60 g' },
    ],
  },
];

/** Drinks, all per adult (children never count) or one flat amount. */
export const CORK_WINE_PACKAGES = [
  { key: 'wine3', label: 'Pierwsze spotkanie', detail: 'do 3 godzin', price: 70 },
  { key: 'wine4', label: 'Dłuższa opowieść', detail: 'do 4 godzin', price: 90 },
  { key: 'wine5', label: 'Pełny wieczór', detail: 'do 5 godzin', price: 120 },
  { key: 'alacarte', label: 'Wybór Gości przy stole', detail: 'wino à la carte', price: null },
];
export const CORK_WINE_NOTE = 'Pakiet obejmuje 2 białe i 2 czerwone wina - wybór sommeliera. Woda REDOX jest zawsze w pakiecie z winem.';
export const CORK_OPEN_BAR = [
  { key: 'bar4', label: 'OPEN BAR', detail: 'do 4 godzin', price: 190 },
  { key: 'bar6', label: 'OPEN BAR', detail: 'do 6 godzin', price: 220 },
];
export const CORK_OPEN_BAR_NOTE = 'Drinki, koktajle oraz alkohole mocne: wódka, whisky, rum, gin i tequila.';
export const CORK_OPEN_BAR_PREMIUM = { key: 'premium', label: 'Premium', detail: 'dodatek do pakietu OPEN BAR', price: 40 };
export const CORK_SOMMELIER = { key: 'sommelier', label: 'Dedykowany sommelier do stołu', detail: 'pomoc w wyborze win i opieka sommelierska podczas spotkania', price: 300 };

/** Cake (The Cork's pastry offer, shared by both venues). Prices are "from". */
export const CAKE_SIZES = [
  { key: 'd16', label: 'Ø 16 cm', portions: '10-12', priceFrom: 450 },
  { key: 'd17', label: 'Ø 17 cm', portions: '13-15', priceFrom: 550 },
  { key: 'd18', label: 'Ø 18 cm', portions: '16-18', priceFrom: 580 },
  { key: 'd20', label: 'Ø 20 cm', portions: '20-23', priceFrom: 620 },
  { key: 'd21', label: 'Ø 21 cm', portions: '21-25', priceFrom: 650 },
];
export const CAKE_TIERED = { key: 'tiered', label: 'Tort piętrowy', detail: '25-30 zł / porcja + dekoracja' };
export const CAKE_BASES = [
  { key: 'light', label: 'Biszkopt jasny', detail: 'delikatny i lekki' },
  { key: 'dark', label: 'Biszkopt ciemny', detail: 'kakaowy i wyrazisty' },
];
export const CAKE_FLAVOURS = [
  { key: 'raspberry-chocolate', label: 'Malinowo-czekoladowy', detail: 'malina · czekolada' },
  { key: 'blackcurrant-caramel', label: 'Czarna porzeczka & karmel', detail: 'porzeczka · karmel' },
  { key: 'exotic-raspberry', label: 'Egzotyczno-malinowy', detail: 'egzotyk · malina' },
  { key: 'kinder-bueno', label: 'Kinder Bueno', detail: 'malina lub porzeczka' },
  { key: 'cream-fruit', label: 'Śmietankowo-owocowy', detail: 'śmietanka · owoce' },
  { key: 'oreo-raspberry', label: 'Oreo & malina', detail: 'Oreo · malina' },
  { key: 'rafaello', label: 'Rafaello', detail: 'malina lub egzotyk' },
  { key: 'ferrero', label: 'Ferrero Rocher', detail: 'owoce leśne' },
];
export const CAKE_NOTE = 'Każdy smak zawiera dużą ilość świeżych malin i borówek, frużelinę owocową oraz chrupiącą warstwę. Ostateczna cena zależy od liczby i stopnia trudności dekoracji.';

/** Decorations (shared by both venues). Flat prices as published; null = quoted after a consultation. */
export const DECOR_TABLES = [
  { key: 'standard', label: 'Pakiet Standard', detail: 'eleganckie szklane wazony · autorska kompozycja kwiatowa · świece', size: '8 osób', price: 1000 },
  { key: 'experience', label: 'Doświadczenie przy stole', detail: 'kwiaty i świece dopasowane do wydarzenia · podtalerze i materiałowe serwety · winietki i indywidualne menu', size: '8 osób', price: 2000 },
  { key: 'custom', label: 'Pakiet Indywidualny', detail: 'kwiaty, kolorystyka, dodatki i wszystkie elementy zgodnie z charakterem wydarzenia', size: null, price: null },
];
export const DECOR_PHOTO = [
  { key: 'standard', label: 'Gotowa fotostrefa', detail: 'elegancka ścianka biała, beżowa lub czarna oraz personalizowany napis', price: 1500 },
  { key: 'custom', label: 'Scenografia od podstaw', detail: 'indywidualny motyw, kolorystyka, oświetlenie, kwiaty, dekoracje tematyczne', price: null },
];
export const DECOR_EXTRAS = [
  'Retro fotobudka z personalizowanymi gadżetami',
  'Aparat Instax',
  'Księga Gości ze zdjęciami i życzeniami',
  'Elegancki kącik wspomnień z polaroidami',
  'Personalizowana tablica powitalna',
  'Plan usadzenia Gości',
  'Tabliczki kierunkowe i dekoracyjne',
  'Fotograf na wydarzeniu',
];

/** Every zł amount this module publishes, for the build gate's price audit. */
export function corkPriceLabels() {
  const amounts = new Set();
  for (const course of CORK_COURSES) for (const p of course.packages) if (p.price) amounts.add(p.price);
  for (const p of [...CORK_WINE_PACKAGES, ...CORK_OPEN_BAR]) if (p.price) amounts.add(p.price);
  amounts.add(CORK_OPEN_BAR_PREMIUM.price);
  amounts.add(CORK_SOMMELIER.price);
  for (const s of CAKE_SIZES) amounts.add(s.priceFrom);
  for (const d of [...DECOR_TABLES, ...DECOR_PHOTO]) if (d.price) amounts.add(d.price);
  // surcharges quoted inside dish notes and the tiered cake
  for (const n of [86, 29, 44, 59, 25, 30]) amounts.add(n);
  return [...amounts].map((n) => `${n} zł`);
}
