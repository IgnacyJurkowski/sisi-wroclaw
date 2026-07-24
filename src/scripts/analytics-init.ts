/* PostHog bootstrap (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   The no-external build cannot load remote code; the replay recorder ships as
   a lazy same-origin chunk. All traffic rides the /ph proxy (netlify.toml),
   so the CSP stays exactly `connect-src 'self'`.

   Consent contract (src/lib/consent.mjs): no decision or 'denied' -> memory
   persistence, recording off, anonymous events still counted; 'granted' ->
   persistent storage + masked session replay. Failures here must never
   affect the page. */
import posthog from 'posthog-js/dist/module.no-external';
import {
  CONSENT_EVENT,
  CONSENT_GRANTED,
  readConsent,
  safeLocalStorage,
} from '../lib/consent.mjs';

// Public project API key (EU project 218919) - publishable, not a secret.
const POSTHOG_TOKEN = 'phc_oLoNUCSdjqTiUrtPTfeiAYYUHFUWcA4ZieZEypzed4SF';

async function enableConsentedMode(): Promise<void> {
  try {
    // Registers the replay recorder before recording starts; kept a separate
    // chunk by astro.config.mjs manualChunks so it downloads only on consent.
    await import('posthog-js/dist/posthog-recorder');
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.startSessionRecording();
  } catch {}
}

function disableConsentedMode(): void {
  try {
    posthog.stopSessionRecording();
    posthog.set_config({ persistence: 'memory' });
    // Drops the ph_* identifiers written while consent was in force.
    posthog.reset();
  } catch {}
}

try {
  posthog.init(POSTHOG_TOKEN, {
    api_host: '/ph',
    ui_host: 'https://eu.posthog.com',
    persistence: 'memory',
    disable_session_recording: true,
    person_profiles: 'identified_only',
    session_recording: { maskAllInputs: true },
  });
  if (readConsent(safeLocalStorage()) === CONSENT_GRANTED) void enableConsentedMode();
  document.addEventListener(CONSENT_EVENT, (event) => {
    const value = (event as CustomEvent<{ value?: string }>).detail?.value;
    if (value === CONSENT_GRANTED) void enableConsentedMode();
    else disableConsentedMode();
  });
} catch {}
