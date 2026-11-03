// Binder-open profiler: iPhone 13 emu, CPU 4x, slow 4G. node perf/binder2.js [url] [runs]
const {chromium, devices} = require('@playwright/test');
(async () => {
  const URL0 = process.argv[2] || 'http://127.0.0.1:8765/', RUNS = +(process.argv[3] || 2);
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const out = [];
  for (let run = 0; run < RUNS; run++) {
    const ctx = await b.newContext({...devices['iPhone 13'], serviceWorkers: 'allow'}); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8});
    await page.goto(URL0); await page.waitForSelector('.tile');
    await page.evaluate(async () => { set = SETS[16]; await getCards(set); openPack(); showSummary(); });
    await page.waitForTimeout(+(process.env.W||0));
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
    await page.locator('#binders').click(); await page.waitForFunction(() => document.querySelectorAll('.bcount').length && ![...document.querySelectorAll('.bcount')].some(x => x.classList.contains('loading')));
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {interval: 200}); await cdp.send('Profiler.start');
    const reqs = []; const onReq = e => reqs.push(e.request.url.replace(/^https?:\/\//, '').slice(0, 70)); cdp.on('Network.requestWillBeSent', onReq);
    const t0 = Date.now(); await page.locator('.binder[data-i="16"]').click(); await page.waitForSelector('#book .pocket'); const ms = Date.now() - t0;
    const {profile} = await cdp.send('Profiler.stop'); cdp.off('Network.requestWillBeSent', onReq);
    const self = {}; const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n]));
    profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + f.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0) / 1000; });
    const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => v.toFixed(0) + 'ms ' + k);
    out.push({binderOpen_ms: ms, reqsDuringOpen: reqs.length, reqs: reqs.slice(0, 12), top});
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
