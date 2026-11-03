const {test} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear} = require('./helpers');
test('lorcana shots', async ({page}) => {
  test.setTimeout(110000);
  await page.setViewportSize({width: 1280, height: 900});
  await gotoApp(page);
  await page.locator('#gtabs button[data-g="lor"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('#lsets .tile[data-i] .logo img')].filter(i => i.complete && i.naturalWidth > 0).length >= 14, null, {timeout: 20000}).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({path: 'screenshot-lorcana.png'});
  await chooseSet(page, 33); await skipAndLand(page); await tapCenterPack(page); await doTear(page);
  // flip through to the foil card (always present in a Lorcana pack)
  for (let i = 0; i < 12; i++) {
    const isFoil = await page.evaluate(() => !!(current[topI] && current[topI].foil));
    await page.locator('#stack').evaluate(() => flipTop()); await page.waitForTimeout(450);
    if (isFoil) break;
    await page.evaluate(() => sendAway(1)); await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => { const el = topEl(); const im = el && el.querySelector('.front img'); return im && im.complete && im.naturalWidth > 0; }, null, {timeout: 20000}).catch(() => {});
  const el = await page.evaluate(() => { const e = topEl(); e.style.setProperty('--bx', '55%'); e.style.setProperty('--by', '45%'); e.classList.add('tilting'); const r = e.getBoundingClientRect(); return {x: r.left + r.width * .6, y: r.top + r.height * .35}; });
  await page.mouse.move(el.x, el.y); await page.waitForTimeout(2600);
  await page.screenshot({path: 'screenshot-lorcana-pull.png'});
  console.log(await page.evaluate(() => JSON.stringify({card: current[topI].name, rarity: current[topI].rarity, cls: topEl().className})));
});
