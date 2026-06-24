/* Consent-aware analytics hook.

   No analytics provider is installed (the cookie policy states the site uses no
   analytics/marketing cookies). This module is the single, typed place to wire
   one in later. `track()` is a documented no-op until then.

   Rules when an analytics system + valid consent exist:
   - Fire only AFTER the visitor has consented (see CookieBanner).
   - NEVER include PII: no contact names, emails, phones, company names, or the
     enquiry message body. Only non-PII context (event_type, cta_location, …). */

export type AnalyticsEvent =
  | 'b2b_page_view'
  | 'b2b_enquiry_start'
  | 'b2b_enquiry_submit'
  | 'b2b_enquiry_success'
  | 'b2b_phone_click'
  | 'b2b_email_click'
  | 'b2b_case_study_open'
  | 'locale_change';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  locale?: string;
  page?: string;
  /** Non-PII context only (e.g. event_type category, cta_location). */
  [key: string]: string | number | undefined;
}

export function track(_payload: AnalyticsPayload): void {
  // Intentionally a no-op until an analytics system with valid consent exists.
}
