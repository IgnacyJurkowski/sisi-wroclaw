# Resume guide (checkpoint 2026-09-29)

Read `PROGRESS.md` first, then this file, then `git log` on each branch. Do not rely on memory.

## Where things live

| What | Path / branch | State |
|---|---|---|
| Docs and research (this folder) | `/home/user/sisi-elevate`, branch `sisi-elevate/base` (from `main` e1feb25) | committed and pushed at the checkpoint |
| Contract suite (Phase 1) | `/home/user/sisi-wt-contract`, branch `sisi-elevate/contract`, tip `fb32d53` | done, `npm run contract:prod -- --offline` PASS in 21 s, 4 waived known defects |
| Venue source of truth (Phase 3a) | `/home/user/sisi-wt-venue`, branch `sisi-elevate/venue-truth` | typed content files + 38 passing tests + `astro check` clean; inventory script unfinished (WIP commit) |
| Frozen baseline build of main | `/home/user/sisi-baseline/dist` | container-local, rebuild with `npm ci && npm run build` at e1feb25 if lost |
| Tools | `/home/user/sisi-tools` | container-local, versions in PROGRESS.md |
| served-app (read-only) | `/home/user/served-app` | container-local, shallow clone |

Containers are ephemeral. Everything not pushed is lost. Worktrees must live OUTSIDE the checkout at `/home/user/sisi-wroclaw` (nested worktrees break the Astro build through the parent `tsconfig.json`). Browser tests need `ln -sf /opt/pw-browsers/chromium-1194/chrome-linux/chrome /usr/bin/google-chrome`. Production hosts are denied by the network policy; local builds stand in.

## Finished agent work (committed)

`RESEARCH.md`, `IMPORTED.md` (VVS checklist V01-V64, prior audits, funnel and consent decisions), `BRAND.md` + `brand/`, `audit-blog.md` + `blog-audit.json`, `SERVED-ADAPTER.md` + `served-fixtures/`, `playground-src/lib/night.*` (228 tests, 3 timezones), `DIRECTION-BRIEF.md`, `WORKING-RULES.md`.

## Stopped mid-flight (user asked to checkpoint and stop). Partial outputs are committed, labelled partial. Re-launch with the briefs named here

1. **Crawl and screenshot baseline** (Phase 0.5, part of 0.6). Left: `baseline/screens/` (87 WebP, 6 contact sheets, pl and en at 375/768/1440, all routes). Missing: `baseline/CRAWL.md`, `crawl.json`, image and video inventory, third-party inventory, html-validate summary, visual defects list. Spec: serve `/home/user/sisi-baseline/dist` with `PORT=4420 node /home/user/sisi-baseline/scripts/serve-dist.mjs`; block non-local requests in Playwright; per URL status, redirect chain (also parse `netlify.toml`), headers, HTML bytes gz, page weight by type at 375 and 1440, initial JS gz, third-party domains attempted, every image (format, natural vs displayed size, dimensions attributes, loading, srcset), every video (codec via the imageio-ffmpeg binary, poster, preload, muted, controls, reduced-motion and Save-Data behaviour), unreferenced files in `public/`, then view the screenshots and list visual defects. No Lighthouse in that task.
2. **Guest tasks and lead verification** (Phase 0.7, part of Phase 2). Left: `baseline/guest/` raw evidence (42 JSON files, screenshots converted to WebP, including `crawl-all.json`, `untranslated-scan.json`, `campaign-carryover.json`, `video.json`, tasks t1 to t6 per language). Missing: `LEADS.md` (every Context lead Confirmed/Dismissed/Partly with evidence) and `GUEST-TASKS.md` (taps, seconds, pass/fail on a 375 px phone, slow 4G, CPU 4x, dark scheme; tasks 1-6 in pl and en, task 7 in de/it/cs; clock-faked Friday 23:30, Saturday 02:00, Tuesday 15:00). The data is there; the synthesis is not. Do not trust the raw files without reading them.
3. **Phase 3a venue source of truth**. Committed: `src/content/venue/*`, `scripts/venue.test.mjs`, exporter and playground JSON. Missing: `docs/sisi-elevate/VENUE-INVENTORY.md` (per-place disagreements), `docs/sisi-elevate/GAPS.md` (gap log; `src/content/venue/gaps.ts` already holds a draft), a finished `scripts/venue-inventory.mjs`. Phase 3b (consumers read from it, facts contract enforced) not started.
4. **Art directions** (Phase 5.2): `directions/os` (Night Axis), `directions/pierscien` (The Ring), `directions/puls` (The Pulse). Left: fonts (with OFL licences), image derivatives, build tools, `puls/tokens.css`, `pierscien/img/rings.svg`. Missing for all three: `IDEA.md`, `tokens.css` (os, pierscien), `hero.html`, screenshots at three widths, specimen, palette and contrast tables, motion contact sheet, axe result, `REPORT.md` with the two defaults lists. Re-launch each with `DIRECTION-BRIEF.md` plus the concept paragraph in `RESUME-DIRECTION-CONCEPTS` below. Verify the fonts already produced (glyph coverage for pl/cs/de/it) before reuse.

