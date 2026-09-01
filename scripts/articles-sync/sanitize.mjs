// Pure HTML sanitiser for BabyLoveGrowth article bodies (no IO, fully unit
// testable). The vendor returns `content_html` authored by their generator; we
// commit it into the repo and render it with `set:html`, so it has to be
// reduced to a known-safe, balanced subset before it ever reaches dist/:
//
//   - executable / embedding markup is dropped with its content. The build's
//     CSP generator (scripts/generate-headers.mjs) throws on any unexpected
//     inline <script>, so an un-sanitised body would take the whole site build
//     down rather than just the article.
//   - every attribute is allow-listed per tag; `on*` handlers, inline styles
//     and `javascript:` URLs cannot survive.
//   - unknown-but-harmless wrappers (section, main, article...) are unwrapped so
//     their text still publishes.
//   - output is re-balanced: `set:html` splices the string straight into the
//     page, so an unclosed tag would break the surrounding layout.
//   - our own absolute URLs are normalised to the canonical www origin, which
//     the post-build check (scripts/check-build.mjs) requires site-wide.
//
// h1 is demoted to h2: the article page renders its own <h1> from the title.

/** Tags dropped together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  'applet', 'audio', 'base', 'button', 'canvas', 'embed', 'form', 'frame', 'frameset',
  'iframe', 'input', 'link', 'math', 'meta', 'noscript', 'object', 'option', 'portal',
  'script', 'select', 'style', 'svg', 'template', 'textarea', 'video',
]);

/** Tags whose content is raw text until the matching close tag. */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'template', 'svg', 'math', 'iframe', 'noscript']);

const VOID = new Set(['br', 'hr', 'img']);

/** tag -> attributes kept (after per-attribute validation below). */
const ALLOWED = new Map([
  ['p', []],
  ['br', []],
  ['hr', []],
  ['h2', []], ['h3', []], ['h4', []], ['h5', []], ['h6', []],
  ['strong', []], ['b', []], ['em', []], ['i', []], ['u', []], ['s', []],
  ['sub', []], ['sup', []], ['small', []], ['mark', []], ['span', []],
  ['blockquote', ['cite']],
  ['ul', []], ['ol', ['start']], ['li', []],
  ['dl', []], ['dt', []], ['dd', []],
  ['a', ['href', 'title']],
  ['img', ['src', 'alt', 'width', 'height']],
  ['figure', []], ['figcaption', []],
  ['table', []], ['thead', []], ['tbody', []], ['tfoot', []], ['caption', []],
  ['tr', []], ['th', ['colspan', 'rowspan', 'scope']], ['td', ['colspan', 'rowspan']],
  ['code', []], ['pre', []], ['time', ['datetime']],
]);

/** Elements that must not nest inside a <p> - the vendor sometimes emits them
    there and browsers would auto-close the paragraph, unbalancing our output. */
const CLOSES_PARAGRAPH = new Set([
  'p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'figure',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'pre', 'hr', 'dl', 'dt', 'dd',
]);

/** Tags whose closing tag HTML lets authors omit: opening one closes the
    previous sibling, but only within the same container (`stop`), so a nested
    list or table never closes its parent's item by mistake. */
const IMPLICIT_CLOSE = new Map([
  ['li', { siblings: ['li'], stop: ['ul', 'ol'] }],
  ['dt', { siblings: ['dt', 'dd'], stop: ['dl'] }],
  ['dd', { siblings: ['dt', 'dd'], stop: ['dl'] }],
  ['td', { siblings: ['td', 'th'], stop: ['table'] }],
  ['th', { siblings: ['td', 'th'], stop: ['table'] }],
  ['tr', { siblings: ['tr'], stop: ['table'] }],
  ['thead', { siblings: ['thead', 'tbody', 'tfoot'], stop: ['table'] }],
  ['tbody', { siblings: ['thead', 'tbody', 'tfoot'], stop: ['table'] }],
  ['tfoot', { siblings: ['thead', 'tbody', 'tfoot'], stop: ['table'] }],
  ['p', { siblings: ['p'], stop: ['li', 'td', 'th', 'blockquote', 'figure'] }],
]);

