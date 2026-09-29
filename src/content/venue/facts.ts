/* Venue truth: constructors.

   `pending()` is the only way to build a Fact in this branch, and it always
   yields status PENDING. Confirming a fact is a deliberate edit by Ignacy (or by
   someone acting on his written word): change the call site to a literal with
   `status: 'CONFIRMED'`, `confirmedBy` and `confirmedOn`. */

import { LOCALES } from './types';
import type { Contradiction, Fact, Gap, GapId, L10n, Locale, SourceRef, Sources } from './types';
import { GAPS } from './gaps';

export interface FactExtras {
  readonly quote?: string | readonly string[];
  readonly note?: string;
  readonly contradictedBy?: readonly Contradiction[];
}

/** A sourced fact the owner has not confirmed yet. */
export function pending<T>(value: T, source: Sources, extras: FactExtras = {}): Fact<T> {
  return { value, source, status: 'PENDING', ...extras };
}

/** One entry per language: `[text, source]` or `[text, source, quote]`. */
export type L10nEntry =
  | readonly [text: string, source: Sources]
  | readonly [text: string, source: Sources, quote: string | readonly string[]];

/** Build an all-languages fact; a missing language fails to compile. */
export function l10n(entries: Record<Locale, L10nEntry>): L10n {
  const out = {} as Record<Locale, Fact<string>>;
  for (const locale of LOCALES) {
    const entry = entries[locale];
    const [text, source] = entry;
    const quote = entry.length === 3 ? entry[2] : undefined;
    out[locale] = pending(text, source, quote === undefined ? {} : { quote });
  }
  return out;
}

/** A missing fact, rendered as its placeholder. The id must have a row in gaps.ts. */
export function gap<K extends GapId>(id: K): Gap<K> {
  return { value: null, status: 'PENDING', gap: id, placeholder: GAPS[id].placeholder };
}

/** The refs inside a `Sources` value, as an array. */
export function toRefs(source: Sources): readonly SourceRef[] {
  return typeof source === 'string' ? [source] : source;
}

/** Merge sources (and whole L10n facts) into one de-duplicated list, in order. */
export function sourcesOf(...parts: readonly (Sources | L10n)[]): readonly [SourceRef, ...SourceRef[]] {
  const refs: SourceRef[] = [];
  for (const part of parts) {
    const found = typeof part === 'string' || Array.isArray(part) ? toRefs(part as Sources) : LOCALES.flatMap((l) => toRefs((part as L10n)[l].source));
    for (const ref of found) if (!refs.includes(ref)) refs.push(ref);
  }
  if (refs.length === 0) throw new Error('sourcesOf: at least one source is required');
  return refs as unknown as readonly [SourceRef, ...SourceRef[]];
}
