/* Blog articles synced from BabyLoveGrowth.
 *
 * The vendor writes SEO articles; scripts/sync-articles.mjs pulls them over the
 * integrations API, sanitises the HTML and commits articles.generated.ts. The
 * site renders only from that generated file, so the build never depends on the
 * API and the rate-limited endpoint is hit once per sync, not once per request.
 *
 * Articles are single-language: each one is published under the locale that
 * matches its `languageCode`, at /<locale>/blog/<slug>/. When the same slug
 * exists in several locales (a translated set) the pages cross-link via
 * hreflang; otherwise an article stands alone with a self-canonical.
 *
 * Do NOT hand-edit articles.generated.ts - the next sync overwrites it.
 */

import { LOCALES, type Locale } from '../i18n/config';
import { articlePath, localizedPath } from '../i18n/routes';
import { BUSINESS } from './site';
import { GENERATED_ARTICLES } from './articles.generated';

export type ArticleFaq = { question: string; answer: string };

export type ArticleItem = {
  /** url-safe id; the page lives at articlePath(slug, locale). */
  slug: string;
  /** site locale derived from the article's languageCode. */
  locale: Locale;
  title: string;
  /** meta description (vendor `meta_description`, or a generated lead). */
  description: string;
  /** plain-text lead shown on the blog index cards. */
  excerpt: string;
  /** sanitised article body (allow-listed tags only - see the sync). */
  html: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  /** vendor hero URL, kept so the sync can skip re-encoding an unchanged image.
      Never rendered - the published image is the self-hosted `img` below. */
  heroSource?: string;
  img?: string;
  imgSrcset?: string;
  imgWidth?: number;
  imgHeight?: number;
  faq?: ArticleFaq[];
  keywords?: string[];
};

export const ARTICLES: ArticleItem[] = GENERATED_ARTICLES;

/** Widest hero variant a blog-index card may load. The card slot is ~370 CSS
    px (92vw on a 400px phone), so 640w covers it up to ~1.75x; letting a 2.6x
    phone pick the 800/1080 hero doubles the bytes for a thumbnail nobody can
    tell apart. */
export const CARD_MAX_WIDTH = 640;

/** src + srcset for a card: the hero srcset with every candidate above
    `maxWidth` dropped, src being the widest that remains. Falls back to the
    hero itself when the srcset is absent or has nothing small enough. */
export function cardImage(
  article: Pick<ArticleItem, 'img' | 'imgSrcset'>,
  maxWidth: number = CARD_MAX_WIDTH,
): { src: string; srcset?: string } | undefined {
  if (!article.img) return undefined;
  const candidates = (article.imgSrcset ?? '')
    .split(',')
    .map((entry) => entry.trim().match(/^(\S+)\s+(\d+)w$/))
    .filter((match): match is RegExpMatchArray => !!match)
    .map((match) => ({ url: match[1], width: Number(match[2]) }))
    .filter((candidate) => candidate.width <= maxWidth)
    .sort((a, b) => a.width - b.width);
  if (candidates.length === 0) return { src: article.img, srcset: article.imgSrcset };
  return {
    src: candidates[candidates.length - 1].url,
    srcset: candidates.map((candidate) => `${candidate.url} ${candidate.width}w`).join(', '),
  };
}

/** Articles for one locale, newest first. */
export function articlesFor(locale: Locale, list: ArticleItem[] = ARTICLES): ArticleItem[] {
  return list
    .filter((article) => article.locale === locale)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Whether the blog has anything to show in this locale - drives the footer
    link and the sitemap, exactly like the empty-calendar events rule. */
export function hasArticles(locale: Locale, list: ArticleItem[] = ARTICLES): boolean {
  return list.some((article) => article.locale === locale);
}

/** Locales that publish the same slug (a translated set), for hreflang. */
export function articleLocales(slug: string, list: ArticleItem[] = ARTICLES): Locale[] {
  const locales = new Set(list.filter((article) => article.slug === slug).map((a) => a.locale));
  return LOCALES.filter((locale) => locales.has(locale));
}

/** hreflang alternates for the blog hub: only locales that have articles, so
    the set never points at an empty, noindexed hub. */
export function blogAlternates(list: ArticleItem[] = ARTICLES) {
  return LOCALES.filter((locale) => hasArticles(locale, list)).map((locale) => ({
    locale,
    path: localizedPath('blog', locale),
  }));
}

/** hreflang alternates for one article: only the locales it exists in. */
export function articleAlternates(slug: string, list: ArticleItem[] = ARTICLES) {
  return articleLocales(slug, list).map((locale) => ({ locale, path: articlePath(slug, locale) }));
}

function absolute(path: string) {
  return `${BUSINESS.url}${path}`;
}

/** BlogPosting + breadcrumbs (+ FAQ when the article carries one).
    The vendor's own JSON-LD points at their hosting, so the article node is
    rebuilt here against our canonical URLs and the site entity graph. */
export function articleSchema(article: ArticleItem, locale: Locale): Record<string, unknown>[] {
  const url = absolute(articlePath(article.slug, locale));
  const posting: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.description,
    inLanguage: locale,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@id': `${BUSINESS.url}/#organization` },
    publisher: { '@id': `${BUSINESS.url}/#nightclub` },
    isPartOf: { '@id': `${BUSINESS.url}/#website` },
  };
  if (article.img) posting.image = [absolute(article.img)];
  if (article.keywords?.length) posting.keywords = article.keywords.join(', ');

  const schemas: Record<string, unknown>[] = [posting, breadcrumbSchema(article, locale)];
  if (article.faq?.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: article.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      })),
    });
  }
  return schemas;
}

function breadcrumbSchema(article: ArticleItem, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BUSINESS.name, item: absolute(localizedPath('home', locale)) },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: absolute(localizedPath('blog', locale)) },
      { '@type': 'ListItem', position: 3, name: article.title, item: absolute(articlePath(article.slug, locale)) },
    ],
  };
}

/** Blog index entity listing the articles rendered on the hub page. */
export function blogSchema(articles: ArticleItem[], locale: Locale): Record<string, unknown>[] {
  if (!articles.length) return [];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      url: absolute(localizedPath('blog', locale)),
      inLanguage: locale,
      publisher: { '@id': `${BUSINESS.url}/#nightclub` },
      // Same @id as the node the article page emits, so the two describe one
      // entity rather than two unlinked ones.
      blogPost: articles.map((article) => ({
        '@type': 'BlogPosting',
        '@id': `${absolute(articlePath(article.slug, locale))}#article`,
        headline: article.title,
        url: absolute(articlePath(article.slug, locale)),
        datePublished: article.publishedAt,
      })),
    },
  ];
}
