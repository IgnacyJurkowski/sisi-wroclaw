# Imported earlier work (Phase 0.3)

Prepared 2026-09-29 for the SiSi Wrocław "elevate" run. Follows `docs/sisi-elevate/WORKING-RULES.md`.

Labels: **Confirmed** (seen in a source I read, in code, or in the local build), **Rec** (recommendation), **Assumption**, **Inference**. `PENDING` marks a decision only Ignacy can make.

Local-build claims are **Confirmed (local build)**. They come from the `dist/` folder that was already in `/home/user/sisi-elevate` (directory time 11:49 on 29 Sep 2026). I did not rebuild it. Nothing here has been seen on production, which is blocked in this container.

## Read this first

1. **Confirmed.** I found no standalone document for any of the four pieces of earlier work you named: the VVS audit of the SiSi site, the og:image fix, the consolidated reservation entry point, the reservation funnel design. Not in Drive (titles and full text), not in the repo docs, not in git history (shallow, 53 commits from 5 Sep 2026), not in GitHub pull requests #1 to #36. Notion is not connected in this environment, so nothing in Notion was searched.
2. **Confirmed.** The og:image is still a third-party Framer CDN URL. `src/layouts/Base.astro:64` and `dist/pl/index.html`. The `TODO(ignacy)` at `Base.astro:62` asks for a self-hosted 1200x630 image in `/public/og/`. That folder does not exist. Open.
3. **Confirmed.** The reservation fee text disagrees with itself. The UI says Saturday entry 40 zł and pickup 22:00-23:00 (`src/i18n/ui/pl.ts:327-328`). The Terms page says 30 zł and 22:00-23:30 (`src/i18n/legal.ts:42,44`; English `legal.ts:241,243`). Open. Ignacy must say which is true.
4. **Confirmed.** Several specs are older than the code. The PostHog spec says autocapture on, consent key `sisi-analytics-consent`, CSP untouched. The code has autocapture off, key `sisi-analytics-consent-v2`, Google Analytics 4 behind the same consent, and CSP hosts for Google. Read section D.7 before trusting any spec line about consent.
5. **Confirmed.** The summer Friday closure ended 28 August 2026 inclusive. The popup and seasonal schedule were removed in PR #20 (merged 2026-09-01). Current schedule is Friday and Saturday 22:00-04:00 (`src/lib/opening-hours.mjs:7-20`).
6. **Confirmed.** The VVS spec (doc "md") has 56 sections. It gives category weights for only three of its 15 templates (Bar/Europe, Hotel/Asia, Restaurant/US) and defines none for SiSi. Which venue type SiSi is scored as is `PENDING`.

Method. **Confirmed.** VVS doc `1IF5zyEAt2EdeHR1X2kmnrmbXBuKlIrI52LzxNJFD6N0`: all 3,863 lines of the cleaned text read (sections 1 to 56, plus the end marker). Untitled doc `1YJ1VlEyI_UWNX_AsFYsauPaNbXOrC_l0ltN61E5TftQ`: read in full. Cleaned VVS copy for this session only: `/tmp/claude-0/-home-user-sisi-wroclaw/287ee6fb-89fe-5c8c-807c-f1403bda68fe/scratchpad/vvs.txt` (Rec: re-export from Drive if that path is gone).

---

## A. VVS checklist (website and booking path)

Source: Google Doc "md", id `1IF5zyEAt2EdeHR1X2kmnrmbXBuKlIrI52LzxNJFD6N0`, in folder "Venue Visibility Score Tool (VVS)" `1Xg432eaHFM8tpaRSgi8KrwyAfrq-jre2`. Title line: "Venue Visibility Score Engine - Specification v2.5". Created 2026-06-18, modified 2026-06-20.

Reading rules for this section:

- Wording, weights, thresholds and section numbers are **Confirmed** (read from the doc). Quotes are exact except that dashes are written as hyphens.
- The "Local test" column is **Rec**. Y = testable on the local build alone. P = partly (needs production, a network tool, or a human eye). N = not testable here (off-site, credentials, or blocked by the run rules).
- "Seen now" cells are **Confirmed (local build)** or **Confirmed (code)** with a path. An empty cell means I did not check.

### A.0 Scoring rules that apply to every website item

| # | Spec | Rule (spec wording where short) | Numbers |
|---|---|---|---|
| S1 | 5.2, 11, 27 | Setup: "Earned Points = Quest Weight × Completion % × Verification Confidence Multiplier". KPI: "Earned Points = Quest Weight × KPI Score × Data Confidence Multiplier". Self-reported: "Earned Points = Quest Weight × Completion % × 0.50, then subject to the schedule and ceiling in 9.4". | Score scale 0 to 100. |
| S2 | 7.4 | "Quest Weight = Normalized Category Weight × (Quest Cruciality / Sum of Cruciality of all active quests in that category)". | Cruciality 0 to 10; 0 removes the quest. |
| S3 | 9.2 | Verification multipliers. | Automated 1.00; Provider-based 1.00; Auditor-assisted 0.85; Semi-automated 0.75; Self-reported 0.50; Experimental 0.50 or lower. |
| S4 | 9.6 | "Completion % = Sum of weights of met criteria / Sum of all criterion weights". A gating criterion unmet caps completion. | "default cap 40%". |
| S5 | 9.4 | Self-reported schedule. | First 10 points at 1.00; next 10 at 0.50; above 20 at 0.25; hard ceiling 15 points of 100. |
| S6 | 10.4, 15.2 | Freshness. "Use stale data only within the allowed window ... and never treat stale data as 0." | Fresh within 7 days; Acceptable within 30; Stale older than 30. |
| S7 | 47.2 | Three states: measured, unmeasured, failed. "an unmeasured field is never a failure". It is null, listed in `unmeasured_fields`, lowers completeness, widens the interval. "A boolean false means measured-and-absent only when the check actually ran". | n/a |
| S8 | 38.1, 40, 38.5 | Name-and-address input gives a range, "never a single Official number". `range_width = clamp( BASE - STEP_DOWN x (high-confidence public categories present) + STEP_UP x (conflicts), MIN, MAX )`. | BASE 16, STEP_DOWN 2, STEP_UP 3, MIN 6, MAX 24. Spec example: 5 categories and 1 conflict gives 9. |
| S9 | 43 | Source levels P1 to P7 with confidence ceilings. P1 official website or owned channel; P2 primary platform profile (Google, Tripadvisor, Booking); P3 public social; P4 local guide or press; P5 aggregator or directory; P6 AI-inferred; P7 conflicting. | P1 1.00; P2 1.00; P3 0.75; P4 0.70; P5 0.55; P6 0.30 (never in the headline); P7 no score until resolved. |
| S10 | 24.1, 8.1 | Bar / Europe category weights: Maps / Local Presence 18; Reviews / Reputation 15; **Website / SEO / GEO 15**; Instagram / TikTok 22; Tripadvisor / Local Guides 8; Events / Facebook / Live 10; Partnerships / Backlinks 12. Total 100. Removed categories re-normalize: `Original Weight / Sum of Active Weights × 100`. | Website share 15 of 100 for Bar / Europe. No Nightclub / Europe weights exist in the doc. |
| S11 | 39.7 | Data Completeness Index groups relevant to the site: "Website and SEO scan 12", "Conversion path 12" (of 100; others Maps grid 20, Reviews 15, Search demand 15, Social cadence 10, Social engagement 8, Benchmark cohort 8). Grades: A is DCI 85 plus, B 70 to 84, C 50 to 69, D is a Mode A snapshot, E is below 35 or unresolved conflicts. | DCI is "explicitly not part of the Visibility Score". |
| S12 | 12, 7.2 | "Priority = (Score Gap × Feasibility) / Difficulty". Difficulty 0 = two minutes; 9 to 10 = a week or more. | Core business info difficulty 2; LLM understandability 5; Technical SEO 5. |
| S13 | 14 | Who verifies what. Automated: "PageSpeed Insights, SSL check, sitemap and robots checks, structured data validation ... broken link scans". Semi-automated: "the HTML menu is visible, the mobile reservation CTA is visible, the event calendar exists, the photos appear recent, the FAQ is readable, the landing-page content matches the schema". Auditor-assisted: "CTA clarity", "how to find us usefulness". | Multipliers as S3. |

**Assumption.** SiSi's venue type for scoring is unresolved. `src/data/site.ts` types the entity as `NightClub`; the brand line in the README is "Music Club & Bar". The doc gives weights only for Bar / Europe, and its social-heavy rule (section 40) names "Bar / Europe, Nightclub / Europe, Cafe / Europe, and any template where the social_visibility weight is 15 or more". `PENDING`: Bar / Europe or Nightclub / Europe. Rec: report website results per criterion so they hold under either template.

**Inference.** The number in section 35.3, "SiSi: 47 / 100 (39-55)", sits in a three-venue portfolio example (R32, SiSi, Cork). It is an illustration inside the spec. Do not cite it as a measured score.

### A.1 Setup quest 1: Complete Core Business Information (`core-business-info-complete`, section 13.1)

Category `website_seo_geo`. Weighted criteria completion. Difficulty 2. Verification semi-automated, multiplier 0.75, sources website_scan, google_business_profile, manual_review. Criterion weights sum to 14; the two gating criteria are name and address.

