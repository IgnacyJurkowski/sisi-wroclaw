/*
 * Backdrop worker: owns the OffscreenCanvas index.ts transfers to it and draws
 * the particle field there, frame by frame, from its own requestAnimationFrame.
 * Nothing about the field runs on the page's main thread, so scrolling, input
 * and the rest of the site's scripts never queue behind it (and it never
 * queues behind them).
 *
 * Protocol (main -> worker): init {canvas,width,height,dpr}, resize
 * {width,height,dpr}, play, pause. Replies: ready once the first frame is
 * drawn, unsupported if this browser gives workers a canvas but no 2D context
 * or no animation frames - index.ts then draws on the main thread instead.
 */
import { createField, createLoop, type Loop } from './field';

export type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'play' }
  | { type: 'pause' };

export type WorkerReply = { type: 'ready' } | { type: 'unsupported' };

// The DOM lib types `self` as a Window; this is all the worker scope we use.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(reply: WorkerReply): void;
  requestAnimationFrame?: (callback: (now: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

let loop: Loop | undefined;

scope.onmessage = ({ data }) => {
  if (data.type === 'init') {
    const ctx = data.canvas.getContext('2d');
    const raf = scope.requestAnimationFrame;
    const caf = scope.cancelAnimationFrame;
    if (!ctx || typeof raf !== 'function' || typeof caf !== 'function') {
      scope.postMessage({ type: 'unsupported' });
      return;
    }
    const field = createField(data.canvas, ctx, (w, h) => new OffscreenCanvas(w, h));
    loop = createLoop(field, raf, caf);
    loop.resize(data.width, data.height, data.dpr);
    scope.postMessage({ type: 'ready' });
    return;
  }
  if (!loop) return;
  if (data.type === 'resize') loop.resize(data.width, data.height, data.dpr);
  else if (data.type === 'play') loop.play();
  else if (data.type === 'pause') loop.pause();
};
