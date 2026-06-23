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
  hoursLabel: 'Piątek - Sobota',
  hours: '22:00 - 04:00',
  instagram: 'https://www.instagram.com/sisiwroclaw/',
  facebook: 'https://www.facebook.com/sisimusicclub',
};
