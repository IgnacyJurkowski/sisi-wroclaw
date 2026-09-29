// SEO snapshot entries and the "same or better" diff.
//
// "Better" is deliberately narrow. A change passes without a snapshot update
// only when it is one of:
//   - a field that was absent is now present (title, description, canonical,
//     lang, og:*, twitter:*, a JSON-LD type or @id, a sitemap alternate);
//   - a hreflang alternate was ADDED (never removed, never re-pointed);
//   - a meta description changed to text whose length is strictly closer to
//     the 70-160 character band (see descDistance).
// Everything else that differs, and anything removed, is a failure. Intentional
// changes are recorded by re-running with --update-snapshot in a reviewed commit.

export const DESC_MIN = 70;
export const DESC_MAX = 160;

/** Characters outside the 70-160 band; 0 means inside it. */
export function descDistance(text) {
  const n = [...String(text ?? '')].length;
  if (n < DESC_MIN) return DESC_MIN - n;
  if (n > DESC_MAX) return n - DESC_MAX;
  return 0;
}

/** Page kind from its URL path: article pages carry vendor-authored text. */
export function kindOf(path) {
  const parts = path.split('/').filter(Boolean);
  if (path === '/404.html' || path === '/') return 'utility';
  if (parts.length === 3) return parts[1] === 'blog' ? 'article' : 'event';
  return 'page';
}

/** Text fields that syndicated or synced content may rewrite without notice. */
const MUTABLE_KINDS = new Set(['article', 'event']);
const MUTABLE_FIELDS = new Set([
  'title', 'description', 'og:title', 'og:description', 'og:image', 'og:image:alt',
  'twitter:title', 'twitter:description', 'twitter:image', 'og:image:width', 'og:image:height',
  'article:published_time', 'article:modified_time',
]);

/**
 * @param {object} page extractPage() result
 * @param {{ path: string, inSitemap: boolean, indexable: boolean, sitemapAlternates?: object }} ctx
 */
export function buildSeoEntry(page, { path, inSitemap, indexable, sitemapAlternates }) {
  return {
    kind: kindOf(path),
    inSitemap,
    indexable,
    lang: page.lang ?? null,
    title: page.title ?? null,
    description: page.description ?? null,
    canonical: page.canonical ?? null,
    robots: page.robots ?? null,
    hreflang: { ...page.hreflang },
    og: { ...page.og },
    twitter: { ...page.twitter },
    jsonld: { types: [...page.jsonLd.types], ids: [...page.jsonLd.ids] },
    sitemapAlternates: sitemapAlternates ? { ...sitemapAlternates } : null,
  };
}

const asList = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const present = (value) => value !== null && value !== undefined && value !== '';

function multisetMissing(oldList, newList) {
  const counts = new Map();
  for (const item of newList) counts.set(item, (counts.get(item) ?? 0) + 1);
  const missing = [];
  for (const item of oldList) {
    if ((counts.get(item) ?? 0) > 0) counts.set(item, counts.get(item) - 1);
    else missing.push(item);
  }
  return missing;
}

/**
 * Compare a stored entry with the current one.
 * @param {object} old snapshot entry
 * @param {object} cur current entry (same shape)
 * @param {{ robotsComparable?: boolean }} [options]
 * @returns {{ failures: {field:string,message:string}[], improvements: {field:string,message:string}[] }}
 */
