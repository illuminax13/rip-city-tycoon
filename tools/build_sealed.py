"""Rip City Tycoon: sealed product prices (booster pack + booster box) per set from tcgcsv.com (TCGplayer mirror).
Writes data/sealed.json: {dex:{pk:market pack $, bx:market box $ or null, bxn:packs in that box, d:date}}
The app turns these into shop prices (data/sealed.json -> SHOP in index.html): in-print sets use MSRP, out-of-print sets
use the market price (capped for gameplay), and a sensible era estimate when TCGplayer has no price.
  python3 tools/build_sealed.py   (repo root)
"""
import json,re,sys,os,datetime,importlib.util
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__))))
spec=importlib.util.spec_from_file_location('bp',os.path.join(os.path.dirname(os.path.abspath(__file__)),'build_prices.py'));bp=importlib.util.module_from_spec(spec);spec.loader.exec_module(bp)
LOR={'lorcana-1':22937,'lorcana-2':23303,'lorcana-3':23367,'lorcana-4':23474,'lorcana-5':23536,'lorcana-6':23746,'lorcana-7':24011,'lorcana-8':24258,
 'lorcana-9':24348,'lorcana-10':24414,'lorcana-11':24500,'lorcana-12':24617,'lorcana-13':24666,'lorcana-14':24740}
BAD=re.compile(r'case|japanese|korean|chinese|code card|art bundle|bundle|blister|sleeved|lot|\bset of\b|display|half|mini|tin|collection|pack art|\(\d+\s*ct|1st edition|first edition|shadowless|empty|jumbo|world championship|prerelease|build|elite|deck|half booster|\[set of',re.I)
def sealed(cat,g):
    pr={}
    for x in bp.get(f'https://tcgcsv.com/tcgplayer/{cat}/{g}/prices')['results']:
        v=x.get('marketPrice') or None
        if v:pr[x['productId']]=v
    out=[]
    for x in bp.get(f'https://tcgcsv.com/tcgplayer/{cat}/{g}/products')['results']:
        e={k['name'] for k in x.get('extendedData',[])}
        if 'Number' in e or x['productId'] not in pr:continue
        out.append((x['name'],pr[x['productId']]))
    return out
def pick(rows,kind):
    c=[(n,v) for n,v in rows if re.search(kind,n,re.I) and not BAD.search(n.replace('Booster Box','').replace('Booster Pack','')) ]
    c.sort(key=lambda t:(len(t[0]),t[1]))
    return c[0] if c else None
def main():
    out={};today=datetime.date.today().isoformat()
    jobs=[(d,3,g) for d,g in bp.GROUPS.items()]+[(d,71,g) for d,g in LOR.items()]
    for dex,cat,g in jobs:
        try:rows=sealed(cat,g)
        except Exception as e:print(dex,'FAILED',e,file=sys.stderr);continue
        pk=pick(rows,r'booster pack');bx=pick(rows,r'booster box')
        n=36
        if bx:
            m=re.search(r'\((\d+)\s*(?:packs|ct)',bx[0],re.I)
            if m:n=int(m.group(1))
        out[dex]={'pk':round(pk[1],2) if pk else None,'pkn':pk[0] if pk else None,'bx':round(bx[1],2) if bx else None,'bxn':bx[0] if bx else None,'d':today}
        print(dex,out[dex])
    json.dump(out,open('data/sealed.json','w'),separators=(',',':'),sort_keys=True)
if __name__=="__main__" and "--shop" not in sys.argv:main()

# ---- shop prices (what the game charges), embedded into index.html between /*SHOP*/ markers ----
MSRP_PKM,MSRP_LOR=4.49,5.99
SOFT,CAP=40.0,199.99
def shop():
    import math
    sealed=json.load(open('data/sealed.json'));html=open('index.html').read()
    sets=[]
    for m in re.finditer(r'\{name:"([^"]+)",([^\n]*?)\}',html[:html.find('/* ---------- robust images')] if '/* ---------- robust images' in html else html):
        body=m.group(2);g=lambda k:(re.search(k+r':"([^"]*)"',body) or [None,None])[1]
        dex=g('dex');yr=re.search(r'year:(\d{4})',body)
        if not dex or not yr:continue
        sets.append(dict(name=m.group(1),dex=dex,year=int(yr.group(1)),lor='game:"lor"' in body,era=g('grp') or g('serie')))
    def curve(m):
        p=m if m<=SOFT else SOFT*(m/SOFT)**0.45
        return min(CAP,p)
    known={}
    for s in sets:
        v=(sealed.get(s['dex']) or {}).get('pk')
        if v:known.setdefault(('lor' if s['lor'] else s['era']),[]).append(v)
    med=lambda a:sorted(a)[len(a)//2]
    out={}
    for s in sets:
        floor=MSRP_LOR if s['lor'] else MSRP_PKM
        mk=(sealed.get(s['dex']) or {}).get('pk')
        if s['year']>=2025:src='msrp';p=floor
        elif mk:src='market';p=curve(mk)
        else:
            # nearest-in-time sealed prices of the same game (era medians undercount vintage)
            same=[(t,(sealed.get(t['dex']) or {}).get('pk')) for t in sets if t['lor']==s['lor']]
            same=[(t,v) for t,v in same if v]
            pool=[]
            for w in (0,1,2,4,99):
                pool=[v for t,v in same if abs(t['year']-s['year'])<=w]
                if len(pool)>=2:break
            src='est';mk=round(med(pool),2);p=curve(mk)
        p=max(floor,math.ceil(p)-0.01) if src!='msrp' else p
        out[s['dex']]=[int(round(p*100)),src,int(round((mk or 0)*100))]
    js='/*SHOP*/const SHOP='+json.dumps(out,separators=(',',':'),sort_keys=True)+';/*/SHOP*/'
    html=re.sub(r'/\*SHOP\*/.*?/\*/SHOP\*/',lambda _:js,html,flags=re.S) if '/*SHOP*/' in html else html
    open('index.html','w').write(html);print('shop prices:',len(out),'sets');return out
if __name__=='__main__':shop()
