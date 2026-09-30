# RESEARCH: how sisiwroclaw.pl is built

Repo `IgnacyJurkowski/sisi-wroclaw`, `main` at `e1feb25` (2026-09-29). Everything below is **Confirmed** from code or a local build unless marked. Production could not be reached from this container (network policy denies `www.sisiwroclaw.pl`), so nothing here was seen on the live site.

## Stack

| Item | Value |
|---|---|
| Framework | Astro 7.0.1, static output (`astro.config.mjs`), `trailingSlash: 'always'` |
| Bundler | Vite with Rolldown, Lightning CSS for CSS transform and minify |
| Language | TypeScript 6 in `.astro`/`.ts`, plain ESM (`.mjs`) for scripts and shared libs |
| Runtime | Node 22.12.0 pinned in `netlify.toml` and CI |
| Hosting | Netlify. Deploy is a build hook fired by GitHub Actions after `npm test` on `main` (`.github/workflows/deploy.yml`) |
| Build | `npm run build` = `astro build && node scripts/generate-headers.mjs` (publish dir `dist`) |
| Gate | `npm test` = unit tests, `astro check`, build, `scripts/check-build.mjs` (496 assertions), `scripts/site-notices-browser.mjs` |
| Runtime deps | `astro`, `posthog-js` only. Dev: `@astrojs/check`, `@axe-core/playwright`, `playwright-core`, `sharp`, `lightningcss`, `google-auth-library` |
| Output | 93 HTML pages: 62 route pages, 31 blog posts, 0 event pages |

## Baseline (Confirmed, this container)

- `npm run test:unit`: 171 tests, 170 pass, 1 fail. The failure is `scripts/audit-browser.test.mjs` test 52 ("accepts only a ready successful streaming media response…"): the headless Chromium 141 here aborts a stream request (`net::ERR_ABORTED`). It is environmental and predates this run. Before linking Chromium to `/usr/bin/google-chrome` (the path hard-coded in five `scripts/*-browser.mjs` files) 16 tests failed.
- `npm run check`: 0 errors, 0 warnings, 6 hints (deprecated `MediaQueryList.addListener` in `src/scripts/menu-motion.ts:83`, `src/scripts/nav.ts:32`, and others).
- `npm run build`: passes, 93 pages, `dist/_headers` generated with 1 permitted CSP hash.
- `npm run test:build`: 496/496 pass; notices browser test passes.
- Build fails when the worktree sits inside another checkout that has a `tsconfig.json` (`TSCONFIG_ERROR: Tsconfig not found`). Container-layout issue, not a repo defect; worktrees for this run live at `/home/user/sisi-*`.

## netlify.toml and redirects

- Bare host `sisiwroclaw.pl` (http and https, root and any path) to `https://www.sisiwroclaw.pl/…`, 301, forced. Root goes straight to `/pl/`.
- `/` to `/pl/`, 301, forced.
- Eight legacy Polish paths (`/wydarzenia`, `/menu`, `/kariera`, `/rezerwacje`, `/kontakt`, `/regulamin`, `/polityka-prywatnosci`, `/polityka-cookies`) to their `/pl/…/` equivalents, 301.
- `/ph/*` proxies to `https://eu.i.posthog.com/:splat` with status 200 (PostHog reverse proxy so the CSP can stay `connect-src 'self'` for it).
- MIME headers for `.mjs`, `.js`, `.framercms`.
- `dist/_headers` is generated per build by `scripts/generate-headers.mjs`: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Cache: `public, max-age=0, must-revalidate` for everything; `immutable` only for `/assets/*` and `/fonts/*`. Images, video and Framer-era assets under `/framerusercontent.com/` are therefore revalidated on every request (Confirmed in the generator: "232 revalidate" of 234 cache-inventory files).
- CSP: `default-src 'self'; script-src 'self' <1 sha256 for the `js` class snippet> https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; connect-src 'self' + Google Analytics hosts; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`.
- No HSTS in the repo. **Assumption**: Netlify adds HSTS on custom domains by default; unverified (production unreachable).

## i18n

- Locales: `pl` (source and fallback), `en`, `de`, `it`, `cs` (`src/i18n/config.ts`). Timezone constant `Europe/Warsaw`.
- One catch-all route `src/pages/[...path].astro` generates every `(locale, route)` from `src/i18n/routes.ts` (`ROUTE_KEYS`, `SLUGS` with translated slugs). Events and blog articles add dynamic paths.
- Dictionaries: `src/i18n/ui/{pl,en,de,it,cs}.ts`; `pl.ts` defines the type, a missing key in another locale is a type error. Legal text in `src/i18n/legal.ts`: pl and en full; de/it/cs fall back to Polish with a "convenience translation" banner (`docs/I18N.md`).
- `Base.astro` emits `<html lang>`, canonical, the full hreflang set and `x-default`, Open Graph locale and alternates, JSON-LD (`entityGraphSchema`: Organization, EventVenue R32, NightClub SiSi, WebSite).
- Blog posts are single-language: they render only under the locale of their `languageCode`, so hreflang on a post is its own locale plus `x-default` (pl).

## How pages get content

