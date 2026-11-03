const {chromium, devices} = require('@playwright/test');
const css = process.argv[2] || '';
const stats = a => { a = a.filter(x => x > 0 && x < 1000).sort((x, y) => x - y); const m = a.reduce((s, x) => s + x, 0) / a.length; return {n: a.length, mean: +m.toFixed(1), p95: +a[Math.floor(a.length * .95)].toFixed(1)}; };
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await b.newContext({...devices['iPhone 13']}); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:8765/'); await page.waitForSelector('.tile'); if (css) await page.addStyleTag({content: css});
  await page.locator('.tile[data-i="16"]').click(); await page.waitForFunction(() => /Swipe the packs/.test(document.body.innerText));
  await page.evaluate(() => { Math.random = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })(); openPack(); });
  await page.waitForTimeout(2500); await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.evaluate(() => { window.__f = []; let l = performance.now(); const lp = t => { __f.push(t - l); l = t; if (!window.__s) requestAnimationFrame(lp); }; requestAnimationFrame(lp); });
  await page.locator('#reveal').click(); await page.waitForSelector('#summary.on', {timeout: 60000}); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__s = 1);
  console.log(JSON.stringify({css: css.slice(0, 70), ...stats(await page.evaluate(() => __f))})); await b.close();
})();
