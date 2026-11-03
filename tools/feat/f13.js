
/* Chase lists: per set, the top cards by market price (fallback rarity) with owned state and per-card pull odds.
   Binder: "★ Chase" filter tab. Set page: "★ Chase" button -> bottom sheet. Tap a row -> zoom. */
const CHO={};const CHMAX=15;
function chKey(r){r=String(r||"").toLowerCase();return /shiny ultra/.test(r)?"sur":/shiny rare/.test(r)?"sr":/futuristic/.test(r)?"fr":/rgb/.test(r)?"rgb":/classic collection/.test(r)?"cc":/ace spec/.test(r)?"ace":/special illustration/.test(r)?"sir":/illustration/.test(r)?"ir":/hyper|black white|gold/.test(r)?"hr":/enchanted/.test(r)?"en":/iconic/.test(r)?"ic":/epic/.test(r)?"ep":/legendary/.test(r)?"l":/super rare/.test(r)?"sr":/secret/.test(r)?"sec":/ultra/.test(r)?"ur":/double/.test(r)?"dr":null}
function chCards(d){const seen=new Set(),out=[];Object.values(d.pools).flat().forEach(c=>{if(!c||!c.id||c.energy||seen.has(c.id))return;seen.add(c.id);out.push(c)});return out}
/* Monte Carlo the app's own pack builder (time-sliced, no jank) -> per-card probability per pack, grouped by rarity
   (cards of one rarity are drawn uniformly). Very rare groups with few simulated hits use the published rate from pullrates.json. */
function chOdds(s,d){if(CHO[s.dex])return CHO[s.dex];const cards=chCards(d),size={},ksize={};cards.forEach(c=>{const r=c.rarity||"";size[r]=(size[r]||0)+1;const k=chKey(r);if(k)ksize[k]=(ksize[k]||0)+1});
 const hits={},T=40000,BUD=650;let N=0,spent=0;
 return CHO[s.dex]=new Promise(res=>{const step=()=>{const t0=performance.now();
  while(N<T&&performance.now()-t0<8){const p=buildPack(s,d.pools);N++;const seen=new Set();for(const c of p){if(!c||c.energy||seen.has(c.id))continue;seen.add(c.id);const r=c.rarity||"";hits[r]=(hits[r]||0)+1}}
  spent+=performance.now()-t0;if(N<T&&spent<BUD)return setTimeout(step,0);
  const rates=(PR&&PR[s.dex]&&PR[s.dex].rates)||{},o={N,by:{}};
  for(const r of Object.keys(size)){const h=hits[r]||0,k=chKey(r),pub=k&&rates[k]>0&&ksize[k]?rates[k]/ksize[k]:0;
   o.by[r]=h>=25||!pub?{p:h/N/size[r],h,src:"sim"}:{p:pub,h,src:"rate"}}
  res(o)};setTimeout(step,0)})}
function chFmtOdds(p,N){if(!p)return `rarer than 1 in ${Math.round(N).toLocaleString("en-US")} packs`;const x=1/p;
 if(x<1.05)return "in almost every pack";if(x<10)return `≈1 in ${x.toFixed(1).replace(/\.0$/,"")} packs`;
 const e=Math.pow(10,Math.floor(Math.log10(x))-1);return `≈1 in ${(Math.round(x/e)*e).toLocaleString("en-US")} packs`}
function chThumb(c,s){const lid=c.id.slice(c.id.lastIndexOf("-")+1);const src=s.game==="lor"?lorSrcs(s,lid,c.x):(c.imgs&&c.imgs.length?c.imgs:cardSrcs(s,lid));
 return src.map(u=>String(u).replace(/\/high\.(webp|png|jpg)$/,"/low.$1").replace(/_hires\.png$/,".png"))}
