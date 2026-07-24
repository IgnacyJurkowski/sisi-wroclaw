# PostHog Analytics & Session Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire PostHog (EU cloud) into the sisi-wroclaw Astro site for consent-gated session recording and always-on anonymous conversion tracking, with the pinned CSP byte-identical and every gate updated in lockstep.

**Architecture:** posthog-js is npm-bundled from its `no-external` build (no remote code, satisfies `script-src 'self'`); all traffic rides a `/ph` reverse proxy in `netlify.toml` (keeps `connect-src 'self'`). Consent is hybrid: memory-only anonymous events for everyone; an Accept/Decline banner switches on persistent storage + masked replay via a lazy same-origin recorder chunk. Spec: `docs/superpowers/specs/2026-07-24-posthog-analytics-design.md`.

**Tech Stack:** Astro 7 (static), posthog-js 1.407.x, Netlify redirects/proxy, `node:test`, playwright-core browser gate.

> **Post-execution note (2026-07-24):** after this plan was executed, the owner chose a dedicated PostHog project — **231773 "SiSi Wrocław"**, token `phc_xGAJevJfPpYyrixXMnpJb43nDCz2fVHpnJBbaoDyNgeu` — superseding every `218919` / `phc_oLoN…` mention below.

## Global Constraints

- **Local Node is 20; `astro build`/`astro check` need ≥22.** Locally run ONLY `npm run test:unit`. The full gate (`npm test`) runs in CI ("Launch gate / test") on push/PR — expect check-build/browser assertions to be exercised there, not locally.
- **Branch:** work on `posthog-analytics` (exists, contains the spec). `main` is PR-gated; never push to it.
- **CSP must stay byte-identical:** `generate-headers.mjs` and the pinned `expectedCsp` in `check-build.mjs` (lines 753-766) are NOT touched by this plan. Any change that would require touching them is a bug in the change.
- **No inline scripts ever** — the header generator throws on any inline script other than `document.documentElement.classList.add('js');`.
- **`sessionStorage` may not appear in any `src/` file except `src/i18n/legal.ts`** (disclosure text) — enforced by `scripts/launch.test.mjs` after Task 7.
- **The quoted literals `'accepted'` and `'rejected'` may not appear in first-party built JS** (check-build). Consent values are exactly `granted` / `denied`; key is exactly `sisi-analytics-consent`.
- **No PII in analytics payloads:** no names, emails, phones, company names, or message bodies. Only non-PII context (`form`, `page`, `cta_location`, `locale`).
- **PostHog token** `phc_oLoNUCSdjqTiUrtPTfeiAYYUHFUWcA4ZieZEypzed4SF` is the public project API key (EU project 218919) — publishable by design, hardcoded, never treated as a secret.
- **Page count is pinned** (`htmls.length === 57 + eventCount * 5`) — this plan adds no pages.
- **Commit style:** conventional commits (`feat(analytics): …`, `test(gate): …`), each ending with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Consent state module (TDD)

**Files:**
- Create: `src/lib/consent.mjs`
- Test: `scripts/consent.test.mjs`

**Interfaces:**
- Consumes: nothing (pure module, storage injected).
- Produces (used by Tasks 2, 5, 6, 8):
  - `CONSENT_KEY = 'sisi-analytics-consent'`, `CONSENT_GRANTED = 'granted'`, `CONSENT_DENIED = 'denied'`, `CONSENT_EVENT = 'sisi-consent-change'`, `LEGACY_KEYS = ['sisi-cookie-notice', 'sisi-cookie-consent']`
  - `safeLocalStorage(): Storage | null`
  - `readConsent(storage): 'granted' | 'denied' | null`
  - `writeConsent(storage, value): boolean`
  - `removeLegacyKeys(storage): void`

- [ ] **Step 1: Write the failing test**

Create `scripts/consent.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_DENIED,
  CONSENT_EVENT,
  CONSENT_GRANTED,
  CONSENT_KEY,
  LEGACY_KEYS,
  readConsent,
  removeLegacyKeys,
  safeLocalStorage,
  writeConsent,
} from '../src/lib/consent.mjs';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}

const throwingStorage = {
  getItem() { throw new Error('denied'); },
  setItem() { throw new Error('denied'); },
  removeItem() { throw new Error('denied'); },
};

test('constants match the disclosed inventory', () => {
  assert.equal(CONSENT_KEY, 'sisi-analytics-consent');
  assert.equal(CONSENT_GRANTED, 'granted');
  assert.equal(CONSENT_DENIED, 'denied');
  assert.equal(CONSENT_EVENT, 'sisi-consent-change');
  assert.deepEqual(LEGACY_KEYS, ['sisi-cookie-notice', 'sisi-cookie-consent']);
});

test('safeLocalStorage returns null outside the browser', () => {
  assert.equal(safeLocalStorage(), null);
});

test('readConsent returns only the two valid decisions', () => {
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'granted' })), 'granted');
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'denied' })), 'denied');
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: 'dismissed' })), null);
  assert.equal(readConsent(memoryStorage()), null);
});

test('readConsent tolerates missing or throwing storage', () => {
  assert.equal(readConsent(null), null);
  assert.equal(readConsent(throwingStorage), null);
});

test('writeConsent stores only valid decisions and reports success', () => {
  const storage = memoryStorage();
  assert.equal(writeConsent(storage, CONSENT_GRANTED), true);
  assert.equal(storage.getItem(CONSENT_KEY), 'granted');
  assert.equal(writeConsent(storage, CONSENT_DENIED), true);
  assert.equal(storage.getItem(CONSENT_KEY), 'denied');
  assert.equal(writeConsent(storage, 'dismissed'), false);
  assert.equal(storage.getItem(CONSENT_KEY), 'denied');
});

test('writeConsent tolerates missing or throwing storage', () => {
  assert.equal(writeConsent(null, CONSENT_GRANTED), false);
  assert.equal(writeConsent(throwingStorage, CONSENT_GRANTED), false);
});

test('removeLegacyKeys clears retired records and survives denial', () => {
  const storage = memoryStorage({
    'sisi-cookie-notice': 'dismissed',
    'sisi-cookie-consent': 'x',
    keep: '1',
  });
  removeLegacyKeys(storage);
  assert.equal(storage.map.has('sisi-cookie-notice'), false);
  assert.equal(storage.map.has('sisi-cookie-consent'), false);
  assert.equal(storage.getItem('keep'), '1');
  removeLegacyKeys(null);
  removeLegacyKeys(throwingStorage);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/consent.test.mjs`
Expected: FAIL — `Cannot find module '.../src/lib/consent.mjs'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/consent.mjs`:

