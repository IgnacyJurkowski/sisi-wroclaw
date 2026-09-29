#!/usr/bin/env python3
"""Color measurements for SiSi assets.
For each image: mean relative luminance Y (WCAG, linear), mean/percentile CIE L*, k-means (k=6, Lab, 80k px sample, seed 1)
cluster centres as hex + share, warm-highlight hue (pixels L*>60 & chroma>20: circular mean hue, median colour).
Video: uses frames saved by video_frames.py (scratch dir arg), aggregated per video.
Output: brand/data/colors-images.md and colors-video.md, palette swatch PNGs.
Usage: colors.py <scratch_frames_dir>"""
import sys, glob, os, math
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
R='/home/user/sisi-elevate/public/'
OUT='/home/user/sisi-elevate/docs/sisi-elevate/brand/data/'
def srgb2lin(c): c=c/255.0; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def lab_from_rgb(rgb):  # rgb uint8 Nx3 -> Lab float (L 0-100)
    a=rgb.reshape(-1,1,3).astype(np.float32)/255.0
    return cv2.cvtColor(a,cv2.COLOR_RGB2Lab).reshape(-1,3)
def rgb_from_lab(lab):
    a=np.array(lab,np.float32).reshape(-1,1,3)
    return np.clip(cv2.cvtColor(a,cv2.COLOR_Lab2RGB).reshape(-1,3)*255+0.5,0,255).astype(int)
def hexs(rgb): return '#%02x%02x%02x'%tuple(int(x) for x in rgb)
def analyse(rgb_pixels, k=6, seed=1):
    rng=np.random.default_rng(seed)
    n=len(rgb_pixels)
    sel=rgb_pixels[rng.choice(n,min(n,80000),replace=False)]
    lab=lab_from_rgb(sel)
    lin=srgb2lin(sel.astype(np.float64))
    Y=(0.2126*lin[:,0]+0.7152*lin[:,1]+0.0722*lin[:,2])
    res={}
    res['Y_mean']=Y.mean()
    res['L_mean']=lab[:,0].mean()
    res['L_pct']={p:np.percentile(lab[:,0],p) for p in (1,5,50,95,99)}
    crit=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,60,0.5)
    cv2.setRNGSeed(seed)
    _,labels,centers=cv2.kmeans(lab.astype(np.float32),k,None,crit,4,cv2.KMEANS_PP_CENTERS)
    shares=np.bincount(labels.ravel(),minlength=k)/len(labels)
    order=np.argsort(-shares)
    cols=rgb_from_lab(centers[order])
    res['clusters']=[(hexs(cols[i]),float(shares[order][i]),float(centers[order][i][0])) for i in range(k)]
    # warm highlights
    C=np.hypot(lab[:,1],lab[:,2]); H=np.degrees(np.arctan2(lab[:,2],lab[:,1]))%360
    m=(lab[:,0]>60)&(C>20)
    res['hi_frac']=float(m.mean())
    if m.sum()>50:
        hs=np.radians(H[m]); res['hi_hue']=float(np.degrees(np.arctan2(np.sin(hs).mean(),np.cos(hs).mean()))%360)
        res['hi_med']=hexs(np.median(sel[m],axis=0))
        res['hi_p95']=hexs(np.percentile(sel[m],90,axis=0))
    else: res['hi_hue']=None; res['hi_med']=None; res['hi_p95']=None
    # stage red: hue 20-45deg in Lab? red ~ 30-45 degrees (a+ b+), C>40
    m2=(H>25)&(H<50)&(C>45)&(lab[:,0]>25)
    res['red_frac']=float(m2.mean())
    res['red_med']=hexs(np.median(sel[m2],axis=0)) if m2.sum()>50 else None
    return res
def load(path):
    im=Image.open(path)
    if im.mode in ('RGBA','LA','P'):
        im=im.convert('RGBA'); bg=Image.new('RGBA',im.size,(0,0,0,255)); bg.alpha_composite(im); im=bg
    im=im.convert('RGB')
    if max(im.size)>1600: im.thumbnail((1600,1600))
    return np.asarray(im).reshape(-1,3)
