import test from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from 'node:http';

import { apiBase, articleId, asArticle, asArticleList, listAllArticles, listArticles } from './api.mjs';

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

test('pagination keeps walking when the server caps the page size', async () => {
  // A server-side max below our requested limit makes page one look short; the
  // walk must continue on what was actually returned, not on what we asked for.
  const articles = Array.from({ length: 5 }, (_, index) => ({ id: `a${index}`, slug: `a${index}` }));
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const capped = Math.min(Number(url.searchParams.get('limit') ?? 50), 2);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ articles: articles.slice(offset, offset + capped) }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const previousBase = process.env.BABYLOVEGROWTH_API_BASE;
  const previousKey = process.env.BABYLOVEGROWTH_API_KEY;
  process.env.BABYLOVEGROWTH_API_BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.BABYLOVEGROWTH_API_KEY = 'test-key';
  try {
    const all = await listAllArticles({ sleep: async () => {} });
    assert.deepEqual(all.map((entry) => entry.id), ['a0', 'a1', 'a2', 'a3', 'a4']);
  } finally {
    if (previousBase === undefined) delete process.env.BABYLOVEGROWTH_API_BASE;
    else process.env.BABYLOVEGROWTH_API_BASE = previousBase;
    if (previousKey === undefined) delete process.env.BABYLOVEGROWTH_API_KEY;
    else process.env.BABYLOVEGROWTH_API_KEY = previousKey;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('a redirect is refused rather than forwarding the API key', async () => {
  const server = createServer((req, res) => {
    res.writeHead(302, { location: 'https://elsewhere.test/v1/articles' });
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const previousBase = process.env.BABYLOVEGROWTH_API_BASE;
  const previousKey = process.env.BABYLOVEGROWTH_API_KEY;
  process.env.BABYLOVEGROWTH_API_BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.BABYLOVEGROWTH_API_KEY = 'test-key';
  try {
    await assert.rejects(listArticles(), /refusing to forward the API key/);
  } finally {
    if (previousBase === undefined) delete process.env.BABYLOVEGROWTH_API_BASE;
    else process.env.BABYLOVEGROWTH_API_BASE = previousBase;
    if (previousKey === undefined) delete process.env.BABYLOVEGROWTH_API_KEY;
    else process.env.BABYLOVEGROWTH_API_KEY = previousKey;
    await new Promise((resolve) => server.close(resolve));
  }
});
