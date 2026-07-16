import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NIGHTCLUB_OPENING_HOURS,
  SUMMER_FRIDAY_NOTICE,
  isSummerFridayNoticeActive,
} from '../src/lib/summer-hours.mjs';

test('summer Friday notice stops exactly at midnight in Warsaw after 28 August', () => {
  assert.equal(SUMMER_FRIDAY_NOTICE.cutoffIso, '2026-08-28T22:00:00.000Z');
  assert.equal(isSummerFridayNoticeActive(Date.parse('2026-08-28T21:59:59.999Z')), true);
  assert.equal(isSummerFridayNoticeActive(Date.parse('2026-08-28T22:00:00.000Z')), false);
  assert.equal(isSummerFridayNoticeActive(Number.NaN), false);
  assert.equal(isSummerFridayNoticeActive(Date.now(), 'not-a-date'), false);
});

test('NightClub hours preserve Saturday, close summer Fridays, and reopen future Fridays', () => {
  assert.deepEqual(NIGHTCLUB_OPENING_HOURS, [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '22:00',
      closes: '04:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Friday',
      opens: '00:00',
      closes: '00:00',
      validFrom: '2026-07-17',
      validThrough: '2026-08-28',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Friday',
      opens: '22:00',
      closes: '04:00',
      validFrom: '2026-08-29',
    },
  ]);
});
