const {test} = require('@playwright/test');
const H = require('./helpers');
test('box screenshot', async ({page}) => {
  test.skip(test.info().project.name !== 'webkit-iphone');
  await H.gotoApp(page); await H.chooseSet(page, 12);
  await page.screenshot({path: '/tmp/stage-box.png'});
  await page.locator('#sbox').click(); await H.tearWrap(page); await H.openLid(page); await page.locator('#bxall').click(); await page.waitForTimeout(1500); await page.screenshot({path: '/tmp/box-fly.png'});
  console.log('A'); await page.locator('#bxskip').click({force: true}); console.log('B'); await page.locator('#boxv .bxsum').waitFor(); console.log('C');
  await page.waitForTimeout(2500); console.log('D'); await page.screenshot({path: 'screenshot-box-summary.png'});
  await page.evaluate(() => { const v = document.getElementById('boxv'); v.scrollTop = document.querySelector('#bxhits').offsetTop - 60; });
  await page.waitForTimeout(1500); await page.screenshot({path: '/tmp/box-hits.png'});
});