/** Block-ish tags that start a new line in the extracted plain text. */
const TEXT_BREAK = new Set([
  'p', 'li', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figcaption',
  'td', 'th', 'tr', 'dt', 'dd', 'pre',
]);

const SAFE_SCHEME = /^(?:https?:|mailto:|tel:)/i;
const UNSAFE_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** Control characters and spaces smuggled into a URL to hide its scheme. */
const URL_NOISE = /[\u0000-\u0020\u007f]/g;

const ENTITIES = new Map([
  ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"],
  ['nbsp', ' '], ['hellip', '…'], ['mdash', '—'], ['ndash', '–'],
  ['rsquo', '’'], ['lsquo', '‘'], ['rdquo', '”'], ['ldquo', '“'],
]);

/**
 * @param {string} source raw `content_html` from the API
 * @param {{ canonicalOrigin: string, bareHosts?: string[] }} options
 * @returns {{ html: string, text: string, warnings: string[] }}
 */
export function sanitizeArticleHtml(source, { canonicalOrigin, bareHosts = [] } = {}) {
  const input = typeof source === 'string' ? source : '';
  const canonicalHost = hostOf(canonicalOrigin);
  const bare = new Set(bareHosts.map((host) => host.toLowerCase()));
  const warnings = new Set();
  const out = [];
  const text = [];
  const open = [];
  let cursor = 0;

  const emitText = (value) => {
    if (!value) return;
    // The post-build gate forbids the bare origin anywhere in the rendered
    // HTML, including plain prose - an article that merely writes the URL out
    // would otherwise fail the whole build, not just itself.
    const normalized = normalizeBareOrigins(value, canonicalHost, bare);
    out.push(escapeText(normalized));
    text.push(decodeEntities(normalized));
  };
  const closeTo = (tag) => {
    const depth = open.lastIndexOf(tag);
    if (depth < 0) return;
    while (open.length > depth) out.push(`</${open.pop()}>`);
  };
  /** Close the nearest omitted-end-tag sibling, never crossing a container. */
  const closeImplied = (name) => {
    const rule = IMPLICIT_CLOSE.get(name);
    if (!rule) return;
    for (let depth = open.length - 1; depth >= 0; depth--) {
      if (rule.stop.includes(open[depth])) return;
      if (!rule.siblings.includes(open[depth])) continue;
      while (open.length > depth) out.push(`</${open.pop()}>`);
      return;
    }
  };

  while (cursor < input.length) {
    const lt = input.indexOf('<', cursor);
    if (lt < 0) {
      emitText(input.slice(cursor));
      break;
    }
    emitText(input.slice(cursor, lt));

    if (input.startsWith('<!--', lt)) {
      const end = input.indexOf('-->', lt + 4);
      cursor = end < 0 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith('<!', lt) || input.startsWith('<?', lt)) {
      const end = input.indexOf('>', lt + 2);
      cursor = end < 0 ? input.length : end + 1;
      continue;
    }

    const tag = readTag(input, lt);
    if (!tag) {
      // A stray "<" that does not start a tag: publish it as text.
      emitText('<');
      cursor = lt + 1;
      continue;
    }
    cursor = tag.end;

    if (tag.closing) {
      if (tag.name === 'h1') closeTo('h2');
      else if (ALLOWED.has(tag.name) && !VOID.has(tag.name)) closeTo(tag.name);
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag.name)) {
      warnings.add(`dropped <${tag.name}>`);
      if (!RAW_TEXT.has(tag.name) || tag.selfClosing) {
        cursor = tag.end;
        continue;
      }
      const raw = skipRawText(input, tag.end, tag.name);
      // An unterminated raw-text element would swallow the rest of the body.
      // Report it instead: the sync treats it as a bad row rather than
      // publishing a silently truncated article.
      if (raw === null) {
        warnings.add(`unterminated <${tag.name}>`);
        cursor = input.length;
        continue;
      }
      cursor = raw;
      continue;
    }

    const name = tag.name === 'h1' ? 'h2' : tag.name;
    if (!ALLOWED.has(name)) continue; // unknown wrapper: unwrap, keep its children

    if (CLOSES_PARAGRAPH.has(name)) closeImplied('p');
    closeImplied(name);

    const attrs = renderAttributes(name, tag.attributes, { canonicalHost, bare, warnings });
    if (name === 'img' && !attrs.includes('src=')) {
      warnings.add('dropped <img> without a usable src');
      continue;
    }
    // Keep the anchor text, drop a dead or unsafe link.
    if (name === 'a' && !attrs.includes('href=')) continue;

    if (VOID.has(name)) {
      out.push(`<${name}${attrs} />`);
      if (name === 'br') text.push(' ');
      continue;
    }
    out.push(`<${name}${attrs}>`);
    open.push(name);
    if (TEXT_BREAK.has(name)) text.push('\n');
  }

  while (open.length) out.push(`</${open.pop()}>`);

  return {
    html: collapseEmpty(out.join('')),
    text: text.join('').replace(/[^\S\n]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(),
    warnings: [...warnings],
  };
}

