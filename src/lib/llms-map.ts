import { LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, TIMEZONE, type Locale } from '../i18n/config';
import { localizedPath, eventPath, articlePath, type RouteKey } from '../i18n/routes';
import { BUSINESS, CONTACT, COMPANY, VENUE_FACTS, EVENTS, splitEvents } from '../data/site';
import { articlesFor, type ArticleItem } from '../data/articles';
import { SECTIONS as FOOD_SECTIONS } from '../data/food-menu';
import { DICTS } from '../i18n/ui';

/* Build-time /llms.txt and /llms-full.txt (llmstxt.org): one map of the site
   for LLMs and AI crawlers, generated from the sources the pages themselves
   render from - the localized route map, the Polish dictionary's meta copy,
   CONTACT / COMPANY / VENUE_FACTS, and the synced event and article lists - so
   it cannot drift from the pages.

   /llms.txt is the index: venue facts plus one link and summary per page.
   /llms-full.txt is the same index followed by the full plain text of every
   Polish article, so an assistant can answer from the content without
   fetching each page.

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

/** How many recent articles the index names; the blog index carries the rest. */
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

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Sanitised article HTML -> readable Markdown-ish plain text. */
export function articleText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<h2\b[^>]*>/gi, '\n\n## ')
    .replace(/<h3\b[^>]*>/gi, '\n\n### ')
    .replace(/<h4\b[^>]*>/gi, '\n\n#### ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|ul|ol|table|tr|blockquote|h[1-6]|figure|section)>/gi, '\n\n')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === '#') {
        const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(point) ? String.fromCodePoint(point) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const articleDay = (iso: string) => iso.slice(0, 10);

/** One article as a self-contained section of llms-full.txt. */
function articleSection(article: ArticleItem, abs: (p: string) => string): string {
  const updated = article.updatedAt && articleDay(article.updatedAt) !== articleDay(article.publishedAt)
    ? `, zaktualizowano ${articleDay(article.updatedAt)}`
    : '';
  const faq = (article.faq ?? [])
    .map((item) => `**${item.question}**\n\n${item.answer}`)
    .join('\n\n');
  return [
    `## ${article.title}`,
    '',
    `Źródło: ${abs(articlePath(article.slug, article.locale))}`,
    `Opublikowano ${articleDay(article.publishedAt)}${updated}. ${article.description}`,
    '',
    articleText(article.html),
    faq ? `\n### Najczęstsze pytania\n\n${faq}` : '',
  ]
    .join('\n')
    .trimEnd();
}

export function llmsIndex(origin: string): string {
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

  return `# ${BUSINESS.name}

> ${DICTS.en.meta.home.description}

SiSi shares the R32 complex with The Cork, a restaurant that also hosts corporate events. The pages below are in Polish, the site's primary language, and resolve under ${abs(localizedPath('home', DEFAULT_LOCALE))}; every other language is listed at the end.

## O klubie

- ${pl.about.intro}
- Adres: ${CONTACT.address} - kompleks R32. ${pl.r32.body}
- Otwarte: ${pl.common.hoursDays}, ${CONTACT.hours} (${TIMEZONE}).
- Rezerwacje: ${pl.reservationsHome.terms}
- Bar: ${pl.menuPage.subtitle}
- Night Menu by The Cork: ${FOOD_SECTIONS.flatMap((section) => section.dishes.map((dish) => dish.name.pl)).join(', ')}.
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
- [Pełna treść](${abs('/llms-full.txt')}): ten plik plus pełny tekst wszystkich artykułów z bloga
`;
}

export function llmsFull(origin: string): string {
  const abs = (p: string) => origin + p;
  const articles = articlesFor(DEFAULT_LOCALE);
  if (articles.length === 0) return llmsIndex(origin);
  const sections = articles.map((article) => articleSection(article, abs)).join('\n\n');
  return `${llmsIndex(origin)}
# Artykuły z bloga - pełna treść

Każdy artykuł poniżej ma swoją stronę pod linkiem "Źródło"; cytując, odsyłaj do niej.

${sections}
`;
}
