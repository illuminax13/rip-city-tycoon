/* ==== F3: full-screen card zoom: binders, history, collection, pack + box summary ==== */
const Z={list:[],i:0,dn:null,swiped:0};
const setOfId=id=>SETBY[keyOf(id)[0]];
function zItem(c,s,extra){return {c,s:s||(c.id&&setOfId(c.id)),...(extra||{})}}
function openZoom(list,i){if(!list||!list.length)return;Z.list=list;Z.i=Math.max(0,Math.min(i||0,list.length-1));zoomRender(0);$("viewer").classList.add("on");if(typeof gyroNeutral==="function")gyroNeutral()}
function closeZoom(){$("viewer").classList.remove("on")}
function zoomInfo(it){const c=it.c,s=it.s,lid=c.id?c.id.slice(c.id.lastIndexOf("-")+1):(it.lid||""),v=c.rev?(s&&s.game==="lor"?" · Foil":c.pat==="mb"?" · Master Ball Reverse":c.pat==="pb"?" · Poké Ball Reverse":" · Reverse Holo"):"";
 const pr=typeof priceLine==="function"?priceLine(c,s):"";
 return `<b>${esc(c.name)}</b><br>${esc(s?s.name:"")}${lid?" · #"+esc(lid):""} · ${esc(c.rarity||"")}${v}${it.n?` · owned ×${it.n}`:""}<br><span class="zp" id="zprice">${pr}</span><div class="zn">${Z.i+1} / ${Z.list.length} · swipe for next · swipe down or tap outside to close</div>`}
function zoomRender(dir){const it=Z.list[Z.i];if(!it)return;const c={...it.c,tier:it.c.tier||tier(it.c.rarity)};if(!c.era&&it.s)c.era=it.s.era;
 if(it.s&&it.s.game==="lor"&&(!c.imgs||!c.imgs.length)){c.imgs=lorSrcs(it.s,(c.id||"").split("-").pop(),c.x)}
 const prev=set;set=it.s||set;const el=cardEl(c,0);set=prev;el.classList.add("flipped");if(dir){el.classList.add(dir>0?"zin-r":"zin-l");el.addEventListener("animationend",()=>el.classList.remove("zin-r","zin-l"),{once:true})}tilt(el);
 const im=el.querySelector(".front img");if(im){im.loading="eager";im.decoding="async";im.removeAttribute("srcset")}
 $("vcard").innerHTML="";$("vcard").appendChild(el);$("vinfo").innerHTML=zoomInfo(it);
 $("zprev").disabled=Z.i<=0;$("znext").disabled=Z.i>=Z.list.length-1;
 if(typeof priceFor==="function")priceFor(c,it.s).then(()=>{const p=$("zprice");if(p&&Z.list[Z.i]===it)p.innerHTML=priceLine(c,it.s)}).catch(()=>{});
 /* preload + pre-decode neighbours' hi-res images off the swipe path */Z.pre=Z.pre||new Map();[Z.list[Z.i+1],Z.list[Z.i-1],Z.list[Z.i+2]].forEach(n=>{const u=n&&n.c.imgs&&n.c.imgs[0];if(u&&!Z.pre.has(u)){const p=new Image();p.referrerPolicy="no-referrer";p.decoding="async";p.src=u;if(p.decode)p.decode().catch(()=>{});Z.pre.set(u,p);if(Z.pre.size>8)Z.pre.delete(Z.pre.keys().next().value)}})}
