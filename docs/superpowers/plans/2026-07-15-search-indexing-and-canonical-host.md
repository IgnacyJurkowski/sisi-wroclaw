# Search Indexing and Canonical Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every normal page on `https://www.sisiwroclaw.pl` eligible for indexing while keeping utility pages and every noncanonical deployment safely non-indexable.

**Architecture:** Retain the existing build-time, fail-closed indexing helper. Change its canonical-production result from an explicit `index, follow` value to no directive, render the meta element conditionally, and align every runtime URL producer plus verification harness with the final `www` origin. Continue relying on Netlify's existing one-hop bare-domain redirect; do not add another hostname redirect or a new environment-variable system.

**Tech Stack:** Astro 7, TypeScript, Node.js 22.12.0, Node test runner, Playwright Core, Netlify, GitHub Actions.

## Global Constraints

- The canonical origin is exactly `https://www.sisiwroclaw.pl`.
- A normal canonical-production page emits no robots meta element.
- The fallback root document and the real 404 page emit exactly `noindex, follow`.
- Deploy previews, branch deployments, noncanonical production builds, and malformed build environments emit exactly `noindex, nofollow`.
- Keep the existing Netlify bare-domain-to-`www` redirect; do not add a hostname redirect to `netlify.toml`.
- Do not add a canonical-host environment variable or `X-Robots-Tag` indexing system.
- Do not change copy, page design, events, hours, analytics, domains, or unrelated launch behavior.
- Use Node `22.12.0` for focused and full release verification.
- Preserve `.claude/worktrees/b2b/`; never stage or modify it.
- Search Console inspection and sitemap submission remain separate owner-authorized operations.
- Application changes, remote branch publication, and deployment each require the user's explicit approval before execution.
- Use `superpowers:using-git-worktrees` before implementation so the approved work is isolated from the current checkout.

---

## File Map

- `src/lib/launch.mjs`: fail-closed robots decision; canonical normal production returns `undefined`.
- `src/layouts/Base.astro`: conditionally renders the robots meta element.
- `scripts/launch.test.mjs`: unit matrix for canonical, utility, preview, branch, noncanonical, and invalid build states.
- `scripts/smoke-host.mjs`: deployed-host validator with an explicit `none` mode for robots-tag absence and the final canonical origin.
- `scripts/smoke-host.test.mjs`: parser-independent regression coverage for required robots absence and exact required values.
- `astro.config.mjs`: Astro canonical site origin.
- `src/data/site.ts`: business, image, schema identifiers, and first-party absolute URL origin.
- `src/pages/sitemap.xml.ts`: defensive sitemap fallback origin.
- `public/robots.txt`: final-host sitemap location.
- `scripts/check-build.mjs`: rendered canonical, sitemap, robots, Open Graph, hreflang, and JSON-LD origin assertions.
- `scripts/structured-data.test.mjs`: structured-data origin assertions.
- `scripts/audit-browser.test.mjs`: browser-audit fixture canonical origin.
- `scripts/security-browser.mjs`: hostile-event production-build fixture origin.

---

### Task 1: Omit the robots tag only on canonical normal production pages

**Files:**
- Modify: `scripts/launch.test.mjs:14-22`
- Modify: `scripts/smoke-host.test.mjs:14-29`
- Modify: `src/lib/launch.mjs:9-15`
- Modify: `src/layouts/Base.astro:72-77,100-104`
- Modify: `scripts/smoke-host.mjs:16-32,93-106`

**Interfaces:**
- Produces: `robotsDirective({ context, siteUrl, canonicalOrigin, noindex }): 'noindex, follow' | 'noindex, nofollow' | undefined`
- Produces: `assertRobots(html, expected, label)`, where `expected` is a directive string or `null` for required absence.
- Produces: CLI contract `node scripts/smoke-host.mjs <origin> <expected-robots|none>`.

- [ ] **Step 1: Change the unit matrix to require omission on canonical normal production**

Replace the robots matrix in `scripts/launch.test.mjs` with:

```js
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
```

- [ ] **Step 2: Add a smoke assertion for required absence**

Add this test immediately after the existing robots test in `scripts/smoke-host.test.mjs`:

```js
test('robots validation can require the directive to be absent', () => {
  const directive = '<meta name="robots" content="index, follow">';
  assert.doesNotThrow(() => assertRobots('<title>Canonical page</title>', null, '/pl/'));
  assert.throws(
    () => assertRobots(directive, null, '/pl/'),
    /must omit the robots directive/,
  );
});
```

- [ ] **Step 3: Run the focused tests and verify red**

Run:

