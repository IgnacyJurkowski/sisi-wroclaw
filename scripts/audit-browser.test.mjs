import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_SCRIPT = path.join(ROOT, 'scripts/audit-browser.mjs');
const CANONICAL_ORIGIN = 'https://sisiwroclaw.pl';

function send(response, status, body, contentType = 'text/html; charset=utf-8', headers = {}) {
  response.writeHead(status, { 'content-type': contentType, ...headers });
  response.end(body);
}

function page({ title, body, asset = true }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${asset ? '<link rel="stylesheet" href="/fixture.css">' : ''}
  </head>
  <body><main><h1>${title}</h1>${body}</main></body>
</html>`;
}

function sitemap(paths) {
  const locations = paths
    .map((pathname) => `<url><loc>${CANONICAL_ORIGIN}${pathname}</loc></url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset>${locations}</urlset>`;
}

async function startFixture(handler) {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://fixture.test');
    Promise.resolve(handler({ request, response, url })).catch((error) => {
      if (!response.headersSent) send(response, 500, error.stack || String(error), 'text/plain');
      else response.destroy(error);
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    async close() {
      const closed = once(server, 'close');
      server.close();
      server.closeAllConnections();
      await closed;
    },
  };
}

async function runAudit(baseUrl) {
  const child = spawn(process.execPath, [AUDIT_SCRIPT], {
    cwd: ROOT,
    env: { ...process.env, BASE_URL: baseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const timer = setTimeout(() => child.kill('SIGKILL'), 45_000);
  const [exitCode, signal] = await once(child, 'close');
  clearTimeout(timer);
  assert.notEqual(signal, 'SIGKILL', `audit timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`);

  let summary;
  try {
    summary = JSON.parse(stdout);
  } catch (error) {
    assert.fail(`audit did not emit one JSON summary: ${error}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
  return { exitCode, stderr, summary };
}

test('rejects a missing fragment on a different internal document', { timeout: 60_000 }, async () => {
  const fixture = await startFixture(({ response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; }', 'text/css');
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'Source',
        body: `<a href="${CANONICAL_ORIGIN}/target/#missing">Missing target fragment</a>`,
      }));
    }
    if (url.pathname === '/target/') {
      return send(response, 200, page({ title: 'Target', body: '<p>No requested fragment here.</p>' }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.notEqual(exitCode, 0);
    assert.equal(summary.ok, false);
    assert.equal(summary.brokenInternalLinks, 3);
    assert.ok(summary.failures.some((failure) =>
      failure.type === 'broken-internal-fragment' &&
      failure.fragment === '#missing' &&
      failure.finalUrl === `${fixture.origin}/target/`,
    ));
  } finally {
    await fixture.close();
  }
});

test('remaps a production-canonical redirect at every hop and preserves the caller fragment', { timeout: 60_000 }, async () => {
  let redirectHits = 0;
  let finalHits = 0;
  let finalQuery = '';
  let finalHost = '';
  const fixture = await startFixture(({ request, response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; }', 'text/css');
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'Redirect source',
        body: `<a href="${CANONICAL_ORIGIN}/redirect/?step=1#fixture-target">Redirected target</a>`,
      }));
    }
    if (url.pathname === '/redirect/') {
      redirectHits += 1;
      return send(response, 302, '', 'text/plain', {
        location: `${CANONICAL_ORIGIN}/final/?from=redirect`,
      });
    }
    if (url.pathname === '/final/') {
      finalHits += 1;
      finalQuery = url.search;
      finalHost = request.headers.host || '';
      return send(response, 200, page({
        title: 'Redirect final',
        body: '<p id="fixture-target">Local final response.</p>',
      }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.equal(exitCode, 0, JSON.stringify(summary.failures));
    assert.equal(summary.ok, true);
    assert.equal(redirectHits, 1);
    assert.equal(finalHits, 1);
    assert.equal(finalQuery, '?from=redirect');
    assert.equal(finalHost, new URL(fixture.origin).host);
    assert.equal(summary.internalFragmentsChecked, 1);
  } finally {
    await fixture.close();
  }
});

test('rejects an unaudited redirect without contacting its target', { timeout: 60_000 }, async () => {
  let trapHits = 0;
  const trap = await startFixture(({ response }) => {
    trapHits += 1;
    return send(response, 200, page({ title: 'External trap', body: '<p>Must not be fetched.</p>' }));
  });
  const fixture = await startFixture(({ response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; }', 'text/css');
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'External redirect source',
        body: `<a href="${CANONICAL_ORIGIN}/redirect/">External redirect</a>`,
      }));
    }
    if (url.pathname === '/redirect/') {
      return send(response, 302, '', 'text/plain', { location: `${trap.origin}/escaped/` });
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.notEqual(exitCode, 0);
    assert.equal(summary.ok, false);
    assert.equal(trapHits, 0);
    assert.ok(summary.failures.some((failure) =>
      failure.type === 'broken-internal-link' &&
      failure.reason === 'unaudited-redirect-origin' &&
      failure.redirectTarget === `${trap.origin}/escaped/`,
    ));
  } finally {
    await fixture.close();
    await trap.close();
  }
});

