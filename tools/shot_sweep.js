// Reveal-sweep check on iPhone 13 WebKit: Prismatic god pack (?god=1), screenshot the top hit card during and after its reveal sweep.
const {webkit,devices}=require('@playwright/test');
(async()=>{const b=await webkit.launch();const ctx=await b.newContext({...devices['iPhone 13']});const page=await ctx.newPage();
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?god=1');await page.waitForSelector('.tile');
 await page.evaluate(async()=>{const s=SETS.find(x=>x.dex==='sv08.5');await chooseSet(s);const d=await getCards(s);NEXT={s,p:buildPack(s,d.pools)};openPack()});
 await page.waitForSelector('#vPack.on');await page.waitForTimeout(900);
 await page.evaluate(()=>{for(let i=0;i<current.length-1;i++){flipTop();sendAway(1)}});await page.waitForTimeout(700);
 await page.evaluate(()=>flipTop());await page.waitForTimeout(250);
 for(const [n,ms] of [['a',700],['b',500],['c',2200]]){await page.waitForTimeout(ms);await page.screenshot({path:`/tmp/sweep-${n}.png`})}
 await b.close()})();