| # | Criterion (spec wording) | Weight | Local test (Rec) | Seen now |
|---|---|---|---|---|
| V01 | "Venue name correct" | 2, gating | P. Compare title, `og:site_name`, JSON-LD `name`, footer. Google profile side is N. | Confirmed (code): `BUSINESS.name` "SiSi Wrocław", `site.ts:129`. |
| V02 | "Address correct" | 2, gating | P. Site side Y (footer, contact page, JSON-LD `PostalAddress`). Google and Tripadvisor side N. | Confirmed (code): `CONTACT.address` "Rzeźnicza 32-33, 50-130 Wrocław", `site.ts:83`. |
| V03 | "Phone correct where relevant" | 1 | P. Site side Y (`tel:` links and JSON-LD `telephone`). | Confirmed (code): +48 515 126 260, `site.ts:85-86`. |
| V04 | "Opening hours correct" | 2 | P. Site side Y (visible text and `openingHoursSpecification`). Google side N. | Confirmed (code): Friday and Saturday 22:00-04:00, `opening-hours.mjs:7-20`, `site.ts:90,231`. |
| V05 | "Website URL correct" | 1 | Y for canonical and sitemap host. N for the Google link. | Confirmed (local build): canonical `https://www.sisiwroclaw.pl/pl/`. |
| V06 | "Primary category clear" | 1 | P. JSON-LD `@type` Y. Google category N. | Confirmed (code): `NightClub`, `site.ts:217`. |
| V07 | "Reservation/booking/ticket/directions CTA clear" | 2 | Y. See V37. | See V37. |
| V08 | "Social links correct" | 1 | P. Syntax and `sameAs` Y. Liveness needs a network request to a third party, which the run rules forbid from tests. | Confirmed (code): Instagram, Facebook, Tripadvisor in `sameAs`, `site.ts:232`. |
| V09 | "NAP consistent across key platforms" | 2 | P. Site side Y. Other platforms N. | |
| V10 | Section 44 gating rule: "If a gating field conflicts across high-confidence sources (P1 or P2), cap Core Business Information completion at 40% until the conflict is resolved". Conflict types: address, phone, hours, review count, rating, duplicate profile, closed status, booking link, website-social link, stale self URL. | cap 40% | P. Only site-internal conflicts are testable. | |

### A.2 Setup quest 2: Make Website Understandable for AI / LLM Discovery (`website-llm-understandability`, section 19)

Category `website_seo_geo`. Difficulty 5. Requires `website-live` and `core-business-info-complete`. Semi-automated, 0.75. Weights sum to 15; gating criteria are "Reservation or action link visible" and "Site crawlable". The spec adds: "This supports AI visibility. It is not proof that AI systems recommend the venue".

| # | Criterion | Weight | Local test (Rec) | Seen now |
|---|---|---|---|---|
| V11 | "Venue name clear" | 1 | Y. H1, title, JSON-LD. | Confirmed (local build): exactly one H1 on every non-blog page except the root redirect page `dist/index.html`. Blog pages not counted. |
| V12 | "Address visible" | 1 | Y. | |
| V13 | "Opening hours visible" | 1 | Y. | Confirmed (code): `pl.ts:85` "Piątek - Sobota" with `site.ts:90` "22:00 - 04:00". |
| V14 | "Venue type clear" | 1 | Y. | |
| V15 | "Menu or offer visible" | 2 | Y. Fetch `/pl/menu/` without JavaScript. | |
| V16 | "Reservation or action link visible" | 2, gating | Y. | Confirmed (code): `Hero.astro:40`, `Nav.astro:33`. |
| V17 | "FAQ section exists" | 1 | Y. | Confirmed (code): no FAQ on the home page. `FAQPage` schema exists on the corporate page (`CorporatePage.astro:25-28`) and on blog articles with FAQ entries (`articles.ts:143`). |
| V18 | "Structured data implemented" | 2 | Y for presence and parse. N for an external validator. | Confirmed (code): one `@graph` with Organization, EventVenue (R32), NightClub, WebSite (`entityGraphSchema`, `site.ts:266`). `ReserveAction` and `acceptsReservations` on the NightClub (`site.ts:235-245`). |
| V19 | "SameAs links included" | 1 | Y. | Confirmed (code): `site.ts:232`. |
| V20 | "Site crawlable" | 2, gating | P. Local build is `noindex, nofollow` by design (see V23). `robots.txt` Y. | Confirmed (code): `public/robots.txt:2-3` allows all; 17 named AI and search crawlers also allowed (`:8-25`). |
| V21 | "Content in local language and/or English" | 1 | Y. | Confirmed (local build): 92 `index.html` files under pl, en, de, it, cs. |

### A.3 Setup quest 3: Pass the technical SEO and crawlability scan (`technical-seo-health`, section 41.2)

Category `website_seo_geo`. Difficulty 5. Requires `website-live`. Automated, multiplier 1.0. Weights sum to 16; gating: HTTPS valid, Indexable, No placeholder content. The spec resolves overlap at criterion level (41.3): schema validity and crawlability are scored once at venue level and reused, so this quest does not list them.

| # | Criterion (spec wording) | Weight | Local test (Rec) | Seen now |
|---|---|---|---|---|
| V22 | "HTTPS valid" | 2, gating | N. TLS exists only on production. Mark unmeasured, not failed (S7). | |
| V23 | "Indexable, not blocked by robots or noindex" | 3, gating | P. Rebuild with `CONTEXT=production URL=https://www.sisiwroclaw.pl` to see the production directive. Do not read the local `noindex` as a failure. | Confirmed (local build, `grep` over all 93 HTML files in `dist/`): 92 carry `noindex, nofollow` (this includes `404.html`) and 1, the root fallback `dist/index.html`, carries `noindex, follow`. Confirmed (code): `src/lib/launch.mjs:14-21` returns that unless the build is a Netlify production build on the canonical origin. Production value is `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` (`launch.mjs:12`). |
| V24 | "Sitemap present and valid" | 1 | Y. | Confirmed (local build): `dist/sitemap.xml`; `lastmod` on every URL (`sitemap.xml.ts:11-21`); `robots.txt:27` names it. |
| V25 | "Title and meta description present and unique" | 2 | Y for presence and duplicates. | Confirmed (local build), my script over `dist/**/index.html`: titles 18 to 55 characters, descriptions 70 to 156 characters on all non-blog pages. Uniqueness not tested. |
| V26 | "Single clear H1 and sane heading structure, no duplicated headings" | 1 | Y. | Confirmed (local build): one H1 per non-blog page. Duplicated H1-H3 text on 6 of 92 pages (blog included in this check): the contact page in all 5 locales (H1 and an H2 with the same word) and one blog article. |
| V27 | "No critical broken links" | 1 | P. Internal Y. External N (third-party requests forbidden). | |
| V28 | "Meaningful images have accurate alt text; decorative images use empty alt" | 1 | P. Presence Y; accuracy needs a human or vision check. | Confirmed (local build): the 4 images on `/pl/` all have descriptive Polish alt text; no `<img>` lacks `alt`. |
| V29 | "Open Graph tags present" | 1 | Y. | Confirmed (local build): present, but `og:image` is an external Framer URL (`Base.astro:64`). See B.6. |
| V30 | "No placeholder, template, or test content on public pages" | 2, gating | Y. Grep the build. | Confirmed (local build): no file in `dist/` matches "lorem ipsum", "12 34 56", "dummy" or "SESION". |
| V31 | "Core content (menu, hours, CTA) present in server-rendered HTML" | 2 | Y. Request HTML with JavaScript disabled. | Inference: Astro static build. Not run. |

### A.4 Scan inputs and the `website_scan` object (sections 41.1, 42.4)

| # | Spec | Item | Local test (Rec) |
|---|---|---|---|
| V32 | 41.1 | Performance: "PageSpeed Insights / Lighthouse, Core Web Vitals, mobile weighted." | P. Lighthouse 13.5 is in `/home/user/sisi-tools`. PageSpeed Insights is N. |
| V33 | 41.1 | Crawl and index: "HTTPS, robots.txt, sitemap, indexability, canonical tags, broken links." | P (HTTPS N). |
| V34 | 41.1 | On-page: "title and meta description, heading structure, image alt text, Open Graph, hreflang where multilingual." | Y. Confirmed (local build): `/pl/` has 6 `<link rel="alternate" hreflang>` tags and 5 switcher anchors carrying `hreflang`. |
| V35 | 41.1 | Structured data: "LocalBusiness / Restaurant / Hotel / Event schema, SameAs links, validity against the schema validator." | P. Parse and shape Y; external validator N. |
| V36a | 42.4 | Fields typed as true, false or null in the spec must be null (unmeasured) when the check did not run: `robots_txt_found`, `sitemap_found`, `meta_description_present`, `duplicate_h1_or_heading_noise`, `open_graph_present`, `localbusiness_schema_present`, `sameas_links_present`, `schema_valid`, `mobile_pagespeed_score`, `content_readable_without_js`, `reservation_cta_first_viewport`, `alt_text_quality` (pass, weak, fail or null), `duplicate_content_blocks`, `placeholder_or_test_content`, `expired_events_as_upcoming`, `copy_quality_issue`, `broken_links_count`. Also `scan_scope` (full, website_only or custom) and `unmeasured_fields`. | Rec: emit this object per page from the local audit so the run's output matches the spec vocabulary. |

### A.5 KPI items that touch the website or booking path

