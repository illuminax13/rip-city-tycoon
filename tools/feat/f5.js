/* ---------- F5: market prices ---------- */
const PX={k:"ppsPrice",db:null,inflight:{},act:0,q:[],ptcgDown:(()=>{try{return Date.now()-(+localStorage.getItem("ppsPtcgDown")||0)<36e5?1:0}catch(e){return 0}})(),EUR:1.08,TTL:864e5,MAXC:4000,LIM:4,req:0};
function pxLoad(){if(PX.db)return PX.db;try{PX.db=JSON.parse(localStorage.getItem(PX.k)||"null")}catch(e){}if(!PX.db||PX.db.v!==1)PX.db={v:1,s:{},c:{}};return PX.db}
let pxSaveT=0;function pxSave(){clearTimeout(pxSaveT);pxSaveT=setTimeout(()=>{const db=pxLoad(),ks=Object.keys(db.c);
 if(ks.length>PX.MAXC)ks.sort((a,b)=>db.c[a].t-db.c[b].t).slice(0,ks.length-PX.MAXC).forEach(k=>delete db.c[k]);
 const out={v:1,s:db.s,c:Object.fromEntries(Object.entries(db.c).filter(([k,o])=>!o.err))};
 try{localStorage.setItem(PX.k,JSON.stringify(out))}catch(e){try{out.c={};localStorage.setItem(PX.k,JSON.stringify(out))}catch(_){}}},400)}
/* defer network price work so it never competes with set/binder loading on slow phones */
function pxIdle(f,ms){setTimeout(()=>{(window.requestIdleCallback||(g=>setTimeout(g,0)))(()=>f(),{timeout:2000})},ms)}
const pxFresh=o=>o&&Date.now()-o.t<PX.TTL;
const pxNum=c=>String(keyOf(c.id)[1]).toUpperCase();
function pxLimit(f){return new Promise((res,rej)=>{const run=()=>{PX.act++;f().then(res,rej).finally(()=>{PX.act--;const n=PX.q.shift();if(n)n()})};PX.act<PX.LIM?run():PX.q.push(run)})}
async function pxJSON(u,ms=15000){const ac=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>ac&&ac.abort(),ms);PX.req++;
 try{const r=await fetch(u,ac?{signal:ac.signal}:{});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(tm)}}
