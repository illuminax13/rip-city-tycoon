"""Set picker for ~130 Pokemon sets: era groups (newest first), collapsible headers, search + filter chips; lazy shelf counts."""
import os
R=os.path.abspath(os.path.dirname(os.path.abspath(__file__))+'/../..');p=R+'/index.html';s=open(p).read()
a=s.find('const ERAS=[');b=s.find('/* game switch',a);assert a>0 and b>a
NEW=r'''const ERAS=[["me","Mega Evolution"],["sv","Scarlet & Violet"],["swsh","Sword & Shield"],["sm","Sun & Moon"],["xy","XY"],["bw","Black & White"],["hgss","HeartGold & SoulSilver"],["pl","Platinum"],["dp","Diamond & Pearl"],["ex","EX"],["ecard","e-Card"],["neo","Neo"],["base","Classic"]];
const eraOf=s=>s.grp||s.serie,setRel=s=>s.rel||String(s.year);
const PKS=SETS.map((s,i)=>[s,i]).filter(([s])=>s.game!=="lor").sort((a,b)=>setRel(b[0]).localeCompare(setRel(a[0]))||b[1]-a[1]);
const PK={q:"",f:"all",c:null};
const pkOwn=s=>{const o=store.sets&&store.sets[s.dex];if(!o)return 0;for(const k in o)if(o[k]&&o[k].n)return 1;return 0};
function pkCollapsed(){if(PK.c)return PK.c;let c=null;try{c=JSON.parse(localStorage.getItem("ppsEraC")||"null")}catch(e){}
 if(!c){c={};for(const [g] of ERAS)if(!["me","sv","swsh","neo","base"].includes(g)&&!PKS.some(([s])=>eraOf(s)===g&&pkOwn(s)))c[g]=1}return PK.c=c}
const pkTile=(s,i,k)=>`<div class="tile" data-i="${i}" data-g="${eraOf(s)}" style="--c1:${s.colors[0]};animation-delay:${Math.min(k,8)*60}ms"><img class="sym" loading="lazy" referrerpolicy="no-referrer" src="https://images.pokemontcg.io/${s.ptcg}/symbol.png" onerror="this.remove()">
 <div class="logo">${img(logoSrcs(s),s.name,"").replace("<img ",'<img loading="lazy" decoding="async" data-ph="txtlogo" '+logoSet(s))}</div><h3>${esc(s.name)}</h3><small>${s.year}</small></div>`;
const pkNorm=t=>String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/[^a-z0-9.]+/g," ").trim();
const pkHay=new Map(PKS.map(([s])=>[s.dex,pkNorm([s.name,s.dex,s.ptcg,s.year,(ERAS.find(e=>e[0]===eraOf(s))||[])[1]].join(" "))]));
function pkMatch(s){if(PK.f==="own"&&!pkOwn(s))return false;if(!PK.q)return true;const h=pkHay.get(s.dex);return pkNorm(PK.q).split(" ").every(w=>h.includes(w))}
function renderPicker(){const C=pkCollapsed(),srch=!!PK.q||PK.f!=="all";let html="",tot=0;
 for(const [g,label] of ERAS){const all=PKS.filter(([s])=>eraOf(s)===g);if(!all.length)continue;const l=all.filter(([s])=>pkMatch(s));if(srch&&!l.length)continue;tot+=l.length;
  const shut=!srch&&C[g];html+=`<h2 class="era${shut?" shut":""}" data-era="${g}" role="button" tabindex="0" aria-expanded="${!shut}"><span>${label}</span><small>${srch?l.length+" of ":""}${all.length} set${all.length>1?"s":""}</small><i class="chev" aria-hidden="true"></i></h2>`;
  if(!shut)html+=l.map(([s,i],k)=>pkTile(s,i,k)).join("")}
 const box=$("sets"),keep=[...box.querySelectorAll(".btile,.atile")];box.querySelectorAll(":scope>.era,:scope>.tile[data-i],:scope>.pkempty").forEach(e=>e.remove());
 const bar=$("pkbar");bar.insertAdjacentHTML("afterend",html+(tot?"":`<p class="pkempty">No sets match “${esc(PK.q)}”.</p>`));
 $("pkn").textContent=srch?`${tot} match${tot===1?"":"es"}`:`${PKS.length} sets`;}
$("sets").innerHTML=`<div id="pkbar" class="pkbar"><div class="pkq"><input id="setq" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" placeholder="Search ${PKS.length} sets: name, year, era…" aria-label="Search sets"><b id="pkn"></b></div>
 <div class="pkchips" role="tablist"><button data-f="all" class="on" role="tab">All</button><button data-f="own" role="tab">Started</button><button data-x="1" class="ghostc">Expand all</button></div></div>`;
renderPicker();
{let tq=0;$("setq").addEventListener("input",e=>{clearTimeout(tq);tq=setTimeout(()=>{PK.q=e.target.value.trim();renderPicker()},90)})}
$("pkbar").querySelectorAll(".pkchips button").forEach(b=>b.onclick=()=>{if(b.dataset.x){const C=pkCollapsed(),any=ERAS.some(([g])=>C[g]);ERAS.forEach(([g])=>{if(any)delete C[g];else C[g]=1});try{localStorage.setItem("ppsEraC",JSON.stringify(C))}catch(e){}
  b.textContent=any?"Collapse all":"Expand all";renderPicker();return}
 PK.f=b.dataset.f;$("pkbar").querySelectorAll("[data-f]").forEach(x=>x.classList.toggle("on",x===b));renderPicker()});
function pkToggle(g){const C=pkCollapsed();if(C[g])delete C[g];else C[g]=1;try{localStorage.setItem("ppsEraC",JSON.stringify(C))}catch(e){}renderPicker();
 const h=document.querySelector(`#sets .era[data-era="${g}"]`);if(h&&!C[g]){const r=h.getBoundingClientRect();if(r.top<0||r.top>innerHeight*.6)h.scrollIntoView({block:"start",behavior:"smooth"})}}
/* reveal one set's tile (expands its era, clears a search that hides it) */
window.pkReveal=function(i){const s=SETS[i];if(!s||s.game==="lor")return;const C=pkCollapsed();if(PK.q||PK.f!=="all"){PK.q="";PK.f="all";$("setq").value="";$("pkbar").querySelectorAll("[data-f]").forEach(x=>x.classList.toggle("on",x.dataset.f==="all"))}
 if(C[eraOf(s)]){delete C[eraOf(s)];try{localStorage.setItem("ppsEraC",JSON.stringify(C))}catch(e){}}renderPicker()};
$("sets").addEventListener("click",e=>{const h=e.target.closest(".era[data-era]");if(h){pkToggle(h.dataset.era);return}const t=e.target.closest(".tile[data-i]");if(t)chooseSet(SETS[t.dataset.i])});
$("sets").addEventListener("keydown",e=>{const h=e.target.closest&&e.target.closest(".era[data-era]");if(h&&(e.key==="Enter"||e.key===" ")){e.preventDefault();pkToggle(h.dataset.era)}});
{const l=SETS.map((s,i)=>[s,i]).filter(([s])=>s.game==="lor").reverse();
 $("lsets").innerHTML=`<h2 class="era" data-era="lor"><span>Disney Lorcana</span><small>${l.length} sets</small></h2>`+l.map(([s,i],k)=>`<div class="tile ltile" data-i="${i}" style="--c1:${s.colors[0]};animation-delay:${Math.min(k,8)*60}ms">
 <div class="logo">${img(logoSrcs(s),s.name,"").replace("<img ",'<img loading="lazy" decoding="async" data-ph="txtlogo" '+logoSet(s))}</div><h3>${esc(s.name)}</h3><small>${s.year}</small></div>`).join("")}
document.querySelectorAll("#lsets .tile[data-i]").forEach(t=>t.onclick=()=>chooseSet(SETS[t.dataset.i]));
'''
s=s[:a]+NEW+s[b:]
# utility tiles (binders / achievements) sit right under the search bar instead of after ~130 sets
old='''$("sets").insertAdjacentHTML("beforeend",bt);'''
assert s.count(old)==1;s=s.replace(old,'''$("pkbar").insertAdjacentHTML("afterend",bt);''')
old='''$("sets").insertAdjacentHTML("beforeend",t);'''
assert s.count(old)==1;s=s.replace(old,'''{const b=document.querySelector("#sets .btile");b?b.insertAdjacentHTML("afterend",t):$("pkbar").insertAdjacentHTML("afterend",t)}''')
# shelf: era groups, collapsed when empty, counts from the stored card count (lists fetched only for sets you own cards in)
a=s.find('async function openShelf(g){');b=s.find('\nlet B={s:null',a);assert a>0 and b>a
SH=r'''const SHC={};
async function openShelf(g){if(g)GAME=g==="lor"?"lor":"pkm";const G=GAME;show("vShelf");$("status").textContent="Your binders — tap one to open it.";
 const bnd=(s,i,k)=>`<div class="binder" data-i="${i}" style="--a:${s.colors[0]};--b:${s.colors[1]};animation-delay:${Math.min(k,10)*50}ms"><div class="spine"></div><div class="cover">
  <div class="blogo">${s.energy?'<div class="txtlogo">BASIC ENERGY</div>':img(logoSrcs(s),s.name,"").replace("<img ",'<img decoding="async" loading="lazy" data-ph="txtlogo" '+logoSet(s))}</div><div class="bname">${esc(s.name)}</div>
  <div class="bprog"><i style="width:0"></i></div><div class="bcount loading skel" id="bc${i}"></div></div></div>`;
 let body="";if(G==="lor")body=BSETS.map((s,i)=>[s,i]).filter(([s])=>s.game==="lor").map(([s,i],k)=>bnd(s,i,k)).join("");
 else for(const [eg,label] of ERAS){const l=BSETS.map((s,i)=>[s,i]).filter(([s])=>s.game!=="lor"&&eraOf(s)===eg).sort((a,b)=>setRel(b[0]).localeCompare(setRel(a[0])));if(!l.length)continue;
  const own=l.filter(([s])=>pkOwn(s)).length,shut=SHC[eg]!=null?SHC[eg]:!own&&!["me","sv","swsh","neo","base"].includes(eg);
  body+=`<h2 class="era${shut?" shut":""}" data-era="${eg}" role="button" tabindex="0" aria-expanded="${!shut}"><span>${label}</span><small>${own} of ${l.length} started</small><i class="chev" aria-hidden="true"></i></h2>`+(shut?"":l.map(([s,i],k)=>bnd(s,i,k)).join(""))}
 $("shelf").innerHTML=`<div class="shelfh" role="tablist"><button data-g="pkm" class="${G==="pkm"?"on":""}">Pokémon</button><button data-g="lor" class="${G==="lor"?"on":""}">Disney Lorcana</button></div>`+body;
 document.querySelectorAll("#shelf .binder").forEach(b=>b.onclick=()=>openBinder(BSETS[b.dataset.i]));document.querySelectorAll(".shelfh button").forEach(b=>b.onclick=()=>{setGame(b.dataset.g);openShelf(b.dataset.g)});
 document.querySelectorAll("#shelf .era[data-era]").forEach(h=>{const t=()=>{SHC[h.dataset.era]=!h.classList.contains("shut");openShelf()};h.onclick=t;h.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();t()}}});
 const put=(i,have,tot)=>{const e=$("bc"+i);if(!e)return;e.classList.remove("loading","skel");e.textContent=`${have} / ${tot} · ${tot?Math.round(have/tot*100):0}%`;const b=document.querySelector(`.binder[data-i="${i}"] .bprog i`);if(b)b.style.width=(tot?have/tot*100:0)+"%"};
 document.querySelectorAll("#shelf .binder").forEach(async b=>{const i=+b.dataset.i,s=BSETS[i];const o=owned(s);
  if(!pkOwn(s)&&s.n&&!LISTS[s.dex]){put(i,0,s.n);return}
  try{const l=await setList(s);put(i,l.filter(c=>o[c.n]).length,l.length)}catch(e){const x=$("bc"+i);if(x){x.classList.remove("loading","skel");x.textContent=`${Object.keys(o).length} owned`}}})}'''
s=s[:a]+SH+s[b:]
open(p,'w').write(s);print('picker ok')
