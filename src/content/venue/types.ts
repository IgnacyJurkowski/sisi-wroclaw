/* Venue truth: types.

   One typed record of every fact the site states about SiSi Wrocław. The shape
   is the contract: a value cannot be added without saying where it currently
   appears (`source`) and whether the owner has confirmed it (`status`), and a
   fact nobody has supplied is a `Gap`, never a guess.

   Plain TypeScript, no framework imports, so `.astro`, `.ts` and Node scripts
   (through scripts/lib/load-venue.mjs) can all read it.

   Rules that the types enforce:
   - Every `Fact<T>` needs a `source` (a `file:line` in this repo, a line range,
     or the https URL of the page it appears on). Leaving it out does not compile.
   - `status` is `'PENDING'` or `'CONFIRMED'`. A CONFIRMED fact must name who
     confirmed it and when. Nothing in this branch is CONFIRMED: only Ignacy
     confirms.
   - A missing fact is a `Gap` (`value: null`, a `gap` id that has a row in
     gaps.ts, and a visible placeholder such as `[ABV?]`).
   - When two places in the repo state different values, the fact keeps the value
     the Phase 3a brief names and lists the other value in `contradictedBy`.
     Neither is treated as settled. */

export const LOCALES = ['pl', 'en', 'de', 'it', 'cs'] as const;
export type Locale = (typeof LOCALES)[number];

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** A value in each of the five site languages. */
export type Localized<T> = Record<Locale, T>;

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** `path/in/repo.ext:LINE`, relative to the repository root. */
export type LineRef = `${string}:${number}`;
/** `path/in/repo.ext:FIRST-LAST`. */
export type RangeRef = `${string}:${number}-${number}`;
/** The public page a value appears on. */
export type UrlRef = `https://${string}`;
export type SourceRef = LineRef | RangeRef | UrlRef;
/** One or more places; at least one is required. */
export type Sources = SourceRef | readonly [SourceRef, ...SourceRef[]];

export type FactStatus = 'PENDING' | 'CONFIRMED';

/** Another place that states a different value for the same fact. */
export interface Contradiction {
  readonly value: string | number | boolean;
  readonly source: Sources;
  readonly note: string;
  /** The `decision` row in gaps.ts that asks the owner to pick. */
  readonly gap?: GapId;
}

interface FactBase<T> {
  readonly value: T;
  /** Where the value currently appears. */
  readonly source: Sources;
  /** Verbatim text expected on the cited line(s), for values that are derived
      or not literal (a boolean, `40` ml from "4 cl"). Checked by the probe. */
  readonly quote?: string | readonly string[];
  readonly note?: string;
  readonly contradictedBy?: readonly Contradiction[];
}

export type Fact<T> = FactBase<T> &
  (
    | { readonly status: 'PENDING' }
    | { readonly status: 'CONFIRMED'; readonly confirmedBy: string; readonly confirmedOn: string }
  );

/** The same fact in each language, each with its own source line. */
export type L10n<T = string> = Record<Locale, Fact<T>>;

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

export const GAP_IDS = [
  'LINEUP',
  'ARTISTS',
  'EVENT_DATES',
  'DJ_START',
  'ALLERGENS',
  'ABV',
  'TASTE_TAGS',
  'DISH_PRICE',
  'FOOD_MENU',
  'THE_CORK_HOURS',
  'CAPACITY',
  'TABLE_MINIMUM',
  'PARTY_PRICE',
  'ENTRANCE',
  'STEP_FREE',
  'PARKING',
  'TRANSPORT',
  'COORDINATES',
  'CHIVAS_ZONE',
  'PHOTO_RIGHTS',
  'PRESS',
  'REVIEWS',
  'AGE_NOTICE',
  'PREPAYMENT_TERM',
  'REFUND_RULES',
  'CS_BOOKING',
  'LEGAL_TRANSLATIONS',
  'DRESS_CODE_DETAIL',
  'CLOAKROOM',
  'PAYMENT_METHODS',
  'CONTACT_HOURS',
  'MENU_VERIFIED',
  'SATURDAY_ENTRY_CONFLICT',
  'ARRIVAL_WINDOW_CONFLICT',
] as const;
export type GapId = (typeof GAP_IDS)[number];

/** A fact nobody has supplied. Rendered as its `placeholder`, never as a guess. */
export interface Gap<K extends GapId = GapId> {
  readonly value: null;
  readonly status: 'PENDING';
  readonly gap: K;
  readonly placeholder: `[${string}?]`;
}

