# Launch Hardening Design

**Date:** 2026-07-13

**Target:** SiSi Wrocław Astro website at `sisiwroclaw.pl`

**Release objective:** Make every repository-controllable P0 and P1 launch-readiness issue safe for a same-day production cutover, deploy the verified revision through Netlify, and leave DNS changes to the site owner.

## Decision

Use a focused hardening release on the existing static Astro and Netlify architecture. We will not redesign the site, introduce an application server, or invent missing business content. Unverified claims will be removed or softened, stale sample-quality events will be withdrawn, and the site will launch with an intentional localized no-upcoming-events state until staff publish approved event records.

The release may be pushed directly to `main` without a pull request. The implementation must still pass the complete test, browser, accessibility, security, deployment, and production-smoke gates defined below. Appropriate branch protection will be enabled only after this direct release is present on `main`, so it does not obstruct the explicitly authorized publication path.

## Scope

### P0 launch blockers

1. Prevent event data from breaking out of JSON-LD and executing same-origin JavaScript.
2. Make the custom production domain indexable while keeping deploy previews and branch deploys out of search indexes.
3. Withdraw the stale sample-quality event records and prevent equivalent records from being published by the scheduled sync.
4. Remove or soften unverified age, payment-window, venue-area, coordinate, and legal assertions without replacing them with invented facts.
5. Resolve the site-wide accessibility failures recorded by the audit: contrast, date-picker semantics, 320 CSS-pixel reflow, reservation heading hierarchy, and legal fallback language.
6. Verify that Netlify Forms is enabled and the B2B form is detected. Preserve a safe fallback contact route when platform submission fails.
7. Configure the production custom domain on the Netlify project without changing public DNS, then verify deployment readiness for the owner-led DNS cutover.

### P1 launch hardening

1. Replace whole-query attribution capture with a bounded allowlist.
2. Make the cookie notice accurately describe the site's essential-only storage behavior.
3. Add a tested browser-policy and caching baseline without breaking the application.
4. Make deployment hooks fail on HTTP errors and require the Node 22 test/build gate before publication.
5. Pin third-party GitHub Actions to immutable revisions where the exact upstream revision can be verified.
6. Add a first-party type-check command and include it in CI.
7. Correct event structured-data behavior so unavailable or historical events are not advertised as purchasable inventory.
8. Remove demonstrably unreachable legacy Framer runtime material after a reference-aware inventory.
9. Add final-host smoke checks for redirects, status codes, canonical metadata, indexing, headers, assets, and form markup.

### Explicit boundaries

- Codex will not change DNS records. The owner will perform the final DNS cutover.
- Codex will not manufacture future events, client case studies, legal approval, business approval, accessibility claims, or translations.
- Codex will not submit personal data to production. If an end-to-end Forms test is needed, it will use a clearly labeled non-personal test record and delete it after readback when the connected platform supports both operations.
- A notification recipient cannot be invented. Existing notification configuration will be preserved and inspected when exposed by Netlify; an unavailable dashboard-only choice will be reported as an owner action rather than silently asserted as fixed.
- The Google Drive authoring model remains in place. The repository will reject unsafe or sample-quality source material at the publication gate.

## Architecture

### Safe structured-data boundary

All JSON-LD remains owned by `src/layouts/Base.astro`, but raw serialization moves behind one HTML-safe helper. The helper must preserve JSON semantics while ensuring serialized data contains no literal less-than character capable of starting an HTML script end tag. Every current and future JSON-LD object uses the helper.

The test boundary is the final built HTML, not only the helper. Tests inject lower-, upper-, and mixed-case script terminators through event title and performer fields, build the affected route families, and verify that the payload remains data, the JSON parses, and no browser marker executes.

### Production identity and indexing

The canonical origin remains the single source of truth in `src/data/site.ts`. A page is indexable only when the build is a Netlify production context and the Netlify main-site URL resolves to that canonical origin. Local builds, deploy previews, branch deploys, and any production build still attached only to the Netlify subdomain remain `noindex, nofollow`.

The indexing decision will be extracted into a pure function with a matrix covering canonical production, Netlify-subdomain production, deploy preview, branch deploy, local build, malformed input, and utility-page overrides. Canonical, Open Graph, hreflang, sitemap, and robots behavior continue to use the same canonical origin.

### Event publication quality

The committed sample-quality event records and their event images will be removed. Empty event data is valid for the website build and renders explicit localized empty states on home and events pages. The scheduled sync may publish an empty lineup only when the source folder is intentionally empty; its existing sharp-drop protection continues to prevent accidental mass unpublishing.

Source documents are rejected when required fields contain known sample tokens, malformed genres, unsafe control characters, or content that cannot produce trustworthy public metadata. Duplicate source images across distinct events are rejected unless an explicit repository-owned rule later permits them. The quality checks are deterministic pure functions with unit tests and actionable workflow error messages.

Historical event pages do not advertise an in-stock offer. Event structured data includes a price and `PLN` currency only when a verified numeric entry price exists, and it does not claim a ticket-purchase URL when the available link is only the generic table-reservation cart.

### Factual and legal copy

