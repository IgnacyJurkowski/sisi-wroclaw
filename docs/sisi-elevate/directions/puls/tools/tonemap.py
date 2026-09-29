#!/usr/bin/env python3
"""Puls tone map: an iso-lightness hue map built from the hero film's measured grade.
Each pixel keeps its own CIE L* (so the tonal structure, faces included, is unchanged).
Its a*/b* are pulled toward the ramp colour that sits at that lightness on the film's
aubergine -> oxblood -> peach-brown -> brass -> amber curve; a fraction M of the photo's own a*/b* is kept.
Stops are measured swatches from BRAND.md section 2.2/2.3 (source in the STOPS comments)."""
import numpy as np, cv2
from PIL import Image

STOPS = [  # hex, measured source
 ('#14050e', 'hero-night-hq-mobile film, darkest cluster (41%)'),
 ('#321214', 'hero-night-hq-desktop film, cluster 2 (16%)'),
 ('#6b432f', 'hero-night-hq-desktop film, cluster 3 (12%) peach-brown'),
 ('#a2865f', 'hero-night-hq-desktop film, cluster (6%) dim brass'),
 ('#daa74d', 'RMGSD brass mask median (amber brass)'),
 ('#fdca7d', 'bHchR brass mask median (brass highlight, = --gold within dE 10)'),
]
def hex2rgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],np.float32)/255
def lab_of(rgb): return cv2.cvtColor(rgb.reshape(1,1,3).astype(np.float32),cv2.COLOR_RGB2Lab).reshape(3)
STOP_LAB = np.array([lab_of(hex2rgb(h)) for h,_ in STOPS])   # L*, a*, b*

def ramp_ab(L):
    """a*,b* of the ramp at lightness L (arrays). Below the first stop / above the last: held."""
    xs=STOP_LAB[:,0]
    a=np.interp(L,xs,STOP_LAB[:,1]); b=np.interp(L,xs,STOP_LAB[:,2])
    return a,b

def smooth(x,lo0,lo1,hi1,hi0):
    """0 below lo0, ramps to 1 at lo1, holds to hi1, ramps to 0 at hi0"""
    return np.clip(np.minimum((x-lo0)/max(lo1-lo0,1e-6),(hi0-x)/max(hi0-hi1,1e-6)),0,1)

def tonemap(img, keep_lo=0.10, keep_hi=0.35, keep_split=(6.0,30.0), protect=0.0):
    """img: PIL RGB. keep = share of the photo's own a*/b* that survives (low in shadows, so blacks go aubergine).
    protect > 0 keeps up to that share of the photo's own a*/b* on (a) lit skin and (b) saturated warm light (LED strips, beams)."""
    rgb=np.asarray(img.convert('RGB'),np.float32)/255
    lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2Lab)
    L,a,b=lab[...,0],lab[...,1],lab[...,2]
    ra,rb=ramp_ab(L)
    t=np.clip((L-keep_split[0])/(keep_split[1]-keep_split[0]),0,1)
    m=keep_lo+(keep_hi-keep_lo)*t
    if protect>0:
        C=np.hypot(a,b); H=np.degrees(np.arctan2(b,a))%360
        w_skin=smooth(H,28,38,62,72)*smooth(C,12,20,45,55)*smooth(L,35,48,78,88)
        w_led=smooth(H,20,30,55,68)*smooth(C,35,60,130,131)*smooth(L,20,35,95,96)
        m=np.maximum(m,protect*np.maximum(w_skin,w_led))
    lab2=np.stack([L,(1-m)*ra+m*a,(1-m)*rb+m*b],-1).astype(np.float32)
    out=cv2.cvtColor(lab2,cv2.COLOR_Lab2RGB)
    return Image.fromarray((np.clip(out,0,1)*255+0.5).astype(np.uint8))

# heuristic masks from brand/scripts/skin_led.py (Inference-grade)
def masks(img):
    a=np.asarray(img.convert('RGB'),np.float32)/255
    lab=cv2.cvtColor(a,cv2.COLOR_RGB2Lab)
    L=lab[...,0]; C=np.hypot(lab[...,1],lab[...,2]); H=np.degrees(np.arctan2(lab[...,2],lab[...,1]))%360
    return {'skin':(H>35)&(H<65)&(C>18)&(C<45)&(L>45)&(L<80),'LED':(H>30)&(H<55)&(C>=65)&(L>=40),'cobalt':(H>250)&(H<310)&(C>=40)&(L>=15)}
def hx(v): return '#%02x%02x%02x'%tuple(int(x) for x in v)
def dE76(l1,l2): return float(np.linalg.norm(np.array(l1)-np.array(l2)))
def report(name,src,dst):
    ms=masks(src); s=np.asarray(src.convert('RGB')); d=np.asarray(dst.convert('RGB'))
    out=[]
    for k,m in ms.items():
        if m.sum()<200: out.append(f'{k}: n/a'); continue
        cs=np.median(s[m],0); cd=np.median(d[m],0)
        de=dE76(lab_of(cs/255),lab_of(cd/255))
        # hue spread of skin after (does everyone collapse to one hue?)
        out.append(f'{k}: {m.mean()*100:.1f}% px, median {hx(cs)} -> {hx(cd)} (dE76 {de:.1f})')
    print(f'{name}: '+' | '.join(out))

if __name__=='__main__':
    import sys
    R='/home/user/sisi-elevate/public/framerusercontent.com/images/'
    for n,f in [('RMGSD','RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp'),('MHGyp','MHGypGkoM6EkRCjBAVKzMUmwRG4.webp')]:
        im=Image.open(R+f).convert('RGB'); out=tonemap(im); out2=tonemap(im,protect=0.65); report(n+' plain',im,out); report(n+' protect',im,out2)
        w=Image.new('RGB',(im.width*3+20,im.height),(39,6,15)); w.paste(im,(0,0)); w.paste(out,(im.width+10,0)); w.paste(out2,(im.width*2+20,0)); w.save(f'/tmp/tm-{n}.jpg',quality=88)
