#!/usr/bin/env python3
"""Tone statistics for src/i18n/ui/<lang>.ts. Extracts single/double-quoted string literals that contain a space (prose),
excludes the meta.* block (SEO) and legal/registry keys by dropping strings that look like e-mails, URLs.
Reports: prose strings, sentences, mean/median words per sentence, share of sentences <=8 words, '!' count, '?' count, ' - ' hyphen-as-dash count,
em dash count, top content words, second-person markers."""
import re, statistics, collections, sys
R='/home/user/sisi-elevate/src/i18n/ui/'
STOP={'pl':set('w na i z do o się to jest są a po przy od dla lub oraz jak nie co że za u ze przez czy'.split()),
 'en':set('the a an and of to in at for on with is are be it as or by from your our we you that this can'.split()),
 'de':set('der die das und den dem im in am an zu für mit von ist sind ein eine einen einem wir dein deine deinen ihr auf zur zum auch oder als bei nach'.split()),
 'it':set('il lo la i gli le un una e di del della dei delle da in con per su al alla ai nel nella è sono a o che ci si'.split()),
 'cs':set('a v ve na z ze do o se je jsou to pro s se k u po při od nebo jako co že za'.split())}
def strings(path):
    txt=open(path,encoding='utf8').read()
    # drop meta block
    txt=re.sub(r"\n  meta: \{.*?\n  \},\n",'\n',txt,flags=re.S)
    out=[]
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"",txt):
        s=(m.group(1) if m.group(1) is not None else m.group(2)).replace("\\'","'")
        if ' ' in s and len(s)>25 and '@' not in s and 'http' not in s: out.append(s)
    return out
for lang in ['pl','en','de','it','cs']:
    ss=strings(R+lang+'.ts')
    sents=[x.strip() for s in ss for x in re.split(r'(?<=[.!?])\s+',s) if x.strip()]
    wl=[len(re.findall(r"[\wÀ-ž']+",x)) for x in sents]
    words=[w.lower() for s in ss for w in re.findall(r"[^\W\d_]{4,}",s)]
    c=collections.Counter(w for w in words if w not in STOP[lang])
    txt=' '.join(ss)
    print(f"{lang}: prose strings={len(ss)} sentences={len(sents)} words/sentence mean={statistics.mean(wl):.1f} median={statistics.median(wl)} <=8w={sum(1 for x in wl if x<=8)/len(wl)*100:.0f}% >=25w={sum(1 for x in wl if x>=25)/len(wl)*100:.0f}% | '!'={txt.count('!')} '?'={txt.count('?')} ' - '={txt.count(' - ')} em-dash={txt.count('—')}")
    print('   top:', ', '.join(f'{w}:{n}' for w,n in c.most_common(22)))
