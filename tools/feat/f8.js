/* ---------- F8: achievements (localStorage "ppsAch"; incremental, evaluated in idle time) ---------- */
const ACHK="ppsAch",ACH={d:null,F:{},per:{},dirty:new Set(),q:[],showing:0,silent:false,batch:null,bfL:[],val:null,tab:"all",idle:0,bt:0,gok:0};
const achLor=s=>!!s&&s.game==="lor";
const ACH_TC=new Map();function achTier(r){let t=ACH_TC.get(r);if(t===undefined){t=TIERS[tier(r)]||0;ACH_TC.set(r,t)}return t}
const ACH_ERAS=[...new Set(SETS.filter(s=>!achLor(s)).map(s=>s.grp||s.serie))];
const achMoney=v=>"$"+Math.round(v).toLocaleString("en-US");
/* g: game filter (pkm|lor|all); n: counted goal (progress bar); h: hidden until unlocked */
const ACHS=[
 ["open","p1","🎁","First Rip","Open your first pack.","all",1,S=>S.packs],
 ["open","p10","📦","Warming Up","Open 10 packs.","all",10,S=>S.packs],
 ["open","p50","🔥","Regular","Open 50 packs.","all",50,S=>S.packs],
 ["open","p100","💯","Centurion","Open 100 packs.","all",100,S=>S.packs],
 ["open","p500","🚀","Pack Addict","Open 500 packs.","all",500,S=>S.packs],
 ["open","p1000","🌌","Legendary Ripper","Open 1,000 packs.","all",1000,S=>S.packs],
 ["open","box1","🧰","Box Breaker","Finish every pack in a booster box, bundle or ETB.","all",1,S=>S.boxes],
 ["open","box5","🏬","Box Collector","Finish 5 booster boxes or bundles.","all",5,S=>S.boxes],
 ["open","openall","⏩","Open All","Finish a box with Open All.","all",0,S=>S.F.openall],
 ["open","unbox","✂️","Hands-On Unboxing","Tear a box's shrink wrap and lift the lid yourself.","all",0,S=>S.F.unbox],
 ["pull","holo","✨","First Shine","Pull your first Holo Rare (or better).","pkm",0,S=>S.F.holo],
 ["pull","rev","🪞","Mirror Image","Pull your first reverse holo.","pkm",0,S=>S.F.rev],
 ["pull","ultra","💥","Big Hit","Pull your first Ultra Rare, ex, V or Double Rare.","pkm",0,S=>S.F.ultra],
 ["pull","ir","🖼️","Art Lover","Pull your first Illustration Rare (or better).","pkm",0,S=>S.F.ir],
 ["pull","sir","👑","Chase Card","Pull a Special Illustration, Hyper, Gold or Secret Rare.","pkm",0,S=>S.F.sir],
 ["pull","double","🎯","Double Trouble","Pull two Ultra Rare-or-better cards in one pack.","all",0,S=>S.F.double],
 ["pull","god","🌈","God Pack","Open a God Pack (only in sets that have them, e.g. Prismatic Evolutions).","pkm",0,S=>S.F.god],
 ["pull","demi","⭐","Demi-God Pack","Open a Demi-God Pack (only in sets that have them, e.g. 151, Prismatic Evolutions).","pkm",0,S=>S.F.demi],
 ["pull","c50","💵","Fifty Bucks","Own a single card worth $50+.","all",50,S=>S.top],
 ["pull","c100","💰","Benjamin","Own a single card worth $100+.","all",100,S=>S.top],
 ["pull","c250","💎","Grail","Own a single card worth $250+.","all",250,S=>S.top],
 ["lor","lfoil","🫧","Foil Fever","Pull your first Lorcana foil.","lor",0,S=>S.F.lfoil],
 ["lor","lleg","🗝️","Legend of the Inkwell","Pull your first Lorcana Legendary (or better).","lor",0,S=>S.F.lleg],
 ["lor","lench","🔮","Enchanted","Pull a Lorcana Enchanted (or Iconic) card.","lor",0,S=>S.F.lench],
 ["coll","b25","📗","Binder Builder","Fill 25% of any set's binder.","all",25,S=>S.bin],
 ["coll","b50","📘","Halfway There","Fill 50% of any set's binder.","all",50,S=>S.bin],
 ["coll","b100","📕","Set Complete","Collect every card in a set's binder.","all",100,S=>S.bin],
 ["coll","s10","🗺️","Globetrotter","Own cards from 10 different sets.","all",10,S=>S.sets],
 ["coll","sall","🌍","Completionist","Own cards from every set ("+SETS.length+").","all",SETS.length,S=>S.sets],
 ["coll","v100","🪙","Nest Egg","Collection worth $100.","all",100,S=>S.cv],
 ["coll","v500","🏦","Investor","Collection worth $500.","all",500,S=>S.cv],
 ["coll","v1000","📈","Four Figures","Collection worth $1,000.","all",1000,S=>S.cv],
 ["coll","v5000","🏆","Vault Keeper","Collection worth $5,000.","all",5000,S=>S.cv],
 ["coll","both","🤝","Two Worlds","Open packs in both Pokémon and Disney Lorcana.","all",0,S=>S.pk&&S.lr],
 ["coll","eras","⏳","Time Traveler","Open Pokémon packs from every era ("+ACH_ERAS.length+").","pkm",ACH_ERAS.length,S=>S.eras],
 ["era","era5","🧭","Era Hopper","Own Pokémon cards from 5 different eras.","pkm",5,S=>S.eras],
 ["era","wotc","📼","Old School","Open a pack from the Wizards of the Coast era (Base to Skyridge).","pkm",0,S=>S.F.wotc],
 ["era","decade","🗓️","Through the Decades","Own cards from sets released in every decade (1990s–2020s).","pkm",4,S=>S.dec],
 ["era","s25","🧳","Well Traveled","Own cards from 25 different sets.","all",25,S=>S.sets],
 ["era","s50","🌐","Atlas","Own cards from 50 different sets.","all",50,S=>S.sets],
 ["era","s100","🛰️","Cartographer","Own cards from 100 different sets.","all",100,S=>S.sets],
 ["era","u500","🗂️","Card Catalog","Own 500 different cards.","all",500,S=>S.uniq],
 ["era","u1000","🗄️","Archivist","Own 1,000 different cards.","all",1000,S=>S.uniq],
 ["era","u2500","🏛️","Museum Curator","Own 2,500 different cards.","all",2500,S=>S.uniq],
 ["era","done3","🥉","Triple Crown","Complete 3 set binders.","all",3,S=>S.done],
 ["era","wotcfull","🏺","Vintage Vault","Complete a Wizards-era binder (Base to Skyridge).","pkm",0,S=>S.wotcDone],
 ["era","eramaster","🎖️","Era Master","Complete a binder in every Pokémon era ("+ACH_ERAS.length+").","pkm",ACH_ERAS.length,S=>S.doneEras],
 ["pull","star","🌟","Gold Star","Pull a Gold Star (EX & POP era).","pkm",0,S=>S.F.star],
 ["pull","shn","🔆","Shining Moment","Pull a Shining Pokémon.","pkm",0,S=>S.F.shn],
 ["pull","cry","💠","Crystal Clear","Pull a Crystal Pokémon (Aquapolis or Skyridge).","pkm",0,S=>S.F.cry],
 ["pull","exl","🅴","Old-School ex","Pull a Pokémon-ex from the EX era.","pkm",0,S=>S.F.exl],
 ["pull","lvx","🆇","Level Up","Pull a LV.X card.","pkm",0,S=>S.F.lvx],
 ["pull","prime","🥇","Prime Time","Pull a Pokémon Prime.","pkm",0,S=>S.F.prime],
 ["pull","leg","🧩","Legend Half","Pull a LEGEND card.","pkm",0,S=>S.F.leg],
 ["pull","bigex","Ⓔ","Mega Power","Pull a Pokémon-EX (Black & White or XY).","pkm",0,S=>S.F.bigex],
 ["pull","brk","💢","BREAK Through","Pull a BREAK card.","pkm",0,S=>S.F.brk],
 ["pull","gx","🌀","GX Rated","Pull a Pokémon-GX.","pkm",0,S=>S.F.gx],
 ["pull","prism","🔷","Prism Star","Pull a Prism Star card.","pkm",0,S=>S.F.prism],
 ["pull","vmax","🔺","Max Power","Pull a VMAX.","pkm",0,S=>S.F.vmax],
 ["pull","vstar","✴️","Star Power","Pull a VSTAR.","pkm",0,S=>S.F.vstar],
 ["pull","amz","🎆","Amazing!","Pull an Amazing Rare.","pkm",0,S=>S.F.amz],
 ["pull","rad","☢️","Radiant","Pull a Radiant Rare.","pkm",0,S=>S.F.rad],
 ["pull","tg","🎨","Gallery Visit","Pull a Trainer Gallery or Galarian Gallery card.","pkm",0,S=>S.F.tg],
 ["pull","rc","🗃️","Radiant Collection","Pull a Radiant Collection card (Legendary Treasures or Generations).","pkm",0,S=>S.F.rc],
 ["pull","svr","💫","Shiny Hunter","Pull a Shiny Pokémon (Shiny Vault or Shiny Rare).","pkm",0,S=>S.F.svr],
 ["pull","alt","🖌️","Alt Art","Pull a Sword & Shield alternate art.","pkm",0,S=>S.F.alt],
 ["pull","rbw","🦄","Over the Rainbow","Pull a Rainbow Rare.","pkm",0,S=>S.F.rbw],
 ["pull","gold","🏅","Gold Rush","Pull a gold Secret Rare (Hyper Rares count).","pkm",0,S=>S.F.gold],
 ["fun","zard1","🕯️","Original Flame","Pull Charizard from Base Set, Base Set 2 or Legendary Collection.","pkm",0,S=>S.F.zard1,1],
 ["fun","pika","⚡","Pika Pika!","Pull a Pikachu.","pkm",0,S=>S.F.pika,1],
 ["fun","zard","🐉","Burn It Up","Pull a Charizard.","pkm",0,S=>S.F.zard,1],
 ["fun","mb","🔵","Master Ball","Pull a Master Ball reverse holo.","pkm",0,S=>S.F.mb,1],
 ["fun","stitch","👽","Ohana","Pull a Stitch card in Lorcana.","lor",0,S=>S.F.stitch,1],
 ["fun","dry","🌵","Dry Spell","Open 10 packs in a row with nothing above holo (sets with Ultra Rares).","all",0,S=>S.F.dry,1],
 ["fun","owl","🦉","Night Owl","Open a pack between midnight and 4 AM.","all",0,S=>S.F.owl,1],
].map(([cat,id,icon,name,desc,g,n,f,h])=>({cat,id,icon,name,desc,g,n,f,h:!!h}));
const ACHBY=Object.fromEntries(ACHS.map(a=>[a.id,a]));
const ACH_CATS=[["open","Opening"],["pull","Pulls"],["lor","Lorcana"],["coll","Collection"],["era","Eras & sets"],["fun","Secret & fun"]];
const ACH_WOTC=new Set(["base","neo","ecard"]),achEra=s=>s.grp||s.serie;
const ACH_MONEY=new Set(["c50","c100","c250","v100","v500","v1000","v5000"]);
function achSave(){try{localStorage.setItem(ACHK,JSON.stringify(ACH.d))}catch(e){}}
function achFlags(F,c,s){const t=c.t;
 if(achLor(s)){if(c.rev)F.lfoil=1;if(t>=4)F.lleg=1;if(t>=6&&/enchanted|iconic/i.test(c.rarity))F.lench=1;if(/^stitch\b/i.test(c.name))F.stitch=1}
 else{if(t>=3)F.holo=1;if(c.rev)F.rev=1;if(t>=4)F.ultra=1;if(t>=5)F.ir=1;if(t>=6)F.sir=1;if(c.pat==="mb")F.mb=1;if(/pikachu/i.test(c.name))F.pika=1;if(/charizard/i.test(c.name)){F.zard=1;if(/^(base1|base4|lc)$/.test(s.dex))F.zard1=1}
  const r=c.rarity||"",l=r.toLowerCase();if(!r||t<3&&!c.rev&&!/shiny/.test(l))return;
  if(/gold star/.test(l))F.star=1;if(/shining/.test(l))F.shn=1;if(/crystal/.test(l))F.cry=1;if(/lv\.x/.test(l))F.lvx=1;if(/prime/.test(l))F.prime=1;if(/^legend$/.test(l))F.leg=1;
  if(/ ex$/.test(r)&&achEra(s)==="ex")F.exl=1;if(/ EX$/.test(r))F.bigex=1;if(/break/.test(l))F.brk=1;if(/ gx$/.test(l))F.gx=1;if(/prism/.test(l))F.prism=1;
  if(/vmax/.test(l))F.vmax=1;if(/vstar/.test(l))F.vstar=1;if(/amazing/.test(l))F.amz=1;if(/^radiant rare/.test(l))F.rad=1;if(/trainer gallery|galarian gallery/.test(l))F.tg=1;
  if(/^rc /.test(l))F.rc=1;if(/shiny/.test(l))F.svr=1;if(/alternate/.test(l))F.alt=1;if(/rainbow/.test(l))F.rbw=1;if(/secret gold|hyper rare|gallery gold/.test(l))F.gold=1}}
