# Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every repository-controllable P0 and P1 launch-readiness finding, publish the verified revision to Netlify from `main`, and hand the owner an exact DNS cutover and rollback checklist.

**Architecture:** Keep the existing static Astro and Netlify design. Put security-sensitive serialization, indexing, attribution, event-quality, header-generation, and smoke-test logic behind small pure modules; make the release workflow consume one Node 22 test gate; defer DNS mutation to the owner.

**Tech Stack:** Astro 7, TypeScript, Node.js 22.12, Node test runner, Playwright Core with system Chromium, axe-core, Netlify Forms and response headers, GitHub Actions.

## Global Constraints

- Do not change DNS records.
- Do not invent events, client case studies, legal approval, business approval, accessibility claims, or translations.
- Remove or soften unverified `21+`, 120-minute prepayment, `663 m²`, and coordinate claims; retain only already-supported facts.
- Keep the Google Drive event-authoring workflow and reject unsafe or sample-quality records before they can be committed.
- Do not submit personal data during form verification; use a labeled non-personal record only if it can be read back and deleted.
- Do not invent a Netlify notification recipient; report a dashboard-only notification step as an owner action.
- Use Node `22.12.0` for every release gate.
- Preserve the unrelated untracked `.claude/` tree and never stage it.
- Push directly to `main` only after all local gates and code review pass; configure branch protection after that authorized push.
- The release is not complete until the published Netlify deploy reports the exact pushed commit and final-host smoke checks pass.

---

## File Map

- `src/lib/launch.mjs`: HTML-safe JSON serialization and canonical-host indexing decision.
- `src/lib/attribution.mjs`: bounded allowlist for campaign attribution.
- `src/lib/event-quality.mjs`: deterministic content and duplicate-image validation shared by tests and event sync.
- `src/layouts/Base.astro`: sole JSON-LD output boundary and robots metadata consumer.
- `src/data/site.ts`: verified business facts and truthful structured-data builders.
- `scripts/launch.test.mjs`, `scripts/attribution.test.mjs`, `scripts/event-quality.test.mjs`: pure regression tests.
- `scripts/security-browser.mjs`: browser execution regression for the original JSON-LD payload family.
- `scripts/generate-headers.mjs`, `scripts/generate-headers.test.mjs`: fail-closed inline-script inventory, bootstrap hash, and Netlify `_headers` generation.
- `scripts/serve-dist.mjs`: local static server that applies generated Netlify headers for browser and smoke verification.
- `scripts/audit-browser.mjs`: sitemap crawl, link/status/error/reflow/axe/CSP verification.
- `scripts/smoke-host.mjs`: deployed-host canonical, robots, redirect, header, form, and asset checks.
- `scripts/check-build.mjs`: rendered-copy and markup assertions.
- `src/components/home/Events.astro`: localized intentional empty state.
- `src/components/DatePicker.astro`, `src/components/home/Reservations.astro`, `src/components/pages/ReservationsPage.astro`, `src/components/pages/LegalPage.astro`, `src/components/b2b/B2BEnquiryForm.astro`: launch accessibility, semantics, and privacy fixes.
- `src/components/CookieBanner.astro` plus `src/i18n/ui/{pl,en,de,it,cs}.ts` and `src/i18n/legal.ts`: accurate essential-storage notice and removal of unverified copy.
- `src/styles/global.css`: shared AA contrast tokens.
- `netlify.toml`: build, cache, and platform configuration.
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/sync-events.yml`: immutable Node 22 test/deploy controls.

---

### Task 1: Safe JSON-LD and production indexing

**Files:**
- Create: `src/lib/launch.mjs`
- Create: `scripts/launch.test.mjs`
- Modify: `src/layouts/Base.astro`
- Modify: `package.json`

**Interfaces:**
- Produces: `jsonForHtml(value: unknown): string`
- Produces: `robotsDirective({ context, siteUrl, canonicalOrigin, noindex }): 'index, follow' | 'noindex, follow' | 'noindex, nofollow'`
- Consumes later: Task 9's browser regression and Task 10's final-host smoke check.

- [ ] **Step 1: Write the failing serialization and indexing matrix**

```js
// scripts/launch.test.mjs
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
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `npx --yes node@22.12.0 --test scripts/launch.test.mjs`

Expected: FAIL because `src/lib/launch.mjs` does not exist.

- [ ] **Step 3: Implement the two pure boundaries**

```js
// src/lib/launch.mjs
export function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function origin(value) {
  try { return new URL(value).origin; } catch { return null; }
}

export function robotsDirective({ context, siteUrl, canonicalOrigin, noindex = false }) {
  const siteOrigin = origin(siteUrl);
  const canonical = origin(canonicalOrigin);
  if (context !== 'production' || !siteOrigin || !canonical || siteOrigin !== canonical) {
    return 'noindex, nofollow';
  }
  return noindex ? 'noindex, follow' : 'index, follow';
}
```

Update `src/layouts/Base.astro` to import `BUSINESS` and both helpers, build `jsonLd` as before, replace the hard-coded `PRODUCTION_URL` block with:

```ts
const robotsContent = robotsDirective({
  context: process.env.CONTEXT,
  siteUrl: process.env.URL,
  canonicalOrigin: BUSINESS.url,
  noindex,
});
```

Replace every JSON-LD body with:

```astro
{jsonLd.map((value) => (
  <script type="application/ld+json" set:html={jsonForHtml(value)} />
))}
```

Change `package.json` so the unit runner includes repository-root tests:

```json
"test:unit": "node --test scripts/*.test.mjs scripts/events-sync/*.test.mjs"
```

- [ ] **Step 4: Verify green and rendered integration**

Run: `npx --yes node@22.12.0 --test scripts/launch.test.mjs`

Expected: 8 passing tests.

Run: `CONTEXT=production URL=https://sisiwroclaw.pl npx --yes node@22.12.0 /usr/bin/npm run build && rg -n 'name="robots" content="index, follow"' dist/pl/index.html`

Expected: build succeeds and the Polish home page is indexable.

Run: `CONTEXT=production URL=https://sisi-wroclaw.netlify.app npx --yes node@22.12.0 /usr/bin/npm run build && rg -n 'name="robots" content="noindex, nofollow"' dist/pl/index.html`

Expected: build succeeds and the Netlify-host build is not indexable.

- [ ] **Step 5: Commit the security boundary**

