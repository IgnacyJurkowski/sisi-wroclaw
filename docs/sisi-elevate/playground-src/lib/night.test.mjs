/* Tests for night.mjs. Run: node --test night.test.mjs
 * Every instant below is written with an explicit offset or Z, and every
 * expected value is a literal or comes from an independent calculation in this
 * file, so the suite gives the same result under any device TZ (see run-tz.sh).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_SCHEDULE,
  DEFAULT_CONFIG,
  LOCALES,
  MESSAGES,
  PLACEHOLDERS,
  arrivalWindow,
  businessNight,
  formatDuration,
  formatIn,
  formatUnit,
  localToInstant,
  nightProgress,
  nightWindow,
  phaseOfNight,
  resolveLocal,
  resolveLocale,
  t,
  tableRelease,
  toMs,
  toWarsawIso,
  tonightSummary,
  validateConfig,
  warsawParts,
} from './night.mjs';

const T = (iso) => Date.parse(iso);
const NB = ' ';
const MIN = 60_000;
const HOUR = 3_600_000;
const S = DEFAULT_SCHEDULE;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-12, `${msg ?? ''} expected ${b}, got ${a}`);

function addDayKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
describe('environment', () => {
  test('the device timezone is whatever the harness set, and the library ignores it', (ctx) => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    ctx.diagnostic(`device timezone in this run: ${device} (TZ=${process.env.TZ ?? 'unset'})`);
    if (process.env.TZ) assert.equal(device, process.env.TZ);
    // A string without an offset would be read in the device timezone: refused.
    assert.throws(() => toMs('2026-10-02T22:00:00'), TypeError);
    // Same instant, three spellings, one answer.
    const a = warsawParts(new Date('2026-10-02T20:00:00Z'));
    const b = warsawParts(T('2026-10-02T22:00:00+02:00'));
    const c = warsawParts('2026-10-02T22:00:00+02:00');
    assert.deepEqual(a, b);
    assert.deepEqual(b, c);
    assert.equal(a.hour, 22);
  });

  test('input validation', () => {
    assert.throws(() => toMs(Number.NaN), TypeError);
    assert.throws(() => toMs('not a date'), TypeError);
    assert.throws(() => toMs(null), TypeError);
    assert.throws(() => toMs(undefined), TypeError);
    assert.equal(toMs('2026-10-02T20:00:00Z'), T('2026-10-02T22:00:00+0200'));
  });
});

/* ------------------------------------------------------------------ */
describe('warsawParts', () => {
  test('winter and summer', () => {
    const w = warsawParts('2026-01-15T11:00:00Z');
    assert.deepEqual(
      [w.year, w.month, w.day, w.weekday, w.hour, w.minute, w.second, w.offsetMinutes, w.zone],
      [2026, 1, 15, 4, 12, 0, 0, 60, 'CET'],
    );
    const s = warsawParts('2026-07-01T10:00:00Z');
    assert.deepEqual([s.hour, s.offsetMinutes, s.zone, s.weekday], [12, 120, 'CEST', 3]);
  });

  test('midnight is hour 0, never 24', () => {
    const p = warsawParts('2026-10-02T22:00:00Z'); // 00:00 CEST Saturday
    assert.deepEqual([p.dateKey, p.hour, p.minute, p.weekday], ['2026-10-03', 0, 0, 6]);
  });

  test('sub-second precision is dropped, not rounded', () => {
    assert.equal(warsawParts(T('2026-10-02T20:00:00Z') + 999).second, 0);
    assert.equal(warsawParts(T('2026-10-02T20:00:00Z') - 1).second, 59);
  });

  test('offset flips exactly at the EU transition for 2026-2035 (independent last-Sunday rule)', () => {
    const lastSunday0100Utc = (year, monthIndex) => {
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
      return Date.UTC(year, monthIndex, lastDay.getUTCDate() - lastDay.getUTCDay(), 1, 0, 0);
    };
    for (let y = 2026; y <= 2035; y += 1) {
      const spring = lastSunday0100Utc(y, 2);
      const autumn = lastSunday0100Utc(y, 9);
      assert.equal(warsawParts(spring - 1000).offsetMinutes, 60, `${y} before spring`);
      assert.equal(warsawParts(spring).offsetMinutes, 120, `${y} at spring`);
      assert.equal(warsawParts(autumn - 1000).offsetMinutes, 120, `${y} before autumn`);
      assert.equal(warsawParts(autumn).offsetMinutes, 60, `${y} at autumn`);
    }
  });

  test('the two DST nights of the brief fall on the dates the brief names', () => {
    assert.equal(warsawParts('2026-10-25T00:59:59Z').offsetMinutes, 120);
    assert.equal(warsawParts('2026-10-25T01:00:00Z').offsetMinutes, 60);
    assert.equal(warsawParts('2026-10-25T01:00:00Z').weekday, 0); // Sunday
    assert.equal(warsawParts('2027-03-28T00:59:59Z').offsetMinutes, 60);
    assert.equal(warsawParts('2027-03-28T01:00:00Z').offsetMinutes, 120);
    assert.equal(warsawParts('2027-03-28T01:00:00Z').weekday, 0);
  });

  test('toWarsawIso', () => {
    assert.equal(toWarsawIso('2026-10-24T20:00:00Z'), '2026-10-24T22:00:00+02:00');
    assert.equal(toWarsawIso('2026-10-25T01:00:00Z'), '2026-10-25T02:00:00+01:00');
  });
});

/* ------------------------------------------------------------------ */
describe('local wall clock to instant (documented DST rule)', () => {
  test('unique local time', () => {
    assert.deepEqual(resolveLocal('2026-10-02', '22:00'), { ms: T('2026-10-02T20:00:00Z'), kind: 'exact' });
    assert.deepEqual(resolveLocal('2026-12-18', '22:00'), { ms: T('2026-12-18T21:00:00Z'), kind: 'exact' });
  });

  test('ambiguous (clocks back 2026-10-25 03:00 -> 02:00): the earlier pass, CEST', () => {
    const r = resolveLocal('2026-10-25', '02:30');
    assert.equal(r.kind, 'ambiguous');
    assert.equal(r.ms, T('2026-10-25T00:30:00Z')); // 02:30 CEST
    assert.equal(toWarsawIso(r.ms), '2026-10-25T02:30:00+02:00');
    assert.equal(resolveLocal('2026-10-25', '02:00').ms, T('2026-10-25T00:00:00Z'));
    assert.equal(resolveLocal('2026-10-25', '02:59:59').kind, 'ambiguous');
    assert.equal(resolveLocal('2026-10-25', '01:59:59').kind, 'exact');
    assert.equal(resolveLocal('2026-10-25', '03:00').kind, 'exact');
    assert.equal(resolveLocal('2026-10-25', '03:00').ms, T('2026-10-25T02:00:00Z'));
  });

  test('non-existent (clocks forward 2027-03-28 02:00 -> 03:00): shifted forward by the gap', () => {
    const r = resolveLocal('2027-03-28', '02:30');
    assert.equal(r.kind, 'gap');
    assert.equal(r.ms, T('2027-03-28T01:30:00Z')); // 03:30 CEST
    assert.equal(toWarsawIso(r.ms), '2027-03-28T03:30:00+02:00');
    assert.equal(resolveLocal('2027-03-28', '02:00').ms, T('2027-03-28T01:00:00Z'));
    assert.equal(resolveLocal('2027-03-28', '01:59:59').kind, 'exact');
    assert.equal(resolveLocal('2027-03-28', '03:00').kind, 'exact');
    assert.equal(resolveLocal('2027-03-28', '03:00').ms, T('2027-03-28T01:00:00Z'));
  });

  test('bad input', () => {
    assert.throws(() => localToInstant('2027-02-29', '22:00'), RangeError);
    assert.throws(() => localToInstant('2026-13-01', '22:00'), RangeError);
    assert.throws(() => localToInstant('2026-10-02', '24:00'), RangeError);
    assert.throws(() => localToInstant('2026-10-02', '9:00'), RangeError);
  });
});

