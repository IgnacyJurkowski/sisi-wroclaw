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

## Checklist

### Phase 0: bootstrap and baseline
- [x] 0.1 git log, main SHA, worktree (`/home/user/sisi-elevate`, branch `sisi-elevate/base`)
- [x] 0.2 RESEARCH.md (committed f8ccc58)
- [ ] 0.3 import earlier audits and specs (agent running -> IMPORTED.md)
- [x] 0.4 build, lint, tests baseline (above)
- [ ] 0.5 crawl (local build; live blocked) (agent running -> baseline/CRAWL.md)
- [ ] 0.6 Lighthouse + axe (after crawl agent finishes, quiet CPU) + screenshots (crawl agent)
- [ ] 0.7 verify Context leads (agent running -> LEADS.md, GUEST-TASKS.md)

### Phase 1: contract tests (branch `sisi-elevate/contract`, agent running)
- [ ] URL, SEO, link, BLG, facts scaffold contracts; proof of catching breakage

### Phase 2: audit
- [ ] docs/audits/2026-09-29-sisi-site.md (fingerprints, severities)
- [ ] blog audit (agent running -> audit-blog.md)
- [ ] guest tasks 1-7

### Phase 3: source of truth
- [ ] 3a content file + inventory + GAPS.md (branch `sisi-elevate/venue-truth`, agent running)
- [ ] 3b consumers read from it; facts contract enforced

### Phase 4: Track A fixes (stacked draft PRs)
- [ ] to be planned from the audit

### Phase 5: creative direction and playground
- [ ] 5.1 BRAND.md (agent running)
- [ ] 5.2 three directions
- [ ] 5.3 components, 5.4 feedback controls, 5.5 quality bar + ban list (DIRECTIONS.md)

### Phase 6: innovation
- [ ] I1 night clock (logic agent running), I2 adapter (research agent running), I3, I4, I5, parking lot, three own ideas

### Phase 7: verification
- [ ] contract green, Lighthouse/axe not worse, playground checks, motion contact sheet, VVS/Booking Path Scan if available

## Parked (with evidence)

(none yet)

## PENDING decisions for Ignacy

1. Allow `www.sisiwroclaw.pl` and `sisiwroclaw.pl` in the environment network policy so the live crawl, live contract snapshot and "before" readings can run.
