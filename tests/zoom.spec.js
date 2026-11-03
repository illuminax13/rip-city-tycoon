const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf} = require('./helpers');
const counter = page => page.locator('#vinfo .zn').textContent().then(t => t.split(' ·')[0]);
async function swipe(page, x0, y0, x1, y1) { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= 4; i++) await page.mouse.move(x0 + (x1 - x0) * i / 4, y0 + (y1 - y0) * i / 4); await page.mouse.up(); await page.waitForTimeout(350); }
test('zoom: pack summary, swipe/keys, info, history, binder', async ({page}) => {
  const {errs} = await gotoApp(page);
  await chooseSet(page, 12); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  const names = await page.evaluate(() => current.map(c => c.name));
  await page.locator('#summary .sgrid .card').nth(9).click();
  await expect(page.locator('#viewer.on')).toBeVisible();
  expect(await counter(page)).toBe('10 / 10'); await expect(page.locator('#vinfo b')).toHaveText(names[9]);
  await expect(page.locator('#vinfo')).toContainText('Surging Sparks'); await expect(page.locator('#vinfo')).toContainText('#');
  expect(await page.$eval('#vcard .front img', i => i.getAttribute('src'))).toMatch(/high\.webp|_hires|large/);
  await expect(page.locator('#znext')).toBeDisabled();
  await page.locator('#zprev').click(); expect(await counter(page)).toBe('9 / 10'); await expect(page.locator('#viewer.on')).toBeVisible();
  await page.keyboard.press('ArrowLeft'); expect(await counter(page)).toBe('8 / 10');
  const vw = page.viewportSize();
  await swipe(page, vw.width * .85, vw.height * .9, vw.width * .2, vw.height * .9);       // swipe left on backdrop -> next
  expect(await counter(page)).toBe('9 / 10'); await expect(page.locator('#viewer.on')).toBeVisible();
  // slow drag on the card moves the light instead of paging
  const b = await page.locator('#vcard .card').boundingBox();
  await page.mouse.move(b.x + b.width * .3, b.y + b.height * .3); await page.mouse.move(b.x + b.width * .7, b.y + b.height * .6, {steps: 5});
  expect(await page.$eval('#vcard .card', e => e.classList.contains('tilting'))).toBe(true); expect(await counter(page)).toBe('9 / 10');
  await swipe(page, vw.width * .5, vw.height * .03, vw.width * .5, vw.height * .6);         // swipe down -> close
  await expect(page.locator('#viewer')).toBeHidden();
  // tap outside closes
  await page.locator('#summary .sgrid .card').nth(0).click(); await expect(page.locator('#viewer.on')).toBeVisible();
  await page.locator('#viewer').click({position: {x: 8, y: 8}}); await expect(page.locator('#viewer')).toBeHidden();
  // pull history -> best card
  await page.evaluate(() => render()); const h = page.locator('#hist > div[data-h]').first(); await h.scrollIntoViewIfNeeded(); await h.click();
  await expect(page.locator('#viewer.on')).toBeVisible(); await expect(page.locator('#vinfo b')).toHaveText(await page.evaluate(() => store.histC[0].name));
  await page.locator('#zclose').click(); await expect(page.locator('#viewer')).toBeHidden();
  // binder pocket
  await openShelf(page); await page.locator('.binder', {hasText: 'Surging Sparks'}).click();
  await page.locator('.bfilt button[data-f="owned"]').click(); await page.waitForSelector('#book .pocket.own');
  const pk = await page.locator('#book .pocket.own').first().boundingBox(); await page.mouse.click(pk.x + pk.width / 2, pk.y + pk.height / 2);
  await expect(page.locator('#viewer.on')).toBeVisible(); expect(await counter(page)).toMatch(/^1 \/ \d+$/); await expect(page.locator('#vinfo')).toContainText('owned ×');
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});
