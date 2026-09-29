# night.mjs: usage and decisions (Innovation I1, "Tonight")

Pure logic for the "Tonight" module and the reservation page countdowns. No UI, no dependencies, no clock. Every function takes the instant to evaluate; the caller passes the current time.

Labels follow WORKING-RULES.md: **Confirmed** (seen in code or in a run), **Rec**, **Assumption**, **Inference**, **PENDING** (needs Ignacy).

## Files

| File | What it is |
|---|---|
| `night.mjs` | The module. ES module, zero imports. |
| `night.test.mjs` | 228 tests (`node:test`). |
| `run-tz.sh` | Runs the suite under `TZ=UTC`, `America/Los_Angeles`, `Asia/Tokyo` and compares an output fingerprint across them. A fourth file, added because the brief asked for the loop to be a script. |
| `night.md` | This file. |

Run: `cd docs/sisi-elevate/playground-src/lib && node --test night.test.mjs` or `./run-tz.sh`.

## Facts used

- Open Friday and Saturday, 22:00 to 04:00, Europe/Warsaw. **Confirmed**: `src/lib/opening-hours.mjs:7-20`, `src/data/site.ts:90` (`CONTACT.hours`), `src/i18n/ui/pl.ts:11`.
- The summer Friday closure is over. **Confirmed**: `src/lib/opening-hours.mjs:1-6` ("Fridays closed through 28 August 2026 ... is over"). Nothing in the module hard-codes it.
- Reservation pickup 22:00 to 23:00; a guest "more than 30 minutes" late may lose the table. **Confirmed**: `src/i18n/ui/pl.ts:328`, same rule in en/de/it/cs (`en.ts:321`, `de.ts:321`, `it.ts:320`, `cs.ts:321`).
- Concept copy: live music at the bar first, then DJs, floor runs until 4 am. **Confirmed**: `src/i18n/ui/pl.ts:156`.
- DJ start time and the lineup are **not known**. They are configuration, default `null`, and render as `[DJ-START?]` and `[LINEUP?]`. Nothing invents a time or a name.

## Usage

```js
import {
  tonightSummary, businessNight, phaseOfNight, arrivalWindow, tableRelease,
  validateConfig, DEFAULT_SCHEDULE, DEFAULT_CONFIG,
} from './night.mjs';

const now = Date.now(); // the caller owns the clock; night.mjs never reads it

// Card on the home page
const s = tonightSummary(now, DEFAULT_SCHEDULE, DEFAULT_CONFIG, 'pl');
s.state;             // 'open' | 'closed' | 'opens-later-today' | 'opens-in-days'
s.headline;          // 'Otwieramy w piątek o 22:00' (non-breaking spaces inside)
s.countdown.text;    // 'za 3 dni i 10 godzin'
s.countdownSeconds;  // integer, rounded up; counts to close when open, to opening otherwise
s.lineup.slots;      // [{ kind, name: null, display: '[LINEUP?]', start, startDisplay }, ...]
s.dataProvenance;    // what is confirmed, what is a placeholder, what is an assumption

// Reservation page, with an optional booking for the 30 minute rule
const a = arrivalWindow(now, DEFAULT_SCHEDULE, { night: '2026-10-02', arrival: '22:30' });
a.status;                   // 'not-started' | 'in-window' | 'ended' | 'no-night'
a.secondsUntilStart;        // to 22:00, null once started
a.secondsUntilEnd;          // to 23:00, null once ended
a.release.status;           // 'before-arrival' | 'grace' | 'may-be-released' | 'no-night'
a.release.secondsUntilRelease;
```

Setting a DJ start once it is known (per night, in Warsaw local time):

```js
const config = { ...DEFAULT_CONFIG, nights: { '2026-10-30': { djStart: '00:30', lineup: [
  { kind: 'live', name: 'NAME AS SUPPLIED', start: null },
  { kind: 'dj', name: null, start: null },      // null name still renders [LINEUP?]
] } } };
validateConfig(config, DEFAULT_SCHEDULE); // call at build time; runtime functions throw the same errors
```

A closure (start dates of the nights, both ends inclusive; `weekdays` is optional, 0 = Sunday):

```js
const schedule = { ...DEFAULT_SCHEDULE, closures: [
  { from: '2026-11-06', to: '2026-11-21', reason: 'REASON AS SUPPLIED', weekdays: [5] }, // Fridays only
] };
```

## API

