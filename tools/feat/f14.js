
/* NEW-hit alerts: a hit (rare holo and up; Lorcana Super Rare and up - the app's own reveal tiers) that wasn't in the
   binder before this pack gets a NEW ribbon when it is flipped, a short toast ("Chase card pulled!" for chase-list cards),
   a soft chime + light haptic (Sound / Haptics settings respected), and NEW tags + a count in the pack summary. */
if(PREF.newHits===undefined)PREF.newHits=true;
const NH={log:[]};window.__newHits=NH.log;
const nhIsHit=c=>!!c&&!c.energy&&(TIERS[c.tier||tier(c.rarity)]||0)>=3;
function nhChase(s){try{if(!s||typeof chRank!=="function"||!cache[s.dex])return new Set();return new Set(chRank(s,chCards(cache[s.dex])).slice(0,typeof CHMAX==="number"?CHMAX:15).map(x=>keyOf(x.c.id).join("|")))}catch(e){return new Set()}}
/* after openPack saved the pack: a card was new iff its binder count now equals how many copies this pack added
   (keys via keyOf, so subset cards - 30th CC / RGB, Celebrations CC, Crown Zenith GG - resolve like the binder does) */
function nhMark(p,s){const occ={},first={};p.forEach((c,i)=>{const k=keyOf(c.id).join("|");occ[k]=(occ[k]||0)+1;if(first[k]===undefined)first[k]=i});
 const nw=new Map();let ch=null;
 p.forEach((c,i)=>{if(!nhIsHit(c))return;const k=keyOf(c.id).join("|");if(first[k]!==i)return;const [d,n]=keyOf(c.id),r=(store.sets[d]||{})[n];
  if(r&&r.n===occ[k]){ch=ch||nhChase(s);nw.set(i,{chase:ch.has(k)})}});
 p.newHits=nw;return nw}
{const op=openPack;openPack=function(){const r=op.apply(this,arguments);try{nhMark(current,set)}catch(e){current.newHits=new Map()}return r}}
function nhBadge(face,chase,late){if(!face||face.querySelector(".nhrib"))return;const b=document.createElement("div");b.className="nhrib"+(chase?" chase":"")+(late?" late":"");b.setAttribute("aria-hidden","true");b.innerHTML="<span>"+(chase?"★ NEW":"NEW")+"</span>";face.appendChild(b)}
function nhToast(c,chase){let t=$("nhtoast");if(!t){t=document.createElement("div");t.id="nhtoast";t.setAttribute("role","status");t.setAttribute("aria-live","polite");document.body.appendChild(t)}
 const run=current&&current.newHits?[...current.newHits.keys()].filter(i=>i<=topI).length:1,anyCh=chase||(t.classList.contains("on")&&t.dataset.ch==="1");
 t.dataset.ch=anyCh?"1":"";t.className=(anyCh?"chase ":"")+(document.querySelector("#achtoast.on")?"low ":"")+"on";
 t.innerHTML=`<i aria-hidden="true">${chase?"★":"✦"}</i><span><b>${chase?"Chase card pulled!":"New hit for your binder!"}</b><small>${esc(c.name)}${run>1?` · ${run} new hits this pack`:""}</small></span>`;
 clearTimeout(NH.t);NH.t=setTimeout(()=>t.classList.remove("on"),2600)}
{const f=flipTop;flipTop=function(){const i=topI,el=topEl(),was=!el||el.classList.contains("flipped");const r=f.apply(this,arguments);
 try{const m=current&&current.newHits,h=m&&m.get(i);if(!was&&h&&PREF.newHits){const c=current[i];nhBadge(el.querySelector(".front"),h.chase);NH.log.push({name:c.name,rarity:c.rarity,chase:h.chase,at:Date.now()});
  nhToast(c,h.chase);setTimeout(()=>{if(typeof sfx.newhit==="function")sfx.newhit();haptic(10)},420)}}catch(e){}return r}}
{const ss=showSummary;showSummary=function(){const r=ss.apply(this,arguments);try{const m=current&&current.newHits;if(!m||!m.size||!PREF.newHits)return r;
 const sg=document.querySelector("#summary .sgrid");if(!sg)return r;const els=sg.querySelectorAll(".card");m.forEach((h,i)=>{const e=els[i];if(e)nhBadge(e.querySelector(".front"),h.chase,1)});
 const nc=[...m.values()].filter(h=>h.chase).length,d=document.createElement("div");d.className="nhsum"+(nc?" chase":"");
 d.innerHTML=(nc?`<b>★ ${nc>1?nc+" chase cards":"Chase card"} pulled!</b>`:"")+`<span>✦ ${m.size} new hit${m.size>1?"s":""} for your binder</span>`;sg.parentNode.insertBefore(d,sg)}catch(e){}return r}}
sfx.newhit=function(){if(!ok("newhit",300))return;const t=SND.ctx.currentTime+.01;tone(t,1318.5,.28,.035,"sine",.006);tone(t+.09,1975.5,.42,.03,"sine",.006);tone(t+.09,987.8,.42,.018,"triangle",.01)};
/* settings toggle */
(function(){const n=$("hapNote");if(!n||$("optNew"))return;const l=document.createElement("label");l.innerHTML='New-hit alerts <input type="checkbox" id="optNew">';n.after(l);
 const x=document.createElement("div");x.className="note";x.textContent="Flags hits you didn't own yet when you pull them.";l.after(x);
 $("optNew").checked=PREF.newHits!==false;$("optNew").onchange=e=>{PREF.newHits=e.target.checked;savePref()}})();
