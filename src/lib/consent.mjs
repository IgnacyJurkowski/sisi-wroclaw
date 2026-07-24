/* Analytics consent state (spec:
   docs/superpowers/specs/2026-07-24-posthog-analytics-design.md).

   Pure helpers over an injected Storage-like object so node:test can exercise
   denial and garbage states without a browser. Storage failures never throw:
   reads fall back to "no decision", writes report false, and callers keep a
   page-local decision so the UI still responds. */

export const CONSENT_KEY = 'sisi-analytics-consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';
/* CustomEvent name the banner and withdraw control dispatch on document. */
export const CONSENT_EVENT = 'sisi-consent-change';
/* Retired records from the dismiss-only notice era; removal-only forever. */
export const LEGACY_KEYS = ['sisi-cookie-notice', 'sisi-cookie-consent'];

export function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readConsent(storage) {
  try {
    const value = storage ? storage.getItem(CONSENT_KEY) : null;
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(storage, value) {
  if (value !== CONSENT_GRANTED && value !== CONSENT_DENIED) return false;
  try {
    if (!storage) return false;
    storage.setItem(CONSENT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLegacyKeys(storage) {
  for (const key of LEGACY_KEYS) {
    try {
      storage?.removeItem(key);
    } catch {}
  }
}