```js
/* Analytics consent state (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   Pure helpers over an injected Storage-like object so node:test can exercise
   denial and garbage states without a browser. Storage failures never throw:
   reads fall back to "no decision", writes report false, and callers keep a
   page-local decision so the UI still responds. */

export const CONSENT_KEY = 'sisi-analytics-consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';
/* CustomEvent name the banner and withdraw control dispatch on document. */
export const CONSENT_EVENT = 'sisi-consent-change';
/* Retired records from the dismiss-only notice era; removal-only forever. */
export const LEGACY_KEYS = ['sisi-cookie-notice', 'sisi-cookie-consent'];

export function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readConsent(storage) {
  try {
    const value = storage ? storage.getItem(CONSENT_KEY) : null;
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(storage, value) {
  if (value !== CONSENT_GRANTED && value !== CONSENT_DENIED) return false;
  try {
    if (!storage) return false;
    storage.setItem(CONSENT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLegacyKeys(storage) {
  for (const key of LEGACY_KEYS) {
    try {
      storage?.removeItem(key);
    } catch {}
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/consent.test.mjs`
Expected: PASS (all 7 tests). Then run the whole unit suite: `npm run test:unit` — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent.mjs scripts/consent.test.mjs
git commit -m "feat(consent): add analytics consent state module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: posthog-js dependency, analytics bootstrap, vendor chunking

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/scripts/analytics-init.ts`
- Modify: `src/layouts/Base.astro:143-144`
- Modify: `astro.config.mjs` (vite.build)

**Interfaces:**
- Consumes: `CONSENT_EVENT`, `CONSENT_GRANTED`, `readConsent`, `safeLocalStorage` from `src/lib/consent.mjs` (Task 1).
- Produces: a running PostHog singleton (module `posthog-js/dist/module.no-external`) initialized at page load; listens for `document` CustomEvent `sisi-consent-change` with `detail.value: 'granted' | 'denied'`. Task 4's `track()` imports the same singleton.

- [ ] **Step 1: Install posthog-js**

Run: `npm install posthog-js`
Expected: `package.json` gains `"posthog-js": "^1.407.2"` (or newer) under `dependencies`; lockfile updated. (Node 20 is fine for installing.)

- [ ] **Step 2: Create `src/scripts/analytics-init.ts`**

```ts
/* PostHog bootstrap (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   The no-external build cannot load remote code; the replay recorder ships as
   a lazy same-origin chunk. All traffic rides the /ph proxy (netlify.toml),
   so the CSP stays exactly `connect-src 'self'`.

   Consent contract (src/lib/consent.mjs): no decision or 'denied' -> memory
   persistence, recording off, anonymous events still counted; 'granted' ->
   persistent storage + masked session replay. Failures here must never
   affect the page. */
import posthog from 'posthog-js/dist/module.no-external';
import {
  CONSENT_EVENT,
  CONSENT_GRANTED,
  readConsent,
  safeLocalStorage,
} from '../lib/consent.mjs';

// Public project API key (EU project 218919) - publishable, not a secret.
const POSTHOG_TOKEN = 'phc_oLoNUCSdjqTiUrtPTfeiAYYUHFUWcA4ZieZEypzed4SF';

async function enableConsentedMode(): Promise<void> {
  try {
    // Registers the replay recorder before recording starts; kept a separate
    // chunk by astro.config.mjs manualChunks so it downloads only on consent.
    await import('posthog-js/dist/posthog-recorder');
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.startSessionRecording();
  } catch {}
}

function disableConsentedMode(): void {
  try {
    posthog.stopSessionRecording();
    posthog.set_config({ persistence: 'memory' });
    // Drops the ph_* identifiers written while consent was in force.
    posthog.reset();
  } catch {}
}

try {
  posthog.init(POSTHOG_TOKEN, {
    api_host: '/ph',
    ui_host: 'https://eu.posthog.com',
    persistence: 'memory',
    disable_session_recording: true,
    person_profiles: 'identified_only',
    session_recording: { maskAllInputs: true },
  });
  if (readConsent(safeLocalStorage()) === CONSENT_GRANTED) void enableConsentedMode();
  document.addEventListener(CONSENT_EVENT, (event) => {
    const value = (event as CustomEvent<{ value?: string }>).detail?.value;
    if (value === CONSENT_GRANTED) void enableConsentedMode();
    else disableConsentedMode();
  });
} catch {}
```

- [ ] **Step 3: Wire it into `src/layouts/Base.astro`**

Edit lines 143-144 — replace:

```astro
    <script>import '../scripts/nav.ts';</script>
    <script>import '../scripts/scroll-animations.ts';</script>
```

with:

```astro
    <script>import '../scripts/nav.ts';</script>
    <script>import '../scripts/scroll-animations.ts';</script>
    <script>import '../scripts/analytics-init.ts';</script>
```

(Task 4 adds a fourth line for `conversion-events.ts` — do NOT add it yet, the file doesn't exist.)

- [ ] **Step 4: Add deterministic vendor chunks in `astro.config.mjs`**

In the `vite.build` object, replace:

```js
    build: {
      // CSP permits one exact pre-paint bootstrap only. Everything Astro/Vite
      // processes must remain a same-origin file rather than inline code.
      assetsInlineLimit: 0,
      cssMinify: 'lightningcss',
      cssTarget: ['chrome79', 'firefox78', 'safari12', 'edge88', 'ios12'],
    },
```

with:

```js
    build: {
      // CSP permits one exact pre-paint bootstrap only. Everything Astro/Vite
      // processes must remain a same-origin file rather than inline code.
      assetsInlineLimit: 0,
      cssMinify: 'lightningcss',
      cssTarget: ['chrome79', 'firefox78', 'safari12', 'edge88', 'ios12'],
      rollupOptions: {
        output: {
          // Deterministic vendor chunks: check-build scans first-party code
          // strictly and skips posthog-* payloads; the recorder stays its own
          // chunk so it only downloads after analytics consent.
          manualChunks(id) {
            if (!id.includes('node_modules/posthog-js/')) return undefined;
            return id.includes('posthog-recorder') ? 'posthog-recorder' : 'posthog';
          },
        },
      },
    },
```

- [ ] **Step 5: Local sanity + type contingency**

Run: `npm run test:unit`
Expected: PASS (build/check cannot run on Node 20 — CI covers them).

TypeScript contingency (only if CI's `astro check` later reports `Cannot find module 'posthog-js/dist/module.no-external'`): create `src/types/posthog-bundles.d.ts` with exactly:

```ts
declare module 'posthog-js/dist/module.no-external' {
  import posthog from 'posthog-js';
  export * from 'posthog-js';
  export default posthog;
}
declare module 'posthog-js/dist/posthog-recorder';
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/scripts/analytics-init.ts src/layouts/Base.astro astro.config.mjs
git commit -m "feat(analytics): bootstrap bundled posthog behind consent contract

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Netlify reverse proxy + gate assertion

