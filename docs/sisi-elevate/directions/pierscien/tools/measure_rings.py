#!/usr/bin/env python3
"""Measure the LED ring ceiling in the SiSi stills.

For each photo: extract LED ridge points (vertical-run centres of the orange-red
mask inside a ceiling ROI), then fit ONE family of concentric, similar ellipses
(shared centre, shared axis ratio k = a/b, shared tilt) by maximising the
sharpness of the radial histogram.  Report: axis ratio, tilt, radial peaks
(= number of concentric lines), stroke thickness as % of frame width, and the
core/edge colours.  Writes an overlay PNG per photo so the fit can be judged by eye.

usage: measure_rings.py OUTDIR
"""
import sys, json, math
import cv2, numpy as np

P = '/home/user/sisi-elevate/public/framerusercontent.com/images/'
# name: (file, ROI as fractions y0,y1,x0,x1, photo number on brand/contact-sheet.jpg)
PHOTOS = {
    'nBW0':   ('nBW0AVejCOoiy2Rctqcid0SY6Q.webp', (0.08, 0.37, 0.10, 0.99), 1),
    'bHchR':  ('bHchRJgtNrxKTYRK56SCdUph2g.webp', (0.00, 0.40, 0.00, 0.99), 4),
    'MHGyp':  ('MHGypGkoM6EkRCjBAVKzMUmwRG4.webp', (0.03, 0.40, 0.00, 1.00), 6),
    '9B6Kt':  ('9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg', (0.03, 0.24, 0.10, 0.90), 0),
    'BhLu6T': ('BhLu6TEmxTduoC9Pjn93Svcgtc.jpg', (0.05, 0.36, 0.10, 0.90), 0),
}

def led_mask(im, vmin=150, smin=130):
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    return (((h <= 22) | (h >= 172)) & (s > smin) & (v > vmin))

def ridge_points(mask, roi, wpx, max_run_frac=0.014, min_run=2):
    """centre of each vertical run inside the ROI; run length recorded (stroke thickness)."""
    H, W = mask.shape
    y0, y1, x0, x1 = int(roi[0]*H), int(roi[1]*H), int(roi[2]*W), int(roi[3]*W)
    maxrun = max_run_frac * W
    pts, runs = [], []
    for x in range(x0, x1):
        col = mask[y0:y1, x].astype(np.int8)
        d = np.diff(np.concatenate([[0], col, [0]]))
        st = np.where(d == 1)[0]; en = np.where(d == -1)[0]
        for a, b in zip(st, en):
            L = b - a
            if min_run <= L <= maxrun:
                pts.append((x, y0 + (a + b - 1) / 2.0)); runs.append(L)
    return np.array(pts, float), np.array(runs, float)

def keep_arcs(pts, W, dy_tol=None):
    """keep only points that have a neighbour in the next 3 columns within dy_tol (line-like, drops blobs and beams)."""
    if dy_tol is None: dy_tol = 0.006 * W
    order = np.lexsort((pts[:, 1], pts[:, 0])); pts = pts[order]
    xs = pts[:, 0]; keep = np.zeros(len(pts), bool)
    idx = {}
    for i, (x, y) in enumerate(pts): idx.setdefault(int(x), []).append(i)
    for i, (x, y) in enumerate(pts):
        n = 0
        for dx in (-3, -2, -1, 1, 2, 3):
            for j in idx.get(int(x) + dx, []):
                if abs(pts[j, 1] - y) <= dy_tol * abs(dx): n += 1; break
        keep[i] = n >= 5
    return pts[keep]

def radial(pts, c, k, th):
    ct, st = math.cos(th), math.sin(th)
    x = pts[:, 0] - c[0]; y = pts[:, 1] - c[1]
    u = ct * x + st * y; v = -st * x + ct * y
    return np.sqrt((u / k) ** 2 + v ** 2)     # rho = vertical semi-axis of the ellipse through the point

def score(pts, c, k, th, binw):
    rho = radial(pts, c, k, th)
    h, _ = np.histogram(rho, bins=np.arange(0, rho.max() + binw, binw))
    return float((h.astype(float) ** 2).sum())

