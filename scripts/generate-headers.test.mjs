import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import * as headerPolicy from './generate-headers.mjs';

const { inlineScriptHashes, renderHeaders } = headerPolicy;

const BOOTSTRAP = "document.documentElement.classList.add('js');";
const BOOTSTRAP_HASH = "'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw='";

test('accepts the exact pre-paint bootstrap and returns its stable hash', () => {
  assert.deepEqual(inlineScriptHashes(`<script>${BOOTSTRAP}</script>`), [BOOTSTRAP_HASH]);
});

test('accepts script end tags with HTML whitespace and ASCII case variations', () => {
  for (const html of [
    `<script>${BOOTSTRAP}</script >`,
    `<script>${BOOTSTRAP}</script\t>`,
    `<ScRiPt>${BOOTSTRAP}</sCrIpT\n>`,
  ]) {
    assert.deepEqual(inlineScriptHashes(html), [BOOTSTRAP_HASH]);
  }
});

test('tokenizes a quoted greater-than sign inside script attributes', () => {
  assert.deepEqual(
    inlineScriptHashes(`<script data-note="launch > preview">${BOOTSTRAP}</script>`),
    [BOOTSTRAP_HASH],
  );
});

test('ignores JSON-LD and scripts with a source', () => {
  const html = [
    '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
    '<script src="/assets/app.example.js"></script>',
    '<SCRIPT TYPE="module" SRC="/assets/app.example.js"></SCRIPT\t>',
    '<script TYPE = \' APPLICATION/LD+JSON \'>[1, 2, 3]</script >',
  ].join('');

  assert.deepEqual(inlineScriptHashes(html), []);
});

test('accepts a document with no scripts', () => {
  assert.deepEqual(inlineScriptHashes('<main>No scripts</main>'), []);
});

test('rejects a duplicate pre-paint bootstrap', () => {
  const script = `<script>${BOOTSTRAP}</script>`;
  assert.throws(() => inlineScriptHashes(script + script), /duplicate permitted inline script/i);
});

test('rejects a duplicate hidden behind alternate end-tag whitespace', () => {
  assert.throws(
    () => inlineScriptHashes(
      `<script>${BOOTSTRAP}</script><script data-note="hidden > duplicate">${BOOTSTRAP}</script >`,
    ),
    /duplicate permitted inline script/i,
  );
});

test('rejects an unrecognized executable inline script', () => {
  assert.throws(
    () => inlineScriptHashes('<script>globalThis.injected = true</script>'),
    /unexpected executable inline script/i,
  );
});

test('does not mistake data attributes for src or JSON-LD type attributes', () => {
  assert.throws(
    () => inlineScriptHashes('<script data-src="/assets/app.js">globalThis.injected = true</script>'),
    /unexpected executable inline script/i,
  );
  assert.throws(
    () => inlineScriptHashes('<script data-type="application/ld+json">globalThis.injected = true</script>'),
    /unexpected executable inline script/i,
  );
});

test('rejects an inline module even when its body matches the bootstrap', () => {
  assert.throws(
    () => inlineScriptHashes(`<script type="module">${BOOTSTRAP}</script>`),
    /inline module script/i,
  );
});

test('rejects unmatched and malformed script starts and ends', () => {
  for (const html of [
    `<script>${BOOTSTRAP}`,
    '</script>',
    `<script data-note="unterminated>${BOOTSTRAP}</script>`,
    `<script>${BOOTSTRAP}</script data-note="bad">`,
    `<script / >${BOOTSTRAP}</script>`,
  ]) {
    assert.throws(() => inlineScriptHashes(html), /malformed|unmatched|self-closing/i, html);
  }
});

