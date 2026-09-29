#!/usr/bin/env python3
"""Subset the two Pierscien faces to Latin + Latin-Extended-A (pl cs de it en) and limit the variable axes.
Sources: google/fonts main (OFL 1.1). Neither font declares a Reserved Font Name (name ID 0 checked).
usage: subset_fonts.py SRC_DIR OUT_DIR
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

src, out = sys.argv[1], sys.argv[2]
EXTA = 'ąĄćĆčČďĎěĚęĘłŁńŃňŇřŘśŚšŠťŤůŮźŹżŻžŽ'   # Latin Extended-A needed by pl + cs (checked against BRAND.md 3.2 char lists)
UNI = [(0x20,0x7E),(0xA0,0xFF),(0x2009,0x2009),(0x2013,0x2014),(0x2018,0x201E),(0x2022,0x2022),(0x2026,0x2026),(0x202F,0x202F),(0x20AC,0x20AC),(0x2212,0x2212)]
unicodes = [c for a,b in UNI for c in range(a,b+1)] + [ord(c) for c in EXTA]
FEATURES = ['kern','tnum','pnum','lnum','locl','ccmp','liga','mark','mkmk','case','calt']

def build(srcfile, dst, limits):
    f = TTFont(os.path.join(src, srcfile))
    opts = subset.Options()
    opts.flavor = 'woff2'; opts.layout_features = FEATURES; opts.name_IDs = [0,1,2,3,4,5,6,13,14]
    opts.notdef_outline = True; opts.hinting = False; opts.drop_tables += ['DSIG']; opts.glyph_names = False
    ss = subset.Subsetter(opts); ss.populate(unicodes=unicodes); ss.subset(f)
    f = instancer.instantiateVariableFont(f, limits)
    f.flavor = 'woff2'; f.save(os.path.join(out, dst))
    print(dst, os.path.getsize(os.path.join(out, dst)), 'bytes', limits)

os.makedirs(out, exist_ok=True)
build('Unbounded.ttf', 'unbounded-latin-700.woff2', {'wght': 700})
build('Unbounded.ttf', 'unbounded-latin-500-800.woff2', {'wght': (500, 800)})
build('InstrumentSans.ttf', 'instrument-sans-latin-400-700.woff2', {'wdth': 100, 'wght': (400, 700)})
build('InstrumentSans.ttf', 'instrument-sans-latin-400-600.woff2', {'wdth': 100, 'wght': (400, 600)})
build('InstrumentSans.ttf', 'instrument-sans-latin-400.woff2', {'wdth': 100, 'wght': 400})
