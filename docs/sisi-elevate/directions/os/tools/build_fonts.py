#!/usr/bin/env python3
"""Build the two SiSi "Oś nocy" font files from the OFL sources (google/fonts, ofl/).

Usage: python3 build_fonts.py <src_dir> <out_dir>
  src_dir holds BigShouldersDisplay[wght].ttf as BigShouldersDisplay.ttf and HankenGrotesk[wght].ttf as HankenGrotesk.ttf

Display  : Big Shoulders Display, instanced to wght 800 (static), digits 0-9 rebuilt as tabular
           (all ten get the widest advance, outlines centred in the cell), digit-digit kerning zeroed,
           subset to Latin + Latin Extended-A + the punctuation the five locales use.
Text     : Hanken Grotesk, wght axis limited to 400-700 (still variable), same subset.
Both are OFL 1.1 with no Reserved Font Name, so a modified subset is allowed; the copyright and
licence texts ship next to the files. Family names are changed to say they are modified subsets.
"""
import sys, io
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

src, out = sys.argv[1], sys.argv[2]

UNI = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x100, 0x180)) + [
    0x2002, 0x2003, 0x2009, 0x200A, 0x202F, 0x2010, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D,
    0x201E, 0x2022, 0x2026, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193,
    0x2212, 0x1E9E, 0x2116,
]
FEATURES = ['kern', 'ccmp', 'locl', 'mark', 'mkmk', 'case', 'liga', 'calt']


def rename(font, family):
    for rec in font['name'].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = family
        elif rec.nameID == 6:
            rec.string = family.replace(' ', '') + '-Regular'
        elif rec.nameID in (2, 17):
            rec.string = 'Regular'
        elif rec.nameID == 3:
            rec.string = family + ' subset'


def make_tabular_digits(font):
    cm = font.getBestCmap()
    names = [cm[ord(str(d))] for d in range(10)]
    glyf, hmtx = font['glyf'], font['hmtx']
    widest = max(hmtx[n][0] for n in names)
    for n in names:
        adv, lsb = hmtx[n]
        dx = (widest - adv) / 2
        g = glyf[n]
        pen = TTGlyphPen(glyf)
        g.draw(TransformPen(pen, (1, 0, 0, 1, dx, 0)), glyf)
        new = pen.glyph()
        glyf[n] = new
        new.recalcBounds(glyf)
        hmtx[n] = (widest, int(round(new.xMin)) if hasattr(new, 'xMin') else lsb + int(dx))
    return widest


def zero_digit_kerning(font):
    cm = font.getBestCmap()
    dig = {cm[ord(str(d))] for d in range(10)}
    gpos = font['GPOS'].table
    zeroed = 0
    for lk in gpos.LookupList.Lookup:
        for st in lk.SubTable:
            if lk.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, 'LookupType', lk.LookupType) != 2:
                continue
            if st.Format == 1:
                for g, ps in zip(st.Coverage.glyphs, st.PairSet):
                    if g in dig:
                        for pv in ps.PairValueRecord:
                            if pv.SecondGlyph in dig and pv.Value1:
                                pv.Value1.XAdvance = 0
                                zeroed += 1
            elif st.Format == 2:
                cd1, cd2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                c1 = {cd1.get(g, 0) for g in dig if g in st.Coverage.glyphs}
                c2 = {cd2.get(g, 0) for g in dig}
                for i in c1:
                    for j in c2:
                        v = st.Class1Record[i].Class2Record[j].Value1
                        if v is not None and getattr(v, 'XAdvance', 0):
                            v.XAdvance = 0
                            zeroed += 1
    return zeroed


def reload(font):
    b = io.BytesIO()
    font.save(b)
    b.seek(0)
    return TTFont(b)


def do_subset(font, path):
    font = reload(font)
    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.flavor = 'woff2'
    opts.name_IDs = [0, 1, 2, 3, 4, 6, 13, 14]
    opts.name_languages = [0x409]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = False
    opts.desubroutinize = True
    opts.drop_tables += ['DSIG', 'STAT'] if False else ['DSIG']
    s = subset.Subsetter(opts)
    s.populate(unicodes=UNI)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(path)


# Display
f = TTFont(f'{src}/BigShouldersDisplay.ttf')
f = instancer.instantiateVariableFont(f, {'wght': 800})
w = make_tabular_digits(f)
z = zero_digit_kerning(f)
rename(f, 'SiSi Night Display')
do_subset(f, f'{out}/sisi-night-display-800.woff2')
print('display digit cell', w, 'upm', f['head'].unitsPerEm, 'kerning values zeroed', z)

# Text
t = TTFont(f'{src}/HankenGrotesk.ttf')
t = instancer.instantiateVariableFont(t, {'wght': (400, 700)})
rename(t, 'SiSi Night Text')
do_subset(t, f'{out}/sisi-night-text-var.woff2')
print('text ok')
