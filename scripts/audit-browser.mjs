import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4321';
const CHROME_PATH = '/usr/bin/google-chrome';
const VIEWPORT_WIDTHS = [320, 390, 1440];
const ASSET_RESOURCE_TYPES = new Set([
  'font',
  'image',
  'manifest',
  'media',
  'script',
  'stylesheet',
]);

const baseUrl = new URL(process.env.BASE_URL || DEFAULT_BASE_URL);
const sitemapUrl = new URL('/sitemap.xml', baseUrl);
const summary = {
  ok: false,
  baseUrl: baseUrl.href,
  sitemapUrl: sitemapUrl.href,
  chromePath: CHROME_PATH,
  viewportWidths: VIEWPORT_WIDTHS,
  sitemapRoutes: 0,
  expectedPageChecks: 0,
  pageChecksStarted: 0,
  pageChecksCompleted: 0,
  route2xxChecks: 0,
  axeRuns: 0,
  overflowChecks: 0,
  sameOriginAssetRequests: 0,
  sameOriginAssetResponses: 0,
  sameOriginAssetFailures: 0,
  internalLinkOccurrences: 0,
  internalLinksChecked: 0,
  brokenInternalLinks: 0,
  pageErrors: 0,
  consoleErrors: 0,
  cspViolations: 0,
  seriousCriticalViolations: 0,
  horizontalOverflowFindings: 0,
  failures: [],
};

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function addFailure(type, details = {}) {
  summary.failures.push({ type, ...details });
}

function decodeXmlText(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    decodeXmlText(match[1].trim()),
  );
}

function mapOntoBase(value, canonicalOrigins) {
  const source = value instanceof URL ? value : new URL(value);
  if (source.origin !== baseUrl.origin && !canonicalOrigins.has(source.origin)) {
    return source;
  }

  const mapped = new URL(baseUrl.href);
  mapped.pathname = source.pathname;
  mapped.search = source.search;
  mapped.hash = source.hash;
  return mapped;
}

function isAuditedOrigin(value, canonicalOrigins) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    return url.origin === baseUrl.origin || canonicalOrigins.has(url.origin);
  } catch {
    return false;
  }
}

function axeEvidence(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  }));
}

