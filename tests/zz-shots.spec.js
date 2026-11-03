const {test} = require('@playwright/test');
const {gotoApp, chooseSet} = require('./helpers');
test('shots', async ({page}) => {
  await gotoApp(page); await page.waitForTimeout(1500);
  await page.screenshot({path:'screenshot-picker.png', fullPage:true});
  await chooseSet(page, 23); await page.waitForTimeout(1200);
  await page.screenshot({path:'screenshot-wheel.png'});
});
