import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { eventOffer } from '../src/lib/event-offer.mjs';

const files = ['src/data/site.ts', 'src/i18n/legal.ts', 'src/i18n/ui/pl.ts', 'src/i18n/ui/en.ts', 'src/i18n/ui/de.ts', 'src/i18n/ui/it.ts', 'src/i18n/ui/cs.ts', 'src/layouts/Base.astro', 'docs/B2B.md'];
test('unverified launch claims are absent from source', async () => {
  const text = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  // 663 m² and the up-to-500 standing capacity were confirmed verified by the
  // owner (2026-07-14) and intentionally removed from this guard; the remaining
  // patterns still block unverified age, timing and schema claims.
  for (const pattern of [/over[-\s]?21/i, /21\+/i, /powyżej 21/i, /(?:\bab|über) 21/i, /maggiori di 21/i, /(?:\bod|starším) 21/i, /120 minut/i, /120 minutes/i, /GeoCoordinates/, /geo\.position/, /\bInStock\b/]) {
    assert.equal(pattern.test(text), false, `unexpected launch claim matching ${pattern}`);
  }
});
test('event offers state only a verified numeric entry price', () => {
  assert.deepEqual(eventOffer(30), { '@type': 'Offer', price: 30, priceCurrency: 'PLN' });
  assert.equal(eventOffer(undefined), undefined);
  assert.equal(eventOffer(Number.NaN), undefined);
  assert.equal(eventOffer(Number.POSITIVE_INFINITY), undefined);
  assert.equal(eventOffer('30'), undefined);
  assert.equal(eventOffer(null), undefined);
});
test('event schema attaches only the verified offer to priced events', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { eventSchema } = await server.ssrLoadModule('/src/data/site.ts');
    const event = {
      title: 'Verified price fixture',
      slug: '2026-07-13-verified-price-fixture',
      start: '2026-07-13T22:00:00+02:00',
      img: '/events/verified-price-fixture.webp',
    };
    const [priced] = eventSchema([{ ...event, price: 30 }], 'en');
    const [unpriced] = eventSchema([event], 'en');

    assert.deepEqual(priced.offers, { '@type': 'Offer', price: 30, priceCurrency: 'PLN' });
    assert.equal(unpriced.offers, undefined);
  } finally {
    await server.close();
  }
});
