/**
 * backdrop-fps — frame-rate / frame-cost benchmark for the animated backdrop
 * (src/components/Particles.astro) in Chromium, across desktop window sizes.
 *
 * For every page × viewport it loads the built site, waits for the backdrop
 * to go live, then measures a fixed window (default 3 s):
 *   - displayed fps: frames the display compositor actually drew and swapped
 *     to the screen, counted from viz `Display::FrameDisplayed` trace events
 *     in the GPU process. This is the headline number, and the only one that
 *     sees every source of motion: the page's own compositor frames AND the
 *     backdrop's OffscreenCanvas, which a worker submits as its own surface.
 *     requestAnimationFrame is NOT a proxy for it: with the frame-rate limit
 *     removed the main thread happily reports 500+ rAF/s while the compositor
 *     presents a few dozen frames and drops the rest.
 *   - passes/frame: viz render passes per displayed frame. One is the page;
 *     every extra pass is a backdrop-filter (glass) surface that had to be
 *     read back and blurred because something behind it changed. This is the
 *     remaining per-frame cost of animating anything under the glass panels.
 *   - page presented / dropped fps: the renderer's own `PipelineReporter`
 *     frames in STATE_PRESENTED_* / STATE_DROPPED. These count only frames the
 *     page's main-thread/compositor pipeline produced, so a worker-driven
 *     canvas on an otherwise static page barely registers here; dropped fps
 *     is still a direct measure of missing headroom for page-driven motion.
 *   - main busy % / script %: main-thread TaskDuration / ScriptDuration deltas
 *     (Performance domain) as a share of the window.
 *   - rAF fps: main-thread animation-frame rate, for reference only.
 *   - layers: compositor layers (drawing / total), drawn area as a multiple of
 *     the viewport, and the number of layers covering >= 90 % of the window —
 *     each one is a full-window texture the compositor must blend every frame.
 *
 * Sandbox caveat: headless Chromium in a GPU-less container composites in
 * software (SwiftShader), so the absolute fps printed here is a LOWER BOUND.
 * Real GPUs composite the same layer tree far faster. What transfers to real
 * machines is the relative ranking between variants, the per-frame main-thread
 * cost, and the layer counts / drawn area (that is what a GPU has to fill per
 * frame). Headless runs are uncapped by default so the sandbox reports raw
 * throughput instead of a synthetic 60 Hz ceiling.
 *
 * To measure against a real display, run headed on a desktop with a GPU. The
 * default headed run keeps vsync, so displayed fps should sit at the monitor's
 * refresh rate (60 / 144 / 240) with dropped fps near 0; add --uncapped to see
 * how far above the refresh rate the compositor could go.
 *   macOS:   node scripts/backdrop-fps.mjs --headed \
 *              --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
 *   Windows: node scripts/backdrop-fps.mjs --headed \
 *              --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
 *
 * Usage: node scripts/backdrop-fps.mjs [--dist dir] [--pages /pl/,/pl/menu/]
 *   [--viewports 1920x1080,2560x1440@1.5,3840x2160] [--seconds 3] [--headed]
 *   [--chrome path] [--uncapped | --no-uncapped] [--gpu] [--label name]
 *   [--json out.json] [--assert-fps N]
 * Needs a built site (npm run build) or --dist pointing at one. Progress goes
 * to stderr, the markdown table to stdout.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { createDistServer } from './serve-dist.mjs';

const DEFAULT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const DEFAULT_PAGES = '/pl/,/pl/menu/';
const DEFAULT_VIEWPORTS = '1920x1080,2560x1440,3840x2160';
const DEFAULT_SECONDS = 3;
const PLAYWRIGHT_CHROMIUM = '/opt/pw-browsers/chromium';
const CHROME_PATH = '/usr/bin/google-chrome';
const BACKDROP_TIMEOUT_MS = 10_000;
const WARMUP_MS = 800;
const REFRESH_PROBE_MS = 1500;
const FULL_WINDOW_SHARE = 0.9;
const TRACE_CATEGORIES = ['cc', 'benchmark', 'viz', 'disabled-by-default-devtools.timeline.frame'];
const DISPLAYED_EVENT = 'Display::FrameDisplayed';
const RENDER_PASS_EVENT = 'DirectRenderer::DrawRenderPass';
const FRAME_STATES = new Map([
  ['STATE_PRESENTED_ALL', 'presentedAll'],
  ['STATE_PRESENTED_PARTIAL', 'presentedPartial'],
  ['STATE_DROPPED', 'dropped'],
  ['STATE_NO_UPDATE_DESIRED', 'noUpdateDesired'],
]);
const VALUE_FLAGS = new Set(['dist', 'pages', 'viewports', 'seconds', 'chrome', 'label', 'json', 'assert-fps']);
const BOOLEAN_FLAGS = new Set(['headed', 'uncapped', 'gpu', 'help']);
const COLUMNS = [
  ['label', (row) => row.label],
  ['page', (row) => (row.gate === 'timeout' ? `${row.page} (backdrop gate timed out)` : row.page)],
  ['viewport', (row) => row.viewport],
  ['displayed fps', (row) => (row.error ? `error: ${row.error}` : fixed(row.displayedFps, 1))],
  ['passes/frame', (row) => fixed(row.passesPerFrame, 1)],
  ['page presented fps', (row) => fixed(row.presentedFps, 1)],
  ['dropped fps', (row) => fixed(row.droppedFps, 1)],
  ['main busy %', (row) => fixed(row.mainThreadBusyPct, 1)],
  ['script %', (row) => fixed(row.scriptPct, 1)],
  ['rAF fps', (row) => fixed(row.rafFps, 1)],
  ['layers (drawing/total)', (row) => (row.error ? '—' : `${row.layersDrawing}/${row.layersTotal}`)],
  ['drawn area (×viewport)', (row) => fixed(row.drawnAreaViewports, 2)],
  ['full-window layers', (row) => (row.error ? '—' : String(row.fullWindowLayers))],
];

function usage() {
  return [
    'Usage: node scripts/backdrop-fps.mjs [options]',
    `  --dist <dir>         built site to serve (default: ${DEFAULT_DIST})`,
    `  --pages a,b          paths to measure (default: ${DEFAULT_PAGES})`,
    `  --viewports list     WxH or WxH@DPR entries (default: ${DEFAULT_VIEWPORTS})`,
    `  --seconds N          measurement window per cell (default: ${DEFAULT_SECONDS})`,
    '  --headed             visible browser; measures the real display refresh (default: headless)',
    '  --chrome <path>      browser executable (default: playwright chromium, then google-chrome)',
    '  --uncapped           remove the frame-rate limit and vsync (default in headless)',
    '  --no-uncapped        keep vsync / display refresh (default in headed)',
    '  --gpu                software GL path: ANGLE + SwiftShader with GPU rasterization',
    '  --label <name>       label shown in the table (default: basename of --dist)',
    '  --json <file>        write the result rows as JSON',
    '  --assert-fps N       exit 1 if any displayed fps is below N',
  ].join('\n');
}

function parseArguments(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`unexpected argument "${argument}"\n${usage()}`);
    const separator = argument.indexOf('=');
    const name = separator === -1 ? argument.slice(2) : argument.slice(2, separator);
    const inlineValue = separator === -1 ? undefined : argument.slice(separator + 1);
    if (name.startsWith('no-') && BOOLEAN_FLAGS.has(name.slice(3))) {
      flags[name.slice(3)] = false;
    } else if (BOOLEAN_FLAGS.has(name)) {
      flags[name] = inlineValue === undefined ? true : !['false', '0', 'no'].includes(inlineValue);
    } else if (!VALUE_FLAGS.has(name)) {
      throw new Error(`unknown flag --${name}\n${usage()}`);
    } else if (inlineValue !== undefined) {
      flags[name] = inlineValue;
    } else {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
      flags[name] = value;
      index += 1;
    }
  }
  return flags;
}

function splitList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function parseViewport(spec) {
  const match = /^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/i.exec(spec);
  if (!match) throw new Error(`bad viewport "${spec}" (expected WxH or WxH@DPR)`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  const dpr = match[3] ? Number(match[3]) : 1;
  return { width, height, dpr, name: `${width}x${height}@${dpr}` };
}

function parsePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`--${name} must be a positive number`);
  return number;
}

function defaultChrome() {
  return [PLAYWRIGHT_CHROMIUM, CHROME_PATH].find((path) => existsSync(path)) ?? null;
}

function resolveOptions(flags) {
  const dist = resolve(flags.dist ?? DEFAULT_DIST);
  const headed = Boolean(flags.headed);
  return {
    help: Boolean(flags.help),
    dist,
    pages: splitList(flags.pages ?? DEFAULT_PAGES),
    viewports: splitList(flags.viewports ?? DEFAULT_VIEWPORTS).map(parseViewport),
    seconds: parsePositive(flags.seconds ?? DEFAULT_SECONDS, 'seconds'),
    headed,
    uncapped: flags.uncapped ?? !headed,
    gpu: Boolean(flags.gpu),
    chrome: flags.chrome ?? defaultChrome(),
    label: flags.label ?? basename(dist),
    json: flags.json ? resolve(flags.json) : null,
    assertFps: flags['assert-fps'] === undefined ? null : parsePositive(flags['assert-fps'], 'assert-fps'),
  };
}

function launchArguments({ headed, uncapped, gpu }) {
  const args = [];
  if (!headed) args.push('--no-sandbox', '--disable-dev-shm-usage');
  if (uncapped) args.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
  if (gpu) args.push('--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization');
  return args;
}

function log(message) {
  console.error(message);
}

function fixed(value, digits) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

function metric(metrics, name) {
  return metrics.metrics.find((entry) => entry.name === name)?.value ?? 0;
}

async function describeGpu(browser) {
  try {
    const session = await browser.newBrowserCDPSession();
    try {
      const { gpu } = await session.send('SystemInfo.getInfo');
      const aux = gpu?.auxAttributes ?? {};
      const device = gpu?.devices?.[0] ?? {};
      const renderer = aux.glRenderer || aux.gl_renderer || device.deviceString || 'unknown renderer';
      const vendor = aux.glVendor || aux.gl_vendor || device.vendorString || '';
      const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(`${renderer} ${vendor}`);
      return `gpu: ${renderer}${vendor ? ` / ${vendor}` : ''} — ${software ? 'software rendering' : 'hardware'}`;
    } finally {
      await session.detach();
    }
  } catch {
    return 'gpu: unknown';
  }
}

function countAnimationFrames(page, durationMs) {
  return page.evaluate((limitMs) => new Promise((done) => {
    let frames = 0;
    const start = performance.now();
    const tick = () => {
      frames += 1;
      if (performance.now() - start < limitMs) requestAnimationFrame(tick);
      else done({ frames, elapsedMs: performance.now() - start });
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

async function measureRefreshReference(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('about:blank');
    const raf = await countAnimationFrames(page, REFRESH_PROBE_MS);
    return (raf.frames / raf.elapsedMs) * 1000;
  } finally {
    await context.close();
  }
}

async function waitForBackdrop(page) {
  try {
    await page.waitForFunction(
      () => document.querySelector('.circles')?.dataset.backdrop === 'live'
        || document.documentElement.classList.contains('bg-live'),
      null,
      { timeout: BACKDROP_TIMEOUT_MS },
    );
    return 'live';
  } catch {
    return 'timeout';
  }
}

/** Collects displayed-frame and render-pass counts from viz, PipelineReporter
    begin events (one per page compositor frame) and process names. */
