# SISI Wrocław — design system

A dark, warm venue brand: **deep-wine surfaces, warm-cream ink, one gold accent**. This is a **CSS-class + design-token** system (not a props/theme library and not Tailwind). You build UI by writing the real class names below on plain HTML/JSX; every class and token is defined in the styles closure and renders on-brand with no extra setup.

## Setup — the one thing that matters
Load the styles closure (`styles.css`). That's the whole setup: no provider, no theme wrapper, no JS. The `@import` closure pulls in `global.css` (tokens, base, buttons, typography, nav, footer, cards) and `components.css` (select, stepper, event/case cards), plus both fonts (Cal Sans + Montserrat, with Polish glyphs). The page `<body>` automatically gets `background: var(--bg)`, `color: var(--text)`, and Montserrat — so start from a dark wine canvas, not white.

## The class vocabulary (use these real names)

| Concern | Classes |
|---|---|
| Buttons | `.btn-cta` (primary, cream fill) · `.btn-outline` (secondary, wine + cream border) · modifiers: `.cookie-btn` (smaller), `.mobile-cta` (wine variant on overlays) |
| Cards / surfaces | `.sisi-card` (generic glass panel, static) · `.ev-card` (event tile, clickable; `+ .past` = archived) · `.case-card` (B2B reference, on `.sisi-card`) |
| Typography | `.display` (Cal Sans face) · `.page-title` · `.page-label` (eyebrow) · `.page-subtitle` · `.menu-section-label` (gold) |
| Layout | `.container` (max-width `--maxw`, centered) · `.page-header` · `.page-divider` |
| Nav / footer | `.nav-links` · `.nav-cta` · `.nav-social` · `.social-icon` · `.footer-grid` · `.footer-col-heading` · `.footer-link` |
| Menu | `.menu-item` · `.menu-item-name` · `.menu-item-price` · `.menu-section-label` |
| Forms | `.cselect` / `.cselect-btn` / `.cselect-list` / `.cselect-option` (themed select) · `.b2b-stepper` / `.b2b-stepper-btn` / `.b2b-stepper-input` |

Headings are almost always **UPPERCASE** in the display face — that's the signature look.

## Tokens — always `var(--token)`, never a raw hex
Surfaces: `--bg` `#27060f`, `--panel` `#34101a`, `--panel-2` `#3d1320`.
Cream ink/fills: `--cream`, `--cream-hover`, `--cream-press`, `--cream-active`.
Accent: `--gold` `#fbd295` (prices, hover accents — sparingly).
Text scale (cream at opacity): `--text`, `--text-dim`, `--text-faint`, `--text-mute`; borders `--line`.
Layout: `--maxw` `1280px`, `--nav-height`; display font `--font-display` (Cal Sans).

## Where the truth lives
Read these before styling: `styles.css` → `global.css` + `components.css` (the full class + token source), `tokens/tokens.css` (token reference), and each component's `components/<group>/<Name>/<Name>.prompt.md` for exact markup and variants.

## One idiomatic example
```jsx
<header className="page-header">
  <span className="page-label">Wydarzenia</span>
  <h1 className="page-title">SISI Wrocław</h1>
  <p className="page-subtitle">Kameralna scena i kuchnia w sercu Wrocławia.</p>
  <div style={{ display: "flex", gap: 18, marginTop: 24 }}>
    <a className="btn-cta" href="/rezerwacja">Zarezerwuj stolik</a>
    <a className="btn-outline" href="/wydarzenia">Zobacz kalendarz</a>
  </div>
</header>
```

## Don't
- Don't start on a white background or hard-code colors — use the wine canvas and `var(--*)` tokens.
- Don't invent class names; compose the ones above. For a new static panel, reuse `.sisi-card`.
- Don't set body copy in the display face; Cal Sans is for headings/labels only.
