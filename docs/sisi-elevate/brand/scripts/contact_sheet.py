#!/usr/bin/env python3
"""Contact sheets of every non-blog photo under public/. Sheet A: referenced by src/dist. Sheet B: unreferenced Framer leftovers.
Writes brand/contact-sheet.jpg (A) and brand/contact-sheet-unreferenced.jpg (B)."""
from PIL import Image, ImageDraw, ImageFont
import os
R='/home/user/sisi-elevate/public/'
OUT='/home/user/sisi-elevate/docs/sisi-elevate/brand/'
A=['framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp','framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp',
 'framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp','framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp',
 'framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp','framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp',
 'images/menu/bar-cocktails.webp','video/hero-night-hq-desktop.webp','video/hero-night-hq-mobile.webp','video/relacja-z-otwarcia-poster.webp']
B=[f'framerusercontent.com/images/{n}' for n in ['1xOqMa4sAAwBCrdkiSJfIXups.png','5ILRvlYXf72kHSVHqpa3snGzjU.jpg','9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg','9xaZzr9F8L22opnNWnHi1LdjqMk.png','AYLWOJkDYihbF5j37ZCQ3GqMi4.png','BhLu6TEmxTduoC9Pjn93Svcgtc.jpg','GfGkADagM4KEibNcIiRUWlfrR0.jpg','Olq6a1v5gLRrCox00t2wOi8ATTw.jpeg','QxXDx4GN74BgGuzaDth23HA.webp','RHdmR5s8jXTtyexi8FJLI4WDkig.webp','Vl3kSLbolFditeShXmcLZITH7A8.webp','YANjqHXpbp64zG9ZMX3q3VMQo.jpg','jlIAaI4caPj3oVLaxetMd2RvY.png','loXZHRygofAyWJdOaLJm2nba20Y.webp','pGGB9XWB2h0vJy9v9FeUIzcQb5w.jpg','v46yfJcN1YsEaZZEo9Kc6gXqbo.png']]
def sheet(files,out,cols,cw=420,ch=300):
    rows=(len(files)+cols-1)//cols
    S=Image.new('RGB',(cols*cw,rows*(ch+22)),(30,30,30)); d=ImageDraw.Draw(S)
    for i,f in enumerate(files):
        im=Image.open(R+f); w,h=im.size
        im=im.convert('RGB'); im.thumbnail((cw-8,ch-8))
        r,c=divmod(i,cols)
        S.paste(im,(c*cw+4,r*(ch+22)+4))
        d.text((c*cw+4,r*(ch+22)+ch-2),f'{i+1}. {os.path.basename(f)[:22]} {w}x{h}',fill=(255,255,255))
    S.save(OUT+out,quality=85)
sheet(A,'contact-sheet.jpg',4)
sheet(B,'contact-sheet-unreferenced.jpg',4)
