// Pure mapping + validation for BabyLoveGrowth articles (no IO here, so it is
// fully unit-testable). scripts/sync-articles.mjs composes this with the API
// client, the sanitiser and sharp.
//
// API fields (https://api.babylovegrowth.ai/api/integrations/v1/articles):
//   title, content_html, content_markdown, slug, meta_description,
//   hero_image_url, jsonLd, faqJsonLd, languageCode, publishedAt
// The payload mixes snake_case and camelCase, so every read goes through
// pick() and tolerates either spelling.
//
// Bad-row policy: anything that cannot be published safely returns errors and
// the sync skips just that article. Only aggregate failures (see sync-articles)
// stop the run and keep the last-good generated file.

import { unverifiedClaims } from '../../src/lib/claims.mjs';
import {
  dropLeadingTitle,
  excerptFrom,
  readingMinutes,
  residualRisk,
  sanitizeArticleHtml,
} from './sanitize.mjs';

/** Minimum plain-text length for a publishable article (stub guard). */
const MIN_TEXT_LENGTH = 400;
const MAX_DESCRIPTION = 300;
const MAX_TITLE = 200;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const PLACEHOLDER = /\b(?:lorem ipsum|placeholder text|tu wpisz|insert your)\b/i;

export function pick(source, ...names) {
  for (const name of names) {
    const value = source?.[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** "pl-PL" / "PL" / "pol" -> "pl"; unknown or unsupported -> null. */
export function localeFor(languageCode, locales) {
  const primary = String(languageCode ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return locales.includes(primary) ? primary : null;
}

/** URL-safe slug: lowercased, de-accented, single dashes. '' when unusable. */
export function normalizeSlug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/gi, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/** Accepts full ISO timestamps and bare dates; returns an ISO string or null. */
export function normalizeDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Question/answer pairs out of the vendor's FAQPage JSON-LD (string or object).
    Answers are reduced to plain text - we re-emit the schema ourselves, so no
    vendor markup or vendor URL is carried into our <head>. */
export function faqPairs(raw) {
  const node = asObject(raw);
  const entities = node && Array.isArray(node.mainEntity) ? node.mainEntity : [];
  const pairs = [];
  for (const entity of entities) {
    const question = plainText(pick(entity ?? {}, 'name', 'question'));
    const answer = plainText(pick(entity?.acceptedAnswer ?? {}, 'text') ?? pick(entity ?? {}, 'text'));
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs.slice(0, 20);
}

/** Vendor keywords, when the article's JSON-LD carries them. */
export function keywordsFrom(raw) {
  const node = asObject(raw);
  const value = node ? pick(node, 'keywords') : undefined;
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(list.map((entry) => String(entry).trim()).filter(Boolean))].slice(0, 12);
}

/**
 * Map one API article onto the site's ArticleItem, or explain why it cannot be
 * published.
 * @returns {{ article: object|null, errors: string[], warnings: string[] }}
 */
export function normalizeArticle(raw, { locales, canonicalOrigin, bareHosts = [] }) {
  const errors = [];
  const warnings = [];
  const slug = normalizeSlug(pick(raw, 'slug', 'url_slug', 'urlSlug'));
  const title = collapse(pick(raw, 'title', 'headline'));
  const locale = localeFor(pick(raw, 'languageCode', 'language_code', 'language'), locales);
  const publishedAt = normalizeDate(pick(raw, 'publishedAt', 'published_at', 'createdAt', 'created_at'));
  const updatedAt = normalizeDate(pick(raw, 'updatedAt', 'updated_at', 'modifiedAt'));

  if (!slug) errors.push('missing or unusable slug');
  if (!title) errors.push('missing title');
  if (title && title.length > MAX_TITLE) errors.push('title is implausibly long');
  if (!locale) errors.push(`unsupported languageCode "${pick(raw, 'languageCode', 'language_code', 'language') ?? ''}"`);
  if (!publishedAt) errors.push('missing or invalid publishedAt');

  const body = dropLeadingTitle(
    sanitizeArticleHtml(pick(raw, 'content_html', 'contentHtml', 'content'), { canonicalOrigin, bareHosts }),
    title,
  );
  warnings.push(...body.warnings);

  if (!body.html) errors.push('empty content_html after sanitising');
  // The sanitiser reports this when a raw-text element never closed, which
  // means everything after it was discarded - publish nothing rather than a
  // silently truncated article.
  for (const warning of body.warnings.filter((w) => w.startsWith('unterminated'))) {
    errors.push(`truncated body: ${warning}`);
  }
  if (body.text.length < MIN_TEXT_LENGTH) errors.push(`content too short (${body.text.length} chars)`);
  const risky = residualRisk(body.html);
  if (risky.length) errors.push(`unsafe markup survived sanitising: ${risky.join(', ')}`);
  // Backstop for the site-wide "no bare origin" gate: if any form still slipped
  // through the rewrite, skip this row rather than let it fail the whole build.
  for (const host of bareHosts) {
    if (new RegExp(`https?://${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(body.html)) {
      errors.push('bare (non-www) origin survived sanitising');
      break;
    }
  }

  const description = collapse(pick(raw, 'meta_description', 'metaDescription', 'description'))
    || excerptFrom(body.text, 155);

  const heroSource = httpsUrl(pick(raw, 'hero_image_url', 'heroImageUrl', 'coverImageUrl', 'image'));
  if (!heroSource && pick(raw, 'hero_image_url', 'heroImageUrl')) {
    warnings.push('ignored non-https hero_image_url');
  }

  // Only FAQ entries the page will actually render are kept: Google expects
  // FAQPage markup to match visible content, and the vendor often repeats the
  // questions inside the body already.
  const faq = faqPairs(pick(raw, 'faqJsonLd', 'faq_json_ld')).filter(
    (entry) => !body.text.toLowerCase().includes(entry.question.toLowerCase()),
  );
  const keywords = keywordsFrom(pick(raw, 'jsonLd', 'json_ld'));

  // Scan everything this article puts on the page, not just its prose: the
  // build gate reads the rendered HTML, so a claim hiding in the slug, an
  // image alt, a link title, an FAQ answer or a keyword would sail past this
  // guard and then fail `npm test` for the whole site.
  const scanned = [
    title,
    description,
    slug,
    body.html,
    body.text,
    ...faq.flatMap((entry) => [entry.question, entry.answer]),
    ...keywords,
  ]
    .filter(Boolean)
    .join('\n');
  const claims = unverifiedClaims(scanned);
  if (claims.length) errors.push(`unverified claim: ${claims.join(', ')}`);
  if (CONTROL.test(scanned)) errors.push('unsafe control character');
  if (PLACEHOLDER.test(scanned)) errors.push('placeholder-quality content');

  if (errors.length) return { article: null, errors: [...new Set(errors)], warnings };

  return {
    article: {
      slug,
      locale,
      title,
      description: description.slice(0, MAX_DESCRIPTION),
      excerpt: excerptFrom(body.text, 200),
      html: body.html,
      publishedAt,
      ...(updatedAt && updatedAt !== publishedAt ? { updatedAt } : {}),
      readingMinutes: readingMinutes(body.text),
      ...(heroSource ? { heroSource } : {}),
      ...(faq.length ? { faq } : {}),
      ...(keywords.length ? { keywords } : {}),
    },
    errors: [],
    warnings,
  };
}

/** Newest first, then slug - a stable order for the generated file. */
export function sortArticles(articles) {
  return [...articles].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
  );
}

/** Keep the newest article per (locale, slug); report the ones dropped. */
export function dedupe(articles) {
  const kept = new Map();
  const dropped = [];
  for (const article of sortArticles(articles)) {
    const key = `${article.locale}/${article.slug}`;
    if (kept.has(key)) dropped.push(key);
    else kept.set(key, article);
  }
  return { articles: [...kept.values()], dropped };
}

function asObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return Array.isArray(raw) ? (asObject(raw[0]) ?? null) : raw;
  try {
    const parsed = JSON.parse(String(raw));
    return typeof parsed === 'object' && parsed !== null ? asObject(parsed) : null;
  } catch {
    return null;
  }
}

function plainText(value) {
  return collapse(String(value ?? '').replace(/<[^>]*>/g, ' ')).slice(0, 900);
}

function collapse(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function httpsUrl(value) {
  const raw = String(value ?? '').trim();
  if (!/^https:\/\//i.test(raw)) return null;
  try {
    return new URL(raw).href;
  } catch {
    return null;
  }
}
