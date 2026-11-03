// WebKit iPhone 13 screenshots of NEW-hit alerts (git-ignored output in the repo root)
const {webkit,devices}=require('@playwright/test');const H=require('../tests/helpers');
(async()=>{const b=await webkit.launch();const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block',baseURL:'http://127.0.0.1:8765'});const page=await ctx.newPage();
await page.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s',1);localStorage.setItem('pps',JSON.stringify({packs:212,coll:{},hist:[],migrated:1,sets:{}}));localStorage.setItem('ppsNudge',String(Date.now()+9e9));
 localStorage.setItem('ppsAch',JSON.stringify({v:1,u:{},bf:{},st:{},since:Date.now(),toasts:0}))});
await page.goto('/');await page.waitForSelector('.tile');await page.waitForTimeout(8000);await page.evaluate(()=>{ACHS.forEach(a=>{ACH.d.u[a.id]=ACH.d.u[a.id]||Date.now()})});
const fixed=async two=>{if(two){await page.locator('#again').click();await page.waitForFunction(()=>/Swipe the packs|Tap to open/.test(document.body.innerText),null,{timeout:60000});await page.waitForTimeout(400)}else await H.chooseSet(page,12);await H.skipAndLand(page);await page.evaluate(two=>{const all=Object.values(cache[set.dex].pools).flat(),ch=nhChase(set);
 const com=all.filter(c=>c.tier==='common').slice(0,8),dr=all.find(c=>/double rare/i.test(c.rarity)&&!ch.has(keyOf(c.id).join('|'))),top=chRank(set,chCards(cache[set.dex]))[0].c;
 const un=all.filter(c=>c.tier==='uncommon')[0];NEXT={s:set,p:[...com,two?dr:un,two?top:dr].map(c=>({...c}))}},two);await H.tapCenterPack(page);await H.doTear(page)};
await fixed(false);
await page.evaluate(()=>{for(let i=0;i<9;i++){flipTop();sendAway(1)}});await page.waitForTimeout(900);await page.evaluate(()=>flipTop());await page.waitForTimeout(1300);
await page.screenshot({path:'screenshot-new-hit.png'});
await page.evaluate(()=>sendAway(1));await page.waitForSelector('#summary.on');
await fixed(true);await page.locator('#reveal').click();await page.waitForSelector('#summary.on',{timeout:60000});await page.waitForTimeout(1500);await page.evaluate(()=>{const e=document.querySelector('#summary .nhsum')||document.getElementById('summary');window.scrollTo(0,e.getBoundingClientRect().top+scrollY-250)});await page.waitForTimeout(1200);
await page.screenshot({path:'/tmp/nhsumA.png'});
await page.evaluate(()=>{const c=document.querySelectorAll('#summary .sgrid .card');const e=c[c.length-1];window.scrollTo(0,e.getBoundingClientRect().top+scrollY-330)});await page.waitForTimeout(1200);
await page.screenshot({path:'/tmp/nhsumB.png'});
require('child_process').execSync("python3 -c \"from PIL import Image;a=Image.open('/tmp/nhsumA.png');b=Image.open('/tmp/nhsumB.png');o=Image.new('RGB',(a.width+b.width+24,max(a.height,b.height)),(8,10,24));o.paste(a,(0,0));o.paste(b,(a.width+24,0));o.save('screenshot-new-hit-summary.png')\"");await b.close()})();