export interface GapRow {
  readonly id: GapId;
  /** `missing`: no source has the value. `decision`: sources disagree, the owner picks. */
  readonly kind: 'missing' | 'decision';
  readonly what: string;
  /** The guest task this blocks. */
  readonly why: string;
  /** Where the fact would appear on the site. */
  readonly where: string;
  readonly owner: string;
  readonly placeholder: `[${string}?]`;
  readonly status: 'PENDING';
  /** Label for the claim that the fact is missing. */
  readonly basis: 'Confirmed' | 'Assumption' | 'Inference' | 'Rec';
  /** file:line proof that the fact is absent (or that sources disagree). */
  readonly evidence: readonly string[];
  readonly notes?: string;
}

// ---------------------------------------------------------------------------
// Identity, address, contacts
// ---------------------------------------------------------------------------

export interface Phone {
  /** As shown on the site, e.g. "+48 515 126 260". */
  readonly display: string;
  /** Digits for `tel:` links, with the plus. */
  readonly e164: string;
}

export interface LegalEntity {
  readonly legalName: Fact<string>;
  readonly tradeName: Fact<string>;
  readonly legalForm: Fact<string>;
  readonly registryCourt: Fact<string>;
  readonly nip: Fact<string>;
  readonly regon: Fact<string>;
  readonly krs: Fact<string>;
  readonly registeredStreet: Fact<string>;
  readonly registeredPostalCity: Fact<string>;
}

export interface Identity {
  readonly brandName: Fact<string>;
  readonly siteUrl: Fact<string>;
  readonly complexName: Fact<string>;
  readonly complexUrl: Fact<string>;
  readonly restaurantName: Fact<string>;
  readonly sponsorZoneName: L10n;
  readonly legalEntity: LegalEntity;
  /** The hero slogan, both lines joined, exactly as each dictionary spells it. */
  readonly tagline: L10n;
  /** The canonical Polish spelling named in the working rules. */
  readonly taglineCanonicalPl: Fact<string>;
  readonly description: L10n;
  readonly descriptor: L10n;
  readonly footerTagline: L10n;
  readonly priceRangeSymbol: Fact<string>;
}

export interface Coordinates {
  readonly latitude: Fact<number>;
  readonly longitude: Fact<number>;
  /** How the site says the point was obtained. */
  readonly basis: Fact<string>;
  /** Independent verification of the point. Not available. */
  readonly verification: Gap<'COORDINATES'>;
}

export interface Address {
  readonly street: Fact<string>;
  readonly postalCode: Fact<string>;
  readonly city: Fact<string>;
  readonly region: Fact<string>;
  readonly country: Fact<string>;
  /** One-line form as printed in the footer and contact page. */
  readonly oneLine: Fact<string>;
  readonly mapsUrl: Fact<string>;
  readonly mapsPlaceId: Fact<string>;
  readonly coordinates: Coordinates;
}

export interface Contacts {
  readonly phone: Fact<Phone>;
  readonly eventsPhone: Fact<Phone>;
  readonly email: Fact<string>;
  readonly eventsEmail: Fact<string>;
  readonly hours: Gap<'CONTACT_HOURS'>;
}

export interface Socials {
  readonly instagram: Fact<string>;
  readonly facebook: Fact<string>;
  readonly tripadvisor: Fact<string>;
}

// ---------------------------------------------------------------------------
// Opening hours
// ---------------------------------------------------------------------------

export interface OpeningNight {
  /** The calendar day the night STARTS on. */
  readonly day: DayKey;
  /** Local wall-clock time, `HH:MM`, in the venue timezone. */
  readonly opens: Fact<string>;
  /** Local `HH:MM`. When it is not later than `opens`, it falls on the next calendar day. */
  readonly closes: Fact<string>;
}

export interface Closure {
  readonly id: string;
  /** Weekdays that were closed inside the window. */
  readonly days: readonly DayKey[];
  /** First and last calendar date, inclusive, `YYYY-MM-DD`. */
  readonly from: Fact<string>;
  readonly through: Fact<string>;
  /** `ended`: kept as history. */
  readonly state: 'ended' | 'active' | 'announced';
  readonly reason: Fact<string>;
}

export interface BusinessNightRule {
  /** The night is named after the calendar day it opened on. */
  readonly ownedBy: 'opening-day';
  readonly examples: readonly { readonly visit: string; readonly belongsToNightOf: DayKey }[];
}

