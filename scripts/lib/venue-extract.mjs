/* Pure text extraction for the venue inventory probe (no IO, no venue data).
 *
 *   htmlToSurface(html)         page -> regions of visible text, meta, JSON-LD, links
 *   splitSentences(line)        one text block -> sentences
 *   extractFacts(sentence)      -> money, time, phone, email, address, capacity, brand
 *   ruleHits(text)              which reservation rules a block of text states
 *   parseMenuPage(html)         the menu page -> rows as printed
 *
 * The probe compares what these functions find with src/content/venue.
 */

// ---------------------------------------------------------------------------
// HTML -> text
// ---------------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—' };

export function decodeEntities(text) {
  return String(text).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export const stripTags = (html) => decodeEntities(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const BREAK_TAGS = 'p|div|li|ul|ol|h[1-6]|section|article|header|footer|nav|main|tr|td|th|dt|dd|figcaption|blockquote|table|button|summary|details|label';

function blocksOf(html, { spansBreak }) {
  let text = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template|svg|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(new RegExp(`<\\/?(?:${BREAK_TAGS}${spansBreak ? '|span' : ''})\\b[^>]*>`, 'gi'), '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function regionHtml(html, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi');
  for (const match of html.matchAll(re)) out.push(match[0]);
  return out.join('\n');
}

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return match ? decodeEntities(match[2] ?? match[3]) : undefined;
};

/**
 * @returns {{ lang: string|undefined, title: string, meta: Record<string,string>,
 *   regions: { main: string[], footer: string[], nav: string[] },
 *   jsonld: object[], links: { href: string, text: string }[], html: string }}
 */
export function htmlToSurface(html, { spansBreak = true } = {}) {
  const body = html.slice(Math.max(0, html.search(/<body\b/i)));
  const main = regionHtml(body, 'main');
  const footer = regionHtml(body, 'footer');
  const nav = regionHtml(body, 'nav');

  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = attr(tag, 'name') ?? attr(tag, 'property');
    const content = attr(tag, 'content');
    if (key && content !== undefined) meta[key] = content;
  }

  const jsonld = [];
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonld.push(JSON.parse(match[1]));
    } catch {
      jsonld.push({ '@parseError': true });
    }
  }

  const links = [];
  for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a ${match[1]}>`, 'href');
    if (href) links.push({ href, text: stripTags(match[2]) });
  }

  return {
    lang: attr(html.match(/<html\b[^>]*>/i)?.[0] ?? '', 'lang'),
    title: stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    meta,
    regions: {
      main: blocksOf(main, { spansBreak }),
      footer: blocksOf(footer, { spansBreak }),
      nav: blocksOf(nav, { spansBreak }),
    },
    jsonld,
    links,
    html,
  };
}

/** A block of text -> sentences. Keeps a clause after `;` with its sentence. */
export function splitSentences(line) {
  return String(line)
    .split(/(?<=[.!?…])\s+(?=[^\s])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Fact extraction
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (h, m = '00') => `${pad(Number(h))}:${String(m).padStart(2, '0')}`;

// Words that decide what a number is about, in all five languages at once
// (the German, Italian and Czech legal pages show English text, so the
// page's own locale is not a safe guide to the language of a sentence).
export const CUES = {
  perPerson: /od osoby|per person|pro Person|a persona|za osobu|na osobu|od os\./i,
  entry: /wst[ęe]p|\bentry\b|admission|Eintritt|ingresso|vstup/i,
  reservation: /rezerwacj|reservation|Reservierung|prenotazion|rezervac|koszt|kwota|cena/i,
  saturday: /sobot|saturday|samstag|sabato/i,
  friday: /piątk|friday|freitag|venerd|pátk|pátek|pátku/i,
  arrival: /odebra|odbior|claimed|einzul[öo]sen|ritirat|vyzved/i,
  approx: /(około|ca\.|circa|about|approx\w*|etwa|ungefähr|asi|cca)\s*$/i,
};

const MONEY_RE = /(?:PLN|zł)\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:zł|PLN|złotych|złote|złotego)/giu;
const RANGE_RE = /(?<![\dT:])(\d{1,2}):(\d{2})(?![\d:])\D{1,12}?(?<![\dT:])(\d{1,2}):(\d{2})(?![\d:])/gu;
const TIME_RE = /(?<![\dT:])(\d{1,2}):(\d{2})(?![\d:])/gu;
const WRITTEN_DE = /von\s+(\d{1,2})\s+bis\s+(\d{1,2})\s+Uhr/giu;
const RANO_PL = /do\s+(\d{1,2})(?::(\d{2}))?\s+rano/giu;
const PHONE_RE = /\+48[\s ]?\d{3}[\s ]?\d{3}[\s ]?\d{3}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const STREET_RE = /Rzeźnicz\w*\s+(\d+(?:\s*[-–]\s*\d+)?)/gu;
const POSTAL_RE = /(?<![\d-])(\d{2}-\d{3})(?![\d-])(?=\s+(?:Wroc|Bresl|Vratisl))/gu;
const AREA_RE = /(\d+)\s*m(?:²|2)/gu;
const CAPACITY_RE = /(?:\b(?:do|up to|bis zu|fino a|až|Do|Up to|Bis zu|Fino a|Až)\s+)(\d+)/gu;
const SCREENS_RE = /(\d+)\s+(?:ekrany|ekranów|screens|presentation screens|Bildschirme|Präsentationsbildschirme|schermi|obrazovky)/giu;
const BRAND_RE = /\b(SiSi|SISI|Sisi)\b/g;
const CLOSURE_RE = /wakacyjn|sierpni|summer|28 August|Sommer|28\. August|estate|28 agosto|léto|letní|28\. srpna/i;

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|svg|gif)$/i;

const clauseBefore = (sentence, index) => {
  const left = sentence.slice(Math.max(0, index - 100), index);
  return left.split(/;|:|\.\s|,\s+a\s|,\s+and\s|,\s+und\s/).pop() ?? left;
};

/**
 * Every fact-like value in one sentence.
 * Each result: `{ type, role, value, raw, ... }`. Roles are decided from the
 * words around the number, never from the number itself.
 */
export function extractFacts(sentence) {
  const found = [];

  for (const match of sentence.matchAll(MONEY_RE)) {
    const raw = match[0];
    const value = Number((match[1] ?? match[2]).replace(',', '.'));
    const clause = clauseBefore(sentence, match.index);
    const right = sentence.slice(match.index + raw.length, match.index + raw.length + 30);
    const perPerson = CUES.perPerson.test(right);
    let role = 'price-other';
    let day;
    if (CUES.entry.test(clause)) {
      role = perPerson ? 'entry-fee' : 'event-entry';
      day = CUES.saturday.test(clause) ? 'saturday' : CUES.friday.test(clause) ? 'friday' : 'unspecified';
    } else if (perPerson && CUES.reservation.test(`${clause} ${sentence.slice(0, match.index)}`)) {
      role = 'reservation-deposit';
    }
    found.push({ type: 'money', role, value, raw, day, approx: CUES.approx.test(sentence.slice(0, match.index)) });
  }

  const usedSpans = [];
  for (const match of sentence.matchAll(RANGE_RE)) {
    const from = hhmm(match[1], match[2]);
    const to = hhmm(match[3], match[4]);
    usedSpans.push([match.index, match.index + match[0].length]);
    found.push({
      type: 'time',
      role: CUES.arrival.test(sentence) ? 'arrival-window' : 'time-range',
      value: `${from}-${to}`,
      from,
      to,
      raw: match[0],
    });
  }
  for (const match of sentence.matchAll(WRITTEN_DE)) {
    found.push({ type: 'time', role: 'time-range', value: `${hhmm(match[1])}-${hhmm(match[2])}`, from: hhmm(match[1]), to: hhmm(match[2]), raw: match[0], written: true });
  }
  for (const match of sentence.matchAll(TIME_RE)) {
    const inRange = usedSpans.some(([a, b]) => match.index >= a && match.index < b);
    if (inRange) continue;
    found.push({ type: 'time', role: 'time', value: hhmm(match[1], match[2]), raw: match[0] });
  }
  for (const match of sentence.matchAll(RANO_PL)) {
    found.push({ type: 'time', role: 'time', value: hhmm(match[1], match[2] ?? '00'), raw: match[0], written: true });
  }

  for (const match of sentence.matchAll(PHONE_RE)) {
    found.push({ type: 'phone', role: 'phone', value: match[0].replace(/[\s ]/g, ''), raw: match[0] });
  }
  for (const match of sentence.matchAll(EMAIL_RE)) {
    if (IMAGE_EXT.test(match[0])) continue;
    found.push({ type: 'email', role: 'email', value: match[0].toLowerCase(), raw: match[0] });
  }
  for (const match of sentence.matchAll(STREET_RE)) {
    found.push({ type: 'address', role: 'street-number', value: match[1].replace(/\s*[-–]\s*/, '-'), raw: match[0] });
  }
  for (const match of sentence.matchAll(POSTAL_RE)) {
    found.push({ type: 'address', role: 'postal-code', value: match[1], raw: match[0] });
  }

  for (const match of sentence.matchAll(AREA_RE)) {
    found.push({ type: 'capacity', role: 'area-sqm', value: Number(match[1]), raw: match[0] });
  }
  for (const match of sentence.matchAll(CAPACITY_RE)) {
    const window = sentence.slice(Math.max(0, match.index - 40), match.index + match[0].length + 45);
    const seated = /siedz|seat|Sitz|sedere|sezení|míst/i.test(window);
    const standing = /stoj|standing|Steh|piedi|stoje/i.test(window);
    if (seated === standing) continue;
    found.push({ type: 'capacity', role: seated ? 'seated' : 'standing', value: Number(match[1]), raw: match[0] });
  }
  for (const match of sentence.matchAll(SCREENS_RE)) {
    found.push({ type: 'capacity', role: 'screens', value: Number(match[1]), raw: match[0] });
  }

  for (const match of sentence.matchAll(BRAND_RE)) {
    found.push({ type: 'brand', role: 'spelling', value: match[1], raw: match[0] });
  }
  if (CLOSURE_RE.test(sentence)) found.push({ type: 'closure', role: 'closure-mention', value: sentence.match(CLOSURE_RE)[0], raw: sentence.match(CLOSURE_RE)[0] });

  return found;
}

// ---------------------------------------------------------------------------
// Reservation rules, as sentences
// ---------------------------------------------------------------------------

/** One regex per language, tried in all five: the legal pages of de/it/cs are English. */
export const RULES = [
  {
    id: 'deposit-credited',
    label: 'Deposit is credited at the table',
    test: /do wykorzystania przy stoliku|(spent|credited) at (your|the) table|am Tisch (eingelöst|anrechenbar)|anrechenbar|(utilizzabil\w+|accreditat\w+) al tavolo|k útratě u stolu|utratit u stolu/i,
  },
  {
    id: 'friday-free-entry',
    label: 'Friday entry is free with a reservation',
    test: /piątk[^.]*(bezpłatn|wolny)|friday[^.]*entry is free|entry is free[^.]*friday|freitag[^.]*(kostenlos|frei)|venerdì[^.]*gratuit|pátek[^.]*zdarma|v pátek[^.]*vstup[^.]*zdarma|in freitags/i,
  },
  {
    id: 'saturday-entry',
    label: 'Saturday adds an entry fee per person',
    test: /sobot\w*[^.]*wstęp|saturday\w*[^.]*entry|samstag\w*[^.]*eintritt|sabato[^.]*ingresso|sobot\w*[^.]*(vstup|vstupné)/i,
  },
  {
    id: 'arrival-window',
    label: 'Arrival window (claim the table)',
    test: /(odebra|claimed|einzul[öo]sen|ritirat|vyzved)[^.]*\d{1,2}:\d{2}|\d{1,2}:\d{2}[^.]*(odebra|claimed)/i,
  },
  {
    id: 'late-release',
    label: 'Table may be released after 30 minutes late',
    test: /spóźnieni\w*[^.]*30|30 minutes late|30 Minuten Verspätung|ritardo[^.]*30|zpoždění[^.]*30/i,
  },
  {
    id: 'valid-id',
    label: 'Valid ID',
    test: /dokument\w* tożsamości|\bvalid ID\b|request ID|Ausweis|documento (valido|di identità)|doklad\w* totožnosti/i,
  },
  { id: 'dress-code', label: 'Smart casual dress code', test: /smart[- ]casual/i },
  {
    id: 'door-selection',
    label: 'Door selection',
    test: /selekcj|selection policy|Türauswahl|selezione all|výběr u vstupu/i,
  },
  {
    id: 'deny-entry',
    label: 'Staff may deny entry without a reason',
    test: /odmowy wstępu|refuse entry|Einlass[^.]*verweigern|rifiutare l.ingresso|odepřít vstup/i,
  },
  {
    id: 'refund-on-denial',
    label: 'Amount paid is refunded when entry is denied',
    test: /zwrócon|refunded|erstattet|rimborsat|vrací|vrácen/i,
  },
  {
    id: 'prepayment-confirms',
    label: 'Prepayment confirms the booking',
    test: /przedpłat|prepayment|Vorauszahlung|pagamento anticipato|platb\w* předem/i,
  },
];

/** Ids of the rules a block of text states. */
export function ruleHits(text) {
  return RULES.filter((rule) => rule.test.test(text)).map((rule) => rule.id);
}

// ---------------------------------------------------------------------------
// The menu page as printed
// ---------------------------------------------------------------------------

const cls = (name) => `class="${name}"[^>]*`;
const inner = (html, name) => {
  const match = html.match(new RegExp(`<(\\w+)\\b[^>]*${cls(name)}>([\\s\\S]*?)<\\/\\1>`));
  return match ? stripTags(match[2]) : undefined;
};

/**
 * The bar rows in document order (`item`, `champ`, `wine`) and the food rows.
 * Text is exactly as printed, entities decoded, whitespace collapsed.
 */
export function parseMenuPage(html) {
  const bar = [];
  const rowRe = /<div class="menu-item">([\s\S]*?)<\/div><\/div>|<div class="champ-item"[^>]*>([\s\S]*?)<\/div>|<div class="prow wine-row"[^>]*>([\s\S]*?)<\/div><\/div>/g;
  for (const match of html.matchAll(rowRe)) {
    if (match[1] !== undefined) {
      const block = match[1];
      bar.push({
        kind: 'item',
        name: inner(block, 'menu-item-name'),
        desc: inner(block, 'menu-item-desc'),
        vol: inner(block, 'menu-item-vol'),
        price: inner(block, 'menu-item-price'),
      });
    } else if (match[2] !== undefined) {
      bar.push({ kind: 'champ', name: inner(match[2], 'champ-name'), price: inner(match[2], 'champ-prices') });
    } else {
      const block = match[3];
      const nameHtml = block.match(/<p class="wine-name"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
      const cells = [...block.matchAll(/<span class="pcell"[^>]*data-vol="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g)].map((c) => [c[1], stripTags(c[2])]);
      bar.push({
        kind: 'wine',
        name: stripTags(nameHtml.replace(/<span class="wine-(winery|featured)"[^>]*>[\s\S]*?<\/span>/g, '')),
        winery: stripTags(nameHtml.match(/<span class="wine-winery"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ''),
        featured: stripTags(nameHtml.match(/<span class="wine-featured"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '') || undefined,
        meta: inner(block, 'wine-meta'),
        region: inner(block, 'wine-region'),
        glass: cells.find(([vol]) => vol === '150 ml')?.[1],
        bottle: cells.find(([vol]) => vol === '750 ml')?.[1],
      });
    }
  }

  const food = [];
  const sections = [];
  for (const match of html.matchAll(/<h3 class="food-section-label"[^>]*>([\s\S]*?)<\/h3>/g)) sections.push(stripTags(match[1]));
  for (const match of html.matchAll(/<article class="food-item"[^>]*>([\s\S]*?)<\/article>/g)) {
    const block = match[1];
    const nameHtml = block.match(/<h4 class="food-name"[^>]*>([\s\S]*?)<\/h4>/)?.[1] ?? '';
    food.push({
      name: stripTags(nameHtml.replace(/<span class="food-badges"[\s\S]*$/, '')),
      badges: [...nameHtml.matchAll(/title="([^"]*)"/g)].map((b) => decodeEntities(b[1])),
      desc: (() => {
        const raw = block.match(/<p class="food-desc"[^>]*>([\s\S]*?)<\/p>/)?.[1];
        return raw === undefined ? undefined : decodeEntities(raw.replace(/<[^>]+>/g, '')).trim();
      })(),
      prices: [...block.matchAll(/<span class="food-price"[^>]*>([\s\S]*?)<\/span>(?=<span class="food-price"|<\/div>)/g)].map((p) => {
        const qty = p[1].match(/<span class="food-qty"[^>]*>([\s\S]*?)<\/span>/)?.[1];
        return { qty: qty === undefined ? undefined : stripTags(qty), price: stripTags(p[1].replace(/<span class="food-qty"[\s\S]*?<\/span>/, '')) };
      }),
    });
  }
  return { bar, food, foodSections: sections };
}