/* ------------------------------------------------------------------ */
describe('every weekday at ten probe times (winter and summer weeks)', () => {
  const PROBES = ['12:00', '21:59', '22:00', '23:59', '00:00', '01:59', '02:00', '03:59', '04:00', '04:01'];
  const WEEKS = [
    { label: 'summer week (CEST)', monday: '2026-09-28', offset: '+02:00' },
    { label: 'winter week (CET)', monday: '2026-12-14', offset: '+01:00' },
  ];
  // Independent truth: Friday and Saturday nights run 22:00 -> 04:00 next day.
  for (const week of WEEKS) {
    for (let i = 0; i < 7; i += 1) {
      const date = addDayKey(week.monday, i);
      const weekday = (1 + i) % 7; // Monday = 1 ... Sunday = 0
      for (const time of PROBES) {
        test(`${week.label} ${date} (weekday ${weekday}) ${time}`, () => {
          const [h, m] = time.split(':').map(Number);
          const instant = T(`${date}T${time}:00${week.offset}`);
          const b = businessNight(instant, S);

          const evening = h >= 22;
          const small = h < 4;
          const nightStart = small ? addDayKey(date, -1) : date;
          const nightWeekday = small ? (weekday + 6) % 7 : weekday;
          const expectedOpen = (evening || small) && (nightWeekday === 5 || nightWeekday === 6);

          assert.equal(b.open, expectedOpen, 'open');
          assert.equal(b.night.date, nightStart, 'night start date');
          assert.equal(b.night.weekday, nightWeekday, 'night weekday');
          assert.equal(b.local.hour, h);
          assert.equal(b.local.minute, m);
          if (expectedOpen) {
            const end = T(`${addDayKey(nightStart, 1)}T04:00:00${week.offset}`);
            assert.equal(b.msUntilClose, end - instant, 'ms until close');
            assert.equal(b.minutesUntilClose, (end - instant) / MIN);
            assert.equal(b.msUntilOpen, null);
            assert.ok(b.progress >= 0 && b.progress < 1);
          } else {
            assert.equal(b.msUntilClose, null);
            assert.equal(b.progress, null);
            assert.ok(b.msUntilOpen > 0, 'a closed venue has a next opening');
            assert.equal(b.next.time, '22:00');
            assert.ok(b.next.weekday === 5 || b.next.weekday === 6);
          }
        });
      }
    }
  }

  test('12:00 on each weekday: next opening, weekday and days away', () => {
    const expected = [
      // date,        weekday, next night date, next weekday, daysAway
      ['2026-09-28', 'monday', '2026-10-02', 'friday', 4],
      ['2026-09-29', 'tuesday', '2026-10-02', 'friday', 3],
      ['2026-09-30', 'wednesday', '2026-10-02', 'friday', 2],
      ['2026-10-01', 'thursday', '2026-10-02', 'friday', 1],
      ['2026-10-02', 'friday', '2026-10-02', 'friday', 0],
      ['2026-10-03', 'saturday', '2026-10-03', 'saturday', 0],
      ['2026-10-04', 'sunday', '2026-10-09', 'friday', 5],
    ];
    for (const [date, wd, nextDate, nextWd, days] of expected) {
      const instant = T(`${date}T12:00:00+02:00`);
      const b = businessNight(instant, S);
      assert.equal(b.local.weekdayKey, wd);
      assert.equal(b.open, false);
      assert.equal(b.next.date, nextDate, date);
      assert.equal(b.next.weekdayKey, nextWd, date);
      assert.equal(b.next.daysAway, days, date);
      assert.equal(b.next.startMs, T(`${nextDate}T22:00:00+02:00`));
      assert.equal(b.msUntilOpen, T(`${nextDate}T22:00:00+02:00`) - instant);
      assert.equal(b.minutesUntilOpen, (T(`${nextDate}T22:00:00+02:00`) - instant) / MIN);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('Friday -> Saturday and Saturday -> Sunday boundaries', () => {
  test('Friday night 2026-10-02 runs into Saturday morning', () => {
    const before = businessNight(T('2026-10-02T21:59:59+02:00'), S);
    assert.equal(before.open, false);
    const start = businessNight(T('2026-10-02T22:00:00+02:00'), S);
    assert.equal([start.open, start.night.date, start.night.weekdayKey, start.progress].join(), 'true,2026-10-02,friday,0');
    const midnight = businessNight(T('2026-10-03T00:00:00+02:00'), S);
    assert.equal([midnight.open, midnight.night.date, midnight.local.weekdayKey].join(), 'true,2026-10-02,saturday');
    const twoAm = businessNight(T('2026-10-03T02:00:00+02:00'), S);
    assert.equal(twoAm.night.weekdayKey, 'friday', '02:00 Saturday belongs to Friday');
    assert.equal(twoAm.night.date, '2026-10-02');
    const last = businessNight(T('2026-10-03T03:59:59+02:00'), S);
    assert.equal([last.open, last.night.date].join(), 'true,2026-10-02');
    assert.equal(last.msUntilClose, 1000);
    const closed = businessNight(T('2026-10-03T04:00:00+02:00'), S);
    assert.equal(closed.open, false, 'half-open window: closed at 04:00:00');
    assert.equal([closed.night.date, closed.night.weekdayKey].join(), '2026-10-03,saturday', 'from 04:00 the date is Saturday');
    assert.equal(closed.next.date, '2026-10-03');
    assert.equal(closed.next.daysAway, 0);
  });

  test('Saturday night 2026-10-03 runs into Sunday morning', () => {
    const twoAm = businessNight(T('2026-10-04T02:00:00+02:00'), S);
    assert.equal(twoAm.night.weekdayKey, 'saturday', '02:00 Sunday belongs to Saturday');
    assert.equal(twoAm.night.date, '2026-10-03');
    assert.equal(twoAm.open, true);
    const last = businessNight(T('2026-10-04T03:59:59+02:00'), S);
    assert.equal([last.open, last.night.date].join(), 'true,2026-10-03');
    const closed = businessNight(T('2026-10-04T04:00:00+02:00'), S);
    assert.equal(closed.open, false);
    assert.equal(closed.night.weekdayKey, 'sunday');
    assert.equal(closed.night.scheduled, false);
    assert.equal(closed.next.date, '2026-10-09');
    assert.equal(closed.next.daysAway, 5);
  });

  test('Thursday night is not a night: 02:00 Friday is closed and belongs to Thursday', () => {
    const b = businessNight(T('2026-10-02T02:00:00+02:00'), S);
    assert.equal(b.open, false);
    assert.equal(b.night.date, '2026-10-01');
    assert.equal(b.night.weekdayKey, 'thursday');
  });
});

/* ------------------------------------------------------------------ */
describe('DST nights, hour by hour, progress in REAL elapsed time', () => {
  const AUTUMN = { start: T('2026-10-24T20:00:00Z'), end: T('2026-10-25T03:00:00Z'), totalMin: 420 };
  const SPRING = { start: T('2027-03-27T21:00:00Z'), end: T('2027-03-28T02:00:00Z'), totalMin: 300 };

  test('window instants and total real duration', () => {
    const a = nightWindow('2026-10-24', S);
    assert.equal(a.window.startMs, AUTUMN.start);
    assert.equal(a.window.endMs, AUTUMN.end);
    assert.equal(a.window.durationMs, 7 * HOUR, 'autumn night is 7 real hours');
    assert.notEqual(a.window.durationMs, 6 * HOUR);
    assert.equal(a.window.start, '2026-10-24T22:00:00+02:00');
    assert.equal(a.window.end, '2026-10-25T04:00:00+01:00');

    const s = nightWindow('2027-03-27', S);
    assert.equal(s.window.startMs, SPRING.start);
    assert.equal(s.window.endMs, SPRING.end);
    assert.equal(s.window.durationMs, 5 * HOUR, 'spring night is 5 real hours');
    assert.equal(s.window.start, '2027-03-27T22:00:00+01:00');
    assert.equal(s.window.end, '2027-03-28T04:00:00+02:00');
  });

  test('neighbouring nights stay 6 real hours', () => {
    for (const date of ['2026-10-23', '2026-10-30', '2027-03-26', '2027-04-02', '2026-07-10', '2026-12-18']) {
      assert.equal(nightWindow(date, S).window.durationMs, 6 * HOUR, date);
    }
  });

  test('autumn night 24 -> 25 October 2026, every hour', () => {
    const rows = [
      // utc,                   expected local time,        elapsed minutes
      ['2026-10-24T19:59:59Z', '2026-10-24T21:59:59+02:00', null],
      ['2026-10-24T20:00:00Z', '2026-10-24T22:00:00+02:00', 0],
      ['2026-10-24T21:00:00Z', '2026-10-24T23:00:00+02:00', 60],
      ['2026-10-24T22:00:00Z', '2026-10-25T00:00:00+02:00', 120],
      ['2026-10-24T23:00:00Z', '2026-10-25T01:00:00+02:00', 180],
      ['2026-10-24T23:59:00Z', '2026-10-25T01:59:00+02:00', 239], // 01:59 CEST
      ['2026-10-25T00:00:00Z', '2026-10-25T02:00:00+02:00', 240], // first 02:00 (CEST)
      ['2026-10-25T00:59:59Z', '2026-10-25T02:59:59+02:00', 299 + 59 / 60],
      ['2026-10-25T01:00:00Z', '2026-10-25T02:00:00+01:00', 300], // second 02:00 (CET)
      ['2026-10-25T01:59:00Z', '2026-10-25T02:59:00+01:00', 359],
      ['2026-10-25T02:00:00Z', '2026-10-25T03:00:00+01:00', 360], // 03:00 CET
      ['2026-10-25T02:59:00Z', '2026-10-25T03:59:00+01:00', 419],
      ['2026-10-25T03:00:00Z', '2026-10-25T04:00:00+01:00', null], // 04:00 CET: closed
    ];
    for (const [utc, local, elapsed] of rows) {
      const b = businessNight(utc, S);
      assert.equal(toWarsawIso(utc), local, utc);
      if (elapsed === null) {
        assert.equal(b.open, false, `${local} closed`);
        assert.equal(b.progress, null);
      } else {
        assert.equal(b.open, true, `${local} open`);
        assert.equal(b.night.date, '2026-10-24');
        near(b.progress, elapsed / AUTUMN.totalMin, local);
        near(b.minutesUntilClose, AUTUMN.totalMin - elapsed, local);
        assert.equal(b.msUntilClose, AUTUMN.end - T(utc));
      }
    }
    // The brief's named checkpoints as plain fractions.
    near(businessNight('2026-10-24T20:00:00Z', S).progress, 0, '22:00');
    near(businessNight('2026-10-24T23:59:00Z', S).progress, 239 / 420, '01:59 CEST');
    near(businessNight('2026-10-25T01:00:00Z', S).progress, 5 / 7, '02:00 CET second occurrence');
    near(businessNight('2026-10-25T02:00:00Z', S).progress, 6 / 7, '03:00');
    near(nightProgress('2026-10-25T03:00:00Z', nightWindow('2026-10-24', S).window), 1, '04:00');
    // A naive wall-clock difference would say 03:00 is 5/6 of the way; it is 6/7.
    assert.ok(Math.abs(businessNight('2026-10-25T02:00:00Z', S).progress - 5 / 6) > 0.01);
  });

  test('spring night 27 -> 28 March 2027, every hour (02:xx does not exist)', () => {
    const rows = [
      ['2027-03-27T20:59:59Z', '2027-03-27T21:59:59+01:00', null],
      ['2027-03-27T21:00:00Z', '2027-03-27T22:00:00+01:00', 0],
      ['2027-03-27T22:00:00Z', '2027-03-27T23:00:00+01:00', 60],
      ['2027-03-27T23:00:00Z', '2027-03-28T00:00:00+01:00', 120],
      ['2027-03-28T00:00:00Z', '2027-03-28T01:00:00+01:00', 180],
      ['2027-03-28T00:59:00Z', '2027-03-28T01:59:00+01:00', 239], // 01:59 CET
      ['2027-03-28T00:59:59Z', '2027-03-28T01:59:59+01:00', 239 + 59 / 60],
      ['2027-03-28T01:00:00Z', '2027-03-28T03:00:00+02:00', 240], // clocks jump 01:59:59 -> 03:00:00
      ['2027-03-28T01:59:00Z', '2027-03-28T03:59:00+02:00', 299],
      ['2027-03-28T02:00:00Z', '2027-03-28T04:00:00+02:00', null],
    ];
    for (const [utc, local, elapsed] of rows) {
      const b = businessNight(utc, S);
      assert.equal(toWarsawIso(utc), local, utc);
      if (elapsed === null) {
        assert.equal(b.open, false, `${local} closed`);
      } else {
        assert.equal(b.open, true, `${local} open`);
        assert.equal(b.night.date, '2027-03-27');
        near(b.progress, elapsed / SPRING.totalMin, local);
        near(b.minutesUntilClose, SPRING.totalMin - elapsed, local);
      }
    }
    near(businessNight('2027-03-27T21:00:00Z', S).progress, 0, '22:00');
    near(businessNight('2027-03-28T00:59:00Z', S).progress, 239 / 300, '01:59 CET');
    near(businessNight('2027-03-28T01:00:00Z', S).progress, 0.8, '03:00 CEST');
    near(nightProgress('2027-03-28T02:00:00Z', nightWindow('2027-03-27', S).window), 1, '04:00');
    assert.equal(businessNight('2027-03-28T01:30:00Z', S).night.date, '2027-03-27', '03:30 CEST still belongs to the Saturday night');
  });

  test('countdown to the next opening across a DST change is real elapsed time', () => {
    // Saturday 23:00 CEST 24 Oct (open) -> next Friday 30 Oct 22:00 CET: exactly 6 real days.
    const b1 = businessNight('2026-10-24T21:00:00Z', S);
    assert.equal(b1.next.date, '2026-10-30');
    assert.equal(b1.next.msUntil, T('2026-10-30T22:00:00+01:00') - T('2026-10-24T23:00:00+02:00'));
    assert.equal(b1.next.msUntil, 6 * 24 * HOUR);
    // Saturday 22:30 CET 27 Mar 2027 (open) -> Friday 2 Apr 22:00 CEST: one hour short of 6 days minus 30 minutes.
    const b2 = businessNight('2027-03-27T21:30:00Z', S);
    assert.equal(b2.next.msUntil, T('2027-04-02T22:00:00+02:00') - T('2027-03-27T22:30:00+01:00'));
    // 27 Mar 21:30Z -> 2 Apr 20:00Z = 5 days 22 h 30 min.
    assert.equal(b2.next.msUntil, 142.5 * HOUR);
  });
});

/* ------------------------------------------------------------------ */
describe('minute-by-minute sweeps against an independent oracle', () => {
  // Oracle: explicit UTC windows written by hand for each sweep. Nothing here
  // uses the library's own window logic.
  function sweep(label, fromIso, toIso, stepMin, windows) {
    test(label, () => {
      let checked = 0;
      for (let ms = T(fromIso); ms < T(toIso); ms += stepMin * MIN) {
        const win = windows.find((w) => ms >= T(w.s) && ms < T(w.e));
        const b = businessNight(ms, S);
        assert.equal(b.open, Boolean(win), `open at ${new Date(ms).toISOString()}`);
        if (win) {
          assert.equal(b.night.date, win.date, `night date at ${new Date(ms).toISOString()}`);
          near(b.progress, (ms - T(win.s)) / (T(win.e) - T(win.s)), `progress at ${new Date(ms).toISOString()}`);
        } else {
          assert.equal(b.progress, null);
        }
        checked += 1;
      }
      assert.ok(checked > 1000);
    });
  }

  sweep('summer week, 5 min steps (CEST)', '2026-07-05T22:00:00Z', '2026-07-13T00:00:00Z', 5, [
    { date: '2026-07-10', s: '2026-07-10T20:00:00Z', e: '2026-07-11T02:00:00Z' },
    { date: '2026-07-11', s: '2026-07-11T20:00:00Z', e: '2026-07-12T02:00:00Z' },
  ]);
  sweep('winter week, 5 min steps (CET)', '2026-12-13T23:00:00Z', '2026-12-21T00:00:00Z', 5, [
    { date: '2026-12-18', s: '2026-12-18T21:00:00Z', e: '2026-12-19T03:00:00Z' },
    { date: '2026-12-19', s: '2026-12-19T21:00:00Z', e: '2026-12-20T03:00:00Z' },
  ]);
  sweep('autumn DST weekend, every minute', '2026-10-23T00:00:00Z', '2026-10-27T00:00:00Z', 1, [
    { date: '2026-10-23', s: '2026-10-23T20:00:00Z', e: '2026-10-24T02:00:00Z' },
    { date: '2026-10-24', s: '2026-10-24T20:00:00Z', e: '2026-10-25T03:00:00Z' },
  ]);
  sweep('spring DST weekend, every minute', '2027-03-26T00:00:00Z', '2027-03-30T00:00:00Z', 1, [
    { date: '2027-03-26', s: '2027-03-26T21:00:00Z', e: '2027-03-27T03:00:00Z' },
    { date: '2027-03-27', s: '2027-03-27T21:00:00Z', e: '2027-03-28T02:00:00Z' },
  ]);
});

/* ------------------------------------------------------------------ */
describe('the schedule is data, not hard-coded 22:00-04:00', () => {
  // Thursday 18:00-23:00 (does not cross midnight), Saturday 23:00-05:00.
  const custom = {
    nights: [
      { weekday: 4, opens: '18:00', closes: '23:00' },
      { weekday: 6, opens: '23:00', closes: '05:00' },
    ],
    closures: [],
  };
  test('a night that does not cross midnight is half open at its end', () => {
    assert.equal(businessNight('2026-10-01T18:00:00+02:00', custom).open, true);
    assert.equal(businessNight('2026-10-01T22:59:59+02:00', custom).open, true);
    assert.equal(businessNight('2026-10-01T23:00:00+02:00', custom).open, false);
    assert.equal(businessNight('2026-10-01T17:59:59+02:00', custom).open, false);
    assert.equal(nightWindow('2026-10-01', custom).window.durationMs, 5 * HOUR);
    // One global cutoff (05:00, from Saturday's night). 02:00 Thursday is before it, so it belongs to
    // the previous calendar date: 2026-10-01 minus one day is 2026-09-30, a Wednesday with no night.
    const early = businessNight('2026-10-01T02:00:00+02:00', custom);
    assert.equal(early.night.date, '2026-09-30');
    assert.equal(early.night.weekdayKey, 'wednesday');
    assert.equal(early.open, false);
  });
  test('the cutoff follows the latest closing time of a midnight-crossing night', () => {
    assert.equal(businessNight('2026-10-04T04:59:59+02:00', custom).night.date, '2026-10-03');
    assert.equal(businessNight('2026-10-04T04:59:59+02:00', custom).open, true);
    const closed = businessNight('2026-10-04T05:00:00+02:00', custom);
    assert.equal(closed.open, false);
    assert.equal(closed.night.date, '2026-10-04');
    assert.equal(nightWindow('2026-10-03', custom).window.durationMs, 6 * HOUR);
  });
  test('bad schedules are refused', () => {
    assert.throws(() => businessNight('2026-10-01T12:00:00+02:00', { nights: [{ weekday: 7, opens: '22:00', closes: '04:00' }] }), RangeError);
    assert.throws(() => businessNight('2026-10-01T12:00:00+02:00', { nights: [{ weekday: 5, opens: '22:00', closes: '22:00' }] }), RangeError);
    assert.throws(
      () => businessNight('2026-10-01T12:00:00+02:00', { nights: [{ weekday: 5, opens: '22:00', closes: '04:00' }, { weekday: 5, opens: '20:00', closes: '01:00' }] }),
      RangeError,
    );
  });
});

/* ------------------------------------------------------------------ */
describe('year, month and leap boundaries', () => {
  test('2026-12-31 (Thursday) -> 2027-01-01 (Friday)', () => {
    const thu = businessNight('2026-12-31T12:00:00+01:00', S);
    assert.equal(thu.local.weekdayKey, 'thursday');
    assert.equal(thu.next.date, '2027-01-01');
    assert.equal(thu.next.daysAway, 1);
    assert.equal(thu.next.weekdayKey, 'friday');
    // 00:00 on 1 January is still Thursday's (unscheduled) business date: closed, and the date is the old year's.
    const nye = businessNight('2027-01-01T00:00:00+01:00', S);
    assert.equal(nye.open, false);
    assert.equal(nye.night.date, '2026-12-31');
    const fri = businessNight('2027-01-01T22:00:00+01:00', S);
    assert.equal([fri.open, fri.night.date].join(), 'true,2027-01-01');
    const sat = businessNight('2027-01-02T02:00:00+01:00', S);
    assert.equal([sat.open, sat.night.date, sat.night.weekdayKey].join(), 'true,2027-01-01,friday');
  });

  test('a night that straddles New Year: Friday 2027-12-31 -> Saturday 2028-01-01', () => {
    const b = businessNight('2028-01-01T02:00:00+01:00', S);
    assert.equal([b.open, b.night.date, b.night.weekdayKey].join(), 'true,2027-12-31,friday');
    assert.equal(b.local.year, 2028);
    near(b.progress, 4 / 6, 'progress at 02:00');
    const nextNight = businessNight('2028-01-01T04:00:00+01:00', S);
    assert.equal(nextNight.open, false);
    assert.equal(nextNight.next.date, '2028-01-01');
    assert.equal(nextNight.next.weekdayKey, 'saturday');
    assert.equal(nightWindow('2027-12-31', S).window.durationMs, 6 * HOUR);
  });

  test('leap day 2028-02-29 is a Tuesday: next Friday is 3 days away, no invalid date appears', () => {
    const b = businessNight('2028-02-29T12:00:00+01:00', S);
    assert.equal(b.local.weekdayKey, 'tuesday');
    assert.equal(b.next.date, '2028-03-03');
    assert.equal(b.next.daysAway, 3);
    const mon = businessNight('2028-02-28T12:00:00+01:00', S);
    assert.equal(mon.next.date, '2028-03-03');
    assert.equal(mon.next.daysAway, 4);
  });

  test('a Saturday night that ends on a leap Sunday: 2032-02-28 -> 2032-02-29', () => {
    const b = businessNight('2032-02-29T02:00:00+01:00', S);
    assert.equal([b.open, b.night.date, b.night.weekdayKey].join(), 'true,2032-02-28,saturday');
    assert.equal(b.local.weekdayKey, 'sunday');
  });

  test('a night that STARTS on a leap Friday: 2036-02-29 -> 2036-03-01', () => {
    const b = businessNight('2036-03-01T02:00:00+01:00', S);
    assert.equal([b.open, b.night.date, b.night.weekdayKey].join(), 'true,2036-02-29,friday');
    assert.equal(nightWindow('2036-02-29', S).window.end, '2036-03-01T04:00:00+01:00');
  });

  test('non-leap February: Sunday 2027-02-28 02:00 belongs to Saturday 2027-02-27; 2027-02-29 does not exist', () => {
    const b = businessNight('2027-02-28T02:00:00+01:00', S);
    assert.equal([b.open, b.night.date].join(), 'true,2027-02-27');
    assert.throws(() => nightWindow('2027-02-29', S), RangeError);
    const mon = businessNight('2027-03-01T02:00:00+01:00', S);
    assert.equal(mon.open, false);
    assert.equal(mon.night.date, '2027-02-28');
  });

  test('a lookahead across the year end finds the right Friday', () => {
    const b = businessNight('2026-12-27T12:00:00+01:00', S); // Sunday
    assert.equal(b.next.date, '2027-01-01');
    assert.equal(b.next.daysAway, 5);
  });
});

/* ------------------------------------------------------------------ */
describe('closures', () => {
  const single = { ...S, closures: [{ from: '2026-11-06', to: '2026-11-06', reason: 'test closure' }] };

  test('a closed Friday: not open, night still identified, reason exposed', () => {
    const b = businessNight('2026-11-06T23:00:00+01:00', single);
    assert.equal(b.open, false);
    assert.equal(b.inWindow, true);
    assert.equal(b.night.takesPlace, false);
    assert.equal(b.night.scheduled, true);
    assert.equal(b.night.closure.reason, 'test closure');
    assert.equal(b.progress, null);
    assert.equal(b.next.date, '2026-11-07');
  });

  test('the closure follows the night START date: Saturday 02:00 is still inside Friday\'s closed night', () => {
    const b = businessNight('2026-11-07T02:00:00+01:00', single);
    assert.equal(b.open, false);
    assert.equal(b.night.date, '2026-11-06');
    assert.equal(businessNight('2026-11-07T22:00:00+01:00', single).open, true);
  });

  test('a closure on Saturday only does not close Friday night, including Saturday 02:00', () => {
    const sat = { ...S, closures: [{ from: '2026-11-07', to: '2026-11-07', reason: 'x' }] };
    assert.equal(businessNight('2026-11-07T02:00:00+01:00', sat).open, true);
    assert.equal(businessNight('2026-11-08T02:00:00+01:00', sat).open, false);
  });

  test('a multi-week closure moves the next opening past it', () => {
    const long = { ...S, closures: [{ from: '2026-11-06', to: '2026-11-21', reason: 'refit' }] };
    const b = businessNight('2026-11-04T12:00:00+01:00', long);
    assert.equal(b.next.date, '2026-11-27');
    assert.equal(b.next.daysAway, 23);
    assert.equal(businessNight('2026-11-22T02:00:00+01:00', long).open, false); // Saturday 21st night is closed
    assert.equal(businessNight('2026-11-27T23:00:00+01:00', long).open, true);
  });

  test('weekdays limits a closure to the Friday nights of a range', () => {
    const fridays = { ...S, closures: [{ from: '2026-11-06', to: '2026-11-21', reason: 'Fridays off', weekdays: [5] }] };
    assert.equal(businessNight('2026-11-06T23:00:00+01:00', fridays).open, false);
    assert.equal(businessNight('2026-11-07T23:00:00+01:00', fridays).open, true);
    assert.equal(businessNight('2026-11-13T23:00:00+01:00', fridays).open, false);
    assert.equal(businessNight('2026-11-14T23:00:00+01:00', fridays).open, true);
    assert.equal(businessNight('2026-11-20T23:00:00+01:00', fridays).open, false);
    assert.equal(businessNight('2026-11-27T23:00:00+01:00', fridays).open, true);
    assert.equal(businessNight('2026-11-05T12:00:00+01:00', fridays).next.date, '2026-11-07');
  });

  test('summary: closed Friday afternoon says closed tonight and points at Saturday', () => {
    const s = tonightSummary('2026-11-06T12:00:00+01:00', single, DEFAULT_CONFIG, 'en');
    assert.equal(s.state, 'opens-in-days');
    assert.equal(s.headlineKey, 'tonight.closedTonight');
    assert.equal(s.headline, 'Closed tonight');
    assert.equal(s.closure.reason, 'test closure');
    assert.equal(s.nextOpen.date, '2026-11-07');
    assert.equal(s.nextOpen.daysAway, 1);
    assert.equal(s.dataProvenance.closures, 'configured');
  });

  test('summary: Thursday before the closed Friday', () => {
    const s = tonightSummary('2026-11-05T12:00:00+01:00', single, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'opens-in-days');
    assert.equal(s.headline, `Otwieramy w${NB}sobotę o${NB}22:00`);
    assert.equal(s.nextOpen.weekdayKey, 'saturday');
    assert.equal(s.nextOpen.daysAway, 2);
  });

  test('summary: no closures configured is reported as such, not as "no closures exist"', () => {
    assert.equal(tonightSummary('2026-10-02T12:00:00+02:00', S, DEFAULT_CONFIG, 'pl').dataProvenance.closures, 'none-configured');
  });

  test('bad closures are rejected', () => {
    assert.throws(() => businessNight('2026-10-02T12:00:00+02:00', { ...S, closures: [{ from: '2026-11-07', to: '2026-11-06' }] }), RangeError);
    assert.throws(() => businessNight('2026-10-02T12:00:00+02:00', { ...S, closures: [{ from: '2027-02-29', to: '2027-03-01' }] }), RangeError);
    assert.throws(() => businessNight('2026-10-02T12:00:00+02:00', { ...S, closures: [{ from: '2026-11-06', to: '2026-11-06', weekdays: [9] }] }), RangeError);
  });

  test('a closure longer than the lookahead reports closed with no next opening', () => {
    const forever = { ...S, closures: [{ from: '2026-10-01', to: '2028-06-30', reason: 'test' }] };
    const s = tonightSummary('2026-10-02T12:00:00+02:00', forever, DEFAULT_CONFIG, 'en');
    assert.equal(s.state, 'closed');
    assert.equal(s.nextOpen, null);
    assert.equal(s.headlineKey, 'tonight.closedTonight');
    assert.equal(s.countdownSeconds, null);
  });

  test('a schedule with no nights never opens', () => {
    const none = { nights: [], closures: [] };
    const b = businessNight('2026-10-02T23:00:00+02:00', none);
    assert.equal(b.open, false);
    assert.equal(b.next, null);
    const s = tonightSummary('2026-10-02T23:00:00+02:00', none, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'closed');
    assert.equal(s.headline, 'Zamknięte');
    assert.equal(s.countdownSeconds, null);
    assert.equal(s.nextOpen, null);
  });
});

/* ------------------------------------------------------------------ */
describe('phases of the night', () => {
  const fri = (hhmm, day = '2026-10-02') => T(`${day}T${hhmm}:00+02:00`);
  const sat = (hhmm) => fri(hhmm, '2026-10-03');

  test('DJ start unknown (null): live-or-djs-unknown in the middle, known phases at both ends', () => {
    const p = (ms) => phaseOfNight(ms, S, DEFAULT_CONFIG);
    assert.equal(p(fri('21:59') + 59_000).phase, 'closed');
    assert.equal(p(fri('21:59') + 59_000).nextPhase, 'doors');
    assert.equal(p(fri('21:59') + 59_000).msToNextChange, 1000);
    assert.equal(p(fri('22:00')).phase, 'doors');
    assert.equal(p(fri('22:29') + 59_000).phase, 'doors');
    const mid = p(fri('22:30'));
    assert.equal(mid.phase, 'live-or-djs-unknown');
    assert.equal(mid.unknownBoundary, true);
    assert.equal(mid.nextPhase, 'last-hour');
    assert.equal(mid.nextChangeMs, sat('03:00'));
    assert.equal(p(fri('23:59')).phase, 'live-or-djs-unknown');
    assert.equal(p(sat('02:59') + 59_000).phase, 'live-or-djs-unknown');
    const lastHour = p(sat('03:00'));
    assert.equal(lastHour.phase, 'last-hour');
    assert.equal(lastHour.nextPhase, 'closing');
    assert.equal(lastHour.minutesToNextChange, 45);
    assert.equal(p(sat('03:44') + 59_000).phase, 'last-hour');
    const closing = p(sat('03:45'));
    assert.equal(closing.phase, 'closing');
    assert.equal(closing.nextPhase, 'closed');
    assert.equal(closing.minutesToNextChange, 15);
    assert.equal(p(sat('03:59') + 59_000).phase, 'closing');
    assert.equal(p(sat('04:00')).phase, 'closed');
    assert.equal(p(sat('04:00')).night.date, '2026-10-03');
  });

  test('daytime: closed, next change is the opening of the next night', () => {
    const p = phaseOfNight(T('2026-09-29T12:00:00+02:00'), S, DEFAULT_CONFIG);
    assert.equal(p.phase, 'closed');
    assert.equal(p.nextChangeMs, T('2026-10-02T22:00:00+02:00'));
    assert.equal(p.minutesToNextChange, (T('2026-10-02T22:00:00+02:00') - T('2026-09-29T12:00:00+02:00')) / MIN);
  });

  test('DJ start set to 00:30: live before, djs after, exact boundary', () => {
    const cfg = { ...DEFAULT_CONFIG, djStart: '00:30' };
    const p = (ms) => phaseOfNight(ms, S, cfg);
    assert.equal(p(fri('22:30')).phase, 'live');
    assert.equal(p(fri('22:30')).nextPhase, 'djs');
    assert.equal(p(fri('22:30')).nextChangeMs, sat('00:30'));
    assert.equal(p(fri('22:30')).minutesToNextChange, 120);
    assert.equal(p(fri('22:30')).unknownBoundary, false);
    assert.equal(p(sat('00:29') + 59_000).phase, 'live');
    const dj = p(sat('00:30'));
    assert.equal(dj.phase, 'djs');
    assert.equal(dj.nextPhase, 'last-hour');
    assert.equal(dj.nextChangeMs, sat('03:00'));
    assert.equal(p(sat('02:59') + 59_000).phase, 'djs');
    assert.equal(p(sat('03:00')).phase, 'last-hour');
  });

  test('DJ start before the doors phase ends collapses live; after the last hour begins it is ignored', () => {
    assert.equal(phaseOfNight(fri('22:10'), S, { ...DEFAULT_CONFIG, djStart: '22:10' }).phase, 'doors');
    assert.equal(phaseOfNight(fri('22:30'), S, { ...DEFAULT_CONFIG, djStart: '22:10' }).phase, 'djs');
    assert.equal(phaseOfNight(sat('02:59'), S, { ...DEFAULT_CONFIG, djStart: '03:30' }).phase, 'live');
    assert.equal(phaseOfNight(sat('03:00'), S, { ...DEFAULT_CONFIG, djStart: '03:30' }).phase, 'last-hour');
  });

  test('DJ start outside the night is refused, not guessed', () => {
    for (const bad of ['21:00', '22:00', '04:00', '12:00']) {
      assert.throws(() => phaseOfNight(fri('23:00'), S, { ...DEFAULT_CONFIG, djStart: bad }), RangeError, bad);
    }
    assert.throws(() => phaseOfNight(fri('23:00'), S, { ...DEFAULT_CONFIG, djStart: '25:00' }), RangeError);
    assert.throws(() => phaseOfNight(fri('23:00'), S, { ...DEFAULT_CONFIG, doorsMinutes: -1 }), RangeError);
    assert.throws(() => phaseOfNight(fri('23:00'), S, { ...DEFAULT_CONFIG, closingMinutes: 90 }), RangeError);
  });

  test('per-night override beats the default; other nights keep the default', () => {
    const cfg = { ...DEFAULT_CONFIG, nights: { '2026-10-03': { djStart: '01:00' } } };
    assert.equal(phaseOfNight(T('2026-10-03T23:00:00+02:00'), S, cfg).phase, 'live');
    assert.equal(phaseOfNight(T('2026-10-04T01:00:00+02:00'), S, cfg).phase, 'djs');
    assert.equal(phaseOfNight(fri('23:00'), S, cfg).phase, 'live-or-djs-unknown');
    assert.equal(validateConfig(cfg, S), cfg);
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, nights: { '2026-10-03': { djStart: '21:00' } } }, S), RangeError);
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, nights: { '2026-13-03': {} } }, S), RangeError);
  });

  test('DST nights: last hour and closing are counted back from the real end', () => {
    // Autumn: window ends 03:00Z; last hour from 02:00Z (03:00 CET), closing from 02:45Z.
    assert.equal(phaseOfNight('2026-10-25T01:59:59Z', S, DEFAULT_CONFIG).phase, 'live-or-djs-unknown');
    assert.equal(phaseOfNight('2026-10-25T02:00:00Z', S, DEFAULT_CONFIG).phase, 'last-hour');
    assert.equal(phaseOfNight('2026-10-25T02:45:00Z', S, DEFAULT_CONFIG).phase, 'closing');
    assert.equal(phaseOfNight('2026-10-25T03:00:00Z', S, DEFAULT_CONFIG).phase, 'closed');
    // Spring: window ends 02:00Z; last hour from 01:00Z (03:00 CEST), closing from 01:45Z.
    assert.equal(phaseOfNight('2027-03-28T00:59:59Z', S, DEFAULT_CONFIG).phase, 'live-or-djs-unknown');
    assert.equal(phaseOfNight('2027-03-28T01:00:00Z', S, DEFAULT_CONFIG).phase, 'last-hour');
    assert.equal(phaseOfNight('2027-03-28T01:45:00Z', S, DEFAULT_CONFIG).phase, 'closing');
    assert.equal(phaseOfNight('2027-03-28T02:00:00Z', S, DEFAULT_CONFIG).phase, 'closed');
    assert.equal(phaseOfNight('2027-03-27T21:29:59Z', S, DEFAULT_CONFIG).phase, 'doors');
    assert.equal(phaseOfNight('2027-03-27T21:30:00Z', S, DEFAULT_CONFIG).phase, 'live-or-djs-unknown');
  });

  test('DST nights: a DJ start of 02:30 follows the documented rule', () => {
    const cfg = { ...DEFAULT_CONFIG, djStart: '02:30' };
    // Autumn: 02:30 is ambiguous, the earlier pass (02:30 CEST = 00:30Z) wins.
    assert.equal(phaseOfNight('2026-10-25T00:29:59Z', S, cfg).phase, 'live');
    assert.equal(phaseOfNight('2026-10-25T00:30:00Z', S, cfg).phase, 'djs');
    assert.equal(phaseOfNight('2026-10-25T01:30:00Z', S, cfg).phase, 'djs', 'the second 02:30 is not a second start');
    // Spring: 02:30 does not exist, it becomes 03:30 CEST = 01:30Z.
    assert.equal(phaseOfNight('2027-03-28T01:29:59Z', S, cfg).phase, 'last-hour', 'shifted start lands inside the last hour, so last-hour wins');
    const cfg2 = { ...DEFAULT_CONFIG, djStart: '01:30' };
    assert.equal(phaseOfNight('2027-03-28T00:29:59Z', S, cfg2).phase, 'live');
    assert.equal(phaseOfNight('2027-03-28T00:30:00Z', S, cfg2).phase, 'djs');
    // With a short last hour the shifted 03:30 CEST (01:30Z) is visible as a start of its own.
    const cfg3 = { ...DEFAULT_CONFIG, djStart: '02:30', lastHourMinutes: 20, closingMinutes: 5 };
    assert.equal(phaseOfNight('2027-03-28T01:29:59Z', S, cfg3).phase, 'live');
    assert.equal(phaseOfNight('2027-03-28T01:30:00Z', S, cfg3).phase, 'djs');
    assert.equal(phaseOfNight('2027-03-28T01:40:00Z', S, cfg3).phase, 'last-hour');
  });

  test('a closure night has no phases', () => {
    const closed = { ...S, closures: [{ from: '2026-10-02', to: '2026-10-02', reason: 'x' }] };
    assert.equal(phaseOfNight(fri('23:00'), closed, DEFAULT_CONFIG).phase, 'closed');
  });
});