def fit_family(pts, W, H, seed=1):
    rng = np.random.default_rng(seed)
    binw = 0.0035 * W
    best = None
    for trial in range(60):
        c = np.array([rng.uniform(0.25 * W, 0.75 * W), rng.uniform(0.15 * H, 1.1 * H)])
        k = rng.uniform(1.5, 7.0); th = rng.uniform(-0.25, 0.25)
        s = score(pts, c, k, th, binw)
        step = np.array([0.05 * W, 0.08 * H, 0.4, 0.05])
        for it in range(400):
            cand_c = c + rng.normal(0, 1, 2) * step[:2]
            cand_k = float(np.clip(k + rng.normal(0, step[2]), 1.0, 8.0))
            cand_t = th + rng.normal(0, step[3])
            s2 = score(pts, cand_c, cand_k, cand_t, binw)
            if s2 > s: c, k, th, s = cand_c, cand_k, cand_t, s2
            if it % 100 == 99: step *= 0.6
        if best is None or s > best[0]: best = (s, c.copy(), k, th)
    return best

def peaks(rho, binw, min_frac=0.045):
    h, edges = np.histogram(rho, bins=np.arange(0, rho.max() + binw, binw))
    hs = np.convolve(h, [1, 2, 1], 'same')
    thr = max(hs.max() * 0.22, len(rho) * 0.012)
    out = []
    for i in range(1, len(hs) - 1):
        if hs[i] >= hs[i - 1] and hs[i] > hs[i + 1] and hs[i] >= thr:
            out.append((float((edges[i] + edges[i + 1]) / 2), int(h[i])))
    # merge peaks closer than 2 bins
    merged = []
    for r, n in out:
        if merged and r - merged[-1][0] < 2.5 * binw:
            if n > merged[-1][1]: merged[-1] = (r, n)
        else: merged.append((r, n))
    return merged


def top_envelope(pts, W):
    d = {}
    for x, y in pts:
        xi = int(x)
        if xi not in d or y < d[xi]: d[xi] = y
    xs = np.array(sorted(d)); ys = np.array([d[i] for i in xs], float)
    return xs.astype(float), ys

def arc_fit(xs, ys, W, trim=0.72, iters=6):
    """axis-aligned ellipse, upper arc: y = cy - b*sqrt(1-((x-cx)/a)^2).  Grid over (cx,a), linear LS for (cy,b), trimmed."""
    keep = np.ones(len(xs), bool); best = None
    for it in range(iters):
        X, Y = xs[keep], ys[keep]; cand = None
        for cx in np.linspace(0.15 * W, 0.85 * W, 71):
            for a in np.linspace(0.30 * W, 1.10 * W, 81):
                u = (X - cx) / a; ok = np.abs(u) < 0.999
                if ok.sum() < 0.8 * len(X): continue
                A = np.stack([np.ones(ok.sum()), -np.sqrt(1 - u[ok] ** 2)], 1)
                sol, *_ = np.linalg.lstsq(A, Y[ok], rcond=None)
                cy, b = sol
                if b < 8 or b > 3 * W: continue
                r = np.abs(A @ sol - Y[ok]); e = np.sort(r)[: int(trim * len(r))].mean()
                if cand is None or e < cand[0]: cand = (e, cx, a, cy, b)
        e, cx, a, cy, b = cand; best = cand
        u = (xs - cx) / a; ok = np.abs(u) < 0.999
        res = np.full(len(xs), 1e9); res[ok] = np.abs(cy - b * np.sqrt(1 - u[ok] ** 2) - ys[ok])
        thr = max(2.0, np.percentile(res[ok], 75)); keep = res <= thr
    return dict(err_px=float(best[0]), cx=float(best[1]), a=float(best[2]), cy=float(best[3]), b=float(best[4]), inliers=int(keep.sum()), n=int(len(xs)))