```bash
git add package.json scripts/launch.test.mjs src/lib/launch.mjs src/layouts/Base.astro
git commit -m "fix: secure structured data and indexing"
```

---

### Task 2: Event publication quality and intentional empty lineup

**Files:**
- Create: `src/lib/event-quality.mjs`
- Create: `scripts/event-quality.test.mjs`
- Modify: `scripts/events-sync/parse.mjs`
- Modify: `scripts/sync-events.mjs`
- Modify: `scripts/events-sync/parse.test.mjs`
- Modify: `src/data/events.generated.ts`
- Modify: `src/components/home/Events.astro`
- Modify: `scripts/check-build.mjs`
- Delete: current files under `public/events/` that are referenced only by the withdrawn generated records.

**Interfaces:**
- Produces: `validatePublicEvent(fields, dateKey): string[]`
- Produces: `duplicateBannerErrors(records: Array<{ dateKey: string, digest: string }>): string[]`
- Task 2's sync calls both before writing generated data or pruning the last-good image set.

- [ ] **Step 1: Write failing quality-policy tests**

```js
// scripts/event-quality.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicEvent, duplicateBannerErrors } from '../src/lib/event-quality.mjs';

const valid = { title: 'SiSi Friday', dj: 'Marta', startTime: '22:00', description: 'Autorski wieczór klubowy.', genres: ['house'] };

test('accepts a complete public event', () => assert.deepEqual(validatePublicEvent(valid, '17-07-2026'), []));
for (const token of ['ADB', 'ABC', 'Krótki opis wydarzenia', 'JungleW']) {
  test(`rejects sample token ${token}`, () => {
    const fields = { ...valid, description: token, dj: token, genres: [token] };
    assert.match(validatePublicEvent(fields, '17-07-2026').join(' '), /sample-quality/i);
  });
}
test('rejects control characters', () => assert.match(validatePublicEvent({ ...valid, title: 'Night\u0007' }, '17-07-2026').join(' '), /control/i));
test('rejects malformed genre labels', () => assert.match(validatePublicEvent({ ...valid, genres: ['house<script>'] }, '17-07-2026').join(' '), /genre/i));
test('rejects one banner reused by two dates', () => assert.deepEqual(
  duplicateBannerErrors([{ dateKey: '17-07-2026', digest: 'same' }, { dateKey: '18-07-2026', digest: 'same' }]),
  ['banner digest same is reused by 17-07-2026, 18-07-2026'],
));
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `npx --yes node@22.12.0 --test scripts/event-quality.test.mjs`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement deterministic event-quality rules**

```js
// src/lib/event-quality.mjs
const SAMPLE_TOKENS = ['adb', 'abc', 'krótki opis wydarzenia', 'junglew'];
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const GENRE = /^[\p{L}\p{N}][\p{L}\p{N} &'’+./-]{0,39}$/u;

export function validatePublicEvent(fields, dateKey) {
  const errors = [];
  if (!fields.title?.trim()) errors.push('missing Title');
  if (!/^\d{1,2}:\d{2}$/.test(fields.startTime || '')) errors.push('missing or invalid Start time');
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateKey || '')) errors.push('invalid date in filename');
  const values = [fields.title, fields.dj, fields.description, ...(fields.genres || [])].filter(Boolean).map((v) => String(v));
  if (values.some((v) => CONTROL.test(v))) errors.push('unsafe control character');
  if (values.some((v) => SAMPLE_TOKENS.includes(v.trim().toLocaleLowerCase('pl')))) errors.push('sample-quality content');
  if ((fields.genres || []).some((genre) => !GENRE.test(String(genre)))) errors.push('invalid Music Genre');
  return [...new Set(errors)];
}

export function duplicateBannerErrors(records) {
  const datesByDigest = new Map();
  for (const { dateKey, digest } of records) {
    const dates = datesByDigest.get(digest) || [];
    dates.push(dateKey);
    datesByDigest.set(digest, dates);
  }
  return [...datesByDigest]
    .filter(([, dates]) => dates.length > 1)
    .map(([digest, dates]) => `banner digest ${digest} is reused by ${dates.sort().join(', ')}`);
}
```

Make `scripts/events-sync/parse.mjs` import and re-export `validatePublicEvent` as `validateEvent`, so existing callers keep one name. In `scripts/sync-events.mjs`, hash every optimized banner with `createHash('sha256').update(optimized).digest('hex')`, collect `{ dateKey, digest }`, append `duplicateBannerErrors(records)` to `failed`, and keep each `{ fileName, optimized }` in a `pendingImages` array rather than writing during validation. Evaluate the last-good count before accepting zero records:

```js
const prev = await prevEventCount();
if (prev > 0 && events.length < prev * DROP_THRESHOLD) {
  fail(`Valid count dropped ${prev} -> ${events.length} (> 50%); refusing`, [], skipped);
  return;
}
```

This permits an intentionally empty source only when the committed last-good lineup is already empty; a scheduled sync cannot mass-unpublish a populated lineup.

Only after the `failed` and sharp-drop checks pass, write the pending images, prune unused generated WebP files, and write `events.generated.ts`:

```js
for (const { fileName, optimized } of pendingImages) {
  await writeIfChanged(path.join(IMG_DIR, fileName), optimized);
}
await pruneImages(usedImages);
await writeIfChanged(OUT_DATA, Buffer.from(renderModule(events)));
```

This keeps all repository files unchanged when a publication gate rejects the source.

- [ ] **Step 4: Withdraw sample records and render an empty state**

Set `src/data/events.generated.ts` to exactly:

```ts
// GENERATED by scripts/sync-events.mjs from the "Wydarzenia" Google Drive
// folder (Banery + Opisy). Do not edit by hand - the next sync overwrites it.
import type { EventItem } from './site';

