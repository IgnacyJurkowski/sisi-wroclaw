# Desktop Header Spacing and Slim Private Events Design

**Date:** 2026-07-16
**Status:** Approved in conversation

## Goal

Restore comfortable spacing in the full desktop navigation and make the private-events page materially shorter than the corporate-events offer without adding new claims, placeholder content, or a new visual system.

## Scope

### Desktop navigation

- Increase the floating navigation maximum width from `980px` to `1120px`.
- Increase the spacing between desktop navigation links from `26px` to `32px`.
- Give the reservation CTA `40px` separation from the final navigation link and from the right-side controls.
- Use the existing compact navigation layout at viewport widths of `1100px` and below so the full navigation is never squeezed onto a narrow desktop or tablet viewport.
- Preserve the current logo, reservation CTA styling, social links, locale switcher, mobile menu, and mobile CTA dimensions.

### Private-events page

The rendered page order will be:

1. Private-events hero
2. Private occasion cards
3. Individual-pricing note
4. Private enquiry form

Remove the shared corporate-offer sections from this route:

- venue statistics;
- included services;
- detailed space cards;
- event process.

Also remove the private-events FAQ and its `FAQPage` structured data. Remove the hero's secondary `Poznaj przestrzenie` CTA because its target section will no longer exist. Keep the primary enquiry CTA and the verified events-team phone and email links.

Delete the now-unused private FAQ component and private FAQ translations, and remove the unused secondary-CTA translations. Do not delete shared B2B components or translations because the corporate-events route still uses them.

### Private enquiry form

Keep these submitted fields:

- `name` — required;
- `email` — required;
- `phone` — optional;
- `occasion` — required;
- `guests` — required;
- `preferred_date` and its generated `preferred_date_iso` value — required;
- `message` — required;
- `consent` — required;
- existing hidden Netlify, locale, page, subject, attribution, and honeypot fields.

Remove the optional `space` and `duration` fields. Keep the `private-enquiry` Netlify form name, its notification subject, validation behavior, submission handling, spam honeypot, privacy consent, success state, and error fallback contacts.

The approved Polish form introduction becomes:

> Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję.

Translate that shorter sentence faithfully in EN, DE, IT, and CS without requesting separate approval. Do not change other retained Polish copy.

## Data and truth constraints

- Do not add prices, minimum spend, capacities, service promises, testimonials, case studies, or operational policies.
- Existing verified occasion, pricing, phone, email, and form statements may remain.
- Removing sections must not alter the corporate-events page or its `b2b-enquiry` form.
- The existing Netlify notification configured for submissions from any form to `rzeznicza32@gmail.com` must remain unaffected.

## Verification

- Add rendered-output checks before implementation that fail while the old private-page structure and form fields remain.
- Add a source or rendered CSS contract before implementation for the wider desktop bar, CTA separation, and earlier compact breakpoint.
- Verify the tests fail for the intended missing behavior, then implement the minimum changes and verify they pass.
- Run the full release gate with Node `22.12.0`.
- Run the responsive browser audit across all sitemap routes.
- Inspect the header at full-desktop and compact-header widths and verify the private page section order and shortened form.
- Publish through a protected pull request, wait for the Launch gate and Netlify preview, merge to `main`, and verify the exact production SHA and live form detection.
