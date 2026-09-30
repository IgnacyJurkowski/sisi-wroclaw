# SiSi Wrocław: brand extraction (Phase 5.1)

Purpose: give a designer enough measured fact to build three different art directions from SiSi's own assets, without inventing anything.
Scope: read-only pass over `/home/user/sisi-elevate` (branch `sisi-elevate/base`, from `main` e1feb25) and the frozen build in `/home/user/sisi-baseline/dist`. Nothing under `src/` or `public/` was changed.
Labels: **Confirmed** (measured or seen in code/output/browser), **Rec** (recommendation), **Assumption**, **Inference**. `PENDING` = needs Ignacy or a source I do not have offline.
Rebuild: every table has its command in section 10. Helper scripts are in `docs/sisi-elevate/brand/scripts/`, raw outputs in `docs/sisi-elevate/brand/data/`.
"Local build" findings have not been seen on production (production hosts are blocked in this container).

## 0. Ten findings that change design decisions

1. **The dark in the media is not the dark in the CSS.** `#27060f` is the only burgundy in the site; in eight of the ten referenced stills 51-78% of pixels sit in one near-black cluster, and 41-52% in the two hero films. That cluster is aubergine-black in the videos (`#14050e`, `#160710`), neutral or blue black in the stage photos (`#0b090b`, `#080811`). The closest match to `#27060f` is dE76 7.8 (hero poster shadow `#1c070f`). Confirmed (section 2.2).
2. **The site has no red or orange token, but every photo is red and orange.** Stage red is `#a82606` to `#b92506`, LED strips are `#e03a03` to `#fa430f`, at Lab hue 38-47 degrees. `#27060f` sits at hue 6. The print menu uses another red again, `#8e1f2c` (hue 25). Three reds exist and none is a named token. Confirmed (2.2, 2.3).
3. **Warm highlights are peach and amber, not cream.** Photo highlights sit at Lab hue 52-70 (`#d5906e`, `#fa9f5f`); brass lamps and video spotlights at 79-86 (`#d69f3b`, `#bd9f71`). `--cream` (`#EDDBC2`, hue 81) and `--gold` (`#fbd295`, hue 80) match the brass/video end, not the skin end. Confirmed (2.2).
4. **All UI text pairs pass AA on flat backgrounds (lowest 5.32:1). Three things fail.** Input borders use `--line` at 1.83:1 (needs 3:1); the hero title fails 4.5:1 on the brightest 5% of pixels during the cocktail shots (3.15 to 4.44 at p95); the 11 px scroll label drops below 4.5:1 on up to 27% of its pixels in some frames (0.8, 2.5 and 4.7 s). Confirmed (2.5).
5. **Czech, German and Italian body text falls back to a system font.** The inlined Montserrat subset has no `č ě ř š ů ž ý ň ť ď`, no `ß`, no `ì ò ù`. On `/cs/` Chromium painted 118 glyphs in DejaVu Sans. Polish is fully covered. Cookie buttons render in Arial. Confirmed (local build, Linux Chromium; the fallback face differs per OS) (3.2).
6. **Cal Sans (display) and Montserrat (body) are the only live faces.** Everything else in `public/` (Open Sans, DM Sans, Krona One, Inter, five static Montserrat files, about 1.5 MB) is unreferenced Framer leftovers. There is no Fontshare (ITF) font in the repo. Confirmed (3.1, 3.3).
7. **The logo is vector and fine at any hero size; the only rasters are 16, 32 and 180 px.** A cream tagline lockup ("MUSIC FOOD MORE") exists as SVG but is unreferenced. No original file, clear-space rule or small-size version exists. Confirmed (4).
8. **No photo is hero-grade at 2x DPR.** Best native size is 2048 px (needs 1.41x upscale at 1440 wide, 2x DPR). The two B2B heroes use a 728 px photo and stretch it 1.98x at 1x DPR. The hero video is 2560 px wide (1.25x at 2x DPR). Confirmed (5.3).
9. **Third-party marks are inside the photos.** The Chivas Regal sign appears in 6 of the 12 venue stills (bottles in a 7th); the R32 sign fills the film poster. Photo rights, sponsor permission and identifiable guests are all `PENDING` (5.5, 8).
10. **The voice is short, second-person and free of hype in Polish; the other locales drift.** Polish, German and Italian address the guest informally, Czech uses formal `vy`. `SISI` (caps) appears 10 times against the logo's `SiSi`. 0 exclamation marks in five dictionaries. Flags for native review are in section 6.4.

## 1. What the site actually references

Method: `grep` of `src/`, `scripts/` and the built HTML/CSS/JS in `/home/user/sisi-baseline/dist`; then `docs/sisi-elevate/brand/scripts/inventory.py` for pixel sizes. Confirmed.

`public/` is 34 MB (video 17 MB, blog 7.1 MB, Framer images 5.3 MB, Framer assets 3.0 MB, gstatic + fontshare fonts 1.3 MB).

### 1.1 Referenced by the rendered site

| asset | px / size | referenced at | shown as |
|---|---|---|---|
| `framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp` | 1536x1024, 75 KB | `Hero.astro:84` (CSS background under the video); `HomePage.astro:29` (preload); `site.ts:132` (JSON-LD image) | hero poster until the video plays |
| same id, `.png` | not on disk | `Base.astro:64` (default `og:image`, absolute `https://framerusercontent.com/...png`) | social card, loaded from Framer's CDN. Original size unknown offline. PENDING |
| `.../u3EOm1VtOnATOkUYHKikl5aBc.webp` | 728x486, 16 KB (+400/700 avif/webp) | `R32.astro:16`, `B2BHero.astro:46`, `PrivateEventsHero.astro:44` | R32 gallery tile 1; full-width hero background of both B2B pages |
| `.../RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp` | 900x600, 48 KB | `About.astro:11` | "live music at the bar" photo beside the night timeline |
| `.../bHchRJgtNrxKTYRK56SCdUph2g.webp` | 1600x1066, 62 KB | `Chivas.astro:25` | "Strefa Chivas Regal" band background, 0.5 black scrim |
| `.../cDJcCUEanjQSoFpALHKgU3hNpQ.webp` | 900x600, 44 KB | `R32.astro:40` | R32 gallery tile 3 |
| `.../MHGypGkoM6EkRCjBAVKzMUmwRG4.webp` | 900x600, 42 KB | `R32.astro:28` (declared) | **never shown**: the loop at `R32.astro:66` renders the video in slot 2 (`i === 1`), so this photo has no visible use |
| `images/menu/bar-cocktails.webp` | 1200x675, 47 KB | `MenuTeaser.astro:50` | menu teaser photo |
| `video/hero-night-hq-desktop.mp4` / `-mobile.mp4` | see 5.4 | `Hero.astro:27-28` | hero film (mobile file at max-width 600 px, `hero-film.ts`) |
| `video/relacja-z-otwarcia.mp4` + `-poster-600.webp` (600x338) | see 5.4 | `R32.astro:70-72` | gallery tile 2, muted loop, `preload="none"` |
| `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png` (180x180) | | `Base.astro:111-114`; `site.ts:131` (JSON-LD logo) | icons |
| Logo (inline SVG) | viewBox 68x60 | `Logo.astro`, used in `Nav.astro:25`, `Footer.astro:35` | wordmark |

Variant files `-400`/`-700` (`.avif`, `.webp`) are generated by `scripts/gen-image-variants.mjs` for the card images.

### 1.2 In `public/` and in the build, but referenced by nothing

Confirmed by grep of `src/`, `scripts/` and every `.html/.css/.js/.xml/.txt` in the baseline `dist`. Presence in `dist` means they are shipped and public, so treat them as published but unused.

