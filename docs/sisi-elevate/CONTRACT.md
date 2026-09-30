# Contract suite (Phase 1)

A test tool that protects the live site while other work changes it. It checks a built `dist/` against snapshots taken from main `e1feb25`, and it renders BabyLoveGrowth-shaped fixture articles through the real templates. One command, five contracts, exit code 1 on any failure.

Labels follow `WORKING-RULES.md`: **Confirmed** (seen in code or output), **Rec**, **Assumption**, **Inference**. "Local build" findings have not been seen on production.

## Run it

```
npm run build          # any build
npm run contract       # checks ./dist

npm run contract:prod  # builds with CONTEXT=production URL=https://www.sisiwroclaw.pl first, then checks
```

- **Confirmed**: `npm run contract -- --offline` on the untouched branch took 13 s; `npm run contract:prod -- --offline` (build included) took 29 s. Both exit 0. The brief's limit is 3 minutes.
- **Confirmed**: the tool builds nothing itself unless `--build` is given. It serves `dist/` with `createDistServer` from `scripts/serve-dist.mjs` on a random port of `127.0.0.1`.
- **Rec**: use `contract:prod` for reviews and CI. A plain `npm run build` writes `noindex, nofollow` on every page (`src/lib/launch.mjs:14-21`), so robots and indexability checks are UNVERIFIED on such a dist (see Limits).

| Flag | Effect |
| --- | --- |
| `--dist <dir>` | Check another dist (default `./dist`). |
| `--only <list>` | Comma list of `url`, `seo`, `links`, `blog`, `facts`. |
| `--update-snapshot` | Rewrite the snapshots under `contract/` from this dist, then check. |
| `--source <text>` | Label written into snapshots (default `local-build <branch>@<sha>`). |
| `--offline` | No request leaves the machine: skips the external og:image HEAD and the Emenago HEAD. |
| `--build` | Run `npm run build` with the production environment first. |
| `--no-browser` | Skip the 375 px check in the blog contract (reported UNVERIFIED). |
| `--keep-scratch` | Keep the blog contract's scratch build folder for inspection. |
| `--refresh-from-production` | Rewrite `contract/urls.json` from https://www.sisiwroclaw.pl (GET on `sitemap.xml`, HEAD on the rest). Unused here: production is unreachable in this container. |
| `--write-inventory` | Write `contract/facts-inventory.json` (also done by `--update-snapshot`). |
| `--max-failures <n>`, `--json <file>` | How many failures to print per contract; dump raw results. |

Output: a summary line per contract (`pass`, `fail`, `waived`, `unverified`, `notes`), then per contract the first N failures as `[url field] message`, then the known issues that were waived, then `RESULT: PASS|FAIL`.

## What each contract guards

### 1. url (`scripts/contract/contracts/url.mjs`)

- Every sitemap URL in `contract/urls.json` still answers with the same status, or it 301s to the new home declared in `contract/moves.json` (starts empty). A declared move is only accepted if `netlify.toml` has a 301 rule to that exact target and the target is in the sitemap.
- Sitemap and dist agree: a sitemap URL missing from dist fails; a dist page that is indexable but not in the sitemap fails. In a production-context dist "indexable" means no `noindex` in the robots meta. In any other dist the tool falls back to the snapshot's `nonIndexable` list.
- `contract/redirects.json` pins every `[[redirects]]` rule of `netlify.toml`. Removing or retargeting one fails, and so does changing its status or `force`. A new rule is only reported. A retarget passes if `moves.json` declares the move.
- Each rule must resolve to a page in dist, or be a documented external/proxy rule (`DOCUMENTED_EXTERNAL_TARGETS` in `lib/constants.mjs`: the PostHog proxy). No chains. A non-forced rule whose source exists in dist fails, because Netlify would serve the file instead of redirecting.
- Also pinned: `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml` answer 200, and an unknown URL answers 404.

### 2. seo (`contracts/seo.mjs`, `lib/seo.mjs`)

