#!/usr/bin/env python3
"""Extract 12 evenly spaced frames per video (OpenCV), write a 4x3 contact sheet per video
to brand/video-<name>-sheet.jpg, and save frames (in scratch dir) for color analysis.
Usage: video_frames.py <scratch_dir>"""
import cv2, os, sys, json
import numpy as np
ROOT='/home/user/sisi-elevate'
OUT=ROOT+'/docs/sisi-elevate/brand'
scratch=sys.argv[1]; os.makedirs(scratch,exist_ok=True)
vids={
 'hero-desktop':'public/video/hero-night-hq-desktop.mp4',
 'hero-mobile':'public/video/hero-night-hq-mobile.mp4',
 'relacja':'public/video/relacja-z-otwarcia.mp4',
 'framer-asset':'public/framerusercontent.com/assets/MLWPbW1dUQawJLhhun3dBwpgJak.mp4',
}
meta={}
for name,rel in vids.items():
    cap=cv2.VideoCapture(os.path.join(ROOT,rel))
    n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); fps=cap.get(cv2.CAP_PROP_FPS)
    idx=[int((i+0.5)*n/12) for i in range(12)]
    frames=[]
    for k,i in enumerate(idx):
        cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,fr=cap.read()
        if not ok: print('fail',name,i); continue
        cv2.imwrite(f'{scratch}/{name}-f{k:02d}.png',fr)
        frames.append(fr)
    h,w=frames[0].shape[:2]
    tw=480 if w>=h else 270; th=int(tw*h/w)
    cols=4 if w>=h else 6; rows=12//cols
    sheet=np.zeros((rows*th,cols*tw,3),np.uint8)
    for k,fr in enumerate(frames):
        t=cv2.resize(fr,(tw,th),interpolation=cv2.INTER_AREA)
        cv2.putText(t,f'{idx[k]/fps:.1f}s',(6,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(255,255,255),1,cv2.LINE_AA)
        r,c=divmod(k,cols); sheet[r*th:(r+1)*th,c*tw:(c+1)*tw]=t
    cv2.imwrite(f'{OUT}/video-{name}-sheet.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,82])
    meta[name]=dict(frames=n,fps=fps,size=(w,h),idx=idx)
print(json.dumps(meta))
