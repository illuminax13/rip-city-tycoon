// Screenshot: previously-broken Ascended Heroes cards (Mega Hawlucha ex #116 etc.) rendering in the reveal stack + summary (iPhone 13, WebKit)
const {webkit,devices}=require('@playwright/test');
(async()=>{const b=await webkit.launch();const ctx=await b.newContext({...devices['iPhone 13']});const page=await ctx.newPage();
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765/');await page.waitForSelector('.tile');
 await page.evaluate(async()=>{const s=SETS[13];await chooseSet(s);await getCards(s);const all=Object.values(cache[s.dex].pools).flat();
  const ids=['me02.5-130','me02.5-150','me02.5-199','me02.5-207','me02.5-073','me02.5-271','me02.5-061','me02.5-183','me02.5-192','me02.5-116'];
  const pack=ids.map(id=>({...all.find(c=>c.id===id)}));NEXT={s,p:pack};openPack()});
 await page.waitForSelector('#vPack.on');await page.waitForTimeout(800);
 await page.evaluate(()=>{for(let i=0;i<current.length-1;i++){flipTop();sendAway(1)}});await page.waitForTimeout(600);
 await page.evaluate(()=>flipTop());await page.waitForFunction(()=>{const i=document.querySelector('#stack .front img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:30000});await page.waitForTimeout(1800);
 await page.evaluate(()=>{const im=[...document.querySelectorAll('#stack img')].map(i=>[i.alt,i.naturalWidth,i.currentSrc]);console.log(JSON.stringify(im))});
 const r=await page.evaluate(()=>[...document.querySelectorAll('#stack .front img')].map(i=>({alt:i.alt,w:i.naturalWidth,src:i.currentSrc})));console.log(JSON.stringify(r));
 await page.screenshot({path:'screenshot-cardfix.png'});await b.close()})();
