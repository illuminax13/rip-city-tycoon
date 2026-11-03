const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, tearWrap, openLid} = require('./helpers');
const S = page => page.evaluate(() => ({packs: store.packs, hist: store.hist.length, cards: Object.values(store.coll).reduce((a, c) => a + c.n, 0)}));

test('box: 36-pack fast open, summary, collection updates', async ({page}) => {
  const {errs} = await gotoApp(page);
  await chooseSet(page, 12);
  const s0 = await S(page);
  await page.locator('#sbox').click();
  await expect(page.locator('#boxv.on .bxttl')).toContainText('Booster Box · 36 packs');
  await expect(page.locator('#bxall')).toHaveText(/Open All \(36\)/);
  await expect(page.locator('#bx3d .bxscene')).toBeVisible();
  await expect(page.locator('#bxall')).toBeDisabled();                 // sealed: Open All gated on the lid
  await expect(page.locator('.bxhint')).toContainText('Swipe across');
  await tearWrap(page);
  await expect(page.locator('.bxhint')).toContainText('Swipe up');
  await expect(page.locator('#bxall')).toBeDisabled();
  await openLid(page);
  await expect(page.locator('#bx3d .bxp')).toHaveCount(36);
  await expect(page.locator('.bxpips i')).toHaveCount(36);
  await expect(page.locator('#bxall')).toBeEnabled();
  const t0 = Date.now();
  await page.locator('#bxall').click();
  await expect(page.locator('#boxv .bxsum')).toBeVisible({timeout: 60000});
  console.log('fast-open ms', Date.now() - t0);
  const s1 = await S(page);
  expect(s1.packs - s0.packs).toBe(36);
  const total = await page.evaluate(() => BOX.packs.reduce((a, p) => a + p.length, 0));
  expect(s1.cards - s0.cards).toBe(total);
  expect(await page.evaluate(() => store.hist.filter(h => h.includes('📦')).length)).toBe(36);
  await expect(page.locator('.bxprog')).toContainText('36 / 36');
  const rows = await page.$$eval('.bxtab td:last-child', t => t.map(x => +x.textContent));
  expect(rows.reduce((a, b) => a + b, 0)).toBe(total);
  const tiers = await page.$$eval('#bxhits .bxt', t => t.map(x => +x.className.match(/t(\d)/)[1]));
  expect(tiers.length).toBeGreaterThan(0);
  // hits ordered by market price when known, else rarity rank
  await expect.poll(() => page.evaluate(() => { const c = bestCmp(BOX.s), l = BOX.hitList; return l.every((x, i) => !i || c(l[i - 1].c, x.c) <= 0); }), {timeout: 20000}).toBe(true);
  expect(Math.min(...tiers)).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.bxbest .bbimg')).toHaveCount(1);
  const gods = await page.evaluate(() => BOX.res.filter(p => p.god).length);
  await expect(page.locator('.bxgod')).toHaveCount(gods);
  // zoom from summary
  await page.locator('#bxhits .bxt').first().click();
  await expect(page.locator('#viewer.on')).toBeVisible();
  expect(await page.locator('#vinfo .zn').textContent()).toMatch(new RegExp(`^1 / ${tiers.length}`));
  await page.keyboard.press('Escape'); await expect(page.locator('#viewer')).toBeHidden();
  await page.locator('#bxshowallnow').click();
  await expect(page.locator('#bxallg .bxt')).toHaveCount(total);
  await page.locator('#bxdone').click(); await expect(page.locator('#boxv')).toBeHidden();
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e))).toEqual([]);
});

