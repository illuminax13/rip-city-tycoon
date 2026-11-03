const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, openShelf, tearWrap, openLid} = require('./helpers');
// New features offline: cached prices, box opening, zoom and settings keep working without network.
test('offline: box + zoom + cached prices + settings', async ({page, context}) => {
  test.skip(test.info().project.name !== 'chromium', 'needs SW + request routing (Chromium only)');
  await page.route('https://api.pokemontcg.io/**', r => r.fulfill({status: 500, body: 'down'}));
  await page.route('https://api.tcgdex.net/v2/en/cards/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({pricing: {tcgplayer: {updated: '2026-10-14T00:00:00Z', normal: {marketPrice: 0.1}, holofoil: {marketPrice: 1}, 'reverse-holofoil': {marketPrice: 0.5}}}})}));
  const {errs} = await gotoApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForSelector('.tile');
  await chooseSet(page, 12); await page.waitForTimeout(1200);
  await page.locator('#sbox').click(); await tearWrap(page); await openLid(page); await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#bxvaln')).toContainText('360/360 priced', {timeout: 30000});
  const val = await page.locator('#bxval').textContent();
  await page.waitForTimeout(800);
  await context.setOffline(true);
  await page.reload(); await page.waitForSelector('.tile', {timeout: 15000});
  await expect(page.locator('#valc')).toHaveText(val);            // collection value from cache
  await chooseSet(page, 12);
  await page.locator('#sbox').click(); await expect(page.locator('#bxall')).toBeVisible();
  await tearWrap(page); await openLid(page); await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#boxv .bxsum')).toBeVisible();
  await expect(page.locator('#bxvaln')).not.toContainText('loading', {timeout: 20000});  // cached or "no price", never stuck
  await page.locator('#bxhits .bxt').first().click(); await expect(page.locator('#viewer.on')).toBeVisible();
  await expect(page.locator('#zprice')).not.toContainText('price…', {timeout: 10000});
  await page.keyboard.press('Escape'); await page.locator('#bxdone').click();
  await page.locator('#sback').click();
  await page.locator('#setbtn').click(); await expect(page.locator('#settings.on')).toBeVisible();
  await context.setOffline(false);
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|offline|CORS|access.control|Cross-Origin/i.test(e))).toEqual([]);
});
