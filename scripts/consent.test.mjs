import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_DENIED,
  CONSENT_EVENT,
  CONSENT_GRANTED,
  CONSENT_KEY,
  LEGACY_KEYS,
  readConsent,
  removeLegacyKeys,
  safeLocalStorage,
  writeConsent,
} from '../src/lib/consent.mjs';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}

const throwingStorage = {
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('denied'); },
  removeItem() { throw new Error('denied'); },
};

test('constants match the disclosed inventory', () => {
  assert.equal(CONSENT_KEY, 'sisi-analytics-consent');
  assert.equal(CONSENT_GRANTED, 'granted');
  assert.equal(CONSENT_DENIED, 'denied');
  assert.equal(CONSENT_EVENT, 'sisi-consent-change');
  assert.deepEqual(LEGACY_KEYS, ['sisi-cookie-notice', 'sisi-cookie-consent']);
});

test('safeLocalStorage returns null outside the browser', () => {
  assert.equal(safeLocalStorage(), null);
});

test('readConsent returns only the two valid decisions', () => {
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'granted' })), 'granted');
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'denied' })), 'denied');
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'dismissed' })), null);
  assert.equal(readConsent(memoryStorage()), null);
});

test('readConsent tolerates missing or throwing storage', () => {
  assert.equal(readConsent(null), null);
  assert.equal(readConsent(throwingStorage), null);
});

test('writeConsent stores only valid decisions and reports success', () => {
  const storage = memoryStorage();
  assert.equal(writeConsent(storage, CONSENT_GRANTED), true);
  assert.equal(storage.getItem(CONSENT_KEY), 'granted');
  assert.equal(writeConsent(storage, CONSENT_DENIED), true);
  assert.equal(storage.getItem(CONSENT_KEY), 'denied');
  assert.equal(writeConsent(storage, 'dismissed'), false);
  assert.equal(storage.getItem(CONSENT_KEY), 'denied');
});

test('writeConsent tolerates missing or throwing storage', () => {
  assert.equal(writeConsent(null, CONSENT_GRANTED), false);
  assert.equal(writeConsent(throwingStorage, CONSENT_GRANTED), false);
});

test('removeLegacyKeys clears retired records and survives denial', () => {
  const storage = memoryStorage({
    'sisi-cookie-notice': 'dismissed',
    'sisi-cookie-consent': 'x',
    keep: '1',
  });
  removeLegacyKeys(storage);
  assert.equal(storage.map.has('sisi-cookie-notice'), false);
  assert.equal(storage.map.has('sisi-cookie-consent'), false);
  assert.equal(storage.getItem('keep'), '1');
  removeLegacyKeys(null);
  removeLegacyKeys(throwingStorage);
});
