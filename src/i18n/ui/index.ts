/* Aggregates every locale dictionary. Each non-default dictionary is typed
   `: UI`, so a missing or misnamed key is a compile-time error - untranslated
   keys cannot silently reach production. */
import type { Locale } from '../config';
import pl, { type UI } from './pl';
import en from './en';
import de from './de';
import it from './it';
import cs from './cs';

export const DICTS: Record<Locale, UI> = { pl, en, de, it, cs };
export type { UI };
