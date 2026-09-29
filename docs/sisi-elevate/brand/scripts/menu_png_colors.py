#!/usr/bin/env python3
"""Modal colours of the two panels in the unreferenced print-menu PNG (framerusercontent.com/images/AYLWOJ...png, 1920x7793)."""
from PIL import Image
import numpy as np, cv2
im=np.asarray(Image.open('/home/user/sisi-elevate/public/framerusercontent.com/images/AYLWOJkDYihbF5j37ZCQ3GqMi4.png').convert('RGB'))
red=im[100:1500,1400:1900].reshape(-1,3); cr=im[100:1500,0:100].reshape(-1,3)
def mode(a):
    v,c=np.unique(a,axis=0,return_counts=True); return v[c.argmax()]
for n,a in [('red panel',red),('paper',cr)]:
    m=mode(a); rgb=np.array([[m]],np.float32)/255; l=cv2.cvtColor(rgb,cv2.COLOR_RGB2Lab)[0,0]
    print(n,'#%02x%02x%02x'%tuple(m),'L*=%.0f C=%.0f h=%.0f'%(l[0],np.hypot(l[1],l[2]),np.degrees(np.arctan2(l[2],l[1]))%360))
def lin(c): c=c/255; return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
L=lambda m:0.2126*lin(m[0])+0.7152*lin(m[1])+0.0722*lin(m[2])
r,p=mode(red),mode(cr); print('paper on red contrast %.2f'%((L(p)+.05)/(L(r)+.05)))
