# Brief: three art directions for SiSi Wrocław (Phase 5.2)

Read `WORKING-RULES.md`, `BRAND.md` (all of it, and look at every image in `brand/`), `RESEARCH.md` (CSS approach, fonts), `IMPORTED.md` section D.13 (claims not to contradict) first.

## What SiSi is (Confirmed, from the site and assets)

A music club and bar in the R32 complex, Rzeźnicza 32-33, 50-130 Wrocław. Friday and Saturday, 22:00 to 04:00. The night starts with live music at the bar, DJs take over, the floor runs until 4 am. Dinner and the club at one address (The Cork). Tagline: "Serce Wrocławia bije w SiSi". Brand ground colour `#27060f`. Photography: live musicians, cocktails, crowds under orange-red LED rings, blue stage wash, brass lamps (see `brand/contact-sheet.jpg`, `brand/palette-swatches.png`). Five languages: pl (source), en, de, it, cs.

## What each direction must be

A different CONCEPT, not a re-skin: different idea, different layout logic, different type, different motion personality. Derive it from SiSi's own assets and the idea of the "musical evolution of the night". Each direction delivers, inside `docs/sisi-elevate/directions/<id>/`:

1. `IDEA.md`: one paragraph (the idea), why it fits SiSi (cite the asset or line of copy it comes from), what it is NOT, the layout logic of a page, the graphic language (what the recurring shape/line/texture is and where it comes from), and how it uses the current site's assets. Labels: Confirmed / Rec / Assumption / Inference.
2. `tokens.css`: the direction as CSS custom properties on `:root[data-direction="<id>"]` following the TOKEN CONTRACT below. No hard-coded colours anywhere else.
3. Fonts: a display + text pairing that is free (OFL or similar), SELF-HOSTED as woff2 in `directions/<id>/fonts/` with the licence file. Get files from npm (`npm view @fontsource/<name>`; the registry works, Google Fonts does not), from a font's GitHub release via the proxy if reachable, or from `pip install` packages; never link to a font CDN. Each face MUST cover Polish, Czech, German and Italian text (ąćęłńóśźż čěřšůžý äöüß àèéìòù and „ " – …); verify with fontTools against the actual glyph list and paste the result. The current site fails this for cs/de/it (Montserrat subset). Subset to latin + latin-ext and report the byte size (initial font budget: 60 KB of woff2 for the hero path).
4. A real rendered hero in Polish: `hero.html` (self-contained: inline CSS and JS, relative font paths, images copied or referenced from `../../../../public` are NOT allowed: copy the needed derivative images into `directions/<id>/img/`, resized and encoded (AVIF or WebP with `srcset`) with sharp or PIL). Content is real only: tagline "Serce Wrocławia bije w SiSi", "Piątek i sobota, 22:00–04:00", "Rzeźnicza 32–33, Wrocław", CTA "Zarezerwuj stolik", and where a fact is missing use a marked placeholder such as `[LINEUP?]`. Render at 375, 768 and 1440 with Playwright (Chromium at /opt/pw-browsers/chromium, block external requests), screenshot, LOOK at each screenshot, fix, repeat until it is good. Save `screens/hero-375.png`, `hero-768.png`, `hero-1440.png`. Zoom into details with PIL/OpenCV crops and check them.
5. Palette table in `IDEA.md`: every colour with hex, role, and measured source (which photo pixel region or which site token), plus WCAG 2.x contrast ratios for every text-on-background pair you use (write the math yourself or use culori from /home/user/sisi-tools/node_modules), with pass/fail against AA (4.5:1 body, 3:1 large text and UI). No failing pair may be used for text.
6. Photo and video treatment: what happens to the real photos and the hero film (crop, tone, overlay, mask, frame), demonstrated on at least two real images in `screens/treatment-*.jpg` (before/after). Be honest about resolution limits from BRAND.md section 5.3 (no photo is hero-grade at 2x; the best stills are 2048 px). Include what the low-data and reduced-motion versions show.
7. Motion personality: a described set of 3 to 5 motion rules with durations and easings (CSS custom properties), ONE orchestrated moment in the hero (working, in `hero.html`), and its reduced-motion fallback that is calmer, not absent. Animate `transform` and `opacity` only. Prefer CSS scroll-driven animation (`animation-timeline`) and View Transitions with a fallback for browsers without them; JS only where CSS cannot. Produce a motion contact sheet: freeze the animation at 0, 10, ... 100 percent (use the Web Animations API `currentTime`/pause or `animation-delay` negative values), screenshot each frame, tile into `screens/motion-sheet.png`, and LOOK at it: parts stay attached, no jumps, loop seam invisible.
8. Type specimen `specimen.html`/`screens/specimen-*.png` showing pl/en/de/it/cs sample lines including the longest German and Czech words on the 375 px viewport (no overflow), the numerals in a price ("100 zł", "22:00–04:00") and small-size legibility (12-14 px).
9. Performance and accessibility of the hero: run axe (@axe-core/playwright in /home/user/sisi-tools) and record 0 serious/critical; keyboard focus visible on the CTA; touch target at least 44 px; measure hero LCP-relevant bytes (fonts + image + CSS + JS transferred, gzip) against the budget 1.2 MB initial transfer excluding deferred video, initial JS 90 KB gzipped.
10. `REPORT.md`: 8 lines max: what you built, the numbers (font bytes, image bytes, contrast minima, axe result), what is weak, and the two lists below.

