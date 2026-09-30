#!/usr/bin/env python3
"""WCAG 2.x contrast. relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B on linearised sRGB
(c/255 <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4); ratio = (L1+0.05)/(L2+0.05), L1 >= L2.
Alpha colours are composited over the stated background first.
Thresholds: 4.5 normal text, 3.0 large text (>=24px or >=18.66px bold) and UI components/graphics.
Usage: wcag.py  (also run with --hero <frames_dir> for the hero-over-video measurement)"""
import sys, glob
import numpy as np, cv2
def h2rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def lin(c): c=c/255.0; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(rgb): r,g,b=[lin(x) for x in rgb]; return 0.2126*r+0.7152*g+0.0722*b
def ratio(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def over(fg,a,bg): return tuple(fg[i]*a+bg[i]*(1-a) for i in range(3))
BG=h2rgb('#27060f'); PANEL=h2rgb('#34101a'); PANEL2=h2rgb('#3d1320'); CREAM=(237,219,194); GOLD=h2rgb('#fbd295'); INK=h2rgb('#1a120b')
CREAM_PRESS=h2rgb('#d6bf9b'); SELECT=h2rgb('#2a0a12')
# glass card: rgba(39,7,15,.42) over the drifting field (assume BG) -> approx BG
pairs=[
 # name, fg, bg, size class, where used
 ('--text cream on --bg','text',CREAM,BG,'body text (global.css:29,52)'),
 ('--text on --panel',None,CREAM,PANEL,'cards'),
 ('--text-dim (.82) on --bg',None,over(CREAM,.82,BG),BG,'descriptors, .page-subtitle, .menu-item-desc 13px'),
 ('--text-dim on --panel',None,over(CREAM,.82,PANEL),PANEL,''),
 ('--text-faint (.70) on --bg',None,over(CREAM,.70,BG),BG,'hero-scroll 11px, form hints 12px, .opt 11px'),
 ('--text-faint on --panel',None,over(CREAM,.70,PANEL),PANEL,''),
 ('--text-mute (.62) on --bg',None,over(CREAM,.62,BG),BG,'footer-bottom 12px, event date 14px, menu vol 11px, pcol 11px'),
 ('--text-mute on --panel',None,over(CREAM,.62,PANEL),PANEL,''),
 ('--text-mute on --panel-2',None,over(CREAM,.62,PANEL2),PANEL2,''),
 ('--line (.24) on --bg (non-text)',None,over(CREAM,.24,BG),BG,'dividers, borders (needs 3:1 only if they carry meaning)'),
 ('btn-cta: #1a120b on --cream',None,INK,CREAM,'primary button 12px/700 uppercase'),
 ('btn-cta hover: #1a120b on --cream-press',None,INK,CREAM_PRESS,''),
 ('btn-outline: --text-dim on rgba(39,7,15,.55) over --bg',None,over(CREAM,.82,over(BG,.55,BG)),over(BG,.55,BG),'ghost button 12px/700'),
 ('--gold #fbd295 on --bg',None,GOLD,BG,'menu labels, stat values, icons, link hover'),
 ('--gold on --panel',None,GOLD,PANEL,''),
 ('form error #e7889b on --bg',None,h2rgb('#e7889b'),BG,'.private-field-error 12px'),
 ('form error border #c25c74 on --bg (non-text)',None,h2rgb('#c25c74'),BG,'invalid input border'),
 ('form error #a8475f on --bg (non-text)',None,h2rgb('#a8475f'),BG,'status-error border'),
 ('cream on #2a0a12 select',None,CREAM,SELECT,'dropdown panels'),
 ('meta theme-color: #27060f vs #000 (browser chrome)',None,BG,(0,0,0),'context only'),
]
cand=[
 ('brass sample #d69f3b on --bg',h2rgb('#d69f3b'),BG),
 ('brass sample #a78c59 (video cluster) on --bg',h2rgb('#a78c59'),BG),
 ('LED red #e03a03 on --bg',h2rgb('#e03a03'),BG),
 ('stage red #b51b01 on --bg',h2rgb('#b51b01'),BG),
 ('stage red #b51b01 on cream',h2rgb('#b51b01'),CREAM),
 ('cream on stage red #b51b01',CREAM,h2rgb('#b51b01')),
 ('cream on LED red #e03a03',CREAM,h2rgb('#e03a03')),
 ('white on LED red #e03a03',(255,255,255),h2rgb('#e03a03')),
 ('--bg #27060f on --gold',BG,GOLD),
 ('--bg on --cream',BG,CREAM),
 ('near-black #0b090b (photo shadow) with cream',CREAM,h2rgb('#0b090b')),
 ('cream on aubergine-black #14050e (video shadow)',CREAM,h2rgb('#14050e')),
 ('cream on hero fallback shadow #100303',CREAM,h2rgb('#100303')),
 ('rose #c25c74 on --bg (proposed accent text?)',h2rgb('#c25c74'),BG),
 ('rose #e7889b on --bg',h2rgb('#e7889b'),BG),
 ('cream at .50 on --bg',over(CREAM,.5,BG),BG),
 ('cream at .55 on --bg',over(CREAM,.55,BG),BG),
 ('gold at .70 on --bg',over(GOLD,.7,BG),BG),
 ('cream on #34101a panel',CREAM,PANEL),
 ('#1a120b on brass #d69f3b',INK,h2rgb('#d69f3b')),
 ('cream on brass #a78c59',CREAM,h2rgb('#a78c59')),
]
def row(n,fg,bg,note=''):
    r=ratio(fg,bg); return f"| {n} | `#{int(round(fg[0])):02x}{int(round(fg[1])):02x}{int(round(fg[2])):02x}` | `#{int(round(bg[0])):02x}{int(round(bg[1])):02x}{int(round(bg[2])):02x}` | {r:.2f} | {'pass' if r>=4.5 else 'FAIL'} | {'pass' if r>=3 else 'FAIL'} | {note} |"
if len(sys.argv)>1 and sys.argv[1]=='--hero':
    d=sys.argv[2]
    print('| frame | hero region | bg lum p50 | bg lum p95 | cream vs p50 | cream vs p95 | worst pixel share below 4.5 |\n|---|---|---|---|---|---|---|')
    # scrim: linear-gradient(180deg, rgba(23,4,9,.5) 0%, .38 45%, rgba(39,6,15,.12) 78%, transparent 100%)
    for name in ['hero-desktop','hero-mobile']:
        for f in sorted(glob.glob(f'{d}/{name}-f*.png')):
            im=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2RGB).astype(np.float64)
            H,W=im.shape[:2]
            ys=np.linspace(0,1,H)
            alpha=np.interp(ys,[0,.45,.78,1],[.5,.38,.12,0])
            col=np.array([[23,4,9],[23,4,9],[39,6,15],[39,6,15]],float)
            sc=np.stack([np.interp(ys,[0,.45,.78,1],col[:,i]) for i in range(3)],1)
            comp=im*(1-alpha[:,None,None])+sc[:,None,:]*alpha[:,None,None]
            # title+descriptor+buttons band: 30%..70% of height, central 60% of width
            band=comp[int(.30*H):int(.70*H),int(.2*W):int(.8*W)]
            l=(0.2126*np.vectorize(lin)(band[...,0][::4,::4])+0.7152*np.vectorize(lin)(band[...,1][::4,::4])+0.0722*np.vectorize(lin)(band[...,2][::4,::4]))
            p50,p95=np.percentile(l,50),np.percentile(l,95); lc=lum(CREAM)
            r=lambda y:(lc+0.05)/(y+0.05)
            share=(( (lc+0.05)/(l+0.05))<4.5).mean()
            print(f"| {name} {f[-7:-4]} | 30-70% h, 20-80% w | {p50:.4f} | {p95:.4f} | {r(p50):.2f} | {r(p95):.2f} | {share*100:.1f}% |")

    # .hero-scroll label (Hero.astro:127-139): --text-faint (cream at .70) over the bottom of the frame, scrim ~0 there
    print('\n| frame | hero-scroll band (86-96% h, 42-58% w) | contrast of cream@.70 vs median pixel | at brightest 5% of pixels (5th percentile of contrast) | share of px below 4.5 |\n|---|---|---|---|---|')
    for name in ['hero-desktop','hero-mobile']:
        for f in sorted(glob.glob(f'{d}/{name}-f*.png')):
            im=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2RGB).astype(np.float64); H,W=im.shape[:2]
            band=im[int(.86*H):int(.96*H),int(.42*W):int(.58*W)].reshape(-1,3)[::3]
            fgc=np.array(CREAM,float)*0.70
            def contrast(px):
                fg=fgc+px*0.30
                lf=0.2126*np.vectorize(lin)(fg[:,0])+0.7152*np.vectorize(lin)(fg[:,1])+0.0722*np.vectorize(lin)(fg[:,2])
                lb=0.2126*np.vectorize(lin)(px[:,0])+0.7152*np.vectorize(lin)(px[:,1])+0.0722*np.vectorize(lin)(px[:,2])
                return (np.maximum(lf,lb)+0.05)/(np.minimum(lf,lb)+0.05)
            c=contrast(band)
            print(f"| {name} {f[-7:-4]} | | {np.percentile(c,50):.2f} | {np.percentile(c,5):.2f} | {(c<4.5).mean()*100:.1f}% |")
    sys.exit()
print('### Site pairs (tokens from src/styles/global.css :root, values composited over the stated background)\n')
print('| pair | fg | bg | ratio | AA 4.5 | 3:1 | used for |\n|---|---|---|---|---|---|---|')
for n,_,fg,bg,note in pairs: print(row(n,fg,bg,note))
print('\n### Candidate pairs\n')
print('| pair | fg | bg | ratio | AA 4.5 | 3:1 | |\n|---|---|---|---|---|---|---|')
for n,fg,bg in cand: print(row(n,fg,bg))
