// The sync scripts are plain Node (no TS loader), but the locale set must not
// drift from the site's single source of truth. Read it out of
// src/i18n/config.ts instead of duplicating the list here; an unreadable or
// unexpected config throws, so the sync fails closed rather than publishing
// articles under a locale the site does not render.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG = path.resolve(import.meta.dirname, '../../src/i18n/config.ts');

export async function siteLocales() {
  const source = await readFile(CONFIG, 'utf8');
  const match = /export const LOCALES = \[([^\]]+)\]/.exec(source);
  const locales = match
    ? [...match[1].matchAll(/['"]([a-z]{2})['"]/g)].map((entry) => entry[1])
    : [];
  if (!locales.length) throw new Error(`Could not read LOCALES from ${CONFIG}`);
  return locales;
}
