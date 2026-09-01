import test from 'node:test';
import assert from 'node:assert/strict';

import { apiBase, articleId, asArticle, asArticleList } from './api.mjs';

test('the API base is the documented integrations endpoint, override-able for tests', () => {
  const original = process.env.BABYLOVEGROWTH_API_BASE;
  delete process.env.BABYLOVEGROWTH_API_BASE;
  assert.equal(apiBase(), 'https://api.babylovegrowth.ai/api/integrations');

  process.env.BABYLOVEGROWTH_API_BASE = 'https://staging.test/api/integrations/';
  assert.equal(apiBase(), 'https://staging.test/api/integrations');
  if (original === undefined) delete process.env.BABYLOVEGROWTH_API_BASE;
  else process.env.BABYLOVEGROWTH_API_BASE = original;
});

test('unwraps list responses whether or not they are wrapped', () => {
  assert.deepEqual(asArticleList([{ id: '1' }]), [{ id: '1' }]);
  assert.deepEqual(asArticleList({ articles: [{ id: '1' }] }), [{ id: '1' }]);
  assert.deepEqual(asArticleList({ data: [{ id: '1' }] }), [{ id: '1' }]);
  assert.deepEqual(asArticleList({ nothing: true }), []);
});

test('unwraps single-article responses', () => {
  assert.deepEqual(asArticle({ id: '1', title: 'x' }), { id: '1', title: 'x' });
  assert.deepEqual(asArticle({ article: { id: '1' } }), { id: '1' });
  assert.deepEqual(asArticle({ data: { id: '1' } }), { id: '1' });
  assert.equal(asArticle(null), null);
});

test('finds the article id under any of the documented spellings', () => {
  assert.equal(articleId({ id: ' 7 ' }), '7');
  assert.equal(articleId({ uuid: 'abc' }), 'abc');
  assert.equal(articleId({ article_id: 12 }), '12');
  assert.equal(articleId({ slug: 'only-a-slug' }), null);
});
