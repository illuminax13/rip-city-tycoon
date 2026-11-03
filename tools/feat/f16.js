
/* F16: TOP 10 HITS replaces the home-screen Collection grid (the binders are the full collection view).
   Ranking: every owned hit (rare holo and up; Lorcana Super Rare and up) across all Pokemon + Lorcana sets, one entry per card
   (best-priced variant). Priced cards first by market price (snapshot / live), then cards without a price by rarity tier, then
   set recency. Cached: recomputed only when the collection (packs / unique) or prices (pxChanged epoch / value) change.
   Also: the Scrydex scans for the 8 Mega Hyper Rares (srcFix) are enforced centrally in img(), so every render path
   (top 10, binder, chase, summary, zoom, boxes, hist zoom) gets them even when a card's stored imgs predate the fix. */
const MHR_NUMS=new Set(["187","188","130","294","295","124","122","120"]);
let MHR_PT=null;
function mhrSet(k){if(SETBY[k])return SETBY[k];if(!MHR_PT){MHR_PT={};SETS.forEach(s=>{if(s.ptcg&&s.game!=="lor")MHR_PT[s.ptcg]=s})}return MHR_PT[k]}
function mhrFix(srcs){srcs=(srcs||[]).filter(Boolean);if(!srcs.length)return srcs;
 const sx=srcs.filter(u=>/^https:\/\/images\.scrydex\.com\//.test(u));if(sx.length&&sx[0]===srcs[0])return srcs;
 for(const u of srcs){const m=/assets\.tcgdex\.net\/en\/[^/]+\/([^/]+)\/0*([^/]+)\/(?:high|low)\./.exec(u)||/images\.pokemontcg\.io\/([^/]+)\/0*([^/_.]+)(?:_hires)?\.png/.exec(u);
  if(!m)continue;if(!MHR_NUMS.has(m[2]))return srcs;const s=mhrSet(m[1]);if(!s||!s.ptcg||!srcFix(s.dex).includes(m[2]))return srcs;
  const L=`https://images.scrydex.com/pokemon/${s.ptcg}-${m[2]}/`;return [L+"large",L+"medium",...srcs.filter(x=>!/^https:\/\/images\.scrydex\.com\//.test(x))]}
 return sx.length?[...sx,...srcs.filter(x=>!sx.includes(x))]:srcs}
window.mhrFix=mhrFix;
{const im=img;img=function(srcs,...a){const f=mhrFix(srcs);const h=im(f,...a);return f.length&&/^https:\/\/images\.scrydex\.com\//.test(f[0])?h.replace("<img ",'<img data-mhr="1" '):h}}
/* a Scrydex scan that fails (flaky mobile network on a big png) gets one delayed retry before the flat tcgdex scan is used */
{const nx=nextImg;nextImg=function(el){try{const cur=el.currentSrc||el.getAttribute("src")||"";
 if(el.dataset.mhr&&!el.dataset.mhrRetry&&/^https:\/\/images\.scrydex\.com\//.test(cur)&&navigator.onLine!==false){el.dataset.mhrRetry="1";el.removeAttribute("srcset");const u=cur.split("?")[0];
  setTimeout(()=>{if(el.isConnected)el.src=u+"?retry=1"},1200);return}}catch(e){}return nx(el)}}

const T10={sig:"",key:"",rows:[],ep:0,pending:false,renders:0,ranks:0};
{const pc=pxChanged;pxChanged=function(){T10.ep++;return pc.apply(this,arguments)}}
function t10Srcs(c,s){const lid=String(c.id).slice(String(c.id).lastIndexOf("-")+1);
 return mhrFix(c.imgs&&c.imgs.length?c.imgs:s.game==="lor"?lorSrcs(s,lid,c.x):cardSrcs(s,lid))}
const t10Cmp=(a,b)=>((b.v!=null)-(a.v!=null))||((b.v||0)-(a.v||0))||(b.rk-a.rk)||(b.yr-a.yr)||(b.si-a.si)||String(a.c.id).localeCompare(String(b.c.id));
function t10Rank(){T10.ranks++;const best=new Map();
 SETS.forEach((s,si)=>{if(!store.sets||!store.sets[s.dex])return;for(const it of pxOwnedItems(s)){const c=it.c;if(!nhIsHit(c))continue;
  let r=null;try{r=priceOf(c,s)}catch(e){}const v=r&&r.v>0?r.v:null;let o=best.get(c.id);
  if(!o)best.set(c.id,o={c,s,v,rk:typeof rRank==="function"?rRank(c):0,yr:+s.year||0,si,n:0});else if(v!=null&&(o.v==null||v>o.v)){o.v=v;o.c=c}
  o.n+=it.q}});
 return [...best.values()].sort(t10Cmp).slice(0,10)}
function t10Sig(){return [store.packs,Object.keys(store.coll||{}).length,T10.ep,($("valc")||{}).textContent,($("hval")||{}).title].join("|")}
/* while a pack is still being revealed the showcase waits (no spoilers below the board); it catches up at the summary */
function t10Busy(){const p=$("vPack"),b=$("board");return !!(p&&p.classList.contains("on")&&b&&!b.classList.contains("done")&&typeof current!=="undefined"&&current&&current.length)}
function t10Img(x,hero){const srcs=t10Srcs(x.c,x.s);const ss=srcsetFor(srcs[0]);
 return img(srcs,x.c.name,x.c.rarity||"").replace("<img ",'<img loading="lazy" decoding="async" '+(ss?ss.replace(/sizes="[^"]*"/,hero?'sizes="(min-width:700px) 230px, 44vw"':'sizes="(min-width:700px) 118px, 27vw"'):""))}
const t10Px=x=>x.v!=null?`<b class="t10v">${usd(x.v)}</b>`:`<b class="t10v none">${esc(x.c.rarity||"no price")}</b>`;
function t10HTML(rows){if(!rows.length)return `<p class="t10more empty">No hits yet. Open packs to fill your Top 10.</p>`;
 const h=rows[0];let out=`<div class="t10hero"><button class="t10c hero" data-i="0" aria-label="Number 1: ${esc(h.c.name)}, ${esc(h.s.name)}${h.v!=null?", "+usd(h.v):""}. Open zoom"><span class="t10img">${t10Img(h,1)}</span><span class="t10rk rk1" aria-hidden="true">1</span></button>
 <div class="t10hinfo"><span class="t10lab">Best hit of all time</span><b class="t10name">${esc(h.c.name)}${h.c.rev?' <i>Reverse</i>':""}</b><span class="t10rar">${esc(h.c.rarity||"")}</span><span class="t10set">${esc(h.s.name)}</span>${t10Px(h)}${h.n>1?`<span class="t10n">×${h.n} owned</span>`:""}</div></div>`;
 if(rows.length>1)out+=`<div class="t10row" role="list">`+rows.slice(1).map((x,j)=>{const i=j+1;return `<div role="listitem"><button class="t10c" data-i="${i}" aria-label="Number ${i+1}: ${esc(x.c.name)}, ${esc(x.s.name)}${x.v!=null?", "+usd(x.v):""}. Open zoom"><span class="t10img">${t10Img(x,0)}</span><span class="t10rk rk${i+1}" aria-hidden="true">${i+1}</span><span class="t10meta">${t10Px(x)}<small>${esc(x.s.name)}</small></span></button></div>`}).join("")+`</div>`;
 if(rows.length<10)out+=`<p class="t10more">${10-rows.length} spot${rows.length===9?"":"s"} left. Open packs to fill your Top 10.</p>`;
 return out}
function t10Update(force){const el=$("top10");if(!el)return;const sig=t10Sig();if(!force&&!T10.pending&&sig===T10.sig&&el.childElementCount)return;
 if(t10Busy()){T10.pending=true;return}T10.pending=false;T10.sig=sig;const rows=t10Rank();T10.rows=rows;
 window.__top10=rows.map((r,i)=>({rank:i+1,id:r.c.id,name:r.c.name,rarity:r.c.rarity,v:r.v,set:r.s.name,rev:!!r.c.rev}));
 const key=rows.map(r=>r.c.id+":"+(r.v==null?"":r.v.toFixed(2))+":"+(r.c.rev?1:0)+":"+r.n).join(",");
 const sub=$("t10sub");if(sub)sub.textContent=rows.some(r=>r.v!=null)?"by market price":rows.length?"by rarity":"";
 if(key===T10.key&&el.childElementCount)return;T10.key=key;T10.renders++;el.innerHTML=t10HTML(rows)}
window.__t10=T10;window.t10Update=t10Update;
{const ph=pxHeader;pxHeader=function(){const r=ph.apply(this,arguments);try{t10Update()}catch(e){}return r}}
{const sh=show;show=function(){const r=sh.apply(this,arguments);try{if(T10.pending)t10Update(true)}catch(e){}return r}}
$("top10").addEventListener("click",e=>{const b=e.target.closest("[data-i]");if(!b)return;
 openZoom(T10.rows.map(x=>zItem({...x.c,imgs:t10Srcs(x.c,x.s),era:x.s.era},x.s,{n:x.n})),+b.dataset.i)});

/* New Top 10 hit: the per-pack check lives in F17 (shared pre-open snapshot for every open path); it sets h.top=N on the f14 new-hit map */
{const nt=nhToast;nhToast=function(c,chase){const r=nt.apply(this,arguments);try{const t=$("nhtoast");if(!t)return r;
 const i=current?current.indexOf(c):-1,h=i>=0&&current.newHits?current.newHits.get(i):null;
 if(h&&h.top){t.dataset.top=h.top;const sm=t.querySelector("small");
  if(chase){if(sm)sm.textContent=sm.textContent+" · New Top 10 hit! #"+h.top}/* chase keeps its "Chase card pulled!" headline */
  else{t.classList.add("top");const b=t.querySelector("b");if(b)b.textContent="New Top 10 hit! #"+h.top;const ic=t.querySelector("i");if(ic)ic.textContent="♛"}
  const L=NH.log[NH.log.length-1];if(L&&L.name===c.name)L.top=h.top}else{t.classList.remove("top");delete t.dataset.top}}catch(e){}return r}}
{const ss=showSummary;showSummary=function(){const r=ss.apply(this,arguments);try{const m=current&&current.newHits;
 if(m&&m.size&&PREF.newHits){const tops=[...m.values()].filter(h=>h.top).map(h=>h.top).sort((a,b)=>a-b);const d=document.querySelector("#summary .nhsum");
  if(tops.length&&d&&!d.querySelector(".t10s")){const e=document.createElement("b");e.className="t10s";e.textContent=tops.length>1?"New Top 10 hits! #"+tops.join(", #"):"New Top 10 hit! #"+tops[0];d.prepend(e)}}
 t10Update(true)}catch(e){}return r}}
try{t10Update(true)}catch(e){}
