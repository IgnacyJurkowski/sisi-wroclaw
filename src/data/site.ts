/* Shared site data - single source of truth for contact details, events,
   verified venue facts and structured data. Translatable prose lives in
   src/i18n/ui/*; this file holds brand-invariant facts (prices, phones, ISO
   dates) plus locale-aware JSON-LD builders. */

import { type Locale } from '../i18n/config';
import { localizedPath } from '../i18n/routes';
import { useTranslations } from '../i18n/t';

export const RESERVATION_URL =
  'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl';

/**
 * Canonical outbound reservation link (the emenago cart) with campaign tracking.
 * `content` marks the CTA location, e.g. 'hero', 'event_card', 'header'.
 * Note: emenago has no localized carts, so every locale uses the /pl cart. The
 * reservation flow is slated to be rebuilt in-house, which will replace this.
 */
export function reservationUrl(content: string): string {
  return `${RESERVATION_URL}?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=${content}`;
}

// `start` is the complete ISO date-time (Europe/Warsaw, summer offset +02:00);
// every visible date label is generated from it (see src/i18n/format.ts). Keep
// the weekday in a title consistent with the real weekday of `start`.
export type EventItem = { title: string; start: string; note?: string; img: string };

// Placeholder line-up - edit titles/dates/images as real events are booked.
// 2026 opening nights: Fri 5/12/19/26 Jun, 3/10 Jul; Sat 6/13/20/27 Jun, 4/11 Jul.
export const EVENTS: EventItem[] = [
  // --- Upcoming ---
  { title: 'Friday at SiSi', start: '2026-06-26T22:00:00+02:00', note: 'DJ ADB',
    img: '/framerusercontent.com/images/Vl3kSLbolFditeShXmcLZITH7A8.webp' },
  { title: 'Saturday at SiSi', start: '2026-06-27T22:00:00+02:00', note: 'Live Act',
    img: '/framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp' },
  { title: 'Latino Night', start: '2026-07-03T22:00:00+02:00', note: 'DJ Mike Lynx',
    img: '/framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp' },
  { title: 'Saturday at SiSi', start: '2026-07-04T22:00:00+02:00', note: 'Live Act',
    img: '/framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp' },
  { title: 'House Sessions', start: '2026-07-10T22:00:00+02:00', note: 'DJ ADB',
    img: '/framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp' },
  { title: 'Saturday at SiSi', start: '2026-07-11T22:00:00+02:00', note: 'Special Guest',
    img: '/framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp' },

  // --- Archive ---
  { title: "Midsummer's Eve", start: '2026-06-20T22:00:00+02:00', note: 'Noc Świętojańska',
    img: '/framerusercontent.com/images/loXZHRygofAyWJdOaLJm2nba20Y.webp' },
  { title: 'Friday at SiSi', start: '2026-06-19T22:00:00+02:00', note: 'DJ ADB',
    img: '/framerusercontent.com/images/Vl3kSLbolFditeShXmcLZITH7A8.webp' },
  { title: 'Saturday at SiSi', start: '2026-06-13T22:00:00+02:00', note: 'Live Act',
    img: '/framerusercontent.com/images/RHdmR5s8jXTtyexi8FJLI4WDkig.webp' },
  { title: 'Friday at SiSi', start: '2026-06-12T22:00:00+02:00', note: 'DJ Mike Lynx',
    img: '/framerusercontent.com/images/QxXDx4GN74BgGuzaDth23HA.webp' },
  { title: 'Saturday at SiSi', start: '2026-06-06T22:00:00+02:00', note: 'Live Act',
    img: '/framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp' },
  { title: 'Friday at SiSi', start: '2026-06-05T22:00:00+02:00', note: 'DJ ADB',
    img: '/framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp' },
];

/** Split events into upcoming (soonest first) and past (most recent first). */
export function splitEvents(list: EventItem[] = EVENTS) {
  const now = Date.now();
  const ms = (e: EventItem) => new Date(e.start).getTime();
  const upcoming = list.filter((e) => ms(e) >= now).sort((a, b) => ms(a) - ms(b));
  const past = list.filter((e) => ms(e) < now).sort((a, b) => ms(b) - ms(a));
  return { upcoming, past };
}

export const CONTACT = {
  email: 'biuro@r32.com.pl',
  address: 'Rzeźnicza 32-33, 50-130 Wrocław',
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
export const LEGAL_UPDATED_ISO = '2026-06-24';

/* Verified B2B / corporate-event facts (source-of-truth). Do NOT imply SiSi
   itself seats 150 - that figure is The Cork's seated capacity. */
export const VENUE_FACTS = {
  // TODO(ignacy): confirm 663 m2 is usable event space, not the total R32 complex
  // area, before the "event space" copy stands.
  areaSqm: 663,
  theCorkSeated: 150,
  presentationScreens: 2,
};

/* === STRUCTURED DATA (JSON-LD) === Locale-aware: url + description differ per
   language; the venue @id is stable across locales. Keep address/geo correct. */
export const BUSINESS = {
  name: 'SiSi Wrocław',
  url: 'https://sisiwroclaw.pl',
  logo: 'https://sisiwroclaw.pl/apple-touch-icon.png',
  image: 'https://sisiwroclaw.pl/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
  streetAddress: 'Rzeźnicza 32-33',
  locality: 'Wrocław',
  region: 'Dolnośląskie',
  // Address + postal code confirmed against the KRS registration.
  // TODO(verify): coordinates are best-effort for the Old Town address.
  postalCode: '50-130',
  country: 'PL',
  latitude: 51.1106,
  longitude: 17.0286,
  priceRange: '$$',
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

/** Site-wide venue entity (LocalBusiness -> NightClub), localized url + description. */
export function nightClubSchema(locale: Locale = 'pl') {
  const t = useTranslations(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    '@id': `${BUSINESS.url}/#nightclub`,
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
    geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.latitude, longitude: BUSINESS.longitude },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${BUSINESS.streetAddress}, ${BUSINESS.locality}`,
    )}`,
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday', 'Saturday'], opens: '22:00', closes: '04:00' },
    ],
    sameAs: [CONTACT.instagram, CONTACT.facebook, CONTACT.tripadvisor],
    acceptsReservations: 'True',
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: RESERVATION_URL,
        inLanguage: locale,
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
    '@id': `${BUSINESS.url}/#website`,
    url: absolute(localizedPath('home', locale)),
    name: BUSINESS.name,
    inLanguage: locale,
    publisher: { '@id': `${BUSINESS.url}/#nightclub` },
  };
}

/** One Event object per night, with locale-aware event-page url. */
export function eventSchema(list: EventItem[], locale: Locale = 'pl') {
  const eventsUrl = absolute(localizedPath('events', locale));
  return list.map((e) => {
    const end = new Date(new Date(e.start).getTime() + 6 * 60 * 60 * 1000).toISOString();
    const ev: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: e.note ? `${e.title} - ${e.note}` : e.title,
      startDate: e.start,
      endDate: end,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: [absolute(e.img)],
      url: eventsUrl,
      location: { '@type': 'Place', name: BUSINESS.name, address: addressLd() },
      organizer: { '@type': 'Organization', name: BUSINESS.name, url: BUSINESS.url },
      offers: { '@type': 'Offer', url: RESERVATION_URL, availability: 'https://schema.org/InStock' },
    };
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