function chPrice(c,s){try{const r=priceOf({...c,rev:false},s);return r&&r.v>0?r.v:r===null?null:undefined}catch(e){return null}}
function chRank(s,cards){const rk=c=>typeof rRank==="function"?rRank(c):(TIERS[c.tier]||0);
 return cards.map(c=>({c,v:chPrice(c,s),rk:rk(c)})).sort((a,b)=>(b.v||0)-(a.v||0)||b.rk-a.rk||String(a.c.id).localeCompare(String(b.c.id),void 0,{numeric:true}))}
async function chaseRows(s){const d=await getCards(s);if(typeof pxSnapLoad==="function")await Promise.race([pxSnapLoad(),new Promise(r=>setTimeout(r,4000))]);
 try{await Promise.race([pxSet(s),new Promise(r=>setTimeout(r,4000))])}catch(e){}
 return {d,rows:chRank(s,chCards(d)).slice(0,CHMAX)}}
function chRowHTML(x,i,s,odds){const c=x.c,[,n]=keyOf(c.id),o=owned(s)[n],lid=c.id.slice(c.id.lastIndexOf("-")+1),g=odds&&odds.by[c.rarity||""];
 return `<button class="chrow ${o?"own":"miss"}" data-i="${i}" aria-label="${esc(c.name)}"><span class="chrk">${i+1}</span><span class="chimg">${img(chThumb(c,s),c.name,c.rarity).replace("<img ",'<img loading="lazy" decoding="async" ')}</span>
 <span class="chmid"><b>${esc(c.name)}</b><small>#${esc(lid)} · ${esc(c.rarity||"")}</small><small class="chodds"${g?` data-p="${g.p}" data-src="${g.src}"`:""}>${odds?(g?chFmtOdds(g.p,odds.N):""):'<i class="chwait">odds…</i>'}</small></span>
 <span class="chend"><b class="chpx">${x.v?usd(x.v):x.v===undefined?"…":"—"}</b><span class="chown">${o?"Owned ×"+(o.n||1):"Missing"}</span></span></button>`}
function chRender(el,s,st){const o=owned(s),have=st.rows.filter(x=>o[keyOf(x.c.id)[1]]).length;
 el.innerHTML=`<div class="chhead"><span>Top ${st.rows.length} by market price</span><span>${have}/${st.rows.length} owned</span></div><div class="chlist">${st.rows.map((x,i)=>chRowHTML(x,i,s,st.odds)).join("")}</div><p class="chfoot">Odds are per pack for that exact card, from this simulator's pull rates${st.odds?` (${st.odds.N.toLocaleString("en-US")} simulated packs)`:""}. Prices: TCGplayer market.</p>`;
 el.querySelectorAll(".chrow").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;openZoom(st.rows.map(x=>{const r=owned(s)[keyOf(x.c.id)[1]];return zItem({...x.c,rev:false,imgs:s.game==="lor"?x.c.imgs:(x.c.imgs&&x.c.imgs.length?x.c.imgs:cardSrcs(s,x.c.id.split("-").pop()))},s,{n:r?r.n:0})}),i)});
 window.__chase={dex:s.dex,rows:st.rows.map(x=>({id:x.c.id,name:x.c.name,rarity:x.c.rarity,v:x.v,own:(o[keyOf(x.c.id)[1]]||{}).n||0})),odds:st.odds}}
async function chaseInto(el,s,live){el.innerHTML='<div class="chload">'+'<div class="chsk"></div>'.repeat(6)+'</div>';
 let st;try{st=await chaseRows(s)}catch(e){el.innerHTML='<p class="chfoot">Couldn\'t load this set. Check your connection.</p>';return}
 if(!live())return;chRender(el,s,st);
 chOdds(s,st.d).then(od=>{st.odds=od;if(live())chRender(el,s,st)});
 /* live prices for top candidates without one (TCGdex per card), then re-rank once */
 const all=chRank(s,chCards(st.d)),cut=st.rows.length?st.rows[st.rows.length-1]:null,need=all.filter(x=>x.v===undefined&&(!cut||x.rk>=cut.rk)).slice(0,20);
 if(!need.length||typeof priceFor!=="function")return;let q=need.slice();
 await Promise.all([0,1,2,3].map(async()=>{while(q.length&&live()){const x=q.shift();try{await Promise.race([priceFor({...x.c,rev:false},s),new Promise(r=>setTimeout(r,6000))])}catch(e){}}}));
 if(!live())return;const nr=chRank(s,chCards(st.d)).slice(0,CHMAX);if(nr.map(x=>x.c.id+x.v).join()!==st.rows.map(x=>x.c.id+x.v).join()){st.rows=nr;chRender(el,s,st)}}