/* per-set stats from the saved collection (binder % itself is computed from the full set list in achAgg) */
function achSetStat(s,full){const o=store.sets&&store.sets[s.dex];let any=0,base=0,uq=0;
 if(o)for(const n in o){const e=o[n];if(!e||!e.n)continue;any=1;uq++;const t=achTier(e.rarity);if(t<=4)base++;if(full)achFlags(ACH.F,{name:e.name,rarity:e.rarity,t,rev:(e.rv||0)>0},s)}
 if(full&&any&&!achLor(s)&&ACH_WOTC.has(achEra(s)))ACH.F.wotc=1;ACH.per[s.dex]={any,base,uq}}
function achAgg(){ACH.dirty.forEach(d=>{const s=SETBY[d];if(s&&SETS.includes(s))achSetStat(s)});ACH.dirty.clear();
 let sets=0,pk=0,lr=0,bin=0,binS="",need=0,uniq=0,done=0,wotcDone=0;const eras=new Set(),dEras=new Set(),dec=new Set();
 for(const s of SETS){const p=ACH.per[s.dex];if(!p||!p.any)continue;sets++;uniq+=p.uq||0;if(achLor(s))lr=1;else{pk=1;eras.add(achEra(s));const y=+String(s.rel||s.year).slice(0,4);if(y)dec.add(Math.floor(y/10))}
  const L=LISTS[s.dex];if(L&&L.length){const o=store.sets[s.dex]||{};let h=0;for(const c of L)if(o[c.n]&&o[c.n].n)h++;const x=Math.min(100,Math.floor(h/L.length*1000)/10);if(x>bin){bin=x;binS=s.name}
   if(h>=L.length){done++;if(!achLor(s)){dEras.add(achEra(s));if(ACH_WOTC.has(achEra(s)))wotcDone=1}}}else need=1}
 if(need)achFetchBT();else achFixBin(bin);const v=ACH.val||{};
 return {packs:store.packs||0,boxes:ACH.d.st.boxes||0,sets,pk,lr,eras:eras.size,bin,binS,uniq,done,wotcDone,doneEras:dEras.size,dec:dec.size,cv:v.v||0,top:v.top||0,F:ACH.F}}