def fwhm_at(ims_gray, x, y, half=22):
    y0 = max(0, int(round(y)) - half); y1 = min(ims_gray.shape[0], int(round(y)) + half + 1)
    p = ims_gray[y0:y1, int(x)].astype(float)
    if len(p) < 9: return None
    base = np.percentile(p, 10); pk = p.max() - base
    if pk < 20: return None
    above = p - base >= 0.5 * pk
    return int(above.sum()), int((p - base >= 0.1 * pk).sum())

def cluster_lines(ys, gap):
    ys = np.sort(ys); out = []
    for y in ys:
        if out and y - out[-1][-1] <= gap: out[-1].append(y)
        else: out.append([y])
    return out

def main(outdir):
    res = {}
    for name, (f, roi, num) in PHOTOS.items():
        im = cv2.imread(P + f); H, W = im.shape[:2]
        sc = 1000.0 / W
        ims = cv2.resize(im, (1000, int(round(H * sc))), interpolation=cv2.INTER_AREA)
        Hs, Ws = ims.shape[:2]
        gray = cv2.cvtColor(ims, cv2.COLOR_BGR2GRAY)
        mask = led_mask(ims)
        pts, runs = ridge_points(mask, roi, Ws)
        pts = keep_arcs(pts, Ws)
        xs, ys = top_envelope(pts, Ws)
        fit = arc_fit(xs, ys, Ws)
        k = fit['a'] / fit['b']
        # FWHM of the line profile at ridge points
        fw = [fwhm_at(gray, x, y) for x, y in pts[::7]]
        fw = np.array([f for f in fw if f], float)
        fwhm = float(np.median(fw[:, 0])); halo = float(np.median(fw[:, 1]))
        # number of concentric lines: distinct ridges per column, mode over the central 40% of the ROI width
        counts = []
        for x in range(int(0.30 * Ws), int(0.70 * Ws)):
            col = pts[np.abs(pts[:, 0] - x) < 0.5][:, 1]
            if len(col): counts.append(len(cluster_lines(col, 0.012 * Ws)))
        cnt_mode = int(np.bincount(counts).argmax()) if counts else 0
        cnt_max = int(np.percentile(counts, 90)) if counts else 0
        rgb = cv2.cvtColor(ims, cv2.COLOR_BGR2RGB)
        col = np.array([rgb[int(round(y)), int(x)] for x, y in pts])
        v = col.max(axis=1); hot = col[v >= np.percentile(v, 90)]
        core = np.median(col, axis=0).astype(int); hotc = np.median(hot, axis=0).astype(int)
        res[name] = dict(photo_on_contact_sheet=num, native=[W, H], ridge_points=int(len(pts)),
                         outer_arc=dict(axis_ratio_a_over_b=round(k, 2), a_frac_of_width=round(fit['a'] / Ws, 3),
                                        b_frac_of_width=round(fit['b'] / Ws, 3), centre=[round(fit['cx'] / Ws, 3), round(fit['cy'] / Hs, 3)],
                                        fit_err_px_at_1000w=round(fit['err_px'], 2), inliers=f"{fit['inliers']}/{fit['n']}"),
                         concentric_lines_mode=cnt_mode, concentric_lines_p90=cnt_max,
                         stroke_fwhm_px_at_1000w=fwhm, stroke_fwhm_pct_of_width=round(100 * fwhm / Ws, 2),
                         glow_10pct_px_at_1000w=halo, core_hex='#%02x%02x%02x' % tuple(core), hot_hex='#%02x%02x%02x' % tuple(hotc))
        ov = ims.copy()
        for x, y in pts: cv2.circle(ov, (int(x), int(y)), 1, (255, 255, 0), -1)
        cv2.ellipse(ov, (int(fit['cx']), int(fit['cy'])), (int(fit['a']), int(fit['b'])), 0, 0, 360, (0, 255, 0), 1)
        cv2.imwrite(f'{outdir}/fit_{name}.png', ov)
        print(name, json.dumps(res[name]))
    json.dump(res, open(f'{outdir}/ring-measure.json', 'w'), indent=1)

if __name__ == '__main__':
    main(sys.argv[1])
