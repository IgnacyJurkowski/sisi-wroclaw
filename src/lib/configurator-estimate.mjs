/* Event-configurator arithmetic, shared by the page script and its unit test.
 *
 * The configurator prices nothing of its own: every line carries a price read
 * from the published bar / Night Menu data (src/data/bar-menu.ts,
 * src/data/food-menu.ts), and the venue limits come from VENUE_FACTS. The
 * estimate is therefore "these menu items at today's menu prices", never a
 * quote - the page says so next to the number, and the enquiry form is where
 * the actual (individual) pricing happens.
 */

/** '49 zł' | '2300 zł' | '25 / 120 zł' -> the first integer amount, or null. */
export function parsePrice(label) {
  const match = String(label ?? '').match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/**
 * Owner-verified limits (see VENUE_FACTS in src/data/site.ts).
 * @type {{ seatedTheCork: number, standingR32: number }}
 */
export const LIMITS = { seatedTheCork: 150, standingR32: 500 };

/**
 * lines: [{ group: 'drinks'|'food', kind: 'perGuest'|'unit', price, qty }]
 *   perGuest - qty is "per guest", multiplied by the guest count (cocktails).
 *   unit     - qty is an absolute count (bottles, food portions).
 * Returns integer zł totals; perGuest is rounded to whole zł.
 */
export function estimate({ guests, lines }) {
  const g = Math.max(0, Math.floor(Number(guests) || 0));
  const totals = { drinks: 0, food: 0 };
  let lineCount = 0;
  for (const line of lines ?? []) {
    const price = Number(line.price);
    const qty = Math.max(0, Math.floor(Number(line.qty) || 0));
    if (!Number.isFinite(price) || price <= 0 || qty === 0) continue;
    const units = line.kind === 'perGuest' ? qty * g : qty;
    if (units === 0) continue;
    const group = line.group === 'food' ? 'food' : 'drinks';
    totals[group] += price * units;
    lineCount += 1;
  }
  const total = totals.drinks + totals.food;
  return {
    guests: g,
    drinks: totals.drinks,
    food: totals.food,
    total,
    perGuest: g > 0 ? Math.round(total / g) : 0,
    lineCount,
  };
}

/**
 * Which verified limit the chosen format exceeds, if any.
 * seating: 'seated' | 'standing' | 'mixed' (mixed is checked against both).
 * Returns null when the group fits, otherwise { limit, capacity } so the page
 * can show the matching notice without inventing a number.
 * @param {{ guests: number | string, seating: string }} input
 * @param {{ seatedTheCork: number, standingR32: number }} [limits]
 * @returns {{ limit: 'seated' | 'standing', capacity: number } | null}
 */
export function capacityNotice({ guests, seating }, limits = LIMITS) {
  const g = Math.floor(Number(guests) || 0);
  if (g <= 0) return null;
  if ((seating === 'seated' || seating === 'mixed') && g > limits.seatedTheCork) {
    return { limit: 'seated', capacity: limits.seatedTheCork };
  }
  if ((seating === 'standing' || seating === 'mixed') && g > limits.standingR32) {
    return { limit: 'standing', capacity: limits.standingR32 };
  }
  return null;
}

/** Whole-zł amount as "1 234 zł" (thin group separators, no decimals). */
export function formatZl(amount) {
  const value = Math.round(Number(amount) || 0);
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${value < 0 ? '-' : ''}${digits} zł`;
}

/* ---------------------------------------------------------------------------
 * The Cork restaurant offer (src/data/cork-configurator.mjs). Reproduces the
 * restaurant configurator's own arithmetic, verified against its totals on
 * 2026-09-15: 20 adults + 4 children (6-15) + 1 h extension, 219 zł food and
 * 70 zł wine per adult -> 6 700 zł, 670 zł service, 7 370 zł, 3 685 zł deposit.
 * ------------------------------------------------------------------------- */

/** Included hours for an adult head-count, or null when agreed individually. */
export function corkBaseHours(adults, table) {
  const a = Math.floor(Number(adults) || 0);
  let hours = null;
  let matched = false;
  for (const row of table) {
    if (a >= row.minGuests) {
      hours = row.hours;
      matched = true;
    }
  }
  return matched ? hours : null;
}

/** Half-hour start slots for an ISO date under the weekday windows; [] when unknown. */
export function corkStartSlots(isoDate, windows) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const window = windows[d.getDay()];
  if (!window) return [];
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slots = [];
  for (let m = toMin(window[0]); m <= toMin(window[1]); m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

/**
 * The Cork dinner estimate.
 * adults, childrenHalf: head-counts (children 6-15 pay childShare of food).
 * foodPerAdult: sum of chosen course package prices (zł per adult).
 * extensionSurcharge: 0 | 0.1 | 0.2, applied to the food part only.
 * drinksPerAdult: wine / open-bar package (+ premium) per adult.
 * flat: one-off amounts (sommelier, decorations) added before the service fee.
 * Returns whole-zł amounts.
 */
export function corkEstimate({ adults, childrenHalf = 0, foodPerAdult = 0, extensionSurcharge = 0, drinksPerAdult = 0, flat = 0 }, rules) {
  const a = Math.max(0, Math.floor(Number(adults) || 0));
  const c = Math.max(0, Math.floor(Number(childrenHalf) || 0));
  const foodHeads = a + c * rules.childShare;
  const food = foodPerAdult * foodHeads * (1 + extensionSurcharge);
  const drinks = drinksPerAdult * a;
  const flatAmount = Math.max(0, Number(flat) || 0);
  const value = Math.round(food + drinks + flatAmount);
  const service = Math.round(value * rules.serviceFee);
  const total = value + service;
  const deposit = Math.round(total * rules.depositShare);
  return { food: Math.round(food), drinks: Math.round(drinks), flat: Math.round(flatAmount), value, service, total, deposit, balance: total - deposit };
}
