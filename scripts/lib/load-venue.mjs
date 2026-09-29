/* Load src/content/venue (TypeScript) from Node scripts and tests.
 *
 *   const { venue, cleanup } = await loadVenue();
 *
 * `venue` is the whole module: VENUE, GAPS, totalForParty(), nightOf(), the
 * display helpers. Call `cleanup()` when done (tests do it in `after`). */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTs } from './load-ts.mjs';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function loadVenue({ root = REPO_ROOT } = {}) {
  const { module, cleanup } = await loadTs(join(root, 'src/content/venue/index.ts'), { root });
  return { venue: module, cleanup };
}
