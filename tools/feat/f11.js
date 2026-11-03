/* f11: Backup (export/import) + persistent storage + Home Screen nudge (Safari can clear site data after ~7 days unused unless installed) */
const BK={v:1,at:"ppsBackupAt",undo:"ppsUndo",nudge:"ppsNudge",skip:/^(ppsPrice|ppsPtcgDown|ppsGyroPerm|ppsNudge|ppsUndo|ppsBackupAt)$/};
function bkKeys(){const ks=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^pps/.test(k)&&!BK.skip.test(k))ks.push(k)}}catch(e){}return ks.sort()}
function bkCounts(data){let p={};try{p=JSON.parse(data.pps||"{}")||{}}catch(e){}const S=p.sets||{};let u=0,sets=0;for(const d in S){const n=Object.values(S[d]||{}).filter(e=>e&&e.n>0).length;if(n){sets++;u+=n}}
 let a=0;try{a=Object.keys((JSON.parse(data.ppsAch||"{}")||{}).u||{}).length}catch(e){}return {packs:+p.packs||0,unique:u,sets,ach:a,hist:(p.hist||[]).length}}
function bkSnapshot(){const data={};for(const k of bkKeys())data[k]=localStorage.getItem(k);return data}
function bkFile(){const data=bkSnapshot(),now=new Date(),o={app:"rippermon",kind:"backup",v:BK.v,exported:now.toISOString(),counts:bkCounts(data),data};
 const name=`rippermon-backup-${now.toISOString().slice(0,10)}.json`;return {name,blob:new Blob([JSON.stringify(o)],{type:"application/json"}),o}}
function bkToast(t,act){let e=$("bktoast");if(!e){e=document.createElement("div");e.id="bktoast";e.setAttribute("role","status");document.body.appendChild(e)}
 e.innerHTML=`<span>${esc(t)}</span>`+(act?`<button class="ghost" id="bktAct">${esc(act[0])}</button>`:"");if(act)$("bktAct").onclick=()=>{e.classList.remove("on");act[1]()};
 e.classList.add("on");clearTimeout(bkToast.t);bkToast.t=setTimeout(()=>e.classList.remove("on"),act?9000:3200)}
async function bkExport(){const {name,blob,o}=bkFile();const done=()=>{try{localStorage.setItem(BK.at,String(Date.now()))}catch(e){}bkNote();bkToast(`Backup saved · ${o.counts.packs.toLocaleString()} packs`)};
 try{const f=new File([blob],name,{type:"application/json"});if(navigator.canShare&&navigator.share&&navigator.canShare({files:[f]})&&/iP(hone|ad|od)|Android/.test(navigator.userAgent)){await navigator.share({files:[f],title:"Rippermon backup"});done();return}}
 catch(e){if(e&&e.name==="AbortError")return;/* share failed: fall back to a download */}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);done()}
function bkParse(txt){let j;try{j=JSON.parse(txt)}catch(e){throw Error("This file isn't a Rippermon backup (not JSON).")}
 if(j&&j.app==="rippermon"&&j.data&&typeof j.data==="object"){if((j.v||1)>BK.v)throw Error("This backup is from a newer version of the app. Reload to update first.");const data={};for(const [k,v] of Object.entries(j.data))if(/^pps/.test(k)&&!BK.skip.test(k)&&typeof v==="string")data[k]=v;j={...j,data}}
 else if(j&&j.sets&&typeof j.sets==="object"&&"packs" in j)j={app:"rippermon",v:1,exported:"",data:{pps:JSON.stringify(j)}};/* a raw collection (localStorage "pps") */
 else throw Error("This file isn't a Rippermon backup.");
 let p;try{p=JSON.parse(j.data.pps||"null")}catch(e){}if(!p||typeof p!=="object"||!p.sets||typeof p.sets!=="object")throw Error("The backup has no collection in it.");
 j.counts=bkCounts(j.data);return j}
