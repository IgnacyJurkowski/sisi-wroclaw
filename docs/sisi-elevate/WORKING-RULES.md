# Working rules for the SiSi elevate run

Everyone who touches this run (main session and subagents) follows these.

## Hard limits

- Production is read-only and, in this container, unreachable: `www.sisiwroclaw.pl` is blocked by the network policy. Do not try to route around the proxy. Use the local build.
- Never push to `main`, never merge, never deploy. Branches and draft PRs only, and only the main session pushes.
- Never submit a real booking, contact or newsletter form. Never create a reservation on the external provider. No requests to third parties (Emenago, PostHog, Google Analytics) from tests: block them in Playwright with route interception.
- Never make a check pass by changing the check. If a baseline must change, say why in PROGRESS.md.
- Never invent facts: prices, hours, artist names, reviews, press, awards, allergen or ABV data, capacity. Use marked placeholders (`[LINEUP?]`, `[PRICE?]`) and list each as a gap.
- Fonts are self-hosted. No request to any font CDN.
- Fixed: Astro + Netlify, URL structure and localized slugs, five languages (pl, en, de, it, cs), brand color `#27060f`, tagline "Serce Wrocławia bije w SiSi", open robots policy and `llms.txt`.

## Paths

- Repo checkout (do not use for work): `/home/user/sisi-wroclaw`
- Main worktree, branch `sisi-elevate/base` (from `main` e1feb25): `/home/user/sisi-elevate`
- Frozen baseline build of `main` e1feb25: `/home/user/sisi-baseline/dist` (with `/home/user/sisi-baseline/scripts`). Serve it with `PORT=<n> node /home/user/sisi-baseline/scripts/serve-dist.mjs` after copying nothing: it serves `../dist` relative to the scripts folder.
- Tools installed outside the repo: `/home/user/sisi-tools/node_modules` (lighthouse 13.5, html-validate, culori, pixelmatch, pngjs, @axe-core/playwright, playwright-core, sharp). Python has pillow, opencv-python-headless, numpy, imageio-ffmpeg (ffmpeg binary path: `python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).
- Browser: Chromium 141 at `/opt/pw-browsers/chromium` (also linked at `/usr/bin/google-chrome`). Playwright must launch with `executablePath` set; add `--no-sandbox` if it complains. Do not run `playwright install`.
- Scratch space (temporary, outside repo): the session scratchpad directory given to you.
- Git worktrees for code work must be created OUTSIDE `/home/user/sisi-wroclaw` (a worktree nested inside it breaks the Astro build through the parent `tsconfig.json`): `git -C /home/user/sisi-wroclaw worktree add /home/user/sisi-wt-<name> -b <branch> sisi-elevate/base`, then `cp -r /home/user/sisi-elevate/node_modules /home/user/sisi-wt-<name>/`.

## Writing rules

- Label every claim in every document: **Confirmed** (seen in code, output or a real browser), **Rec** (recommendation), **Assumption**, **Inference**. Unresolved decisions are written `PENDING`.
- Prose follows stop-slop: plain, specific, no em-dashes, no filler openers, no "not just X but Y", no hype.
- Cite `file:line` for code claims. Numbers come from a run you did, with the command.
- "Local build" findings are Confirmed (local build). They have not been seen on production.

## Checking rules

- Render, screenshot, look, fix. When a screenshot is dense, crop and zoom with PIL or OpenCV.
- A phase is done when its checks pass, not when a summary is written.
- After three failed attempts at the same problem, stop and report the evidence (command, output, screenshots) instead of looping.
