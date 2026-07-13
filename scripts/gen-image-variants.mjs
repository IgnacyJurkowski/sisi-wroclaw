/* Pre-generate responsive image variants (AVIF + WebP at a few widths) for the
 * card/banner photos rendered through src/components/ResponsiveImage.astro.
 *
 * The source photos ship at 900-1000px but render at ~280-390px, so PageSpeed's
 * "Improve image delivery" flagged ~180 KiB of waste. These variants let the
 * browser pick a right-sized, modern-format file; the original WebP stays as the
 * <img> fallback.
 *
 * Run after adding/replacing any of these images (e.g. new event banners):
 *   node scripts/gen-image-variants.mjs
 * Output files (foo-<w>.avif / foo-<w>.webp) are committed alongside the source.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Card photos render ~280px (3-up grid) → 400/700 covers DPR1 + retina.
const CARD = [400, 700];
// Event banners render ~390px in cards and up to ~900px on the detail hero.
const BANNER = [450, 900];

const targets = [
  // About — "evolution" cards
  { file: 'framerusercontent.com/images/QxXDx4GN74BgGuzaDth23HA.webp', widths: CARD },
  { file: 'framerusercontent.com/images/RHdmR5s8jXTtyexi8FJLI4WDkig.webp', widths: CARD },
  { file: 'framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp', widths: CARD },
  // R32 — gallery shots (slot 1 is the video, so only these two are <img>)
  { file: 'framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp', widths: CARD },
  { file: 'framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp', widths: CARD },
];

let made = 0;
for (const t of targets) {
  const abs = path.join(PUBLIC, t.file);
  const base = abs.replace(/\.[^.]+$/, '');
  const meta = await sharp(abs).metadata();
  for (const w of t.widths) {
    const width = Math.min(w, meta.width ?? w);
    await sharp(abs).resize({ width, withoutEnlargement: true }).avif({ quality: 50 }).toFile(`${base}-${w}.avif`);
    await sharp(abs).resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toFile(`${base}-${w}.webp`);
    made += 2;
  }
}

// R32 video poster renders at the same ~280px slot but shipped at 800px; a
// single smaller WebP is enough (poster can't use srcset).
const posterSrc = path.join(PUBLIC, 'video/relacja-z-otwarcia-poster.webp');
await sharp(posterSrc).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 74 })
  .toFile(path.join(PUBLIC, 'video/relacja-z-otwarcia-poster-600.webp'));
made += 1;

console.log(`generated ${made} variant files`);