/* merge: never double counts — per card the higher count wins, unlocked achievements are combined */
function bkMerge(cur,inc){const out={...cur};const J=s=>{try{return JSON.parse(s||"null")}catch(e){return null}};
 const a=J(cur.pps)||{packs:0,coll:{},hist:[],sets:{}},b=J(inc.pps)||{};const m={...b,...a};
 m.packs=Math.max(+a.packs||0,+b.packs||0);m.sets={};
 for(const S of [a.sets||{},b.sets||{}])for(const [d,o] of Object.entries(S))for(const [n,e] of Object.entries(o||{})){const t=(m.sets[d]=m.sets[d]||{})[n];if(!t){m.sets[d][n]={...e};continue}
  if((e.n||0)>(t.n||0))t.n=e.n;if((e.rv||0)>(t.rv||0))t.rv=e.rv;for(const k in e)if(t[k]==null)t[k]=e[k]}
 m.coll={...(b.coll||{})};for(const [id,e] of Object.entries(a.coll||{})){const t=m.coll[id];m.coll[id]=t?{...t,...e,n:Math.max(e.n||0,t.n||0)}:e}
 const useB=(+b.packs||0)>(+a.packs||0);m.hist=(useB?b.hist:a.hist)||[];if(useB?b.histC:a.histC)m.histC=useB?b.histC:a.histC;
 out.pps=JSON.stringify(m);
 const x=J(cur.ppsAch),y=J(inc.ppsAch);if(y){const r=x?{...y,...x}:y;if(x){r.u={...(y.u||{}),...(x.u||{})};for(const k in y.u||{})if(x.u&&x.u[k]&&+y.u[k]<+x.u[k])r.u[k]=y.u[k];r.bf={...(y.bf||{}),...(x.bf||{})};r.st={...(y.st||{})};for(const k in x.st||{})r.st[k]=Math.max(+x.st[k]||0,+r.st[k]||0);r.bt={...(y.bt||{}),...(x.bt||{})};if(y.since&&x.since)r.since=Math.min(y.since,x.since)}out.ppsAch=JSON.stringify(r)}
 for(const [k,v] of Object.entries(inc))if(!(k in out))out[k]=v;return out}
function bkWrite(data){/* replace every app key with the new set (keys the app owns only); restore if the device refuses (quota) */
 const before=bkSnapshot();try{for(const k of bkKeys())if(!(k in data))localStorage.removeItem(k);for(const [k,v] of Object.entries(data))localStorage.setItem(k,v);return true}
 catch(e){try{for(const k of bkKeys())localStorage.removeItem(k);for(const [k,v] of Object.entries(before))localStorage.setItem(k,v)}catch(_){}return false}}
let bkPending=null;
function bkPreview(j){bkPending=j;const c=j.counts,cur=bkCounts(bkSnapshot()),d=$("bkdlg");const f=n=>(+n||0).toLocaleString();
 d.querySelector(".bkbody").innerHTML=`<table><tr><th></th><th>This device</th><th>Backup</th></tr>
  <tr><td>Packs</td><td>${f(cur.packs)}</td><td>${f(c.packs)}</td></tr><tr><td>Unique cards</td><td>${f(cur.unique)}</td><td>${f(c.unique)}</td></tr>
  <tr><td>Sets started</td><td>${f(cur.sets)}</td><td>${f(c.sets)}</td></tr><tr><td>Achievements</td><td>${f(cur.ach)}</td><td>${f(c.ach)}</td></tr></table>`+
  (j.exported?`<div class="note">Backup made ${esc(new Date(j.exported).toLocaleString())}</div>`:"");
 d.querySelector('input[value="merge"]').checked=true;d.classList.add("on");d.querySelector("#bkGo").focus()}
function bkApply(mode){const j=bkPending;if(!j)return;const cur=bkSnapshot(),next=mode==="replace"?j.data:bkMerge(cur,j.data);
 try{sessionStorage.setItem(BK.undo,JSON.stringify({t:Date.now(),mode,data:cur}))}catch(e){}window.__bkUndo=cur;
 if(!bkWrite(next)){$("bkdlg").classList.remove("on");bkToast("Import failed: not enough storage on this device. Nothing was changed.");return}
 try{sessionStorage.setItem("ppsImported",mode)}catch(e){}location.reload()}
function bkUndo(){let u=null;try{u=JSON.parse(sessionStorage.getItem(BK.undo)||"null")}catch(e){}const data=(u&&u.data)||window.__bkUndo;if(!data)return;
 if(bkWrite(data)){try{sessionStorage.removeItem(BK.undo);sessionStorage.setItem("ppsImported","undone")}catch(e){}location.reload()}}
function bkAgo(){const t=+localStorage.getItem(BK.at)||0;if(!t)return null;return Math.floor((Date.now()-t)/864e5)}
function bkNote(){const e=$("bkNote");if(!e)return;const d=bkAgo(),p=store.packs||0;let t,warn=0;
 if(d===null){t="No backup yet.";warn=p>=20}else{t=d===0?"Last backup: today.":d===1?"Last backup: yesterday.":`Last backup: ${d} days ago.`;warn=d>=14&&p>=20}
 if(warn)t+=` Export a copy so your ${p.toLocaleString()} packs are safe.`;let u=null;try{u=sessionStorage.getItem(BK.undo)}catch(e){}
 e.innerHTML=esc(t)+(u?' <button class="ghost" id="bkUndo">Undo import</button>':"");e.classList.toggle("warn",!!warn);if(u)$("bkUndo").onclick=bkUndo}
