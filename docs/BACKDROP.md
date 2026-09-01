# The animated backdrop

The particle field behind every page (`src/components/Particles.astro`,
`src/scripts/backdrop/`) is one `<canvas>` drawn from a Web Worker. This note
records why it is built that way, what it replaced and how to measure it.

## What lagged, and why

The backdrop was first built as eight full-window CSS layers, each carrying
part of the field and each animating (`transform` drift, `opacity` twinkle).
That is the textbook "compositor-only" recipe, and on a phone it is free. On a
desktop it was not, for three compounding reasons:

1. **Eight window-sized plates per frame.** An animating element is promoted
   to its own compositor layer, so every frame the GPU alpha-blended eight
   window-sized translucent textures over the page. The bill is proportional to
   window area: a 390x844 phone viewport is 0.3 Mpx, a 1440p monitor 3.7 Mpx,
   a 4K monitor 8.3 Mpx. Eight plates at 4K is 66 Mpx of blended fill per
   frame, 4 Gpx/s at 60 Hz and 9.5 Gpx/s at 144 Hz, which is beyond an
   integrated GPU. The layer tree below shows it directly: 11 full-window
   layers in the tiled version and 19 in the original box-shadow version,
   against 3 for a page with a static backdrop.
2. **Every glass panel re-blurs every frame.** The nav, the cards and the menu
   folds use `backdrop-filter`. A backdrop filter has to read the pixels
   behind it and blur them again whenever they change, and with an animated
   field they change every frame. The menu page has 17 such panels: the
   compositor runs 20 render passes per frame there against 3 on the home
   page (`passes/frame` in the harness).
3. **The original also pinned textures and blurred two plates.** The first
   version put `will-change` on all eight layers and `filter: blur()` on two,
   which adds two more full-window render surfaces per frame and keeps eight
   oversized textures resident (hundreds of MB at 2x pixel ratio).

None of this shows up on a phone, so "no lag when first added" and "unusable
on a desktop" are the same code seen through different window sizes and GPUs.
The git history has no change to the backdrop between the day it was added and
the lag reports; what changed was where it was being looked at.

The two earlier fixes (#20 tiles, #21 standing still) measured the field in a
headless sandbox with no GPU. In software the compositor blends every plate on
the CPU, which turns "eight plates" into single-digit frame rates at any size
and hides the difference between an expensive design and an impossible one.
That measurement led to the conclusion that nothing window-sized can animate.
It can; there just has to be one of it.

## The design now

- **One layer.** A single `<canvas>` the size of the window is the only thing
  the compositor touches per frame for the backdrop: one plate, not eight.
- **Off the main thread.** The canvas is transferred to a Web Worker
  (`worker.ts`) with `OffscreenCanvas`; the worker owns the animation frames.
  Scrolling, input and the site's other scripts never queue behind the field,
  and the field never queues behind them. Browsers without `OffscreenCanvas`
  (or whose workers lack animation frames) fall back to the same renderer on
  the main thread with a fresh canvas; a worker that fails to load falls back
  the same way.
- **A frame is a few hundred sprite draws.** Each layer's circle is
  pre-rendered once into a small sprite (soft orbs as radial gradients); a
  frame is a clear plus one `drawImage` per visible circle, about 700 at
  1440p, 1150 at 4K.
- **Same field, dot for dot.** `field.ts` is one model shared by the build
  (which renders each layer to a static SVG tile) and the worker (which draws
  the same tiles). The canvas's first frame is therefore identical to the
  static CSS field that first paint shows, so the hand-over is a cross-fade
  between two identical images. Screenshot diff at 1600x900: 0 differing
  pixels.
- **Time-based motion.** Drift and twinkle are functions of elapsed seconds,
  so the field moves at the same pace at 60 Hz and 144 Hz, and a hidden tab or
  a stalled frame never jumps it (a single step is capped at 100 ms).
- **Bounded pixels.** The canvas backs itself with at most 3840x2160 device
  pixels; beyond that (4K at 2x, 5K) it renders smaller and the compositor
  scales it up. The field is soft bokeh, so this does not read, and it bounds
  both memory and the clear cost on any monitor.
- **Gated and polite.** Motion starts only after `load` + idle so it never
  inflates Speed Index; it pauses while the tab is hidden; with
  `prefers-reduced-motion` the static tiles stay and no canvas is created.
  The static tiles are also the whole backdrop without JS.
- **Cost on the wire.** The worker is 1.5 KB and the bootstrap 2.4 KB, both
  gzipped, both content-addressed under `/assets/` like every other script.

## Measuring it

`npm run perf:backdrop` (`scripts/backdrop-fps.mjs`) serves the built site,
opens each page at 1920x1080, 2560x1440 and 3840x2160, waits for the backdrop
to go live and reads Chrome's trace for a fixed window:

- **displayed fps** - frames the display compositor actually swapped to the
  screen (viz `Display::FrameDisplayed`). This is the headline number. It is
  the only counter that sees the worker's canvas, which is submitted as its own
  surface; the renderer's own frame reporter (what DevTools shows) does not.
- **passes/frame** - render passes per displayed frame; every pass above one
  is a glass panel re-blurring.
- **main busy %** - main-thread task time. The worker keeps it near zero; the
  main-thread fallback would spend the frame budget here.
- **layers / drawn area / full-window layers** - the compositor layer tree.
  These transfer to real hardware even when the frame times do not.

### On a real display

The sandbox this was developed in has no GPU: headless Chromium composites in
software (SwiftShader), so its absolute numbers are a lower bound and it runs
uncapped to show raw throughput. To check a real monitor, run headed on the
desktop with vsync on; displayed fps should sit at the monitor's refresh rate
with dropped fps near zero:

```bash
npm run build
# macOS
node scripts/backdrop-fps.mjs --headed --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Windows
node scripts/backdrop-fps.mjs --headed --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
# Linux
node scripts/backdrop-fps.mjs --headed --chrome /usr/bin/google-chrome
```

The first line of output is the display refresh the browser reports on a blank
page (60, 120, 144, 240...). Add `--uncapped` to see how far above it the
machine could go, `--viewports 3840x2160@2` for a 4K monitor at 200 % scaling,
and `--pages /pl/menu/` to look at the glass-heaviest page.

### Sandbox results

Software compositing, Chromium 141 headless, uncapped, 3 s windows (uncapped
runs leave the harness's own frame counter spinning on the main thread, so
main-thread cost is read from the vsync table below). "orig" is
the July box-shadow field (8 animated layers), "tiles" is #20 (8 animated
layers, tiled), "still" is #21 (frozen), "canvas" is this design.

