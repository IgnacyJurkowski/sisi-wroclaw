#!/usr/bin/env python3
"""Which characters used in each language dictionary (src/i18n/ui/<lang>.ts) are missing from the fonts actually shipped:
Montserrat (inline base64 in global.css, body) and Cal Sans (latin U latext files, display).
Non-ASCII characters only (ASCII is present in both); prints the missing set and occurrence counts.
Note: per-font unicode-range in CSS is ignored here; the union of both Cal Sans files is what the browser can reach."""
import io,re,base64,glob,collections
from fontTools.ttLib import TTFont
R='/home/user/sisi-elevate/'
css=open(R+'src/styles/global.css').read()
mont=TTFont(io.BytesIO(base64.b64decode(re.search(r"base64,([A-Za-z0-9+/=]+)",css).group(1)))).getBestCmap()
cal={}
for f in ('cal-sans-400-latin','cal-sans-400-latext'): cal.update(TTFont(R+f'public/fonts/{f}.woff2').getBestCmap())
for lang in ['pl','en','de','it','cs']:
    txt=open(R+f'src/i18n/ui/{lang}.ts',encoding='utf8').read()
    cnt=collections.Counter(c for c in txt if ord(c)>127)
    mm={c:n for c,n in cnt.items() if ord(c) not in mont}; cm={c:n for c,n in cnt.items() if ord(c) not in cal}
    print(f"{lang}: distinct non-ASCII={len(cnt)}; missing in Montserrat inline: "+(' '.join(f'{c}(U+{ord(c):04X})x{n}' for c,n in sorted(mm.items())) or '-')+" | missing in Cal Sans: "+(' '.join(f'{c}(U+{ord(c):04X})x{n}' for c,n in sorted(cm.items())) or '-'))
