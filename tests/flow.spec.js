const {test, expect} = require('@playwright/test');
const {SETS, gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');

for (const set of SETS) {
  test.describe(`Flow: ${set.name}`, () => {
    test('picker → spin → tear → stack → summary → open another', async ({page}) => {
      const {errs} = await gotoApp(page);
      await chooseSet(page, set.i);

      // skip lands, does not auto-open
      await skipAndLand(page);
      expect(await page.evaluate(() => state)).toBe('landed');
      expect(await page.locator('#tear.on').count()).toBe(0);
      expect(await page.locator('#whtxt').textContent()).toMatch(/Tap to open/i);

      // tap side pack snaps, does not open
      const c0 = await page.evaluate(() => Math.round(pos/PW));
      const nb = await page.evaluate(() => { const ch=document.getElementById('strip').children,c=Math.round(pos/PW); const cr=ch[c].getBoundingClientRect(), r=ch[c+1].getBoundingClientRect(); return {x: (Math.max(cr.right, r.left) + Math.min(r.right, innerWidth))/2, y: r.top + r.height*0.5}; });
      await page.mouse.click(nb.x, nb.y);
      await page.waitForFunction(() => state === 'landed', null, {timeout: 20000});
      const c1 = await page.evaluate(() => Math.round(pos/PW));
      expect(c1).not.toBe(c0);
      expect(await page.locator('#tear.on').count()).toBe(0);

      // tap center opens tear
      await tapCenterPack(page);

      // early release springs back
      const spring = await doTear(page, {partial: true});
      expect(await page.locator('#tear.on').count()).toBe(1);
      expect(spring).toBeLessThan(0.05);
      await doTear(page, {partial: false});
      await expect(page.locator('#vPack.on')).toBeVisible();
      await expect(page.locator('#stack .card')).toHaveCount(set.n);

      // flip top, swipe away
      const stack = page.locator('#stack');
      const bb = await stack.boundingBox();
      await page.mouse.click(bb.x + bb.width/2, bb.y + bb.height/2);
      await page.waitForTimeout(400);
      expect(await page.evaluate(() => !!document.querySelector('#stack .card.flipped'))).toBeTruthy();
      await page.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2);
      await page.mouse.down();
      await page.mouse.move(bb.x + bb.width/2 + 220, bb.y + bb.height/2, {steps: 8});
      await page.mouse.up();
      await page.waitForTimeout(500);
      expect(await page.locator('#tray .mini').count()).toBeGreaterThanOrEqual(1);

      // Reveal All finishes
      await revealAll(page);
      await expect(page.locator('#summary.on')).toBeVisible();
      await expect(page.locator('#counter')).toContainText(`${set.n} / ${set.n}`);

      // Open Another
      await page.locator('#again').click();
      await page.waitForFunction(() => document.getElementById('vWheel').classList.contains('on'), null, {timeout: 30000});

      const rej = await page.evaluate(() => window.__rej||[]);
      expect(errs.filter(e => !/access.control|Cross-Origin|Failed to load|net::|CORS/i.test(e)), errs.join('\n')).toEqual([]);
      expect(rej).toEqual([]);
    });
  });
}

test('swipe spin works', async ({page}) => {
  await gotoApp(page);
  await chooseSet(page, 0);
  const ww = page.locator('#wheelwrap');
  const b = await ww.boundingBox();
  await page.mouse.move(b.x + b.width*0.8, b.y + b.height*0.5);
  await page.mouse.down();
  // fast swipe left
  for (let i=0;i<10;i++) await page.mouse.move(b.x + b.width*(0.8 - i*0.07), b.y + b.height*0.5, {steps:1});
  await page.mouse.up();
  await page.waitForFunction(() => state==='fling' || state==='snap' || state==='landed', null, {timeout: 5000});
  await page.waitForFunction(() => state==='landed' || state==='idle', null, {timeout: 60000});
});

test('God pack (?god=1): shimmer on tear, celebration, summary, history badge, stats', async ({page}, info) => {
  const {errs} = await gotoApp(page, '/?god=1');
  await chooseSet(page, 13); // Prismatic Evolutions
  await skipAndLand(page);
  await tapCenterPack(page);
  await expect(page.locator('#tear.godtear .godsheen')).toHaveCount(1);
  await doTear(page, {partial: false});
  await expect(page.locator('#stack .card')).toHaveCount(10);
  expect(await page.evaluate(() => current.god && current.god.kind)).toBe('god');
  const bb = await page.locator('#stack').boundingBox();
  await page.mouse.click(bb.x + bb.width/2, bb.y + bb.height/2);
  await expect(page.locator('#godban')).toBeVisible();
  await expect(page.locator('#godban')).toContainText('GOD PACK');
  await page.waitForTimeout(3200);
  await revealAll(page);
  await expect(page.locator('.godsum')).toContainText('GOD PACK');
  expect(await page.evaluate(() => [store.god, document.querySelector('#hist .godh .gbadge') && document.querySelector('#hist .godh .gbadge').textContent, document.getElementById('godst').hidden])).toEqual([1, '👑 God Pack', false]);
  await page.waitForTimeout(1800);
  if (info.project.name === 'chromium') await page.screenshot({path: 'screenshot-godpack.png'});
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin|Cross-Origin/i.test(e))).toEqual([]);
});