export interface Hours {
  readonly timezone: Fact<string>;
  readonly nights: readonly OpeningNight[];
  /** The range as printed in the footer, e.g. `22:00 - 04:00`. */
  readonly displayRange: Fact<string>;
  /** The day span as printed, e.g. `Piątek - Sobota`. */
  readonly daysLabel: L10n;
  readonly businessNightRule: Fact<BusinessNightRule>;
  /** Length the site assumes for an event night (start + N hours). */
  readonly eventNightHours: Fact<number>;
  readonly closures: readonly Closure[];
  readonly theCork: Gap<'THE_CORK_HOURS'>;
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export interface DayReservationRule {
  /** Deposit per person, PLN. */
  readonly depositPerPersonPln: Fact<number>;
  /** The whole deposit is credited to the bill. */
  readonly depositCreditedToBill: Fact<boolean>;
  /** Entry fee per person on top of the deposit, PLN. 0 = free with a reservation. */
  readonly entryPerPersonPln: Fact<number>;
}

export interface ArrivalWindow {
  readonly from: Fact<string>;
  readonly to: Fact<string>;
}

export interface Provider {
  readonly name: Fact<string>;
  readonly baseUrl: Fact<string>;
  /** Path segment appended to the base URL, per site language. */
  readonly localeSegment: Record<Locale, Fact<'pl' | 'en' | 'de' | 'it'>>;
  readonly csFallback: Fact<{ readonly from: 'cs'; readonly to: 'pl'; readonly reason: string }>;
  readonly utm: Fact<{ readonly source: string; readonly medium: string; readonly campaign: string }>;
  /** Values the site passes as `utm_content`, one per CTA location. */
  readonly ctaLocations: Fact<readonly string[]>;
}

export interface ReservationCopy {
  readonly practical: readonly L10n[];
  readonly conditions: readonly L10n[];
  readonly note: L10n;
  readonly summaryLine: L10n;
}

export interface Reservations {
  readonly days: Partial<Record<DayKey, DayReservationRule>>;
  readonly arrivalWindow: ArrivalWindow;
  /** A table may be released to other guests when the party is later than this. */
  readonly tableReleaseAfterLateMinutes: Fact<number>;
  readonly validIdRequired: Fact<boolean>;
  readonly smartCasualDressCode: Fact<boolean>;
  readonly doorSelection: Fact<boolean>;
  readonly staffMayDenyEntry: Fact<boolean>;
  /** Amount paid is refunded when entry is denied. */
  readonly refundOnDeniedEntry: Fact<boolean>;
  readonly prepaymentConfirmsBooking: Fact<boolean>;
  readonly provider: Provider;
  readonly copy: ReservationCopy;
  readonly tableMinimum: Gap<'TABLE_MINIMUM'>;
  readonly partyPrice: Gap<'PARTY_PRICE'>;
  readonly prepaymentTerm: Gap<'PREPAYMENT_TERM'>;
  readonly refundRules: Gap<'REFUND_RULES'>;
  readonly csBookingFlow: Gap<'CS_BOOKING'>;
}

// ---------------------------------------------------------------------------
// B2B
// ---------------------------------------------------------------------------

export interface B2B {
  readonly areaSqm: Fact<number>;
  /** Seated guests at The Cork. Never SiSi's own seating. */
  readonly theCorkSeated: Fact<number>;
  /** Standing guests, buffet format. */
  readonly standingBuffet: Fact<number>;
  readonly presentationScreens: Fact<number>;
  readonly clubCapacity: Gap<'CAPACITY'>;
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export type VolumeUnit = 'ml' | 'cl' | 'l';

/** Structured portion for food: N pieces, or a plate for N people. */
export interface Portion {
  readonly kind: 'pieces' | 'serves';
  readonly n: number;
}

export interface PriceOption {
  /** Price in PLN. */
  readonly pricePln: Fact<number>;
  /** Volume in ml where the site states one. */
  readonly volumeMl?: Fact<number>;
  /** Unit the site prints the volume in (`4 cl`, `1,75 l`, `160 ml`). */
  readonly volumeUnit?: VolumeUnit;
  readonly portion?: Fact<Portion>;
}

/** Alcohol by volume: one figure, or one per named variant. */
export type AbvValue = number | Readonly<Record<string, number>>;

export interface WineInfo {
  readonly winery: Fact<string>;
  readonly category: 'white' | 'red' | 'roseOrange';
  readonly dryness?: Fact<'dry' | 'semiDry'>;
  readonly grapes?: Fact<readonly string[]>;
  readonly region?: Fact<string>;
  readonly vintage?: Fact<string>;
  readonly featured?: Fact<boolean>;
}

export interface MenuItem {
  readonly id: string;
  readonly name: Fact<string>;
  /** Description tokens as authored (ingredients, flavours, beer style). Localise with MENU_GLOSSARY. */
  readonly descTokens?: Fact<readonly string[]>;
  /** Sub-heading inside the section (whisky family, bottle-service spirit, champagne house, wine colour). */
  readonly group?: string;
  readonly options: readonly PriceOption[];
  readonly wine?: WineInfo;
  /** Stated in the site copy for some beers; null everywhere else. */
  readonly abvPercent: Fact<AbvValue> | Gap<'ABV'>;
  readonly allergens: Gap<'ALLERGENS'>;
  readonly tags: Gap<'TASTE_TAGS'>;
}

export interface MenuSection {
  readonly id: string;
  readonly title: L10n;
  /** Standard pour for a spirits section (`Porcja 4 cl`). */
  readonly pourMl?: Fact<number>;
  /** Every bottle in the section has this volume (`Wszystkie butelki 330 ml`). */
  readonly bottleMl?: Fact<number>;
  /** Localised sub-heading labels keyed by `MenuItem.group`. */
  readonly groups?: Readonly<Record<string, L10n>>;
  readonly items: readonly MenuItem[];
}

export interface Dish {
  readonly id: string;
  readonly name: L10n;
  readonly desc?: L10n;
  readonly options: readonly PriceOption[];
  /** Set when the site shows the dish without any price. */
  readonly missingPrice?: Gap<'DISH_PRICE'>;
  readonly diet?: Fact<'vegetarian' | 'vegan'>;
  readonly spicy?: Fact<boolean>;
  readonly allergens: Gap<'ALLERGENS'>;
  readonly tags: Gap<'TASTE_TAGS'>;
}

export interface FoodSection {
  readonly id: string;
  readonly title: L10n;
  readonly dishes: readonly Dish[];
}

export interface Menu {
  readonly currency: Fact<'PLN'>;
  /** Ingredient and beer-style words, keyed by the Polish (or English, for beer styles) source word. */
  readonly glossary: Readonly<Record<string, Fact<Partial<Record<Locale, string>>>>>;
  readonly labels: {
    readonly featured: L10n;
    readonly wineCategory: Readonly<Record<'white' | 'red' | 'roseOrange', L10n>>;
    readonly dryness: Readonly<Record<'dry' | 'semiDry', L10n>>;
    readonly diet: Readonly<Record<'vegetarian' | 'vegan', L10n>>;
    readonly spicy: L10n;
    readonly portionPieces: L10n;
    readonly portionServes: L10n;
  };
  readonly sections: readonly MenuSection[];
  readonly food: {
    readonly eyebrow: Fact<string>;
    readonly heading: L10n;
    readonly sub: L10n;
    readonly sections: readonly FoodSection[];
  };
  readonly verifiedOn: Gap<'MENU_VERIFIED'>;
}

// ---------------------------------------------------------------------------
// Everything else a guest asks about
// ---------------------------------------------------------------------------

export interface Programme {
  readonly lineup: Gap<'LINEUP'>;
  readonly artists: Gap<'ARTISTS'>;
  readonly eventDates: Gap<'EVENT_DATES'>;
  readonly djStart: Gap<'DJ_START'>;
}

export interface Access {
  readonly entrance: Gap<'ENTRANCE'>;
  readonly stepFree: Gap<'STEP_FREE'>;
  readonly parking: Gap<'PARKING'>;
  readonly transport: Gap<'TRANSPORT'>;
}

export interface Media {
  readonly photoRights: Gap<'PHOTO_RIGHTS'>;
  readonly press: Gap<'PRESS'>;
  readonly reviews: Gap<'REVIEWS'>;
}

export interface Policies {
  readonly ageNotice: Gap<'AGE_NOTICE'>;
  readonly dressCodeDetail: Gap<'DRESS_CODE_DETAIL'>;
  readonly cloakroom: Gap<'CLOAKROOM'>;
  readonly paymentMethods: Gap<'PAYMENT_METHODS'>;
  readonly foodMenuCompleteness: Gap<'FOOD_MENU'>;
  readonly sponsorZoneContent: Gap<'CHIVAS_ZONE'>;
}

export interface Translations {
  /** Legal pages: pl and en are written, these three show the English text. */
  readonly legal: Readonly<Record<'de' | 'it' | 'cs', Gap<'LEGAL_TRANSLATIONS'>>>;
}

export interface Snapshot {
  /** The repository state every `source` line refers to. */
  readonly repoCommit: string;
  readonly mainCommit: string;
  readonly capturedOn: string;
  readonly note: string;
}

export interface Venue {
  readonly snapshot: Snapshot;
  readonly identity: Identity;
  readonly address: Address;
  readonly contacts: Contacts;
  readonly socials: Socials;
  readonly hours: Hours;
  readonly reservations: Reservations;
  readonly b2b: B2B;
  readonly menu: Menu;
  readonly programme: Programme;
  readonly access: Access;
  readonly media: Media;
  readonly policies: Policies;
  readonly translations: Translations;
}
