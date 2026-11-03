#!/usr/bin/env python3
"""Post-process built set data: WOTC holo flags from TCGdex variants, subset rarities and pokemontcg.io/scrydex images.
Needs /tmp/sets/ptcg-<id>.json (pokemontcg.io card dumps)."""
import json,os,sys,urllib.request,concurrent.futures as cf
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=lambda s:os.path.join(ROOT,"data",s+".json")
P=lambda q:json.load(open(f"/tmp/sets/ptcg-{q}.json"))["data"]
def load(s):return json.load(open(D(s)))
def save(d):d["n"]=len(d["cards"]);open(D(d["dex"]),"w").write(json.dumps(d,ensure_ascii=False,separators=(",",":")))
def get(u):return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"pps-build"}),timeout=20))
def wotc(s,secret=()):
    d=load(s)
    def f(c):
        v=get(f"https://api.tcgdex.net/v2/en/cards/{c['id']}").get("variants") or {}
        if c["rarity"]=="Rare" and v.get("holo") and not v.get("normal"):c["rarity"]="Rare Holo"
        return c
    with cf.ThreadPoolExecutor(12) as ex:d["cards"]=list(ex.map(f,d["cards"]))
    save(d);import collections;print(s,collections.Counter(c["rarity"] for c in d["cards"]))
def cel25():
    d=load("cel25");pc={(c["name"]):c for c in P("cel25c")}
    for c in d["cards"]:
        if c["id"].startswith("cel25cc-"):
            m=pc.get(c["name"]) or next((x for x in P("cel25c") if x["name"].split()[-1]==c["name"].split()[-1]),None)
            c["rarity"]="Classic Collection"
            if m:c["pimg"]=m["images"]["large"]
        elif "img" not in c:print("noimg",c["id"],c["name"])
    save(d);print("cel25",sum(1 for c in d["cards"] if "img" in c or "pimg" in c),len(d["cards"]))
def swsh125():
    d=load("swsh12.5");pg={x["number"]:x for x in P("swsh12pt5gg")};pm={x["number"]:x for x in P("swsh12pt5")}
    for c in d["cards"]:
        if c["id"].startswith("swsh12.5gg-"):
            x=pg[c["lid"]];r=x["rarity"];c["rarity"]="Galarian Gallery Gold" if "Secret" in r else ("Galarian Gallery" if "Trainer Gallery" in r else "Galarian Gallery V")
            c["pimg"]=x["images"]["large"]
            if x["supertype"]=="Trainer":c["k"]="t"
        else:
            x=pm.get(c["n"])
            if x and x.get("rarity"):
                r=x["rarity"];c["rarity"]={"Rare Holo V":"Holo Rare V","Rare Holo VSTAR":"Holo Rare VSTAR","Rare Holo VMAX":"Holo Rare VMAX","Rare Ultra":"Ultra Rare","Rare Secret":"Secret Rare","Rare Holo":"Holo Rare"}.get(r,r)
    save(d);import collections;print("swsh12.5",collections.Counter(c["rarity"] for c in d["cards"]))
def c30():
    d=load("30th");d["cards"]=[c for c in d["cards"] if not c["id"].startswith("30th-c-")]
    for i,x in enumerate(P("me55c")):
        d["cards"].append({"id":f"30th-cc{i+1:02d}","n":f"CC{i+1:02d}","lid":f"CC{i+1:02d}","name":x["name"],"rarity":"Classic Collection","pimg":x["images"]["large"],**({"k":"t"} if x["supertype"]=="Trainer" else {})})
    for x in P("me55"):
        if x["number"] in("R","G","B"):d["cards"].append({"id":f"30th-rgb-{x['number']}","n":"RGB-"+x["number"],"lid":"RGB-"+x["number"],"name":"Mew","rarity":"RGB Rare","pimg":x["images"]["large"]})
    d["name"]="30th Celebration";save(d);import collections;print("30th",collections.Counter(c["rarity"] for c in d["cards"]))
if __name__=="__main__":
    for a in sys.argv[1:]:
        {"base5":lambda:wotc("base5"),"neo1":lambda:wotc("neo1"),"cel25":cel25,"swsh12.5":swsh125,"30th":c30}[a]()
