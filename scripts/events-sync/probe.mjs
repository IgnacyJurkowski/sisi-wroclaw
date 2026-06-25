// Dev probe: confirm the service account can read the Wydarzenia folder and that
// the Doc export round-trips through parseOpisy. Run:
//   GOOGLE_APPLICATION_CREDENTIALS=<sa.json> node scripts/events-sync/probe.mjs
// Not part of the sync or the test suite.

import { getAccessToken, listFolder, exportDocText } from './drive.mjs';
import { parseOpisy } from './parse.mjs';

const WYDARZENIA = '1KFophtNpm-R-9inZcMuGlnJOiZNYzsJd';

const token = await getAccessToken();
const top = await listFolder(token, WYDARZENIA);
console.log('Wydarzenia ->', top.map((f) => f.name).join(', '));

const banery = top.find((f) => /banery/i.test(f.name));
const opisy = top.find((f) => /opisy/i.test(f.name));
const [banners, docs] = await Promise.all([
  listFolder(token, banery.id),
  listFolder(token, opisy.id),
]);
console.log('Banery ->', banners.map((f) => f.name).join(', '));
console.log('Opisy  ->', docs.map((f) => `${f.name} [${f.mimeType}]`).join(', '));

const doc = docs[0];
const text = await exportDocText(token, doc.id);
console.log(`\n--- exported text of "${doc.name}" ---\n${text}`);
console.log('\n--- parseOpisy ->', JSON.stringify(parseOpisy(text), null, 2));