export function diffSeoEntry(old, cur, { robotsComparable = true } = {}) {
  const failures = [];
  const improvements = [];
  const fail = (field, message) => failures.push({ field, message });
  const better = (field, message) => improvements.push({ field, message });
  const mutable = MUTABLE_KINDS.has(old.kind);

  const scalar = (field, before, after) => {
    if (before === after) return;
    if (!present(before)) return present(after) ? better(field, `added: ${clip(after)}`) : undefined;
    if (!present(after)) return fail(field, `removed (was ${clip(before)})`);
    if (mutable && MUTABLE_FIELDS.has(field)) return; // present on both sides is all we require
    fail(field, `changed ${clip(before)} -> ${clip(after)}`);
  };

  scalar('lang', old.lang, cur.lang);
  scalar('title', old.title, cur.title);
  scalar('canonical', old.canonical, cur.canonical);
  if (robotsComparable) scalar('robots', old.robots, cur.robots);

  // Description: unchanged, added, or strictly closer to the 70-160 band.
  if (old.description !== cur.description) {
    if (!present(old.description) && present(cur.description)) better('description', `added: ${clip(cur.description)}`);
    else if (!present(cur.description)) fail('description', `removed (was ${clip(old.description)})`);
    else if (mutable) {
      // vendor-authored: presence is enough
    } else if (descDistance(cur.description) < descDistance(old.description)) {
      better('description', `length ${[...old.description].length} -> ${[...cur.description].length} moves toward ${DESC_MIN}-${DESC_MAX}`);
    } else {
      fail('description', `changed ${clip(old.description)} -> ${clip(cur.description)}`);
    }
  }

  // hreflang: every stored alternate stays, same href; new ones are welcome.
  for (const [lang, href] of Object.entries(old.hreflang ?? {})) {
    const now = cur.hreflang?.[lang];
    if (!now) fail(`hreflang[${lang}]`, `removed (was ${href})`);
    else if (now !== href) fail(`hreflang[${lang}]`, `changed ${href} -> ${now}`);
  }
  for (const lang of Object.keys(cur.hreflang ?? {})) {
    if (!(lang in (old.hreflang ?? {}))) better(`hreflang[${lang}]`, `added ${cur.hreflang[lang]}`);
  }

  // og:* and twitter:* maps.
  for (const group of ['og', 'twitter']) {
    const before = old[group] ?? {};
    const after = cur[group] ?? {};
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        fail(key, `removed (was ${clip(before[key])})`);
        continue;
      }
      const a = JSON.stringify(asList(before[key]));
      const b = JSON.stringify(asList(after[key]));
      if (a === b) continue;
      if (mutable && MUTABLE_FIELDS.has(key)) continue;
      fail(key, `changed ${clip(before[key])} -> ${clip(after[key])}`);
    }
    for (const key of Object.keys(after)) if (!(key in before)) better(key, `added ${clip(after[key])}`);
  }

  // JSON-LD: types as a multiset, @id as a set. Additions only.
  const lostTypes = multisetMissing(old.jsonld?.types ?? [], cur.jsonld?.types ?? []);
  if (lostTypes.length) fail('jsonld.types', `missing ${lostTypes.join(', ')}`);
  const newTypes = multisetMissing(cur.jsonld?.types ?? [], old.jsonld?.types ?? []);
  if (newTypes.length) better('jsonld.types', `added ${newTypes.join(', ')}`);
  const lostIds = (old.jsonld?.ids ?? []).filter((id) => !(cur.jsonld?.ids ?? []).includes(id));
  if (lostIds.length) fail('jsonld.ids', `missing ${lostIds.join(', ')}`);
  const newIds = (cur.jsonld?.ids ?? []).filter((id) => !(old.jsonld?.ids ?? []).includes(id));
  if (newIds.length) better('jsonld.ids', `added ${newIds.join(', ')}`);

  // Sitemap alternates follow the same rule as hreflang.
  if (old.sitemapAlternates) {
    for (const [lang, href] of Object.entries(old.sitemapAlternates)) {
      const now = cur.sitemapAlternates?.[lang];
      if (!now) fail(`sitemap.alternate[${lang}]`, `removed (was ${href})`);
      else if (now !== href) fail(`sitemap.alternate[${lang}]`, `changed ${href} -> ${now}`);
    }
    for (const lang of Object.keys(cur.sitemapAlternates ?? {})) {
      if (!(lang in old.sitemapAlternates)) better(`sitemap.alternate[${lang}]`, `added ${cur.sitemapAlternates[lang]}`);
    }
  } else if (cur.sitemapAlternates && old.inSitemap === false) {
    better('sitemap', 'page joined the sitemap');
  }
  if (old.inSitemap && !cur.inSitemap) fail('sitemap', 'page left the sitemap');

  return { failures, improvements };
}

function clip(value, max = 90) {
  const text = Array.isArray(value) ? value.join(' | ') : String(value);
  return JSON.stringify(text.length > max ? `${text.slice(0, max - 1)}…` : text);
}
