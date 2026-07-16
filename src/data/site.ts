/* Shared site data - single source of truth for contact details, events,
   verified venue facts and structured data. Translatable prose lives in
   src/i18n/ui/*; this file holds brand-invariant facts (prices, phones, ISO
   dates) plus locale-aware JSON-LD builders. */

import { type Locale } from '../i18n/config';
import { localizedPath, eventPath } from '../i18n/routes';
import { useTranslations } from '../i18n/t';
import { GENERATED_EVENTS } from './events.generated';
import { eventOffer } from '../lib/event-offer.mjs';
import { NIGHTCLUB_OPENING_HOURS } from '../lib/summer-hours.mjs';

const RESERVATION_BASE_URL =
  'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661';
const RESERVATION_LOCALES: Record<Locale, 'pl' | 'en' | 'de' | 'it'> = {
  pl: 'pl',
  en: 'en',
  de: 'de',
  it: 'it',
  // Emenago's /cs route currently renders English, not Czech. Retain the
  // existing Polish fallback until the provider exposes a genuine Czech flow.
  cs: 'pl',
};

function reservationDestination(locale: Locale): string {
  return `${RESERVATION_BASE_URL}/${RESERVATION_LOCALES[locale]}`;
}

/**
 * Canonical outbound reservation link (the emenago cart) with campaign tracking.
 * `content` marks the CTA location, e.g. 'hero', 'event_card', 'header'.
 * The locale map includes only provider flows whose rendered language has been
 * verified; unsupported locales retain the established Polish fallback.
 */
export function reservationUrl(content: string, locale: Locale): string {
  return `${reservationDestination(locale)}?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=${content}`;
}

// `start` is the complete ISO date-time with a DST-aware Europe/Warsaw offset
// (+02:00 in summer, +01:00 in winter); every visible date label is generated
// from it (see src/i18n/format.ts).
// `price` is the entry/cover charge in zł (0 = free entry); `description` is a
// short blurb (authored in Polish, shown as-is in every locale); `genres` are
// music-genre tags. The optional fields come from the Opisy doc template and
// render conditionally, so events without them look exactly as before.
export type EventItem = {
  title: string;
  /** url-safe id (date + title), e.g. "2026-06-26-friday-at-sisi"; the per-event
      page lives at eventPath(slug, locale) and the banner at /events/<slug>.webp. */
  slug: string;
  start: string;
  note?: string;
  img: string;
  price?: number;
  description?: string;
  genres?: string[];
};

// The lineup is authored by venue staff in the "Wydarzenia" Google Drive folder
// (Banery + Opisy) and synced into events.generated.ts by scripts/sync-events.mjs.
// Do NOT hand-edit events - edit them in Drive; the next sync overwrites the
// generated file.
export const EVENTS: EventItem[] = GENERATED_EVENTS;

// A club night runs ~6 hours past its listed start, so an event only becomes
// "past" once it has actually ended - the same +6h end that eventSchema() emits.
// This keeps a 22:00-04:00 night in the upcoming list (not the archive) while it
// is still happening, instead of flipping to "finished" at 22:00.
export const EVENT_DURATION_MS = 6 * 60 * 60 * 1000;

/** Split events into upcoming (soonest first) and past (most recent first).
    `now` is injectable so the upcoming/past boundary is unit-testable. */
export function splitEvents(list: EventItem[] = EVENTS, now: number = Date.now()) {
  const startMs = (e: EventItem) => new Date(e.start).getTime();
  const endMs = (e: EventItem) => startMs(e) + EVENT_DURATION_MS;
  const upcoming = list.filter((e) => endMs(e) >= now).sort((a, b) => startMs(a) - startMs(b));
  const past = list.filter((e) => endMs(e) < now).sort((a, b) => startMs(b) - startMs(a));
  return { upcoming, past };
}

