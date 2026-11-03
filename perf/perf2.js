// Perf for new features (boxes, zoom, memory after 3 boxes). Same env as perf.js: Chromium + iPhone 13, CPU 4x, slow network.
// Usage: node perf/perf2.js <baseURL> <out.json>
const {chromium, devices} = require('@playwright/test');
const URL0 = process.argv[2] || 'http://127.0.0.1:8765/';
const OUT = process.argv[3] || 'perf/out2.json';
const stats = a => { a = a.filter(x => x > 0 && x < 1000).sort((x, y) => x - y); if (!a.length) return {n: 0};
  const m = a.reduce((s, x) => s + x, 0) / a.length; return {n: a.length, mean: +m.toFixed(1), p95: +a[Math.floor(a.length * .95)].toFixed(1), max: +a[a.length - 1].toFixed(1), janky: a.filter(x => x > 50).length}; };
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc']});
  const ctx = await b.newContext({...devices['iPhone 13'], serviceWorkers: 'allow'});
  await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({type: 'longtask', buffered: true}); } catch (e) {}
    window.__rec = () => { const f = []; let last = performance.now(), on = true; const loop = t => { if (!on) return; f.push(t - last); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); return () => { on = false; return f; }; }; });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); const errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await cdp.send('Network.enable'); await cdp.send('Performance.enable');
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const R = {url: URL0, when: new Date().toISOString()};
  const mem = async () => { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage'); const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    return {heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, lsKB: await page.evaluate(() => Math.round(JSON.stringify(localStorage).length / 1024)), priceKB: await page.evaluate(() => Math.round((localStorage.getItem('ppsPrice') || '').length / 1024))}; };
  await page.goto(URL0); await page.waitForSelector('.tile');
  await page.locator('.tile[data-i="12"]').click(); await page.waitForFunction(() => /Swipe the packs|Tap to open/.test(document.body.innerText)); await page.waitForTimeout(1500);
  R.before = await mem();
  // box fast open, full animation (36 packs)
  await page.locator('#sbox').click(); await page.waitForSelector('#bxall');
  page.evaluate(() => { window.__fs = window.__rec(); });
  let t0 = Date.now(); await page.locator('#bxall').click(); const tRec = Date.now();
  await page.waitForSelector('.bxrow'); R.boxClickToFirstPack_ms = Date.now() - t0;
  await page.waitForSelector('#boxv .bxsum', {timeout: 90000}); R.boxFastOpen36_ms = Date.now() - t0; R.boxFlyFrames = stats(await page.evaluate(() => window.__fs()));
  R.boxPricesLoaded_ms = await page.evaluate(async () => { const s = performance.now(); for (;;) { const t = (document.getElementById('bxvaln') || {}).textContent || ''; if (!/loading/.test(t) && /priced/.test(t)) return Math.round(performance.now() - s); if (performance.now() - s > 60000) return -1; await new Promise(r => setTimeout(r, 100)); } });
  R.boxValueText = await page.locator('#bxvaln').textContent();
  // zoom open from box summary
  t0 = Date.now(); await page.locator('#bxhits .bxt').first().click(); await page.waitForSelector('#viewer.on'); R.zoomOpen_ms = Date.now() - t0;
  R.zoomImgReady_ms = await page.evaluate(async () => { const s = performance.now(); for (;;) { const i = document.querySelector('#vcard .front img'); if (i && i.complete && i.naturalWidth) return Math.round(performance.now() - s); if (performance.now() - s > 30000) return -1; await new Promise(r => setTimeout(r, 50)); } });
  page.evaluate(() => { window.__zs = window.__rec(); }); for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); } R.zoomSwipeFrames = stats(await page.evaluate(() => window.__zs()));
  await page.keyboard.press('Escape');
  // 2 more boxes (skip animation) -> memory after 3 boxes
  const skipTimes = [];
  for (let k = 0; k < 2; k++) { await page.locator('#bxagain').click(); await page.waitForSelector('#bxall'); t0 = Date.now(); await page.locator('#bxall').click(); await page.locator('#bxskip').click(); await page.waitForSelector('#boxv .bxsum'); skipTimes.push(Date.now() - t0); await page.waitForTimeout(4000); }
  R.boxSkipToSummary_ms = skipTimes;
  await page.locator('#bxdone').click(); await page.waitForTimeout(3000);
  R.after3Boxes = await mem();
  R.store = await page.evaluate(() => ({packs: store.packs, hist: store.hist.length, histC: (store.histC || []).length, collKeys: Object.keys(store.coll).length}));
  R.longTasks = await page.evaluate(() => ({n: __lt.length, total: Math.round(__lt.reduce((a, b) => a + b, 0)), max: Math.round(Math.max(0, ...__lt))}));
  R.errors = errs;
  require('fs').writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R)); await b.close();
})().catch(e => { console.error('PERF_ERR', e); process.exit(1); });
