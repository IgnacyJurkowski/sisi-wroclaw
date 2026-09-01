# Blog (BabyLoveGrowth integration)

SEO articles are written in [BabyLoveGrowth](https://babylovegrowth.ai) and
published to sisiwroclaw.pl automatically. Nobody touches git, and the site
stays a static Astro build.

```
BabyLoveGrowth API  ──(hourly GitHub Action)──▶  src/data/articles.generated.ts
                                                 public/blog/*.webp
                                                        │
                                                 npm test (gate)
                                                        │
                                            commit ─▶ Netlify build hook
```

## Why the API integration and not a CMS connector

BabyLoveGrowth offers per-platform connectors (WordPress, Shopify, Webflow,
Ghost, Framer…), a hosted blog on a subdomain, a webhook, and a plain read API.
This site is a static Astro build on Netlify, so none of the CMS connectors
apply. The API was chosen over hosted blog hosting because the articles then
live on `www.sisiwroclaw.pl/<locale>/blog/…` — the same origin as the rest of
the site, so their authority and internal links count towards the main domain
instead of a subdomain.

## Setup (one-time)

Three GitHub repository secrets drive the workflow:

| Secret | Purpose |
| --- | --- |
| `BABYLOVEGROWTH_API_KEY` | Integration key, sent as the `X-API-Key` header. |
| `EVENT_SYNC_DEPLOY_KEY` | Deploy key used to push the generated commit (shared with the events sync). |
| `NETLIFY_DEPLOY_HOOK` | Build hook triggered after a successful push. |

The key is never hardcoded and never reaches client-side code: it is read from
the environment inside the sync step only, and the sync runs in CI.

Until `BABYLOVEGROWTH_API_KEY` exists, the sync no-ops cleanly (it logs and
exits 0), exactly like the events sync without Google credentials.

## How the sync works

`.github/workflows/sync-articles.yml` runs hourly (`:23`) and on demand
("Run workflow"). Each run:

1. `GET /v1/articles?limit=50&offset=…` until a short page comes back, then
   `GET /v1/articles/{id}` per article (sequential, spaced, retried with
   backoff on 429/5xx). The API is rate limited, so it is called once per sync,
   never per page view.
2. Maps each article onto `ArticleItem` (`scripts/articles-sync/normalize.mjs`),
   sanitising `content_html` and rewriting our own links to the canonical
   `www` origin.
3. Downloads `hero_image_url` and writes `public/blog/<locale>-<slug>-{640,1280}.webp`
   with sharp. An unchanged hero is not re-encoded; images no article uses any
   more are pruned.
4. Writes `src/data/articles.generated.ts`, runs the full `npm test` gate, then
   commits, rebases onto `main`, re-tests and pushes, and finally pokes the
   Netlify build hook.

### Bad-row policy

One bad article never blocks the rest, and a bad API day never unpublishes a
live blog:

| Situation | Result |
| --- | --- |
| Article fails validation or sanitising | skipped + reported, the rest publish |
| `languageCode` the site does not render | skipped + reported |
| Article carries an unverified claim (see `src/lib/claims.mjs`) | skipped + reported |
| Detail fetch fails for an already-published article | last-good copy kept |
| More than half the fetches fail | **fail**, last-good file untouched |
| API lists zero articles while some are published | **fail** |
| Valid count drops by more than 50% | **fail** |

A failure exits non-zero before anything is written, so CI stops and the
committed file stays as it was.

## What lands on the site

* Hub: `/<locale>/blog/` — one per locale, listing that locale's articles.
* Article: `/<locale>/blog/<slug>/`.
* Footer "Pages" column links the hub only for locales that have an article;
  the sitemap follows the same rule. An empty hub is `noindex` and unlinked —
  the same treatment as the empty events calendar.
* `<head>` carries a self-canonical, hreflang alternates (only the locales that
  publish the same slug), `BlogPosting`, `BreadcrumbList`, and `FAQPage` when
  the article has FAQ entries that are not already answered in its body.

Articles are single-language: an article is rendered under the locale matching
its `languageCode` and nowhere else, so the same text is never duplicated
across five locale paths. Generate a translated set in BabyLoveGrowth with the
same slug and the pages cross-link via hreflang automatically.

The vendor's own `jsonLd` is not emitted verbatim — its URLs point at their
hosting. The article node is rebuilt from our canonical URLs and the site's
entity graph (`src/data/articles.ts`); the vendor `keywords` and `faqJsonLd`
are carried over.

## Security of syndicated HTML

`scripts/articles-sync/sanitize.mjs` reduces `content_html` to an allow-listed,
re-balanced subset before it is ever committed:

* `<script>`, `<style>`, `<iframe>`, `<form>`, `<svg>` and friends are dropped
  with their content; unknown wrappers are unwrapped, keeping their text.
* Attributes are allow-listed per tag — no `on*` handlers, no inline styles.
* `javascript:`, `data:` and protocol-relative URLs are dropped; images must be
  `https:`; external links get `rel="noopener"`.
* `h1` is demoted to `h2` (the page renders its own `h1`), and an opening
  heading that just repeats the title is removed.
* Output is re-balanced, because the body is spliced in with `set:html`.

The sync refuses to publish an article whose sanitised body still trips
`residualRisk()`. Two build-time gates back this up: the CSP generator throws on
any unexpected inline script in the built HTML, and `scripts/check-build.mjs`
asserts each rendered article body contains no `<script>`, `<iframe>` or
`<form>`.

## Running it locally

```bash
BABYLOVEGROWTH_API_KEY=<key> node scripts/sync-articles.mjs
npm test        # the same gate CI runs
```

`BABYLOVEGROWTH_API_BASE` overrides the base URL (useful against a local mock).
Never commit the key.

## Adding a locale

Nothing here is hardcoded per language: the sync reads `LOCALES` out of
`src/i18n/config.ts`, so a new locale starts accepting articles as soon as it
exists there (plus the `blog` slug in `src/i18n/routes.ts` and the `blogPage`
copy in `src/i18n/ui/*`). See [I18N.md](I18N.md).