export const CONTACT = {
  email: 'biuro@r32.com.pl',
  address: 'Rzeźnicza 32-33, 50-130 Wrocław',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SISI%20%7C%20Music%20Club%20Wroc%C5%82aw&query_place_id=ChIJS14DTYDDD0cRWrK8z0wRcsM',
  phone: '+48 515 126 260',
  phoneHref: 'tel:+48515126260',
  eventsPhone: '+48 514 032 930',
  eventsPhoneHref: 'tel:+48514032930',
  eventsEmail: 'events@r32.com.pl',
  hours: '22:00 - 04:00',
  instagram: 'https://www.instagram.com/sisiwroclaw/',
  facebook: 'https://www.facebook.com/sisimusicclub',
  tripadvisor:
    'https://www.tripadvisor.com/Attraction_Review-g274812-d34327483-Reviews-SISI_Wroclaw_Music_Club-Wroclaw_Lower_Silesia_Province_Southern_Poland.html',
};

/* Legal entity behind SiSi - powers the legal pages. Registration data from the
   KRS register (KRS 0001085945, rejestr.io). Have a lawyer review the final
   legal copy before relying on it. */
export const COMPANY = {
  legalName: 'Rzeźnicza 32 Sp. z o.o.',
  tradeName: 'SiSi Wrocław',
  street: 'Rzeźnicza 32-33',
  postalCity: '50-130 Wrocław',
  nip: '8971933394',
  regon: '527683726',
  krs: '0001085945',
  email: 'biuro@r32.com.pl',
  phone: '+48 515 126 260',
  phoneHref: 'tel:+48515126260',
};

// "Last updated" date for the legal pages, stored as ISO so each locale can
// format it in its own language (see i18n/format.ts → formatLongDate).
export const LEGAL_UPDATED_ISO = '2026-07-16';

/* Verified B2B / corporate-event facts (source-of-truth). Do NOT imply SiSi
   itself seats 150 - that figure is The Cork's seated capacity. */
export const VENUE_FACTS = {
  areaSqm: 663,
  theCorkSeated: 150,
  standingBuffet: 500,
  presentationScreens: 2,
};

/* === STRUCTURED DATA (JSON-LD) === Locale-aware: url + description differ per
   language; the venue @id is stable across locales. Keep the address correct. */
export const BUSINESS = {
  name: 'SiSi Wrocław',
  url: 'https://www.sisiwroclaw.pl',
  logo: 'https://www.sisiwroclaw.pl/apple-touch-icon.png',
  image: 'https://www.sisiwroclaw.pl/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
  streetAddress: 'Rzeźnicza 32-33',
  locality: 'Wrocław',
  region: 'Dolnośląskie',
  postalCode: '50-130',
  country: 'PL',
  // Building point for Rzeźnicza 32-33, verified against the public address
  // record on 2026-07-16. Keep both connected venue entities on one location.
  latitude: 51.1106472,
  longitude: 17.0279287,
  priceRange: '$$',
};

const ENTITY_IDS = {
  organization: `${BUSINESS.url}/#organization`,
  eventVenue: 'https://www.r32.com.pl/#eventvenue',
  nightClub: `${BUSINESS.url}/#nightclub`,
  website: `${BUSINESS.url}/#website`,
};

function absolute(path: string) {
  return `${BUSINESS.url}${path}`;
}

function addressLd() {
  return {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.country,
  };
}

function venueGeoLd() {
  return {
    '@type': 'GeoCoordinates',
    latitude: BUSINESS.latitude,
    longitude: BUSINESS.longitude,
  };
}

/** Verified legal operator already named on the public legal and contact pages. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ENTITY_IDS.organization,
    name: COMPANY.legalName,
    legalName: COMPANY.legalName,
    alternateName: COMPANY.tradeName,
    taxID: COMPANY.nip,
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'KRS', value: COMPANY.krs },
      { '@type': 'PropertyValue', propertyID: 'NIP', value: COMPANY.nip },
      { '@type': 'PropertyValue', propertyID: 'REGON', value: COMPANY.regon },
    ],
    address: addressLd(),
    email: COMPANY.email,
    telephone: COMPANY.phoneHref.replace('tel:', ''),
  };
}

/** R32 destination that publicly contains SiSi at the same verified address. */
export function eventVenueSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    '@id': ENTITY_IDS.eventVenue,
    name: 'R32',
    url: 'https://www.r32.com.pl/',
    address: addressLd(),
    geo: venueGeoLd(),
    email: CONTACT.eventsEmail,
    telephone: CONTACT.eventsPhoneHref.replace('tel:', ''),
    containsPlace: { '@id': ENTITY_IDS.nightClub },
  };
}

