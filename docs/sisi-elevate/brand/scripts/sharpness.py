#!/usr/bin/env python3
"""Sharpness proxy: variance of Laplacian on luma, after resizing each image to 900 px wide (comparable across sizes).
Higher = crisper. Video: per-frame values from the 12 sampled frames (also at 900 px wide). Rough guide from these files: <60 soft/blurred, >200 crisp."""
import cv2, glob, numpy as np, sys
from PIL import Image
R='/home/user/sisi-elevate/public/'
def sharp(bgr):
    h,w=bgr.shape[:2]; s=900/w; g=cv2.cvtColor(cv2.resize(bgr,(900,int(h*s)),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY)
    # measure on brighter half to avoid black-dominated frames: use whole frame and lit-pixel mask
    lap=cv2.Laplacian(g,cv2.CV_64F); m=g>40
    return lap.var(), (lap[m].var() if m.sum()>1000 else float('nan'))
imgs=['framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp','framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp','framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp','framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp','framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp','framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp','images/menu/bar-cocktails.webp','video/hero-night-hq-desktop.webp','framerusercontent.com/images/9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg','framerusercontent.com/images/YANjqHXpbp64zG9ZMX3q3VMQo.jpg','framerusercontent.com/images/BhLu6TEmxTduoC9Pjn93Svcgtc.jpg','framerusercontent.com/images/RHdmR5s8jXTtyexi8FJLI4WDkig.webp']
print('| image | Laplacian var (all px) | (px with luma>40) |\n|---|---|---|')
for f in imgs:
    im=cv2.cvtColor(np.asarray(Image.open(R+f).convert('RGB')),cv2.COLOR_RGB2BGR); a,b=sharp(im); print(f'| {f.split("/")[-1]} | {a:.0f} | {b:.0f} |')
scr=sys.argv[1]
print('\n| video | per-frame Laplacian var (12 frames, all px) |\n|---|---|')
for n in ['hero-desktop','hero-mobile','relacja']:
    v=[sharp(cv2.imread(f))[0] for f in sorted(glob.glob(f'{scr}/{n}-f*.png'))]; print(f'| {n} | '+' '.join(f'{x:.0f}' for x in v)+' |')
