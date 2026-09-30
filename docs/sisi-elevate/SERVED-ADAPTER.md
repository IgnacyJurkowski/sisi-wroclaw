# Served booking API and the SiSi reservations adapter (Innovation I2)

Date: 2026-09-29. Author: research agent, elevate run. Status: research only, nothing implemented.

Sources read: served-app `main` at 5e973ce (2026-09-26), read-only clone at `/home/user/served-app`. SiSi site at `main` e1feb25 (worktree `/home/user/sisi-elevate`). Paths without a repo prefix below are served-app paths.

Labels follow WORKING-RULES: **Confirmed** (seen in code, test or doc, with file:line), **Rec** (recommendation), **Assumption**, **Inference**. `PENDING` marks a decision that belongs to Ignacy.

What I did not do (Confirmed, by construction): no request to any Served host, no dev server, no Supabase access, no test run in served-app. Test citations say what a test asserts, not that it passed today. Fixture values come from the code and tests; nothing was observed from a live Served instance.

Emenago is a competitor of Served. This document describes what each system does today and does not rank them.

## 0. Answer in one table

| Adapter method | Server support today | Plain statement |
|---|---|---|
| `getAvailability` | Partial | Exists for table requests, one date per call, covers-based, no reason codes. Confirmed. |
| `holdSlot` | **NONE** | No hold or reserve-with-expiry exists for table reservations. Confirmed. Ticket holds exist but are bundled with Stripe Checkout and not callable cross-origin. |
| `confirmBooking` | Partial | Creates a `pending` request that the venue must accept. It does not take payment and does not confirm. Confirmed. |
| `cancelBooking` | **NONE** for a website | The only guest cancel is an HTML page behind an HMAC link that Served emails. Confirmed. |

Two of the four methods (`holdSlot`, `cancelBooking`) have no server support. `confirmBooking` exists only as a request, and it cannot collect the 100 zł per person that SiSi's terms make a condition of confirmation (`src/i18n/legal.ts:43` in the SiSi repo). Confirmed.

## 1. Endpoint contract

### 1.1 `GET /api/booking/availability`

| Item | Contract | Source | Label |
|---|---|---|---|
| Method, path | `GET /api/booking/availability`. `OPTIONS` on the same path returns 204 with the CORS headers. | `src/app/api/booking/availability/route.ts:15-19` | Confirmed |
| Auth | None. The venue is named by the `venue` parameter. The route comment calls it a public read API. | `route.ts:6-8` | Confirmed |
| Query `venue` | string, required. A venue slug or a location UUID. Empty, unknown or inactive venue gives 404. | `route.ts:29,34-37`; `src/lib/booking/resolve-location.ts:10-30` | Confirmed |
| Query `date` | string `YYYY-MM-DD`, venue-local. Anything else gives 200 with empty slots. | `route.ts:30`; `src/app/actions/reservation-availability.ts:24,204` | Confirmed |
| Query `party` | number, default 2. Non-numeric becomes 2. Must be an integer from 1 to 20 and not above the venue's `max_party_size`, else 200 with empty slots. An empty `party=` becomes 0 and gives empty slots. | `route.ts:31-32`; `reservation-availability.ts:205,215` | Confirmed |
| 200 body | `{ date: string, slots: { time: "HH:mm", available: boolean }[], capacityKnown: boolean }` | `reservation-availability.ts:178-189` | Confirmed |
| Slot generation | 30 minute step from the open time up to close minus 60 minutes, capped at an 18 hour span. A special-hours row for the date replaces or closes the weekday hours. Post-midnight labels wrap (`00:00`, `00:30`). | `src/lib/booking/slots.ts:37-53,55-57,84-95` | Confirmed |
| What removes a slot | Past slots for today are dropped. Slots inside the venue's minimum notice are dropped. A date beyond `max_booking_advance_days` returns none. A venue with no published hours returns none. Dropped slots are absent, not `available: false`. | `reservation-availability.ts:216-226,244-267` | Confirmed |
| What sets `available: false` | Reservations in status `pending`, `confirmed` or `seated` that overlap the venue turn time, plus the requested party, exceed bookable covers. Bookable covers = floor(sum of `venue_tables.capacity` x `max_reservation_pct`/100), with a per-date override. | `reservation-availability.ts:76-116,109-111`; `slots.ts:182-202` | Confirmed |
| `capacityKnown` | `false` when the venue has no tables. Then every generated slot is `available: true`. Treat those slots as unverified. | `reservation-availability.ts:232-233,269`; test `src/test/unit/app/actions/reservation-availability.test.ts:116-125` | Confirmed |
| Table or area availability | Not in this response. The capacity model is covers, not tables. | `reservation-availability.ts:109-111` | Confirmed |
| Error shapes | 404 `{ "error": "Venue not found" }`, 429 `{ "error": "Too many requests. Please slow down." }`, both with CORS headers. There is no other error shape: invalid input, a closed day, a party above the cap and a beyond-window date all return the same 200 with `slots: []`. | `route.ts:20-26,34-37`; `reservation-availability.ts:203-230` | Confirmed |
| Rate limit | 120 requests per IP per hour, sliding window. | `src/lib/booking/rate-limit.ts:23,56-63` | Confirmed |
| Rate-limit runtime | Upstash Redis. Unset outside production means allow. In production, missing or failing Upstash falls back to a per-instance in-memory window. The client IP is `x-nf-client-connection-ip`, else a trusted-proxy forwarded IP, else the literal `unknown`. | `src/lib/auth/rate-limit.ts:26-68,106-111` | Confirmed |
| Upstash in production | The 2026-08-31 audit found no Upstash variables in the production Netlify environment. The in-memory fallback exists because production had been failing open on 2026-09-05 (code comment). Current state unknown. | `CUSTOMER-JOURNEY-AUDIT.md` the finding "fails-open-no-upstash"; `auth/rate-limit.ts:26-31` | Assumption |
| CORS | `Access-Control-Allow-Origin: *`, methods `GET, OPTIONS`, headers `content-type`. No `Max-Age`, no `Vary`. A browser request that adds any other header fails preflight. | `route.ts:9-13` | Confirmed |
| Plan gate | None on this route. The write path is gated, so a starter-tier venue can return slots that the reserve call then refuses. | `route.ts` (absence); `src/app/actions/public-reservations.ts:146-158` | Confirmed |
| Custom host | The route stays reachable on a venue's Served custom domain and is not rewritten. | `src/lib/venue-domains/public-host.ts:85-89`; `src/middleware.ts:284-288` | Confirmed |
| Tests | The action is tested. The route has no unit test. `resolveLocationId` is tested. | `reservation-availability.test.ts:78-187`; `src/test/unit/app/api/booking/availability/embed-widget.test.ts:42-62` | Confirmed |

### 1.2 `POST /api/booking/reserve`