/** Site-wide venue entity (LocalBusiness -> NightClub), localized url + description. */
export function nightClubSchema(locale: Locale = 'pl') {
  const t = useTranslations(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    '@id': ENTITY_IDS.nightClub,
    name: BUSINESS.name,
    url: absolute(localizedPath('home', locale)),
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    description: t.meta.home.description,
    telephone: CONTACT.phoneHref.replace('tel:', ''),
    email: CONTACT.email,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: 'PLN',
    address: addressLd(),
    geo: venueGeoLd(),
    hasMap: CONTACT.mapsUrl,
    openingHoursSpecification: NIGHTCLUB_OPENING_HOURS.map((hours) => ({ ...hours })),
    sameAs: [CONTACT.instagram, CONTACT.facebook, CONTACT.tripadvisor],
    parentOrganization: { '@id': ENTITY_IDS.organization },
    containedInPlace: { '@id': ENTITY_IDS.eventVenue },
    acceptsReservations: 'True',
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: reservationDestination(locale),
        inLanguage: RESERVATION_LOCALES[locale],
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: t.buttons.bookTable },
    },
  };
}

/** WebSite entity, linked to the venue as publisher. */
export function websiteSchema(locale: Locale = 'pl') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': ENTITY_IDS.website,
    url: absolute(localizedPath('home', locale)),
    name: BUSINESS.name,
    inLanguage: locale,
    publisher: { '@id': ENTITY_IDS.nightClub },
  };
}

/** One connected site-entity graph; page-specific Event nodes are added beside it. */
export function entityGraphSchema(locale: Locale = 'pl') {
  const schemas: Record<string, unknown>[] = [
    organizationSchema(),
    eventVenueSchema(),
    nightClubSchema(locale),
    websiteSchema(locale),
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map(({ '@context': _context, ...node }) => node),
  };
}

/** One Event object per night, with locale-aware event-page url. */
export function eventSchema(list: EventItem[], locale: Locale = 'pl') {
  return list.map((e) => {
    const end = new Date(new Date(e.start).getTime() + EVENT_DURATION_MS).toISOString();
    const ev: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: e.note ? `${e.title} - ${e.note}` : e.title,
      startDate: e.start,
      endDate: end,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: [absolute(e.img)],
      url: absolute(eventPath(e.slug, locale)),
      location: { '@id': ENTITY_IDS.nightClub },
      organizer: { '@id': ENTITY_IDS.nightClub },
    };
    const offer = eventOffer(e.price);
    if (offer) ev.offers = offer;
    if (e.note) ev.performer = { '@type': 'PerformingGroup', name: e.note };
    return ev;
  });
}

/** B2B venue/service entity for the corporate-events page. */
export function corporateServiceSchema(locale: Locale = 'pl') {
  const t = useTranslations(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: t.b2b.hero.eyebrow,
    name: t.meta.corporate.title,
    description: t.meta.corporate.description,
    url: absolute(localizedPath('corporate', locale)),
    areaServed: { '@type': 'City', name: 'Wrocław' },
    provider: { '@id': `${BUSINESS.url}/#nightclub` },
  };
}

/** Private-celebration service entity for the dedicated consumer journey. */
export function privateEventsServiceSchema(locale: Locale = 'pl') {
  const t = useTranslations(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: t.privateEvents.hero.eyebrow,
    name: t.meta.privateEvents.title,
    description: t.meta.privateEvents.description,
    url: absolute(localizedPath('privateEvents', locale)),
    areaServed: { '@type': 'City', name: 'Wrocław' },
    provider: { '@id': `${BUSINESS.url}/#nightclub` },
  };
}