Per URL the snapshot `contract/seo.json` holds: title, description, canonical, robots, `<html lang>`, the full hreflang set with `x-default`, all `og:*` and `article:*` and `twitter:*` tags, JSON-LD types and `@id` set (root and `@graph` nodes), and the sitemap alternates. The diff is "same or better". **Better is exactly this and nothing else**:

- a field that was absent is now present;
- a hreflang alternate, og/twitter tag, JSON-LD type or `@id`, or sitemap alternate was added;
- a meta description changed to text whose length is strictly closer to 70-160 characters (`descDistance` in `lib/seo.mjs`).

Everything else that differs fails: removal, any other change, a re-pointed hreflang, a lost `x-default`. Improvements are printed as `IMPROVED` notes so they can be locked in with `--update-snapshot`. Article and event pages keep vendor- or Drive-authored text out of the equality check (title, descriptions, og and twitter text, image, publish dates): presence is required, value is not. Without that rule every hourly article sync would fail the suite.

Absolute rules on every sitemap URL (no snapshot needed): title and description present, self-canonical, `og:url` equals canonical, `lang` equals the locale segment, JSON-LD parses, `twitter:card`, `twitter:image` equals `og:image`, hreflang has a self reference, `x-default` points at `pl` when `pl` is in the set and is absent otherwise, hreflang is reciprocal, sitemap alternates equal the page's hreflang. In a production-context dist every sitemap URL must carry `index, follow`.

Site files: `robots.txt` exists, every user agent allowed today (18 in `contract/seo.json`: `*`, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, Bingbot, DuckAssistBot, Amazonbot, meta-externalagent, CCBot) is still allowed and none is newly blocked, the `Sitemap:` line stays. `llms.txt` and `llms-full.txt` exist and keep their first line.

og:image: a `www.sisiwroclaw.pl` URL must map to a file in dist. The one allow-listed external host is `framerusercontent.com` (the default share image, `src/layouts/Base.astro:64`); offline it is reported UNVERIFIED, online it gets a HEAD. Any other host fails.

### 3. links (`contracts/links.mjs`)

- Every `a[href]` and `link[href]`, plus `img[src]` and `script[src]`, that points at the site resolves in dist, anchors included (`#id` must be an `id` or `a[name]` on the target page). Same-document anchors check the page itself. `llms.txt` and `llms-full.txt` links are checked too. References to `fonts.googleapis.com` or `fonts.gstatic.com` fail (working rule: fonts are self-hosted).
- Every `emenago.com` reservation CTA: `https`, the provider path from `src/data/site.ts`, the locale segment for the page's locale (`cs` maps to `pl` on purpose, `src/data/site.ts:22`), and `utm_source=website`, `utm_medium=cta`, `utm_campaign=reservation` plus a non-empty `utm_content`. The `ReserveAction` URL in JSON-LD follows the same locale rule. `contract/cta.json` pins the base URL, the locale map and each page's `utm_content` list; a page may gain CTAs but not lose one.
- Each CTA is printed with page, position, region and destination (10 today, on the menu and reservations page of each locale).
- Without `--offline`, each distinct destination gets a **HEAD**. There is no GET and no POST anywhere in the tool (`lib/net.mjs`, unit-tested against a local server). 404 and 5xx fail; 401, 403, 405, 429 and network errors are UNVERIFIED.

### 4. blog (`contracts/blog.mjs`, `blog-fixtures.mjs`)

See the fixture pattern below. Asserts, per fixture page: it renders (HTTP 200, one `h1` that equals the title), self-canonical, correct `lang`, robots `index, follow`, hreflang set (only the locales that publish the slug, `x-default` only when `pl` is one of them), `BlogPosting` and `BreadcrumbList`, `FAQPage` if and only if the payload has surviving FAQ entries, rendered FAQ item count, `og:type=article` with a publish time, hero and `og:image` resolve (or fall back when the payload has no hero), the vendor hero is not repeated in the body, no `script`, `iframe`, `form`, `object`, `embed`, `style`, `svg`, `video`, `audio`, `input`, `button`, `link`, `meta`, `canvas` or `h1` in the body, no `on*` attribute, no inline style, no `javascript:` href, none of the marker strings from stripped elements anywhere in the built HTML, the URL in `sitemap.xml` with correct alternates, a link from the blog hub, an indexable hub with `Blog` JSON-LD, Polish fixtures in `llms-full.txt`. The three rejected payloads (unverified `21+` claim, unsupported language, stub) must stay unpublished. At 375 px in Chromium with every non-local request blocked: no horizontal scroll and no content clipped by `overflow: hidden` on the page.

