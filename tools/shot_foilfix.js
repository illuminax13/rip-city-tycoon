// Foil fix check (iPhone 13 WebKit): Ascended Heroes 178 (holo rare), 078 (holo rare), 181 (reverse trainer) + era equivalents, rest vs tilted
// node tools/shot_foilfix.js out.png [webkit|chromium]
const pw=require('@playwright/test');const out=process.argv[2]||'screenshot-foilfix.png',bn=process.argv[3]||'webkit';
(async()=>{const b=await pw[bn].launch(bn==='chromium'?{executablePath:'/usr/bin/google-chrome'}:{});
 const ctx=await b.newContext(bn==='webkit'?{...pw.devices['iPhone 13'],viewport:{width:430,height:1100}}:{viewport:{width:430,height:1100},deviceScaleFactor:3});const page=await ctx.newPage();
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?nosw=1');await page.waitForSelector('.tile');
 const rows=JSON.parse(process.env.ROWS||'[["me02.5","178",false],["me02.5","078",false],["me02.5","181",true]]');
 await page.evaluate(async(rows)=>{const w=document.createElement('div');w.id='foiltest';w.style.cssText='position:fixed;inset:0;z-index:9999;background:#1d2030;display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;padding:8px;align-content:start;perspective:900px;font:600 11px system-ui;color:#cfd5f5';document.body.appendChild(w);
  for(const [dex,lid,rev] of rows){const s=SETS.find(x=>x.dex===dex);const d=await getCards(s);const c=Object.values(d.pools).flat().find(c=>c.id===dex+'-'+lid);
   for(const [mx,my,ry,rx] of [[null],['30%','35%',-12,6]]){const prev=set;set=s;const el=cardEl({...c,rev},0);set=prev;el.style.cssText+=';width:200px;height:279px;margin:0;animation:none';el.classList.add('flipped');
    if(mx){el.classList.add('tilting');el.style.setProperty('--ry',ry+'deg');el.style.setProperty('--rx',rx+'deg');el.style.setProperty('--mx',mx);el.style.setProperty('--my',my)}
    el.querySelector('.tag').textContent=`${c.name} ${lid}${rev?' (rev)':''} · ${mx?'tilted':'rest'}`;el.querySelector('.tag').style.cssText='opacity:1;bottom:-16px';el.style.marginBottom='18px';w.appendChild(el)}}},rows);
 await page.waitForFunction(()=>[...document.querySelectorAll('#foiltest img')].every(i=>i.complete),null,{timeout:60000}).catch(()=>{});
 await page.waitForTimeout(3200);await page.screenshot({path:out});
 const cls=await page.$$eval('#foiltest .card',e=>e.map(x=>x.className));console.log(cls.filter((x,i)=>i%2==0).join('\n'));await b.close()})();
