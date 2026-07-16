# Non-event Search-audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the truthful, repository-controlled non-event audit fixes: a date-bounded summer-Friday closure notice, non-conflicting future hours schema, focused metadata refinements, a Czech booking-language disclosure, and the controllable bare-root redirect reduction.

**Architecture:** A small shared `summer-hours.mjs` module owns the seasonal dates, storage key, notice event and JSON-LD hours. A restored localized popup and the existing essential-storage banner coordinate through that event so only one notice is visible. Existing dictionaries, rendered-output checks and Playwright-backed build verification enforce copy, accessibility, storage and cutoff behavior; redirect behavior remains explicit in `netlify.toml` and is verified locally and after deployment.

**Tech Stack:** Astro 7, TypeScript 6, Node.js 22.12.0, Node test runner, Playwright Core with system Google Chrome, Netlify redirects, Schema.org JSON-LD.

## Global Constraints

- Work only in `/home/ignacy/Repositories/sisi-wroclaw/.worktrees/search-indexing-fix` on `agent/non-event-audit-fixes`.
- Run every Node, npm and Astro command through Node 22.12.0 using the exact `npx --yes --package node@22.12.0 -- npm run check` pattern shown in the tasks.
- Preserve permanent visible hours as Friday-Saturday, 22:00-04:00.
- Treat Fridays as temporarily closed through 28 August 2026 inclusive; the popup stops at 29 August 2026 00:00 Europe/Warsaw (`2026-08-28T22:00:00.000Z`).
- Use the approved Polish copy verbatim; translate English, German, Italian and Czech faithfully without adding facts.
- Do not change event discovery, analytics, consent behavior beyond the necessary notice-dismissal disclosure, external accounts, private-events scope, or unverified operational content.
- Do not add dependencies.
- Keep the existing host-aware indexing guard, forms, canonical/hreflang graph and placeholder-event suppression intact.
- Use test-first changes and one focused commit per task.

---

## File map

### New files

- `src/lib/summer-hours.mjs`: one source of truth for the 2026 closure dates, UTC cutoff, dismissal key, coordination event, notice eligibility and NightClub opening-hours entries.
- `src/components/Popup.astro`: localized accessible modal, seasonal cutoff enforcement, storage handling and notice coordination.
- `scripts/summer-hours.test.mjs`: unit contract for the cutoff and JSON-LD hours.
- `scripts/site-notices-browser.mjs`: post-build browser contract for sequencing, focus, Escape, persistence, storage denial and expiry.

### Modified files

- `src/data/site.ts`: consume the shared NightClub hours and update the legal-document date.
- `scripts/structured-data.test.mjs`: assert the exact non-overlapping seasonal/future hours model.
- `src/layouts/Base.astro`: render the popup immediately before the storage notice.
- `src/components/CookieBanner.astro`: wait for summer-notice resolution and fail open safely if its coordinator does not initialize.
- `src/i18n/ui/{pl,en,de,it,cs}.ts`: popup copy, plural notice disclosure, metadata refinements and reservation fallback note.
- `src/i18n/legal.ts`: disclose the second necessary localStorage record in Polish and English source documents.
- `src/components/home/Reservations.astro`: optional reservation-provider-language note.
- `src/components/pages/ReservationsPage.astro`: enable that note only on the localized reservation page.
- `scripts/launch.test.mjs`: lock the permitted browser-storage inventory.
- `scripts/check-build.mjs`: verify rendered notice, storage, schema, metadata, Czech fallback and redirect contracts.
- `scripts/workflows.test.mjs`: lock the notice browser test into the release gate and verify exact redirect order.
- `package.json`: run the browser notice contract after the production build.
- `netlify.toml`: place exact bare-root redirects before wildcard host redirects.

---

### Task 1: Centralize seasonal hours and correct NightClub JSON-LD

**Files:**
- Create: `src/lib/summer-hours.mjs`
- Create: `scripts/summer-hours.test.mjs`
- Modify: `src/data/site.ts:6-10,112-114,211-232`
- Modify: `scripts/structured-data.test.mjs:1-95`

**Interfaces:**
- Produces: `SUMMER_FRIDAY_NOTICE`, `NIGHTCLUB_OPENING_HOURS`, and `isSummerFridayNoticeActive(nowMs, cutoffIso?)` from `src/lib/summer-hours.mjs`.
- Consumers: `src/data/site.ts`, `src/components/Popup.astro`, `src/components/CookieBanner.astro`, and the unit/browser tests.

- [ ] **Step 1: Write the failing seasonal-hours unit test**

Create `scripts/summer-hours.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NIGHTCLUB_OPENING_HOURS,
  SUMMER_FRIDAY_NOTICE,
  isSummerFridayNoticeActive,
} from '../src/lib/summer-hours.mjs';

test('summer Friday notice stops exactly at midnight in Warsaw after 28 August', () => {
  assert.equal(SUMMER_FRIDAY_NOTICE.cutoffIso, '2026-08-28T22:00:00.000Z');
  assert.equal(isSummerFridayNoticeActive(Date.parse('2026-08-28T21:59:59.999Z')), true);
  assert.equal(isSummerFridayNoticeActive(Date.parse('2026-08-28T22:00:00.000Z')), false);
  assert.equal(isSummerFridayNoticeActive(Number.NaN), false);
  assert.equal(isSummerFridayNoticeActive(Date.now(), 'not-a-date'), false);
});

test('NightClub hours preserve Saturday, close summer Fridays, and reopen future Fridays', () => {
  assert.deepEqual(NIGHTCLUB_OPENING_HOURS, [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '22:00',
      closes: '04:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Friday',
      opens: '00:00',
      closes: '00:00',
      validFrom: '2026-07-17',
      validThrough: '2026-08-28',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Friday',
      opens: '22:00',
      closes: '04:00',
      validFrom: '2026-08-29',
    },
  ]);
});
```

Add this assertion to `scripts/structured-data.test.mjs` after `const nightClub = nightClubSchema('en');`:

```js
assert.deepEqual(nightClub.openingHoursSpecification, [
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '22:00', closes: '04:00' },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '00:00',
    closes: '00:00',
    validFrom: '2026-07-17',
    validThrough: '2026-08-28',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '22:00',
    closes: '04:00',
    validFrom: '2026-08-29',
  },
]);
assert.equal(eventVenue.openingHoursSpecification, undefined);
```

- [ ] **Step 2: Run the focused tests and verify the missing-module failure**

Run:

```bash
npx --yes --package node@22.12.0 -- node --test scripts/summer-hours.test.mjs scripts/structured-data.test.mjs
```

Expected: FAIL because `src/lib/summer-hours.mjs` does not exist and the current NightClub schema still combines Friday and Saturday.

