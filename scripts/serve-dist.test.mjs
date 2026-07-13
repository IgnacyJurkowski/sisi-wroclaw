import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { request as requestHttp } from 'node:http';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { renderHeaders } from './generate-headers.mjs';
import * as distServer from './serve-dist.mjs';

const {
  contentType,
  headersForPath,
  parseHeaderRules,
  resolveRequestPath,
} = distServer;

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

test('applies generated cache sections by request path', () => {
  const rules = parseHeaderRules(renderHeaders([HASH]));

  assert.equal(headersForPath(rules, '/pl/')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/missing/')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/assets/app.abc123.js')['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(headersForPath(rules, '/fonts/cal-sans.woff2')['Cache-Control'], 'public, max-age=31536000, immutable');
  assert.equal(headersForPath(rules, '/video/poster.webp')['Cache-Control'], 'public, max-age=0, must-revalidate');
  assert.equal(headersForPath(rules, '/framerusercontent.com/assets/font.woff2')['Cache-Control'], 'public, max-age=0, must-revalidate');
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

test('rejects file and directory symlinks that escape dist', () => {
  const root = mkdtempSync(join(tmpdir(), 'sisi-server-symlink-unit-'));
  const dist = join(root, 'dist');
  const outside = join(root, 'outside');
  try {
    mkdirSync(dist);
    mkdirSync(outside);
    writeFileSync(join(outside, 'secret.txt'), 'outside secret');
    symlinkSync(join(outside, 'secret.txt'), join(dist, 'leak.txt'));
    symlinkSync(outside, join(dist, 'leak-directory'));

    assert.throws(() => resolveRequestPath(dist, '/leak.txt'), /400|symlink|escape/i);
    assert.throws(() => resolveRequestPath(dist, '/leak-directory/secret.txt'), /400|symlink|escape/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
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
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };

  for (const [extension, mime] of Object.entries(expected)) {
    assert.equal(contentType(`/asset${extension}`), mime);
  }
});

test('serves a temporary dist through real HTTP with bounded responses and clean shutdown', async (t) => {
  assert.equal(typeof distServer.createDistServer, 'function');
  const fixture = createDistFixture();
  const server = distServer.createDistServer({
    dist: fixture.dist,
    onError: () => {},
    openFile: async (file, flags) => {
      if (file.endsWith(`${join('', 'race.txt')}`)) {
        const error = new Error('simulated file race');
        error.code = 'EIO';
        throw error;
      }
      return open(file, flags);
    },
  });
  let closed = false;

  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    await t.test('redirects root with root security and revalidation headers', async () => {
      const response = await request(server, '/');
      assert.equal(response.statusCode, 301);
      assert.equal(response.headers.location, '/pl/');
      assertRootPolicy(response);
      assertRevalidates(response);
    });

    await t.test('serves a clean directory route by its request-path policy', async () => {
      const response = await request(server, '/pl/');
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
      assert.match(response.body.toString(), /Polski fixture/);
      assertRootPolicy(response);
      assertRevalidates(response);
    });

    await t.test('serves the built 404 with headers selected from the missing request path', async () => {
      const response = await request(server, '/does-not-exist/');
      assert.equal(response.statusCode, 404);
      assert.match(response.body.toString(), /Built 404 fixture/);
      assertRootPolicy(response);
      assertRevalidates(response);
    });

    await t.test('answers HEAD without a body and with the GET content length', async () => {
      const response = await request(server, '/pl/', { method: 'HEAD' });
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.length, 0);
      assert.equal(Number(response.headers['content-length']), Buffer.byteLength('<h1>Polski fixture</h1>'));
      assertRootPolicy(response);
      assertRevalidates(response);
    });

    await t.test('serves byte ranges and rejects unsatisfiable ranges', async () => {
      const partial = await request(server, '/video/clip.mp4', { headers: { Range: 'bytes=2-5' } });
      assert.equal(partial.statusCode, 206);
      assert.equal(partial.body.toString(), '2345');
      assert.equal(partial.headers['content-range'], 'bytes 2-5/10');
      assertRootPolicy(partial);
      assertRevalidates(partial);

      const invalid = await request(server, '/video/clip.mp4', { headers: { Range: 'bytes=99-100' } });
      assert.equal(invalid.statusCode, 416);
      assert.equal(invalid.headers['content-range'], 'bytes */10');
      assert.equal(invalid.body.length, 0);
      assertRootPolicy(invalid);
      assertRevalidates(invalid);
    });

    await t.test('uses immutable caching only for approved request paths', async () => {
      const asset = await request(server, '/assets/app.abcdef12.js');
      assert.equal(asset.statusCode, 200);
      assert.equal(asset.headers['content-type'], 'application/javascript; charset=utf-8');
      assert.equal(asset.headers['cache-control'], 'public, max-age=31536000, immutable');
      assertRootPolicy(asset);

      const font = await request(server, '/fonts/local.woff2');
      assert.equal(font.statusCode, 200);
      assert.equal(font.headers['cache-control'], 'public, max-age=31536000, immutable');
      assertRootPolicy(font);

      const icon = await request(server, '/favicon.svg');
      assert.equal(icon.statusCode, 200);
      assert.equal(icon.headers['content-type'], 'image/svg+xml');
      assertRevalidates(icon);
      assertRootPolicy(icon);
    });

    await t.test('serves required media and font MIME types', async () => {
      const webm = await request(server, '/media/clip.webm');
      assert.equal(webm.statusCode, 200);
      assert.equal(webm.headers['content-type'], 'video/webm');
      const font = await request(server, '/nested/font.otf');
      assert.equal(font.statusCode, 200);
      assert.equal(font.headers['content-type'], 'font/otf');
    });

    await t.test('rejects traversal, malformed encoding, and symlink escapes with root headers', async () => {
      for (const pathname of ['/%2e%2e/outside/secret.txt', '/..%2foutside/secret.txt', '/%E0%A4%A']) {
        const response = await request(server, pathname);
        assert.equal(response.statusCode, 400, pathname);
        assertRootPolicy(response);
        assertRevalidates(response);
      }
      for (const pathname of ['/leak.txt', '/leak-directory/secret.txt']) {
        const response = await request(server, pathname);
        assert.equal(response.statusCode, 403, pathname);
        assert.doesNotMatch(response.body.toString(), /outside secret/);
        assertRootPolicy(response);
        assertRevalidates(response);
      }
    });

    await t.test('bounds unsupported methods and filesystem race failures', async () => {
      const method = await request(server, '/pl/', { method: 'POST' });
      assert.equal(method.statusCode, 405);
      assert.equal(method.headers.allow, 'GET, HEAD');
      assertRootPolicy(method);
      assertRevalidates(method);

      const race = await request(server, '/race.txt');
      assert.equal(race.statusCode, 500);
      assert.equal(race.body.toString(), 'Internal Server Error');
      assertRootPolicy(race);
      assertRevalidates(race);
    });

    await closeServer(server);
    closed = true;
    assert.equal(server.listening, false);
  } finally {
    if (!closed) await closeServer(server);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

function createDistFixture() {
  const root = mkdtempSync(join(tmpdir(), 'sisi-server-http-'));
  const dist = join(root, 'dist');
  const outside = join(root, 'outside');
  mkdirSync(dist);
  mkdirSync(outside);

  writeFixture(dist, '/_headers', renderHeaders([HASH]));
  writeFixture(dist, '/pl/index.html', '<h1>Polski fixture</h1>');
  writeFixture(dist, '/404.html', '<h1>Built 404 fixture</h1>');
  writeFixture(dist, '/assets/app.abcdef12.js', 'globalThis.fixture = true;');
  writeFixture(dist, '/fonts/local.woff2', Buffer.from([0, 1, 2, 3]));
  writeFixture(dist, '/favicon.svg', '<svg></svg>');
  writeFixture(dist, '/video/clip.mp4', '0123456789');
  writeFixture(dist, '/media/clip.webm', 'webm');
  writeFixture(dist, '/nested/font.otf', Buffer.from([0, 1]));
  writeFixture(dist, '/race.txt', 'race');
  writeFixture(outside, '/secret.txt', 'outside secret');
  symlinkSync(join(outside, 'secret.txt'), join(dist, 'leak.txt'));
  symlinkSync(outside, join(dist, 'leak-directory'));

  return { root, dist };
}

function writeFixture(root, requestPath, contents) {
  const file = join(root, requestPath.replace(/^\//, ''));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

function request(server, path, { method = 'GET', headers = {} } = {}) {
  const address = server.address();
  return new Promise((resolvePromise, reject) => {
    const outgoing = requestHttp({
      host: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers,
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolvePromise({
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

function assertRootPolicy(response) {
  assert.match(response.headers['content-security-policy'] ?? '', /default-src 'self'/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(response.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
}

function assertRevalidates(response) {
  assert.equal(response.headers['cache-control'], 'public, max-age=0, must-revalidate');
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolvePromise, reject) => {
    server.close((error) => error ? reject(error) : resolvePromise());
  });
}