| # | Spec | Item and scoring (spec wording, numbers kept) | Local test (Rec) | Seen now |
|---|---|---|---|---|
| V36 | 18.9 | **Website Mobile Speed.** Absolute. Metric: mobile performance score 0 to 100. "90 to 100 -> 1.00; 75 to 89 -> 0.85; 50 to 74 -> 0.55; 25 to 49 -> 0.30; 1 to 24 -> 0.10; unreachable / broken -> 0.00". Alternative: "KPI Score = clamp(performance / 100, 0, 1)". Unavailable PageSpeed means exclude with a warning. | P. Lighthouse mobile on the local build is a stand-in (Assumption). | Assumption: the PostHog spec (`2026-07-24-posthog-analytics-design.md:23`) states "PageSpeed 100/100 both form factors". That is an owner-side number I could not reproduce. |
| V37 | 18.10 | **Website Conversion CTA.** Absolute. "tappable in the first mobile viewport -> 1.00; visible after one short scroll -> 0.75; present but hard to find (footer only, no anchor) -> 0.40; missing or broken -> 0.00". "Verified by screenshot analysis and auditor review." Bar action: "reserves, gets directions, or sees the menu". Nightclub action: "buys a ticket, joins a list, or reserves a table". | Y. Playwright at 390x844: bounding box of the primary reservation link against the viewport. Block third-party routes. | Not measured. The nav CTA (`Nav.astro:33`) and hero CTA (`Hero.astro:40`) both link to the local `/pl/rezerwacje/` page. Position in the first viewport is `PENDING` until rendered. |
| V38 | 18.10 | **Present but position unverified.** "Score it at a capped 0.50, mark the field unmeasured". Not 1.00, not 0.00. | Y (this is what V37 must avoid). | Applies until V37 is measured. |
| V39 | 18.10, 46.4 | **Social booking-path caps.** Linked profile: active = normal; weak = "capped at 0.75"; dormant = "capped at 0.40"; dead = "capped at 0.20"; unreadable = "capped at 0.50 and confidence lowered". Only applies when the booking path sends the guest to a social platform. | Y for "does any booking path go to social". Profile cadence N. | Confirmed (code): every reservation CTA resolves to the local reservations page or to `emenago.com` (`site.ts:13-37`). No social booking path found. |
| V40 | 46.2, 46.3 | **Conversion Path Friction.** Base by `path_type`: "inline_form / booking_widget 1.00; external_platform 0.80; social_dm 0.55; phone 0.55; none / broken 0.00". `steps_penalty = clamp( (steps_to_book - 2) x 0.10 , 0 , 0.40 )`. `Friction = clamp( base - steps_penalty , 0 , 1 )`. "adjusted CTA KPI = CTA_visibility_score x ( 0.5 + 0.5 x Conversion Path Friction )". | N for `steps_to_book`. Walking the Emenago cart would create a reservation flow on the provider, which the run rules forbid. | Inference: `path_type` is `external_platform` (Emenago cart). Arithmetic from the formula: steps 2 or fewer gives friction 0.80 and a CTA multiplier of 0.90; 3 gives 0.70 and 0.85; 4 gives 0.60 and 0.80; 5 gives 0.50 and 0.75; 6 or more gives 0.40 and 0.70. `steps_to_book` is `PENDING`. |
| V41 | 46.5, 39.8 | **Trackability.** `trackable` "does not change the guest's friction". Connector readiness example: "Booking clicks status: missing_tracking action: add event tracking or UTMs to the booking link". Untrackable path lowers conversion-KPI confidence. | Y. | Confirmed (code): every Emenago link built by `reservationUrl` carries `utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=<location>` (`site.ts:35-37`). Click event `reservation_cta_click` is fired for `emenago.com` links (`src/scripts/conversion-events.ts:16-23`). Inference: completed bookings on Emenago are not observable from the site. |
| V42 | 18.8 | **Photo Freshness.** Absolute. Newest photo within 7 days 1.00; within 30 days 0.75; within 90 days 0.50; within 6 months 0.25; none or older 0.10. Coverage penalty: fewer than 3 of {Google, Facebook, Instagram, Tripadvisor} subtracts 0.10. UGC bonus: one user photo within 30 days adds 0.05. | N. Off-site. | |
| V43 | 18.4 to 18.7, 17.5 | **Reviews** (all off-site). Rating taper: "rating >= 4.2 : factor = 1.0"; "2.5 <= rating < 4.2 : factor = 0.15 + 0.85 × ((rating - 2.5) / 1.7)"; "rating < 2.5 : factor = 0.05". Response rate bands: 90 to 100% replied 1.00; 70 to 89% 0.85; 40 to 69% 0.60; 10 to 39% 0.30; 0 to 9% 0.10. Unanswered serious complaint: "the lower of (band x 0.80) and 0.60". Quality bonus +0.10. | N. | Confirmed (code): no `aggregateRating` or review markup in `site.ts`; the site shows no ratings. |
| V44 | 18.11, 18.12, 10.3 | **Search demand** (Search Console). Credential-gated with no public window: "score at max(public-evidence estimate, floor), where the floor is the cohort 30th percentile, and flag it 'unverified low-data floor'". Zero branded impressions over 90 days scores 0.00. | N. `PENDING`: Search Console access. | |
| V45 | 18.15 | **AI Recommendation Visibility.** Experimental. mention_rate 0.00 gives 0.00; 0.10 gives 0.40; 0.50 or more gives 0.80. "The ceiling is 0.80". | N. | |

### A.6 Content integrity, rendering and conflict checks (sections 41.4 to 41.6, 44, 47.3)

| # | Spec | Check (spec wording) | Severity | Local test (Rec) | Seen now |
|---|---|---|---|---|---|
| V46 | 41.5 | `placeholder_or_test_content`: "Lorem Ipsum, dummy items, test prices, or a placeholder phone number such as a sequential 12 34 56 7890." | High | Y | Confirmed (local build): none found (see V30). |
| V47 | 41.5 | `expired_events_as_upcoming`: "an 'upcoming' or 'Nadchodzace' section listing dates earlier than the scan date." | High | Y | Confirmed (code): `GENERATED_EVENTS` is an empty array (`src/data/events.generated.ts:5`), so the case cannot occur today. |
| V48 | 41.5 | `copy_quality_issue`: "a visible spelling or copy error in a heading or key line, for example 'FRIDAY SESION' for 'SESSION'." | Low | P | Confirmed (local build): "SESION" not present. Full proofreading not done. |
| V49 | 41.6 | `content_readable_without_js`: "whether the menu, hours, CTA, and event text are present in server-rendered HTML, not only after client-side JavaScript." | High | Y | |
| V50 | 41.6 | `duplicate_content_blocks`: "a venue description rendered several times, a repeated event section, a reservation heading shown three times, repeated footers." | Medium | Y | |
| V51 | 41.6 | `heading_noise`: "repeated identical headings or no clear H1 to H3 hierarchy." | Medium | Y | Confirmed (local build): see V26 (6 pages). |
| V52 | 41.6 | `alt_text_quality`: "presence is not enough ... Generic or wrong alt such as 'project img' or 'profile pic' fails on quality even when presence passes." | Medium | P | |
| V53 | 47.3 | **Template and Unfinished-Site flag.** Raised by placeholder content or expired events. "Audit confidence is capped"; "a Site Completion and Cleanup group comes before any optimization quest"; recorded as `site_state` (finished, template_or_unfinished or unknown). | n/a | Y | Inference: would not fire on the local build, given V46 and V47. |
| V54 | 44 | `stale_self_url_indexed`: "an older or template version of the venue's own page, for example /menu versus /menu/, still appears in the index with placeholder or outdated content". Raised High; roadmap adds "redirect the old URL to the real page and request reindexing". | High | P. Redirects Y. Index state N (production and Search Console). | Confirmed (code): legacy Polish paths 301 to `/pl/...` (`netlify.toml:41-73`); bare host 301 to `www` (`netlify.toml:8-32`). |
| V55 | 44 | `booking_link_conflict`, `website_social_link_conflict`. | n/a | P. Site-internal consistency Y; against Google profile N. | Confirmed (code): one base URL for all Emenago links (`site.ts:13-14`). |
| V56 | 41.4 | Severity map. Critical: "site unreachable, noindex, invalid HTTPS, broken booking CTA". High includes "no schema, poor mobile speed, missing title or meta, no crawlable menu ... core content readable only via JavaScript ... an old or template version of the venue's own page still indexed". Medium: "weak or inaccurate alt text, duplicated content blocks, heading noise, missing Open Graph, no FAQ, weak internal links". Low: "visible spelling or copy errors". "A Critical finding caps the Technical SEO Health quest". | n/a | Y for the reachable ones | Inference: "no FAQ" is Medium and applies to the home page (V17). |

### A.7 Evidence rules that shape the report (sections 38.4, 39, 47.1)

| # | Spec | Rule | Rec |
|---|---|---|---|
| V57 | 38.4 | Mode A minimum set includes "official website", "basic website SEO scan (Section 41)", "public NAP consistency (Section 44)". Missing checks widen the range; "A snapshot that skipped a required check is not valid and must say so." | The elevate run is a website-only scope. Say so. |
| V58 | 47.1 | Every audit declares scope per class (website, maps_rank, reviews, social_public, search_demand, booking, analytics, ota) as in_scope, excluded or unavailable. "An excluded class is reported as out of scope, which is not the same as unknown ... or zero." | Rec: report website in_scope; maps_rank, reviews, social_public, search_demand, analytics excluded; booking partly (path shape only). |
| V59 | 40 | "produce a Public Evidence Snapshot, not a Full Official Visibility Score. Give a score range, list the missing data". | Rec: never state a single Official number for SiSi from the local build. |
| V60 | 39.1, 39.2 | Output order: evidence ledger first, then observed / inferred / unknown, then diagnosis in plain language. | Rec: mirror the run's Confirmed / Inference / Assumption labels to these three. |