export const GENERATED_EVENTS: EventItem[] = [];
```

In `src/components/home/Events.astro`, render the existing localized `t.eventsPage.empty` text when `upcoming.length === 0`; otherwise render the cards. Delete only the image files named by the withdrawn generated records after `rg -n '<exact filename>' src public scripts` confirms no remaining reference.

Replace date- and sample-specific assertions in `scripts/check-build.mjs` with:

```js
assert('no sample event copy', !allHtml.includes('Krótki opis wydarzenia') && !allHtml.includes('JungleW'));
assert('no stale June event routes', !existsSync(join(DIST, 'pl/wydarzenia/2026-06-26-friday-at-sisi/index.html')));
for (const locale of ['pl', 'en', 'de', 'it', 'cs']) {
  assert(`${locale} home has empty event state`, read(`${locale}/index.html`).includes(emptyEventCopy[locale]));
}
```

- [ ] **Step 5: Verify event tests and build**

Run: `npx --yes node@22.12.0 --test scripts/event-quality.test.mjs scripts/events-sync/parse.test.mjs`

Expected: all tests pass.

Run: `npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 scripts/check-build.mjs`

Expected: build assertions pass, no event detail HTML is generated, and all five home pages show the localized empty state.

- [ ] **Step 6: Commit the publication gate**

```bash
git add scripts/event-quality.test.mjs scripts/events-sync/parse.mjs scripts/events-sync/parse.test.mjs scripts/sync-events.mjs src/lib/event-quality.mjs src/data/events.generated.ts src/components/home/Events.astro scripts/check-build.mjs public/events
git commit -m "fix: reject unsafe event content"
```

---

### Task 3: Verified facts, legal fallback, and truthful event schema

**Files:**
- Modify: `src/data/site.ts`
- Modify: `src/layouts/Base.astro`
- Modify: `src/i18n/legal.ts`
- Modify: `src/i18n/ui/pl.ts`
- Modify: `src/i18n/ui/en.ts`
- Modify: `src/i18n/ui/de.ts`
- Modify: `src/i18n/ui/it.ts`
- Modify: `src/i18n/ui/cs.ts`
- Modify: `src/components/pages/LegalPage.astro`
- Modify: `src/components/b2b/VenueFacts.astro`
- Modify: `scripts/check-build.mjs`
- Create: `scripts/structured-data.test.mjs`
- Create: `src/lib/event-offer.mjs`

**Interfaces:**
- `BUSINESS` no longer exposes latitude or longitude.
- `VENUE_FACTS` exposes only `theCorkSeated` and `presentationScreens`.
- Produces: `eventOffer(price: unknown): { '@type': 'Offer', price: number, priceCurrency: 'PLN' } | undefined`.
- `eventSchema(list, locale)` emits no generic reservation URL and no availability claim; a numeric event price yields `{ '@type': 'Offer', price, priceCurrency: 'PLN' }`.

- [ ] **Step 1: Add failing source and rendered assertions**

```js
// scripts/structured-data.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { eventOffer } from '../src/lib/event-offer.mjs';

const files = ['src/data/site.ts', 'src/i18n/legal.ts', 'src/i18n/ui/pl.ts', 'src/i18n/ui/en.ts', 'src/i18n/ui/de.ts', 'src/i18n/ui/it.ts', 'src/i18n/ui/cs.ts', 'src/layouts/Base.astro'];
test('unverified launch claims are absent from source', async () => {
  const text = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  for (const pattern of [/663\s*m/i, /over 21/i, /21\+/i, /120 minut/i, /120 minutes/i, /GeoCoordinates/, /geo\.position/, /\bInStock\b/]) {
    assert.doesNotMatch(text, pattern);
  }
});
test('event offers state only a verified numeric entry price', () => {
  assert.deepEqual(eventOffer(30), { '@type': 'Offer', price: 30, priceCurrency: 'PLN' });
  assert.equal(eventOffer(undefined), undefined);
  assert.equal(eventOffer(Number.NaN), undefined);
});
```

Add build assertions that no generated HTML contains those phrases or coordinate metadata, and that each DE/IT/CS legal body has a descendant with `lang="en"`.

- [ ] **Step 2: Run the test and verify red**

Run: `npx --yes node@22.12.0 --test scripts/structured-data.test.mjs`

Expected: FAIL on the existing unverified claims.

- [ ] **Step 3: Remove claims without inventing replacements**

Apply these exact data-shape changes in `src/data/site.ts`:

```ts
export const VENUE_FACTS = {
  theCorkSeated: 150,
  presentationScreens: 2,
};

export const BUSINESS = {
  name: 'SiSi Wrocław',
  url: 'https://sisiwroclaw.pl',
  logo: 'https://sisiwroclaw.pl/apple-touch-icon.png',
  image: 'https://sisiwroclaw.pl/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
  streetAddress: 'Rzeźnicza 32-33',
  locality: 'Wrocław',
  region: 'Dolnośląskie',
  postalCode: '50-130',
  country: 'PL',
  priceRange: '$$',
};
```

Remove the `geo` property from `nightClubSchema`, remove the four geo meta tags from `Base.astro`, and change event offers to:

```ts
const offer = eventOffer(e.price);
if (offer) ev.offers = offer;
```

Create the imported pure helper:

```js
// src/lib/event-offer.mjs
export function eventOffer(price) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return undefined;
  return { '@type': 'Offer', price, priceCurrency: 'PLN' };
}
```

Across all five UI dictionaries, remove the venue-area fact item and the numeric area clause from B2B meta/transition copy. Remove only the age restriction and 120-minute rules from reservation and legal arrays; keep separately supported pricing, conduct, ID-at-entry, and payment terms. Do not add new policy text.

Wrap the rendered English fallback body in `src/components/pages/LegalPage.astro`:

```astro
<div class="legal-body" lang={translated ? undefined : 'en'}>
  {doc.sections.map((section) => (
    <Fragment>
      <h2>{fill(section.heading)}</h2>
      {section.paragraphs?.map((paragraph) => <p>{fill(paragraph)}</p>)}
      {section.items && <ul>{section.items.map((item) => <li>{fill(item)}</li>)}</ul>}
    </Fragment>
  ))}
</div>
```

- [ ] **Step 4: Verify source, type, and rendered facts**

Run: `npx --yes node@22.12.0 --test scripts/structured-data.test.mjs`

Expected: PASS.

Run: `npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 scripts/check-build.mjs`

Expected: PASS with no unverified claims in `dist/` and correct English fallback language.

- [ ] **Step 5: Commit factual corrections**

```bash
git add scripts/structured-data.test.mjs scripts/check-build.mjs src/lib/event-offer.mjs src/data/site.ts src/layouts/Base.astro src/i18n/legal.ts src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts src/components/pages/LegalPage.astro src/components/b2b/VenueFacts.astro
git commit -m "fix: remove unverified launch claims"
```

---

### Task 4: Attribution minimization and essential-storage notice

**Files:**
- Create: `src/lib/attribution.mjs`
- Create: `scripts/attribution.test.mjs`
- Modify: `src/components/b2b/B2BEnquiryForm.astro`
- Modify: `src/components/CookieBanner.astro`
- Modify: `src/i18n/ui/pl.ts`
- Modify: `src/i18n/ui/en.ts`
- Modify: `src/i18n/ui/de.ts`
- Modify: `src/i18n/ui/it.ts`
- Modify: `src/i18n/ui/cs.ts`
- Modify: `src/i18n/legal.ts`
- Modify: `scripts/check-build.mjs`

**Interfaces:**
- Produces: `campaignAttribution(search: string): string` with five allowed keys, 100 UTF-16 code units per value, and 512 code units total.
- Cookie storage key becomes `sisi-cookie-notice`; its sole value is `dismissed`.

- [ ] **Step 1: Write the failing attribution contract**

```js
// scripts/attribution.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAttribution } from '../src/lib/attribution.mjs';

