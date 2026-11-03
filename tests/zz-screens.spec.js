const {test} = require('@playwright/test');
const H = require('./helpers');
// visual review shots of the main screens on iPhone WebKit (written to /tmp/screens-*.png, not asserted)
test('screens', async ({page}) => {
  test.skip(test.info().project.name !== 'webkit-iphone');
  test.setTimeout(110000);
  await H.gotoApp(page); await H.chooseSet(page, 12);
  await H.skipAndLand(page); await H.tapCenterPack(page);
  await page.waitForSelector('#tear .tp'); await page.waitForTimeout(600); await page.screenshot({path: '/tmp/screens-tear.png'}); await page.waitForTimeout(4000); await page.screenshot({path: '/tmp/screens-tear2.png'});
  await H.doTear(page); await page.screenshot({path: '/tmp/screens-stack.png'});
  await page.locator('#vPack').click({position: {x: 190, y: 400}}).catch(() => {}); await page.waitForTimeout(900); await page.screenshot({path: '/tmp/screens-stack2.png'});
  await H.revealAll(page); await page.waitForTimeout(800); await page.screenshot({path: '/tmp/screens-summary.png'});
  await page.goto('/'); await page.waitForSelector('.tile'); await H.openShelf(page); await page.screenshot({path: '/tmp/screens-shelf.png'});
  await page.locator('.binder', {hasText: 'Surging Sparks'}).click(); await page.waitForTimeout(1500); await page.screenshot({path: '/tmp/screens-binder.png'});
});
