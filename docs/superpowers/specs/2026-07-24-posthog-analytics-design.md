# PostHog analytics & session recording — design

- **Date:** 2026-07-24
- **Status:** Approved (owner sign-off in session)
- **Scope:** Wire PostHog (EU cloud, project 231773 "SiSi Wrocław" — dedicated project, owner decision 2026-07-24) into the site for session recording and conversion tracking, without weakening the launch-hardened CSP, storage-disclosure gates, or PageSpeed budget.

## Goal

Record visitor sessions and measure conversions across www.sisiwroclaw.pl. Conversions (owner decision):

1. **Reservation CTA clicks** — any click on an emenago booking link (`reservationUrl(...)`).
2. **Enquiry form submissions** — B2B and private-events Netlify forms (submit attempt + confirmed success).
3. **Contact clicks** — any `tel:` / `mailto:` link.

Event-engagement tracking (event detail views, ticket links) is explicitly out of scope for v1.

## Verified constraints this design must respect

- **CSP is hard-locked** (`scripts/generate-headers.mjs` + pinned `expectedCsp` in `scripts/check-build.mjs`): `script-src 'self'` + exactly one hashed inline bootstrap; `connect-src 'self'`. The header generator throws on any other inline script. No mechanism exists for third-party hosts.
- **Storage is a disclosed inventory**: `launch.test.mjs` bans `\bsessionStorage\b` anywhere under `src/` and pins the disclosed localStorage keys; `check-build.mjs` scans built executable text for the disclosed tokens and bans `'accepted'`/`'rejected'` string literals.
- **Cookie/privacy policy currently states no analytics storage** (`src/i18n/legal.ts`, 5 locales). The banner (`CookieBanner.astro`) is dismiss-only (`sisi-cookie-notice` = `'dismissed'`), coordinated with the summer-hours popup.
- **`src/lib/analytics.ts` is the designated integration point**: typed `track()` no-op with a documented no-PII contract.
- **Perf budget**: PageSpeed 100/100 both form factors; all JS is deferred same-origin module assets.
- **Local dev cannot run `npm test`** (Node 20 vs required ≥22); verification happens in the PR "Launch gate / test" and on the Netlify preview.

## Owner decisions

1. **Conversions:** reservation CTA clicks, enquiry form submits, tel/email clicks (no event-engagement tracking).
2. **Consent model — hybrid:** cookieless, memory-only anonymous events for all visitors; session recording + persistent storage only after explicit Accept. Banner upgraded to Accept/Decline. Withdrawal control included.
3. **Integration:** npm-bundled `posthog-js` + Netlify reverse proxy (no snippet, no third-party hosts in CSP).
4. **Autocapture:** left on (PostHog default); one-line toggle if it proves noisy.

## Design

### 1. Loading & transport

