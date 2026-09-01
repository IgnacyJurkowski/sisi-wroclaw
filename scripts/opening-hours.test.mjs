import test from 'node:test';
import assert from 'node:assert/strict';

import { NIGHTCLUB_OPENING_HOURS } from '../src/lib/opening-hours.mjs';

test('NightClub hours are both club nights, with no seasonal window left', () => {
  assert.deepEqual(NIGHTCLUB_OPENING_HOURS, [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Friday', opens: '22:00', closes: '04:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '22:00', closes: '04:00' },
  ]);
  // The 2026 summer break is over: no entry may still carry a validity window,
  // or search engines would keep publishing the closed Fridays.
  for (const hours of NIGHTCLUB_OPENING_HOURS) {
    assert.equal('validFrom' in hours, false);
    assert.equal('validThrough' in hours, false);
  }
});
