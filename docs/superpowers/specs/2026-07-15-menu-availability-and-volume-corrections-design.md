# Menu Availability and Volume Corrections Design

**Date:** 2026-07-15

**Target:** The localized bar menu rendered by `src/components/pages/MenuPage.astro`

## Decision

Keep the existing menu architecture and two-column wine price table. Correct the inline menu data, make a wine's glass price optional, and render an em dash in the 150 ml column when that wine is available only by the 750 ml bottle.

This is a focused content and availability correction. It will not split the wine list into new sections, change unrelated prices, redesign the menu, or move the menu data into a new module.

## Required corrections

### Wine availability

Only these wines remain available both by the 150 ml glass and by the 750 ml bottle:

- Halka
- Triada

These wines become bottle-only while retaining their existing 750 ml prices and other metadata:

- Hibernal
- Solaris
- Chardonnay Barrique 2024
- Rege
- Pinot Noir
- Yacobus Orange
- Rosé

For every bottle-only wine, the desktop table keeps its aligned 150 ml column and displays `—` in that cell. The existing responsive table continues to label the unavailable serving as `150 ml —` and the bottle price as `750 ml <price>` on small screens.

### Bottle-service prices

- Ostoya Black, 700 ml: change `270 zł` to `289 zł`.
- Chivas Crystal, 700 ml: change `350 zł` to `379 zł`.

The corresponding 4 cl pour prices are outside this request and remain unchanged.

### Soft-drink volumes

Add `250 ml` to:

- Cappy
- Fuze Tea
- Red Bull
- 3 Cents

Add `1000 ml` to Karafka lemoniady. Names, descriptions, and prices remain unchanged.

## Data and rendering changes

`Wine.glassPrice` becomes optional. Halka and Triada keep their current `glassPrice` values; the other wine objects omit the field. The wine renderer preserves both price cells in every desktop row so the 750 ml prices remain aligned, substituting an em dash when `glassPrice` is absent.

The bottle-service and soft-drink corrections use the existing `price` and `vol` fields. No new component or translation key is required because prices and metric volumes are locale-invariant menu data.

## Verification

Regression coverage will lock the requested contract before production data is changed:

1. Exactly Halka and Triada have glass prices; all seven other wines are bottle-only.
2. Bottle-only wines render an unavailable marker in the 150 ml position without shifting their 750 ml price.
3. The corrected Ostoya Black and Chivas Crystal bottle prices appear in the built menu.
4. Cappy, Fuze Tea, Red Bull, 3 Cents, and Karafka lemoniady render with the requested volumes.
5. Existing menu compilation, type checks, unit tests, and the production build remain green.

The implementation will follow a red-green cycle: add a regression assertion that fails against the current menu, apply the minimal data/rendering changes, then run the focused check followed by the repository's full verification command.

## Repository boundaries

The checkout has been fast-forwarded to the current `origin/main`. The untracked `.claude/` directory is unrelated workspace metadata and will not be staged or modified. Only the design document, focused menu implementation, and its regression coverage are in scope.

## Success condition

The built localized menu clearly offers wine by the glass only for Halka and Triada, shows every other wine as bottle-only, and displays all requested bottle prices and drink volumes exactly as specified, with no unrelated menu or workspace changes.
