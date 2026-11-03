const {test} = require('@playwright/test');
const H = require('./helpers');
test('zoom screenshot', async ({page}) => {
  test.skip(test.info().project.name !== 'webkit-iphone');
  await H.gotoApp(page); await H.chooseSet(page, 12); await H.skipAndLand(page); await H.tapCenterPack(page); await H.doTear(page); await H.revealAll(page);
  await page.locator('#summary .sgrid .card').last().click();
  await page.waitForFunction(() => { const i = document.querySelector('#vcard .front img'); return i && i.complete && i.naturalWidth > 0; }, null, {timeout: 20000}).catch(() => {});
  await page.evaluate(() => { const c = document.querySelector('#vcard .card'); c.classList.add('tilting'); c.style.setProperty('--mx', '30%'); c.style.setProperty('--my', '25%'); c.style.setProperty('--rx', '6deg'); c.style.setProperty('--ry', '-8deg'); });
  await page.waitForTimeout(600); await page.screenshot({path: 'screenshot-zoom.png'});
});
