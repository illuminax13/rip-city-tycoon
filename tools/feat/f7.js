/* ---------- F7: value-aware best pull + interactive 3D booster box ---------- */
function rRank(c){const r=String(c.rarity||"").toLowerCase();
 if(/mega hyper/.test(r))return 100;if(/iconic/.test(r))return 97;if(/enchanted/.test(r))return 95;
 if(/hyper|gold|secret|rainbow|black white/.test(r))return 92;
 if(/special illustration|futuristic|rgb|gallery v/.test(r))return 85;
 if(/epic/.test(r))return 78;if(/shiny ultra/.test(r))return 62;
 if(/ultra|vmax|vstar|\bgx\b|\bex\b|holo v\b|rare v\b|lv\.x|prime|legend/.test(r)&&!/legendary/.test(r))return 72;
 if(/legendary/.test(r))return 70;if(/illustration/.test(r))return 65;
 if(/radiant|amazing|ace spec|shiny|star/.test(r))return 58;if(/double/.test(r))return 55;
 if(/super rare/.test(r))return 40;if(/holo/.test(r))return 35;
 return (TIERS[c.tier||tier(c.rarity)]||0)*8+(c.rev?1:0)}
function bestCmp(s){const pv=c=>{try{const r=typeof priceOf==="function"?priceOf(c,s):null;return r&&r.v>0?r.v:null}catch(e){return null}};
 /* transitive: priced cards by market price (rarity breaks ties); cards without a price yet fall back to rarity rank after them */
 return (a,b)=>{const pa=pv(a),pb=pv(b);if(pa!=null&&pb!=null){const d=Math.round(pb*100)-Math.round(pa*100);return d||rRank(b)-rRank(a)}if(pa!=null||pb!=null)return pa!=null?-1:1;return rRank(b)-rRank(a)}}
function bestOf(list,s){return list&&list.length?list.slice().sort(bestCmp(s))[0]:null}
/* box summary: re-rank hits + best pull when prices arrive */
function bxResort(B){if(!B||!B.hitList||!$("bxhits"))return;const s=B.s,cmp=bestCmp(s),sig=l=>l.map(x=>x.k+":"+x.c.id+(x.c.rev?"r":"")).join();
 const nh=B.hitList.slice().sort((a,b)=>cmp(a.c,b.c)||a.k-b.k);
 if(sig(nh)!==sig(B.hitList)){B.hitList=nh;$("bxhits").innerHTML=nh.map((x,j)=>bxThumb(x.c,x.k,j,1)).join("")}
 const pool=nh.length?nh:(B.allList||[]),best=pool.length?pool.slice().sort((a,b)=>cmp(a.c,b.c)||a.k-b.k)[0]:null;
 if(best&&B.best&&best.c!==B.best.c){B.best=best;const bb=document.querySelector("#boxv .bbc"),bi=document.querySelector("#boxv .bbi");
  if(bb){bb.innerHTML=`<button class="bxt bbimg t${BXT(best.c.tier)}" aria-label="Zoom best pull">${img(best.c.imgs,best.c.name,best.c.rarity).replace("<img ",'<img decoding="async" ')}</button>`;bb.firstChild.onclick=()=>openZoom([zItem(B.best.c,s)],0)}
  if(bi)bi.innerHTML=`<b>${esc(best.c.name)}</b><br>${esc(best.c.rarity)}${best.c.rev?(s.game==="lor"?" · Foil":" · Reverse holo"):""}<br>Pack #${best.k+1}<br><span class="pr" id="bxbestp"></span>`}}
/* persistence: resume a half-opened box */
const BXK="ppsBox";
function boxSave(){const B=BOX;if(!B)return;try{let m={};try{m=JSON.parse(localStorage.getItem(BXK)||"{}")||{}}catch(e){}
 if(!B.done.includes(0)){delete m[B.s.dex]}else{const strip=c=>{const o={...c};delete o.imgs;return o};
  m[B.s.dex]={t:Date.now(),prod:B.prod,wrap:B.wrap?1:0,lid:B.lid?1:0,done:B.done,packs:B.packs.map(p=>({c:p.map(strip),g:p.god||null}))}}
 Object.keys(m).sort((a,b)=>m[b].t-m[a].t).slice(3).forEach(k=>delete m[k]);localStorage.setItem(BXK,JSON.stringify(m))}catch(e){}}
