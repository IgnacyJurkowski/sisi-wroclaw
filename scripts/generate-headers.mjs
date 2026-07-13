import { createHash, randomUUID } from 'node:crypto';
import {
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PERMITTED_INLINE_SCRIPT = "document.documentElement.classList.add('js');";
const PERMITTED_INLINE_SCRIPT_HASH = hashSource(PERMITTED_INLINE_SCRIPT);
const REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const DEFAULT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const CACHE_ASSET_KINDS = new Map([
  ['.png', 'image'],
  ['.jpg', 'image'],
  ['.jpeg', 'image'],
  ['.webp', 'image'],
  ['.avif', 'image'],
  ['.svg', 'image'],
  ['.gif', 'image'],
  ['.ico', 'image'],
  ['.mp4', 'media'],
  ['.webm', 'media'],
  ['.woff', 'font'],
  ['.woff2', 'font'],
  ['.ttf', 'font'],
  ['.otf', 'font'],
]);

export function inlineScriptHashes(html) {
  const hashes = [];
  let cursor = 0;

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor);
    if (tagStart < 0) break;

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4);
      if (commentEnd < 0) throw new Error('Malformed HTML comment while scanning inline scripts.');
      cursor = commentEnd + 3;
      continue;
    }

    if (isScriptTagAt(html, tagStart, true)) {
      throw new Error('Unmatched script end tag.');
    }

    if (isScriptTagAt(html, tagStart, false)) {
      const nameEnd = tagStart + '<script'.length;
      const startEnd = scanMarkupEnd(html, nameEnd, 'script start tag');
      const attributes = scriptAttributes(html.slice(nameEnd, startEnd - 1));
      const end = scriptEnd(html, startEnd);
      const body = html.slice(startEnd, end.start);

      if (!attributes.has('src')) {
        const type = (attributes.get('type') ?? '').trim().toLowerCase();
        if (type === 'application/ld+json') {
          // Structured data is non-executable and does not belong in script-src.
        } else if (type === 'module') {
          throw new Error('Inline module script is forbidden; Astro must emit it as a same-origin asset.');
        } else {
          if (type && !['text/javascript', 'application/javascript'].includes(type)) {
            throw new Error(`Unexpected executable inline script type: ${type}`);
          }
          if (body !== PERMITTED_INLINE_SCRIPT) {
            throw new Error('Unexpected executable inline script; refusing to add its hash to CSP.');
          }
          if (hashes.length > 0) {
            throw new Error('Duplicate permitted inline script in one HTML document.');
          }
          hashes.push(PERMITTED_INLINE_SCRIPT_HASH);
        }
      }

      cursor = end.end;
      continue;
    }

    const next = html[tagStart + 1];
    if (next && /[A-Za-z!/?]/.test(next)) {
      cursor = scanMarkupEnd(html, tagStart + 1, 'HTML tag');
    } else {
      cursor = tagStart + 1;
    }
  }

  return hashes;
}

export function renderHeaders(hashes) {
  const uniqueHashes = [...new Set(hashes)].sort();
  const scriptSource = ["'self'", ...uniqueHashes].join(' ');

  return `/*
  Content-Security-Policy: default-src 'self'; script-src ${scriptSource}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cache-Control: ${REVALIDATE}

/assets/*
  Cache-Control: ${IMMUTABLE}

/fonts/*
  Cache-Control: ${IMMUTABLE}
`;
}

export function parseHeaderRules(source) {
  const rules = [];
  let current;

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    if (!current) throw new Error('Header pair appears before a path rule in dist/_headers.');

    const pair = line.trim();
    const separator = pair.indexOf(':');
    if (separator < 1) throw new Error(`Malformed header pair in dist/_headers: ${pair}`);
    current.headers[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim();
  }

  return rules;
}

export function headersForPath(rules, pathname) {
  const headers = {};
  for (const rule of rules) {
    if (headerPattern(rule.pattern).test(pathname)) Object.assign(headers, rule.headers);
  }
  return headers;
}

