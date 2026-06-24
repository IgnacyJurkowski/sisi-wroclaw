/* Central localized-route map. Every public page is identified by a stable
   RouteKey; the public URL slug is translated per locale. Components link via
   localizedPath(key, locale) — never hard-code URLs. */

import { LOCALES, type Locale } from './config';

export const ROUTE_KEYS = [
  'home',
  'events',
  'menu',
  'careers',
  'reservations',
  'corporate',
  'contact',
  'terms',
  'privacy',
  'cookies',
] as const;
export type RouteKey = (typeof ROUTE_KEYS)[number];

/** URL slug per locale. '' is the locale root (home). */
export const SLUGS: Record<RouteKey, Record<Locale, string>> = {
  home: { pl: '', en: '', de: '', it: '', cs: '' },
  events: { pl: 'wydarzenia', en: 'events', de: 'veranstaltungen', it: 'eventi', cs: 'akce' },
  menu: { pl: 'menu', en: 'menu', de: 'menu', it: 'menu', cs: 'menu' },
  careers: { pl: 'kariera', en: 'careers', de: 'karriere', it: 'lavora-con-noi', cs: 'kariera' },
  reservations: { pl: 'rezerwacje', en: 'reservations', de: 'reservierungen', it: 'prenotazioni', cs: 'rezervace' },
  corporate: { pl: 'eventy-firmowe', en: 'corporate-events', de: 'firmenevents', it: 'eventi-aziendali', cs: 'firemni-akce' },
  contact: { pl: 'kontakt', en: 'contact', de: 'kontakt', it: 'contatti', cs: 'kontakt' },
  terms: { pl: 'regulamin', en: 'terms', de: 'agb', it: 'regolamento', cs: 'pravidla' },
  privacy: { pl: 'polityka-prywatnosci', en: 'privacy-policy', de: 'datenschutz', it: 'privacy', cs: 'ochrana-soukromi' },
  cookies: { pl: 'polityka-cookies', en: 'cookie-policy', de: 'cookie-richtlinie', it: 'cookie', cs: 'zasady-cookies' },
};

/** Main navigation links, in order. Reservations is rendered as the CTA. */
export const NAV_KEYS: RouteKey[] = ['events', 'menu', 'careers', 'corporate'];

/** Legal/utility links shown in the footer. */
export const FOOTER_LEGAL_KEYS: RouteKey[] = ['terms', 'privacy', 'cookies', 'contact'];

/** Localized, trailing-slashed path for a route in a given locale. */
export function localizedPath(key: RouteKey, locale: Locale): string {
  const slug = SLUGS[key][locale];
  return slug ? `/${locale}/${slug}/` : `/${locale}/`;
}

/** Every locale alternate for a route — powers the language switcher + hreflang. */
export function alternates(key: RouteKey): { locale: Locale; path: string }[] {
  return LOCALES.map((locale) => ({ locale, path: localizedPath(key, locale) }));
}

/** Legacy pre-i18n Polish paths → route key, used to emit 301 redirects. */
export const LEGACY_REDIRECTS: Record<string, RouteKey> = {
  '/wydarzenia': 'events',
  '/menu': 'menu',
  '/kariera': 'careers',
  '/rezerwacje': 'reservations',
  '/kontakt': 'contact',
  '/regulamin': 'terms',
  '/polityka-prywatnosci': 'privacy',
  '/polityka-cookies': 'cookies',
};
