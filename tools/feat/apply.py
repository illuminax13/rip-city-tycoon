"""Inject feature CSS/HTML/JS blocks into index.html idempotently (markers)."""
import sys,re
import os;p=os.environ.get('PP','/workspace/pokemon-packs')+'/index.html';s=open(p).read()
def block(tag,kind,content):
    global s
    a,b=(f'/*<{tag}>*/',f'/*</{tag}>*/')
    if a in s: s=re.sub(re.escape(a)+r'.*?'+re.escape(b),lambda m:a+content+b,s,flags=re.S);return
    if kind=='css': s=s.replace('</style>',a+content+b+'</style>',1)
    else: s=s.replace('</body></html>','<script>'+a+content+b+'</script></body></html>',1)
def rep(x,y):
    global s
    if y in s: return
    assert s.count(x)==1,(s.count(x),x[:60]);s=s.replace(x,y)
for f in sys.argv[1:]:
    exec(open(f'/workspace/feat/{f}.py').read())
open(p,'w').write(s);print('applied',sys.argv[1:])
