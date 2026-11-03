// WebKit iPhone 13 screenshots of the chase list (git-ignored output in the repo root)
const {webkit,devices}=require('@playwright/test');
(async()=>{const b=await webkit.launch();const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const page=await ctx.newPage();
await page.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s',1);localStorage.setItem('pps',JSON.stringify({packs:412,coll:{},hist:[],migrated:1,sets:{'sv08.5':{
 '161':{name:'Umbreon ex',rarity:'Special Illustration Rare',n:1,lid:'161'},'156':{name:'Sylveon ex',rarity:'Special Illustration Rare',n:2,lid:'156'},'144':{name:'Leafeon ex',rarity:'Special Illustration Rare',n:1,lid:'144'}}}}));localStorage.setItem('ppsNudge',String(Date.now()+9e9))});
await page.goto('http://127.0.0.1:8765/');await page.waitForSelector('.tile');await page.waitForTimeout(9000);
await page.locator('.tile[data-i="13"]').click();await page.waitForFunction(()=>/Swipe the packs|Tap to open/.test(document.body.innerText),null,{timeout:60000});await page.waitForTimeout(800);
await page.screenshot({path:'screenshot-chase-button.png'});
await page.locator('#schase').click();await page.waitForFunction(()=>window.__chase&&window.__chase.odds,null,{timeout:30000});await page.waitForTimeout(2500);
await page.screenshot({path:'screenshot-chase.png'});
await page.evaluate(()=>{chaseClose();return openBinder(SETBY['sv08.5'])});await page.locator('.bfilt button[data-f="chase"]').click();
await page.waitForFunction(()=>window.__chase&&window.__chase.odds&&document.querySelector('#bchase .chrow'),null,{timeout:30000});await page.waitForTimeout(2500);
await page.screenshot({path:'screenshot-chase-binder.png'});await b.close()})();