- Page bodies in `src/components/pages/*.astro` take a `locale` prop and read strings via `useTranslations(locale)`.
- Brand-invariant facts (phones, emails, address, maps URL, socials, registry data, prices in legal) live in `src/data/site.ts`; the reservation prices and rules are **prose inside the dictionaries** (`reservationsPage.practicalConditions` in `pl.ts:324-330`) and again in `src/i18n/legal.ts`, `llms.txt`, blog posts. There is no single typed source for price, hours and rules (this is the Phase 3 gap).
- Menu: `src/data/bar-menu.ts` (items `{name, desc, vol, price}` as strings, ingredient glossary for 5 locales), `food-menu.ts` (The Cork dishes with localized names, `Diet` badges), `home-menu.ts`, `drink-icons.ts`, `food-icons.ts`.
- Events: `src/data/events.generated.ts` is written by `scripts/sync-events.mjs` from a staff Google Drive folder ("Wydarzenia": banners + description docs) every 30 minutes via `.github/workflows/sync-events.yml`. `GENERATED_EVENTS` is **empty** on `main`; the events hub is `noindex`, out of the sitemap and out of the nav while empty. Env: `EVENTS_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (secret), `GOOGLE_APPLICATION_CREDENTIALS` locally.
- Reservation link: `reservationUrl(content, locale)` in `site.ts:19-36` returns `https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/<pl|en|de|it>?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=<location>`. `cs` deliberately maps to `pl` because the provider's `/cs` route renders English.

## Images, video, fonts

- Images: `public/framerusercontent.com/images/*` (Framer-era originals with pre-generated `-400`/`-700` AVIF and WebP via `scripts/gen-image-variants.mjs`, helper `src/lib/img.ts`), `public/images/menu/`, event banners in `public/events/` (generated), blog heroes `public/blog/<locale>-<slug>-{400,640,800,1080}.webp` (sharp, WebP q65, from the vendor hero URL).
- Default `og:image` is an **absolute Framer CDN URL** (`Base.astro:66`), with a `TODO(ignacy)` to replace it by a self-hosted 1200x630 image. Every page without an explicit `ogImage` shares it.
- Video: `public/video/hero-night-hq-{desktop,mobile}.mp4` (+ webp posters), `relacja-z-otwarcia.mp4` (+ posters), and one mp4 in `public/framerusercontent.com/assets/`. Hero playback logic in `src/scripts/hero-film.ts`.
- Fonts (self-hosted): Cal Sans (display, `/fonts/`, latin and latin-ext), Montserrat (body, base64 data URI inlined in `global.css`, which makes every page's CSS large: `dist/pl/index.html` is 184,715 bytes), plus DM Sans, Open Sans, Krona One under `public/fonts.gstatic.com/`, and Fontshare/Framer woff2 under `public/framerusercontent.com/`. Which of those the pages actually use is measured in the baseline crawl.

## CSS approach

- Hand-written global stylesheet `src/styles/global.css` (615 lines) + `motion.css`, plus per-component scoped `<style>` blocks. Custom properties on `:root`: `--bg #27060f`, `--panel #34101a`, `--panel-2 #3d1320`, `--cream rgb(237,219,194)`, `--gold #fbd295`, text scale in cream alpha steps, `--font-display` Cal Sans, `--nav-height 84px`, `--maxw 1280px`. All stylesheets are inlined (`build.inlineStylesheets: 'always'`).
- Motion: an animated particle backdrop drawn in a Web Worker on a `<canvas>` (`src/components/Particles.astro`, `src/scripts/backdrop/*`, `docs/BACKDROP.md`), scroll reveal (`scroll-animations.ts`), hero film, menu motion.
- No Tailwind, no CSS framework.

## Analytics and consent

- Consent record: `localStorage['sisi-analytics-consent-v2']` = `granted` | `denied` (`src/lib/consent.mjs`). Banner: `CookieBanner.astro` (Accept / Decline), withdraw control on the cookie policy page, `sisi-consent-change` document event.
- **PostHog** (EU, token in `analytics-init.ts:26`, publishable): boots after `load` + idle, all traffic via `/ph`. **Without consent it still runs**: `persistence: 'memory'`, no session recording, autocapture off, anonymous `$pageview` and explicit conversion events (`reservation_cta_click`, `phone_click`, `email_click`, `enquiry_submit`, `enquiry_success`). With consent: `localStorage+cookie` persistence and masked session replay. Documented as a deliberate design in `docs/superpowers/specs/2026-07-24-posthog-analytics-design.md`. Whether cookieless, memory-only measurement needs consent under Polish/EU rules is a legal question: see the decisions list.
- **Google Analytics 4** `G-ZNZDE3DTGP` (`ga-init.ts`): loads `gtag.js` from `googletagmanager.com` only after `granted`; on withdrawal sets `ga-disable-…` and clears `_ga*` cookies.
- Conversion clicks are captured by one delegated listener (`conversion-events.ts`) on `emenago.com` links, `tel:` and `mailto:`.
- Existing IDs to preserve: GA4 `G-ZNZDE3DTGP`, PostHog project token in `analytics-init.ts`, consent key `sisi-analytics-consent-v2`.

## BabyLoveGrowth (BLG): the pattern, written for reuse

**Direction: pull, not push.** BLG never calls the site. A scheduled GitHub Action pulls the vendor's read API, commits generated files, and a Netlify build hook publishes them.

```
BLG REST API ──(cron '23 * * * *' + manual)──► scripts/sync-articles.mjs
   GET  /v1/articles?limit=50&offset=N        (paged until empty / no new ids)
   GET  /v1/articles/{id}                     (content_html, hero_image_url, meta…)
   header X-API-Key: $BABYLOVEGROWTH_API_KEY  (GitHub secret)
   base https://api.babylovegrowth.ai/api/integrations ($BABYLOVEGROWTH_API_BASE overrides)
        │
        ├─ normalize (scripts/articles-sync/normalize.mjs)  → ArticleItem
        ├─ sanitize  (scripts/articles-sync/sanitize.mjs)   → allow-listed HTML, h1→h2, external links rel=noopener
        ├─ claims gate (src/lib/claims.mjs)                 → skip posts with unverified claims
        ├─ hero: download, sharp → public/blog/<locale>-<slug>-{400,640,800,1080}.webp (skip unchanged, prune unused)
        └─ write src/data/articles.generated.ts
   then: npm test (gate) → git commit "chore(blog): sync articles from BabyLoveGrowth"
         → git pull --rebase → npm test again → git push (deploy key EVENT_SYNC_DEPLOY_KEY)
         → curl POST $NETLIFY_DEPLOY_HOOK
```

- **Secrets (names only):** `BABYLOVEGROWTH_API_KEY`, `EVENT_SYNC_DEPLOY_KEY`, `NETLIFY_DEPLOY_HOOK`. Without the API key the sync logs and exits 0.
- **Rate-limit posture:** API is hit once per sync, sequentially (250 ms spacing, 3 retries, exponential backoff on 429/5xx, 20 s timeout, 10 MB image cap, 20 pages max). The site never calls the API at request time.
- **Bad-row policy:** one bad article is skipped and reported; a failed detail fetch keeps the last-good copy; fail (non-zero, no write) if more than half of the fetches fail, if the API lists zero while some are published, or if the valid count drops more than 50%.
- **Pages:** hub `/<locale>/blog/`, article `/<locale>/blog/<slug>/`. An article renders only under its `languageCode` locale. The same slug in several locales cross-links by hreflang automatically. An empty hub is `noindex`, unlinked, out of the sitemap.
- **Head data:** self-canonical, hreflang for the locales that have the slug, `BlogPosting` + `BreadcrumbList` (+ `FAQPage` when the FAQ is not already in the body). The vendor's own JSON-LD is not emitted verbatim (its URLs point at vendor hosting); it is rebuilt from canonical URLs.
- **Where to reuse on a new site:** copy `scripts/articles-sync/` (api, normalize, sanitize, locales and tests), `scripts/sync-articles.mjs`, `.github/workflows/sync-articles.yml`, `src/data/articles.ts`, the two blog page components, and the sitemap and `llms` hooks. Change: `CANONICAL_ORIGIN`, `BARE_HOSTS`, `IMG_WIDTHS`, route slugs, the claims list in `claims.mjs`. Keep: sanitize-before-commit, gate-before-push, last-good fallback.
- **Observations for this run:** the blog is Polish only, all 31 posts date from 2026-09-02 onward, `sitemap.xml` uses each article's own `updatedAt`/`publishedAt` for lastmod, static routes use the build date (see below).

## Sitemap, robots, llms

- `src/pages/sitemap.xml.ts`: every locale of every route with hreflang alternates. `buildLastmod` = `new Date()` at build time, applied to **all static routes** (Confirmed lead: lastmod equals the build date, not a content date). Articles carry their own dates.
- `public/robots.txt`: `Allow: /` for `*` and an explicit allow list of 17 AI and search user agents; `Sitemap:` line. Keep.
- `/llms.txt` and `/llms-full.txt` are generated at build by `src/lib/llms-map.ts` from the route map, the Polish dictionary meta, `CONTACT`, `COMPANY`, `VENUE_FACTS`, events and articles. `llms-full.txt` includes the full text of Polish articles.

## Forms

- B2B and private-event enquiries: Netlify Forms (`data-netlify`, honeypot `bot-field`), client script `src/scripts/event-enquiry-form.ts` (validation, `enquiry_submit`/`enquiry_success` analytics events, campaign attribution in a hidden field).
- CSP has `form-action 'self'`.

## Tests already in the repo

`scripts/*.test.mjs` cover consent, headers, launch (robots by deploy context), structured data, opening hours, workflows, sync scripts, and an audit browser harness (`scripts/audit-browser.mjs`). `scripts/check-build.mjs` asserts the built output. There are no visual-regression, Lighthouse or axe checks in CI today (axe is a devDependency used by `audit-browser.mjs`).

## Not verifiable here

Live headers (HSTS), CDN behaviour, Netlify deploy contexts, real cache behaviour, whether the live site matches `main`, Emenago responses, Google Search Console. All PENDING until the production hosts are allowed for this environment or Ignacy runs the crawl.