function boxRestore(s){let m;try{m=(JSON.parse(localStorage.getItem(BXK)||"{}")||{})[s.dex]}catch(e){}const d=cache[s.dex];if(!m||!m.packs||!d||!m.done.includes(0))return false;
 try{const by={};Object.values(d.pools||{}).forEach(l=>Array.isArray(l)&&l.forEach(c=>{if(c&&c.id)by[c.id]=c}));
  const hyd=c=>({...c,imgs:(by[c.id]&&by[c.id].imgs)||[]});const packs=m.packs.map(p=>{const a=p.c.map(hyd);if(p.g)a.god=p.g;return a});
  BOX={s,prod:m.prod,packs,done:m.done.slice(),res:packs.map((p,k)=>m.done[k]?p:undefined),gen:0,showAll:BOX?BOX.showAll:false,t0:0,fast:0,wrap:m.wrap,lid:m.lid};return true}catch(e){return false}}
/* ---- 3D box ---- */
const BX3={};
/* small 240px pack-art thumbnails (assets/packs/<dex>/t/) for box faces + in-box packs; full art is the fallback */
function bxT(u){return u&&/\.webp$/.test(u)?u.replace(/\/([^/]+\.webp)$/,"/t/$1"):u}
function bxPkImg(u,cls,extra=""){const t=bxT(u);return `<img${cls?` class="${cls}"`:""} src="${t}"${t!==u?` onerror="this.onerror=null;this.src='${u}'"`:""} alt="" draggable="false" decoding="async"${extra}>`}
function bxPreload(s){try{const L=logoSrcs(s);[...(PACKART[s.dex]||[]).slice(0,4).map(bxT),...(Array.isArray(L)?L.slice(0,1):[])].forEach(u=>{const i=new Image();i.decoding="async";i.src=u})}catch(e){}}
function bxShape(B){const n=B.prod.name||"";return /elite/i.test(n)?"etb":/bundle/i.test(n)?"bundle":"box"}
/* 2.5D box: every face/pack is a flat sibling element placed with a 2D affine matrix() computed from a JS orthographic
   projection (no preserve-3d / perspective / backface-visibility), so iOS Safari and engines that flatten 3D render it identically.
   Hidden faces are culled in JS; paint order is explicit z-index groups. */
