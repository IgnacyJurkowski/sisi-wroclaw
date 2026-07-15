import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { jsonForHtml, robotsDirective } from '../src/lib/launch.mjs';

test('jsonForHtml preserves JSON without a literal tag opener', () => {
  const value = { title: '</ScRiPt><script>globalThis.__xss = true</script>', dj: '<img>' };
  const output = jsonForHtml(value);
  assert.equal(output.includes('<'), false);
  assert.deepEqual(JSON.parse(output), value);
});

const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';

for (const [name, input, expected] of [
  ['canonical production', { context: 'production', siteUrl: CANONICAL_ORIGIN, canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, undefined],
  ['utility production', { context: 'production', siteUrl: `${CANONICAL_ORIGIN}/`, canonicalOrigin: CANONICAL_ORIGIN, noindex: true }, 'noindex, follow'],
  ['noncanonical production host', { context: 'production', siteUrl: 'https://sisi-wroclaw.netlify.app', canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, 'noindex, nofollow'],
  ['deploy preview', { context: 'deploy-preview', siteUrl: 'https://deploy-preview-1--sisi-wroclaw.netlify.app', canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, 'noindex, nofollow'],
  ['branch deploy', { context: 'branch-deploy', siteUrl: 'https://branch--sisi-wroclaw.netlify.app', canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, 'noindex, nofollow'],
  ['local build', { context: '', siteUrl: '', canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, 'noindex, nofollow'],
  ['malformed URL', { context: 'production', siteUrl: 'not a url', canonicalOrigin: CANONICAL_ORIGIN, noindex: false }, 'noindex, nofollow'],
]) test(name, () => assert.equal(robotsDirective(input), expected));

test('browser storage stays within the disclosed launch inventory', async () => {
  const files = await sourceFiles('src');
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.equal(/\bsessionStorage\b/.test(source), false, 'sessionStorage is outside the disclosed launch inventory');
});

test('new menu and corporate surfaces keep audited semantics and contrast tokens', async () => {
  const [food, venueFacts, hero, why] = await Promise.all([
    readFile('src/components/FoodMenu.astro', 'utf8'),
    readFile('src/components/b2b/VenueFacts.astro', 'utf8'),
    readFile('src/components/b2b/B2BHero.astro', 'utf8'),
    readFile('src/components/b2b/WhyVenue.astro', 'utf8'),
  ]);

  const badgeTags = food.match(/<span class="food-badge(?:\s|")[^>]*>/g) ?? [];
  assert.ok(badgeTags.length > 0);
  for (const tag of badgeTags) {
    assert.match(tag, /\brole="img"/);
    assert.match(tag, /\baria-label=/);
  }
  assert.doesNotMatch(food, /color:\s*rgba\(39,\s*7,\s*15,\s*0\.(?:5|55)\)/);
  assert.doesNotMatch(`${hero}\n${why}`, /color:\s*rgba\(237,\s*219,\s*194,\s*0\.55\)/);
  assert.match(venueFacts, /ICONS\[item\.icon\]/);
});

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.isFile() && /\.(?:astro|js|mjs|ts)$/.test(entry.name)) files.push(path);
  }
  return files;
}
