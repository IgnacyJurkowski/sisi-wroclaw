#!/usr/bin/env python3
"""Sample hand-picked regions (only boxes whose crop was checked by eye are kept; the pixel-class masks in skin_led.py are the broader measure)
 (skin light, brass, neon red, spotlight, cream signage) from the source photos.
Boxes are (x0,y0,x1,y1) in native pixels. Saves a crop per region to brand/crops/ and prints median hex, L*, Lab hue."""
from PIL import Image
import numpy as np, cv2, os
R='/home/user/sisi-elevate/public/'; OUT='/home/user/sisi-elevate/docs/sisi-elevate/brand/crops/'
regions=[
 ('skin-lit-singer','framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp',(250,105,285,150)),
 ('neon-led-strip-orange','framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp',(1250,236,1420,246)),
 ('back-bar-tile-glow','framerusercontent.com/images/YANjqHXpbp64zG9ZMX3q3VMQo.jpg',(1400,420,1700,560)),
 ('brass-lamp-amber','framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp',(135,235,165,285)),
 ('stage-blue-wash','framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp',(280,0,480,60)),
 ('spritz-orange','images/menu/bar-cocktails.webp',(300,60,420,140)),
]
os.makedirs(OUT,exist_ok=True)
def lab(rgb):
    a=np.array(rgb,np.float32).reshape(1,1,3)/255; l=cv2.cvtColor(a,cv2.COLOR_RGB2Lab)[0,0]; return l
for name,f,box in regions:
    im=Image.open(R+f).convert('RGB'); c=im.crop(box)
    big=c.copy(); big.thumbnail((400,400)); 
    scale=max(1,int(200/max(c.size))); c.resize((c.size[0]*scale,c.size[1]*scale),Image.NEAREST).save(OUT+name+'.png')
    px=np.asarray(c).reshape(-1,3); med=np.median(px,axis=0).astype(int)
    l=lab(med); h=np.degrees(np.arctan2(l[2],l[1]))%360; C=np.hypot(l[1],l[2])
    print(f"{name:28s} {f.split('/')[-1][:12]:12s} box={box} median=#{med[0]:02x}{med[1]:02x}{med[2]:02x} L*={l[0]:.0f} C={C:.0f} h={h:.0f}")