- Add dependency `posthog-js`. New `src/scripts/analytics-init.ts`, imported from `Base.astro` the same way as `nav.ts` (`<script>import '../scripts/analytics-init.ts';</script>`), so Astro emits it as a deferred same-origin `/assets/*` module. No inline scripts; the permitted-bootstrap hash mechanism is untouched.
- `posthog.init(TOKEN, …)` with:
  - `api_host: '/ph'` — reverse-proxied relative path, so `connect-src 'self'` still holds; `ui_host: 'https://eu.posthog.com'` supplies the absolute PostHog UI origin (documented requirement when `api_host` is relative).
  - `persistence: 'memory'`, `disable_session_recording: true` at boot (pre-consent posture).
  - Base SDK imported from `posthog-js/dist/module.no-external` — this build cannot load remote code at all (PostHog's documented CSP-strict path; there is no `disable_external_dependency_loading` config flag).
  - `person_profiles: 'identified_only'` — all visitors stay anonymous (no logins exist).
  - `session_recording: { maskAllInputs: true }` (explicit, matches PostHog default).
- `TOKEN` is the public project API key `phc_xGAJevJfPpYyrixXMnpJb43nDCz2fVHpnJBbaoDyNgeu` (EU project 231773 "SiSi Wrocław"), hardcoded as a constant with a comment noting it is publishable, not secret.
- **Proxy rule** in `netlify.toml`, appended after the existing `[[redirects]]` blocks (their bare-root ordering is pinned by check-build) and before `[[headers]]`:

  ```toml
  [[redirects]]
    from = "/ph/*"
    to = "https://eu.i.posthog.com/:splat"
    status = 200
    force = true
  ```

  One rule covers ingestion, flags/remote config, and replay ingestion. No `eu-assets` static rules are needed because the no-external build never requests remote scripts.
- **Session-replay recorder** (`posthog-js/dist/posthog-recorder`) is a lazy `import()` — Vite code-splits it into its own same-origin chunk, fetched only when consent is granted (and loaded before `startSessionRecording()` is called). Day-one payload stays small; everything executable remains build-reviewed and content-addressed.
- The pinned CSP string in `generate-headers.mjs`/`check-build.mjs` remains **byte-identical**.

### 2. Consent

- New pure module `src/lib/consent.mjs` (repo convention: pure `.mjs` + `node:test` coverage): key constant, value constants, `readConsent()`/`writeConsent()` helpers with try/catch storage guards.
  - Key: `sisi-analytics-consent` (localStorage). Values: `'granted'` | `'denied'` — deliberately not the gate-banned `accepted`/`rejected` literals.
- **Pre-decision:** PostHog runs memory-only + no recording (anonymous pageviews and conversion events still captured — this is the hybrid model's "anonymous always" half; no browser storage is used by analytics).
- **Banner** (`CookieBanner.astro`) becomes a two-button consent dialog: Accept and Decline. It keeps: `role="dialog"`, reveal-after-summer-popup coordination, try/catch guards, and page-local fallback when storage is denied. Legacy keys `sisi-cookie-notice` and `sisi-cookie-consent` are removed on load (cleanup); visitors who dismissed the old notice see the consent banner once, because consent was never asked.
- **Accept:** write `'granted'`; `posthog.set_config({ persistence: 'localStorage+cookie' })`; lazy-load recorder chunk; `startSessionRecording()`.
- **Decline / ignore:** write `'denied'` (decline only); analytics stays memory-only anonymous; recording never starts.
- **Returning visitor with `'granted'`:** analytics-init reads consent at boot and starts in persistent mode with recording on (recorder chunk loaded before start).
- **Withdrawal:** a small control on the existing cookie-policy page (`routeKey === 'cookies'`, all 5 locales) that stores `'denied'` (so the banner doesn't re-prompt), calls `posthog.stopSessionRecording()`, reverts persistence to memory, and clears PostHog's stored entries via `posthog.reset()`. No new pages (page-count gate unchanged: 57 + 5×events).

### 3. Events

`src/lib/analytics.ts` goes live. `track()` wraps `posthog.capture`, keeps the typed payload and the no-PII contract (no names, emails, phones, company names, message bodies), and must be safe to call at any time: never throws, drops events if PostHog is unavailable or not yet initialized.

The unused `b2b_*` union members are replaced (nothing calls them today):

```ts
export type AnalyticsEvent =
  | 'reservation_cta_click'
  | 'phone_click'
  | 'email_click'
  | 'enquiry_submit'
  | 'enquiry_success';
```

(`locale_change` is dropped from the union — v1 ships no dead enum members; it returns when something wires it.)

Wiring:

- **Delegated click listener** in `analytics-init.ts` — one capture-phase `document` listener, `closest('a')`:
  - `href` contains `emenago.com` → `reservation_cta_click`, with `cta_location` parsed from the link's existing `utm_content` param.
  - `href` starts with `tel:` → `phone_click`; `mailto:` → `email_click`; context props: `page` (pathname), nearest section `id` as `cta_location`.
  - Zero markup changes across components.
- **Forms:** in `src/scripts/event-enquiry-form.ts`, `track({ event: 'enquiry_submit', form })` after validation passes, and `track({ event: 'enquiry_success', form })` in the existing fetch success branch. `form` comes from the hidden `form-name` field (non-PII).
- **Pageviews** (`$pageview`) on (default) — funnel entry step. **Autocapture** on (default).

### 4. Gates, legal text, testing

Gate philosophy is "disclosure and code change in lockstep"; both sides move together in one PR.

- **`scripts/launch.test.mjs`:**
  - Storage-inventory assertions updated: `sisi-analytics-consent` + `'granted'`/`'denied'` disclosed; legal text must enumerate PostHog's post-consent entries.
  - The `\bsessionStorage\b` src-wide ban is rescoped to exclude `src/i18n/legal.ts` only (the disclosure text must name it), with a companion assertion that legal.ts does disclose PostHog's sessionStorage entries. First-party runtime code under `src/` remains banned from using sessionStorage.
- **`scripts/check-build.mjs`:**
  - Isolate `posthog-js` into a named vendor chunk (Vite `manualChunks` in `astro.config.mjs`) and exclude that chunk from the notice-runtime storage-token scan; the scan (including the `accepted|rejected` ban) still covers all first-party executable text.
  - New assertions: `netlify.toml` contains the `/ph` proxy rule; built first-party JS contains `sisi-analytics-consent`, `granted`, `denied`; pinned CSP assertion unchanged and still passing byte-identically.
- **`src/i18n/legal.ts` (pl + en documents — de/it/cs legal pages intentionally render the English text with the repo's existing fallback banner, so no new locale docs):**
  - Cookie policy: new analytics section — processor PostHog (EU cloud, EU-hosted), what runs without consent (anonymous, storage-free statistics), what Accept enables (session recording + persistent entries), the concrete storage entries (`sisi-analytics-consent`; post-consent `ph_*` localStorage + cookie and PostHog sessionStorage session/window entries), retention periods (cookie lifetime and recording retention, pinned to current PostHog-documented values during implementation), and how to withdraw (cookie-policy page control).
  - Privacy policy: analytics + session-recording purposes, legal bases (consent for storage/recording; legitimate interest for storage-free anonymous statistics), link to PostHog's privacy policy.
  - Banner copy `t.cookie.*` in all 5 locales: consent question + Accept + Decline labels.
- **Tests:**
  - `node:test` unit coverage for `consent.mjs` (and the `cta_location` derivation if extracted pure).
  - `scripts/site-notices-browser.mjs` extended: accept path (key written `granted`, banner hidden), decline path, withdraw control on the cookie page, and unchanged summer-popup coordination.
  - Full verification via PR Launch gate + Netlify preview (local Node is 20; `npm test` requires ≥22).
- **PostHog project setup** (post-merge, via connected MCP or UI): enable session replay in project settings, mark the three conversion events as key actions, create a starter funnel (`$pageview` → `reservation_cta_click` / `enquiry_success`) and a web-analytics dashboard.

## Error handling

- `posthog.init` and every `track()` call are guarded: analytics failure must never affect page behavior, forms, or navigation.
- Storage access always wrapped in try/catch (existing repo rule, asserted by check-build).
- If the proxy is down, posthog-js buffers/retries internally; no user-visible effect.

## Out of scope (v1)

- Event-engagement events (detail views, ticket clicks) — owner deselected.
- `locale_change` tracking (no call site in v1; the enum member returns with its wiring).
- User identification (`posthog.identify`), feature flags, experiments, surveys.
- Server-side or proxy-side tracking; heatmap tooling configuration.

## Success criteria

1. Production CSP string is byte-identical to today's pinned value.
2. Anonymous `$pageview` + the three conversion event types arrive in PostHog project 231773 from production traffic, with zero analytics browser storage before consent.
3. Session recordings appear only for visitors who clicked Accept; inputs masked.
4. Withdraw control clears consent and stops recording.
5. "Launch gate / test" passes on the PR; PageSpeed stays 100/100 on the Netlify preview.