```bash
npx --yes node@22.12.0 --test scripts/launch.test.mjs scripts/smoke-host.test.mjs
```

Expected: non-zero exit. The canonical-production matrix still receives `index, follow`, and `assertRobots(..., null, ...)` rejects a page with zero directives.

- [ ] **Step 4: Make the robots decision return absence for canonical normal production**

Replace `robotsDirective` in `src/lib/launch.mjs` with:

```js
export function robotsDirective({ context, siteUrl, canonicalOrigin, noindex = false }) {
  const siteOrigin = origin(siteUrl);
  const canonical = origin(canonicalOrigin);
  if (context !== 'production' || !siteOrigin || !canonical || siteOrigin !== canonical) {
    return 'noindex, nofollow';
  }
  return noindex ? 'noindex, follow' : undefined;
}
```

Replace the unconditional robots element in `src/layouts/Base.astro` with:

```astro
{robotsContent && <meta name="robots" content={robotsContent} />}
```

- [ ] **Step 5: Add the `none` mode to the live smoke interface**

Replace `usage` and `parseArguments` in `scripts/smoke-host.mjs` with:

```js
function usage() {
  return 'Usage: node scripts/smoke-host.mjs <origin> <expected-robots|none>';
}

function parseArguments(argv) {
  const [originValue, expectedRobotsValue] = argv;
  assert.ok(originValue && expectedRobotsValue, usage());
  const origin = new URL(originValue);
  assert.ok(['http:', 'https:'].includes(origin.protocol), 'origin must use http or https');
  assert.equal(origin.username, '', 'origin must not contain credentials');
  assert.equal(origin.password, '', 'origin must not contain credentials');
  assert.equal(origin.pathname, '/', 'origin must not contain a path');
  assert.equal(origin.search, '', 'origin must not contain a query');
  assert.equal(origin.hash, '', 'origin must not contain a fragment');
  assert.equal(expectedRobotsValue.trim(), expectedRobotsValue, 'expected robots value must be trimmed');
  const expectedRobots = expectedRobotsValue === 'none' ? null : expectedRobotsValue;
  return { origin, expectedRobots };
}
```

Replace `assertRobots` with:

```js
export function assertRobots(html, expected, label) {
  const values = robotsValues(html);
  if (expected === null) {
    assert.equal(values.length, 0, `${label} must omit the robots directive`);
    return;
  }
  assert.equal(values.length, 1, `${label} must emit exactly one active robots directive`);
  assert.equal(values[0], expected, `${label} has the wrong robots directive`);
}
```

- [ ] **Step 6: Run the focused tests and verify green**

Run:

```bash
npx --yes node@22.12.0 --test scripts/launch.test.mjs scripts/smoke-host.test.mjs
```

Expected: exit `0`; every test in both files passes.

- [ ] **Step 7: Commit the indexing contract**

```bash
git add scripts/launch.test.mjs scripts/smoke-host.test.mjs src/lib/launch.mjs src/layouts/Base.astro scripts/smoke-host.mjs
git commit -m "fix(seo): omit robots tag on canonical production"
```

---

### Task 2: Align every first-party URL signal with the final `www` origin

**Files:**
- Modify: `scripts/check-build.mjs:11-24,111-116,387-392`
- Modify: `scripts/structured-data.test.mjs:1-43`
- Modify: `astro.config.mjs:4-9`
- Modify: `src/data/site.ts:112-129`
- Modify: `src/pages/sitemap.xml.ts:6-10`
- Modify: `public/robots.txt:1-4`
- Modify: `scripts/smoke-host.mjs:4`
- Modify: `scripts/audit-browser.test.mjs:10-13`
- Modify: `scripts/security-browser.mjs:207-212`

**Interfaces:**
- Produces: `Astro.site.origin === 'https://www.sisiwroclaw.pl'`.
- Produces: `BUSINESS.url === 'https://www.sisiwroclaw.pl'` and all schema URLs derived from it.
- Produces: sitemap, canonical, hreflang, Open Graph, robots sitemap, and JSON-LD URLs on the same origin.
- Consumes: Task 1's optional robots result and `none` smoke mode.

- [ ] **Step 1: Update rendered-build expectations before changing the URL producers**

Add these constants after `DIST` in `scripts/check-build.mjs`:

```js
const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
const BARE_ORIGIN = CANONICAL_ORIGIN.replace('www.', '');
```

Replace the two page-specific canonical assertions with:

```js
assert('pl canonical is final /pl/', plHome.includes(`href="${CANONICAL_ORIGIN}/pl/"`));
assert('en canonical is final locale-specific URL', read('en/index.html').includes(`rel="canonical" href="${CANONICAL_ORIGIN}/en/"`));
```

