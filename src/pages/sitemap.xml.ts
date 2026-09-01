import type { APIRoute } from 'astro';
import { LOCALES, DEFAULT_LOCALE } from '../i18n/config';
import { ROUTE_KEYS, localizedPath, eventPath, articlePath } from '../i18n/routes';
import { EVENTS } from '../data/site';
import { ARTICLES, articleLocales, hasArticles } from '../data/articles';


// Build-time sitemap covering every locale of every route, each with full
// hreflang alternates + x-default. Stays in sync with the central route map.
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? 'https://www.sisiwroclaw.pl/').replace(/\/$/, '');
  const abs = (p: string) => origin + p;
  // Empty hubs stay out of the index until they have something to show; both
  // restore automatically on the next content sync.
  const publicRouteKeys = ROUTE_KEYS.filter((key) => key !== 'events' || EVENTS.length > 0);

  const urls = publicRouteKeys.flatMap((key) => {
    // The blog hub only exists where the locale has articles, so its alternates
    // must not point at an empty, noindexed hub.
    const altLocales = key === 'blog' ? LOCALES.filter((locale) => hasArticles(locale)) : LOCALES;
    return altLocales.map((locale) => {
      const alts = altLocales
        .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(localizedPath(key, l))}"/>`)
        .join('');
      // Base.astro derives x-default from the same rule (the default locale must
      // be in the set); the two annotations have to agree for one URL.
      const xdefault = altLocales.includes(DEFAULT_LOCALE)
        ? `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(localizedPath(key, DEFAULT_LOCALE))}"/>`
        : '';
      return `  <url><loc>${abs(localizedPath(key, locale))}</loc>${alts}${xdefault}</url>`;
    });
  });

  // One entry per (event, locale) detail page, each with full hreflang alternates.
  const eventUrls = EVENTS.flatMap((ev) =>
    LOCALES.map((locale) => {
      const alts = LOCALES.map(
        (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(eventPath(ev.slug, l))}"/>`,
      ).join('');
      const xdefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(eventPath(ev.slug, DEFAULT_LOCALE))}"/>`;
      return `  <url><loc>${abs(eventPath(ev.slug, locale))}</loc>${alts}${xdefault}</url>`;
    }),
  );

  // One entry per article, under its own locale only. hreflang alternates cover
  // just the locales that publish the same slug (a translated set).
  const articleUrls = ARTICLES.map((article) => {
    const locales = articleLocales(article.slug);
    const alts = locales
      .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(articlePath(article.slug, l))}"/>`)
      .join('');
    const xdefault = locales.includes(DEFAULT_LOCALE)
      ? `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(articlePath(article.slug, DEFAULT_LOCALE))}"/>`
      : '';
    return `  <url><loc>${abs(articlePath(article.slug, article.locale))}</loc>${alts}${xdefault}</url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...urls, ...eventUrls, ...articleUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
