#!/usr/bin/env python3
"""Coverage check for the shipped Puls fonts (union of the latin and latin-ext files, as the browser reaches them).
Checks (1) the brief's list, (2) every non-ASCII character used in the five site dictionaries src/i18n/ui/{pl,en,de,it,cs}.ts,
(3) the tabular-figure (tnum) feature. Run from anywhere: python3 verify-fonts.py"""
import os, sys, collections
from fontTools.ttLib import TTFont
HERE=os.path.dirname(os.path.abspath(__file__)); F=os.path.join(HERE,'..','fonts')
FACES={'Anybody 800 wdth50-100 (display)':['anybody-800-wdth50-100-latin.woff2','anybody-800-wdth50-100-latin-ext.woff2'],
       'Figtree 400-700 (text)':['figtree-400-700-latin.woff2','figtree-400-700-latin-ext.woff2']}
BRIEF="ąćęłńóśźżĄĆĘŁŃÓŚŹŻ" "áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ" "äöüßÄÖÜ" "àèéìòùÀÈÉÌÒÙ" "„”“–—…"
R=os.path.join(HERE,'..','..','..','..','..')   # repo root when run inside the worktree
dicts={}
for lang in ['pl','en','de','it','cs']:
    p=os.path.join(R,'src','i18n','ui',f'{lang}.ts')
    if os.path.exists(p): dicts[lang]=collections.Counter(c for c in open(p,encoding='utf8').read() if ord(c)>127)
tot=0
for name,files in FACES.items():
    cm={}; feats=set()
    for f in files:
        t=TTFont(os.path.join(F,f)); cm.update(t.getBestCmap()); tot+=os.path.getsize(os.path.join(F,f))
        if 'GSUB' in t: feats|={r.FeatureTag for r in t['GSUB'].table.FeatureList.FeatureRecord}
    miss=[c for c in BRIEF if ord(c) not in cm]
    print(f"{name}: {len(cm)} code points; brief list ({len(BRIEF)} chars) missing: {''.join(miss) or 'none'}; GSUB {sorted(feats)}")
    for lang,cnt in dicts.items():
        m={c:n for c,n in cnt.items() if ord(c) not in cm}
        print(f"   {lang}: {len(cnt)} distinct non-ASCII chars in dictionary, missing: "+(' '.join(f'{c}(U+{ord(c):04X})x{n}' for c,n in sorted(m.items())) or 'none'))
print('total woff2 bytes',tot)
