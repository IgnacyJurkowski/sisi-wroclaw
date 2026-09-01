/* Claims that must never reach the rendered site.
 *
 * These are the site-wide "unverified claim" patterns the post-build check
 * asserts against every built HTML page (scripts/check-build.mjs). They live
 * here so the content syncs can apply the exact same rule *before* writing
 * generated content into the repo: a syndicated blog article that invents an
 * age policy or a timing claim is skipped as a bad row, instead of landing in
 * the repo and failing the build gate for every other page.
 *
 * 663 m2 and up-to-500 standing are owner-verified (2026-07-14); the remaining
 * patterns still block unverified age, timing and schema claims.
 */
export const UNVERIFIED_CLAIMS = [
  ['over-21 claim', /over[-\s]?21/i],
  ['21+ claim', /21\+/i],
  ['Polish over-21 claim', /powyżej 21/i],
  ['German over-21 claim', /(?:\bab|über) 21/i],
  ['Italian over-21 claim', /maggiori di 21/i],
  ['Czech over-21 claim', /(?:\bod|starším) 21/i],
  ['120-minute claim', /120 minut/i],
  ['120-minutes claim', /120 minutes/i],
  ['geo meta tags', /<meta name="geo\./i],
  ['ICBM coordinate metadata', /<meta name="ICBM"/i],
  ['InStock availability claim', /\bInStock\b/],
];

/** Labels of every unverified claim present in `text` (empty = publishable). */
export function unverifiedClaims(text) {
  const value = String(text ?? '');
  return UNVERIFIED_CLAIMS.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}