### 5. facts (skeleton; `contracts/facts.mjs`, `lib/facts.mjs`, `contract/facts.json`)

- Scans every built page (visible text, meta, JSON-LD, `tel:` and `mailto:` links), `llms.txt` and `llms-full.txt` for currency amounts, clock times and ranges, phones, emails, street addresses and postal codes. It writes `contract/facts-inventory.json`: each distinct value with the pages that carry it, the blog paragraphs that state a price, hour or rule about SiSi (`blogFlags`), and the contradictions.
- Fails only on a contradiction of `contract/facts.json`, the single file Phase 3 replaces: a phone or email not on the list, a `Rzeźnicza` number other than 32-33 (or 32 alone), a time range other than 22:00-04:00 / 22:00-23:00 / 22:00-23:30, a time outside the allowed set in a sentence about opening hours, an amount other than 100 zł and 40 zł in a sentence about reservations or entry. Blog posts and `llms-full.txt` are judged only on sentences that name SiSi, R32, The Cork or Rzeźnicza. Event pages are skipped (their prices come from Drive).
- Also fails if `facts.json` drifts from `src/data/site.ts` (`CONTACT.phone`, `eventsPhone`, `email`, `eventsEmail`, `address`, `hours`) or if `src/i18n/ui/pl.ts` stops containing the allowed amounts.

## Snapshots and how to update them

Files under `contract/`: `urls.json`, `redirects.json`, `seo.json`, `cta.json` (all snapshots), `moves.json` (declared URL moves), `waivers.json` (known defects), `facts.json` (allow-list), `facts-inventory.json` (output).

- **Confirmed**: the initial snapshots come from a `CONTEXT=production` build of the current code, whose 92 HTML files differ from the frozen baseline `/home/user/sisi-baseline/dist` only in the robots meta tag (checked file by file, sitemap identical apart from `lastmod`). Their `source` is `local-build main e1feb25`. The reason for the production-context build: the frozen baseline says `noindex, nofollow` on every page, so it cannot record which pages are meant to be indexable.
- To record an intentional change: run `npm run build`-equivalent with production context, run `node scripts/contract/run.mjs --build --update-snapshot --offline --source "local-build <branch>@<sha>"`, read `git diff contract/`, and commit the diff on its own. Reviewers see exactly which title, hreflang or URL changed.
- To move a URL on purpose: add `{ "from": "/old/", "to": "/new/", "note": "why" }` to `contract/moves.json`, add the 301 to `netlify.toml`, and update the snapshot once the move ships. Remove the entry when the redirect goes.
- **Rec**: never edit a snapshot by hand and never add a waiver to make a new regression pass.
- **Rec**: when production is reachable, run `node scripts/contract/run.mjs --refresh-from-production` once and review the diff. It proves the local-build statuses against the live site. Until then `urls.json` reports `UNVERIFIED` on every run, by design.

## Waivers: known defects found while taking the baseline

`contract/waivers.json` keeps the suite green for exactly these classes, prints them on every run, and reports a waiver that matches nothing as stale. Each one is a real defect (Confirmed, local build).

