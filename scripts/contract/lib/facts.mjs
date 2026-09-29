// Fact extraction: currency amounts, clock times, phones, emails and street
// addresses out of plain text, plus the contradiction rules that run against
// contract/facts.json. Pure functions only; the contract wrapper does the IO.

const NBSP = /[  ]/g;

const CURRENCY = /(?<![\d.,])(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[.,](\d{1,2}))?(?:\s?[-–]\s?(\d+)(?:[.,]\d{1,2})?)?\s?(zł|PLN|złotych|złote|zl|EUR|€|Kč|CZK)(?![\p{L}])/giu;
const CURRENCY_PREFIX = /(?<![\p{L}\d])(PLN|EUR|€)\s?(\d{1,3}(?:[ ,]\d{3})+|\d+)(?:\.(\d{1,2}))?(?!\d|,\d)/giu;
const TIME = /(?<![\d:.,])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g;
const TIME_RANGE = /(?<![\d:.,])([01]?\d|2[0-3]):([0-5]\d)\s?[-–—]\s?([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g;
const TIME_WORDS = /(?<![\d:.,])(\d{1,2})\s?(rano|wieczorem|w nocy|nad ranem|am|pm|Uhr)(?![\p{L}])/giu;
const PHONE_PLUS = /(?<![\w+])\+\d{1,3}(?:[ -]?\d){8,11}(?!\d)/g;
const PHONE_GROUPED = /(?<![\d-])\d{3}[ -]\d{3}[ -]\d{3}(?![\d-])/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// "Rzeźnicza 32 Sp. z o.o." is the legal name, not a street address.
const RZEZNICZA = /(?:ul\.?\s+)?Rze[źz]nicza\s+(\d+[a-z]?(?:\s?[-–]\s?\d+[a-z]?)?)(?!\s+Sp\.|\d)/giu;
const OTHER_STREET = /\bul\.\s+(?!Rze[źz]nicza)[\p{Lu}][\p{L}.-]+(?:\s+[\p{L}.-]+){0,2}\s+\d+[a-zA-Z]?(?:[-/]\d+)?/gu;
const POSTAL = /\b\d{2}-\d{3}\s+[\p{Lu}][\p{L}]+/gu;

const CURRENCY_LABEL = { zł: 'zł', pln: 'zł', złotych: 'zł', złote: 'zł', zl: 'zł', eur: '€', '€': '€', kč: 'Kč', czk: 'Kč' };

const two = (n) => String(n).padStart(2, '0');

function moneyValue(intPart, frac, upper) {
  const whole = intPart.replace(/[ .]/g, '');
  const fracDigits = frac && Number(frac) !== 0 ? `,${frac}` : '';
  return `${whole}${fracDigits}${upper ? `-${upper}` : ''}`;
}

export function normalizePhone(raw) {
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 9) return `+48${digits}`;
  return digits;
}

/** Each fact: { kind, value, index, raw }. Text is scanned as-is (nbsp -> space). */
export function extractFacts(input) {
  const text = String(input ?? '').replace(NBSP, ' ');
  const facts = [];
  for (const m of text.matchAll(CURRENCY)) {
    const label = CURRENCY_LABEL[m[4].toLowerCase()] ?? m[4];
    const range = m[3];
    if (range) {
      // "50-100 zł": report both ends so neither hides inside a range.
      facts.push({ kind: 'currency', value: `${moneyValue(m[1], m[2])} ${label}`, index: m.index, raw: m[0] });
      facts.push({ kind: 'currency', value: `${moneyValue(range, '')} ${label}`, index: m.index, raw: m[0] });
    } else {
      facts.push({ kind: 'currency', value: `${moneyValue(m[1], m[2])} ${label}`, index: m.index, raw: m[0] });
    }
  }
  for (const m of text.matchAll(CURRENCY_PREFIX)) {
    const label = CURRENCY_LABEL[m[1].toLowerCase()] ?? m[1];
    facts.push({ kind: 'currency', value: `${moneyValue(m[2].replace(/,/g, ''), m[3])} ${label}`, index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(TIME_RANGE)) {
    facts.push({ kind: 'timeRange', value: `${two(m[1])}:${m[2]}-${two(m[3])}:${m[4]}`, index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(TIME)) {
    facts.push({ kind: 'time', value: `${two(m[1])}:${m[2]}`, index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(TIME_WORDS)) {
    facts.push({ kind: 'time', value: `${m[1]} ${m[2].toLowerCase()}`, index: m.index, raw: m[0] });
  }
  const phoneSpans = [];
  for (const m of text.matchAll(PHONE_PLUS)) {
    phoneSpans.push([m.index, m.index + m[0].length]);
    facts.push({ kind: 'phone', value: normalizePhone(m[0]), index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(PHONE_GROUPED)) {
    if (phoneSpans.some(([a, b]) => m.index >= a && m.index < b)) continue;
    facts.push({ kind: 'phone', value: normalizePhone(m[0]), index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(EMAIL)) {
    facts.push({ kind: 'email', value: m[0].toLowerCase(), index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(RZEZNICZA)) {
    facts.push({ kind: 'address', value: `Rzeźnicza ${m[1].replace(/\s/g, '').replace('–', '-')}`, index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(OTHER_STREET)) {
    facts.push({ kind: 'address', value: m[0].replace(/\s+/g, ' '), index: m.index, raw: m[0] });
  }
  for (const m of text.matchAll(POSTAL)) {
    facts.push({ kind: 'postal', value: m[0].replace(/\s+/g, ' '), index: m.index, raw: m[0] });
  }
  return facts;
}

/** Extract facts from a `tel:` / `mailto:` href. */
export function factsFromHref(href) {
  const value = String(href ?? '');
  if (/^tel:/i.test(value)) return [{ kind: 'phone', value: normalizePhone(decodeURIComponent(value.slice(4))), index: 0, raw: value }];
  if (/^mailto:/i.test(value)) {
    const address = decodeURIComponent(value.slice(7).split('?')[0]).trim().toLowerCase();
    return address ? [{ kind: 'email', value: address, index: 0, raw: value }] : [];
  }
  return [];
}

/** Sentences inside one text block (a block is already one paragraph/item). */
export function splitSentences(block) {
  return String(block).split(/(?<=[.!?])\s+(?=[\p{Lu}0-9"„(])/u).map((s) => s.trim()).filter(Boolean);
}

const SISI = /\bsisi\b|\bR32\b|\bThe Cork\b|Rze[źz]nicza/i;

/** Words that make a sentence a claim about booking cost / entry. */
export function contextMatchers(config) {
  const compile = (list) => new RegExp(list.join('|'), 'iu');
  return {
    reservation: compile(config.context.reservationWords),
    hours: compile(config.context.hoursWords),
    rule: compile(config.context.ruleWords),
  };
}

export const isAboutSisi = (sentence) => SISI.test(sentence);

/**
 * Contradictions in one text block against the allow-list.
 * @param {string} block
 * @param {{ kind: 'site'|'blog'|'event', page: string }} where
 * @param {object} config parsed contract/facts.json
 * @returns {{ rule: string, value: string, sentence: string }[]}
 */
export function contradictions(block, where, config) {
  const out = [];
  const matchers = contextMatchers(config);
  const allowedMoney = new Set(config.reservation.allowedAmounts);
  const allowedTimes = new Set(config.hours.allowedTimes);
  const allowedRanges = new Set(config.hours.allowedRanges);
  for (const sentence of splitSentences(block)) {
    const facts = extractFacts(sentence);
    for (const fact of facts) {
      if (fact.kind === 'phone' && !config.phones.includes(fact.value)) {
        out.push({ rule: 'phone-not-on-allow-list', value: fact.value, sentence });
      } else if (fact.kind === 'email' && !config.emails.includes(fact.value)) {
        out.push({ rule: 'email-not-on-allow-list', value: fact.value, sentence });
      } else if (fact.kind === 'address') {
        const streetOk = config.address.streetForms.includes(fact.value);
        if (!streetOk) out.push({ rule: 'address-not-on-allow-list', value: fact.value, sentence });
      }
    }
    if (where.kind === 'event') continue;
    const sisi = isAboutSisi(sentence);
    const money = facts.filter((f) => f.kind === 'currency');
    const ranges = facts.filter((f) => f.kind === 'timeRange');
    // A time that is the end of a range is judged with the range, once.
    const inRange = new Set(ranges.flatMap((f) => f.value.split('-')));
    const times = facts.filter((f) => f.kind === 'time' && !inRange.has(f.value));

    const reservationClaim = matchers.reservation.test(sentence) && (where.kind === 'site' || sisi);
    if (reservationClaim || (where.kind === 'blog' && sisi)) {
      for (const fact of money) {
        if (!allowedMoney.has(fact.value)) {
          out.push({ rule: 'price-contradicts-allow-list', value: fact.value, sentence });
        }
      }
    }
    if (where.kind === 'site') {
      for (const fact of ranges) {
        if (!allowedRanges.has(fact.value)) out.push({ rule: 'hours-range-contradicts-allow-list', value: fact.value, sentence });
      }
      if (matchers.hours.test(sentence)) {
        for (const fact of times) {
          if (!allowedTimes.has(fact.value)) out.push({ rule: 'hours-contradicts-allow-list', value: fact.value, sentence });
        }
      }
    } else if (where.kind === 'blog' && sisi) {
      for (const fact of [...times, ...ranges]) {
        const allowed = fact.kind === 'time' ? allowedTimes.has(fact.value) : allowedRanges.has(fact.value);
        if (!allowed) out.push({ rule: 'hours-contradicts-allow-list', value: fact.value, sentence });
      }
    }
  }
  return out;
}

/** Blog text that states a price, an hour or a rule about SiSi. Judged per
    sentence; when no single sentence qualifies, a paragraph that names SiSi and
    carries an amount or a time is flagged as a whole (scope "paragraph"). */
export function blogFlags(block, config) {
  const matchers = contextMatchers(config);
  const describe = (text) => {
    const facts = extractFacts(text);
    const kinds = new Set();
    if (facts.some((f) => f.kind === 'currency')) kinds.add('price');
    if (facts.some((f) => f.kind === 'time' || f.kind === 'timeRange') || matchers.hours.test(text)) kinds.add('hour');
    if (matchers.rule.test(text)) kinds.add('rule');
    const values = [...new Set(facts.filter((f) => ['currency', 'time', 'timeRange'].includes(f.kind)).map((f) => f.value))];
    return { kinds: [...kinds].sort(), values };
  };
  const flags = [];
  for (const sentence of splitSentences(block)) {
    if (!isAboutSisi(sentence)) continue;
    const { kinds, values } = describe(sentence);
    if (kinds.length) flags.push({ scope: 'sentence', kinds, values, sentence });
  }
  if (!flags.length && isAboutSisi(block)) {
    const { kinds, values } = describe(block);
    if (values.length) flags.push({ scope: 'paragraph', kinds, values, sentence: block });
  }
  return flags;
}

/** Add facts of a text block to an inventory map. */
export function addToInventory(inventory, page, block) {
  for (const fact of extractFacts(block)) recordFact(inventory, page, fact);
}

export function recordFact(inventory, page, fact) {
  const bucket = (inventory[fact.kind] ??= {});
  const entry = (bucket[fact.value] ??= { pages: new Set() });
  entry.pages.add(page);
}

/** Set-based inventory -> sorted plain JSON. */
export function serialiseInventory(inventory) {
  const out = {};
  for (const kind of Object.keys(inventory).sort()) {
    out[kind] = {};
    for (const value of Object.keys(inventory[kind]).sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))) {
      const pages = [...inventory[kind][value].pages].sort();
      out[kind][value] = { count: pages.length, pages };
    }
  }
  return out;
}
