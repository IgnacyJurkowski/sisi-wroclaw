# Search Indexing and Canonical Host Design

**Date:** 2026-07-15

**Target:** Site-wide search metadata and production indexing behavior for `sisiwroclaw.pl`

## Context

The 15 July 2026 search and discovery audit found that every public sitemap URL emits `noindex, nofollow`. It also found a host mismatch: requests to `https://sisiwroclaw.pl` redirect to `https://www.sisiwroclaw.pl`, while canonical links, hreflang links, Open Graph URLs, sitemap locations, the robots sitemap reference, and JSON-LD identifiers use the redirecting non-`www` origin.

The live behavior was rechecked before this design was approved:

- `https://sisiwroclaw.pl/pl/` returns a one-hop permanent redirect to `https://www.sisiwroclaw.pl/pl/`.
- `https://www.sisiwroclaw.pl/pl/` returns the public page but emits `noindex, nofollow`.
- Its canonical and Open Graph URL point back to the non-`www` host.
- Sitemap locations use the non-`www` host.

The current indexing guard intentionally blocks a build unless Netlify reports a production context whose site origin equals the configured business origin. The guard is sound, but the configured origin no longer matches the final production host.

## Approved decisions

1. `https://www.sisiwroclaw.pl` is the permanent canonical origin.
2. Only the canonical production website may be indexed.
3. Netlify deploy previews, branch deployments, malformed or noncanonical builds, the fallback root document, and the real 404 page remain blocked from indexing.
4. Normal public production pages omit the robots meta tag. Search engines therefore use the normal `index, follow` default.
5. The existing one-hop bare-domain-to-`www` redirect remains managed by Netlify. No duplicate hostname redirect is added to `netlify.toml`.
6. The existing host-aware, fail-closed indexing architecture is retained and aligned rather than replaced with a new environment-variable or response-header system.

## Indexing behavior

The page behavior is determined at build time:

| Build or page type | Required robots behavior |
| --- | --- |
| Normal route in canonical Netlify production | No robots meta tag |
| Explicit utility page in canonical production, including 404 and fallback root | `noindex, follow` |
| Deploy preview or branch deployment | `noindex, nofollow` |
| Production build whose reported origin is not the canonical origin | `noindex, nofollow` |
| Missing, malformed, or incomplete build environment | `noindex, nofollow` |

The absence of a robots tag is a deliberate production state, not a missing configuration. The guard must continue to fail closed whenever it cannot prove that a build is the canonical production website.

## Canonical URL architecture

Every first-party URL producer uses `https://www.sisiwroclaw.pl`:

- Astro's configured `site` origin;
- the shared business origin and its logo and image URLs;
- canonical links and Open Graph URLs;
- locale hreflang links and `x-default`;
- sitemap locations and their alternates;
- the sitemap reference in `robots.txt`;
- NightClub, WebSite, Event, organizer, image, and other first-party JSON-LD identifiers and URLs;
- build, launch, browser, security, and host-smoke test expectations.

The implementation should continue deriving route URLs from the existing centralized route map and shared site data. It must not introduce a second independently configurable canonical source.

## Expected implementation surface

The focused change is expected to touch only the existing canonical-origin definitions, indexing helper and rendering call site, static robots file, and regression checks that currently assert the non-`www` origin or an explicit production robots value. Likely files include:

- `astro.config.mjs`;
- `src/data/site.ts`;
- `src/lib/launch.mjs`;
- `src/layouts/Base.astro`;
- `src/pages/sitemap.xml.ts` only if its fallback origin remains independently specified;
- `public/robots.txt`;
- focused scripts under `scripts/` that assert canonical metadata or production indexing.

No page redesign, copy rewrite, event publishing, analytics integration, domain reassignment, or unrelated refactor belongs in this batch.

## Verification

Regression coverage must prove:

1. Canonical production pages render no robots meta directive.
2. Explicit utility pages in canonical production render exactly one `noindex, follow` directive.
3. Preview, branch, noncanonical, and invalid build environments render exactly one `noindex, nofollow` directive.
4. Canonical, hreflang, Open Graph, sitemap, robots, and JSON-LD first-party URLs use the `www` origin.
5. No public sitemap URL is built with the bare origin.
6. Existing security and structured-data assertions remain green.

Before publication, run the repository's complete release verification rather than only focused unit tests.

After deployment, verify the live result using raw responses rather than rendered-page inference:

1. The bare HTTP and HTTPS host variants reach the matching `www` path in one permanent redirect hop.
2. Representative `www` pages in all five locales return `200` and contain no robots meta tag.
3. The 404 page remains non-indexable.
4. Sitemap locations, canonical links, hreflang links, Open Graph URLs, and JSON-LD identifiers all use `https://www.sisiwroclaw.pl`.
5. Security headers remain present.
6. The production smoke harness passes against the final host.

Search Console inspection and sitemap resubmission are intentionally separate operational actions. They require account access and explicit approval after the corrected deployment is live.

## Rollback

If the final host or Netlify production environment does not match the approved behavior after deployment, restore the previous release rather than weakening the fail-closed guard. Diagnose the reported production origin and domain assignment before attempting another release.

## Success condition

Every normal public page on `https://www.sisiwroclaw.pl` is eligible for indexing without an explicit robots directive; all canonical search and entity signals use that same final origin; previews, noncanonical builds, and utility pages remain safely non-indexable; and the complete release and live-host verification gates pass.

## Approval boundary

This document records the approved design only. It does not authorize application-code or configuration changes. Implementation begins only after the user reviews this written specification and explicitly approves the subsequent implementation plan.
