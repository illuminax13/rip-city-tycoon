const {chromium, devices} = require('@playwright/test');
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await b.newContext({...devices['iPhone 13']}); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(()=>{window.__loaf=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>__loaf.push({d:Math.round(e.duration),render:Math.round(e.startTime+e.duration-e.renderStart),style:Math.round(e.startTime+e.duration-e.styleAndLayoutStart),scripts:e.scripts.map(s=>Math.round(s.duration)+':'+(s.invoker||'').slice(0,40))}))).observe({type:'long-animation-frame',buffered:true})});
  await page.goto(process.argv[2]||'http://127.0.0.1:8765/'); await page.waitForSelector('.tile');
  await page.evaluate(async () => { set = SETS[16]; await getCards(set); for (let i = 0; i < 5; i++) openPack(); show('vPick'); });
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.locator('#binders').click(); await page.waitForTimeout(3000);
  const r = await page.evaluate(async () => { const t0 = performance.now(); const p = openBinder(SETS[16]); const t1 = performance.now(); await p; const t2 = performance.now();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const t3 = performance.now(); return {sync: t1 - t0, await: t2 - t0, frame2: t3 - t0}; });
  console.log(JSON.stringify(r));console.log(JSON.stringify(await page.evaluate(()=>{const x=__loaf.slice(-5);__loaf.length=0;return x})));
  await page.waitForTimeout(1000);
  const t = await page.evaluate(async () => { const f = []; let l = performance.now(); let on = true; const lp = t => { f.push(t - l); l = t; if (on) requestAnimationFrame(lp); }; requestAnimationFrame(lp); turn(1); await new Promise(r => setTimeout(r, 800)); on = false; return f.map(x => Math.round(x)); });
  console.log('turn', JSON.stringify(t));console.log(JSON.stringify(await page.evaluate(()=>__loaf.slice(-8)))); await b.close();
})();