function collectTrace(cdp) {
  const frames = [];
  const processNames = new Map();
  let displayed = 0;
  let renderPasses = 0;
  const onData = ({ value }) => {
    for (const event of value) {
      if (event.ph === 'M' && event.name === 'process_name') {
        processNames.set(event.pid, event.args?.name);
      } else if (event.name === 'PipelineReporter' && event.ph === 'b') {
        frames.push({ pid: event.pid, state: event.args?.frame_reporter?.state });
      } else if (event.name === DISPLAYED_EVENT && event.ph !== 'E') {
        displayed += 1;
      } else if (event.name === RENDER_PASS_EVENT && event.ph !== 'E') {
        renderPasses += 1;
      }
    }
  };
  cdp.on('Tracing.dataCollected', onData);
  const complete = new Promise((done) => cdp.once('Tracing.tracingComplete', done));
  return {
    async stop() {
      await cdp.send('Tracing.end');
      await complete;
      cdp.off('Tracing.dataCollected', onData);
      return { frames, processNames, displayed, renderPasses };
    },
  };
}

/** Frame counts per state, restricted to renderer processes when the trace names them. */
function countFrameStates(frames, processNames) {
  const renderers = new Set([...processNames].filter(([, name]) => name === 'Renderer').map(([pid]) => pid));
  const own = renderers.size ? frames.filter((frame) => renderers.has(frame.pid)) : frames;
  const counts = { presentedAll: 0, presentedPartial: 0, dropped: 0, noUpdateDesired: 0, other: 0 };
  for (const { state } of own) counts[FRAME_STATES.get(state) ?? 'other'] += 1;
  return counts;
}