**Files:**
- Modify: `netlify.toml` (after line 73, before the `[[headers]]` blocks)
- Modify: `scripts/check-build.mjs` (after line 742, the `'legacy /menu redirect'` assertion)

**Interfaces:**
- Consumes: nothing.
- Produces: same-origin path `/ph/*` proxied to `https://eu.i.posthog.com/:splat` in production; check-build assertion `'posthog reverse proxy rides the same-origin /ph path'`.

- [ ] **Step 1: Add the proxy rule to `netlify.toml`**

Insert between the last legacy redirect block (`from = "/polityka-cookies"`, ends line 73) and the `# Correct MIME types` comment (line 75):

```toml

# PostHog reverse proxy: analytics rides the canonical origin so the CSP can
# stay connect-src 'self' and ad blockers cannot separate it from the site.
[[redirects]]
  from = "/ph/*"
  to = "https://eu.i.posthog.com/:splat"
  status = 200
  force = true
```

Do not reorder any existing block — check-build pins the bare-root ordering (lines 736-741).

- [ ] **Step 2: Add the check-build assertion**

In `scripts/check-build.mjs`, directly after line 742 (`assert('legacy /menu redirect', toml.includes('from = "/menu"'));`), add:

```js
assert(
  'posthog reverse proxy rides the same-origin /ph path',
  /from = "\/ph\/\*"\s*\n\s*to = "https:\/\/eu\.i\.posthog\.com\/:splat"\s*\n\s*status = 200\s*\n\s*force = true/.test(toml),
);
```

- [ ] **Step 3: Verify locally what can be verified**

Run: `node --check scripts/check-build.mjs && npm run test:unit`
Expected: both PASS (`node --check` validates syntax only; the assertion itself runs in CI after a build).

- [ ] **Step 4: Commit**

```bash
git add netlify.toml scripts/check-build.mjs
git commit -m "feat(routing): proxy /ph to posthog eu ingestion

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Live `track()`, delegated conversion listener, form events

**Files:**
- Modify: `src/lib/analytics.ts` (full rewrite)
- Create: `src/scripts/conversion-events.ts`
- Modify: `src/layouts/Base.astro` (add one script line)
- Modify: `src/scripts/event-enquiry-form.ts:1,75-98`

**Interfaces:**
- Consumes: posthog singleton from `posthog-js/dist/module.no-external` (same module instance as Task 2's init — Vite dedupes).
- Produces: `track(payload: AnalyticsPayload): void` and `type AnalyticsEvent = 'reservation_cta_click' | 'phone_click' | 'email_click' | 'enquiry_submit' | 'enquiry_success'` — the only capture path for custom events.

- [ ] **Step 1: Rewrite `src/lib/analytics.ts`**

Replace the entire file with:

```ts
/* Consent-aware analytics hook, backed by PostHog
   (bootstrap: src/scripts/analytics-init.ts; spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   Anonymous, storage-free capture is always on; persistent storage and
   session replay exist only after consent (see CookieBanner).

   Rules:
   - track() must be safe to call at any time: never throws, silently drops
     events if PostHog is unavailable.
   - NEVER include PII: no contact names, emails, phones, company names, or
     the enquiry message body. Only non-PII context (form, cta_location, …). */
import posthog from 'posthog-js/dist/module.no-external';

export type AnalyticsEvent =
  | 'reservation_cta_click'
  | 'phone_click'
  | 'email_click'
  | 'enquiry_submit'
  | 'enquiry_success';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  locale?: string;
  page?: string;
  /** Non-PII context only (e.g. form name, cta_location). */
  [key: string]: string | number | undefined;
}

export function track(payload: AnalyticsPayload): void {
  try {
    const { event, ...properties } = payload;
    posthog.capture(event, properties);
  } catch {
    /* Analytics must never break the page. */
  }
}
```

- [ ] **Step 2: Create `src/scripts/conversion-events.ts`**

```ts
/* Conversion instrumentation (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   One delegated capture-phase listener instead of per-component wiring, so
   components carry no analytics markup. Payloads are non-PII context only. */
import { track, type AnalyticsEvent } from '../lib/analytics';

function ctaLocation(anchor: HTMLAnchorElement): string | undefined {
  try {
    const content = new URL(anchor.href, location.href).searchParams.get('utm_content');
    if (content) return content;
  } catch {}
  return anchor.closest('[id]')?.id || undefined;
}

function eventFor(anchor: HTMLAnchorElement): AnalyticsEvent | null {
  const href = anchor.getAttribute('href') || '';
  if (href.startsWith('tel:')) return 'phone_click';
  if (href.startsWith('mailto:')) return 'email_click';
  const host = anchor.hostname;
  if (host === 'emenago.com' || host.endsWith('.emenago.com')) return 'reservation_cta_click';
  return null;
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const name = eventFor(anchor);
    if (!name) return;
    track({ event: name, page: location.pathname, cta_location: ctaLocation(anchor) });
  },
  { capture: true },
);
```

- [ ] **Step 3: Wire it into `src/layouts/Base.astro`**

After the line added in Task 2, insert:

```astro
    <script>import '../scripts/conversion-events.ts';</script>
```

(The three-line block from Task 2 becomes four lines ending with `conversion-events.ts`.)

- [ ] **Step 4: Add form events to `src/scripts/event-enquiry-form.ts`**

Line 1 — replace:

```ts
import { campaignAttribution } from '../lib/attribution.mjs';
```

with:

```ts
import { campaignAttribution } from '../lib/attribution.mjs';
import { track } from '../lib/analytics';
```

In the submit handler, replace lines 75-98 (`form.addEventListener('submit', …` through the success `.then` block):

```ts
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (okBox) okBox.hidden = true;
    if (failBox) failBox.hidden = true;
    if (!validate()) return;

    // Non-PII form identifier for analytics (e.g. Netlify form name).
    const formName =
      form.getAttribute('name') ||
      form.querySelector<HTMLInputElement>('input[name="form-name"]')?.value ||
      'enquiry';
    track({ event: 'enquiry_submit', form: formName, page: location.pathname });

    submit.disabled = true;
    submit.textContent = messages.sending;
    const data = new URLSearchParams();
    for (const [key, value] of new FormData(form)) data.append(key, String(value));

    fetch(location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString(),
    })
      .then((response) => {
        if (!response.ok) throw new Error('bad status');
        track({ event: 'enquiry_success', form: formName, page: location.pathname });
        form.reset();
        if (okBox) {
          okBox.hidden = false;
          okBox.focus();
        }
      })
