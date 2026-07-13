import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = new URL(process.env.BASE_URL || 'http://127.0.0.1:4321');
const routeUrl = new URL('/en/corporate-events/', baseUrl);
const summary = {
  ok: false,
  routeUrl: routeUrl.href,
  todayIso: null,
  chosenIso: null,
  earlierIso: null,
  activeAfterRangeStart: null,
  expandedAfterRangeStart: null,
  activeAfterEarlierRangeStart: null,
  expandedAfterEarlierRangeStart: null,
  activeAfterEscape: null,
  expandedAfterEscape: null,
  activeAfterOutsideClick: null,
  expandedAfterOutsideClick: null,
};

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Europe/Warsaw',
  });
  const page = await context.newPage();
  const response = await page.goto(routeUrl.href, { waitUntil: 'load' });
  assert.ok(response && response.ok(), `${routeUrl.href} did not return 2xx`);

  const input = page.locator('#b2b-date');
  await page.locator('[data-dp-mode="range"]').click();
  await input.click();
  summary.todayIso = await page.evaluate(() => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  });
  const enabledIsos = await page.locator('[data-iso]:not([disabled])').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('data-iso')).filter(Boolean),
  );
  summary.chosenIso = enabledIsos.findLast((value) => value !== summary.todayIso) || null;
  assert.ok(summary.chosenIso, 'calendar exposed no enabled non-today endpoint');
  summary.earlierIso = enabledIsos.findLast((value) =>
    value !== summary.todayIso && value < summary.chosenIso,
  ) || null;
  assert.ok(summary.earlierIso, 'calendar exposed no earlier non-today endpoint');
  await page.locator(`[data-iso="${summary.chosenIso}"]`).click();

  summary.activeAfterRangeStart = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-iso') || document.activeElement?.id || null,
  );
  summary.expandedAfterRangeStart = await input.getAttribute('aria-expanded');
  await page.locator(`[data-iso="${summary.earlierIso}"]`).click();
  summary.activeAfterEarlierRangeStart = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-iso') || document.activeElement?.id || null,
  );
  summary.expandedAfterEarlierRangeStart = await input.getAttribute('aria-expanded');
  assert.deepEqual(
    {
      firstActive: summary.activeAfterRangeStart,
      firstExpanded: summary.expandedAfterRangeStart,
      earlierActive: summary.activeAfterEarlierRangeStart,
      earlierExpanded: summary.expandedAfterEarlierRangeStart,
    },
    {
      firstActive: summary.chosenIso,
      firstExpanded: 'true',
      earlierActive: summary.earlierIso,
      earlierExpanded: 'true',
    },
  );

  await page.keyboard.press('Escape');
  summary.activeAfterEscape = await page.evaluate(() => document.activeElement?.id || null);
  summary.expandedAfterEscape = await input.getAttribute('aria-expanded');
  assert.equal(summary.activeAfterEscape, 'b2b-date');
  assert.equal(summary.expandedAfterEscape, 'false');

  await input.click();
  await page.locator('#b2b-company').click();
  summary.activeAfterOutsideClick = await page.evaluate(() => document.activeElement?.id || null);
  summary.expandedAfterOutsideClick = await input.getAttribute('aria-expanded');
  assert.equal(summary.activeAfterOutsideClick, 'b2b-company');
  assert.equal(summary.expandedAfterOutsideClick, 'false');

  summary.ok = true;
  await context.close();
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}

console.log(JSON.stringify(summary, null, 2));
