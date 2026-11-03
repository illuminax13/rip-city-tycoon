/* ---------- F4: booster boxes ---------- */
const BOXP={"sv03.5":[["Booster Bundle",6],["Elite Trainer Box",9]],"sv04.5":[["Booster Bundle",6],["Elite Trainer Box",9]],"sv08.5":[["Booster Bundle",6],["Elite Trainer Box",9]],
 "sv10.5b":[["Booster Bundle",6],["Elite Trainer Box",9]],"sv10.5w":[["Booster Bundle",6],["Elite Trainer Box",9]],"swsh12.5":[["Elite Trainer Box",10]],"cel25":[["Elite Trainer Box",10]],"me02.5":[],"30th":[]};
function boxProducts(s){if(s.game==="lor")return [{name:"Booster Box",n:24,real:1}];const p=BOXP[s.dex];if(!p)return [{name:"Booster Box",n:36,real:1}];
 return [...p.map(([name,n])=>({name,n,real:1})),{name:"Virtual box",n:36,real:0}]}
let BOX=null;const BXT=t=>TIERS[t]||0;
function newBox(s,prod){const d=cache[s.dex];if(!d)return null;const packs=Array.from({length:prod.n},()=>buildPack(s,d.pools));
 BOX={s,prod,packs,done:packs.map(()=>0),res:[],gen:0,showAll:BOX?BOX.showAll:false,t0:0,fast:0,wrap:0,lid:0};if(typeof boxSave==="function")boxSave();return BOX}
function boxLeft(){return BOX?BOX.done.filter(x=>!x).length:0}
function boxRecord(s,p){store.packs++;const best=typeof bestOf==="function"?bestOf(p,s):p[p.length-1];if(p.god){store.god=(store.god||0)+1;store.godBy=store.godBy||{};store.godBy[s.dex]=(store.godBy[s.dex]||0)+1}
 store.hist.unshift(`${p.god?(p.god.kind==="demi"?"👑DEMI ":"👑GOD "):""}#${store.packs} ${s.name} 📦: best pull ${best.name} (${best.rarity})`);store.hist=store.hist.slice(0,100);
 store.histC=store.histC||[];store.histC.unshift({id:best.id,name:best.name,rarity:best.rarity,rev:!!best.rev,x:best.x,pat:best.pat});store.histC=store.histC.slice(0,store.hist.length);
 p.forEach(c=>{const [d,n]=keyOf(c.id);const ss=store.sets[d]=store.sets[d]||{};ss[n]=ss[n]||{name:c.name,rarity:c.rarity,imgs:c.imgs,n:0};ss[n].imgs=c.imgs;if(c.x)ss[n].x=c.x;ss[n].lid=c.id.slice(c.id.lastIndexOf("-")+1);ss[n].n++;if(c.rev)ss[n].rv=(ss[n].rv||0)+1;
  store.coll[c.id]=store.coll[c.id]||{name:c.name,rarity:c.rarity,imgs:c.imgs,n:0,t:TIERS[c.tier]};if(c.x)store.coll[c.id].x=c.x;store.coll[c.id].imgs=c.imgs;store.coll[c.id].n++})}
const bxImg=c=>(c.imgs&&c.imgs[0])||"";
function bxThumb(c,k,j,cap){return `<${cap?"button":"div"} class="bxt t${BXT(c.tier)}"${j!=null?` data-j="${j}"`:""}>${img(c.imgs,c.name,c.rarity).replace("<img ",`<img decoding="async" loading="${cap?"lazy":"eager"}" `)}${cap?`<span class="cap">${esc(c.name)}<em>${esc(c.rarity)}${c.rev&&(c.era||BOX.s.era)!=="lor"?" · Reverse":c.rev?" · Foil":""}${k!=null?` · pack ${k+1}`:""}</em><span class="pr" data-pj="${j}"></span></span>`:""}</${cap?"button":"div"}>`}
function boxShell(){let v=$("boxv");if(v)return v;v=document.createElement("div");v.id="boxv";v.setAttribute("role","dialog");v.setAttribute("aria-label","Booster box");
 v.innerHTML=`<div class="bxtop"><button id="bxback" class="ghost">← Back</button><div class="bxttl"></div><div class="bxprog"></div></div><div class="bxbody"></div>`;document.body.appendChild(v);
 $("bxback").onclick=()=>{if(BOX&&BOX.fly){BOX.gen++;BOX.fly=0;boxSummary();return}v.classList.remove("on")};return v}