async function achFetchBT(){if(ACH.bt)return;ACH.bt=1;let got=0;try{for(const s of SETS){if(LISTS[s.dex])continue;const p=ACH.per[s.dex];if(!p||!p.any)continue;
  try{await setList(s);got=1}catch(e){}}}finally{ACH.bt=0}if(got)achLater()}
/* binder %s now match the binder screen (every card in the set); revoke any binder badge unlocked under the old base-only count */
function achFixBin(bin){if(ACH.d.binv===2)return;let ch=0;for(const [id,n] of [["b25",25],["b50",50],["b100",100]])if(ACH.d.u[id]&&bin<n){delete ACH.d.u[id];delete ACH.d.bf[id];ch=1}ACH.d.binv=2;achSave();if(ch&&typeof achRender==="function"&&$("vAch")&&$("vAch").classList.contains("on"))achRender()}
function achDone(a,S){const v=a.f(S);return a.n?(+v||0)>=a.n:!!v}
function achEval(){if(!ACH.d)return;const S=achAgg(),out=[];for(const a of ACHS)if(!ACH.d.u[a.id]&&achDone(a,S))out.push(a);
 if(out.length){const now=Date.now();out.forEach(a=>{ACH.d.u[a.id]=now;if(ACH.silent)ACH.d.bf[a.id]=1;else ACH.d.nw=(ACH.d.nw||0)+1});achSave();
  if(ACH.silent){ACH.bfL.push(...out);clearTimeout(ACH.bfT);ACH.bfT=setTimeout(()=>{const L=ACH.bfL;ACH.bfL=[];if(L.length)achToast({multi:L,bf:1})},1200)}
  else if(ACH.batch)ACH.batch.push(...out);
  else if(out.length>2)achToast({multi:out});else out.forEach(a=>achToast({a}))}
 achBadge();if($("vAch").classList.contains("on"))achRender();return out}
