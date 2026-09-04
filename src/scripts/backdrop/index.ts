/*
 * Backdrop bootstrap (main thread). Particles.astro renders the field as static
 * CSS tiles for first paint; this script adds one <canvas> over them, hands it
 * to a Web Worker (worker.ts) and, once the page has loaded and gone idle,
 * lets the field drift.
 *
 * Responsibilities, all cheap and all off the frame path:
 *   - pick the driver: OffscreenCanvas in a worker where supported (Chrome,
 *     Edge, Firefox, Safari 16.4+), otherwise the same renderer on the main
 *     thread; if the worker fails to load or reports itself unsupported, fall
 *     back to the main thread with a fresh canvas
 *   - gate motion behind load + idle so it never inflates Speed Index
 *   - pause while the tab is hidden, and honour prefers-reduced-motion (the
 *     static tiles stay, the canvas is never created, unless the preference
 *     changes later)
 *   - follow window and device-pixel-ratio changes, debounced
 *   - publish the state on the host as data-backdrop: tiles (static CSS),
 *     paused (canvas drawn, no motion) or live (drifting) - the CSS cross-fades
 *     tiles -> canvas on the first change, and the perf harness waits on live
 */
import type { WorkerMessage, WorkerReply } from './worker';
import { createField, createLoop, type Loop } from './field';

type Size = { width: number; height: number; dpr: number };

const host = document.querySelector<HTMLElement>('.circles[data-backdrop]');
if (host) setup(host);

function setup(host: HTMLElement): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let loop: Loop | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let booted = false;
  let gateOpen = false;
  let current: Size = measure();

  function measure(): Size {
    return {
      width: host.clientWidth || window.innerWidth,
      height: host.clientHeight || window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    };
  }

  function apply(): void {
    if (!loop) return;
    if (booted && gateOpen && !reduce.matches && !document.hidden) {
      loop.play();
      host.dataset.backdrop = 'live';
    } else {
      loop.pause();
      host.dataset.backdrop = 'paused';
    }
  }

  function newCanvas(): HTMLCanvasElement {
    canvas?.remove();
    canvas = document.createElement('canvas');
    host.append(canvas);
    return canvas;
  }

  function mainThread(): void {
    const target = newCanvas();
    const ctx = target.getContext('2d');
    if (!ctx) {
      // no 2D canvas at all: the static tiles simply stay
      target.remove();
      return;
    }
    const field = createField(target, ctx, (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    });
    loop = createLoop(field, (cb) => window.requestAnimationFrame(cb), (h) => window.cancelAnimationFrame(h));
    loop.resize(current.width, current.height, current.dpr);
    apply();
  }

  function worker(): boolean {
    const target = newCanvas();
    if (typeof Worker !== 'function' || typeof target.transferControlToOffscreen !== 'function') return false;
    let thread: Worker;
    let offscreen: OffscreenCanvas;
    try {
      thread = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return false;
    }
    try {
      offscreen = target.transferControlToOffscreen();
    } catch {
      thread.terminate();
      return false;
    }
    const post = (message: WorkerMessage, transfer?: Transferable[]) => {
      if (transfer) thread.postMessage(message, transfer);
      else thread.postMessage(message);
    };
    const sent = current;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      thread.terminate();
      loop = undefined;
      mainThread();
    };
    // a 404, a CSP refusal or a script error all land here
    thread.onerror = fail;
    thread.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      if (data.type === 'unsupported') {
        fail();
      } else if (data.type === 'ready' && !settled) {
        settled = true;
        loop = {
          play: () => post({ type: 'play' }),
          pause: () => post({ type: 'pause' }),
          resize: (width, height, dpr) => post({ type: 'resize', width, height, dpr }),
        };
        // the window may have changed while the worker was starting up
        if (current !== sent) loop.resize(current.width, current.height, current.dpr);
        apply();
      }
    };
    post({ type: 'init', canvas: offscreen, ...current }, [offscreen]);
    return true;
  }

  function boot(): void {
    if (booted) return;
    booted = true;
    if (!worker()) mainThread();
  }

  /* motion waits for load + idle: the drift is a nicety, never a load cost */
  const openGate = () => {
    gateOpen = true;
    apply();
  };
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(openGate, { timeout: 2000 });
    else window.setTimeout(openGate, 200);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });

  document.addEventListener('visibilitychange', apply);

  const onReduce = () => {
    if (!reduce.matches) boot();
    apply();
  };
  if (typeof reduce.addEventListener === 'function') reduce.addEventListener('change', onReduce);
  else (reduce as unknown as { addListener(listener: () => void): void }).addListener(onReduce);

  /* size and pixel ratio: debounced, and only forwarded when they changed */
  let timer = 0;
  const onResize = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const next = measure();
      if (next.width === current.width && next.height === current.height && next.dpr === current.dpr) return;
      current = next;
      loop?.resize(next.width, next.height, next.dpr);
      watchDpr();
    }, 120);
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(onResize).observe(host);
  else window.addEventListener('resize', onResize);
  // moving the window to a monitor with a different scale fires no resize
  let dprQuery: MediaQueryList | undefined;
  function watchDpr(): void {
    dprQuery?.removeEventListener?.('change', onResize);
    dprQuery = window.matchMedia(`(resolution: ${current.dpr}dppx)`);
    dprQuery.addEventListener?.('change', onResize);
  }
  watchDpr();

  if (!reduce.matches) boot();
}