test('keeps only campaign keys in stable order', () => {
  assert.equal(
    campaignAttribution('?email=person%40example.com&utm_campaign=opening&utm_source=instagram&token=secret'),
    'utm_source=instagram&utm_campaign=opening',
  );
});
test('caps values and total output', () => {
  const result = campaignAttribution(`?utm_source=${'x'.repeat(300)}&utm_content=${'y'.repeat(600)}`);
  const values = [...new URLSearchParams(result).values()];
  assert.equal(values.every((value) => value.length <= 100), true);
  assert.equal(result.length <= 512, true);
});
test('returns empty output for non-campaign input', () => assert.equal(campaignAttribution('?email=a%40b.pl'), ''));
```

- [ ] **Step 2: Run the test and verify red**

Run: `npx --yes node@22.12.0 --test scripts/attribution.test.mjs`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement and consume the allowlist**

```js
// src/lib/attribution.mjs
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const VALUE_LIMIT = 100;
const TOTAL_LIMIT = 512;

export function campaignAttribution(search) {
  const source = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const kept = new URLSearchParams();
  for (const key of KEYS) {
    const value = source.get(key)?.trim().slice(0, VALUE_LIMIT);
    if (value) kept.set(key, value);
  }
  let output = kept.toString();
  if (output.length <= TOTAL_LIMIT) return output;
  while (output.length > TOTAL_LIMIT && [...kept.keys()].length) {
    kept.delete([...kept.keys()].at(-1));
    output = kept.toString();
  }
  return output;
}
```

Change the B2B component's client script to an Astro-processed module, import `campaignAttribution`, retain the localized `messages` value through a JSON data attribute on the form, and assign only `campaignAttribution(location.search)` to the hidden `utm` input. Preserve the current page-path field and form fallback contact details.

- [ ] **Step 4: Convert consent UI to a truthful notice**

Render one localized dismissal button:

```astro
<button type="button" class="btn-cta cookie-btn" data-cookie-dismiss>{t.cookie.dismiss}</button>
```

Use one storage record:

```js
const KEY = 'sisi-cookie-notice';
if (!localStorage.getItem(KEY)) {
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    banner.hidden = false;
    banner.querySelector('[data-cookie-dismiss]')?.addEventListener('click', () => {
      try { localStorage.setItem(KEY, 'dismissed'); } catch {}
      banner.hidden = true;
    });
  }
}
```

Render this logic in a normal Astro-processed `<script>` without `is:inline`; it has no server-only values. The B2B script is also a normal processed module and reads localized messages from the form's bounded JSON `data-messages` attribute. Task 6 forces processed modules into same-origin asset files for the final CSP.

In all five dictionaries replace `accept` and `reject` with one `dismiss` label and state that the site stores only the notice dismissal and essential form/navigation state. Update cookie/legal prose to match, without claiming analytics or advertising consent.

- [ ] **Step 5: Verify privacy behavior and rendered copy**

Run: `npx --yes node@22.12.0 --test scripts/attribution.test.mjs`

Expected: 3 passing tests.

Run: `npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 scripts/check-build.mjs`

Expected: no whole-query assignment, no accept/reject pair, one notice button in every locale, and B2B form fallback contacts remain in HTML.

- [ ] **Step 6: Commit privacy corrections**

```bash
git add scripts/attribution.test.mjs scripts/check-build.mjs src/lib/attribution.mjs src/components/b2b/B2BEnquiryForm.astro src/components/CookieBanner.astro src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts src/i18n/legal.ts
git commit -m "fix: minimize launch data collection"
```

---

### Task 5: Accessibility semantics, contrast, and 320-pixel reflow

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/audit-browser.mjs`
- Modify: `src/styles/global.css`
- Modify: `src/components/DatePicker.astro`
- Modify: `src/components/home/Reservations.astro`
- Modify: `src/components/pages/ReservationsPage.astro`
- Modify: `src/components/b2b/B2BEnquiryForm.astro`
- Modify: `src/components/CustomSelect.astro`
- Modify: `src/components/EventCard.astro`
- Modify: `src/components/b2b/B2BFAQ.astro`
- Modify: `src/components/b2b/B2BHero.astro`
- Modify: `src/components/b2b/CaseStudies.astro`
- Modify: `src/components/b2b/CaseStudyCard.astro`
- Modify: `src/components/b2b/EventFormats.astro`
- Modify: `src/components/b2b/EventProcess.astro`
- Modify: `src/components/b2b/Included.astro`
- Modify: `src/components/b2b/SpacesSection.astro`
- Modify: `src/components/b2b/VenueFacts.astro`
- Modify: `src/components/home/About.astro`
- Modify: `src/components/home/Hero.astro`
- Modify: `src/components/home/HomeCorporate.astro`
- Modify: `src/components/home/MenuTeaser.astro`
- Modify: `src/components/home/R32.astro`
- Modify: `src/components/pages/CareersPage.astro`
- Modify: `src/components/pages/EventDetailPage.astro`
- Modify: `src/components/pages/MenuPage.astro`

**Interfaces:**
- Produces script: `npm run audit:browser`, which starts no server itself and consumes `BASE_URL` defaulting to `http://127.0.0.1:4321`.
- `Reservations` accepts `headingLevel?: 'h1' | 'h2'`, defaulting to `h2`.
- Date input exposes `role="combobox"`, `aria-controls="<id>-dialog"`, `aria-expanded`, and `aria-autocomplete="none"`.

- [ ] **Step 1: Add the browser-audit dependencies and script**

Run: `npx --yes node@22.12.0 /usr/bin/npm install --save-dev @astrojs/check@latest typescript@latest @axe-core/playwright@latest playwright-core@latest`

