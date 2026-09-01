/* The club's published opening hours, shared by the venue JSON-LD.
 *
 * The 2026 summer break (Fridays closed through 28 August 2026) is over, so
 * both nights are back on the regular schedule and the specification carries no
 * validFrom/validThrough windows.
 */
export const NIGHTCLUB_OPENING_HOURS = Object.freeze([
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '22:00',
    closes: '04:00',
  }),
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Saturday',
    opens: '22:00',
    closes: '04:00',
  }),
]);
