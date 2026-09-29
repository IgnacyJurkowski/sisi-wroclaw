/* Venue truth: table reservations.

   Per-day rules, the arrival window, the door rules, and the hand-off to the
   external booking provider. Two places in the repo disagree with the site copy
   on the Saturday entry fee and the end of the arrival window; the fact keeps
   the value the Phase 3a brief and the dictionaries give and lists the other in
   `contradictedBy`. */

import { gap, pending, sourcesOf } from './facts';
import { RESERVATION_CONDITIONS, RESERVATION_NOTE, RESERVATION_PRACTICAL, RESERVATION_SUMMARY } from './copy';
import type { DayKey, DayReservationRule, Locale, Provider, Reservations } from './types';

const SITE = 'src/data/site.ts';
const LEGAL = 'src/i18n/legal.ts';

// Index into RESERVATION_PRACTICAL (page order).
const DEPOSIT = RESERVATION_PRACTICAL[0]!;
const FRIDAY_ENTRY = RESERVATION_PRACTICAL[1]!;
const SATURDAY_ENTRY = RESERVATION_PRACTICAL[2]!;
const ARRIVAL = RESERVATION_PRACTICAL[3]!;
const VALID_ID = RESERVATION_PRACTICAL[4]!;
const DOOR = RESERVATION_PRACTICAL[5]!;
const PREPAYMENT = RESERVATION_CONDITIONS[3]!;

const BLOG_NIGHT_MENU = 'https://www.sisiwroclaw.pl/pl/blog/nocne-menu-co-to/';
const BLOG_AFTERPARTY = 'https://www.sisiwroclaw.pl/pl/blog/afterparty-co-to/';
const BLOG_DECANTING = 'https://www.sisiwroclaw.pl/pl/blog/dekantacja-wina/';

const friday: DayReservationRule = {
  depositPerPersonPln: pending(100, sourcesOf(DEPOSIT, RESERVATION_SUMMARY, `${LEGAL}:42`, `${LEGAL}:241`), {
    note: 'Also emitted into llms.txt through src/lib/llms-map.ts:151, which reads the Polish summary line.',
  }),
  depositCreditedToBill: pending(true, DEPOSIT.pl.source, {
    quote: 'cała kwota jest do wykorzystania przy stoliku',
    note: 'Stated in every language; the Polish sentence is the source text.',
  }),
  entryPerPersonPln: pending(0, sourcesOf(FRIDAY_ENTRY.pl.source, `${LEGAL}:42`), {
    quote: ['bezpłatny'],
    note: '0 = free entry for guests with a reservation. The home page says the same (src/i18n/ui/pl.ts:204).',
  }),
};

const saturday: DayReservationRule = {
  depositPerPersonPln: friday.depositPerPersonPln,
  depositCreditedToBill: friday.depositCreditedToBill,
  entryPerPersonPln: pending(
    40,
    sourcesOf(SATURDAY_ENTRY, RESERVATION_SUMMARY, BLOG_NIGHT_MENU, BLOG_AFTERPARTY, BLOG_DECANTING),
    {
      contradictedBy: [
        {
          value: 30,
          source: `${LEGAL}:42`,
          note: 'Polish terms (regulamin) 3.2: "w soboty doliczany jest wstęp w wysokości 30 zł od osoby".',
          gap: 'SATURDAY_ENTRY_CONFLICT',
        },
        {
          value: 30,
          source: `${LEGAL}:241`,
          note: 'English terms 3: "on Saturdays an entry fee of PLN 30 per person is added". The German, Italian and Czech terms show this English text.',
          gap: 'SATURDAY_ENTRY_CONFLICT',
        },
      ],
    },
  ),
};

type Segment = 'pl' | 'en' | 'de' | 'it';

/** One entry of RESERVATION_LOCALES in site.ts: `key: 'segment'` on `line`. */
function segment(value: Segment, line: number, key: string = value, note?: string) {
  return pending<Segment>(value, `${SITE}:${line}`, { quote: `${key}: '${value}'`, ...(note ? { note } : {}) });
}

const provider: Provider = {
  name: pending('Emenago', `${SITE}:30`, { quote: 'emenago', note: 'Named only by its host, emenago.com, and in a code comment.' }),
  baseUrl: pending('https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661', `${SITE}:13-14`),
  localeSegment: {
    pl: segment('pl', 16),
    en: segment('en', 17),
    de: segment('de', 18),
    it: segment('it', 19),
    cs: segment('pl', 22, 'cs', 'Czech uses the Polish flow. See csFallback.'),
  },
  csFallback: pending<Provider['csFallback']['value']>(
    { from: 'cs', to: 'pl', reason: "The provider's /cs route currently renders English, not Czech." },
    [`${SITE}:20-22`, 'src/i18n/ui/cs.ts:315'],
    { quote: ['renders English', 'polštině'] },
  ),
  utm: pending({ source: 'website', medium: 'cta', campaign: 'reservation' }, `${SITE}:36`, {
    quote: ['utm_source=website', 'utm_medium=cta', 'utm_campaign=reservation'],
  }),
  ctaLocations: pending(
    ['reservations_section', 'event_card', 'menu', 'event_detail'],
    [
      'src/components/home/Reservations.astro:22',
      'src/components/EventCard.astro:40',
      'src/components/pages/MenuPage.astro:205',
      'src/components/pages/EventDetailPage.astro:66',
    ],
  ),
};