(function bkUI(){const s=$("settings");if(!s||$("bkExp"))return;
 s.insertAdjacentHTML("beforeend",`<h4 class="bkh">Backup</h4><div class="bkrow"><button class="ghost" id="bkExp">Export collection</button><button class="ghost" id="bkImp">Import…</button></div><div class="note" id="bkNote"></div><input type="file" id="bkFile" accept=".json,application/json" hidden>`);
 document.body.insertAdjacentHTML("beforeend",`<div id="bkdlg" role="dialog" aria-modal="true" aria-label="Import backup"><div class="bkcard"><h4>Import backup</h4><div class="bkbody"></div>
  <div class="bkmode"><label><input type="radio" name="bkm" value="merge"> <b>Merge</b><small>Add the backup's cards to this device (the higher count wins)</small></label><label><input type="radio" name="bkm" value="replace"> <b>Replace</b><small>This device's collection becomes the backup</small></label></div>
  <div class="note">You can undo this from Settings until you close the app.</div><div class="bkbtns"><button class="ghost" id="bkCancel">Cancel</button><button id="bkGo">Import</button></div></div></div>`);
 $("bkExp").onclick=()=>bkExport().catch(e=>bkToast("Export failed: "+(e&&e.message||e)));$("bkImp").onclick=()=>{$("bkFile").value="";$("bkFile").click()};
 $("bkFile").onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{bkPreview(bkParse(await f.text()))}catch(err){bkToast(err.message||"Could not read that file.")}};
 $("bkCancel").onclick=()=>{bkPending=null;$("bkdlg").classList.remove("on")};$("bkdlg").addEventListener("click",e=>{if(e.target.id==="bkdlg")$("bkCancel").click()});
 $("bkGo").onclick=()=>bkApply(($("bkdlg").querySelector("input[name=bkm]:checked")||{}).value||"merge");
 bkNote();for(const b of [$("setbtn"),$("ssetbtn")])b&&b.addEventListener("click",bkNote);
 let imp=null;try{imp=sessionStorage.getItem("ppsImported");sessionStorage.removeItem("ppsImported")}catch(e){}
 if(imp==="undone")bkToast("Import undone");else if(imp)bkToast(`Backup ${imp==="replace"?"restored":"merged"} · ${(store.packs||0).toLocaleString()} packs`,["Undo",bkUndo])})();
/* ask the browser to keep our storage (Chrome/Firefox grant it for engaged/installed sites; Safari exempts Home Screen apps) */
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>p||navigator.storage.persist()).catch(()=>{})}catch(e){}
/* Home Screen nudge: iOS browsers, not installed, after 20+ packs; "Not now" snoozes 7 days */
function nudgeIOS(){return /iP(hone|od|ad)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
function nudgeStandalone(){return navigator.standalone===true||["standalone","fullscreen","minimal-ui"].some(m=>matchMedia(`(display-mode: ${m})`).matches)}
function nudgeCheck(){const e=$("a2hs");if(!nudgeIOS()||nudgeStandalone()||(store.packs||0)<20){if(e)e.remove();return}
 let until=0;try{until=+localStorage.getItem(BK.nudge)||0}catch(_){}if(Date.now()<until){if(e)e.remove();return}
 const busy=document.querySelector("#vPack.on,#tear.on,#viewer.on,#summary.on,#bkdlg.on,#settings.on,#chsheet.on,#boxv.on");if(busy||e)return;
 document.body.insertAdjacentHTML("beforeend",`<div id="a2hs" role="note"><div class="a2t"><b>Keep your collection safe</b><span>Safari can clear websites you haven't opened for a week. Add Rippermon to your Home Screen and it's never cleared: tap <svg viewBox="0 0 24 24" aria-label="Share"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Share → <b>Add to Home Screen</b>.</span></div><button class="ghost" id="a2x" aria-label="Not now">Not now</button></div>`);
 requestAnimationFrame(()=>$("a2hs")&&$("a2hs").classList.add("on"));
 $("a2x").onclick=()=>{try{localStorage.setItem(BK.nudge,String(Date.now()+7*864e5))}catch(_){}const b=$("a2hs");b.classList.remove("on");setTimeout(()=>b.remove(),300)}}
setTimeout(nudgeCheck,2500);document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(nudgeCheck,1500)});
{const c=$("count");if(c&&window.MutationObserver)new MutationObserver(()=>setTimeout(nudgeCheck,4000)).observe(c,{childList:true,characterData:true,subtree:true})}
