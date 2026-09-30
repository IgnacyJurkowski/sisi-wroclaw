/* SiSi Wroclaw "Tonight" logic (Innovation I1).
 *
 * Pure, dependency-free, ES module. Nothing here reads the clock: every public
 * function takes the instant to evaluate as its first argument, so a UI passes
 * the current time and a test passes a fixed value. The viewer's device timezone is
 * never consulted: all calendar work is done in Europe/Warsaw through
 * Intl.DateTimeFormat with an explicit timeZone.
 *
 * Facts used (Confirmed in the repo): open Friday and Saturday 22:00-04:00,
 * Europe/Warsaw (src/lib/opening-hours.mjs, src/data/site.ts CONTACT.hours,
 * src/i18n/ui/pl.ts). Arrival window 22:00-23:00 and the "more than 30 minutes
 * late" table rule come from src/i18n/ui/pl.ts (reservationsPage).
 *
 * Not known, so never invented: the time the DJs take over, the lineup. Both
 * are configuration that defaults to null and renders as the placeholders
 * `[DJ-START?]` and `[LINEUP?]`.
 *
 * See night.md for the decisions (business night, DST rule, phase lengths).
 */

export const TIME_ZONE = 'Europe/Warsaw';
export const PLACEHOLDERS = Object.freeze({ lineup: '[LINEUP?]', djStart: '[DJ-START?]' });
export const WEEKDAY_KEYS = Object.freeze([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);
export const LOCALES = Object.freeze(['pl', 'en', 'de', 'it', 'cs']);
export const DEFAULT_LOCALE = 'pl';
/** How far next-opening searches look ahead. Long enough for a summer break. */
export const MAX_LOOKAHEAD_DAYS = 400;

const MS_MIN = 60_000;
const MS_DAY = 86_400_000;
const NB = ' '; // non-breaking space

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/** Published schedule (Confirmed). Weekday numbers follow JS: 0 = Sunday. */
export const DEFAULT_SCHEDULE = deepFreeze({
  nights: [
    { weekday: 5, opens: '22:00', closes: '04:00' },
    { weekday: 6, opens: '22:00', closes: '04:00' },
  ],
  /**
   * Optional: [{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', reason: string, weekdays?: number[] }].
   * from/to are night START dates, inclusive. `weekdays` (0 = Sunday) limits the
   * closure to those nights, e.g. [5] for a Friday-only break; omit it to close every night in range.
   */
  closures: [],
  /** Reservation pickup window and table release rule (Confirmed, pl.ts reservationsPage). */
  arrival: { from: '22:00', to: '23:00', releaseAfterMinutes: 30 },
});

/**
 * Night configuration. djStart and lineup are unknown (null). The three phase
 * lengths are presentation choices, not venue facts (Assumption).
 */
export const DEFAULT_CONFIG = deepFreeze({
  djStart: null, // 'HH:MM' local, or null while unknown
  lineup: null, // null, or [{ kind: 'live' | 'dj', name: string | null, start: 'HH:MM' | null }]
  doorsMinutes: 30,
  lastHourMinutes: 60,
  closingMinutes: 15,
  nights: {}, // per-night overrides by night start date: { 'YYYY-MM-DD': { djStart, lineup } }
});

/* ------------------------------------------------------------------ */
/* Instants, Warsaw wall clock                                        */
/* ------------------------------------------------------------------ */

/**
 * Normalise an instant to epoch milliseconds. Accepts a number, a Date, or an
 * ISO string that carries an explicit `Z` or numeric offset. A string without an
 * offset is rejected because Date.parse would read it in the device timezone.
 */
export function toMs(instant) {
  let ms;
  if (typeof instant === 'number') {
    ms = instant;
  } else if (instant instanceof Date) {
    ms = instant.getTime();
  } else if (typeof instant === 'string') {
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(instant.trim())) {
      throw new TypeError(
        `Instant string "${instant}" has no Z or UTC offset; it would be read in the device timezone.`,
      );
    }
    ms = Date.parse(instant);
  } else {
    throw new TypeError('Instant must be a number, a Date or an ISO string with an offset.');
  }
  if (!Number.isFinite(ms)) throw new TypeError('Instant is not a valid time value.');
  return ms;
}

let partsFormat;
function getPartsFormat() {
  partsFormat ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return partsFormat;
}

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Europe/Warsaw wall-clock parts of an instant. Sub-second precision is dropped.
 * weekday: 0 = Sunday. offsetMinutes: +60 (CET) or +120 (CEST).
 */
export function warsawParts(instant) {
  const ms = toMs(instant);
  const sec = Math.floor(ms / 1000);
  const f = {};
  for (const part of getPartsFormat().formatToParts(new Date(sec * 1000))) {
    if (part.type !== 'literal') f[part.type] = Number(part.value);
  }
  const { year, month, day, hour, minute, second } = f;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = (wall - sec * 1000) / MS_MIN;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    weekday,
    weekdayKey: WEEKDAY_KEYS[weekday],
    hour,
    minute,
    second,
    offsetMinutes,
    zone: offsetMinutes === 120 ? 'CEST' : offsetMinutes === 60 ? 'CET' : `UTC${offsetMinutes >= 0 ? '+' : '-'}${Math.abs(offsetMinutes)}m`,
    dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
    timeKey: `${pad2(hour)}:${pad2(minute)}`,
  };
}