### A.8 Niche and region layers (titles only; no criteria or weights defined)

The doc lists these as quest titles. It defines no pass condition, weight or Cruciality for any of them. **Confirmed.** Each would need SMART criteria (section 5.4) before it can be scored. Website-relevant titles:

| # | Spec | Titles (spec wording) |
|---|---|---|
| V61 | 21.2 Bar | "Cocktail menu SEO, 'how to find us' page, hidden entrance content, ... event and night atmosphere content, reservation or walk-in rules, ... tourist English page, ... menu seasonality content." |
| V62 | 21.5 Nightclub | "Ticketing setup, guest list flow, ... event calendar, ... table reservation CTA, ... door policy clarity, dress code clarity, late-night hours accuracy, event landing pages, post-event content loop." |
| V63 | 22.2 Europe | "multilingual pages, EU and GDPR basics, ... local-language SEO, English tourist pages." |
| V64 | 20.2 item 12, 13 | Maps playbook: "Website on-page terms plus schema", difficulty 4, relevance lever. Dependencies: `add-structured-data` requires `website-live` and `core-business-info-complete`; `build-local-backlinks` requires `website-live` and `linkable-local-landing-page`. |

**Confirmed (repo).** Two of these titles touch known gaps: no "how to find us", parking or directions page exists in `src/` (grep for "parking" and "parkow" finds nothing), and door policy and dress code copy is limited to one line each on the Terms page (`legal.ts:33-34`) and the reservations page (`pl.ts:329-330`: valid ID, selection, "smart casual"). `docs/B2B.md:75` already lists "Parking and public-transport information" as an unsupplied item. Do not write parking or transport facts without a source (WORKING-RULES: never invent facts).

### A.9 Spec test cases worth mirroring as local checks (section 56)

All are deterministic checks on the output object. Ones a Playwright or Node check on the local build can reproduce:

| Test | Spec statement | Local check (Rec) |
|---|---|---|
| T4 | Website returns noindex: "technical-seo-health 'Indexable' gating criterion fails, quest capped, Critical roadmap item raised." | Run against a production-context build only. |
| T8 | "Reservation CTA broken -> website conversion CTA KPI = 0.00." | Every CTA href resolves and is not `#`. |
| T16, T17 | Five-step external flow lowers friction. No UTMs sets `trackable = false`. | UTM presence check (V41). |
| T20 | Website-only scan: "maps_rank, reviews, and social_public as excluded, not unknown and not zero". | V58. |
| T21 | PageSpeed, robots, sitemap, schema validity unread: "unmeasured (null), listed in unmeasured_fields, not failed; no Technical SEO score is emitted". | S7. |
| T22, T23 | Placeholder content and expired events raise High and the Unfinished-Site flag. | V46, V47. |
| T24 | Menu and hours only via JavaScript fail High. | V49. |
| T25 | Repeated description or footer fails Medium; heading noise fails Medium. | V50, V51. |
| T26 | Generic alt text fails Medium even when present; empty alt on decorative images does not fail. | V52. |
| T27 | CTA found but mobile position not measured: capped 0.50, unmeasured. | V38. |
| T28 | Old template menu URL still indexed fails High. | V54. |

### A.10 Testability summary

Counted over the 57 rated rows in A.1 to A.6 (V01 to V56 plus V36a). A row is Y only if the whole row is testable on the local build; mixed rows are P. **Rec** (my classification).

| Group | Rows | Y | P | N |
|---|---|---|---|---|
| A.1 Core business info | 10 | 1 | 9 | 0 |
| A.2 LLM understandability | 11 | 9 | 2 | 0 |
| A.3 Technical SEO | 10 | 6 | 3 | 1 |
| A.4 Scan inputs | 5 | 2 | 3 | 0 |
| A.5 KPIs | 10 | 3 | 2 | 5 |
| A.6 Content integrity and conflicts | 11 | 6 | 5 | 0 |
| **Total** | **57** | **27** | **24** | **6** |

Not counted: V57 to V60 are reporting rules, not tests. V61 to V64 are quest titles with no pass condition in the spec, so they cannot be scored until criteria are written.

What blocks the N items, in one line each. **Confirmed.** Production `www.sisiwroclaw.pl` is denied by the network policy (`PROGRESS.md`, environment). Third-party requests from tests are forbidden (`WORKING-RULES.md`). Search Console, Google Business Profile, review platforms and social insights need credentials or live network. The Emenago flow cannot be walked without creating a reservation flow on the provider.

### A.11 The "Untitled document" in the VVS folder

Id `1YJ1VlEyI_UWNX_AsFYsauPaNbXOrC_l0ltN61E5TftQ`, created 2026-06-19, 9.8 KB, Polish. **Confirmed.** It proposes an "Actionability & Proof Release" for the engine. It is not about a venue's website. Extracts that matter here:

- Opening paragraph (my translation): the engine had earlier produced "several logical recommendations that were not yet confirmed gaps", and the simple, publicly verifiable quest of answering Google reviews "was not shown first automatically". It names "add parking information" as an example of a task presented as confirmed only because it was not found in a quick read. It later says that for SiSi "answer the overdue Google reviews" would probably win as the fastest confirmed fix. **Inference:** this refers to an earlier public-audit run on SiSi that is not saved in Drive. **Confirmed (repo):** parking information is still absent from the site (A.8).
- Rule 1: `evidence_state` values `confirmed_gap`, `partially_confirmed`, `suspected_gap`, `unknown`, `measurement_needed`. "Only `confirmed_gap` may automatically land in Do now / Confirmed Quick Wins." Closing rule: "The engine cannot present a quest as a confirmed fix if it cannot point to the evidence of the failed criterion. A quest that needs data is a measurement task, not a confirmed repair."
- Rule 8 changes the 18.7 review-response band: `0% replied -> 0.00`, `1-9% -> 0.10`, `10-39% -> 0.30`, `40-69% -> 0.60`, `70-89% -> 0.85`, `90-100% -> 1.00`. Optional quality cap "KPI capped at 0.70" for mass identical replies. This differs from the main spec, which gives 0 to 9% a score of 0.10.
- Review scan policy: up to 50 reviews, check all; above 50, check at least the newest 50; always check 1 and 2 star reviews separately; if not all are read, report a sample response rate.
- Its example object uses 24 visible reviews and 17 unanswered. **Assumption:** illustrative. Do not quote as SiSi's real count.
- **Inference (naming clash, not merged):** the doc calls its proposal "v2.5" and speaks of "v2.4" as current. The main spec "md" is already titled v2.5 (evidence-integrity release) and its roadmap is "v2.6 and beyond". None of the Untitled doc's ten changes appears in the "md" change list (section 54) or roadmap (section 55), and "md" 18.7 still scores 0 to 9% replied as 0.10. Treat it as an unmerged proposal for a later version.

---

## B. Earlier audits and fixes found

None of the four named items exists as its own document. What follows is everything I found that matches them, with status against the current code (`/home/user/sisi-elevate`, branch `sisi-elevate/base`, main e1feb25).

### B.1 VVS audit of the SiSi site

- **Where.** No file. Indirect trace only: the Untitled VVS doc `1YJ1VlEyI_UWNX_AsFYsauPaNbXOrC_l0ltN61E5TftQ` (2026-06-19) and section 54 of "md" (see below). **Confirmed** that no audit report exists in Drive, the repo or GitHub PRs.
- **Findings recoverable.** (1) An earlier engine run suggested "add parking information" without proof; (2) unanswered Google reviews were the simplest public quest and the run did not rank it first; (3) the doc asks for observed, inferred and unknown to be enforced when quests are admitted to "Do now". Source: Untitled doc, opening paragraph and rule 1 (A.11). Whether the earlier run was on SiSi is **Inference**.
- **Inference.** Section 54 of the spec says v2.5 was "built from a real website-only audit of a live venue" and lists findings: an old template menu with Lorem Ipsum and a test phone number still indexed, May dates shown as upcoming in a June scan, JavaScript-only menu, repeated description and reservation heading, alt text "project img", a reservation CTA found but not position-tested, a typo "FRIDAY SESION". The spec does not name the venue. Nothing in the current SiSi build matches these (V30, V46, V47, V48). I cannot tell whether that audit was of SiSi. Do not attribute those findings to SiSi.
- **Status.** Parking: open. Google reviews: off-site, unchecked. Others: not applicable to the current build (Confirmed local build, see A.6).

### B.2 Search and discovery audit, 15 July 2026

- **Source.** `docs/superpowers/specs/2026-07-15-search-indexing-and-canonical-host-design.md` and plan of the same date. Later plan/spec: one-hop redirect, same date. **Confirmed.**
- **Findings.** Every sitemap URL emitted `noindex, nofollow`. Canonical, hreflang, Open Graph, sitemap and JSON-LD used the bare host while `https://sisiwroclaw.pl` redirected to `www`. Bare host took two redirects.
- **Fixed, Confirmed (code).** Canonical origin `https://www.sisiwroclaw.pl`: `site.ts:130` (`BUSINESS.url`), `public/robots.txt:27`, canonical in the local build. Fail-closed indexing: `src/lib/launch.mjs:12-21`. Redirects: `netlify.toml:8-32` (exact roots first, then wildcards).
- **Changed since the spec, Confirmed.** The spec chose "no robots meta on normal production pages". PR #27 (commit 50136df, 2026-09-15) replaced that with an explicit `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` (`launch.mjs:12`).
- **Open.** Production indexability and redirect hops cannot be re-read here (blocked). Search Console inspection and sitemap resubmission were left as owner actions in the spec. `PENDING`: were they done.

