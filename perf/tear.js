const {chromium, devices} = require('@playwright/test');
const css = process.argv[2] || '';
const stats = a => { a = a.filter(x => x > 0 && x < 1000).sort((x, y) => x - y); const m = a.reduce((s, x) => s + x, 0) / a.length; return {n: a.length, mean: +m.toFixed(1), p95: +a[Math.floor(a.length * .95)].toFixed(1)}; };
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ctx = await b.newContext({...devices['iPhone 13']}); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:8765/'); await page.waitForSelector('.tile'); if (css) await page.addStyleTag({content: css});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.locator('.tile[data-i="16"]').click(); await page.waitForFunction(() => /Swipe the packs/.test(document.body.innerText)); await page.waitForTimeout(1500);
  const box = await page.locator('#wheelwrap').boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height * .44); await page.waitForSelector('#tear.on'); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => { const b = document.querySelector('#tear .tp').getBoundingClientRect(); return {l: b.left, t: b.top, w: b.width, h: b.height}; });
  await page.evaluate(() => { window.__f = []; let l = performance.now(); const lp = t => { __f.push(t - l); l = t; if (!window.__s) requestAnimationFrame(lp); }; requestAnimationFrame(lp); });
  const y = r.t + r.h * .07; await page.mouse.move(r.l + 4, y); await page.mouse.down();
  for (let i = 1; i <= 24; i++) { await page.mouse.move(r.l + 4 + (r.w * .6 - 4) * i / 24, y); await page.waitForTimeout(16); }
  for (let i = 24; i >= 1; i--) { await page.mouse.move(r.l + 4 + (r.w * .6 - 4) * i / 24, y); await page.waitForTimeout(16); }
  await page.evaluate(() => window.__s = 1); await page.mouse.up();
  console.log(JSON.stringify({css: css.slice(0, 60), ...stats(await page.evaluate(() => __f))})); await b.close();
})();
