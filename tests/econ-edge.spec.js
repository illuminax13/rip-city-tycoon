// Rip City Tycoon wallet edge cases (perf/bug pass, Nov 2026)
const {test, expect} = require('@playwright/test');
const H = require('./helpers');
test.use({serviceWorkers: 'block'});
const NOW = Date.parse('2026-11-02T18:00:00Z');
const SV08 = 14;
async function fresh(page, {now = NOW, seed = null} = {}) {
  await page.addInitScript(([now, seed]) => {
    window.__ecShift = +sessionStorage.getItem('shift') || 0; window.__ecNow = () => (window.__ecShift || 0) + now;
    if (seed && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); for (const k in seed) localStorage.setItem(k, seed[k]); }
  }, [now, seed]);
  return H.gotoApp(page, '/', {econ: false});
}
const cash = page => page.evaluate(() => __ec.EC.d.cash);
const econ = (c, extra = {}) => JSON.stringify(Object.assign({v: 1, cash: c, start: 50000, since: 1, tx: [], ach: {p1: 1}, ch: {}, bonus: {}, st: {}, welcomed: 1}, extra));
const coll = sets => JSON.stringify({packs: 0, coll: {}, hist: [], migrated: 1, sets});

test('spending down to exactly $0, then the next pack is blocked', async ({page}) => {
  const {errs} = await fresh(page, {seed: {rctEcon: econ(449)}});
  await H.chooseSet(page, SV08); await H.skipAndLand(page); await H.tapCenterPack(page); await H.doTear(page);
  await page.waitForFunction(() => store.packs === 1, null, {timeout: 15000});
  // achievements may pay a reward on the first pack; strip them to check the purchase itself
  const d = await page.evaluate(() => __ec.EC.d);
  const rewards = d.tx.filter(t => t.k !== 'buy').reduce((a, t) => a + t.a, 0);
  expect(d.cash - rewards).toBe(0);
  await page.evaluate(() => { __ec.EC.d.cash = 0; __ec.save(); });
  await page.evaluate(() => { show('vWheel'); });
  await page.evaluate(i => chooseSet(SETS[i]), SV08); await H.skipAndLand(page);
  const box = await page.locator('#wheelwrap').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.44);
  await expect(page.locator('#ecm.on')).toContainText('Not enough cash');
  expect(await cash(page)).toBe(0);
  expect(await page.evaluate(() => store.packs)).toBe(1);
  expect(errs.filter(e => !/Failed to load resource|CORS|net::/.test(e))).toEqual([]);
});

test('selling the last copy removes the card; selling again pays nothing', async ({page}) => {
  await fresh(page, {seed: {rctEcon: econ(1000), rct: coll({sv09: {'1': {name: 'Caterpie', rarity: 'Common', n: 1, lid: '001'}}})}});
  const r = await page.evaluate(() => { const s = SETBY.sv09, c = {id: idOf('sv09', '1'), name: 'Caterpie', rarity: 'Common', rev: false};
    const c0 = __ec.EC.d.cash, a = ecSellItems([{c, s, rev: false, q: 1, v: 7}]), b = ecSellItems([{c, s, rev: false, q: 1, v: 7}]);
    return {a, b, gained: __ec.EC.d.cash - c0, left: store.sets.sv09 && store.sets.sv09['1'], coll: Object.keys(store.coll).length}; });
  expect(r.a).toBe(7); expect(r.b).toBe(0); expect(r.gained).toBe(7); expect(r.left).toBeFalsy();
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => store.sets.sv09 && store.sets.sv09['1'])).toBeFalsy();
  expect(await cash(page)).toBe(1007);
});

test('unaffordable box: wallet untouched, no box opened', async ({page}) => {
  await fresh(page, {seed: {rctEcon: econ(449 * 10)}});
  await page.evaluate(i => openBox(SETS[i]), SV08);
  await page.locator('#bx3d .bxscene').waitFor();
  await expect(async () => {
    if (!(await page.locator('#ecm.on').count())) await H.boxDrag(page, .08, .5, .95, .52, 18);
    await expect(page.locator('#ecm.on')).toContainText('Not enough cash', {timeout: 3000});
  }).toPass({timeout: 20000});
  expect(await cash(page)).toBe(4490);
  expect(await page.evaluate(() => store.packs)).toBe(0);
});