Immediately after `allHtml` is created, add:

```js
const sitemapXml = read('sitemap.xml');
const robotsSource = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8');
assert('rendered HTML uses the final www origin', allHtml.includes(CANONICAL_ORIGIN));
assert('rendered HTML contains no bare absolute origin', !allHtml.includes(BARE_ORIGIN));
assert('sitemap uses the final www origin', sitemapXml.includes(`<loc>${CANONICAL_ORIGIN}/`));
assert('sitemap contains no bare absolute origin', !sitemapXml.includes(BARE_ORIGIN));
assert(
  'robots.txt names the final-host sitemap',
  robotsSource.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`) && !robotsSource.includes(BARE_ORIGIN),
);
```

- [ ] **Step 2: Extend structured-data coverage to the final origin**

Add this constant after the imports in `scripts/structured-data.test.mjs`:

```js
const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
```

Replace the `event schema attaches only the verified offer to priced events` test with:

```js
test('structured data uses the final origin and attaches only verified event offers', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { BUSINESS, eventSchema, nightClubSchema, websiteSchema } = await server.ssrLoadModule('/src/data/site.ts');
    const event = {
      title: 'Verified price fixture',
      slug: '2026-07-13-verified-price-fixture',
      start: '2026-07-13T22:00:00+02:00',
      img: '/events/verified-price-fixture.webp',
    };
    const [priced] = eventSchema([{ ...event, price: 30 }], 'en');
    const [unpriced] = eventSchema([event], 'en');
    const graph = [nightClubSchema('en'), websiteSchema('en'), priced];
    const serialized = JSON.stringify(graph);

    assert.equal(BUSINESS.url, CANONICAL_ORIGIN);
    assert.ok(serialized.includes(CANONICAL_ORIGIN));
    assert.equal(serialized.includes(CANONICAL_ORIGIN.replace('www.', '')), false);
    assert.equal(priced.url, `${CANONICAL_ORIGIN}/en/events/${event.slug}/`);
    assert.equal(priced.organizer.url, CANONICAL_ORIGIN);
    assert.deepEqual(priced.offers, { '@type': 'Offer', price: 30, priceCurrency: 'PLN' });
    assert.equal(unpriced.offers, undefined);
  } finally {
    await server.close();
  }
});
```

- [ ] **Step 3: Run the new expectations and verify red**

Run:

```bash
npx --yes node@22.12.0 --test scripts/structured-data.test.mjs
npx --yes node@22.12.0 /usr/bin/npm run build:check
```

Expected: both commands exit non-zero. Structured data still reports the bare origin, and the built canonical/sitemap assertions still expect URLs that have not been produced.

- [ ] **Step 4: Change every runtime canonical origin to `www`**

Apply these exact values:

```js
// astro.config.mjs
site: 'https://www.sisiwroclaw.pl',
```

```ts
// src/data/site.ts
export const BUSINESS = {
  name: 'SiSi Wrocław',
  url: 'https://www.sisiwroclaw.pl',
  logo: 'https://www.sisiwroclaw.pl/apple-touch-icon.png',
  image: 'https://www.sisiwroclaw.pl/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
  streetAddress: 'Rzeźnicza 32-33',
  locality: 'Wrocław',
  region: 'Dolnośląskie',
  postalCode: '50-130',
  country: 'PL',
  priceRange: '$$',
};
```

```ts
// src/pages/sitemap.xml.ts
const origin = (site?.href ?? 'https://www.sisiwroclaw.pl/').replace(/\/$/, '');
```

Replace `public/robots.txt` with:

```text
User-agent: *
Allow: /

Sitemap: https://www.sisiwroclaw.pl/sitemap.xml
```

- [ ] **Step 5: Align the verification harness origins**

Use this constant in both `scripts/smoke-host.mjs` and `scripts/audit-browser.test.mjs`:

```js
const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
```

Change the production fixture environment in `scripts/security-browser.mjs` to:

```js
env: { ...process.env, CONTEXT: 'production', URL: 'https://www.sisiwroclaw.pl' },
```

- [ ] **Step 6: Verify the focused origin and build checks are green**

Run:

```bash
npx --yes node@22.12.0 --test scripts/launch.test.mjs scripts/smoke-host.test.mjs scripts/structured-data.test.mjs
npx --yes node@22.12.0 /usr/bin/npm run build:check
```

Expected: both commands exit `0`; the build report contains only passing assertions.

- [ ] **Step 7: Prove no runtime or verification source still hard-codes the bare absolute origin**

Run:

```bash
if rg -n --glob '!.claude/**' --glob '!docs/superpowers/specs/*.md' --glob '!docs/superpowers/plans/*.md' 'https://sisiwroclaw\.pl' astro.config.mjs public scripts src; then
  exit 1
