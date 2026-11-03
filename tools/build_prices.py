"""Snapshot TCGplayer market prices from tcgcsv.com (TCGplayer data mirror; no CORS, so the app can't call it live).
Used by the app only when the live sources (pokemontcg.io set prices, TCGdex per card) have nothing.
Writes data/px-snap.json: {dex:{d:date,src,p:{binder number:{n|h|r:usd}}}}

Coverage (kept small, ~tens of KB):
  * every card of 30th Celebration (+ Classic Collection, RGB Mew), Celebrations Classic Collection, Crown Zenith Galarian Gallery
  * every other Pokemon set in the app: cards worth >= MIN_USD (the hits, incl. Mega Hyper Rares) -- cheaper cards fall back to TCGdex

Robust: retries + timeouts per request; a group that fails keeps its previous prices; cards missing from a fetch keep their
previous price; the file is not rewritten if nothing could be fetched. Exit 1 only when every group failed (hard failure).
  python3 tools/build_prices.py            # run from the repo root (GitHub Action: .github/workflows/prices.yml)
"""
import json,re,sys,time,urllib.request,datetime,os
B='https://tcgcsv.com/tcgplayer/3/'
OUT='data/px-snap.json'
MIN_USD=1.0
SKIPV=re.compile(r'\((?:[^)]*(?:pattern|ball|stamp|prerelease|staff|league|cosmos|jumbo|oversized|error|misprint)[^)]*)\)',re.I)
def get(u,tries=3):
    err=None
    for i in range(tries):
        try:return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'rippermon-prices (github.com/illuminax13)'}),timeout=30))
        except Exception as e:err=e;time.sleep(2*(i+1))
    raise err
def norm(t):return re.sub(r'[^a-z0-9]','',re.sub(r'\((?!top|bottom)[^)]*\)','',t.replace('☆',' star').lower()).replace('é','e'))
def group(g):
    pr={}
    for x in get(f'{B}{g}/prices')['results']:
        v=x.get('marketPrice') or x.get('midPrice')
        if v:pr.setdefault(x['productId'],{})[x['subTypeName']]=v
    out=[]
    for x in get(f'{B}{g}/products')['results']:
        e={k['name']:k['value'] for k in x.get('extendedData',[])}
        if 'Number' not in e or x['productId'] not in pr or SKIPV.search(x['name']):continue
        out.append((e['Number'],x['name'],pr[x['productId']]))
    if not out:raise RuntimeError(f'group {g}: no priced cards')
    return out
def ent(p):
    o={}
    n=p.get('Normal') or p.get('Unlimited')
    h=p.get('Holofoil') or p.get('Unlimited Holofoil')
    r=p.get('Reverse Holofoil')
    if n:o['n']=round(n,2)
    if h:o['h']=round(h,2)
    if r:o['r']=round(r,2)
    return o
def num(n):
    n=n.split('/')[0].strip()
    return re.sub(r'^0+(?=\w)','',n).upper() if n else None
def bynum(rows,fn=num,minv=0):
    p={}
    for n,name,pr in rows:
        k=fn(n);e=ent(pr)
        if k and e and k not in p and max(e.values())>=minv:p[k]=e
    return p
def byname(rows,cards):
    """subset groups printed with their original numbers: match the binder card by name, in list order"""
    left=list(rows);p={}
    for c in cards:
        nn=norm(c['name'])
        for i,(n,name,pr) in enumerate(left):
            a=norm(re.sub(r'\s*-\s*\S+/\S+$','',name))
            if a==nn or re.sub(r'(top|bottom)$','',a)==nn:
                if ent(pr):p[c['n']]=ent(pr)
                left.pop(i);break
    return p
def lst(dex):return json.load(open(f'data/{dex}.json'))['cards']
# app dex -> TCGplayer group (main set)
GROUPS={'base1':604,'base2':635,'base3':630,'base5':1373,'neo1':1396,'swsh7':2848,'cel25':2867,'swsh12.5':17688,'sv03':23228,'sv03.5':23237,
 'sv04.5':23353,'sv06':23473,'sv08':23651,'sv08.5':23821,'sv09':24073,'sv10':24269,'sv10.5b':24325,'sv10.5w':24326,'me01':24380,'me02':24448,
 'me02.5':24541,'me03':24587,'me04':24655,'me05':24688,'30th':24722}
# every other main-series set (tools/allsets/master.py): main group + subset groups (Trainer Gallery, Shiny Vault, Radiant Collection)
ALLM={}
try:
    _g={};exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'allsets','master.py')).read(),_g)
    for r in _g['M']:
        if r[0] not in GROUPS and r[5]:ALLM[r[0]]=r[5];GROUPS[r[0]]=r[5][0]
except Exception as e:print('master.py not loaded:',e,file=sys.stderr)
MIN_OLD=3.0   # added sets keep only their rares/hits worth >= $3 so the snapshot stays small
def build(dex):
    if dex in ALLM:
        p={};hits=None
        try:hits={num(str(c['n'])) for c in lst(dex) if not re.match(r'^(common|uncommon)$',c['rarity'].lower())}
        except Exception:pass
        for g in ALLM[dex]:
            for k,v in bynum(group(g),minv=MIN_OLD).items():
                if hits is None or k in hits:p.setdefault(k,v)
        return p
    if dex=='30th':
        p=bynum(group(24722),lambda n:('RGB-'+n[0]) if n.endswith('/RGB') else (num(n) if re.match(r'^\d+/',n) else None))
        p.update(byname(group(24837),[c for c in lst('30th') if c['n'].startswith('CC')]));return p
    p=bynum(group(GROUPS[dex]),minv=MIN_USD)
    if dex=='cel25':p.update(byname(group(2931),[c for c in lst('cel25') if c['n'].startswith('CC')]))
    if dex=='swsh12.5':p.update(bynum(group(17689),lambda n:num(n) if n.startswith('GG') else None))
    return p
def main():
    old={}
    try:old=json.load(open(OUT))
    except Exception:pass
    today=datetime.date.today().isoformat();out={};ok=fail=0
    for dex in GROUPS:
        prev=old.get(dex) or {}
        try:
            p=build(dex);ok+=1
            kept=0
            for k,v in (prev.get('p') or {}).items():
                if k not in p and (dex in('30th',) or max(v.values() or [0])>=(MIN_OLD if dex in ALLM else MIN_USD) and dex not in ALLM or re.match(r'^(CC|GG)',k)):p[k]=v;kept+=1
            out[dex]={'d':today,'src':'TCGplayer via tcgcsv (snapshot)','p':dict(sorted(p.items()))}
            print(f'{dex}: {len(p)} priced' + (f' ({kept} kept from last run)' if kept else ''))
        except Exception as e:
            fail+=1;print(f'{dex}: FAILED {e!r}'+(' - keeping previous prices' if prev else ''),file=sys.stderr)
            if prev:out[dex]=prev
    if not ok:
        print('every group failed - leaving',OUT,'untouched',file=sys.stderr);return 1
    s=json.dumps(out,separators=(',',':'),sort_keys=True)
    open(OUT,'w').write(s);print(f'wrote {OUT}: {len(s)//1024} KB, {sum(len(v["p"]) for v in out.values())} cards, {ok} groups ok, {fail} failed')
    return 0
if __name__=='__main__':sys.exit(main())
