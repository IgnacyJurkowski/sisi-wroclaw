#!/usr/bin/env python3
"""Simulate object-fit:cover centre crops for a 375x667 portrait hero and a 1440x900 landscape hero from each still.
Writes brand/crop-safety.jpg: row per image, portrait crop (scaled to 200px wide) then landscape crop (scaled to 480px wide).
Also prints the upscale factor needed at 1x and 2x DPR (native px / required device px, <1 means upscaled)."""
from PIL import Image, ImageDraw
R='/home/user/sisi-elevate/public/'
OUT='/home/user/sisi-elevate/docs/sisi-elevate/brand/crop-safety.jpg'
files=['framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp','framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp','framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp','framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp','framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp','framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp','images/menu/bar-cocktails.webp','framerusercontent.com/images/9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg','framerusercontent.com/images/YANjqHXpbp64zG9ZMX3q3VMQo.jpg','framerusercontent.com/images/BhLu6TEmxTduoC9Pjn93Svcgtc.jpg','framerusercontent.com/images/RHdmR5s8jXTtyexi8FJLI4WDkig.webp']
def cover(im,tw,th):
    w,h=im.size; s=max(tw/w,th/h); cw,ch=tw/s,th/s
    x0=(w-cw)/2; y0=(h-ch)/2
    return im.crop((int(x0),int(y0),int(x0+cw),int(y0+ch))),s
rows=[]; print('| image | native | portrait 375x667: scale @1x / @2x / @3x (device px per native px) | share of width visible | landscape 1440x900: scale @1x / @2x |\n|---|---|---|---|---|')
S=Image.new('RGB',(200+480+30,len(files)*272),(25,25,25)); d=ImageDraw.Draw(S)
for i,f in enumerate(files):
    im=Image.open(R+f).convert('RGB'); w,h=im.size
    p,sp=cover(im,375,667); l,sl=cover(im,1440,900)
    p.thumbnail((200,356)); l.thumbnail((480,300))
    S.paste(p,(5,i*272+2)); S.paste(l,(215,i*272+2)); d.text((5,i*272+258),f.split('/')[-1][:24]+f' {w}x{h}',fill=(255,255,255))
    vis=(375/sp)/w
    print(f'| {f.split("/")[-1]} | {w}x{h} | {sp:.2f} / {sp*2:.2f} / {sp*3:.2f} | {min(vis,1)*100:.0f}% | {sl:.2f} / {sl*2:.2f} |')
S.save(OUT,quality=82)