Displayed frames per second, home page `/pl/`:

| /pl/ | 1920x1080 | 2560x1440 | 3840x2160 | full-window layers | passes/frame |
| --- | ---: | ---: | ---: | ---: | ---: |
| orig (8 animated box-shadow layers) | 4 | 2 | 1 | 19 | 11 |
| tiles #20 (8 animated tiled layers) | 10 | 5 | 2 | 11 | 3 |
| still #21 (frozen) | 73 | 56 | 22 | 3 | 3 |
| canvas (this PR) | 69 | 44 | 22 | 4 | 3 |

Menu page `/pl/menu/` (17 glass panels; "idle" means nothing on the page moves, so nothing is presented):

| /pl/menu/ | 1920x1080 | 2560x1440 | 3840x2160 | full-window layers | passes/frame |
| --- | ---: | ---: | ---: | ---: | ---: |
| orig (8 animated box-shadow layers) | 3 | 2 | 1 | 19 | 30 |
| tiles #20 (8 animated tiled layers) | 8 | 4 | 3 | 11 | 20 |
| still #21 (frozen) | idle | idle | idle | 3 | 17 |
| canvas (this PR) | 34 | 26 | 18 | 4 | 20 |

At 2x device pixel ratio (canvas, `/pl/`): 1920x1080@2 40 fps, 2560x1440@2 25 fps.

With vsync on (a synthetic 60 Hz cap), the software compositor holds:

| 60 Hz vsync | /pl/ 1920x1080 | /pl/ 2560x1440 | /pl/ 3840x2160 | /pl/menu/ 1920x1080 | /pl/menu/ 2560x1440 | /pl/menu/ 3840x2160 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| tiles #20 | 14 fps, main 1 % | 8 fps, main 1 % | 6 fps, main 0 % | 10 fps, main 1 % | 6 fps, main 11 % | 5 fps, main 0 % |
| canvas | 60 fps, main 2 % | 58 fps, main 2 % | 28 fps, main 2 % | 29 fps, main 1 % | 24 fps, main 1 % | 18 fps, main 1 % |

The 4K rows are the sandbox's CPU compositor running out of fill for the page
itself: "still", with nothing animating, presents at the same rate there. On a
GPU the same layer tree composites in a fraction of a millisecond.
