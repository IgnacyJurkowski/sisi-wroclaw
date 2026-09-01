import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright-core';

const CHROME_PATH = '/usr/bin/google-chrome';

async function reservePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const address = reservation.address();
  assert.ok(address && typeof address === 'object');
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`preview exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/pl/`, { signal: AbortSignal.timeout(1_000) });
      if (response.body) await response.body.cancel();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('preview did not become ready');
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
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

async function freshContext(browser, options = {}) {
  return browser.newContext(options);
}

async function verifyFreshVisitor(browser, origin) {
  const context = await freshContext(browser);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });

  // Nothing queues ahead of it now that the seasonal notice is retired, so a
  // first-time visitor sees the consent banner straight away - and it stays
  // gone once they have decided.
  const banner = page.locator('#cookie-banner');
  await banner.waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-summer-popup]').count(), 0, 'retired seasonal popup is still rendered');

  await page.locator('[data-consent-decline]').click();
  await banner.waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'load' });
  assert.equal(await banner.isVisible(), false, 'consent banner returned after a decision');
  await context.close();
}

async function verifyConsentChoices(browser, origin) {
  for (const [selector, expected] of [
    ['[data-consent-accept]', 'granted'],
    ['[data-consent-decline]', 'denied'],
  ]) {
    const context = await freshContext(browser);
    const page = await context.newPage();
    await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
    const banner = page.locator('#cookie-banner');
    await banner.waitFor({ state: 'visible' });
    await page.locator(selector).click();
    await banner.waitFor({ state: 'hidden' });
    assert.equal(
      await page.evaluate(() => localStorage.getItem('sisi-analytics-consent')),
      expected,
      `consent decision ${expected} was not persisted`,
    );
    await page.reload({ waitUntil: 'load' });
    assert.equal(await banner.isVisible(), false, `consent banner returned after ${expected}`);
    await context.close();
  }
}

async function verifyNoAnalyticsStorageBeforeConsent(browser, origin) {
  const context = await freshContext(browser);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  await page.waitForTimeout(1_500); // give posthog init time to (wrongly) write
  const state = await page.evaluate(() => ({
    local: Object.keys(localStorage).filter((key) => key.startsWith('ph_')),
    session: Object.keys(sessionStorage).filter((key) => key.startsWith('ph_')),
    cookies: document.cookie,
  }));
  assert.deepEqual(state.local, [], 'posthog wrote localStorage before consent');
  assert.deepEqual(state.session, [], 'posthog wrote sessionStorage before consent');
  assert.equal(/ph_/.test(state.cookies), false, 'posthog wrote a cookie before consent');
  await context.close();
}

async function verifyWithdrawControl(browser, origin) {
  const context = await freshContext(browser);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const banner = page.locator('#cookie-banner');
  await banner.waitFor({ state: 'visible' });
  await page.locator('[data-consent-accept]').click();
  await banner.waitFor({ state: 'hidden' });
  await page.goto(`${origin}/pl/polityka-cookies/`, { waitUntil: 'load' });
  await page.locator('[data-consent-withdraw]').click();
  await page.locator('[data-consent-withdraw-done]').waitFor({ state: 'visible' });
  assert.equal(
    await page.evaluate(() => localStorage.getItem('sisi-analytics-consent')),
    'denied',
    'withdrawal did not store the denied decision',
  );
  assert.deepEqual(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('ph_'))),
    [],
    'posthog identifiers survived withdrawal',
  );
  assert.equal(await page.evaluate(() => /ph_/.test(document.cookie)), false, 'posthog cookie survived withdrawal');
  await context.close();
}

async function verifyStorageDenial(browser, origin) {
  const context = await freshContext(browser);
  await context.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() { throw new Error('storage denied'); },
      });
    }
  });
  const page = await context.newPage();
  await page.goto(`${origin}/en/`, { waitUntil: 'load' });
  // Denied storage must still let the visitor decide; the banner just returns
  // on the next visit because nothing could be remembered.
  const banner = page.locator('#cookie-banner');
  await banner.waitFor({ state: 'visible' });
  await page.locator('[data-consent-decline]').click();
  await banner.waitFor({ state: 'hidden' });
  await context.close();
}

let browser;
let preview;
try {
  const port = await reservePort();
  const origin = `http://127.0.0.1:${port}`;
  preview = spawn(process.execPath, ['scripts/serve-dist.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });
  await waitForServer(origin, preview);
  browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  await verifyFreshVisitor(browser, origin);
  await verifyConsentChoices(browser, origin);
  await verifyNoAnalyticsStorageBeforeConsent(browser, origin);
  await verifyWithdrawControl(browser, origin);
  await verifyStorageDenial(browser, origin);
  console.log('PASS consent and withdrawal notices are disclosed, guarded, and remembered');
} finally {
  if (browser) await browser.close();
  await stop(preview);
}
