"""Generate SETS entries, PACKART, BOXP, pull rates and data/<dex>.json for the added sets.
Usage: python3 build_sets.py grp1,grp2,...   (cumulative: pass every era that should be live)
Inputs: master.py, report.json (convert.py), packout.json (packproc.py), /workspace/allsets/out/*.json"""
import json,sys,re,os,shutil
from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));R=os.path.abspath(H+'/../..')
exec(open(H+'/master.py').read())
REP=json.load(open(H+'/report.json'));ART=json.load(open(H+'/packout.json'))['art']
OUT=os.environ.get('ALLSETS_OUT','/workspace/allsets/out')
GRPS=sys.argv[1].split(',')
def gkey(r):
    r=r.lower()
    for k,p in [('svu','shiny ultra'),('svr','shiny rare'),('tgu','trainer gallery.*ultra'),('tg','trainer gallery'),('rcu','rc rare ultra'),('rc','rc rare'),('star','gold star'),('cry','crystal'),('shn','shining'),('lvx',r'lv\.x'),('prime','prime'),('leg','legend'),('brk','break'),('prism','prism'),('amz','amazing'),('rad','radiant'),('ace','ace spec'),('alt','alternate'),('rbw','rainbow'),('gold','secret gold'),('sec','secret'),('vmax','vmax|vstar'),('fa','rare ultra'),('ex','ex|gx|holo rare v'),('holo','holo')]:
        if re.search(p,r):return k
    return 'r' if r=='rare' else 'u' if 'uncommon' in r else 'r' if 'rare' in r else 'c'
