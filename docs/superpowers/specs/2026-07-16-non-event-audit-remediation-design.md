# Non-event search-audit remediation design

Date: 16 July 2026

Status: approved design, implementation not started

## Objective

Close the truthful, repository-controlled findings from the 16 July search and discovery rerun without doing event work, inventing operational facts, broadening the recently slimmed private-events page, or introducing an analytics/privacy change.

The permanent operating schedule remains Friday-Saturday, 22:00-04:00. During the current summer exception, SiSi is closed on Fridays through 28 August 2026 inclusive.

## In scope

1. Restore a localized, time-bounded summer-Friday closure popup.
2. Keep the permanent Friday-Saturday schedule visible while representing the temporary exception accurately in structured data.
3. Sequence the popup and essential-storage notice so visitors never receive two simultaneous overlays.
4. Update the essential-storage disclosure for the popup dismissal record.
5. Refine metadata only on real search-intent pages and shorten the seven audit-identified long descriptions.
6. Disclose the Polish Emenago fallback on the Czech reservation page.
7. Reduce the bare-domain root redirect chain as far as Netlify routing permits.
8. Add regression coverage and complete production verification.

## Explicitly out of scope

- Event hubs, event detail pages, Event or MusicEvent schema, and event distribution.
- Analytics, tag managers, pixels, conversion instrumentation, or consent-management changes beyond disclosing the strictly necessary popup-dismissal record.
- Google Search Console, Google Business Profile, Tripadvisor, city-calendar, review-request, or citation-account actions.
- New dress-code, age, accessibility, admission, capacity, testimonial, case-study, floor-plan, or visitor-guide claims.
- Bulk expansion of legal, contact, career, or other short utility pages.
- Re-expanding the private-events page or restoring the removed private FAQ.
- `llms.txt`, low-value title padding, and minor unused-CSS work.

## Approved Polish copy

### Summer notice

- Eyebrow: `Wakacyjne godziny`
- Message: `W wakacje SiSi jest zamknięte w piątki — do 28 sierpnia 2026 r. włącznie.`
- Confirmation button: `Rozumiem`
- Close-button label: `Zamknij`

### Essential-storage notice

`Ta strona przechowuje wyłącznie informacje o zamknięciu komunikatów oraz niezbędny stan formularzy i nawigacji. Szczegóły znajdziesz w {cookies} oraz {privacy}.`

The Polish cookie policy will identify the new record precisely:

`sisi-summer-fri-2026-dismissed (localStorage) - przechowuje wyłącznie wartość "dismissed", aby nie wyświetlać ponownie komunikatu o wakacyjnym zamknięciu w piątki. Wpis jest usuwany po 28 sierpnia 2026 r.`

Equivalent, natural translations will be supplied autonomously for English, German, Italian, and Czech. They must preserve the same date and meaning.

### Search metadata

- Reservations title: `Rezerwacja stolika – SiSi Wrocław`
- Careers title: `Praca i kariera – SiSi Wrocław`
- Corporate-events description: `Eventy firmowe w centrum Wrocławia: konferencje, prezentacje, kolacje i networking. 663 m², do 150 miejsc w The Cork i 2 ekrany.`

Equivalent localized titles will be used for reservations and careers. The seven descriptions identified by the audit as exceeding 160 characters will be shortened without adding facts:

- Polish corporate events.
- English corporate events.
- German corporate events and private events.
- Italian corporate events and private events.
- Czech corporate events.

Utility and legal titles will remain concise rather than being padded to an arbitrary length.

### Czech reservation fallback

`Rezervační systém se otevře v polštině.`

This sentence appears beside the external Emenago handoff only on the Czech reservation page.

## Seasonal-hours truth model

### Visible content

Permanent navigation, footer, reservation information, and general descriptive copy continue to say Friday-Saturday, 22:00-04:00. The temporary popup supplies the current exception.

The popup is eligible from deployment until 29 August 2026 at 00:00 Europe/Warsaw. The cutoff is represented as an absolute timestamp so a visitor's device timezone cannot extend or shorten the notice.

### Structured data

Only the SiSi `NightClub` entity receives the seasonal exception; the enclosing R32 `EventVenue` entity must not inherit club-specific closure hours.

The `openingHoursSpecification` entries will represent:

- Saturday, 22:00-04:00, without date bounds.
- Friday closed all day, expressed as 00:00-00:00, from 17 July through 28 August 2026 inclusive.
- Friday, 22:00-04:00, valid from 29 August 2026 onward.

