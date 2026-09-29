/* Venue truth: display strings derived from the numbers.

   Prices are stored as numbers in PLN and volumes as numbers in ml. These
   functions rebuild the exact strings the site prints today, so a page can
   render from the data and stay byte-identical (the inventory probe checks it). */

import type { PriceOption, VolumeUnit } from './types';

/** `44` -> `44 zł`. */
export function formatPln(amount: number): string {
  return `${amount} zł`;
}

/** `160, 'ml'` -> `160 ml`; `40, 'cl'` -> `4 cl`; `1750, 'l'` -> `1,75 l`. */
export function formatVolume(ml: number, unit: VolumeUnit = 'ml'): string {
  if (unit === 'cl') return `${ml / 10} cl`;
  if (unit === 'l') return `${String(ml / 1000).replace('.', ',')} l`;
  return `${ml} ml`;
}

/** One price or several sizes: `44 zł`, `20 / 22 zł`. Empty when there is no price. */
export function formatPriceOptions(options: readonly PriceOption[]): string {
  const amounts = options.map((option) => option.pricePln.value);
  if (amounts.length === 0) return '';
  return amounts.length === 1 ? formatPln(amounts[0] as number) : `${amounts.join(' / ')} zł`;
}

/** The volume column: `160 ml`, `330 / 500 ml`, `4 cl`; empty when none is stated. */
export function formatVolumeOptions(options: readonly PriceOption[]): string {
  const stated = options.flatMap((option) =>
    option.volumeMl === undefined ? [] : [{ ml: option.volumeMl.value, unit: option.volumeUnit ?? 'ml' }],
  );
  if (stated.length === 0) return '';
  if (stated.length === 1) return formatVolume(stated[0]!.ml, stated[0]!.unit);
  return `${stated.map((v) => v.ml).join(' / ')} ml`;
}

/** Sizes with their own price, as printed for champagne and prosecco: `125 ml 69 zł · 750 ml 420 zł`. */
export function formatSizedPrices(options: readonly PriceOption[]): string {
  return options
    .map((option) => {
      const size = option.volumeMl === undefined ? '' : `${formatVolume(option.volumeMl.value, option.volumeUnit ?? 'ml')} `;
      return `${size}${formatPln(option.pricePln.value)}`;
    })
    .join(' · ');
}