| Function | Returns |
|---|---|
| `warsawParts(instant)` | `{ year, month, day, weekday (0 = Sunday), weekdayKey, hour, minute, second, offsetMinutes (60 or 120), zone ('CET'/'CEST'), dateKey, timeKey }` |
| `businessNight(instant, schedule)` | `{ night: { date, weekday, weekdayKey, scheduled, takesPlace, closure, window }, open, inWindow, progress, msUntilClose, minutesUntilClose, msUntilOpen, minutesUntilOpen, next: { date, weekdayKey, time, daysAway, startMs, msUntil, minutesUntil, night }, local, instant }` |
| `phaseOfNight(instant, schedule, config)` | `{ phase, phaseKey, night, nextPhase, nextChangeMs, msToNextChange, minutesToNextChange, unknownBoundary }` |
| `tonightSummary(instant, schedule, config, locale)` | `{ state, headlineKey, headline, countdownSeconds, countdown, nextOpen, night, instantBelongsTo, closure, progress, phase, lineup, dataProvenance, locale, instant }` |
| `arrivalWindow(instant, schedule, booking?)` | `{ status, night, window, venueOpen, msUntilStart, secondsUntilStart, msUntilEnd, secondsUntilEnd, next, release, dataProvenance }` |
| `tableRelease(booking, instant, schedule)` | `{ status, arrival, arrivalInWindow, releaseAtMs, releaseAt, msUntilRelease, secondsUntilRelease, ... }` |
| Helpers | `resolveLocal`, `localToInstant`, `nightWindow`, `nightProgress`, `toWarsawIso`, `toMs`, `formatIn`, `formatDuration`, `formatUnit`, `t`, `resolveLocale`, `validateConfig` |

Instants are a number, a `Date`, or an ISO string that carries `Z` or an offset. A string without an offset throws `TypeError`, because `Date.parse` would read it in the viewer's timezone. **Confirmed** by test (`night.test.mjs`, "the device timezone is whatever the harness set").

`progress`, `msUntilClose` are `null` when the venue is closed. `msUntilOpen` is `null` while open (the following opening is in `next` either way). `null` means "not applicable"; `0` is a real value.

## Decisions

### 1. Business night (Confirmed rule, Inference on the implementation)

A night is identified by the calendar date on which it starts. A local time earlier than the closing cutoff belongs to the previous date's night. The cutoff is derived from the schedule: the latest closing time among nights that cross midnight (04:00 today). So 02:00 Saturday is Friday's night, 02:00 Sunday is Saturday's night, and 02:00 Friday belongs to Thursday, which has no night, so the venue is closed.