function boxHead(){const v=boxShell(),B=BOX;v.querySelector(".bxttl").innerHTML=`${esc(B.s.name)}<small>${esc(B.prod.name)} · ${B.prod.n} packs${B.prod.real?"":" — virtual (no real booster box for this set)"}</small>`;
 v.querySelector(".bxprog").innerHTML=`<b>${B.prod.n-boxLeft()}</b> / ${B.prod.n} opened`}
async function openBox(s){s=s||set;if(!s)return;const v=boxShell();v.classList.add("on");v.querySelector(".bxbody").innerHTML=`<p class="bxnote">Loading ${esc(s.name)}…</p>`;
 try{await getCards(s)}catch(e){v.querySelector(".bxbody").innerHTML=`<p class="bxnote">Couldn't load cards. Check your connection.</p>`;return}
 if((!BOX||BOX.s!==s)&&typeof boxRestore==="function")boxRestore(s);if(!BOX||BOX.s!==s||!boxLeft()&&!BOX.res.length)newBox(s,boxProducts(s)[0]);if(BOX.res.length&&!boxLeft()&&!BOX.fly)return boxSummary();boxIntro()}
function boxIntro(){const B=BOX,v=boxShell(),prods=boxProducts(B.s),left=boxLeft(),started=left<B.prod.n||B.wrap;boxHead();
 v.querySelector(".bxbody").innerHTML=(prods.length>1&&!started?`<div class="bxprods">${prods.map((p,i)=>`<button data-p="${i}" class="${p.name===B.prod.name?"sel":""}">${esc(p.name)} · ${p.n} packs<small>${p.real?"Real product":"Virtual box — not a real product"}</small></button>`).join("")}</div>`:"")+
 `<div id="bx3d" class="bx3d"></div>
 <div class="bxact"><button id="bxall"${B.lid?"":" disabled"}>⚡ Open All (${left})</button>${left<B.prod.n?`<button id="bxsumb" class="ghost">Box summary</button>`:""}</div>
 <div class="bxfine"><label class="bxchk"><input type="checkbox" id="bxshowall"${B.showAll?" checked":""}> Show all cards while opening</label>
 <p class="bxnote">Every pack is generated independently with the set's normal per-pack pull rates${B.s.game==="lor"?" (Lorcana boxes have no box-level guarantees)":" (no box-level guarantees)"}. All cards go to your collection.</p></div>`;
 v.querySelectorAll(".bxprods button").forEach(b=>b.onclick=()=>{if(B.prod.n-boxLeft()||B.wrap)return;newBox(B.s,prods[+b.dataset.p]);boxIntro()});
 $("bxall").onclick=()=>typeof box3dOpenAll==="function"?box3dOpenAll():boxFast();$("bxshowall").onchange=e=>{BOX.showAll=e.target.checked};const sb=$("bxsumb");if(sb)sb.onclick=boxSummary;
 if(typeof box3dBuild==="function")box3dBuild(B,$("bx3d"))}
function boxOne(kk){const B=BOX;if(!B)return;const k=typeof kk==="number"&&!B.done[kk]?kk:B.done.indexOf(0);if(k<0)return boxSummary();$("boxv").classList.remove("on");
 chooseSet(B.s).then(()=>{if(BOX!==B||B.done[k]||set!==B.s)return;NEXT={s:B.s,p:B.packs[k],box:k};
  /* pulled straight from the box: skip the wheel and go to the normal tear */if(state==="idle"||state==="landed"){const i=Math.round(pos/PW),pk=$("strip").children[i];state="opening";$("whint").classList.add("off");pk&&pk.classList.remove("landed");tearPack(packArts[i%4],i)}})}
{const op=openPack;openPack=function(){const nx=NEXT,B=BOX,k=nx&&nx.s===set&&nx.box!=null&&B&&B.packs[nx.box]===nx.p?nx.box:null;const r=op.apply(this,arguments);
 if(k!=null){B.done[k]=1;B.res[k]=current;current.boxK=k;if(typeof boxSave==="function")boxSave()}return r}}
{const ss=showSummary;showSummary=function(){const r=ss.apply(this,arguments);try{const a=$("again"),B=BOX;if(!a)return r;
 if(current.boxK!=null&&B&&B.res[current.boxK]===current){const left=boxLeft();a.id="tobox";if(left){a.textContent=`📦 Back to box (${left} left)`;a.onclick=()=>{boxShell().classList.add("on");boxIntro()}}else{a.textContent="📦 Box summary";a.onclick=()=>{boxShell().classList.add("on");boxSummary()}}}
 else{const b=document.createElement("button");b.className="ghost";b.id="tobox";b.textContent=`📦 Open ${boxProducts(set)[0].name}`;b.style.marginLeft="10px";b.onclick=()=>openBox(set);a.after(b)}}catch(e){}return r}}
