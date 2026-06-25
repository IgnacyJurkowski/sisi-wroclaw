// Pure, deterministic helpers for the events sync (no Google IO here, so they
// are fully unit-testable). The sync (scripts/sync-events.mjs, not yet built)
// composes these with the Drive API.
//
// Authoring surface (staff-trained Google Drive folder "Wydarzenia"):
//   Banery/DD-MM-YYYY.png   - the banner image, named by date
//   Opisy/DD-MM-YYYY        - a Google Doc, fixed key:value template:
//       Title: <event name>
//       DJ: <act>
//       Tax: <entry price in zl, 0 = free>
//       Start: <HH:MM>
//       Description: <Polish prose>
//       Music Genre: <comma list>
// Banner and doc are paired by the DD-MM-YYYY date in the filename.

/** Parse an exported Opisy doc into raw fields. Tolerant of both
    "Label: value" and "Label:\nvalue" layouts and multi-line descriptions:
    each field's value is everything between its label and the next known label. */
export function parseOpisy(text) {
  const defs = [
    { key: 'title', label: 'Title' },
    { key: 'dj', label: 'DJ' },
    { key: 'tax', label: 'Tax' },
    { key: 'startTime', label: 'Start' },
    { key: 'description', label: 'Description' },
    { key: 'genres', label: 'Music Genre' },
  ];
  const found = [];
  for (const d of defs) {
    const re = new RegExp('^[ \\t]*' + d.label.replace(/\s+/g, '\\s*') + '[ \\t]*:', 'im');
    const m = re.exec(text);
    if (m) found.push({ key: d.key, start: m.index, valueStart: m.index + m[0].length });
  }
  found.sort((a, b) => a.start - b.start);

  const raw = {};
  for (let i = 0; i < found.length; i++) {
    const end = i + 1 < found.length ? found[i + 1].start : text.length;
    raw[found[i].key] = text.slice(found[i].valueStart, end).trim();
  }

  return {
    title: raw.title || '',
    dj: raw.dj || '',
    startTime: raw.startTime || '',
    description: raw.description || '',
    // Tax: entry price in zl. "0" -> 0 (free). Empty/absent -> undefined.
    price: raw.tax != null && raw.tax !== '' ? toPrice(raw.tax) : undefined,
    genres: raw.genres ? raw.genres.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

function toPrice(s) {
  const n = Number(String(s).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** "26-06-2026.png" -> "26-06-2026" (the pairing key); null if it isn't a dated name. */
export function dateKeyFromFilename(name) {
  const m = /(\d{2}-\d{2}-\d{4})/.exec(name);
  return m ? m[1] : null;
}

const WARSAW = 'Europe/Warsaw';

/** Offset (ms) of Europe/Warsaw at a given UTC instant, via Intl longOffset. */
function warsawOffsetMs(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(instant));
  const tzn = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(tzn);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * ((+m[2]) * 60 + +(m[3] || 0)) * 60000;
}

/** DD-MM-YYYY + HH:MM (Europe/Warsaw wall time) -> DST-correct ISO string,
    e.g. ("26-06-2026","22:00") -> "2026-06-26T22:00:00+02:00" (CEST),
         ("14-11-2026","22:00") -> "2026-11-14T22:00:00+01:00" (CET).
    Two-step offset resolution so the value is correct on both sides of the
    late-March / late-October DST changes. The rare nonexistent/ambiguous
    transition hour (02:00-03:00) is resolved to the post-guess offset; club
    events start at 22:00 so they never land in that window. */
export function warsawIso(dateStr, time) {
  const [dd, mm, yyyy] = dateStr.split('-').map(Number);
  const [hh, min] = time.split(':').map(Number);
  const utcGuess = Date.UTC(yyyy, mm - 1, dd, hh, min);
  let off = warsawOffsetMs(utcGuess);
  off = warsawOffsetMs(utcGuess - off);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const p = (n) => String(n).padStart(2, '0');
  const oh = p(Math.floor(abs / 3600000));
  const om = p(Math.floor((abs % 3600000) / 60000));
  return `${yyyy}-${p(mm)}-${p(dd)}T${p(hh)}:${p(min)}:00${sign}${oh}:${om}`;
}

/** Stable, sort-friendly slug for the banner filename + (later) per-event URLs.
    ("26-06-2026","Friday at SiSi") -> "2026-06-26-friday-at-sisi". */
export function eventSlug(dateStr, title) {
  const [dd, mm, yyyy] = dateStr.split('-');
  const t = (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `${yyyy}-${mm}-${dd}${t ? '-' + t : ''}`;
}

/** Validation for the asymmetric bad-row policy. Returns a list of problems
    (empty = valid). Caller decides skip (draft) vs fail (published). */
export function validateEvent(fields, dateStr) {
  const errors = [];
  if (!fields.title) errors.push('missing Title');
  if (!/^\d{1,2}:\d{2}$/.test(fields.startTime || '')) errors.push('missing or invalid Start time');
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr || '')) errors.push('invalid date in filename');
  return errors;
}
