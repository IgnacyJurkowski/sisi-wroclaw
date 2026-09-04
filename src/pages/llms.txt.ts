import type { APIRoute } from 'astro';
import { LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, TIMEZONE, type Locale } from '../i18n/config';
import { localizedPath, eventPath, articlePath, type RouteKey } from '../i18n/routes';
import { BUSINESS, CONTACT, COMPANY, VENUE_FACTS, EVENTS, splitEvents } from '../data/site';
import { articlesFor } from '../data/articles';
import { DICTS } from '../i18n/ui';

/* Build-time /llms.txt (llmstxt.org): one map of the site for LLMs and AI
   crawlers, replacing the hand-written public/llms.txt so it cannot drift.
   Every line is generated from the sources the pages themselves render from -
   the localized route map, the Polish dictionary's meta copy, CONTACT /
   COMPANY / VENUE_FACTS, and the synced event and article lists.

   Polish is the site's primary language, so the page list is Polish, with the
   English summary up top for discovery and the other locales linked at the end.
   Sitemap-parity: the events hub and the blog are listed only when they have
   something in them, exactly like sitemap.xml.ts and the footer. */

/** Pages about going out - what a model is asked about most. */
const PROGRAMME_KEYS: RouteKey[] = ['menu', 'events', 'blog'];

/** Booking and hire pages. */
const BOOKING_KEYS: RouteKey[] = ['reservations', 'privateEvents', 'corporate', 'careers'];

/** Contact and legal pages. */
const LEGAL_KEYS: RouteKey[] = ['contact', 'terms', 'privacy', 'cookies'];

/** How many recent articles to name; the blog index carries the rest. */
const ARTICLE_LIMIT = 8;

/** English exonyms for the language list - LOCALE_NAMES holds native names. */
const ENGLISH_LOCALE_NAMES: Record<Locale, string> = {
  pl: 'Polish',
  en: 'English',
  de: 'German',
  it: 'Italian',
  cs: 'Czech',
};

const eventDate = (iso: string) =>
  new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(new Date(iso));

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? 'https://www.sisiwroclaw.pl/').replace(/\/$/, '');
  const abs = (p: string) => origin + p;
  const pl = DICTS.pl;

  const articles = articlesFor(DEFAULT_LOCALE);
  const { upcoming } = splitEvents();
  const listed = (key: RouteKey) =>
    (key !== 'events' || EVENTS.length > 0) && (key !== 'blog' || articles.length > 0);

  const link = (key: RouteKey) =>
    `- [${pl.meta[key].title}](${abs(localizedPath(key, DEFAULT_LOCALE))}): ${pl.meta[key].description}`;
  const links = (keys: RouteKey[]) => keys.filter(listed).map(link).join('\n');

  const eventLines = upcoming.map(
    (ev) =>
      `- [${ev.title}](${abs(eventPath(ev.slug, DEFAULT_LOCALE))}): ${eventDate(ev.start)}` +
      (typeof ev.price === 'number' ? `, ${ev.price === 0 ? 'wstęp wolny' : `wstęp ${ev.price} zł`}` : ''),
  );

  const articleLines = articles
    .slice(0, ARTICLE_LIMIT)
    .map((a) => `- [${a.title}](${abs(articlePath(a.slug, DEFAULT_LOCALE))}): ${a.description}`);

  const languages = LOCALES.filter((l) => l !== DEFAULT_LOCALE).map(
    (l) => `- [${LOCALE_NAMES[l]}](${abs(localizedPath('home', l))}): the whole site in ${ENGLISH_LOCALE_NAMES[l]}`,
  );

  const section = (heading: string, lines: string) => (lines ? `\n## ${heading}\n\n${lines}\n` : '');

  const body = `# ${BUSINESS.name}

> ${DICTS.en.meta.home.description}

SiSi shares the R32 complex with The Cork, a restaurant that also hosts corporate events. The pages below are in Polish, the site's primary language, and resolve under ${abs(localizedPath('home', DEFAULT_LOCALE))}; every other language is listed at the end.

## O klubie

- ${pl.about.intro}
- Adres: ${CONTACT.address} - kompleks R32. ${pl.r32.body}
- Otwarte: ${pl.common.hoursDays}, ${CONTACT.hours} (${TIMEZONE}).
- Rezerwacje: ${pl.reservationsHome.terms}
- Bar: ${pl.menuTeaser.tabs[0].body} ${pl.menuTeaser.tabs[1].body}
- Night Menu: ${pl.menuTeaser.tabs[2].body}
- Eventy: ${pl.homeB2B.body} Powierzchnia ${VENUE_FACTS.areaSqm} m², do ${VENUE_FACTS.theCorkSeated} miejsc siedzących w The Cork, do ${VENUE_FACTS.standingBuffet} osób w formule stojącej i ${VENUE_FACTS.presentationScreens} ekrany prezentacyjne.
- Kontakt: ${CONTACT.phone}, ${CONTACT.email}; eventy ${CONTACT.eventsPhone}, ${CONTACT.eventsEmail}.
- Podmiot prowadzący: ${COMPANY.legalName} (NIP ${COMPANY.nip}, KRS ${COMPANY.krs}).

## Menu, wydarzenia i blog

${links(PROGRAMME_KEYS)}
${section('Nadchodzące wydarzenia', eventLines.join('\n'))}${section('Ostatnie artykuły', articleLines.join('\n'))}
## Eventy i rezerwacje

${links(BOOKING_KEYS)}

## Kontakt i informacje prawne

${links(LEGAL_KEYS)}

## Optional

${languages.join('\n')}
- [R32](https://www.r32.com.pl/): kompleks, w którym działają SiSi i restauracja The Cork (${CONTACT.address})
- [Instagram](${CONTACT.instagram}): zapowiedzi wydarzeń i zdjęcia z klubu
- [Facebook](${CONTACT.facebook}): zapowiedzi wydarzeń i informacje o otwarciu
- [TripAdvisor](${CONTACT.tripadvisor}): opinie gości o SISI Wrocław Music Club
- [Sitemap](${abs('/sitemap.xml')}): wszystkie strony we wszystkich językach, z alternatywami hreflang
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
