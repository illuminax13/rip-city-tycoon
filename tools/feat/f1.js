/* ==== prefs + settings menu ==== */
const PREF=Object.assign({tilt:true,sound:true,vol:.3,haptics:true},(()=>{try{return JSON.parse(localStorage.getItem("ppsPrefs")||"{}")}catch(e){return{}}})());
const savePref=()=>{try{localStorage.setItem("ppsPrefs",JSON.stringify(PREF))}catch(e){}};
$("setbtn").onclick=e=>{e.stopPropagation();const on=!$("settings").classList.contains("on");$("settings").classList.toggle("on",on);$("setbtn").setAttribute("aria-expanded",on)};
document.addEventListener("click",e=>{if($("settings").classList.contains("on")&&!e.target.closest("#settings,#setbtn")){$("settings").classList.remove("on");$("setbtn").setAttribute("aria-expanded",false)}});
/* first user gesture of the session: iOS needs it for motion permission + audio unlock */
const GESTURE=[];let gestured=false;function onFirstGesture(f){GESTURE.push(f);if(gestured)f()}
const fg=()=>{if(gestured)return;gestured=true;GESTURE.forEach(f=>{try{f()}catch(e){}})};
document.addEventListener("click",fg,true);document.addEventListener("touchend",fg,true);

/* ==== F1: phone-tilt foils (DeviceOrientation -> the same --mx/--my/--rx/--ry the pointer tilt uses) ==== */
const GY={st:"off",n:null,x:0,y:0,tx:0,ty:0,q:0,els:new Set(),events:0};
const hasDO=typeof DeviceOrientationEvent!=="undefined",needPerm=hasDO&&typeof DeviceOrientationEvent.requestPermission==="function";
const coarse=matchMedia("(pointer:coarse)").matches,GRANGE=22;
function tiltNote(t){$("tiltNote").textContent=t||""}
function gyroStart(){if(GY.st==="on")return;GY.st="on";GY.n=null;window.addEventListener("deviceorientation",gyroEv,{passive:true})}
function gyroStop(){window.removeEventListener("deviceorientation",gyroEv);GY.st="off";if(GY.q)cancelAnimationFrame(GY.q);GY.q=0;GY.els.forEach(gyroReset);GY.els.clear()}
async function gyroAsk(force){if(!PREF.tilt||!hasDO)return;
 if(!needPerm){if(coarse||force)gyroStart();return}
 let prior=null;try{prior=localStorage.getItem("ppsGyroPerm")}catch(e){}
 if(prior==="denied"&&!force){GY.st="denied";tiltNote("Motion access was denied. Toggle this on to ask again; touch/drag tilt still works.");return}
 try{const r=await DeviceOrientationEvent.requestPermission();try{localStorage.setItem("ppsGyroPerm",r)}catch(e){}
  if(r==="granted"){gyroStart();tiltNote("")}else{GY.st="denied";tiltNote("Motion access denied — touch/drag tilt still works. (iOS: Settings › Apps › Safari › Motion & Orientation Access)")}}
 catch(e){GY.st="denied";tiltNote("Motion access unavailable here; touch/drag tilt still works.")}}
function gyroNeutral(){GY.n=null}
function gyroReset(el){if(el._ptr)return;el.classList.remove("tilting");el.style.setProperty("--rx","0deg");el.style.setProperty("--ry","0deg")}
function gyroEv(e){if(e.beta==null||e.gamma==null)return;GY.events++;
 const a=window.orientation!=null?+window.orientation:((screen.orientation&&screen.orientation.angle)||0);let X=e.gamma,Y=e.beta;
 if(a===90){X=e.beta;Y=-e.gamma}else if(a===-90||a===270){X=-e.beta;Y=e.gamma}else if(a===180){X=-e.gamma;Y=-e.beta}
 if(!GY.n){GY.n={X,Y};GY.x=GY.y=0}
 let dx=X-GY.n.X,dy=Y-GY.n.Y;dx=((dx+540)%360)-180;dy=((dy+540)%360)-180;
 const cl=v=>Math.max(-1,Math.min(1,v/GRANGE));GY.tx=cl(dx);GY.ty=cl(dy);if(!GY.q)GY.q=requestAnimationFrame(gyroTick)}
function gyroTargets(){const z=$("zoom");if(z&&z.classList.contains("on"))return [...z.querySelectorAll(".card.flipped")];
 if($("viewer").classList.contains("on"))return [...document.querySelectorAll("#vcard .card.flipped")];
 if(!$("vPack").classList.contains("on"))return [];const out=[];const t=typeof topEl==="function"&&topEl();if(t&&t.classList.contains("flipped"))out.push(t);
 document.querySelectorAll("#summary.on .card.flipped").forEach((c,i)=>{if(i<24)out.push(c)});return out}
function gyroTick(t){GY.q=0;const now=t||performance.now(),dt=Math.min(250,Math.max(8,now-(GY.lt&&now-GY.lt<400?GY.lt:now-16.7)));GY.lt=now;const k=1-Math.exp(-dt/96);GY.x+=(GY.tx-GY.x)*k;GY.y+=(GY.ty-GY.y)*k;
 const x=.5+GY.x*.5,y=.5+GY.y*.5,els=gyroTargets(),cur=new Set(els);
 GY.els.forEach(el=>{if(!cur.has(el))gyroReset(el)});GY.els=cur;
 for(const el of els){if(el._ptr)continue;el.classList.add("tilting");const st=el.style;st.setProperty("--ry",((x-.5)*-28).toFixed(2)+"deg");st.setProperty("--rx",((y-.5)*22).toFixed(2)+"deg");st.setProperty("--mx",(100-x*100).toFixed(1)+"%");st.setProperty("--my",(y*100).toFixed(1)+"%")}
 if(Math.abs(GY.tx-GY.x)>.003||Math.abs(GY.ty-GY.y)>.003)GY.q=requestAnimationFrame(gyroTick)}
/* neutral = the angle the phone is held when a card is revealed / zoomed */
{const f=flipTop;flipTop=function(){const r=f.apply(this,arguments);gyroNeutral();return r};const v=viewCard;viewCard=function(){const r=v.apply(this,arguments);gyroNeutral();return r};
 const sm=showSummary;showSummary=function(){const r=sm.apply(this,arguments);gyroNeutral();return r}}
/* mouse tilt wins while the pointer is on the card */
document.addEventListener("pointerover",e=>{const c=e.target.closest&&e.target.closest(".card");if(c&&e.pointerType==="mouse")c._ptr=1},{passive:true});
document.addEventListener("pointerout",e=>{const c=e.target.closest&&e.target.closest(".card");if(c&&(!e.relatedTarget||!c.contains(e.relatedTarget)))c._ptr=0},{passive:true});
$("optTilt").checked=PREF.tilt&&hasDO;$("optTilt").disabled=!hasDO;if(!hasDO)tiltNote("Not supported on this device.");else if(!coarse&&!needPerm)tiltNote("Desktop: move the pointer over a card to tilt it.");
$("optTilt").onchange=e=>{PREF.tilt=e.target.checked;savePref();if(PREF.tilt)gyroAsk(true);else{gyroStop();tiltNote("")}};
onFirstGesture(()=>gyroAsk(false));if(!needPerm&&coarse&&PREF.tilt&&hasDO)gyroStart();
