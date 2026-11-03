const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear} = require('./helpers');

// Cards whose TCGdex files are served with a duplicated Access-Control-Allow-Origin header:
// they rendered blank (or blurry low-res) while card <img>s were CORS-mode.
const PREV_BROKEN = [[20,'me02.5-116'],[20,'me02.5-061'],[20,'me02.5-150'],[19,'me02-090'],[19,'me02-009']];

test('previously broken Ascended Heroes / Phantasmal Flames cards load full-res', async ({page}) => {
  await gotoApp(page);
  const res = await page.evaluate(async (L) => {
    const out = [];
    for (const [i, id] of L) {
      const d = await getCards(SETS[i]); const c = Object.values(d.pools).flat().find(x => x.id === id);
      const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:0;top:0;width:80px;opacity:.01';
      w.innerHTML = img(c.imgs, c.name, c.rarity); document.body.appendChild(w);
      const t0 = performance.now();
      while (performance.now() - t0 < 20000) { const e = w.firstElementChild; if (e.tagName !== 'IMG' || (e.complete && e.naturalWidth)) break; await new Promise(r => setTimeout(r, 100)); }
      const e = w.firstElementChild; out.push({id, ok: e.tagName === 'IMG' && e.naturalWidth > 0, src: e.currentSrc || e.src, w: e.naturalWidth}); w.remove();
    }
    return out;
  }, PREV_BROKEN);
  for (const r of res) { expect(r.ok, JSON.stringify(r)).toBe(true); expect(r.src, r.id).toMatch(/high\.webp$/); expect(r.w).toBeGreaterThanOrEqual(600); }
  expect(await page.locator('img[crossorigin]').count()).toBe(0);
});

test('placeholder shows name + number when every source fails', async ({page}) => {
  await gotoApp(page);
  const html = await page.evaluate(async () => {
    const w = document.createElement('div'); w.style.width = '120px'; w.style.aspectRatio = '63/88';
    w.innerHTML = img(['https://assets.tcgdex.net/en/me/nope/042/high.webp', 'https://images.pokemontcg.io/nope/42.png'], 'Test Card', 'Rare');
    document.body.appendChild(w);
    for (let k = 0; k < 100 && w.querySelector('img'); k++) await new Promise(r => setTimeout(r, 100));
    return w.innerHTML;
  });
  expect(html).toContain('class="ph"'); expect(html).toContain('#42'); expect(html).toContain('Test Card');
});

test('zoom guards: viewport + touch-action, and rapid taps flip every card', async ({page}, info) => {
  const touch = /webkit/.test(info.project.name);
  await gotoApp(page);
  expect(await page.getAttribute('meta[name=viewport]', 'content')).toMatch(/maximum-scale=1/);
  const ta = await page.evaluate(() => [getComputedStyle(document.body).touchAction, getComputedStyle(document.documentElement).touchAction, getComputedStyle(document.getElementById('stack') || document.body).touchAction]);
  expect(ta[0]).toBe('manipulation'); expect(ta[1]).toBe('manipulation');
  await chooseSet(page, 20); await skipAndLand(page); await tapCenterPack(page); await doTear(page);
  const n = await page.evaluate(() => current.length);
  const box = await page.locator('#stack').boundingBox();
  // flip + send away each card with quick taps (~120ms apart, i.e. double-tap speed)
  for (let k = 0; k < n * 2; k++) { const x = box.x + box.width / 2, y = box.y + box.height / 2; if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(120); }
  await page.waitForSelector('#summary.on', {timeout: 15000});
  const scale = await page.evaluate(() => window.visualViewport ? visualViewport.scale : 1);
  expect(scale).toBe(1);
});
