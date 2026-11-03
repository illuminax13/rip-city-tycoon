import json,urllib.request,urllib.parse,re,concurrent.futures as cf
from master import M
U='Mozilla/5.0 packsim'
def get(u):return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':U}),timeout=30).read())
def code(d):
    A={'col1':'CL','swsh3.5':'Champion Path','lc':'Legendary Collection'}
    if d in A:return A[d]
    m=re.match(r'^(ecard|ex|hgss)(\d+)$',d)
    if m:return {'ecard':'E','ex':'EX','hgss':'HS'}[m.group(1)]+m.group(2)
    m=re.match(r'^(xy|sm|swsh|bw|dp|pl|hgss|sv)0*([\d.]+)$',d)
    return (m.group(1).upper()+m.group(2)) if m else None
SKIP=re.compile(r'box|bundle|display|blister|case|elite|collection|\btin\b|pack id|pack th|japanese|korean|chinese|sleeve|\bpin\b|code card|\bkit\b|deck|\bBR\b|Boosters|\bFR\b|\bDE\b|\bIT\b|\bES\b|\bPT\b|\bJP\b|\bKO\b|\bZH\b|\bTH\b|\bID\b',re.I)
def srch(q):
    d=get('https://archives.bulbagarden.net/w/api.php?'+urllib.parse.urlencode({'action':'query','list':'search','srnamespace':6,'srsearch':q,'srlimit':30,'format':'json'}))
    return [x['title'][5:] for x in d['query']['search']]
def one(m):
    dex,name=m[0],m[1];qs=[name+' Booster']
    c=code(dex)
    if c:qs.append(c+' Booster')
    if name.startswith('EX '):qs.append(name[3:]+' Booster')
    res=[]
    for q in qs:
        for t in srch(q):
            if 'Booster' not in t or SKIP.search(t.replace('Legendary Collection','LC')):continue
            n=name.replace('EX ','').replace('&','and')
            if t.lower().startswith(n.lower()+' booster') or t.lower().startswith(name.lower()+' booster') or (c and re.match(re.escape(c)+r' Booster',t,re.I)) or t.lower().startswith(name.replace('&','and').lower()+' booster'):
                if t not in res:res.append(t)
    return dex,res
with cf.ThreadPoolExecutor(6) as ex:R=dict(ex.map(one,M))
json.dump(R,open('packcand.json','w'),indent=0)
for k,v in R.items():print(k,v)
