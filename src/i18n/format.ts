/* Locale-aware formatting. Event times are stored as complete ISO strings and
   every visible date label is generated here — no hand-written weekday names. */

import { TIMEZONE, type Locale } from './config';

/** "26 czerwca 2026, 22:00" / "26 June 2026, 22:00" / "26. Juni 2026, 22:00" … */
export function formatEventDate(isoStart: string, locale: Locale): string {
  const d = new Date(isoStart);
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  }).format(d);
  return `${date}, ${time}`;
}

/** Value for the <time datetime="…"> attribute (the stored ISO start). */
export function dateTimeAttr(isoStart: string): string {
  return isoStart;
}

/** "24 czerwca 2026" / "24 June 2026" / "24. Juni 2026" … — a date with no time,
    used for the legal "last updated" label so it reads in the page's language. */
export function formatLongDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/** Localized integer (e.g. 150, 663) with the locale's grouping. */
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(n);
}
