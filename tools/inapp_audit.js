// node tools/inapp_audit.js <chromium|webkit> <setIndex,...>   -> tools/audit/inapp-<browser>-<idx>.json
const {chromium,webkit,devices}=require('@playwright/test');const fs=require('fs');
(async()=>{const [bn,idxs]=process.argv.slice(2);const B=bn==='webkit'?webkit:chromium;
 const browser=await B.launch(bn==='webkit'?{}:{executablePath:'/usr/bin/google-chrome'});
 const ctx=await browser.newContext(bn==='webkit'?{...devices['iPhone 13']}:{viewport:{width:1280,height:800}});
 const page=await ctx.newPage();await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');await page.waitForSelector('.tile');
 const out={};
 for(const i of idxs.split(',').map(Number)){
  out[i]=await page.evaluate(async i=>{const s=i===-1?SETBY.sve:SETS[i];let cards;
   if(i===-1){cards=ENERGY.sv}else{const d=await getCards(s);cards=Object.values(d.pools).flat()}
   const box=document.createElement('div');box.style.cssText='position:fixed;left:0;top:0;width:60px;opacity:.01;pointer-events:none;z-index:-1';document.body.appendChild(box);
   const res=[];
   for(let k=0;k<cards.length;k+=40){const ch=cards.slice(k,k+40);box.innerHTML=ch.map(c=>`<div style="width:60px;aspect-ratio:63/88">${img(c.imgs,c.name,c.rarity)}</div>`).join('');
    const t0=performance.now();
    await new Promise(r=>{const chk=()=>{const els=[...box.children].map(d=>d.firstElementChild);const pend=els.filter(e=>e.tagName==='IMG'&&!(e.complete&&e.naturalWidth));if(!pend.length||performance.now()-t0>25000)return r();setTimeout(chk,150)};chk()});
    [...box.children].forEach((d,j)=>{const e=d.firstElementChild,c=ch[j];res.push({id:c.id,name:c.name,rarity:c.rarity,ok:e.tagName==='IMG'&&e.naturalWidth>0,src:e.currentSrc||e.src||null,w:e.naturalWidth||0,h:e.naturalHeight||0,ph:e.tagName!=='IMG',first:c.imgs[0]})})}
   box.remove();return {name:s.name||'sve',n:res.length,bad:res.filter(r=>!r.ok),fallback:res.filter(r=>r.ok&&r.src!==r.first),odd:res.filter(r=>r.ok&&Math.abs(r.h/r.w-88/63)>0.04)}},i);
  const o=out[i];console.log(bn,i,o.name,'n',o.n,'bad',o.bad.length,'fallback',o.fallback.length,'oddAspect',o.odd.length,flush=true);
 }
 fs.writeFileSync(`tools/audit/inapp-${bn}-${idxs.replace(/,/g,'_')}.json`,JSON.stringify(out,null,1));await browser.close()})();