- [ ] **Step 3: Implement the seasonal-hours source of truth**

Create `src/lib/summer-hours.mjs`:

```js
export const SUMMER_FRIDAY_NOTICE = Object.freeze({
  storageKey: 'sisi-summer-fri-2026-dismissed',
  resolvedEvent: 'sisi:summer-notice-resolved',
  validFrom: '2026-07-17',
  validThrough: '2026-08-28',
  cutoffIso: '2026-08-28T22:00:00.000Z',
});

export const NIGHTCLUB_OPENING_HOURS = Object.freeze([
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Saturday',
    opens: '22:00',
    closes: '04:00',
  }),
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '00:00',
    closes: '00:00',
    validFrom: SUMMER_FRIDAY_NOTICE.validFrom,
    validThrough: SUMMER_FRIDAY_NOTICE.validThrough,
  }),
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '22:00',
    closes: '04:00',
    validFrom: '2026-08-29',
  }),
]);

export function isSummerFridayNoticeActive(
  nowMs = Date.now(),
  cutoffIso = SUMMER_FRIDAY_NOTICE.cutoffIso,
) {
  const cutoffMs = Date.parse(cutoffIso);
  return Number.isFinite(nowMs) && Number.isFinite(cutoffMs) && nowMs < cutoffMs;
}
```

In `src/data/site.ts`, import and use the shared hours:

```ts
import { NIGHTCLUB_OPENING_HOURS } from '../lib/summer-hours.mjs';
```

Replace the legal date and NightClub hours with:

```ts
export const LEGAL_UPDATED_ISO = '2026-07-16';

// inside nightClubSchema()
openingHoursSpecification: NIGHTCLUB_OPENING_HOURS.map((hours) => ({ ...hours })),
```

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```bash
npx --yes --package node@22.12.0 -- node --test scripts/summer-hours.test.mjs scripts/structured-data.test.mjs
```

Expected: PASS for the cutoff, exact hours array, NightClub ownership and unchanged EventVenue.

- [ ] **Step 5: Run Astro type checking**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run check
```

Expected: PASS with no TypeScript or Astro diagnostics.

- [ ] **Step 6: Commit the seasonal-hours model**

```bash
git add src/lib/summer-hours.mjs scripts/summer-hours.test.mjs src/data/site.ts scripts/structured-data.test.mjs
git commit -m "fix(local): model temporary Friday closure"
```

---

### Task 2: Restore the time-bounded popup without stacking notices

**Files:**
- Create: `src/components/Popup.astro`
- Create: `scripts/site-notices-browser.mjs`
- Modify: `src/layouts/Base.astro:2-7,139-141`
- Modify: `src/components/CookieBanner.astro:1-44`
- Modify: `src/i18n/ui/{pl,en,de,it,cs}.ts:1-125`
- Modify: `src/i18n/legal.ts:95-210,300-380`
- Modify: `scripts/launch.test.mjs:26-30`
- Modify: `scripts/check-build.mjs:70-145,565-600,800-885`
- Modify: `scripts/workflows.test.mjs:35-45`
- Modify: `package.json:8-20`

**Interfaces:**
- Consumes: `SUMMER_FRIDAY_NOTICE` and `isSummerFridayNoticeActive()` from Task 1.
- Produces: `[data-summer-popup]`, `data-notice-state="pending|open|resolved"`, the `sisi:summer-notice-resolved` event with `{ open: boolean }`, and `npm run test:notices`.
- `CookieBanner.astro` listens for the event and reveals itself only when `open` becomes `false`.

- [ ] **Step 1: Add the failing browser behavior contract**

Create `scripts/site-notices-browser.mjs`:

```js
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright-core';

const CHROME_PATH = '/usr/bin/google-chrome';
const KEY = 'sisi-summer-fri-2026-dismissed';
const BEFORE_CUTOFF = Date.parse('2026-08-28T21:59:00.000Z');
const AT_CUTOFF = Date.parse('2026-08-28T22:00:00.000Z');

async function reservePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const address = reservation.address();
  assert.ok(address && typeof address === 'object');
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`preview exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/pl/`, { signal: AbortSignal.timeout(1_000) });
      if (response.body) await response.body.cancel();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('preview did not become ready');
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const closed = once(child, 'close');
  child.kill('SIGTERM');
  const stopped = await Promise.race([
    closed.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!stopped) {
    child.kill('SIGKILL');
    await closed;
  }
}

async function contextAt(browser, nowMs) {
  const context = await browser.newContext();
  await context.addInitScript((value) => { Date.now = () => value; }, nowMs);
  return context;
}

async function verifyFreshVisitor(browser, origin) {
  const context = await contextAt(browser, BEFORE_CUTOFF);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');
  await popup.waitFor({ state: 'visible' });
  assert.equal(await banner.isVisible(), false, 'storage notice stacked under summer popup');
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-popup-focus')), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Zamknij');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden' });
  await banner.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), 'dismissed');
  await page.reload({ waitUntil: 'load' });
  assert.equal(await popup.isVisible(), false, 'dismissed popup returned on reload');
  assert.equal(await banner.isVisible(), true, 'storage notice did not resume after dismissal');
  await context.close();
}

async function verifyStorageDenial(browser, origin) {
  const context = await contextAt(browser, BEFORE_CUTOFF);
  await context.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() { throw new Error('storage denied'); },
      });
    }
  });
  const page = await context.newPage();
  await page.goto(`${origin}/en/`, { waitUntil: 'load' });
  const popup = page.locator('[data-summer-popup]');
  await popup.waitFor({ state: 'visible' });
  await page.locator('[data-popup-focus]').click();
  await popup.waitFor({ state: 'hidden' });
  await page.locator('#cookie-banner').waitFor({ state: 'visible' });
  await context.close();
}

async function verifyExpiry(browser, origin) {
  const context = await contextAt(browser, AT_CUTOFF);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  assert.equal(await page.locator('[data-summer-popup]').isVisible(), false);
  await page.locator('#cookie-banner').waitFor({ state: 'visible' });
  await page.evaluate((key) => localStorage.setItem(key, 'dismissed'), KEY);
  await page.reload({ waitUntil: 'load' });
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
  await context.close();
}

