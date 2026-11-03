// Perf harness: Chromium + iPhone 13 emulation, CPU 4x, slow 4G-ish network. Usage: node perf/perf.js <baseURL> <out.json>
const {chromium, devices} = require('@playwright/test');
const URL0 = process.argv[2] || 'https://illuminax13.github.io/pokemon-pack-simulator/';
const OUT = process.argv[3] || 'perf/out.json';
const stats = a => { a = a.filter(x => x > 0 && x < 1000).sort((x, y) => x - y); if (!a.length) return {n: 0};
  const m = a.reduce((s, x) => s + x, 0) / a.length; return {n: a.length, mean: +m.toFixed(1), p95: +a[Math.floor(a.length * .95)].toFixed(1), max: +a[a.length - 1].toFixed(1), janky: a.filter(x => x > 50).length}; };
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc']});
  const ctx = await b.newContext({...devices['iPhone 13'], serviceWorkers: 'allow'});
  await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({type: 'longtask', buffered: true}); } catch (e) {}
    window.__frames = null; window.__rec = () => { const f = []; let last = performance.now(), on = true; const loop = t => { if (!on) return; f.push(t - last); last = t; requestAnimationFrame(loop); }; requestAnimationFrame(loop); window.__frames = f; return () => { on = false; return f; }; }; });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Performance.enable');
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  let bytes = 0, reqs = 0; cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; reqs++; });
  const R = {url: URL0, when: new Date().toISOString()};
  const rec = async () => page.evaluate(() => { window.__stop = window.__rec(); });
  const stop = async () => stats(await page.evaluate(() => window.__stop()));
  // 1) cold load
  let t0 = Date.now(); await page.goto(URL0, {waitUntil: 'commit'});
  await page.waitForSelector('.tile'); R.pickerTiles_ms = Date.now() - t0;
  // interactive: tiles present AND main thread responsive (a 0ms timer fires within 50ms, 3x in a row)
  await page.evaluate(async () => { let ok = 0; while (ok < 3) { const s = performance.now(); await new Promise(r => setTimeout(r, 0)); ok = performance.now() - s < 50 ? ok + 1 : 0; } }); R.pickerInteractive_ms = Date.now() - t0;
  R.fontsReady_ms = await page.evaluate(async t => { await document.fonts.ready; return 0; }, 0) + (Date.now() - t0);
  await page.waitForFunction(() => document.readyState === 'complete'); R.loadEvent_ms = Date.now() - t0;
  await page.waitForTimeout(2500); R.coldBytes = bytes; R.coldReqs = reqs; R.coldLongTasks = await page.evaluate(() => ({n: __lt.length, total: Math.round(__lt.reduce((a, b) => a + b, 0))}));
  // 2) set load (Pitch Black)
  t0 = Date.now(); await page.locator('.tile[data-i="16"]').click();
  await page.waitForFunction(() => /Swipe the packs|Tap to open/.test(document.body.innerText)); R.setLoad_ms = Date.now() - t0;
  await page.waitForTimeout(1500);
  // 3) spin
  await rec(); await page.locator('#skip').click(); await page.waitForFunction(() => state === 'landed', null, {timeout: 60000}); R.spinFrames = await stop();
  // 4) tear
  const box = await page.locator('#wheelwrap').boundingBox(); t0 = Date.now();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * .44); await page.waitForSelector('#tear.on'); R.tapToTear_ms = Date.now() - t0;
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => { const b = document.querySelector('#tear .tp').getBoundingClientRect(); return {l: b.left, t: b.top, w: b.width, h: b.height}; });
  await page.evaluate(() => { window.__lat = []; addEventListener('pointermove', e => { const ts = e.timeStamp; requestAnimationFrame(() => requestAnimationFrame(t => window.__lat.push(performance.now() - ts))); }, {capture: true, passive: true}); });
  await rec(); const y = r.t + r.h * .07; await page.mouse.move(r.l + 4, y); await page.mouse.down();
  for (let i = 1; i <= 24; i++) { await page.mouse.move(r.l + 4 + (r.w * .85 - 4) * i / 24, y); await page.waitForTimeout(16); }
  await page.mouse.up(); R.tearFrames = await stop(); R.tearLatency = stats(await page.evaluate(() => window.__lat));
  t0 = Date.now(); await page.waitForSelector('#vPack.on', {timeout: 20000});
  R.ripToStack_ms = Date.now() - t0;
  R.stackImgsReady_ms = await page.evaluate(async () => { const s = performance.now(); for (;;) { const im = [...document.querySelectorAll('#stack .front img')]; if (im.length && im.every(i => i.complete && i.naturalWidth)) return Math.round(performance.now() - s); if (performance.now() - s > 30000) return -1; await new Promise(r => setTimeout(r, 50)); } });
  // 5) flips: reveal all
  await page.waitForTimeout(800); await rec(); await page.locator('#reveal').click(); await page.waitForSelector('#summary.on', {timeout: 60000}); R.flipFrames = await stop();
  // 6) binder
  t0 = Date.now(); await page.locator('#binders').click(); await page.waitForFunction(() => document.querySelectorAll('.bcount').length && ![...document.querySelectorAll('.bcount')].some(x => x.classList.contains('loading'))); R.shelfReady_ms = Date.now() - t0;
  t0 = Date.now(); await page.locator('.binder[data-i="16"]').click(); await page.waitForSelector('#book .pocket'); R.binderOpen_ms = Date.now() - t0;
  await page.waitForTimeout(800); await rec(); t0 = Date.now(); await page.locator('#bnext').click(); await page.waitForTimeout(800); R.pageTurnFrames = await stop();
  // 7) memory after 20 packs
  await page.evaluate(async () => { set = SETS[16]; for (let i = 0; i < 20; i++) { openPack(); await new Promise(r => setTimeout(r, 60)); showSummary(); await new Promise(r => setTimeout(r, 60)); } show('vPick'); });
  await page.waitForTimeout(1500); await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  R.after20 = {heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners, lsKB: await page.evaluate(() => Math.round(JSON.stringify(localStorage).length / 1024))};
  R.totalLongTasks = await page.evaluate(() => ({n: __lt.length, total: Math.round(__lt.reduce((a, b) => a + b, 0))}));
  R.totalBytes = bytes; R.totalReqs = reqs;
  // 8) warm reload (SW)
  bytes = 0; reqs = 0; t0 = Date.now(); await page.reload({waitUntil: 'commit'}); await page.waitForSelector('.tile'); R.warmTiles_ms = Date.now() - t0;
  await page.waitForTimeout(2000); R.warmBytes = bytes; R.warmReqs = reqs;
  require('fs').writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R)); await b.close();
})().catch(e => { console.error('PERF_ERR', e); process.exit(1); });
