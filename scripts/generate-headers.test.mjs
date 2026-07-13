import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { inlineScriptHashes, renderHeaders } from './generate-headers.mjs';

const BOOTSTRAP = "document.documentElement.classList.add('js');";
const BOOTSTRAP_HASH = "'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw='";

test('accepts the exact pre-paint bootstrap and returns its stable hash', () => {
  assert.deepEqual(inlineScriptHashes(`<script>${BOOTSTRAP}</script>`), [BOOTSTRAP_HASH]);
});

test('ignores JSON-LD and scripts with a source', () => {
  const html = [
    '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
    '<script src="/assets/app.example.js"></script>',
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

test('renders the complete launch policy without wildcard CORS', () => {
  const output = renderHeaders([BOOTSTRAP_HASH]);
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

  assert.match(output, new RegExp(`^/\\*\\n  Content-Security-Policy: ${escapeRegExp(policy)}$`, 'm'));
  for (const header of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=()',
  ]) {
    assert.match(output, new RegExp(`^  ${escapeRegExp(header)}$`, 'm'));
  }
  assert.doesNotMatch(output, /Access-Control-Allow-Origin/i);
});

test('sorts and deduplicates hashes deterministically', () => {
  const output = renderHeaders(["'sha256-z='", "'sha256-a='", "'sha256-z='"]);
  assert.match(output, /script-src 'self' 'sha256-a=' 'sha256-z='/);
  assert.equal((output.match(/'sha256-z='/g) ?? []).length, 1);
});

test('renders HTML, immutable hashed asset, font, and revalidated media cache sections', () => {
  const output = renderHeaders([BOOTSTRAP_HASH]);
  for (const section of [
    '/*.html\n  Cache-Control: public, max-age=0, must-revalidate',
    '/assets/*\n  Cache-Control: public, max-age=31536000, immutable',
    '/fonts/*\n  Cache-Control: public, max-age=31536000, immutable',
    '/video/*\n  Cache-Control: public, max-age=0, must-revalidate',
    '/framerusercontent.com/images/*\n  Cache-Control: public, max-age=0, must-revalidate',
  ]) {
    assert.match(output, new RegExp(escapeRegExp(section)));
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