| Id | Evidence | Fix belongs in |
| --- | --- | --- |
| `terms-saturday-entry-30` | The five terms pages say Saturday entry is 30 zł (`src/i18n/legal.ts:42`); the reservation copy and `llms.txt` say 40 zł (`src/i18n/ui/pl.ts:327`). | Phase 3 facts source |
| `events-hub-indexable-not-in-sitemap` | While `EVENTS` is empty, `src/pages/sitemap.xml.ts:19-21` drops the events hub but `EventsPage` emits `index, follow` (BlogPage sets `noindex` for an empty hub, `src/components/pages/BlogPage.astro:23`). Five hubs are indexable and unlisted; `/wydarzenia` 301s to one. | noindex the empty hub, or list it |
| `blog-toc-dead-anchors` | 305 dead in-page anchors on all 31 published articles: bodies carry a table of contents, `scripts/articles-sync/sanitize.mjs:34` (`ALLOWED`) gives headings no `id`. | sanitiser or renderer (heading ids) |
| `blog-unbroken-string-overflow` | A title, heading, paragraph or link text with one unbroken string over ~335 px scrolls the page sideways at 375 px (scratch build: scrollWidth 2956). No published page does it (82 of 82 clean). | article template CSS |

Also found, not gating (printed as notes):

- **Confirmed**: the reservation page says pick-up 22:00-23:00 (`src/i18n/ui/pl.ts:328`), the terms say 22:00-23:30 (`src/i18n/legal.ts:44`). Both are on the allow-list until Phase 3 picks one (`facts.json`, `knownConflicts`).
- **Confirmed**: the sanitiser drops the tags `object`, `video`, `form`, `button` but keeps their inner text as plain text (`scripts/articles-sync/sanitize.mjs:167-172`); `docs/BLOG.md` says these are dropped with their content. No markup survives.
- **Confirmed**: body images without `alt` render without `alt`.
- **Confirmed**: 131 links inside articles omit the trailing slash (`/pl/menu`). **Assumption**: Netlify redirects them to the slashed URL; not verifiable here.
- **Confirmed**: the seven blog posts that state a price, hour or rule about SiSi are listed in `contract/facts-inventory.json` (`blogFlags`): `afterparty-co-to`, `aperol-vs-campari`, `dekantacja-wina`, `etykieta-na-parkiecie`, `jazz-na-zywo-wroclaw`, `nocne-menu-co-to`, `urodziny-w-klubie-pomysly`. Three of them (`afterparty-co-to`, `dekantacja-wina`, `nocne-menu-co-to`) quote 100 zł and 40 zł, which match the reservation copy, and none quote a wrong amount today.

## The BLG fixture pattern

**Confirmed**: the site renders articles from `src/data/articles.generated.ts` at build time, and `src/data/articles.ts` reads only that file. There is no environment switch. The contract therefore adds **no seam to the repo**. It copies `src/`, `public/`, `scripts/` and the config files into a temp folder, links `node_modules`, swaps in a generated file, and runs `astro build` there with the production environment. Nothing in `src/` or in the sync knows the contract exists; the vendor payload and the way the site receives it are untouched. **Inference**: this is safe because the scratch folder is removed after the run and the repo checkout is only read.

Steps in `blog.mjs`:

1. `blog-fixtures.mjs` holds raw payloads in the shape the sync reads (list summary merged with the detail response): `snake_case` and `camelCase` keys, `content_html` with the hero repeated as the first paragraph, `meta_description`, `hero_image_url`, `jsonLd` and `faqJsonLd` as JSON strings, `languageCode` (`en-GB`, `pl-PL`), and extra vendor fields to ignore.
2. Each goes through the real `normalizeArticle` from `scripts/articles-sync/normalize.mjs`, with the sync's own locales and origin. A fixture the normaliser rejects unexpectedly is a failure; the three rejected payloads must stay rejected.
3. Hero images are made with `sharp` and named like the sync does (`/blog/<locale>-<slug>-<width>.webp`, four widths).
4. The existing articles and the fixtures are written to the scratch `articles.generated.ts`; the scratch site is built and `scripts/generate-headers.mjs` runs on it, so the CSP gate applies.
5. The scratch `dist/` is loaded with the same parser as the other contracts and served locally; Chromium visits each fixture and both blog hubs at 375 px.

