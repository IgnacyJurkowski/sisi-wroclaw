// AVIF + WebP derivatives with sharp. Widths never exceed the native crop width (no upscaling).
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/home/user/sisi-tools/node_modules/sharp/dist/index.cjs');
import fs from 'node:fs';
const [,, inDir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const jobs = [
  ['hero-wide-after.png',   'hero-wide',   [720, 1080, 1540]],
  ['hero-narrow-after.png', 'hero-narrow', [520, 780]],
];
for (const [file, base, widths] of jobs) {
  for (const w of widths) {
    const img = sharp(`${inDir}/${file}`).resize({ width: w, withoutEnlargement: true });
    const a = await img.clone().avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' }).toFile(`${outDir}/${base}-${w}.avif`);
    const b = await img.clone().webp({ quality: 74, effort: 6 }).toFile(`${outDir}/${base}-${w}.webp`);
    console.log(base, w, 'avif', a.size, 'webp', b.size);
  }
}