Add these scripts:

```json
"check": "astro check",
"audit:browser": "node scripts/audit-browser.mjs",
"preview:ci": "astro preview --host 127.0.0.1 --port 4321"
```

The audit script must: launch `/usr/bin/google-chrome` headlessly; read all sitemap locations; test 320, 390, and 1440 CSS-pixel viewports; fail on non-2xx sitemap routes, failed same-origin assets, uncaught page errors, console errors, CSP violations, `scrollWidth > clientWidth`, broken same-origin links, or axe serious/critical findings; and print one JSON summary. Its assertion core is:

```js
const violations = (await new AxeBuilder({ page }).analyze()).violations
  .filter((violation) => ['serious', 'critical'].includes(violation.impact));
const overflow = await page.evaluate(() => ({
  document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  body: document.body.scrollWidth - document.body.clientWidth,
}));
assert.deepEqual(violations, [], `${url} ${width}px axe violations`);
assert.equal(Math.max(overflow.document, overflow.body), 0, `${url} ${width}px horizontal overflow`);
```

- [ ] **Step 2: Build, preview, and capture the expected failing baseline**

Run in terminal A: `CONTEXT=production URL=https://sisiwroclaw.pl npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 /usr/bin/npm run preview:ci`

Run in terminal B: `BASE_URL=http://127.0.0.1:4321 npx --yes node@22.12.0 scripts/audit-browser.mjs`

Expected: nonzero exit identifying the current date-picker ARIA, contrast, and/or narrow-layout findings with exact route and selector evidence.

- [ ] **Step 3: Correct heading and date-picker semantics**

In `Reservations.astro`, define `const Heading = headingLevel;` and render `<Heading class="display res-title">`. Pass `headingLevel="h1"` from `ReservationsPage.astro`; home usage keeps the default `h2`.

Give the date popup a stable ID and make the readonly input one coherent combobox:

```astro
<input
  id={id}
  name={name}
  class="b2b-dp-input"
  type="text"
  readonly
  required={required}
  placeholder={placeholder}
  aria-describedby={describedby}
  role="combobox"
  aria-autocomplete="none"
  aria-haspopup="dialog"
  aria-controls={`${id}-dialog`}
  aria-expanded="false"
  autocomplete="off"
  data-field-date
  data-dp-input
/>
<div id={`${id}-dialog`} data-dp-pop hidden role="dialog" aria-label={placeholder} aria-modal="false">
```

Keep `aria-expanded` synchronized in the existing `openPop()` and `closePop()` paths, focus a calendar day after open, close on Escape/outside click, and return focus to the input on Escape.

- [ ] **Step 4: Raise shared contrast and remove intrinsic-width overflow**

Use these minimum shared token values in `global.css`. In the files listed for this task, replace normal-sized foreground declarations below 0.70 alpha with `var(--text-faint)`, descriptive/body text with `var(--text-dim)`, and secondary but still meaningful labels with `var(--text-mute)`; keep lower opacity only for disabled controls that axe excludes from contrast requirements. Re-run axe after each route family and raise the semantic token rather than adding a new arbitrary alpha when a computed ratio remains below 4.5:1:

```css
:root {
  --text-dim: rgba(237, 219, 194, 0.82);
  --text-faint: rgba(237, 219, 194, 0.70);
  --text-mute: rgba(237, 219, 194, 0.62);
  --line: rgba(237, 219, 194, 0.24);
}
```

Add narrow-layout containment:

```css
.b2b-fields > *, .b2b-field, .res-grid > *, .res-row, .res-v { min-width: 0; }
.res-row { flex-wrap: wrap; }
.res-v { overflow-wrap: anywhere; }
@media (max-width: 360px) {
  .res-info { padding-inline: 20px; }
  .res-row { gap: 8px 16px; }
  .res-v { text-align: left; width: 100%; }
}
```

- [ ] **Step 5: Re-run type, rendered, browser, and manual keyboard gates**

Run: `npx --yes node@22.12.0 /usr/bin/npm run check`

Expected: zero Astro/TypeScript errors.

Run the preview and browser audit again.

Expected: every sitemap route passes at all three widths; zero serious/critical axe findings, page errors, console errors, CSP violations, broken internal links, and horizontal overflow.

Manually verify with Playwright keyboard input: skip link; desktop and mobile nav; locale switcher; date single/range selection, Escape, and focus return; invalid B2B submit focus; cookie notice; reduced-motion emulation; JavaScript-disabled home/events/legal content. Record the checks in the commit message body or release notes, not as product claims.

- [ ] **Step 6: Commit accessibility fixes**

```bash
git add package.json package-lock.json scripts/audit-browser.mjs src/styles/global.css src/components/CustomSelect.astro src/components/DatePicker.astro src/components/EventCard.astro src/components/b2b/B2BEnquiryForm.astro src/components/b2b/B2BFAQ.astro src/components/b2b/B2BHero.astro src/components/b2b/CaseStudies.astro src/components/b2b/CaseStudyCard.astro src/components/b2b/EventFormats.astro src/components/b2b/EventProcess.astro src/components/b2b/Included.astro src/components/b2b/SpacesSection.astro src/components/b2b/VenueFacts.astro src/components/home/About.astro src/components/home/Hero.astro src/components/home/HomeCorporate.astro src/components/home/MenuTeaser.astro src/components/home/R32.astro src/components/home/Reservations.astro src/components/pages/CareersPage.astro src/components/pages/EventDetailPage.astro src/components/pages/MenuPage.astro src/components/pages/ReservationsPage.astro
git commit -m "fix: meet launch accessibility gate"
```

---

### Task 6: CSP, security headers, cache policy, and unreachable legacy assets

**Files:**
- Create: `scripts/generate-headers.mjs`
- Create: `scripts/generate-headers.test.mjs`
- Create: `scripts/serve-dist.mjs`
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Modify: `netlify.toml`
- Modify: `scripts/check-build.mjs`
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`
- Delete: `public/framerusercontent.com/sites/2rfUz6ftVga1inOr8msfzE/` only after the reference scan is empty.

**Interfaces:**
- Produces: `inlineScriptHashes(html: string): string[]`
- Produces: `renderHeaders(hashes: string[]): string`
- `npm run build` becomes `astro build && node scripts/generate-headers.mjs` and leaves `dist/_headers` ready for Netlify.
- `npm run preview:ci` becomes `node scripts/serve-dist.mjs` so local browser tests receive the same generated root headers.

- [ ] **Step 1: Write failing header-policy tests**

```js
// scripts/generate-headers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { inlineScriptHashes, renderHeaders } from './generate-headers.mjs';

