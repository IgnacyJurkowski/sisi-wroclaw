export function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function origin(value) {
  try { return new URL(value).origin; } catch { return null; }
}

/* Indexable pages opt into full snippets and large image previews so search
   engines and AI answer surfaces (Google AI Overviews, Bing/Copilot) can quote
   and illustrate the page without the default snippet caps. */
export const INDEXABLE_DIRECTIVE = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export function robotsDirective({ context, siteUrl, canonicalOrigin, noindex = false }) {
  const siteOrigin = origin(siteUrl);
  const canonical = origin(canonicalOrigin);
  if (context !== 'production' || !siteOrigin || !canonical || siteOrigin !== canonical) {
    return 'noindex, nofollow';
  }
  return noindex ? 'noindex, follow' : INDEXABLE_DIRECTIVE;
}
