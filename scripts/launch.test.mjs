import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonForHtml, robotsDirective } from '../src/lib/launch.mjs';

test('jsonForHtml preserves JSON without a literal tag opener', () => {
  const value = { title: '</ScRiPt><script>globalThis.__xss = true</script>', dj: '<img>' };
  const output = jsonForHtml(value);
  assert.equal(output.includes('<'), false);
  assert.deepEqual(JSON.parse(output), value);
});

for (const [name, input, expected] of [
  ['canonical production', { context: 'production', siteUrl: 'https://sisiwroclaw.pl', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'index, follow'],
  ['utility production', { context: 'production', siteUrl: 'https://sisiwroclaw.pl/', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: true }, 'noindex, follow'],
  ['netlify production host', { context: 'production', siteUrl: 'https://sisi-wroclaw.netlify.app', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'noindex, nofollow'],
  ['deploy preview', { context: 'deploy-preview', siteUrl: 'https://deploy-preview-1--sisi-wroclaw.netlify.app', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'noindex, nofollow'],
  ['branch deploy', { context: 'branch-deploy', siteUrl: 'https://branch--sisi-wroclaw.netlify.app', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'noindex, nofollow'],
  ['local build', { context: '', siteUrl: '', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'noindex, nofollow'],
  ['malformed URL', { context: 'production', siteUrl: 'not a url', canonicalOrigin: 'https://sisiwroclaw.pl', noindex: false }, 'noindex, nofollow'],
]) test(name, () => assert.equal(robotsDirective(input), expected));
