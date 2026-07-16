import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright-core';

const CHROME_PATH = '/usr/bin/google-chrome';
const KEY = 'sisi-summer-fri-2026-dismissed';
const BEFORE_CUTOFF = Date.parse('2026-08-28T21:59:00.000Z');
const AT_CUTOFF = Date.parse('2026-08-28T22:00:00.000Z');

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

async function contextAt(browser, nowMs, options = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript((value) => { Date.now = () => value; }, nowMs);
  return context;
}

async function clockPageAt(browser, nowMs) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.clock.install({ time: nowMs - 5_000 });
  await page.clock.pauseAt(nowMs);
  await context.addInitScript(() => {
    const nativeSetItem = Storage.prototype.setItem;
    globalThis.__summerNoticeStorageWrites = [];
    Storage.prototype.setItem = function setItem(key, value) {
      globalThis.__summerNoticeStorageWrites.push([key, value]);
      return nativeSetItem.call(this, key, value);
    };
  });
  return { context, page };
}

async function summerNoticeWrites(page) {
  return page.evaluate((key) => globalThis.__summerNoticeStorageWrites.filter(([storedKey]) => storedKey === key), KEY);
}

async function verifyFreshVisitor(browser, origin) {
  const context = await contextAt(browser, BEFORE_CUTOFF);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const restoreTarget = page.locator('.nav-logo');
  await restoreTarget.focus();
  assert.equal(await restoreTarget.evaluate((element) => document.activeElement === element), true);
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');
  await popup.waitFor({ state: 'visible' });
  assert.equal(await banner.isVisible(), false, 'storage notice stacked under summer popup');
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-popup-focus')), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Zamknij');
  await page.keyboard.press('Escape');
  await popup.waitFor({ state: 'hidden' });
  await banner.waitFor({ state: 'visible' });
  assert.equal(
    await restoreTarget.evaluate((element) => document.activeElement === element),
    true,
    'popup dismissal did not restore the previously focused control',
  );
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), 'dismissed');
  await page.reload({ waitUntil: 'load' });
  assert.equal(await popup.isVisible(), false, 'dismissed popup returned on reload');
  assert.equal(await banner.isVisible(), true, 'storage notice did not resume after dismissal');
  await context.close();
}

async function verifyStorageDenial(browser, origin) {
  const context = await contextAt(browser, BEFORE_CUTOFF);
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
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');
  await popup.waitFor({ state: 'visible' });
  assert.equal(await banner.isVisible(), false, 'storage notice stacked when storage access was denied');
  await page.locator('[data-popup-focus]').click();
  await popup.waitFor({ state: 'hidden' });
  await banner.waitFor({ state: 'visible' });
  await context.close();
}

async function verifyShortViewport(browser, origin) {
  const viewport = { width: 667, height: 240 };
  const context = await contextAt(browser, BEFORE_CUTOFF, { viewport });
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const popup = page.locator('[data-summer-popup]');
  const dialog = popup.getByRole('dialog');
  const close = popup.locator('.sisi-popup-x');
  const confirm = popup.locator('[data-popup-focus]');
  await popup.waitFor({ state: 'visible' });

  const scrollState = await dialog.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  assert.equal(scrollState.overflowY, 'auto', 'short popup dialog is not vertically scrollable');
  assert.ok(scrollState.scrollHeight > scrollState.clientHeight, 'short popup dialog does not expose overflow');

  for (const [name, control] of [['close', close], ['confirmation', confirm]]) {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= viewport.height,
      `${name} control cannot be brought into the short viewport`,
    );
  }
  await context.close();
}

async function verifyDelayedOpenRechecksCutoff(browser, origin) {
  const { context, page } = await clockPageAt(browser, AT_CUTOFF - 1_000);
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');

  assert.equal(await popup.isVisible(), false, 'summer popup opened before its delayed callback');
  assert.equal(await banner.isVisible(), false, 'storage notice appeared before the summer notice resolved');
  await page.clock.setSystemTime(AT_CUTOFF);
  await page.clock.runFor(600);
  assert.equal(await popup.isVisible(), false, 'delayed callback opened stale summer copy after cutoff');
  await banner.waitFor({ state: 'visible' });
  assert.equal(await popup.getAttribute('data-notice-state'), 'resolved');
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
  assert.deepEqual(await summerNoticeWrites(page), []);
  await context.close();
}

async function verifyOpenPopupExpiresAtCutoff(browser, origin) {
  const { context, page } = await clockPageAt(browser, AT_CUTOFF - 1_000);
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  const restoreTarget = page.locator('.nav-logo');
  await restoreTarget.focus();
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');

  await page.clock.runFor(600);
  assert.equal(await popup.isVisible(), true, 'summer popup did not open before cutoff');
  assert.equal(await banner.isVisible(), false, 'storage notice stacked before cutoff');
  await page.clock.runFor(400);
  await popup.waitFor({ state: 'hidden' });
  await banner.waitFor({ state: 'visible' });
  assert.equal(
    await restoreTarget.evaluate((element) => document.activeElement === element),
    true,
    'cutoff dismissal did not restore the previously focused control',
  );
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
  assert.deepEqual(await summerNoticeWrites(page), []);
  await context.close();
}

async function verifyExpiredManualDismissalDoesNotPersist(browser, origin) {
  const { context, page } = await clockPageAt(browser, AT_CUTOFF - 1_000);
  await page.goto(`${origin}/en/`, { waitUntil: 'load' });
  const popup = page.locator('[data-summer-popup]');
  const banner = page.locator('#cookie-banner');

  await page.clock.runFor(600);
  assert.equal(await popup.isVisible(), true, 'summer popup did not open before manual cutoff race');
  await page.clock.setSystemTime(AT_CUTOFF);
  await page.locator('[data-popup-focus]').click();
  await popup.waitFor({ state: 'hidden' });
  await banner.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
  assert.deepEqual(await summerNoticeWrites(page), []);
  await context.close();
}

async function verifyCutoffTransitions(browser, origin) {
  const results = await Promise.allSettled([
    verifyDelayedOpenRechecksCutoff(browser, origin),
    verifyOpenPopupExpiresAtCutoff(browser, origin),
    verifyExpiredManualDismissalDoesNotPersist(browser, origin),
  ]);
  const failures = results.filter(({ status }) => status === 'rejected').map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'summer cutoff transition regressions failed');
}

async function verifyExpiry(browser, origin) {
  const context = await contextAt(browser, AT_CUTOFF);
  const page = await context.newPage();
  await page.goto(`${origin}/pl/`, { waitUntil: 'load' });
  assert.equal(await page.locator('[data-summer-popup]').isVisible(), false);
  await page.locator('#cookie-banner').waitFor({ state: 'visible' });
  await page.evaluate((key) => localStorage.setItem(key, 'dismissed'), KEY);
  await page.reload({ waitUntil: 'load' });
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), KEY), null);
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
  await verifyStorageDenial(browser, origin);
  await verifyShortViewport(browser, origin);
  await verifyCutoffTransitions(browser, origin);
  await verifyExpiry(browser, origin);
  console.log('PASS summer and essential-storage notices are sequenced and time-bounded');
} finally {
  if (browser) await browser.close();
  await stop(preview);
}