/** Drop the body's opening heading when it just repeats the article title: the
    page renders the title as its own <h1>, so keeping it would print the same
    line twice and start every card excerpt with the headline. */
export function dropLeadingTitle(body, title) {
  const key = titleKey(title);
  if (!key) return body;
  const match = /^<h([23])>([\s\S]*?)<\/h\1>/.exec(body.html);
  if (!match || titleKey(match[2].replace(/<[^>]*>/g, ' ')) !== key) return body;

  const lines = body.text.split('\n');
  return {
    ...body,
    html: body.html.slice(match[0].length).trim(),
    text: titleKey(lines[0]) === key ? lines.slice(1).join('\n').trim() : body.text,
  };
}

function titleKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Plain-text lead used for card excerpts and meta fallbacks. */
export function excerptFrom(text, max = 180) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1).trim();
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Reading time in whole minutes (>= 1), at the conventional 200 wpm. */
export function readingMinutes(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Anything executable still left in a sanitised body - the sync treats a hit
    as a bad row rather than trusting the sanitiser blindly. */
export function residualRisk(html) {
  // Scan tags and attributes only: article prose may legitimately mention
  // "javascript:" or an onclick handler while discussing code, and rejecting
  // the article for that would be a false positive.
  const markup = String(html).replace(/>[^<]*/g, '>');
  const found = [];
  if (/<\s*script\b/i.test(markup)) found.push('<script>');
  if (/\son[a-z]+\s*=/i.test(markup)) found.push('inline event handler');
  if (/javascript\s*:/i.test(markup)) found.push('javascript: URL');
  if (/<\s*iframe\b/i.test(markup)) found.push('<iframe>');
  if (/\sstyle\s*=/i.test(markup)) found.push('inline style');
  return found;
}

function readTag(input, start) {
  const closing = input[start + 1] === '/';
  const nameStart = start + (closing ? 2 : 1);
  const match = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(input.slice(nameStart, nameStart + 40));
  if (!match) return null;
  const name = match[0].toLowerCase();
  let cursor = nameStart + match[0].length;
  let quote;
  for (; cursor < input.length; cursor++) {
    const char = input[cursor];
    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '>') break;
  }
  if (cursor >= input.length) return null;
  const inner = input.slice(nameStart + match[0].length, cursor);
  const selfClosing = /\/\s*$/.test(inner);
  const raw = inner.replace(/\/\s*$/, '');
  return {
    name,
    closing,
    selfClosing,
    attributes: closing ? new Map() : parseAttributes(raw),
    end: cursor + 1,
  };
}

