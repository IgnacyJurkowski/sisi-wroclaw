#!/usr/bin/env python3
"""Contact sheet of public/blog/*-640.webp (generated blog hero art), plus pooled Lab k-means and per-image mean L*."""
from PIL import Image, ImageDraw
import glob, os, numpy as np, cv2
fs=sorted(glob.glob('/home/user/sisi-elevate/public/blog/*-640.webp'))
cols=6; cw,ch=300,200; rows=(len(fs)+cols-1)//cols
S=Image.new('RGB',(cols*cw,rows*(ch+14)),(20,20,20)); d=ImageDraw.Draw(S)
px=[]; Ls=[]
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB'); a=np.asarray(im.resize((160,107)))
    lab=cv2.cvtColor(a.astype(np.float32)/255,cv2.COLOR_RGB2Lab); Ls.append(lab[...,0].mean()); px.append(a.reshape(-1,3))
    t=im.copy(); t.thumbnail((cw-4,ch-4)); r,c=divmod(i,cols); S.paste(t,(c*cw+2,r*(ch+14)+2)); d.text((c*cw+2,r*(ch+14)+ch-2),os.path.basename(f)[3:30],fill=(255,255,255))
S.save('/home/user/sisi-elevate/docs/sisi-elevate/brand/blog-hero-sheet.jpg',quality=80)
px=np.vstack(px); lab=cv2.cvtColor(px.reshape(-1,1,3).astype(np.float32)/255,cv2.COLOR_RGB2Lab).reshape(-1,3)
cv2.setRNGSeed(1)
_,lbl,cen=cv2.kmeans(lab.astype(np.float32),8,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,60,0.5),3,cv2.KMEANS_PP_CENTERS)
sh=np.bincount(lbl.ravel(),minlength=8)/len(lbl); o=np.argsort(-sh)
rgb=np.clip(cv2.cvtColor(cen[o].reshape(-1,1,3).astype(np.float32),cv2.COLOR_Lab2RGB).reshape(-1,3)*255+.5,0,255).astype(int)
print(len(fs),'files (640w). mean L* over images: %.1f (min %.1f max %.1f)'%(np.mean(Ls),min(Ls),max(Ls)))
print('pooled k-means k=8:',' '.join('#%02x%02x%02x %.0f%%'%(*rgb[i],sh[o][i]*100) for i in range(8)))