function achLater(){if(ACH.idle)return;const f=()=>{ACH.idle=0;achEval()};ACH.idle=window.requestIdleCallback?requestIdleCallback(f,{timeout:1500}):setTimeout(f,300)}
function achOnPack(s,p){if(!ACH.d||!s||!p)return;const F=ACH.F,st=ACH.d.st;let hi=0,big=0;
 for(const c of p){const t=c.tier!=null&&TIERS[c.tier]!=null?TIERS[c.tier]:achTier(c.rarity);if(t>hi)hi=t;if(t>=4)big++;achFlags(F,{name:c.name,rarity:c.rarity,t,rev:!!c.rev,pat:c.pat},s)}
 if(p.god)F[p.god.kind==="demi"?"demi":"god"]=1;if(big>=2)F.double=1;
 if(!achLor(s)&&ACH_WOTC.has(achEra(s)))F.wotc=1;
 if(achLor(s)||s.era!=="wotc"){st.dry=hi<=3?(st.dry||0)+1:0;if(st.dry>=10)F.dry=1}
 if(new Date().getHours()<4)F.owl=1;ACH.dirty.add(s.dex);p.forEach(c=>{const d=keyOf(c.id)[0];if(d!==s.dex)ACH.dirty.add(d)})}
function achBoxCheck(){const B=BOX;if(!B||B.achDone||boxLeft())return;B.achDone=1;ACH.d.st.boxes=(ACH.d.st.boxes||0)+1;achSave()}
/* ---------- toast: one at a time, never during a tear / unrevealed pack / Open All flight ---------- */
function achGate(){if(document.hidden)return false;const t=$("tear");if(t&&t.classList.contains("on"))return false;if($("godban"))return false;
 if($("vPack").classList.contains("on")){const sm=$("summary");if(!(sm&&sm.classList.contains("on"))&&flippedN<current.length)return false}
 const bv=$("boxv");if(bv&&bv.classList.contains("on")&&BOX&&BOX.fly)return false;return true}