fi
```

Expected: no matches and exit `0`.

- [ ] **Step 8: Commit canonical-origin alignment**

```bash
git add astro.config.mjs public/robots.txt scripts/audit-browser.test.mjs scripts/check-build.mjs scripts/security-browser.mjs scripts/smoke-host.mjs scripts/structured-data.test.mjs src/data/site.ts src/pages/sitemap.xml.ts
git commit -m "fix(seo): align canonical signals with www"
```

---

### Task 3: Run the production matrix and prepare the validated release

**Files:**
- Verify only: all Task 1 and Task 2 files
- Generated and untracked: `dist/` from builds; never commit it

**Interfaces:**
- Consumes: final `www` URL producers, optional robots result, and smoke `none` mode.
- Produces: one fully verified feature-branch SHA suitable for publication after explicit user approval.

- [ ] **Step 1: Run the complete release gate on Node 22.12.0**

Run:

```bash
npx --yes node@22.12.0 /usr/bin/npm run verify:release
```

Expected: exit `0`; unit tests, Astro check, production build assertions, and the security-browser suite all pass.

- [ ] **Step 2: Build with the exact canonical Netlify production environment**

Run:

```bash
CONTEXT=production URL=https://www.sisiwroclaw.pl npx --yes node@22.12.0 /usr/bin/npm run build
```

Expected: exit `0`.

Run:

```bash
rg -l 'name="robots"' dist --glob '*.html' | sort
```

Expected output contains only:

```text
dist/404.html
dist/index.html
```

Run:

```bash
rg -n 'name="robots" content="noindex, follow"' dist/404.html dist/index.html
```

Expected: one match in each file.

- [ ] **Step 3: Smoke-test the production build locally with required robots absence**

In one terminal, run:

```bash
PORT=4321 npx --yes node@22.12.0 scripts/serve-dist.mjs
```

In another terminal, run:

```bash
npx --yes node@22.12.0 scripts/smoke-host.mjs http://127.0.0.1:4321 none
```

Expected: exit `0`; the JSON summary reports `"ok": true`, every sitemap page passes canonical metadata checks, and the utility 404 remains non-indexable. Stop the local server after the smoke command finishes.

- [ ] **Step 4: Review the exact release diff and workspace boundary**

Run:

```bash
git diff origin/main...HEAD --check
git diff origin/main...HEAD --stat
git diff origin/main...HEAD -- astro.config.mjs public/robots.txt scripts src
git status --short --branch --untracked-files=all
```

Expected: only the files named by Tasks 1 and 2 differ; `dist/` is ignored; `.claude/worktrees/b2b/` is not staged or modified.

- [ ] **Step 5: Stop for explicit publication approval**

Report the two commit SHAs, the complete release-gate result, the robots inventory, and the local smoke summary. Ask the user whether to push the validated application changes and deploy them. Do not push a branch or change `main` until the user answers yes.

---

### Task 4: Publish through the required GitHub gate and verify the live host

**Files:**
- No source edits expected
- Remote refs: feature validation branch, then `main`

**Interfaces:**
- Consumes: the user-approved, verified Task 3 SHA.
- Produces: protected `main` at that exact SHA, a completed Netlify deploy trigger, and live-host verification evidence.

- [ ] **Step 1: Rebase onto the current protected branch and rerun the gate if `main` advanced**

Run:

```bash
git fetch origin main
git rebase origin/main
npx --yes node@22.12.0 /usr/bin/npm run verify:release
```

Expected: the rebase succeeds and the full gate exits `0`. If the rebase changes the feature SHA, use the new SHA for every remaining step.

- [ ] **Step 2: Push the validation branch and wait for the required check**

Run:

```bash
git push -u origin HEAD:refs/heads/agent/search-indexing-fix
```

Find the `Launch gate` run whose `headSha` equals `git rev-parse HEAD`, waiting up to 30 seconds for GitHub to create it:

```bash
sha="$(git rev-parse HEAD)"
run_id=''
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  run_id="$(gh run list --branch agent/search-indexing-fix --workflow "Launch gate" --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$sha\") | .databaseId" | head -n 1)"
  if [ -n "$run_id" ]; then break; fi
  sleep 3
