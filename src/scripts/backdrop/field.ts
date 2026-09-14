/*
 * The particle field behind every page: a few hundred soft cream/gold circles
 * drifting up through the wine. This module is the single model of that field,
 * shared by three consumers:
 *
 *   - Particles.astro, at build time: each layer's tile becomes a static SVG
 *     background. That is what first paint shows, and the whole field for
 *     clients without JS.
 *   - worker.ts, at run time: the same tiles drawn to an OffscreenCanvas from
 *     a Web Worker, so the motion never touches the main thread.
 *   - index.ts's main-thread fallback, for browsers without OffscreenCanvas.
 *
 * One RNG, one seed, one tile per layer. The canvas's first frame is therefore
 * the exact field the static tiles already painted, so the hand-over from CSS
 * to canvas is invisible, and the field is identical on every page and build.
 *
 * Why a canvas: the previous backdrop was eight full-window CSS layers, each
 * animating. Every frame the GPU composited eight window-sized translucent
 * plates, and every glass panel above them (backdrop-filter) had to re-blur
 * its backdrop because it had changed. That bill grows with window area, which
 * is why a phone never felt it and a 1440p/4K desktop did. The canvas is one
 * window-sized layer: a frame is a clear and a few hundred sprite draws, and
 * the compositor blends exactly one plate.
 */

export type Layer = {
  key: string;
  /** circles the original 2560x2000 field scattered - density is still quoted
      against SOURCE_AREA so every layer keeps its historical sparseness */
  count: number;
  /** circle radius, CSS px */
  r: number;
  /** tile edge, CSS px; larger tiles repeat less visibly for sparse layers */
  tile: number;
  /** soft-edged (glowing orbs and bokeh) rather than a crisp dot */
  soft?: boolean;
  colors: string[];
  /** dim point of the twinkle: the sparks flicker hard, the orbs pulse gently */
  lo: number;
  /** twinkle period, seconds */
  period: number;
  /** drift in CSS px per second; positive rises, negative sinks */
  speed: number;
};

export const SEED = 20260625;
export const SOURCE_AREA = 2560 * 2000;

/** The most device pixels the canvas backs itself with. Above this (4K at 2x,
    5K displays) it renders smaller and lets the compositor scale it up: the
    field is soft bokeh, so the upscale does not read, and it bounds both the
    memory and the fill cost of the clear regardless of the monitor. */
export const MAX_PIXELS = 3840 * 2160;

/** Seconds over which the twinkle fades in, so t=0 is exactly the static tiles. */
const TWINKLE_RAMP = 4;

const cream = ['rgba(237,219,194,0.85)', 'rgba(245,232,213,0.7)'];

// Speeds are the original field's: it drifted a 2000px tile over 90-320s.
export const LAYERS: Layer[] = [
  { key: 'lg',  count: 14,  r: 10,  tile: 1200, soft: true, colors: ['rgba(245,232,213,0.13)', 'rgba(251,210,149,0.11)'], lo: 0.65, period: 19,  speed: 2000 / 320 },
  { key: 'orb', count: 26,  r: 6,   tile: 1200, soft: true, colors: ['rgba(251,210,149,0.20)', 'rgba(237,219,194,0.18)'], lo: 0.6,  period: 15,  speed: 2000 / 240 },
  { key: 'bg',  count: 40,  r: 2,   tile: 800,  colors: cream,                                                          lo: 0.5,  period: 11,  speed: 2000 / 200 },
  { key: 'md',  count: 90,  r: 1.5, tile: 800,  colors: ['rgba(251,210,149,0.7)', 'rgba(245,232,213,0.6)'],             lo: 0.4,  period: 9,   speed: 2000 / 140 },
  { key: 'sm',  count: 200, r: 1,   tile: 800,  colors: cream,                                                          lo: 0.35, period: 7,   speed: 2000 / 90 },
  { key: 'spA', count: 26,  r: 1,   tile: 800,  colors: ['rgba(255,250,242,0.95)', 'rgba(255,243,214,0.92)'],           lo: 0.1,  period: 3.2, speed: 2000 / 70 },
  { key: 'spB', count: 22,  r: 1,   tile: 800,  colors: ['rgba(255,238,205,0.95)', 'rgba(255,250,242,0.9)'],            lo: 0.12, period: 4.6, speed: 2000 / 82 },
  /* a few dots sinking the other way, for a little cross-current */
  { key: 'dn',  count: 34,  r: 1,   tile: 800,  colors: cream,                                                          lo: 0.3,  period: 8,   speed: -2000 / 130 },
];

export type Point = { x: number; y: number; c: number; phase: number };
export type Tile = { layer: Layer; points: Point[] };

type Rand = () => number;

/** mulberry32: tiny, seedable and integer-exact, so build and browser agree. */
export function rng(seed: number): Rand {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTiles(seed = SEED): Tile[] {
  const rand = rng(seed);
  const tiles = LAYERS.map((layer) => {
    const n = Math.max(2, Math.round((layer.count * layer.tile * layer.tile) / SOURCE_AREA));
    const points: Point[] = [];
    for (let i = 0; i < n; i++) {
      const x = Math.round(rand() * layer.tile);
      const y = Math.round(rand() * layer.tile);
      const c = Math.floor(rand() * layer.colors.length);
      points.push({ x, y, c, phase: 0 });
    }
    return { layer, points };
  });
  // Twinkle phases come from a second stream, so the positions above are the
  // ones the static tiles have always had.
  const phase = rng(seed ^ 0x5bd1e995);
  for (const tile of tiles) for (const p of tile.points) p.phase = phase() * Math.PI * 2;
  return tiles;
}

function transparent(color: string): string {
  return color.replace(/[\d.]+\)$/, '0)');
}