function parseAttributes(raw) {
  const attrs = new Map();
  const pattern = /([a-zA-Z_:@][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of raw.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (!attrs.has(name)) attrs.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function renderAttributes(tag, attrs, ctx) {
  const keep = [];
  for (const name of ALLOWED.get(tag) ?? []) {
    if (!attrs.has(name)) continue;
    const raw = decodeEntities(attrs.get(name)).trim();
    if (!raw) continue;

    if (name === 'href' || name === 'src') {
      const url = safeUrl(raw, name === 'src', ctx);
      if (!url) {
        ctx.warnings.add(`dropped unsafe ${tag}[${name}]`);
        continue;
      }
      keep.push([name, url]);
      continue;
    }
    if (['width', 'height', 'colspan', 'rowspan', 'start'].includes(name)) {
      if (!/^\d{1,4}$/.test(raw)) continue;
      keep.push([name, raw]);
      continue;
    }
    if (name === 'scope' && !['row', 'col', 'rowgroup', 'colgroup'].includes(raw)) continue;
    keep.push([name, raw.slice(0, 300)]);
  }

  if (tag === 'img') {
    if (!keep.some(([name]) => name === 'alt')) keep.push(['alt', '']);
    keep.push(['loading', 'lazy'], ['decoding', 'async']);
  }
  if (tag === 'a') {
    const href = keep.find(([name]) => name === 'href')?.[1] ?? '';
    if (isExternal(href, ctx)) keep.push(['rel', 'noopener'], ['target', '_blank']);
  }
  return keep.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');
}

function safeUrl(value, imageOnly, ctx) {
  const raw = value.replace(URL_NOISE, '').trim();
  if (!raw) return null;
  if (!UNSAFE_SCHEME.test(raw)) {
    // Relative or fragment URL. Protocol-relative is unsafe, and browsers
    // normalise a backslash in the authority position, so "/\\evil.com" and
    // "\\/evil.com" resolve off-site exactly like "//evil.com".
    if (/^[/\\]{2}/.test(raw)) return null;
    return raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('?') ? raw : null;
  }
  if (!SAFE_SCHEME.test(raw)) return null;
  if (imageOnly && !/^https:/i.test(raw)) return null;

  try {
    const url = new URL(raw);
    // The post-build check forbids the bare (non-www) origin anywhere in the
    // rendered HTML, so rewrite our own links onto the canonical host.
    if (ctx.bare.has(url.hostname.toLowerCase())) {
      url.hostname = ctx.canonicalHost;
      url.protocol = 'https:';
    }
    return url.href;
  } catch {
    return null;
  }
}

function isExternal(href, ctx) {
  if (!/^https?:/i.test(href)) return false;
  try {
    return new URL(href).hostname.toLowerCase() !== ctx.canonicalHost;
  } catch {
    return false;
  }
}

/** End offset just past the matching close tag, or null when there is none. */
function skipRawText(input, from, tag) {
  const close = new RegExp(`<\\s*/\\s*${tag}\\s*>`, 'i');
  const match = close.exec(input.slice(from));
  return match ? from + match.index + match[0].length : null;
}

/** Drop wrappers left empty by sanitising (e.g. a <p> that only held a script). */
function collapseEmpty(html) {
  let out = html;
  for (let pass = 0; pass < 3; pass++) {
    const next = out.replace(/<(p|span|figure|blockquote|li)>\s*<\/\1>/g, '');
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

/** Rewrite http(s)://<bare-host> occurrences onto the canonical www host. */
function normalizeBareOrigins(value, canonicalHost, bareHosts) {
  let out = value;
  for (const host of bareHosts) {
    const pattern = new RegExp(`https?://${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[/?#\\s"']|$)`, 'gi');
    out = out.replace(pattern, `https://${canonicalHost}`);
  }
  return out;
}

function hostOf(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return String(origin || '').toLowerCase();
  }
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#(\d{1,7});/g, (_, code) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, code) => safeCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES.get(name.toLowerCase()) ?? whole);
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function escapeText(value) {
  // Entities already in the source stay as authored; a bare & becomes &amp;.
  return value
    .replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
