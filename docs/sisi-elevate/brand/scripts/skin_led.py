#!/usr/bin/env python3
"""Heuristic pixel-class medians per photo (Inference, not ground truth):
 lit skin ~ Lab hue 35-65 deg, chroma 18-45, L* 45-80 (excludes saturated neon)
 hot LED/neon ~ hue 30-55, chroma>=65, L*>=40
 amber/brass ~ hue 70-95, chroma>=35, L*>=50
Prints median hex and pixel share per photo."""
import numpy as np, cv2
from PIL import Image
R='/home/user/sisi-elevate/public/framerusercontent.com/images/'
files={'u3EOm (singer, 728px)':'u3EOm1VtOnATOkUYHKikl5aBc.webp','RMGSD (band+bar, 900)':'RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp','cDJcC (band, 900)':'cDJcCUEanjQSoFpALHKgU3hNpQ.webp',
 'MHGyp (floor, 900)':'MHGypGkoM6EkRCjBAVKzMUmwRG4.webp','bHchR (crowd, 1600)':'bHchRJgtNrxKTYRK56SCdUph2g.webp','YANjq (bar crowd, 2048)':'YANjqHXpbp64zG9ZMX3q3VMQo.jpg','9B6Kt (floor+band, 2048)':'9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg'}
def hx(v): return '#%02x%02x%02x'%tuple(int(x) for x in v)
for k,f in files.items():
    im=Image.open(R+f).convert('RGB'); 
    if max(im.size)>1200: im.thumbnail((1200,1200))
    a=np.asarray(im); lab=cv2.cvtColor(a.astype(np.float32)/255,cv2.COLOR_RGB2Lab).reshape(-1,3); px=a.reshape(-1,3)
    C=np.hypot(lab[:,1],lab[:,2]); H=np.degrees(np.arctan2(lab[:,2],lab[:,1]))%360; L=lab[:,0]
    out=[]
    for name,m in [('skin',(H>35)&(H<65)&(C>18)&(C<45)&(L>45)&(L<80)),('LED',(H>30)&(H<55)&(C>=65)&(L>=40)),('brass',(H>70)&(H<95)&(C>=35)&(L>=50))]:
        out.append(f"{name} {m.mean()*100:.1f}% {hx(np.median(px[m],axis=0)) if m.sum()>30 else '-'}")
    print(f"{k:28s} | "+' | '.join(out))