test('daily/weekly rollover follows Chicago time, claims and bonus pay once', async ({page}) => {
  await fresh(page, {now: Date.parse('2026-11-09T05:30:00Z')});       // Sun Nov 8, 11:30pm Central (Mon in UTC)
  const a = await page.evaluate(() => ({day: __ec.day(), wk: __ec.week(), d: __ec.period('d').k, w: __ec.period('w').k}));
  expect(a).toEqual({day: '2026-11-08', wk: '2026-11-02', d: '2026-11-08', w: '2026-11-02'});
  const r = await page.evaluate(() => { const st = __ec.period('d'), id = st.ids[0], c = __ec.CH_D.find(x => x.id === id); st.p[id] = c.g;
    const c0 = __ec.EC.d.cash, x = __ec.claim('d', id), y = __ec.claim('d', id), b1 = __ec.bonus(), b2 = __ec.bonus(); return {x, y, b1, b2, gained: __ec.EC.d.cash - c0, r: c.r}; });
  expect(r.y).toBe(0); expect(r.b2).toBe(0); expect(r.gained).toBe(r.r + r.b1);
  // 31 minutes later it's Monday in Chicago: new dailies AND new weeklies
  await page.evaluate(() => { window.__ecShift = 31 * 6e4; sessionStorage.setItem('shift', 31 * 6e4); });
  const b = await page.evaluate(() => ({d: __ec.period('d'), w: __ec.period('w').k, bonus: __ec.bonus()}));
  expect(b.d.k).toBe('2026-11-09'); expect(Object.keys(b.d.c)).toEqual([]); expect(b.w).toBe('2026-11-09');
  expect(b.bonus).toBe(1200);                                                     // streak day 2
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => ({s: __ec.EC.d.bonus.streak, again: __ec.bonus()}))).toEqual({s: 2, again: 0});
});

test('daily bonus streak survives the DST change (spring forward)', async ({page}) => {
  // Mon Mar 15 2027, 12:30am CDT; the bonus was claimed on Sun Mar 14 (a 23-hour day)
  await fresh(page, {now: Date.parse('2027-03-15T05:30:00Z'), seed: {rctEcon: econ(0, {bonus: {day: '2027-03-14', streak: 3}})}});
  expect(await page.evaluate(() => __ec.day())).toBe('2027-03-15');
  expect(await page.evaluate(() => __ec.bonus())).toBe(1600);                     // day 4 → $16
});

test('achievement rewards pay once, also across reloads', async ({page}) => {
  await fresh(page);
  const g1 = await page.evaluate(() => { const a = ACHS.find(x => x.id === 'p10'), c0 = __ec.EC.d.cash; ecAchPay([a, a]); return __ec.EC.d.cash - c0; });
  expect(g1).toBe(1500);
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => { const a = ACHS.find(x => x.id === 'p10'), c0 = __ec.EC.d.cash; ecAchPay([a]); achEval && achEval(); return __ec.EC.d.cash - c0; })).toBe(0);
});

test('box pulls are prepaid only while that box is open', async ({page}) => {
  await fresh(page, {seed: {rctEcon: econ(100000)}});
  await page.evaluate(i => openBox(SETS[i]), SV08);
  await page.locator('#bx3d .bxscene').waitFor(); await page.waitForTimeout(1300);
  await H.tearWrap(page);
  const bp = await page.evaluate(i => __ec.boxPrice(SETS[i], BOX.prod), SV08);
  expect(await cash(page)).toBe(100000 - bp);
  await H.openLid(page);
  await page.evaluate(() => boxOne(0)); await page.waitForSelector('#tear.on', {timeout: 15000}); await H.doTear(page);
  const ach = await page.evaluate(() => __ec.EC.d.tx.filter(t => t.k !== 'buy').reduce((a, t) => a + t.a, 0));
  expect(await cash(page) - ach).toBe(100000 - bp);                                // the box pack itself costs nothing more
  // a stale pull (its box is no longer the open one) is charged like any pack
  await page.evaluate(() => { show('vPick'); });
  await H.chooseSet(page, SV08); await H.skipAndLand(page);
  await page.evaluate(() => { NEXT = {s: set, p: buildPack(set, cache[set.dex].pools), box: 3}; BOX = null; });
  const c1 = await cash(page);
  await H.tapCenterPack(page); await H.doTear(page);
  const ach2 = await page.evaluate(() => __ec.EC.d.tx.filter(t => t.k !== 'buy').reduce((a, t) => a + t.a, 0));
  expect(await cash(page) - (ach2 - ach)).toBe(c1 - 449);
});
