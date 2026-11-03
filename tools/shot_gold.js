// Gold/hyper zoom check: node tools/shot_gold.js <prefix> [webkit|chromium]  -> <prefix>-<card>-<rest|tilt>.png (iPhone 13 viewport)
const pw=require('@playwright/test');
const pre=process.argv[2]||'screenshot-gold',bn=process.argv[3]||'webkit';
const CARDS=[['dragonite','me02.5-295'],['pikachu','sv08.5-179'],['sv-gold','sv08-250']];
(async()=>{const b=await pw[bn].launch(bn==='chromium'?{executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
 const ctx=await b.newContext({...pw.devices['iPhone 13'],...(bn==='firefox'?{isMobile:undefined,hasTouch:undefined}:{})});const page=await ctx.newPage();
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?nosw=1');await page.waitForSelector('.tile');
 for(const [nm,id] of CARDS){
  await page.evaluate(async id=>{const s=setOfId(id);const d=await getCards(s);const c=Object.values(d.pools).flat().find(x=>x.id===id);openZoom([{c:{...c,tier:tier(c.rarity)},s}],0)},id);
  await page.waitForFunction(()=>{const i=document.querySelector('#vcard .front img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:40000}).catch(()=>{});
  await page.waitForTimeout(2600);await page.screenshot({path:`${pre}-${nm}-rest.png`});
  await page.evaluate(()=>{const el=document.querySelector('#vcard .card');el.classList.add('tilting');el.style.setProperty('--ry','-12deg');el.style.setProperty('--rx','8deg');el.style.setProperty('--mx','30%');el.style.setProperty('--my','32%')});
  await page.waitForTimeout(700);await page.screenshot({path:`${pre}-${nm}-tilt.png`});
  console.log(nm,await page.evaluate(()=>[document.querySelector('#vcard .card').className,document.querySelector('#vcard .front img').currentSrc,document.getElementById('zprice').textContent].join(' | ')));
  await page.evaluate(()=>closeZoom())}
 await b.close()})();
