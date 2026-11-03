const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');
// WebKit iPhone 13 screenshots of the achievements view and a real unlock toast (git-ignored, repo root)
test('achievements screenshots', async ({page}, info) => {
  test.skip(info.project.name !== 'webkit-iphone');
  test.setTimeout(110000);
  await gotoApp(page);
  await chooseSet(page, 12); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  await page.waitForSelector('#achtoast.on', {timeout: 20000}); await page.waitForTimeout(450);
  await page.screenshot({path: 'screenshot-achievement-toast-webkit.png'});
  await page.evaluate(() => { ACH.q.length = 0; achHide(); });
  await page.locator('#achbtn').click(); await expect(page.locator('#vAch.on')).toBeVisible(); await page.waitForTimeout(800);
  await page.screenshot({path: 'screenshot-achievements-webkit.png'});
  await page.screenshot({path: '/tmp/ach-full.png', fullPage: true});
});