function boxFast(){const B=BOX,s=B.s;if(B.fly)return;B.t0=performance.now();const ks=[];B.done.forEach((d,k)=>{if(!d)ks.push(k)});
 ks.forEach(k=>{const p=B.packs[k];boxRecord(s,p);B.done[k]=1;B.res[k]=p});save();if(typeof boxSave==="function")boxSave();scheduleRender();boxHead();
 const hitsOf=p=>p.filter(c=>BXT(c.tier)>=3);ks.forEach(k=>hitsOf(B.packs[k]).forEach(c=>{const u=bxImg(c);if(u){const im=new Image();im.referrerPolicy="no-referrer";im.decoding="async";im.src=u}}));
 const v=$("boxv");v.scrollTop=0;v.querySelector(".bxbody").innerHTML=`<div class="bxfly"><div class="bxact"><button id="bxskip" class="ghost">Skip to summary ▸▸</button></div><div class="bxmeter"><i></i></div><div class="bxpk"></div><div class="bxrow${B.showAll?" all":""}"></div></div>`;
 const pk=v.querySelector(".bxpk"),row=v.querySelector(".bxrow"),mt=v.querySelector(".bxmeter i");let i=0,nh=0;const gen=++B.gen;B.fly=1;
 $("bxskip").onclick=()=>{B.gen++;B.fly=0;boxSummary()};
 const step=()=>{if(gen!==B.gen||BOX!==B)return;if(i>=ks.length){B.fly=0;B.fast=performance.now()-B.t0;return boxSummary()}const k=ks[i++],p=B.packs[k],h=hitsOf(p),show=B.showAll?p:h;nh+=h.length;
  mt.style.width=(i/ks.length*100)+"%";const pg=$("boxv").querySelector(".bxprog");if(pg)pg.innerHTML=`<b>${B.prod.n-ks.length+i}</b> / ${B.prod.n} opened`;pk.innerHTML=`Pack <b>${k+1}</b> / ${B.prod.n}${p.god?` — <b>👑 ${p.god.kind==="demi"?"DEMI-GOD":"GOD"} PACK!</b>`:""} · hits so far <b>${nh}</b>`;
  row.innerHTML=show.length?show.map(c=>B.showAll?bxThumb(c):bxThumb(c).replace(/<\/div>$/,`<span class="cap">${esc(c.name)}<em>${esc(c.rarity)}</em></span></div>`)).join(""):`<p class="bxnote">no hits</p>`;
  const top=h.reduce((m,c)=>Math.max(m,BXT(c.tier)),0);try{if(p.god){sfx.fanfare();haptic([30,60,30,60,80])}else if(top>=6&&s.game==="lor"){sfx.fanfare();haptic([30,60,80])}else if(top>=3){sfx.chime(top);if(top>=5)haptic([15,30])}}catch(e){}
  setTimeout(step,p.god?1100:h.length?(B.showAll?420:340):(B.showAll?200:60))};step()}