async function settleRenderedPage(page) {
  return page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';

    const scrollRoot = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
    const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y <= maxScroll; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo(0, maxScroll);

    const imagesReady = await Promise.race([
      Promise.all(
        [...document.images].map(
          (image) =>
            image.complete ||
            new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            }),
        ),
      ).then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]);

    if (document.fonts) await document.fonts.ready;
    window.scrollTo(0, 0);
    const finiteAnimations = document
      .getAnimations()
      .filter((animation) => {
        const { endTime } = animation.effect?.getComputedTiming() || {};
        return animation.playState !== 'idle' && Number.isFinite(endTime);
      });
    await Promise.race([
      Promise.all(finiteAnimations.map((animation) => animation.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { imagesReady };
  });
}

async function audit() {
  assert.match(baseUrl.protocol, /^https?:$/, 'BASE_URL must use http or https');

  const sitemapResponse = await fetch(sitemapUrl, {
    headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' },
  });
  assert.ok(sitemapResponse.ok, `${sitemapUrl.href} returned ${sitemapResponse.status}`);

  const locations = sitemapLocations(await sitemapResponse.text());
  assert.ok(locations.length > 0, `${sitemapUrl.href} contains no <loc> entries`);
  assert.equal(new Set(locations).size, locations.length, 'sitemap contains duplicate <loc> entries');

  const canonicalOrigins = new Set(locations.map((location) => new URL(location).origin));
  assert.equal(canonicalOrigins.size, 1, 'sitemap routes must share one canonical origin');

  summary.sitemapRoutes = locations.length;
  summary.expectedPageChecks = locations.length * VIEWPORT_WIDTHS.length;

  const linkCache = new Map();
  const checkInternalLink = (url) => {
    const mapped = mapOntoBase(url, canonicalOrigins);
    mapped.hash = '';
    const key = mapped.href;
    if (!linkCache.has(key)) {
      linkCache.set(
        key,
        (async () => {
          try {
            const response = await fetch(mapped, {
              headers: { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
              redirect: 'follow',
            });
            if (response.body) await response.body.cancel();
            return {
              ok: response.status >= 200 && response.status < 300,
              status: response.status,
              finalUrl: response.url,
            };
          } catch (error) {
            return { ok: false, status: null, error: errorMessage(error) };
          }
        })(),
      );
    }
    return linkCache.get(key);
  };

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const width of VIEWPORT_WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'no-preference',
      });

      await context.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url());
        if (canonicalOrigins.has(requestUrl.origin) && requestUrl.origin !== baseUrl.origin) {
          const mapped = mapOntoBase(requestUrl, canonicalOrigins);
          try {
            const response = await route.fetch({ url: mapped.href });
            await route.fulfill({ response });
          } catch {
            await route.abort('failed');
          }
          return;
        }
        await route.continue();
      });

      try {
        for (const location of locations) {
          const url = mapOntoBase(new URL(location), canonicalOrigins).href;
          const page = await context.newPage();
          summary.pageChecksStarted += 1;
          let collecting = true;

          await page.addInitScript(() => {
            globalThis.__browserAuditCspViolations = [];
            document.addEventListener(
              'securitypolicyviolation',
              (event) => {
                globalThis.__browserAuditCspViolations.push({
                  blockedURI: event.blockedURI,
                  violatedDirective: event.violatedDirective,
                  effectiveDirective: event.effectiveDirective,
                  sourceFile: event.sourceFile,
                  lineNumber: event.lineNumber,
                  columnNumber: event.columnNumber,
                });
              },
              true,
            );
          });

          page.on('console', (message) => {
            if (!collecting || message.type() !== 'error') return;
            summary.consoleErrors += 1;
            addFailure('console-error', {
              url,
              width,
              message: message.text(),
              location: message.location(),
            });
          });
          page.on('pageerror', (error) => {
            if (!collecting) return;
            summary.pageErrors += 1;
            addFailure('page-error', { url, width, message: errorMessage(error) });
          });
          page.on('request', (request) => {
            if (
              collecting &&
              ASSET_RESOURCE_TYPES.has(request.resourceType()) &&
              isAuditedOrigin(request.url(), canonicalOrigins)
            ) {
              summary.sameOriginAssetRequests += 1;
            }
          });
          page.on('response', (response) => {
            if (!collecting) return;
            const request = response.request();
            if (
              !ASSET_RESOURCE_TYPES.has(request.resourceType()) ||
              !isAuditedOrigin(request.url(), canonicalOrigins)
            ) {
              return;
            }
            summary.sameOriginAssetResponses += 1;
            if (response.status() >= 400 || response.status() < 200) {
              summary.sameOriginAssetFailures += 1;
              addFailure('asset-response', {
                url,
                width,
                assetUrl: request.url(),
                resourceType: request.resourceType(),
                status: response.status(),
              });
            }
          });
          page.on('requestfailed', (request) => {
            if (
              !collecting ||
              !ASSET_RESOURCE_TYPES.has(request.resourceType()) ||
              !isAuditedOrigin(request.url(), canonicalOrigins)
            ) {
              return;
            }
            summary.sameOriginAssetFailures += 1;
            addFailure('asset-request', {
              url,
              width,
              assetUrl: request.url(),
              resourceType: request.resourceType(),
              error: request.failure()?.errorText || 'request failed',
            });
          });

          try {
            const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
            assert.ok(response, `${url} ${width}px returned no navigation response`);
            assert.ok(
              response.status() >= 200 && response.status() < 300,
              `${url} ${width}px returned ${response.status()}`,
            );
            summary.route2xxChecks += 1;

            const settled = await settleRenderedPage(page);
            assert.ok(settled.imagesReady, `${url} ${width}px images did not settle within 10s`);

            const links = await page.locator('a[href]').evaluateAll((anchors) =>
              anchors.map((anchor) => ({
                href: anchor.href,
                rawHref: anchor.getAttribute('href'),
              })),
            );
            for (const link of links) {
              let target;
              try {
                target = new URL(link.href);
              } catch {
                continue;
              }
              if (!isAuditedOrigin(target, canonicalOrigins)) continue;
              summary.internalLinkOccurrences += 1;

              const mappedTarget = mapOntoBase(target, canonicalOrigins);
              const current = new URL(page.url());
              if (
                target.hash.length > 1 &&
                mappedTarget.pathname === current.pathname &&
                mappedTarget.search === current.search
              ) {
                const fragmentExists = await page.evaluate((hash) => {
                  let id;
                  try {
                    id = decodeURIComponent(hash.slice(1));
                  } catch {
                    return false;
                  }
                  return Boolean(document.getElementById(id) || document.getElementsByName(id).length);
                }, target.hash);
                if (!fragmentExists) {
                  summary.brokenInternalLinks += 1;
                  addFailure('broken-internal-fragment', {
                    url,
                    width,
                    href: link.rawHref,
                    target: target.href,
                  });
                }
              }

              const result = await checkInternalLink(target);
              if (!result.ok) {
                summary.brokenInternalLinks += 1;
                addFailure('broken-internal-link', {
                  url,
                  width,
                  href: link.rawHref,
                  target: target.href,
                  ...result,
                });
              }
            }

            const violations = (await new AxeBuilder({ page }).analyze()).violations
              .filter((violation) => ['serious', 'critical'].includes(violation.impact));
            summary.axeRuns += 1;
            summary.seriousCriticalViolations += violations.length;
            try {
              assert.deepEqual(violations, [], `${url} ${width}px axe violations`);
            } catch {
              addFailure('axe', {
                url,
                width,
                message: `${url} ${width}px axe violations`,
                violations: axeEvidence(violations),
              });
            }

            const overflow = await page.evaluate(() => ({
              document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              body: document.body.scrollWidth - document.body.clientWidth,
            }));
            summary.overflowChecks += 1;
            try {
              assert.equal(Math.max(overflow.document, overflow.body), 0, `${url} ${width}px horizontal overflow`);
            } catch (error) {
              summary.horizontalOverflowFindings += 1;
              addFailure('horizontal-overflow', {
                url,
                width,
                message: errorMessage(error),
                overflow,
              });
            }

            const cspViolations = await page.evaluate(
              () => globalThis.__browserAuditCspViolations || [],
            );
            for (const violation of cspViolations) {
              summary.cspViolations += 1;
              addFailure('csp-violation', { url, width, ...violation });
            }

            summary.pageChecksCompleted += 1;
          } catch (error) {
            addFailure('page-check', { url, width, message: errorMessage(error) });
          } finally {
            collecting = false;
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  summary.internalLinksChecked = linkCache.size;
  assert.ok(summary.sameOriginAssetRequests > 0, 'audit observed no same-origin asset requests');
  assert.ok(summary.internalLinkOccurrences > 0, 'audit observed no same-origin internal links');
  assert.equal(
    summary.pageChecksCompleted,
    summary.expectedPageChecks,
    'not every sitemap route completed at every viewport',
  );
  assert.equal(summary.route2xxChecks, summary.expectedPageChecks, 'not every route returned 2xx');
  assert.equal(summary.axeRuns, summary.expectedPageChecks, 'not every route completed an axe run');
  assert.equal(summary.overflowChecks, summary.expectedPageChecks, 'not every route completed an overflow check');
}

try {
  await audit();
} catch (error) {
  addFailure('audit-fatal', { message: errorMessage(error) });
}

summary.ok = summary.failures.length === 0;
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