```

(The `.catch`/`.finally` blocks, lines 99-106, stay exactly as they are.)

- [ ] **Step 5: Run unit suite**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics.ts src/scripts/conversion-events.ts src/layouts/Base.astro src/scripts/event-enquiry-form.ts
git commit -m "feat(analytics): live track() with delegated conversion events

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Consent banner + UI strings (5 locales)

**Files:**
- Modify: `src/components/CookieBanner.astro` (full rewrite)
- Modify: `src/styles/global.css` (ghost button style)
- Modify: `src/i18n/ui/pl.ts:110-117`, `en.ts:108-114`, `de.ts:108-114`, `it.ts:107-113`, `cs.ts:108-114` (`cookie` objects)

**Interfaces:**
- Consumes: `consent.mjs` (Task 1) and the `CONSENT_EVENT` listener in `analytics-init.ts` (Task 2).
- Produces: banner buttons `[data-consent-accept]` / `[data-consent-decline]`; `t.cookie` shape changes from `{text, cookiesLink, privacyLink, dismiss, dialogLabel}` to `{text, cookiesLink, privacyLink, accept, decline, dialogLabel}` (Tasks 8-9 assert against the new markup).

- [ ] **Step 1: Rewrite `src/components/CookieBanner.astro`**

Replace the entire file with:

```astro
---
// Analytics-consent banner. Anonymous, storage-free analytics always runs;
// this dialog only decides persistent storage + session replay (PostHog).
// It renders hidden to avoid a flash for return visits; fixed positioning
// prevents layout shifts. Decision store: src/lib/consent.mjs.
import { type Locale } from '../i18n/config';
import { localizedPath } from '../i18n/routes';
import { useTranslations } from '../i18n/t';

interface Props { locale: Locale }
const { locale } = Astro.props;
const t = useTranslations(locale);

// Text contains {cookies} then {privacy} tokens -> 3 plain-text segments.
const parts = t.cookie.text.split(/\{cookies\}|\{privacy\}/);
const cookiesHref = localizedPath('cookies', locale);
const privacyHref = localizedPath('privacy', locale);
---

<div id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite"
     aria-label={t.cookie.dialogLabel} hidden>
  <p class="cookie-text">{parts[0]}<a href={cookiesHref}>{t.cookie.cookiesLink}</a>{parts[1]}<a href={privacyHref}>{t.cookie.privacyLink}</a>{parts[2]}</p>
  <div class="cookie-actions">
    <button type="button" class="btn-cta cookie-btn" data-consent-accept>{t.cookie.accept}</button>
    <button type="button" class="btn-cta cookie-btn cookie-btn-ghost" data-consent-decline>{t.cookie.decline}</button>
  </div>
</div>

<script>
  import { SUMMER_FRIDAY_NOTICE } from '../lib/summer-hours.mjs';
  import {
    CONSENT_DENIED,
    CONSENT_EVENT,
    CONSENT_GRANTED,
    readConsent,
    removeLegacyKeys,
    safeLocalStorage,
    writeConsent,
  } from '../lib/consent.mjs';

  const banner = document.getElementById('cookie-banner');
  const popup = document.querySelector<HTMLElement>('[data-summer-popup]');
  const storage = safeLocalStorage();
  removeLegacyKeys(storage);
  let decided = readConsent(storage) !== null;

  const reveal = () => {
    if (!decided && banner) banner.hidden = false;
  };
  const decide = (value: string) => {
    // Storage denial still hides the banner for this page view (page-local
    // fallback); the site simply asks again on the next visit.
    writeConsent(storage, value);
    decided = true;
    if (banner) banner.hidden = true;
    document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { value } }));
  };
  banner?.querySelector('[data-consent-accept]')?.addEventListener('click', () => decide(CONSENT_GRANTED));
  banner?.querySelector('[data-consent-decline]')?.addEventListener('click', () => decide(CONSENT_DENIED));

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

(The summer-popup coordination block, `reveal()` shape, and the `hidden` first-paint behavior are byte-compatible with the previous notice so the existing browser tests keep passing.)

- [ ] **Step 2: Add the ghost button style to `src/styles/global.css`**

Find the existing `.cookie-btn` rule (grep `cookie-btn`) and add directly after it:

```css
/* Decline: quiet ghost variant of the consent CTA. */
.cookie-btn-ghost {
  background: transparent;
  border: 1px solid rgba(237, 219, 194, 0.4);
  color: var(--cream);
}
.cookie-btn-ghost:hover {
  background: transparent;
  border-color: var(--cream);
}
```