/** One seamless tile as an SVG data URI. Circles within a radius of an edge are
    drawn again on the opposite side, so the repeat has no visible seam. */
export function tileDataUri({ layer, points }: Tile): string {
  const { tile, r, colors, soft } = layer;
  const body: string[] = [];
  const gradients = new Set<number>();
  for (const { x, y, c } of points) {
    if (soft) gradients.add(c);
    for (const dx of x < r ? [0, tile] : x > tile - r ? [0, -tile] : [0]) {
      for (const dy of y < r ? [0, tile] : y > tile - r ? [0, -tile] : [0]) {
        const fill = soft ? `url(#g${c})` : colors[c];
        body.push(`<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="${fill}"/>`);
      }
    }
  }
  const defs = [...gradients]
    .map((c) => `<radialGradient id="g${c}"><stop offset="0" stop-color="${colors[c]}"/><stop offset="1" stop-color="${transparent(colors[c])}"/></radialGradient>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">` +
    (defs ? `<defs>${defs}</defs>` : '') +
    body.join('') +
    '</svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ---------------------------------------------------------------- renderer */

export type Surface = HTMLCanvasElement | OffscreenCanvas;
export type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type MakeCanvas = (width: number, height: number) => Surface;

export type Field = {
  /** CSS size of the backdrop and the display's device pixel ratio */
  resize(width: number, height: number, dpr: number): void;
  /** paint the field as it looks after t seconds of motion */
  draw(t: number): void;
};

export function createField(target: Surface, ctx: Context, makeCanvas: MakeCanvas, tiles: Tile[] = generateTiles()): Field {
  let width = 0;
  let height = 0;
  let scale = 0;
  // one sprite per layer per colour; drawing a pre-rendered sprite is one
  // textured quad, cheaper than a path fill and identical from frame to frame
  let sprites: Surface[][] = [];

  function sprite(layer: Layer, color: string): Surface {
    const size = Math.ceil((layer.r * 2 + 2) * scale);
    const canvas = makeCanvas(size, size);
    const g = canvas.getContext('2d') as Context;
    const mid = size / 2;
    const radius = layer.r * scale;
    if (layer.soft) {
      const grad = g.createRadialGradient(mid, mid, 0, mid, mid, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, transparent(color));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
    } else {
      g.fillStyle = color;
      g.beginPath();
      g.arc(mid, mid, radius, 0, Math.PI * 2);
      g.fill();
    }
    return canvas;
  }

  function resize(w: number, h: number, dpr: number): void {
    width = Math.max(1, w);
    height = Math.max(1, h);
    const next = Math.max(0.5, Math.min(dpr || 1, Math.sqrt(MAX_PIXELS / (width * height))));
    target.width = Math.round(width * next);
    target.height = Math.round(height * next);
    if (next !== scale) {
      scale = next;
      sprites = tiles.map(({ layer }) => layer.colors.map((color) => sprite(layer, color)));
    }
  }

  function draw(t: number): void {
    const W = target.width;
    const H = target.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // the twinkle eases in so the first frame is the static field, dot for dot
    const twinkle = Math.min(1, t / TWINKLE_RAMP);

    for (let i = 0; i < tiles.length; i++) {
      const { layer, points } = tiles[i];
      const tile = layer.tile;
      const layerSprites = sprites[i];
      const size = layerSprites[0].width;
      const half = size / 2;
      // how far this layer has risen, folded into one tile so it loops
      const shift = (((layer.speed * t) % tile) + tile) % tile;
      const cols = Math.ceil(width / tile);
      const rows = Math.ceil(height / tile);
      const omega = (Math.PI * 2) / layer.period;
      const dim = 1 - layer.lo;

      for (let row = 0; row <= rows; row++) {
        const oy = row * tile - shift;
        for (let col = 0; col < cols; col++) {
          const ox = col * tile;
          // each repeat of the tile twinkles out of step with its neighbours
          const offset = col * 0.37 + row * 0.61;
          for (let k = 0; k < points.length; k++) {
            const p = points[k];
            const y = (oy + p.y) * scale - half;
            if (y < -size || y > H) continue;
            const x = (ox + p.x) * scale - half;
            if (x < -size || x > W) continue;
            // lo..1, cosine eased, the same curve as the old keyframes
            const wave = 0.5 + 0.5 * Math.cos(omega * t + p.phase + offset);
            ctx.globalAlpha = 1 - twinkle * dim * wave;
            ctx.drawImage(layerSprites[p.c], x, y);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  return { resize, draw };
}

/* ------------------------------------------------------------------- clock */

export type Loop = {
  play(): void;
  pause(): void;
  resize(width: number, height: number, dpr: number): void;
};

/** Drives a field from requestAnimationFrame. Motion is a function of elapsed
    time, not of frame count, so it runs at the same pace on a 60 Hz and a
    144 Hz display; a pause (hidden tab, throttled frame) never jumps the field
    because a single step is capped at 100 ms. */
export function createLoop(field: Field, raf: (cb: (now: number) => void) => number, caf: (handle: number) => void): Loop {
  let running = false;
  let handle = 0;
  let last = 0;
  let t = 0;

  function tick(now: number): void {
    if (!running) return;
    if (last) t += Math.min((now - last) / 1000, 0.1);
    last = now;
    field.draw(t);
    handle = raf(tick);
  }

  return {
    play() {
      if (running) return;
      running = true;
      last = 0;
      handle = raf(tick);
    },
    pause() {
      if (!running) return;
      running = false;
      caf(handle);
    },
    resize(width, height, dpr) {
      field.resize(width, height, dpr);
      if (!running) field.draw(t);
    },
  };
}