### B.3 Search and discovery rerun, 16 July 2026

- **Source.** `docs/superpowers/specs/2026-07-16-non-event-audit-remediation-design.md`, plan of the same date, PR #13 merged 2026-07-16. **Confirmed.**
- **Findings and status.**
  - Summer-Friday popup and seasonal JSON-LD hours: implemented, then removed in PR #20 (2026-09-01) because the closure ended. Files gone: `src/components/Popup.astro`, `src/lib/summer-hours.mjs` (**Confirmed**, `ls` fails). `opening-hours.mjs:1-6` records why.
  - Metadata titles for reservations and careers, seven descriptions over 160 characters: **Confirmed (local build)**, no non-blog description above 156 characters.
  - Czech reservation page discloses the Polish Emenago flow: `src/i18n/ui/cs.ts:315` "Rezervační systém se otevře v polštině.", rendered by `home/Reservations.astro:23-25` with `showLocaleFallback`. Provider language map: `site.ts:15-22` (`cs` falls back to `pl`).
  - Bare-root redirect chain: `netlify.toml:8-32`.
- **Open.** None found in code.

### B.4 GEO and technical-SEO scan, 9 issues (PR #22, 2026-09-01) and checklist audit (PR #27, 2026-09-15)

- **Source.** PR #22 "Add llms.txt, fix meta title/description lengths" and PR #27 "Polish forms, fix Netlify email labels, close SEO and LLM audit gaps" (commit 50136df). The scan report itself is not in the repo or Drive. **Confirmed** (PR text).
- **Findings.** No `llms.txt` (high). Eight Polish pages with title or description length issues (medium). Then stricter checklist gaps: `lastmod` missing in the sitemap, AI crawlers not named in `robots.txt`, no `llms-full.txt`, no snippet-length directives, no `X-Frame-Options`.
- **Fixed, Confirmed (code).**
  - `llms.txt` generated at build: `src/pages/llms.txt.ts:1-11`, `src/lib/llms-map.ts` (PR #24). `llms-full.txt`: `src/pages/llms-full.txt.ts`. Both present in `dist/`.
  - `robots.txt` names 17 AI and search crawlers with `Allow: /`: `public/robots.txt:8-25`.
  - `<lastmod>` on every sitemap URL: `src/pages/sitemap.xml.ts:11-21`.
  - `X-Frame-Options: DENY`: `scripts/generate-headers.mjs:116`.
  - Titles 45 to 50 characters on the eight audited Polish pages (**Confirmed, local build**).
- **Open.** `llms.txt` states the reservation terms (100 zł, Saturday 40 zł) taken from the UI strings, so it inherits the mismatch with the Terms page (see Read this first, item 3).

### B.5 Launch-readiness and security audits

- **Launch hardening (13 July 2026).** `docs/superpowers/specs/2026-07-13-launch-hardening-design.md` and plan. P0/P1 items (JSON-LD escaping, indexing guard, event quality gate, unverified claims removal, accessibility, CSP and headers, Netlify Forms, CI). **Confirmed (code) present:** `src/lib/launch.mjs`, `src/lib/attribution.mjs`, `src/lib/event-quality.mjs`, `src/lib/claims.mjs`, `scripts/generate-headers.mjs`, `scripts/smoke-host.mjs`. Plan checkboxes are all unticked (0 of 61), so the plan file is not a status record. Rec: use `git log` and the gates, not the boxes.
- **Security hardening (16 September 2026).** PRs #30 to #35, combined in PR #36 (commit 0fe32c2): event-sync deploy key isolation, renewed GA consent (key to `-v2`), no client-controlled Netlify subjects, bounded blog image download, event banner variants, PostHog autocapture off with pageviews kept. **Confirmed** (PR bodies, `consent.mjs:9,15-20`, `analytics-init.ts:77`).

### B.6 og:image fix

- **Where.** No fix found. Current state **Confirmed:** `src/layouts/Base.astro:58-64` sets the default `ogImage` to `https://framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.png`. The comment says it is external so the card resolves on every host, and carries `TODO(ignacy): replace with a self-hosted 1200x630 image in /public/og/ once the production domain serves this build.` Built pages carry it: `dist/pl/index.html` and `dist/pl/rezerwacje/index.html`. Blog articles and events pass their own image (`BlogArticlePage.astro:37`, `EventDetailPage.astro:30`).
- **Related, Confirmed.** JSON-LD `image` uses a first-party path for the same picture: `site.ts:132`. Local copy `public/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp` is 1536x1024 (3:2), not the 1200x630 the TODO asks for. The `/public/og/` folder does not exist. The size of the external Framer PNG is unknown (fetching that host is not allowed here).
- **Status.** Open. The reason in the comment (production domain not serving this build) no longer holds: the canonical host is live per the 15 July spec. **Inference.** Rec: make a 1200x630 JPG or PNG from a licensed SiSi photo, place it in `public/og/`, point `Base.astro:64` at it, and add a build check for `og:image` origin and size. No new image is invented here.

### B.7 Consolidated reservation entry point

- **Where.** No document. Closest evidence in the repo. **Confirmed (code).**
  - One base URL and one builder for the provider link: `site.ts:13-14` (`RESERVATION_BASE_URL`), `site.ts:24-26`, `site.ts:35-37` (`reservationUrl(content, locale)`), with `utm_content` naming the CTA location.
  - Callers: home reservations section `Reservations.astro:22` (also rendered as the H1 block of `/pl/rezerwacje/` via `ReservationsPage.astro:21`), event card `EventCard.astro:40`, menu page `MenuPage.astro:205`, event detail `EventDetailPage.astro:66`. All open `emenago.com` in a new tab.
  - Nav and hero CTAs go to the local reservations page: `Nav.astro:18,33,53`, `Hero.astro:10,40`.
  - Structured data `ReserveAction` uses the same destination: `site.ts:237-243`.
- **Drift, Confirmed.** PR #5 (2026-07-14) says the navbar CTA gives "one tap → booking cart" and "Keeps the existing external emenago cart". The code now sends the navbar to `/pl/rezerwacje/` first. So the path from the nav is two steps to the provider. Whether that is intended is `PENDING`.
- **Related note, Inference.** Drive doc "Rezerwacje" `1LYD2BhuQw1lse0wlqQ0fznv8C8ztDpjOjFVs_F9TL5s` (2026-06-22, in the "Pain book" folder of the Served workspace) says, in Polish (my translation): difficulty connecting Google and FB/IG "so that the checkout is in one place right away", "Embedded widgets on the site", and reservations "matched to: Club, Restaurant, Bar". It reads as product notes for Served, not a SiSi design.
- **Open.** `steps_to_book` on Emenago unknown (V40). Czech guests get the Polish flow (`site.ts:16-22`); the provider's `/cs` route "currently renders English, not Czech" per the code comment.

---

## C. Reservation funnel design (consent, RODO, payment)

**Confirmed.** No standalone reservation-funnel design document exists. What follows is assembled from `docs/superpowers/specs/2026-07-24-posthog-analytics-design.md` (the design), PR #14, #15, #20, #31, #32, #36 (what changed), and the current code. Where spec and code differ, code is stated and the spec line is quoted.

### C.1 Funnel shape

| Step | Decision | Source | Label |
|---|---|---|---|
| Entry | Anonymous `$pageview`. Kept on after PR #32 tried to disable it; PR #36 restored it because "the Conversions dashboard funnels start at `$pageview`". | spec, PR #36 | Confirmed |
| CTA click | `reservation_cta_click` for any link whose host is `emenago.com` or a subdomain. Context: `page`, `cta_location` (from `utm_content`, else nearest section id). | `conversion-events.ts:16-37` | Confirmed (code) |
| Other conversions | `phone_click` (`tel:`), `email_click` (`mailto:`), `enquiry_submit`, `enquiry_success` (B2B and private-events Netlify forms, `form` name only). | `analytics.ts`, `event-enquiry-form.ts`, spec | Confirmed |
| Out of scope | Event detail views and ticket clicks; `locale_change`; identify calls; server-side tracking. | spec "Out of scope (v1)" | Confirmed |
| Booking completion | Happens on `emenago.com`. The site sees no confirmation. | code | Inference |
| Dashboard setup | Enable replay, mark the events, build funnels `$pageview` to `reservation_cta_click` and `$pageview` to `enquiry_submit` to `enquiry_success`. Post-merge task. | plan Task 10 | PENDING: PostHog is not connected here; not verifiable |
| Analytics caveat | "non-consenting visitors are counted with per-pageview anonymous ids (no storage), so unique-visitor counts overcount". | PR #14 body | Confirmed |

### C.2 Consent decisions (exact)

From the PostHog spec, checked against code:

1. **Hybrid model.** Anonymous, memory-only events for everyone. Session recording and persistent storage only after explicit Accept. Confirmed (`analytics-init.ts:73-80`: `persistence: 'memory'`, `disable_session_recording: true`).
2. **Banner.** Two buttons, Accept and Decline, `role="dialog"`. Polish copy: "Za Twoją zgodą używamy analityki PostHog i Google Analytics (statystyki odwiedzin i nagrania sesji) ... Bez zgody zbieramy wyłącznie anonimowe statystyki, bez zapisu w pamięci przeglądarki." Buttons "Zgadzam się" / "Odmawiam". Confirmed (`pl.ts:120-128`).
3. **Storage.** `localStorage` key `sisi-analytics-consent-v2`, values `granted` or `denied`. Confirmed (`consent.mjs:9-11`). The spec names `sisi-analytics-consent`; that key is now a legacy record that is removed on load (`consent.mjs:15-20`, PR #31). Returning visitors saw the banner again.
4. **Banned literals.** Consent values may not be `accepted` or `rejected` in built first-party JS; `sessionStorage` is banned in `src/` except the disclosure text in `legal.ts`. Confirmed (spec, plan constraints; enforced by `scripts/launch.test.mjs` and `scripts/check-build.mjs` per the spec).
5. **Decline or ignore.** Stays memory-only anonymous; recording never starts. Withdrawal: control on the cookie-policy page stores `denied`, stops recording, reverts to memory persistence, calls `posthog.reset()`. Confirmed (spec; `analytics-init.ts:59-67,85-92`).
6. **Google Analytics 4** (`G-ZNZDE3DTGP`, added in PR #20): loads only on consent, as a same-origin module; CSP names `googletagmanager.com` and Google collectors; withdrawal sets `ga-disable` and deletes `_ga*` cookies. Confirmed (`src/scripts/ga-init.ts`, `generate-headers.mjs:96-106`).
7. **Transport.** posthog-js `no-external` build; `/ph` reverse proxy in `netlify.toml`. Confirmed (`netlify.toml:75-80`, `analytics-init.ts:73`).
8. **Attribution capture (launch hardening).** Only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`; bounded length; others dropped. Confirmed (spec).
9. **Autocapture.** Spec: "left on". Code: `autocapture: false`. Confirmed (`analytics-init.ts:77`, PR #36).
10. **Forms.** Netlify Forms with a required consent checkbox linking the privacy policy. B2B: `B2BEnquiryForm.astro:167-169`; consent text `pl.ts:579`: "Wyrażam zgodę na kontakt w sprawie mojego zapytania i potwierdzam zapoznanie się z Polityką prywatności." Confirmed (code). Client sends no names, emails, phones, company names or message bodies to analytics (`docs/B2B.md:33-35`).

### C.3 RODO decisions in the published policies

Confirmed (`src/i18n/legal.ts`, Polish privacy policy, lines 91-165; English mirror from about line 285):

- Controller: Rzeźnicza 32 Sp. z o.o. (registry details in the policy).
- Table reservations: name, surname, phone, email, reservation data. Basis art. 6(1)(b). Contact: art. 6(1)(f). Corporate events: 6(1)(b) and (f). Recruitment 6(1)(a) and (b). Tax 6(1)(c). Claims 6(1)(f). CCTV 6(1)(f).
- Analytics: consent 6(1)(a) for storage and recordings; "anonimowe statystyki bez zapisu w przeglądarce: prawnie uzasadniony interes - art. 6 ust. 1 lit. f" (`legal.ts:107`).
- Recipients: "dostawcy systemu rezerwacji online (operator zewnętrznego systemu rezerwacji)" (`legal.ts:114`). The provider is not named.
- Retention: reservation and enquiry data "przez czas niezbędny do obsługi oraz do upływu terminów przedawnienia"; billing 5 years; CCTV up to 3 months (`legal.ts:121-127`).
- Cookie policy lists `ph_..._posthog` (localStorage and cookie, up to 365 days), PostHog sessionStorage entries, `_ga` and `_ga_G-ZNZDE3DTGP` (up to 2 years; "Google LLC może przetwarzać te dane poza EOG") (`legal.ts:196-198`).
- Transfers: generic safeguard sentence (`legal.ts:158`).

### C.4 Payment decisions

- **Confirmed (code).** The site takes no payment. No payment library in `package.json` (dependencies: `astro`, `posthog-js`). Payment and deposit happen in the external system. The site states: "Warunkiem potwierdzenia rezerwacji jest przedpłata." (`pl.ts:337`, `legal.ts:43`).
- **Terms shown to guests, Confirmed (code, `pl.ts:206`, `pl.ts:325-328`):** reservation 100 zł per person, usable at the table; Friday entry with reservation free; Saturday extra entry 40 zł per person; pickup 22:00-23:00; late by more than 30 minutes may release the table; guests refused at the door get the paid amount back.
- **History of the fee text, Confirmed (PRs).** #16 (2026-08-10) lowered it to 40 zł by mistake. #17 restored 50 zł and set Saturday to 40 zł. Commit 453c6ad (PR #26, 2026-09-14) set 100 zł. PR #22 (2026-09-01) still says 50 zł. The current 100 zł figure has no source note in the repo. **Assumption:** it is an intentional owner change. `PENDING`: confirm 100 zł.
- **Banned claim.** "120 minut" (prepayment window) is on the banned list (`claims.mjs`); do not reintroduce it.

### C.5 Open items for the funnel

| # | Item | Label |
|---|---|---|
| 1 | Terms page says Saturday 30 zł and pickup 22:00-23:30 (`legal.ts:42,44`; EN `241,243`); UI says 40 zł and 22:00-23:00. Fix needs Ignacy's number. | Confirmed, PENDING |
| 2 | Cookie-policy meta description still says "pamięć niezbędna do zamknięcia komunikatów oraz obsługi formularzy i nawigacji" (`pl.ts:74`, also in `llms.txt`), while the page now covers analytics. PR #14 named this as a follow-up. | Confirmed |
| 3 | No retention period is stated for analytics session recordings or PostHog data. The spec required "recording retention". `grep` of `legal.ts` finds only CCTV 3 months. | Confirmed |
| 4 | The reservation provider is unnamed in the privacy policy. Naming it (and its own privacy notice link) is a legal-copy decision. | Rec |
| 5 | Legal basis for cookieless anonymous pageview capture is stated as legitimate interest. No lawyer review is recorded anywhere. `README.md:72-73` and `docs/I18N.md:69-71` say legal copy needs review by a Polish-qualified lawyer. | Confirmed (no review recorded); legal conclusion is `PENDING` |
| 6 | de, it, cs legal pages show the English text under a "convenience translation" banner. Professional translations are a TODO (`docs/I18N.md:66-71`). | Confirmed |
| 7 | GA transfer outside the EEA is disclosed in one sentence. Whether that is sufficient is a legal question. | Assumption, PENDING |
| 8 | Emenago `/cs` flow renders English, so Czech guests see the Polish flow (`site.ts:16-22`); only a one-line note discloses it. | Confirmed |
| 9 | Funnel cannot see completed bookings. A provider-side confirmation event or a thank-you return URL would be needed. | Inference; Rec: ask the provider what it exposes |
| 10 | PostHog dashboard and funnel setup (plan Task 10) cannot be verified here. | PENDING |

---

## D. Repo docs digest

Format: Decision. Done. Open. Do not contradict. Plan checkboxes in all six plans are unticked (61, 15, 30, 27, 40, 52 open boxes), so "done" below comes from code, `git log --all` (53 commits, shallow) and PRs #1 to #36, not from the boxes. **Confirmed.**

### D.1 Launch hardening (spec + plan, 2026-07-13)

- **Decision.** Focused hardening release on the static Astro and Netlify build. No redesign, no invented content, no DNS changes by the agent.
- **Done (Confirmed, code).** HTML-safe JSON-LD, fail-closed indexing, event-quality gate with an intentionally empty lineup, removal of unverified claims, accessibility fixes, CSP and header generation, attribution allowlist, Node 22 CI, smoke script.
- **Open.** DNS cutover and Netlify notification recipient were owner actions; the canonical host is later described as live (15 July spec). Whether branch protection and forms notifications were completed is not recorded in the repo. `PENDING`.
- **Do not contradict.** No claim that counsel approved legal text. Removed as unverified: 21+ and age rules, 120-minute prepayment, best-effort coordinates. Later re-verified by the owner: 663 m2 (2026-07-14) and the building coordinates (PR #11, 2026-07-16). Keep `claims.mjs` bans.
- **Consent and RODO decisions here.** Cookie UI is an essential-storage notice, dismiss-only, because there was no optional processing: "If optional processing is introduced later, a distinct consent model will require its own design." Campaign attribution is limited to the five `utm_*` keys. English fallback legal bodies on de, it, cs are wrapped in `lang="en"`. Legal pages state controlling language and convenience translation. Superseded by the PostHog design for analytics (D.7). Open legal questions carried from here and D.7: C.5 items 3 to 7.

### D.2 Menu availability and volume corrections (spec, 2026-07-15)

- **Decision.** Keep the wine table; make `glassPrice` optional; show an em dash in the 150 ml column for bottle-only wines.
- **Done (Confirmed, code).** Only Halka (37 zł) and Triada (40 zł) have a glass price (`bar-menu.ts:92,97`). Ostoya Black 700 ml 289 zł (`:319`), Chivas Crystal 700 ml 379 zł (`:326`). Volume additions for soft drinks not spot-checked.
- **Open.** None.
- **Do not contradict.** Exactly two wines by the glass: Halka and Triada. The two bottle-service prices above.

### D.3 One-hop canonical host redirect (spec + plan, 2026-07-15)

- **Decision.** Two forced domain rules in `netlify.toml` send `http://` and `https://sisiwroclaw.pl/*` to `https://www.sisiwroclaw.pl/:splat` in one 301. No Edge Function; no DNS change.
- **Done (Confirmed, code).** `netlify.toml:21-32`, now preceded by exact-root rules (`:8-20`) from the 16 July work.
- **Open.** Production redirect hop count cannot be re-read here.
- **Do not contradict.** Canonical origin is exactly `https://www.sisiwroclaw.pl`. Direct `www` requests are untouched.

### D.4 Search indexing and canonical host (spec + plan, 2026-07-15)

- **Decision.** `www` is canonical. Only canonical production is indexable. Previews, branch deploys, malformed builds, the fallback root and 404 stay non-indexable. Fail-closed guard retained.
- **Done (Confirmed, code).** `launch.mjs:12-21`; every first-party URL uses `www`.
- **Open.** Search Console inspection and sitemap resubmission (owner actions). Spec said normal pages omit the robots tag; PR #27 replaced that with an explicit directive, so the spec line is stale.
- **Do not contradict.** Local and preview builds must remain `noindex, nofollow`. This is why the local build cannot show production indexability.

### D.5 Desktop header spacing and slim private events (spec + plan, 2026-07-16)

- **Decision.** Nav width 1120px, link gap 32px, CTA gap 40px, compact layout at 1100px and below. Private-events page reduced to hero, occasion cards, pricing note, form. FAQ and secondary CTA removed. Optional `space` and `duration` form fields removed.
- **Done (Confirmed, code).** `global.css:139` (`min(1120px, ...)`), `global.css:469` (1100px breakpoint); private-events components are the four listed (`src/components/private-events/`). PR #12 merged.
- **Open.** None.
- **Do not contradict.** No prices, minimum spend, capacities, service promises, testimonials or policies on the private page. Polish form intro: "Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję."

### D.6 Non-event search-audit remediation (spec + plan, 2026-07-16)

- **Decision.** Time-bounded summer-Friday popup, seasonal hours in JSON-LD, metadata refinements, Czech Emenago fallback note, bare-root redirect reduction.
- **Done (Confirmed).** All shipped in PR #13. The popup and seasonal hours were removed in PR #20 after the closure ended. Remaining: titles, descriptions, Czech note, redirects (B.3).
- **Open.** None in code.
- **Do not contradict.** "The permanent operating schedule remains Friday-Saturday, 22:00-04:00." The closure ran "through 28 August 2026 inclusive" and is over. Approved Polish popup copy is no longer on the site; do not restore it. The spec approved the titles "Rezerwacja stolika - SiSi Wrocław" and "Praca i kariera - SiSi Wrocław". PR #22 (2026-09-01) later rewrote them for length. **Confirmed (local build):** the built titles are "Rezerwacja stolika w SiSi Wrocław - klub muzyczny" (49 characters) and "Praca w klubie SiSi Wrocław - dołącz do zespołu" (47), written with an en dash on the site. **Assumption:** the built titles are current, because Ignacy merged #22 after the spec.

### D.7 PostHog analytics and session recording (spec + plan, 2026-07-24)

- **Decision.** PostHog EU cloud, dedicated project 231773 "SiSi Wrocław". Conversions: reservation CTA click, enquiry submit and success, tel and mail clicks. Hybrid consent (C.2). npm-bundled `posthog-js` no-external build behind `/ph` proxy. CSP "hard-locked".
- **Done (Confirmed).** PR #14 (2026-07-24), token swap PR #15. Legal pl and en, banner in five locales, withdraw control, gates.
- **Drift from the spec (all Confirmed, code or PR).** Consent key is `sisi-analytics-consent-v2` (PR #31, in #36). Autocapture is off (PR #36). Google Analytics 4 added behind the same consent (PR #20), so the CSP now names Google hosts (`generate-headers.mjs:96-106`) and the spec statements "CSP byte-identical" and "no third-party hosts in CSP" no longer hold. Posthog loads after `load` and idle, not at boot (`analytics-init.ts:11-24`). The spec's "cookie/privacy policy currently states no analytics storage" is outdated.
- **Open.** See C.5 (recording retention, stale cookie meta, lawyer review, PostHog dashboard setup). The spec's rule that retention values be "pinned to current PostHog-documented values during implementation" was not carried into the policy text.
- **Do not contradict.** Analytics beyond essential storage only after Accept. No PII in events. `sessionStorage` not used by first-party code. No `accepted` or `rejected` literals.

### D.8 `docs/B2B.md`

- **Decision.** Corporate-events page with a Netlify Forms enquiry (`b2b-enquiry`), case studies only when `published: true`.
- **Done.** Facts in `VENUE_FACTS`: 663 m2 (owner-verified 2026-07-14), up to 150 seated at The Cork only, up to 500 standing (buffet), 2 presentation screens (`site.ts:119-124`). Case studies: none published.
- **Open (TODO, unsupplied).** 14 checklist items: client names and logos with permission, project years and photos, attendee numbers, testimonials, equipment beyond 2 screens, room capacities, accessibility details, parking and transport, catering packages, pricing or response-time policy, whether The Cork hours affect midweek availability (`B2B.md:63-78`).
- **Do not contradict.** "always scope the 150 to The Cork; never imply SiSi itself seats 150." No invented clients, awards, prices or accessibility features.

### D.9 `docs/I18N.md`

- **Decision.** Five locales (pl source, en, de, it, cs), statically generated, locale-prefixed translated slugs, typed dictionaries, legal copy in `legal.ts`.
- **Done.** UI, home, events, menu, careers, reservations, contact and B2B in all five. Legal pages in pl and en.
- **Open.** TODO: professional legal translations for de, it, cs; lawyer review of all legal copy (`I18N.md:66-71`).
- **Do not contradict.** Polish is the fallback. Event times stored as ISO strings; never hand-write weekday names.

### D.10 `docs/BLOG.md`

- **Decision.** BabyLoveGrowth API synced hourly by GitHub Action into `articles.generated.ts` and `public/blog/`; gated by `npm test`; single-language articles; sanitised HTML; unverified claims skipped.
- **Done.** Confirmed (local build): `dist/pl/blog` holds 32 entries (article folders plus the hub page); `dist/en`, `de`, `it`, `cs` each hold only a hub page under `blog/` and no articles. PR #19 merged 2026-09-01.
- **Open.** Secrets `BABYLOVEGROWTH_API_KEY`, `EVENT_SYNC_DEPLOY_KEY`, `NETLIFY_DEPLOY_HOOK` are repository settings I cannot see. Translated article sets are `PENDING` in BabyLoveGrowth.
- **Do not contradict.** Articles carrying banned claims are skipped (`claims.mjs`). Note the bar for blog copy: it must not state age or timing claims.

### D.11 `docs/BACKDROP.md`

- **Decision.** One worker-driven `<canvas>` replaces eight animated CSS layers; static SVG tiles are the no-JS and reduced-motion fallback; motion starts after load and idle.
- **Done.** Design shipped (PR #23, merged 2026-09-14). Measurements in the doc predate the #25 hero and menu redesign and are described as such.
- **Open.** Real-display frame rate check (`npm run perf:backdrop -- --headed`) needs a GPU; not possible here.
- **Do not contradict.** Sandbox numbers are software-compositor lower bounds, not a benchmark of the current site.

### D.12 Other docs

- **`docs/icon-sources.md`.** Icon provenance and licences (Lucide, Simple Icons). Done. Licence files under `public/licenses/`.
- **`TODOS.md`.** Two deferred items. (1) Decide whether event titles and notes are localized per locale (owner's product call; events are Polish-only today). (2) Replace the long-lived Google service-account key in GitHub Actions with Workload Identity Federation. Both open.
- **`README.md`.** Astro 7, Node 22.12 or newer; legal copy "needs professional legal review before being relied upon" (`README.md:72-73`).
- **`.design-sync/`.** Design system notes: background `#27060f`, panel `#34101a`, gold `#fbd295`, fonts Cal Sans and Montserrat, headings mostly uppercase. Uploaded to Claude Design project `f6f3fb04-029d-4c53-81b9-fbb37e098efb`.

### D.13 Claims the run must not contradict (one list)

| Claim | Source | Label |
|---|---|---|
| Canonical origin `https://www.sisiwroclaw.pl` | `site.ts:130`; D.3, D.4 | Confirmed |
| Hours: Friday and Saturday 22:00-04:00; the summer Friday closure ended 28 August 2026 inclusive | `opening-hours.mjs`; D.6; PR #20 | Confirmed |
| Tagline "Serce Wrocławia bije w SiSi"; brand colour `#27060f` | WORKING-RULES; `.design-sync/conventions.md` | Confirmed |
| Five locales pl, en, de, it, cs; Polish is primary | `I18N.md` | Confirmed |
| 663 m2, 150 seated at The Cork only, 500 standing, 2 screens | `B2B.md:11-17` | Confirmed |
| Building coordinates 51.1106472, 17.0279287 (verified 2026-07-16) | `site.ts:140-141`, PR #11 | Confirmed |
| Reservation 100 zł per person; Friday entry with reservation free; Saturday +40 zł; pickup 22:00-23:00 | `pl.ts:325-328` | Confirmed (UI); Terms page conflicts (C.5) |
| Only Halka and Triada by the glass; Ostoya Black 700 ml 289 zł; Chivas Crystal 700 ml 379 zł | `bar-menu.ts` | Confirmed |
| No age policy claim (21+), no "120 minut", no InStock offer, no geo meta tags | `claims.mjs:13-25` | Confirmed |
| Events list empty; no invented lineup | `events.generated.ts:5` | Confirmed |
| Analytics beyond essential storage only after Accept; key `sisi-analytics-consent-v2` | `consent.mjs:9`; `analytics-init.ts` | Confirmed |
| Emenago `/cs` renders English; Czech guests get the Polish flow | `site.ts:16-22` | Confirmed |
| Private-events page carries no prices, capacities or policies | D.5 | Confirmed |
| No claim that a lawyer approved the legal text | D.1 | Confirmed |
| Fonts self-hosted | WORKING-RULES | Confirmed |

---

## E. Files considered and skipped

Privacy rule applied: no spreadsheet that could hold company financials, payouts or guest data was opened or quoted. No number from any of them is imported.

| File | ID | Why skipped | Opened? |
|---|---|---|---|
| "SiSi,TheCork,R32" (spreadsheet) | `1wvkiVb8oE8f_tMYri2sGNlmjSt5bC2Duv4_HKt9cA4Y` | Title names three companies; Inference: inter-company money. Financial. | No |
| "TheCork-SiSi" (spreadsheet) | `1UELtyarh62JO7mzdlMtAUurw9mpBgUx11OB3QuwhEXk` | Same reason. | No |
| "CHECKLISTA-SiSi" (spreadsheet) | `1FaoPDq6XS_e3QhBGQFu_MKrsJ7IfHL9CFt7DQn0aSss` | Operations checklist, not the website. | No |
| "REZERWACJE" (spreadsheet, 2023) | `1anOjAy_FZNraleQVJExUU0gNwXI0vVnZICk1ANSkFkI` | Likely reservation records with guest data. | No |
| "Untitled spreadsheet" | `1cQp9p-5y6gH7APKssmAKo8O6WjWowKEFeab8bSFyMRE` | The only file whose full text matched "Emenago". Created 2026-05-19 13:41, about 27 minutes before the reservation-import prompt below. Inference: an export of reservations with guest data and deposits. Ask Ignacy if it holds anything about the funnel. | No |
| "Pricing" (spreadsheet) | `1rVMXQAEYZJZBo92Q6DjX1Pfn2rhWBHoxqQNhGCrMlP4` | Served product pricing, not SiSi. | No |
| "Umowa - Draft .docx" | `1aon_bMjaQDnkQQDhFKPc0YnIMTlnjxhZ` | Contract draft; matched "RODO". | No |
| "REGULAMIN wydarzenia .docx" | `1AzczJgsnZfzJcrtCHCcyQNKzweQIz-Ia` | Event terms drafted by a partner; matched "RODO". The site Terms live in `legal.ts`. | No |
| "stary_szablon" | `14DRy4FJQotO_m6VDxgb7iG_gxEjUceePi03gbkifkec` | Sibling of "Szablon" below. | No |
| "Szablon" | `1GE04A___6VPk1vLtWx_ZQJw-CCfuvmWAeWsabn4_Ny0` | Title was unclear, so I opened it. It is a venue-hire contract template with commercial terms and a bank account. Nothing quoted, nothing imported. | Yes (in error); nothing kept |
| "Oświadczenie ... .pdf", "Personal data form_copy.pdf" | `1t4IBhdznH3ueMDmUW0tUdLtsE-Q8rPHY`, `1tFB_est4bJsqKgx7QUuw84P6sJAgAy2o` | Personal forms, unrelated. | No |
| "Rezerwacje, dopisek do AI" | `1W2Rzbmg5yA-dC5HkEPAiP2r7w6okdoo0qJAtW62pzxo` | A prompt to import reservation data into a Notion database (columns include guest email, phone, deposit, payment status; a seat-zone map). Operational, contains guest fields. Nothing imported. Inference: Notion was used for reservation admin. | Yes (short) |
| "Rezerwacje" | `1LYD2BhuQw1lse0wlqQ0fznv8C8ztDpjOjFVs_F9TL5s` | Served product notes. Summarised in B.7 as related context only. | Yes |
| Served workspace: "Strategic Definitions", "Functionality", "Stripe_EFQM_Diagnostics", "Served Onboarding Survey", "How should venues be onboarded to Served?", "Survey Heuristic Evaluation.pdf", "Served Design System.zip", folders "Pain book", "Definitions", "CRM", "Logotypy" | various, parent `1ttbkJdrNvRvCzSGqoQIWZgJOfYb-MEow` | Another product (Served). Not SiSi. | No |
| Menu, staff and brand print files: "Menu Sisi" (2 copies), "Menu SiSi" `1VhEouPDw53u0IqPM6ZIGZyxHLgrW6AqLMpYHAeV96Lw`, "Sisi, bev menu", "Manual klasyki", "QR.docx", "1. Sisi_service", "Piątek - SiSi", "Check Lista SISI", "Jedznie SiSi", "KOMPENDIUM-sisi", "Kompedium_dla_kelnerek.pdf", "Gotowe_kompedium.pdf", "RYTULAL.pdf", "1. Przewodnik", "SiSi" (36 MB doc) `18t2BjMZoJBnoilzR5umPdWAX83t4mxMxFb3sQhl_8f8`, "SiSi_ELEMENTS_Full_Menu_Recipe_Service_Deck.docx", "SiSi_bilingual_bar_menu_PL_EN.docx", "SISI_OFFER.pdf", "R32_OFFER.pdf", "THE CORK_OFFER.pdf", "A3_fold_MENU_SISI.pdf" | folders `1YMsy1PtxIF6J9-xvg0fm-rQKnNpArm4C` (Docelowe, Robocze) and others | Menu, staff training, print and offers. Not website audits. The site menu comes from `src/data/bar-menu.ts` and `food-menu.ts`. Rec: name a file if you want brand voice taken from it. | No |
| Folders "Ads & Funnels" `1Qq48kDes7mpBNHs74pT3M419zY3PvJ1b` and "Website Content" `1lVxaDrskicCU79VGWI8S-q9JtkTUjn_m`; "WebSite1" `1LtmouYcMbPMKXard2fziZZP_RLobAvdS` | under "5_MARKETING" `1DoCpS1UbZJMax_S3XnkkrG8FKjFV7xnd` in the Served tree | The first two are empty (listing returned no children). "WebSite1" holds 2024 IIS default files and small images. The title match on "funnel" pulled in these and the Served documents above. | Listed only |
| Logo files SISI_black/white (.svg .png .ai .pdf) | folder "LOGA SISI / R32" `1mi_Wk6I2LIY6BcrjzBdh4PGN_mnR0rMq` | Assets, not analysis. | No |
| Shared folder "sisiwroclaw.pl" | `1e9_WXCxRjynF-4UoBCITEjVMbji92X8N` (owner artur@zalwertart.com) | Listed subfolders "Surowe 2", "Surowce" (GOTOWE, Fonts), "Materiały weekend 26-27", "Video reklama koncerty". They hold raw video, fonts (one TTF), dated deliverables. No audit or funnel document. | Listed only |
| "17-07-2026.png" | `1tHGyRVbeINFntLNKA0qHMOP5V4dhkb5V` | Poster for Saturday 18/07 (text via Drive: "MOON OVER AFRICA", "SOBOTA 18/07", "START: 22:00"). It is the only file whose text matched "sisiwroclaw". Past event; not imported. | Yes (text only) |
| "onepage_sisi.pdf" | `10zN2q3QEWamM0GRlPWua9eEk8jYt8nsr` | Drive returned only "onepage.cdr" (vector art, no text). | Yes, no content |
| Notion | n/a | Not connected in this environment. Nothing searched. | n/a |
| PostHog dashboards, Search Console, Google Business Profile | n/a | No connector here. | n/a |

---

## F. Not found

1. VVS audit report of the SiSi website. Searched: Drive full text for "VVS", "funnel", "og:image", "Booking Path", "consent", "payment", "sisiwroclaw", "RODO", "Emenago"; Drive titles for "audit", "SEO", "llms", "GEO", "website", "landing", "sisi", "rezerwac", "reservation", "zgod", "RODO", "GDPR", "polityka", "funnel", "Booking Path", "Emenago", "Served"; the VVS folder (2 files only: "md" and "Untitled document"); repo docs; git log; titles of all 36 GitHub pull requests and bodies of 13 of them (#5, #11, #14, #16, #17, #20, #22, #24, #27, #29, #31, #32, #36). One combined full-text query ("VVS audit" or "reservation funnel" or "Booking Path") returned an error from the Drive connector, so those phrases were searched one at a time as listed. Only the indirect traces in B.1.
2. og:image fix. No commit, PR or document. `git log --all --grep` for "og:image", "og-image" returns nothing; PR search returns nothing. The fix is still open (B.6).
3. Consolidated reservation entry point design. No document. Only code evidence (B.7).
4. Reservation funnel design covering consent, RODO and payment. No document. Assembled from the PostHog spec and code (section C).
5. Any Drive or repo text mentioning "Booking Path" other than the VVS spec. Search found "md" and unrelated Served documents.
6. Any record of a lawyer's review of the Terms, Privacy or Cookie text.
7. Any source for the 100 zł reservation fee or for the Terms page values (30 zł, 23:30).
8. Git history before 2026-09-05 in this checkout (shallow clone). The July specs and plans exist as files, but the commits that made them are not in the local log. GitHub PRs #1 to #36 cover 2026-07-14 to 2026-09-16.
9. Anything in Notion.
10. Production evidence of any kind (host blocked).
