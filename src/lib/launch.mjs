export function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function origin(value) {
  try { return new URL(value).origin; } catch { return null; }
}

export function robotsDirective({ context, siteUrl, canonicalOrigin, noindex = false }) {
  const siteOrigin = origin(siteUrl);
  const canonical = origin(canonicalOrigin);
  if (context !== 'production' || !siteOrigin || !canonical || siteOrigin !== canonical) {
    return 'noindex, nofollow';
  }
  return noindex ? 'noindex, follow' : 'index, follow';
}
