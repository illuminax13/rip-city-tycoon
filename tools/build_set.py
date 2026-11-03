#!/usr/bin/env python3
"""Build data/<dex>.json from TCGdex (rarity + Trainer/Energy kind). Usage: build_set.py <tcgdexSetId> [--extra <setId> ...] [--out dex]
Extra sets (e.g. Classic Collection / Galarian Gallery subsets) are appended with their own ids."""
import json,sys,os,urllib.request,concurrent.futures as cf,time
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def get(u):
    for i in range(4):
        try:return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"pps-build"}),timeout=20))
        except Exception as e:
            if i==3:raise
            time.sleep(1+i)
def card(cid):
    c=get(f"https://api.tcgdex.net/v2/en/cards/{cid}");return c
def build(sid):
    s=get(f"https://api.tcgdex.net/v2/en/sets/{sid}")
    with cf.ThreadPoolExecutor(12) as ex:full=list(ex.map(lambda c:card(c["id"]),s["cards"]))
    out=[]
    for c in full:
        e={"id":c["id"],"n":c["localId"].lstrip("0") or "0","lid":c["localId"],"name":c["name"],"rarity":c.get("rarity") or "Common"}
        if c.get("image"):e["img"]=c["image"]
        k={"Trainer":"t","Energy":"e"}.get(c.get("category"))
        if k:e["k"]=k
        out.append(e)
    return s,out
if __name__=="__main__":
    a=sys.argv[1:];sid=a[0];dex=a[a.index("--out")+1] if "--out" in a else sid
    extras=[a[i+1] for i,x in enumerate(a) if x=="--extra"]
    s,cards=build(sid)
    for x in extras:
        _,xc=build(x);cards+=xc
    d={"dex":dex,"name":s["name"],"n":len(cards),"v":2,"cards":cards}
    open(os.path.join(ROOT,"data",dex+".json"),"w").write(json.dumps(d,ensure_ascii=False,separators=(",",":")))
    import collections;print(dex,len(cards),dict(collections.Counter(c["rarity"] for c in cards)),"noimg",sum("img" not in c for c in cards))
