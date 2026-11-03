// Zoom swipe frame times: iPhone 13 emu, CPU 4x. node perf/zoom.js [url] [slow4g=0|1]
const {chromium, devices} = require('@playwright/test');
const stats = a => { a = a.filter(x => x > 0 && x < 1000).sort((x, y) => x - y); const m = a.reduce((s, x) => s + x, 0) / a.length; return {n: a.length, mean: +m.toFixed(1), p95: +a[Math.floor(a.length * .95)].toFixed(1), max: +a[a.length - 1].toFixed(1), janky: a.filter(x => x > 50).length}; };
(async () => {
  const URL0 = process.argv[2] || 'http://127.0.0.1:8765/';
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await b.newContext({...devices['iPhone 13']}); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  if (process.argv[3] === '1') { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8}); }
  await page.goto(URL0); await page.waitForSelector('.tile');
  await page.evaluate(async () => { set = SETS[12]; await getCards(set); openPack(); showSummary(); });
  await page.waitForTimeout(1500);
  await page.locator('#summary .sgrid .card').first().click(); await page.waitForSelector('#viewer.on'); await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const res = await page.evaluate(async () => { const f = []; let last = performance.now(), on = true; const loop = t => { if (!on) return; f.push(t - last); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    const zs = []; for (let i = 0; i < 6; i++) { const t = performance.now(); zoomGo(1); zs.push(performance.now() - t); await new Promise(r => setTimeout(r, 400)); } on = false; return {f, zs}; });
  console.log(JSON.stringify({frames: stats(res.f), zoomGoSync_ms: res.zs.map(x => Math.round(x))})); await b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