(If `--cream` is not defined in `global.css`'s `:root`, use the literal the repo uses for cream text: `rgb(237, 219, 194)`.)

- [ ] **Step 3: Update the `cookie` object in all five UI dictionaries**

`src/i18n/ui/pl.ts` lines 110-117 — replace with:

```ts
  cookie: {
    // {cookies} and {privacy} are replaced with links to the policy pages.
    text: 'Za Twoją zgodą używamy analityki PostHog (statystyki odwiedzin i nagrania sesji), aby ulepszać stronę. Bez zgody zbieramy wyłącznie anonimowe statystyki, bez zapisu w pamięci przeglądarki. Szczegóły znajdziesz w {cookies} oraz {privacy}.',
    cookiesLink: 'Polityce cookies',
    privacyLink: 'Polityce prywatności',
    accept: 'Zgadzam się',
    decline: 'Odmawiam',
    dialogLabel: 'Zgoda na analitykę',
  },
```

`src/i18n/ui/en.ts` lines 108-114 — replace with:

```ts
  cookie: {
    text: 'With your consent we use PostHog analytics (visit statistics and session recordings) to improve the site. Without consent we collect only anonymous statistics, with nothing stored in your browser. Details are in our {cookies} and {privacy}.',
    cookiesLink: 'Cookie Policy',
    privacyLink: 'Privacy Policy',
    accept: 'Accept',
    decline: 'Decline',
    dialogLabel: 'Analytics consent',
  },
```

`src/i18n/ui/de.ts` lines 108-114 — replace with:

```ts
  cookie: {
    text: 'Mit deiner Einwilligung nutzen wir PostHog-Analytik (Besuchsstatistiken und Sitzungsaufzeichnungen), um die Website zu verbessern. Ohne Einwilligung erheben wir nur anonyme Statistiken, ohne etwas im Browser zu speichern. Einzelheiten findest du in unserer {cookies} und unserer {privacy}.',
    cookiesLink: 'Cookie-Richtlinie',
    privacyLink: 'Datenschutzerklärung',
    accept: 'Einverstanden',
    decline: 'Ablehnen',
    dialogLabel: 'Einwilligung in die Analytik',
  },
```

`src/i18n/ui/it.ts` lines 107-113 — replace with:

```ts
  cookie: {
    text: 'Con il tuo consenso utilizziamo l\'analitica PostHog (statistiche delle visite e registrazioni delle sessioni) per migliorare il sito. Senza consenso raccogliamo solo statistiche anonime, senza salvare nulla nel browser. I dettagli sono disponibili nella nostra {cookies} e nella nostra {privacy}.',
    cookiesLink: 'informativa sui cookie',
    privacyLink: 'informativa sulla privacy',
    accept: 'Accetto',
    decline: 'Rifiuto',
    dialogLabel: 'Consenso all\'analitica',
  },
```

`src/i18n/ui/cs.ts` lines 108-114 — replace with:

```ts
  cookie: {
    text: 'S vaším souhlasem používáme analytiku PostHog (statistiky návštěv a nahrávky relací) ke zlepšování webu. Bez souhlasu sbíráme pouze anonymní statistiky, bez ukládání do prohlížeče. Podrobnosti najdete v našich {cookies} a {privacy}.',
    cookiesLink: 'zásadách používání souborů cookie',
    privacyLink: 'zásadách ochrany soukromí',
    accept: 'Souhlasím',
    decline: 'Odmítám',
    dialogLabel: 'Souhlas s analytikou',
  },
```

(pl.ts defines the `UI` type, so replacing `dismiss` with `accept`/`decline` makes any missed locale a compile error in CI's `astro check`.)

- [ ] **Step 4: Run unit suite**

Run: `npm run test:unit`
Expected: PASS. (launch.test.mjs still passes: `sisi-cookie-notice` remains present in src via `LEGACY_KEYS`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/CookieBanner.astro src/styles/global.css src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts
git commit -m "feat(consent): upgrade cookie notice to accept/decline consent banner

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Withdraw-consent control on the cookie-policy page

**Files:**
- Modify: `src/components/pages/LegalPage.astro:56-58`
- Modify: `src/styles/global.css` (one rule)
- Modify: all five `src/i18n/ui/*.ts` (`legal` object gains two keys)

**Interfaces:**
- Consumes: `consent.mjs` helpers; `analytics-init.ts` handles the dispatched `CONSENT_EVENT` with `'denied'` (stops recording, reverts to memory, `posthog.reset()`).
- Produces: `[data-consent-withdraw]` button + `[data-consent-withdraw-done]` confirmation on `/…/polityka-cookies/`-family pages; `t.legal.withdrawButton` / `t.legal.withdrawDone` strings.

- [ ] **Step 1: Add the control to `src/components/pages/LegalPage.astro`**

Replace lines 56-58:

```astro
    </div>
    <p class="legal-meta">{t.legal.updatedLabel} {formatLongDate(LEGAL_UPDATED_ISO, locale)}</p>
  </div>
```

with:

```astro
    </div>
    {legalKey === 'cookies' && (
      <div class="legal-withdraw">
        <button type="button" class="btn-cta cookie-btn" data-consent-withdraw>{t.legal.withdrawButton}</button>
        <p data-consent-withdraw-done hidden>{t.legal.withdrawDone}</p>
      </div>
    )}
    <p class="legal-meta">{t.legal.updatedLabel} {formatLongDate(LEGAL_UPDATED_ISO, locale)}</p>
  </div>
```

Then append after the closing `</Base>` tag:

```astro

<script>
  import {
    CONSENT_DENIED,
    CONSENT_EVENT,
    safeLocalStorage,
    writeConsent,
  } from '../../lib/consent.mjs';

  const button = document.querySelector<HTMLButtonElement>('[data-consent-withdraw]');
  button?.addEventListener('click', () => {
    writeConsent(safeLocalStorage(), CONSENT_DENIED);
    document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { value: CONSENT_DENIED } }));
    button.disabled = true;
    const done = document.querySelector<HTMLElement>('[data-consent-withdraw-done]');
    if (done) done.hidden = false;
  });
</script>
```

- [ ] **Step 2: Add the layout rule to `src/styles/global.css`** (after the `.cookie-btn-ghost` rules from Task 5):

```css
.legal-withdraw { margin: 32px 0 8px; }
.legal-withdraw p { margin-top: 12px; }
```

- [ ] **Step 3: Add the two `legal` strings to every UI dictionary**

In each file, inside the existing `legal: { … }` object, add after `englishFallbackNote`:

`pl.ts`:
```ts
    withdrawButton: 'Wycofaj zgodę na analitykę',
    withdrawDone: 'Zgoda została wycofana. Analityka działa teraz wyłącznie w trybie anonimowym.',
```
`en.ts`:
```ts
    withdrawButton: 'Withdraw analytics consent',
    withdrawDone: 'Consent withdrawn. Analytics now runs in anonymous mode only.',
```
`de.ts`:
```ts
    withdrawButton: 'Einwilligung in die Analytik widerrufen',
    withdrawDone: 'Die Einwilligung wurde widerrufen. Die Analytik läuft jetzt nur noch anonym.',
```
`it.ts`:
```ts
    withdrawButton: 'Revoca il consenso all\'analitica',
    withdrawDone: 'Consenso revocato. L\'analitica ora funziona solo in modalità anonima.',
```
`cs.ts`:
```ts
    withdrawButton: 'Odvolat souhlas s analytikou',
    withdrawDone: 'Souhlas byl odvolán. Analytika nyní běží pouze anonymně.',
```

- [ ] **Step 4: Run unit suite**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/LegalPage.astro src/styles/global.css src/i18n/ui/pl.ts src/i18n/ui/en.ts src/i18n/ui/de.ts src/i18n/ui/it.ts src/i18n/ui/cs.ts
git commit -m "feat(consent): add withdraw control to cookie policy page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Legal documents (pl+en), privacy bullets, launch-test inventory

**Files:**
- Modify: `src/i18n/legal.ts:107,168-204,292,353-389`
- Modify: `src/data/site.ts` (`LEGAL_UPDATED_ISO`)
- Modify: `scripts/launch.test.mjs:26-35`

**Interfaces:**
- Consumes: nothing new.
- Produces: disclosure text the gates match against (`sisi-analytics-consent (localStorage)`, the word `sessionStorage` in legal.ts only). DE/IT/CS legal pages keep the repo's documented English-fallback behavior — no new locale docs.

- [ ] **Step 1: Replace `pl_cookies` (legal.ts lines 168-204) with:**

```ts
const pl_cookies: LegalDoc = {
  sections: [
    {
      heading: '1. Pamięć przeglądarki',
      paragraphs: [
        'Strona korzysta z pamięci przeglądarki w dwóch celach: aby zapamiętać Twoje decyzje dotyczące komunikatów i zgody na analitykę oraz - wyłącznie po wyrażeniu zgody - do działania analityki PostHog opisanej poniżej. Stan niezbędny do obsługi formularzy i nawigacji jest używany podczas interakcji z tymi elementami.',
      ],
    },
    {
      heading: '2. Analityka PostHog',
      paragraphs: [
        'Za Twoją zgodą korzystamy z narzędzia analitycznego PostHog (PostHog Inc.; dane przetwarzane na serwerach w Unii Europejskiej), które mierzy odwiedziny i konwersje (np. kliknięcia rezerwacji) oraz nagrywa sesje - ruch kursora i interakcje ze stroną; pola formularzy są maskowane.',
        'Bez zgody analityka działa wyłącznie w trybie anonimowym: zdarzenia nie są łączone z żadnym identyfikatorem zapisanym w Twojej przeglądarce i nic nie jest zapisywane w jej pamięci. Nagrywanie sesji jest wtedy wyłączone.',
        'Zgodę można wycofać w każdej chwili przyciskiem na tej stronie; wycofanie zatrzymuje nagrywanie i usuwa identyfikatory analityczne z przeglądarki.',
      ],
    },
    {
      heading: '3. Jakie dane przechowujemy',
      paragraphs: ['Pamięć niezbędna do działania strony:'],
      items: [
        'sisi-analytics-consent (localStorage) - przechowuje wartość "granted" albo "denied", czyli Twoją decyzję dotyczącą analityki.',
        'sisi-summer-fri-2026-dismissed (localStorage) - przechowuje wyłącznie wartość "dismissed", aby nie wyświetlać ponownie komunikatu o wakacyjnym zamknięciu w piątki. Wpis jest usuwany po 28 sierpnia 2026 r.',
        'Niezbędny stan formularzy i nawigacji - przechowywany tylko na potrzeby bieżącej interakcji ze stroną.',
      ],
    },
    {
      heading: '4. Pamięć zapisywana po wyrażeniu zgody',
      paragraphs: ['Po kliknięciu "Zgadzam się" narzędzie PostHog zapisuje:'],
      items: [
        'ph_..._posthog (localStorage oraz cookie, do 365 dni) - identyfikator przeglądarki i sesji oraz ustawienia analityki.',
        'Wpisy sesyjne PostHog (sessionStorage) - identyfikatory bieżącej sesji i okna, usuwane po zamknięciu karty.',
      ],
    },
    {
      heading: '5. Zarządzanie pamięcią',
      items: [
        'Komunikat o zgodzie wyświetla się do czasu podjęcia decyzji; wybór zapisuje wartość "granted" albo "denied".',
        'Zgodę można wycofać przyciskiem "Wycofaj zgodę na analitykę" na tej stronie.',
        'Pamięcią strony można zarządzać w ustawieniach przeglądarki. Ograniczenie pamięci niezbędnej może wpłynąć na działanie strony.',
      ],
    },
    {
      heading: '6. Więcej informacji',
      paragraphs: [
        'Zasady przetwarzania danych osobowych opisane są w Polityce prywatności. Informacje o prywatności PostHog: https://posthog.com/privacy.',
      ],
    },
  ],
};
```

- [ ] **Step 2: Replace `en_cookies` (legal.ts lines 353-389) with:**

```ts
const en_cookies: LegalDoc = {
  sections: [
    {
      heading: '1. Browser storage',
      paragraphs: [
        'The site uses browser storage for two purposes: to remember your decisions about notices and analytics consent, and - only after you consent - for the PostHog analytics described below. State essential to forms and navigation is used while you interact with those controls.',
      ],
    },
    {
      heading: '2. PostHog analytics',
      paragraphs: [
        'With your consent we use the PostHog analytics tool (PostHog Inc.; data processed on servers in the European Union) to measure visits and conversions (e.g. reservation clicks) and to record sessions - cursor movement and interactions with the page; form fields are masked.',
        'Without consent, analytics runs in anonymous mode only: events are not linked to any identifier stored in your browser and nothing is written to browser storage. Session recording stays off.',
        'You can withdraw consent at any time with the button on this page; withdrawal stops recording and removes analytics identifiers from your browser.',
      ],
    },
    {
      heading: '3. What we store',
      paragraphs: ['Storage essential to the site:'],
      items: [
        'sisi-analytics-consent (localStorage) - stores the value "granted" or "denied", i.e. your analytics decision.',
        'sisi-summer-fri-2026-dismissed (localStorage) - stores only the value "dismissed" so the summer Friday closure notice stays hidden after you close it. The record is removed after 28 August 2026.',
        'Essential form and navigation state - stored only for the current interaction with the site.',
      ],
    },
    {
      heading: '4. Storage written after consent',
      paragraphs: ['After you click "Accept", PostHog stores:'],
      items: [
        'ph_..._posthog (localStorage and a cookie, up to 365 days) - browser and session identifier plus analytics settings.',
        'PostHog session entries (sessionStorage) - identifiers for the current session and window, removed when the tab closes.',
      ],
    },
    {
      heading: '5. Managing storage',
      items: [
        'The consent notice appears until you make a decision; your choice stores the value "granted" or "denied".',
        'You can withdraw consent with the "Withdraw analytics consent" button on this page.',
        'You can manage site storage in your browser settings. Restricting essential storage may affect how the site works.',
      ],
    },
    {
      heading: '6. More information',
      paragraphs: [
        'How personal data is processed is described in the Privacy Policy. PostHog privacy information: https://posthog.com/privacy.',
      ],
    },
  ],
};
```

- [ ] **Step 3: Update the two privacy-policy browser-storage bullets**

legal.ts line 107 (inside `pl_privacy` section 2 `items`) — replace:

```ts
        'Pamięć przeglądarki - zob. Polityka cookies. Strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji.',
```

with:

```ts
        'Pamięć przeglądarki i analityka - zob. Polityka cookies. Strona przechowuje decyzje dotyczące komunikatów i zgody, niezbędny stan formularzy i nawigacji, a po wyrażeniu zgody identyfikatory analityczne PostHog (statystyki odwiedzin i nagrania sesji; podstawa prawna: zgoda - art. 6 ust. 1 lit. a RODO; anonimowe statystyki bez zapisu w przeglądarce: prawnie uzasadniony interes - art. 6 ust. 1 lit. f RODO).',
```

legal.ts line 292 (inside `en_privacy` section 2 `items`) — replace:

```ts
        'Browser storage - see the Cookie Policy. The site stores only notice dismissals and essential form and navigation state.',
```

with:

```ts
        'Browser storage and analytics - see the Cookie Policy. The site stores notice and consent decisions, essential form and navigation state and, after consent, PostHog analytics identifiers (visit statistics and session recordings; legal basis: consent - Art. 6(1)(a) GDPR; anonymous statistics with no browser storage: legitimate interest - Art. 6(1)(f) GDPR).',
```

- [ ] **Step 4: Bump the legal-updated date**

In `src/data/site.ts`, find `LEGAL_UPDATED_ISO` (grep it) and set its value to `'2026-07-24'`.

- [ ] **Step 5: Update the launch-test storage inventory**

`scripts/launch.test.mjs` — replace lines 26-35 (the whole `'browser storage stays within the disclosed launch inventory'` test) with:

```js
test('browser storage stays within the disclosed launch inventory', async () => {
  const files = await sourceFiles('src');
  const legalPath = join('src', 'i18n', 'legal.ts');
  // legal.ts may (and must) NAME sessionStorage in the disclosure text;
  // runtime source may not USE it.
  const runtimeFiles = files.filter((file) => file !== legalPath);
  const source = (await Promise.all(runtimeFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  const legal = await readFile('src/i18n/legal.ts', 'utf8');
  assert.equal(/\bsessionStorage\b/.test(source), false, 'sessionStorage is outside the disclosed launch inventory');
  assert.match(source, /sisi-cookie-notice/); // legacy cleanup only
  assert.match(source, /sisi-analytics-consent/);
  assert.match(source, /sisi-summer-fri-2026-dismissed/);
  assert.doesNotMatch(source, /['"]sisi-summer-fri-dismissed['"]/);
  assert.match(legal, /sisi-analytics-consent \(localStorage\)/);
  assert.match(legal, /sisi-summer-fri-2026-dismissed \(localStorage\)/);
  assert.match(legal, /sessionStorage/);
});
```

- [ ] **Step 6: Run unit suite**

Run: `npm run test:unit`
Expected: PASS, including the rewritten launch test against the new legal text.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/legal.ts src/data/site.ts scripts/launch.test.mjs
git commit -m "feat(legal): disclose posthog analytics storage and consent

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: check-build gate — first-party/vendor split + consent assertions

**Files:**
- Modify: `scripts/check-build.mjs:915-917` (script text assembly), `:966-977` (storage tokens), `:997-1016` (banner-source assertions)

**Interfaces:**
- Consumes: vendor chunk naming from Task 2 (`posthog*.js` basenames), consent module source shape from Task 1, banner markup from Task 5.
- Produces: the CI gate that enforces all of the above on every build.

- [ ] **Step 1: Split first-party from posthog chunks**

Replace lines 915-917:

```js
const externalScriptBodies = scripts.map((file) => readFileSync(file, 'utf8'));
const inlineScriptBodies = htmls.flatMap((file) => executableInlineScripts(readFileSync(file, 'utf8')));
const executableBuiltText = [...externalScriptBodies, ...inlineScriptBodies].join('\n');
```

with:

```js
// posthog-* chunks are third-party vendor payloads (astro.config manualChunks);
// the strict first-party storage/claims scans exclude them, with their own
// assertions below.
const isPosthogChunk = (file) => (file.split(sep).pop() ?? '').startsWith('posthog');
const posthogScripts = scripts.filter(isPosthogChunk);
const firstPartyScripts = scripts.filter((file) => !isPosthogChunk(file));
const externalScriptBodies = firstPartyScripts.map((file) => readFileSync(file, 'utf8'));
const inlineScriptBodies = htmls.flatMap((file) => executableInlineScripts(readFileSync(file, 'utf8')));
const executableBuiltText = [...externalScriptBodies, ...inlineScriptBodies].join('\n');
```

- [ ] **Step 2: Update the storage-token allowlist**

Replace lines 966-977 (the `'notice runtimes use only the disclosed dismissal records and values'` assertion) with:

```js
assert(
  'notice and consent runtimes use only the disclosed records and values',
  [
    'sisi-cookie-notice', // legacy cleanup only
    'sisi-analytics-consent',
    'granted',
    'denied',
    'sisi-summer-fri-2026-dismissed',
    'dismissed',
    'localStorage.removeItem',
    'localStorage.getItem',
    'localStorage.setItem',
  ].every((token) => executableBuiltText.includes(token))
    && !/[`'"](?:accepted|rejected)[`'"]/.test(executableBuiltText),
);
assert('posthog vendor code is isolated into posthog-* chunks', posthogScripts.length >= 1);
assert(
  'first-party runtime initializes posthog through the /ph proxy',
  executableBuiltText.includes('phc_oLoNUCSdjqTiUrtPTfeiAYYUHFUWcA4ZieZEypzed4SF')
    && /api_host\s*:\s*["']\/ph["']/.test(executableBuiltText),
);
```

- [ ] **Step 3: Replace the banner-source assertions**

Replace lines 997-1016 (from `const cookieSource = …` through the `'storage denial falls back…'` assertion) with:

```js
const cookieSource = readFileSync(join(ROOT, 'src/components/CookieBanner.astro'), 'utf8');
const consentSource = readFileSync(join(ROOT, 'src/lib/consent.mjs'), 'utf8');
assert(
  'consent reads and writes are guarded',
  /try\s*\{[\s\S]*?storage\.getItem\(CONSENT_KEY\)[\s\S]*?\}\s*catch/.test(consentSource)
    && /try\s*\{[\s\S]*?storage\.setItem\(CONSENT_KEY,\s*value\)[\s\S]*?\}\s*catch/.test(consentSource),
);
assert(
  'legacy notice keys are removal-only',
  consentSource.includes("'sisi-cookie-notice'")
    && consentSource.includes("'sisi-cookie-consent'")
    && /removeItem\(key\)/.test(consentSource)
    && !/(?:getItem|setItem)\(\s*['"]sisi-cookie-(?:notice|consent)['"]/.test(cookieSource + consentSource),
);
assert(
  'banner decisions ride the consent module, not raw storage',
  cookieSource.includes('writeConsent(storage, value)')
    && cookieSource.includes('readConsent(storage)')
    && !/localStorage\.(?:getItem|setItem)\(/.test(cookieSource),
);
assert(
  'storage denial falls back to page-local consent decision',
  /decided = true;[\s\S]*?banner\.hidden = true;/.test(cookieSource)
    && cookieSource.includes('data-consent-accept')
    && cookieSource.includes('data-consent-decline'),
);
```

- [ ] **Step 4: Syntax check + unit suite**

Run: `node --check scripts/check-build.mjs && npm run test:unit`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-build.mjs
git commit -m "test(gate): enforce consent inventory and posthog isolation in build gate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Browser test coverage for consent flows

**Files:**
- Modify: `scripts/site-notices-browser.mjs` (three new verify functions + calls in the main block at lines 253-257)

**Interfaces:**
- Consumes: banner selectors from Task 5, withdraw selectors from Task 6, key/values from Task 1; the file's existing pinned-clock page helpers.
- Produces: CI browser assertions for accept, decline, no-storage-before-consent, and withdrawal.

**IMPORTANT:** before writing code, read `scripts/site-notices-browser.mjs` lines 40-110 and mirror the exact helper the existing `verifyFreshVisitor` uses to open a page with a pinned clock at `BEFORE_CUTOFF` (the summer popup must be deterministic regardless of the real date). The bodies below call that setup `openPinnedPage(browser, origin)` — substitute the file's actual helper name/pattern. Dismiss the summer popup with `Escape` exactly as `verifyFreshVisitor` does (lines 91-94).

- [ ] **Step 1: Add the three verify functions** (after `verifyFreshVisitor`):

```js
async function verifyConsentChoices(browser, origin) {
  for (const [selector, expected] of [
    ['[data-consent-accept]', 'granted'],
    ['[data-consent-decline]', 'denied'],
  ]) {
    const { context, page } = await openPinnedPage(browser, origin); // see IMPORTANT note
    const banner = page.locator('#cookie-banner');
    await page.keyboard.press('Escape'); // resolve the summer popup first
    await banner.waitFor({ state: 'visible' });
    await page.locator(selector).click();
    await banner.waitFor({ state: 'hidden' });
    assert.equal(
      await page.evaluate(() => localStorage.getItem('sisi-analytics-consent')),
      expected,
      `consent decision ${expected} was not persisted`,
    );
    await page.reload({ waitUntil: 'load' });
    assert.equal(await banner.isVisible(), false, `consent banner returned after ${expected}`);
    await context.close();
  }
}

async function verifyNoAnalyticsStorageBeforeConsent(browser, origin) {
  const { context, page } = await openPinnedPage(browser, origin);
  await page.waitForTimeout(1_500); // give posthog init time to (wrongly) write
  const state = await page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => key.startsWith('ph_')),
    session: Object.keys(sessionStorage).filter((key) => key.startsWith('ph_')),
    cookies: document.cookie,
  }));
  assert.deepEqual(state.local, [], 'posthog wrote localStorage before consent');
  assert.deepEqual(state.session, [], 'posthog wrote sessionStorage before consent');
  assert.equal(/ph_/.test(state.cookies), false, 'posthog wrote a cookie before consent');
  await context.close();
}

async function verifyWithdrawControl(browser, origin) {
  const { context, page } = await openPinnedPage(browser, origin);
  await page.keyboard.press('Escape');
  await page.locator('#cookie-banner').waitFor({ state: 'visible' });
  await page.locator('[data-consent-accept]').click();
  await page.goto(`${origin}/pl/polityka-cookies/`, { waitUntil: 'load' });
  await page.locator('[data-consent-withdraw]').click();
  await page.locator('[data-consent-withdraw-done]').waitFor({ state: 'visible' });
  assert.equal(
    await page.evaluate(() => localStorage.getItem('sisi-analytics-consent')),
    'denied',
    'withdrawal did not store the denied decision',
  );
  assert.deepEqual(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('ph_'))),
    [],
    'posthog identifiers survived withdrawal',
  );
  await context.close();
}
```

- [ ] **Step 2: Call them from the main block** — after `await verifyFreshVisitor(browser, origin);` (line 253), add:

```js
  await verifyConsentChoices(browser, origin);
  await verifyNoAnalyticsStorageBeforeConsent(browser, origin);
  await verifyWithdrawControl(browser, origin);
