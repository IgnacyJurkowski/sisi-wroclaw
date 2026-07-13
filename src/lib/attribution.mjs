const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const VALUE_LIMIT = 100;
const TOTAL_LIMIT = 512;

export function campaignAttribution(search) {
  const source = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const kept = new URLSearchParams();
  for (const key of KEYS) {
    const value = source.get(key)?.trim().slice(0, VALUE_LIMIT);
    if (value) kept.set(key, value);
  }

  let output = kept.toString();
  if (output.length <= TOTAL_LIMIT) return output;
  while (output.length > TOTAL_LIMIT && [...kept.keys()].length) {
    kept.delete([...kept.keys()].at(-1));
    output = kept.toString();
  }
  return output;
}
