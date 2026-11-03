"""One-shot core engine changes for the all-sets update (tier, gen builder, foil layout, subsets, release dates)."""
import os,re
R=os.path.abspath(os.path.dirname(os.path.abspath(__file__))+'/../..');p=R+'/index.html';s=open(p).read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a);assert n==cnt,(n,a[:80]);s=s.replace(a,b)
# 1 tier(): older special rarities
rep(''' if(/galarian gallery/.test(r))return"illus";''',''' if(/galarian gallery|trainer gallery rare holo/.test(r))return"illus";
 if(/alternate|secret shining/.test(r))return"sir";''')
rep(''' if(/illustration/.test(r))return"illus";''',''' if(/illustration/.test(r))return"illus";
 if(/lv\\.x|prime|legend|break|prism|crystal|shining/.test(r))return"ultra";''')
# 2 wotc builder: Shining (sec) + generic builder hook
rep('''if(s.era==="wotc"){const R=C.rates.holo??1/3,ne=C.energy||0;''','''if(s.era==="wotc"&&C.structure!=="gen"){const R=C.rates.holo??1/3,ne=C.energy||0,sc=(p.sir&&p.sir.length&&C.rates.sec)||0,x=Math.random();''')
rep('''pack.push({...from(p,Math.random()<R?"holo":"rare","rare","holo")})}''','''pack.push({...(x<sc?from(p,"sir"):from(p,x<sc+R?"holo":"rare","rare","holo"))})}
 else if(C.structure==="gen")genPack(s,p,pack,C);''')
rep('''/* Celebrations: 4 cards''','''/* Generic data-driven builder for the e-Card..SWSH sets (data/pullrates.json structure "gen"):
   slots [[poolKeys,count]..] (commons/uncommons), rev reverse-holo slots (revX specials can replace one), then one rare slot (rareX specials replace it, else holo by rates.holo). */
const GPOOLS=new WeakMap();
function genKey(r){r=(r||"").toLowerCase();for(const[k,re]of GKEYS)if(re.test(r))return k;return r==="rare"?"r":/uncommon/.test(r)?"u":/rare/.test(r)?"r":"c"}
const GKEYS=[["svu",/shiny ultra/],["svr",/shiny rare/],["tgu",/trainer gallery.*ultra/],["tg",/trainer gallery/],["rcu",/rc rare ultra/],["rc",/rc rare/],["star",/gold star/],["cry",/crystal/],["shn",/shining/],["lvx",/lv\\.x/],["prime",/prime/],["leg",/legend/],["brk",/break/],["prism",/prism/],["amz",/amazing/],["rad",/radiant/],["ace",/ace spec/],["alt",/alternate/],["rbw",/rainbow/],["gold",/secret gold/],["sec",/secret/],["vmax",/vmax|vstar/],["fa",/rare ultra/],["ex",/ex|gx|holo rare v/],["holo",/holo/]];
function genPools(p){let m=GPOOLS.get(p);if(m)return m;m={};Object.values(p).flat().forEach(c=>{const k=genKey(c.rarity);(m[k]=m[k]||[]).push(c)});GPOOLS.set(p,m);return m}
function genPack(s,p,pack,C){const m=genPools(p),R=C.rates||{},has=k=>m[k]&&m[k].length,g=(...ks)=>{for(const k of ks)if(has(k))return pick(m[k]);return from(p,"common")},opt=l=>(l||[]).map(k=>[k,has(k)?R[k]:0]);
 for(const[k,n]of(C.slots||[["c",5],["u",3]]))for(let i=0;i<n;i++)pack.push({...g(...k.split("|"),"c")});
 for(let i=0;i<(C.rev??1);i++){const x=slotRoll(opt(C.revX));pack.push(x?{...g(x)}:{...g(roll([["c",.45],["u",.3],["r",.18],["holo",.07]]),"u","c"),rev:true})}
 if(C.rare!==0){const k=slotRoll(opt(C.rareX));pack.push({...(k?g(k):Math.random()<(R.holo??1/3)?g("holo","r"):g("r","holo"))})}
 if(pack.length>1)finish(pack)}
/* Celebrations: 4 cards''')
# 3 foil class: classic art-window holo for older specials; BW/XY/SM frame layout
rep('''function foilCls(c,era,serie,af){const t=c.tier||tier(c.rarity),m=era!=="wotc";''','''const MODF=sr=>/^(bw|xy|sm)$/.test(sr||"");
function foilCls(c,era,serie,af){const t=c.tier||tier(c.rarity),m=era!=="wotc";''')
rep('''let f=TIERS[t]>=4?"f-etch":''','''let f=TIERS[t]>=4?(era==="wotc"&&(!MODF(serie)||/prism|break|shining|ace spec|rc rare holo/i.test(c.rarity||""))?"f-holo":"f-etch"):''')
rep('''(era==="wotc"?"c":serie==="swsh"?"w":"s")''','''(era==="wotc"&&!MODF(serie)?"c":(serie==="swsh"||MODF(serie))?"w":"s")''')
# 4 subsets: Hidden Fates / Shining Fates shiny vaults, SWSH Trainer Galleries share the parent binder
rep('''function subKey(d,n){n=String(n);''','''const SUBP={sma:"sm115","swsh4.5sv":"swsh4.5",swsh9tg:"swsh9",swsh10tg:"swsh10",swsh11tg:"swsh11",swsh12tg:"swsh12"};
const SUBPT={sma:"sma","swsh4.5sv":"swsh45sv",swsh9tg:"swsh9tg",swsh10tg:"swsh10tg",swsh11tg:"swsh11tg",swsh12tg:"swsh12tg"};
function subKey(d,n){n=String(n);if(SUBP[d])return [SUBP[d],n.toUpperCase()];''')
rep('''if(d==="swsh12.5"&&/^GG\\d+$/.test(n))return "swsh12.5gg-"+n;return d+"-"+(lid||n)}''','''if(d==="swsh12.5"&&/^GG\\d+$/.test(n))return "swsh12.5gg-"+n;
 if(/^TG\\d+$/.test(n)&&/^swsh(9|10|11|12)$/.test(d))return d+"tg-"+n;if(/^SV\\d+$/.test(n)&&(d==="sm115"||d==="swsh4.5"))return (d==="sm115"?"sma":"swsh4.5sv")+"-"+n;return d+"-"+(lid||n)}''')
