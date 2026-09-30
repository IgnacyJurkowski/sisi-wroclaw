#!/usr/bin/env python3
"""Inventory raster/svg images under public/ (excluding blog and licenses): dims, bytes, referenced-by-src/dist flag."""
import os, subprocess, sys
from PIL import Image
ROOT='/home/user/sisi-elevate'
DIST='/home/user/sisi-baseline/dist'
def grep(name):
    r=subprocess.run(['grep','-rIl','--include=*.astro','--include=*.ts','--include=*.mjs','--include=*.css','--include=*.html','--include=*.js','--include=*.txt','--include=*.xml',name,ROOT+'/src',ROOT+'/scripts',DIST],capture_output=True,text=True)
    return [x for x in r.stdout.split('\n') if x]
rows=[]
for dp,dn,fn in os.walk(ROOT+'/public'):
    if '/blog' in dp or '/licenses' in dp: continue
    for f in sorted(fn):
        if not f.lower().endswith(('.png','.jpg','.jpeg','.webp','.avif','.svg')): continue
        p=os.path.join(dp,f)
        rel=os.path.relpath(p,ROOT+'/public')
        try:
            if f.endswith('.svg'): dims='vector'
            else:
                im=Image.open(p); dims=f'{im.size[0]}x{im.size[1]}'
        except Exception as e: dims='ERR '+str(e)[:30]
        stem=os.path.splitext(f)[0]
        stem=stem.rsplit('-',1)[0] if stem.endswith(('-400','-700')) else stem
        refs=grep(stem)
        nsrc=len([r for r in refs if r.startswith(ROOT+'/src')])
        ndist=len([r for r in refs if r.startswith(DIST)])
        rows.append((rel,dims,os.path.getsize(p),nsrc,ndist))
print('| file | px | bytes | src refs (files) | dist refs (files) |')
for r in rows: print('| %s | %s | %d | %d | %d |'%r)
