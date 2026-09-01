import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dedupe,
  faqPairs,
  keywordsFrom,
  localeFor,
  normalizeArticle,
  normalizeDate,
  normalizeSlug,
  pick,
  sortArticles,
} from './normalize.mjs';

const LOCALES = ['pl', 'en', 'de', 'it', 'cs'];
const CONTEXT = {
  locales: LOCALES,
  canonicalOrigin: 'https://www.sisiwroclaw.pl',
  bareHosts: ['sisiwroclaw.pl'],
};

const BODY = `<p>${'Wrocław nocą to przede wszystkim kluby przy Rzeźniczej. '.repeat(12)}</p>`;

function article(overrides = {}) {
  return {
    id: 'abc-123',
    slug: 'nocne-zycie-wroclawia',
    title: 'Nocne życie Wrocławia',
    meta_description: 'Przewodnik po klubach w centrum Wrocławia.',
    content_html: BODY,
    languageCode: 'pl',
    publishedAt: '2026-08-20T09:30:00Z',
    hero_image_url: 'https://cdn.test/hero.png',
    ...overrides,
  };
}

test('maps a well-formed article onto the site model', () => {
  const { article: mapped, errors } = normalizeArticle(article(), CONTEXT);
  assert.deepEqual(errors, []);
  assert.equal(mapped.slug, 'nocne-zycie-wroclawia');
  assert.equal(mapped.locale, 'pl');
  assert.equal(mapped.title, 'Nocne życie Wrocławia');
  assert.equal(mapped.description, 'Przewodnik po klubach w centrum Wrocławia.');
  assert.equal(mapped.publishedAt, '2026-08-20T09:30:00.000Z');
  assert.equal(mapped.heroSource, 'https://cdn.test/hero.png');
  assert.ok(mapped.readingMinutes >= 1);
  assert.ok(mapped.excerpt.length > 0);
  assert.ok(mapped.html.startsWith('<p>'));
});

test('reads both snake_case and camelCase payload spellings', () => {
  const { article: mapped, errors } = normalizeArticle(
    { ...article(), meta_description: undefined, metaDescription: 'Camel case description.', content_html: undefined, contentHtml: BODY },
    CONTEXT,
  );
  assert.deepEqual(errors, []);
  assert.equal(mapped.description, 'Camel case description.');
  assert.equal(pick({ a: '', b: 'x' }, 'a', 'b'), 'x');
});

test('skips articles written in a language the site does not render', () => {
  const { article: mapped, errors } = normalizeArticle(article({ languageCode: 'es' }), CONTEXT);
  assert.equal(mapped, null);
  assert.ok(errors.some((error) => error.includes('unsupported languageCode')));
  assert.equal(localeFor('pl-PL', LOCALES), 'pl');
  assert.equal(localeFor('EN_us', LOCALES), 'en');
  assert.equal(localeFor('es', LOCALES), null);
});

test('skips stubs, unusable slugs and invalid dates', () => {
  assert.ok(normalizeArticle(article({ content_html: '<p>too short</p>' }), CONTEXT).errors.some((e) => e.includes('too short')));
  assert.ok(normalizeArticle(article({ slug: '---' }), CONTEXT).errors.includes('missing or unusable slug'));
  assert.ok(normalizeArticle(article({ publishedAt: 'not a date' }), CONTEXT).errors.includes('missing or invalid publishedAt'));
  assert.ok(normalizeArticle(article({ title: '' }), CONTEXT).errors.includes('missing title'));
});

test('skips an article that would publish an unverified claim', () => {
  const { article: mapped, errors } = normalizeArticle(
    article({ content_html: `<p>Wstęp tylko dla osób 21+.</p>${BODY}` }),
    CONTEXT,
  );
  assert.equal(mapped, null);
  assert.ok(errors.some((error) => error.startsWith('unverified claim')));
});

test('never publishes markup that survived sanitising', () => {
  const { article: mapped } = normalizeArticle(article({ content_html: `${BODY}<script>evil()</script>` }), CONTEXT);
  assert.ok(mapped);
  assert.equal(mapped.html.includes('script'), false);
});

test('ignores a non-https hero image instead of failing the article', () => {
  const { article: mapped, warnings } = normalizeArticle(article({ hero_image_url: 'http://cdn.test/a.png' }), CONTEXT);
  assert.equal(mapped.heroSource, undefined);
  assert.ok(warnings.includes('ignored non-https hero_image_url'));
});

test('normalizes slugs and dates', () => {
  assert.equal(normalizeSlug('Najlepsze Kluby We Wrocławiu!'), 'najlepsze-kluby-we-wroclawiu');
  assert.equal(normalizeSlug('  --a--b--  '), 'a-b');
  assert.equal(normalizeSlug(''), '');
  assert.equal(normalizeDate('2026-08-20'), '2026-08-20T00:00:00.000Z');
  assert.equal(normalizeDate('rubbish'), null);
  assert.equal(normalizeDate(undefined), null);
});

test('keeps only FAQ entries the article body does not already answer', () => {
  const faqJsonLd = JSON.stringify({
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Do której gracie?', acceptedAnswer: { '@type': 'Answer', text: '<p>Do 4:00.</p>' } },
      // Already answered in the body, so it must not be repeated on the page.
      {
        '@type': 'Question',
        name: 'Wrocław nocą to przede wszystkim kluby przy Rzeźniczej.',
        acceptedAnswer: { '@type': 'Answer', text: 'Kluby.' },
      },
    ],
  });
  assert.equal(faqPairs(faqJsonLd).length, 2);
  assert.equal(faqPairs(faqJsonLd)[0].answer, 'Do 4:00.');

  const { article: mapped } = normalizeArticle(article({ faqJsonLd }), CONTEXT);
  assert.deepEqual(mapped.faq.map((entry) => entry.question), ['Do której gracie?']);
});

test('takes keywords from the vendor JSON-LD when present', () => {
  assert.deepEqual(keywordsFrom({ keywords: 'kluby, wrocław, kluby' }), ['kluby', 'wrocław']);
  assert.deepEqual(keywordsFrom('{"keywords":["a","b"]}'), ['a', 'b']);
  assert.deepEqual(keywordsFrom(undefined), []);
});

test('sorts newest first and keeps one article per locale + slug', () => {
  const older = { slug: 'a', locale: 'pl', publishedAt: '2026-01-01T00:00:00.000Z' };
  const newer = { slug: 'a', locale: 'pl', publishedAt: '2026-05-01T00:00:00.000Z' };
  const english = { slug: 'a', locale: 'en', publishedAt: '2026-03-01T00:00:00.000Z' };

  assert.deepEqual(sortArticles([older, newer]).map((a) => a.publishedAt), [newer.publishedAt, older.publishedAt]);
  const { articles, dropped } = dedupe([older, newer, english]);
  assert.equal(articles.length, 2);
  assert.equal(articles.find((a) => a.locale === 'pl').publishedAt, newer.publishedAt);
  assert.deepEqual(dropped, ['pl/a']);
});