let browser;
let preview;
try {
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  preview = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });
  await waitForServer(origin, preview);
  browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  await verifyFreshVisitor(browser, origin);
  await verifyStorageDenial(browser, origin);
  await verifyExpiry(browser, origin);
  console.log('PASS summer and essential-storage notices are sequenced and time-bounded');
} finally {
  if (browser) await browser.close();
  await stop(preview);
}
```

Add to `package.json`:

```json
"test:notices": "node scripts/site-notices-browser.mjs",
"test:build": "node scripts/check-build.mjs && npm run test:notices"
```

In `scripts/workflows.test.mjs`, add:

```js
assert.equal(pkg.scripts['test:notices'], 'node scripts/site-notices-browser.mjs');
assert.equal(pkg.scripts['test:build'], 'node scripts/check-build.mjs && npm run test:notices');
```

- [ ] **Step 2: Build and verify the new browser contract fails**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run build
npx --yes --package node@22.12.0 -- npm run test:notices
```

Expected: build PASS, then notice test FAIL because `[data-summer-popup]` is absent.

- [ ] **Step 3: Add localized popup and plural storage-notice copy**

Add this `popup` object after `cookie` in every UI dictionary, and replace each `cookie.text` with the shown plural form:

```ts
// pl.ts
cookie: {
  text: 'Ta strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji. Szczegóły znajdziesz w {cookies} oraz {privacy}.',
  cookiesLink: 'Polityce cookies',
  privacyLink: 'Polityce prywatności',
  dismiss: 'Rozumiem',
  dialogLabel: 'Informacja o niezbędnej pamięci',
},
popup: {
  eyebrow: 'Wakacyjne godziny',
  message: 'W wakacje SiSi jest zamknięte w piątki — do 28 sierpnia 2026 r. włącznie.',
  dismiss: 'Rozumiem',
  close: 'Zamknij',
},

// en.ts
cookie: {
  text: 'This site stores only information that notices were dismissed and essential form and navigation state. Details are in our {cookies} and {privacy}.',
  cookiesLink: 'Cookie Policy',
  privacyLink: 'Privacy Policy',
  dismiss: 'Got it',
  dialogLabel: 'Essential storage notice',
},
popup: {
  eyebrow: 'Summer hours',
  message: 'During the summer, SiSi is closed on Fridays — through 28 August 2026 inclusive.',
  dismiss: 'Got it',
  close: 'Close',
},

// de.ts
cookie: {
  text: 'Diese Website speichert ausschließlich, dass Hinweise geschlossen wurden, sowie notwendige Formular- und Navigationszustände. Einzelheiten findest du in unserer {cookies} und unserer {privacy}.',
  cookiesLink: 'Cookie-Richtlinie',
  privacyLink: 'Datenschutzerklärung',
  dismiss: 'Verstanden',
  dialogLabel: 'Hinweis zur notwendigen Speicherung',
},
popup: {
  eyebrow: 'Sommer-Öffnungszeiten',
  message: 'Im Sommer ist SiSi freitags geschlossen — bis einschließlich 28. August 2026.',
  dismiss: 'Verstanden',
  close: 'Schließen',
},

// it.ts
cookie: {
  text: 'Questo sito memorizza esclusivamente la chiusura degli avvisi e lo stato essenziale dei moduli e della navigazione. I dettagli sono disponibili nella nostra {cookies} e nella nostra {privacy}.',
  cookiesLink: 'informativa sui cookie',
  privacyLink: 'informativa sulla privacy',
  dismiss: 'Ho capito',
  dialogLabel: 'Avviso sull\'archiviazione essenziale',
},
popup: {
  eyebrow: 'Orari estivi',
  message: 'Durante l’estate SiSi è chiuso il venerdì, fino al 28 agosto 2026 compreso.',
  dismiss: 'Ho capito',
  close: 'Chiudi',
},

// cs.ts
cookie: {
  text: 'Tento web ukládá pouze informace o zavření oznámení a nezbytný stav formulářů a navigace. Podrobnosti najdete v našich {cookies} a {privacy}.',
  cookiesLink: 'zásadách používání souborů cookie',
  privacyLink: 'zásadách ochrany soukromí',
  dismiss: 'Rozumím',
  dialogLabel: 'Oznámení o nezbytném ukládání',
},
popup: {
  eyebrow: 'Letní otevírací doba',
  message: 'Během léta je SiSi v pátek zavřené — až do 28. srpna 2026 včetně.',
  dismiss: 'Rozumím',
  close: 'Zavřít',
},
```

Replace each cookie-page meta description and OG description with:

```ts
// pl.ts meta.cookies
description: 'Polityka cookies klubu SiSi Wrocław - pamięć niezbędna do zamknięcia komunikatów oraz obsługi formularzy i nawigacji.',
ogDescription: 'Jak SiSi Wrocław korzysta z pamięci niezbędnej do obsługi komunikatów, formularzy i nawigacji.',

// en.ts meta.cookies
description: 'SiSi Wrocław cookie policy - essential storage used for notice dismissals and form and navigation state.',
ogDescription: 'How SiSi Wrocław uses essential storage for notices, forms and navigation.',

// de.ts meta.cookies
description: 'Cookie-Richtlinie von SiSi Wrocław - notwendige Speicherung für das Schließen von Hinweisen sowie für Formular- und Navigationszustände.',
ogDescription: 'Wie SiSi Wrocław notwendige Speicherung für Hinweise, Formulare und die Navigation verwendet.',

// it.ts meta.cookies
description: 'Informativa sui cookie di SiSi Wrocław - archiviazione essenziale usata per la chiusura degli avvisi e lo stato dei moduli e della navigazione.',
ogDescription: 'Come SiSi Wrocław usa l\'archiviazione essenziale per gli avvisi, i moduli e la navigazione.',

// cs.ts meta.cookies
description: 'Zásady používání souborů cookie SiSi Wrocław - nezbytné ukládání informací o zavření oznámení a stavu formulářů a navigace.',
ogDescription: 'Jak SiSi Wrocław používá nezbytné ukládání pro oznámení, formuláře a navigaci.',
```

Keep every other metadata key unchanged.

- [ ] **Step 4: Create the accessible popup**

Create `src/components/Popup.astro`:

```astro
---
import { type Locale } from '../i18n/config';
import { useTranslations } from '../i18n/t';

interface Props { locale: Locale }
const { locale } = Astro.props;
const t = useTranslations(locale);
const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
---

<div class="sisi-popup" data-summer-popup data-notice-state="pending" hidden>
  <div class="sisi-popup-backdrop" data-popup-close aria-hidden="true"></div>
  <div class="sisi-popup-card sisi-card" role="dialog" aria-modal="true"
       aria-labelledby="sisi-popup-title" aria-describedby="sisi-popup-msg">
    <button class="sisi-popup-x" type="button" data-popup-close aria-label={t.popup.close}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <svg class="sisi-popup-icon" viewBox="0 0 24 24" aria-hidden="true" set:html={sun} />
    <p class="sisi-popup-eyebrow" id="sisi-popup-title">{t.popup.eyebrow}</p>
    <p class="sisi-popup-msg" id="sisi-popup-msg">{t.popup.message}</p>
    <button class="btn-cta sisi-popup-ok" type="button" data-popup-close data-popup-focus>{t.popup.dismiss}</button>
  </div>
</div>

<style>
  .sisi-popup { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .sisi-popup[hidden] { display: none; }
  .sisi-popup-backdrop { position: absolute; inset: 0; background: rgba(10, 2, 5, 0.62); backdrop-filter: blur(5px); }
  .sisi-popup-card { position: relative; z-index: 1; width: 100%; max-width: 400px; padding: 42px 36px 34px; text-align: center; background: rgba(28, 6, 13, 0.94); backdrop-filter: blur(16px); border-color: rgba(237, 219, 194, 0.18); }
  .sisi-popup-x { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--text-faint); border-radius: 8px; transition: color 150ms ease, background 150ms ease; }
  .sisi-popup-x:hover { color: var(--cream); background: rgba(237, 219, 194, 0.08); }
  .sisi-popup-x:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  .sisi-popup-x svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  .sisi-popup-icon { width: 42px; height: 42px; margin: 0 auto 18px; display: block; fill: none; stroke: var(--gold); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .sisi-popup-eyebrow { font-family: var(--font-display); font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--gold); margin: 0 0 12px; }
  .sisi-popup-msg { color: var(--text); font-size: 16px; line-height: 1.65; margin: 0 auto 26px; max-width: 32ch; }
  .sisi-popup-ok { width: 100%; }
  @media (prefers-reduced-motion: no-preference) {
    .sisi-popup:not([hidden]) .sisi-popup-backdrop { animation: sisi-popup-fade 220ms ease; }
    .sisi-popup:not([hidden]) .sisi-popup-card { animation: sisi-popup-rise 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }
  }
  @keyframes sisi-popup-fade { from { opacity: 0; } }
  @keyframes sisi-popup-rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } }
</style>

<script>
  import {
    SUMMER_FRIDAY_NOTICE,
    isSummerFridayNoticeActive,
  } from '../lib/summer-hours.mjs';

  const root = document.querySelector<HTMLElement>('[data-summer-popup]');
  if (root) {
    const announce = (open: boolean) => {
      root.dataset.noticeState = open ? 'open' : 'resolved';
      document.dispatchEvent(new CustomEvent(SUMMER_FRIDAY_NOTICE.resolvedEvent, { detail: { open } }));
    };
    const active = isSummerFridayNoticeActive();
    let dismissed = false;
    try {
      if (!active) localStorage.removeItem(SUMMER_FRIDAY_NOTICE.storageKey);
      else dismissed = localStorage.getItem(SUMMER_FRIDAY_NOTICE.storageKey) === 'dismissed';
    } catch {}

    if (!active || dismissed) {
      announce(false);
    } else {
      let lastFocus: HTMLElement | null = null;
      const focusable = () => [...root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hidden);
      const close = () => {
        root.hidden = true;
        document.removeEventListener('keydown', onKey);
        try { localStorage.setItem(SUMMER_FRIDAY_NOTICE.storageKey, 'dismissed'); } catch {}
        announce(false);
        lastFocus?.focus?.();
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
          return;
        }
        if (event.key !== 'Tab') return;
        const controls = focusable();
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      const open = () => {
        if (root.dataset.noticeState !== 'pending') return;
        lastFocus = document.activeElement as HTMLElement;
        root.hidden = false;
        announce(true);
        root.querySelector<HTMLElement>('[data-popup-focus]')?.focus();
        document.addEventListener('keydown', onKey);
      };
      root.querySelectorAll('[data-popup-close]').forEach((element) => element.addEventListener('click', close));
      window.setTimeout(open, 550);
    }
  }
</script>
```

- [ ] **Step 5: Render the popup and coordinate the storage banner**

In `src/layouts/Base.astro`, import `Popup` and render it before `CookieBanner`:

```astro
import Popup from '../components/Popup.astro';

<!-- after Footer -->
<Popup locale={locale} />
<CookieBanner locale={locale} />
```

Replace the script in `src/components/CookieBanner.astro` with:

```astro
<script>
  import { SUMMER_FRIDAY_NOTICE } from '../lib/summer-hours.mjs';

  const KEY = 'sisi-cookie-notice';
  const LEGACY_KEY = 'sisi-cookie-consent';
  const banner = document.getElementById('cookie-banner');
  const popup = document.querySelector<HTMLElement>('[data-summer-popup]');
  let dismissed = false;
  try {
    localStorage.removeItem(LEGACY_KEY);
    dismissed = localStorage.getItem(KEY) === 'dismissed';
  } catch {}

  const reveal = () => {
    if (!dismissed && banner) banner.hidden = false;
  };
  banner?.querySelector('[data-cookie-dismiss]')?.addEventListener('click', () => {
    try { localStorage.setItem(KEY, 'dismissed'); } catch {}
    banner.hidden = true;
  });

  if (!popup || popup.dataset.noticeState === 'resolved') {
    reveal();
  } else {
    const onResolved = (event: Event) => {
      const open = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (open === false) {
        document.removeEventListener(SUMMER_FRIDAY_NOTICE.resolvedEvent, onResolved);
        reveal();
      }
    };
    document.addEventListener(SUMMER_FRIDAY_NOTICE.resolvedEvent, onResolved);
    window.setTimeout(() => {
      if (popup.dataset.noticeState === 'pending' && popup.hidden) {
        popup.dataset.noticeState = 'resolved';
        document.removeEventListener(SUMMER_FRIDAY_NOTICE.resolvedEvent, onResolved);
        reveal();
      }
    }, 2_000);
  }
</script>
```

Update the component comment to say that the site has two disclosed persistent dismissal records, both strictly necessary for notice behavior.

- [ ] **Step 6: Update the Polish and English legal source documents**

In `src/i18n/legal.ts`, use these exact Polish replacements:

