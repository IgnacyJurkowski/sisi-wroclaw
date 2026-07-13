import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import { renderHeaders } from './generate-headers.mjs';
import {
  contentType,
  headersForPath,
  parseHeaderRules,
  resolveRequestPath,
} from './serve-dist.mjs';

const HASH = "'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw='";

test('parses generated root headers and applies them to every response path', () => {
  const rules = parseHeaderRules(renderHeaders([HASH]));

  for (const pathname of ['/pl/index.html', '/assets/app.abc123.js', '/missing']) {
    const headers = headersForPath(rules, pathname);
    assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
  }
});

test('applies generated cache sections by the resolved build path', () => {
  const rules = parseHeaderRules(renderHeaders([HASH]));

  assert.equal(headersForPath(rules, '/pl/index.html')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/assets/app.abc123.js')['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(headersForPath(rules, '/fonts/cal-sans.woff2')['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(headersForPath(rules, '/video/poster.webp')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/framerusercontent.com/images/photo.webp')['Cache-Control'], 'public, max-age=0, must-revalidate');
});

test('resolves decoded request paths inside dist', () => {
  const dist = resolve('/tmp/sisi-dist');

  assert.equal(resolveRequestPath(dist, '/pl/menu/'), resolve(dist, 'pl/menu'));
  assert.equal(resolveRequestPath(dist, '/pl/%6denu/'), resolve(dist, 'pl/menu'));
  assert.equal(resolveRequestPath(dist, '/pl/../en/'), resolve(dist, 'en'));
});

test('rejects literal, encoded, backslash, malformed, and null-byte traversal', () => {
  const dist = resolve('/tmp/sisi-dist');
  for (const pathname of ['/../secret', '/%2e%2e/secret', '/..%2fsecret', '/..%5csecret', '/%E0%A4%A', '/%00']) {
    assert.throws(() => resolveRequestPath(dist, pathname), /400 Bad Request/);
  }
});

test('maps every required static type to a non-sniffed MIME', () => {
  const expected = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
  };

  for (const [extension, mime] of Object.entries(expected)) {
    assert.equal(contentType(`/asset${extension}`), mime);
  }
});
