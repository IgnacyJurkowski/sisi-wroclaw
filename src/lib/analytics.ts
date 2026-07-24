/* Consent-aware analytics hook, backed by PostHog
   (bootstrap: src/scripts/analytics-init.ts; spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   Anonymous, storage-free capture is always on; persistent storage and
   session replay exist only after consent (see CookieBanner).

   Rules:
   - track() must be safe to call at any time: never throws, silently drops
     events if PostHog is unavailable.
   - NEVER include PII: no contact names, emails, phones, company names, or
     the enquiry message body. Only non-PII context (form, cta_location, …). */
import posthog from 'posthog-js/dist/module.no-external';

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

export function track(payload: AnalyticsPayload): void {
  try {
    const { event, ...properties } = payload;
    posthog.capture(event, properties);
  } catch {
    /* Analytics must never break the page. */
  }
}
