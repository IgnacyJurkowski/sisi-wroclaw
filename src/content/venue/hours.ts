/* Venue truth: opening hours, the business-night rule, closures.

   SiSi opens Friday and Saturday nights at 22:00 and closes at 04:00 the next
   calendar day. A visit at 02:00 on Saturday belongs to Friday's night, so
   anything that counts "per night" (analytics, an "open now" badge, an event's
   end time) must use `nightOf()` and not the calendar date.

   `nightOf()` is deliberately small. It answers one question from wall-clock
   strings. The full night clock (timezones, DST, "opens in 2 h") belongs to the
   night-clock module, not here. */

import { gap, pending } from './facts';
import { HOURS_DAYS } from './copy';
import type { BusinessNightRule, Closure, DayKey, Hours, OpeningNight } from './types';
import { DAY_KEYS } from './types';

const OPENING_HOURS = 'src/lib/opening-hours.mjs';
const SITE = 'src/data/site.ts';

const SUMMER_FRIDAYS_2026: Closure = {
  id: 'summer-fridays-2026',
  days: ['friday'],
  from: pending('2026-07-17', 'docs/superpowers/specs/2026-07-16-non-event-audit-remediation-design.md:90', {
    quote: '17 July',
    note: 'First Friday of the window in the structured-data plan (validFrom 2026-07-17).',
  }),
  through: pending(
    '2026-08-28',
    ['docs/superpowers/plans/2026-07-16-non-event-audit-remediation.md:16', `${OPENING_HOURS}:3`],
    { quote: '28 August 2026', note: 'Inclusive. The Friday of 28 August 2026 was the last closed Friday.' },
  ),
  state: 'ended',
  reason: pending('summer break', `${OPENING_HOURS}:3`, { quote: 'summer break' }),
};

const night = (day: 'friday' | 'saturday', opensLine: number, closesLine: number): OpeningNight => ({
  day,
  opens: pending('22:00', [`${OPENING_HOURS}:${opensLine}`, `${SITE}:90`]),
  closes: pending('04:00', [`${OPENING_HOURS}:${closesLine}`, `${SITE}:90`]),
});

export const HOURS: Hours = {
  timezone: pending('Europe/Warsaw', 'src/i18n/config.ts:12'),
  nights: [night('friday', 11, 12), night('saturday', 17, 18)],
  displayRange: pending('22:00 - 04:00', `${SITE}:90`),
  daysLabel: HOURS_DAYS,
  businessNightRule: pending<BusinessNightRule>(
    {
      ownedBy: 'opening-day',
      examples: [
        { visit: 'Saturday 02:00', belongsToNightOf: 'friday' },
        { visit: 'Sunday 03:30', belongsToNightOf: 'saturday' },
      ],
    },
    [`${OPENING_HOURS}:11-12`, `${SITE}:65-69`],
    {
      quote: ['22:00', '04:00'],
      note:
        'The rule is stated in the Phase 3a brief. The code implies it: a night that opens at 22:00 and closes at 04:00 ends on the next calendar day, and an event night runs about 6 hours past its start.',
    },
  ),
  eventNightHours: pending(6, `${SITE}:65-69`, { quote: '6 * 60 * 60 * 1000' }),
  closures: [SUMMER_FRIDAYS_2026],
  theCork: gap('THE_CORK_HOURS'),
};

// ---------------------------------------------------------------------------
// nightOf(): which night does a wall-clock moment belong to?
// ---------------------------------------------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayKeyOf(date: string): DayKey {
  // getUTCDay(): 0 = Sunday. DAY_KEYS starts on Monday.
  return DAY_KEYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7] as DayKey;
}

function isClosed(night: string, day: DayKey, closures: readonly Closure[]): boolean {
  return closures.some((c) => c.days.includes(day) && night >= c.from.value && night <= c.through.value);
}

export interface NightRef {
  /** Calendar date the night opened on, `YYYY-MM-DD`. */
  readonly night: string;
  readonly day: DayKey;
}

/**
 * The night a local moment belongs to, or `null` when the club is closed then.
 * `date` is `YYYY-MM-DD`, `time` is `HH:MM`, both Europe/Warsaw wall clock.
 * The closing minute is outside the night (04:00 is closed). A night that falls
 * inside a closure counts as closed.
 */
export function nightOf(date: string, time: string, hours: Hours = HOURS): NightRef | null {
  if (!DATE.test(date) || !TIME.test(time)) throw new RangeError(`nightOf: expected YYYY-MM-DD and HH:MM, got "${date}" "${time}"`);
  const t = minutes(time);
  for (const [openedOn, sameDay] of [[date, true], [addDays(date, -1), false]] as const) {
    const day = dayKeyOf(openedOn);
    const schedule = hours.nights.find((n) => n.day === day);
    if (!schedule) continue;
    const opens = minutes(schedule.opens.value);
    const closes = minutes(schedule.closes.value);
    const spansMidnight = closes <= opens;
    const inside = sameDay ? t >= opens && (spansMidnight || t < closes) : spansMidnight && t < closes;
    if (!inside) continue;
    return isClosed(openedOn, day, hours.closures) ? null : { night: openedOn, day };
  }
  return null;
}