function layerStats(layers, { width, height }) {
  const viewportArea = width * height;
  const drawing = layers.filter((layer) => layer.drawsContent);
  const drawnArea = drawing.reduce((sum, layer) => sum + layer.width * layer.height, 0);
  const fullWindow = drawing.filter((layer) => layer.width * layer.height >= viewportArea * FULL_WINDOW_SHARE);
  return {
    layersTotal: layers.length,
    layersDrawing: drawing.length,
    drawnAreaViewports: round(drawnArea / viewportArea, 2),
    fullWindowLayers: fullWindow.length,
    fullWindowLayerSizes: fullWindow.map((layer) => `${layer.width}x${layer.height}`),
  };
}

async function measureCell({ browser, origin, pagePath, viewport, seconds }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
  });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    let layers = [];
    cdp.on('LayerTree.layerTreeDidChange', (event) => {
      if (event.layers) layers = event.layers;
    });
    await cdp.send('LayerTree.enable');
    await page.goto(new URL(pagePath, origin).href, { waitUntil: 'load' });
    const gate = await waitForBackdrop(page);
    await page.waitForTimeout(WARMUP_MS);

    const trace = collectTrace(cdp);
    await cdp.send('Tracing.start', {
      traceConfig: { includedCategories: TRACE_CATEGORIES, excludedCategories: ['*'] },
      transferMode: 'ReportEvents',
    });
    const startedAt = performance.now();
    const before = await cdp.send('Performance.getMetrics');
    const raf = await countAnimationFrames(page, seconds * 1000);
    const after = await cdp.send('Performance.getMetrics');
    const windowSeconds = (performance.now() - startedAt) / 1000;
    const { frames, processNames, displayed, renderPasses } = await trace.stop();

    const states = countFrameStates(frames, processNames);
    const taskSeconds = metric(after, 'TaskDuration') - metric(before, 'TaskDuration');
    const scriptSeconds = metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration');
    return {
      gate,
      windowMs: round(windowSeconds * 1000, 0),
      displayedFps: round(displayed / windowSeconds, 1),
      passesPerFrame: displayed ? round(renderPasses / displayed, 1) : NaN,
      presentedFps: round((states.presentedAll + states.presentedPartial) / windowSeconds, 1),
      droppedFps: round(states.dropped / windowSeconds, 1),
      frames: states,
      mainThreadBusyPct: round((taskSeconds / windowSeconds) * 100, 1),
      scriptPct: round((scriptSeconds / windowSeconds) * 100, 1),
      rafFps: round((raf.frames / raf.elapsedMs) * 1000, 1),
      ...layerStats(layers, viewport),
    };
  } finally {
    await context.close();
  }
}