### RESUME-DIRECTION-CONCEPTS
- `os` "Oś nocy": the site is the night, 22:00 to 04:00. Vertical time axis, hero as a night dial or ruler with big tabular numerals, light temperature moves with `--night-t` (brass lamps, orange-red LED ring, blue stage wash of the band photos, aubergine film shadow). Flat stepped colour bands measured from photos. Orchestrated moment: the night runs 22:00 to 04:00 in about six seconds. Uses `playground-src/lib/night.mjs`. Fonts so far: Big Shoulders Display + Hanken Grotesk (subset files in `directions/os/fonts`).
- `pierscien` "Pierścień": the elliptical orange-red LED ceiling ring from photos 1, 4 and 6 is the design system (frames, masks, transitions, loader, focus ring). Photography-forward, haze as flat translucent shapes, no particles, no glass. Rings scale and rotate like a lighting cue. Fonts so far: Unbounded + Instrument Sans.
- `puls` "Puls": one line, heartbeat turning into audio waveform, sparse when live, dense when DJs take over, flat at closing. Shared `--beat` tempo. Tone-mapped photos from the film grade. Fonts so far: Anybody (width axis) + Figtree.

## Not started

Phase 1 follow-ups (none), Phase 2 main audit `docs/audits/2026-09-29-sisi-site.md`, Phase 4 Track A PRs, Phase 5.3 to 5.5 playground and `DIRECTIONS.md`, Phase 6 prototypes I2 to I5 and parking lot, Phase 7 verification, the Lighthouse and axe baseline (needs a quiet CPU: run it alone; 4 cores here), the final report.

## Track A queue, from what is already Confirmed (local build)

1. Terms vs reservation copy: Saturday entry 30 zł (`src/i18n/legal.ts:42`) vs 40 zł (`src/i18n/ui/pl.ts:327`); pick-up 22:00-23:30 (`legal.ts:44`) vs 22:00-23:00 (`pl.ts:328`). P0 fact conflict. Draft PR aligns Terms to the reservation page, PENDING Ignacy.
2. Blog: dead table-of-contents anchors on all 31 posts (305; `scripts/articles-sync/sanitize.mjs:34` strips heading ids); latent overflow from unbroken strings at 375 px (`BlogArticlePage.astro` has no `overflow-wrap`); 115 body images hosted on a third-party host (`*.supabase.co`), sending visitor IPs off-site; sanitiser docs say form/object content is dropped but text is kept.
3. Empty events hub is `index, follow` in a production build but absent from the sitemap (`EventsPage.astro` vs `sitemap.xml.ts:19-21`).
4. Sitemap `lastmod` = build date for every static route (`sitemap.xml.ts`).
5. Default `og:image` is an external Framer CDN URL (`Base.astro:64`, TODO at `:62`), no `public/og/`.
6. Fonts: inlined Montserrat subset lacks cs/de/it glyphs (118 glyphs fell back to DejaVu on `/cs/`); ~1.5 MB of unreferenced font files; base64 font inflates every HTML page (`dist/pl/index.html` 184,715 bytes).
7. Contrast: form input and checkbox borders 1.83:1 (needs 3:1), hero title over the brightest photo pixels 3.15-4.44:1, 11 px scroll label.
8. Cache: only `/assets/*` and `/fonts/*` are immutable; 232 of 234 static media/font/image files revalidate on every request.
9. PostHog runs anonymously (memory persistence, conversion events) before any consent decision. Legal question, decision item, do not change.
Each fix needs a check that failed before it (extend the contract suite and remove the matching entry from `contract/waivers.json`).
