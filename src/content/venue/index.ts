/* Venue truth: public entry point.

   import { VENUE, totalForParty, nightOf } from '../content/venue';

   Everything here is plain TypeScript with relative imports and no framework
   code, so `.astro` files, `.ts` modules and Node scripts (through
   scripts/lib/load-venue.mjs) can all import it. */

export * from './types';
export { pending, l10n, gap, sourcesOf, toRefs } from './facts';
export { GAPS } from './gaps';
export { formatPln, formatVolume, formatPriceOptions, formatVolumeOptions, formatSizedPrices } from './format';
export { HOURS, nightOf } from './hours';
export type { NightRef } from './hours';
export { RESERVATIONS, totalForParty, reservationUrl } from './reservations';
export type { PartyTotal } from './reservations';
export { MENU, describeItem, abvText, portionLabel, slug } from './menu';
export { VENUE } from './venue';