test('hashes executable inline scripts but not JSON-LD', () => {
  const hashes = inlineScriptHashes('<script>document.documentElement.classList.add(\'js\');</script><script type="application/ld+json">{"a":1}</script>');
  assert.equal(hashes.length, 1);
  assert.match(hashes[0], /^'sha256-[A-Za-z0-9+/]+=*'$/);
});
test('rejects an unrecognized executable inline script', () => {
  assert.throws(() => inlineScriptHashes('<script>globalThis.injected = true</script>'), /unexpected executable inline script/i);
});
test('renders the complete launch policy', () => {
  const output = renderHeaders(["'sha256-example='"]);
  for (const value of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin', 'Permissions-Policy: camera=(), microphone=(), geolocation=()']) {
    assert.match(output, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(output, /Access-Control-Allow-Origin/);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `npx --yes node@22.12.0 --test scripts/generate-headers.test.mjs`

Expected: FAIL because the generator is absent.

- [ ] **Step 3: Implement deterministic post-build headers**

Set `vite.build.assetsInlineLimit` to `0` in `astro.config.mjs` so Astro-processed scripts remain same-origin asset files. Remove the root fallback's JavaScript redirect from `src/pages/index.astro`; retain its noindex meta refresh and link while Netlify's 301 stays authoritative. Remove `is:inline` from the Base background-wake script so Astro processes it. The sole permitted executable inline body is the pre-paint bootstrap, exactly:

```js
document.documentElement.classList.add('js');
```

Use `node:crypto` SHA-256 over that exact body. `inlineScriptHashes(html)` must ignore scripts with `src` and `application/ld+json`, accept zero or one copy of the exact bootstrap, and throw on every other executable inline script. This makes a serialization regression fail the build instead of adding an attacker's hash to CSP. Scan every `dist/**/*.html`, sort and deduplicate the one permitted hash, and assert that no `type="module"` script remains inline. Export the pure functions without side effects and guard the CLI write with `if (import.meta.url === pathToFileURL(process.argv[1]).href)`. Render this root policy plus cache sections:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' <sorted hashes>; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

Also emit explicit image/media caching with revalidation unless the filename is content-addressed. Remove the wildcard CORS stanza from `netlify.toml`. Add `dist/_headers` assertions to `scripts/check-build.mjs`.

Create `scripts/serve-dist.mjs` with Node's `http` server. It must read the header pairs under the root `/*` block in `dist/_headers`, redirect `/` to `/pl/` with 301, safely decode and normalize request paths under `dist`, serve directory `index.html` files and the built 404 page, set MIME types for HTML/CSS/JS/JSON/XML/SVG/WebP/AVIF/PNG/WOFF2, and apply the generated root policy to every response. Reject a normalized path that escapes `dist` with 400. Listen on `127.0.0.1:${PORT || 4321}` and close cleanly on SIGINT/SIGTERM.

Update the package scripts:

```json
"build": "astro build && node scripts/generate-headers.mjs",
"preview:ci": "node scripts/serve-dist.mjs"
```

- [ ] **Step 4: Prove legacy Framer runtime is unreachable before deletion**

Run:

```bash
rg -n "2rfUz6ftVga1inOr8msfzE|script_main\.rutkxQsa|framer\.CGCSKzNy|searchIndex-Tt6XzcEXlw4a|searchIndex-pQKHGlPYIL3L" --glob '!public/framerusercontent.com/sites/**' .
```

Expected: no references. Then delete exactly `public/framerusercontent.com/sites/2rfUz6ftVga1inOr8msfzE/` with `apply_patch`. Preserve other self-hosted images and fonts.

- [ ] **Step 5: Verify headers and browser compatibility**

Run: `npx --yes node@22.12.0 --test scripts/generate-headers.test.mjs`

Expected: PASS.

Run: `CONTEXT=production URL=https://sisiwroclaw.pl npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 scripts/check-build.mjs`

Expected: `dist/_headers` exists, no wildcard CORS, and all rendered assertions pass.

Run `npm run preview:ci` and then `npm run audit:browser`.

Expected: no application-blocking CSP violation or missing asset.

- [ ] **Step 6: Commit browser policy and asset cleanup**

```bash
git add package.json astro.config.mjs scripts/generate-headers.mjs scripts/generate-headers.test.mjs scripts/serve-dist.mjs scripts/check-build.mjs netlify.toml src/layouts/Base.astro src/pages/index.astro public/framerusercontent.com/sites
git commit -m "fix: enforce launch browser policy"
```

---

### Task 7: Netlify Forms detection and safe fallback

**Files:**
- Modify: `src/components/b2b/B2BEnquiryForm.astro`
- Modify: `scripts/check-build.mjs`
- Platform state: Netlify Forms setting for the linked project.

**Interfaces:**
- The built form remains named `b2b-enquiry`, method `POST`, with `data-netlify="true"`, `form-name`, and honeypot `bot-field`.
- Platform readback must list `b2b-enquiry` after a deploy that contains the form.

- [ ] **Step 1: Load Netlify Forms guidance before editing or platform mutation**

Use the connected Netlify coding-context operation with `creationType: "forms"`; read the complete response and reconcile its required detection markup with the existing Astro output.

- [ ] **Step 2: Add rendered detection assertions before changing markup**

In `scripts/check-build.mjs`, parse each corporate page and require exactly one form with:

```html
<form name="b2b-enquiry" method="POST" data-netlify="true" netlify-honeypot="bot-field">
<input type="hidden" name="form-name" value="b2b-enquiry">
<input type="text" name="bot-field">
```

Also require the error status to contain `events@r32.com.pl` and `+48 514 032 930`.

- [ ] **Step 3: Build and verify local form markup**

Run: `npx --yes node@22.12.0 /usr/bin/npm run build && npx --yes node@22.12.0 scripts/check-build.mjs`

Expected: all five localized corporate pages satisfy the form contract. If Netlify guidance requires a hidden static detection form, add one exact noninteractive form to the built output and keep the visible form's field names identical.

- [ ] **Step 4: Inspect and enable Forms in Netlify, then read back**

Use the connected Netlify project reader to identify the linked project and call `get-forms-for-project`. If Forms is disabled, enable it through the project updater. Read the project and forms list again and record the returned project ID and form state. Do not create a notification recipient.

- [ ] **Step 5: Commit any repository-side detection correction**

```bash
git add src/components/b2b/B2BEnquiryForm.astro scripts/check-build.mjs
git commit -m "fix: make enquiry form detectable"
```

If no repository file changed, record the successful platform readback and do not create an empty commit.

---

### Task 8: Node 22 CI, type gate, immutable actions, and fail-closed deploy hooks

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/sync-events.yml`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- `npm test` runs unit tests, `astro check`, production build, and rendered assertions.
- GitHub status name is `Launch gate / test`.
- Netlify hook calls use `curl --fail-with-body --silent --show-error -X POST`.

- [ ] **Step 1: Make the local test command one release gate**

Set scripts to:

```json
"build": "astro build && node scripts/generate-headers.mjs",
"test": "npm run test:unit && npm run check && npm run build && npm run test:build",
"test:unit": "node --test scripts/*.test.mjs scripts/events-sync/*.test.mjs",
"test:build": "node scripts/check-build.mjs",
"check": "astro check"
```

- [ ] **Step 2: Add the independent CI workflow**

Create `.github/workflows/ci.yml` with `pull_request` and `push` triggers, Node `22.12.0`, `npm ci`, and `npm test`. Pin actions exactly:

```yaml
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
  with:
    node-version: 22.12.0
    cache: npm
```

Name the workflow `Launch gate` and the job `test`, producing status `Launch gate / test`.

- [ ] **Step 3: Gate and harden the deploy workflow**

Make `.github/workflows/deploy.yml` contain a test job with the same pinned steps and a deploy job that needs it:

```yaml
deploy:
  needs: test
  runs-on: ubuntu-latest
  steps:
    - name: Trigger Netlify production build
      env:
        NETLIFY_DEPLOY_HOOK: ${{ secrets.NETLIFY_DEPLOY_HOOK }}
      run: curl --fail-with-body --silent --show-error -X POST "$NETLIFY_DEPLOY_HOOK"
```

Retain the push-to-main trigger. Do not print the secret URL.

- [ ] **Step 4: Pin and harden the event sync workflow**

Replace checkout/setup-node tags with the same immutable revisions, use Node `22.12.0`, keep `npm ci`, sync, and `npm test`, and change its hook call to the same fail-closed curl flags.

- [ ] **Step 5: Verify YAML and the full local Node 22 gate**

Run: `npx --yes node@22.12.0 /usr/bin/npm test`

Expected: all unit tests, Astro check, build, header generation, and rendered assertions pass.

Run: `ruby -e 'require "yaml"; Dir[".github/workflows/*.yml"].each { |f| YAML.load_file(f, aliases: true); puts "valid #{f}" }'`

Expected: every workflow parses.

Run: `rg -n 'uses: actions/(checkout|setup-node)@v|curl -s -X POST|node-version: ["'"']?20' .github/workflows`

Expected: no matches.

- [ ] **Step 6: Commit release controls**

```bash
git add package.json package-lock.json .github/workflows/ci.yml .github/workflows/deploy.yml .github/workflows/sync-events.yml
git commit -m "ci: gate production deploys"
```

---

### Task 9: Original exploit regression and complete local release gate

**Files:**
- Create: `scripts/security-browser.mjs`
- Modify: `package.json`
- Review: all files changed since `9194ef5`.

**Interfaces:**
- `security-browser.mjs` first proves the raw `JSON.stringify` control executes, then copies the repository to a temporary directory, injects one future and one historical event carrying the lower/upper/mixed-case terminator family, builds the real Astro routes, and fails if a marker executes on home, events, future-detail, or historical-detail pages.
- `npm run test:security` is a release gate.

- [ ] **Step 1: Write the browser regression before adding it to the gate**

Use `mkdtemp`, `cp`, `symlink`, `writeFile`, and `rm` from `node:fs/promises`. Copy the repository while excluding `.git`, `.claude`, `dist`, and `node_modules`; symlink the original `node_modules` into the copy. In a `try/finally`, write this generated fixture in the copy and always remove the temporary directory:

```js
const terminators = ['</script>', '</SCRIPT>', '</ScRiPt>'];
const marker = '<script>globalThis.__sisiJsonLdXss = (globalThis.__sisiJsonLdXss || 0) + 1</script>';
const payload = terminators.map((value) => value + marker).join('');
const events = [
  {
    title: payload,
    slug: '2099-07-17-security-future',
    start: '2099-07-17T22:00:00+02:00',
    note: payload,
    img: '/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
    price: 30,
    description: payload,
    genres: ['house'],
  },
  {
    title: payload,
    slug: '2020-07-17-security-past',
    start: '2020-07-17T22:00:00+02:00',
    note: payload,
    img: '/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
    description: payload,
    genres: ['house'],
  },
];
```

Launch Playwright Core with `executablePath: '/usr/bin/google-chrome'`. Before building, load raw `JSON.stringify({ name: payload })` into an `application/ld+json` script with `page.setContent` and assert `__sisiJsonLdXss > 0`; this proves the control is live. Spawn `npm run build` in the temporary copy with `CONTEXT=production` and `URL=https://sisiwroclaw.pl`, then spawn its `scripts/serve-dist.mjs` on a reserved loopback port. Visit these exact routes:

```js
const routes = [
  '/pl/',
  '/pl/wydarzenia/',
  '/pl/wydarzenia/2099-07-17-security-future/',
  '/pl/wydarzenia/2020-07-17-security-past/',
];
```

For every route, assert `globalThis.__sisiJsonLdXss` is absent, every `script[type="application/ld+json"]` parses as JSON, its text contains no literal `<`, and at least one structured-data object preserves the full payload on the routes that emit event schema. Terminate the server and browser in `finally` blocks and verify the original working tree's `events.generated.ts` was never touched.

- [ ] **Step 2: Run the original-control and fixed regression**

Run:

`npx --yes node@22.12.0 scripts/security-browser.mjs`

Expected: the raw control executes; the real Astro build preserves valid JSON but executes no marker on all four route families; the temporary directory is removed.

- [ ] **Step 3: Add security and browser audits to explicit release scripts**

```json
"test:security": "node scripts/security-browser.mjs",
"verify:release": "npm test && npm run test:security"
```

Keep the sitemap browser audit separate because it consumes a running preview.

- [ ] **Step 4: Run every local gate from a clean build**

Run:

```bash
CONTEXT=production URL=https://sisiwroclaw.pl npx --yes node@22.12.0 /usr/bin/npm run verify:release
```

Expected: all tests, type checks, production build, rendered assertions, and exploit regressions pass.

Start the preview and run:

```bash
BASE_URL=http://127.0.0.1:4321 npx --yes node@22.12.0 scripts/audit-browser.mjs
```

Expected: every sitemap route passes at 320, 390, and 1440 CSS pixels with zero serious/critical axe findings, broken internal links, page/console errors, CSP violations, or horizontal overflow.

- [ ] **Step 5: Review the complete release diff**

Run:

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git status --short
```

Expected: no whitespace errors; only intentional launch files plus the approved design/plan are tracked; `.claude/` remains untracked and unstaged.

Dispatch the required code-review subagent with the approved design, this plan, `git diff origin/main...HEAD`, and instructions to report only Critical and Important correctness, security, data-loss, accessibility, workflow, and launch-readiness issues. Fix every validated issue and repeat the full gate.

- [ ] **Step 6: Commit the final regression harness**

```bash
git add package.json package-lock.json scripts/security-browser.mjs scripts/audit-browser.mjs
git commit -m "test: lock launch regressions"
```

---

### Task 10: Configure domain, publish, verify Netlify, and protect future main

**Files:**
- Create: `scripts/smoke-host.mjs`
- Modify: `package.json`
- Platform state: GitHub `main` protection and Netlify production deploy/domain/forms settings.

**Interfaces:**
- `npm run smoke:host -- <origin> <expected-robots>` crawls the live sitemap and verifies deployment metadata without changing remote state.
- Release evidence records pushed commit SHA, Netlify deploy ID, deploy URL, published timestamp, domain attachment, Forms readback, smoke output, prior deploy ID, and protection readback.

- [ ] **Step 1: Add a final-host smoke script and prove it on local preview**

The script must assert: root redirects once to `/pl/`; sitemap is 200 XML; every sitemap route is 200; canonical/hreflang URLs use `https://sisiwroclaw.pl`; robots equals the expected argument; CSP/X-Content-Type-Options/Referrer-Policy/Permissions-Policy are present; no wildcard CORS; referenced same-origin assets return 200; corporate form detection markup exists; and utility 404 is not indexable.

Add:

```json
"smoke:host": "node scripts/smoke-host.mjs"
```

Run: `npx --yes node@22.12.0 scripts/smoke-host.mjs http://127.0.0.1:4321 'index, follow'`

Expected: PASS against the canonical production-context preview.

- [ ] **Step 2: Rebase the release decision on current remote state**

Run:

```bash
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate origin/main..HEAD
git status --short
```

Expected: remote `main` is still the audited base or any new commits are inspected and integrated without discarding work; only `.claude/` is unrelated/untracked; all release commits are present.

If `origin/main` moved, merge it without auto-committing, inspect conflicts, rerun the complete release gate, and request another Critical/Important review before publication.

- [ ] **Step 3: Attach the custom domain without touching DNS**

Inspect the Netlify project's domain aliases. If `sisiwroclaw.pl` and `www.sisiwroclaw.pl` are absent, attach them using the authenticated Netlify CLI/API available in the environment. Do not accept any command that creates or changes DNS records. Read the project back and record both aliases, TLS provisioning state, primary-site URL, and the platform-provided DNS target the owner must use.

This step precedes the release build so Netlify exposes the canonical origin as `URL` during that build. DNS remains on its current provider and target. If domain mutation is unavailable through the connected permissions, report the exact Netlify project and dashboard path as the sole blocking owner action; do not push a build whose production identity is still unresolved.

- [ ] **Step 4: Push the authorized release directly to main**

Run: `git push origin HEAD:main`

Expected: push succeeds. Record `git rev-parse HEAD` as `RELEASE_SHA` and verify `git ls-remote origin refs/heads/main` returns it.

- [ ] **Step 5: Observe the Netlify deployment to terminal success**

Use the connected Netlify project/deploy readers to identify the production deploy caused by `RELEASE_SHA`. Wait until it is terminal. Require successful publish state and compare its commit reference to `RELEASE_SHA`; a hook acceptance alone is insufficient. Record the new deploy ID and the immediately previous successful deploy ID for rollback.

- [ ] **Step 6: Verify Forms and the deployed Netlify host**

Read Forms state and the forms list after deployment; require `b2b-enquiry`. If an end-to-end submission is necessary and deletion is available, submit only values such as `Launch verification - no personal data`, read it back, and delete it. Otherwise verify detection/readback without creating a submission.

Run against the Netlify production URL:

```bash
npx --yes node@22.12.0 scripts/smoke-host.mjs https://sisi-wroclaw.netlify.app 'index, follow'
```

Expected: PASS, including security headers, canonical URLs, production indexing, and form markup. The Netlify subdomain serves the same static canonical-production artifact; canonical links prevent it from becoming the preferred search URL.

After the custom domain resolves to Netlify, the owner will rerun the same script with `https://sisiwroclaw.pl 'index, follow'`.

- [ ] **Step 7: Enable post-release main protection and read it back**

Use GitHub API/CLI to require `Launch gate / test` for `main`, require the branch to be up to date, and disallow force pushes and deletions. Do this only after the authorized release is on `main`. Read the protection object back and confirm the exact required context. If repository plan or permissions reject protection, preserve the API error text as an owner action.

- [ ] **Step 8: Produce the DNS handoff**

Give the owner:

1. `RELEASE_SHA`, Netlify project ID/name, production deploy ID/URL, and previous successful deploy ID.
2. Confirmed custom-domain attachment and Netlify's exact DNS target; no DNS mutation performed.
3. DNS checklist: lower TTL if still possible, set apex/`www` exactly as Netlify instructs, wait for public resolution, verify TLS, run `smoke:host` against canonical host, verify canonical production becomes `index, follow`, and check `www` redirects to the canonical apex.
4. Rollback: restore the previous DNS values if resolution/TLS fails, or publish the recorded prior Netlify deploy if the release regresses after cutover.
5. Forms readback and any notification recipient that still must be selected in the dashboard.
6. GitHub protection readback or the exact residual owner action.

- [ ] **Step 9: Final repository readback**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: local and remote `main` equal `RELEASE_SHA`; no tracked changes remain; only the pre-existing unrelated `.claude/` tree may remain untracked.
