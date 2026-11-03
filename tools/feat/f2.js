/* ==== F2: sound (WebAudio synth, no files) + haptics ==== */
const SND={ctx:null,master:null,noise:null,n:0,last:{},played:[]};
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function sndInit(){if(SND.ctx)return SND.ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
 try{const c=new AC();SND.ctx=c;SND.master=c.createGain();SND.master.connect(c.destination);sndVol();
  const b=c.createBuffer(1,c.sampleRate*1.5,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noise=b;
  /* unlock (iOS): play a silent buffer inside the gesture */const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);
  document.addEventListener("visibilitychange",()=>{try{const r=document.hidden?c.suspend&&c.suspend():PREF.sound?c.resume&&c.resume():0;r&&r.catch&&r.catch(()=>{})}catch(e){}})}catch(e){SND.ctx=null}return SND.ctx}
function sndVol(){if(SND.master)SND.master.gain.value=PREF.sound?Math.max(0,Math.min(1,PREF.vol))*.5:0}
function ok(kind,gap){if(!PREF.sound||!SND.ctx||SND.ctx.state==="closed")return false;const now=performance.now();if(SND.last[kind]&&now-SND.last[kind]<gap)return false;SND.last[kind]=now;if(SND.ctx.state==="suspended"){try{const r=SND.ctx.resume();r&&r.catch&&r.catch(()=>{})}catch(e){}}SND.n++;SND.played.push(kind);if(SND.played.length>50)SND.played.shift();return true}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
function noiseHit(t,dur,freq,q,peak,type="bandpass",rate=1){const c=SND.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=SND.noise;s.playbackRate.value=rate;f.type=type;f.frequency.value=freq;f.Q.value=q;
 s.connect(f);f.connect(g);g.connect(SND.master);env(g,t,.002,peak,dur);s.start(t,Math.random()*1.2,dur+.05)}
function tone(t,freq,dur,peak,type="sine",a=.005){const c=SND.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.connect(g);g.connect(SND.master);env(g,t,a,peak,dur);o.start(t);o.stop(t+a+dur+.05)}
const sfx={
 tick(){if(!ok("tick",28))return;const t=SND.ctx.currentTime;noiseHit(t,.012,3200,6,.22);tone(t,1900,.018,.05,"triangle",.001)},
 crinkle(a){if(!ok("crinkle",30))return;const t=SND.ctx.currentTime,v=Math.min(.32,.06+a*4);for(let i=0;i<3;i++)noiseHit(t+i*.009*Math.random(),.02+Math.random()*.025,2600+Math.random()*4200,1.4,v*(.5+Math.random()*.5),"highpass",.7+Math.random()*.8)},
 rip(){if(!ok("rip",200))return;const t=SND.ctx.currentTime;noiseHit(t,.16,3800,.7,.3,"highpass",1.3);noiseHit(t+.03,.12,1800,1,.14)},
 snap(){if(!ok("snap",40))return;const t=SND.ctx.currentTime;noiseHit(t,.03,2400,2.2,.28);tone(t,210,.06,.12,"sine",.002)},
 chime(tr){if(!ok("chime",120))return;const t=SND.ctx.currentTime,n=Math.max(2,Math.min(6,tr-1)),base=[0,0,0,659.3,783.99,880,987.77][Math.min(6,tr)]||659.3,steps=[1,1.25,1.5,2,2.5,3];
  for(let i=0;i<n;i++){tone(t+i*.075,base*steps[i],.5+i*.08,.10+.015*i,"sine",.004);tone(t+i*.075,base*steps[i]*2,.25,.025,"triangle",.004)}},
 fanfare(){if(!ok("fanfare",600))return;const t=SND.ctx.currentTime,ch=[[523.25,659.25,783.99],[587.33,739.99,880],[659.25,830.61,987.77,1318.5]];
  ch.forEach((c,k)=>c.forEach(f=>{tone(t+k*.2,f,k===2?1.3:.32,.07,"triangle",.01);tone(t+k*.2,f*2,k===2?.9:.2,.02,"sine",.01)}));for(let i=0;i<8;i++)tone(t+.6+i*.06,1568*(1+i*.12),.25,.03,"sine",.002)}};
/* haptics: Android vibrate; iOS Safari 18+ fires a haptic when a <input type=checkbox switch> is toggled via its label */
let HSW=null;if(isIOS&&!navigator.vibrate){const l=document.createElement("label");l.setAttribute("aria-hidden","true");l.style.cssText="position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
 const i=document.createElement("input");i.type="checkbox";i.setAttribute("switch","");i.tabIndex=-1;l.appendChild(i);document.body.appendChild(l);if("switch" in i)HSW=l}
const HAP={n:0};function haptic(p){if(!PREF.haptics)return;HAP.n++;try{if(navigator.vibrate){navigator.vibrate(p);return}if(HSW)HSW.click()}catch(e){}}
onFirstGesture(()=>{sndInit();if(SND.ctx&&SND.ctx.resume)SND.ctx.resume()});
/* hooks */
{const d=draw;draw=function(){const a=lastTick;const r=d.apply(this,arguments);if(a>=0&&lastTick!==a&&state!=="loading")sfx.tick();return r}}
{const f=flipTop;flipTop=function(){const el=topEl(),c=current[topI],was=el&&el.classList.contains("flipped");const r=f.apply(this,arguments);
  if(c&&!was){sfx.snap();haptic(8);const t=TIERS[c.tier]||0;if(current.god&&c.gh){if(!current.godFan){current.godFan=1;sfx.fanfare();haptic([30,60,30,60,80])}}
   else if(c.era==="lor"&&t>=6){sfx.fanfare();haptic([30,60,30,60,80])}else if(t>=3){setTimeout(()=>sfx.chime(t),90);haptic(t>=5?[20,40,30]:[15,30])}}return r}}
{let poll=0,prev=0;const tr=$("tear");if(tr)new MutationObserver(()=>{const c=tr.classList;if(c.contains("rip")){if(!tr._ripped){tr._ripped=1;sfx.rip();haptic(18)}}else tr._ripped=0;
 if(c.contains("drag")&&!poll){prev=window.__tearCur||0;const f=()=>{const q=window.__tearCur||0,dq=q-prev;prev=q;if(dq>.004)sfx.crinkle(dq);poll=tr.classList.contains("drag")?requestAnimationFrame(f):0};poll=requestAnimationFrame(f)}}).observe(tr,{attributes:true,attributeFilter:["class"]})}
/* settings */
$("optSound").checked=PREF.sound;$("optVol").value=Math.round(PREF.vol*100);$("optHap").checked=PREF.haptics;
if(!navigator.vibrate&&!HSW){$("optHap").disabled=true;$("hapNote").textContent=isIOS?"Haptics need iOS 18+ Safari.":"No vibration on this device."}
$("optSound").onchange=e=>{PREF.sound=e.target.checked;savePref();sndInit();sndVol();if(PREF.sound)sfx.snap()};
$("optVol").oninput=e=>{PREF.vol=e.target.value/100;savePref();sndVol()};$("optVol").onchange=()=>sfx.tick();
$("optHap").onchange=e=>{PREF.haptics=e.target.checked;savePref();if(PREF.haptics)haptic(15)};