function box3dBuild(B,host){if(!host)return;const s=B.s,shape=bxShape(B),arts=(PACKART[s.dex]||[]),art=i=>arts.length?arts[i%arts.length]:"",lor=s.game==="lor";
 const [W,D,H,LH]={box:[300,200,150,44],etb:[220,124,206,68],bundle:[150,66,214,26]}[shape],W2=W+6,D2=D+6;
 const logo=img(logoSrcs(s),s.name,"").replace("<img ",'<img decoding="async" draggable="false" class="bxlogo" ');
 const label=esc(`${B.prod.real?B.prod.name:"Virtual booster box"} · ${B.prod.n} packs`),brand=lor?"Disney Lorcana":"Pokémon TCG";
 const fans=`<div class="bxart">${[0,1,2].map(i=>bxPkImg(art(i))).join("")}</div>`,wr=`<i class="wr"></i>`;
 const hx=-H/2-1,hz=-D2/2+(D2-D)/2-3;   // lid hinge (back-top edge)
 /* face specs: [class, w, h, O, U, V, group, html, lid?]  (object space: x right, y down, z toward viewer; normal = U×V) */
 const FS=[
  ["in",W,H,[-W/2,-H/2,-D/2+1],[W,0,0],[0,H,0],2],
  ["in",D,H,[-W/2+1,-H/2,D/2],[0,0,-D],[0,H,0],2],
  ["in",D,H,[W/2-1,-H/2,-D/2],[0,0,D],[0,H,0],2],
  ["in ib",W,D,[-W/2,H/2-1,-D/2],[W,0,0],[0,0,D],2],
  ["o fr",W,H,[-W/2,-H/2,D/2],[W,0,0],[0,H,0],6,`${fans}<div class="bxlbl">${label}</div>${wr}<i class="strip"></i>`],
  ["o bk",W,H,[W/2,-H/2,-D/2],[-W,0,0],[0,H,0],6,`<div class="bxvt">${brand}</div>${wr}`],
  ["o sd",D,H,[-W/2,-H/2,-D/2],[0,0,D],[0,H,0],6,`<div class="bxvt">${esc(s.name)}</div>${wr}`],
  ["o sd",D,H,[W/2,-H/2,D/2],[0,0,-D],[0,H,0],6,`<div class="bxvt">${brand}</div>${wr}`],
  ["bt",W,D,[-W/2,H/2,D/2],[W,0,0],[0,0,-D],6],
  ["o lt",W2,D2,[-W2/2,0,0],[W2,0,0],[0,0,D2],8,`${shape==="box"?fans:""}${logo}${wr}`,1],
  ["lu",W2,D2,[-W2/2,1,D2],[W2,0,0],[0,0,-D2],8,"",1],
  ["o lf",W2,LH,[-W2/2,0,D2],[W2,0,0],[0,LH,0],8,`<div class="bxvt">${shape==="box"?esc(s.name):brand}</div>${wr}<i class="strip"></i>`,1],
  ["o lb",W2,LH,[W2/2,0,0],[-W2,0,0],[0,LH,0],8,"",1],
  ["o ls",D2,LH,[-W2/2,0,0],[0,0,D2],[0,LH,0],8,wr,1],
  ["o ls",D2,LH,[W2/2,0,D2],[0,0,-D2],[0,LH,0],8,wr,1]];
 host.className="bx3d "+shape+(B.wrap?" torn":"")+(B.lid?" open":"");host.style.cssText=`--c0:${s.colors[0]};--c1:${s.colors[1]||s.colors[0]}`;
 host.innerHTML=`<div class="bxscene" aria-label="Sealed ${label}. Swipe across to tear the wrap, then swipe up to open the lid."><div class="bxshadow"></div><div class="bxfloat"><div class="bxobj">${FS.map((f,i)=>`<div class="f ${f[0]}" data-f="${i}" style="width:${f[1]}px;height:${f[2]}px">${f[7]||""}</div>`).join("")}</div></div><div class="bxfx"></div></div><div class="bxleftn"></div><div class="bxpips" aria-hidden="true"></div><p class="bxhint"></p>`;
 const sc=host.querySelector(".bxscene"),obj=host.querySelector(".bxobj");
 const X=Object.assign(BX3,{wrs:[...host.querySelectorAll(".wr,.strip")],sh:null,B,host,sc,obj,lid:obj,W,D,H,LH,D2,shape,art,drx:0,dry:0,tp:0,ang:B.lid?112:0,packs:0,pk:[],lift:{},tw:0,
  faces:FS.map((f,i)=>({e:obj.querySelector(`[data-f="${i}"]`),w:f[1],h:f[2],O:f[3],U:f[4],V:f[5],g:f[6],l:!!f[8],v:null,z:null}))});
 X.fit=()=>{const w=sc.clientWidth||340,h=sc.clientHeight||340;X.k=Math.min(1.25,(w-24)/(Math.max(W,D)*1.2),h/((H+LH)*1.75+(shape==="box"?D*.5:D*.2)));host.style.setProperty("--k",X.k.toFixed(3));X.apply()};
 X.base=()=>B.lid?[-52,-8]:[-20,-24];
 X.lidT=a=>{X.ang=a;X.apply()};X.vis=()=>{};
 X.apply=()=>{const [bx,by]=X.base(),g=(typeof GY!=="undefined"&&GY.st==="on")?[GY.y*9,GY.x*14]:[0,0],rx=Math.max(-62,Math.min(8,bx+X.drx+g[0])),ry=by+X.dry+g[1],r=Math.PI/180;
  const cx=Math.cos(rx*r),sx=Math.sin(rx*r),cy=Math.cos(ry*r),sy=Math.sin(ry*r),cl=Math.cos(X.ang*r),sl=Math.sin(X.ang*r),k=(X.k||1)*(B.lid?.88:1),oy=(H*.18+(B.lid?H*.42:0))*(X.k||1);
  const rot=p=>{const x1=cy*p[0]+sy*p[2],z1=-sy*p[0]+cy*p[2];return [x1,cx*p[1]-sx*z1,sx*p[1]+cx*z1]};       // CSS rotateX(rx) rotateY(ry)
  const lidv=p=>[p[0],cl*p[1]-sl*p[2],sl*p[1]+cl*p[2]],lidp=p=>{const q=lidv(p);return [q[0],q[1]+hx,q[2]+hz]};
  const M=(O,U,V,w,h)=>{const o=rot(O),u=rot(U),v=rot(V);return [`matrix(${(u[0]*k/w).toFixed(4)},${(u[1]*k/w).toFixed(4)},${(v[0]*k/h).toFixed(4)},${(v[1]*k/h).toFixed(4)},${(o[0]*k).toFixed(2)},${(o[1]*k+oy).toFixed(2)})`,u[0]*v[1]-u[1]*v[0]]};
  const behind=X.ang>90;
  for(const f of X.faces){const [O,U,V]=f.l?[lidp(f.O),lidv(f.U),lidv(f.V)]:[f.O,f.U,f.V],[m,nz]=M(O,U,V,f.w,f.h),vis=nz>.5;   // nz = screen-space orientation (front-facing when > 0)
   if(vis!==f.v){f.v=vis;f.e.style.visibility=vis?"":"hidden"}if(vis)f.e.style.transform=m;const z=f.l?(behind?1:8):f.g;if(z!==f.z){f.z=z;f.e.style.zIndex=z}}
  for(const p of X.pk){if(!p.e.isConnected)continue;const L=X.lift[p.k]||0,o=[p.O[0],p.O[1]-L*X.H*1.2,p.O[2]+L*30];p.e.style.transform=M(o,p.U,p.V,p.w,p.h)[0]}
  const sh=Math.round((50+ry*1.4)/3)*3;if(sh!==X.sh&&!B.wrap){X.sh=sh;X.wrs.forEach(w=>{if(w.className==="wr")w.style.backgroundPosition=`${sh}% 0,0 0`})}};
 /* JS tween (no CSS transitions on matrices): eases drag offsets back and the lid to its target */
 X.live=on=>{clearTimeout(X.lt);if(on)obj.classList.add("live");else X.lt=setTimeout(()=>obj.classList.remove("live"),400)};
 X.tween=(to,ms=550)=>{X.live(1);const f0={drx:X.drx,dry:X.dry,ang:X.ang},t0=performance.now(),id=++X.tw;const st=t=>{if(id!==X.tw||!X.host.isConnected)return;const q=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-q,3);
  for(const n in to)X[n]=f0[n]+(to[n]-f0[n])*e;X.apply();if(q<1)requestAnimationFrame(st);else X.live(0)};requestAnimationFrame(st)};
 if(B.lid||B.wrap)bxPacks(X);bxStatus(X);X.fit();requestAnimationFrame(X.fit);bxGestures(X)}
