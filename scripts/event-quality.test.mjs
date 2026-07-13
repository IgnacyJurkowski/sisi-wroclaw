import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicEvent, duplicateBannerErrors } from '../src/lib/event-quality.mjs';

const valid = {
  title: 'SiSi Friday',
  dj: 'Marta',
  startTime: '22:00',
  description: 'Autorski wieczór klubowy.',
  genres: ['house'],
};

test('accepts a complete public event', () => {
  assert.deepEqual(validatePublicEvent(valid, '17-07-2026'), []);
});

for (const token of ['ADB', 'ABC', 'Krótki opis wydarzenia', 'JungleW']) {
  test(`rejects sample token ${token}`, () => {
    const fields = { ...valid, description: token, dj: token, genres: [token] };
    assert.match(validatePublicEvent(fields, '17-07-2026').join(' '), /sample-quality/i);
  });
}

test('rejects control characters', () => {
  assert.match(validatePublicEvent({ ...valid, title: 'Night\u0007' }, '17-07-2026').join(' '), /control/i);
});

test('rejects malformed genre labels', () => {
  assert.match(validatePublicEvent({ ...valid, genres: ['house<script>'] }, '17-07-2026').join(' '), /genre/i);
});

test('rejects one banner reused by two dates', () => {
  assert.deepEqual(
    duplicateBannerErrors([
      { dateKey: '17-07-2026', digest: 'same' },
      { dateKey: '18-07-2026', digest: 'same' },
    ]),
    ['banner digest same is reused by 17-07-2026, 18-07-2026'],
  );
});
