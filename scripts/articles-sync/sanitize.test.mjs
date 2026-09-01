import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dropLeadingTitle,
  excerptFrom,
  readingMinutes,
  residualRisk,
  sanitizeArticleHtml,
} from './sanitize.mjs';

const OPTIONS = { canonicalOrigin: 'https://www.sisiwroclaw.pl', bareHosts: ['sisiwroclaw.pl'] };
const clean = (html) => sanitizeArticleHtml(html, OPTIONS);

test('drops executable and embedding markup with its content', () => {
  const { html, warnings } = clean(
    '<p>keep</p><script>alert(1)</script><style>p{color:red}</style>' +
      '<iframe src="https://evil.test"></iframe><noscript>hidden</noscript>',
  );
  assert.equal(html, '<p>keep</p>');
  assert.deepEqual(residualRisk(html), []);
  assert.ok(warnings.includes('dropped <script>'));
});

test('strips event handlers, inline styles and javascript: URLs', () => {
  const { html } = clean('<p onclick="steal()" style="color:red">a <a href="javascript:alert(1)">b</a></p>');
  assert.equal(html, '<p>a b</p>');
  assert.deepEqual(residualRisk(html), []);
});

test('a script hidden behind an unclosed tag cannot survive', () => {
  const { html } = clean('<p>text<script>evil()');
  assert.deepEqual(residualRisk(html), []);
  assert.equal(html.includes('evil'), false);
});

test('rewrites our own bare-origin links onto the canonical www host', () => {
  const { html } = clean('<p><a href="https://sisiwroclaw.pl/pl/menu/">menu</a></p>');
  assert.ok(html.includes('href="https://www.sisiwroclaw.pl/pl/menu/"'));
  assert.equal(html.includes('//sisiwroclaw.pl'), false);
});

test('marks external links rel=noopener and leaves internal links alone', () => {
  const { html } = clean('<p><a href="https://example.test/x">out</a><a href="/pl/menu/">in</a></p>');
  assert.ok(html.includes('href="https://example.test/x" rel="noopener" target="_blank"'));
  assert.ok(html.includes('<a href="/pl/menu/">in</a>'));
});

test('keeps only https images and always lazy-loads them', () => {
  const { html } = clean('<img src="http://insecure.test/a.png"><img src="https://cdn.test/b.png" alt="B">');
  assert.equal(html, '<img src="https://cdn.test/b.png" alt="B" loading="lazy" decoding="async" />');
});

test('demotes h1 to h2 so the page keeps a single top-level heading', () => {
  assert.equal(clean('<h1>Title</h1>').html, '<h2>Title</h2>');
  assert.equal(clean('<h1>Title</h1><p>x</p>').html, '<h2>Title</h2><p>x</p>');
});

test('unwraps unknown containers but keeps their content', () => {
  assert.equal(clean('<section><div><p>kept</p></div></section>').html, '<p>kept</p>');
});

test('re-balances omitted end tags without breaking nested lists', () => {
  const { html } = clean('<ul><li>a<ul><li>b</li><li>c</ul><li>d</ul>');
  assert.equal(html, '<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>');
});

test('re-balances table rows and cells', () => {
  const { html } = clean('<table><tr><td>1<td>2<tr><td>3</table>');
  assert.equal(html, '<table><tr><td>1</td><td>2</td></tr><tr><td>3</td></tr></table>');
});

test('closes tags the vendor left open', () => {
  assert.equal(clean('<p>a<strong>b').html, '<p>a<strong>b</strong></p>');
});

test('escapes stray angle brackets and ampersands in text', () => {
  const { html } = clean('<p>5 &amp; 6 < 7 & 8</p>');
  assert.equal(html, '<p>5 &amp; 6 &lt; 7 &amp; 8</p>');
});

test('extracts readable plain text for excerpts and reading time', () => {
  const { text } = clean('<h2>Heading</h2><p>One sentence. Another one.</p><ul><li>item</li></ul>');
  assert.equal(text, 'Heading\nOne sentence. Another one.\nitem');
  assert.equal(readingMinutes('word '.repeat(400)), 2);
  assert.equal(readingMinutes('short'), 1);
});

test('excerpts cut on a sentence boundary and never mid-word', () => {
  assert.equal(excerptFrom('Short one.', 180), 'Short one.');
  assert.equal(excerptFrom('First sentence here. Second sentence runs on and on.', 30), 'First sentence here.');
  assert.equal(excerptFrom('a'.repeat(20) + ' ' + 'b'.repeat(20), 25), `${'a'.repeat(20)}…`);
});

test('drops an opening heading that just repeats the article title', () => {
  const body = clean('<h1>Najlepsze kluby</h1><p>Treść wpisu.</p>');
  const trimmed = dropLeadingTitle(body, 'Najlepsze kluby!');
  assert.equal(trimmed.html, '<p>Treść wpisu.</p>');
  assert.equal(trimmed.text, 'Treść wpisu.');
});

test('keeps an opening heading that says something else', () => {
  const body = clean('<h2>Gdzie zacząć</h2><p>Treść wpisu.</p>');
  assert.deepEqual(dropLeadingTitle(body, 'Najlepsze kluby'), body);
  assert.deepEqual(dropLeadingTitle(body, ''), body);
});
