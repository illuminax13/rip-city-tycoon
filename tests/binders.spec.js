const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf} = require('./helpers');

test('binders shelf, open, page, filter, viewer', async ({page}) => {
  await gotoApp(page);
  // seed collection via one pack
  await chooseSet(page, 0);
  await skipAndLand(page);
  await tapCenterPack(page);
  await doTear(page);
  await revealAll(page);

  await openShelf(page);
  const binders = page.locator('.binder');
  await expect(binders.first()).toBeVisible(); expect(await binders.count()).toBeGreaterThanOrEqual(25);
  // counts should not be skeleton forever
  await page.waitForFunction(() => ![...document.querySelectorAll('[id^=bc]')].some(e => e.classList.contains('loading')), null, {timeout: 30000});
  const txt = await page.locator('#bc0').textContent();
  expect(txt).toMatch(/\d+ \/ \d+/);

  await page.locator('.binder[data-i="0"]').click();
  await expect(page.locator('#vBinder.on')).toBeVisible();
  await page.waitForSelector('#book .page', {timeout: 30000});

  // page turn
  const before = await page.locator('#bpage').textContent();
  await page.locator('#bnext').click();
  await page.waitForTimeout(700);
  const after = await page.locator('#bpage').textContent();
  expect(after).not.toBe(before);

  // filter owned
  await page.locator('.bfilt button[data-f="owned"]').click();
  await page.waitForTimeout(300);
  const ownedCount = await page.locator('#book .pocket.own').count();
  expect(ownedCount).toBeGreaterThan(0);

  // viewer
  await page.locator('#book .pocket.own').first().click();
  await expect(page.locator('#viewer.on')).toBeVisible({timeout: 5000});
  await page.locator('#viewer').click({position:{x:10,y:10}});
});
