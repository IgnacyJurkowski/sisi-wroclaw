/* Conversion instrumentation (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   One delegated capture-phase listener instead of per-component wiring, so
   components carry no analytics markup. Payloads are non-PII context only. */
import { track, type AnalyticsEvent } from '../lib/analytics';

function ctaLocation(anchor: HTMLAnchorElement): string | undefined {
  try {
    const content = new URL(anchor.href, location.href).searchParams.get('utm_content');
    if (content) return content;
  } catch {}
  return anchor.closest('[id]')?.id || undefined;
}

function eventFor(anchor: HTMLAnchorElement): AnalyticsEvent | null {
  const href = anchor.getAttribute('href') || '';
  if (href.startsWith('tel:')) return 'phone_click';
  if (href.startsWith('mailto:')) return 'email_click';
  const host = anchor.hostname;
  if (host === 'emenago.com' || host.endsWith('.emenago.com')) return 'reservation_cta_click';
  return null;
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const name = eventFor(anchor);
    if (!name) return;
    track({ event: name, page: location.pathname, cta_location: ctaLocation(anchor) });
  },
  { capture: true },
);
