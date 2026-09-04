/* Consent-aware analytics hook, backed by PostHog
   (bootstrap: src/scripts/analytics-init.ts; spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   Anonymous, storage-free capture is always on; persistent storage and
   session replay exist only after consent (see CookieBanner).

   PostHog itself is not on the page's startup path: analytics-init.ts loads
   it after `load` + idle and attaches it here. Until then track() queues, so
   a click in the first second of a visit is still captured, just a moment
   later, and this module never pulls the vendor bundle into a page's initial
   module graph.

   Rules:
   - track() must be safe to call at any time: never throws, silently drops
     events if PostHog is unavailable.
   - NEVER include PII: no contact names, emails, phones, company names, or
     the enquiry message body. Only non-PII context (form, cta_location, …). */

export type AnalyticsEvent =
  | 'reservation_cta_click'
  | 'phone_click'
  | 'email_click'
  | 'enquiry_submit'
  | 'enquiry_success';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  locale?: string;
  page?: string;
  /** Non-PII context only (e.g. form name, cta_location). */
  [key: string]: string | number | undefined;
}

export interface AnalyticsClient {
  capture(event: string, properties?: Record<string, unknown>): unknown;
}

/** Events that fire before the client is attached wait here; a page that
    never attaches one (analytics blocked) simply stops collecting at the cap. */
const QUEUE_LIMIT = 50;

let client: AnalyticsClient | undefined;
const pending: AnalyticsPayload[] = [];

function send(target: AnalyticsClient, payload: AnalyticsPayload): void {
  const { event, ...properties } = payload;
  target.capture(event, properties);
}

export function track(payload: AnalyticsPayload): void {
  try {
    if (client) send(client, payload);
    else if (pending.length < QUEUE_LIMIT) pending.push(payload);
  } catch {
    /* Analytics must never break the page. */
  }
}

/** Called once by analytics-init.ts when PostHog is ready; flushes the queue. */
export function attachAnalyticsClient(next: AnalyticsClient): void {
  client = next;
  for (const payload of pending.splice(0)) {
    try {
      send(next, payload);
    } catch {
      /* Analytics must never break the page. */
    }
  }
}
