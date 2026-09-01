/* Google Analytics 4 (G-ZNZDE3DTGP).
 *
 * This is the vendor's standard gtag snippet, with two changes the site forces:
 *
 *  - it is a same-origin module rather than an inline <script>. The build's CSP
 *    generator permits exactly one inline script and throws on any other, so
 *    the pasted snippet would fail `npm run build` outright. The hosts it talks
 *    to are named in the CSP instead (scripts/generate-headers.mjs).
 *  - it loads only once analytics consent is in force, like PostHog, because
 *    gtag.js writes _ga cookies and the cookie policy has to stay true. On
 *    withdrawal the cookies it wrote are cleared and no further hits are sent.
 *
 * Failures here must never affect the page.
 */
import {
  CONSENT_EVENT,
  CONSENT_GRANTED,
  readConsent,
  safeLocalStorage,
} from '../lib/consent.mjs';

const MEASUREMENT_ID = 'G-ZNZDE3DTGP';

declare global {
  interface Window {
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

type Gtag = (...args: unknown[]) => void;

// gtag.js reads each dataLayer entry as an arguments object, so this keeps the
// snippet's exact `dataLayer.push(arguments)` shape rather than pushing arrays.
const gtag = function gtag(this: unknown) {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments);
} as Gtag;

let started = false;

function start(): void {
  if (started) return;
  started = true;
  window.dataLayer = window.dataLayer || [];

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(tag);

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);
}

/** Withdrawal: stop sending, and drop the cookies gtag.js set. */
function stop(): void {
  window[`ga-disable-${MEASUREMENT_ID}`] = true;
  const domain = location.hostname.replace(/^www\./, '');
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name || !/^_ga/.test(name)) continue;
    for (const scope of [`domain=.${domain};`, `domain=${location.hostname};`, '']) {
      document.cookie = `${name}=; path=/; ${scope} expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

try {
  if (readConsent(safeLocalStorage()) === CONSENT_GRANTED) start();
  document.addEventListener(CONSENT_EVENT, (event) => {
    const value = (event as CustomEvent<{ value?: string }>).detail?.value;
    if (value === CONSENT_GRANTED) {
      window[`ga-disable-${MEASUREMENT_ID}`] = false;
      start();
    } else {
      stop();
    }
  });
} catch {}
