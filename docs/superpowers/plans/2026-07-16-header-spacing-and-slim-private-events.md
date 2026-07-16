# Desktop Header Spacing and Slim Private Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore comfortable desktop navigation spacing and reduce the private-events page to the approved consumer journey without adding claims, placeholders, or unverified production content.

**Architecture:** Keep the shared site header and existing private-event components, but tighten their composition contracts in the rendered-output gate. The private page will compose only its hero, occasion cards, individual-pricing note, and Netlify enquiry form. Shared B2B components and the corporate page remain untouched.

**Tech Stack:** Astro 7, TypeScript, CSS, Netlify Forms, Node 22.12.0, existing `scripts/check-build.mjs` rendered-output verification, Playwright browser audit.

## Global Constraints

- Work only in the isolated `agent/header-private-slim` worktree.
- Preserve the corporate page and all shared B2B components/translations.
- Do not add claims, placeholder content, new form destinations, or fake form submissions.
- Keep the private form's Netlify identity and hidden metadata fields intact.
- Keep the production notification for any form routed to `rzeznicza32@gmail.com`.
- Run Node-based project commands through Node 22.12.0.
- Make every production change only after its new regression check has failed for the expected reason.

---

## Task 1: Encode and implement the desktop header spacing contract

**Files:**

- Modify: `scripts/check-build.mjs`
- Modify: `src/styles/global.css`

- [ ] Add a source-contract block to `scripts/check-build.mjs` that reads `src/styles/global.css` and asserts all of the following exact rules:

  ```js
  const globalCssSource = readFileSync(join(ROOT, 'src/styles/global.css'), 'utf8');
  assert('desktop nav uses the approved 1120px width', globalCssSource.includes('width: min(1120px, calc(100vw - 2rem));'));
  assert('desktop nav separates its center and right clusters by 40px', globalCssSource.includes('display: flex; align-items: center; gap: 40px;'));
  assert('desktop nav separates links by 32px', globalCssSource.includes('.nav-links { display: flex; align-items: center; gap: 32px; }'));
  assert('compact navigation begins at 1100px', globalCssSource.includes('@media (max-width: 1100px) {'));
  assert('compact navigation no longer waits until 860px', !globalCssSource.includes('@media (max-width: 860px) {'));
  assert('mobile reservation CTA dimensions stay unchanged', globalCssSource.includes('.nav-cta { padding: 8px 13px; font-size: 10px; letter-spacing: 0.05em; }'));
  ```

- [ ] Run the existing built-output gate against the current tree and confirm RED only because the five new desktop rules still have the old `980px`, `28px`/`26px`, and `860px` values:

  ```bash
  npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
  ```

- [ ] In `src/styles/global.css`, change only the approved desktop values:

  ```css
  #main-nav {
    width: min(1120px, calc(100vw - 2rem));
    display: flex; align-items: center; gap: 40px;
  }

  .nav-center { display: flex; align-items: center; gap: 40px; flex-shrink: 0; }
  .nav-links { display: flex; align-items: center; gap: 32px; }
  ```

  Rename only the existing compact-navigation selector from `@media (max-width: 860px)` to `@media (max-width: 1100px)`; do not alter any rule inside that block.

- [ ] Rerun a build and the rendered-output gate and confirm the header assertions are GREEN:

  ```bash
  npx --yes --package node@22.12.0 -- npm run build:check
  ```

---

## Task 2: Encode the slimmer private-events journey

**Files:**

- Modify: `scripts/check-build.mjs`

- [ ] Replace the private FAQ assertion with a per-locale composition assertion requiring exactly this order:

  ```text
  class="private-hero"
  class="private-occasions"
  class="private-pricing"
  id="private-enquiry"
  ```

  The same check must reject `class="b2b-facts"`, `class="b2b-included"`, `id="private-spaces"`, `class="b2b-process"`, `class="private-faq"`, `"@type":"FAQPage"`, and `href="#private-spaces"` on every localized private-events page.

- [ ] Update the approved Polish form-intro assertion to:

  ```text
  Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję.
  ```

- [ ] Remove the private-page capacity assertion because those shared venue-fact sections are intentionally no longer rendered. Keep the individual-pricing guard unchanged.

- [ ] Make the private form field assertion exact by collecting `name` values only from `input`, `select`, and `textarea` tags, and compare them with this ordered list:

  ```js
  [
    'form-name', 'subject', 'locale', 'page', 'utm', 'bot-field', 'name', 'email', 'phone',
    'occasion', 'guests', 'preferred_date', 'preferred_date_iso', 'message', 'consent',
  ]
  ```

  Continue asserting the existing required fields, Netlify attributes, honeypot, contact fallback, and absence of `company` and `date_flexible`.

