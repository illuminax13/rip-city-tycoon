// Rip City Tycoon economy: wallet, buying packs/boxes, selling, challenges, achievement rewards.
const {test, expect} = require('@playwright/test');
const H = require('./helpers');
test.use({serviceWorkers: 'block'});

const NOW = Date.parse('2026-11-02T18:00:00Z');            // Mon Nov 2 2026, noon Central
const SV08 = 14;                                            // Journey Together (2025, in print: $4.49 MSRP)
async function fresh(page, {now = NOW, seed = null} = {}) {
  await page.addInitScript(([now, seed]) => {
    window.__ecNow = () => (window.__ecShift || 0) + now;
    if (seed && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); for (const k in seed) localStorage.setItem(k, seed[k]); }
  }, [now, seed]);
  return H.gotoApp(page, '/', {econ: false});
}
const cash = page => page.evaluate(() => __ec.EC.d.cash);
const econ = (c, extra = {}) => JSON.stringify(Object.assign({v: 1, cash: c, start: 50000, since: 1, tx: [], ach: {}, ch: {}, bonus: {}, st: {}, welcomed: 1}, extra));
const coll = sets => JSON.stringify({packs: 0, coll: {}, hist: [], migrated: 1, sets});

test('wallet: starts at $500, shown in the header, persisted, rct-only keys', async ({page}) => {
  const {errs} = await fresh(page);
  await expect(page.locator('header .wchip .eccash')).toHaveText('$500.00');
  await expect(page.locator('#chtile')).toContainText('Welcome to Rip City Tycoon');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every(k => /^rct/.test(k))).toBe(true);
  expect(keys).toContain('rctEcon');
  await page.evaluate(() => { __ec.EC.d.cash = 12345; __ec.save(); });
  await page.reload(); await page.waitForSelector('.tile');
  await expect(page.locator('header .wchip .eccash')).toHaveText('$123.45');
  await expect(page.locator('.tile[data-i="14"] .ptag')).toHaveText('$4.49');
  expect(errs.filter(e => !/Failed to load resource/.test(e))).toEqual([]);
});

test('buying a pack charges the price and pays the first-pack achievement', async ({page}) => {
  await fresh(page);
  const price = await page.evaluate(i => __ec.price(SETS[i]), SV08);
  expect(price).toBe(449);
  await H.chooseSet(page, SV08);
  await expect(page.locator('#ecptag')).toContainText('$4.49');
  await H.skipAndLand(page); await H.tapCenterPack(page);
  await expect(page.locator('#tear .ecpay')).toContainText('$4.49');
  await H.doTear(page);
  await page.waitForFunction(() => __ec.EC.d.ach.p1, null, {timeout: 15000});
  const d = await page.evaluate(() => __ec.EC.d);
  const buy = d.tx.find(t => t.k === 'buy'), ach = d.tx.filter(t => t.k === 'ach');
  expect(buy.a).toBe(-449);
  expect(ach.reduce((a, t) => a + t.a, 0)).toBeGreaterThanOrEqual(500);       // "First Rip" pays $5
  expect(d.cash).toBe(50000 + d.tx.reduce((a, t) => a + t.a, 0));
  expect(d.st.spent).toBe(449);
  expect(await page.evaluate(() => __ec.period('d').p.open5 ?? __ec.period('d').p.open10 ?? 1)).toBeGreaterThanOrEqual(1);
  // the reward shows on the achievement card
  await page.locator('#achbtn').click();
  await expect(page.locator('.ach[data-id="p1"] .achrw')).toContainText('$5.00');
});

test('cannot open a pack you cannot afford; emergency fund bails you out', async ({page}) => {
  await fresh(page, {seed: {rctEcon: econ(100)}});
  await H.chooseSet(page, 0);                                    // Base Set: vintage market price
  await H.skipAndLand(page);
  const box = await page.locator('#wheelwrap').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.44);
  await expect(page.locator('#ecm.on')).toContainText('Not enough cash');
  await expect(page.locator('#tear.on')).toHaveCount(0);
  expect(await page.evaluate(() => store.packs)).toBe(0);
  await page.locator('#ecbail').click();
  expect(await cash(page)).toBe(2600);
  await expect(page.locator('#stageui .eccash')).toHaveText('$26.00');
});