function boxSummary(){const B=BOX,v=boxShell(),s=B.s;boxHead();const all=[];B.res.forEach((p,k)=>p&&p.forEach(c=>all.push({c,k})));
 const cmp=typeof bestCmp==="function"?bestCmp(s):((a,b)=>BXT(b.tier)-BXT(a.tier));const hits=all.filter(x=>BXT(x.c.tier)>=3).sort((a,b)=>cmp(a.c,b.c)||a.k-b.k);
 const best=hits[0]||all.slice().sort((a,b)=>cmp(a.c,b.c))[0];const counts={};all.forEach(({c})=>{const r=c.rarity+(c.rev&&s.game==="lor"?" (Foil)":"");(counts[r]=counts[r]||{n:0,t:BXT(c.tier)}).n++});
 const gods=[];B.res.forEach((p,k)=>{if(p&&p.god)gods.push(`👑 ${p.god.kind==="demi"?"DEMI-GOD":"GOD"} PACK — pack #${k+1}`)});const opened=B.res.filter(Boolean).length;
 B.hitList=hits;B.allList=all;B.best=best;
 v.querySelector(".bxbody").innerHTML=`<div class="bxsum">${gods.map(g=>`<div class="bxgod">${g}</div>`).join("")}
  <div class="bxstats" style="margin-top:12px"><div><b>${opened}</b><span>packs opened</span></div><div><b>${all.length}</b><span>cards</span></div><div><b>${hits.length}</b><span>hits (holo+)</span></div><div><b id="bxval">…</b><span id="bxvaln">box value</span></div></div>
  ${best?`<h3>Best pull</h3><div class="bxbest"><div class="bbc"></div><div class="bbi"><b>${esc(best.c.name)}</b><br>${esc(best.c.rarity)}${best.c.rev?(s.game==="lor"?" · Foil":" · Reverse holo"):""}<br>Pack #${best.k+1}<br><span class="pr" id="bxbestp"></span></div></div>`:""}
  <h3>Rarity counts</h3><table class="bxtab">${Object.entries(counts).sort((a,b)=>b[1].t-a[1].t||b[1].n-a[1].n).map(([r,o])=>`<tr><td>${esc(r)}</td><td>${o.n}</td></tr>`).join("")}</table>
  <h3>Hits (${hits.length})</h3><div class="bxgrid" id="bxhits">${hits.map((x,j)=>bxThumb(x.c,x.k,j,1)).join("")||`<p class="bxnote">No hits this time.</p>`}</div>
  ${B.showAll?`<h3>All cards (${all.length})</h3><div class="bxgrid all" id="bxallg">${all.map((x,j)=>bxThumb(x.c,x.k,"a"+j,1)).join("")}</div>`:`<p class="bxnote"><a href="#" id="bxshowallnow">Show all ${all.length} cards</a></p>`}
  <div class="sbtn2">${boxLeft()?`<button id="bxcont">Keep opening (${boxLeft()} left)</button>`:`<button id="bxagain">Open another ${esc(B.prod.name)}</button>`}<button id="bxdone" class="ghost">Back to ${esc(s.name)}</button></div></div>`;
 if(best){const bb=v.querySelector(".bbc");bb.innerHTML=`<button class="bxt bbimg t${BXT(best.c.tier)}" aria-label="Zoom best pull">${img(best.c.imgs,best.c.name,best.c.rarity).replace("<img ",'<img decoding="async" ')}</button>`;bb.firstChild.onclick=()=>openZoom([zItem((B.best||best).c,s)],0)}
 v.querySelector(".bxsum").addEventListener("click",e=>{const t=e.target.closest(".bxt[data-j]");if(!t)return;const j=t.dataset.j;if(j[0]==="a")openZoom(all.map(x=>zItem(x.c,s)),+j.slice(1));else openZoom(B.hitList.map(x=>zItem(x.c,s)),+j)});
 const sa=$("bxshowallnow");if(sa)sa.onclick=e=>{e.preventDefault();B.showAll=true;boxSummary()};
 const bc=$("bxcont");if(bc)bc.onclick=boxIntro;const ba=$("bxagain");if(ba)ba.onclick=()=>{newBox(s,B.prod);boxIntro()};$("bxdone").onclick=()=>{v.classList.remove("on");if(set!==s||!$("vWheel").classList.contains("on"))chooseSet(s)};
 if(typeof boxPrices==="function")boxPrices(B,all,hits,best);else{$("bxval").textContent="—";$("bxvaln").textContent="box value (prices loading in a later update)"}
 if(best){try{const t=BXT(best.c.tier);if(B.fast&&t>=3)setTimeout(()=>sfx.chime(t),200)}catch(e){}}B.fast=0}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("boxv")&&$("boxv").classList.contains("on")&&!$("viewer").classList.contains("on"))$("bxback").click()});
