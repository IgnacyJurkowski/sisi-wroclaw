// Articles sync: pulls the BabyLoveGrowth blog feed into
// src/data/articles.generated.ts (committed) plus optimized hero images in
// public/blog/. The rendered blog (BlogPage / BlogArticlePage / sitemap) reads
// only the generated file, so the Astro build never depends on the vendor API
// being reachable - and the rate-limited API is called once per sync instead of
// once per page view.
//
//   BABYLOVEGROWTH_API_KEY=<key>   (CI secret; also works locally)
//
// Bad-row policy (mirrors the events sync):
//   - article fails validation / sanitising  -> skip + report, keep the rest
//   - detail fetch fails but we published it -> carry the last-good copy over
//   - more than half the detail fetches fail -> FAIL, keep last-good file
//   - valid count drops > 50% from a populated last-good -> FAIL
// FAIL = non-zero exit and no write, so CI leaves the committed file untouched.
//
// Run: node scripts/sync-articles.mjs

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { siteLocales } from './articles-sync/locales.mjs';
import { articleId, apiKey, downloadImage, getArticle, listAllArticles } from './articles-sync/api.mjs';
import { dedupe, localeFor, normalizeArticle, normalizeSlug, sortArticles } from './articles-sync/normalize.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const OUT_DATA = path.join(REPO, 'src/data/articles.generated.ts');
const IMG_DIR = path.join(REPO, 'public/blog');
const IMG_URL_PREFIX = '/blog';
const IMG_WIDTHS = [640, 1280]; // card slot and article hero, both at retina
const CANONICAL_ORIGIN = 'https://www.sisiwroclaw.pl';
const BARE_HOSTS = ['sisiwroclaw.pl'];
const DROP_THRESHOLD = 0.5;
const SPACING_MS = 250; // stay friendly to the rate limit between detail calls

async function run() {
  // Before the GitHub secret is configured, no-op cleanly instead of failing.
  if (!apiKey()) {
    console.log('No BABYLOVEGROWTH_API_KEY configured; skipping articles sync.');
    return;
  }

  const locales = await siteLocales();
  const previous = await previousArticles();
  const previousBySlug = new Map(previous.map((a) => [`${a.locale}/${a.slug}`, a]));

  const summaries = await listAllArticles();
  console.log(`Articles sync: ${summaries.length} article(s) listed.`);
  if (!summaries.length) {
    if (previous.length) {
      fail(`API listed 0 articles but ${previous.length} are published; refusing`, [], []);
      return;
    }
    console.log('Articles sync: nothing to publish yet.');
    return;
  }

  const skipped = [];
  const fetchFailures = [];
  const articles = [];

  for (const summary of summaries) {
    const id = articleId(summary);
    if (!id) {
      skipped.push(`${summary?.slug ?? 'unknown'}: no article id in the list response`);
      continue;
    }

    let full;
    try {
      full = await getArticle(id);
    } catch (error) {
      const carried = carryOver(summary, previousBySlug, locales);
      fetchFailures.push(`${id}: ${error.message}${carried ? ' (kept last-good copy)' : ''}`);
      if (carried) articles.push(carried);
      continue;
    }

    const { article, errors, warnings } = normalizeArticle(
      { ...summary, ...full },
      { locales, canonicalOrigin: CANONICAL_ORIGIN, bareHosts: BARE_HOSTS },
    );
    const label = article?.slug || summary?.slug || id;
    for (const warning of warnings) skipped.push(`${label}: ${warning}`);
    if (!article) {
      skipped.push(`${label}: ${errors.join('; ')}`);
      continue;
    }
    articles.push(article);
    await delay(SPACING_MS);
  }

  // --- aggregate policy: never silently unpublish a live blog ---
  if (fetchFailures.length > summaries.length * DROP_THRESHOLD) {
    fail('more than half the article fetches failed', fetchFailures, skipped);
    return;
  }
  const { articles: unique, dropped } = dedupe(articles);
  for (const key of dropped) skipped.push(`${key}: duplicate slug, kept the newest`);
  if (previous.length > 0 && unique.length < previous.length * DROP_THRESHOLD) {
    fail(`valid count dropped ${previous.length} -> ${unique.length} (> 50%); refusing`, fetchFailures, skipped);
    return;
  }

  const usedImages = new Set();
  for (const article of unique) {
    const hero = await heroImages(article, previousBySlug.get(`${article.locale}/${article.slug}`));
    if (hero) {
      Object.assign(article, hero.fields);
      for (const name of hero.files) usedImages.add(name);
    } else if (article.heroSource) {
      skipped.push(`${article.slug}: hero image unavailable, published without it`);
    }
  }
  await pruneImages(usedImages);

  await writeIfChanged(OUT_DATA, Buffer.from(renderModule(sortArticles(unique))));

  console.log(`Articles sync: ${unique.length} article(s) written.`);
  for (const locale of locales) {
    const count = unique.filter((a) => a.locale === locale).length;
    if (count) console.log(`  ${locale}: ${count}`);
  }
  for (const line of fetchFailures) console.log(`  fetch failed ${line}`);
  for (const line of skipped) console.log(`  skipped ${line}`);
}