function renderTable(rows) {
  const cells = [COLUMNS.map(([name]) => name), ...rows.map((row) => COLUMNS.map(([, cell]) => cell(row)))];
  const widths = COLUMNS.map((_, column) => Math.max(...cells.map((line) => line[column].length)));
  const line = (values) => `| ${values.map((value, column) => value.padEnd(widths[column])).join(' | ')} |`;
  const rule = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;
  return [line(cells[0]), rule, ...cells.slice(1).map(line)].join('\n');
}

async function main() {
  const options = resolveOptions(parseArguments(process.argv.slice(2)));
  if (options.help) {
    console.log(usage());
    return 0;
  }

  const server = createDistServer({ dist: options.dist });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  log(`serving ${options.dist} at ${origin}`);

  const launch = { headless: !options.headed, args: launchArguments(options) };
  if (options.chrome) launch.executablePath = options.chrome;
  const browser = await chromium.launch(launch);
  const rows = [];
  try {
    const mode = [
      options.headed ? 'headed' : 'headless',
      options.uncapped ? 'uncapped' : 'vsync',
      options.gpu ? 'swiftshader gl' : null,
    ].filter(Boolean).join(', ');
    log(`chromium ${browser.version()} at ${options.chrome ?? '(playwright default)'} — ${mode}`);
    log(await describeGpu(browser));
    if (options.headed) {
      const refresh = await measureRefreshReference(browser);
      log(`display refresh reference (about:blank rAF, ${REFRESH_PROBE_MS} ms): ${fixed(refresh, 1)} fps`);
    }
    for (const viewport of options.viewports) {
      for (const pagePath of options.pages) {
        const { name, ...size } = viewport;
        const row = { label: options.label, page: pagePath, viewport: name, ...size };
        log(`measuring ${name} ${pagePath} for ${options.seconds} s ...`);
        try {
          Object.assign(row, await measureCell({ browser, origin, pagePath, viewport, seconds: options.seconds }));
        } catch (error) {
          row.error = error.message.split('\n')[0];
          log(`  failed: ${row.error}`);
        }
        rows.push(row);
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    server.close();
  }

  console.log(renderTable(rows));
  if (options.json) {
    writeFileSync(options.json, `${JSON.stringify(rows, null, 2)}\n`);
    log(`wrote ${options.json}`);
  }
  if (options.assertFps === null) return 0;
  const failing = rows.filter((row) => row.error || row.displayedFps < options.assertFps);
  if (failing.length) {
    log(`FAIL: ${failing.length} of ${rows.length} cells displayed below ${options.assertFps} fps or errored`);
    return 1;
  }
  log(`OK: every cell displayed at least ${options.assertFps} fps`);
  return 0;
}

process.exitCode = await main();
