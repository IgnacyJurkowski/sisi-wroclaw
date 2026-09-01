# SiSi Wrocław

Static marketing site for SiSi Music Club & Bar (part of the R32 destination),
built with **Astro 7** and deployed to **Netlify**.

## Requirements

- **Node ≥ 22.12** (Astro 7 requirement).

## Commands

```bash
npm install
npm run dev        # local dev server
npm run build      # static build -> dist/
npm test           # build + verify rendered output (scripts/check-build.mjs)
npm run preview    # preview the production build
```

## Internationalization

Five languages (pl, en, de, it, cs), statically generated with locale-prefixed,
translated routes. See **[docs/I18N.md](docs/I18N.md)** for the architecture and
how to add/update translations or locales.

## Corporate events (B2B)

A multilingual corporate-events landing page with an enquiry form (Netlify
Forms) and a case-study model. See **[docs/B2B.md](docs/B2B.md)**, including the
content checklist for the venue team and how to publish a verified project.

## Blog

SEO articles are written in BabyLoveGrowth and published automatically: an
hourly GitHub Action pulls the API into `src/data/articles.generated.ts` +
`public/blog/`, gates on `npm test`, commits, and triggers a Netlify build. See
**[docs/BLOG.md](docs/BLOG.md)** for the required secrets, the bad-row policy
and how syndicated HTML is sanitised.

## Structure

```
src/
  i18n/            locale config, route map, dictionaries, formatters, legal
  data/            site facts (contact, events, venue facts), case studies, blog articles
  components/      shared UI, home sections, b2b sections, pages/ (page bodies)
  pages/           [...path].astro (catch-all), index (root redirect), 404, sitemap
  layouts/Base.astro   head/meta/SEO/hreflang/JSON-LD + chrome
scripts/check-build.mjs   post-build assertions (npm test)
scripts/sync-events.mjs   Drive -> events.generated.ts (scheduled workflow)
scripts/sync-articles.mjs BabyLoveGrowth -> articles.generated.ts (scheduled workflow)
```

## Deployment notes

- Deploys to `sisi-wroclaw.netlify.app` via GitHub Actions → Netlify build hook.
- `netlify.toml` 301-redirects `/` → `/pl/` and all legacy Polish URLs to their
  localized equivalents.
- Legal copy (and its de/it/cs translations) needs professional legal review
  before being relied upon — see docs/I18N.md.