function achToast(it){ACH.q.push(it);achPump()}
function achPump(){if(ACH.showing||!ACH.q.length)return;clearTimeout(ACH.pt);
 if(!achGate()){ACH.gok=0;ACH.pt=setTimeout(achPump,450);return}if(!ACH.gok){ACH.gok=1;ACH.pt=setTimeout(achPump,650);return}
 const it=ACH.q.shift(),el=$("achtoast");ACH.showing=1;ACH.cur=it;
 if(it.a){const a=it.a;el.innerHTML=`<div class="ati">${a.icon}</div><div class="atb"><small>Achievement unlocked</small><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`}
 else{const L=it.multi;el.innerHTML=`<div class="ati">🏆</div><div class="atb"><small>${it.bf?"Credited from your collection":it.box?"Unlocked in this box":"Achievements unlocked"}</small><b>${L.length} achievement${L.length>1?"s":""} unlocked</b><span class="atic">${L.slice(0,6).map(a=>`<i aria-hidden="true">${a.icon}</i>`).join("")} ${esc(L.slice(0,2).map(a=>a.name).join(", "))}${L.length>2?` +${L.length-2}`:""}</span></div>`}
 const h=document.querySelector("header"),hb=h?Math.max(0,h.getBoundingClientRect().bottom):0;el.style.top=Math.round(Math.max(8,hb+8))+"px";
 el.style.transform="";el.classList.add("on");ACH.d.toasts=(ACH.d.toasts||0)+1;
 if(!it.bf){try{sfx.ach&&sfx.ach()}catch(e){}try{haptic(12)}catch(e){}}
 ACH.tt=setTimeout(achHide,it.multi?3600:3000)}
