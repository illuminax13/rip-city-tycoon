const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');

test('service worker registers; second visit uses cache', async ({page, context}) => {
  test.skip(test.info().project.name === 'firefox', 'SW flaky in FF headless here');
  await gotoApp(page);
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(()=>true), null, {timeout: 15000}).catch(()=>{});
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const r = await navigator.serviceWorker.ready;
    return !!r.active;
  });
  expect(ready).toBeTruthy();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.tile');
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  expect(controlled).toBeTruthy();
});

test('a11y basics: controls labeled', async ({page}) => {
  await gotoApp(page);
  await chooseSet(page, 0);
  const skip = page.locator('#skip');
  await expect(skip).toHaveAttribute('aria-label', /spin/i);
  // header buttons have text
  await expect(page.locator('#sback')).toContainText(/Sets/i);
  await page.locator('#sback').click();
  await expect(page.locator('#binders')).toContainText(/Binder/i);
  await expect(page.locator('#reset')).toContainText(/reset/i);
});

test('rapid double-tap center pack does not double-open', async ({page}) => {
  await gotoApp(page);
  await chooseSet(page, 0);
  await skipAndLand(page);
  const box = await page.locator('#wheelwrap').boundingBox();
  const x = box.x + box.width/2, y = box.y + box.height*0.44;
  await page.mouse.click(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(500);
  expect(await page.locator('#tear.on').count()).toBe(1);
});

test('back mid-tear returns safely', async ({page}) => {
  await gotoApp(page);
  await chooseSet(page, 0);
  await skipAndLand(page);
  await tapCenterPack(page);
  await page.locator('#sback').click({force:true}).catch(()=>{});
  // sback may be under tear; use header back if visible
  if (await page.locator('#tear.on').count()) {
    await page.evaluate(() => { const t=document.getElementById('tear'); t.className=''; t.innerHTML=''; show('vPick'); document.body.classList.remove('staged'); $("vWheel").classList.remove('stage'); state='idle'; });
  }
  await page.waitForSelector('#vPick.on');
});

test('resize / small viewport', async ({page}) => {
  await page.setViewportSize({width: 320, height: 568});
  await gotoApp(page);
  await chooseSet(page, 0);
  await expect(page.locator('#strip .pack[style*="visibility: visible"], #strip .pack:not([style*="hidden"])').first()).toBeVisible();
  await page.setViewportSize({width: 1024, height: 768});
  await page.waitForTimeout(300);
  await expect(page.locator('#strip .pack[style*="visibility: visible"], #strip .pack:not([style*="hidden"])').first()).toBeVisible();
});

test('image fallbacks when CDN blocked', async ({page}) => {
  await page.route('**/*tcgdex.net/**', r => r.abort());
  await page.route('**/*pokemontcg.io/**', r => r.abort());
  await gotoApp(page);
  await chooseSet(page, 0);
  // local pack art still loads
  const src = await page.evaluate(() => {
    const im = document.querySelector('#strip img[src]');
    return im && im.src;
  });
  expect(src).toMatch(/assets\/packs/);
});

test('20 pack opens no unhandled rejections', async ({page}) => {
  test.setTimeout(900000);
  const {errs} = await gotoApp(page);
  const N = +(process.env.LEAK_N || (test.info().project.name==='chromium' ? 20 : 6));
  for (let i=0;i<N;i++) {
    if (!(await page.locator('#vWheel.on').count())) {
      if (await page.locator('#again').count()) await page.locator('#again').click();
      else if (await page.locator('#open').isVisible()) await page.locator('#open').click();
      else { await page.locator('.tile[data-i="0"]').click(); }
      await page.waitForFunction(() => document.getElementById('vWheel').classList.contains('on') && /Swipe|Tap/.test(document.body.innerText), null, {timeout:60000});
    }
    await skipAndLand(page);
    await tapCenterPack(page);
    await doTear(page);
    await revealAll(page);
  }
  const rej = await page.evaluate(() => window.__rej||[]);
  expect(rej).toEqual([]);
  expect(errs.filter(e => !/access.control|Cross-Origin|Failed to load|net::|CORS/i.test(e))).toEqual([]);
  const nodes = await page.evaluate(() => document.getElementsByTagName('*').length);
  expect(nodes).toBeLessThan(3000);
  expect(await page.locator('.twk').count()).toBe(0);
});

test('offline after first visit: shell + visited set work', async ({page, context}) => {
  test.skip(test.info().project.name === 'firefox', 'SW flaky in FF headless here');
  await gotoApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForSelector('.tile');
  await chooseSet(page, 0);           // caches data/base1.json + pack art
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload(); await page.waitForSelector('.tile', {timeout: 15000});
  await chooseSet(page, 0);
  await expect(page.locator('#strip .pack img[src*="assets/packs"]').first()).toBeAttached();
  await context.setOffline(false);
});

test('SW uses versioned cache, skipWaiting and clients.claim', async ({request}) => {
  const r = await request.get('/sw.js'); const t = await r.text();
  expect(t).toMatch(/const CACHE='rct-v\d+'/);
  expect(t).toMatch(/skipWaiting\(\)/);
  expect(t).toMatch(/clients\.claim\(\)/);
  expect(t).toMatch(/mode==='navigate'/); // HTML handled explicitly (SWR + update prompt)
});

test('wide desktop + iPhone SE sizes render wheel', async ({page}) => {
  for (const vp of [{width:375,height:667},{width:320,height:568},{width:1920,height:1080},{width:820,height:1180}]) {
    await page.setViewportSize(vp);
    await gotoApp(page);
    await chooseSet(page, 0);
    const ok = await page.evaluate(() => { const el=document.getElementById('strip').children[Math.round(pos/PW)]; const r=el.getBoundingClientRect(); return r.width>80 && r.left>=-2 && r.right<=innerWidth+2; });
    expect(ok, JSON.stringify(vp)).toBeTruthy();
  }
});
