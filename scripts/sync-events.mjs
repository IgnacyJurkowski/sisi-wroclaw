// Events sync: reads the staff "Wydarzenia" Google Drive folder (Banery + Opisy),
// pairs each banner to its description doc by date, validates, optimizes the
// banner to webp, and regenerates src/data/events.generated.ts (committed). The
// existing render path (EventsPage / EventCard / splitEvents / eventSchema) picks
// it up unchanged. Run in CI on a schedule; the generated file means the Astro
// build never depends on Google being reachable.
//
//   GOOGLE_SERVICE_ACCOUNT_JSON=<json>  (CI)   or
//   GOOGLE_APPLICATION_CREDENTIALS=<path>      (local)
//
// Bad-row policy (no status field in the template, so it maps to file state):
//   - incomplete pair (banner XOR doc)          -> skip + report  ("draft")
//   - complete pair, doc missing Title/Start     -> FAIL, keep last-good
//   - count drops > 50% from populated last-good -> FAIL, keep last-good
// FAIL = non-zero exit, no write; CI leaves the last-good file in place.

import { createHash } from 'node:crypto';
import { writeFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { duplicateBannerErrors } from '../src/lib/event-quality.mjs';
import { getAccessToken, listFolder, exportDocText, downloadFile } from './events-sync/drive.mjs';
import {
  parseOpisy,
  warsawIso,
  eventSlug,
  dateKeyFromFilename,
  validateEvent,
} from './events-sync/parse.mjs';

const FOLDER_ID = process.env.EVENTS_FOLDER_ID || '1KFophtNpm-R-9inZcMuGlnJOiZNYzsJd';
const REPO = path.resolve(import.meta.dirname, '..');
const OUT_DATA = path.join(REPO, 'src/data/events.generated.ts');
const IMG_DIR = path.join(REPO, 'public/events');
const IMG_URL_PREFIX = '/events';
const BANNER_WIDTH = 1000; // card media is small; 1000px covers retina
const DROP_THRESHOLD = 0.5; // fail if valid count drops below half the last-good

async function run() {
  // Before the GitHub secret is configured, no-op cleanly instead of failing.
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('No Google credentials configured (GOOGLE_SERVICE_ACCOUNT_JSON); skipping sync.');
    return;
  }
  const token = await getAccessToken();
  const top = await listFolder(token, FOLDER_ID);
  const banery = top.find((f) => /^banery$/i.test(f.name));
  const opisy = top.find((f) => /^opisy$/i.test(f.name));
  if (!banery || !opisy) throw new Error('Wydarzenia must contain "Banery" and "Opisy" folders');

  const [banners, docs] = await Promise.all([
    listFolder(token, banery.id),
    listFolder(token, opisy.id),
  ]);

  const bannerByDate = indexByDate(banners);
  const docByDate = indexByDate(docs);
  const dates = [...new Set([...bannerByDate.keys(), ...docByDate.keys()])].sort();

  const skipped = [];
  const failed = [];
  const events = [];
  const usedImages = new Set();
  const pendingImages = [];
  const bannerRecords = [];

  for (const dateKey of dates) {
    const banner = bannerByDate.get(dateKey);
    const doc = docByDate.get(dateKey);

    if (!banner || !doc) {
      skipped.push(`${dateKey}: incomplete pair (${banner ? 'no doc' : 'no banner'})`);
      continue;
    }

    const fields = parseOpisy(await exportDocText(token, doc.id));
    const errors = validateEvent(fields, dateKey);
    if (errors.length) {
      failed.push(`${dateKey}: ${errors.join('; ')}`);
      continue;
    }

    const slug = eventSlug(dateKey, fields.title);
    const fileName = `${slug}.webp`;
    const optimized = await sharp(await downloadFile(token, banner.id))
      .rotate()
      .resize({ width: BANNER_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const digest = createHash('sha256').update(optimized).digest('hex');
    bannerRecords.push({ dateKey, digest });
    pendingImages.push({ fileName, optimized });
    usedImages.add(fileName);

    events.push(toEvent(dateKey, fields, `${IMG_URL_PREFIX}/${fileName}`, slug));
  }

  // --- bad-row policy: never silently unpublish a real event ---
  failed.push(...duplicateBannerErrors(bannerRecords));
  if (failed.length) {
    fail('Published events failed quality checks', failed, skipped);
    return;
  }
  const prev = await prevEventCount();
  if (prev > 0 && events.length < prev * DROP_THRESHOLD) {
    fail(`Valid count dropped ${prev} -> ${events.length} (> 50%); refusing`, [], skipped);
    return;
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  if (pendingImages.length) await mkdir(IMG_DIR, { recursive: true });
  for (const { fileName, optimized } of pendingImages) {
    await writeIfChanged(path.join(IMG_DIR, fileName), optimized);
  }
  await pruneImages(usedImages);
  await writeIfChanged(OUT_DATA, Buffer.from(renderModule(events)));

  console.log(`Events sync: ${events.length} event(s) written.`);
  for (const s of skipped) console.log(`  skipped ${s}`);
}

function indexByDate(files) {
  const map = new Map();
  for (const f of files) {
    const key = dateKeyFromFilename(f.name);
    if (key && !map.has(key)) map.set(key, f);
  }
  return map;
}

function toEvent(dateKey, f, img, slug) {
  const e = { title: f.title, slug, start: warsawIso(dateKey, f.startTime) };
  if (f.dj) e.note = `DJ ${f.dj}`;
  e.img = img;
  if (f.price != null) e.price = f.price;
  if (f.description) e.description = f.description;
  if (f.genres.length) e.genres = f.genres;
  return e;
}

function renderModule(events) {
  return (
    '// GENERATED by scripts/sync-events.mjs from the "Wydarzenia" Google Drive\n' +
    '// folder (Banery + Opisy). Do not edit by hand - the next sync overwrites it.\n' +
    "import type { EventItem } from './site';\n\n" +
    `export const GENERATED_EVENTS: EventItem[] = ${JSON.stringify(events, null, 2)};\n`
  );
}

async function prevEventCount() {
  try {
    const txt = await readFile(OUT_DATA, 'utf8');
    return (txt.match(/"start":/g) || []).length;
  } catch {
    return 0;
  }
}

async function pruneImages(used) {
  let entries = [];
  try {
    entries = await readdir(IMG_DIR);
  } catch {
    return;
  }
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
    const cur = await readFile(file);
    if (cur.equals(buf)) return;
  } catch {
    /* new file */
  }
  await writeFile(file, buf);
}

function fail(reason, failures, skipped) {
  console.error(`Events sync FAILED: ${reason}`);
  for (const f of failures) console.error(`  - ${f}`);
  for (const s of skipped) console.error(`  (skipped ${s})`);
  process.exitCode = 1;
}

run().catch((err) => {
  console.error('Events sync crashed:', err.message);
  process.exitCode = 1;
});
