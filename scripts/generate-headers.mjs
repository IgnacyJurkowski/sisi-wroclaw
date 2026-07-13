import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PERMITTED_INLINE_SCRIPT = "document.documentElement.classList.add('js');";
const PERMITTED_INLINE_SCRIPT_HASH = hashSource(PERMITTED_INLINE_SCRIPT);

export function inlineScriptHashes(html) {
  const hashes = [];

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = scriptAttributes(match[1]);
    const body = match[2];

    if (attributes.has('src')) continue;

    const type = (attributes.get('type') ?? '').trim().toLowerCase();
    if (type === 'application/ld+json') continue;
    if (type === 'module') {
      throw new Error('Inline module script is forbidden; Astro must emit it as a same-origin asset.');
    }
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

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/video/*
  Cache-Control: public, max-age=0, must-revalidate

/framerusercontent.com/images/*
  Cache-Control: public, max-age=0, must-revalidate
`;
}

function hashSource(source) {
  return `'sha256-${createHash('sha256').update(source).digest('base64')}'`;
}

function scriptAttributes(source) {
  const attributes = new Map();
  const attribute = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/y;
  let cursor = 0;

  while (cursor < source.length) {
    while (/\s/.test(source[cursor] ?? '')) cursor++;
    if (cursor >= source.length || source[cursor] === '/') break;

    attribute.lastIndex = cursor;
    const match = attribute.exec(source);
    if (!match) throw new Error('Unexpected executable inline script attributes.');
    const name = match[1].toLowerCase();
    if (attributes.has(name)) throw new Error(`Unexpected duplicate script attribute: ${name}`);
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
    cursor = attribute.lastIndex;
  }

  return attributes;
}

function filesWithin(directory) {
  const files = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesWithin(path));
    else files.push(path);
  }
  return files;
}

function generateHeaders() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dist = join(root, 'dist');
  const htmlFiles = filesWithin(dist).filter((file) => file.endsWith('.html'));
  if (htmlFiles.length === 0) throw new Error('No built HTML files found in dist/.');

  const hashes = [...new Set(htmlFiles.flatMap((file) => inlineScriptHashes(readFileSync(file, 'utf8'))))].sort();
  if (hashes.length !== 1 || hashes[0] !== PERMITTED_INLINE_SCRIPT_HASH) {
    throw new Error(`Expected exactly the permitted inline-script hash across built HTML; found ${JSON.stringify(hashes)}.`);
  }

  writeFileSync(join(dist, '_headers'), renderHeaders(hashes), 'utf8');
  console.log(`Generated dist/_headers from ${htmlFiles.length} HTML files with ${hashes.length} permitted CSP hash.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateHeaders();
}
