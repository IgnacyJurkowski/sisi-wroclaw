#!/usr/bin/env python3
"""Glyph coverage of the shipped woff2 files against (a) every non-ASCII character in the five site dictionaries
and (b) the brief's list; plus the tabular-digit check and byte sizes. Run from anywhere."""
import os, gzip
from fontTools.ttLib import TTFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
R = '/home/user/sisi-elevate/'
dict_chars = {}
for l in ['pl', 'en', 'de', 'it', 'cs']:
    dict_chars[l] = {c for c in open(R + f'src/i18n/ui/{l}.ts', encoding='utf8').read() if ord(c) > 127}
brief = set("ąćęłńóśźżĄĆĘŁŃÓŚŹŻčěřšůžýČĚŘŠŮŽÝäöüßÄÖÜàèéìòùÀÈÉÌÒÙ„”“–…’‘—«»€×→·°½áíúďťňÁÍÚçÇ²")
ascii_all = {chr(i) for i in range(0x20, 0x7F)}
for fn in sorted(os.listdir(D)):
    if not fn.endswith('.woff2'):
        continue
    p = os.path.join(D, fn)
    f = TTFont(p)
    cm = f.getBestCmap()
    print(f'== {fn}: {os.path.getsize(p)} bytes woff2, {len(gzip.compress(open(p,"rb").read()))} gz, {len(f.getGlyphOrder())} glyphs, {len(cm)} code points')
    print('   family:', f['name'].getDebugName(1), '| axes:', [(a.axisTag, a.minValue, a.maxValue) for a in f['fvar'].axes] if 'fvar' in f else 'static')
    miss_ascii = [c for c in ascii_all if ord(c) not in cm]
    print('   ASCII missing:', ''.join(miss_ascii) or 'none')
    for l, chars in dict_chars.items():
        miss = sorted(c for c in chars if ord(c) not in cm)
        print(f'   {l}: {len(chars)} distinct non-ASCII chars in src/i18n/ui/{l}.ts, missing: ' + (' '.join(f"{c}(U+{ord(c):04X})" for c in miss) or 'none'))
    miss = sorted(c for c in brief if ord(c) not in cm)
    print(f'   brief list ({len(brief)} chars) missing:', ' '.join(f"{c}(U+{ord(c):04X})" for c in miss) or 'none')
    hm = f['hmtx']
    w = [hm[cm[ord(str(d))]][0] for d in range(10)]
    print('   digit advances 0-9:', w, '-> tabular' if len(set(w)) == 1 else '-> proportional')
    feats = sorted({fr.FeatureTag for t in ('GSUB', 'GPOS') if t in f for fr in f[t].table.FeatureList.FeatureRecord})
    print('   features:', feats)
