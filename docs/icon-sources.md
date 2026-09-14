# Icon sources

The site uses outline pictograms on a 24 × 24 grid, with rounded caps and joins.
Display size and stroke weight remain optical choices for the surrounding UI:
menu categories use 1.5, smaller food illustrations 1.4, and compact form controls
have their own weights. Brand logos keep their official filled silhouettes.

`src/data/ui-icons.ts` shares repaired geometry between the homepage, full menu
and event pages. Menu data and prices are independent of these shapes.

- Utensils and headset: exact Lucide paths verified on 2026-09-14 from
  <https://github.com/lucide-icons/lucide/tree/main/icons>.
  License: `public/licenses/lucide.txt`.
- Leaf: the existing full leaf geometry already used by the food menu.
- Champagne flute, serving stand, knife, bivalve shell, agave and whisky glass:
  custom SiSi pictograms on the same grid.
- Tripadvisor: canonical Simple Icons path, verified on 2026-09-14 from
  <https://github.com/simple-icons/simple-icons/blob/develop/icons/tripadvisor.svg>.
  License: `public/licenses/simple-icons.txt`.

The untouched Instagram and Facebook paths remain Simple Icons brand glyphs.
SiSi's own wordmark and locale flags retain their existing artwork.

## Food and drink illustrations

`src/data/food-icons.ts` and `src/data/drink-icons.ts` contain bespoke SiSi
illustrations on the same 24 × 24 grid. Each icon uses one ink (`currentColor`)
with transparent interiors. Food uses burgundy at 27px; drinks use gold at
24px in the full menu and 28px on the homepage. The shapes retain a small
amount of internal texture, with detached garnish, drips and decorative
plate outlines removed.

The illustrations identify dishes and drink categories. Dietary and
spicy badges retain their existing symbols and accessible labels, using the
same burgundy ink as the food illustrations.
Menu names, translations, ingredients, portions and prices are unchanged.
