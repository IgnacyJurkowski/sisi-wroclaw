export const SUMMER_FRIDAY_NOTICE = Object.freeze({
  storageKey: 'sisi-summer-fri-2026-dismissed',
  resolvedEvent: 'sisi:summer-notice-resolved',
  validFrom: '2026-07-17',
  validThrough: '2026-08-28',
  cutoffIso: '2026-08-28T22:00:00.000Z',
});

export const NIGHTCLUB_OPENING_HOURS = Object.freeze([
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Saturday',
    opens: '22:00',
    closes: '04:00',
  }),
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '00:00',
    closes: '00:00',
    validFrom: SUMMER_FRIDAY_NOTICE.validFrom,
    validThrough: SUMMER_FRIDAY_NOTICE.validThrough,
  }),
  Object.freeze({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Friday',
    opens: '22:00',
    closes: '04:00',
    validFrom: '2026-08-29',
  }),
]);

export function isSummerFridayNoticeActive(
  nowMs = Date.now(),
  cutoffIso = SUMMER_FRIDAY_NOTICE.cutoffIso,
) {
  const cutoffMs = Date.parse(cutoffIso);
  return Number.isFinite(nowMs) && Number.isFinite(cutoffMs) && nowMs < cutoffMs;
}