function achHide(){clearTimeout(ACH.tt);const el=$("achtoast");if(!el.classList.contains("on"))return;el.classList.remove("on");el.style.transform="";
 setTimeout(()=>{ACH.showing=0;ACH.cur=null;achPump()},280)}
(function achToastEl(){const el=document.createElement("div");el.id="achtoast";el.setAttribute("role","status");el.setAttribute("aria-live","polite");document.body.appendChild(el);
 let d=null;el.onpointerdown=e=>{d={x:e.clientX,y:e.clientY,id:e.pointerId,m:0};try{el.setPointerCapture(e.pointerId)}catch(_){}clearTimeout(ACH.tt)};
 el.onpointermove=e=>{if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.m=Math.max(d.m,Math.hypot(dx,dy));if(d.m>6)el.style.transform=`translate(calc(-50% + ${dx}px),${Math.min(0,dy)}px)`;d.dx=dx;d.dy=dy};
 const up=()=>{if(!d)return;const dd=d;d=null;if(dd.m<8){achHide();openAch();return}if(Math.abs(dd.dx||0)>60||(dd.dy||0)<-30)achHide();else{el.style.transform="";ACH.tt=setTimeout(achHide,1600)}};
 el.onpointerup=up;el.onpointercancel=up})();
try{if(typeof sfx==="object"&&typeof tone==="function")sfx.ach=function(){if(!ok("ach",300))return;const t=SND.ctx.currentTime;tone(t,783.99,.32,.05,"sine",.004);tone(t+.09,1174.66,.5,.045,"sine",.004);tone(t+.09,2349.3,.2,.012,"triangle",.004)}}catch(e){}
/* ---------- view ---------- */
function achBadge(){const n=Object.keys(ACH.d.u).length,T=ACHS.length;document.querySelectorAll(".achtc").forEach(e=>e.textContent=`${n} / ${T} UNLOCKED`);
 const b=$("achbtn");if(b){b.classList.toggle("nw",!!ACH.d.nw);b.setAttribute("aria-label",`Achievements, ${n} of ${T} unlocked${ACH.d.nw?", "+ACH.d.nw+" new":""}`)}}