test('renders the complete launch policy without wildcard CORS', () => {
  const output = renderHeaders([BOOTSTRAP_HASH]);
  const rules = headerPolicy.parseHeaderRules(output);
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${BOOTSTRAP_HASH}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  assert.deepEqual(rules.map(({ pattern }) => pattern), ['/*', '/assets/*', '/fonts/*']);
  for (const rule of rules) {
    assert.equal(rule.headers['Content-Security-Policy'], policy, rule.pattern);
    assert.equal(rule.headers['X-Content-Type-Options'], 'nosniff', rule.pattern);
    assert.equal(rule.headers['Referrer-Policy'], 'strict-origin-when-cross-origin', rule.pattern);
    assert.equal(rule.headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()', rule.pattern);
  }
  assert.doesNotMatch(output, /Access-Control-Allow-Origin/i);
});

test('sorts and deduplicates hashes deterministically', () => {
  const output = renderHeaders(["'sha256-z='", "'sha256-a='", "'sha256-z='"]);
  const rules = headerPolicy.parseHeaderRules(output);
  for (const rule of rules) {
    assert.match(rule.headers['Content-Security-Policy'], /script-src 'self' 'sha256-a=' 'sha256-z='/);
    assert.equal((rule.headers['Content-Security-Policy'].match(/'sha256-z='/g) ?? []).length, 1);
  }
});

test('renders HTML, immutable hashed asset, font, and revalidated media cache sections', () => {
  const rules = headerPolicy.parseHeaderRules(renderHeaders([BOOTSTRAP_HASH]));
  assert.equal(rules[0].headers['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(rules[1].headers['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(rules[2].headers['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(rules.some(({ pattern }) => pattern === '/*.html'), false);
});

test('matches generated cache rules by request path with a safe default and specific overrides', () => {
  assert.equal(typeof headerPolicy.parseHeaderRules, 'function');
  assert.equal(typeof headerPolicy.headersForPath, 'function');
  const rules = headerPolicy.parseHeaderRules(renderHeaders([BOOTSTRAP_HASH]));
  const revalidate = 'public, max-age=0, must-revalidate';
  const immutable = 'public, max-age=31536000, immutable';

  for (const pathname of ['/', '/pl/', '/menu', '/missing/', '/404', '/favicon.svg', '/video/clip.mp4']) {
    assert.equal(headerPolicy.headersForPath(rules, pathname)['Cache-Control'], revalidate, pathname);
  }
  assert.equal(headerPolicy.headersForPath(rules, '/assets/app.abcdef12.js')['Cache-Control'], immutable);
  assert.equal(headerPolicy.headersForPath(rules, '/fonts/cal-sans.woff2')['Cache-Control'], immutable);
  assert.equal(
    headerPolicy.headersForPath(rules, '/framerusercontent.com/assets/font.woff2')['Cache-Control'],
    revalidate,
  );
  assert.equal(
    headerPolicy.headersForPath(rules, '/fonts.gstatic.com/s/family/font.woff2')['Cache-Control'],
    revalidate,
  );
});

test('merges all matching rules in source order so the later specific rule wins', () => {
  const specific = {
    pattern: '/assets/*',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Rule': 'specific',
    },
  };
  const fallback = {
    pattern: '/*',
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Rule': 'fallback',
      'X-Fallback-Only': 'must not merge',
    },
  };

  assert.deepEqual(
    headerPolicy.headersForPath([fallback, specific], '/assets/app.abcdef12.js'),
    {
      ...fallback.headers,
      ...specific.headers,
    },
  );
  assert.deepEqual(headerPolicy.headersForPath([fallback, specific], '/pl/'), fallback.headers);
  assert.deepEqual(
    headerPolicy.headersForPath([specific, fallback], '/assets/app.abcdef12.js'),
    {
      ...specific.headers,
      ...fallback.headers,
    },
  );
});

test('keeps generated cache policy authoritative over netlify.toml', () => {
  const netlifyConfig = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.doesNotMatch(netlifyConfig, /\bCache-Control\s*=/i);
});

test('recursively inventories every required image, media, and font extension with policy coverage', () => {
  assert.equal(typeof headerPolicy.cacheAssetInventory, 'function');
  const dist = mkdtempSync(join(tmpdir(), 'sisi-cache-inventory-'));
  const fixtures = [
    ['/assets/photo.abcdef12.png', 'image'],
    ['/root/photo.jpg', 'image'],
    ['/root/photo.jpeg', 'image'],
    ['/root/photo.webp', 'image'],
    ['/root/photo.avif', 'image'],
    ['/root/photo.svg', 'image'],
    ['/root/photo.gif', 'image'],
    ['/favicon.ico', 'image'],
    ['/framerusercontent.com/assets/clip.mp4', 'media'],
    ['/nested/clip.webm', 'media'],
    ['/fonts/local.woff', 'font'],
    ['/fonts.gstatic.com/s/family/font.woff2', 'font'],
    ['/framerusercontent.com/third-party-assets/font.ttf', 'font'],
    ['/nested/font.otf', 'font'],
  ];

  try {
    for (const [requestPath] of fixtures) writeFixture(dist, requestPath, 'fixture');
    const rules = headerPolicy.parseHeaderRules(renderHeaders([BOOTSTRAP_HASH]));
    const inventory = headerPolicy.cacheAssetInventory(dist, rules);

    assert.deepEqual(inventory.totals, {
      image: 8,
      media: 2,
      font: 4,
      total: 14,
      immutable: 2,
      revalidate: 12,
    });
    assert.deepEqual(
      inventory.files.map(({ requestPath, kind }) => [requestPath, kind]),
      fixtures.toSorted(([a], [b]) => a.localeCompare(b)),
    );
    assert.ok(inventory.files.every(({ cacheControl }) => cacheControl));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('rejects an unhashed file that an immutable content-addressed rule would cover', () => {
  assert.equal(typeof headerPolicy.cacheAssetInventory, 'function');
  const dist = mkdtempSync(join(tmpdir(), 'sisi-cache-unhashed-'));
  try {
    writeFixture(dist, '/assets/unhashed.png', 'fixture');
    const rules = headerPolicy.parseHeaderRules(renderHeaders([BOOTSTRAP_HASH]));
    assert.throws(() => headerPolicy.cacheAssetInventory(dist, rules), /content-addressed/i);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('removes stale generated headers before validation and leaves no temporary output on failure', () => {
  assert.equal(typeof headerPolicy.generateHeaders, 'function');
  const dist = mkdtempSync(join(tmpdir(), 'sisi-headers-failure-'));
  try {
    writeFixture(dist, '/_headers', 'stale policy');
    writeFixture(dist, '/index.html', '<script>globalThis.injected = true</script >');

    assert.throws(() => headerPolicy.generateHeaders({ dist }), /unexpected executable inline script/i);
    assert.equal(existsSync(join(dist, '_headers')), false);
    assert.deepEqual(readdirSync(dist).filter((name) => name.includes('_headers.tmp')), []);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('generates headers through a temporary file and leaves only the final output', () => {
  assert.equal(typeof headerPolicy.generateHeaders, 'function');
  const dist = mkdtempSync(join(tmpdir(), 'sisi-headers-success-'));
  try {
    writeFixture(dist, '/index.html', `<script>${BOOTSTRAP}</script>`);
    const result = headerPolicy.generateHeaders({ dist });

    assert.equal(result.htmlFiles, 1);
    assert.equal(result.hashes, 1);
    assert.match(readFileSync(join(dist, '_headers'), 'utf8'), /Cache-Control: public, max-age=0, must-revalidate/);
    assert.deepEqual(readdirSync(dist).filter((name) => name.includes('_headers.tmp')), []);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('importing the module does not write headers as a side effect', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'sisi-headers-import-'));
  const moduleUrl = new URL(`./generate-headers.mjs?guard=${Date.now()}`, import.meta.url).href;

  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(moduleUrl)})`], {
      cwd,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(cwd, 'dist', '_headers')), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

function writeFixture(root, requestPath, contents) {
  const file = join(root, requestPath.replace(/^\//, ''));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}
