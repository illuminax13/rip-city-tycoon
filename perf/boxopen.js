// Box page render time: tap #sbox -> sealed box painted with its art (imgs decoded + 2 frames)
// usage: node perf/boxopen.js [chromium|webkit] [set index]   chromium = 4x CPU + Slow 4G
const pw=require('playwright');
(async()=>{const br=process.argv[2]||'chromium',si=+(process.argv[3]||12);
const b=br==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(br==='webkit'?{...pw.devices['iPhone 13'],serviceWorkers:'block'}:{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await ctx.newPage();await page.goto('http://127.0.0.1:8765/'+(process.env.PAGE||''));await page.waitForSelector('.tile');
if(br!=='webkit'){const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:562,downloadThroughput:180000,uploadThroughput:84000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})}
await page.evaluate(i=>chooseSet(SETS[i]),si);await page.waitForFunction(()=>/Swipe the packs|Tap to open/.test(document.body.innerText),null,{timeout:60000});await page.waitForTimeout(+(process.env.WAIT||2500));
const measure=async()=>{await page.evaluate(()=>{window.__t0=0;window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(x=>__lt.push([+(x.startTime-__t0).toFixed(0),+x.duration.toFixed(0)]))).observe({type:'longtask'})}catch(e){}document.getElementById('sbox').addEventListener('click',()=>{window.__t0=performance.now()},{capture:true,once:true})});
 await page.locator('#sbox').click();
 return page.evaluate(()=>new Promise(res=>{const t0=window.__t0,lim=t0+30000;let tv=0;const chk=()=>{const fr=document.querySelector('#bx3d .f.fr');
   if(fr&&!tv){tv=performance.now();window.__pend=[...document.querySelectorAll('#bx3d .bxobj img')].filter(i=>!(i.complete&&i.naturalWidth)).map(i=>i.src.split('/').slice(-3).join('/'))}
   const ims=fr?[...document.querySelectorAll('#bx3d .bxobj img')].filter(i=>getComputedStyle(i.closest('.f,.bxp')||i).visibility!=='hidden'):[];
   if(fr&&ims.every(i=>i.complete&&i.naturalWidth>0)){const tl=performance.now(),slow=ims.map(i=>i.src.split('/').slice(-2).join('/'));requestAnimationFrame(()=>res({dom:+(tv-t0).toFixed(0),loaded:+(tl-t0).toFixed(0),frame:+(performance.now()-t0).toFixed(0),imgs:ims.length,pend:window.__pend,lt:window.__lt}));return}
   if(performance.now()>lim)return res({timeout:1,pending:ims.filter(i=>!(i.complete&&i.naturalWidth)).map(i=>i.src.slice(-50))});setTimeout(chk,4)};chk()}))};
const cold=await measure();await page.locator('#bxback').click();await page.waitForTimeout(800);const warm=await measure();
const longs=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/packs\//.test(r.name)).length);
console.log(JSON.stringify({br,set:si,cold,warm,packResources:longs}));await b.close()})();
