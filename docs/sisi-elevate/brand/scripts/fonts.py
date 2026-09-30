#!/usr/bin/env python3
"""Inspect every woff2 under public/ and the base64 Montserrat in global.css with fontTools.
Prints: file, bytes, family/subfamily, version, license text (name IDs 0,13,14), fvar axes, glyph count, Polish coverage (ąćęłńóśźż + capitals), cmap range."""
import glob, os, re, base64, io, sys
from fontTools.ttLib import TTFont
R='/home/user/sisi-elevate/'
PL='ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'
def info(font, label, size):
    f=font; nm=f['name']
    def g(i):
        r=nm.getName(i,3,1,0x409) or nm.getName(i,1,0,0)
        return (r.toUnicode() if r else '')
    fam=g(16) or g(1); sub=g(17) or g(2)
    cmap=f.getBestCmap()
    have=[c for c in PL if ord(c) in cmap]; miss=[c for c in PL if ord(c) not in cmap]
    axes=''
    if 'fvar' in f: axes=';'.join(f"{a.axisTag}={a.minValue:g}-{a.maxValue:g}" for a in f['fvar'].axes)
    os2=f['OS/2']
    print(f"{label} | {size}B | {fam} / {sub} | v={g(5)[:28]} | wght={os2.usWeightClass} | axes={axes or '-'} | glyphs={len(f.getGlyphOrder())} | cmap={len(cmap)} | PL {len(have)}/{len(PL)} miss={''.join(miss) or '-'} | ASCII a-z={all(ord(c) in cmap for c in 'abcxyzABCXYZ')} | ital={bool(os2.fsSelection&1)}")
    print(f"     copyright: {g(0)[:150]}")
    print(f"     licence: {g(13)[:180]} | url: {g(14)[:80]} | vendor: {g(8)[:60]} | designer: {g(9)[:60]}")
    rng=sorted(cmap); 
    print(f"     cmap min U+{rng[0]:04X} max U+{rng[-1]:04X}; has ł={0x142 in cmap} Ł={0x141 in cmap} €={0x20AC in cmap} „={0x201E in cmap} ”={0x201D in cmap} –={0x2013 in cmap} …={0x2026 in cmap} ä={0xE4 in cmap} ß={0xDF in cmap} č={0x10D in cmap} ě={0x11B in cmap} ř={0x159 in cmap} ů={0x16F in cmap} ì={0xEC in cmap}")
css=open(R+'src/styles/global.css').read()
m=re.search(r"data:font/woff2;base64,([A-Za-z0-9+/=]+)",css)
raw=base64.b64decode(m.group(1)); 
open('/tmp/montserrat-inline.woff2','wb').write(raw)
info(TTFont(io.BytesIO(raw)),'global.css:24 inline Montserrat',len(raw))
for p in sorted(glob.glob(R+'public/**/*.woff2',recursive=True)):
    if '/blog' in p: continue
    try: info(TTFont(p),p.replace(R+'public/',''),os.path.getsize(p))
    except Exception as e: print(p,'ERR',e)
