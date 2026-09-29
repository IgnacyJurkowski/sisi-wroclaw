# SiSi elevate: progress

Resume rule: read this file and `git log` first, never memory. Worktree: `/home/user/sisi-elevate` (branch `sisi-elevate/base`, cut from `main` e1feb25). The worktree must sit outside the repo checkout: nested inside it, Astro's rolldown picks up the parent `tsconfig.json` and the build fails with `TSCONFIG_ERROR: Tsconfig not found` (Confirmed: parent tsconfig moved aside, build passes).

Labels: Confirmed (seen in code, output or a real browser), Rec (recommendation), Assumption, Inference. PENDING = needs Ignacy.

## Environment (Confirmed)

- Node v22.22.2, npm 10.9.7, Chromium 141 at /opt/pw-browsers (linked to /usr/bin/google-chrome because `scripts/*-browser.mjs` hard-code that path).
- Production hosts `www.sisiwroclaw.pl`, `sisiwroclaw.pl` are denied by the session network policy (proxy answers 403 to CONNECT). Consequence: no live crawl, no production Lighthouse, no live lead verification. Substitute: local `npm run build` output served locally, labelled "Confirmed (local build)". PENDING: allow those hosts in the environment's Network access, then re-run the live parts (Phase 0.5, 0.7, Phase 7 "before" reading).

## Baseline (Confirmed, local)

- unit: 171 tests, 170 pass, 1 environment-only fail (`scripts/audit-browser.test.mjs` test 52). `astro check`: 0 errors, 6 hints. Build: 93 pages. `test:build`: 496/496. All pre-existing; this run may not add one.
- Frozen baseline build of main e1feb25: `/home/user/sisi-baseline/dist`.

## Tools (versions)

lighthouse 13.5.0, html-validate 11.16.1, culori 4.0.2, pixelmatch 7.2.0, pngjs 7.0.0, @axe-core/playwright 4.13.0, playwright-core 1.63.0, sharp 0.35.5 (in /home/user/sisi-tools); repo pins playwright-core 1.61.1, axe 4.12.1, sharp 0.35.2. Python: pillow 12.3.0, opencv-python-headless 5.0.0.93, numpy 2.4.6, imageio-ffmpeg 0.6.0 (ffmpeg 7.0.2). Chromium 141.0.7390.37.

## CHECKPOINT 2026-09-29 (Ignacy asked to checkpoint and stop)

State: Phase 0 partly done, Phase 1 done, Phase 3a mostly done, Phase 5.1 done, Phase 5.2 barely started. Nothing in Phases 2 (main audit), 4, 5.3 to 5.5, 6, 7 is done. See `RESUME.md` for exact paths, what was stopped mid-flight, and the Track A queue. All agents were stopped; none are running.

## Branches and draft PRs (all draft, none merged, none deployed; no PR subscription was set because Ignacy asked to stop)

| Branch | Base | Draft PR |
|---|---|---|
| `sisi-elevate/contract` | `main` | https://github.com/IgnacyJurkowski/sisi-wroclaw/pull/37 |
| `sisi-elevate/base` (docs) | `main` | https://github.com/IgnacyJurkowski/sisi-wroclaw/pull/38 |
| `sisi-elevate/venue-truth` | `sisi-elevate/base` | https://github.com/IgnacyJurkowski/sisi-wroclaw/pull/39 |

## Checklist

### Phase 0: bootstrap and baseline
- [x] 0.1 git log, main SHA, worktree (`/home/user/sisi-elevate`, branch `sisi-elevate/base`)
- [x] 0.2 RESEARCH.md
- [x] 0.3 import earlier audits and specs: `IMPORTED.md`. No standalone VVS audit of SiSi, og:image fix doc, entry-point doc or funnel design doc exists in Drive, repo or git; section C is assembled from the PostHog spec and code. Notion not connected.
- [x] 0.4 build, lint, tests baseline (above)
- [ ] 0.5 crawl: PARTIAL. 87 screenshots exist (`baseline/screens/`); no `CRAWL.md`. Live crawl blocked by network policy.
- [ ] 0.6 Lighthouse + axe: NOT RUN (needs a quiet CPU). Screenshots: done for pl and en at 375/768/1440 (unreviewed).
- [ ] 0.7 verify Context leads: PARTIAL. Raw evidence in `baseline/guest/`; no `LEADS.md`.

