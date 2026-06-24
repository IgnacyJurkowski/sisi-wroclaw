/* Central i18n configuration — single source of truth for the locale set.
   To add a locale: add it to LOCALES and fill in the maps below, then add a
   matching dictionary in src/i18n/ui/<locale>.ts (see docs/I18N.md). */

export const LOCALES = ['pl', 'en', 'de', 'it', 'cs'] as const;
export type Locale = (typeof LOCALES)[number];

/** Source language. Untranslated keys fall back here (with a dev warning). */
export const DEFAULT_LOCALE: Locale = 'pl';

/** Venue timezone — all event dates are rendered relative to this. */
export const TIMEZONE = 'Europe/Warsaw';

/** Native language names for the language selector (never flags alone). */
export const LOCALE_NAMES: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  cs: 'Čeština',
};

/** BCP-47 value for the <html lang> attribute and Intl formatting. */
export const LOCALE_LANG: Record<Locale, string> = {
  pl: 'pl',
  en: 'en',
  de: 'de',
  it: 'it',
  cs: 'cs',
};

/** Open Graph og:locale value. */
export const LOCALE_OG: Record<Locale, string> = {
  pl: 'pl_PL',
  en: 'en_GB',
  de: 'de_DE',
  it: 'it_IT',
  cs: 'cs_CZ',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
