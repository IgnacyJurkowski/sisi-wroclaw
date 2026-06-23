/* Shared site data - single source of truth for nav, footer and contact details. */

export const RESERVATION_URL =
  'https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/pl';

export type NavItem = { id: string; label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { id: 'events', label: 'Wydarzenia', href: '/wydarzenia' },
  { id: 'menu', label: 'Menu', href: '/menu' },
  { id: 'kariera', label: 'Kariera', href: '/kariera' },
];

export type EventItem = { title: string; date: string; note?: string; img: string };

// Shared event list - feeds the homepage teaser and the /wydarzenia page.
export const EVENTS: EventItem[] = [
  {
    title: 'Friday at SiSi',
    date: '19 czerwca, 22:00',
    img: '/framerusercontent.com/images/Vl3kSLbolFditeShXmcLZITH7A8.jpg',
  },
  {
    title: 'Saturday at SiSi',
    date: '20 czerwca, 22:00',
    note: 'Live Act',
    img: '/framerusercontent.com/images/loXZHRygofAyWJdOaLJm2nba20Y.png',
  },
];

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