# hydrate: subset ids resolve to the parent set
rep('''if((!c.imgs||!c.imgs.length)&&SETBY[d])c.imgs=SETBY[d].game==="lor"?lorSrcs(SETBY[d],lid,c.x):cardSrcs(SETBY[d],lid)}''','''const S=SETBY[d]||SETBY[SUBP[d]];if((!c.imgs||!c.imgs.length)&&S)c.imgs=S.game==="lor"?lorSrcs(S,lid,c.x):cardSrcs(S,lid)}''')
# cardSrcs: pokemontcg URLs for subset / letter-numbered cards; sets without TCGdex images go straight to pokemontcg
rep('''function cardSrcs(s,localId,extra=[]){if(s.game==="lor")return lorSrcs(s,localId);const n=String(localId).replace(/^0+(?=\\d)/,"");const base=`https://assets.tcgdex.net/en/${s.serie}/${s.dex}/${localId}`;''','''function ptcgSub(s,n){const u=n.toUpperCase();if(/^TG\\d+$/.test(u)&&/^swsh(9|10|11|12)$/.test(s.dex))return [s.ptcg+"tg",u];if(/^SV\\d+$/.test(u)&&s.dex==="sm115")return ["sma",u];if(/^SV\\d+$/.test(u)&&s.dex==="swsh4.5")return ["swsh45sv",u];
 if(/^H\\d+$/.test(u))return [s.ptcg,"H"+parseInt(u.slice(1))];if(/^\\d+a$/.test(n)&&/^ecard/.test(s.dex))return [s.ptcg,n.slice(0,-1)];return null}
function notdHas(d){return d==="sm3.5"||d==="sm7.5"} /* hoisted: cardSrcs runs while hydrating the saved collection, before later consts exist */
function cardSrcs(s,localId,extra=[]){if(s.game==="lor")return lorSrcs(s,localId);const n=String(localId).replace(/^0+(?=\\d)/,"");const base=`https://assets.tcgdex.net/en/${s.serie}/${s.dex}/${localId}`;
 const sb=s.ptcg&&ptcgSub(s,n);if(sb||notdHas(s.dex)){const[a,b]=sb||[s.ptcg,n];return [...extra,`https://images.pokemontcg.io/${a}/${b}_hires.png`,`https://images.pokemontcg.io/${a}/${b}.png`,`${base}/high.webp`].filter((v,i,x)=>v&&x.indexOf(v)===i)}''')
# 5 neo1 joins the Neo era group; release dates for picker ordering
rep('''dex:"neo1",serie:"neo",grp:"base",''','''dex:"neo1",serie:"neo",grp:"neo",''')
REL={"base1":"1999-01-09","base2":"1999-06-16","base3":"1999-10-10","base5":"2000-04-24","neo1":"2000-12-16","swsh7":"2021-08-27","cel25":"2021-10-08","swsh12.5":"2023-01-20","sv03":"2023-08-11","sv03.5":"2023-09-22","sv04.5":"2024-01-26","sv06":"2024-05-24","sv08":"2024-11-08","sv08.5":"2025-01-17","sv09":"2025-03-28","sv10":"2025-05-30","sv10.5b":"2025-07-17","sv10.5w":"2025-07-18","me01":"2025-09-26","me02":"2025-11-14","me02.5":"2026-01-30","me03":"2026-03-27","me04":"2026-05-22","me05":"2026-07-17","30th":"2026-09-26"}
i=s.find('const SETS=');j=s.find('\n];',i);blk=s[i:j]
for d,r in REL.items():
    a=f'dex:"{d}",';assert blk.count(a)==1,d;blk=blk.replace(a,a+f'rel:"{r}",')
s=s[:i]+blk+s[j:]
open(p,'w').write(s);print('core ok')