function bxFaces(){}
function bxStatus(X){const B=X.B,left=boxLeft(),n=B.prod.n,h=X.host.querySelector(".bxhint");
 X.host.querySelector(".bxleftn").textContent=`${left} of ${n} packs left`;
 X.host.querySelector(".bxpips").innerHTML=B.done.map(d=>`<i${d?' class="x"':""}></i>`).join("");
 h.innerHTML=!B.wrap?"👆 <b>Swipe across</b> the box to tear the wrap":!B.lid?"☝️ <b>Swipe up</b> to open the lid":left?"Tap a pack to pull it out — or Open All":"Box empty!";
 const a=$("bxall");if(a){a.disabled=!B.lid||!left;a.textContent=`⚡ Open All (${left})`}}
function bxPacks(X){const B=X.B,{W,D,H}=X,n=B.prod.n;if(X.packs)return;X.packs=1;
 const cols=n>=30?3:n>=16?2:1,per=Math.ceil(n/cols),cw=(W-12)/cols;let ph=Math.min(H-8,(cw-6)/.571),pw=ph*.571;if(pw>cw-4){pw=cw-4;ph=pw/.571}
 const z0=-(D/2-8),rnd=k=>{const x=Math.sin(k*91.7+B.s.dex.length*7.3)*43758.5;return x-Math.floor(x)};let h="";X.pk=[];
 B.packs.forEach((p,k)=>{if(B.done[k])return;const c=Math.floor(k/per),i=k%per,x=-W/2+6+cw*(c+.5)+(rnd(k)-.5)*4,z=Math.min(D/2-6,per>1?z0+i*(D-16)/(per-1):0),y=H/2-ph/2-2-rnd(k+9)*5,a=(rnd(k+3)-.5)*3*Math.PI/180;
  const U=[pw*Math.cos(a),pw*Math.sin(a),0],V=[-ph*Math.sin(a),ph*Math.cos(a),0];
  X.pk.push({k,w:pw,h:ph,U,V,O:[x-U[0]/2-V[0]/2,y-U[1]/2-V[1]/2,z],z:300+i});
  h+=bxPkImg(X.art(k),"bxp",` data-k="${k}" data-c="${c}" style="width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px;z-index:3"`).replace('alt=""',`alt="Pack ${k+1}"`)});
 X.obj.querySelectorAll(".bxp").forEach(e=>e.remove());X.obj.insertAdjacentHTML("beforeend",h);X.pk.forEach(p=>{p.e=X.obj.querySelector(`.bxp[data-k="${p.k}"]`)});
 /* packs share z-index group 3; DOM order (back row first) does the in-group painting */X.apply()}
