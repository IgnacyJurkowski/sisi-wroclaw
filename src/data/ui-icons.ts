// Shared 24 × 24 stroke glyphs. Renderers supply colour, stroke width and rounded
// caps/joins. Utensils and headset are verified Lucide paths (ISC; see
// /licenses/lucide.txt). Leaf retains our complete Lucide-derived menu glyph;
// the remaining silhouettes are bespoke SiSi hospitality icons.
export const UI_ICONS = {
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  headset: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  champagne: '<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3Z"/><path d="M12 14v7m-4 0h8"/>',
  platter: '<circle cx="12" cy="4" r="2"/><path d="M12 6v16m-4 0h8"/><path d="M6 9h12l-1 2H7L6 9Zm-3 6h18l-1 2H4l-1-2Z"/>',
  knife: '<path d="M17 2v12H7c0-5 4-10 10-12Z"/><path d="M13 14v6a2 2 0 0 0 4 0v-6"/>',
  shell: '<path d="M12 3c1.5-1 3.5-.5 4 1 2-.5 4 1 4 3 2 1 2 3 1 5l-6 8H9l-6-8c-1-2-1-4 1-5 0-2 2-3.5 4-3 .5-1.5 2.5-2 4-1Z"/><path d="m7 9 3 8m2-11v11m5-8-3 8"/>',
  agave: '<path d="M12 21C7 21 3 17 2 12l6 4L5 5l5 7 2-10 2 10 5-7-3 11 6-4c-1 5-5 9-10 9Z"/><path d="M12 12v9"/>',
  whisky: '<path d="M4 6h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6Z"/><path d="M5 14h14m-11-5 4-1 1 4-4 1-1-4Z"/>',
} as const;
