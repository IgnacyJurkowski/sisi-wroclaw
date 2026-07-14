# design-sync notes — web-sisi (sisi-wroclaw)

## Why this sync is off-script

`web-sisi` is an **Astro marketing site**, not a bundlable JS component library:
- ~40 `.astro` components — server-side templates, not client-renderable JS modules.
- No Storybook, no `*.stories.*`, no compiled component `dist/` (the `dist/` is the built static site).
- The design agent's runtime renders React; Astro components cannot drop into it.

So the standard converter (`_ds_bundle.js` from a compiled `dist/`) does **not** apply.

## What we upload instead (Mechanism 1)

The design language is **CSS-class-driven**: buttons/UI are plain HTML with classes from
`src/styles/global.css` (136 class selectors). The styling is therefore fully portable and
ships verbatim. We upload:

- `styles.css` → `@import`s a copy of `global.css` (the transitive closure designs receive).
- `fonts/` → Cal Sans woff2 (Montserrat is base64-inlined inside global.css, nothing to copy).
- `tokens/` → `:root` custom properties, extracted for reference.
- `components/<group>/<Name>/` → hand-authored preview cards (`@dsCard` first line) + `.jsx`/`.prompt.md`.
- `README.md` → conventions header enumerating the class vocabulary (the key artifact for the agent).

No `_ds_bundle.js` (Astro can't produce one). **No `_ds_sync.json` anchor** — an honest omission for a
hand-produced layout; the next sync simply re-verifies everything.

## Font URL rewrite

Cal Sans `@font-face` in global.css uses absolute `/fonts/cal-sans-400-*.woff2`. The bundle copy
(`ds-bundle/global.css`) rewrites these to bundle-relative `fonts/cal-sans-400-*.woff2` so they resolve
inside the Claude Design project.

## Scope of first pass

Core kit (~8-10 cards): Buttons (Primary `.btn-cta`, Secondary `.btn-outline`), Foundations
(Colors, Typography), Forms (Select `.cselect-btn`, NumberStepper `.b2b-stepper-btn`),
Cards (EventCard, CaseStudyCard). Expandable in future syncs.

## Env quirk — preview verification

The gstack `/browse` daemon can't boot in this environment: Chromium fails with
"No usable sandbox" (AppArmor unprivileged-userns restriction, sysctl
`kernel.apparmor_restrict_unprivileged_userns=1`, and no root to clear it). Card
screenshots were captured by invoking the Playwright `chrome-headless-shell`
binary directly with `--no-sandbox --headless --screenshot` (the browse skill's
"offline render mode" done by hand). Reuse that path for future preview
verification here.

## Uploaded to

Claude Design project `f6f3fb04-029d-4c53-81b9-fbb37e098efb`
(https://claude.ai/design/p/f6f3fb04-029d-4c53-81b9-fbb37e098efb). No `_ds_sync.json`
anchor, so the next sync re-verifies everything.
