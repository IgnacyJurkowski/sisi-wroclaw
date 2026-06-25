import type { APIRoute } from 'astro';
import { LOCALES, DEFAULT_LOCALE } from '../i18n/config';
import { ROUTE_KEYS, localizedPath, eventPath } from '../i18n/routes';
import { EVENTS } from '../data/site';

// Build-time sitemap covering every locale of every route, each with full
// hreflang alternates + x-default. Stays in sync with the central route map.
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? 'https://sisiwroclaw.pl/').replace(/\/$/, '');
  const abs = (p: string) => origin + p;

  const urls = ROUTE_KEYS.flatMap((key) =>
    LOCALES.map((locale) => {
      const alts = LOCALES.map(
        (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(localizedPath(key, l))}"/>`,
      ).join('');
      const xdefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(localizedPath(key, DEFAULT_LOCALE))}"/>`;
      return `  <url><loc>${abs(localizedPath(key, locale))}</loc>${alts}${xdefault}</url>`;
    }),
  );

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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...urls, ...eventUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
