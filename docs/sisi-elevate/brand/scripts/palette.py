#!/usr/bin/env python3
"""Build brand/palette-swatches.png and data/palette-delta.md.
Palette entries: hex, source, role. CIE Lab via OpenCV (D65, float32); dE = CIE76 (Euclidean in Lab)
Delta table: each site token vs nearest measured photo/video colour."""
import numpy as np, cv2
from PIL import Image, ImageDraw
OUT='/home/user/sisi-elevate/docs/sisi-elevate/brand/'
def lab(h): 
    rgb=np.array([[[int(h[i:i+2],16) for i in (1,3,5)]]],np.float32)/255; return cv2.cvtColor(rgb,cv2.COLOR_RGB2Lab)[0,0]
def hue(l): return np.degrees(np.arctan2(l[2],l[1]))%360
def dE(a,b): return float(np.linalg.norm(lab(a)-lab(b)))
tokens=[('--bg','#27060f'),('--panel','#34101a'),('--panel-2','#3d1320'),('--cream / --text / logo fill','#edd bc2'.replace(' ','')),('--cream-hover','#f5e8d5'),('--cream-press','#d6bf9b'),('--cream-active','#c7ae86'),('--gold','#fbd295'),('ink (btn text)','#1a120b'),('form error text','#e7889b'),('form error border','#c25c74'),('select panel','#2a0a12')]
measured=[
 ('#160710','hero-desktop video, darkest k-means cluster (52% of sampled px)','aubergine shadow'),
 ('#14050e','hero-mobile video, darkest cluster (41%)','aubergine shadow'),
 ('#1c070f','hero-night-hq-desktop.webp, darkest cluster (62%)','aubergine shadow'),
 ('#110c0a','bHchR photo (Chivas floor), darkest cluster (72%)','neutral warm-black shadow'),
 ('#0b090b','RMGSD photo (band at bar), darkest cluster (69%)','neutral black shadow'),
 ('#080811','u3EOm photo (singer), darkest cluster (78%)','blue-black shadow'),
 ('#100303','nBW0 hero fallback, darkest cluster (53%)','red-black shadow (graded)'),
 ('#3e1108','bHchR cluster 2 (11%)','deep oxblood glow'),
 ('#831c0d','bHchR cluster 3 (7%)','stage red, deep'),
 ('#a82606','MHGyp / YANjq stage-red px median (hue 25-50, C>45)','stage red, deep'),
 ('#e03a03','LED/neon px median, MHGyp and bHchR (heuristic mask)','LED orange-red, hot'),
 ('#fa430f','LED/neon px median, u3EOm','LED orange-red, hot'),
 ('#af0f08','nBW0 hero fallback brightest red cluster (3%)','graded pure red'),
 ('#c28666','lit skin px median, u3EOm (heuristic mask); region crop median #c48363','skin, lit'),
 ('#c88464','lit skin px median, cDJcC','skin, lit'),
 ('#d69f3b','RMGSD lamp/bulb region median (crop brass-lamp-amber)','brass / tungsten lamp'),
 ('#daa74d','brass px median, RMGSD','brass / amber'),
 ('#a2865f','hero-desktop video cluster (6%)','brass, dim'),
 ('#a78c59','hero-mobile video cluster (4%)','brass, dim'),
 ('#c9aa59','hero-night-hq-desktop.webp cluster (1%), yellow spot beam','spotlight yellow'),
 ('#fdca7d','brass px median, bHchR (bright end)','brass highlight'),
 ('#d5906e','u3EOm warm highlight median (L*>60, C>20)','warm highlight, peach'),
 ('#fa9f5f','bHchR warm highlight median','warm highlight, amber'),
 ('#bd9f71','hero-desktop video warm highlight median','warm highlight, video'),
 ('#0d38a8','u3EOm cluster (4%)','stage blue wash'),
 ('#0a1c89','cDJcC cluster (13%)','stage blue wash'),
 ('#1e4576','RMGSD cluster (4%)','blue LED display'),
 ('#e9ecdb','relacja video: white flash / signage cluster (14%)','cold white'),
 ('#fdfaf8','pGGB9 poster white text (5%)','poster white'),
]
sw=[]
# swatch image
cols=6; W=260; H=110
allsw=[(n,h,'token') for n,h in tokens]+[(r,h,s) for h,s,r in [(m[0],m[1],m[2]) for m in measured]]
allsw=[(n,h,src) for (n,h,src) in [(a[0],a[1],a[2]) for a in allsw]]
rows=(len(allsw)+cols-1)//cols
img=Image.new('RGB',(cols*W,rows*H),(24,24,24)); d=ImageDraw.Draw(img)
def lumtxt(h):
    r,g,b=[int(h[i:i+2],16) for i in (1,3,5)]; return (0,0,0) if (0.299*r+0.587*g+0.114*b)>140 else (255,255,255)
lst=[(n,h) for n,h in tokens]+[(m[2],m[0]) for m in measured]
for i,(n,h) in enumerate(lst):
    r,c=divmod(i,cols); d.rectangle([c*W,r*H,(c+1)*W-4,(r+1)*H-4],fill=h)
    d.text((c*W+8,r*H+8),h,fill=lumtxt(h)); d.text((c*W+8,r*H+24),n[:34],fill=lumtxt(h))
    if i<len(tokens): d.text((c*W+8,r*H+H-24),'site token',fill=lumtxt(h))
img.save(OUT+'palette-swatches.png')
# delta table
out='| site token | hex | Lab (L*, C, h) | nearest measured colour | dE76 | measured role |\n|---|---|---|---|---|---|\n'
for n,h in tokens:
    l=lab(h); best=min(measured,key=lambda m:dE(h,m[0]))
    out+=f"| {n} | `{h}` | {l[0]:.0f}, {np.hypot(l[1],l[2]):.0f}, {hue(l):.0f} | `{best[0]}` {best[2]} | {dE(h,best[0]):.1f} | {best[1][:60]} |\n"
out+='\n| measured colour | hex | Lab (L*, C, h) | dE76 to --bg #27060f | dE76 to --cream | dE76 to --gold |\n|---|---|---|---|---|---|\n'
for h,s,r in measured:
    l=lab(h); out+=f"| {r} | `{h}` | {l[0]:.0f}, {np.hypot(l[1],l[2]):.0f}, {hue(l):.0f} | {dE(h,'#27060f'):.1f} | {dE(h,'#eddbc2'):.1f} | {dE(h,'#fbd295'):.1f} |\n"
open(OUT+'data/palette-delta.md','w').write(out); print(out)