/** ISO 8601 string in Warsaw local time with offset, for example 2026-10-24T22:00:00+02:00. */
export function toWarsawIso(instant) {
  const p = warsawParts(instant);
  const sign = p.offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(p.offsetMinutes);
  return `${p.dateKey}T${p.timeKey}:${pad2(p.second)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/* ------------------------------------------------------------------ */
/* Calendar date keys (pure arithmetic, no timezone involved)         */
/* ------------------------------------------------------------------ */

function parseDateKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof key === 'string' ? key : '');
  if (!m) throw new RangeError(`Date "${key}" is not YYYY-MM-DD.`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`Date "${key}" does not exist in the calendar.`);
  }
  return { y, mo, d };
}

function keyOfUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(key, n) {
  const { y, mo, d } = parseDateKey(key);
  return keyOfUtc(Date.UTC(y, mo - 1, d) + n * MS_DAY);
}

function weekdayOfKey(key) {
  const { y, mo, d } = parseDateKey(key);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function daysBetweenKeys(a, b) {
  const pa = parseDateKey(a);
  const pb = parseDateKey(b);
  return Math.round((Date.UTC(pb.y, pb.mo - 1, pb.d) - Date.UTC(pa.y, pa.mo - 1, pa.d)) / MS_DAY);
}

function parseTime(value) {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(typeof value === 'string' ? value : '');
  if (!m) throw new RangeError(`Time "${value}" is not HH:MM.`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  const s = m[3] === undefined ? 0 : Number(m[3]);
  if (h > 23 || mi > 59 || s > 59) throw new RangeError(`Time "${value}" is out of range.`);
  return { h, mi, s, minutes: h * 60 + mi };
}

/* ------------------------------------------------------------------ */
/* Local wall clock -> instant                                        */
/* ------------------------------------------------------------------ */

/**
 * Resolve a Warsaw wall-clock time on a calendar date to an instant.
 *
 * Rule (same as Temporal's "compatible" disambiguation):
 *  - unique local time: that instant.
 *  - ambiguous (clocks go back, 02:00-02:59 occurs twice): the EARLIER instant
 *    (the first pass, summer time).
 *  - non-existent (clocks go forward, 02:00-02:59 skipped): shift FORWARD by the
 *    length of the gap, so 02:30 becomes 03:30 summer time.
 *
 * Returns { ms, kind: 'exact' | 'ambiguous' | 'gap' }.
 */
export function resolveLocal(dateKey, time) {
  const { y, mo, d } = parseDateKey(dateKey);
  const { h, mi, s } = parseTime(time);
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetAt = (ms) => warsawParts(ms).offsetMinutes;
  const before = offsetAt(wall - MS_DAY);
  const after = offsetAt(wall + MS_DAY);
  const valid = [];
  for (const off of new Set([before, after])) {
    const t = wall - off * MS_MIN;
    if (t + offsetAt(t) * MS_MIN === wall) valid.push(t);
  }
  if (valid.length === 2) return { ms: Math.min(...valid), kind: 'ambiguous' };
  if (valid.length === 1) return { ms: valid[0], kind: 'exact' };
  return { ms: wall - before * MS_MIN, kind: 'gap' };
}

/** Convenience wrapper around resolveLocal that returns only the instant. */
export function localToInstant(dateKey, time) {
  return resolveLocal(dateKey, time).ms;
}

/* ------------------------------------------------------------------ */
/* Schedule                                                           */
/* ------------------------------------------------------------------ */

function normalizeSchedule(schedule = DEFAULT_SCHEDULE) {
  if (!schedule || typeof schedule !== 'object') throw new TypeError('Schedule must be an object.');
  const byWeekday = new Map();
  for (const n of schedule.nights ?? []) {
    if (!Number.isInteger(n.weekday) || n.weekday < 0 || n.weekday > 6) {
      throw new RangeError(`Schedule weekday ${n.weekday} must be an integer 0-6 (0 = Sunday).`);
    }
    if (byWeekday.has(n.weekday)) throw new RangeError(`Schedule lists weekday ${n.weekday} twice.`);
    const opensMin = parseTime(n.opens).minutes;
    const closesMin = parseTime(n.closes).minutes;
    if (opensMin === closesMin) throw new RangeError('A night cannot open and close at the same time.');
    byWeekday.set(n.weekday, {
      weekday: n.weekday,
      opens: n.opens,
      closes: n.closes,
      opensMin,
      closesMin,
      crosses: closesMin < opensMin,
    });
  }
  const closures = (schedule.closures ?? []).map((c) => {
    parseDateKey(c?.from);
    parseDateKey(c?.to);
    if (c.from > c.to) throw new RangeError(`Closure from ${c.from} is after to ${c.to}.`);
    if (c.reason != null && typeof c.reason !== 'string') throw new TypeError('Closure reason must be a string.');
    if (c.weekdays != null) {
      if (!Array.isArray(c.weekdays) || c.weekdays.length === 0 || !c.weekdays.every((w) => Number.isInteger(w) && w >= 0 && w <= 6)) {
        throw new RangeError('Closure weekdays must be a non-empty array of integers 0-6 (0 = Sunday).');
      }
    }
    return { from: c.from, to: c.to, reason: c.reason ?? null, weekdays: c.weekdays ? [...c.weekdays] : null };
  });
  const a = { ...DEFAULT_SCHEDULE.arrival, ...(schedule.arrival ?? {}) };
  const from = parseTime(a.from);
  const to = parseTime(a.to);
  if (to.minutes <= from.minutes) throw new RangeError('Arrival window must end after it starts.');
  if (!(a.releaseAfterMinutes >= 0) || !Number.isFinite(a.releaseAfterMinutes)) {
    throw new RangeError('releaseAfterMinutes must be a non-negative number.');
  }
  // A local time earlier than this belongs to the previous calendar date's night.
  let cutoffMin = 0;
  for (const def of byWeekday.values()) if (def.crosses) cutoffMin = Math.max(cutoffMin, def.closesMin);
  return { byWeekday, closures, arrival: a, cutoffMin };
}

function findClosure(dateKey, weekday, closures) {
  for (const c of closures) {
    if (dateKey >= c.from && dateKey <= c.to && (c.weekdays === null || c.weekdays.includes(weekday))) {
      return { from: c.from, to: c.to, reason: c.reason, weekdays: c.weekdays };
    }
  }
  return null;
}

/** The night is identified by the calendar date on which it STARTS. */
function describeNight(dateKey, sch) {
  const weekday = weekdayOfKey(dateKey);
  const def = sch.byWeekday.get(weekday) ?? null;
  const closure = def ? findClosure(dateKey, weekday, sch.closures) : null;
  let window = null;
  if (def) {
    const start = resolveLocal(dateKey, def.opens);
    const end = resolveLocal(def.crosses ? addDays(dateKey, 1) : dateKey, def.closes);
    window = {
      startMs: start.ms,
      endMs: end.ms,
      durationMs: end.ms - start.ms,
      start: toWarsawIso(start.ms),
      end: toWarsawIso(end.ms),
      opens: def.opens,
      closes: def.closes,
      crossesMidnight: def.crosses,
    };
  }
  return {
    date: dateKey,
    weekday,
    weekdayKey: WEEKDAY_KEYS[weekday],
    scheduled: def !== null,
    closure,
    takesPlace: def !== null && closure === null,
    window,
  };
}

/** Resolve an 'HH:MM' that belongs to a night (00:30 on a 22:00-04:00 night is the next calendar day). */
function nightTimeToMs(night, hhmm) {
  const { minutes } = parseTime(hhmm);
  const opensMin = parseTime(night.window.opens).minutes;
  const key = night.window.crossesMidnight && minutes < opensMin ? addDays(night.date, 1) : night.date;
  return resolveLocal(key, hhmm).ms;
}

function businessDateKey(parts, sch) {
  const minutesOfDay = parts.hour * 60 + parts.minute;
  return minutesOfDay < sch.cutoffMin ? addDays(parts.dateKey, -1) : parts.dateKey;
}

function findNextOpening(t, fromDateKey, sch) {
  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i += 1) {
    const night = describeNight(addDays(fromDateKey, i), sch);
    if (night.takesPlace && night.window.startMs > t) return night;
  }
  return null;
}

function openingFrom(night, t, todayKey) {
  const w = night.window;
  return {
    date: night.date,
    weekday: night.weekday,
    weekdayKey: night.weekdayKey,
    time: warsawParts(w.startMs).timeKey,
    startMs: w.startMs,
    start: w.start,
    msUntil: w.startMs - t,
    minutesUntil: (w.startMs - t) / MS_MIN,
    daysAway: daysBetweenKeys(todayKey, night.date),
    night,
  };
}

/** Real-time fraction of a window elapsed at an instant, clamped to 0..1. */
export function nightProgress(instant, window) {
  const t = toMs(instant);
  if (!window) return null;
  const raw = (t - window.startMs) / (window.endMs - window.startMs);
  return Math.min(1, Math.max(0, raw));
}

function businessNightInternal(t, sch) {
  const parts = warsawParts(t);
  const night = describeNight(businessDateKey(parts, sch), sch);
  const w = night.window;
  const inWindow = w !== null && t >= w.startMs && t < w.endMs;
  const open = inWindow && night.takesPlace;
  const nextNight = findNextOpening(t, parts.dateKey, sch);
  const next = nextNight ? openingFrom(nextNight, t, parts.dateKey) : null;
  return { t, parts, night, inWindow, open, next };
}

/**
 * Which business night an instant belongs to, and where it sits in it.
 *
 * Business-night rule: a local time before the closing cutoff (04:00 for the
 * published schedule) belongs to the previous calendar date's night. 02:00 on
 * Saturday is Friday's night, 02:00 on Sunday is Saturday's night. The window
 * is half open: open at 03:59:59, closed at 04:00:00.
 *
 * Return fields set to null when not applicable: progress (only while open),
 * msUntilClose (only while open), msUntilOpen (null while open; see `next`).
 */
export function businessNight(instant, schedule = DEFAULT_SCHEDULE) {
  const t = toMs(instant);
  const sch = normalizeSchedule(schedule);
  const b = businessNightInternal(t, sch);
  const msUntilClose = b.open ? b.night.window.endMs - t : null;
  const msUntilOpen = b.open || !b.next ? null : b.next.msUntil;
  return {
    instant: t,
    local: b.parts,
    night: b.night,
    inWindow: b.inWindow,
    open: b.open,
    progress: b.open ? nightProgress(t, b.night.window) : null,
    msUntilClose,
    minutesUntilClose: msUntilClose === null ? null : msUntilClose / MS_MIN,
    msUntilOpen,
    minutesUntilOpen: msUntilOpen === null ? null : msUntilOpen / MS_MIN,
    next: b.next,
  };
}

/** The window of the night that starts on a given date (null if not a scheduled weekday). */
export function nightWindow(dateKey, schedule = DEFAULT_SCHEDULE) {
  return describeNight(dateKey, normalizeSchedule(schedule));
}

/* ------------------------------------------------------------------ */
/* Config, phases                                                     */
/* ------------------------------------------------------------------ */

function checkLineup(lineup, where) {
  if (lineup == null) return;
  if (!Array.isArray(lineup)) throw new TypeError(`${where}.lineup must be null or an array.`);
  for (const slot of lineup) {
    if (slot?.kind !== 'live' && slot?.kind !== 'dj') throw new RangeError(`${where}.lineup slot kind must be "live" or "dj".`);
    if (slot.name != null && (typeof slot.name !== 'string' || slot.name.trim() === '')) {
      throw new TypeError(`${where}.lineup slot name must be a non-empty string or null.`);
    }
    if (slot.start != null) parseTime(slot.start);
  }
}

function resolveNightConfig(config, dateKey) {
  const base = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  for (const key of ['doorsMinutes', 'lastHourMinutes', 'closingMinutes']) {
    if (!Number.isFinite(base[key]) || base[key] < 0) throw new RangeError(`config.${key} must be a non-negative number.`);
  }
  if (base.lastHourMinutes <= 0) throw new RangeError('config.lastHourMinutes must be above 0.');
  if (base.closingMinutes > base.lastHourMinutes) throw new RangeError('config.closingMinutes cannot exceed lastHourMinutes.');
  if (base.djStart != null) parseTime(base.djStart);
  checkLineup(base.lineup, 'config');
  const override = base.nights?.[dateKey];
  const merged = { ...base, ...(override ?? {}) };
  if (override) {
    if (merged.djStart != null) parseTime(merged.djStart);
    checkLineup(merged.lineup, `config.nights[${dateKey}]`);
  }
  merged.djStart = merged.djStart ?? null;
  merged.lineup = merged.lineup ?? null;
  return merged;
}

/**
 * Throws RangeError/TypeError when the config (or any per-night override) is
 * unusable for the schedule. Call at build time; the runtime functions throw the
 * same errors lazily for the night they evaluate.
 */
export function validateConfig(config, schedule = DEFAULT_SCHEDULE) {
  const sch = normalizeSchedule(schedule);
  resolveNightConfig(config, '1970-01-01');
  for (const dateKey of Object.keys(config?.nights ?? {})) {
    const cfg = resolveNightConfig(config, dateKey);
    const night = describeNight(dateKey, sch);
    if (night.window && cfg.djStart != null) buildTimeline(night, cfg);
  }
  return config;
}

function buildTimeline(night, cfg) {
  const { startMs, endMs } = night.window;
  const doorsEnd = Math.min(startMs + cfg.doorsMinutes * MS_MIN, endMs);
  const lastHourStart = Math.max(doorsEnd, endMs - cfg.lastHourMinutes * MS_MIN);
  const closingStart = Math.max(lastHourStart, endMs - cfg.closingMinutes * MS_MIN);
  const segments = [{ phase: 'doors', from: startMs, to: doorsEnd }];
  if (cfg.djStart == null) {
    segments.push({ phase: 'live-or-djs-unknown', from: doorsEnd, to: lastHourStart });
  } else {
    const dj = nightTimeToMs(night, cfg.djStart);
    if (!(dj > startMs && dj < endMs)) {
      throw new RangeError(`djStart ${cfg.djStart} falls outside the night of ${night.date} (${night.window.opens}-${night.window.closes}).`);
    }
    const djFrom = Math.min(Math.max(dj, doorsEnd), lastHourStart);
    segments.push({ phase: 'live', from: doorsEnd, to: djFrom }, { phase: 'djs', from: djFrom, to: lastHourStart });
  }
  segments.push(
    { phase: 'last-hour', from: lastHourStart, to: closingStart },
    { phase: 'closing', from: closingStart, to: endMs },
  );
  return segments.filter((s) => s.to > s.from);
}

const PHASE_KEYS = Object.freeze({
  doors: 'phase.doors',
  live: 'phase.live',
  djs: 'phase.djs',
  'live-or-djs-unknown': 'phase.liveOrDjs',
  'last-hour': 'phase.lastHour',
  closing: 'phase.closing',
});

function phaseFrom(b, config) {
  const { t } = b;
  const nightRef = { date: b.night.date, weekday: b.night.weekday, weekdayKey: b.night.weekdayKey };
  if (!b.open) {
    const at = b.next ? b.next.startMs : null;
    return {
      phase: 'closed',
      night: nightRef,
      phaseKey: null,
      nextPhase: b.next ? 'doors' : null,
      nextChangeMs: at,
      msToNextChange: at === null ? null : at - t,
      minutesToNextChange: at === null ? null : (at - t) / MS_MIN,
      unknownBoundary: false,
    };
  }
  const cfg = resolveNightConfig(config, b.night.date);
  const timeline = buildTimeline(b.night, cfg);
  const i = timeline.findIndex((s) => t >= s.from && t < s.to);
  const seg = timeline[i];
  const nextSeg = timeline[i + 1] ?? null;
  const at = seg.to;
  return {
    phase: seg.phase,
    night: nightRef,
    phaseKey: PHASE_KEYS[seg.phase],
    nextPhase: nextSeg ? nextSeg.phase : 'closed',
    nextChangeMs: at,
    msToNextChange: at - t,
    minutesToNextChange: (at - t) / MS_MIN,
    // In live-or-djs-unknown the live to DJ handover happens somewhere inside the
    // segment. The boundary reported here is the next KNOWN one.
    unknownBoundary: seg.phase === 'live-or-djs-unknown',
  };
}

/**
 * Phase of the night at an instant: closed, doors, live, djs, last-hour,
 * closing, or live-or-djs-unknown while config.djStart is null.
 */
export function phaseOfNight(instant, schedule = DEFAULT_SCHEDULE, config = DEFAULT_CONFIG) {
  const t = toMs(instant);
  return phaseFrom(businessNightInternal(t, normalizeSchedule(schedule)), config);
}

/* ------------------------------------------------------------------ */
/* Messages, plural rules, durations                                  */
/* ------------------------------------------------------------------ */

/*
 * pl and en are the reviewed baseline. de, it and cs are machine-quality
 * translations of short strings and need a native review before launch.
 * Polish and Czech keep single-letter words (o, w, i, a, v) glued to the next
 * word with a non-breaking space; numbers are glued to their unit.
 */
export const MESSAGES = deepFreeze({
  pl: {
    'tonight.open': 'Otwarte do {time}',
    'tonight.opensLater': `Dziś otwieramy o${NB}{time}`,
    'tonight.opensTomorrow': `Jutro otwieramy o${NB}{time}`,
    'tonight.opensInDays': `Otwieramy {on} o${NB}{time}`,
    'tonight.closedTonight': 'Dziś zamknięte',
    'tonight.closed': 'Zamknięte',
    'phase.doors': 'Drzwi otwarte',
    'phase.live': 'Muzyka na żywo przy barze',
    'phase.djs': 'DJ-e za konsoletą',
    'phase.liveOrDjs': 'Muzyka na żywo, później DJ-e',
    'phase.lastHour': 'Ostatnia godzina',
    'phase.closing': 'Zaraz zamykamy',
    'on.sunday': `w${NB}niedzielę`,
    'on.monday': `w${NB}poniedziałek`,
    'on.tuesday': `we${NB}wtorek`,
    'on.wednesday': `w${NB}środę`,
    'on.thursday': `w${NB}czwartek`,
    'on.friday': `w${NB}piątek`,
    'on.saturday': `w${NB}sobotę`,
    'duration.in': 'za {duration}',
    'duration.now': 'teraz',
    'duration.and': ` i${NB}`,
  },
  en: {
    'tonight.open': 'Open until {time}',
    'tonight.opensLater': 'We open tonight at {time}',
    'tonight.opensTomorrow': 'We open tomorrow at {time}',
    'tonight.opensInDays': 'We open {on} at {time}',
    'tonight.closedTonight': 'Closed tonight',
    'tonight.closed': 'Closed',
    'phase.doors': 'Doors open',
    'phase.live': 'Live music at the bar',
    'phase.djs': 'DJs on the decks',
    'phase.liveOrDjs': 'Live music, then DJs',
    'phase.lastHour': 'Last hour',
    'phase.closing': 'Closing soon',
    'on.sunday': 'on Sunday',
    'on.monday': 'on Monday',
    'on.tuesday': 'on Tuesday',
    'on.wednesday': 'on Wednesday',
    'on.thursday': 'on Thursday',
    'on.friday': 'on Friday',
    'on.saturday': 'on Saturday',
    'duration.in': 'in {duration}',
    'duration.now': 'now',
    'duration.and': ' and ',
  },
  de: {
    'tonight.open': `Geöffnet bis {time}${NB}Uhr`,
    'tonight.opensLater': `Heute ab {time}${NB}Uhr geöffnet`,
    'tonight.opensTomorrow': `Morgen ab {time}${NB}Uhr geöffnet`,
    'tonight.opensInDays': `Wir öffnen {on} um {time}${NB}Uhr`,
    'tonight.closedTonight': 'Heute geschlossen',
    'tonight.closed': 'Geschlossen',
    'phase.doors': 'Einlass',
    'phase.live': 'Live-Musik an der Bar',
    'phase.djs': 'DJs am Pult',
    'phase.liveOrDjs': 'Live-Musik, danach DJs',
    'phase.lastHour': 'Letzte Stunde',
    'phase.closing': 'Wir schließen gleich',
    'on.sunday': 'am Sonntag',
    'on.monday': 'am Montag',
    'on.tuesday': 'am Dienstag',
    'on.wednesday': 'am Mittwoch',
    'on.thursday': 'am Donnerstag',
    'on.friday': 'am Freitag',
    'on.saturday': 'am Samstag',
    'duration.in': 'in {duration}',
    'duration.now': 'jetzt',
    'duration.and': ' und ',
  },
  it: {
    'tonight.open': 'Aperto fino alle {time}',
    'tonight.opensLater': 'Stasera apriamo alle {time}',
    'tonight.opensTomorrow': 'Domani apriamo alle {time}',
    'tonight.opensInDays': 'Apriamo {on} alle {time}',
    'tonight.closedTonight': 'Stasera chiuso',
    'tonight.closed': 'Chiuso',
    'phase.doors': 'Ingresso aperto',
    'phase.live': 'Musica dal vivo al bar',
    'phase.djs': 'DJ in consolle',
    'phase.liveOrDjs': 'Musica dal vivo, poi DJ',
    'phase.lastHour': 'Ultima ora',
    'phase.closing': 'Stiamo per chiudere',
    'on.sunday': 'domenica',
    'on.monday': 'lunedì',
    'on.tuesday': 'martedì',
    'on.wednesday': 'mercoledì',
    'on.thursday': 'giovedì',
    'on.friday': 'venerdì',
    'on.saturday': 'sabato',
    'duration.in': 'tra {duration}',
    'duration.now': 'ora',
    'duration.and': ' e ',
  },
  cs: {
    'tonight.open': 'Otevřeno do {time}',
    'tonight.opensLater': `Dnes otevíráme od${NB}{time}`,
    'tonight.opensTomorrow': `Zítra otevíráme od${NB}{time}`,
    'tonight.opensInDays': `Otevíráme {on} od${NB}{time}`,
    'tonight.closedTonight': 'Dnes zavřeno',
    'tonight.closed': 'Zavřeno',
    'phase.doors': 'Vstup otevřen',
    'phase.live': 'Živá hudba u baru',
    'phase.djs': 'DJ za mixpultem',
    'phase.liveOrDjs': 'Živá hudba, poté DJ',
    'phase.lastHour': 'Poslední hodina',
    'phase.closing': 'Brzy zavíráme',
    'on.sunday': `v${NB}neděli`,
    'on.monday': `v${NB}pondělí`,
    'on.tuesday': `v${NB}úterý`,
    'on.wednesday': `ve${NB}středu`,
    'on.thursday': `ve${NB}čtvrtek`,
    'on.friday': `v${NB}pátek`,
    'on.saturday': `v${NB}sobotu`,
    'duration.in': 'za {duration}',
    'duration.now': 'teď',
    'duration.and': ` a${NB}`,
  },
});

/** Unit forms by Intl.PluralRules category (accusative after "za" / "in" where the language needs it). */
const UNITS = deepFreeze({
  pl: {
    day: { one: 'dzień', few: 'dni', many: 'dni', other: 'dnia' },
    hour: { one: 'godzinę', few: 'godziny', many: 'godzin', other: 'godziny' },
    minute: { one: 'minutę', few: 'minuty', many: 'minut', other: 'minuty' },
  },
  en: {
    day: { one: 'day', other: 'days' },
    hour: { one: 'hour', other: 'hours' },
    minute: { one: 'minute', other: 'minutes' },
  },
  de: {
    day: { one: 'Tag', other: 'Tagen' },
    hour: { one: 'Stunde', other: 'Stunden' },
    minute: { one: 'Minute', other: 'Minuten' },
  },
  it: {
    day: { one: 'giorno', other: 'giorni' },
    hour: { one: 'ora', other: 'ore' },
    minute: { one: 'minuto', other: 'minuti' },
  },
  cs: {
    day: { one: 'den', few: 'dny', many: 'dne', other: 'dní' },
    hour: { one: 'hodinu', few: 'hodiny', many: 'hodiny', other: 'hodin' },
    minute: { one: 'minutu', few: 'minuty', many: 'minuty', other: 'minut' },
  },
});

/** Map any locale tag to a supported locale; unknown tags fall back to Polish (the site default). */
export function resolveLocale(locale) {
  if (typeof locale !== 'string') return DEFAULT_LOCALE;
  const primary = locale.toLowerCase().split(/[-_]/)[0];
  return LOCALES.includes(primary) ? primary : DEFAULT_LOCALE;
}

function interpolate(template, vars, key) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in vars)) throw new Error(`Message "${key}" needs variable {${name}}.`);
    return String(vars[name]);
  });
}

/** Look up a message and fill {variables}. Throws on an unknown key or a missing variable. */
export function t(locale, key, vars = {}) {
  const table = MESSAGES[resolveLocale(locale)];
  if (!(key in table)) throw new Error(`Unknown message key "${key}".`);
  return interpolate(table[key], vars, key);
}

const pluralRulesCache = new Map();
function pluralCategory(locale, n) {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules.select(n);
}

/** "2 godziny", "5 godzin", "1 godzinę": count and unit joined by a non-breaking space. */
export function formatUnit(count, unit, locale) {
  const loc = resolveLocale(locale);
  const forms = UNITS[loc][unit];
  const word = forms[pluralCategory(loc, count)] ?? forms.other;
  return `${count}${NB}${word}`;
}

/**
 * Human duration, at most two adjacent units, rounded UP to whole minutes so a
 * countdown never shows 0 while time is left. Days drop the minutes.
 * "2 godziny i 5 minut", "1 godzinę", "4 dni i 17 godzin", "45 minut".
 */
export function formatDuration(seconds, locale = DEFAULT_LOCALE) {
  const loc = resolveLocale(locale);
  const totalMinutes = Math.ceil(Math.max(0, seconds) / 60);
  if (totalMinutes === 0) return t(loc, 'duration.now');
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) {
    parts.push(formatUnit(days, 'day', loc));
    if (hours > 0) parts.push(formatUnit(hours, 'hour', loc));
  } else if (hours > 0) {
    parts.push(formatUnit(hours, 'hour', loc));
    if (minutes > 0) parts.push(formatUnit(minutes, 'minute', loc));
  } else {
    parts.push(formatUnit(minutes, 'minute', loc));
  }
  return parts.join(t(loc, 'duration.and'));
}

/** "za 2 godziny", "in 5 hours". Zero or negative gives the locale's "now". */
export function formatIn(seconds, locale = DEFAULT_LOCALE) {
  const loc = resolveLocale(locale);
  if (Math.ceil(Math.max(0, seconds) / 60) === 0) return t(loc, 'duration.now');
  return t(loc, 'duration.in', { duration: formatDuration(seconds, loc) });
}

const dateLabelCache = new Map();
function dateLabel(locale, ms) {
  let f = dateLabelCache.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' });
    dateLabelCache.set(locale, f);
  }
  return f.format(new Date(ms));
}

/* ------------------------------------------------------------------ */
/* tonightSummary                                                     */
/* ------------------------------------------------------------------ */

function buildLineup(cfg) {
  const djStart = cfg.djStart ?? null;
  const rawSlots =
    cfg.lineup == null
      ? [
          { kind: 'live', name: null, start: null },
          { kind: 'dj', name: null, start: null },
        ]
      : cfg.lineup;
  const slots = rawSlots.map((s) => {
    const start = s.start ?? (s.kind === 'dj' ? djStart : null);
    return {
      kind: s.kind,
      name: s.name ?? null,
      display: s.name ?? PLACEHOLDERS.lineup,
      start,
      startDisplay: start ?? (s.kind === 'dj' ? PLACEHOLDERS.djStart : null),
    };
  });
  const named = slots.filter((s) => s.name !== null).length;
  const shown = new Set();
  if (djStart === null) shown.add(PLACEHOLDERS.djStart);
  if (slots.some((s) => s.name === null)) shown.add(PLACEHOLDERS.lineup);
  return {
    djStart: { value: djStart, display: djStart ?? PLACEHOLDERS.djStart },
    slots,
    status: named === 0 ? 'placeholder' : named === slots.length ? 'configured' : 'partial',
    placeholdersShown: [...shown],
  };
}

/**
 * Everything the "Tonight" card needs, as data. The UI renders `headline`,
 * `countdown.text` and `phase.label`, or re-renders from the keys.
 *
 * state: 'open' | 'closed' | 'opens-later-today' | 'opens-in-days'
 *  - closed means no opening was found in the lookahead (empty schedule, or a
 *    closure longer than MAX_LOOKAHEAD_DAYS).
 *  - opens-later-today: next opening is on the same Warsaw calendar date.
 *  - opens-in-days: next opening is 1 or more calendar days away.
 */
export function tonightSummary(instant, schedule = DEFAULT_SCHEDULE, config = DEFAULT_CONFIG, locale = DEFAULT_LOCALE) {
  const t0 = toMs(instant);
  const loc = resolveLocale(locale);
  const sch = normalizeSchedule(schedule);
  const b = businessNightInternal(t0, sch);
  const next = b.next;

  let state;
  if (b.open) state = 'open';
  else if (!next) state = 'closed';
  else state = next.daysAway === 0 ? 'opens-later-today' : 'opens-in-days';

  let headlineKey;
  let vars = {};
  if (b.open) {
    headlineKey = 'tonight.open';
    vars = { time: warsawParts(b.night.window.endMs).timeKey };
  } else if (b.night.closure) {
    headlineKey = 'tonight.closedTonight';
  } else if (!next) {
    headlineKey = 'tonight.closed';
  } else if (next.daysAway === 0) {
    headlineKey = 'tonight.opensLater';
    vars = { time: next.time };
  } else if (next.daysAway === 1) {
    headlineKey = 'tonight.opensTomorrow';
    vars = { time: next.time };
  } else {
    headlineKey = 'tonight.opensInDays';
    vars = { on: t(loc, `on.${next.weekdayKey}`), time: next.time };
  }

  const applies = b.open || !next ? b.night : next.night;
  const cfg = applies.window ? resolveNightConfig(config, applies.date) : resolveNightConfig(config, '1970-01-01');
  const lineup = buildLineup(cfg);

  const phaseInfo = phaseFrom(b, config);
  const phase = {
    key: phaseInfo.phase,
    labelKey: phaseInfo.phaseKey,
    label: phaseInfo.phaseKey ? t(loc, phaseInfo.phaseKey) : null,
    nextPhase: phaseInfo.nextPhase,
    nextChangeMs: phaseInfo.nextChangeMs,
    minutesToNextChange: phaseInfo.minutesToNextChange,
    unknownBoundary: phaseInfo.unknownBoundary,
  };

  let countdown;
  if (b.open) countdown = { to: 'close', ms: b.night.window.endMs - t0 };
  else if (next) countdown = { to: 'open', ms: next.msUntil };
  else countdown = { to: null, ms: null };
  const seconds = countdown.ms === null ? null : Math.ceil(countdown.ms / 1000);

  const named = lineup.slots.filter((s) => s.name !== null).length;
  const provenance = {
    openingHours: 'confirmed',
    timeZone: 'confirmed',
    djStart: lineup.djStart.value === null ? 'placeholder' : 'configured',
    lineup: lineup.status,
    closures: sch.closures.length > 0 ? 'configured' : 'none-configured',
    phaseLengths: 'assumption',
    hasPlaceholders: lineup.placeholdersShown.length > 0,
    placeholdersShown: lineup.placeholdersShown,
    namedLineupSlots: named,
  };

  return {
    instant: t0,
    locale: loc,
    state,
    headlineKey,
    headline: t(loc, headlineKey, vars),
    countdownSeconds: seconds,
    countdown: {
      to: countdown.to,
      seconds,
      text: seconds === null ? null : formatIn(seconds, loc),
    },
    nextOpen: next
      ? {
          weekdayKey: next.weekdayKey,
          weekday: next.weekday,
          date: next.date,
          time: next.time,
          daysAway: next.daysAway,
          start: next.start,
          startMs: next.startMs,
          onPhrase: t(loc, `on.${next.weekdayKey}`),
          dateLabel: dateLabel(loc, next.startMs),
        }
      : null,
    night: applies,
    instantBelongsTo: b.night,
    closure: b.night.closure,
    progress: b.open ? nightProgress(t0, b.night.window) : null,
    phase,
    lineup,
    dataProvenance: provenance,
  };
}

/* ------------------------------------------------------------------ */
/* Reservation page: arrival window and table release                 */
/* ------------------------------------------------------------------ */

function arrivalBounds(night, sch) {
  const fromMs = nightTimeToMs(night, sch.arrival.from);
  const toMsValue = nightTimeToMs(night, sch.arrival.to);
  return {
    from: sch.arrival.from,
    to: sch.arrival.to,
    startMs: fromMs,
    endMs: toMsValue,
    start: toWarsawIso(fromMs),
    end: toWarsawIso(toMsValue),
  };
}

function nightRef(night) {
  return { date: night.date, weekday: night.weekday, weekdayKey: night.weekdayKey };
}

/**
 * Table release rule: a guest more than `releaseAfterMinutes` (30) late may lose
 * the table. `booking` = { night: 'YYYY-MM-DD' (the night's START date),
 * arrival: 'HH:MM' local }. The release moment is arrival + 30 real minutes.
 * At exactly +30:00 the table is still held; the first later millisecond is
 * "may-be-released". The wording is "may", so this is a possibility, not a promise.
 *
 * status: 'before-arrival' | 'grace' | 'may-be-released' | 'no-night'
 */
export function tableRelease(booking, instant, schedule = DEFAULT_SCHEDULE) {
  const now = toMs(instant);
  const sch = normalizeSchedule(schedule);
  const night = describeNight(booking?.night, sch);
  if (!night.takesPlace) {
    return {
      status: 'no-night',
      reason: night.closure ? 'closure' : 'not-scheduled',
      closure: night.closure,
      night: nightRef(night),
    };
  }
  const arrivalMs = nightTimeToMs(night, booking.arrival);
  const releaseMs = arrivalMs + sch.arrival.releaseAfterMinutes * MS_MIN;
  const bounds = arrivalBounds(night, sch);
  let status;
  if (now < arrivalMs) status = 'before-arrival';
  else if (now <= releaseMs) status = 'grace';
  else status = 'may-be-released';
  const msUntilRelease = Math.max(0, releaseMs - now);
  return {
    status,
    night: nightRef(night),
    arrival: { time: booking.arrival, ms: arrivalMs, iso: toWarsawIso(arrivalMs) },
    arrivalInWindow: arrivalMs >= bounds.startMs && arrivalMs <= bounds.endMs,
    releaseAfterMinutes: sch.arrival.releaseAfterMinutes,
    releaseAtMs: releaseMs,
    releaseAt: toWarsawIso(releaseMs),
    msUntilArrival: Math.max(0, arrivalMs - now),
    msUntilRelease,
    secondsUntilRelease: status === 'may-be-released' ? 0 : Math.ceil((releaseMs - now) / 1000),
  };
}

/**
 * Arrival window (22:00-23:00) of the relevant night, with live countdowns.
 * The relevant night is the first night that takes place and has not ended yet.
 * Both window edges are inclusive: arriving at 23:00:00 is still in the window.
 *
 * status: 'not-started' | 'in-window' | 'ended' | 'no-night'
 * When status is 'ended' (the night still runs, pickup is over) `next` holds the
 * following night's window. Pass `booking` to also get `release`.
 */
export function arrivalWindow(instant, schedule = DEFAULT_SCHEDULE, booking = null) {
  const now = toMs(instant);
  const sch = normalizeSchedule(schedule);
  const parts = warsawParts(now);
  const startKey = businessDateKey(parts, sch);

  let current = null;
  let index = 0;
  for (; index <= MAX_LOOKAHEAD_DAYS; index += 1) {
    const night = describeNight(addDays(startKey, index), sch);
    if (night.takesPlace && night.window.endMs > now) {
      current = night;
      break;
    }
  }
  const provenance = { arrivalWindow: 'confirmed', releaseRule: 'confirmed', releaseReference: 'assumption' };
  if (!current) {
    return { instant: now, status: 'no-night', night: null, window: null, venueOpen: false, next: null, release: null, dataProvenance: provenance };
  }
  const window = arrivalBounds(current, sch);
  let status;
  if (now < window.startMs) status = 'not-started';
  else if (now <= window.endMs) status = 'in-window';
  else status = 'ended';

  let next = null;
  if (status === 'ended') {
    for (let j = index + 1; j <= MAX_LOOKAHEAD_DAYS; j += 1) {
      const night = describeNight(addDays(startKey, j), sch);
      if (night.takesPlace) {
        next = { night: nightRef(night), window: arrivalBounds(night, sch), msUntilStart: arrivalBounds(night, sch).startMs - now };
        break;
      }
    }
  }
  const msUntilStart = status === 'not-started' ? window.startMs - now : null;
  const msUntilEnd = status === 'ended' ? null : window.endMs - now;
  return {
    instant: now,
    status,
    night: nightRef(current),
    window,
    venueOpen: now >= current.window.startMs && now < current.window.endMs,
    msUntilStart,
    secondsUntilStart: msUntilStart === null ? null : Math.ceil(msUntilStart / 1000),
    msUntilEnd,
    secondsUntilEnd: msUntilEnd === null ? null : Math.ceil(msUntilEnd / 1000),
    next,
    release: booking ? tableRelease(booking, now, schedule) : null,
    dataProvenance: provenance,
  };
}
