// sitemap.xml parsing (the generator in src/pages/sitemap.xml.ts emits a fixed
// shape, so a tolerant regex reader is enough and keeps this dependency-free).

const unescapeXml = (value) => value
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** @returns {{ loc: string, lastmod?: string, alternates: Record<string,string> }[]} */
export function parseSitemap(xml) {
  const entries = [];
  for (const match of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const body = match[1];
    const loc = body.match(/<loc>([^<]*)<\/loc>/)?.[1];
    if (!loc) continue;
    const alternates = {};
    for (const link of body.matchAll(/<xhtml:link\b([^>]*)\/?>/g)) {
      const hreflang = link[1].match(/hreflang="([^"]*)"/)?.[1];
      const href = link[1].match(/href="([^"]*)"/)?.[1];
      if (hreflang && href) alternates[hreflang] = unescapeXml(href);
    }
    entries.push({
      loc: unescapeXml(loc.trim()),
      lastmod: body.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1],
      alternates: Object.fromEntries(Object.entries(alternates).sort(([a], [b]) => a.localeCompare(b))),
    });
  }
  return entries;
}

/** Path (with trailing slash preserved) of an absolute or relative URL. */
export function pathOf(url, origin = 'https://www.sisiwroclaw.pl') {
  const parsed = new URL(url, origin);
  return parsed.pathname;
}