E=True
def cfg(dex,grp,keys):
    """pull-rate config per set. All pre-SV figures are community estimates (TPCi publishes none) unless noted."""
    src='https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_Trading_Card_Game_expansions';note='';est=True
    W=lambda **r:{k:v for k,v in r.items()}
    if dex in('base4','gym1','gym2','neo2','neo3','neo4'):
        r={'holo':1/3}
        if dex=='neo3':r['sec']=1/54
        if dex=='neo4':r['sec']=1/36
        return {'structure':'wotc','energy':0,'rates':r,'note':'11 cards: 7C, 3U, 1 rare (holo 1/3)'+('; Shining Pokemon replace the rare (estimated)' if 'sec' in r else ''),'estimated':'sec' in r}
    slots=[['c',5],['u',3]];rev=1;revX=[];rareX=[];r={'holo':1/3}
    if grp=='base':slots=[['c',6],['u',3]];note='11 cards: 6C, 3U, 1 reverse holo, 1 rare (holo 1/3)'
    elif grp=='ecard':slots=[['c',5],['u',2]];r.update(cry=1/48);rareX=['cry'];note='9 cards: 5C, 2U, 1 reverse holo, 1 rare; Crystal replaces the rare'
    elif grp=='ex':slots=[['c',5],['u',2]];r.update(sec=1/72,star=1/72,ex=1/8);revX=['star','sec'];rareX=['ex'];note='9 cards: 5C, 2U, 1 reverse holo, 1 rare; ex replace the rare, Gold Star/secret replace the reverse'
    elif grp in('dp','pl'):r.update(lvx=1/12,sec=1/36);revX=['sec'];rareX=['lvx'];note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; LV.X replace the rare, SH/secret replace the reverse'
    elif grp=='hgss':
        r.update(prime=1/8,leg=1/18,sec=1/72,svr=1/4);rareX=['sec','leg','prime'];revX=['svr'];note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; Prime/LEGEND/Alph Lithograph replace the rare'
        if dex=='col1':note+='; Shiny Legends replace the reverse (1 in 4)'
    elif grp=='bw':
        r.update(sec=1/72,fa=1/36,ex=1/9,ace=1/12,rc=1/3,rcu=1/18);rareX=['sec','fa','ex'];revX=['ace','rcu','rc'];note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; EX/full art/secret replace the rare, ACE SPEC (and Radiant Collection in Legendary Treasures) replace the reverse'
        if dex=='dv1':slots=[['holo',5]];rev=0;rareX=None;note='Dragon Vault: 5-card packs, every card a holofoil'
    elif grp=='xy':
        r.update(sec=1/72,fa=1/36,ex=1/7,brk=1/6,rc=1/3,rcu=1/24);rareX=['sec','fa','ex'];revX=['rcu','rc','brk'];note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; EX/full art/secret replace the rare, BREAK (and Radiant Collection in Generations) replace the reverse'
        if dex=='dc1':slots=[['c',2],['u',1]];rev=0;r={'holo':1,'ex':1/3};rareX=['ex'];note='Double Crisis: 4-card packs, 2C, 1U, 1 holo (EX 1 in 3, estimated)'
    elif grp=='sm':
        r.update(alt=1/120,gold=1/70,rbw=1/45,sec=1/72,fa=1/25,ex=1/7,prism=1/12,shn=1/9,svr=1/4,svu=1/12);rareX=['alt','gold','rbw','sec','svu','fa','ex'];revX=['shn','prism','svr'];note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; GX/full art/rainbow/gold replace the rare, Prism Star/Shining/Shiny Vault replace the reverse'
        if dex=='det1':slots=[['c',3]];rev=0;r={'holo':1,'fa':1/4};rareX=['fa'];note='Detective Pikachu: 4-card packs, 3 commons + 1 rare (GX 1 in 4, estimated)'
    elif grp=='swsh':
        r.update(alt=1/150,gold=1/90,rbw=1/72,sec=1/72,fa=1/28,vmax=1/16,ex=1/8,amz=1/20,rad=1/20,tg=1/12,tgu=1/32,svr=1/3.5,svu=1/8);rareX=['alt','gold','rbw','sec','svu','fa','vmax','ex'];revX=['amz','rad','tgu','tg','svr']
        note='10 cards: 5C, 3U, 1 reverse holo, 1 rare; V/VMAX/VSTAR/full art/alt art/secret replace the rare, Amazing/Radiant/Trainer Gallery/Shiny Vault replace the reverse'
        PRC={'swsh9':None,'swsh10':(8,23,47+93,135,78,130,20,12,24),'swsh11':(9,23,51+70,201,None,None,20,12,32),'swsh12':(9,27,48+99,168,None,None,22,12,32)}
        if dex=='swsh10':r.update(ex=1/8,vmax=1/29,fa=1/31,alt=1/135,rbw=1/78,gold=1/130,rad=1/20,tg=1/12,tgu=1/24);src='https://pullrates.com/set/astral-radiance';est=False
        if dex=='swsh11':r.update(ex=1/9,vmax=1/23,fa=1/29,alt=1/201,rbw=1/80,gold=1/110,rad=1/20,tg=1/12,tgu=1/25);src='https://pullrates.com/set/lost-origin';est=False;note+='. Secret 1 in 49 split rainbow/gold (estimated); TG gold VMAX folded into TG ultra'
        if dex=='swsh12':r.update(ex=1/9,vmax=1/27,fa=1/32,alt=1/168,rbw=1/75,gold=1/100,rad=1/22,tg=1/12,tgu=1/25);src='https://pullrates.com/set/silver-tempest';est=False;note+='. Secret 1 in 45 split rainbow/gold (estimated); TG gold VMAX folded into TG ultra'
    elif grp=='sv':
        T={'sv01':(7,15,13,32,54,0,'scarlet-and-violet'),'sv02':(7,15,13,32,57,0,'paldea-evolved'),'sv04':(6,15,13,47,82,0,'paradox-rift'),'sv05':(6,15,13,86,139,20,'temporal-forces'),'sv06.5':(6,15,12,80,120,20,None),'sv07':(6,15,13,90,137,20,'stellar-crown')}[dex]
        o={'dr':T[0],'ur':T[1],'ir':T[2],'sir':T[3],'hr':T[4]}
        if T[5]:o['ace']=T[5]
        return {'structure':'sv','rates':{**{k:round(1/v,6) for k,v in o.items()},**({} if T[5] else {'ace':0}),'pb':0,'mb':0},'oneIn':o,
                'source':('https://pullrates.com/set/'+T[6]) if T[6] else src,'estimated':not T[6],'note':'TCGplayer Authentication Center (8,000+ packs).' if T[6] else 'No published study; modelled on Temporal Forces / Stellar Crown (estimated).'}
    present=set(keys)
    out={'structure':'gen','slots':slots,'rev':rev,'revX':[k for k in revX if k in present],'rareX':[k for k in (rareX or []) if k in present] if rareX is not None else [],
         'rates':{k:round(v,6) for k,v in r.items() if k=='holo' or k in present},'source':src,'estimated':est,'note':note}
    if rareX is None:out['rare']=0
    out['oneIn']={k:round(1/v) if v else 0 for k,v in out['rates'].items()}
    used=set(['c','u','r','holo'])|set(out['revX'])|set(out['rareX'])|{s[0] for s in slots}
    miss=present-used
    if miss:print('UNREACHABLE',dex,miss)
    return out