The window is half open: open at 03:59:59, closed at 04:00:00. At 04:00:00 the business date flips, so `night` becomes the coming night (Saturday's) and `next` is its 22:00 start with `daysAway: 0`. **Rec**: one exact rule beats "around 4". The site copy says "do 4 rano", which does not say whether 04:00:00 itself is open.

Consequence of one global cutoff (**Inference**): a schedule with a 05:00 closing on any night moves the cutoff to 05:00 for every night. Not an issue for the published hours; covered by a test with a custom schedule.

### 2. DST: real elapsed time, deterministic wall-clock resolution (Confirmed by tests)

Window starts and ends are computed from the local wall-clock time, never `start + 6 * 3600000`. The rule for a wall-clock time on a date (`resolveLocal`, same as Temporal's "compatible"):

- Unique time: that instant.
- Ambiguous (clocks go back, 02:00 to 02:59 happens twice): the earlier pass, the summer-time one. 02:30 on 2026-10-25 is 00:30Z.
- Non-existent (clocks go forward, 02:00 to 02:59 skipped): shifted forward by the length of the gap. 02:30 on 2027-03-28 becomes 03:30 CEST, 01:30Z.

Numbers from the tests (all Confirmed, run output below):

| Night | Start | End | Real duration |
|---|---|---|---|
| Sat 24 to Sun 25 Oct 2026 (clocks back) | 2026-10-24T20:00Z (22:00 CEST) | 2026-10-25T03:00Z (04:00 CET) | 7 h |
| Sat 27 to Sun 28 Mar 2027 (clocks forward) | 2027-03-27T21:00Z (22:00 CET) | 2027-03-28T02:00Z (04:00 CEST) | 5 h |
| Every other Fri/Sat night tested | | | 6 h |

Progress on the autumn night: 22:00 = 0, 01:59 CEST = 239/420, second 02:00 (CET) = 5/7, 03:00 CET = 6/7, 04:00 = 1 (through `nightProgress`, which clamps). A wall-clock difference would give 5/6 at 03:00; a test asserts it does not. Spring night: 01:59 CET = 239/300, 03:00 CEST = 0.8, and the local clock jumps from 01:59:59 to 03:00:00 with no gap in real time.

The DST dates match the EU rule for 2026 to 2035, checked against an independent last-Sunday calculation in the tests.

`progress` is `null` while closed. Use `nightProgress(instant, window)` when you want 0 before and 1 after.

### 3. Phases (Assumption on lengths)

Order: `closed`, `doors`, `live`, `djs`, `last-hour`, `closing`, `closed`. With `djStart: null` the middle is one `live-or-djs-unknown` phase, and `unknownBoundary: true` says the live to DJ handover happens somewhere inside it. The next change reported is then the next KNOWN boundary (the start of the last hour).

Lengths are presentation choices, not venue facts: `doorsMinutes: 30`, `lastHourMinutes: 60`, `closingMinutes: 15`. **Assumption**; all three are config. Last hour and closing are counted back from the real end, so they are right on the 5 h and 7 h nights.

Edge rules, all tested: a DJ start inside the doors phase shortens `live` to zero; a DJ start inside the last hour never shows `djs` because `last-hour` wins; a DJ start outside the night (`21:00`, `22:00`, `04:00`) throws `RangeError` instead of guessing.

`djStart` is a local `HH:MM`. A time earlier than the night's opening (for example `00:30`) means the next calendar day. It follows the rule in decision 2 on DST nights.

### 4. Lineup and DJ start are configuration (Confirmed requirement)

`config.djStart` and `config.lineup` default to `null`. Per-night overrides sit in `config.nights['YYYY-MM-DD']` (night start date). A lineup slot is `{ kind: 'live' | 'dj', name, start }`; the shape is an **Assumption**, change it when the real lineup source exists. `dataProvenance` reports `djStart` and `lineup` as `placeholder`, `partial` or `configured`, and lists which placeholders are on screen.

### 5. Closures

`closures: [{ from, to, reason, weekdays? }]` use night start dates, inclusive at both ends, so a closed Friday also closes the Saturday-morning hours of that night. `weekdays` is an addition beyond the brief. **Inference**: the summer break was Fridays only (`opening-hours.mjs:3`), and a plain date range would also close Saturdays, so the real case could not be expressed without it. `reason` is passed through as supplied and is not translated. The module has no closure baked in; the summary reports `closures: 'none-configured'`, which means "none were passed", not "none exist".

### 6. Summary states and headlines

- `open`: scheduled open now.
- `opens-later-today`: closed, next opening on the same Warsaw calendar date.
- `opens-in-days`: next opening 1 or more calendar days away. Headline uses "tomorrow" for 1, the weekday for 2 or more.
- `closed`: no opening found within 400 days (empty schedule, or a longer closure).
- On a night removed by a closure the headline is `tonight.closedTonight` while the state still says when it reopens.
- `night` is the night the card is about (current when open, next opening otherwise). `instantBelongsTo` is the business night of the instant itself.
- `countdownSeconds` rounds up, so a countdown never shows 0 with time left. `formatDuration` also rounds up to whole minutes.

### 7. Arrival window and the 30 minute rule

- Window 22:00 to 23:00 of the relevant night, both edges inclusive (arriving at 23:00:00 is "between 22:00 and 23:00"). **Rec**.
- Relevant night: the first night that takes place and has not ended. After 23:00 on a running night the status is `ended` and `next` holds the following night.
- Release moment = arrival time + 30 real minutes. At exactly +30:00 the table is still held (`grace`); "more than 30 minutes" starts one millisecond later (`may-be-released`). The status says "may", as the terms do.
- An arrival after midnight (`00:30`) belongs to the next calendar day and reports `arrivalInWindow: false`.
- **PENDING (Ignacy)**: the terms say a guest "more than 30 minutes late" may lose the table, but not late relative to what. This module measures from the arrival time the guest gave. If the club counts from the end of the pickup window (23:00), the release is 23:30 for everyone. Pass `arrival.releaseAfterMinutes` in the schedule for the number; the reference point needs a small code change once the club answers. `dataProvenance.releaseReference` is `assumption` until then.

### 8. Strings (Assumption for de/it/cs, Rec for pl and en)

Twelve headline and phase strings per locale, plus `on.<weekday>` phrases and three duration words (`MESSAGES`), plus unit forms for days, hours and minutes (`UNITS`). The tests check that all five locales have the same keys and the same `{variables}`.

| Key | pl | en |
|---|---|---|
| `tonight.open` | Otwarte do {time} | Open until {time} |
| `tonight.opensLater` | Dziś otwieramy o {time} | We open tonight at {time} |
| `tonight.opensTomorrow` | Jutro otwieramy o {time} | We open tomorrow at {time} |
| `tonight.opensInDays` | Otwieramy {on} o {time} | We open {on} at {time} |
| `tonight.closedTonight` | Dziś zamknięte | Closed tonight |
| `tonight.closed` | Zamknięte | Closed |
| `phase.doors` | Drzwi otwarte | Doors open |
| `phase.live` | Muzyka na żywo przy barze | Live music at the bar |
| `phase.djs` | DJ-e za konsoletą | DJs on the decks |
| `phase.liveOrDjs` | Muzyka na żywo, później DJ-e | Live music, then DJs |
| `phase.lastHour` | Ostatnia godzina | Last hour |
| `phase.closing` | Zaraz zamykamy | Closing soon |

| Key | de | it | cs |
|---|---|---|---|
| `tonight.open` | Geöffnet bis {time} Uhr | Aperto fino alle {time} | Otevřeno do {time} |
| `tonight.opensLater` | Heute ab {time} Uhr geöffnet | Stasera apriamo alle {time} | Dnes otevíráme od {time} |
| `tonight.opensTomorrow` | Morgen ab {time} Uhr geöffnet | Domani apriamo alle {time} | Zítra otevíráme od {time} |
| `tonight.opensInDays` | Wir öffnen {on} um {time} Uhr | Apriamo {on} alle {time} | Otevíráme {on} od {time} |
| `tonight.closedTonight` | Heute geschlossen | Stasera chiuso | Dnes zavřeno |
| `tonight.closed` | Geschlossen | Chiuso | Zavřeno |
| `phase.doors` | Einlass | Ingresso aperto | Vstup otevřen |
| `phase.live` | Live-Musik an der Bar | Musica dal vivo al bar | Živá hudba u baru |
| `phase.djs` | DJs am Pult | DJ in consolle | DJ za mixpultem |
| `phase.liveOrDjs` | Live-Musik, danach DJs | Musica dal vivo, poi DJ | Živá hudba, poté DJ |
| `phase.lastHour` | Letzte Stunde | Ultima ora | Poslední hodina |
| `phase.closing` | Wir schließen gleich | Stiamo per chiudere | Brzy zavíráme |

**de, it and cs need native review before launch (Assumption).** They are short strings written for this module, not taken from the site's own translations. Known weak spots for the reviewer: Italian "alle {time}" is wrong if a schedule ever opens at 01:00 ("all'una"); Czech avoids a preposition before the hour ("od 22:00") to sidestep v/ve; German "Einlass" may not suit a venue with a table-reservation entry. Polish should get one read from a native speaker too; the plural forms are checked mechanically, the phrasing is not.

Grammar and typography (**Confirmed** by tests):

- Plural forms come from `Intl.PluralRules` per locale. Polish minutes, hours and days are checked for every value against an independent one/few/many rule (1 minutę, 2 minuty, 5 minut, 22 minuty, 41 minut, 12 godzin, 22 godziny, 1 dzień, 2 dni, 5 dni).
- After "za" the units are in the accusative where Polish and Czech need it ("za 1 godzinę", "za 1 hodinu"); German uses the dative plural for days ("in 3 Tagen").
- A number is always joined to its unit by U+00A0. Polish and Czech also bind one-letter words (o, w, i, a, v) to the next word. A test scans all outputs in all locales for a plain space after a digit and finds none.
- Times are 24-hour `HH:MM`.
- Unknown locales fall back to Polish, the site default (`src/data/site.ts:33`); `en-GB` maps to `en`.

## Test results (Confirmed, run on 2026-09-29, Node v22.22.2)

Command: `cd docs/sisi-elevate/playground-src/lib && node --test night.test.mjs`

```
# tests 228
# suites 16
# pass 228
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3002.758742
```

Command: `./run-tz.sh` (loops `TZ=<zone> node --test --test-reporter=tap night.test.mjs`):

```
TZ=UTC                  tests=228 pass=228 fail=0 exit=0
  device: UTC (TZ=UTC)
  fingerprint: 69f9012301b4484e906c39e883517700a26f992c73d425b86dfc625c6e08cb3d
TZ=America/Los_Angeles  tests=228 pass=228 fail=0 exit=0
  device: America/Los_Angeles (TZ=America/Los_Angeles)
  fingerprint: 69f9012301b4484e906c39e883517700a26f992c73d425b86dfc625c6e08cb3d
TZ=Asia/Tokyo           tests=228 pass=228 fail=0 exit=0
  device: Asia/Tokyo (TZ=Asia/Tokyo)
  fingerprint: 69f9012301b4484e906c39e883517700a26f992c73d425b86dfc625c6e08cb3d
ALL TIMEZONES PASS, fingerprints identical
```

The "device" line comes from `Intl.DateTimeFormat().resolvedOptions().timeZone` inside the run, so the loop demonstrably changed the process timezone. The fingerprint is a SHA-256 over the JSON of 288 instants (hourly plus an offset) across both DST weekends and the new year, for every function and locale; identical in the three runs.

Tests per group:

| Group | Tests |
|---|---|
| environment (device TZ, input validation) | 2 |
| `warsawParts` (including EU transitions 2026 to 2035) | 6 |
| local time to instant (ambiguous, gap) | 4 |
| every weekday at the 10 probe times, summer and winter week, plus the 12:00 next-opening table | 141 |
| Friday to Saturday and Saturday to Sunday boundaries | 3 |
| DST nights hour by hour, durations, cross-DST countdowns | 5 |
| minute sweeps against a hand-written UTC oracle (summer, winter, both DST weekends) | 4 |
| schedule is data (non-crossing night, 05:00 closing, bad schedules) | 3 |
| year, month, leap boundaries | 7 |
| closures | 11 |
| phases | 9 |
| `tonightSummary` | 11 |
| messages, plurals, typography | 7 |
| `arrivalWindow`, `tableRelease` | 12 |
| purity (no clock, no device-local getters, inputs unmutated) | 2 |
| cross-timezone fingerprint | 1 |

Calendar facts the tests rely on were checked separately with `Date.UTC` weekday calculations: 2026-09-28 Mon; 2026-10-25 Sun; 2027-03-28 Sun; 2026-12-31 Thu; 2027-01-01 Fri; 2027-12-31 Fri (a Friday night straddling New Year); 2028-02-29 Tue; 2032-02-29 Sun; 2036-02-29 Fri.

### Does the suite catch bugs? (Confirmed, mutation check)

Thirteen deliberate one-line breakages were applied to a scratch copy, one at a time, and the suite run against each. Twelve failed on the first run: window end as start plus 6 h (9 failures), later pass chosen for the ambiguous hour (2), gap shifted backward (2), business cutoff removed (81), progress by wall clock (5), wrong timezone (187), 24-hour clock bug at midnight (53), Polish "many" form wrong (4), release boundary inclusive/exclusive swapped (1), closure end exclusive (9), last hour measured in wall clock (2), and a device-local getter (1, caught by the purity test). One survived: an inclusive window end. At the exact end instant the business date flips, so this only matters for a schedule that does not cross midnight, which the first draft of the tests never used. The "schedule is data" group was added for that, and the mutant now fails.

### One test expectation was wrong, not the code

While adding the "schedule is data" group I first asserted that 02:00 on Thursday 2026-10-01 belongs to 2026-10-01 under a custom schedule whose latest closing is 05:00. The rule (local time before the 05:00 cutoff belongs to the previous calendar date) gives 2026-09-30, a Wednesday: 2026-10-01 minus one day. The code was right; I corrected my new assertion and left the module alone. No other test was changed to make it pass.

## Limits and notes

- Cost: about 90 to 110 microseconds per call to `businessNight`, `tonightSummary` or `arrivalWindow` (5000-call loop in Node 22, `performance.now`). A one-second UI tick is fine; nothing needs caching.
- `dateLabel` in the summary (for example "piątek, 2 października") uses `Intl.DateTimeFormat` with the locale. It needs ICU data for that locale; Node 22 and current browsers ship it.
- Sub-second parts of an instant are dropped in `warsawParts` and `toWarsawIso`. Window edges are whole minutes, so no result depends on them.
- The lookahead for the next opening is 400 days (`MAX_LOOKAHEAD_DAYS`).
- Invalid config or schedule throws `RangeError` or `TypeError` with a message that names the field. Run `validateConfig` when the config is built, and keep a `try/catch` around the runtime call in the UI so a bad config degrades to the plain hours instead of a blank card. **Rec**.

## PENDING (Ignacy)

1. DJ handover time and the lineup source per night. Until then the card shows `[DJ-START?]` and `[LINEUP?]` and the middle of the night reads "Muzyka na żywo, później DJ-e".
2. Phase lengths: doors 30 min, last hour 60 min, closing 15 min are presentation defaults (Assumption).
3. The reference point of the 30 minute rule: the guest's arrival time (as built) or the end of the 22:00 to 23:00 pickup window.
4. Native review of de, it and cs strings, and one Polish read of the headlines.
5. Whether to show a closure `reason` publicly, and the start date of any future closure (the module needs `from` and `to`).