/* binder tab */
(function(){const f=document.querySelector(".bfilt");if(!f)return;const b=document.createElement("button");b.dataset.f="chase";b.className="ghost";b.textContent="★ Chase";f.appendChild(b);
 b.onclick=()=>{B.filter="chase";document.querySelectorAll(".bfilt button").forEach(x=>x.classList.toggle("on",x===b));renderBook()};
 let p=document.createElement("div");p.id="bchase";$("vBinder").appendChild(p);
 const rb=renderBook;let tok=0;renderBook=function(){const ch=B&&B.filter==="chase";$("vBinder").classList.toggle("chasing",!!ch);
  if(!ch){p.innerHTML="";return rb.apply(this,arguments)}const my=++tok,s=B.s;chaseInto(p,s,()=>my===tok&&B.s===s&&B.filter==="chase"&&$("vBinder").classList.contains("on"))};
 const sl=slots;slots=function(){if(B&&B.filter==="chase"){const f=B.filter;B.filter="all";try{return sl.apply(this,arguments)}finally{B.filter=f}}return sl.apply(this,arguments)}})();
/* set page sheet */
(function(){const sb=$("sbox");if(!sb)return;const b=document.createElement("button");b.id="schase";b.className="ghost";b.setAttribute("aria-label","Chase cards in this set");b.title="Chase cards";b.innerHTML='★<span class="chlbl"> Chase</span>';sb.parentNode.insertBefore(b,sb);
 const w=document.createElement("div");w.id="chsheet";w.innerHTML='<div class="chback"></div><div class="chpanel" role="dialog" aria-label="Chase cards"><div class="chgrab"><i></i></div><div class="chtop"><b id="chtitle">Chase cards</b><button id="chx" class="ghost" aria-label="Close">✕</button></div><div id="chbody"></div></div>';document.body.appendChild(w);
 let tok=0;const close=()=>{tok++;w.classList.remove("on")};window.chaseClose=close;
 window.chaseOpen=s=>{s=s||set;if(!s)return;const my=++tok;$("chtitle").textContent="★ Chase · "+s.name;w.classList.add("on");const pn=w.querySelector(".chpanel");pn.style.transform="";$("chbody").scrollTop=0;chaseInto($("chbody"),s,()=>my===tok&&w.classList.contains("on"))};
 b.onclick=()=>chaseOpen(set);w.querySelector(".chback").onclick=close;$("chx").onclick=close;
 addEventListener("keydown",e=>{if(e.key==="Escape"&&w.classList.contains("on")&&!$("viewer").classList.contains("on"))close()});
 /* swipe down to dismiss (from the grab bar / header, or the list when scrolled to top) */
 const pn=w.querySelector(".chpanel");let y0=null,dy=0;
 pn.addEventListener("touchstart",e=>{const top=e.target.closest(".chgrab,.chtop")||$("chbody").scrollTop<=0;y0=top?e.touches[0].clientY:null;dy=0},{passive:true});
 pn.addEventListener("touchmove",e=>{if(y0===null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>4){pn.style.transition="none";pn.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault()}},{passive:false});
 pn.addEventListener("touchend",()=>{if(y0===null)return;pn.style.transition="";if(dy>90)close();else pn.style.transform="";y0=null},{passive:true});
 const sh=show;show=function(v){if(w.classList.contains("on"))close();return sh.apply(this,arguments)}})();
