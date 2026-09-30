// Contract 3: links. Every internal a[href] / link[href] (plus img and script
// sources) resolves in dist, anchors included. Every emenago.com reservation
// CTA keeps its locale segment and UTM parameters; with network allowed each
// distinct destination answers a HEAD (never GET, never POST).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_ORIGIN, LOCALES } from '../lib/constants.mjs';
import { ctaProblems, parseReservationSource, REQUIRED_UTM } from '../lib/cta.mjs';
import { headCheck } from '../lib/net.mjs';
import { matchRedirect } from '../lib/netlify.mjs';
import { readSnapshot, writeSnapshot } from '../lib/snapshot.mjs';

const C = 'links';
const FONT_CDNS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SKIP_SCHEMES = /^(?:mailto:|tel:|javascript:|data:|blob:|sms:|whatsapp:)/i;

export async function runLinksContract(ctx) {
  const { model, report, repoRoot, rules } = ctx;
  const reservation = parseReservationSource(readFileSync(join(repoRoot, 'src/data/site.ts'), 'utf8'));
  const ctaByPage = new Map();
  const external = new Map();
  const slashless = new Map();
  let internalChecked = 0;

  for (const [pagePath, page] of model.pages) {
    const pageUrl = new URL(pagePath, CANONICAL_ORIGIN);
    const locale = pagePath.split('/')[1];
    for (const link of page.links) {
      const raw = link.url.trim();
      if (!raw || raw === '#' || SKIP_SCHEMES.test(raw)) continue;
      let target;
      try {
        target = new URL(raw, pageUrl);
      } catch {
        report.fail(C, { url: pagePath, field: `${link.tag}[${linkAttr(link)}]`, message: `unparsable URL ${raw}` });
        continue;
      }
      const label = `${link.tag}${link.rel ? `[rel=${link.rel}]` : ''}`;
      if (link.cta) {
        recordCta({ ctaByPage, pagePath, link, target });
        const problems = LOCALES.includes(locale) ? ctaProblems(raw, locale, reservation) : [];
        report.check(C, problems.length === 0, { url: pagePath, field: `CTA #${link.position}`, message: problems.join('; ') });
        continue;
      }
      if (FONT_CDNS.includes(target.hostname)) {
        report.fail(C, { url: pagePath, field: label, message: `references font CDN ${target.hostname}; fonts are self-hosted` });
        continue;
      }
      if (target.origin !== CANONICAL_ORIGIN) {
        const host = target.hostname;
        external.set(host, (external.get(host) ?? 0) + 1);
        continue;
      }
      internalChecked += 1;
      checkInternal({ model, report, rules, pagePath, target, label, raw, slashless });
    }
  }
  if (slashless.size) {
    const total = [...slashless.values()].reduce((a, b) => a + b.length, 0);
    const sample = [...slashless.entries()].slice(0, 3).map(([path, pages]) => `${path} (from ${pages[0]})`).join(', ');
    report.note(C, { message: `${total} internal link(s) omit the trailing slash the site otherwise uses (${slashless.size} distinct targets, e.g. ${sample}). They resolve only if Netlify redirects /dir to /dir/ (Assumption, not verifiable offline).` });
  }
  report.lines(C, [`  ${internalChecked} internal references checked across ${model.pages.size} pages.`,
    `  External hosts referenced (not fetched): ${[...external].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h} x${n}`).join(', ') || 'none'}`]);

  checkFileLinks({ ctx });
  await checkCtas({ ctx, reservation, ctaByPage });
}

const linkAttr = (link) => (link.tag === 'a' || link.tag === 'link' ? 'href' : link.tag === 'form' ? 'action' : 'src');

function checkInternal({ model, report, rules, pagePath, target, label, raw, slashless }) {
  const path = target.pathname;
  const fail = (field, message) => report.fail(C, { url: pagePath, field, message });
  const exists = model.exists(path);
  if (!exists) {
    const dirIndex = !path.endsWith('/') && model.exists(`${path}/`);
    const redirect = matchRedirect(rules ?? [], { path }, model.exists);
    if (dirIndex) {
      if (!slashless.has(path)) slashless.set(path, []);
      slashless.get(path).push(pagePath);
      report.pass(C);
    } else if (redirect) fail(label, `${raw} points at a redirecting URL (-> ${redirect.target}); link to the destination`);
    else fail(label, `${raw} does not resolve in dist`);
    return;
  }
  if (!target.hash || target.hash === '#') {
    report.pass(C);
    return;
  }
  const id = decodeURIComponent(target.hash.slice(1));
  if (id.startsWith(':~:')) {
    report.pass(C);
    return;
  }
  const targetPage = model.pages.get(path) ?? model.pages.get(`${path}/`);
  if (!targetPage) {
    report.pass(C); // anchor into a non-HTML file: nothing to look up
    return;
  }
  report.check(C, targetPage.ids.has(id), { url: pagePath, field: label, message: `${raw} anchors to #${id}, which is not an id on ${path}` });
}