export const RESERVATIONS: Reservations = {
  days: { friday, saturday },
  arrivalWindow: {
    from: pending('22:00', sourcesOf(ARRIVAL)),
    to: pending('23:00', sourcesOf(ARRIVAL), {
      contradictedBy: [
        {
          value: '23:30',
          source: `${LEGAL}:44`,
          note: 'Polish terms (regulamin) 3.4: "w godzinach 22:00-23:30".',
          gap: 'ARRIVAL_WINDOW_CONFLICT',
        },
        {
          value: '23:30',
          source: `${LEGAL}:243`,
          note: 'English terms 3: "between 22:00 and 23:30". The German, Italian and Czech terms show this English text.',
          gap: 'ARRIVAL_WINDOW_CONFLICT',
        },
      ],
    }),
  },
  tableReleaseAfterLateMinutes: pending(30, sourcesOf(ARRIVAL, `${LEGAL}:44`, `${LEGAL}:243`), {
    note: '"May be released": a lateness of more than 30 minutes lets staff give the table to others. It is not automatic.',
  }),
  validIdRequired: pending(true, VALID_ID.pl.source, {
    quote: 'ważny dokument tożsamości',
    contradictedBy: [
      {
        value: 'staff may request ID',
        source: `${LEGAL}:32`,
        note: 'The terms say staff may ask to see ID. The reservations page says entry is for guests who have valid ID. Different strength, not a different number.',
      },
    ],
  }),
  smartCasualDressCode: pending(true, sourcesOf(DOOR, `${LEGAL}:34`, `${LEGAL}:233`), { quote: 'smart' }),
  doorSelection: pending(true, sourcesOf(DOOR.pl.source, `${LEGAL}:34`), { quote: 'selekcja' }),
  staffMayDenyEntry: pending(true, sourcesOf(DOOR.pl.source, `${LEGAL}:33`), { quote: 'odmowy wstępu' }),
  refundOnDeniedEntry: pending(true, DOOR.pl.source, {
    quote: 'wpłacona kwota zostaje wówczas zwrócona',
    note: 'The reservations page promises this in all five languages. The terms (src/i18n/legal.ts:33) allow refusal and say nothing about a refund.',
  }),
  prepaymentConfirmsBooking: pending(true, sourcesOf(PREPAYMENT.pl.source, `${LEGAL}:43`), { quote: 'przedpłata' }),
  provider,
  copy: {
    practical: RESERVATION_PRACTICAL,
    conditions: RESERVATION_CONDITIONS,
    note: RESERVATION_NOTE,
    summaryLine: RESERVATION_SUMMARY,
  },
  tableMinimum: gap('TABLE_MINIMUM'),
  partyPrice: gap('PARTY_PRICE'),
  prepaymentTerm: gap('PREPAYMENT_TERM'),
  refundRules: gap('REFUND_RULES'),
  csBookingFlow: gap('CS_BOOKING'),
};

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

export interface PartyTotal {
  readonly day: DayKey;
  readonly people: number;
  /** Deposit, credited to the bill: deposit per person x people. */
  readonly creditedPln: number;
  /** Entry fee, not credited: entry per person x people. */
  readonly entryPln: number;
  /** Everything the party pays with the reservation: credited + entry. */
  readonly outOfPocketPln: number;
}

/**
 * What a party of `people` pays for a table on `day`.
 * Saturday x 6 = 600 zł credited + 240 zł entry = 840 zł out of pocket.
 * Friday x 6 = 600 zł credited, no entry.
 * Only what the two rules state: packages, bottle service and special-event
 * pricing are gaps (PARTY_PRICE). Throws on a day without a rule or on a
 * party that is not a positive whole number.
 */
export function totalForParty(day: DayKey, people: number, reservations: Reservations = RESERVATIONS): PartyTotal {
  const rule = reservations.days[day];
  if (!rule) throw new RangeError(`totalForParty: no reservation rule for ${day}`);
  if (!Number.isInteger(people) || people < 1) throw new RangeError(`totalForParty: people must be a whole number of at least 1, got ${people}`);
  const creditedPln = rule.depositPerPersonPln.value * people;
  const entryPln = rule.entryPerPersonPln.value * people;
  return { day, people, creditedPln, entryPln, outOfPocketPln: creditedPln + entryPln };
}

// ---------------------------------------------------------------------------
// Provider hand-off
// ---------------------------------------------------------------------------

/**
 * The outbound booking link, the same string reservationUrl() in
 * src/data/site.ts builds. `content` marks the button (`hero`, `event_card`, ...).
 */
export function reservationUrl(content: string, locale: Locale, reservations: Reservations = RESERVATIONS): string {
  const p = reservations.provider;
  const { source, medium, campaign } = p.utm.value;
  return `${p.baseUrl.value}/${p.localeSegment[locale].value}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}&utm_content=${content}`;
}
