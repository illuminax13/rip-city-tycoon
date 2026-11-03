"""Insert /tmp/newsets.json (from build_sets.py) into index.html + data/pullrates.json. Idempotent (marker block)."""
import json,re,os
R=os.path.abspath(os.path.dirname(os.path.abspath(__file__))+'/../..')
N=json.load(open('/tmp/newsets.json'));p=R+'/index.html';s=open(p).read()
A,B=' /*ALLSETS*/\n','\n /*/ALLSETS*/\n'
i=s.find('const SETS=');j=s.find('\n];',i)
if A in s[i:j]:s=s[:s.find(A,i)]+s[s.find(B,i)+len(B)-1:]
j=s.find('\n];',i);s=s[:j]+'\n'+A+N['sets']+B.rstrip('\n')+s[j:]
i=s.find('const PACKART=');j=s.find(';\n',i);pa=json.loads(s[i+len('const PACKART='):j])
for k in list(pa):
    if k in N['art'] or ('/allsets' in k):pass
pa.update(N['art']);s=s[:i]+'const PACKART='+json.dumps(pa)+s[j:]
i=s.find('BOXP={');j=s.find('};',i)+1;body=s[i+5:j]
bo=json.loads(re.sub(r'([{,]\s*)"?([\w.]+)"?:',lambda m:m.group(1)+'"'+m.group(2)+'":',body.replace('\n','')))
bo.update(N['box']);s=s[:i]+'BOXP='+json.dumps(bo,separators=(',',':'))+s[j:]
open(p,'w').write(s)
q=R+'/data/pullrates.json';pr=json.load(open(q));pr.update(N['pr']);json.dump(pr,open(q,'w'),indent=1,ensure_ascii=False)
print('ok',len(N['art']))