- [ ] Add exact per-locale assertions for the approved shorter form intro:

  ```js
  const PRIVATE_FORM_INTROS = {
    pl: 'Podaj planowany termin, liczbę gości i rodzaj okazji. Zespół przygotuje indywidualną propozycję.',
    en: 'Share your preferred date, guest count and occasion. Our team will prepare a tailored proposal.',
    de: 'Nenne uns deinen Wunschtermin, die Gästezahl und den Anlass. Unser Team erstellt ein individuelles Angebot.',
    it: 'Indicaci la data prevista, il numero di ospiti e l\'occasione. Il nostro team preparerà una proposta personalizzata.',
    cs: 'Uveďte plánovaný termín, počet hostů a typ příležitosti. Náš tým připraví individuální nabídku.',
  };
  ```

- [ ] Run the current built-output gate and confirm RED because the old broad sections, FAQ/schema, secondary CTA, `space`/`duration` fields, and old intro are still rendered:

  ```bash
  npx --yes --package node@22.12.0 -- node scripts/check-build.mjs
  ```

---

## Task 3: Implement the approved private-events reduction

**Files:**

- Modify: `src/components/pages/PrivateEventsPage.astro`
- Modify: `src/components/private-events/PrivateEventsHero.astro`
- Modify: `src/components/private-events/PrivateEventsEnquiryForm.astro`
- Delete: `src/components/private-events/PrivateEventsFAQ.astro`
- Modify: `src/i18n/ui/pl.ts`
- Modify: `src/i18n/ui/en.ts`
- Modify: `src/i18n/ui/de.ts`
- Modify: `src/i18n/ui/it.ts`
- Modify: `src/i18n/ui/cs.ts`

- [ ] In `PrivateEventsPage.astro`, remove the `VenueFacts`, `Included`, `SpacesSection`, `EventProcess`, and `PrivateEventsFAQ` imports and renders. Remove `faqSchema` and pass only `privateEventsServiceSchema(locale)` and `breadcrumb` to `Base`. Retain this exact component order:

  ```astro
  <PrivateEventsHero locale={locale} />
  <PrivateOccasions locale={locale} />
  <PrivatePricing locale={locale} />
  <PrivateEventsEnquiryForm locale={locale} />
  ```

- [ ] In `PrivateEventsHero.astro`, delete only the secondary `#private-spaces` CTA. Keep the primary enquiry CTA and verified phone/email contacts.

- [ ] In `PrivateEventsEnquiryForm.astro`, delete `spaceKeys`, the optional space `CustomSelect`, and the optional duration input. Keep every approved field, required-field declaration, hidden metadata field, Netlify attribute, and fallback contact unchanged.

- [ ] Delete `PrivateEventsFAQ.astro`, which no page will import after the composition change.

- [ ] In each locale's `privateEvents` object, remove only `hero.ctaSecondary` and `faq`. Replace `form.intro` with the exact localized sentence from `PRIVATE_FORM_INTROS`. Leave the shared `b2b` objects untouched.

- [ ] Build and run the rendered-output gate, confirming all new private-page and form assertions are GREEN:

  ```bash
  npx --yes --package node@22.12.0 -- npm run build:check
  ```

---

## Task 4: Verify the production candidate

**Files:**

- Verify only; no planned production-file changes.

- [ ] Run the complete release gate under the supported Node version:

  ```bash
  npx --yes --package node@22.12.0 -- npm run verify:release
  ```

- [ ] Start the built-site preview and run the existing browser audit:

  ```bash
  npx --yes --package node@22.12.0 -- npm run preview:ci
  npx --yes --package node@22.12.0 -- npm run audit:browser
  ```

- [ ] Inspect the Polish page in a real browser at desktop and compact widths and verify:

  - at 1440px, the bar is 1120px wide and the reservation CTA has 40px separation on both sides;
  - at 1101px, the full desktop navigation is visible without horizontal overlap;
  - at 1100px and 1024px, the compact navigation is active and the reservation CTA remains visible;
  - at mobile width, the reservation CTA retains its existing dimensions;
  - `/pl/imprezy-prywatne/` visibly follows hero → occasions → pricing → form and has no secondary spaces CTA.

- [ ] Compare the rendered corporate page before/after contracts and confirm its broad sections and `b2b-enquiry` form fields are unchanged.

- [ ] Confirm the repository diff contains no new claims/placeholders and no unrelated files.

---

## Task 5: Publish through the protected main workflow

**Files:**

- Git/GitHub/Netlify state only.

- [ ] Commit the verified implementation intentionally, push `agent/header-private-slim`, and open a pull request to `main` describing the exact header and private-page reduction.

- [ ] Wait for every required GitHub check on the pull-request head SHA. If a check fails, inspect its actual log and fix only the demonstrated regression.

- [ ] Squash-merge the pull request into `main` after all required checks pass.

- [ ] Verify the Netlify production deploy is ready for the exact merge SHA, both `private-enquiry` and `b2b-enquiry` remain detected, and the existing any-form email notification still targets `rzeznicza32@gmail.com`. Do not send a fake production enquiry.

- [ ] Read back the live desktop header and `/pl/imprezy-prywatne/` page, then report the merge SHA and production verification evidence.
