import test from 'node:test';
import assert from 'node:assert/strict';
import { capacityNotice, decorTablesCost, estimate, formatMinutes, formatZl, parsePrice, recommendSpace, sisiNightFee, toMinutes } from '../src/lib/configurator-estimate.mjs';

test('parsePrice reads the menu price labels as published', () => {
  assert.equal(parsePrice('49 zł'), 49);
  assert.equal(parsePrice('2300 zł'), 2300);
  assert.equal(parsePrice('25 / 120 zł'), 25);
  assert.equal(parsePrice('według karty'), null);
  assert.equal(parsePrice(undefined), null);
});

test('estimate multiplies per-guest lines by the group and unit lines as-is', () => {
  const result = estimate({
    guests: 20,
    lines: [
      { group: 'drinks', kind: 'perGuest', price: 44, qty: 2 }, // 2 cocktails each
      { group: 'drinks', kind: 'unit', price: 420, qty: 3 }, // 3 bottles
      { group: 'food', kind: 'unit', price: 379, qty: 2 }, // 2 platters for 6
    ],
  });
  assert.equal(result.drinks, 44 * 2 * 20 + 420 * 3);
  assert.equal(result.food, 379 * 2);
  assert.equal(result.total, result.drinks + result.food);
  assert.equal(result.perGuest, Math.round(result.total / 20));
  assert.equal(result.lineCount, 3);
});

test('estimate ignores empty, negative and unpriced lines and survives zero guests', () => {
  const result = estimate({
    guests: 0,
    lines: [
      { group: 'drinks', kind: 'perGuest', price: 44, qty: 1 },
      { group: 'food', kind: 'unit', price: null, qty: 4 },
      { group: 'food', kind: 'unit', price: 65, qty: -2 },
      { group: 'food', kind: 'unit', price: 65, qty: 0 },
    ],
  });
  assert.deepEqual(result, { guests: 0, drinks: 0, food: 0, total: 0, perGuest: 0, lineCount: 0 });
});

test('capacityNotice only flags the owner-verified limits', () => {
  assert.equal(capacityNotice({ guests: 150, seating: 'seated' }), null);
  assert.deepEqual(capacityNotice({ guests: 151, seating: 'seated' }), { limit: 'seated', capacity: 150 });
  assert.equal(capacityNotice({ guests: 500, seating: 'standing' }), null);
  assert.deepEqual(capacityNotice({ guests: 501, seating: 'standing' }), { limit: 'standing', capacity: 500 });
  assert.deepEqual(capacityNotice({ guests: 200, seating: 'mixed' }), { limit: 'seated', capacity: 150 });
  assert.equal(capacityNotice({ guests: 0, seating: 'seated' }), null);
});

test('formatZl groups thousands with a plain space', () => {
  assert.equal(formatZl(2409), '2 409 zł');
  assert.equal(formatZl(0), '0 zł');
  assert.equal(formatZl('abc'), '0 zł');
});

import { corkBaseHours, corkEstimate, corkStartSlots } from '../src/lib/configurator-estimate.mjs';
import {
  CORK_BASE_HOURS, CORK_CHILD_SHARE, CORK_DEPOSIT_SHARE, CORK_SERVICE_FEE, CORK_START_WINDOWS, corkPriceLabels,
} from '../src/data/cork-configurator.mjs';

const CORK_RULES = { childShare: CORK_CHILD_SHARE, serviceFee: CORK_SERVICE_FEE, depositShare: CORK_DEPOSIT_SHARE };

test('corkEstimate reproduces the restaurant configurator totals', () => {
  // 20 adults, 4 children at 50%, +1 h (+10% on food), 80 + 139 food, 70 wine
  const r = corkEstimate({ adults: 20, childrenHalf: 4, foodPerAdult: 219, extensionSurcharge: 0.1, drinksPerAdult: 70 }, CORK_RULES);
  assert.equal(r.value, 6700);
  assert.equal(r.service, 670);
  assert.equal(r.total, 7370);
  assert.equal(r.deposit, 3685);
  assert.equal(r.balance, 3685);
  // 10 adults, menu only
  const s = corkEstimate({ adults: 10, foodPerAdult: 219 }, CORK_RULES);
  assert.deepEqual([s.value, s.service, s.total], [2190, 219, 2409]);
});

test('corkEstimate adds flat items before the service fee and survives empty input', () => {
  const r = corkEstimate({ adults: 8, drinksPerAdult: 190, flat: 300 }, CORK_RULES);
  assert.equal(r.value, 8 * 190 + 300);
  assert.equal(r.service, Math.round(r.value * 0.1));
  assert.deepEqual(corkEstimate({ adults: 0 }, CORK_RULES).total, 0);
});

test('corkBaseHours follows the published thresholds', () => {
  assert.equal(corkBaseHours(9, CORK_BASE_HOURS), null);
  assert.equal(corkBaseHours(10, CORK_BASE_HOURS), 3);
  assert.equal(corkBaseHours(11, CORK_BASE_HOURS), 3);
  assert.equal(corkBaseHours(12, CORK_BASE_HOURS), 4);
  assert.equal(corkBaseHours(15, CORK_BASE_HOURS), 5);
  assert.equal(corkBaseHours(59, CORK_BASE_HOURS), 5);
  assert.equal(corkBaseHours(60, CORK_BASE_HOURS), null);
});