function zoomGo(d){const n=Z.i+d;if(n<0||n>=Z.list.length)return;Z.i=n;zoomRender(d);if(typeof gyroNeutral==="function")gyroNeutral()}
{const v=$("viewer");v.insertAdjacentHTML("beforeend",'<button class="znav zprev" id="zprev" aria-label="Previous card">‹</button><button class="znav znext" id="znext" aria-label="Next card">›</button><button class="zclose" id="zclose" aria-label="Close">✕</button>');
 $("zprev").onclick=e=>{e.stopPropagation();zoomGo(-1)};$("znext").onclick=e=>{e.stopPropagation();zoomGo(1)};$("zclose").onclick=e=>{e.stopPropagation();closeZoom()};
 v.addEventListener("pointerdown",e=>{Z.dn={x:e.clientX,y:e.clientY,t:performance.now(),onCard:!!e.target.closest(".card")}},{passive:true});
 v.addEventListener("pointerup",e=>{const d=Z.dn;Z.dn=null;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y,dt=performance.now()-d.t;
  const fast=d.onCard?dt<320:dt<1500;if(fast&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.3){Z.swiped=performance.now();zoomGo(dx<0?1:-1)}
  else if(fast&&dy>90&&dy>Math.abs(dx)*1.3){Z.swiped=performance.now();closeZoom()}},{passive:true});
 /* a swipe ends with a click on the backdrop: don't let the old "tap outside closes" handler eat it */
 window.addEventListener("click",e=>{if(v.classList.contains("on")&&performance.now()-Z.swiped<450&&v.contains(e.target)){e.stopPropagation();e.preventDefault()}},true);
 document.addEventListener("keydown",e=>{if(!v.classList.contains("on"))return;if(e.key==="ArrowRight")zoomGo(1);else if(e.key==="ArrowLeft")zoomGo(-1)})}
/* binders: open zoom over the owned cards in the current binder view */
viewCard=function(n){const o=owned(B.s),l=slots().filter(c=>o[c.n]);const i=l.findIndex(c=>c.n===n);if(i<0)return;
 openZoom(l.map(c=>{const own=o[c.n];return zItem({id:B.s.dex+"-"+c.lid,name:own.name,rarity:own.rarity,x:c.x||own.x,imgs:B.s.game==="lor"?lorSrcs(B.s,c.lid,c.x||own.x):own.imgs,era:B.s.era,rev:B.s.game==="lor"&&!!own.rv},B.s,{n:own.n,lid:c.lid})}),i)};
/* pack summary: tap any card */
document.addEventListener("click",e=>{const c=e.target.closest&&e.target.closest("#summary .sgrid .card");if(!c)return;const cards=[...document.querySelectorAll("#summary .sgrid .card")],i=cards.indexOf(c);
 openZoom(current.map(x=>zItem(x,set)),i)});
/* history + collection: store the best pull per history line (parallel array, capped like hist) */
{const op=openPack;openPack=function(){const r=op.apply(this,arguments);try{const b=typeof bestOf==="function"?bestOf(current,set):current[current.length-1];store.histC=store.histC||[];store.histC.unshift({id:b.id,name:b.name,rarity:b.rarity,rev:!!b.rev,x:b.x,pat:b.pat});store.histC=store.histC.slice(0,(store.hist||[]).length);save()}catch(e){}return r}}
{const rd=render;render=function(){const r=rd.apply(this,arguments);const hc=store.histC||[];[...$("hist").children].forEach((d,i)=>{if(hc[i]&&setOfId(hc[i].id))d.dataset.h=i});
  [...$("coll").children].forEach((d,i)=>{d.dataset.k=i});return r}}
$("hist").addEventListener("click",e=>{const d=e.target.closest("[data-h]");if(!d)return;const hc=store.histC||[];const L=[],idx=[];hc.forEach((h,i)=>{const s=setOfId(h.id);if(!s)return;
 const k=keyOf(h.id),o=(store.sets[k[0]]||{})[k[1]];idx.push(i);L.push(zItem({...h,imgs:s.game==="lor"?lorSrcs(s,h.id.split("-").pop(),h.x):((store.coll[h.id]||{}).imgs||cardSrcs(s,h.id.split("-").pop())),era:s.era},s,{n:o&&o.n}))});
 openZoom(L,idx.indexOf(+d.dataset.h))});
$("coll").addEventListener("click",e=>{const d=e.target.closest("[data-k]");if(!d)return;const ks=Object.keys(store.coll).sort((a,b)=>store.coll[b].t-store.coll[a].t);
 openZoom(ks.map(k=>{const c=store.coll[k],s=setOfId(k);return zItem({id:k,name:c.name,rarity:c.rarity,imgs:c.imgs,x:c.x,era:s&&s.era},s,{n:c.n})}).filter(it=>it.s),+d.dataset.k)});