## TOKEN CONTRACT (all three directions define exactly these; the playground and every component use only these)

Colour: `--c-bg`, `--c-bg-raised`, `--c-surface`, `--c-surface-2`, `--c-text`, `--c-text-dim`, `--c-text-mute` (all three must meet AA on `--c-bg` and `--c-surface`), `--c-line`, `--c-line-strong` (3:1 for UI borders), `--c-accent`, `--c-accent-hover`, `--c-accent-ink` (text on accent, AA), `--c-warm`, `--c-cool`, `--c-danger`, `--c-success`, `--c-focus` (3:1 against both bg and accent), `--c-scrim`.
Type: `--f-display`, `--f-body`, `--f-num` (tabular figures for times and prices), `--fs-0` to `--fs-8` (fluid `clamp()` scale, 375 to 1440), `--lh-tight`, `--lh-body`, `--tracking-display`, `--fw-body`, `--fw-strong`, `--fw-display`.
Space and shape: `--sp-1` to `--sp-8`, `--r-1`, `--r-2`, `--r-3` (NOT pill-shaped buttons: radius at most 12 px unless SiSi assets show otherwise), `--shadow-1`, `--shadow-2`, `--tap` (44px), `--maxw`.
Motion: `--dur-1` (120ms), `--dur-2` (240ms), `--dur-3` (480ms), `--dur-4` (900ms), `--ease-out`, `--ease-in-out`, `--ease-spring` (as `linear()` where supported with fallback), `--motion-scale` (1, or 0.4 under reduced motion).
Time of night: `--night-t` (unitless 0 at 22:00 to 1 at 04:00), set by JS; each direction defines what it changes (`--c-warm`, glow position, accent temperature...). Under reduced motion it may change on load but must not animate.
Direction hooks: `--dir-ornament` (an inline SVG data URI or `none`), `--dir-frame` (how photos are framed: `border-radius`/mask), `--dir-rule` (a divider style).

## Style bans (Phase 5.5). Do not use unless SiSi's own assets already use it

Cream or off-white page background (the site uses cream TEXT on wine: that is allowed; a light page ground is not). Italic accent words in headlines. Numbered `01 / 02 / 03` labels. Monospace labels. Pill-shaped buttons. Near-black with an acid-green or vermilion accent. Broadsheet hairline-rule layouts. Generic gradients (a gradient must come from a measured light in a real photo and be justified). Glassmorphism/backdrop blur cards. The default Tailwind look. Nightlife clichés: neon purple and cyan cyberpunk glow, blurred bokeh stock backgrounds, gold-on-black "luxury" templates, stock photos of other venues, particle backgrounds (the current site has one: do not carry it over), cursor followers, autoplay audio.

## Reaching-for-defaults log (required in REPORT.md)

After your first pass, list (a) the styles you actually used, and (b) the defaults you caught yourself reaching for (fonts, layouts, effects, colours) even if you avoided them, with what you replaced them with. This feeds the ban list in `DIRECTIONS.md`.

## Also required

- Photos: only the real assets listed in BRAND.md; no invented imagery. If a concept needs imagery you do not have, draw it as SVG from a real shape (for example the LED ring geometry measured from the photos) and say so.
- Everything works offline, no network.
- Names of classes are scoped (`.sp-hero-…`), no global resets outside `:where()`.
- Write prose in stop-slop style, no em-dashes. Never invent facts (prices, hours, artists, reviews, press).
- If something fails three times, stop, save the evidence (command, screenshot, numbers) in `REPORT.md` and report it.