test('box: real products for no-box sets, one-by-one then open all', async ({page}) => {
  const {errs} = await gotoApp(page);
  await chooseSet(page, 13);
  await page.locator('#sbox').click();
  const prods = page.locator('.bxprods button');
  await expect(prods).toHaveCount(3);
  await expect(prods.nth(0)).toContainText('Booster Bundle · 6 packs');
  await expect(prods.nth(1)).toContainText('Elite Trainer Box · 9 packs');
  await expect(prods.nth(2)).toContainText('Virtual box · 36 packs'); await expect(prods.nth(2)).toContainText('not a real product');
  await prods.nth(0).click(); await expect(page.locator('.bxprog')).toContainText('0 / 6');
  await expect(page.locator('#bx3d')).toHaveAttribute('class', /bundle/);
  const s0 = await S(page);
  await tearWrap(page); await expect(page.locator('.bxprods')).toHaveCount(0);   // product locked once the wrap is torn
  await openLid(page); await expect(page.locator('#bx3d .bxp')).toHaveCount(6);
  // tap a pack: it lifts out and goes straight to the tear
  const pk = page.locator('#bx3d .bxp').last(); const k = +(await pk.getAttribute('data-k'));
  const bb = await pk.boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + 8);
  await expect(page.locator('#boxv')).toBeHidden();
  await page.waitForSelector('#tear.on', {timeout: 30000});
  const boxPack = await page.evaluate(k => BOX.packs[k].map(c => c.id).join(), k);
  await doTear(page); await revealAll(page);
  expect(await page.evaluate(() => current.map(c => c.id).join())).toBe(boxPack);
  await expect(page.locator('#tobox')).toHaveText('📦 Back to box (5 left)');
  expect((await S(page)).packs - s0.packs).toBe(1);
  await page.locator('#tobox').click(); await expect(page.locator('#bx3d.torn.open')).toBeVisible();
  await expect(page.locator('#bx3d .bxp')).toHaveCount(5); await expect(page.locator('.bxleftn')).toHaveText('5 of 6 packs left');
  // resume after a reload: wrap torn, lid open, 5 packs left
  await page.reload(); await page.waitForSelector('.tile');
  await chooseSet(page, 13); await page.locator('#sbox').click();
  await expect(page.locator('#bx3d.torn.open')).toBeVisible();
  await expect(page.locator('#bx3d .bxp')).toHaveCount(5);
  await expect(page.locator(`#bx3d .bxp[data-k="${k}"]`)).toHaveCount(0);
  await expect(page.locator('.bxpips i.x')).toHaveCount(1);
  await expect(page.locator('.bxprog')).toContainText('1 / 6');
  await page.locator('#bxshowall').check();
  await page.locator('#bxall').click(); await expect(page.locator('.bxrow.all .bxt').first()).toBeVisible();
  await expect(page.locator('#boxv .bxsum')).toBeVisible({timeout: 30000});
  expect((await S(page)).packs - s0.packs).toBe(6);
  await expect(page.locator('.bxstats')).toContainText('6packs opened');
  await expect(page.locator('#bxallg .bxt')).toHaveCount(await page.evaluate(() => BOX.res.reduce((a, p) => a + p.length, 0)));
  // 'Navigated away' is Firefox logging pending media/decode work cancelled by this test's page.reload()
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin|Navigated away/i.test(e))).toEqual([]);
});

test('box: lorcana 24 packs, skip', async ({page}) => {
  const {errs} = await gotoApp(page);
  await page.locator('#gtabs button[data-g="lor"]').click();
  await chooseSet(page, 25);
  await page.locator('#sbox').click();
  await expect(page.locator('#boxv.on .bxttl')).toContainText('Booster Box · 24 packs');
  await expect(page.locator('.bxnote')).toContainText('no box-level guarantees');
  const s0 = await S(page);
  // keyboard path: Enter tears the wrap, Enter again opens the lid
  await page.locator('#bx3d .bxscene').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#bx3d.torn')).toBeVisible();
  await page.keyboard.press('Enter'); await expect(page.locator('#bx3d.open')).toBeVisible();
  await expect(page.locator('#bx3d .bxp')).toHaveCount(24);
  await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#boxv .bxsum')).toBeVisible();
  expect((await S(page)).packs - s0.packs).toBe(24);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rctBox') || '{}')[BOX.s.dex])).toBeUndefined();  // finished box not kept
  await expect(page.locator('#bxagain')).toBeVisible();
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e))).toEqual([]);
});
