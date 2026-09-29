// HTML extraction for the contract suite. Pure: string in, plain object out.
// One parse5 pass per page collects everything the SEO, link and facts
// contracts need, so a page is parsed once per run.

import { parse } from 'parse5';

const SKIP_TEXT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head', 'title']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'br', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'ul', 'button', 'label', 'option', 'select', 'textarea',
]);
const LANDMARKS = new Set(['nav', 'header', 'footer', 'main', 'aside', 'dialog', 'form']);
const LINK_ATTRS = { a: 'href', link: 'href', img: 'src', script: 'src', source: 'src', iframe: 'src', form: 'action' };

const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const clean = (value) => String(value ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Collapse repeated keys: one value -> string, several -> sorted array. */
export function groupMeta(pairs) {
  const map = new Map();
  for (const [key, value] of pairs) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  }
  const out = {};
  for (const key of [...map.keys()].sort()) {
    const values = map.get(key);
    out[key] = values.length === 1 ? values[0] : [...values].sort();
  }
  return out;
}

/** Every object carrying an @type, walking @graph and nested nodes. */
function jsonLdNodes(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) jsonLdNodes(item, out);
  } else if (value && typeof value === 'object') {
    if (value['@type']) out.push(value);
    for (const child of Object.values(value)) jsonLdNodes(child, out);
  }
  return out;
}

/** Top-level nodes only: root objects and the members of a root @graph. */
function jsonLdRoots(value) {
  const roots = [];
  for (const item of Array.isArray(value) ? value : [value]) {
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item['@graph'])) roots.push(...item['@graph']);
    else roots.push(item);
  }
  return roots.filter((node) => node && typeof node === 'object');
}

function jsonStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) jsonStrings(item, out);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) jsonStrings(item, out);
  return out;
}

/** Summarise parsed JSON-LD blocks: type multiset, @id set, reserve targets. */
export function summariseJsonLd(blocks) {
  const types = [];
  const ids = new Set();
  const reserveTargets = [];
  const strings = [];
  for (const block of blocks) {
    for (const root of jsonLdRoots(block)) {
      const rootTypes = [].concat(root['@type'] ?? []);
      types.push(...rootTypes.map(String));
      if (root['@id'] && rootTypes.length) ids.add(String(root['@id']));
    }
    for (const node of jsonLdNodes(block)) {
      const template = node.urlTemplate;
      if (template) reserveTargets.push({ url: String(template), inLanguage: node.inLanguage });
    }
    strings.push(...jsonStrings(block));
  }
  return {
    types: types.sort(),
    ids: [...ids].sort(),
    reserveTargets,
    strings,
  };
}

/**
 * @param {string} html
 * @returns {object} extracted page model (see keys below)
 */
