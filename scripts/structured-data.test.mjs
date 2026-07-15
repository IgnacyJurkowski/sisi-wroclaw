import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { eventOffer } from '../src/lib/event-offer.mjs';

const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
const ORGANIZATION_ID = `${CANONICAL_ORIGIN}/#organization`;
const NIGHTCLUB_ID = `${CANONICAL_ORIGIN}/#nightclub`;
const R32_ID = 'https://www.r32.com.pl/#eventvenue';

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
test('structured data uses the final origin and attaches only verified event offers', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const {
      BUSINESS,
      entityGraphSchema,
      eventSchema,
      eventVenueSchema,
      nightClubSchema,
      organizationSchema,
    } = await server.ssrLoadModule('/src/data/site.ts');
    const event = {
      title: 'Verified price fixture',
      slug: '2026-07-13-verified-price-fixture',
      start: '2026-07-13T22:00:00+02:00',
      img: '/events/verified-price-fixture.webp',
    };
    const [priced] = eventSchema([{ ...event, price: 30 }], 'en');
    const [unpriced] = eventSchema([event], 'en');
    const organization = organizationSchema();
    const eventVenue = eventVenueSchema();
    const nightClub = nightClubSchema('en');
    const entityGraph = entityGraphSchema('en');
    const graph = [entityGraph, priced];
    const serialized = JSON.stringify(graph);

    assert.equal(BUSINESS.url, CANONICAL_ORIGIN);
    assert.ok(serialized.includes(CANONICAL_ORIGIN));
    assert.equal(serialized.includes(CANONICAL_ORIGIN.replace('www.', '')), false);
    assert.equal(organization['@type'], 'Organization');
    assert.equal(organization['@id'], ORGANIZATION_ID);
    assert.equal(organization.legalName, 'Rzeźnicza 32 Sp. z o.o.');
    assert.deepEqual(
      organization.identifier.map(({ propertyID, value }) => [propertyID, value]),
      [['KRS', '0001085945'], ['NIP', '8971933394'], ['REGON', '527683726']],
    );
    assert.equal(eventVenue['@type'], 'EventVenue');
    assert.equal(eventVenue['@id'], R32_ID);
    assert.deepEqual(eventVenue.containsPlace, { '@id': NIGHTCLUB_ID });
    assert.deepEqual(nightClub.parentOrganization, { '@id': ORGANIZATION_ID });
    assert.deepEqual(nightClub.containedInPlace, { '@id': R32_ID });
    assert.deepEqual(
      entityGraph['@graph'].map((node) => node['@id']),
      [ORGANIZATION_ID, R32_ID, NIGHTCLUB_ID, `${CANONICAL_ORIGIN}/#website`],
    );
    assert.equal(entityGraph['@graph'].some((node) => '@context' in node), false);
    assert.equal(priced.url, `${CANONICAL_ORIGIN}/en/events/${event.slug}/`);
    assert.deepEqual(priced.location, { '@id': NIGHTCLUB_ID });
    assert.deepEqual(priced.organizer, { '@id': NIGHTCLUB_ID });
    assert.deepEqual(priced.offers, { '@type': 'Offer', price: 30, priceCurrency: 'PLN' });
    assert.equal(unpriced.offers, undefined);
  } finally {
    await server.close();
  }
});
