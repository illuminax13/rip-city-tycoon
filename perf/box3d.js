// 3D box frame times at 4x CPU throttle (Chromium, iPhone-sized viewport): idle float, drag-rotate, tear, lid open, open-lid rotate
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
const H=require('../tests/helpers.js');await page.goto('http://127.0.0.1:8765/');await page.waitForSelector('.tile');
await page.evaluate(()=>chooseSet(SETS[12]));await page.waitForTimeout(2500);await page.locator('#sbox').click();await page.locator('#bx3d .bxscene').waitFor();await page.waitForTimeout(800);
const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const rec=()=>page.evaluate(()=>{window.__f=[];let l=performance.now();const t=n=>{window.__f.push(n-l);l=n;if(window.__f.length<2000)requestAnimationFrame(t)};requestAnimationFrame(t)});
const get=()=>page.evaluate(()=>{const f=window.__f.slice(1);window.__f=[];f.sort((a,b)=>a-b);return {n:f.length,mean:+(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1),p95:+f[Math.floor(f.length*.95)].toFixed(1),max:+f[f.length-1].toFixed(1)}});
const out={};await rec();await page.waitForTimeout(1500);out.idle=await get();
await H.boxDrag(page,.5,.3,.5,.6,20);out.dragRotate=await get();
if(process.env.NOP)await page.evaluate(process.env.NOP);await H.tearWrap(page);out.tear=await get();
await H.openLid(page);out.lid=await get();
await H.boxDrag(page,.3,.5,.7,.5,20);await page.waitForTimeout(400);out.openRotate=await get();
console.log(JSON.stringify(out));await b.close()})();