export function extractPage(html) {
  const document = parse(html);
  const page = {
    lang: undefined,
    title: undefined,
    description: undefined,
    canonical: undefined,
    robots: undefined,
    hreflang: {},
    og: {},
    twitter: {},
    jsonLdErrors: 0,
    links: [],
    ids: new Set(),
    h1: [],
    blocks: [],
    metaText: [],
    imgsWithoutAlt: 0,
    hasHero: false,
    article: null,
  };
  const ogPairs = [];
  const twitterPairs = [];
  const jsonBlocks = [];
  const hreflangs = [];
  let block = [];
  let ctaIndex = 0;

  const flush = () => {
    const text = clean(block.join(' '));
    block = [];
    if (text) page.blocks.push(text);
  };

  const textOf = (node) => {
    let out = '';
    for (const child of node.childNodes ?? []) {
      if (child.nodeName === '#text') out += child.value;
      else out += textOf(child);
    }
    return out;
  };

  /** Inspect the syndicated body (.ba-body) the article template renders with set:html. */
  const inspectBody = (root) => {
    const info = { tags: {}, eventAttrs: 0, styleAttrs: 0, jsHrefs: 0, imgs: [], headings: [], text: '' };
    const walk = (node) => {
      for (const child of node.childNodes ?? []) {
        if (child.nodeName === '#text') {
          info.text += child.value;
          continue;
        }
        if (!child.childNodes) continue;
        info.tags[child.nodeName] = (info.tags[child.nodeName] ?? 0) + 1;
        for (const a of child.attrs ?? []) {
          if (/^on/i.test(a.name)) info.eventAttrs += 1;
          if (a.name === 'style') info.styleAttrs += 1;
          if (/^\s*javascript:/i.test(a.value)) info.jsHrefs += 1;
        }
        if (child.nodeName === 'img') info.imgs.push({ src: attr(child, 'src'), alt: attr(child, 'alt') ?? null });
        if (/^h[1-6]$/.test(child.nodeName)) info.headings.push({ level: Number(child.nodeName[1]), text: clean(textOf(child)) });
        walk(child);
      }
    };
    walk(root);
    info.text = clean(info.text);
    return info;
  };

  const visit = (node, landmark, skip) => {
    const name = node.nodeName;
    if (name === '#text') {
      if (!skip) block.push(node.value);
      return;
    }
    if (!node.childNodes) return;

    const id = attr(node, 'id');
    if (id) page.ids.add(id);
    const cls = (attr(node, 'class') ?? '').split(/\s+/);
    if (cls.includes('ba-body')) page.article = { ...inspectBody(node), hasHero: false, faqItems: 0 };
    if (page.article && cls.includes('ba-faq-item')) page.article.faqItems += 1;
    if (cls.includes('ba-hero')) page.hasHero = true;
    if (name === 'a' && attr(node, 'name')) page.ids.add(attr(node, 'name'));

    let here = landmark;
    if (LANDMARKS.has(name)) here = name;

    if (name === 'html') page.lang = attr(node, 'lang');
    else if (name === 'title' && page.title === undefined) page.title = clean(textOf(node));
    else if (name === 'meta') {
      const metaName = attr(node, 'name');
      const property = attr(node, 'property');
      const content = attr(node, 'content');
      if (metaName === 'description') page.description = content;
      else if (metaName === 'robots') page.robots = content;
      else if (property?.startsWith('og:') || property?.startsWith('article:')) ogPairs.push([property, content ?? '']);
      else if (metaName?.startsWith('twitter:')) twitterPairs.push([metaName, content ?? '']);
    } else if (name === 'link') {
      const rel = (attr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
      if (rel.includes('canonical')) page.canonical = attr(node, 'href');
      if (rel.includes('alternate') && attr(node, 'hreflang')) {
        hreflangs.push([attr(node, 'hreflang'), attr(node, 'href')]);
      }
    } else if (name === 'script' && (attr(node, 'type') ?? '').toLowerCase() === 'application/ld+json') {
      try {
        jsonBlocks.push(JSON.parse(textOf(node)));
      } catch {
        page.jsonLdErrors += 1;
      }
    } else if (name === 'h1') {
      page.h1.push(clean(textOf(node)));
    } else if (name === 'img' && attr(node, 'alt') === undefined) {
      page.imgsWithoutAlt += 1;
    }

    const linkAttr = LINK_ATTRS[name];
    const target = linkAttr ? attr(node, linkAttr) : undefined;
    if (target !== undefined && !(name === 'link' && !attr(node, 'rel'))) {
      const entry = {
        tag: name,
        rel: attr(node, 'rel') ?? undefined,
        url: target,
        region: here ?? 'body',
        text: name === 'a' ? clean(textOf(node)).slice(0, 80) : undefined,
      };
      if (/^https?:\/\/(?:[^/]+\.)?emenago\.com(?:[/?#]|$)/i.test(target)) {
        entry.cta = true;
        entry.position = ++ctaIndex;
      }
      page.links.push(entry);
    }

    const isBlock = BLOCK.has(name);
    if (isBlock) flush();
    const skipHere = skip || SKIP_TEXT.has(name);
    for (const child of node.childNodes) visit(child, here, skipHere);
    if (isBlock) flush();
  };

  visit(document, undefined, false);
  flush();

  page.hreflang = Object.fromEntries(hreflangs.sort((a, b) => a[0].localeCompare(b[0])));
  page.og = groupMeta(ogPairs);
  page.twitter = groupMeta(twitterPairs);
  page.jsonLd = summariseJsonLd(jsonBlocks);
  page.metaText = [
    page.title,
    page.description,
    ...ogPairs.map(([, value]) => value),
    ...twitterPairs.map(([, value]) => value),
  ].filter(Boolean);
  return page;
}
