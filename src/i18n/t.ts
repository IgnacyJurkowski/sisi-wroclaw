/* Translation access. Components call useTranslations(locale) and read typed
   keys directly (t.nav.events). interpolate() fills {token} placeholders.

   Belt-and-suspenders: in dev we also walk every dictionary against the Polish
   source and warn about any missing key. In production the `: UI` typing has
   already guaranteed completeness, so this is silent. */

import { DEFAULT_LOCALE, LOCALES, type Locale } from './config';
import { DICTS, type UI } from './ui';

export function useTranslations(locale: Locale): UI {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

/** Replace {token} placeholders; unknown tokens are left intact. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));
}

function missingKeys(source: unknown, target: unknown, path = ''): string[] {
  if (typeof source !== 'object' || source === null) return [];
  const out: string[] = [];
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;
    const t = target as Record<string, unknown> | undefined;
    if (!t || !(key in t)) {
      out.push(here);
    } else {
      out.push(...missingKeys((source as Record<string, unknown>)[key], t[key], here));
    }
  }
  return out;
}

const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
if (isDev) {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const missing = missingKeys(DICTS[DEFAULT_LOCALE], DICTS[locale]);
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] "${locale}" is missing ${missing.length} key(s):\n  - ${missing.join('\n  - ')}`);
    }
  }
}
