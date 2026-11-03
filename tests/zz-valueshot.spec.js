const {test} = require('@playwright/test');
const H = require('./helpers');
test('value screenshot (live price APIs)', async ({page}) => {
  test.skip(test.info().project.name !== 'webkit-iphone');
  await H.gotoApp(page); await H.chooseSet(page, 12);
  await page.locator('#sbox').click(); await H.tearWrap(page); await H.openLid(page); await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await page.locator('#boxv .bxsum').waitFor();
  await page.waitForFunction(() => /\d+\/\d+ priced$|priced · /.test(document.getElementById('bxvaln').textContent) && !/loading/.test(document.getElementById('bxvaln').textContent), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500); await page.screenshot({path: '/tmp/value-box.png'});
  await page.locator('#bxdone').click(); await page.locator('#sback').click().catch(() => {});
  await H.openShelf(page);
  await page.waitForFunction(() => /\$/.test((document.getElementById('pxtotal') || {}).textContent || ''), null, {timeout: 30000}).catch(() => {});
  await page.waitForTimeout(2500); await page.screenshot({path: 'screenshot-value.png'});
});