test('corkStartSlots follows the weekday windows in half-hour steps', () => {
  assert.deepEqual(corkStartSlots('2026-10-14', CORK_START_WINDOWS).slice(0, 2), ['17:00', '17:30']); // Wednesday
  assert.equal(corkStartSlots('2026-10-14', CORK_START_WINDOWS).at(-1), '20:30');
  assert.equal(corkStartSlots('2026-10-16', CORK_START_WINDOWS).at(-1), '21:00'); // Friday
  assert.deepEqual([corkStartSlots('2026-10-17', CORK_START_WINDOWS)[0], corkStartSlots('2026-10-17', CORK_START_WINDOWS).at(-1)], ['14:00', '21:00']); // Saturday
  assert.deepEqual([corkStartSlots('2026-10-18', CORK_START_WINDOWS)[0], corkStartSlots('2026-10-18', CORK_START_WINDOWS).at(-1)], ['13:00', '18:30']); // Sunday
  assert.deepEqual(corkStartSlots('nonsense', CORK_START_WINDOWS), []);
});

test('corkPriceLabels lists every published restaurant amount', () => {
  const labels = corkPriceLabels();
  for (const expected of ['80 zł', '95 zł', '139 zł', '159 zł', '38 zł', '70 zł', '90 zł', '120 zł', '190 zł', '220 zł', '40 zł', '300 zł', '450 zł', '650 zł', '1000 zł', '2000 zł', '1500 zł']) {
    assert.ok(labels.includes(expected), expected);
  }
});

const RULES = { seatedTheCork: 150, standingR32: 500, closeMin: 22 * 60 };

test('recommendSpace: a seated dinner that ends by closing goes to The Cork', () => {
  assert.deepEqual(recommendSpace({ guests: 22, seating: 'seated', startMin: 18 * 60, endMin: 22 * 60 }, RULES), { key: 'cork', reasons: ['seated'] });
});

test('recommendSpace: a seated dinner past 22:00 or with an evening part takes the whole R32', () => {
  assert.deepEqual(recommendSpace({ guests: 22, seating: 'seated', startMin: 18 * 60, endMin: 23 * 60 }, RULES), { key: 'r32', reasons: ['seated', 'afterClose'] });
  assert.deepEqual(recommendSpace({ guests: 40, seating: 'mixed', startMin: 18 * 60, endMin: 26 * 60 }, RULES), { key: 'r32', reasons: ['mixed'] });
});

test('recommendSpace: capacities use only the verified 150 seated and 500 standing', () => {
  assert.deepEqual(recommendSpace({ guests: 151, seating: 'seated', startMin: 18 * 60, endMin: 21 * 60 }, RULES), { key: 'r32', reasons: ['overSeated'] });
  assert.deepEqual(recommendSpace({ guests: 501, seating: 'standing', startMin: 20 * 60, endMin: 26 * 60 }, RULES), { key: 'r32', reasons: ['overStanding'] });
  assert.deepEqual(recommendSpace({ guests: 200, seating: 'standing', startMin: 20 * 60, endMin: 26 * 60 }, RULES), { key: 'r32', reasons: ['standing', 'largeGroup'] });
});

test('recommendSpace: standing groups go to SiSi in the evening and to R32 by day', () => {
  assert.deepEqual(recommendSpace({ guests: 60, seating: 'standing', startMin: 20 * 60, endMin: 26 * 60 }, RULES), { key: 'sisi', reasons: ['standing', 'evening'] });
  assert.deepEqual(recommendSpace({ guests: 60, seating: 'standing', startMin: 14 * 60, endMin: 18 * 60 }, RULES), { key: 'r32', reasons: ['standing', 'daytime'] });
  assert.equal(recommendSpace({ guests: 0, seating: 'standing', startMin: null, endMin: null }, RULES), null);
  assert.equal(recommendSpace({ guests: 20, seating: '', startMin: null, endMin: null }, RULES), null);
});

test('sisiNightFee charges the owner-set Friday and Saturday hire fees only', () => {
  const fees = { 5: 5000, 6: 15000 };
  assert.equal(sisiNightFee('2026-09-18', fees), 5000); // Friday
  assert.equal(sisiNightFee('2026-09-19', fees), 15000); // Saturday
  assert.equal(sisiNightFee('2026-09-20', fees), 0); // Sunday
  assert.equal(sisiNightFee('', fees), 0);
});

test('decorTablesCost multiplies the per-table price by the tables the group needs', () => {
  assert.equal(decorTablesCost(1000, 22, 8), 3000);
  assert.equal(decorTablesCost(2000, 16, 8), 4000);
  assert.equal(decorTablesCost(1000, 0, 8), 0);
  assert.equal(decorTablesCost(null, 22, 8), 0);
});

test('toMinutes / formatMinutes round-trip and wrap after midnight', () => {
  assert.equal(toMinutes('18:30'), 18 * 60 + 30);
  assert.equal(toMinutes('inna'), null);
  assert.equal(formatMinutes(26 * 60), '02:00');
  assert.equal(formatMinutes(18 * 60 + 30), '18:30');
});
