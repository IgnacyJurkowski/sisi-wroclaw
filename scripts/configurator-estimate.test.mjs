import test from 'node:test';
import assert from 'node:assert/strict';
import { capacityNotice, estimate, formatZl, parsePrice } from '../src/lib/configurator-estimate.mjs';

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