### Phase 1: contract tests (branch `sisi-elevate/contract`, tip fb32d53)
- [x] URL, SEO, link, BLG, facts (inventory) contracts; 43 new unit tests; CI step; `CONTRACT.md`, `contract-proof.md`
- [x] Proof it catches breakage: slug rename, dropped hreflang, price change all fail; untouched branch green (I reran: PASS, 21 s, offline)
- Known limits: snapshot is a local build of main, not production (UNVERIFIED banner); Emenago HEAD and external og:image not checked (network); 4 known defects waived in `contract/waivers.json` (Track A fixes must remove them).

### Phase 2: audit
- [ ] `docs/audits/2026-09-29-sisi-site.md` NOT WRITTEN (inputs exist: RESEARCH, IMPORTED, BRAND, audit-blog, CONTRACT waivers, baseline data)
- [x] blog audit: `audit-blog.md`, `blog-audit.json` (31 posts; 10 rewrite, 11 merge, 10 remove, 0 keep; 20 of 117 SiSi claims contradict a source; 9 posts hard-contradict)
- [ ] guest tasks 1-7: PARTIAL raw data only

### Phase 3: source of truth (branch `sisi-elevate/venue-truth`)
- [x] 3a typed content files with provenance (`src/content/venue/*`), 38 tests pass, `astro check` clean
- [ ] 3a `VENUE-INVENTORY.md`, `GAPS.md`, finished inventory script
- [ ] 3b consumers read from it; facts contract enforced

### Phase 4: Track A fixes (stacked draft PRs)
- [ ] NOT STARTED. Queue in `RESUME.md`.

### Phase 5: creative direction and playground
- [x] 5.1 `BRAND.md`
- [ ] 5.2 three directions: fonts and images only (`directions/*`), no ideas/heroes
- [ ] 5.3 components, 5.4 feedback controls, 5.5 quality bar + `DIRECTIONS.md` ban list

### Phase 6: innovation
- [x] I1 logic: `playground-src/lib/night.mjs` (228 tests x 3 timezones, both clock-change nights)
- [x] I2 research: `SERVED-ADAPTER.md` (holdSlot and cancelBooking have no server support; confirmBooking creates a pending request and takes no payment)
- [ ] I1 UI/timeline contact sheet, I2 UI, I3, I4, I5, parking lot, three own ideas

### Phase 7: verification
- [ ] NOT STARTED

## Parked (with evidence)

None parked. Stopped by request, not by failure.

## PENDING decisions for Ignacy

1. Allow `www.sisiwroclaw.pl` and `sisiwroclaw.pl` in the environment Network access setting so the live crawl, live contract snapshot, Emenago HEAD checks and "before" readings can run.
2. Terms vs reservation page: Saturday entry 30 zł or 40 zł; pick-up window 22:00-23:00 or 22:00-23:30. Which is true?
3. PostHog anonymous measurement before consent: keep, or require consent? (legal)
4. Blog: apply the audit's recommendations? (noindex the 9 contradicting posts as an interim; rewrite, merge, remove). Also: is the "Ignacy Jurkowski" byline under first-person opinions intended?
5. DJ handover time and lineup source (`[DJ-START?]`, `[LINEUP?]`); phase lengths in the night clock (doors 30 min, last hour 60 min, closing 15 min are defaults); whether the 30-minute release counts from arrival or from 23:00.
6. VVS scoring type for SiSi (spec gives weights for 3 of 15 templates, none for SiSi).
7. Alcohol promotion (Chivas Regal Zone, brand marks in 6 of 12 stills) and age notice: question for you and a lawyer, untouched.
