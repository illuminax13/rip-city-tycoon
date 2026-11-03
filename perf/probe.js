const {chromium, devices} = require('@playwright/test');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();
await p.goto(process.argv[2]);await p.waitForTimeout(6000);
const r=await p.evaluate(()=>performance.getEntriesByType('resource').map(e=>[Math.round(e.transferSize/1024),Math.round(e.responseEnd),e.initiatorType,e.name.slice(0,110)]).sort((a,b)=>b[0]-a[0]));
console.log(r.slice(0,25).map(x=>x.join(' ')).join('\n'));await b.close()})();
