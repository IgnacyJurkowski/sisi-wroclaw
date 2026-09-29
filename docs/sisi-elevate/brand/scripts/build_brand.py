#!/usr/bin/env python3
"""Expand @@INCLUDE data/<file>@@ markers in BRAND.template.md into ../../BRAND.md (docs/sisi-elevate/BRAND.md)."""
import re, os
B=os.path.dirname(os.path.abspath(__file__))+'/..'
t=open(B+'/scripts/BRAND.template.md',encoding='utf8').read()
def inc(m):
    txt=open(B+'/'+m.group(1),encoding='utf8').read().strip('\n')
    return re.sub(r'(?m)^#{2,3} ','#### ',txt)
out=re.sub(r"@@INCLUDE (\S+)@@",inc,t)
open(B+'/../BRAND.md','w',encoding='utf8').write(out)
print(len(out.splitlines()),'lines,',len(out),'chars')