This keeps the future Friday schedule machine-readable without asserting that SiSi is open on the remaining closed summer Fridays. Google documents `validFrom` and `validThrough` for seasonal hours and 00:00-00:00 for a closed day: <https://developers.google.com/search/docs/appearance/structured-data/local-business>.

## Notice architecture and behavior

The existing localized popup component will be restored site-wide with a season-specific dismissal key: `sisi-summer-fri-2026-dismissed`. One dismissal suppresses it across all locale routes in that browser for the remainder of the 2026 summer window.

The popup and `CookieBanner` remain separate components, but use a small explicit readiness handshake:

1. The summer notice evaluates its fixed cutoff and dismissal state.
2. If eligible and not dismissed, it opens after the first page paint.
3. The essential-storage notice remains hidden while the popup is open.
4. Closing the popup stores `dismissed`, returns focus, and releases the essential-storage notice.
5. If the popup is expired or already dismissed, the essential-storage notice follows its normal behavior immediately.
6. On or after the cutoff, the popup never opens and its expired storage record is removed.

The popup remains progressively enhanced: without JavaScript it stays hidden and cannot block navigation. If localStorage is unavailable, it can still be closed for the current page but may reappear after navigation. It supports Escape, keyboard focus containment and restoration, descriptive labels, reduced motion, and a close button in addition to the confirmation button.

No analytics or marketing storage is introduced.

## Redirect design

Exact root rules will precede wildcard domain rules so HTTPS bare-domain root traffic goes directly to the final Polish homepage:

`https://sisiwroclaw.pl/` -> `https://www.sisiwroclaw.pl/pl/`

Equivalent HTTP root intent will be declared, but Netlify's automatic HTTP-to-HTTPS upgrade may still run before repository redirect rules. The acceptance target is therefore:

- HTTPS bare root: exactly one redirect to the final homepage.
- HTTP bare root: no more than two redirects, with no avoidable final `/` to `/pl/` hop.
- Every sitemap URL: direct HTTP 200 on the final `https://www` host.
- Locale paths: preserved by existing wildcard rules.

## Failure handling

- An invalid or missing seasonal cutoff must fail closed by keeping the popup hidden; it must not produce a permanent warning.
- Structured-data tests must reject a missing Saturday schedule, an open summer Friday, or a Friday reopening date that overlaps the closure window.
- The site remains usable if browser storage throws or is disabled.
- Existing host-aware indexing protection must remain unchanged.
- If deployed redirect behavior differs from the repository-controlled target, do not add speculative redirect loops; report the Netlify-controlled hop separately.

## Verification and acceptance

All project verification runs under Node 22.12.0.

### Automated checks

- Localized popup copy and the exact 2026 cutoff render on all five locales.
- Popup dismissal, Escape behavior, focus handling, notice sequencing, storage failure, and post-cutoff suppression work.
- Only the declared necessary storage keys appear in executable output and legal disclosure.
- Rendered JSON-LD parses and expresses the non-overlapping Friday exception/future schedule plus permanent Saturday hours.
- Permanent visible hours continue to say Friday-Saturday, 22:00-04:00.
- Reservation and careers titles are descriptive in all locales.
- The seven targeted descriptions do not exceed 160 characters.
- The Czech Emenago warning is visible only on the Czech reservation page.
- Redirect rules are ordered from exact roots to wildcards.
- Existing checks for canonical host, hreflang, index eligibility, forms, images, security, accessibility, performance, and placeholder suppression remain green.

### Release checks

1. Run the complete local release gate under Node 22.12.0.
2. Review rendered desktop and mobile notice behavior in a browser.
3. Publish through a protected pull request.
4. Wait for required GitHub and Netlify checks.
5. Merge to `main` only after required checks pass.
6. Verify the production deploy SHA and run live redirect, metadata, structured-data, popup, Czech fallback, and form smoke checks.

## Success criteria

- Visitors are warned truthfully that Fridays are closed through 28 August without losing the permanent Friday-Saturday schedule.
- The warning disappears automatically on 29 August in Warsaw and cannot become stale.
- Search engines receive a dated summer closure and an explicit future Friday reopening schedule.
- First-time visitors never see the summer popup and essential-storage notice simultaneously.
- No fabricated content, event work, analytics behavior, placeholder, or broad private-events content is added.
- The targeted metadata, Czech fallback, and controllable redirect improvements are live on `main` with all release checks passing.