```

Also update the final `console.log` PASS line to mention consent, e.g.:
`console.log('PASS summer, consent, and withdrawal notices are sequenced, disclosed, and time-bounded');`

- [ ] **Step 3: Syntax check + unit suite**

Run: `node --check scripts/site-notices-browser.mjs && npm run test:unit`
Expected: both PASS (the browser suite itself runs in CI as part of `npm test` → `test:notices`).

- [ ] **Step 4: Commit**

```bash
git add scripts/site-notices-browser.mjs
git commit -m "test(ux): cover consent accept, decline, and withdrawal flows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: PR, CI gate, deploy-preview verification, PostHog project setup

**Files:** none (process task).

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin posthog-analytics
gh pr create --base main --title "feat(analytics): consent-gated PostHog session recording and conversion tracking" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-07-24-posthog-analytics-design.md:

- Bundled posthog-js (no-external build) behind a /ph Netlify proxy — pinned CSP byte-identical
- Hybrid consent: anonymous memory-only events always; Accept enables persistent storage + masked session replay (lazy recorder chunk)
- Conversions: reservation_cta_click, phone_click, email_click, enquiry_submit, enquiry_success
- Accept/Decline banner, withdraw control on the cookie policy page, pl/en legal docs + 5-locale UI strings
- Gates updated in lockstep: launch.test storage inventory, check-build consent/vendor/proxy assertions, browser consent flows

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Watch the Launch gate**