test('booster box: discounted price, tearing the wrap buys it, blocked when broke', async ({page}) => {
  await fresh(page, {seed: {rctEcon: econ(10000)}});
  await page.evaluate(i => openBox(SETS[i]), SV08);
  await page.locator('#bx3d .bxscene').waitFor();
  const bp = await page.evaluate(i => __ec.boxPrice(SETS[i], BOX.prod), SV08);
  expect(bp).toBe(Math.round(449 * 36 * 0.8));
  await expect(page.locator('.bxprice')).toContainText('$129.31');
  // headless WebKit occasionally drops the first drag while the box intro settles: retry the gesture
  await expect(async () => {
    if (!(await page.locator('#ecm.on').count())) await H.boxDrag(page, .08, .5, .95, .52, 18);
    await expect(page.locator('#ecm.on')).toContainText('Not enough cash', {timeout: 3000});
  }).toPass({timeout: 20000});
  await expect(page.locator('#bx3d.torn')).toHaveCount(0);
  await page.locator('#ecm .acts button', {hasText: 'OK'}).click();
  await page.evaluate(() => { __ec.EC.d.cash = 50000; __ec.save(); });
  await page.waitForTimeout(1300);
  await H.tearWrap(page);
  expect(await cash(page)).toBe(50000 - bp);
  await expect(page.locator('#boxv .eccash')).toHaveText('$370.69');
});

test('sell from the binder zoom: button and swipe up', async ({page}) => {
  await fresh(page, {seed: {rct: coll({sv09: {'1': {name: 'Caterpie', rarity: 'Common', n: 3, lid: '001'}}})}});
  await page.evaluate(i => openBinder(SETS[i]), SV08);
  await page.locator('.pocket.own').first().click();
  await expect(page.locator('#zsellb')).toBeVisible();
  await expect(page.locator('#zsellb')).not.toHaveAttribute('data-pending', '1', {timeout: 8000});
  // let the live price settle (it may land after the 4s fallback under load) so the label is final
  await expect.poll(() => page.evaluate(() => { const it = Z.list[Z.i]; try { return priceOf({...it.c}, it.s) !== undefined; } catch (e) { return true; } }), {timeout: 20000}).toBe(true);
  await page.waitForTimeout(300);
  const label = await page.locator('#zsellb').innerText();
  const v = Math.round(parseFloat(label.replace(/[^0-9.]/g, '')) * 100);
  expect(v).toBeGreaterThan(0);
  const c0 = await cash(page);
  await page.locator('#zsellb').click();
  await expect.poll(() => cash(page)).toBe(c0 + v);
  expect(await page.evaluate(() => store.sets.sv09['1'].n)).toBe(2);
  await page.waitForTimeout(700);
  const b = await page.locator('#vcard').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * .6); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(b.x + b.width / 2, b.y + b.height * .6 - i * 40); await page.waitForTimeout(16); }
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => store.sets.sv09['1'].n)).toBe(1);
  const d = await page.evaluate(() => __ec.EC.d);
  expect(d.st.nSold).toBe(2);
  expect(d.tx[0].l).toContain('Caterpie');
});