/** Last-good copy of an article whose detail fetch just failed: the list
    response still carries its slug + language, which is enough to re-publish
    exactly what is already committed. */
function carryOver(summary, previousBySlug, locales) {
  const locale = localeFor(summary?.languageCode ?? summary?.language_code, locales);
  const slug = normalizeSlug(summary?.slug);
  if (!locale || !slug) return null;
  return previousBySlug.get(`${locale}/${slug}`) ?? null;
}

/** Optimized hero variants for one article, reusing the committed files when
    the vendor image has not changed (avoids re-encoding on every sync). */
async function heroImages(article, previous) {
  if (!article.heroSource) return null;
  const base = `${article.locale}-${article.slug}`;
  const files = IMG_WIDTHS.map((width) => `${base}-${width}.webp`);

  if (previous?.heroSource === article.heroSource && previous.img && (await allExist(files))) {
    return {
      files,
      fields: { img: previous.img, imgSrcset: previous.imgSrcset, imgWidth: previous.imgWidth, imgHeight: previous.imgHeight },
    };
  }

  let source;
  try {
    source = await downloadImage(article.heroSource);
  } catch (error) {
    console.warn(`  hero image failed for ${article.slug}: ${error.message}`);
    return null;
  }

  await mkdir(IMG_DIR, { recursive: true });
  let widest;
  for (const width of IMG_WIDTHS) {
    const output = await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    await writeIfChanged(path.join(IMG_DIR, `${base}-${width}.webp`), output.data);
    widest = output.info;
  }

  return {
    files,
    fields: {
      img: `${IMG_URL_PREFIX}/${base}-${IMG_WIDTHS.at(-1)}.webp`,
      imgSrcset: IMG_WIDTHS.map((width) => `${IMG_URL_PREFIX}/${base}-${width}.webp ${width}w`).join(', '),
      imgWidth: widest?.width,
      imgHeight: widest?.height,
    },
  };
}

function renderModule(articles) {
  return (
    '// GENERATED by scripts/sync-articles.mjs from the BabyLoveGrowth articles\n' +
    '// API. Do not edit by hand - the next sync overwrites it.\n' +
    "import type { ArticleItem } from './articles';\n\n" +
    `export const GENERATED_ARTICLES: ArticleItem[] = ${JSON.stringify(articles, null, 2)};\n`
  );
}

/** Parse the committed generated module back into data (best effort). */
async function previousArticles() {
  try {
    const source = await readFile(OUT_DATA, 'utf8');
    const start = source.indexOf('= [');
    const end = source.lastIndexOf('];');
    if (start < 0 || end < 0) return [];
    const parsed = JSON.parse(source.slice(start + 2, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function allExist(names) {
  const present = await readdir(IMG_DIR).catch(() => []);
  return names.every((name) => present.includes(name));
}

async function pruneImages(used) {
  const entries = await readdir(IMG_DIR).catch(() => []);
  for (const name of entries) {
    if (name.endsWith('.webp') && !used.has(name)) {
      await rm(path.join(IMG_DIR, name));
      console.log(`  pruned stale image ${name}`);
    }
  }
}

// Only write when content actually changed - keeps git history + repo size quiet.
async function writeIfChanged(file, buf) {
  try {
    const current = await readFile(file);
    if (current.equals(buf)) return;
  } catch {
    /* new file */
  }
  await writeFile(file, buf);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(reason, failures, skipped) {
  console.error(`Articles sync FAILED: ${reason}`);
  for (const line of failures) console.error(`  - ${line}`);
  for (const line of skipped) console.error(`  (skipped ${line})`);
  process.exitCode = 1;
}

run().catch((error) => {
  console.error('Articles sync crashed:', error.message);
  process.exitCode = 1;
});
