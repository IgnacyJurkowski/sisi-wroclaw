/* Event-configurator pick lists, derived at build time from the data the menu
   page already renders (bar-menu.ts, food-menu.ts) and the owner-verified venue
   facts (VENUE_FACTS). Nothing here is authored for the configurator alone: if
   a price changes in the menu data, the configurator follows automatically, and
   it cannot list an item the menu does not. */

import { type Locale } from '../i18n/config';
import { parsePrice } from '../lib/configurator-estimate.mjs';
import { CHAMPAGNE_HOUSES, WINES, bottleService } from './bar-menu';
import { SECTIONS as FOOD_SECTIONS, type L } from './food-menu';
import { VENUE_FACTS } from './site';

/** How a line's quantity is read by the estimate (see configurator-estimate.mjs). */
export type PickKind = 'perGuest' | 'unit';

export interface Pick {
  /** stable id used as the quantity field name, e.g. "cocktail-hugo-spritz" */
  id: string;
  /** brand / dish name as printed on the menu; dish names are localized */
  name: string | L;
  /** optional descriptor: cocktail ingredients, winery, portion size */
  detail?: string | L;
  /** the menu price label exactly as published, e.g. "44 zł" */
  priceLabel: string;
  /** numeric price used by the estimate */
  price: number;
  kind: PickKind;
  group: 'drinks' | 'food';
}

export type PickGroupKey = 'cocktails' | 'wines' | 'champagne' | 'bottles' | 'food';

export interface PickGroup {
  key: PickGroupKey;
  tab: 'drinks' | 'food';
  hint: 'perGuest' | 'bottles' | 'portions';
  items: Pick[];
}

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function priced(id: string, name: string | L, priceLabel: string, kind: PickKind, group: 'drinks' | 'food', detail?: string | L): Pick | null {
  const price = parsePrice(priceLabel);
  if (price === null) return null;
  return { id, name, detail, priceLabel, price, kind, group };
}

const present = <T,>(value: T | null): value is T => value !== null;

/** Event cocktails are a flat per-guest price set by the owner (2026-09-15):
    38 zł per cocktail and 35 zł per 0% cocktail, any recipe from the SiSi
    menu. Visitors pick how many per guest, not which ones. */
const cocktailPicks: Pick[] = [
  {
    id: 'cocktail-per-guest',
    name: { pl: 'Koktajl z karty SiSi', en: 'Cocktail from the SiSi menu', de: 'Cocktail aus der SiSi-Karte', it: 'Cocktail dal menu SiSi', cs: 'Koktejl z nabídky SiSi' },
    detail: { pl: 'dowolny koktajl autorski · cena za sztukę', en: 'any signature cocktail · price per drink', de: 'beliebiger Signature-Cocktail · Preis pro Drink', it: 'qualsiasi cocktail d’autore · prezzo a drink', cs: 'libovolný autorský koktejl · cena za kus' },
    priceLabel: '38 zł',
    price: 38,
    kind: 'perGuest',
    group: 'drinks',
  },
  {
    id: 'mocktail-per-guest',
    name: { pl: 'Koktajl 0% z karty SiSi', en: '0% cocktail from the SiSi menu', de: 'Cocktail 0% aus der SiSi-Karte', it: 'Cocktail 0% dal menu SiSi', cs: 'Koktejl 0% z nabídky SiSi' },
    detail: { pl: 'dowolny koktajl bezalkoholowy · cena za sztukę', en: 'any alcohol-free cocktail · price per drink', de: 'beliebiger alkoholfreier Cocktail · Preis pro Drink', it: 'qualsiasi cocktail analcolico · prezzo a drink', cs: 'libovolný nealkoholický koktejl · cena za kus' },
    priceLabel: '35 zł',
    price: 35,
    kind: 'perGuest',
    group: 'drinks',
  },
];

/** Wines by the 750 ml bottle: quantity is a bottle count. */
const winePicks: Pick[] = WINES.map((wine) =>
  priced(`wine-${slug(`${wine.winery} ${wine.name}`)}`, wine.name, wine.bottlePrice, 'unit', 'drinks', wine.winery),
).filter(present);

/** Champagne by the 750 ml bottle (index 1 of CHAMP_VOLS). */
const champagnePicks: Pick[] = CHAMPAGNE_HOUSES.flatMap((house) =>
  house.items
    .map((cuvee) => {
      const bottle = cuvee.prices[1];
      if (!bottle) return null;
      return priced(`champagne-${slug(`${house.house} ${cuvee.name}`)}`, cuvee.name, bottle, 'unit', 'drinks', house.house);
    })
    .filter(present),
);

/** Bottle service, priced per bottle as published. */
const bottlePicks: Pick[] = bottleService
  .map((item) => priced(`bottle-${slug(`${item.name} ${item.vol}`)}`, item.name, item.price, 'unit', 'drinks', item.vol))
  .filter(present);

/** Night Menu dishes: one pick per priced tier (Oysters 3 / 6 / 9 pcs …). */
const foodPicks: Pick[] = FOOD_SECTIONS.flatMap((section) =>
  section.dishes.flatMap((dish) =>
    dish.tiers
      .map((tier, index) =>
        priced(`food-${slug(dish.name.en)}-${index}`, dish.name, tier.price, 'unit', 'food', tier.qty),
      )
      .filter(present),
  ),
);

export const PICK_GROUPS: PickGroup[] = [
  { key: 'cocktails', tab: 'drinks', hint: 'perGuest', items: cocktailPicks },
  { key: 'wines', tab: 'drinks', hint: 'bottles', items: winePicks },
  { key: 'champagne', tab: 'drinks', hint: 'bottles', items: champagnePicks },
  { key: 'bottles', tab: 'drinks', hint: 'bottles', items: bottlePicks },
  { key: 'food', tab: 'food', hint: 'portions', items: foodPicks },
];

/** Resolve a localized or invariant label. */
export function pickText(value: string | L | undefined, locale: Locale): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value[locale];
}

/** Occasion keys, in display order (labels live in the dictionaries). */
export const OCCASIONS = ['birthday', 'anniversary', 'celebration', 'corporate', 'other'] as const;
export type OccasionKey = (typeof OCCASIONS)[number];

/** Seating formats, checked against the verified limits by capacityNotice(). */
export const SEATINGS = ['seated', 'standing', 'mixed'] as const;
export type SeatingKey = (typeof SEATINGS)[number];

/** Spaces, in display order. The facts shown next to each are VENUE_FACTS. */
export const SPACES = ['sisi', 'cork', 'r32', 'unsure'] as const;
export type SpaceKey = (typeof SPACES)[number];

/** Extras the venue has confirmed it offers (see docs/B2B.md); all quoted individually. */
export const EXTRAS = ['exclusive', 'music', 'screens', 'catering'] as const;
export type ExtraKey = (typeof EXTRAS)[number];

/** Event lengths offered (owner, 2026-09-15). */
export const DURATIONS = [4, 5, 6, 8, 10] as const;
/** Hire fee for SiSi on its club nights, by weekday (0 = Sunday); owner, 2026-09-15. */
export const SISI_NIGHT_FEES: Record<number, number> = { 5: 5000, 6: 15000 };
/** The recommendation treats a start from this hour as an evening. */
export const EVENING_FROM = '19:00';

export const CONFIGURATOR_LIMITS = {
  /** Smallest group the configurator plans for (owner, 2026-09-15). */
  minGuests: 10,
  seatedTheCork: VENUE_FACTS.theCorkSeated,
  standingR32: VENUE_FACTS.standingBuffet,
};