test('correlates an aborted same-origin media asset with exactly one terminal failure', { timeout: 60_000 }, async () => {
  const fixture = await startFixture(({ request, response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; }', 'text/css');
    if (url.pathname === '/abort.mp4') {
      request.socket.destroy();
      return;
    }
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'Aborted asset',
        body: `<video src="/abort.mp4" muted autoplay playsinline aria-label="Broken fixture video"></video>
          <a href="${CANONICAL_ORIGIN}/source/">Self link</a>`,
      }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.notEqual(exitCode, 0);
    assert.equal(summary.ok, false);
    assert.ok(summary.sameOriginAssetFailures > 0);
    assert.equal(summary.sameOriginAssetRequests, summary.sameOriginAssetTerminalOutcomes);
    assert.equal(summary.sameOriginAssetPending, 0);
    assert.ok(summary.failures.some((failure) =>
      failure.type === 'asset-request' &&
      failure.assetUrl === `${fixture.origin}/abort.mp4` &&
      failure.resourceType === 'media' &&
      failure.terminal === 'failed',
    ));
  } finally {
    await fixture.close();
  }
});

test('accepts only a ready successful streaming media response as an explicit media terminal', { timeout: 60_000 }, async () => {
  const video = await readFile(path.join(ROOT, 'public/video/relacja-z-otwarcia.mp4'));
  const fixture = await startFixture(({ response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; } video { width: 320px; max-width: 100%; }', 'text/css');
    if (url.pathname === '/stream.mp4') {
      response.writeHead(206, {
        'accept-ranges': 'bytes',
        'content-range': `bytes 0-${video.length - 1}/${video.length}`,
        'content-type': 'video/mp4',
      });
      response.write(video);
      return;
    }
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'Streaming media',
        body: `<video src="/stream.mp4" muted autoplay playsinline aria-label="Fixture video"></video>
          <a href="${CANONICAL_ORIGIN}/source/">Self link</a>`,
      }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.equal(exitCode, 0, JSON.stringify(summary.failures));
    assert.equal(summary.ok, true);
    assert.equal(summary.sameOriginAssetRequests, summary.sameOriginAssetTerminalOutcomes);
    assert.equal(summary.sameOriginAssetPending, 0);
    assert.equal(summary.sameOriginAssetFailures, 0);
    assert.equal(summary.sameOriginAssetMediaReadyResponses, 3);
  } finally {
    await fixture.close();
  }
});

test('fails an asset-free page check even when another route loaded an asset', { timeout: 60_000 }, async () => {
  const fixture = await startFixture(({ response, url }) => {
    if (url.pathname === '/sitemap.xml') {
      return send(response, 200, sitemap(['/with-asset/', '/without-asset/']), 'application/xml');
    }
    if (url.pathname === '/fixture.css') return send(response, 200, 'body { margin: 0; }', 'text/css');
    if (url.pathname === '/with-asset/') {
      return send(response, 200, page({
        title: 'With asset',
        body: `<a href="${CANONICAL_ORIGIN}/without-asset/">Asset-free page</a>`,
      }));
    }
    if (url.pathname === '/without-asset/') {
      return send(response, 200, page({
        title: 'Without asset',
        body: `<a href="${CANONICAL_ORIGIN}/with-asset/">Page with asset</a>`,
        asset: false,
      }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.notEqual(exitCode, 0);
    assert.equal(summary.ok, false);
    assert.equal(summary.assetPageChecks, 6);
    assert.equal(summary.assetCoveredPageChecks, 3);
    const coverageFailures = summary.failures.filter((failure) => failure.type === 'asset-coverage');
    assert.deepEqual(coverageFailures.map((failure) => failure.width), [320, 390, 1440]);
    assert.ok(coverageFailures.every((failure) => failure.url === `${fixture.origin}/without-asset/`));
  } finally {
    await fixture.close();
  }
});

test('waits for asynchronously started reveal transitions before running Axe', { timeout: 60_000 }, async () => {
  const fixture = await startFixture(({ response, url }) => {
    if (url.pathname === '/sitemap.xml') return send(response, 200, sitemap(['/source/']), 'application/xml');
    if (url.pathname === '/fixture.css') {
      return send(
        response,
        200,
        `body { margin: 0; background: #000; color: #fff; }
        a { color: #fff; }
        [data-reveal-group] > * { opacity: 0.1; transition: opacity 200ms linear 400ms; }
        [data-reveal-group].is-in > * { opacity: 1; }`,
        'text/css',
      );
    }
    if (url.pathname === '/source/') {
      return send(response, 200, page({
        title: 'Delayed reveal',
        body: `<div data-reveal-group><p>Readable after the reveal settles.</p></div>
          <div data-reveal hidden>This inactive reveal is allowed to remain unrevealed.</div>
          <a href="${CANONICAL_ORIGIN}/source/">Self link</a>
          <script>setTimeout(() => document.querySelector('[data-reveal-group]').classList.add('is-in'), 50);</script>`,
      }));
    }
    return send(response, 404, 'not found', 'text/plain');
  });

  try {
    const { exitCode, summary } = await runAudit(fixture.origin);
    assert.equal(exitCode, 0, JSON.stringify(summary.failures));
    assert.equal(summary.ok, true);
    assert.equal(summary.seriousCriticalViolations, 0);
  } finally {
    await fixture.close();
  }
});
