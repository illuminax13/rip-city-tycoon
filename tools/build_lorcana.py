#!/usr/bin/env python3
"""Build data/lorcana-<N>.json for the 14 English Disney Lorcana main sets.
Source: Lorcast API (https://api.lorcast.com/v0/sets/<code>/cards), cached in /tmp/lor/set<N>.json.
Image chain per card (index.html lorSrcs): Dreamborn CDN webp (sets 1-9) -> Lorcast large AVIF -> TCGplayer product jpg -> Lorcast normal AVIF.
Dreamborn availability comes from /tmp/lor/dbstat.txt (HEAD audit: "<code> <url>" per line); missing file = assume sets 1-9 ok."""
import json, os, re, urllib.request
SETS = {1:"The First Chapter",2:"Rise of the Floodborn",3:"Into the Inklands",4:"Ursula's Return",5:"Shimmering Skies",
        6:"Azurite Sea",7:"Archazia's Island",8:"Reign of Jafar",9:"Fabled",10:"Whispers in the Well",11:"Winterspell",
        12:"Wilds Unknown",13:"Attack of the Vine!",14:"Hyperia City"}
RAR = {"Common":"Common","Uncommon":"Uncommon","Rare":"Rare","Super_rare":"Super Rare","Legendary":"Legendary",
       "Enchanted":"Enchanted","Epic":"Epic","Iconic":"Iconic"}
CACHE = "/tmp/lor"; OUT = os.path.join(os.path.dirname(__file__), "..", "data")
def cards(k):
    p = f"{CACHE}/set{k}.json"
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(f"https://api.lorcast.com/v0/sets/{k}/cards", headers={"User-Agent":"pps-build"})
        open(p, "wb").write(urllib.request.urlopen(req, timeout=60).read())
    return json.load(open(p))
db_ok = None
if os.path.exists(f"{CACHE}/dbstat.txt"):
    db_ok = {l.split()[1] for l in open(f"{CACHE}/dbstat.txt") if l.startswith("200 ")}
tot = {}
for k, name in SETS.items():
    out, seen = [], set()
    for c in cards(k):
        num = int(re.sub(r"\D", "", c["collector_number"]) or 0)
        lid = f"{num:03d}"
        if lid in seen: continue
        seen.add(lid)
        u = c.get("image_uris", {}).get("digital", {})
        db = f"https://cdn.dreamborn.ink/images/en/cards/{k:03d}-{lid}"
        has_db = (db in db_ok) if db_ok is not None else k <= 9
        lc = re.sub(r"^.*/large/", "", u.get("large", "")).replace(".avif", "")  # crd_<hex>?<ts>
        # compact image key "db|lorcast|tcgplayer" expanded client-side by lorSrcs() in index.html
        x = f"{1 if has_db else 0}|{lc}|{c.get('tcgplayer_id') or ''}"
        nm = c["name"] + (" - " + c["version"] if c.get("version") else "")
        out.append({"id": f"lorcana-{k}-{lid}", "n": str(num), "lid": lid, "name": nm, "rarity": RAR.get(c["rarity"], c["rarity"]),
                    "ink": c.get("ink") or "/".join(c.get("inks") or []), "type": (c.get("type") or [""])[0], "x": x})
    out.sort(key=lambda x: int(x["n"]))
    json.dump({"dex": f"lorcana-{k}", "name": name, "game": "lorcana", "n": len(out), "cards": out, "v": 1,
               "source": "api.lorcast.com/v0"}, open(f"{OUT}/lorcana-{k}.json", "w"), separators=(",", ":"))
    from collections import Counter
    tot[k] = (len(out), dict(Counter(x["rarity"] for x in out)), sum(1 for x in out if x["x"][0] == "1"))
for k, v in tot.items(): print(k, SETS[k], v)