function pxSet(s){const db=pxLoad();if(pxFresh(db.s[s.dex]))return Promise.resolve(db.s[s.dex]);if(s.game!=="lor"&&(PX.ptcgDown||!s.ptcg))return Promise.resolve(db.s[s.dex]||null);
 const key="s:"+s.dex;if(PX.inflight[key])return PX.inflight[key];
 return PX.inflight[key]=(async()=>{try{const p={};let d="";
  if(s.game==="lor"){const a=await pxJSON(`https://api.lorcast.com/v0/sets/${encodeURIComponent(s.code)}/cards`);(Array.isArray(a)?a:a.results||[]).forEach(x=>{const pr=x.prices||{},o={};if(pr.usd!=null)o.n=+pr.usd;if(pr.usd_foil!=null)o.h=+pr.usd_foil;p[String(x.collector_number).replace(/^0+(?=\w)/,"").toUpperCase()]=o});
   d=new Date().toISOString().slice(0,10);db.s[s.dex]={t:Date.now(),d,src:"TCGplayer via Lorcast",p}}
  else{let page=1,tot=1;while((page-1)*250<tot&&page<5){const j=await pxJSON(`https://api.pokemontcg.io/v2/cards?q=set.id:${encodeURIComponent(s.ptcg)}&select=number,tcgplayer,cardmarket&pageSize=250&page=${page}`);tot=j.totalCount||0;
    (j.data||[]).forEach(x=>{const tp=(x.tcgplayer&&x.tcgplayer.prices)||{},o={},m=k=>tp[k]?(tp[k].market!=null?tp[k].market:tp[k].mid):undefined,f=(...ks)=>{for(const k of ks){const v=m(k);if(v!=null)return v}};
     const nn=f("normal","unlimited","1stEdition"),hh=f("holofoil","unlimitedHolofoil","1stEditionHolofoil"),rr=f("reverseHolofoil");if(nn!=null)o.n=nn;if(hh!=null)o.h=hh;if(rr!=null)o.r=rr;
     const cm=x.cardmarket&&x.cardmarket.prices;if(cm&&cm.averageSellPrice)o.cm=cm.averageSellPrice;const u=x.tcgplayer&&x.tcgplayer.updatedAt;if(u&&u>d)d=u;p[String(x.number).replace(/^0+(?=\w)/,"").toUpperCase()]=o});page++}
   if(!Object.keys(p).length)return db.s[s.dex]||null;db.s[s.dex]={t:Date.now(),d:d.replace(/\//g,"-").slice(0,10),src:"TCGplayer via pokemontcg.io",p}}
  pxSave();pxChanged();return db.s[s.dex]}catch(e){if(s.game!=="lor"){PX.ptcgDown=1;try{localStorage.setItem("ppsPtcgDown",Date.now())}catch(_){}}return db.s[s.dex]||null}finally{delete PX.inflight[key]}})()}
function pxCard(c){const db=pxLoad(),e=db.c[c.id];if(pxFresh(e))return Promise.resolve(e);const key="c:"+c.id;if(PX.inflight[key])return PX.inflight[key];
 return PX.inflight[key]=pxLimit(()=>pxJSON(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(c.id)}`)).then(j=>{const P=j.pricing||{},tp=P.tcgplayer||{},o={t:Date.now(),src:"TCGplayer via TCGdex"};
   const m=k=>tp[k]&&typeof tp[k]==="object"?(tp[k].marketPrice!=null?tp[k].marketPrice:tp[k].midPrice):undefined,f=(...ks)=>{for(const k of ks){const v=m(k);if(v!=null)return v}};
   const nn=f("normal","unlimited","1st-edition","1stEdition"),hh=f("holofoil","unlimited-holofoil","1st-edition-holofoil","unlimitedHolofoil","1stEditionHolofoil"),rr=f("reverse-holofoil","reverseHolofoil");
   if(nn!=null)o.n=nn;if(hh!=null)o.h=hh;if(rr!=null)o.r=rr;const cm=P.cardmarket;if(cm&&cm.avg)o.cm=cm.avg;if(cm&&cm["avg-holo"])o.cmr=cm["avg-holo"];
   o.d=String(tp.updated||(cm&&cm.updated)||"").slice(0,10);db.c[c.id]=o;pxSave();pxChanged();return o})
  .catch(()=>{/* network/timeout: keep an older good entry for 1h, but retry a failed lookup after 90s instead of showing "no price" for an hour */const o=e&&!e.err?{...e,t:Date.now()-PX.TTL+36e5}:{t:Date.now()-PX.TTL+9e4,err:1};db.c[c.id]=o;return o}).finally(()=>{delete PX.inflight[key]})}
function pxChain(c,s){const t=TIERS[c.tier||tier(c.rarity)]||0;if(s.game==="lor")return c.rev||t>=5?["h","n"]:["n","h"];if(c.rev)return ["r","n","h"];if(s.era==="wotc")return t>=3?["h","n"]:["n","h"];return t>=2?["h","n","r"]:["n","h","r"]}
function pxPick(e,c,s){if(!e||e.err)return null;for(const k of pxChain(c,s))if(e[k]!=null&&e[k]>0)return {v:+e[k],k,src:"TCGplayer"};const cm=c.rev&&e.cmr?e.cmr:e.cm;if(cm)return {v:cm*PX.EUR,k:"cm",src:"Cardmarket",eur:cm};return null}
/* undefined = not fetched yet, null = no price */
function priceOf(c,s){s=s||setOfId(c.id);if(!s||!c.id)return null;const db=pxLoad(),S=db.s[s.dex],n=pxNum(c);let e=S&&S.p[n],r=pxPick(e,c,s);if(r)return {...r,d:S.d,via:S.src,e};
 if(s.game==="lor")return S?null:undefined;const ce=db.c[c.id];if(ce){r=pxPick(ce,c,s);return r?{...r,d:ce.d,via:ce.src,e:ce}:null}return undefined}
async function priceFor(c,s){s=s||setOfId(c.id);if(!s||!c.id)return null;if(s.game==="lor"){await pxSet(s);return priceOf(c,s)}
 const S=await pxSet(s);if(S&&pxPick(S.p[pxNum(c)],c,s))return priceOf(c,s);await pxCard(c);let r=priceOf(c,s);
 /* one quick retry when the card lookup failed (slow mobile network / TCGdex timeout) */
 if(r===null&&(pxLoad().c[c.id]||{}).err){await new Promise(z=>setTimeout(z,3000));delete pxLoad().c[c.id];await pxCard(c);r=priceOf(c,s)}return r}
const usd=v=>v>=1000?"$"+Math.round(v).toLocaleString("en-US"):"$"+v.toFixed(2);
function priceLine(c,s){s=s||setOfId(c.id);const r=priceOf(c,s);if(r===undefined)return `<small>price…</small>`;if(!r){const ce=pxLoad().c[c.id];return ce&&ce.err?`<small>price unavailable · retrying shortly</small>`:`<small>no price</small>`}
 /* TCGplayer variant names (hyper/gold, ex, IR/SIR only exist as "Holofoil") */
 const lor=s.game==="lor",nm={n:"normal",h:lor?"foil":"holofoil",r:"reverse holofoil"};let alt="";const e=r.e||{};
 if(r.k!=="cm"){const ok=lor?(r.k==="h"?"n":"h"):(r.k==="r"?(e.h!=null?"h":"n"):"r");if(e[ok]!=null&&e[ok]>0)alt=` · ${nm[ok]} ${usd(+e[ok])}`}
 return `${r.k==="cm"?"≈":""}${usd(r.v)}${r.k!=="cm"?` <small>${nm[r.k]}</small>`:""}${alt} <small>· ${r.k==="cm"?`Cardmarket €${r.eur.toFixed(2)}`:"TCGplayer market"}${r.d?" · "+r.d:""}</small>`}
const pxChip=r=>r===undefined?"…":r?(r.k==="cm"?"≈":"")+usd(r.v):"no price";
let pxCT=0;function pxChanged(){clearTimeout(pxCT);pxCT=setTimeout(pxHeader,300)}
/* ---- owned-collection valuation (cache only, sync) ---- */
function pxOwnedItems(s){const o=owned(s)||{},out=[];Object.entries(o).forEach(([n,e])=>{if(!e||!e.n)return;const lid=e.lid||n,id=s.dex+"-"+lid,rv=Math.min(e.rv||0,e.n),base={id,name:e.name,rarity:e.rarity,imgs:e.imgs,x:e.x,era:s.era};
 if(e.n-rv>0)out.push({c:{...base,rev:false},q:e.n-rv});if(rv>0)out.push({c:{...base,rev:true},q:rv})});return out}
function pxValue(sets){let v=0,priced=0,total=0,d="";const top=[];(sets||SETS).forEach(s=>{pxOwnedItems(s).forEach(it=>{total+=it.q;const r=priceOf(it.c,s);if(r){v+=r.v*it.q;priced+=it.q;if(r.d&&r.d>d)d=r.d;top.push({...it,s,r})}})});
 top.sort((a,b)=>b.r.v-a.r.v||(typeof rRank==="function"?rRank(b.c)-rRank(a.c):0));return {v,priced,total,d,top}}
function pxHeader(){const el=$("valc");if(!el)return;const x=pxValue();el.textContent=x.priced?usd(x.v):"—";$("hval").title=`Collection value: ${x.priced}/${x.total} cards priced (TCGplayer market estimates${x.d?", "+x.d:""})`;
 if($("vShelf").classList.contains("on"))pxShelfPanel()}
async function pxFetchOwned(sets,allowCards,prog){const items=[];for(const s of sets){const its=pxOwnedItems(s);if(!its.length)continue;await pxSet(s);if(s.game!=="lor")its.forEach(it=>{if(!pxPick((pxLoad().s[s.dex]||{p:{}}).p[pxNum(it.c)],it.c,s)&&!pxFresh(pxLoad().c[it.c.id]))items.push(it)})}
 const uniq=[...new Map(items.map(it=>[it.c.id,it])).values()];if(!allowCards&&uniq.length>150)return uniq.length;let done=0;
 await Promise.all(uniq.map(it=>pxCard(it.c).then(()=>{done++;prog&&prog(done,uniq.length)})));return 0}
/* ---- UI hooks ---- */
{const ss=showSummary;showSummary=function(){const r=ss.apply(this,arguments);try{const cur=current,s=set,els=[...document.querySelectorAll("#summary .sgrid .card")];
 const pv=document.createElement("div");pv.className="packval";pv.id="packval";$("summary").querySelector(".sgrid").after(pv);
 const upd=()=>{let v=0,np=0,pending=0;cur.forEach((c,i)=>{const p=priceOf(c,s);if(p)v+=p.v;else if(p===null)np++;else pending++;const el=els[i];if(!el)return;let ch=el.querySelector(".pchip");if(!ch){ch=document.createElement("div");ch.className="pchip";el.appendChild(ch)}ch.textContent=pxChip(p);ch.classList.toggle("np",!p)});
  const bc=typeof bestOf==="function"?bestOf(cur,s):null,bp=bc&&priceOf(bc,s);pv.innerHTML=(bc?`Best pull <b class="pvbest">${esc(bc.name)}</b>${bp?" "+usd(bp.v):""} · `:"")+`Pack value <b>${usd(v)}</b>${pending?" <span class='pxsrc'>(loading prices…)</span>":""}${np?` <span class='pxsrc'>· ${np} without price</span>`:""} <span class="pxsrc">· TCGplayer market estimates</span>`};
 upd();cur.forEach(c=>priceFor(c,s).then(()=>{if(current===cur)upd()}).catch(()=>{}))}catch(e){}return r}}
function boxPrices(B,all,hits,best){const s=B.s;let left=0;const vEl=$("bxval"),nEl=$("bxvaln");
 const upd=()=>{if(BOX!==B)return;let v=0,pr=0,np=0,d="";let mv=null;all.forEach(x=>{const p=priceOf(x.c,s);if(p){v+=p.v;pr++;if(p.d>d)d=p.d;if(!mv||p.v>mv.p.v+.004||Math.abs(p.v-mv.p.v)<=.004&&typeof rRank==="function"&&rRank(x.c)>rRank(mv.c))mv={...x,p}}else if(p===null)np++});
  if(vEl)vEl.textContent=usd(v);if(nEl)nEl.textContent=`box value · ${pr}/${all.length} priced${left?" (loading…)":""}${np?` · ${np} no price`:""}`;
  if(typeof bxResort==="function")bxResort(B);(B.hitList||hits).forEach((x,j)=>{const e=document.querySelector(`#boxv [data-pj="${j}"]`);if(e)e.textContent=pxChip(priceOf(x.c,s))});
  all.forEach((x,j)=>{const e=document.querySelector(`#boxv [data-pj="a${j}"]`);if(e)e.textContent=pxChip(priceOf(x.c,s))});
  const bp=$("bxbestp");if(bp&&(B.best||best))bp.innerHTML=priceLine((B.best||best).c,s);
  let m=$("bxmv");if(!m){const st=document.querySelector("#boxv .bxstats");if(st){m=document.createElement("p");m.className="bxnote";m.id="bxmv";st.after(m)}}
  if(m)m.innerHTML=(mv?`Most valuable: <b>${esc(mv.c.name)}</b> (${esc(mv.c.rarity)}, pack #${mv.k+1}) — ${usd(mv.p.v)} · `:"")+`Prices are TCGplayer market estimates${d?" as of "+d:""} (Cardmarket fallback ≈).`};
 const seen=new Map();[...hits,...all].forEach(x=>{const k=x.c.id+(x.c.rev?"r":"");if(!seen.has(k))seen.set(k,x)});left=seen.size;upd();let t=0;
 seen.forEach(x=>priceFor(x.c,s).catch(()=>{}).then(()=>{left--;if(!t)t=setTimeout(()=>{t=0;upd()},150);if(!left)upd()}))}
function pxShelfPanel(){const sh=$("shelf");if(!sh)return;const G=GAME,sets=SETS.filter(s=>(s.game==="lor")===(G==="lor")),x=pxValue(sets);let p=$("pxpanel");
 if(!p||!sh.contains(p)){p=document.createElement("div");p.id="pxpanel";p.className="pxpanel";const h=sh.querySelector(".shelfh");h?h.after(p):sh.prepend(p);p._h=""}
 const html=`<div class="pxtot"><span>${G==="lor"?"Lorcana":"Pokémon"} collection value</span><b id="pxtotal">${x.priced?usd(x.v):"—"}</b><span class="pxsrc">${x.priced}/${x.total} cards priced</span><button id="pxupd" class="ghost">Update prices</button></div>
 <div class="pxsrc">Prices are TCGplayer market estimates${x.d?` (as of ${x.d})`:""}${G==="lor"?" via Lorcast":" via pokemontcg.io / TCGdex; Cardmarket € fallback marked ≈"}. Cached 24h.</div>
 ${x.top.length?`<div style="margin-top:10px;font-weight:600">Most valuable cards</div><div class="pxmv">${x.top.slice(0,12).map((t,j)=>`<button data-mv="${j}">${img(t.c.rev||t.s.game!=="lor"?t.s.game==="lor"?lorSrcs(t.s,t.c.id.split("-").pop(),t.c.x):t.c.imgs:lorSrcs(t.s,t.c.id.split("-").pop(),t.c.x),t.c.name,t.c.rarity).replace("<img ",'<img loading="lazy" decoding="async" ')}<span>${esc(t.c.name)}${t.c.rev?(t.s.game==="lor"?" (Foil)":" (Rev)"):""}<br><em>${usd(t.r.v)}</em>${t.q>1?" ×"+t.q:""}</span></button>`).join("")}</div>`:x.total?`<div style="margin-top:10px;font-weight:600">Most valuable cards</div><div class="pxmv pxph"></div>`:""}`;if(p._h===html){pxShelfVals();return}p._h=html;p.innerHTML=html;
 p.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>openZoom(x.top.slice(0,12).map(t=>zItem({...t.c,imgs:t.s.game==="lor"?lorSrcs(t.s,t.c.id.split("-").pop(),t.c.x):t.c.imgs},t.s,{n:t.q})),+b.dataset.mv));
 $("pxupd").onclick=()=>{const b=$("pxupd");b.disabled=true;b.textContent="Updating…";pxFetchOwned(sets,true,(d,n)=>{b.textContent=`Updating ${d}/${n}…`}).then(()=>{pxShelfVals();pxHeader();pxShelfPanel()})};
 pxShelfVals()}
function pxShelfVals(){document.querySelectorAll("#shelf .binder").forEach(b=>{const s=BSETS[b.dataset.i];if(!s)return;const x=pxValue([s]);let e=b.querySelector(".bval");if(!e){e=document.createElement("div");e.className="bval";const c=b.querySelector(".bcount");c&&c.after(e)}e.textContent=x.priced?usd(x.v)+(x.priced<x.total?` · ${x.priced}/${x.total} priced`:""):x.total?"no prices yet":""})}
{const os=openShelf;openShelf=function(){const r=os.apply(this,arguments);try{pxShelfPanel();const sets=SETS.filter(s=>(s.game==="lor")===(GAME==="lor"));pxIdle(()=>{if(!$("vShelf").classList.contains("on"))return;pxFetchOwned(sets,false).then(()=>{pxShelfVals();pxHeader()}).catch(()=>{})},2500)}catch(e){}return r}}
{const ob=openBinder;openBinder=async function(s){const r=await ob.apply(this,arguments);try{let e=$("bvalb");if(!e){e=document.createElement("span");e.id="bvalb";$("btitle").after(e)}
 const upd=()=>{if(B.s!==s)return;const x=pxValue([s]);e.textContent=x.total?(x.priced?`Binder value ${usd(x.v)}`+(x.priced<x.total?` (${x.priced}/${x.total} priced)`:""):"Binder value: loading…"):"";e.title="TCGplayer market estimates"+(x.d?" as of "+x.d:"")};
 upd();pxIdle(()=>B.s===s&&pxFetchOwned([s],true).then(()=>{upd();pxHeader();if(e.textContent==="Binder value: loading…")e.textContent="Binder value: no prices"}).catch(()=>{}),1500)}catch(e){}return r}}
{const rd=render;let t=0;render=function(){const r=rd.apply(this,arguments);clearTimeout(t);t=setTimeout(pxHeader,500);return r}}
setTimeout(pxHeader,800);
