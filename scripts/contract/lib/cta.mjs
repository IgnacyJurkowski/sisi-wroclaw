// Reservation CTA rules. The provider URL, the locale map and the tracking
// parameters are read from src/data/site.ts (source text, since that file is
// TypeScript with extensionless imports and cannot be imported by plain node).

export const REQUIRED_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

/** Parse RESERVATION_BASE_URL, RESERVATION_LOCALES and the reservationUrl() template. */
export function parseReservationSource(source) {
  const stripped = String(source).replace(/^\s*\/\/.*$/gm, '');
  const base = stripped.match(/RESERVATION_BASE_URL\s*=\s*'([^']+)'/)?.[1];
  const block = stripped.match(/RESERVATION_LOCALES[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1];
  if (!base || !block) throw new Error('src/data/site.ts no longer has a parsable RESERVATION_BASE_URL / RESERVATION_LOCALES');
  const localeMap = {};
  for (const m of block.matchAll(/(\w+):\s*'(\w+)'/g)) localeMap[m[1]] = m[2];
  const template = stripped.match(/return `\$\{reservationDestination\(locale\)\}\?([^`]+)`/)?.[1] ?? '';
  const fixed = {};
  for (const pair of template.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value && !value.includes('${')) fixed[key] = value;
  }
  return { base, localeMap, fixed };
}

/**
 * Problems with one reservation URL found on a page of `locale`.
 * @returns {string[]} empty when the CTA is correct
 */
export function ctaProblems(href, locale, { base, localeMap, fixed }) {
  const problems = [];
  let url;
  try {
    url = new URL(href);
  } catch {
    return [`not an absolute URL: ${href}`];
  }
  const expectedLocale = localeMap[locale];
  const expectedPath = `${new URL(base).pathname}/${expectedLocale}`;
  if (url.protocol !== 'https:') problems.push(`protocol ${url.protocol}, expected https:`);
  if (url.hostname !== new URL(base).hostname) problems.push(`host ${url.hostname}, expected ${new URL(base).hostname}`);
  if (url.pathname !== expectedPath) {
    problems.push(`path ${url.pathname} does not end in the locale segment "${expectedLocale}" for a ${locale} page (expected ${expectedPath})`);
  }
  for (const key of REQUIRED_UTM) {
    if (!url.searchParams.get(key)) problems.push(`missing ${key}`);
  }
  for (const [key, value] of Object.entries(fixed)) {
    if (url.searchParams.has(key) && url.searchParams.get(key) !== value) {
      problems.push(`${key}=${url.searchParams.get(key)}, expected ${value}`);
    }
  }
  return problems;
}