Run: `gh pr checks --watch`
Expected: `Launch gate / test` PASS. If it fails, read the failing assertion label — every gate this plan touches has a distinct label — fix, commit, push again. (The most likely CI-only issues: `astro check` types for the posthog subpath imports → apply Task 2 Step 5 contingency; vendor chunk basename mismatch → adjust `isPosthogChunk` to match the emitted `/assets/posthog*` filename shown in the build log.)

- [ ] **Step 3: Verify on the Netlify deploy preview** (proxy rules do run on previews):

1. Open the preview URL `/pl/` with devtools → Network filtered to `/ph/`: a `POST …/ph/…` request should return 200/204 (events flowing through the proxy).
2. Application tab: before touching the banner — no `ph_*` in localStorage/sessionStorage/cookies.
3. Accept the banner → `ph_*` entries appear; PostHog project 218919 (EU) shows the session in Activity; a recording appears under Session replay (may lag a minute or two).
4. Click a reservation CTA, a tel: link, and submit nothing — check `reservation_cta_click` / `phone_click` arrive in Activity.
5. Cookie policy page → withdraw → `ph_*` entries removed, decision `denied`.
6. Run PageSpeed on the preview `/pl/` — Performance must stay 100 mobile + desktop.

- [ ] **Step 4: After merge — PostHog project setup** (MCP or app UI, project 218919 on eu.posthog.com):

1. Project settings → Session replay → enable "Record user sessions" (masking defaults on).
2. Activity → verify production events arrive from `https://www.sisiwroclaw.pl`.
3. Create funnel insight: `$pageview` → `reservation_cta_click`; second funnel `$pageview` → `enquiry_submit` → `enquiry_success`.
4. Create a "Conversions" dashboard: the two funnels + trends for `phone_click`/`email_click` + Web analytics overview.
5. Mark the five custom events as verified in Data management.