/* ------------------------------------------------------------------ */
describe('tonightSummary', () => {
  test('Tuesday noon: opens in days, headline with weekday, countdown', () => {
    const s = tonightSummary(T('2026-09-29T12:00:00+02:00'), S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'opens-in-days');
    assert.equal(s.headlineKey, 'tonight.opensInDays');
    assert.equal(s.headline, `Otwieramy w${NB}piątek o${NB}22:00`);
    assert.equal(s.countdown.to, 'open');
    assert.equal(s.countdownSeconds, (T('2026-10-02T22:00:00+02:00') - T('2026-09-29T12:00:00+02:00')) / 1000);
    assert.equal(s.countdown.text, `za 3${NB}dni i${NB}10${NB}godzin`);
    assert.deepEqual(
      [s.nextOpen.weekdayKey, s.nextOpen.date, s.nextOpen.time, s.nextOpen.daysAway],
      ['friday', '2026-10-02', '22:00', 3],
    );
    assert.equal(s.night.date, '2026-10-02');
    assert.equal(s.instantBelongsTo.date, '2026-09-29');
    assert.equal(s.phase.key, 'closed');
    assert.equal(s.progress, null);
  });

  test('Thursday noon: tomorrow', () => {
    const s = tonightSummary(T('2026-10-01T12:00:00+02:00'), S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'opens-in-days');
    assert.equal(s.headlineKey, 'tonight.opensTomorrow');
    assert.equal(s.headline, `Jutro otwieramy o${NB}22:00`);
  });

  test('Friday noon: opens later today, 10 hours', () => {
    const s = tonightSummary(T('2026-10-02T12:00:00+02:00'), S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'opens-later-today');
    assert.equal(s.headline, `Dziś otwieramy o${NB}22:00`);
    assert.equal(s.countdownSeconds, 36000);
    assert.equal(s.countdown.text, `za 10${NB}godzin`);
  });

  test('just after closing on Saturday morning: opens later today', () => {
    const s = tonightSummary(T('2026-10-03T04:00:00+02:00'), S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'opens-later-today');
    assert.equal(s.nextOpen.date, '2026-10-03');
  });

  test('open: headline, countdown to close, progress, phase, lineup placeholders, provenance', () => {
    const s = tonightSummary(T('2026-10-02T22:30:00+02:00'), S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.state, 'open');
    assert.equal(s.headline, 'Otwarte do 04:00');
    assert.equal(s.countdown.to, 'close');
    assert.equal(s.countdownSeconds, 5.5 * 3600);
    near(s.progress, 0.5 / 6, 'progress');
    assert.equal(s.phase.key, 'live-or-djs-unknown');
    assert.equal(s.phase.labelKey, 'phase.liveOrDjs');
    assert.equal(s.phase.label, 'Muzyka na żywo, później DJ-e');
    assert.equal(s.phase.unknownBoundary, true);
    assert.equal(s.night.date, '2026-10-02');
    // placeholders, never invented values
    assert.equal(s.lineup.djStart.value, null);
    assert.equal(s.lineup.djStart.display, '[DJ-START?]');
    assert.deepEqual(s.lineup.slots.map((x) => x.display), ['[LINEUP?]', '[LINEUP?]']);
    assert.equal(s.lineup.slots[1].startDisplay, '[DJ-START?]');
    assert.deepEqual(s.lineup.placeholdersShown, ['[DJ-START?]', '[LINEUP?]']);
    assert.deepEqual(s.dataProvenance, {
      openingHours: 'confirmed',
      timeZone: 'confirmed',
      djStart: 'placeholder',
      lineup: 'placeholder',
      closures: 'none-configured',
      phaseLengths: 'assumption',
      hasPlaceholders: true,
      placeholdersShown: ['[DJ-START?]', '[LINEUP?]'],
      namedLineupSlots: 0,
    });
    assert.equal(PLACEHOLDERS.lineup, '[LINEUP?]');
    assert.equal(PLACEHOLDERS.djStart, '[DJ-START?]');
  });

  test('DJ start and lineup configured: values appear, provenance flips', () => {
    const cfg = {
      ...DEFAULT_CONFIG,
      djStart: '01:00',
      lineup: [
        { kind: 'live', name: 'TEST ACT ONE', start: null },
        { kind: 'dj', name: null, start: null },
      ],
    };
    const s = tonightSummary(T('2026-10-03T01:30:00+02:00'), S, cfg, 'en');
    assert.equal(s.phase.key, 'djs');
    assert.equal(s.lineup.djStart.display, '01:00');
    assert.equal(s.lineup.slots[0].display, 'TEST ACT ONE');
    assert.equal(s.lineup.slots[1].display, '[LINEUP?]');
    assert.equal(s.lineup.slots[1].startDisplay, '01:00');
    assert.equal(s.dataProvenance.djStart, 'configured');
    assert.equal(s.dataProvenance.lineup, 'partial');
    assert.deepEqual(s.dataProvenance.placeholdersShown, ['[LINEUP?]']);
    const full = { ...cfg, lineup: [{ kind: 'live', name: 'A', start: null }, { kind: 'dj', name: 'B', start: null }] };
    assert.equal(tonightSummary(T('2026-10-03T01:30:00+02:00'), S, full, 'en').dataProvenance.lineup, 'configured');
    assert.equal(tonightSummary(T('2026-10-03T01:30:00+02:00'), S, full, 'en').dataProvenance.hasPlaceholders, false);
  });

  test('the lineup shown for a closed venue is the next night\'s', () => {
    const cfg = { ...DEFAULT_CONFIG, nights: { '2026-10-02': { djStart: '00:15' } } };
    const s = tonightSummary(T('2026-09-29T12:00:00+02:00'), S, cfg, 'en');
    assert.equal(s.night.date, '2026-10-02');
    assert.equal(s.lineup.djStart.display, '00:15');
  });

  test('countdown seconds round up so it never shows 0 with time left', () => {
    const s = tonightSummary(T('2026-10-02T22:00:00+02:00') - 500, S, DEFAULT_CONFIG, 'en');
    assert.equal(s.countdownSeconds, 1);
    assert.equal(tonightSummary(T('2026-10-02T22:00:00+02:00'), S, DEFAULT_CONFIG, 'en').state, 'open');
  });

  test('headlines in five locales (open state)', () => {
    const at = T('2026-10-02T23:00:00+02:00');
    const got = Object.fromEntries(LOCALES.map((l) => [l, tonightSummary(at, S, DEFAULT_CONFIG, l).headline]));
    assert.deepEqual(got, {
      pl: 'Otwarte do 04:00',
      en: 'Open until 04:00',
      de: `Geöffnet bis 04:00${NB}Uhr`,
      it: 'Aperto fino alle 04:00',
      cs: 'Otevřeno do 04:00',
    });
  });

  test('locale resolution: region tags map, unknown falls back to Polish', () => {
    assert.equal(resolveLocale('en-GB'), 'en');
    assert.equal(resolveLocale('PL_pl'), 'pl');
    assert.equal(resolveLocale('xx'), 'pl');
    assert.equal(resolveLocale(undefined), 'pl');
    assert.equal(tonightSummary(T('2026-10-02T23:00:00+02:00'), S, DEFAULT_CONFIG, 'xx').headline, 'Otwarte do 04:00');
  });

  test('DST night summary: countdown to close is real time', () => {
    // 01:30 CEST on 25 Oct: 3.5 real hours left (03:00Z close), not 2.5.
    const s = tonightSummary('2026-10-24T23:30:00Z', S, DEFAULT_CONFIG, 'pl');
    assert.equal(s.countdownSeconds, 3.5 * 3600);
    assert.equal(s.countdown.text, `za 3${NB}godziny i${NB}30${NB}minut`);
    assert.equal(s.headline, 'Otwarte do 04:00');
  });
});

