const SAMPLE_TOKENS = ['adb', 'abc', 'krótki opis wydarzenia', 'junglew'];
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const GENRE = /^[\p{L}\p{N}][\p{L}\p{N} &'’+./-]{0,39}$/u;

export function validatePublicEvent(fields, dateKey) {
  const errors = [];
  if (!fields.title?.trim()) errors.push('missing Title');
  if (!/^\d{1,2}:\d{2}$/.test(fields.startTime || '')) errors.push('missing or invalid Start time');
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateKey || '')) errors.push('invalid date in filename');
  const values = [fields.title, fields.dj, fields.description, ...(fields.genres || [])]
    .filter(Boolean)
    .map((value) => String(value));
  if (values.some((value) => CONTROL.test(value))) errors.push('unsafe control character');
  if (values.some((value) => SAMPLE_TOKENS.includes(value.trim().toLocaleLowerCase('pl')))) {
    errors.push('sample-quality content');
  }
  if ((fields.genres || []).some((genre) => !GENRE.test(String(genre)))) errors.push('invalid Music Genre');
  return [...new Set(errors)];
}

export function duplicateBannerErrors(records) {
  const datesByDigest = new Map();
  for (const { dateKey, digest } of records) {
    const dates = datesByDigest.get(digest) || [];
    dates.push(dateKey);
    datesByDigest.set(digest, dates);
  }
  return [...datesByDigest]
    .filter(([, dates]) => dates.length > 1)
    .map(([digest, dates]) => `banner digest ${digest} is reused by ${dates.sort().join(', ')}`);
}
