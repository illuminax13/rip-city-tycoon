import json,re,os,sys,collections
from master import M,SUBPT
RAW='/workspace/allsets/raw';TP='/workspace/allsets/tp';OUT=sys.argv[1] if len(sys.argv)>1 else '/workspace/allsets/out'
os.makedirs(OUT,exist_ok=True)
def norm(n):
    n=str(n).split('/')[0].strip().upper()
    m=re.match(r'^([A-Z]*)0*(\d+)([A-Z]*)$',n)
    return (m.group(1)+m.group(2)+m.group(3)) if m else n
BAD=re.compile(r'reverse|cosmos|staff|prerelease|stamp|jumbo|league|error|1st edition|cracked ice|non-holo|\(holo\)|theme deck',re.I)
def tpmap(groups):
    out={}
    for g in groups:
        for x in json.load(open(f'{TP}/{g}.json')):
            e={k['name']:k['value'] for k in x.get('extendedData',[])}
            if 'Number' not in e:continue
            k=norm(e['Number'])
            if k in out and BAD.search(x['name']):continue
            if k in out and not BAD.search(out[k][1]):continue
            out[k]=(e.get('Rarity') or '',x['name'],g)
    return out
V=re.compile(r'\bV(MAX|STAR)?$')
def rar(c,tp,grp,sub):
    td=c.get('rarity') or '';tpr,pn=(tp[0],tp[1]) if tp else ('','');name=c['name'];lid=c['localId'];cat=c.get('category')
    sup=cat=='Trainer' and (c.get('trainerType') in ('Supporter',None))
    if sub in ('sma','swsh4.5sv'):
        if 'Secret' in td or tpr=='Secret Rare':return 'Rare Secret'
        return 'Shiny Ultra Rare' if re.search(r'\b(GX|V|VMAX|VSTAR)$',name) else 'Shiny Rare'
    if sub and sub.endswith('tg'):
        if 'Secret' in td or tpr=='Secret Rare':return 'Rare Secret Gold'
        if V.search(name) or cat=='Trainer' or td=='Full Art Trainer':return 'Trainer Gallery Rare Ultra'
        return 'Trainer Gallery Rare Holo'
    if lid.startswith('RC'):return 'RC Rare Ultra' if (tpr in('Ultra Rare','Secret Rare') or re.search(r'\bEX$|^M ',name)) else 'RC Rare Holo'
    if lid.startswith('SL'):return 'Shiny Rare'
    if re.match(r'^SH\d',lid):return 'Rare Secret'
    if lid.upper() in ('ONE','TWO','THREE','FOUR'):return 'Rare Secret'
    if grp=='ecard' and tpr=='Secret Rare':return 'Rare Holo Crystal'
    if grp=='ecard' and lid.startswith('H'):return 'Rare Holo'
    if name.startswith('Shining ') and grp=='neo':return 'Rare Secret Shining'
    if name.startswith('Shining ') or (grp=='sm' and tpr=='Shiny Holo Rare' and 'Shining' in pn):return 'Rare Shining' if 'Secret' not in pn else 'Rare Secret'
    if '◇' in name or 'Prism' in pn:return 'Rare Prism Star'
    if '☆' in name or (re.search(r'\bStar\)?$',pn) and grp=='ex'):return 'Rare Holo Gold Star'
    if grp=='ex' and re.search(r' ex\b',name):return 'Rare Holo ex'
    if 'LV.X' in name.upper() or 'LV.X' in pn.upper() or 'LV.X' in td:return 'Rare Holo LV.X'
    if td=='Rare PRIME' or c.get('suffix')=='Prime' or '(Prime)' in pn:return 'Rare Prime'
    if td=='LEGEND' or 'LEGEND' in name:return 'LEGEND'
    if 'BREAK' in name and cat=='Pokemon':return 'Rare BREAK'
    if '◇' in name:return 'Rare Prism Star'
    if tpr=='Amazing Rare' or td=='Amazing Rare':return 'Amazing Rare'
    if name.startswith('Radiant ') and cat=='Pokemon':return 'Radiant Rare'
    if tpr in ('Rare Ace','ACE SPEC Rare') or 'ACE SPEC' in td:return 'ACE SPEC Rare'
    if grp=='sv':return td
    if tpr=='Secret Rare' or td=='Secret Rare':
        if grp in ('sm','swsh') and (cat=='Pokemon' or sup) and not re.search(r'gold',pn,re.I):return 'Rare Rainbow'
        if grp in ('sm','swsh'):return 'Rare Secret Gold'
        return 'Rare Secret'
    if tpr=='Ultra Rare' or td in ('Ultra Rare','Holo Rare V','Holo Rare VMAX','Holo Rare VSTAR'):
        if re.search(r'alternate',pn,re.I):return 'Rare Ultra Alternate Art'
        if re.search(r'full art',pn,re.I) or (cat=='Trainer' and grp in('bw','xy','sm','swsh')):return 'Rare Ultra'
        if grp=='swsh' and td=='Ultra Rare' and V.search(name):return 'Rare Ultra'
        if re.search(r' ex( δ)?$',name):return 'Rare Holo ex'
        if re.search(r'\bEX$',name):return 'Rare Holo EX'
        if re.search(r'\bGX$',name):return 'Rare Holo GX'
        m=V.search(name)
        if m:return 'Holo Rare V'+(m.group(1) or '')
        if grp in ('bw','xy','sm','swsh') :return 'Rare Ultra'
        return 'Rare Holo'
    if tpr in ('Holo Rare','Shiny Holo Rare') or td in ('Holo Rare','Rare Holo'):return 'Rare Holo'
    if tpr in ('Rare','Uncommon','Common'):return tpr
    if td in ('Rare','Uncommon','Common'):return td
    return td or 'Common'
