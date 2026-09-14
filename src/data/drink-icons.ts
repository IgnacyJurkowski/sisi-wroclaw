import { UI_ICONS } from './ui-icons';

// SiSi drinks use one ink and transparent interiors. A pour line, ice cube or
// bubbles give the familiar silhouettes a little character without ornament.
const outline = (shapes: string) => `<g fill="none" stroke="currentColor">${shapes}</g>`;

export const DRINK_ICONS = {
  martini: outline('<path d="M4 5h16l-8 10L4 5Zm8 10v6m-4 0h8"/><path d="M7.2 9h9.6"/>'),
  glass: outline('<path d="M6 5h12l-1 15H7L6 5Z"/><path d="M6.6 13c3-1 7 1 10.8 0"/><path d="m9 8 3-.5.5 3-3 .5L9 8Z"/>'),
  beer: outline('<path d="M5 8v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8m0 2h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M5 8a2.5 2.5 0 1 1 1-4.8 3 3 0 0 1 5.2-.2 2.5 2.5 0 0 1 4.2.2A2.5 2.5 0 1 1 17 9c-2 0-2-1-4-1s-2 1-4 1-2-1-4-1Z"/><path d="M9 12v5m4-5v5"/>'),
  wine: outline('<path d="M8 3h8c1 3 2 5 2 7a6 6 0 0 1-12 0c0-2 1-4 2-7Z"/><path d="M12 16v5m-4 0h8"/><path d="M6 10c4-2 8 2 12 0"/>'),
  champagne: outline('<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3Z"/><path d="M12 14v7m-4 0h8"/><circle cx="11" cy="6" r=".6" fill="currentColor" stroke="none"/><circle cx="13" cy="9.5" r=".7" fill="currentColor" stroke="none"/>'),
  bottle: outline('<path d="M10 2h4v4l1.4 2.3a4 4 0 0 1 .6 2.1V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9.6a4 4 0 0 1 .6-2.1L10 6V2Z"/><path d="M10 5h4m-6 8h8m-8 5h8"/>'),
  whisky: outline('<path d="M4 6h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6Z"/><path d="M5 14h14"/><path d="m8 9 4-1 1 4-4 1-1-4Z"/>'),
  // Keep the established alcohol-free symbol and the public category key.
  leaf: outline(UI_ICONS.leaf),
  sprig: outline('<path d="M12 21V9"/><path d="M12 11c-4 0-6-2-6-5 3 .2 5 2 6 5Zm0-2c-1-3 0-5 3-6 1 3 0 5-3 6Z"/><circle cx="9.5" cy="15.5" r="2.5"/><circle cx="14.5" cy="17.5" r="2.5"/>'),
  barrel: outline('<path d="M7 4h10c2 5 2 11 0 16H7c-2-5-2-11 0-16Z"/><path d="M5.6 8h12.8m-12.8 8h12.8"/><path d="M10 5c-1 4-1 10 0 14m4-14c1 4 1 10 0 14"/>'),
  agave: outline('<path d="M12 21C7 21 3 17 2 12l6 4L5 5l5 7 2-10 2 10 5-7-3 11 6-4c-1 5-5 9-10 9Z"/><path d="M12 12v9"/>'),
  grape: outline('<path d="M12 6V3m0 1c2-2 4-2 6-1-1 2-3 3-6 1Z"/><circle cx="6.5" cy="8.5" r="2.7"/><circle cx="12" cy="8.5" r="2.7"/><circle cx="17.5" cy="8.5" r="2.7"/><circle cx="9.25" cy="13.5" r="2.7"/><circle cx="14.75" cy="13.5" r="2.7"/><circle cx="12" cy="18.5" r="2.7"/>'),
  droplet: outline('<path d="M12 21a7 7 0 0 0 7-7c0-2-1-3.5-3-5s-3.5-4-4-6.5C11.5 5 10 7.5 8 9s-3 3-3 5a7 7 0 0 0 7 7Z"/><path d="M8 14a4 4 0 0 0 4 4"/>'),
  coupe: outline('<path d="M4 6h16l-3 5a5 5 0 0 1-10 0L4 6Z"/><path d="M12 16v5m-4 0h8"/><path d="M5.8 9h12.4"/>'),
} as const;