const achDate=t=>new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
function achProg(a,S){if(!a.n)return "";let v=+a.f(S)||0;const cap=Math.min(v,a.n),pct=cap/a.n*100,m=ACH_MONEY.has(a.id);
 const lbl=a.cat==="coll"&&/^b/.test(a.id)?`${v}%${S.binS?" · "+esc(S.binS):""}`:m?`${achMoney(v)} / ${achMoney(a.n)}`:`${Math.floor(cap).toLocaleString("en-US")} / ${a.n.toLocaleString("en-US")}`;
 return `<div class="achp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct.toFixed(1)}%"></i></div><small class="achpn">${lbl}</small>`}
function achRender(){const v=$("vAch"),S=achAgg(),U=ACH.d.u,T=ACHS.length,n=Object.keys(U).length,tab=ACH.tab;
 const vis=a=>tab==="all"||(tab==="pkm"&&a.g!=="lor")||(tab==="lor"&&a.g!=="pkm")||(tab==="done"&&U[a.id]);
 const card=a=>{const on=!!U[a.id],sec=a.h&&!on;return `<div class="ach ${on?"on":"off"}${sec?" sec":""}" data-id="${a.id}"><div class="achi" aria-hidden="true">${sec?"❔":a.icon}</div><div class="achb"><b>${sec?"Secret achievement":esc(a.name)}</b><p>${sec?"Keep opening packs to discover it.":esc(a.desc)}</p>${on?`<small class="achd">Unlocked ${achDate(U[a.id])}${ACH.d.bf[a.id]?" · from your collection":""}</small>`:sec?"":achProg(a,S)}</div></div>`};
 const secs=ACH_CATS.map(([c,label])=>{const L=ACHS.filter(a=>a.cat===c&&vis(a));if(!L.length)return "";const k=L.filter(a=>U[a.id]).length;
  return `<h2 class="achh"><span>${label}</span><small>${k} / ${L.length}</small></h2><div class="achgrid">${L.map(card).join("")}</div>`}).join("");
 const tabs=[["all","All"],["pkm","Pokémon"],["lor","Lorcana"],["done","Unlocked"]];
 v.innerHTML=`<div class="achtop"><div class="achsum"><b>${n}</b> / ${T} unlocked</div><div class="achbar" role="progressbar" aria-label="Achievements unlocked" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${T}"><i style="width:${(n/T*100).toFixed(1)}%"></i></div>
  <div class="achtabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" class="ghost${k===tab?" on":""}" aria-selected="${k===tab}" data-t="${k}">${l}</button>`).join("")}</div>
  <p class="achnote">Swipe left/right to switch tabs. Binder % counts every card in the set, the same as the binder screen (secret rares included).</p></div>
  <div class="achlist">${secs||`<p class="achnote">Nothing here yet — go rip some packs!</p>`}</div>`;
 v.querySelectorAll(".achtabs button").forEach(b=>b.onclick=()=>{ACH.tab=b.dataset.t;achRender()})}
function openAch(){if(!ACH.d)return;try{if(Array.isArray(S))S.length=0}catch(e){}ACH.d.nw=0;achSave();show("vAch");achRender();achBadge();window.scrollTo(0,0);
 $("status").textContent=`Achievements — ${Object.keys(ACH.d.u).length} of ${ACHS.length} unlocked.`}
{const sh=show;show=function(v){const r=sh.apply(this,arguments);const a=$("vAch");if(a)a.classList.toggle("on",v==="vAch");const b=$("achbtn");if(b)b.style.display=v==="vAch"?"none":"";return r}}
(function achSwipe(){const v=$("vAch");let d=null;const T=["all","pkm","lor","done"];
 v.addEventListener("pointerdown",e=>{if(e.button>0||e.target.closest("button"))return;d={x:e.clientX,y:e.clientY,t:performance.now()}},{passive:true});
 v.addEventListener("pointerup",e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y,dt=performance.now()-d.t;d=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>2*Math.abs(dy)&&dt<700){const i=T.indexOf(ACH.tab),j=Math.max(0,Math.min(T.length-1,i+(dx<0?1:-1)));if(j!==i){ACH.tab=T[j];achRender()}}},{passive:true});
 v.addEventListener("pointercancel",()=>{d=null},{passive:true})})();
$("achbtn").onclick=openAch;
{const t=`<div class="tile atile" role="button" tabindex="0" aria-label="Achievements" style="--c1:#c9a24a"><div class="logo"><div class="bicon">🏆</div></div><h3>Achievements</h3><small class="achtc"></small></div>`;
 {const b=document.querySelector("#sets .btile");b?b.insertAdjacentHTML("afterend",t):$("pkbar").insertAdjacentHTML("afterend",t)}$("lsets").insertAdjacentHTML("beforeend",t);document.querySelectorAll(".atile").forEach(b=>{b.onclick=openAch;b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openAch()}}})}
/* ---------- hooks ---------- */
{const op=openPack;openPack=function(){const r=op.apply(this,arguments);try{ACH.silent=false;achOnPack(set,current);if(current.boxK!=null)achBoxCheck();achLater()}catch(e){}return r}}
if(typeof boxRecord==="function"){const br=boxRecord;boxRecord=function(s,p){const r=br.apply(this,arguments);try{achOnPack(s,p)}catch(e){}return r}}
if(typeof boxFast==="function"){const bf=boxFast;boxFast=function(){const B=BOX;if(!B||B.fly)return bf.apply(this,arguments);ACH.silent=false;ACH.batch=[];let r;
 try{r=bf.apply(this,arguments);if(BOX===B&&!boxLeft()){ACH.F.openall=1;achBoxCheck()}achEval()}finally{const L=ACH.batch||[];ACH.batch=null;if(L.length){B.achList=(B.achList||[]).concat(L);achToast({multi:L,box:1})}}return r}}
if(typeof boxSummary==="function"){const bs=boxSummary;boxSummary=function(){const r=bs.apply(this,arguments);try{const B=BOX,L=B&&B.achList,sm=$("boxv").querySelector(".bxsum");
 if(L&&L.length&&sm)sm.insertAdjacentHTML("afterbegin",`<div class="bxach"><h3>🏆 Achievements unlocked (${L.length})</h3><div class="bxachl">${L.map(a=>`<span class="bxachc"><i>${a.icon}</i>${esc(a.name)}</span>`).join("")}</div></div>`)}catch(e){}return r}}
if(typeof bxLidTo==="function"){const bl=bxLidTo;bxLidTo=function(X,open){const was=X&&X.B&&X.B.lid;const r=bl.apply(this,arguments);try{if(open&&!was&&X.B.lid&&X.B.wrap){ACH.F.unbox=1;achLater()}}catch(e){}return r}}
if(typeof pxValue==="function"){const pv=pxValue;pxValue=function(sets){const x=pv.apply(this,arguments);try{if(!sets&&x){ACH.val={v:x.v||0,top:x.top&&x.top.length?x.top[0].r.v:0};achLater()}}catch(e){}return x}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)achPump()});
/* ---------- load + one-time backfill (silent; one summary toast) ---------- */
(function achInit(){let d=null;try{d=JSON.parse(localStorage.getItem(ACHK)||"null")}catch(e){}
 const first=!d||!d.u;ACH.d=Object.assign({v:1,u:{},bf:{},st:{boxes:0,dry:0},bt:{},nw:0},d||{});ACH.d.st=ACH.d.st||{};ACH.d.bt=ACH.d.bt||{};ACH.d.bf=ACH.d.bf||{};
 if(first){ACH.silent=true;ACH.d.since=Date.now();achSave()}else if(ACH.d.av!==2)ACH.silent=true;ACH.d.av=2;achBadge();
 const run=()=>{for(const s of SETS)achSetStat(s,true);(store.hist||[]).forEach(h=>{if(/^👑DEMI /.test(h))ACH.F.demi=1;else if(/^👑GOD /.test(h))ACH.F.god=1});achEval()};
 window.requestIdleCallback?requestIdleCallback(run,{timeout:1200}):setTimeout(run,250)})();
window.ACH=ACH;