export function cacheAssetInventory(dist, rules) {
  const root = resolve(dist);
  const allFiles = filesWithin(root);

  for (const file of allFiles) {
    const requestPath = requestPathForFile(root, file);
    if (requestPath.startsWith('/assets/') && !isContentAddressed(requestPath)) {
      throw new Error(`Immutable /assets file is not content-addressed: ${requestPath}`);
    }
  }

  const files = allFiles
    .map((file) => {
      const extension = extname(file).toLowerCase();
      const kind = CACHE_ASSET_KINDS.get(extension);
      if (!kind) return undefined;

      const requestPath = requestPathForFile(root, file);
      const cacheControl = headersForPath(rules, requestPath)['Cache-Control'];
      if (!cacheControl) throw new Error(`No cache policy matches emitted ${kind} asset ${requestPath}`);
      if (![REVALIDATE, IMMUTABLE].includes(cacheControl)) {
        throw new Error(`Unexpected cache policy for ${requestPath}: ${cacheControl}`);
      }
      if (cacheControl === IMMUTABLE && !isApprovedImmutable(requestPath)) {
        throw new Error(`Immutable cache policy is not approved for ${requestPath}`);
      }

      return { requestPath, kind, extension, cacheControl };
    })
    .filter(Boolean)
    .sort((a, b) => a.requestPath.localeCompare(b.requestPath));

  const totals = {
    image: files.filter(({ kind }) => kind === 'image').length,
    media: files.filter(({ kind }) => kind === 'media').length,
    font: files.filter(({ kind }) => kind === 'font').length,
    total: files.length,
    immutable: files.filter(({ cacheControl }) => cacheControl === IMMUTABLE).length,
    revalidate: files.filter(({ cacheControl }) => cacheControl === REVALIDATE).length,
  };

  return { files, totals };
}

export function generateHeaders({ dist = DEFAULT_DIST } = {}) {
  const output = join(dist, '_headers');
  const temporary = join(dist, `_headers.tmp-${process.pid}-${randomUUID()}`);

  rmSync(output, { force: true });
  rmSync(temporary, { force: true });

  try {
    const htmlFiles = filesWithin(dist).filter((file) => file.endsWith('.html'));
    if (htmlFiles.length === 0) throw new Error('No built HTML files found in dist/.');

    const hashes = [...new Set(htmlFiles.flatMap((file) => inlineScriptHashes(readFileSync(file, 'utf8'))))].sort();
    if (hashes.length !== 1 || hashes[0] !== PERMITTED_INLINE_SCRIPT_HASH) {
      throw new Error(`Expected exactly the permitted inline-script hash across built HTML; found ${JSON.stringify(hashes)}.`);
    }

    const source = renderHeaders(hashes);
    const inventory = cacheAssetInventory(dist, parseHeaderRules(source));
    writeFileSync(temporary, source, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, output);

    return {
      htmlFiles: htmlFiles.length,
      hashes: hashes.length,
      inventory: inventory.totals,
    };
  } catch (error) {
    rmSync(temporary, { force: true });
    rmSync(output, { force: true });
    throw error;
  }
}

function hashSource(source) {
  return `'sha256-${createHash('sha256').update(source).digest('base64')}'`;
}

function isScriptTagAt(html, start, closing) {
  const prefix = closing ? '</script' : '<script';
  if (html.slice(start, start + prefix.length).toLowerCase() !== prefix) return false;
  const boundary = html[start + prefix.length];
  return boundary === undefined || boundary === '>' || boundary === '/' || isHtmlSpace(boundary);
}

function scanMarkupEnd(html, cursor, label) {
  let quote;
  for (; cursor < html.length; cursor++) {
    const character = html[cursor];
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return cursor + 1;
    if (character === '<') throw new Error(`Malformed ${label}: unexpected < before >.`);
  }
  throw new Error(`Malformed ${label}: unmatched ${quote ? 'quoted attribute' : 'tag'}.`);
}