def colors(dex):
    p=ART[dex][0].replace(f'/{dex}/',f'/{dex}/t/');im=Image.open(R+'/'+p).convert('RGB').resize((48,84))
    q=im.quantize(6).convert('RGB');cs=sorted(q.getcolors(10000),reverse=True)
    good=[c for n,c in cs if max(c)-min(c)>40 and sum(c)>90 and sum(c)<690] or [c for n,c in cs]
    a=good[0];b=next((c for c in good[1:] if sum(abs(x-y) for x,y in zip(a,c))>120),good[-1])
    dk=lambda c,f:'#%02x%02x%02x'%tuple(int(x*f) for x in c)
    return [dk(a,.8),dk(b,1)]
BOXS={'sm3.5':[['Elite Trainer Box',8]],'sm7.5':[['Elite Trainer Box',8]],'sm115':[['Elite Trainer Box',8]],'swsh3.5':[['Elite Trainer Box',10]],'swsh4.5':[['Elite Trainer Box',10]],
 'swsh10.5':[['Elite Trainer Box',10]],'g1':[['Elite Trainer Box',8]],'sv06.5':[['Booster Bundle',6],['Elite Trainer Box',9]],'dv1':[],'dc1':[],'det1':[]}
sets=[];art={};box={};pr={};AF={'dv1'}
for (dex,name,ptcg,grp,year,tp,subs) in M:
    if grp not in GRPS:continue
    d=json.load(open(f'{OUT}/{dex}.json'))
    if dex=='bw4':
        for c in d['cards']:
            if c['name']=='Prism Energy':c['rarity']='Uncommon'
    json.dump(d,open(f'{R}/data/{dex}.json','w'),separators=(',',':'),ensure_ascii=False)
    rp=REP[dex];serie=rp['serie'];era='sv' if grp in('swsh','sv') else 'wotc'
    e={'name':name,'ptcg':ptcg,'dex':dex,'serie':serie,'grp':grp,'era':era,'year':int(rp['rel'][:4]),'rel':rp['rel'],'n':len(d['cards']),'colors':colors(dex)}
    if dex in AF:e['allFoil']=True
    sets.append(e);art[dex]=ART[dex]
    if dex in BOXS:box[dex]=BOXS[dex]
    pr[dex]=cfg(dex,grp,[gkey(c['rarity']) for c in d['cards']])
js=',\n'.join(' '+json.dumps(e,ensure_ascii=False,separators=(',',':')) .replace('"name":','name:') for e in sets)
js=re.sub(r'"(\w+)":',r'\1:',js)
json.dump({'sets':js,'art':art,'box':box,'pr':pr},open('/tmp/newsets.json','w'))
print(len(sets),'sets')
