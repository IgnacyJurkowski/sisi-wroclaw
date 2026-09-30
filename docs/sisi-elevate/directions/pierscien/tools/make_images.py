#!/usr/bin/env python3
"""Crop + tone the real stills for the Pierscien hero. No pixel is invented and nothing is upscaled:
every derivative is a crop at native resolution (or smaller).  Encoding to AVIF/WebP is done by encode_images.mjs (sharp).

tone(): shadow tint only.  Pixels darker than ~L 72/255 are pulled toward the film's aubergine shadow #1c070f
(measured: BRAND.md 2.3, hero-night-hq-desktop.webp darkest cluster, 62 %), so the photo's neutral blacks
(#0b090b..#130d08) sit in the same colour family as the #27060f page ground.  Mid-tones and highlights are untouched.
usage: make_images.py OUT_DIR
"""
import sys, os
import numpy as np
from PIL import Image

P = '/home/user/sisi-elevate/public/framerusercontent.com/images/'
SHADOW = np.array([0x1c, 0x07, 0x0f], float)

def tone(im, knee=72.0):
    a = np.asarray(im.convert('RGB'), float)
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    w = np.clip(1.0 - L / knee, 0, 1) ** 2
    out = a * (1 - w[..., None]) + SHADOW * w[..., None]
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))

# name -> (source, crop box in NATIVE px (l, t, r, b))
CROPS = {
    # hero, wide window 2.4:1, 1540 px wide native (2048 source: 0.75 of its width; the Chivas lettering starts right of x=1577)
    'hero-wide':   ('BhLu6TEmxTduoC9Pjn93Svcgtc.jpg', (0, 300, 1540, 942)),
    # hero, narrow window 1.5:1 for phones: band centre, 780 px native
    'hero-narrow': ('BhLu6TEmxTduoC9Pjn93Svcgtc.jpg', (610, 338, 1390, 858)),
}

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for name, (src, box) in CROPS.items():
        im = Image.open(P + src)
        c = im.crop(box)
        c.save(f'{out}/{name}-before.png')
        tone(c).save(f'{out}/{name}-after.png')
        print(name, box, c.size)