function scriptAttributes(source) {
  const attributes = new Map();
  let cursor = 0;

  while (cursor < source.length) {
    while (isHtmlSpace(source[cursor])) cursor++;
    if (cursor >= source.length) break;
    if (source[cursor] === '/') {
      if (source.slice(cursor + 1).split('').every(isHtmlSpace)) {
        throw new Error('Self-closing script start tag is forbidden.');
      }
      throw new Error('Malformed script start tag attributes.');
    }

    const nameStart = cursor;
    while (cursor < source.length && !isHtmlSpace(source[cursor]) && !['=', '/', '"', "'", '<', '>'].includes(source[cursor])) {
      cursor++;
    }
    if (cursor === nameStart) throw new Error('Malformed script start tag attributes.');
    const name = source.slice(nameStart, cursor).toLowerCase();
    if (attributes.has(name)) throw new Error(`Unexpected duplicate script attribute: ${name}`);

    while (isHtmlSpace(source[cursor])) cursor++;
    let value = '';
    if (source[cursor] === '=') {
      cursor++;
      while (isHtmlSpace(source[cursor])) cursor++;
      if (cursor >= source.length) throw new Error(`Malformed script attribute ${name}: missing value.`);

      const quote = source[cursor] === '"' || source[cursor] === "'" ? source[cursor++] : undefined;
      const valueStart = cursor;
      if (quote) {
        while (cursor < source.length && source[cursor] !== quote) cursor++;
        if (cursor >= source.length) throw new Error(`Malformed script attribute ${name}: unmatched quote.`);
        value = source.slice(valueStart, cursor);
        cursor++;
      } else {
        while (cursor < source.length && !isHtmlSpace(source[cursor])) {
          if (['"', "'", '<', '=', '>'].includes(source[cursor])) {
            throw new Error(`Malformed unquoted script attribute ${name}.`);
          }
          cursor++;
        }
        value = source.slice(valueStart, cursor);
        if (!value) throw new Error(`Malformed script attribute ${name}: missing value.`);
      }
    }
    attributes.set(name, value);
  }

  return attributes;
}

function scriptEnd(html, cursor) {
  while (cursor < html.length) {
    const candidate = html.indexOf('<', cursor);
    if (candidate < 0) break;
    if (!isScriptTagAt(html, candidate, true)) {
      cursor = candidate + 1;
      continue;
    }

    let end = candidate + '</script'.length;
    while (isHtmlSpace(html[end])) end++;
    if (html[end] !== '>') throw new Error('Malformed script end tag.');
    return { start: candidate, end: end + 1 };
  }
  throw new Error('Unmatched script start tag.');
}

function isHtmlSpace(character) {
  return character !== undefined && /[\t\n\f\r ]/.test(character);
}

function headerPattern(pattern) {
  const expression = pattern.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${expression}$`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function filesWithin(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Generated dist must not contain symlinks: ${path}`);
    if (entry.isDirectory()) files.push(...filesWithin(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function requestPathForFile(root, file) {
  return `/${relative(root, file).split(sep).join('/')}`;
}

function isContentAddressed(requestPath) {
  return /\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(basename(requestPath));
}

function isApprovedImmutable(requestPath) {
  if (requestPath.startsWith('/fonts/')) return true;
  return requestPath.startsWith('/assets/') && isContentAddressed(requestPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = generateHeaders();
  const { image, media, font, total, immutable, revalidate } = result.inventory;
  console.log(`Generated dist/_headers from ${result.htmlFiles} HTML files with ${result.hashes} permitted CSP hash.`);
  console.log(
    `Cache inventory: ${image} image, ${media} media, ${font} font (${total} total; ${immutable} immutable, ${revalidate} revalidate).`,
  );
}
