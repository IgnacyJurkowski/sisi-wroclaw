#!/usr/bin/env python3
"""Tone-map the real photos and write PNG intermediates (encoded to AVIF/WebP by make-images.mjs).
Usage: make-images.py <outdir>"""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from tonemap import tonemap
R='/home/user/sisi-elevate/public/framerusercontent.com/images/'
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
band=Image.open(R+'RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp').convert('RGB')
floor=Image.open(R+'MHGypGkoM6EkRCjBAVKzMUmwRG4.webp').convert('RGB')
tm=lambda im: tonemap(im, protect=0.65)
b=tm(band); f=tm(floor)
b.save(f'{out}/band-full.png'); f.save(f'{out}/floor-full.png')
b.crop((340,0,820,600)).save(f'{out}/band-tall.png')
band.save(f'{out}/band-orig.png'); floor.save(f'{out}/floor-orig.png')
print('ok')
