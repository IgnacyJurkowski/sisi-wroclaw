#!/usr/bin/env python3
"""Draw the measured LED ring family as SVG arcs.

Measured on brand/contact-sheet photos 1 (nBW0) and 6 (MHGyp), tools/measure_rings.py:
  axis ratio a/b ........ 2.70 and 2.07  -> family aspect 2.4 : 1 (desktop); portrait phones use 1.5 : 1
  concentric lines ...... 4 (mode over the central 40 % of the frame), 5 at the 90th percentile
  radii vs outer line ... 1.000 / 0.935 / 0.870 / 0.825  (nBW0 0.934, 0.863, 0.814; MHGyp 0.935, 0.874, 0.837)
  line FWHM ............. 0.8 - 0.9 % of frame width; glow to 10 % is 2.3 - 2.4 %
The lines are broken by pillars and fixtures in the room, so each ring is drawn as arcs with staggered gaps.
Output: unit ellipses in a 1000 x 1000 box (stretched with preserveAspectRatio="none" + non-scaling strokes).
"""
import math, random, sys, json

RINGS = [  # (id, rho, seed, n_gaps, gap_deg_range, role)
    ('r0', 1.075, 11, 9, (5, 13), 'trace'),
    ('r1', 1.000, 21, 6, (2.5, 6), 'led'),
    ('r2', 0.935, 33, 7, (2.5, 6), 'led'),
    ('r3', 0.870, 47, 6, (2.5, 6), 'led'),
    ('r4', 0.825, 58, 4, (2.0, 4), 'hot'),
]

def arcs(rho, seed, n_gaps, gr):
    rnd = random.Random(seed)
    # gap centres, spread with jitter so neighbouring rings do not line up
    base = [(i + rnd.random() * 0.6) * 360.0 / n_gaps for i in range(n_gaps)]
    gaps = sorted((c, rnd.uniform(*gr)) for c in base)
    segs = []
    for i, (c, w) in enumerate(gaps):
        nc, nw = gaps[(i + 1) % len(gaps)]
        start = c + w / 2; end = nc - nw / 2 + (360 if i == len(gaps) - 1 else 0)
        segs.append((start, end))
    R = 500.0 * rho; d = []
    for a0, a1 in segs:
        p0 = (500 + R * math.cos(math.radians(a0)), 500 + R * math.sin(math.radians(a0)))
        p1 = (500 + R * math.cos(math.radians(a1)), 500 + R * math.sin(math.radians(a1)))
        large = 1 if (a1 - a0) > 180 else 0
        d.append(f'M{p0[0]:.1f} {p0[1]:.1f}A{R:.1f} {R:.1f} 0 {large} 1 {p1[0]:.1f} {p1[1]:.1f}')
    return ''.join(d)

def all_rings():
    return [(rid, rho, role, arcs(rho, seed, ng, gr)) for rid, rho, seed, ng, gr, role in RINGS]

if __name__ == '__main__':
    out = sys.argv[1]
    rings = all_rings()
    # standalone documentation SVG (colours are the measured LED values; the page itself uses tokens)
    col = {'trace': '#d69f3b', 'led': '#e03a03', 'hot': '#fa430f'}
    body = ''.join(f'<path d="{d}" fill="none" stroke="{col[role]}" stroke-width="{3 if role!="trace" else 1.2}" stroke-linecap="butt"/>' for rid, rho, role, d in rings)
    open(out + '/rings.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" width="1000" height="417">{body}</svg>')
    json.dump({rid: d for rid, rho, role, d in rings}, open(out + '/rings-paths.json', 'w'))
    print(sum(len(d) for _,_,_,d in rings), 'bytes of path data')
