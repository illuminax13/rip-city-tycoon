import json,sys,os,urllib.request,concurrent.futures as cf,time
def get(u):
    for i in range(5):
        try:return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"pps-build"}),timeout=25))
        except Exception as e:
            if i==4:raise
            time.sleep(1+i)
def one(sid):
    p=f"raw/{sid}.json"
    if os.path.exists(p):return sid,"cached"
    s=get(f"https://api.tcgdex.net/v2/en/sets/{sid}")
    with cf.ThreadPoolExecutor(16) as ex:full=list(ex.map(lambda c:get(f"https://api.tcgdex.net/v2/en/cards/{c['id']}"),s["cards"]))
    keep=[{k:c.get(k) for k in ("id","localId","name","rarity","image","category","suffix","stage","variants","trainerType","energyType")} for c in full]
    json.dump({"set":{k:s.get(k) for k in ("id","name","releaseDate","cardCount","logo","symbol","serie","tcgOnline","abbreviation")},"cards":keep},open(p,"w"))
    return sid,len(keep)
ids=sys.argv[1:]
for sid in ids:
    try:print(*one(sid),flush=True)
    except Exception as e:print(sid,"ERR",e,flush=True)
print("DONE",flush=True)