function bxCurl(X,x,y,burst,prep){const fx=X.host.querySelector(".bxfx");if(!fx)return;
 if(!X.cps){X.cps=[];X.cpi=0;for(let j=0;j<20;j++){const e=document.createElement("i");e.className="cp";fx.appendChild(e);X.cps.push(e)}}
 if(prep)return;/* pooled plastic shards animated with WAAPI (transform/opacity only, no DOM churn mid-swipe) */
 const m=burst?10:1;for(let j=0;j<m;j++){const e=X.cps[X.cpi++%X.cps.length],a=Math.random()*Math.PI*2,d=burst?60+Math.random()*120:30+Math.random()*50,
  dx=Math.cos(a)*d,dy=Math.sin(a)*d*.6-30-Math.random()*40,r=Math.random()*540-270,sc=.6+Math.random()*.8;
  try{e.getAnimations().forEach(q=>q.cancel());e.animate([{transform:`translate(${x}px,${y}px) rotate(0deg) scale(1)`,opacity:1},{transform:`translate(${(x+dx).toFixed(0)}px,${(y+dy).toFixed(0)}px) rotate(${r.toFixed(0)}deg) scale(${sc.toFixed(2)})`,opacity:0}],{duration:900+Math.random()*200,easing:"cubic-bezier(.2,.7,.3,1)",fill:"forwards"})}catch(_){}}}
function bxSfx(n,a){try{if(typeof sfx!=="undefined"&&sfx[n])sfx[n](a)}catch(e){}}
function bxHap(p){try{if(typeof haptic==="function")haptic(p)}catch(e){}}
function bxTorn(X,px,py){const B=X.B;if(B.wrap)return;B.wrap=1;X.host.classList.add("torn");bxCurl(X,px,py,1);bxSfx("rip");bxHap([12,30,18]);boxSave();bxStatus(X);
 const pr=document.querySelector("#boxv .bxprods");if(pr)pr.remove();setTimeout(()=>{X.wrs.forEach(e=>e.remove());X.wrs=[];if(X.B===BOX&&!X.packs&&X.host.isConnected)bxPacks(X)},520)}
function bxLidTo(X,open){const B=X.B;if(open&&!B.lid){B.lid=1;X.host.classList.add("open");bxSfx("snap");bxHap(15);boxSave();bxStatus(X)}X.tween({ang:open?112:0,drx:0,dry:0},600)}
function bxPull(X,k){const B=X.B,e=X.host.querySelector(`.bxp[data-k="${k}"]`);if(!e||B.done[k]||X.busy)return;X.busy=1;bxSfx("tick");bxHap(10);
 bxLiftOut(X,k);setTimeout(()=>{X.busy=0;boxOne(k)},430)}
function bxLiftOut(X,k){const e=X.host.querySelector(`.bxp[data-k="${k}"]`);if(!e)return;e.classList.add("lift");e.style.zIndex=9;const t0=performance.now(),st=t=>{const q=Math.min(1,(t-t0)/420);X.lift[k]=1-Math.pow(1-q,3);X.apply();if(q<1&&X.host.isConnected)requestAnimationFrame(st)};requestAnimationFrame(st)}
function box3dOpenAll(){const X=BX3,B=BOX;if(!B||!B.lid||B.fly||X.B!==B||X.busy)return;X.busy=1;const ks=[];B.done.forEach((d,k)=>{if(!d)ks.push(k)});
 ks.slice(-8).reverse().forEach((k,j)=>setTimeout(()=>{bxLiftOut(X,k);bxSfx("tick")},j*60));
 setTimeout(()=>{X.busy=0;if(BOX===B){const v=$("boxv");if(v)v.scrollTop=0;boxFast()}},Math.min(8,ks.length)*60+380)}