def fmt_rows(name,res):
    cl=' '.join(f'`{h}` {s*100:.0f}%' for h,s,_ in res['clusters'])
    p=res['L_pct']
    return (f"| {name} | {res['Y_mean']:.4f} | {res['L_mean']:.1f} | {p[1]:.0f}/{p[5]:.0f}/{p[50]:.0f}/{p[95]:.0f}/{p[99]:.0f} | {cl} | "
            f"{res['hi_frac']*100:.1f}% {res['hi_hue'] and round(res['hi_hue'])} `{res['hi_med']}` | {res['red_frac']*100:.1f}% `{res['red_med']}` |")
head="| asset | mean Y (WCAG rel. lum.) | mean L* | L* p1/p5/p50/p95/p99 | k-means k=6 (Lab) | warm highlights (L*>60,C>20): share, hue deg (Lab), median | stage-red px (hue 25-50, C>45): share, median |\n|---|---|---|---|---|---|---|\n"
imgs=[
 'framerusercontent.com/images/nBW0AVejCOoiy2Rctqcid0SY6Q.webp','framerusercontent.com/images/u3EOm1VtOnATOkUYHKikl5aBc.webp',
 'framerusercontent.com/images/RMGSDUbOPnta4fZZQKL5BcnP3Pw.webp','framerusercontent.com/images/bHchRJgtNrxKTYRK56SCdUph2g.webp',
 'framerusercontent.com/images/cDJcCUEanjQSoFpALHKgU3hNpQ.webp','framerusercontent.com/images/MHGypGkoM6EkRCjBAVKzMUmwRG4.webp',
 'images/menu/bar-cocktails.webp','video/hero-night-hq-desktop.webp','video/hero-night-hq-mobile.webp','video/relacja-z-otwarcia-poster.webp']
imgs_un=['framerusercontent.com/images/'+n for n in ['9B6KtYNY7Q7iRZbVMFiESRAmv1I.jpg','BhLu6TEmxTduoC9Pjn93Svcgtc.jpg','YANjqHXpbp64zG9ZMX3q3VMQo.jpg','RHdmR5s8jXTtyexi8FJLI4WDkig.webp','QxXDx4GN74BgGuzaDth23HA.webp',
 'Olq6a1v5gLRrCox00t2wOi8ATTw.jpeg','Vl3kSLbolFditeShXmcLZITH7A8.webp','loXZHRygofAyWJdOaLJm2nba20Y.webp','pGGB9XWB2h0vJy9v9FeUIzcQb5w.jpg','v46yfJcN1YsEaZZEo9Kc6gXqbo.png']]
out='## Referenced images\n\n'+head
allres={}
for f in imgs:
    r=analyse(load(R+f)); allres[f]=r; out+=fmt_rows(f.split('/')[-1],r)+'\n'
out+='\n## Present in public/ but not referenced by src or dist HTML\n\n'+head
for f in imgs_un:
    r=analyse(load(R+f)); allres[f]=r; out+=fmt_rows(f.split('/')[-1],r)+'\n'
open(OUT+'colors-images.md','w').write(out)
# video
vout='| video | frames sampled | mean Y | mean L* | L* p1/p5/p50/p95/p99 | k-means k=6 | warm highlights | stage-red |\n|---|---|---|---|---|---|---|---|\n'
scr=sys.argv[1]
perframe=[]
for name in ['hero-desktop','hero-mobile','relacja','framer-asset']:
    fs=sorted(glob.glob(f'{scr}/{name}-f*.png'))
    px=[]
    for f in fs:
        im=cv2.imread(f); im=cv2.resize(im,(im.shape[1]//3,im.shape[0]//3),interpolation=cv2.INTER_AREA)
        px.append(cv2.cvtColor(im,cv2.COLOR_BGR2RGB).reshape(-1,3))
    px=np.vstack(px); r=analyse(px)
    row=fmt_rows(name,r); parts=row.split(' | ',1)
    vout+=parts[0]+f' | {len(fs)} | '+parts[1]+'\n'
    # per-frame mean Y
    ys=[]
    for f in fs:
        im=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2RGB).reshape(-1,3)[::50]
        l=srgb2lin(im.astype(np.float64)); ys.append((0.2126*l[:,0]+0.7152*l[:,1]+0.0722*l[:,2]).mean())
    perframe.append(f'- {name}: '+' '.join(f'{y:.3f}' for y in ys))
vout+='\nPer-frame mean Y (12 frames, in time order):\n\n'+'\n'.join(perframe)+'\n'
open(OUT+'colors-video.md','w').write(vout)
print(out); print(vout)