Fixtures today: `contract-fixture-standard` (pl, hero, two FAQ entries, keywords, internal and external links, a table of contents), the same slug in `en` (translated set, so the `en` hub becomes indexable), `contract-fixture-stress` (table, nested lists, blockquotes, iframe/embed/object/video/form/script/style/svg, `on*` handlers and `javascript:` links, `h1` in the body, images without `alt`, a wide image, a long heading with spaces, Polish, Czech, German, Japanese text and emoji), `contract-fixture-longtokens` (unbroken strings in title, heading, paragraph, link text, table cell and code), `contract-fixture-no-hero` (no hero image, one FAQ entry), `contract-fixture-camel-case` (`camelCase` keys, a messy slug, a date-only `published_at`).

To add a case: append a payload to `ACCEPTED` (with an `expect` block) or `REJECTED` in `scripts/contract/blog-fixtures.mjs`, and add its expectation to `assertFixtures` if it needs one.

## CI

**Rec, done**: a new step after `npm test` in `.github/workflows/ci.yml`: `npm run contract:prod -- --offline`. **Inference** that it is safe:

- it changes no existing step (`scripts/workflows.test.mjs` still passes, it looks for `run: npm test`);
- `--offline` sends nothing out of the runner; Chromium is `/usr/bin/google-chrome` on `ubuntu-latest`, which `scripts/site-notices-browser.mjs` already relies on;
- it adds about 30 s;
- new or edited articles from the hourly sync do not fail it: new URLs and pages are reported as notes, article text is not compared, and dead TOC anchors are waived. A removed article, a wrong SiSi price in a new post, or a lost hreflang does fail it, which is the intent.

**Assumption**: the CI run has not happened; the step was tested only by running the same command locally.

## Limits and UNVERIFIED items

- **Confirmed**: production is unreachable in this container. Statuses in `urls.json` and every `seo.json` value describe a local build. The `UNVERIFIED` line about `urls.json` appears on every run until `--refresh-from-production` has been run against the live site.
- **Confirmed**: the Emenago HEAD and the external og:image HEAD were never sent from this container (`--offline` on every run). The 10 CTAs and the 51 pages with the Framer default share image are the UNVERIFIED items. An early run without `--offline` sent one HEAD to `framerusercontent.com` and got HTTP 403 from the agent proxy; the tool now treats 403 as unverified, not as a failure.
- **Confirmed**: a non-production `dist/` cannot be checked for indexability or robots values; those checks say UNVERIFIED there.
- **Inference**: description length is advice, not a gate: no page is outside 70-160 characters today, so the suite would report a NOTE if one appears.
- **Assumption**: the facts checker finds prices by pattern (`zł`, `PLN`, `€`, `Kč`), times by `HH:MM` and a few worded forms, phones with `+CC` or the `123 456 789` grouping. A price written in words, or an hour like "od dziesiątej", is not seen. It is an inventory for the audit, not proof that no other claim exists.
- **Confirmed**: the stripped-tag rule in the blog contract covers the tags listed above; an attribute the sanitiser allows (`cite`, `title`, `colspan`) is not inspected.
- **Confirmed**: the frozen baseline folder contains a stray `hv.err` that is not in a real build. It does not affect any check.
- **Inference**: a future page kind with its own URL depth (event detail pages) is classified by path depth (`kindOf` in `lib/seo.mjs`). There are no events today, so that path has unit tests but no real page.

## Dependency

`parse5` 7.3.0 as an exact-pinned dev dependency (already in the tree through Astro's `rehype-parse`; no new download, `package-lock.json` changes by one line). Everything else is Node built-ins plus `playwright-core`, `sharp` and Astro, which the repo already uses. No hosted or paid tool.

## Tests

`scripts/contract-extract.test.mjs`, `scripts/contract-diff.test.mjs` and `scripts/contract-facts.test.mjs` (43 tests) cover the pure functions: extraction, sitemap and robots parsing, the redirect simulator, the CTA rules against the real `site.ts`, the SEO diff (each "better" rule and each failure), the waiver mechanism, the HEAD-only client, the production refresh with an injected `fetch`, fact extraction and the contradiction rules, and the BLG fixtures against the real normaliser. `npm run test:unit` picks them up because they sit in `scripts/*.test.mjs`.
