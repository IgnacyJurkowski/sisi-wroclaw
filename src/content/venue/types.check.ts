/* Compile-time guard for the venue types. Nothing imports this file.

   `astro check` (part of `npm test`) fails on an unused `@ts-expect-error`, so
   if someone loosens a type until one of these examples compiles, the check
   fails. Each line is a mistake the types must reject. */

import { gap } from './facts';
import type { Fact, Gap, MenuItem, Venue } from './types';

// @ts-expect-error a fact without a source does not compile
export const noSource: Fact<number> = { value: 1, status: 'PENDING' };

// @ts-expect-error a fact without a status does not compile
export const noStatus: Fact<number> = { value: 1, source: 'src/data/site.ts:1' };

// @ts-expect-error a source is a `file:line`, a `file:first-last` or an https URL
export const looseSource: Fact<number> = { value: 1, source: 'somewhere in the repo', status: 'PENDING' };

// @ts-expect-error an empty list of sources is not a source
export const emptySources: Fact<number> = { value: 1, source: [], status: 'PENDING' };

// @ts-expect-error a CONFIRMED fact has to say who confirmed it and when
export const anonymousConfirm: Fact<number> = { value: 1, source: 'src/data/site.ts:1', status: 'CONFIRMED' };

// @ts-expect-error status is PENDING or CONFIRMED, nothing else
export const otherStatus: Fact<number> = { value: 1, source: 'src/data/site.ts:1', status: 'VERIFIED' };

// @ts-expect-error a gap carries no value: it is missing, not guessed
export const guessedGap: Gap<'ABV'> = { value: 5, status: 'PENDING', gap: 'ABV', placeholder: '[ABV?]' };

// @ts-expect-error a gap id must have a row in gaps.ts
export const unknownGap = gap('NOT_IN_THE_LOG');

// @ts-expect-error an ABV of 5 needs a source: a bare number is not a Fact
export const bareAbv: MenuItem['abvPercent'] = 5;

// @ts-expect-error a menu item that leaves out its allergens gap does not compile
export const noAllergens: MenuItem = {
  id: 'x/y',
  name: { value: 'Y', source: 'src/data/bar-menu.ts:1', status: 'PENDING' },
  options: [],
  abvPercent: gap('ABV'),
  tags: gap('TASTE_TAGS'),
};

// @ts-expect-error a venue without its address does not compile
export const noAddress: Omit<Venue, 'snapshot'> = { identity: {} as Venue['identity'] };
