#!/usr/bin/env python3
"""Count Access-Control-Allow-Origin headers per TCGdex image variant (duplicate '*,*' breaks crossorigin imgs). usage: cors_audit.py <dex> <serie>"""
import json,sys,os,http.client,concurrent.futures as cf
dex,serie=sys.argv[1],sys.argv[2];ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cards=json.load(open(f"{ROOT}/data/{dex}.json"))["cards"]
def chk(c):
    r={}
    for v in ("high.webp","low.webp","high.png","low.png"):
        h=http.client.HTTPSConnection("assets.tcgdex.net",timeout=15)
        try:
            h.request("HEAD",f"/en/{serie}/{dex}/{c['lid']}/{v}",headers={"Origin":"https://illuminax13.github.io","User-Agent":"pps-audit"})
            resp=h.getresponse();n=sum(1 for k,_ in resp.getheaders() if k.lower()=="access-control-allow-origin");r[v]=(resp.status,n)
        except Exception as e:r[v]=(0,0)
        finally:h.close()
    return c["lid"],c["name"],c.get("rarity"),r
with cf.ThreadPoolExecutor(20) as ex: res=list(ex.map(chk,cards))
good=lambda s:s[0]==200 and s[1]==1
allbad=[x for x in res if not any(good(s) for s in x[3].values())]
hb=[x for x in res if not good(x[3]["high.webp"])]
os.makedirs(f"{ROOT}/tools/audit",exist_ok=True);json.dump(res,open(f"{ROOT}/tools/audit/cors-{dex}.json","w"))
print(dex,len(res),"high.webp CORS-broken",len(hb),"ALL tcgdex variants CORS-broken",len(allbad))
for x in allbad: print("  ALLBAD",x[0],x[1],x[2],x[3])
