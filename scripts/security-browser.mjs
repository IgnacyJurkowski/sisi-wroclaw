import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { cp, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS_FILE = path.join(ROOT, 'src/data/events.generated.ts');
const CHROME_PATH = '/usr/bin/google-chrome';
const COPY_EXCLUDES = new Set(['.git', '.claude', 'dist', 'node_modules']);
const ROUTES = [
  '/pl/',
  '/pl/wydarzenia/',
  '/pl/wydarzenia/2099-07-17-security-future/',
  '/pl/wydarzenia/2020-07-17-security-past/',
];

const terminators = ['</script>', '</SCRIPT>', '</ScRiPt>'];
const marker = '<script>globalThis.__sisiJsonLdXss = (globalThis.__sisiJsonLdXss || 0) + 1</script>';
const payload = terminators.map((value) => value + marker).join('');
const events = [
  {
    title: payload,
    slug: '2099-07-17-security-future',
    start: '2099-07-17T22:00:00+02:00',
    note: payload,
    img: '/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
    price: 30,
    description: payload,
    genres: ['house'],
  },
  {
    title: payload,
    slug: '2020-07-17-security-past',
    start: '2020-07-17T22:00:00+02:00',
    note: payload,
    img: '/framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp',
    description: payload,
    genres: ['house'],
  },
];

function fixtureSource() {
  return `// Generated security fixture. The release harness removes this temporary copy.\n` +
    `import type { EventItem } from './site';\n\n` +
    `export const GENERATED_EVENTS: EventItem[] = ${JSON.stringify(events, null, 2)};\n`;
}

async function copyRepository(destination) {
  await cp(ROOT, destination, {
    recursive: true,
    filter(source) {
      const relative = path.relative(ROOT, source);
      if (!relative) return true;
      return !COPY_EXCLUDES.has(relative.split(path.sep)[0]);
    },
  });
  await symlink(path.join(ROOT, 'node_modules'), path.join(destination, 'node_modules'), 'dir');
}

function capture(child) {
  const output = { stdout: '', stderr: '', spawnError: null };
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk) => { output.stdout += chunk; });
  child.stderr?.on('data', (chunk) => { output.stderr += chunk; });
  child.on('error', (error) => { output.spawnError = error; });
  return output;
}

async function runCommand(command, args, options) {
  const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
  const output = capture(child);
  const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
  const [exitCode, signal] = await once(child, 'close');
  clearTimeout(timeout);

  if (output.spawnError || exitCode !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed (exit ${exitCode}, signal ${signal ?? 'none'}).`,
      output.spawnError?.stack,
      output.stdout,
      output.stderr,
    ].filter(Boolean).join('\n'));
  }
  return output;
}

async function reserveLoopbackPort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const address = reservation.address();
  assert.ok(address && typeof address === 'object');
  const { port } = address;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(origin, child, output) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (output.spawnError || child.exitCode !== null || child.signalCode !== null) {
      throw new Error([
        'Temporary preview exited before becoming ready.',
        output.spawnError?.stack,
        output.stdout,
        output.stderr,
      ].filter(Boolean).join('\n'));
    }
    try {
      const response = await fetch(`${origin}/pl/`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(1_000),
      });
      if (response.body) await response.body.cancel();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Temporary preview did not become ready at ${origin}.\n${output.stdout}\n${output.stderr}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, 'close');
  child.kill('SIGTERM');
  const stopped = await Promise.race([
    closed.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!stopped) {
    child.kill('SIGKILL');
    await closed;
  }
}

function containsExactValue(value, expected) {
  if (value === expected) return true;
  if (Array.isArray(value)) return value.some((item) => containsExactValue(item, expected));
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => containsExactValue(item, expected));
  }
  return false;
}

async function proveRawControl(browser) {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<script type="application/ld+json">${JSON.stringify({ name: payload })}</script>`,
      { waitUntil: 'load' },
    );
    const executions = await page.evaluate(() => globalThis.__sisiJsonLdXss || 0);
    assert.ok(executions > 0, 'raw JSON.stringify control did not execute its marker');
    console.log(`PASS raw JSON.stringify control executed ${executions} marker(s)`);
  } finally {
    await page.close();
  }
}

async function verifyRoutes(browser, origin) {
  const page = await browser.newPage();
  try {
    for (const route of ROUTES) {
      const response = await page.goto(`${origin}${route}`, { waitUntil: 'load' });
      assert.ok(response, `${route} produced no main-document response`);
      assert.equal(response.status(), 200, `${route} returned ${response.status()}`);

      const markerPresent = await page.evaluate(() =>
        Object.prototype.hasOwnProperty.call(globalThis, '__sisiJsonLdXss'),
      );
      assert.equal(markerPresent, false, `${route} executed the JSON-LD marker`);

      const texts = await page.locator('script[type="application/ld+json"]').allTextContents();
      assert.ok(texts.length > 0, `${route} emitted no JSON-LD`);
      const values = texts.map((text, index) => {
        assert.equal(text.includes('<'), false, `${route} JSON-LD ${index + 1} contains a literal <`);
        assert.doesNotThrow(() => JSON.parse(text), `${route} JSON-LD ${index + 1} is invalid JSON`);
        return JSON.parse(text);
      });
      assert.ok(
        values.some((value) => containsExactValue(value, payload)),
        `${route} did not preserve the full hostile payload in structured data`,
      );
      console.log(`PASS ${route} kept ${texts.length} JSON-LD block(s) inert and valid`);
    }
  } finally {
    await page.close();
  }
}

async function exerciseTemporaryCopy(copyRoot) {
  let browser;
  let server;
  try {
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
    await proveRawControl(browser);

    await writeFile(path.join(copyRoot, 'src/data/events.generated.ts'), fixtureSource(), 'utf8');
    await runCommand(process.execPath, ['/usr/bin/npm', 'run', 'build'], {
      cwd: copyRoot,
      env: { ...process.env, CONTEXT: 'production', URL: 'https://www.sisiwroclaw.pl' },
    });
    console.log('PASS temporary hostile-event production build completed');

    const port = await reserveLoopbackPort();
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
      cwd: copyRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const serverOutput = capture(server);
    await waitForServer(origin, server, serverOutput);
    await verifyRoutes(browser, origin);
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await stopChild(server);
    }
  }
}

async function main() {
  const originalEvents = await readFile(EVENTS_FILE, 'utf8');
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'sisi-security-browser-'));
  const copyRoot = path.join(temporaryRoot, 'repository');
  let failure;

  try {
    await copyRepository(copyRoot);
    await exerciseTemporaryCopy(copyRoot);
  } catch (error) {
    failure = error;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  assert.equal(await readFile(EVENTS_FILE, 'utf8'), originalEvents, 'the real generated event source changed');
  await assert.rejects(stat(temporaryRoot), { code: 'ENOENT' });
  if (failure) throw failure;
  console.log('PASS real event source unchanged and temporary repository removed');
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
