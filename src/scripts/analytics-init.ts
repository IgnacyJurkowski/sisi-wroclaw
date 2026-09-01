/* PostHog bootstrap (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   The no-external build cannot load remote code; the replay recorder ships as
   a lazy same-origin chunk. All traffic rides the /ph proxy (netlify.toml),
   so the CSP stays exactly `connect-src 'self'`.

   Consent contract (src/lib/consent.mjs): no decision or 'denied' -> memory
   persistence, recording off, anonymous events still counted; 'granted' ->
   persistent storage + masked session replay. Failures here must never
   affect the page.

   Startup cost: posthog-js is ~75 KB gzipped and its init is the single
   largest piece of script work on every page (about 60 ms of main thread on
   a fast desktop, a quarter of a second on a slow one), and nothing the
   visitor sees depends on it. So it loads after `load` + idle, off the
   critical path: the vendor chunk is not in any page's startup module graph.
   Conversion events fired before then queue in src/lib/analytics.ts and
   flush once the client attaches; the pageview is captured at init as
   before, a moment later. Consent is read at init time, so a decision made
   while PostHog was still loading is honoured. */
import { attachAnalyticsClient } from '../lib/analytics';
import {
  CONSENT_DENIED,
  CONSENT_EVENT,
  CONSENT_GRANTED,
  readConsent,
  safeLocalStorage,
} from '../lib/consent.mjs';

// Public project API key (EU project 231773 "SiSi Wrocław") - publishable, not a secret.
const POSTHOG_TOKEN = 'phc_xGAJevJfPpYyrixXMnpJb43nDCz2fVHpnJBbaoDyNgeu';

const load = () => import('posthog-js/dist/module.no-external').then((module) => module.default);
type PostHog = Awaited<ReturnType<typeof load>>;

let posthog: PostHog | undefined;

// Tracks the latest known consent decision so a slow-resolving import in
// enableConsentedMode() can't re-enable recording after a withdrawal that
// happened while it was in flight.
let currentConsent: string | null = null;

async function enableConsentedMode(): Promise<void> {
  try {
    // Registers the replay recorder before recording starts; kept a separate
    // chunk by astro.config.mjs manualChunks so it downloads only on consent.
    await import('posthog-js/dist/posthog-recorder');
    if (currentConsent !== CONSENT_GRANTED || !posthog) return;
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.startSessionRecording();
  } catch {}
}

function disableConsentedMode(): void {
  if (!posthog) return;
  try {
    posthog.stopSessionRecording();
    posthog.set_config({ persistence: 'memory' });
    // Drops the ph_* identifiers written while consent was in force.
    posthog.reset();
  } catch {}
}

async function boot(): Promise<void> {
  try {
    const client = await load();
    client.init(POSTHOG_TOKEN, {
      api_host: '/ph',
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      disable_session_recording: true,
      person_profiles: 'identified_only',
      session_recording: { maskAllInputs: true },
    });
    posthog = client;
    attachAnalyticsClient(client);
    currentConsent = readConsent(safeLocalStorage());
    if (currentConsent === CONSENT_GRANTED) void enableConsentedMode();
    document.addEventListener(CONSENT_EVENT, (event) => {
      const value = (event as CustomEvent<{ value?: string }>).detail?.value;
      currentConsent = value === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DENIED;
      if (currentConsent === CONSENT_GRANTED) void enableConsentedMode();
      else disableConsentedMode();
    });
  } catch {}
}

function afterLoadAndIdle(run: () => void): void {
  const idle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1500 });
    else window.setTimeout(run, 300);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

afterLoadAndIdle(() => {
  void boot();
});
