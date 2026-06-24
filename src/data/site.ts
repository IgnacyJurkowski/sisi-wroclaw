/* Shared site data - single source of truth for nav, footer and contact details. */

export const RESERVATION_URL =
  'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl';

export type NavItem = { id: string; label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { id: 'events', label: 'Wydarzenia', href: '/wydarzenia' },
  { id: 'menu', label: 'Menu', href: '/menu' },
  { id: 'kariera', label: 'Kariera', href: '/kariera' },
];

// `iso` (YYYY-MM-DD) is the sortable/comparable date; `date` is the display
// string. splitEvents() uses `iso` to split upcoming vs. archive at build time.
export type EventItem = { title: string; date: string; iso: string; note?: string; img: string };

// Shared event list - feeds the homepage teaser and the /wydarzenia page.
// Placeholder line-up: edit titles/dates/images as real events are booked.
export const EVENTS: EventItem[] = [
  // --- Upcoming ---
  { title: 'Friday at SiSi', date: '27 czerwca, 22:00', iso: '2026-06-27', note: 'DJ ADB',
    img: '/framerusercontent.com/images/Vl3kSLbolFditeShXmcLZITH7A8.webp' },
  { title: 'Saturday at SiSi', date: '28 czerwca, 22:00', iso: '2026-06-28', note: 'Live Act',
    img: '/framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp' },
  { title: 'Latino Night', date: '4 lipca, 22:00', iso: '2026-07-04', note: 'DJ Mike Lynx',
    img: '/framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp' },
  { title: 'Saturday at SiSi', date: '5 lipca, 22:00', iso: '2026-07-05', note: 'Live Act',
    img: '/framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp' },
  { title: 'House Sessions', date: '11 lipca, 22:00', iso: '2026-07-11', note: 'DJ ADB',
    img: '/framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp' },
  { title: 'Saturday at SiSi', date: '12 lipca, 22:00', iso: '2026-07-12', note: 'Special Guest',
    img: '/framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp' },

  // --- Archive ---
  { title: "Midsummer's Eve", date: '20 czerwca, 22:00', iso: '2026-06-20', note: 'Noc Świętojańska',
    img: '/framerusercontent.com/images/loXZHRygofAyWJdOaLJm2nba20Y.webp' },
  { title: 'Friday at SiSi', date: '19 czerwca, 22:00', iso: '2026-06-19', note: 'DJ ADB',
    img: '/framerusercontent.com/images/Vl3kSLbolFditeShXmcLZITH7A8.webp' },
  { title: 'Saturday at SiSi', date: '14 czerwca, 22:00', iso: '2026-06-14', note: 'Live Act',
    img: '/framerusercontent.com/images/RHdmR5s8jXTtyexi8FJLI4WDkig.webp' },
  { title: 'Friday at SiSi', date: '13 czerwca, 22:00', iso: '2026-06-13', note: 'DJ Mike Lynx',
    img: '/framerusercontent.com/images/QxXDx4GN74BgGuzaDth23HA.webp' },
  { title: 'Saturday at SiSi', date: '7 czerwca, 22:00', iso: '2026-06-07', note: 'Live Act',
    img: '/framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp' },
  { title: 'Friday at SiSi', date: '6 czerwca, 22:00', iso: '2026-06-06', note: 'DJ ADB',
    img: '/framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp' },
];

/** Split events into upcoming (soonest first) and past (most recent first),
    relative to the build date. */
export function splitEvents(list: EventItem[] = EVENTS) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = list
    .filter((e) => e.iso >= today)
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const past = list
    .filter((e) => e.iso < today)
    .sort((a, b) => b.iso.localeCompare(a.iso));
  return { upcoming, past };
}

export const CONTACT = {
  email: 'biuro@r32.com.pl',
  address: 'Rzeźnicza 32, Wrocław',
  phone: '+48 515 126 260',
  phoneHref: 'tel:+48515126260',
  eventsPhone: '+48 514 032 930',
  eventsPhoneHref: 'tel:+48514032930',
  eventsEmail: 'events@r32.com.pl',
  hoursLabel: 'Piątek - Sobota',
  hours: '22:00 - 04:00',
  instagram: 'https://www.instagram.com/sisiwroclaw/',
  facebook: 'https://www.facebook.com/sisimusicclub',
  tripadvisor:
    'https://www.tripadvisor.com/Attraction_Review-g274812-d34327483-Reviews-SISI_Wroclaw_Music_Club-Wroclaw_Lower_Silesia_Province_Southern_Poland.html',
};

