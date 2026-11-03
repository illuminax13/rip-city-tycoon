
/* F17: ONE new-hit detection for every open path (single pack + its skip / Reveal All modes, a box pack opened on its own,
   booster box Open All / 3D open-all / Skip to summary). Ownership is snapshotted BEFORE anything is saved; a hit is NEW iff
   it was unowned before the pack / batch, and only its first copy in that pack / batch counts. Marks live on the card
   (c.nh={chase,top}) so the pack summary, the box summary (HITS grid, All cards, BEST PULL) and the Top 10 read the same data. */
function nhSnap(){const m={};for(const [d,o] of Object.entries(store.sets||{})){const x=m[d]={};for(const [n,e] of Object.entries(o||{}))x[n]=(e&&e.n)||0}return m}
function nhDetect(packs,s,pre){const seen=new Set(),out=[];let ch=null;
 packs.forEach((p,pi)=>p&&p.forEach((c,i)=>{if(!nhIsHit(c))return;const kk=keyOf(c.id),k=kk.join("|");if(seen.has(k))return;seen.add(k);
  if(((pre[kk[0]]||{})[kk[1]]||0)>0)return;ch=ch||nhChase(s);out.push({pi,i,c,k,chase:ch.has(k)})}));return out}
function nhTopMark(prevTop,list){/* list: [{k,h}] - h gets .top=N for cards that cracked a FULL Top 10 (while it is still filling up every new hit would qualify) */
 if(!prevTop||prevTop.size<10||!list.length||typeof t10Rank!=="function")return;const ks=t10Rank().map(r=>keyOf(r.c.id).join("|"));
 list.forEach(x=>{const j=ks.indexOf(x.k);if(j>=0&&!prevTop.has(x.k))x.h.top=j+1})}
const nhTopNow=()=>{try{return typeof t10Rank==="function"?new Set(t10Rank().map(r=>keyOf(r.c.id).join("|"))):null}catch(e){return null}};
window.__nh={snap:nhSnap,detect:nhDetect};
/* single packs: f14's nhMark now reads the pre-open snapshot (falls back to its count check if there is none) */
{const nm=nhMark;nhMark=function(p,s){const pre=NH.pre;if(!pre)return nm.apply(this,arguments);const nw=new Map();
 nhDetect([p],s,pre).forEach(x=>nw.set(x.i,{chase:x.chase}));p.newHits=nw;return nw}}
{const op=openPack;openPack=function(){const prevTop=nhTopNow();NH.pre=nhSnap();let r;try{r=op.apply(this,arguments)}finally{NH.pre=null}
 try{const m=typeof current!=="undefined"&&current&&current.newHits;if(m&&m.size){nhTopMark(prevTop,[...m].filter(([i])=>current[i]).map(([i,h])=>({k:keyOf(current[i].id).join("|"),h})));
  m.forEach((h,i)=>{if(current[i])current[i].nh={chase:!!h.chase,top:h.top||0}})}}catch(e){}return r}}
/* booster box: Open All (also used by the 3D box) records every remaining pack at once */
{const bf=boxFast;boxFast=function(){const B=BOX;if(!B||B.fly)return bf.apply(this,arguments);
 const ks=[];B.done.forEach((d,k)=>{if(!d)ks.push(k)});let nw=[];const prevTop=nhTopNow();
 try{nw=nhDetect(ks.map(k=>B.packs[k]),B.s,nhSnap());nw.forEach(x=>{x.c.nh={chase:x.chase,top:0};x.h=x.c.nh})}catch(e){}
 const r=bf.apply(this,arguments);
 try{nhTopMark(prevTop,nw);if(nw.length){B.nhNew=(B.nhNew||0)+1;if(typeof boxSave==="function")boxSave()}}catch(e){}return r}}
function nhBoxList(B){const out=[];(B.res||[]).forEach((p,k)=>p&&p.forEach(c=>{if(c&&c.nh)out.push({c,k})}));return out}
function nhBoxToast(list){if(!list.length||PREF.newHits===false)return;const ch=list.filter(x=>x.c.nh.chase),tp=list.filter(x=>x.c.nh.top).sort((a,b)=>a.c.nh.top-b.c.nh.top);
 const lead=ch[0]||tp[0]||list[0];nhToast(lead.c,!!ch.length);const t=$("nhtoast");if(!t)return;
 const head=ch.length?(ch.length>1?ch.length+" chase cards pulled!":"Chase card pulled!"):tp.length?"New Top 10 hit! #"+tp[0].c.nh.top:"New hit for your binder!";
 const bits=[`✦ ${list.length} new hit${list.length>1?"s":""} for your binder`];if(tp.length&&ch.length)bits.push("New Top 10 hit! #"+tp[0].c.nh.top);
 t.classList.toggle("top",!ch.length&&!!tp.length);t.querySelector("i").textContent=ch.length?"★":tp.length?"♛":"✦";
 t.querySelector("b").textContent=head;t.querySelector("small").textContent=(list.length===1?lead.c.name+" · ":"")+bits.join(" · ");t.dataset.box="1";
 list.forEach(x=>NH.log.push({name:x.c.name,rarity:x.c.rarity,chase:!!x.c.nh.chase,top:x.c.nh.top||undefined,box:1,at:Date.now()}));
 setTimeout(()=>{try{if(typeof sfx.newhit==="function")sfx.newhit();haptic(10)}catch(e){}},420)}
function nhBoxRibs(B){const v=$("boxv");if(!B||!v||PREF.newHits===false)return;const rib=(el,c)=>{if(el&&c&&c.nh)nhBadge(el,c.nh.chase,1)};
 v.querySelectorAll(".bxsum .bxt[data-j]").forEach(t=>{const j=t.dataset.j,x=j[0]==="a"?(B.allList||[])[+j.slice(1)]:(B.hitList||[])[+j];if(x)rib(t,x.c)});
 if(B.best)rib(v.querySelector(".bbc .bxt"),B.best.c)}
/* prices arriving re-sort the HITS grid / best pull (bxResort re-renders them): put the ribbons back */
{const br=bxResort;bxResort=function(B){const r=br.apply(this,arguments);try{nhBoxRibs(B)}catch(e){}return r}}
{const bs=boxSummary;boxSummary=function(){const r=bs.apply(this,arguments);try{const B=BOX,v=$("boxv");if(!B||!v||PREF.newHits===false)return r;
 const list=nhBoxList(B);if(!list.length){B.nhNew=0;return r}
 nhBoxRibs(B);
 const nc=list.filter(x=>x.c.nh.chase).length,tops=list.filter(x=>x.c.nh.top).map(x=>x.c.nh.top).sort((a,b)=>a-b);
 const d=document.createElement("div");d.className="nhsum bxnh"+(nc?" chase":"");
 d.innerHTML=(nc?`<b>★ ${nc>1?nc+" chase cards":"Chase card"} pulled!</b>`:"")+(tops.length?`<b class="t10s">New Top 10 hit${tops.length>1?"s":""}! #${tops.join(", #")}</b>`:"")+`<span>✦ ${list.length} new hit${list.length>1?"s":""} for your binder</span>`;
 const st=v.querySelector(".bxsum .bxstats");if(st)st.after(d);else v.querySelector(".bxsum").prepend(d);
 if(B.nhNew){B.nhNew=0;nhBoxToast(list)}}catch(e){}return r}}