- **Venue photos, usable candidates** (`framerusercontent.com/images/`): `9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg` 2048x1365 (floor, band, Chivas sign), `BhLu6TEmxTduoC9Pjn93Svcgtc.jpg` 2048x1365 (similar, warmer), `YANjqHXpbp64zG9ZMX3q3VMQo.jpg` 2048x1365 (bar wall with guests; a 1.2 MB copy is also in `assets/`), `RHdmR5s8jXTtyexi8FJLI4WDkig.webp` 900x599 (empty room, red velvet chairs), `QxXDx4GN74BgGuzaDth23HA.webp` 900x599 (empty room, drum kit, Chivas Regal sign).
- **Event posters** (a second visual language, see 7): `Olq6a1v5gLRrCox00t2wOi8ATTw.jpeg` 1600x900, `Vl3kSLbolFditeShXmcLZITH7A8.webp` 900x506, `loXZHRygofAyWJdOaLJm2nba20Y.webp` 900x457, `pGGB9XWB2h0vJy9v9FeUIzcQb5w.jpg` 1110x1080, `v46yfJcN1YsEaZZEo9Kc6gXqbo.png` 1603x1362. They carry dates, event names and performer names (Anna Nguyen, Axel P, ADB, Marta Kolodziejczyk, Mike Lynx). Do not reuse the names or dates in copy (see 8).
- **Print menu**: `AYLWOJkDYihbF5j37ZCQ3GqMi4.png` 1920x7793, red and off-white, with prices. Prices are not checked against the site. Do not reuse.
- **Logos and textures**: three SVG logo files (4.1), `jjGQmnCK9DnrLM4akTOerjVkp9A.png` 1504x364 (sparse dot pattern), `g0QcWrxr87K0ufOxIUFBakwYA8.png` 400x400 (noise).
- **Framer template stock, not SiSi**: `5ILRvlYXf72kHSVHqpa3snGzjU.jpg` (ocean), `9xaZzr9F8L22opnNWnHi1LdjqMk.png` (aerial rock and road), `GfGkADagM4KEibNcIiRUWlfrR0.jpg` (flower), `jlIAaI4caPj3oVLaxetMd2RvY.png` (hand with cosmetic tube), `1xOqMa4sAAwBCrdkiSJfIXups.png` (teal dot grid, 5071x3425), `assets/MLWPbW1dUQawJLhhun3dBwpgJak.mp4` (21 s ocean loop). None belong in a SiSi direction. Inference (they match a Framer template default set; visibly unrelated to the venue).
- **Video stills**: `video/hero-night-hq-desktop.webp` 2560x1440 and `-mobile.webp` 1080x1920 (motion-blurred early frames), `relacja-z-otwarcia-poster.webp` 800x450.
- Framer CMS/JS modules (`framercms`, `modules/*.js`): legacy, no visual content.

Sheets: `brand/contact-sheet.jpg` (10 referenced stills and posters), `brand/contact-sheet-unreferenced.jpg` (16 unreferenced images), `brand/palette-swatches.png`.

### 1.3 Blog hero art (`public/blog/`, treated separately)

124 files = 31 articles x 4 widths (400, 640, 800, 1080; source 1080x720). Confirmed. Sheet: `brand/blog-hero-sheet.jpg`.