/* ------------------------------------------------------------------ */
describe('message tables, plural rules, typography', () => {
  test('all five locales share one key set and the same variables per key', () => {
    const keys = Object.keys(MESSAGES.pl).sort();
    for (const l of LOCALES) {
      assert.deepEqual(Object.keys(MESSAGES[l]).sort(), keys, l);
      for (const k of keys) {
        assert.equal(typeof MESSAGES[l][k], 'string');
        assert.ok(MESSAGES[l][k].trim().length > 0, `${l} ${k}`);
        const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
        assert.equal(vars(MESSAGES[l][k]), vars(MESSAGES.pl[k]), `${l} ${k} variables`);
      }
    }
    assert.throws(() => t('pl', 'no.such.key'), /Unknown message key/);
    assert.throws(() => t('pl', 'tonight.open'), /needs variable/);
  });

  test('Polish plural rules for minutes, hours, days match the grammar rule (independent implementation)', () => {
    const rule = (n, one, few, many) => {
      if (n === 1) return one;
      const last = n % 10;
      const last2 = n % 100;
      return last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14) ? few : many;
    };
    for (let n = 1; n <= 59; n += 1) {
      assert.equal(formatUnit(n, 'minute', 'pl'), `${n}${NB}${rule(n, 'minutę', 'minuty', 'minut')}`, `minute ${n}`);
    }
    for (let n = 1; n <= 23; n += 1) {
      assert.equal(formatUnit(n, 'hour', 'pl'), `${n}${NB}${rule(n, 'godzinę', 'godziny', 'godzin')}`, `hour ${n}`);
    }
    for (let n = 1; n <= 120; n += 1) {
      assert.equal(formatUnit(n, 'day', 'pl'), `${n}${NB}${rule(n, 'dzień', 'dni', 'dni')}`, `day ${n}`);
    }
  });

  test('named Polish cases from the brief', () => {
    assert.equal(formatIn(2 * 3600, 'pl'), `za 2${NB}godziny`);
    assert.equal(formatIn(5 * 3600, 'pl'), `za 5${NB}godzin`);
    assert.equal(formatIn(1 * 3600, 'pl'), `za 1${NB}godzinę`);
    assert.equal(formatIn(12 * 3600, 'pl'), `za 12${NB}godzin`);
    assert.equal(formatIn(22 * 3600, 'pl'), `za 22${NB}godziny`);
    assert.equal(formatIn(60, 'pl'), `za 1${NB}minutę`);
    assert.equal(formatIn(2 * 60, 'pl'), `za 2${NB}minuty`);
    assert.equal(formatIn(5 * 60, 'pl'), `za 5${NB}minut`);
    assert.equal(formatIn(22 * 60, 'pl'), `za 22${NB}minuty`);
    assert.equal(formatIn(41 * 60, 'pl'), `za 41${NB}minut`);
    assert.equal(formatIn(86400, 'pl'), `za 1${NB}dzień`);
    assert.equal(formatIn(2 * 86400, 'pl'), `za 2${NB}dni`);
    assert.equal(formatIn(5 * 86400, 'pl'), `za 5${NB}dni`);
    assert.equal(formatIn(2 * 3600 + 5 * 60, 'pl'), `za 2${NB}godziny i${NB}5${NB}minut`);
    assert.equal(formatIn(4 * 86400 + 17 * 3600 + 20 * 60, 'pl'), `za 4${NB}dni i${NB}17${NB}godzin`);
    assert.equal(formatIn(0, 'pl'), 'teraz');
    assert.equal(formatIn(-30, 'pl'), 'teraz');
    assert.equal(formatIn(30, 'pl'), `za 1${NB}minutę`, 'rounded up');
    assert.equal(formatDuration(3 * 3600, 'pl'), `3${NB}godziny`);
  });

  test('en, de, it, cs durations', () => {
    assert.equal(formatIn(3600, 'en'), `in 1${NB}hour`);
    assert.equal(formatIn(2 * 3600 + 60, 'en'), `in 2${NB}hours and 1${NB}minute`);
    assert.equal(formatIn(3600, 'de'), `in 1${NB}Stunde`);
    assert.equal(formatIn(2 * 3600, 'de'), `in 2${NB}Stunden`);
    assert.equal(formatIn(3 * 86400, 'de'), `in 3${NB}Tagen`);
    assert.equal(formatIn(3600, 'it'), `tra 1${NB}ora`);
    assert.equal(formatIn(2 * 3600, 'it'), `tra 2${NB}ore`);
    assert.equal(formatIn(3600, 'cs'), `za 1${NB}hodinu`);
    assert.equal(formatIn(2 * 3600, 'cs'), `za 2${NB}hodiny`);
    assert.equal(formatIn(5 * 3600, 'cs'), `za 5${NB}hodin`);
    assert.equal(formatIn(5 * 86400, 'cs'), `za 5${NB}dní`);
    assert.equal(formatIn(2 * 86400, 'cs'), `za 2${NB}dny`);
  });

  test('a number is always glued to its unit: no plain space after a digit in any output', () => {
    const outputs = [];
    for (const l of LOCALES) {
      for (let s = 0; s <= 6 * 86400; s += 977) outputs.push(formatIn(s, l));
      for (const ms of [
        T('2026-09-29T12:00:00+02:00'),
        T('2026-10-01T12:00:00+02:00'),
        T('2026-10-02T12:00:00+02:00'),
        T('2026-10-02T23:00:00+02:00'),
        T('2026-10-04T12:00:00+02:00'),
      ]) {
        const sum = tonightSummary(ms, S, DEFAULT_CONFIG, l);
        outputs.push(sum.headline, sum.countdown.text, sum.nextOpen?.onPhrase ?? '', sum.phase.label ?? '');
      }
    }
    for (const o of outputs) assert.doesNotMatch(o, /\d [^\d]/, `plain space after a digit in "${o}"`);
  });

  test('Polish weekday phrases are in the accusative with a bound preposition', () => {
    assert.deepEqual(
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => t('pl', `on.${d}`)),
      [`w${NB}niedzielę`, `w${NB}poniedziałek`, `we${NB}wtorek`, `w${NB}środę`, `w${NB}czwartek`, `w${NB}piątek`, `w${NB}sobotę`],
    );
  });

  test('24-hour times, no AM/PM anywhere', () => {
    for (const l of LOCALES) {
      const s = tonightSummary(T('2026-10-02T23:00:00+02:00'), S, DEFAULT_CONFIG, l);
      assert.doesNotMatch(s.headline, /[AaPp]\.?[Mm]\b/);
      assert.match(s.headline, /04:00/);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('arrivalWindow and tableRelease (reservation page)', () => {
  const fri = (hhmm, day = '2026-10-02') => T(`${day}T${hhmm}+02:00`);

  test('before, inside (both edges inclusive), after', () => {
    const before = arrivalWindow(fri('20:00:00'), S);
    assert.equal(before.status, 'not-started');
    assert.equal(before.night.date, '2026-10-02');
    assert.equal(before.secondsUntilStart, 7200);
    assert.equal(before.secondsUntilEnd, 10800);
    assert.equal(before.venueOpen, false);
    assert.equal(before.window.start, '2026-10-02T22:00:00+02:00');
    assert.equal(before.window.end, '2026-10-02T23:00:00+02:00');

    const start = arrivalWindow(fri('22:00:00'), S);
    assert.equal(start.status, 'in-window');
    assert.equal(start.secondsUntilStart, null);
    assert.equal(start.secondsUntilEnd, 3600);
    assert.equal(start.venueOpen, true);

    assert.equal(arrivalWindow(fri('22:59:59'), S).secondsUntilEnd, 1);
    const edge = arrivalWindow(fri('23:00:00'), S);
    assert.equal(edge.status, 'in-window');
    assert.equal(edge.secondsUntilEnd, 0);

    const after = arrivalWindow(fri('23:00:00') + 1, S);
    assert.equal(after.status, 'ended');
    assert.equal(after.secondsUntilEnd, null);
    assert.equal(after.venueOpen, true);
    assert.equal(after.next.night.date, '2026-10-03');
    assert.equal(after.next.window.start, '2026-10-03T22:00:00+02:00');
    assert.equal(after.next.msUntilStart, T('2026-10-03T20:00:00Z') - (fri('23:00:00') + 1));
  });

  test('sub-second ceil: 500 ms before the window opens shows 1 second', () => {
    assert.equal(arrivalWindow(fri('22:00:00') - 500, S).secondsUntilStart, 1);
  });

  test('Saturday 01:00 is Friday\'s night, pickup over; from 04:00 the window is Saturday\'s', () => {
    const late = arrivalWindow(T('2026-10-03T01:00:00+02:00'), S);
    assert.equal(late.status, 'ended');
    assert.equal(late.night.date, '2026-10-02');
    assert.equal(late.next.night.date, '2026-10-03');
    const morning = arrivalWindow(T('2026-10-03T04:00:00+02:00'), S);
    assert.equal(morning.status, 'not-started');
    assert.equal(morning.night.date, '2026-10-03');
    assert.equal(morning.venueOpen, false);
  });

  test('midweek and Sunday point at the next Friday', () => {
    assert.equal(arrivalWindow(T('2026-10-01T12:00:00+02:00'), S).night.date, '2026-10-02');
    assert.equal(arrivalWindow(T('2026-10-04T12:00:00+02:00'), S).night.date, '2026-10-09');
  });

  test('closure night is skipped', () => {
    const closed = { ...S, closures: [{ from: '2026-10-02', to: '2026-10-02', reason: 'x' }] };
    const w = arrivalWindow(T('2026-10-01T12:00:00+02:00'), closed);
    assert.equal(w.night.date, '2026-10-03');
    assert.equal(arrivalWindow(T('2026-10-01T12:00:00+02:00'), { nights: [] }).status, 'no-night');
  });

  test('arrival window on the DST nights is still 22:00-23:00 local', () => {
    const a = arrivalWindow('2026-10-24T19:00:00Z', S);
    assert.equal(a.window.start, '2026-10-24T22:00:00+02:00');
    assert.equal(a.window.end, '2026-10-24T23:00:00+02:00');
    const b = arrivalWindow('2027-03-27T20:00:00Z', S);
    assert.equal(b.window.start, '2027-03-27T22:00:00+01:00');
    assert.equal(b.window.end, '2027-03-27T23:00:00+01:00');
  });

  test('table release: 30 minutes after the arrival time, "more than 30" means strictly after', () => {
    const booking = { night: '2026-10-02', arrival: '22:30' };
    const r0 = tableRelease(booking, fri('22:29:00'), S);
    assert.equal(r0.status, 'before-arrival');
    assert.equal(r0.msUntilArrival, 60_000);
    assert.equal(r0.secondsUntilRelease, 31 * 60);
    assert.equal(r0.releaseAt, '2026-10-02T23:00:00+02:00');
    assert.equal(r0.arrivalInWindow, true);
    const r1 = tableRelease(booking, fri('22:30:00'), S);
    assert.equal(r1.status, 'grace');
    assert.equal(r1.secondsUntilRelease, 1800);
    const r2 = tableRelease(booking, fri('23:00:00'), S);
    assert.equal(r2.status, 'grace', 'exactly 30:00 late is not "more than 30 minutes"');
    assert.equal(r2.secondsUntilRelease, 0);
    const r3 = tableRelease(booking, fri('23:00:00') + 1, S);
    assert.equal(r3.status, 'may-be-released');
    assert.equal(r3.secondsUntilRelease, 0);
    assert.equal(r3.msUntilRelease, 0);
  });

  test('table release for the window edges and an arrival outside it', () => {
    assert.equal(tableRelease({ night: '2026-10-02', arrival: '22:00' }, fri('21:00:00'), S).releaseAt, '2026-10-02T22:30:00+02:00');
    const late = tableRelease({ night: '2026-10-02', arrival: '23:00' }, fri('21:00:00'), S);
    assert.equal(late.releaseAt, '2026-10-02T23:30:00+02:00');
    assert.equal(late.arrivalInWindow, true);
    const outside = tableRelease({ night: '2026-10-02', arrival: '23:30' }, fri('21:00:00'), S);
    assert.equal(outside.arrivalInWindow, false);
    const afterMidnight = tableRelease({ night: '2026-10-02', arrival: '00:30' }, fri('21:00:00'), S);
    assert.equal(afterMidnight.arrival.iso, '2026-10-03T00:30:00+02:00', 'after-midnight times belong to the next calendar day');
    assert.equal(afterMidnight.releaseAt, '2026-10-03T01:00:00+02:00');
    assert.equal(afterMidnight.arrivalInWindow, false);
  });

  test('table release on a DST night uses real minutes', () => {
    const r = tableRelease({ night: '2026-10-24', arrival: '23:00' }, '2026-10-24T20:00:00Z', S);
    assert.equal(r.releaseAtMs, T('2026-10-24T21:30:00Z'));
    assert.equal(r.releaseAt, '2026-10-24T23:30:00+02:00');
  });

  test('table release: nights that do not take place', () => {
    const thu = tableRelease({ night: '2026-10-01', arrival: '22:30' }, fri('21:00:00'), S);
    assert.equal(thu.status, 'no-night');
    assert.equal(thu.reason, 'not-scheduled');
    const closed = { ...S, closures: [{ from: '2026-10-02', to: '2026-10-02', reason: 'x' }] };
    const c = tableRelease({ night: '2026-10-02', arrival: '22:30' }, fri('21:00:00'), closed);
    assert.equal(c.status, 'no-night');
    assert.equal(c.reason, 'closure');
    assert.throws(() => tableRelease({ night: '2026-10-02', arrival: '22h30' }, fri('21:00:00'), S), RangeError);
    assert.throws(() => tableRelease({ night: 'x', arrival: '22:30' }, fri('21:00:00'), S), RangeError);
  });

  test('arrivalWindow attaches the release countdown when a booking is passed', () => {
    const w = arrivalWindow(fri('22:40:00'), S, { night: '2026-10-02', arrival: '22:30' });
    assert.equal(w.status, 'in-window');
    assert.equal(w.release.status, 'grace');
    assert.equal(w.release.secondsUntilRelease, 20 * 60);
    assert.equal(arrivalWindow(fri('22:40:00'), S).release, null);
    assert.equal(w.dataProvenance.arrivalWindow, 'confirmed');
    assert.equal(w.dataProvenance.releaseReference, 'assumption');
  });

  test('the release rule is configurable through the schedule', () => {
    const custom = { ...S, arrival: { from: '22:00', to: '23:00', releaseAfterMinutes: 45 } };
    assert.equal(tableRelease({ night: '2026-10-02', arrival: '22:30' }, fri('21:00:00'), custom).releaseAt, '2026-10-02T23:15:00+02:00');
    assert.throws(() => arrivalWindow(fri('21:00:00'), { ...S, arrival: { from: '23:00', to: '22:00' } }), RangeError);
  });
});

/* ------------------------------------------------------------------ */
describe('purity', () => {
  test('the source never reads the clock, randomness or the environment', () => {
    const src = readFileSync(new URL('./night.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.doesNotMatch(src, /Date\.now\s*\(/);
    assert.doesNotMatch(src, /new Date\(\s*\)/);
    assert.doesNotMatch(src, /Math\.random/);
    assert.doesNotMatch(src, /performance\.now/);
    assert.doesNotMatch(src, /\bprocess\b/);
    assert.doesNotMatch(src, /\brequire\s*\(|^\s*import\s/m, 'zero dependencies');
    assert.doesNotMatch(src, /getTimezoneOffset|\.getHours\(|\.getDay\(|\.getDate\(|\.getMonth\(|\.getFullYear\(/, 'no device-local Date getters');
    assert.doesNotMatch(src, /6\s*\*\s*3600000|6\s*\*\s*HOUR|21_?600_?000/, 'no fixed 6 hour night');
  });

  test('inputs are not mutated (deep-frozen inputs work) and results are deterministic', () => {
    const deepFreeze = (o) => {
      if (o && typeof o === 'object') {
        Object.freeze(o);
        for (const v of Object.values(o)) deepFreeze(v);
      }
      return o;
    };
    const schedule = deepFreeze({
      nights: [
        { weekday: 5, opens: '22:00', closes: '04:00' },
        { weekday: 6, opens: '22:00', closes: '04:00' },
      ],
      closures: [{ from: '2026-11-06', to: '2026-11-06', reason: 'r' }],
    });
    const config = deepFreeze({ djStart: '00:30', lineup: [{ kind: 'dj', name: 'X', start: null }], nights: {} });
    const at = T('2026-10-03T01:00:00+02:00');
    const one = tonightSummary(at, schedule, config, 'pl');
    const two = tonightSummary(at, schedule, config, 'pl');
    assert.deepEqual(one, two);
    businessNight(at, schedule);
    phaseOfNight(at, schedule, config);
    arrivalWindow(at, schedule, { night: '2026-10-02', arrival: '22:30' });
    assert.throws(() => DEFAULT_SCHEDULE.nights.push({}), TypeError, 'defaults are frozen');
    assert.throws(() => {
      DEFAULT_CONFIG.djStart = '01:00';
    }, TypeError);
  });
});

/* ------------------------------------------------------------------ */
describe('cross-timezone fingerprint', () => {
  test('a fixed sweep of outputs hashes to the same value under any device TZ', (ctx) => {
    const h = createHash('sha256');
    const cfg = { ...DEFAULT_CONFIG, djStart: '01:00' };
    const starts = [T('2026-10-22T00:00:00Z'), T('2027-03-25T00:00:00Z'), T('2026-12-30T00:00:00Z')];
    for (const start of starts) {
      for (let i = 0; i < 4 * 24; i += 1) {
        const ms = start + i * HOUR + (i % 7) * 7 * MIN;
        h.update(JSON.stringify(businessNight(ms, S)));
        h.update(JSON.stringify(phaseOfNight(ms, S, cfg)));
        for (const l of LOCALES) h.update(JSON.stringify(tonightSummary(ms, S, cfg, l)));
        h.update(JSON.stringify(arrivalWindow(ms, S, { night: '2026-10-24', arrival: '22:40' })));
      }
    }
    ctx.diagnostic(`fingerprint sha256=${h.digest('hex')}`);
  });
});