done
test -n "$run_id"
gh run watch "$run_id" --exit-status
```

Expected: `Launch gate / test` completes successfully for the exact feature SHA.

- [ ] **Step 3: Confirm `main` did not advance after validation, then push the exact validated SHA**

Run:

```bash
git fetch origin main
test "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)"
git push origin HEAD:main
```

Expected: the ancestry check and push exit `0`. If the ancestry check fails, return to Task 4 Step 1, rebase, rerun the complete gate, update the validation branch with `--force-with-lease`, and wait for the new SHA's status before trying `main` again.

- [ ] **Step 4: Delete the temporary branch and verify the protected remote state**

Run:

```bash
git push origin --delete agent/search-indexing-fix
git fetch origin main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
git ls-remote --heads origin refs/heads/agent/search-indexing-fix
```

Expected: the SHA comparison succeeds and the final command prints nothing.

- [ ] **Step 5: Wait for both `main` workflows**

Find and watch the `Launch gate` and `Deploy to Netlify` runs whose `headSha` equals the published SHA, allowing up to 30 seconds for each run to appear:

```bash
sha="$(git rev-parse HEAD)"
for workflow in "Launch gate" "Deploy to Netlify"; do
  run_id=''
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    run_id="$(gh run list --commit "$sha" --workflow "$workflow" --limit 5 --json databaseId,headSha --jq ".[] | select(.headSha == \"$sha\") | .databaseId" | head -n 1)"
    if [ -n "$run_id" ]; then break; fi
    sleep 3
  done
  test -n "$run_id"
  gh run watch "$run_id" --exit-status
done
```

Expected: `Launch gate` completes successfully; `Deploy to Netlify` completes successfully, including its `Deploy gate / test` and `Trigger Netlify production build` jobs.

- [ ] **Step 6: Verify one-hop host redirects after the Netlify build is live**

First probe whether the new metadata is live:

```bash
html="$(curl -sS --max-time 20 https://www.sisiwroclaw.pl/pl/)"
printf '%s' "$html" | rg 'rel="canonical" href="https://www.sisiwroclaw.pl/pl/"'
if printf '%s' "$html" | rg -n '<meta name="robots"'; then
  exit 1
fi
```

Expected: the canonical line prints and the robots search finds nothing. If this probe still sees the old deployment, wait 20 seconds and rerun it as a separate command, for at most 15 attempts. Report progress at least once per minute. If the fifteenth attempt still sees the old deployment, stop and report a deploy-propagation blocker.

Run:

```bash
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' http://sisiwroclaw.pl/pl/
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' https://sisiwroclaw.pl/pl/
curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.sisiwroclaw.pl/pl/
```

Expected:

```text
301 https://www.sisiwroclaw.pl/pl/
301 https://www.sisiwroclaw.pl/pl/
200 
```

- [ ] **Step 7: Run the complete live-host smoke test**

Run:

```bash
npx --yes node@22.12.0 scripts/smoke-host.mjs https://www.sisiwroclaw.pl none
```

Expected: exit `0`; the JSON summary reports `"ok": true`, all sitemap routes use the final origin and omit robots, referenced assets return `200`, security headers remain present, and the utility 404 is non-indexable.

- [ ] **Step 8: Perform raw acceptance checks**

Run:

```bash
curl -sS --max-time 20 https://www.sisiwroclaw.pl/pl/ | rg 'rel="canonical" href="https://www.sisiwroclaw.pl/pl/"|property="og:url" content="https://www.sisiwroclaw.pl/pl/"'
if curl -sS --max-time 20 https://www.sisiwroclaw.pl/pl/ | rg -n '<meta name="robots"'; then
  exit 1
fi
if curl -sS --max-time 20 https://www.sisiwroclaw.pl/sitemap.xml | rg -n '<loc>https://sisiwroclaw\.pl'; then
  exit 1
fi
curl -sS --max-time 20 https://www.sisiwroclaw.pl/robots.txt | rg 'Sitemap: https://www.sisiwroclaw.pl/sitemap.xml'
```

Expected: the two final-host metadata lines and final-host sitemap declaration are printed; both negative checks exit without matches.

- [ ] **Step 9: Handle a failed live acceptance check without weakening indexing safety**

If any live acceptance command fails after the new deployment is confirmed live, stop publication follow-up and preserve its exact response evidence. Ask the user whether to restore the previous ready Netlify deploy through Netlify's deploy rollback control; do not perform that external rollback without approval. Do not change the helper to index an unverified host. Diagnose the production `URL` value and custom-domain assignment before preparing another release.

Search Console URL Inspection and sitemap resubmission are not part of this plan. Offer them only after all live acceptance checks pass and the user separately authorizes those account-level actions.