```ts
// pl_privacy browser-storage item
'Pamięć przeglądarki - zob. Polityka cookies. Strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji.',

// pl_cookies section 1 paragraph
'Strona korzysta z pamięci lokalnej przeglądarki (localStorage) wyłącznie po to, aby zapamiętać zamknięcie komunikatu o niezbędnej pamięci oraz komunikatu o wakacyjnym zamknięciu w piątki. Stan niezbędny do obsługi formularzy i nawigacji jest używany podczas interakcji z tymi elementami.',

// pl_cookies section 2 items
'sisi-cookie-notice (localStorage) - przechowuje wyłącznie wartość "dismissed", aby nie wyświetlać ponownie zamkniętego komunikatu o niezbędnej pamięci.',
'sisi-summer-fri-2026-dismissed (localStorage) - przechowuje wyłącznie wartość "dismissed", aby nie wyświetlać ponownie komunikatu o wakacyjnym zamknięciu w piątki. Wpis jest usuwany po 28 sierpnia 2026 r.',
'Niezbędny stan formularzy i nawigacji - przechowywany tylko na potrzeby bieżącej interakcji ze stroną.',

// pl_cookies section 3 paragraph
'Pamięć opisana powyżej służy wyłącznie obsłudze komunikatów oraz działania formularzy i nawigacji.',

// pl_cookies section 4 first item
'Komunikaty wyświetlają się przy pierwszej wizycie; ich zamknięcie zapisuje wartość "dismissed" dla odpowiedniego komunikatu.',
```

Use these English equivalents in `en_privacy` and `en_cookies`:

```ts
'Browser storage - see the Cookie Policy. The site stores only notice dismissals and essential form and navigation state.',

'The site uses browser local storage (localStorage) only to remember that the essential-storage notice and the summer Friday closure notice were dismissed. State essential to forms and navigation is used while you interact with those controls.',

'sisi-cookie-notice (localStorage) - stores only the value "dismissed" so the essential-storage notice stays hidden after you close it.',
'sisi-summer-fri-2026-dismissed (localStorage) - stores only the value "dismissed" so the summer Friday closure notice stays hidden after you close it. The record is removed after 28 August 2026.',
'Essential form and navigation state - stored only for the current interaction with the site.',

'The storage described above is used only for notices and for form and navigation behavior.',

'The notices appear on your first visit; dismissing one stores the value "dismissed" for that notice.',
```

- [ ] **Step 7: Lock rendered copy and storage inventory before rerunning**

In `scripts/launch.test.mjs`, extend the storage test:

```js
test('browser storage stays within the disclosed launch inventory', async () => {
  const files = await sourceFiles('src');
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  const legal = await readFile('src/i18n/legal.ts', 'utf8');
  assert.equal(/\bsessionStorage\b/.test(source), false, 'sessionStorage is outside the disclosed launch inventory');
  assert.match(source, /sisi-cookie-notice/);
  assert.match(source, /sisi-summer-fri-2026-dismissed/);
  assert.doesNotMatch(source, /['"]sisi-summer-fri-dismissed['"]/);
  assert.match(legal, /sisi-summer-fri-2026-dismissed \(localStorage\)/);
});
```

In `scripts/check-build.mjs`:

1. Replace `noticeCopy` and add the popup maps:

```js
const noticeCopy = {
  pl: 'Ta strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji. Szczegóły znajdziesz w Polityce cookies oraz Polityce prywatności.',
  en: 'This site stores only information that notices were dismissed and essential form and navigation state. Details are in our Cookie Policy and Privacy Policy.',
  de: 'Diese Website speichert ausschließlich, dass Hinweise geschlossen wurden, sowie notwendige Formular- und Navigationszustände. Einzelheiten findest du in unserer Cookie-Richtlinie und unserer Datenschutzerklärung.',
  it: 'Questo sito memorizza esclusivamente la chiusura degli avvisi e lo stato essenziale dei moduli e della navigazione. I dettagli sono disponibili nella nostra informativa sui cookie e nella nostra informativa sulla privacy.',
  cs: 'Tento web ukládá pouze informace o zavření oznámení a nezbytný stav formulářů a navigace. Podrobnosti najdete v našich zásadách používání souborů cookie a zásadách ochrany soukromí.',
};
const summerPopupCopy = {
  pl: 'W wakacje SiSi jest zamknięte w piątki — do 28 sierpnia 2026 r. włącznie.',
  en: 'During the summer, SiSi is closed on Fridays — through 28 August 2026 inclusive.',
  de: 'Im Sommer ist SiSi freitags geschlossen — bis einschließlich 28. August 2026.',
  it: 'Durante l’estate SiSi è chiuso il venerdì, fino al 28 agosto 2026 compreso.',
  cs: 'Během léta je SiSi v pátek zavřené — až do 28. srpna 2026 včetně.',
};
const summerPopupClose = { pl: 'Zamknij', en: 'Close', de: 'Schließen', it: 'Chiudi', cs: 'Zavřít' };
```

2. Inside the existing locale loop, add:

```js
assert(`${locale} has one summer-hours popup`, (home.match(/data-summer-popup/g) || []).length === 1);
assert(`${locale} has exact summer-hours copy`, home.includes(summerPopupCopy[locale]));
assert(
  `${locale} summer popup is an accessible modal`,
  home.includes('role="dialog" aria-modal="true"')
    && (home.match(/data-popup-focus/g) || []).length === 1
    && home.includes(`aria-label="${summerPopupClose[locale]}"`),
);
```

3. Replace the old “omit stacked summer-hours modal” assertion with:

```js
assert(
  'rendered pages include the time-bounded summer-hours modal and season-specific key',
  allHtml.includes('data-summer-popup')
    && executableBuiltText.includes('sisi-summer-fri-2026-dismissed')
    && executableBuiltText.includes('2026-08-28T22:00:00.000Z')
    && !/[`'"]sisi-summer-fri-dismissed[`'"]/.test(executableBuiltText),
);
```

4. Replace the storage runtime assertion and add a guarded popup-source assertion:

```js
assert(
  'notice runtimes use only the disclosed dismissal records and values',
  [
    'sisi-cookie-notice',
    'sisi-summer-fri-2026-dismissed',
    'dismissed',
    'localStorage.removeItem',
    'localStorage.getItem',
    'localStorage.setItem',
  ].every((token) => executableBuiltText.includes(token))
    && !/[`'"](?:accepted|rejected)[`'"]/.test(executableBuiltText),
);
const popupSource = readFileSync(join(ROOT, 'src/components/Popup.astro'), 'utf8');
assert(
  'summer notice storage reads, cleanup, and writes are guarded',
  /try\s*\{[\s\S]*?localStorage\.removeItem\(SUMMER_FRIDAY_NOTICE\.storageKey\)[\s\S]*?localStorage\.getItem\(SUMMER_FRIDAY_NOTICE\.storageKey\)[\s\S]*?\}\s*catch\s*\{\}/.test(popupSource)
    && /try\s*\{\s*localStorage\.setItem\(SUMMER_FRIDAY_NOTICE\.storageKey,\s*['"]dismissed['"]\);?\s*\}\s*catch\s*\{\}/.test(popupSource),
);
```

5. Update `cookieMeta` to the exact plural cookie-page descriptions authored in Step 3.

- [ ] **Step 8: Run notice, build and type contracts**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run check
npx --yes --package node@22.12.0 -- npm run build
npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
npx --yes --package node@22.12.0 -- npm run test:notices
npx --yes --package node@22.12.0 -- node --test scripts/launch.test.mjs scripts/workflows.test.mjs
```

Expected: all commands PASS; the browser test proves no stacked notices, keyboard containment, Escape, persistence, storage denial and exact cutoff cleanup.

- [ ] **Step 9: Commit the notice and disclosure contract**

```bash
git add package.json src/components/Popup.astro src/components/CookieBanner.astro src/layouts/Base.astro src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts src/i18n/legal.ts scripts/site-notices-browser.mjs scripts/launch.test.mjs scripts/check-build.mjs scripts/workflows.test.mjs
git commit -m "fix(ux): restore bounded summer hours notice"
```

---

### Task 3: Refine search-intent metadata and disclose the Czech Emenago fallback

**Files:**
- Modify: `src/i18n/ui/{pl,en,de,it,cs}.ts:18-52,292-316`
- Modify: `src/components/home/Reservations.astro:1-22,78-86`
- Modify: `src/components/pages/ReservationsPage.astro:20-22`
- Modify: `scripts/check-build.mjs:78-220`

**Interfaces:**
- Produces: `Reservations` prop `showLocaleFallback?: boolean` and localized `t.reservationsPage.externalLocaleNote`.
- Consumers: only `ReservationsPage.astro` enables the note; homepage reservation sections remain unchanged.

- [ ] **Step 1: Add failing rendered metadata and Czech-note assertions**

Add this contract near the existing route maps in `scripts/check-build.mjs`:

```js
const SEARCH_INTENT_META = {
  pl: {
    careers: { route: 'kariera', title: 'Praca i kariera – SiSi Wrocław' },
    reservations: { route: 'rezerwacje', title: 'Rezerwacja stolika – SiSi Wrocław' },
    corporate: { route: 'eventy-firmowe', description: 'Eventy firmowe w centrum Wrocławia: konferencje, prezentacje, kolacje i networking. 663 m², do 150 miejsc w The Cork i 2 ekrany.' },
  },
  en: {
    careers: { route: 'careers', title: 'Jobs & Careers at SiSi Wrocław' },
    reservations: { route: 'reservations', title: 'Table Reservations at SiSi Wrocław' },
    corporate: { route: 'corporate-events', description: 'Corporate events in central Wrocław: conferences, presentations, dinners and networking. 663 m², up to 150 seated guests at The Cork and 2 screens.' },
  },
  de: {
    careers: { route: 'karriere', title: 'Jobs & Karriere im SiSi Wrocław' },
    reservations: { route: 'reservierungen', title: 'Tischreservierung im SiSi Wrocław' },
    corporate: { route: 'firmenevents', description: 'Firmenevents im Zentrum von Breslau: Konferenzen, Präsentationen, Dinner und Networking. 663 m², bis zu 150 Sitzplätze im The Cork und 2 Bildschirme.' },
    privateEvents: { route: 'private-feiern', description: 'Geburtstag, Jubiläum oder private Feier im SiSi, The Cork oder gesamten R32. Exklusive Anmietung, Bar, Catering, Musik und individuelles Angebot.' },
  },
  it: {
    careers: { route: 'lavora-con-noi', title: 'Lavora con noi al SiSi Wrocław' },
    reservations: { route: 'prenotazioni', title: 'Prenota un tavolo al SiSi Wrocław' },
    corporate: { route: 'eventi-aziendali', description: 'Eventi aziendali nel centro di Breslavia: conferenze, presentazioni, cene e networking. 663 m², fino a 150 posti al The Cork e 2 schermi.' },
    privateEvents: { route: 'eventi-privati', description: "Compleanni, anniversari e feste private al SiSi, The Cork o nell'intero R32. Affitto esclusivo, bar, catering, musica e offerta personalizzata." },
  },
  cs: {
    careers: { route: 'kariera', title: 'Práce a kariéra v klubu SiSi Wrocław' },
    reservations: { route: 'rezervace', title: 'Rezervace stolu v SiSi Wrocław' },
    corporate: { route: 'firemni-akce', description: 'Firemní akce v centru Vratislavi: konference, prezentace, večeře a networking. 663 m², až 150 míst v The Cork a 2 obrazovky.' },
  },
};

for (const [locale, pages] of Object.entries(SEARCH_INTENT_META)) {
  for (const [name, expected] of Object.entries(pages)) {
    const html = read(`${locale}/${expected.route}/index.html`);
    if (expected.title) {
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1].replaceAll('&amp;', '&') ?? '';
      assert(`${locale} ${name} title uses approved search-intent copy`, title === expected.title);
    }
    if (expected.description) {
      const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';
      assert(`${locale} ${name} description uses approved facts`, description === expected.description);
      assert(`${locale} ${name} description is at most 160 characters`, [...description].length <= 160);
    }
  }
}

const csReservations = read('cs/rezervace/index.html');
assert(
  'Czech reservation page discloses the Polish Emenago handoff',
  csReservations.includes('<p class="res-locale-note" data-reservation-locale-note>Rezervační systém se otevře v polštině.</p>'),
);
assert('Czech homepage does not show the fallback note', !read('cs/index.html').includes('data-reservation-locale-note'));
for (const locale of ['pl', 'en', 'de', 'it']) {
  const route = RESERVATIONS[locale];
  assert(`${locale} reservation page omits the fallback note`, !read(`${locale}/${route}/index.html`).includes('data-reservation-locale-note'));
}
```

- [ ] **Step 2: Build and verify the rendered contract fails**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run build
npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
```

Expected: build PASS, rendered check FAIL on old titles/descriptions and the missing Czech note.

- [ ] **Step 3: Apply the exact localized metadata**

Replace only the named properties inside each dictionary's existing `meta` objects with these valid property lines:

```ts
// pl.ts
// meta.careers
title: 'Praca i kariera – SiSi Wrocław',
// meta.reservations
title: 'Rezerwacja stolika – SiSi Wrocław',
// meta.corporate
description: 'Eventy firmowe w centrum Wrocławia: konferencje, prezentacje, kolacje i networking. 663 m², do 150 miejsc w The Cork i 2 ekrany.',

// en.ts
// meta.careers
title: 'Jobs & Careers at SiSi Wrocław',
// meta.reservations
title: 'Table Reservations at SiSi Wrocław',
// meta.corporate
description: 'Corporate events in central Wrocław: conferences, presentations, dinners and networking. 663 m², up to 150 seated guests at The Cork and 2 screens.',

// de.ts
// meta.careers
title: 'Jobs & Karriere im SiSi Wrocław',
// meta.reservations
title: 'Tischreservierung im SiSi Wrocław',
// meta.corporate
description: 'Firmenevents im Zentrum von Breslau: Konferenzen, Präsentationen, Dinner und Networking. 663 m², bis zu 150 Sitzplätze im The Cork und 2 Bildschirme.',
// meta.privateEvents
description: 'Geburtstag, Jubiläum oder private Feier im SiSi, The Cork oder gesamten R32. Exklusive Anmietung, Bar, Catering, Musik und individuelles Angebot.',

// it.ts
// meta.careers
title: 'Lavora con noi al SiSi Wrocław',
// meta.reservations
title: 'Prenota un tavolo al SiSi Wrocław',
// meta.corporate
description: 'Eventi aziendali nel centro di Breslavia: conferenze, presentazioni, cene e networking. 663 m², fino a 150 posti al The Cork e 2 schermi.',
// meta.privateEvents
description: "Compleanni, anniversari e feste private al SiSi, The Cork o nell'intero R32. Affitto esclusivo, bar, catering, musica e offerta personalizzata.",

// cs.ts
// meta.careers
title: 'Práce a kariéra v klubu SiSi Wrocław',
// meta.reservations
title: 'Rezervace stolu v SiSi Wrocław',
// meta.corporate
description: 'Firemní akce v centru Vratislavi: konference, prezentace, večeře a networking. 663 m², až 150 míst v The Cork a 2 obrazovky.',
```

Keep existing descriptions and OG descriptions not listed above.

- [ ] **Step 4: Add and scope the Czech fallback note**

Add `externalLocaleNote` to `reservationsPage` in every dictionary:

```ts
// pl
externalLocaleNote: 'System rezerwacji otworzy się po polsku.',
// en
externalLocaleNote: 'The reservation system will open in Polish.',
// de
externalLocaleNote: 'Das Reservierungssystem wird auf Polnisch geöffnet.',
// it
externalLocaleNote: 'Il sistema di prenotazione si aprirà in polacco.',
// cs
externalLocaleNote: 'Rezervační systém se otevře v polštině.',
```

In `src/components/home/Reservations.astro`, change the props and render the note after the external CTA:

```astro
interface Props {
  locale: Locale;
  headingLevel?: 'h1' | 'h2';
  showLocaleFallback?: boolean;
}
const { locale, headingLevel = 'h2', showLocaleFallback = false } = Astro.props;

<a href={reservationUrl('reservations_section', locale)} class="btn-cta res-cta" rel="noopener" target="_blank">{t.buttons.reserveOnline}</a>
{showLocaleFallback && locale === 'cs' && (
  <p class="res-locale-note" data-reservation-locale-note>{t.reservationsPage.externalLocaleNote}</p>
)}
```

Add styling beside `.res-reassure`:

```css
.res-locale-note {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(39, 7, 15, 0.72);
}
```

In `src/components/pages/ReservationsPage.astro`, enable it only there:

```astro
<Reservations locale={locale} headingLevel="h1" showLocaleFallback />
```

- [ ] **Step 5: Run type, build and rendered tests**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run check
npx --yes --package node@22.12.0 -- npm run build
npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
```

Expected: PASS; all targeted descriptions are at most 160 characters, and only `/cs/rezervace/` shows the fallback note.

- [ ] **Step 6: Commit metadata and fallback disclosure**

```bash
git add src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts src/components/home/Reservations.astro src/components/pages/ReservationsPage.astro scripts/check-build.mjs
git commit -m "fix(search): refine metadata and booking fallback"
```

---

### Task 4: Reduce the bare-domain root redirect chain

**Files:**
- Modify: `scripts/workflows.test.mjs:56-75`
- Modify: `netlify.toml:8-27`
- Modify: `scripts/check-build.mjs:625-629`

**Interfaces:**
- Produces: exact HTTP/HTTPS bare-root rules followed by the existing HTTP/HTTPS wildcard host rules.
- Netlify may still perform its platform HTTP-to-HTTPS hop before repository rules; live acceptance distinguishes that platform behavior.

- [ ] **Step 1: Replace the redirect unit test with the desired order**

Replace the existing redirect test in `scripts/workflows.test.mjs` with:

```js
test('Netlify orders exact bare roots before wildcard host redirects', async () => {
  const source = await readFile('netlify.toml', 'utf8');
  const redirects = netlifyRedirects(source);
  const expected = [
    {
      from: 'http://sisiwroclaw.pl/',
      to: 'https://www.sisiwroclaw.pl/pl/',
      status: 301,
      force: true,
    },
    {
      from: 'https://sisiwroclaw.pl/',
      to: 'https://www.sisiwroclaw.pl/pl/',
      status: 301,
      force: true,
    },
    {
      from: 'http://sisiwroclaw.pl/*',
      to: 'https://www.sisiwroclaw.pl/:splat',
      status: 301,
      force: true,
    },
    {
      from: 'https://sisiwroclaw.pl/*',
      to: 'https://www.sisiwroclaw.pl/:splat',
      status: 301,
      force: true,
    },
  ];

  assert.deepEqual(redirects.slice(0, 4), expected);
  assert.equal(redirects.filter(({ from }) => expected.some((rule) => rule.from === from)).length, 4);
  assert.equal(redirects.some(({ from }) => from?.startsWith('https://www.sisiwroclaw.pl')), false);
  assert.equal(redirects[4]?.from, '/');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx --yes --package node@22.12.0 -- node --test scripts/workflows.test.mjs
```

Expected: FAIL because only wildcard host rules precede the relative root rule.

- [ ] **Step 3: Add exact root redirects before wildcards**

Replace the initial redirect block in `netlify.toml` with:

```toml
# Exact bare roots skip the otherwise separate final / -> /pl/ redirect.
[[redirects]]
  from = "http://sisiwroclaw.pl/"
  to = "https://www.sisiwroclaw.pl/pl/"
  status = 301
  force = true

[[redirects]]
  from = "https://sisiwroclaw.pl/"
  to = "https://www.sisiwroclaw.pl/pl/"
  status = 301
  force = true

# Other bare-host paths preserve their locale/path while moving to final www.
[[redirects]]
  from = "http://sisiwroclaw.pl/*"
  to = "https://www.sisiwroclaw.pl/:splat"
  status = 301
  force = true

[[redirects]]
  from = "https://sisiwroclaw.pl/*"
  to = "https://www.sisiwroclaw.pl/:splat"
  status = 301
  force = true
```

Keep the existing relative `/` -> `/pl/` rule immediately after these four rules.

In `scripts/check-build.mjs`, extend redirect assertions:

```js
assert(
  'exact bare roots precede wildcard redirects and target final Polish homepage',
  toml.indexOf('from = "http://sisiwroclaw.pl/"') < toml.indexOf('from = "http://sisiwroclaw.pl/*"')
    && toml.indexOf('from = "https://sisiwroclaw.pl/"') < toml.indexOf('from = "https://sisiwroclaw.pl/*"')
    && (toml.match(/to = "https:\/\/www\.sisiwroclaw\.pl\/pl\/"/g) || []).length === 2,
);
```

- [ ] **Step 4: Run unit and build checks**

Run:

```bash
npx --yes --package node@22.12.0 -- node --test scripts/workflows.test.mjs
npx --yes --package node@22.12.0 -- npm run build
npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
```

Expected: PASS with exact-root rules first and no canonical-host regression.

- [ ] **Step 5: Commit redirect cleanup**

```bash
git add netlify.toml scripts/workflows.test.mjs scripts/check-build.mjs
git commit -m "fix(routing): shorten bare-root redirect chain"
```

---

### Task 5: Run the complete release gate and review the production-shaped build

**Files:**
- Verify all changed files from Tasks 1-4.
- Modify only a file whose failing release check demonstrates a real defect in this approved scope.

**Interfaces:**
- Consumes: every automated contract from Tasks 1-4.
- Produces: a clean branch whose release gate, rendered desktop/mobile UX, security harness and diff review all pass.

- [ ] **Step 1: Run whitespace and scope checks**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
git diff --stat origin/main...HEAD
```

Expected: no whitespace errors; only the design, plan and approved implementation files are present.

- [ ] **Step 2: Run the complete Node 22.12.0 release gate**

Run:

```bash
npx --yes --package node@22.12.0 -- npm run verify:release
```

Expected: unit tests, Astro check, production build, rendered-output checks, site-notice browser checks and hostile JSON-LD security tests all PASS.

- [ ] **Step 3: Review notice behavior at desktop and mobile widths**

Run the local production server:

```bash
npx --yes --package node@22.12.0 -- npm run preview:ci
```

Using Playwright/Chrome, inspect `/pl/` at 1440×900 and 390×844 with fresh localStorage. Confirm the popup fits without clipping, receives focus, hides the storage banner, closes through button/Escape, restores focus and then reveals the storage banner. Repeat `/cs/rezervace/` to confirm the Polish-provider disclosure is adjacent to the Emenago CTA.

Expected: no stacked notices, horizontal overflow, blocked navigation, hidden CTA or unlocalized copy.

- [ ] **Step 4: Review rendered metadata and JSON-LD directly**

Run:

```bash
rg -n "W wakacje SiSi|sisi-summer-fri-2026-dismissed|validThrough|Rezerwacja stolika|Rezervační systém" dist/pl/index.html dist/pl/rezerwacje/index.html dist/cs/rezervace/index.html dist/assets
```

Expected: the approved popup and metadata are rendered; the Czech note is present only on its reservation route; JSON-LD contains the dated Friday closure and future reopening.

- [ ] **Step 5: Resolve any evidence-backed verification failure at its owning task**

If Steps 2-4 expose an in-scope defect, return to Task 1, 2, 3 or 4 according to the failed contract, add the regression there, apply the smallest fix, rerun that task's focused command and then rerun `npm run verify:release`. Use that task's explicit staging list and commit boundary. If no correction is needed, do not create an empty commit.

---

### Task 6: Publish through protected main and verify production

**Files:**
- No new source files expected.
- Remote state: branch, pull request, required checks, `main`, Netlify production deploy.

**Interfaces:**
- Consumes: clean, fully verified `agent/non-event-audit-fixes`.
- Produces: merged `main`, matching production deploy SHA and live acceptance evidence.

- [ ] **Step 1: Push the verified branch**

Run:

```bash
git push -u origin agent/non-event-audit-fixes
```

Expected: remote branch updated to local `HEAD`.

- [ ] **Step 2: Open a pull request with exact scope**

Create a PR titled `Fix non-event search audit findings`. Its body must summarize:

- seasonal Friday closure through 28 August with permanent future hours preserved;
- sequenced and disclosed notice storage;
- focused metadata and Czech Emenago disclosure;
- bare-root redirect improvement;
- explicit exclusion of events and analytics;
- `npm run verify:release` result.

- [ ] **Step 3: Wait for required checks and inspect failures before changing code**

Run:

```bash
gh pr checks --watch --fail-fast
```

Expected: `Launch gate / test` and any Netlify checks PASS. Treat a failure as diagnostic evidence; do not bypass it.

- [ ] **Step 4: Merge the green PR to main**

Run the repository-approved merge command, then:

```bash
git fetch origin main
```

Expected: the PR is merged and `origin/main` contains all verified commits.

- [ ] **Step 5: Verify Netlify production matches merged main**

Confirm the Netlify production deploy is ready and its commit SHA equals the merged `origin/main` SHA. If the deploy is still running, wait for it rather than testing the previous release.

- [ ] **Step 6: Run live redirect and content smoke checks**

Run:

```bash
curl -fsSL -o /dev/null -w 'https bare: %{num_redirects} %{url_effective} %{http_code}\n' -L --max-redirs 5 https://sisiwroclaw.pl/
curl -fsSL -o /dev/null -w 'http bare: %{num_redirects} %{url_effective} %{http_code}\n' -L --max-redirs 5 http://sisiwroclaw.pl/
curl -fsSL https://www.sisiwroclaw.pl/pl/
curl -fsSL https://www.sisiwroclaw.pl/cs/rezervace/
```

Expected:

- HTTPS bare root: one redirect to `https://www.sisiwroclaw.pl/pl/`, HTTP 200.
- HTTP bare root: no more than two redirects to the same final URL, HTTP 200; any first protocol hop is identified as Netlify-controlled.
- Polish homepage contains the approved date-bounded popup and seasonal JSON-LD.
- Czech reservation page contains `Rezervační systém se otevře v polštině.` and its Emenago URL remains the verified `/pl` fallback with UTMs.

- [ ] **Step 7: Run live form smoke checks without submitting production enquiries**

Inspect the rendered corporate and private forms for `data-netlify="true"`, their existing form names, hidden `form-name`, honeypot and `rzeznicza32@gmail.com` notification configuration. Do not submit a fake production lead.

Expected: both forms remain recognized and notification routing is unchanged.

- [ ] **Step 8: Report final evidence**

Report the merged PR, merge SHA, matching production deploy SHA, release-gate result, live redirect counts, popup cutoff, JSON-LD hours, Czech fallback and unchanged form notification destination. Separate the remaining external-account/analytics work from completed repository fixes.