Unverified numeric or contractual assertions are removed from visible copy, metadata, tests, and structured data. This includes the `663 m²` characterization, the 21+ rule, the 120-minute prepayment rule, and best-effort coordinates. Verified registration data, address, contact details, opening hours, The Cork seated capacity, and presentation-screen count remain only where their existing source evidence is adequate.

Legal pages remain available, but their presentation states the controlling-language and convenience-translation relationship without implying professional approval. English fallback bodies on German, Italian, and Czech routes are wrapped with `lang="en"` so assistive technology receives the actual language. No text claims that counsel has approved the documents.

### Accessibility and responsive behavior

Color tokens and affected component states will be raised to WCAG 2.2 AA contrast for normal text and controls. The implementation will favor shared token changes where they preserve the visual identity, with local overrides only for semantic states that need distinct treatment.

The date input will implement one coherent combobox/dialog accessibility model. Its expanded state, popup relationship, label, keyboard behavior, and focus return must agree; no unsupported ARIA state remains on an implicit textbox.

Reservation and B2B layouts will allow intrinsic controls and contact rows to shrink or wrap at 320 CSS pixels. Standalone reservation pages receive one visible `h1`, with existing section headings moved below it in the hierarchy. All fixes must preserve keyboard operation, no-JavaScript fallbacks, reduced motion, and mobile-menu focus behavior.

### Privacy and consent

The B2B form records only the campaign keys `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`. Each key and value receives a fixed length bound, unknown parameters are discarded, and an empty attribution field is omitted or left empty. The privacy inventory and source comments will describe the field accurately.

Because the site currently performs no optional analytics or advertising processing, the cookie UI becomes an essential-storage notice rather than an accept/reject choice with identical outcomes. It records only dismissal of that notice. If optional processing is introduced later, a distinct consent model will require its own design.

### Browser and cache policy

Netlify response headers will establish a compatibility-tested baseline: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and framing protection through CSP `frame-ancestors`. The CSP will allow only origins demonstrated by the built application and will not use a script policy that leaves the confirmed JSON-LD attack executable.

The site-wide wildcard CORS header will be removed. Long-lived immutable caching remains limited to content-addressed or stable versioned assets. HTML stays revalidated. Images, fonts, video, and other static media receive explicit cache policies appropriate to whether their URLs change when content changes.

### Release and deployment controls

A Node 22 CI workflow will run unit tests, strict first-party type checking, the Astro production build, and rendered assertions. The main deployment workflow depends on this gate and calls the Netlify build hook with failure-on-HTTP-error behavior. It records enough response information to diagnose a rejected hook without printing secrets.

The event synchronization workflow keeps its own test gate and adopts the same safe deploy-hook behavior. Verified third-party actions are pinned to immutable commit revisions with a comment naming the human-readable release.

After local verification, the release is committed and pushed directly to `main`. Netlify deployment is then observed to a terminal state and its published commit is compared with the pushed commit. Smoke checks run against the Netlify production URL. The custom domain may be attached to the project before DNS moves, but no DNS mutation occurs in this workflow.

After the release is published, repository protection will require the new CI status for future changes where the repository plan permits it. If GitHub plan or permissions prevent protection, the exact API response becomes an explicit residual owner action.

## Error handling and rollback

- Unsafe JSON-LD content fails tests and cannot reach publication.
- Invalid event-source content produces a nonzero sync with per-event reasons while the last known safe repository state remains deployed.
- A failing unit, type, build, rendered, accessibility, or security check stops the release.
- An HTTP error from the Netlify hook fails the workflow.
- A Netlify deploy that does not publish the expected commit is treated as failed even when the hook request succeeded.
- If the new deployment fails final smoke checks before DNS cutover, the owner leaves DNS unchanged and Netlify can roll back to the previous deploy.
- If defects appear after DNS cutover, rollback uses the previously verified Netlify deploy and the owner's prepared DNS rollback path.

## Verification contract

The release is acceptable only when all of the following are freshly verified:

1. Node 22 unit tests, type checking, Astro build, and rendered assertions pass.
2. The original JSON-LD browser PoC no longer executes on home, events-list, future detail, or historical detail routes, while structured data remains valid JSON.
3. Production-indexing tests prove canonical production is indexable and every preview/noncanonical permutation is not.
4. Every generated sitemap route returns the expected status, has valid internal links, produces no page or console error, and has no horizontal reflow at 320, 390, and desktop widths.
5. Automated accessibility checks report no serious or critical violations, followed by manual keyboard checks for navigation, date selection, form errors, focus return, reduced motion, and no-JavaScript content.
6. Security headers are present and the CSP produces no application-blocking browser violations.
7. The B2B form is present in Netlify readback, Forms is enabled, attribution is allowlisted, and fallback contact information remains usable.
8. The deployed Netlify revision exactly matches the pushed `main` commit and passes post-deploy smoke checks.
9. The final Git worktree is clean and no audit-only temporary dependency or source mutation remains.

## Success condition for DNS handoff

The owner receives the exact deployed commit, the Netlify production URL, the custom-domain attachment state, the canonical-host and redirect expectations, the remaining dashboard-only notification action if one exists, a concise DNS cutover checklist, and the rollback deploy identifier. DNS should move only after that handoff reports every repository-controllable P0 and P1 item closed and distinguishes any external owner action explicitly.