- Style: burgundy line illustration (glasses, bottles, grapes, vinyl, mirror ball) on cream paper, a Polish title set in a serif baked into the pixels. Pooled k-means: `#f7f2ea` 60%, `#ddcfc8` 13%, `#bfa8a4` 9%, `#aa7d7e` 6%, `#8e4d54` 4%, `#701a27` 4%. Mean L* 81.6 (range 75.9 to 87.1). Confirmed (`data/blog-hero.txt`).
- It is the only light-mode imagery on a dark site. The serif and the baked-in Polish text are not from the site's type system and cannot be localised or read by a screen reader. Inference: the images are AI-generated illustration (repeated style, baked titles, `articles.ts:38-39` names an external generator's hero URL); provenance PENDING.
- One image ("Afterparty co to") shows a skyline with church spires and a bridge. It is the only Wrocław landmark in any asset. Inference (it reads as Wrocław's Ostrów Tumski; the image gives no caption).
- Rec: keep blog art out of the three main directions. If a direction wants the cream-and-line look, it can be re-drawn in the site's type.

## 2. Colour

### 2.1 Tokens the site defines (`src/styles/global.css:28-44`, plus `Base.astro:115`)

| token | value | Lab (L*, C, h) | where used |
|---|---|---|---|
| `--bg` | `#27060f` | 5, 17, 6 | page background, also `<meta name="theme-color">` (`Base.astro:115`), favicon tile |
| `--panel` / `--panel-2` | `#34101a` / `#3d1320` | 10, 19, 6 / 13, 22, 4 | card surfaces |
| `--cream` = `--text` = logo fill | `rgb(237,219,194)` = `#EDDBC2` | 88, 15, 81 | body text, buttons, logo |
| `--cream-hover` / `--cream-press` / `--cream-active` | `#F5E8D5` / `#D6BF9B` / `#C7AE86` | 92,11,83 / 78,21,83 / 72,24,83 | button states |
| `--gold` | `#FBD295` | 86, 36, 80 | section labels, stat values, icons, hover, focus rings |
| `--text-dim` / `-faint` / `-mute` | cream at 0.82 / 0.70 / 0.62 | | secondary text |
| `--line` | cream at 0.24 | | dividers and input borders |
| ink | `#1a120b` | 6, 5, 63 | text on cream buttons |
| select panel | `#2a0a12` | 7, 17, 8 | dropdowns |
| error | `#e7889b` text, `#c25c74` / `#a8475f` borders | 67,39,8 / 52,44,8 / 44,43,8 | forms |

Colour census of `src/` (`grep -rhoE` of hex and rgb literals): `#27060f` 12 uses, cream in many alphas, `#1a120b` 9, `#c25c74` 7. Confirmed. **No token or literal in the CSS is red, orange or brass** except the forms' pinks and a flag red (`#c8102e`, `Flag.astro:16`). Confirmed.

### 2.2 What the photos and videos contain

Method: `scripts/colors.py` (k-means k=6 in CIE Lab on an 80,000-pixel sample, OpenCV Lab, seed 1; WCAG relative luminance Y of linearised sRGB; warm highlights = L*>60 and chroma>20; "stage red" = Lab hue 25-50, chroma>45, L*>25). Video: 12 evenly spaced frames per file from `scripts/video_frames.py`, pooled. Also `scripts/skin_led.py` (pixel-class masks) and `scripts/sample_regions.py` (six hand-picked boxes; crops in `brand/crops/`).

Per-image results (clusters are `hex share`; Y is WCAG relative luminance, 0 to 1):

@@INCLUDE data/colors-images.md@@

Video (pooled over 12 frames each; per-frame Y is listed under the table; the relacja row includes one white flash frame at 7.7 s with Y 0.94):

@@INCLUDE data/colors-video.md@@

Pixel-class medians (heuristic masks, so Inference-grade; `data/skin-led.txt`):

```
@@INCLUDE data/skin-led.txt@@
```

Hand-picked regions (crops checked by eye; `data/region-samples.txt`): singer's lit cheek `#c48363` (L* 61); orange LED strip `#df4201` (L* 51, chroma 86); back-bar tile glow `#b23007`; tungsten bulb `#d69f3b`; blue floor wash `#041a6a`; spritz `#b03424`.

Readings:

- **Darkest usable tones.** Photo shadows, p1 to p50 L* = 0-8: `#0b090b`, `#110c0a`, `#080811`, `#100303`. Video shadows are aubergine: `#160710`, `#14050e`. Confirmed. Cream text on any of them is 14.7 to 15.0:1.
- **Lightest usable tones.** Photo highlights top out at p99 L* 70-84 (`#f9e0d2` peach-white in `QxXDx`, `#ecaa70` in `bHchR`). Only the posters (`#fdfaf8`, `#f8f3f3`) and the film's white flash go higher. Neon core in the film's signage frame is `#f9f7e5` (L* 97, dE76 11.3 from cream); it is video-encoded, so hue is unreliable. Confirmed.
- **Warm-light highlight hue.** Photos: Lab hue 52-70 (`#d5906e`, `#d29873`, `#fa9f5f`, `#f29948`). Videos: hue 78-86 (`#bd9f71`, `#cda653`). Brass lamp: 79. Confirmed. In every photo it is an orange-leaning light, 2.2 to 6.0% of pixels.
- **Skin, lit.** `#c28666`, `#c08266`, `#c88464` in three different photos (Lab hue 50-54). Consistent: this is the tone any warm overlay must not shift. Inference (mask-based).
- **Stage red and LED.** Deep stage red `#a82606` / `#831c0d` / `#b92506`. Hot LED `#e03a03` / `#fa430f`. Confirmed.
- **Stage blue exists.** `#0d38a8`, `#0a1c89` (cDJcC, 30% of clusters), `#1e4576` (RMGSD). Three of the referenced photos carry a saturated cobalt wash that fights the red-and-brass palette. Confirmed.
- **The hero fallback is a different colour world from the film that replaces it.** `nBW0` is graded monochrome red: darkest cluster `#100303`, brightest red `#af0f08`, no warm highlight above L* 38 (p99), 0.0% pixels pass the highlight mask. The film's shadows are aubergine `#160710`, with brass `#a2865f` and peach `#6b432f`. On first play the page cross-fades (900 ms, `Hero.astro:.hero-film`) between them. Confirmed (colours); the visual jump is Inference.
- **Luminance is tiny.** Mean Y of the ten referenced stills and posters is 0.009 to 0.081 (mean L* 6 to 27). The median pixel is below L* 8 in eight of the ten. The hero films average Y 0.036 and 0.041, but the cocktail shots at 5.2-6.3 s jump to Y 0.083 to 0.101. Confirmed.

### 2.3 Palette table (measured, with roles)

Every hex below is a measured value from the named asset (section 2.2 commands) or a site token. Swatches: `brand/palette-swatches.png`. dE76 = Euclidean distance in Lab; the column on the right is to `--bg`.

| hex | source asset | what it is | Lab (L*, C, h) | dE76 to `#27060f` | label |
|---|---|---|---|---|---|
| `#27060f` | `global.css:28` | site burgundy, page ground | 5, 17, 6 | 0 | Confirmed |
| `#1c070f` | `hero-night-hq-desktop.webp`, darkest cluster (62%) | aubergine shadow (film) | 4, 10, 357 | 7.8 | Confirmed |
| `#160710` / `#14050e` | hero desktop / mobile film, darkest cluster (52% / 41%) | aubergine shadow | 3, 7, 343 | 11.2 / 11.6 | Confirmed |
| `#110c0a` / `#0b090b` | `bHchR` / `RMGSD`, darkest cluster (72% / 69%) | neutral black shadow | 4, 2, 48 / 3, 1, 325 | 15.6 / 16.3 | Confirmed |
| `#080811` | `u3EOm`, darkest cluster (78%) | blue-black shadow | 2, 4, 290 | 16.7 | Confirmed |
| `#100303` | `nBW0`, darkest cluster (53%) | red-black shadow (graded) | 2, 4, 19 | 13.7 | Confirmed |
| `#3e1108` | `bHchR`, cluster 2 (11%) | oxblood glow | 12, 26, 36 | 15.9 | Confirmed |
| `#831c0d` | `bHchR`, cluster 3 (7%) | stage red, deep | 29, 55, 40 | 48.3 | Confirmed |
| `#a82606` | `MHGyp`/`YANjq` stage-red median | stage red | 37, 70, 43 | 65.7 | Confirmed |
| `#e03a03` / `#fa430f` | LED mask median, `MHGyp`,`bHchR` / `u3EOm` | LED orange-red, hot | 50, 87, 45 / 56, 93, 44 | 87.4 / 95.1 | Confirmed (mask) |
| `#af0f08` | `nBW0`, brightest red cluster (3%) | graded pure red | 37, 76, 39 | 69.6 | Confirmed |
| `#8e1f2c` | print-menu PNG, red panel (mode) | printed wine red | 32, 51, 25 | 44.0 | Confirmed |
| `#c28666` / `#c88464` | skin mask, `u3EOm` / `cDJcC` | lit skin | 61, 33-36, 51-54 | 61-62 | Inference |
| `#d5906e` | `u3EOm` highlight median | peach highlight (skin light) | 66, 36, 52 | 66.4 | Confirmed |
| `#fa9f5f` | `bHchR` highlight median | amber highlight | 73, 55, 59 | 82.4 | Confirmed |
| `#d69f3b` | `RMGSD` lamp crop | tungsten bulb, brass | 69, 59, 79 | 84.8 | Confirmed |
| `#daa74d` | brass mask, `RMGSD` | brass / amber | 72, 53, 80 | 83.7 | Confirmed (mask) |
| `#a2865f` / `#a78c59` | hero desktop / mobile film, cluster (6% / 4%) | dim brass | 58, 26, 79 / 60, 31, 84 | 58.4 / 63.1 | Confirmed |
| `#c9aa59` | `hero-night-hq-desktop.webp`, cluster (1%) | yellow spotlight beam | 71, 46, 88 | 80.1 | Confirmed |
| `#fdca7d` | brass mask, `bHchR` | brass highlight (matches `--gold`, dE 10.2) | 84, 46, 79 | 90.2 | Confirmed (mask) |
| `#EDDBC2` | `global.css:31`, `Logo.astro` fill | cream, text and logo | 88, 15, 81 | | Confirmed |
| `#FBD295` | `global.css:35` | gold | 86, 36, 80 | | Confirmed |
| `#f9f7e5` | film frame at 58.8 s, neon "SiSi" core | neon warm white | 97, 9, 105 | | Confirmed (video-encoded) |
| `#fffbf5` | print-menu PNG, paper (mode) | menu paper white | 99, 3, 82 | | Confirmed |
| `#801b23`, `#d07377` | `Olq6a` poster clusters | poster red duotone (dark, light) | 28, 48, 27 | 40.0 | Confirmed |
| `#0d38a8` / `#0a1c89` / `#1e4576` | `u3EOm` / `cDJcC` / `RMGSD` clusters | stage blue wash | 29,71,297 / 19,72,302 / 29,32,278 | 70.8 / 67.3 / 43.0 | Confirmed |

Site tokens against the media (dE76): `--bg` to nearest media shadow 7.8; `--gold` to `#fdca7d` 10.2; `--cream` to neon core 11.3; `--bg` to printed red `#8e1f2c` 44.0. The bg-and-shadow gap is small and the red gap is large. Full table: `data/palette-delta.md`.

Rec (for the designer, not a decision): a direction that wants photo-true colour needs an explicit red and an explicit brass token, because none exist today. Two candidate anchors from the measurements: stage red `#a82606` (matches every photo) or printed wine `#8e1f2c` (matches the menu and the posters); and brass `#d69f3b` (lamp) for a deeper metal than `--gold`.

### 2.4 Menu, poster and other print colours

The print menu is `#8e1f2c` on `#fffbf5` with white price text (paper on red 8.55:1), set in a geometric grotesque with a wide K. The posters are red duotone photography (`#801b23` shadows, `#d07377` lights) with white type and a white rounded-corner line frame. These are two more colour systems beside the dark site. Confirmed (`scripts/menu_png_colors.py`; posters in `contact-sheet-unreferenced.jpg`).

### 2.5 Contrast (WCAG 2.x, math written out in `scripts/wcag.py`)

Formula: linearise each sRGB channel (`c/255 <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`), `L = 0.2126 R + 0.7152 G + 0.0722 B`, ratio `(L1+0.05)/(L2+0.05)` with L1 the lighter. Alpha colours are composited over the stated background first. Thresholds: 4.5:1 normal text, 3:1 large text and UI components and graphics.

@@INCLUDE data/wcag-pairs.md@@

Readings:

- **Fails, site as built (Confirmed):**
  - `--line` (0.24 cream) on `--bg`: 1.83:1. It is the border of every text input and checkbox in both enquiry forms (`B2BEnquiryForm.astro:216, 232`; `PrivateEventsEnquiryForm.astro:182, 197`; `border: 1px solid var(--line)`). WCAG 1.4.11 asks 3:1 for the boundary of an input. Hover (0.40 cream) is 3.05:1 and just passes; the resting state does not. Rec: raise the resting border to at least 0.40 cream, or use a filled field.
  - `#a8475f` status-error border: 3.33:1, passes 3:1 as a graphic, fails as text (not used as text).
  - Muted text floor: cream at 0.50 is 4.13:1 and fails; 0.55 is 4.77:1. `--text-mute` at 0.62 is 5.78:1 and safe. Do not go lower.
- **Passes with margin:** body cream on `--bg` 13.86; gold on `--bg` 13.18; ink on cream button 13.66; all three `--text-*` steps on all three surfaces 5.32 to 9.47.
- **Candidate pairs.** Stage red `#b51b01` on `--bg` fails both thresholds (2.79). LED red `#e03a03` on `--bg` is 4.27 (fails 4.5, passes 3:1: large text and icons only). Cream on `#e03a03` is 3.25 (large text only); cream on `#b51b01` is 4.97. Brass `#d69f3b` on `--bg` is 7.94; dim brass `#a78c59` is 5.84; cream on dim brass fails (2.37), ink on brass passes (7.82). Rose `#c25c74` on `--bg` is 4.54 (borderline).

Text over the hero film (12 frames per file; scrim from `Hero.astro:.hero-scrim` re-created as the CSS gradient; text-shadow not modelled, so this is a worst case). The title band is 30-70% of height, 20-80% of width. Full per-frame data: `data/wcag-hero-over-video.md`.

```
frames: cream title vs median background 7.85 to 14.86 (all pass)
cream title vs brightest 5% of pixels: desktop 5.02 to 6.81 in ten frames;
   FAIL in desktop f09 (3.15) and f10 (3.55); mobile f09 4.44   (frames at 5.2 s to 5.8 s, the cocktail shots)
share of band pixels below 4.5:1 in desktop f09 / f10: 19.9% / 12.8%
.hero-scroll label (cream at 0.70, 11 px): below 4.5:1 on 26.5% of its band in desktop f01, 27.4% in f08, 21.6% in f04; mobile f01 17.2%
```

Rec: any direction that keeps a live film behind white or cream type should put a stronger scrim under the text block during bright shots, or drop the scroll label into a solid chip.

## 3. Typefaces

Method: `scripts/fonts.py` (fontTools 4.66, every `.woff2` under `public/` plus the base64 Montserrat decoded out of `global.css:24`), `scripts/font_coverage.py` (characters used by each dictionary against each font's cmap), `scripts/fonts_rendered.mjs` (Chromium DevTools `CSS.getPlatformFontsForNode` on 13 pages of the baseline build, requests to non-local hosts blocked). Full inspector output: `data/fonts-inspect.txt`, `data/font-coverage.txt`.

### 3.1 Faces that render on the site (Confirmed, local build)

| family | how it is loaded | weights and styles | subsets | live share (glyphs painted, 13 pages, 1440 px) |
|---|---|---|---|---|
| **Cal Sans** | `global.css:19-20`: `/fonts/cal-sans-400-latin.woff2` (21,464 B) and `/fonts/cal-sans-400-latext.woff2` (13,608 B), `font-display: swap`, latin file preloaded (`Base.astro:116`) | one weight, 400, upright | split by `unicode-range` | 7,231 (10%): hero title, section titles, menu labels, blog headings |
| **Montserrat** | `global.css:24`: one variable woff2 (22,052 B) inlined as base64 in the CSS; `font-family: 'Montserrat'` on `body` (`global.css:53`) | file axis `wght` 100-900, declared `font-weight: 400 700` (so 300 and 800/900 are unreachable), no italic | 167 code points: Basic Latin, Polish, a few punctuation marks | 64,387 (90%): body, nav, buttons |
| Arial (browser default; painted as Liberation Sans in this container) | `<button class="btn-cta cookie-btn">` with no `font-family` (`CookieBanner.astro:24-25`) | | | about 19 glyphs on `/pl/` ("Zgadzam się", "Odmawiam"), 13-35 on other pages |
| DejaVu Sans (fallback) | glyphs missing from Montserrat | | | `/cs/` 118, `/cs/menu/` 118, `/it/` 7, `/de/` 2 |

Weights requested by the CSS (declarations in `src/`, `grep -rhoE "font-weight:\s*[0-9]+"`): 600 x17, 400 x11, 700 x8, 500 x5. One italic: `.legal-note` (`global.css:595`), which the browser fakes because no italic file exists. Confirmed.

Missing: Montserrat italic, 300 and 800+; Cal Sans bold and italic (the CSS pins `.display` to 400 so no faux bold is produced). Confirmed.

### 3.2 Polish and other diacritics

| font | ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ | what else is missing for the site's five languages |
|---|---|---|
| Montserrat inline subset | 18 of 18 | `ß` (de, 10 uses), `ì ò ù Ù` (it, 26 uses), `č ě ř š ů ž ý ň ť ď Č Ř Š Ž` (cs, about 575 uses), `²` (3 uses in all languages) |
| Cal Sans, latin file alone | 2 of 18 (`ó Ó`) | no `ł`, no `ą ć ę ń ś ź ż` |
| Cal Sans, latext file alone | 16 of 18 (no `ó Ó`) | |
| Cal Sans, both files (what the browser reaches) | 18 of 18 | covers all pl, de, it, cs characters used; missing only `²` and `→` |

Confirmed. Consequence: Polish is safe. Czech body text (`cs.ts`, 122 `č`, 114 `ř`, 81 `ě`, 70 `ý`) is painted in a system face, which changes weight, width and colour of every affected line. Rec: replace the inline subset with one that adds Latin Extended-A, `ß`, `ì ò ù`; the unused static Montserrat files in the repo already have all of these (970 code points), so the source exists.

### 3.3 Font files in `public/` that no page references

Confirmed: grep of the baseline `dist` for `fonts.gstatic`, `fontshare`, and `framerusercontent.com/modules` returns nothing. Sizes: `fonts.gstatic.com` + `third-party-assets/fontshare` = 1.4 MB; Inter in `framerusercontent.com/assets` = 111 KB. Removing them is blocked by `scripts/check-build.mjs:1089-1092`, which asserts those paths exist in the cache inventory; per `WORKING-RULES.md` a check is not to be edited to make a change pass, so this needs its own note in `PROGRESS.md` if someone does it.

| folder | files | what they are |
|---|---|---|
| `fonts.gstatic.com/s/opensans/v44` | 15 | Open Sans 3.003, 400/500/700 + italics, mostly per-script subsets; the full Latin file is 59-63 KB |
| `fonts.gstatic.com/s/dmsans/v15`, `v17` | 6 + 10 | DM Sans 4.004; v15 static Medium/Bold/Black + italics, v17 variable "DM Sans 9pt" (`wght` 100-1000) split into latin / latin-ext |
| `fonts.gstatic.com/s/kronaone/v15` | 2 | Krona One 1.003, 400 only, latin and latin-ext |
| `framerusercontent.com/third-party-assets/fontshare/wf/...` | 5 | **Montserrat 7.222** static Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700, about 83 KB each, 970 code points, all Latin-ext. The path says "fontshare" (Framer's mirror path), but the name table names Montserrat by Julieta Ulanovsky. No Indian Type Foundry face is present |
| `framerusercontent.com/assets/*.woff2` | 8 | Inter 4.000, script subsets (cyrillic, greek, vietnamese, latin-ext), Regular only |

Polish coverage: with all of a family's subset files loaded, every family above reaches 18 of 18 letters; the single "latin" subsets of Open Sans, DM Sans v17, Krona One and Inter cover only `ó Ó` of them (`fonts.py`, union check in section 10).

Inference: the wide extended sans on the event posters and the print menu is not any of these. Krona One is wide but its letterforms are not obviously the poster's; the poster and menu typeface is unidentified and belongs in the PENDING list.

### 3.4 Licences

Read from each font's `name` table (IDs 0, 13, 14). Offline, I cannot fetch the licence texts, so what OFL 1.1 permits below is from my knowledge of the licence (Assumption).

| family | what the file says | licence |
|---|---|---|
| Cal Sans | Copyright 2021 The Cal Sans Project Authors (github.com/calcom/font); licence URL `openfontlicense.org`; ID 13 (licence text) empty | Confirmed: the file points to the OFL. Assumption: OFL 1.1 |
| Montserrat (inline and static) | Copyright 2011 The Montserrat Project Authors (github.com/JulietaUla/Montserrat); ID 13 carries the full OFL 1.1 text (inline file) | Confirmed OFL 1.1 |
| Open Sans, DM Sans | ID 0 copyright present; ID 13 full OFL in the full-Latin files, blank in subsets, URL `scripts.sil.org/OFL` | Confirmed pointer to OFL; Assumption OFL 1.1 |
| Krona One | "Copyright (c) 2011, Sorkin Type Co with Reserved Font Name 'Krona'" | OFL with a Reserved Font Name (Confirmed string). Assumption: re-subsetting it ourselves would be a Modified Version and could not keep the name |
| Inter | "Copyright 2016 The Inter Project Authors", no licence field | Assumption OFL 1.1 (unverifiable in the file) |

What OFL 1.1 allows (Assumption, not re-read offline): use, embed and self-host on a website, redistribute, modify and subset, including commercially; must keep the copyright notice and licence with each copy; fonts may not be sold on their own; Reserved Font Names cannot be reused on modified versions. Gap: the repo ships **no font licence file** (`public/licenses/` holds only `lucide.txt` and `simple-icons.txt`). Rec: add OFL notices for Cal Sans and Montserrat there. Fontshare's own ITF Free Font License is not bundled and its self-hosting terms are not verified: PENDING before any Fontshare face is proposed.

## 4. Logo

Method: `scripts/render_logos.mjs` (all SVGs on burgundy and white, `brand/logo-sheet.png`), `scripts/logo_metrics.mjs` (tight bounding box at 20x), `Logo.astro`, `global.css:163-164, 285-286`.

### 4.1 Variants

| variant | file | px / viewBox | vector | colour | background assumed |
|---|---|---|---|---|---|
| Wordmark, inline | `src/components/Logo.astro` (4 paths) | viewBox 68x60 | yes | cream `rgb(237,219,194)` | dark |
| Favicon | `public/favicon.svg` | 64x64 | yes | cream glyph on `#27060f` rounded tile (rx 14) | self-contained |
| Icons | `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | 16, 32, 180 px square | no | cream on burgundy | self-contained |
| Wordmark + "MUSIC FOOD MORE" | `framerusercontent.com/images/argeH1T4CGYsbX3NA43DW7XvkY.svg` | 344x305 | yes | cream `#EDDBC2` | dark |
| Wordmark, black | `.../rs7i8J5taDJCK8S9G7qt4Zdnc0.svg` (also in `assets/`) | 64x64 | yes | `#000` | light |
| Wordmark, white | `.../zWC85W1EXdyaKh1ICMkATnJE.svg` | 1080x1080 | yes | `#fff` | dark |
| Real-world neon | film frame at 58.8 s (`brand/crops/relacja-signage-58s.jpg`) | video | no | warm white, "SiSi" beside "THE CORK" (fork and knife stand in for "T H E") | night façade |

Confirmed. Unreferenced by pages: the three loose SVGs. `Logo.astro` says it was "extracted from the Framer export", so all vectors are traced paths from a Framer file, not the designer's master (Inference).

### 4.2 Geometry, clear space, minimum size

- **Form.** Monoline, round caps: two S curves and two vertical stems reading "SiSi". Each stem starts at 32% of the glyph height and ends on the baseline. No heart. Confirmed by render and path bounds.
- **Measured (`Logo.astro`).** The visible glyph is 67.9 x 50.4 viewBox units (aspect 1.35:1) inside a 68x60 box, so the box carries 9.6 units of empty space at the bottom. Stem width 3.60 units = 5.3% of glyph width. Confirmed.
- **As shown.** Nav: `height: 30px` box = glyph 34 x 25 px, stem 1.8 px. Footer: `height: 46px` box = glyph 52 x 39 px, stem 2.8 px. Confirmed.
- **Minimum size (Rec, derived).** Keep stems at 1.5 px or more: glyph width 28 px on screen. The 16 px favicon has a 12 px glyph and 0.6 px stems (Confirmed by geometry); it renders as a blur. A 16 px version needs a heavier custom drawing.
- **Clear space (Rec, derived, not from a brand book).** Half the glyph height on every side, about 25 units in the 68x60 box or 7 stem widths. The posters (`Olq6a`) put the logo inside a white frame with roughly that much air (Inference, eyeballed).
- **Hero use.** At 1440 px wide and 2x DPR the vector needs no extra resolution: it scales without loss. The raster icons do not: 180 px is the largest and cannot exceed 90 CSS px at 2x. No logo raster with the tagline exists. Confirmed.
- **Gaps.** No coloured or outlined variant, no logo with "The Cork" or "R32", no monochrome burgundy for light paper (the black SVG is `#000`, not `#27060f`). If a direction needs those, use `PENDING: originals from Ignacy` (AI/PDF/brand book) rather than vectorizing photos. If originals never arrive, the existing vector paths can be recoloured; do not vectorize the neon photo.

## 5. Photography and film

### 5.1 Common look (Confirmed by viewing, Inference for the causes)

Night interior, tungsten and LED, very low mean luminance. One room, one lighting design: concentric curved ceiling LED rings (orange-red), a red-tiled back bar with lit bottles, moving-head beams, cobalt stage washes on the band, an orange Chivas Regal sign at stage right. Skin is warm and moderately lit only where a spot hits it. All stills look like the same professional event photographer (same grade, same lens rendering); credit unknown. PENDING.

### 5.2 Per-photo notes (all viewed at full size)

Portrait = 375x667 cover crop; landscape = 1440x900 cover crop. Sheet: `brand/crop-safety.jpg` (portrait then landscape per row, made by `scripts/crop_safety.py`). Sharpness proxy: variance of the Laplacian at 900 px wide (`data/sharpness.md`); <60 soft, >200 crisp in this set, and the metric reads low on dark or upscaled images.

| photo | subject | light and temperature | crowd / instruments | portrait 375 crop | landscape 1440 crop | native vs displayed | quality notes |
|---|---|---|---|---|---|---|---|
| `nBW0` hero poster, 1536x1024 | dark room, crowd silhouettes, ceiling rings, back bar | monochrome red grade; top beams; no warm or cool balance | many, no readable faces | centre crop (37% of width) keeps back bar and crowd; safe | safe | 1.88x upscale at 2x DPR (0.94 at 1x). Scrim 0.5 to 0 above it | bokeh particles composited at bottom left and top right, looks retouched (Inference); Laplacian 47; lowest luminance of all (Y 0.009) |
| `u3EOm`, 728x486 | vocalist front-left, guitarist behind, orange Chivas neon "CHIVA" | warm key on face (`#c28666`), orange backlight, cobalt floor wash | 1 singer, 2 musicians, drums edge | centre crop is the best portrait in the set (singer, mic, sign) | crops fine but soft | **smallest file.** B2B heroes stretch it 1.98x at 1x DPR, 3.96x at 2x, under a 0.70-0.96 burgundy scrim | soft when upscaled; sign clipped to "TIVAS" in the raw frame |
| `RMGSD`, 900x600 | band at the bar, guests left, lit bottle display | mixed: red-orange bar wall, amber practicals, blue lit box; faces backlit | guitarist, drummer, singer, 8+ guests | centre crop loses singer and half the band; set `object-position` near 60-70% | safe | shown about 570 px wide at 1440 (needs about 1140 at 2x: 1.27x upscale) | crisp (Laplacian 575); strongest "live at the bar" image; matches `home-night.ts:18` alt |
| `bHchR`, 1600x1066 | crowd silhouettes, orange ring lights, Chivas sign | orange-red, no cool; back lit | 30+ silhouettes, no faces | centre crop keeps the sign | safe; sign at 62% x | 0.90 (1x) / 1.80 (2x) | three vertical light columns cut the frame; bottom 40% is near black, good for text |
| `cDJcC`, 900x600 | full band, singer left | cobalt wash + orange sign + white key on faces | 3 musicians, drums, screen wall | **centre crop cuts the singer**; use `object-position` about 20% | safe | 1.6x at 1x | cobalt is the most saturated colour on the site |
| `MHGyp`, 900x600 (never shown) | dance floor and ring ceiling with red beams | orange-red, high contrast | ~40 guests, two faces, backs | centre crop good (beams + crowd) | safe | 1.6x at 1x | crisp; best "dance floor" image; has no visible use today |
| `bar-cocktails`, 1200x675 | two cocktails on the bar mat, hand | warm, shallow depth, teal-green bokeh | none | 32% of width; keeps spritz and hand | good | 1.33x at 1x | looks like a frame of the hero film (same scene at 5.2-6.3 s; Inference); soft (Laplacian 24-33) |
| `9B6Kt`, 2048x1365 (unreferenced) | singer centre, band, crowd, huge Chivas sign | yellow rim left, orange ring, warm faces | 20+ guests, faces | centre keeps band | safe | 0.70 (1x) / 1.41x upscale (2x) | best composition and crispness (Laplacian 800); identifiable guests |
| `BhLu6T`, 2048x1365 (unreferenced) | same event, wider | warm | crowd + band | ok | safe | same | crisp (769) |
| `YANjq`, 2048x1365 (unreferenced) | bar wall, guests in front | red-orange tile glow, blue on left | ~10 faces looking at camera | tight; guests dominate | safe | same | crisp (1259); ceiling ducts and three security domes visible at the top; faces are close-up (consent) |
| `RHdmR`, 900x599 (unreferenced) | empty room, bar, velvet chairs | red-orange, calm | none | good | good | 1.6x at 1x | cleanest venue shot; no people means no consent issue |
| `QxXDx`, 900x599 (unreferenced) | empty stage, drum kit, Chivas Regal sign | red, symmetrical | none | good | good | 1.6x | same |

Scale numbers are device pixels per native pixel; 1.0 means 1:1, above 1 the browser enlarges the image (`data/crop-scale.md`). No photo reaches 1:1 at 2x DPR for a 1440 px hero; the best (2048 px) needs 1.41x. Confirmed.

### 5.3 Resolution summary for a hero at 1440 px, 2x DPR

- Hero film: 2560x1440 → 1.25x at 2x. Best available.
- Photos: none at 1:1. Rec: for a still hero, use the three 2048 px frames and a slow 1.05x zoom in place of a hard crop, or request the originals (the site's OG image points to a Framer CDN `.png` of `nBW0`, so full-size masters exist upstream). `PENDING: originals from Ignacy`.

### 5.4 Video

`ffmpeg -i <file>` (imageio-ffmpeg 7.0.2); frames from `scripts/video_frames.py`; sheets `brand/video-*-sheet.jpg`. Confirmed.

| file | codec | resolution | fps | duration | bitrate | size | audio |
|---|---|---|---|---|---|---|---|
| `video/hero-night-hq-desktop.mp4` | H.264 High, yuv420p | 2560x1440 (16:9) | 24 | 6.63 s | 8,940 kb/s | 7.40 MB | none |
| `video/hero-night-hq-mobile.mp4` | H.264 High | 1080x1920 (9:16) | 24 | 6.63 s | 4,959 kb/s | 4.11 MB | none |
| `video/relacja-z-otwarcia.mp4` | H.264 High | 960x540 | 24 | 61.42 s | 683 kb/s | 5.25 MB | none |
| `framerusercontent.com/assets/MLWPbW1dUQawJLhhun3dBwpgJak.mp4` (unreferenced) | H.264 Main, bt709 | 1280x720 | 23.98 | 21.48 s | 648 kb/s | 1.74 MB | none |

What the frames show:

- **Hero film (12 frames at 0.2, 0.8, 1.4, 1.9 s, then 2.5 to 4.7 s, then 5.2, 5.8, 6.3 s).** Three shots in 6.6 s. 0-2.2 s: a whip-pan over the room, band and crowd, yellow beam, heavy motion blur (Laplacian 4 to 83). 2.4-5.0 s: close-up of a bartender's forearms opening a bottle, dark, background near black (top half of the mobile frame is empty). 5.1-6.6 s: two cocktails (orange spritz, cream drinks) on the bar mat, brightest part (Y up to 0.10). Loop point cuts from cocktails back to the whip-pan (Inference: loop is a hard cut). Confirmed order: music, pour, drink.
- **Hero mobile** is a true 9:16 crop, not a rotated crop of the desktop file: band framing differs (frame 0.2 s shows singer, bassist and guitarist at right). At 601-1024 px portrait (tablets) `hero-film.ts` serves the 16:9 file, which cover-crops to about 42% of its width at 768x1024 (Inference from the code: mobile source only at max-width 600).
- **Relacja (61 s).** A venue promo: R32 sign, a white flash frame (7.7 s, mean Y 0.94), a vocalist under blue light with burned-in Polish caption "DLACZEGO WARTO TU BYĆ ?" (space before the question mark, not Polish typography) and "ZOBACZCIE JAKA TU JEST ATMOSFERA !", a Chivas Regal bottle, the ring-lit floor, a violinist, drummer, bartender, singer, and the neon "SiSi THE CORK" façade at the end. It is shown as a ~330 px muted tile on all five language pages, so the Polish subtitles are unreadable and wrong for four locales. Confirmed (frames viewed).
- **Framer asset** is 21 s of open ocean. Not SiSi.

Sizes at which the site plays them: hero film covers the viewport (1440x900: 0.625 of native height, 90% of the width visible). Relacja plays in a gallery tile of about 320 px on desktop (three columns in the 70% container) and full column width, about 343 px, on phones, where the two photo tiles are hidden (`R32.astro:119-120`). At neither size can the burned-in captions be read.

### 5.5 Rights and third-party marks visible in the stills

Chivas Regal crown-shield and lettering appear in `u3EOm`, `bHchR`, `cDJcC`, `9B6Kt`, `BhLu6T`, `QxXDx` and the film; Chivas Regal bottles line the back bar in `YANjq`. The R32 sign is the film poster (`relacja-z-otwarcia-poster*.webp`). The site itself has a deliberate "Strefa Chivas Regal" section (`pl.ts:189`, `Chivas.astro`), so sponsor presence is intentional in one place; using the same pictures as generic heroes puts a third-party brand in the hero. Rec: choose images without the sign for a neutral hero (`RMGSD`, `MHGyp`, `RHdmR`, `bar-cocktails`, the hero film). Photographer, model releases, sponsor permission: `PENDING`.

## 6. Tone of voice

Method: read `src/i18n/ui/pl.ts` (602 lines) in full and `en.ts` (589) in full; in `de.ts`, `it.ts`, `cs.ts` I read the hero, about, R32, menu teaser, B2B home, reservations, careers subtitle, 404 metadata, reservation conditions, wine note and open-bar copy, plus grep for the rest. I did not read every line of the FAQ or forms in de/it/cs. `scripts/tone_stats.py` for the numbers (`data/tone-stats.txt`). Also `src/data/home-night.ts`. I am not a native reviewer of de/it/cs; section 6.4 lists candidates, not verdicts.

### 6.1 Polish (source)

- **Sentence length.** 196 sentences in 150 prose strings: mean 8.1 words, median 7; 66% are 8 words or fewer, 1% are 25 or more. Short, declarative. Confirmed.
- **Register.** Guest-facing pages use informal second person singular imperative: "Zacznij wieczór od kolacji w The Cork i przejdź prosto do SISI" (`pl.ts:167`), "Przewiń, by zobaczyć…" (`:219`), "śledź nas na Instagramie" (`:224`), "Zarezerwuj stolik przy Rzeźniczej 32-33" (`:245`). The B2B pages address "Ty" with a capital in possessives ("Twoich gości", "Twoje wydarzenie"). Reservation terms switch to impersonal-formal ("Rezerwację należy odebrać…", "prosimy o oczekiwanie", `:328, :336`). "Państwo" / "Pan" / "Pani" appear 0 times. Confirmed.
- **Verbs.** Imperatives of doing and going: zacznij, przejdź, zarezerwuj, poznaj, zobacz, przewiń, wybierz, wyślij, dołącz. First-person plural for the venue's craft: "mieszamy na miejscu, według własnych receptur", "stawiamy na polskie winnice", "szukamy ludzi z pasją do dobrego drinka i muzyki". Night sequencing in the third person: "wieczór zaczyna się od muzyki na żywo", "za konsoletę wchodzą DJ-e", "parkiet działa do 4 rano", "wieczór przenosi się na parkiet".
- **What it avoids.** Exclamation marks: 0 in the prose strings of all five dictionaries. Superlatives and luxury words (`najlepszy`, `unikalny`, `luksus`, `niezapomniany`, `magiczny`): 0 in `pl.ts`. Emoji: none. Prices and entry rules are stated flat (`pl.ts:206`: "Rezerwacja stolika to 100 zł od osoby do wykorzystania przy stoliku; w soboty obowiązuje dodatkowy wstęp 40 zł od osoby."). Confirmed.
- **Recurring words.** `wydarzenia` 21, `SiSi` 17, `The Cork` 16, `gości` 12, `wieczór` 7, `klub` 8, `Wrocławia` 8, `koktajle`, `piątki`, `soboty`, `kolacja`, `na żywo`, `DJ-e`, `energia`. Recurring frames: "w centrum Wrocławia", "w kompleksie R32 przy Rzeźniczej", "piątki i soboty", "do 4 rano", "pod jednym adresem".
- **Voice moments (real lines).** Hero: "SERCE WROCŁAWIA BIJE W SiSi" (`pl.ts:146-147`). "Muzyczna ewolucja wieczoru" (`:154`). "Kolacja i klub pod jednym adresem" (`:166`). "Spotkajmy się przy barze. Jest czas na rozmowę i pierwszy toast." (`home-night.ts:20`). "Live acty nadają początkowi wieczoru rytm. Muzycy są tuż obok." (`:21`). 404: "…strona, której szukasz, zniknęła jak ostatni gość o świcie." (`pl.ts:370`). This is the warmest the copy gets: one image per line, then a fact.
- **Formality by section.** Marketing: conversational. Legal and reservation conditions: impersonal. Forms: neutral labels ("To pole jest wymagane."). Blog: not analysed here (generated, `articles.generated.ts`).

### 6.2 Other four languages (same measurement)

| lang | sentences | mean words | median | <=8 words | address form (Confirmed from verbs) | city name in prose |
|---|---|---|---|---|---|---|
| en | 200 | 9.2 | 8 | 55% | neutral "you" ("Start the evening…", "Meet us at the bar") | Wrocław |
| de | 200 | 8.7 | 7 | 58% | informal du ("Beginne den Abend…", "geh direkt weiter", "deine Reservierung", `de.ts:161, 199`) | Breslau |
| it | 199 | 9.2 | 8 | 59% | informal tu ("Inizia la serata… e passa direttamente", `it.ts:160`) | Breslavia |
| cs | 193 | 8.1 | 7 | 65% | **formal vykání** ("Začněte večer…", "Uspořádejte", "najdete", "S vaším souhlasem", `cs.ts:116, 161, 170, 192`) | Vratislav |

Confirmed. The Polish voice is tykání; Czech is the only locale that switches to formal. Whether that is deliberate is PENDING. The tagline is translated by meaning, keeping the verb "beats": EN "THE HEART OF WROCŁAW BEATS AT SiSi" (`en.ts:140-141`), DE "DAS HERZ BRESLAUS SCHLÄGT IM SiSi", IT "IL CUORE DI BRESLAVIA BATTE AL SiSi", CS "SRDCE VRATISLAVI BIJE V SiSi".

Typographic habits shared by all five: hyphen with spaces used as a dash (19-20 per dictionary), one em dash each (`wineLead`), the ellipsis character in "Wysyłanie…", uppercase hero lines typed in caps in the string rather than by CSS (`Hero.astro` comment) so the mixed-case "SiSi" survives.

### 6.3 Recurring phrases worth building on

"Serce Wrocławia bije w SiSi"; "Kolacja i klub pod jednym adresem"; "Muzyka na żywo, DJ-e i koktajle"; "Piątki i soboty, 22:00-04:00"; "Bar i parkiet w jednej przestrzeni"; "Friday Session"; "Live Acty"; "Night Menu by The Cork"; "Konferencja w dzień, klub wieczorem" (`pl.ts:419`). Names to keep untranslated: SiSi, The Cork, R32, Rzeźnicza 32-33, Night Menu, Friday Session, Chivas Regal.

### 6.4 Lines flagged for native review (do not rewrite the site from this list)

| file:line | lang | issue | label |
|---|---|---|---|
| `pl.ts:156, 167`; `en.ts:150, 161`; `de.ts:150, 161`; `it.ts:149, 160`; `cs.ts:150, 161` | all | "SISI" in caps in the running text; the logo, hero and metadata say "SiSi". 10 occurrences | Confirmed |
| `pl.ts:158-160` "Live Acty: muzyka na żywo na start nocy"; `home-night.ts:21` "Live acty"; `pl.ts:148` "live acts" | pl | three spellings of one term (capitalised inflected, lower inflected, English plural). `cs.ts:154` "Live Acty", `it.ts:153` "Live Act" | Confirmed; which is right is PENDING |
| `pl.ts:275`, `en.ts:268`, `de.ts:268`, `it.ts:267`, `cs.ts:268` (`wineLead`) | all | em dash, the only one in each file (bar the file header in `pl.ts:1`); near-duplicate of the `menuTeaser` wine tab (`pl.ts:180`) | Confirmed |
| `pl.ts:328`; `en.ts:321` "must be claimed"; `de.ts:321` "einzulösen"; `it.ts:320` "va ritirata"; `cs.ts:321` "vyzvednout" | all | "odebrać rezerwację" carried into each language as "collect/pick up a reservation"; unclear what the guest does | Assumption (intended: turn up and confirm) |
| `pl.ts:453`; `en.ts:441` "an open bar on us"; `de.ts:441` "auf unsere Kosten"; `it.ts:440` "offerto da noi"; `cs.ts:441` "na náš účet" | all | reads literally as "the venue pays". The comment at `pl.ts:413-415` says the owner confirmed B2B claims on 2026-06-24; the wording still needs the owner to say who pays | PENDING owner |
| `pl.ts:517` "u was" | pl | lower-case plural "was" in an FAQ where the rest is capital-T singular ("Twoich gości") | Inference |
| `pl.ts:205`, `en.ts:199`, `de.ts:199`, `it.ts:198`, `cs.ts:199` | all | `reservationsHome.reassure` has no closing full stop while its sibling strings do | Confirmed, minor |
| `en.ts:445` "Zone separation" | en | calque of "Wydzielenie stref" | Inference |
| `en.ts:472, 481, 483` "destination", "Ready support for presentations and panels." | en | "destination" replaces "kompleks"; second line reads machine-made | Inference |
| `en.ts:420` tile `central` / `Wrocław location` | en | a fact tile with a non-fact value | Inference |
| `en.ts:328` "Special packages at promotional prices are also available." | en | stiff | Inference |
| `de.ts:202` "Zeiten" for opening hours | de | "Öffnungszeiten" elsewhere (`de.ts:110, 342`) | Inference |
| `de.ts:323` "Türauswahl" | de | calque of "selekcja"; unidiomatic | Inference |
| `de.ts:150` "der Floor" | de | anglicism, while the card at `de.ts:152` says "Tanzfläche" | Inference |
| `it.ts:322` "selezione all'ingresso" | it | calque of "selekcja" | Inference |
| `it.ts:320` "va ritirata" | it | "ritirare" means collect goods | Inference |
| `cs.ts:323` "výběr u vstupu" | cs | calque of "selekcja" | Inference |
| `cs.ts:161-170` vs `pl.ts:167` | cs vs pl | formal `vy` against tykání elsewhere | Confirmed |
| `en.ts:318`, `de.ts:318`, `it.ts:317`, `cs.ts:318` "PLN" vs `reservationsHome.terms` (`en.ts:200`) "zł" | non-pl | currency shown as "PLN" in one block and "zł" in another | Confirmed |
| `relacja-z-otwarcia.mp4` captions | video | "DLACZEGO WARTO TU BYĆ ?" space before "?" and "!" ; Polish only on a five-language site | Confirmed |

## 7. Recurring motifs (only what an asset or line shows)

1. **Heart and pulse: in the words only.** "Serce Wrocławia bije w SiSi" (`pl.ts:146-147`, all five locales). No heart or pulse graphic exists anywhere: the logo is letterforms, `grep -i heart` over `src/` finds nothing, the public SVGs are icon libraries. Confirmed. A heartbeat visual would be new, not inherited.
2. **The night as a sequence.** `home-night.ts` and `About.astro` set out three phases: "Pierwszy koktajl" → "Muzyka na żywo" → "Parkiet do 4:00". The hero film follows it in image (band, pour, drink). Live music at the bar comes first in copy (`pl.ts:156`), photo (`RMGSD`) and caption. Confirmed.
3. **The curved LED ring ceiling.** Concentric orange-red bands wrap the room; visible in `nBW0`, `MHGyp`, `bHchR`, `9B6Kt`, `BhLu6T`, hero film frames 1 to 4, and echoed by the poster line frames. It is the room's most repeated graphic. Confirmed.
4. **The lit bottle wall.** Red tile, glass shelves, back-lit bottles: `YANjq`, `RHdmR`, `RMGSD`, `QxXDx`, hero film frame 0.2. Confirmed.
5. **Burgundy, cream and gold** as the site's surface system (`global.css:28-35`), with a drifting field of cream and gold motes behind glass cards (`Particles.astro:2-4`, `field.ts:58-70`: "motes of light in a dark club"). Confirmed.
6. **Monoline "SiSi" in neon.** Logo strokes and the real façade sign match (4.1). Confirmed.
7. **Poster frame.** Event posters: red duotone photo, white type in a wide extended sans, a white line frame with one rounded corner, R32 mark top left, SiSi + "MUSIC FOOD MORE" bottom centre. Confirmed (five posters).
8. **Dinner then club at one address.** "Kolacja i klub pod jednym adresem" (`pl.ts:166`), The Cork and SiSi named together in B2B copy, the film's last frame "SiSi THE CORK". Confirmed.
9. **Cocktails as colour.** Orange spritz and cream drinks (`bar-cocktails`, film 5-6 s, blog art). Confirmed.
10. **A named sponsor zone.** Chivas Regal shield and lettering in six stills, bottles in a seventh, and a dedicated section (`pl.ts:189`). Confirmed.
11. **Wrocław as a place name, not a picture.** "Wrocław" 8 times in `pl.ts` prose plus the tagline. A landmark search (`Rynek`, `Ostrów Tumski`, `krasnal`, `Hala Targowa`, `Odra`, `Sky Tower`) over `src/` copy and components finds only the street name; the single skyline is one generated blog illustration (1.3). Confirmed.

## 8. Gaps: things the assets cannot tell us

| gap | why it matters | status |
|---|---|---|
| Photo rights, photographer credit, licence term for all venue photos | any hero or ad use | `PENDING` |
| Releases for identifiable people (the singer appears in 6+ assets; guests are close-up in `YANjq`, `9B6Kt`) | portraits in a hero | `PENDING` |
| Chivas Regal and R32 permission for logos inside photos and film | neutral hero vs sponsor hero | `PENDING` |
| Logo originals (AI/PDF/SVG master), brand book, clear-space and minimum-size rules | derived rules in 4.2 are Rec only | `PENDING` |
| Logo lockups with "The Cork" and "R32"; a 16 px favicon drawing | co-branding, tab icon | `PENDING` |
| Official typefaces for print, posters and the menu (poster and menu face is not in the repo) | 3.3 | `PENDING` |
| Print colour standards (CMYK/Pantone) linking `#27060f`, `#8e1f2c` and the poster red | consistency across web and print | `PENDING` |
| Full-size masters of the photos; the OG image `.png` on the Framer CDN | 2x DPR heroes, 1200x630 social card | `PENDING` |
| Source of the hero film (grade, higher bit depth, music) and licence for any soundtrack (files have none) | audio, longer edits | `PENDING` |
| Press, awards, reviews | none are in the assets; do not invent | `PENDING` |
| Who owns the blog illustration and where it was generated | reuse, replacement | `PENDING` |
| Whether Czech is meant to be formal, and the preferred spelling of "Live Acts" and "SISI" | tone by locale | `PENDING` |
| Event names, dates and artists on the five posters (`Anna Nguyen`, `Axel P`, `ADB`, `Marta Kołodziejczyk`, `Mike Lynx`) | may be past; do not reuse | `PENDING` (`[LINEUP?]`) |
| Bar menu prices in the print PNG against the site menu | do not reuse | `PENDING` (`[PRICE?]`) |

## 9. Where three directions can diverge (Rec, each grounded in a measured asset)

These are hooks for the designer, not decisions.

- **A. Wine and cream (stay close to the tokens).** Ground `#27060f`, panels `#34101a`, cream `#EDDBC2` type, gold `#FBD295` only for labels. Photos: `RMGSD`, `bar-cocktails`, the hero film with the scroll label fixed; empty-room `RHdmR` as a calm break. Type: Cal Sans and a fixed Montserrat subset. Uses what exists; the fixes it needs are the Czech glyphs, the input borders and the bright-shot scrim.
- **B. Stage red, poster language.** Anchor on `#a82606` and `#8e1f2c`, white or `#fffbf5` type, red duotone photography and the white rounded line frame from the posters, curved ring lines as a graphic device. Photos: `nBW0`-style red grade, `MHGyp`, `bHchR`. Needs: an explicit red token, a wide extended display face (unidentified, PENDING), and caution on contrast (`#e03a03` on `--bg` is 4.27:1, cream on it 3.25:1).
- **C. Brass and tungsten.** Anchor on `#d69f3b` / `#a2865f` / `#fdca7d` against aubergine `#14050e`, warm peach highlights `#d5906e`. Photos: the hero film, `bar-cocktails`, lamp and bottle-wall close-ups, `9B6Kt` warm crowd. Ink `#1a120b` on brass is 7.82:1, brass on aubergine is 5.8 to 7.9:1. Needs the cobalt frames (`cDJcC`, `u3EOm`) either avoided or graded.

## 10. Reproduce

Frames for video steps go to a scratch folder; substitute your own path (`$S`).

```
S=/tmp/brandframes
python3 docs/sisi-elevate/brand/scripts/inventory.py            > docs/sisi-elevate/brand/data/image-inventory.md   # 1
python3 docs/sisi-elevate/brand/scripts/video_frames.py $S                                                          # 2.2, 5.4  (12 frames per video + video sheets)
python3 docs/sisi-elevate/brand/scripts/colors.py $S                                                                # 2.2       (images + video k-means, luminance)
python3 docs/sisi-elevate/brand/scripts/skin_led.py             > docs/sisi-elevate/brand/data/skin-led.txt          # 2.2
python3 docs/sisi-elevate/brand/scripts/sample_regions.py       > docs/sisi-elevate/brand/data/region-samples.txt    # 2.2
python3 docs/sisi-elevate/brand/scripts/menu_png_colors.py                                                          # 2.4
python3 docs/sisi-elevate/brand/scripts/palette.py                                                                  # 2.3       (swatches + delta table)
python3 docs/sisi-elevate/brand/scripts/wcag.py                 > docs/sisi-elevate/brand/data/wcag-pairs.md         # 2.5
python3 docs/sisi-elevate/brand/scripts/wcag.py --hero $S       > docs/sisi-elevate/brand/data/wcag-hero-over-video.md
python3 docs/sisi-elevate/brand/scripts/fonts.py                > docs/sisi-elevate/brand/data/fonts-inspect.txt    # 3.1-3.4
python3 docs/sisi-elevate/brand/scripts/font_coverage.py        > docs/sisi-elevate/brand/data/font-coverage.txt
PORT=4391 node /home/user/sisi-baseline/scripts/serve-dist.mjs &                                                    # then:
PORT=4391 node docs/sisi-elevate/brand/scripts/fonts_rendered.mjs                                                   # 3.1 (glyphs painted per family)
PORT=4391 node docs/sisi-elevate/brand/scripts/fonts_fallback.mjs /cs/                                              # which text falls back
node docs/sisi-elevate/brand/scripts/render_logos.mjs ; node docs/sisi-elevate/brand/scripts/logo_metrics.mjs       # 4
python3 docs/sisi-elevate/brand/scripts/contact_sheet.py ; python3 docs/sisi-elevate/brand/scripts/crop_safety.py   # 5
python3 docs/sisi-elevate/brand/scripts/sharpness.py $S         > docs/sisi-elevate/brand/data/sharpness.md
python3 docs/sisi-elevate/brand/scripts/blog_sheet.py           > docs/sisi-elevate/brand/data/blog-hero.txt        # 1.3
python3 docs/sisi-elevate/brand/scripts/tone_stats.py           > docs/sisi-elevate/brand/data/tone-stats.txt       # 6
python3 docs/sisi-elevate/brand/scripts/build_brand.py                                                              # re-inlines the tables into this file
```

Tool versions: Python 3.11 (Pillow, OpenCV headless, NumPy, fontTools 4.66 installed with `pip install fonttools brotli`), Node 22.22.2, sharp and playwright-core from `/home/user/sisi-tools`, Chromium 141, ffmpeg 7.0.2 via imageio-ffmpeg. k-means uses a fixed seed but OpenCV's `KMEANS_PP_CENTERS` can vary in the last digit across builds.

Files in `brand/`: `contact-sheet.jpg`, `contact-sheet-unreferenced.jpg`, `crop-safety.jpg`, `palette-swatches.png`, `logo-sheet.png`, `blog-hero-sheet.jpg`, `video-{hero-desktop,hero-mobile,relacja,framer-asset}-sheet.jpg`, `crops/`, `data/`, `scripts/`.