function checkFileLinks({ ctx }) {
  const { model, report } = ctx;
  const seen = new Set();
  for (const [name, text] of [['llms.txt', model.llmsTxt], ['llms-full.txt', model.llmsFull]]) {
    for (const m of (text ?? '').matchAll(/https:\/\/www\.sisiwroclaw\.pl(\/[^\s)>\]"']*)/g)) {
      const path = m[1].replace(/[.,;:]+$/, '');
      const key = `${name}${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      report.check(C, model.exists(path), { url: `/${name}`, field: 'link', message: `${path} listed in ${name} does not resolve in dist` });
    }
  }
}

function recordCta({ ctaByPage, pagePath, link, target }) {
  if (!ctaByPage.has(pagePath)) ctaByPage.set(pagePath, []);
  ctaByPage.get(pagePath).push({
    position: link.position,
    region: link.region,
    content: target.searchParams.get('utm_content') ?? '',
    url: link.url,
  });
}

async function checkCtas({ ctx, reservation, ctaByPage }) {
  const { model, report, contractDir, opts, source } = ctx;

  // JSON-LD ReserveAction targets follow the same locale rule.
  for (const [pagePath, page] of model.pages) {
    const locale = pagePath.split('/')[1];
    if (!LOCALES.includes(locale)) continue;
    for (const target of page.jsonLd.reserveTargets.filter((t) => /emenago\.com/.test(t.url))) {
      const problems = ctaProblems(`${target.url}?${REQUIRED_UTM.map((k) => `${k}=x`).join('&')}`, locale, { ...reservation, fixed: {} });
      report.check(C, problems.length === 0, { url: pagePath, field: 'JSON-LD ReserveAction', message: problems.join('; ') });
    }
  }

  const pages = {};
  for (const path of [...ctaByPage.keys()].sort()) pages[path] = ctaByPage.get(path).map((c) => c.content).sort();
  if (opts.updateSnapshot) {
    writeSnapshot(contractDir, 'cta.json', {
      source,
      note: 'Reservation CTA contract: provider URL, the locale segment map from src/data/site.ts (cs deliberately maps to pl), required UTM parameters and the utm_content of every CTA per page. A page may gain CTAs but not lose one.',
      base: reservation.base,
      localeMap: reservation.localeMap,
      requiredParams: REQUIRED_UTM,
      fixedParams: reservation.fixed,
      pages,
    });
    report.note(C, { message: 'wrote contract/cta.json' });
  }
  const snap = readSnapshot(contractDir, 'cta.json');
  if (!snap) {
    report.fail(C, { message: 'contract/cta.json is missing; run with --update-snapshot' });
  } else {
    report.check(C, snap.base === reservation.base, { field: 'CTA base URL', message: `src/data/site.ts base ${reservation.base} differs from snapshot ${snap.base}` });
    for (const locale of LOCALES) {
      report.check(C, snap.localeMap[locale] === reservation.localeMap[locale], {
        field: `CTA locale map[${locale}]`, message: `locale segment for ${locale} is "${reservation.localeMap[locale]}", snapshot has "${snap.localeMap[locale]}"`,
      });
    }
    for (const [key, value] of Object.entries(snap.fixedParams)) {
      report.check(C, reservation.fixed[key] === value, { field: `CTA ${key}`, message: `${key} is "${reservation.fixed[key]}", snapshot has "${value}"` });
    }
    for (const [path, contents] of Object.entries(snap.pages)) {
      const now = pages[path] ?? [];
      const remaining = [...now];
      const lost = contents.filter((c) => {
        const at = remaining.indexOf(c);
        if (at < 0) return true;
        remaining.splice(at, 1);
        return false;
      });
      report.check(C, lost.length === 0, { url: path, field: 'CTA', message: `reservation CTA(s) removed: utm_content ${lost.join(', ')}` });
    }
    for (const path of Object.keys(pages)) {
      if (!(path in snap.pages)) report.note(C, { url: path, message: 'new reservation CTA page (not in snapshot)' });
    }
  }

  // --- the CTA report ---------------------------------------------------------
  const lines = ['  Reservation CTAs (page, position, region, utm_content -> destination):'];
  let total = 0;
  for (const path of [...ctaByPage.keys()].sort()) {
    for (const cta of ctaByPage.get(path)) {
      total += 1;
      lines.push(`    ${path} #${cta.position} [${cta.region}] ${cta.content || '(no utm_content)'} -> ${cta.url}`);
    }
  }
  lines.push(`  ${total} reservation CTA(s) on ${ctaByPage.size} page(s).`);
  report.lines(C, lines);

  // --- live HEAD, never GET --------------------------------------------------------
  const destinations = new Map();
  for (const list of ctaByPage.values()) for (const cta of list) destinations.set(new URL(cta.url).pathname, cta.url);
  for (const [, url] of destinations) {
    if (opts.offline) {
      report.unverified(C, { field: 'CTA HEAD', message: `${url.split('?')[0]} not requested (--offline)` });
      continue;
    }
    const res = await headCheck(url);
    if (res.verdict === 'ok') report.pass(C);
    else if (res.verdict === 'fail') report.fail(C, { field: 'CTA HEAD', message: `${url.split('?')[0]} answers HTTP ${res.status}` });
    else report.unverified(C, { field: 'CTA HEAD', message: `${url.split('?')[0]} could not be verified (${res.status ?? res.error})` });
  }
}