| Item | Contract | Source | Label |
|---|---|---|---|
| Method, path | `POST /api/booking/reserve`, JSON body. `OPTIONS` returns 204 with CORS headers. | `src/app/api/booking/reserve/route.ts:14-21` | Confirmed |
| Auth | None. No captcha, no signed nonce, no partner key. | `route.ts:18-60` (absence) | Confirmed |
| Body `venue` | string, required. Slug or UUID. Unknown or inactive gives 404. | `route.ts:28-31` | Confirmed |
| Body `name` or `guest_name` | string, required. | `route.ts:38`; `public-reservations.ts:99-101` | Confirmed |
| Body `phone` or `guest_phone` | string, required, non-empty. No format check. The site form sends dial code plus digits. | `route.ts:39`; `public-reservations.ts:99-101`; `src/components/venue-site/BookingForm.tsx:260` | Confirmed |
| Body `email` or `guest_email` | string, optional. Checked against `^[^\s@]+@[^\s@]+\.[^\s@]+$`. | `route.ts:40`; `public-reservations.ts:103-105`; `src/lib/validation/email.ts:1-11` | Confirmed |
| Body `party` or `party_size` | number or numeric string. Integer 1 to 20 (platform cap) and not above the venue's `max_party_size`. | `route.ts:41`; `public-reservations.ts:121-126,160-163`; `src/lib/booking/party-size.ts:6,12-14` | Confirmed |
| Body `date` + `time` | `YYYY-MM-DD` and `HH:mm`, joined as `${date}T${time}:00` in venue-local wall time. **No post-midnight adjustment**: `date: Friday, time: 01:00` means calendar Friday 01:00, which belongs to Thursday's night. For a venue closed on Thursday the RPC refuses it as `outside_hours`; for a venue open past midnight on Thursday it lands on the wrong night. The website form advances the date itself. | `route.ts:33-34`; `BookingForm.tsx:264-265`; `slots.ts:107-110` | Confirmed |
| Body `reserved_at` | Alternative to date+time. Venue-local `YYYY-MM-DDTHH:mm[:ss]`, or an absolute ISO timestamp. The first 10 characters are used as the venue-local date for the advance-window and special-hours checks, so send wall time, not UTC. | `route.ts:34`; `src/lib/reservation-time.ts:105-118`; `public-reservations.ts:176-188` | Confirmed (code), the UTC edge is an Inference |
| Body `notes` | string, optional, no app-level length limit. | `route.ts:43`; `public-reservations.ts:88` | Confirmed |
| Body `table_id` | string, optional. Checked in the RPC: the table must exist, seat the party, and be free for the turn. | `route.ts:44-45`; `supabase/migrations/20260924100000_0292_reservation_via.sql:367-400` | Confirmed |
| Body `intent_key` | UUID string, optional. Not a UUID gives 400 `Invalid booking request`. | `route.ts:46-49`; `public-reservations.ts:107-109` | Confirmed |
| Body `via` | string, optional. Normalised: a known channel stays, another `[a-z0-9_]{1,32}` token becomes `other`, junk is dropped. SiSi would send `own_website`. Non-string is ignored. | `route.ts:50-53`; `src/lib/reservations/via.ts:7-20,49-54`; test `route.test.ts:45-64` | Confirmed |
| Unknown fields | Ignored. A non-string where a string is expected reads as empty. | `route.ts:26` | Confirmed |
| 200 body | `{ "success": true, "confirmationToken": "<uuid>" }`. Nothing else: no reservation id, no status, no echo of the time, no expiry. | `public-reservations.ts:265-268,406` | Confirmed |
| Error body | `{ "error": "<English sentence>" }` with HTTP **400** for every failure from the action, including rate limiting. No error code. No locale parameter. Route-level: invalid JSON is 400 `Invalid JSON body`; unknown venue is 404. | `route.ts:19-24,28-31,55-58`; `public-reservations.ts:24-60` | Confirmed |
| Error catalogue | 14 RPC statuses, 15 inline messages, and one minimum-notice sentence (described in the fixture's `_meta`). Every string is in `served-fixtures/reserve.errors.json`, extracted from source. | `public-reservations.ts:24-60,99-260`; fixture | Confirmed |
| Validation library | No zod schema on these routes. Validation is hand-written in `createPublicReservation`, `getAvailability` and the RPC. (`zod` is in `package.json` and used elsewhere.) | grep for `zod` in the booking route, action and lib files returns nothing | Confirmed |
| Stored state | The row is inserted with `status = 'pending'`, `source = 'online'`, `duration_minutes` = venue turn time (default 90, clamp 15 to 600 minutes). | `0292_reservation_via.sql:402-412`; `slots.ts:61,69-72` | Confirmed |
| RPC checks, in order | replay by intent key; venue paused; past time; special-hours closure; party cap; min notice; max advance; hours set; within hours (with previous-day tail); venue booking budget; table fit; slot status. | `0292_reservation_via.sql:168-400` | Confirmed |
| Idempotency | Same `intent_key` and same details: the first booking comes back with `out_replayed = true`, the venue is not notified again, and the check happens before every policy gate. Same key, different details: `intent_conflict`. Scope is per venue. The digest covers name, phone, email, party, time, table and notes; not `via`. | `0292_reservation_via.sql:162-195`; `public-reservations.ts:262-268`; tests `public-reservations.test.ts:158-214`, `route.test.ts:29-42` | Confirmed |
| Rate limits, three layers | 8 bookings per IP per hour across all venues and 60 per venue per hour at the app layer; 60 `source = 'online'` bookings per venue per hour again inside the RPC. Staff and the service role are exempt from the RPC budget. | `rate-limit.ts:18,21,36-53`; `0292_reservation_via.sql:113,353-365` | Confirmed |
| CORS | `Access-Control-Allow-Origin: *`, methods `POST, OPTIONS`, headers `content-type`. Only `content-type` is allowed, so an `Idempotency-Key` or `Authorization` header would fail preflight. Error responses carry the headers too. | `route.ts:8-12,23,30,57,59` | Confirmed |
| Plan gate | The action refuses when the venue tier does not include the `reservations` module (`pro`, the 69 EUR Visibility Brain tier). The refusal text is `This venue is not taking online bookings right now.` | `public-reservations.ts:139-158`; `src/lib/features/planVisibility.ts:36,89-91`; `docs/source-of-truth.md` pricing table | Confirmed |
| Side effects | Venue alert email and web push to opted-in members; guest receipt email when an email was given. The receipt says "request", not "confirmed". The guest confirmation email goes out when the venue confirms. | `public-reservations.ts:276-404` | Confirmed |
| Email language | Follows the venue's country, not the guest: `PL` gives Polish, anything else English. Guests of any language on a Polish venue get Polish email. | `src/lib/emails/i18n.ts:4-8`; `public-reservations.ts:376` | Confirmed |
| Custom host | POST and OPTIONS pass through on a venue's Served custom domain. | `public-host.ts:90-94`; `middleware.ts:284-288`; test `src/test/unit/middleware.test.ts:311-322` | Confirmed |
| Tests | `route.test.ts` covers forwarding of `intent_key` and `via` only. The route's error mapping and CORS are untested. | `route.test.ts:25-65` | Confirmed |

### 1.3 Holds, confirmation, deposits, consent, cancellation (cross-cutting)

| Topic | What the code does | Source | Label |
|---|---|---|---|
| Hold of a table | None. There is no hold endpoint and no expiry on a `pending` reservation. A `pending` row counts against capacity at once (availability and the RPC count `pending`, `confirmed`, `seated`). No cron expires stale `pending` rows (the cron list has no such job). | `0292_reservation_via.sql:402-412`; `reservation-availability.ts:82`; `ls src/app/api/cron` | Confirmed; "stays indefinitely" is an Inference |
| Status `held` | A staff-set status (`requested` to `held`). No TTL, not reachable from the public API. | `src/lib/reservations/transitions.ts:74,83-84,134-135` | Confirmed |
| Confirmation | The venue confirms in the console, or from a signed email link. Until then the guest has a request. The widget says "No payment now, we'll confirm shortly." | `public-reservations.ts:368-371`; `messages/en/venue-site.json:89` | Confirmed |
| Ticket holds (different system) | `reserve_ticket_checkout` holds inventory for up to 30 minutes (`p_ttl_minutes` max 30, quantity max 10). It is executable only by `service_role`. | `supabase/migrations/20260801134600_0196_reserve_ticket_checkout_sale_and_pause.sql:24-32,107-109`; `src/lib/tickets/hold-expiry.ts:7-11` | Confirmed |
| Deposits on table reservations | None. The public reservation path has no payment step. `reservation_deposits` is display-only: no file in `src` outside `src/test` mentions it (grep). A staff "prepaid" field records a manual amount; no money moves. | `messages/en/venue-site.json:89`; `docs/audits/personas/09-piotr-fine-dining-deposits.md` section 4; `src/app/actions/venue-payments.ts:652-713` | Confirmed |
| Pre-paid extras | After the venue confirms, the guest may buy catalogue items from `/r/[token]` through the venue's own Stripe or PayU account. Optional for the guest and never a condition of the booking. | `docs/plans/reservation-monetization.md` D1, D4; `src/app/api/upsell/checkout/route.ts:1-60`; persona 09 | Confirmed |
| Ticket deposits | The ticket path can charge `deposit_cents` per unit as a "deposit to reserve", with an optional `min_spend_cents`. Club-night templates allow entry kinds `guestlist`, `cover`, `table`. The ledger tracks `open`, `applied`, `refunded`, `forfeited`. | `src/app/api/tickets/checkout/route.ts:251-258,341-342`; `src/app/actions/club-nights.ts:21-33`; `src/lib/tickets/deposit.ts:18-31` | Confirmed |
| Ticket tiers and tables | A ticket tier has no link to `venue_tables`. `kind: 'table'` is a tier label. | grep of `src/lib/tickets`; `club-nights.ts:21-33` | Inference (absence of a link in what I read) |
| Ticket money flow | Checkout creates the Stripe session with `getStripe()`, the platform key `STRIPE_SEC_API_KEY`. None of `stripeAccount`, `transfer_data`, `on_behalf_of`, `application_fee` appears in `src` (grep). So the charge lands on Served's Stripe account. Card only. Currency defaults to `eur` when the tier has none. | `src/app/api/tickets/checkout/route.ts:310,333-334`; `src/lib/billing/stripe.ts:5-14`; `docs/audits/personas/06-marek-club-events.md` section 8 | Confirmed |
| Legal position on that money | The Legal Pack says the venue is the seller and merchant of record and that Stripe/PayU enabling waits for a "connected-merchant architecture". The code above does not do that. | `docs/legal/SERVED-Legal-Pack-v1.0.source.md:521`; `docs/legal/SERVED-Implementation-Checklist-v1.0.md:88-92` | Confirmed (text); the conflict is an Inference |
| Ticket checkout API | `POST /api/tickets/checkout` takes `{ tierId, eventId, quantity, buyerName, buyerEmail, addOns }` and returns `{ url }`: a Stripe Checkout page, or `/tickets/free-success` when the total is 0. It has **no CORS headers and no OPTIONS handler**, so a browser on another origin cannot call it. Rate limit 10 per IP and 120 per event per hour. | `route.ts:109-160,398`; `src/lib/booking/rate-limit.ts:30-31`; grep for `Access-Control` in the route (none) | Confirmed |
| Ticket public page | `/e/[slug]` (ISR, 60 s). The event needs `status = published` and a `public_slug`. Migration 0284 gives generated club nights a slug; the 2026-08 audit's "unbuyable" claim predates it. Production application of 0284 is unknown. | `src/app/(main)/(public)/e/[slug]/page.tsx:17-25,129-142`; `supabase/migrations/20260923132700_0284_club_night_public_slug.sql`; persona 06 section 7 | Confirmed (repo); prod state Assumption |
| Guest cancel of a table booking | `GET/POST /api/reservations/cancel/[id]?token=...`. HTML pages, not JSON. The token is an HMAC signed by the server, valid 24 hours. It is minted only in the reminder email (T-24h, or T-3h for bookings made less than a day ahead), sent for `confirmed` reservations that have a guest email, when the venue has not turned reminders off. GET shows a form; only POST cancels. The venue's `cancellation_window_hours` blocks online cancel inside the window. | `src/app/api/reservations/cancel/[id]/route.ts:16-23,43-104,106-176`; `src/lib/auth/action-token.ts:6,73-113`; `src/app/api/cron/reservation-reminders/route.ts:9-14,111-127` | Confirmed |
| Cancel by API | `POST /api/rwg/update-booking` with `{ bookingId, status: "CANCELED" }`. Bearer or Basic with `RWG_API_KEY`. Every RwG route answers 503 until that key is set. Google's service, not a website. | `src/app/api/rwg/update-booking/route.ts:7-30`; `src/lib/rwg/auth.ts:6-9,23-25`; `docs/reserve-with-google.md:9-12` | Confirmed |
| Refund of a ticket | Guest page `/t/[ticketId]/refund?token=`: "available while the event is still upcoming. If eligible...". Staff can refund or forfeit a deposit. | `src/app/(main)/(public)/t/[ticketId]/refund/page.tsx:67-70`; `src/app/actions/deposits.ts:18-49` | Confirmed |
| Consent and RODO fields | None. The request has no consent, privacy-notice or marketing field. The site form has no checkbox and no privacy link (a case-insensitive grep of `BookingForm.tsx` for consent, privacy, checkbox, terms, gdpr and policy returns no match). Personal data stored: name, phone, email, notes, party, time, `via`, `confirmation_token`. | `route.ts:36-53`; `BookingForm.tsx` (grep, 0 matches) | Confirmed |
| Data roles | For reservation data the venue is controller and Served is processor. The DPA text has unfilled placeholders (`{{REGISTERED_ADDRESS}}`). Legal pages sit behind a DRAFT banner. | `docs/legal/SERVED-Legal-Pack-v1.0.source.md:571,1962`; `docs/source-of-truth.md` "Legal facts" | Confirmed; "not yet executed" is an Inference |
| Table and area selection | `table_id` is accepted. The list of tables, sections, geometry and taken tables comes from two Next server actions (`getPublicFloorPlan`, `getTakenTableIds`), not from an HTTP API. There is no `area` or `section` parameter. The picker window for taken tables is a fixed 90 minutes, not the venue turn time. | `src/app/actions/public-floor-plan.ts:10,18-43,59-179,186-231`; `route.ts:44-45` | Confirmed |
| Table mode in the widget | If the venue has any `venue_tables` row, the widget requires a table before submit. | `BookingForm.tsx:172-175,539-541` | Confirmed |
| Party size, summary | Reservations: 1 to 20 and the venue cap. Tickets: 1 to 10. The reservation waitlist (`joinWaitlist`) is a server action only; `/api/waitlist` is Served's own product signup list. | `party-size.ts:6`; `checkout-input.ts:1-11`; `src/app/actions/waitlist.ts` | Confirmed |
| Opening hours and business night | Hours are per weekday with `close_day_offset` 0 or 1. `slotDateStr` puts a label earlier than the open time on the next calendar day. `serviceDateFor` maps a 01:00 booking back to the previous night. The SQL side mirrors it (`reservation_service_date`, migration 0209, per the comment at `slots.ts:122-124`). | `src/lib/opening-hours.ts:12-20`; `slots.ts:107-138`; `0292_reservation_via.sql:298-345,371-373` | Confirmed |
| i18n of errors | English only, hard-coded. Embed pages get no dictionary and render in English. Venue-site dictionaries exist for `en, pl, de, fr, es`; `it` and `cs`, which SiSi needs, are not site locales. | `public-reservations.ts:24-60`; `src/app/(main)/embed/[venueSlug]/page.tsx:63-76`; `src/lib/venue-site/locales.ts:2`; `BookingForm.tsx:56-59` | Confirmed |
| Venue slug rules | 3 to 40 chars, `a-z0-9-`, no edge hyphen, reserved words rejected (includes `embed`, `api`, `e`, `t`). | `src/lib/venues/slug.ts:3-58` | Confirmed |

### 1.4 Embed: `/embed.js`, `/embed/[venueSlug]`

| Item | Contract | Source | Label |
|---|---|---|---|
| Loader | `<script src="https://served.global/embed.js" data-venue="slug" async>`. Attributes: `data-venue` (required), `data-channel`, `data-min-height` (default 560), `data-target` (CSS selector), `data-consent` (`granted` or `denied`). | `src/app/embed.js/route.ts:1-2,18-19,22-33,35,49` | Confirmed |
| What it injects | An `<iframe>` to `<origin>/embed/<slug>?via=<channel>`, title `Book a table` (English), `loading=lazy`, `scrolling=no`. Channel is `embed` unless `data-channel` is a known channel. | `embed.js/route.ts:22-33`; test `src/test/unit/app/embed.js/route.test.ts:37-53` | Confirmed |
| postMessage in | The host page ignores messages whose origin is not the Served origin. `served:embed:resize {height}` sets the iframe height. `served:embed:event {name,payload}` becomes a `served:widget:event` DOM event and a `dataLayer.push({event: "served_<name>"})` on the host page. | `embed.js/route.ts:55-66` | Confirmed |
| postMessage out | The iframe posts `served:embed:resize` to `'*'` with only a height. The host forwards `served:consent` to the iframe with the Served origin as target. | `src/app/(main)/embed/[venueSlug]/EmbedAutoHeight.tsx:5-9,20`; `embed.js/route.ts:44-53` | Confirmed |
| Loader caching | `text/javascript`, `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`, `nosniff`. | `embed.js/route.ts:70-78`; test `route.test.ts:29-34` | Confirmed |
| Page | `/embed/[venueSlug]` renders the same `BookingForm` as the microsite. ISR, `revalidate = 300`, `noindex`. Unknown or paused venue is 404. Below the `reservations` tier it renders "Booking unavailable" instead of the form. | `src/app/(main)/embed/[venueSlug]/page.tsx:17-29,37-79` | Confirmed |
| Framing headers | `/embed/*` gets `frame-ancestors *` and no `X-Frame-Options`. Every other rendered route gets `frame-ancestors 'none'` and `X-Frame-Options: DENY`. `netlify.toml` also sets `X-Frame-Options: DENY` for `/*`. The code comment says those rules reach only static CDN assets. No test or e2e spec asserts that `/embed/*` is framable on Netlify. | `next.config.ts:132-161`; `netlify.toml:57-63`; grep of `src/test` and `e2e` for embed framing | Confirmed (config); runtime result Assumption, and it needs a check before the iframe option is used |
| What loads inside the iframe | The shared `(main)` layout mounts `PlausibleScript`, `GoogleTagScript` (Served's own GA4 `G-WX6K1PFJEX`, Consent Mode v2 advanced: `gtag.js` loads for every visitor and sends cookieless pings before consent) and `CookieSettings`. `isGoogleTagAllowedPath` excludes only `/r`, `/invite`, `/scan`, `/t`, and two auth paths, so `/embed/*` is not excluded. | `src/app/(main)/layout.tsx:108-121`; `src/lib/analytics/googleTag.ts:2,8-22`; `src/components/analytics/GoogleTagScript.tsx:29-47` | Confirmed (static reading); runtime behaviour Inference |
| Venue pixels in the iframe | Meta, GA4, Google Ads and TikTok pixels are configured per venue. In embed mode `marketing` consent is denied unless the host page forwards `granted`. | `src/lib/analytics/pixels.ts:406-415`; `src/components/analytics/VenuePixels.tsx:28-35,151-160` | Confirmed |
| Tests | `embed.js` loader is tested. The booking embed page has no test. `/embed/[venueSlug]/menu` has one. No e2e covers embed. | `src/test/unit/app/embed.js/route.test.ts`; `src/test/unit/app/(main)/embed/[venueSlug]/menu/page.test.tsx`; grep of `e2e` | Confirmed |

## 2. What a website adapter can and cannot do today

### 2.1 `getAvailability`

Server support: **partial**. Confirmed.

- Can: read the slot list for one venue-local date and one party size, from a browser, without credentials, for any origin. Confirmed (1.1).
- Cannot: ask for a date range (each call is one date, and 120 calls per IP per hour is the ceiling), get a reason for an empty list, get remaining covers, get per-table or per-area availability, or get prices. Confirmed (1.1).
- Cannot tell "closed", "beyond window", "party too large", "no hours published" and "bad input" apart. All are 200 with `slots: []`. The adapter can pre-empt some of these from SiSi's own hours and party cap. Confirmed; the pre-emption is a Rec.
- `capacityKnown: false` with non-empty slots means unverified. Map to `verified: false` and do not show "free". Rec.
- For a club night the labels `00:00` to `03:00` belong to the night of the requested date. The response does not say so. The adapter must carry `nightDate` and the open time. Confirmed (slots.ts:107-110).
- Table mode: the site form asks for `party=1` so that the list means "at least one cover left". A site that wants table picking would need the table list, which has no HTTP endpoint. Confirmed (`BookingForm.tsx:201-205`; 1.3).

### 2.2 `holdSlot`

Server support: **NONE** for table reservations. Confirmed (1.3).

- The write path inserts a `pending` row directly. There is no reserve-then-confirm and no TTL.
- Ticket holds have a real TTL (30 minutes), but the RPC is `service_role` only, and the one caller is `POST /api/tickets/checkout`, which creates the hold and the Stripe session in one step and returns only a checkout URL. That endpoint has no CORS. Confirmed.
- What the adapter can do: a soft hold. Re-read availability just before submit, then rely on the RPC's atomic check and the `table_taken` and `full` refusals. Return `{ status: 'soft' }`, and never show a countdown, because nothing is reserved. Rec.
- A real hold with a countdown needs a server change (section 5).

### 2.3 `confirmBooking`

Server support: **partial. It is a request, not a confirmation.** Confirmed.

- Can: create a `pending` reservation for a party, a venue-local time and optional table, idempotently, with the guest's name, phone, optional email and notes. Confirmed (1.2).
- Cannot: take a payment, require a payment before the row exists, attach a consent record, return a reservation id or status, choose an area, or guarantee the venue accepts. Confirmed.
- The result the guest sees is "we received your request". This matches SiSi's own line "Potwierdzenie i szczegóły wysyłamy po akceptacji rezerwacji" (`src/i18n/ui/pl.ts:205`). Confirmed.
- Errors arrive as English sentences with HTTP 400. The adapter needs a string-to-reason table (section 3.4). The table breaks silently if Served rewrites a sentence. Rec: ask Served for an error `code` (section 5).
- The step that SiSi's terms call a condition, "Warunkiem potwierdzenia rezerwacji jest przedpłata" (`src/i18n/legal.ts:43`), has no equivalent in this API. Confirmed.
- `entry` (door admission) has no table-request equivalent. It exists only as ticket tiers on `/e/[slug]`, reachable by a link. Confirmed.

### 2.4 `cancelBooking`

Server support: **NONE** for a website. Confirmed.

- The only guest cancel is the emailed HMAC link and an HTML page. A website cannot mint the token, and both cancel routes answer with HTML, not JSON.
- A guest without an email, one who wants to cancel before the reminder is sent, and one whose request the venue has not yet confirmed (the reminder job skips `pending` rows) all have no self-service path. Confirmed (`src/app/api/cron/reservation-reminders/route.ts:9-14,111,121`).
- What the adapter can do: return `{ status: 'unsupported', fallback: 'email-link' }` or `{ status: 'unsupported', fallback: 'call-venue' }` and let the UI say so. Rec.
- A real cancel needs a server change (section 5).

## 3. Proposed adapter

### 3.1 Design rules (Rec)

1. Pricing is venue data, not provider behaviour. `quote()` is a pure function outside the adapters. A provider that cannot collect money (Served table path) or whose cart is external (Emenago) still shows the same quote.
2. Amounts are integer grosze. No floats.
3. A `nightDate` is the date the business night starts. The adapter converts it to a wall-clock `reserved_at` (Served) or ignores it (Emenago).
4. `table` and `entry` are separate kinds, because they differ in every provider layer: Served table requests come from `reserve_table_booking`, Served entry comes from ticket tiers, and Emenago sells a cart.
5. Results are discriminated unions. Expected outcomes do not throw.
6. Amounts and copy live in the Phase 3a venue-truth file. The values below are quoted from published copy and are `PENDING` confirmation.

### 3.2 Interface

Typechecked with `tsc --strict` (TypeScript from `/home/user/sisi-elevate/node_modules`) and exercised with a small script that produced `served-fixtures/adapter.playground.mock.json`. Nothing here is in the site yet.

```ts
// Proposed: src/lib/reservations/adapter.ts. Nothing here is implemented in the site.

export type ProviderId = 'emenago' | 'served'
export type SiteLocale = 'pl' | 'en' | 'de' | 'it' | 'cs'
export type BookingKind = 'table' | 'entry'
export type Weekday =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/** Integer minor units (grosze). Never floats. */
export interface Money {
  readonly minor: number
  readonly currency: 'PLN'
}

// ---- Pricing: data owned by the venue, not by a provider ------------------

export type CreditRule =
  | 'credited-at-table' // counts against the bill (table deposit)
  | 'not-credited'      // a plain fee (Saturday entry)
  | 'waived'            // the booking waives it, so the unit amount is 0 (Friday entry)

export type RefundRule =
  | { readonly type: 'unspecified' } // PENDING: no rule is published
  | { readonly type: 'refund-if-venue-refuses-entry' }
  | { readonly type: 'until'; readonly hoursBeforeArrival: number }

export interface PriceComponent {
  readonly id: 'table-deposit' | 'entry'
  readonly per: 'person' | 'booking'
  readonly unit: Money
  readonly credit: CreditRule
  /** Where the money is taken. PENDING per component until the venue confirms. */
  readonly collectedAt: 'booking' | 'door'
  readonly refund: RefundRule
  /** Key in the venue-truth content file this number was read from. */
  readonly source: string
}

export interface NightPricing {
  /** Weekday the business night STARTS. A Saturday 01:00 arrival belongs to Friday's night. */
  readonly nightStartsOn: Weekday
  readonly table: readonly PriceComponent[]
  readonly entry: readonly PriceComponent[]
}

export interface QuoteLine {
  readonly component: PriceComponent['id']
  readonly qty: number
  readonly total: Money
  readonly credit: CreditRule
}

export interface Quote {
  readonly lines: readonly QuoteLine[]
  readonly payAtBooking: Money
  readonly payAtDoor: Money
  readonly creditedAtTable: Money
}

/** Pure and provider-independent. The adapter transports; it does not price. */
export function quote(pricing: NightPricing, kind: BookingKind, partySize: number): Quote {
  const components = kind === 'table' ? [...pricing.table, ...pricing.entry] : pricing.entry
  const lines: QuoteLine[] = components.map((c) => {
    const qty = c.per === 'person' ? partySize : 1
    return {
      component: c.id,
      qty,
      total: { minor: c.unit.minor * qty, currency: 'PLN' },
      credit: c.credit,
    }
  })
  const sum = (pick: (c: PriceComponent, l: QuoteLine) => boolean): Money => ({
    minor: lines.reduce((acc, l, i) => (pick(components[i], l) ? acc + l.total.minor : acc), 0),
    currency: 'PLN',
  })
  return {
    lines,
    payAtBooking: sum((c) => c.collectedAt === 'booking'),
    payAtDoor: sum((c) => c.collectedAt === 'door'),
    creditedAtTable: sum((c) => c.credit === 'credited-at-table'),
  }
}

// ---- Adapter contract ------------------------------------------------------

export interface ProviderCapabilities {
  readonly id: ProviderId
  readonly availability: 'none' | 'per-slot'
  readonly hold: 'none' | 'soft' | 'ttl'
  readonly confirm: 'handoff' | 'request' | 'paid'
  readonly cancel: 'none' | 'guest-link' | 'api'
  readonly prepayment: 'external' | 'none' | 'hosted-checkout'
  readonly tablePick: boolean
  readonly kinds: readonly BookingKind[]
  readonly maxPartySize: number | null
  /** Languages the provider's own screens can render. */
  readonly screenLocales: readonly SiteLocale[]
}

export interface BookingQuery {
  readonly kind: BookingKind
  /** Venue-local YYYY-MM-DD of the night's START, never the calendar date of a post-midnight arrival. */
  readonly nightDate: string
  readonly partySize: number
  readonly locale: SiteLocale
  /** CTA location, e.g. 'hero'. Becomes utm_content (emenago) or `via` context (served). */
  readonly content: string
}

export interface Slot {
  /** Venue-local HH:mm. 00:00 to 03:00 belong to nightDate, not to the next calendar day. */
  readonly time: string
  readonly available: boolean
}

export type AvailabilityResult =
  | { readonly status: 'ok'; readonly slots: readonly Slot[]; readonly verified: boolean }
  | { readonly status: 'no-slots' } // closed, beyond window, party too large: the wire cannot say which
  | { readonly status: 'unknown' }  // provider cannot tell (emenago): show the CTA, no slot picker
  | { readonly status: 'error'; readonly code: 'rate_limited' | 'not_found' | 'network' | 'server' }

export interface HoldRequest extends BookingQuery {
  readonly time: string
}
export type HoldResult =
  | { readonly status: 'held'; readonly holdId: string; readonly expiresAt: string }
  | { readonly status: 'soft'; readonly recheckedAt: string } // availability re-read only; nothing reserved
  | { readonly status: 'unsupported' }
  | { readonly status: 'unavailable' }
  | { readonly status: 'error'; readonly code: 'rate_limited' | 'network' | 'server' }

export interface Guest {
  readonly name: string
  readonly phone: string
  readonly email?: string
  readonly notes?: string
}

export interface ConfirmRequest extends HoldRequest {
  readonly guest: Guest
  /** One UUID per booking attempt. Reused on every retry of that attempt. */
  readonly intentKey: string
  readonly tableId?: string
  readonly holdId?: string
}

export type RejectReason =
  | 'full' | 'table_taken' | 'table_too_small' | 'party_too_large' | 'too_soon'
  | 'too_far_ahead' | 'closed' | 'outside_hours' | 'paused' | 'past_time'
  | 'venue_busy' | 'already_sent_with_other_details' | 'invalid_input' | 'unknown'

export type ConfirmResult =
  | { readonly status: 'handoff'; readonly url: string; readonly resolvedLocale: SiteLocale }
  | { readonly status: 'requested'; readonly bookingRef: string; readonly venueMustConfirm: true }
  | { readonly status: 'payment-required'; readonly checkoutUrl: string; readonly holdExpiresAt: string }
  | { readonly status: 'rejected'; readonly reason: RejectReason; readonly providerMessage: string }
  | { readonly status: 'error'; readonly code: 'rate_limited' | 'network' | 'server' }

export interface BookingRef {
  readonly provider: ProviderId
  /** Served: the confirmationToken. It is a bearer capability. Never log it or send it to analytics. */
  readonly ref: string
}
export type CancelResult =
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'unsupported'
      readonly fallback: 'call-venue' | 'email-link' | 'provider-page'
    }
  | { readonly status: 'error'; readonly code: 'network' | 'server' }

export interface ReservationsAdapter {
  readonly capabilities: ProviderCapabilities
  getAvailability(query: BookingQuery, signal?: AbortSignal): Promise<AvailabilityResult>
  holdSlot(request: HoldRequest, signal?: AbortSignal): Promise<HoldResult>
  confirmBooking(request: ConfirmRequest, signal?: AbortSignal): Promise<ConfirmResult>
  cancelBooking(ref: BookingRef, signal?: AbortSignal): Promise<CancelResult>
}

// ---- Example data (values quoted from published copy; PENDING confirmation) --

const pln = (zl: number): Money => ({ minor: zl * 100, currency: 'PLN' })

export const friday: NightPricing = {
  nightStartsOn: 'friday',
  table: [{
    id: 'table-deposit', per: 'person', unit: pln(100), credit: 'credited-at-table',
    collectedAt: 'booking', refund: { type: 'refund-if-venue-refuses-entry' },
    source: 'reservations.deposit.perPerson',
  }],
  entry: [{
    id: 'entry', per: 'person', unit: pln(0), credit: 'waived',
    collectedAt: 'door', refund: { type: 'unspecified' },
    source: 'reservations.entry.friday',
  }],
}

export const saturday: NightPricing = {
  nightStartsOn: 'saturday',
  table: friday.table,
  entry: [{
    id: 'entry', per: 'person', unit: pln(40), credit: 'not-credited',
    collectedAt: 'booking', refund: { type: 'unspecified' },
    source: 'reservations.entry.saturday',
  }],
}

export const emenagoCapabilities: ProviderCapabilities = {
  id: 'emenago', availability: 'none', hold: 'none', confirm: 'handoff', cancel: 'none',
  prepayment: 'external', tablePick: false, kinds: ['table'], maxPartySize: null,
  screenLocales: ['pl', 'en', 'de', 'it'],
}
export const servedTableCapabilities: ProviderCapabilities = {
  id: 'served', availability: 'per-slot', hold: 'soft', confirm: 'request', cancel: 'guest-link',
  prepayment: 'none', tablePick: true, kinds: ['table'], maxPartySize: 20,
  screenLocales: ['en'],
}
```

### 3.3 Pricing rules as data

Published copy today (SiSi repo, Confirmed): a table reservation is 100 zł per person, credited at the table (`src/i18n/ui/pl.ts:206,325`); Friday entry with a reservation is free (`pl.ts:204,326`); Saturday adds an entry fee per person (`pl.ts:206,327`); hours are Friday and Saturday 22:00 to 04:00 (`src/lib/opening-hours.mjs`); the door refusing entry refunds the amount paid (`pl.ts:330`).

**The SiSi copy contradicts itself. PENDING for Ignacy:**

| Fact | UI copy (pl, en, de, it, cs) | Terms of service (`src/i18n/legal.ts`) |
|---|---|---|
| Saturday entry per person | 40 zł (`pl.ts:206,327`; `en.ts:200,320`; `de.ts:200,320`; `it.ts:199,319`; `cs.ts:200,320`) | 30 zł (`legal.ts:42`, English text `legal.ts:241`) |
| Pickup window | 22:00 to 23:00 (`pl.ts:328`, and the same in en, de, it, cs) | 22:00 to 23:30 (`legal.ts:44,243`) |

Confirmed. The adapter must not hard-code either number. The user's brief says 40 zł, which matches the UI copy.

How the rules are represented (`friday`, `saturday` in the interface above):

| Night | Table request, party of 4 | `payAtBooking` | `creditedAtTable` | `payAtDoor` |
|---|---|---|---|---|
| Friday | `table-deposit` 4 x 100 zł, credited. `entry` 0 zł, `credit: 'waived'`. | 400 zł | 400 zł | 0 |
| Saturday | `table-deposit` 4 x 100 zł, credited. `entry` 4 x 40 zł, `credit: 'not-credited'`. | 560 zł | 400 zł | 0 |

Confirmed (output of `quote()` run on the interface above). Whether the Saturday entry is taken online or at the door is not stated in SiSi's copy, so `collectedAt` for entry is `PENDING`. The table above assumes online (Assumption).

Other representation points:

- **Friday entry is free "with a reservation" (`pl.ts:204`).** SiSi's copy gives no price for a walk-in and sells no standalone entry product. A `kind: 'entry'` Friday quote of 0 zł is therefore an Assumption, and `entry` as a bookable kind is `PENDING` (Inference: SiSi sells table reservations only).
- **Party size** is `partySize` in every call. For `per: 'person'` components the quote multiplies by it. The Served cap is 20 and the venue's own cap applies. Confirmed (1.2).
- **Date and time window.** `nightDate` plus a `time` slot. The pickup window ("Rezerwację należy odebrać w godzinach 22:00-23:00", with the table possibly released after 30 minutes of lateness, `pl.ts:328`) has no Served field. It stays SiSi copy. Confirmed.
- **Deposit.** On Served's table path there is none (1.3). On its ticket path a tier can carry `deposit_cents` and `min_spend_cents`, which is the closest match to "100 zł credited at the table". Confirmed. Ticket quantity is capped at 10, so a table for 12 cannot use it. Confirmed (`checkout-input.ts:1`).
- **Table versus entry.** `table`: the guest wants a table for the night and pays the credited deposit. `entry`: the guest wants to get in, with no table. Emenago supports `table` only (Assumption: from the SiSi copy and the single cart link). Served supports `table` requests through the reserve API and `entry` through ticket tiers by link only.

### 3.4 Provider mappings

**Emenago (current hand-off).** Confirmed from `src/data/site.ts:13-37`.

| Method | Behaviour |
|---|---|
| `getAvailability` | `{ status: 'unknown' }`. No availability data comes from Emenago. |
| `holdSlot` | `{ status: 'unsupported' }`. |
| `confirmBooking` | `{ status: 'handoff', url, resolvedLocale }`. `url` is `https://emenago.com/inner/cart/6619/0519b014958d73fb0d5d2d58c360a661/<locale>?utm_source=website&utm_medium=cta&utm_campaign=reservation&utm_content=<content>`, where `<locale>` is `pl`, `en`, `de` or `it`. `cs` resolves to `pl`. Party size, date and time are not passed today. Nothing is booked at this point. |
| `cancelBooking` | `{ status: 'unsupported', fallback: 'call-venue' }`. |

Whether the Emenago cart accepts party or date parameters is not known and could not be checked (no third-party requests are allowed in this run). PENDING.

**Served (table request).**

| Method | Behaviour | Label |
|---|---|---|
| `getAvailability` | `GET {origin}/api/booking/availability?venue={slug}&date={nightDate}&party={n}`. Map `capacityKnown` to `verified`. `slots: []` becomes `no-slots`. 404 becomes `error/not_found`, 429 `error/rate_limited`. Local pre-checks (party above cap, night not Friday or Saturday) avoid useless calls. | Rec |
| `holdSlot` | Re-run `getAvailability`; if the slot is still `available`, return `soft`; else `unavailable`. | Rec |
| `confirmBooking` | `POST {origin}/api/booking/reserve` with `venue, name, phone, email?, party, reserved_at, notes?, intent_key, via: 'own_website'`. Compute `reserved_at` as `nightDate` if `time >= openTime`, else the next calendar date, joined with `T{time}:00`. On 200 return `requested` with `bookingRef = confirmationToken` and `venueMustConfirm: true`. On 400 map the message (table below). | Rec |
| `cancelBooking` | `unsupported`, fallback `email-link` (only if the guest gave an email) else `call-venue`. | Rec |

Error mapping (match on the start of the sentence; strings from `public-reservations.ts:24-60,99-260`):

| Served sentence starts with | `RejectReason` or error |
|---|---|
| `This time is fully booked` | `full` |
| `That table was just booked` | `table_taken` |
| `That table is too small` | `table_too_small` |
| `That party size is too large`, `For parties of more than` | `party_too_large` |
| `That time is too soon`, `Online bookings need at least` | `too_soon` |
| `That date is not open`, `Bookings open up to` | `too_far_ahead` |
| `The venue is closed` | `closed` |
| `The venue is not open`, `This venue has not published` | `outside_hours` |
| `This venue is not taking online bookings` | `paused` |
| `That time has already passed`, `Reservation date must be in the future` | `past_time` |
| `This venue is getting a lot of booking requests` | `venue_busy` |
| `This booking was already sent with different details` | `already_sent_with_other_details` |
| `Too many reservation requests` | `error/rate_limited` (HTTP status is 400, not 429) |
| `Missing required fields`, `Please enter a valid email`, `Invalid party size`, `Invalid booking request` | `invalid_input` |
| anything else | `unknown` (show the venue phone) |

**Served (entry, by link).** `confirmBooking` returns `handoff` to `https://served.global/e/<event-slug>`. `POST /api/tickets/checkout` has no CORS, so an on-site checkout is not possible, and a server-side proxy would share one IP bucket (10 per hour) for all guests (Inference, see 5.2). Requires a published event with a `public_slug` and a tier priced in PLN. Rec, and PENDING whether SiSi wants `entry` at all.

## 4. Mock data shape for the playground prototype

Files in `docs/sisi-elevate/served-fixtures/`. Wire fixtures wrap the real body as `{ _meta, request, response }`, where `_meta.derivedFrom` lists the source lines. A test harness should read `response.body` and ignore `_meta`.

| File | What it is | Label |
|---|---|---|
| `availability.friday-night.json` | 200 with 11 slots `22:00` to `03:00`, three of them `available: false` (values illustrative, labels computed from `generateSlots`), `capacityKnown: true`. | Shape Confirmed, values illustrative |
| `availability.capacity-unknown.json` | 200, all slots available, `capacityKnown: false`. | Confirmed (test `reservation-availability.test.ts:116-125`) |
| `availability.empty.json` | 200, `slots: []`, with the list of causes that produce it. | Confirmed |
| `availability.errors.json` | 404 and 429 with their exact bodies. | Confirmed |
| `reserve.request-and-success.json` | A request body, the 200 body, and the replay case. | Shape Confirmed, guest data fake |
| `reserve.errors.json` | Every failure sentence, extracted from source by script, with HTTP status and cause. | Confirmed |
| `adapter.playground.mock.json` | Adapter-side model, not a Served response: capabilities for both providers, `friday` and `saturday` pricing, precomputed quotes for parties of 2, 4, 6, seven availability scenarios, confirm, hold and cancel outcomes, and the Emenago hand-off URL for `cs`. | Inference / illustrative |

Shape of `adapter.playground.mock.json`: `{ venue, capabilities, pricing, quotes, scenarios[], confirmOutcomes, holdOutcomes, cancelOutcomes }`. Each scenario is `{ id, provider, query: BookingQuery, availability: AvailabilityResult, confirm?: ConfirmResult }`, typed by the interface in 3.2.

Suggested playground states (all present in `adapter.playground.mock.json`): `served.ok`, `served.all-taken`, `served.unverified`, `served.no-slots`, `served.rate-limited`, `served.network`, `emenago.handoff`; confirm outcomes `requested`, `rejected/full`, `rejected/venue_busy`, `error/rate_limited`.

Playground rules (Rec): the prototype reads only these files and makes no network call; it labels the Served path "request, the venue confirms"; it shows the quote but no "pay now" button on the Served table path, because that path cannot take money; it never shows a hold countdown.

## 5. What would have to change on Served's side for SiSi

List only. Nothing here is implemented, and sizes are Assumptions.

### 5.1 Needed before a Served table request could replace the Emenago cart

| # | Change | Why | Size |
|---|---|---|---|
| S1 | Online deposit for a table reservation: a payment step tied to `reservations` (Stripe or PayU), a payment state on the row, and refund and forfeit rules. Today `deposit_ledger` is keyed to `tickets` and the reserve path has no payment. | SiSi's terms make prepayment a condition of confirmation (`legal.ts:43`). | L |
| S2 | Payment methods and merchant of record: BLIK and card in PLN, settled to SiSi's account (or a written agreement that Served's platform account collects). Ticket checkout is `['card']` and platform-owned. | Polish guests expect BLIK (Assumption). The Legal Pack says the venue is merchant of record (Confirmed). | L |
| S3 | A hold with expiry for table reservations: `POST /api/booking/hold` and release on expiry or payment. | `pending` rows have no TTL today, so unpaid requests would hold capacity indefinitely (Inference). | M |
| S4 | Guest cancel and status by API: `GET /api/booking/status` and `POST /api/booking/cancel`, authenticated by the booking token, applying `cancellation_window_hours` and the refund rule. | Today cancel is an emailed HTML link, only at T-24h. | M |
| S5 | JSON list endpoint for tables, sections and taken tables (`getPublicFloorPlan`, `getTakenTableIds` exist only as server actions). Use the venue turn time, not the fixed 90 minutes. | Needed only if SiSi wants a table picker on its own site. | M |
| S6 | Reserve response returns `reservationId`, `status`, the stored `reserved_at`, and (with S3) `expiresAt`. | The 200 body is `{ success, confirmationToken }` only. | S |
| S7 | Fix or document post-midnight input on the `date` + `time` path (accept `night` + `time`, or apply `slotDateStr`). | A club caller sending `01:00` with the night's start date is refused or booked on the wrong night. | S |

### 5.2 Needed for safe public use

| # | Change | Why | Size |
|---|---|---|---|
| S8 | Structured errors: `{ error, code }`, HTTP 429 for rate limits, 409 or 422 for conflicts and validation, `Retry-After`. | Callers match English sentences today. | S |
| S9 | `locale` parameter for error text (SiSi needs pl, en, de, it, cs; site locales are en, pl, de, fr, es), and guest email language chosen per booking, not per venue country. | Section 1.3, i18n rows. | M |
| S10 | Bot control and origin policy on `POST /api/booking/reserve`: an origin allowlist per venue, a token challenge, or a partner key. | Any origin can post; a script can fill the 60 per hour venue budget and leave `pending` rows that hold capacity. | M |
| S11 | Client IP for proxied callers. `getClientIp` trusts `x-nf-client-connection-ip`. A request relayed by a Netlify function or a `[[redirects]] status=200` proxy from SiSi's site would probably present one IP, which caps the whole site at 8 bookings per hour. | Inference. Test needed. Or use direct browser calls (5.4, option C). | S |
| S12 | Consent fields on the request: privacy-notice version shown, timestamp, and a separate optional marketing opt-in. Store them on the reservation. | The API has nowhere to record it (1.3). | M |
| S13 | Executed DPA and completed legal identity; Resend EU status and Stripe DPA reference are `PENDING` in Served's own source-of-truth. | Roles: SiSi controller, Served processor. | Legal |
| S14 | Framing check and a white-label mode for the embed: confirm `X-Frame-Options` at runtime on `/embed/*`, add `?lang=`, drop Served's GA4 tag and cookie banner inside the iframe when partner-hosted. | Sections 1.4 and 5.4. | M |
| S15 | Availability route: plan gate parity with the write path, and reasons for empty results. | Slots can be shown for a venue that will refuse the booking. | S |

### 5.3 Security and privacy notes

| Note | Detail | Label |
|---|---|---|
| Abuse surface | `POST /api/booking/reserve` is unauthenticated with `Access-Control-Allow-Origin: *`. Limits are per IP (8 per hour) and per venue (60 per hour, twice). A distributed script can exhaust the venue budget, and each accepted row is `pending` and consumes capacity until staff act. | Confirmed (limits), Inference (impact) |
| Token handling | `confirmationToken` is a bearer capability for the guest's `/r/[token]` page (guest data and payment). Served keeps it out of analytics on purpose. The SiSi site must not put it in a URL, PostHog event, GA parameter or log. The guest-facing reference is its first 8 characters, upper case. | Confirmed (`googleTag.ts:8-20`; `src/lib/emails/journey.ts:160-162`; `BookingForm.tsx:304`) |
| SiSi session replay | SiSi's privacy text says PostHog replay masks form fields (`legal.ts:179`). Any new booking form on SiSi must keep every input masked and not send field values in events. | Confirmed (text), Rec |
| RODO capture | Booking data is processed under Art. 6(1)(b) in SiSi's own policy (`legal.ts:100`). That basis needs no consent checkbox, but it needs the Art. 13 information at the point of collection. The Served API has no consent field, so the notice link belongs on SiSi's form. Do not add a pre-ticked box. Marketing opt-in is out of scope. | Confirmed (policy text); basis and wording need legal review, PENDING |
| Recipients | SiSi's policy lists "operator zewnętrznego systemu rezerwacji" generically (`legal.ts:114`). At cutover the policy should name Served and its subprocessors (Supabase EU, Netlify, Resend, Stripe as Served lists them). Served's own list still has PENDING items. | Confirmed (text), Rec |
| Email content | Served sends the receipt and confirmation from its own sender, in Polish for a Polish venue, with the guest's name, date and party size. `reply-to` is the venue email. | Confirmed (`public-reservations.ts:368-404`) |
| Free-text notes | `notes` is stored and forwarded to the venue alert. Guests may write allergy or health details there. The form should say not to. | Rec |
| Prepayment and refunds | 100 zł per person is taken by Emenago today. On Served the ticket path charges Served's platform Stripe account, card only. Refund of a paid table deposit is not automated. SiSi's only published refund case is refusal at the door (`pl.ts:330`); guest cancellation and no-show rules are not published. Consumer-law questions (withdrawal right for dated leisure services, refund timing) need counsel. | Confirmed (code, copy); legal effect Assumption, PENDING |
| Iframe and consent | The iframe pulls Served's GA4 and cookie banner into SiSi's page, outside SiSi's consent manager (1.4). SiSi's GA4 loads only after consent (`docs/sisi-elevate/RESEARCH.md`, analytics section). Loading the iframe before the guest consents would send an IP address to Google through Served's tag. | Confirmed (static), Inference (runtime) |
| Test isolation | Contract and Playwright tests must block `served.global` the way they block Emenago, and use the fixtures. No real booking may be created. | Confirmed (`WORKING-RULES.md` hard limits) |
| Secrets | The public API needs no key, so nothing secret ships in the static bundle. If Served adds a partner key (S10), it must stay server-side. | Rec |

### 5.4 SiSi CSP impact

SiSi's policy today (`scripts/generate-headers.mjs:112`, pinned in `scripts/check-build.mjs:745-758` and `scripts/generate-headers.test.mjs:122-131`):
`default-src 'self'; script-src 'self' <hashes> https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'`. Confirmed.

There is no `frame-src` and no `child-src`, so frames fall back to `default-src 'self'`. Inference from the CSP fallback rules.

| Option | Guest experience | SiSi CSP change | Served change | Notes |
|---|---|---|---|---|
| A. Link to a Served page (same pattern as the Emenago link) | Leaves sisiwroclaw.pl | **None.** Navigation by `<a>` is not restricted by `default-src`; the Emenago link works under this CSP today. | None | Target could be `served.global/<slug>` or a Served custom domain on a SiSi subdomain (venue-domain feature, `docs/venue-sites/00-design.md` lines 479-487; Assumption that it fits). Booking still cannot take the deposit. |
| B. Iframe `/embed/<slug>` | Served UI inside the SiSi page, English only, Served styling | `frame-src https://served.global` | None to start; S14 later | X-Frame-Options at runtime unverified. Served GA4 and cookie banner load in the frame. No deposit. Not recommended for SiSi's five-language brand. Rec |
| C. Headless from the browser | SiSi UI in five languages, calls Served directly | `connect-src` gains `https://served.global` | None for request-only (CORS already `*`) | Each guest has their own IP, so the per-IP limits work as designed. Needs `content-type` as the only custom header. Rec if Served is chosen |
| D. Headless through a same-origin proxy (like `/ph/*` for PostHog, `netlify.toml:75-81`) | Same as C | None (`connect-src 'self'`) | S11 | Probably one shared IP: 8 bookings per hour for the entire site. Inference. Not recommended without S11 |
| E. Stripe.js or Elements on the SiSi page | Card form on SiSi | `script-src https://js.stripe.com`, `frame-src https://js.stripe.com https://hooks.stripe.com`, `connect-src https://api.stripe.com` | S1, S2 | Avoid. Use Stripe-hosted Checkout by redirect, which needs no CSP change. Rec |

`form-action 'self'` only restricts native `<form>` submissions to another origin. JavaScript `fetch` is not affected, and a link is not affected. A native `<form action="https://served.global/...">` would be blocked. Inference from the CSP spec.

A CSP change is a deliberate policy change, not a check to bend. It needs to be provider-conditional so a build with `RESERVATIONS_PROVIDER=emenago` keeps today's exact string, and PROGRESS.md must record why the expected string differs for `served` builds (WORKING-RULES, checking rules). Rec.

## 6. Feature flag and cutover (PENDING: Ignacy's decision)

Nothing below is decided. It is a proposal.

### 6.1 Flag design (Rec)

| Item | Proposal |
|---|---|
| Name and values | `RESERVATIONS_PROVIDER` = `emenago` or `served`. Unset means `emenago`. |
| Unknown value | Fail the build with a clear message. Unset is safe; a typo should not pass quietly. |
| Where read | Once, at build time, in `src/data/site.ts` next to `reservationUrl()` (`site.ts:13-37`). Astro is a static site on Netlify, so a change needs a deploy. |
| Companion variables (only for `served`) | `SERVED_VENUE_SLUG` (no default; `[SLUG?]` PENDING), `SERVED_API_ORIGIN` (default `https://served.global`). Missing slug with `served` fails the build. A failed build leaves the previous deploy live (Netlify behaviour, Assumption). |
| Default behaviour guarantee | With the flag unset, the built HTML, JSON-LD and `_headers` must be byte-identical to today's. Enforce with the Phase 1 contract tests and `check-build.mjs:268-303`. |
| Consumers to route through the adapter | `src/components/home/Reservations.astro`, `src/components/EventCard.astro`, `src/components/pages/MenuPage.astro`, `src/components/pages/EventDetailPage.astro` (all import `reservationUrl`), the `ReserveAction` JSON-LD (`site.ts:235-247`), and the click classifier `conversion-events.ts:21`, which matches only `emenago.com`. |
| CSP | Provider-conditional in `generate-headers.mjs` (section 5.4). |
| Fallback | No automatic fallback from `served` to Emenago inside a session. Two systems have separate inventory, so a failed Served call that sends the guest to Emenago can double-book a table (Inference). If a fallback is wanted, show the venue phone instead. |
| Rollback | Set the variable back and redeploy, or publish the previous deploy in Netlify (Assumption on the Netlify feature). Bookings already made stay in the system that took them. |

### 6.2 Cutover checklist (each item is Ignacy's call)

Decisions first:

- [ ] Scope: table request only, or request plus online deposit (needs S1, S2). Without S1 the "prepayment is a condition" rule in the terms cannot be enforced by the API. Options: change the terms, take payment by a link the venue sends after accepting, or wait for S1.
- [ ] Resolve the copy conflicts: Saturday entry 30 or 40 zł; pickup window 23:00 or 23:30 (section 3.3).
- [ ] Decide whether `entry` (door only) is sold at all.
- [ ] Decide what happens to the Emenago account and its open bookings, and the date after which the Emenago link is removed.

Served side (needs a person with Served access; this run made no request to Served):

- [ ] SiSi's venue exists in Served production. Record the slug. Code comments show SiSi's rooms, tables and door sheet shaped Served's floor view and CSV export (`src/app/(main)/(console)/app/[venueSlug]/reservations/exportCsv.ts:3-8`; `ReservationsFloorView.tsx:675,722,770`; `src/app/actions/venues.ts:483`), which suggests a SiSi venue exists. Inference. Test fixtures use `sisi` and `sisi-wroclaw` as made-up slugs; do not treat them as real.
- [ ] Tier includes `reservations` (`pro`) and the venue is active.
- [ ] Opening hours: Friday and Saturday 22:00 to 04:00 with `close_day_offset` 1, other days closed, special hours for breaks.
- [ ] Turn time: default is 90 minutes and the maximum is 600. A table held all night needs the turn time raised, which also changes the covers-based availability. The taken-table picker still uses 90 minutes. Confirmed (`slots.ts:69-72`; `public-floor-plan.ts:10,209`).
- [ ] Max party, min notice, max advance days, cancellation window, guest reminders on or off, alert recipients.
- [ ] Executed DPA (S13) and Served's processor list reviewed by SiSi.
- [ ] If option B is ever used: check `X-Frame-Options` and CSP on `/embed/<slug>` from outside (this run could not).
- [ ] Check preflight and the real per-IP limits from a browser on the SiSi origin, in a test venue, not SiSi's.

Site side:

- [ ] Implement the adapter and the flag, default `emenago`.
- [ ] Contract test: default build unchanged.
- [ ] Playwright and contract tests block `served.global` and use fixtures.
- [ ] Provider-conditional CSP with a PROGRESS.md note.
- [ ] Update `check-build.mjs` reservation-link assertions for `served` builds only.
- [ ] Analytics: extend the conversion classifier for the Served host (or the SiSi form's own event) and keep event names `reservation_cta_click`, `phone_click`, `email_click`, `enquiry_submit`, `enquiry_success` (`conversion-events.ts`).
- [ ] Privacy policy and terms updated (recipient, Art. 13 wording, deposit and refund text), with legal review.
- [ ] Information notice link next to the submit button; no marketing tick box.
- [ ] Booking form inputs masked in session replay.
- [ ] Post-midnight test: a 01:00 slot on a Friday night stores Saturday 01:00 and appears on Friday's night in the console.

Rollout:

- [ ] Deploy preview with `served` in the preview context only.
- [ ] One staff-made request on a Served test venue; the alert email, console row and guest receipt all arrive.
- [ ] Switch production, watch the first Friday night, keep the venue phone visible.
- [ ] Rollback rehearsal before the switch.

## 7. Open items and things I could not check

| Item | Why it matters | Who |
|---|---|---|
| SiSi's Served slug and whether SiSi is a live Served venue | Every call needs it | Ignacy |
| Whether production has Upstash configured | Real rate limits | Ignacy |
| `X-Frame-Options` on `/embed/*` at runtime | Decides whether option B works | Ignacy |
| Whether the Emenago cart accepts party or date parameters | Would let the hand-off pre-fill | Ignacy or Emenago docs |
| Whether Netlify passes the original guest IP through a proxy rewrite | Decides option D | Test on a preview |
| Whether migration 0284 (club-night slugs) is applied in production | Entry-by-link needs a slug | Ignacy |
| The audit documents under `docs/audits` are dated 2026-08-31 to 2026-09-05 | Some findings may be fixed (0284 is one). Statements from them are marked as audit claims unless I verified the code | Note |
| Served's tests were not run | Test citations show intent | Note |

## 8. Files read

Routes and pages: `src/app/api/booking/availability/route.ts`, `src/app/api/booking/reserve/route.ts`, `src/app/(main)/embed/[venueSlug]/page.tsx`, `EmbedAutoHeight.tsx`, `menu/page.tsx`, `src/app/embed.js/route.ts`, `src/app/api/tickets/checkout/route.ts`, `src/app/api/reservations/cancel/[id]/route.ts`, `src/app/api/rwg/update-booking/route.ts`, `src/app/api/upsell/checkout/route.ts`, `src/app/api/waitlist/route.ts`, `src/app/api/cron/reservation-reminders/route.ts`.

Libraries and actions: `src/app/actions/reservation-availability.ts`, `public-reservations.ts`, `public-floor-plan.ts`, `deposits.ts`, `club-nights.ts`, `venue-payments.ts`, `src/lib/booking/{slots,rate-limit,resolve-location,party-size,phone}.ts`, `src/lib/auth/{rate-limit,action-token}.ts`, `src/lib/reservation-time.ts`, `src/lib/opening-hours.ts`, `src/lib/special-hours.ts`, `src/lib/reservations/{via,transitions,businessNight}.ts`, `src/lib/tickets/{deposit,hold-expiry,late-refund}.ts`, `src/lib/features/planVisibility.ts`, `src/lib/venues/slug.ts`, `src/lib/venue-site/locales.ts`, `src/lib/emails/i18n.ts`, `src/lib/analytics/{pixels,googleTag}.ts`, `src/lib/venue-domains/public-host.ts`, `src/lib/rwg/auth.ts`, `src/components/venue-site/{BookingForm,PublicFloorMap}.tsx`, `src/components/analytics/{VenuePixels,GoogleTagScript}.tsx`, `src/app/(main)/layout.tsx`, `src/middleware.ts`, `next.config.ts`, `netlify.toml`.

Database: `supabase/migrations/20260924100000_0292_reservation_via.sql`, `20260801134600_0196_reserve_ticket_checkout_sale_and_pause.sql`, `20260622234537_tier_deposit_min_spend.sql`, `20260923132700_0284_club_night_public_slug.sql`.

Tests: `src/test/unit/app/api/booking/reserve/route.test.ts`, `src/test/unit/app/api/booking/availability/embed-widget.test.ts`, `src/test/unit/app/embed.js/route.test.ts`, `src/test/unit/app/(main)/embed/[venueSlug]/menu/page.test.tsx`, `src/test/unit/app/actions/reservation-availability.test.ts`, `public-reservations.test.ts`, `src/test/unit/lib/booking/booking-rate-limit.test.ts`, `src/test/unit/middleware.test.ts`.

Docs: `docs/reserve-with-google.md`, `docs/plans/reservation-monetization.md`, `docs/source-of-truth.md`, `docs/legal/SERVED-Legal-Pack-v1.0.source.md`, `CUSTOMER-JOURNEY-AUDIT.md`, `docs/audits/personas/06-marek-club-events.md`, `09-piotr-fine-dining-deposits.md`, `FLOORPLAN-AUDIT.md` (staff-side floor UX only; nothing about the public picker), `GUIDELINES.md` and `AGENTS.md` (nothing on public booking or embed), `docs/venue-sites/00-design.md` (custom domain DNS only).

SiSi repo: `src/data/site.ts`, `src/i18n/ui/{pl,en,de,it,cs}.ts`, `src/i18n/legal.ts`, `src/lib/opening-hours.mjs`, `scripts/generate-headers.mjs`, `scripts/check-build.mjs`, `src/scripts/conversion-events.ts`, `netlify.toml`, `docs/sisi-elevate/{WORKING-RULES,RESEARCH,PROGRESS}.md`.