/* Legal entity behind SiSi - powers the legal pages (Regulamin, Polityka
   prywatności, Polityka cookies, Kontakt).
   TODO(legal): fill in the real registration data below, and have a lawyer
   review the final legal copy before relying on it. */
export const COMPANY = {
  legalName: 'UZUPEŁNIĆ: pełna nazwa firmy / spółki (np. R32 Sp. z o.o.)',
  tradeName: 'SiSi Wrocław',
  street: 'Rzeźnicza 32',
  postalCity: '50-130 Wrocław',
  nip: 'UZUPEŁNIĆ: NIP',
  regon: 'UZUPEŁNIĆ: REGON',
  krs: 'UZUPEŁNIĆ: KRS (jeśli dotyczy)',
  email: 'biuro@r32.com.pl',
  phone: '+48 515 126 260',
  phoneHref: 'tel:+48515126260',
};

// Shown as the "last updated" date on the legal pages.
export const LEGAL_UPDATED = '24 czerwca 2026';

/* === STRUCTURED DATA (JSON-LD) ===
   Single source for SEO/GEO machine-readable facts. Google's local pack and AI
   answer engines (GEO) read this to state what SiSi is, where it is, when it's
   open and what's on. Keep the address/geo correct - those drive maps. */
export const BUSINESS = {
  name: 'SiSi Wrocław',
  url: 'https://sisiwroclaw.pl',
  logo: 'https://sisiwroclaw.pl/apple-touch-icon.png',
  image: 'https://sisiwroclaw.pl/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
  description:
    'SiSi to serce nocnego Wrocławia - muzyka na żywo, najlepsi DJ-e, autorskie koktajle i wyjątkowa atmosfera w sercu kompleksu R32.',
  streetAddress: 'Rzeźnicza 32',
  locality: 'Wrocław',
  region: 'Dolnośląskie',
  // TODO(verify): postal code + coordinates are best-effort for the Old Town
  // address. Confirm against the real venue and correct here if needed.
  postalCode: '50-130',
  country: 'PL',
  latitude: 51.1106,
  longitude: 17.0286,
  priceRange: '$$',
};

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

/** Site-wide venue entity (LocalBusiness → NightClub). */
export function nightClubSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    '@id': `${BUSINESS.url}/#nightclub`,
    name: BUSINESS.name,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    description: BUSINESS.description,
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
    sameAs: [CONTACT.instagram, CONTACT.facebook],
    acceptsReservations: 'True',
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: RESERVATION_URL,
        inLanguage: 'pl-PL',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: 'Rezerwacja stolika' },
    },
  };
}

/** WebSite entity, linked to the venue as publisher. */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BUSINESS.url}/#website`,
    url: BUSINESS.url,
    name: BUSINESS.name,
    inLanguage: 'pl-PL',
    publisher: { '@id': `${BUSINESS.url}/#nightclub` },
  };
}

/** Day after `iso` (YYYY-MM-DD); club nights end at 04:00 the next morning. */
function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** One Event object per upcoming night - powers Google/GEO event surfaces. */
export function eventSchema(list: EventItem[]) {
  return list.map((e) => {
    const ev: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: e.note ? `${e.title} - ${e.note}` : e.title,
      startDate: `${e.iso}T22:00:00+02:00`,
      endDate: `${nextDay(e.iso)}T04:00:00+02:00`,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: [`${BUSINESS.url}${e.img}`],
      url: `${BUSINESS.url}/wydarzenia`,
      location: { '@type': 'Place', name: BUSINESS.name, address: addressLd() },
      organizer: { '@type': 'Organization', name: BUSINESS.name, url: BUSINESS.url },
      offers: {
        '@type': 'Offer',
        url: RESERVATION_URL,
        availability: 'https://schema.org/InStock',
      },
    };
    if (e.note) ev.performer = { '@type': 'PerformingGroup', name: e.note };
    return ev;
  });
}
