// Encodes the tone-mapped PNG intermediates (make-images.py) to AVIF + WebP derivatives in ../img.
// Usage: node make-images.mjs <intermediates-dir>
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs';
const require = createRequire('/home/user/sisi-tools/node_modules/');
const sharp = require('sharp');
const src = process.argv[2];
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'img');
fs.mkdirSync(out, { recursive: true });
const jobs = [
  // name, input, width, avif q, webp q
  ['hero-wide-480', 'band-full.png', 480, 46, 62],
  ['hero-wide-900', 'band-full.png', 900, 44, 60],
  ['hero-tall-360', 'band-tall.png', 360, 46, 62],
  ['hero-tall-480', 'band-tall.png', 480, 44, 60],
  ['hero-lite-320', 'band-full.png', 320, 28, 40],
];
for (const [name, file, w, qa, qw] of jobs) {
  const img = sharp(path.join(src, file)).resize({ width: w });
  await img.clone().avif({ quality: qa, effort: 6 }).toFile(path.join(out, name + '.avif'));
  if (!name.includes('lite')) await img.clone().webp({ quality: qw, effort: 6 }).toFile(path.join(out, name + '.webp'));
}
for (const f of fs.readdirSync(out).sort()) console.log(f, fs.statSync(path.join(out, f)).size);