function bxGestures(X){const sc=X.sc,B=X.B;let d=null;
 sc.onpointerdown=e=>{if(e.button>0)return;d={x:e.clientX,y:e.clientY,t:performance.now(),lx:e.clientX,mode:null,id:e.pointerId,moved:0,r:sc.getBoundingClientRect()};try{sc.setPointerCapture(e.pointerId)}catch(_){}X.tw++;X.live(1)};
 sc.onpointermove=e=>{if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y,r=d.r;d.moved=Math.max(d.moved,Math.hypot(dx,dy));
  if(!d.mode&&d.moved>8)d.mode=!B.wrap&&Math.abs(dx)>Math.abs(dy)?"tear":B.wrap&&!B.lid&&dy<0&&Math.abs(dy)>Math.abs(dx)?"lid":"rot";
  X.dry=Math.max(-28,Math.min(28,dx*(d.mode==="rot"?.18:.05)));X.drx=Math.max(-14,Math.min(14,-dy*(d.mode==="rot"?.1:.02)));X.apply();
  if(d.mode==="tear"){const run=Math.abs(e.clientX-d.lx);if(run>44){d.lx=e.clientX;bxCurl(X,e.clientX-r.left,e.clientY-r.top);bxSfx("crinkle",.03+run/900);if(Math.random()<.4)bxHap(6)}
   const tp=Math.max(X.tp,Math.min(1,Math.abs(dx)/(r.width*.55)));if(tp-X.tp>.015||tp>=1){X.tp=tp;const ci=`scaleX(${(1-tp).toFixed(3)})`;X.wrs.forEach(w=>w.style.transform=ci)}if(X.tp>=1)bxTorn(X,e.clientX-r.left,e.clientY-r.top)}
  if(d.mode==="lid"){if(!X.packs)bxPacks(X);X.lidT(Math.max(0,Math.min(112,-dy/(r.height*.45)*112)));if(X.ang>20&&!d.cr){d.cr=1;bxSfx("crinkle",.05)}}};
 const up=e=>{if(!d||e.pointerId!==d.id)return;const m=d.mode,tap=d.moved<9&&performance.now()-d.t<500;d=null;
  if(m==="lid")bxLidTo(X,X.ang>40);
  if(tap&&B.lid){const t=document.elementFromPoint(e.clientX,e.clientY);let p=t&&t.closest&&t.closest(".bxp");
   /* forgiving tap: anywhere on the open box pulls the front pack of the nearest row */
   if(!p&&t&&t.closest&&t.closest(".bxobj")){let bd=1e9;const qs=[...X.host.querySelectorAll(".bxp:not(.lift)")];qs.forEach(q=>{const r=q.getBoundingClientRect(),dd=Math.abs(r.left+r.width/2-e.clientX);if(dd<bd){bd=dd;p=q}});
    if(p){const c=p.dataset.c;p=qs.filter(q=>q.dataset.c===c).pop()}}
   if(p)bxPull(X,+p.dataset.k)}
  else if(tap&&!B.wrap){const h=X.host.querySelector(".bxhint");h.classList.remove("nudge");void h.offsetWidth;h.classList.add("nudge")}
  if(m!=="lid")X.tween({drx:0,dry:0},600)};
 sc.onpointerup=up;sc.onpointercancel=up;
 /* keyboard / switch access: Enter or Space steps through tear -> lid -> pull front pack */
 sc.tabIndex=0;sc.setAttribute("role","button");sc.onkeydown=e=>{if(e.key!=="Enter"&&e.key!==" ")return;e.preventDefault();const r=sc.getBoundingClientRect();
  if(!B.wrap)bxTorn(X,r.width/2,r.height/2);else if(!B.lid){if(!X.packs)bxPacks(X);bxLidTo(X,1)}else{const q=[...X.host.querySelectorAll(".bxp:not(.lift)")].pop();if(q)bxPull(X,+q.dataset.k)}}}
{const gt=gyroTick;gyroTick=function(){const r=gt.apply(this,arguments);try{if(BX3.host&&BX3.host.isConnected&&$("boxv").classList.contains("on"))BX3.apply()}catch(e){}return r}}
addEventListener("resize",()=>{if(BX3.host&&BX3.host.isConnected)BX3.fit()});
{const cs=chooseSet;chooseSet=function(s){const r=cs.apply(this,arguments);try{const f=()=>bxPreload(s||set);window.requestIdleCallback?requestIdleCallback(f,{timeout:1500}):setTimeout(f,700)}catch(e){}return r}}