test('sell all duplicates (with confirm) and sell bulk from the hub', async ({page}) => {
  await fresh(page, {seed: {rct: coll({sv09: {
    '1': {name: 'Caterpie', rarity: 'Common', n: 4, lid: '001'},
    '8': {name: 'Maractus', rarity: 'Uncommon', n: 2, lid: '008'},
    '184': {name: "Lillie's Clefairy ex", rarity: 'Special illustration rare', n: 6, lid: '184'}}})}});
  await page.locator('#chbtn').click();
  await page.locator('.tytabs button[data-tab="sell"]').click();
  const c0 = await cash(page);
  await page.locator('#ecsd').click();
  await expect(page.locator('#ecm.on h3')).toContainText('Sell 9 duplicate cards');    // 3 + 1 + 5, over $25 → confirm
  await page.locator('#ecok').click();
  await expect.poll(() => page.evaluate(() => Object.values(store.sets.sv09).map(e => e.n).join(','))).toBe('1,1,1');
  expect(await cash(page)).toBeGreaterThan(c0 + 2500);
  // "sell every bulk card" empties commons/uncommons entirely
  await page.locator('#ecsb0').click();
  await expect.poll(() => page.evaluate(() => Object.keys(store.sets.sv09).join(','))).toBe('184');
  await page.locator('.tytabs button[data-tab="wallet"]').click();
  await expect(page.locator('.txl')).toContainText('Sold');
});

test('challenges: deterministic by Chicago date, progress, claim, daily bonus streak', async ({page}) => {
  await fresh(page);
  const a = await page.evaluate(() => ({d: __ec.period('d'), w: __ec.period('w'), day: __ec.day(), wk: __ec.week()}));
  expect(a.day).toBe('2026-11-02'); expect(a.wk).toBe('2026-11-02');
  expect(a.d.ids).toHaveLength(3); expect(a.w.ids).toHaveLength(3);
  // same date on a brand-new save → same challenges
  await page.evaluate(() => localStorage.removeItem('rctEcon'));
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => __ec.period('d').ids)).toEqual(a.d.ids);
  // 11:59pm Central is still Nov 2; 12:01am is a new day and new dailies
  expect(await page.evaluate(() => __ec.day(Date.parse('2026-11-03T05:59:00Z')))).toBe('2026-11-02');
  expect(await page.evaluate(() => __ec.day(Date.parse('2026-11-03T06:01:00Z')))).toBe('2026-11-03');
  // finish the first daily and claim it from the hub
  const first = a.d.ids[0];
  await page.evaluate(id => { const c = __ec.CH_D.find(x => x.id === id); const st = __ec.period('d'); st.p[id] = c.g; __ec.save(); }, first);
  await page.locator('#chbtn').click();
  await expect(page.locator('#vTy.on')).toBeVisible();
  const r = await page.evaluate(id => __ec.CH_D.find(x => x.id === id).r, first);
  const c0 = await cash(page);
  await page.locator(`.ecclaim[data-id="${first}"]`).click();
  expect(await cash(page)).toBe(c0 + r);
  await expect(page.locator(`.chc[data-id="${first}"]`)).toContainText('Claimed');
  // daily bonus: $10 on day 1, once per day, $12 the next day
  await page.locator('#ecbonus').click();
  expect(await cash(page)).toBe(c0 + r + 1000);
  await expect(page.locator('#ecbonus')).toHaveCount(0);
  await page.evaluate(() => { window.__ecShift = 864e5; });
  await page.locator('.tytabs button[data-tab="ch"]').click();
  await page.locator('#ecbonus').click();
  expect(await cash(page)).toBe(c0 + r + 2200);
  const d2 = await page.evaluate(() => __ec.period('d'));
  expect(d2.k).toBe('2026-11-03');
});

test('achievement rewards are tiered and paid once', async ({page}) => {
  await fresh(page);
  const r = await page.evaluate(() => {
    const ids = ['p1', 'p100', 'b100', 'eramaster'], vals = ids.map(id => __ec.AR(ACHS.find(a => a.id === id)));
    const c0 = __ec.EC.d.cash; const a = ACHS.find(x => x.id === 'p10');
    window.ecAchPay([a]); window.ecAchPay([a]);
    return {vals, gained: __ec.EC.d.cash - c0, n: ACHS.length, all: ACHS.every(x => __ec.AR(x) > 0)};
  });
  expect(r.n).toBe(75); expect(r.all).toBe(true);
  expect(r.vals[0]).toBeLessThan(r.vals[1]); expect(r.vals[1]).toBeLessThan(r.vals[2]); expect(r.vals[2]).toBeLessThan(r.vals[3]);
  expect(r.gained).toBe(1500);
});
