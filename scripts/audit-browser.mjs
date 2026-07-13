import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4321';
const CHROME_PATH = '/usr/bin/google-chrome';
const VIEWPORT_WIDTHS = [320, 390, 1440];
const MAX_INTERNAL_REDIRECTS = 10;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
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
  sitemapRedirectsFollowed: 0,
  expectedPageChecks: 0,
  pageChecksStarted: 0,
  pageChecksCompleted: 0,
  routeInitial2xxChecks: 0,
  routeFinal2xxChecks: 0,
  route2xxChecks: 0,
  browserRedirectsFollowed: 0,
  browserRedirectsRejected: 0,
  axeRuns: 0,
  overflowChecks: 0,
  assetPageChecks: 0,
  assetCoveredPageChecks: 0,
  sameOriginAssetRequests: 0,
  sameOriginAssetResponses: 0,
  sameOriginAssetTerminalOutcomes: 0,
  sameOriginAssetMediaReadyResponses: 0,
  sameOriginAssetPending: 0,
  sameOriginAssetFailures: 0,
  assetCorrelationFailures: 0,
  internalLinkOccurrences: 0,
  internalLinksChecked: 0,
  internalFragmentsChecked: 0,
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

function failAudit(type, details, message) {
  addFailure(type, details);
  throw new Error(message);
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

function mappedAuditedUrl(value, canonicalOrigins) {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (!isAuditedOrigin(url, canonicalOrigins)) return null;
  const mapped = mapOntoBase(url, canonicalOrigins);
  mapped.hash = '';
  return mapped;
}

function requestRedirectChain(request) {
  const chain = [];
  let current = request;
  while (current) {
    chain.unshift(current);
    current = current.redirectedFrom();
  }
  return chain;
}

function visibleRequestChain(request) {
  return requestRedirectChain(request).map((entry) => ({
    url: entry.url(),
    resourceType: entry.resourceType(),
  }));
}

async function fetchSitemapXml() {
  let current = new URL(sitemapUrl);
  const redirects = [];

  for (let redirectCount = 0; redirectCount <= MAX_INTERNAL_REDIRECTS; redirectCount += 1) {
    let response;
    try {
      response = await fetch(current, {
        headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' },
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      failAudit(
        'sitemap-fetch',
        { url: current.href, reason: 'fetch-error', error: errorMessage(error), redirects },
        `${current.href} sitemap fetch failed: ${errorMessage(error)}`,
      );
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        if (response.body) await response.body.cancel();
        failAudit(
          'sitemap-redirect',
          { status: response.status, fromUrl: current.href, reason: 'redirect-without-location', redirects },
          `${current.href} returned ${response.status} without Location`,
        );
      }

      const redirectTarget = new URL(location, current);
      if (redirectTarget.origin !== baseUrl.origin) {
        if (response.body) await response.body.cancel();
        failAudit(
          'sitemap-redirect',
          {
            status: response.status,
            fromUrl: current.href,
            location,
            redirectTarget: redirectTarget.href,
            reason: 'unaudited-redirect-origin',
            redirects,
          },
          `${current.href} redirected sitemap outside BASE_URL to ${redirectTarget.href}`,
        );
      }

      const redirect = {
        status: response.status,
        from: current.href,
        location,
        target: redirectTarget.href,
      };
      if (response.body) await response.body.cancel();
      if (redirectCount === MAX_INTERNAL_REDIRECTS) {
        failAudit(
          'sitemap-redirect',
          {
            status: response.status,
            fromUrl: current.href,
            location,
            redirectTarget: redirectTarget.href,
            reason: 'redirect-limit',
            redirects: [...redirects, redirect],
          },
          `${sitemapUrl.href} exceeded ${MAX_INTERNAL_REDIRECTS} redirects`,
        );
      }
      redirects.push(redirect);
      summary.sitemapRedirectsFollowed += 1;
      current = redirectTarget;
      continue;
    }

    if (!response.ok) {
      if (response.body) await response.body.cancel();
      failAudit(
        'sitemap-response',
        { url: current.href, status: response.status, reason: 'http-status', redirects },
        `${current.href} returned ${response.status}`,
      );
    }
    return response.text();
  }

  throw new Error('sitemap redirect loop escaped its bound');
}

function visibleLinkResult(result) {
  const { body: _body, contentType: _contentType, fragmentOverride: _fragmentOverride, ...visible } = result;
  return visible;
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
    const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
    const sweepPage = async () => {
      const maxScroll = Math.max(0, scrollRoot.scrollHeight - window.innerHeight);
      for (let y = 0; y <= maxScroll; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      window.scrollTo(0, maxScroll);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    };
    await sweepPage();

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
    await sweepPage();
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const activeFiniteAnimations = () => document
      .getAnimations()
      .filter((animation) => {
        const { endTime } = animation.effect?.getComputedTiming() || {};
        return !['finished', 'idle'].includes(animation.playState) && Number.isFinite(endTime);
      });
    const animationDeadline = performance.now() + 5_000;
    const quietWindow = 150;
    let quietSince = null;
    while (performance.now() < animationDeadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const active = activeFiniteAnimations();
      if (active.length === 0) {
        if (quietSince === null) quietSince = performance.now();
        if (performance.now() - quietSince >= quietWindow) break;
        continue;
      }
      quietSince = null;
      await Promise.race([
        Promise.all(active.map((animation) => animation.finished.catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 50)),
      ]);
    }
    const animationsReady = activeFiniteAnimations().length === 0 &&
      quietSince !== null && performance.now() - quietSince >= quietWindow;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { imagesReady, animationsReady };
  });
}

async function captureMediaEvidence(page) {
  if (page.isClosed()) return [];
  return page.locator('video[src], audio[src]').evaluateAll((elements) =>
    elements.map((element) => ({
      currentSrc: element.currentSrc || element.src,
      readyState: element.readyState,
      networkState: element.networkState,
      error: element.error ? { code: element.error.code, message: element.error.message } : null,
    })),
  );
}

function addReadyMediaTerminals(records, mediaEvidence, canonicalOrigins) {
  const evidenceByUrl = new Map();
  for (const evidence of mediaEvidence) {
    const mapped = mappedAuditedUrl(evidence.currentSrc, canonicalOrigins);
    if (mapped) evidenceByUrl.set(mapped.href, evidence);
  }

  for (const record of records.values()) {
    if (record.resourceType !== 'media' || record.terminalEvents.length !== 0) continue;
    if (record.responseStatuses.length !== 1) continue;
    const [status] = record.responseStatuses;
    if (status < 200 || status >= 400) continue;
    const mapped = mappedAuditedUrl(record.assetUrl, canonicalOrigins);
    const evidence = mapped ? evidenceByUrl.get(mapped.href) : null;
    if (!evidence || evidence.error || evidence.readyState < 2) continue;
    record.terminalEvents.push({
      type: 'media-ready-response',
      currentSrc: evidence.currentSrc,
      readyState: evidence.readyState,
      networkState: evidence.networkState,
      responseStatus: status,
    });
  }
}

function finalizePageAssets(records, eventFailures, url, width) {
  summary.assetPageChecks += 1;
  if (records.size > 0) {
    summary.assetCoveredPageChecks += 1;
  } else {
    addFailure('asset-coverage', {
      url,
      width,
      message: `${url} ${width}px observed no audited same-origin asset requests`,
    });
  }

  let terminalOutcomes = 0;
  let pending = 0;
  for (const record of records.values()) {
    summary.sameOriginAssetRequests += 1;
    summary.sameOriginAssetResponses += record.responseStatuses.length;
    terminalOutcomes += record.terminalEvents.length;
    if (record.terminalEvents.length === 0) pending += 1;

    let failed = false;
    if (record.terminalEvents.length !== 1) {
      failed = true;
      summary.assetCorrelationFailures += 1;
      addFailure('asset-correlation', {
        url,
        width,
        assetUrl: record.assetUrl,
        resourceType: record.resourceType,
        reason: record.terminalEvents.length === 0 ? 'missing-terminal-outcome' : 'multiple-terminal-outcomes',
        terminalOutcomes: record.terminalEvents.length,
      });
    }

    if (record.responseStatuses.length > 1) {
      failed = true;
      summary.assetCorrelationFailures += 1;
      addFailure('asset-correlation', {
        url,
        width,
        assetUrl: record.assetUrl,
        resourceType: record.resourceType,
        reason: 'multiple-responses-for-request',
        responseStatuses: record.responseStatuses,
      });
    }

    const terminal = record.terminalEvents[0];
    if (terminal?.type === 'media-ready-response') {
      summary.sameOriginAssetMediaReadyResponses += 1;
    }
    if (terminal?.type === 'finished' && record.responseStatuses.length !== 1) {
      failed = true;
      summary.assetCorrelationFailures += 1;
      addFailure('asset-correlation', {
        url,
        width,
        assetUrl: record.assetUrl,
        resourceType: record.resourceType,
        reason: 'finished-request-without-one-response',
        responseStatuses: record.responseStatuses,
      });
    }

    if (terminal?.type === 'failed') {
      failed = true;
      addFailure('asset-request', {
        url,
        width,
        assetUrl: record.assetUrl,
        resourceType: record.resourceType,
        terminal: 'failed',
        error: terminal.error,
      });
    }

    const failedStatuses = record.responseStatuses.filter((status) => status < 200 || status >= 400);
    if (failedStatuses.length > 0) {
      failed = true;
      addFailure('asset-response', {
        url,
        width,
        assetUrl: record.assetUrl,
        resourceType: record.resourceType,
        statuses: failedStatuses,
      });
    }

    if (failed) summary.sameOriginAssetFailures += 1;
  }

  summary.sameOriginAssetTerminalOutcomes += terminalOutcomes;
  summary.sameOriginAssetPending += pending;
  for (const failure of eventFailures) {
    summary.assetCorrelationFailures += 1;
    addFailure('asset-correlation', { url, width, ...failure });
  }

  if (terminalOutcomes !== records.size || pending !== 0) {
    addFailure('asset-correlation', {
      url,
      width,
      reason: 'page-terminal-accounting-mismatch',
      requests: records.size,
      terminalOutcomes,
      pending,
    });
  }
}

async function audit() {
  assert.match(baseUrl.protocol, /^https?:$/, 'BASE_URL must use http or https');

  const locations = sitemapLocations(await fetchSitemapXml());
  assert.ok(locations.length > 0, `${sitemapUrl.href} contains no <loc> entries`);
  assert.equal(new Set(locations).size, locations.length, 'sitemap contains duplicate <loc> entries');

  const canonicalOrigins = new Set(locations.map((location) => new URL(location).origin));
  assert.equal(canonicalOrigins.size, 1, 'sitemap routes must share one canonical origin');

  summary.sitemapRoutes = locations.length;
  summary.expectedPageChecks = locations.length * VIEWPORT_WIDTHS.length;

  const documentCache = new Map();
  const fragmentCache = new Map();

  const fetchInternalDocument = (url) => {
    const requested = url instanceof URL ? new URL(url) : new URL(url);
    const mappedStart = mappedAuditedUrl(requested, canonicalOrigins);
    const key = mappedStart?.href || requested.href;
    if (!documentCache.has(key)) {
      documentCache.set(
        key,
        (async () => {
          if (!mappedStart) {
            return {
              ok: false,
              status: null,
              finalUrl: null,
              reason: 'unaudited-link-origin',
              target: requested.href,
              redirects: [],
            };
          }

          let logicalUrl = new URL(requested);
          logicalUrl.hash = '';
          let fragmentOverride = null;
          const redirects = [];

          for (let redirectCount = 0; redirectCount <= MAX_INTERNAL_REDIRECTS; redirectCount += 1) {
            const mapped = mappedAuditedUrl(logicalUrl, canonicalOrigins);
            if (!mapped) {
              return {
                ok: false,
                status: null,
                finalUrl: null,
                reason: 'unaudited-link-origin',
                target: logicalUrl.href,
                redirects,
              };
            }

            let response;
            try {
              response = await fetch(mapped, {
                headers: { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
                redirect: 'manual',
                signal: AbortSignal.timeout(10_000),
              });
            } catch (error) {
              return {
                ok: false,
                status: null,
                finalUrl: mapped.href,
                reason: 'fetch-error',
                error: errorMessage(error),
                redirects,
              };
            }

            if (REDIRECT_STATUSES.has(response.status)) {
              const location = response.headers.get('location');
              if (!location) {
                if (response.body) await response.body.cancel();
                return {
                  ok: false,
                  status: response.status,
                  finalUrl: mapped.href,
                  reason: 'redirect-without-location',
                  redirects,
                };
              }

              const redirectTarget = new URL(location, logicalUrl);
              if (location.includes('#')) fragmentOverride = redirectTarget.hash;
              redirectTarget.hash = '';
              if (!isAuditedOrigin(redirectTarget, canonicalOrigins)) {
                if (response.body) await response.body.cancel();
                return {
                  ok: false,
                  status: response.status,
                  finalUrl: mapped.href,
                  reason: 'unaudited-redirect-origin',
                  redirectTarget: redirectTarget.href,
                  redirects,
                };
              }

              const mappedTarget = mappedAuditedUrl(redirectTarget, canonicalOrigins);
              redirects.push({
                status: response.status,
                from: mapped.href,
                location,
                target: mappedTarget.href,
              });
              if (response.body) await response.body.cancel();
              if (redirectCount === MAX_INTERNAL_REDIRECTS) {
                return {
                  ok: false,
                  status: response.status,
                  finalUrl: mapped.href,
                  reason: 'redirect-limit',
                  redirectTarget: redirectTarget.href,
                  redirects,
                };
              }
              logicalUrl = redirectTarget;
              continue;
            }

            const body = await response.text();
            return {
              ok: response.status >= 200 && response.status < 300,
              status: response.status,
              finalUrl: mapped.href,
              reason: response.status >= 200 && response.status < 300 ? null : 'http-status',
              redirects,
              body,
              contentType: response.headers.get('content-type') || '',
              fragmentOverride,
            };
          }

          throw new Error('internal redirect loop escaped its bound');
        })(),
      );
    }
    return documentCache.get(key);
  };

  const checkInternalLink = async (url, page) => {
    const requested = url instanceof URL ? new URL(url) : new URL(url);
    const documentResult = await fetchInternalDocument(requested);
    if (!documentResult.ok) return visibleLinkResult(documentResult);

    const fragment = documentResult.fragmentOverride ?? requested.hash;
    if (!fragment || fragment === '#') return visibleLinkResult(documentResult);

    const fragmentKey = `${documentResult.finalUrl}\n${fragment}`;
    if (!fragmentCache.has(fragmentKey)) {
      fragmentCache.set(
        fragmentKey,
        (async () => {
          let identifier;
          try {
            identifier = decodeURIComponent(fragment.slice(1));
          } catch {
            return { ok: false, reason: 'invalid-fragment-encoding', fragment };
          }
          const exists = await page.evaluate(
            ({ html, identifier: id }) => {
              const parsed = new DOMParser().parseFromString(html, 'text/html');
              return Boolean(
                parsed.getElementById(id) ||
                [...parsed.querySelectorAll('a[name]')].some((anchor) => anchor.getAttribute('name') === id),
              );
            },
            { html: documentResult.body, identifier },
          );
          return {
            ok: exists,
            reason: exists ? null : 'missing-fragment',
            fragment,
          };
        })(),
      );
    }

    const fragmentResult = await fragmentCache.get(fragmentKey);
    return {
      ...visibleLinkResult(documentResult),
      ...fragmentResult,
    };
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
      const auditedRequestChains = new Map();

      await context.route('**/*', async (route) => {
        const request = route.request();
        const requestUrl = new URL(request.url());
        const redirectChain = requestRedirectChain(request);
        const firstAuditedIndex = redirectChain.findIndex((entry) =>
          isAuditedOrigin(entry.url(), canonicalOrigins),
        );
        const isAuditedRequest = isAuditedOrigin(requestUrl, canonicalOrigins);
        const rejectRedirect = async (response, details, chain = visibleRequestChain(request)) => {
          summary.browserRedirectsRejected += 1;
          addFailure('browser-redirect', {
            fromUrl: requestUrl.href,
            resourceType: request.resourceType(),
            redirectDepth: Math.max(0, chain.length - 1),
            chain,
            ...details,
          });
          auditedRequestChains.set(request, chain);
          if (response) await response.dispose();
          await route.abort('blockedbyclient');
        };

        if (!isAuditedRequest) {
          if (firstAuditedIndex !== -1) {
            await rejectRedirect(null, {
              redirectTarget: requestUrl.href,
              reason: 'unaudited-redirect-origin',
            });
            return;
          }
          await route.continue();
          return;
        }

        const browserRedirectDepth = firstAuditedIndex === -1
          ? 0
          : redirectChain.length - firstAuditedIndex - 1;
        if (browserRedirectDepth > MAX_INTERNAL_REDIRECTS) {
          await rejectRedirect(null, {
            redirectTarget: requestUrl.href,
            reason: 'redirect-limit',
          });
          return;
        }

        let logicalUrl = new URL(requestUrl);
        const fetchedChain = [];
        for (let redirectCount = 0; redirectCount <= MAX_INTERNAL_REDIRECTS; redirectCount += 1) {
          const mapped = mapOntoBase(logicalUrl, canonicalOrigins);
          let response;
          try {
            response = await route.fetch({
              url: mapped.href,
              maxRedirects: 0,
              timeout: 10_000,
            });
          } catch (error) {
            auditedRequestChains.set(request, fetchedChain);
            addFailure('browser-request', {
              url: logicalUrl.href,
              mappedUrl: mapped.href,
              resourceType: request.resourceType(),
              reason: 'fetch-error',
              error: errorMessage(error),
              chain: fetchedChain,
            });
            await route.abort('failed');
            return;
          }

          const location = response.headers().location || null;
          const chainEntry = {
            url: mapped.href,
            logicalUrl: logicalUrl.href,
            status: response.status(),
            location,
          };
          fetchedChain.push(chainEntry);

          if (!REDIRECT_STATUSES.has(response.status())) {
            auditedRequestChains.set(request, fetchedChain);
            const exposeMappedTerminalUrl =
              request.method() === 'GET' &&
              ASSET_RESOURCE_TYPES.has(request.resourceType()) &&
              !request.isNavigationRequest() &&
              response.status() >= 200 &&
              response.status() < 300 &&
              fetchedChain.length > 1 &&
              mapped.href !== requestUrl.href;
            if (exposeMappedTerminalUrl) {
              await response.dispose();
              await route.fulfill({
                status: 302,
                headers: { location: mapped.href, 'cache-control': 'no-store' },
                body: '',
              });
              return;
            }
            await route.fulfill({ response });
            return;
          }

          if (!location) {
            await rejectRedirect(response, {
              status: response.status(),
              reason: 'redirect-without-location',
            }, fetchedChain);
            return;
          }

          let redirectTarget;
          try {
            redirectTarget = new URL(location, logicalUrl);
          } catch (error) {
            await rejectRedirect(response, {
              status: response.status(),
              location,
              reason: 'invalid-redirect-location',
              error: errorMessage(error),
            }, fetchedChain);
            return;
          }
          chainEntry.redirectTarget = redirectTarget.href;

          if (!isAuditedOrigin(redirectTarget, canonicalOrigins)) {
            await rejectRedirect(response, {
              status: response.status(),
              location,
              redirectTarget: redirectTarget.href,
              reason: 'unaudited-redirect-origin',
            }, fetchedChain);
            return;
          }

          if (redirectCount === MAX_INTERNAL_REDIRECTS) {
            await rejectRedirect(response, {
              status: response.status(),
              location,
              redirectTarget: redirectTarget.href,
              reason: 'redirect-limit',
            }, fetchedChain);
            return;
          }

          summary.browserRedirectsFollowed += 1;
          await response.dispose();
          logicalUrl = redirectTarget;
        }
      });

      try {
        for (const location of locations) {
          const url = mapOntoBase(new URL(location), canonicalOrigins).href;
          const page = await context.newPage();
          summary.pageChecksStarted += 1;
          let collecting = true;
          const assetRecords = new Map();
          const assetEventFailures = [];
          const navigationResponses = [];
          let mainNavigationRequest = null;

          const isAuditedAsset = (request) =>
            ASSET_RESOURCE_TYPES.has(request.resourceType()) &&
            isAuditedOrigin(request.url(), canonicalOrigins);

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
            if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
              mainNavigationRequest = request;
            }
            if (!isAuditedAsset(request)) return;
            if (assetRecords.has(request)) {
              assetEventFailures.push({
                assetUrl: request.url(),
                resourceType: request.resourceType(),
                reason: 'duplicate-request-event',
              });
              return;
            }
            assetRecords.set(request, {
              assetUrl: request.url(),
              resourceType: request.resourceType(),
              responseStatuses: [],
              terminalEvents: [],
            });
          });
          page.on('response', (response) => {
            const request = response.request();
            if (request.isNavigationRequest() && response.frame() === page.mainFrame()) {
              navigationResponses.push({
                url: response.url(),
                status: response.status(),
                redirectedFrom: request.redirectedFrom()?.url() || null,
              });
            }
            if (!isAuditedAsset(request)) return;
            const record = assetRecords.get(request);
            if (!record) {
              assetEventFailures.push({
                assetUrl: request.url(),
                resourceType: request.resourceType(),
                reason: 'response-without-request-event',
                responseStatus: response.status(),
              });
              return;
            }
            record.responseStatuses.push(response.status());
          });
          const recordTerminal = (request, terminal) => {
            if (!isAuditedAsset(request)) return;
            const record = assetRecords.get(request);
            if (!record) {
              assetEventFailures.push({
                assetUrl: request.url(),
                resourceType: request.resourceType(),
                reason: 'terminal-without-request-event',
                terminal: terminal.type,
              });
              return;
            }
            record.terminalEvents.push(terminal);
          };
          page.on('requestfinished', (request) => {
            recordTerminal(request, { type: 'finished' });
          });
          page.on('requestfailed', (request) => {
            recordTerminal(request, {
              type: 'failed',
              error: request.failure()?.errorText || 'request failed',
            });
          });

          try {
            const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
            assert.ok(response, `${url} ${width}px returned no navigation response`);
            const auditedNavigationChain = auditedRequestChains.get(response.request());
            if (auditedNavigationChain?.length) {
              navigationResponses.splice(0, navigationResponses.length, ...auditedNavigationChain);
            }
            const initialResponse = navigationResponses[0] || null;
            const terminalAuditedResponse = navigationResponses.at(-1) || null;
            const initial2xx = Boolean(
              initialResponse && initialResponse.status >= 200 && initialResponse.status < 300,
            );
            const final2xx = Boolean(
              terminalAuditedResponse &&
              terminalAuditedResponse.status >= 200 &&
              terminalAuditedResponse.status < 300 &&
              response.status() >= 200 &&
              response.status() < 300,
            );
            if (initial2xx) {
              summary.routeInitial2xxChecks += 1;
            } else {
              addFailure('route-initial-response', {
                url,
                width,
                status: initialResponse?.status ?? null,
                chain: navigationResponses,
              });
            }
            if (final2xx) {
              summary.routeFinal2xxChecks += 1;
            } else {
              addFailure('route-final-response', {
                url,
                width,
                status: terminalAuditedResponse?.status ?? response.status(),
                finalUrl: terminalAuditedResponse?.url ?? response.url(),
                chain: navigationResponses,
              });
            }
            assert.ok(initial2xx, `${url} ${width}px initial response was ${initialResponse?.status ?? 'missing'}`);
            assert.ok(final2xx, `${url} ${width}px final response was ${response.status()}`);
            summary.route2xxChecks += 1;

            const settled = await settleRenderedPage(page);
            assert.ok(settled.imagesReady, `${url} ${width}px images did not settle within 10s`);
            assert.ok(settled.animationsReady, `${url} ${width}px finite animations did not settle within 5s`);

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

              const result = await checkInternalLink(target, page);
              if (!result.ok) {
                summary.brokenInternalLinks += 1;
                const failureType = ['missing-fragment', 'invalid-fragment-encoding'].includes(result.reason)
                  ? 'broken-internal-fragment'
                  : 'broken-internal-link';
                addFailure(failureType, {
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
            const auditedNavigationChain = mainNavigationRequest
              ? auditedRequestChains.get(mainNavigationRequest)
              : null;
            if (auditedNavigationChain?.length) {
              navigationResponses.splice(0, navigationResponses.length, ...auditedNavigationChain);
            }
            addFailure('page-check', {
              url,
              width,
              message: errorMessage(error),
              navigationChain: navigationResponses,
            });
          } finally {
            let mediaEvidence = [];
            try {
              mediaEvidence = await captureMediaEvidence(page);
            } catch {
              // Pending media remains a correlation failure unless usable DOM evidence was captured.
            }
            try {
              await page.close();
            } catch (error) {
              addFailure('page-close', { url, width, message: errorMessage(error) });
            } finally {
              collecting = false;
              addReadyMediaTerminals(assetRecords, mediaEvidence, canonicalOrigins);
              finalizePageAssets(assetRecords, assetEventFailures, url, width);
            }
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  summary.internalLinksChecked = documentCache.size;
  summary.internalFragmentsChecked = fragmentCache.size;
  assert.ok(summary.sameOriginAssetRequests > 0, 'audit observed no same-origin asset requests');
  assert.ok(summary.internalLinkOccurrences > 0, 'audit observed no same-origin internal links');
  assert.equal(
    summary.pageChecksCompleted,
    summary.expectedPageChecks,
    'not every sitemap route completed at every viewport',
  );
  assert.equal(summary.routeInitial2xxChecks, summary.expectedPageChecks, 'not every initial route returned 2xx');
  assert.equal(summary.routeFinal2xxChecks, summary.expectedPageChecks, 'not every final route returned 2xx');
  assert.equal(summary.route2xxChecks, summary.expectedPageChecks, 'not every route remained 2xx');
  assert.equal(summary.axeRuns, summary.expectedPageChecks, 'not every route completed an axe run');
  assert.equal(summary.overflowChecks, summary.expectedPageChecks, 'not every route completed an overflow check');
  assert.equal(summary.assetPageChecks, summary.expectedPageChecks, 'not every route completed an asset check');
  assert.equal(summary.assetCoveredPageChecks, summary.expectedPageChecks, 'one or more page checks observed no assets');
  assert.equal(
    summary.sameOriginAssetRequests,
    summary.sameOriginAssetTerminalOutcomes,
    'audited asset requests did not have exactly one terminal outcome',
  );
  assert.equal(summary.sameOriginAssetPending, 0, 'audited asset requests remained pending after page teardown');
}

try {
  await audit();
} catch (error) {
  addFailure('audit-fatal', { message: errorMessage(error) });
}

summary.ok = summary.failures.length === 0;
console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exitCode = 1;