def main():
    rep={}
    for dex,name,ptcg,grp,year,groups,subs in M:
        tp=tpmap(groups);cards=[];miss=0
        def add(raw,sub):
            nonlocal miss
            d=json.load(open(f'{RAW}/{raw}.json'))
            for c in d['cards']:
                lid=c['localId'];k=norm(lid);t=tp.get(k)
                if not t and not sub:miss+=1
                r=rar(c,t,grp,sub)
                if r=='None':r='Rare'
                if sub:
                    pt=SUBPT[sub];num=lid
                    o={'id':f'{sub}-{lid}','n':lid.upper(),'lid':lid,'name':c['name'],'rarity':r,'pimg':f'https://images.pokemontcg.io/{pt}/{num}_hires.png'}
                else:
                    if re.match(r'^\d+b$',lid) and not c.get('image'):continue
                    o={'id':f'{dex}-{lid}','n':re.sub(r'^0+(?=\w)','',lid),'lid':lid,'name':c['name'],'rarity':r}
                    if c.get('image'):o['img']=c['image']
                    else:
                        num=re.sub(r'a$','',lid);num=re.sub(r'^H0*','H',num)
                        o['pimg']=f'https://images.pokemontcg.io/{ptcg}/{num}_hires.png'
                if c.get('category')=='Trainer':o['k']='t'
                elif c.get('category')=='Energy':o['k']='e'
                cards.append(o)
            return d
        d=add(dex,None)
        for s in subs:add(s,s)
        serie=next((c['image'].split('/')[4] for c in d['cards'] if c.get('image')),'sm')
        json.dump({'dex':dex,'name':name,'n':len(cards),'v':2,'cards':cards},open(f'{OUT}/{dex}.json','w'),separators=(',',':'),ensure_ascii=False)
        rep[dex]={'serie':serie,'n':len(cards),'miss':miss,'r':dict(collections.Counter(c['rarity'] for c in cards)),'rel':d['set'].get('releaseDate')}
    json.dump(rep,open('/workspace/allsets/report.json','w'),indent=0)
    for k,v in rep.items():print(k,v['serie'],v['n'],'miss',v['miss'],v['r'])
main()
