const {test, expect} = require('@playwright/test');
const H = require('./helpers');
// box is 2.5D (flat 2D-transformed faces) so it renders the same in WebKit and Chromium
test.use({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true});
test('box screenshots', async ({page}) => {
  const P = test.info().project.name;
  test.skip(P === 'firefox');
  const pre = P === 'webkit-iphone' ? 'screenshot-box-webkit-' : 'screenshot-box-';
  await H.gotoApp(page); await H.chooseSet(page, 12);
  await page.locator('#sbox').click(); await page.locator('#bx3d .bxscene').waitFor(); await page.waitForTimeout(1500);
  await page.screenshot({path: pre + 'closed.png'});
  await H.tearWrap(page); await page.waitForTimeout(300); await page.screenshot({path: `/tmp/${P}-torn.png`});
  // half-open lid
  const b = await page.locator('#bx3d .bxscene').boundingBox();
  await page.mouse.move(b.x + b.width * .5, b.y + b.height * .62); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(b.x + b.width * .5, b.y + b.height * (.62 - .12 * i / 6)); await page.waitForTimeout(16); }
  await page.waitForTimeout(200); await page.screenshot({path: `/tmp/${P}-halflid.png`}); await page.mouse.up(); await page.waitForTimeout(800);
  await H.openLid(page); await page.waitForTimeout(800);
  await page.screenshot({path: pre + 'open.png'});
  await expect(page.locator('#bxall')).toBeEnabled();
  // other shapes
  await page.evaluate(() => openBox(SETS[13])); await page.locator('.bxprods button').first().waitFor();
  for (const [i, n] of [[0, 'bundle'], [1, 'etb']]) { await page.locator('.bxprods button').nth(i).click(); await page.waitForTimeout(700); await page.screenshot({path: `/tmp/${P}-${n}.png`}); }
});
