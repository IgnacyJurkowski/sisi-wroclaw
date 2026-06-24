# Corporate events (B2B) page

Route: `/pl/eventy-firmowe/` (and `/en/corporate-events/`, `/de/firmenevents/`,
`/it/eventi-aziendali/`, `/cs/firemni-akce/`). Assembled in
`src/components/pages/CorporatePage.astro` from sections in `src/components/b2b/`.

## Verified facts (do not embellish)

Defined in `src/data/site.ts` (`VENUE_FACTS`) and the `b2b.facts` dictionary:

- **663 m²** of event space.
- **Up to 150 seated guests at The Cork** — always scope the 150 to The Cork;
  never imply SiSi itself seats 150.
- **2 presentation screens.**
- Central Wrocław location.

The page must not invent client names, logos, attendance, dates, testimonials,
press, awards, equipment beyond the 2 screens, room capacities, catering
packages, prices, or accessibility features. Unknown details are deferred to the
enquiry ("include this in your enquiry so the team can confirm").

## Enquiry form delivery

- Built with **Netlify Forms**: `name="b2b-enquiry"`, `data-netlify="true"`,
  honeypot `bot-field`. Netlify detects the form from the statically rendered
  HTML at build — no extra config needed. Submissions appear in the Netlify
  dashboard (Forms). A `locale` hidden field distinguishes language.
- Submission is AJAX (POST to the current path) so success/error states are
  shown inline in the visitor's language, with phone/email fallback on failure.
- The client never sends contact names, emails, phones, company names, or the
  message body to any analytics tool. Only non-PII context (`page`, `utm`) is
  attached as hidden fields.
- To receive email notifications, configure a notification in
  Netlify → Forms → Settings, or wire a function. No secrets live in the client.

## Previous projects / "selected realizations"

Model: `src/data/caseStudies.ts`. The public grid renders **only** case studies
with `published: true`. With none published, a neutral message is shown — never a
fabricated client. A `published: false` example documents the shape.

### Add a real, verified project

1. Copy the example object in `CASE_STUDIES`.
2. Fill **every locale** for `title`, `summary` (and optionally `challenge`,
   `solution`, `results`, `testimonial`, `imageAlt`, `seo`, `slug`).
3. Add only verified data: `client`, `clientLogo`, `guestCount`, `spacesUsed`,
   `services`, `image`, `gallery`.
4. Set `published: true` (and `featured: true` to pin it).
5. `npm test`.

### Required-before-publish fields

`id`, `published`, `featured`, `slug` (per locale), `category`, `year`,
`title` + `summary` (per locale). Everything else is optional and should be
omitted unless verified.

## Content checklist for the venue team

Before publishing real projects / richer claims, please provide:

- [ ] Verified previous-project names
- [ ] Written permission to use client logos
- [ ] Project dates / years
- [ ] Professional event photographs (with usage rights)
- [ ] Verified attendee numbers
- [ ] Services actually delivered per project
- [ ] Client-approved testimonials
- [ ] Confirmed technical equipment list (beyond the 2 screens)
- [ ] Room layouts and capacities (per space)
- [ ] Accessibility details (step-free access, facilities)
- [ ] Parking and public-transport information
- [ ] Catering options / packages
- [ ] Pricing or enquiry-handling policy (e.g. response time)
- [ ] Whether bartenders/The Cork hours affect midweek availability

Until supplied, these remain TODOs and must not be invented on the page.
