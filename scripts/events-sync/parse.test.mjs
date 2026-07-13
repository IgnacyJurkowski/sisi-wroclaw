import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOpisy,
  warsawIso,
  eventSlug,
  dateKeyFromFilename,
  validateEvent,
} from './parse.mjs';

// The real example staff created in Opisy/26-06-2026, in the two layouts a
// Google Doc text export can produce (label+value same line, or split lines).
const SAME_LINE = `Title: Friday at SiSi
DJ: ADB
Tax: 0
Start: 22:00
Description: Krótki opis wydarzenia
Music Genre: House, Pop, Funk`;

const SPLIT_LINE = `Title:
Friday at SiSi
DJ:
ADB
Tax:
0
Start:
22:00
Description:
Krótki opis wydarzenia
Music Genre:
House, Pop, Funk`;

test('parseOpisy - real example, label+value on one line', () => {
  const f = parseOpisy(SAME_LINE);
  assert.equal(f.title, 'Friday at SiSi');
  assert.equal(f.dj, 'ADB');
  assert.equal(f.price, 0); // Tax 0 -> free
  assert.equal(f.startTime, '22:00');
  assert.equal(f.description, 'Krótki opis wydarzenia');
  assert.deepEqual(f.genres, ['House', 'Pop', 'Funk']);
});

test('parseOpisy - same fields when label and value are on separate lines', () => {
  const f = parseOpisy(SPLIT_LINE);
  assert.equal(f.title, 'Friday at SiSi');
  assert.equal(f.dj, 'ADB');
  assert.equal(f.price, 0);
  assert.equal(f.startTime, '22:00');
  assert.equal(f.description, 'Krótki opis wydarzenia');
  assert.deepEqual(f.genres, ['House', 'Pop', 'Funk']);
});

test('parseOpisy - paid event + multi-line description', () => {
  const f = parseOpisy(
    `Title: Latino Night\nDJ: Mike Lynx\nTax: 30\nStart: 23:00\nDescription: Linia 1\nLinia 2\nMusic Genre: Latino`,
  );
  assert.equal(f.price, 30);
  assert.equal(f.description, 'Linia 1\nLinia 2');
  assert.deepEqual(f.genres, ['Latino']);
});

test('parseOpisy - missing optional fields are empty/undefined, not crashes', () => {
  const f = parseOpisy('Title: X\nStart: 22:00');
  assert.equal(f.title, 'X');
  assert.equal(f.dj, '');
  assert.equal(f.price, undefined);
  assert.deepEqual(f.genres, []);
});

test('warsawIso - summer date is CEST (+02:00)', () => {
  assert.equal(warsawIso('26-06-2026', '22:00'), '2026-06-26T22:00:00+02:00');
});

test('warsawIso - winter date (after late-Oct DST end) is CET (+01:00)', () => {
  assert.equal(warsawIso('14-11-2026', '22:00'), '2026-11-14T22:00:00+01:00');
});

test('warsawIso - day after the Oct 2026 fallback is +01:00', () => {
  // Poland falls back on the last Sunday of October (2026-10-25).
  assert.equal(warsawIso('26-10-2026', '22:00'), '2026-10-26T22:00:00+01:00');
});

test('dateKeyFromFilename pairs banner to doc', () => {
  assert.equal(dateKeyFromFilename('26-06-2026.png'), '26-06-2026');
  assert.equal(dateKeyFromFilename('26-06-2026'), '26-06-2026');
  assert.equal(dateKeyFromFilename('not-a-date.png'), null);
});

test('eventSlug is stable, sort-friendly, ascii', () => {
  assert.equal(eventSlug('26-06-2026', 'Friday at SiSi'), '2026-06-26-friday-at-sisi');
  // Polish diacritics are stripped to ascii.
  assert.equal(eventSlug('20-06-2026', 'Noc Świętojańska'), '2026-06-20-noc-swietojanska');
});

test('validateEvent - valid', () => {
  assert.deepEqual(
    validateEvent(
      {
        title: 'SiSi Friday',
        dj: 'Marta',
        startTime: '22:00',
        description: 'Autorski wieczór klubowy.',
        genres: ['house'],
      },
      '26-06-2026',
    ),
    [],
  );
});

test('validateEvent - flags missing title and bad time', () => {
  const errs = validateEvent({ title: '', startTime: 'late' }, '26-06-2026');
  assert.ok(errs.some((e) => /Title/.test(e)));
  assert.ok(errs.some((e) => /Start/.test(e)));
});

test('validateEvent - applies public sample-quality policy', () => {
  const errs = validateEvent(
    { title: 'SiSi Friday', dj: 'ADB', startTime: '22:00', description: 'Autorski wieczór.', genres: ['house'] },
    '26-06-2026',
  );
  assert.ok(errs.some((e) => /sample-quality/.test(e)));
});
