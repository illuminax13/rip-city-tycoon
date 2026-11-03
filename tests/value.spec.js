const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf, tearWrap, openLid} = require('./helpers');
test.use({serviceWorkers: 'block'});  // page.route can't see requests from SW-controlled pages in WebKit
const noise = e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e);
// deterministic mock: price derived from card number; card "...-999" style ids or ids in NOPRICE get no pricing
async function mockPrices(page, opt = {}) {
  const calls = {dex: 0, ptcg: 0, lor: 0};
  await page.route('https://api.pokemontcg.io/**', r => { calls.ptcg++; r.fulfill({status: 500, body: 'down'}); });
  await page.route('https://api.tcgdex.net/v2/en/cards/**', r => {
    calls.dex++;
    const id = decodeURIComponent(r.request().url().split('/cards/')[1]);
    const n = parseInt(id.split('-').pop(), 10) || 1;
    const pricing = (opt.noPrice || []).includes(id) ? {} : {tcgplayer: {updated: '2026-10-14T22:55:00Z', unit: 'USD', normal: {marketPrice: 0.1}, holofoil: {marketPrice: (opt.price && opt.price[id]) || (opt.cap ? Math.min(opt.cap, n / 10) : n / 10)}, 'reverse-holofoil': {marketPrice: 0.5}}, cardmarket: {avg: 0.2}};
    r.fulfill({contentType: 'application/json', body: JSON.stringify({id, pricing})});
  });
  await page.route('https://api.lorcast.com/v0/sets/*/cards', r => {
    calls.lor++;
    const a = Array.from({length: 240}, (_, i) => ({collector_number: String(i + 1), prices: {usd: '0.25', usd_foil: String((i + 1) / 20)}}));
    r.fulfill({contentType: 'application/json', body: JSON.stringify(a)});
  });
  return calls;
}
const want = c => { const n = parseInt(c.id.split('-').pop(), 10) || 1; const t = TIERS[c.tier]; if (c.rev) return 0.5; return t >= 2 ? n / 10 : 0.1; };

test('value: pack summary chips, zoom price, cache, binder + collection value', async ({page}) => {
  const calls = await mockPrices(page);
  const {errs} = await gotoApp(page);
  await chooseSet(page, 12); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  await expect(page.locator('#packval')).not.toContainText('loading', {timeout: 20000});
  const exp = await page.evaluate(`const want=${want.toString()}; current.map(c => want(c))`);
  const chips = await page.$$eval('#summary .sgrid .card .pchip', e => e.map(x => x.textContent));
  expect(chips).toEqual(exp.map(v => '$' + v.toFixed(2)));
  const sum = exp.reduce((a, b) => a + b, 0);
  await expect(page.locator('#packval b:not(.pvbest)')).toHaveText('$' + sum.toFixed(2));
  await expect(page.locator('#packval')).toContainText('TCGplayer market');
  expect(calls.ptcg).toBe(1);                         // bulk tried once, falls back to TCGdex per card
  // zoom shows price + source + date
  await page.locator('#summary .sgrid .card').last().click();
  await expect(page.locator('#zprice')).toContainText('$' + exp[exp.length - 1].toFixed(2));
  await expect(page.locator('#zprice')).toContainText('TCGplayer market · 2026-10-14');
  await page.keyboard.press('Escape');
  // cache persisted with timestamp
  await page.waitForTimeout(600);
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem('rctPrice')));
  const ids = await page.evaluate(() => current.map(c => c.id));
  for (const id of ids) { expect(db.c[id].t).toBeGreaterThan(Date.now() - 600000); expect(db.c[id].d).toBe('2026-10-14'); }
  // header collection value
  const owned = await page.evaluate(`const want=${want.toString()}; Object.values(store.sets).length && current.reduce((a,c)=>a+want(c),0)`);
  await expect(page.locator('#valc')).toHaveText('$' + owned.toFixed(2), {timeout: 5000});
  // shelf: total, per-binder value, most valuable
  await openShelf(page);
  await expect(page.locator('#pxtotal')).toHaveText('$' + owned.toFixed(2));
  await expect(page.locator('#pxpanel')).toContainText('TCGplayer market estimates (as of 2026-10-14)');
  await expect(page.locator('.binder[data-i="12"] .bval')).toHaveText('$' + owned.toFixed(2));
  const top = Math.max(...exp);
  await expect(page.locator('.pxmv button').first()).toContainText('$' + top.toFixed(2));
  await page.locator('.pxmv button').first().click(); await expect(page.locator('#viewer.on')).toBeVisible(); await page.keyboard.press('Escape');
  await page.locator('.binder[data-i="12"]').click();
  await expect(page.locator('#bvalb')).toHaveText('Binder value $' + owned.toFixed(2));
  // reload: served from cache, no new requests
  const before = calls.dex;
  await page.reload(); await page.waitForSelector('.tile');
  await expect(page.locator('#valc')).toHaveText('$' + owned.toFixed(2));
  await page.waitForTimeout(500); expect(calls.dex).toBe(before);
  // stale (>24h) entries are refetched
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('rctPrice')); Object.values(d.c).forEach(o => o.t -= 25 * 3600e3); localStorage.setItem('rctPrice', JSON.stringify(d)); });
  await page.reload(); await page.waitForSelector('.tile'); await openShelf(page); await page.locator('#pxupd').click();
  await expect.poll(() => calls.dex).toBeGreaterThan(before);
  expect(errs.filter(noise)).toEqual([]);
});

test('value: missing price + lorcana foil prices in box summary', async ({page}) => {
  await mockPrices(page, {noPrice: ['sv08-001']});
  const {errs} = await gotoApp(page);
  const r = await page.evaluate(async () => { const s = SETBY['sv08']; const a = await priceFor({id: 'sv08-001', rarity: 'Common', tier: 'common'}, s); return [a, priceLine({id: 'sv08-001', rarity: 'Common', tier: 'common'}, s)]; });
  expect(r[0]).toBeNull(); expect(r[1]).toContain('no price');
  await page.locator('#gtabs button[data-g="lor"]').click();
  await chooseSet(page, 25);
  await page.locator('#sbox').click(); await tearWrap(page); await openLid(page); await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#bxvaln')).toContainText('240/240 priced'.replace('240/240', await page.evaluate(() => { const n = BOX.res.reduce((a, p) => a + p.length, 0); return n + '/' + n; })), {timeout: 15000});
  const exp = await page.evaluate(() => BOX.res.flat().reduce((a, c) => { const n = parseInt(c.id.split('-').pop(), 10); return a + (c.rev || TIERS[c.tier] >= 5 ? n / 20 : 0.25); }, 0));
  const shown = await page.locator('#bxval').textContent();
  expect(Math.abs(parseFloat(shown.replace(/[$,]/g, '')) - exp)).toBeLessThan(0.011);
  await expect(page.locator('#bxmv')).toContainText('Most valuable');
  await expect(page.locator('#bxhits .pr').first()).toContainText('$');
  expect(errs.filter(noise)).toEqual([]);
});

test('value: best pull / hits / most valuable follow market price (two SIRs, cheaper one earlier)', async ({page}) => {
  await mockPrices(page, {cap: 5, price: {}});
  const {errs} = await gotoApp(page);
  await chooseSet(page, 12);
  const ids = await page.evaluate(() => {
    const all = Object.values(cache[set.dex].pools).flat().filter(c => c && /special illustration/i.test(c.rarity));
    const uniq = [...new Map(all.map(c => [c.id, c])).values()];
    const [a, b] = uniq; newBox(set, boxProducts(set)[0]);
    // strip other big hits so nothing else competes on rank, then plant cheap SIR in pack 8, chase SIR in pack 14
    BOX.packs.forEach(p => p.forEach((c, i) => { if (rRank(c) >= 60) p[i] = {...c, rarity: 'Rare', tier: 'rare', rev: false}; }));
    BOX.packs[7][BOX.packs[7].length - 1] = {...a, rev: false};
    BOX.packs[13][BOX.packs[13].length - 1] = {...b, rev: false};
    BOX.wrap = 1; BOX.lid = 1; return [a.id, b.id, a.name, b.name];
  });
  // the route is already registered; inject the two prices into the mock via a second route taking precedence
  await page.route('https://api.tcgdex.net/v2/en/cards/**', r => {
    const id = decodeURIComponent(r.request().url().split('/cards/')[1]);
    const v = id === ids[0] ? 32.39 : id === ids[1] ? 136.89 : null;
    if (v == null) return r.fallback();
    r.fulfill({contentType: 'application/json', body: JSON.stringify({id, pricing: {tcgplayer: {updated: '2026-10-14T22:55:00Z', unit: 'USD', holofoil: {marketPrice: v}}}})});
  });
  await page.locator('#sbox').click();
  await expect(page.locator('#bxall')).toBeEnabled();
  await page.locator('#bxall').click(); await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#boxv .bxsum')).toBeVisible();
  await expect(page.locator('#bxbestp')).toContainText('$136.89', {timeout: 40000});
  await expect(page.locator('.bxbest .bbi')).toContainText(ids[3]);
  await expect(page.locator('.bxbest .bbi')).toContainText('Pack #14');
  expect(await page.evaluate(() => BOX.hitList[0].k)).toBe(13);
  expect(await page.evaluate(() => BOX.hitList[1].k)).toBe(7);
  await expect(page.locator('#bxhits [data-pj="0"]')).toContainText('$136.89');
  await expect(page.locator('#bxmv')).toContainText(ids[3]);
  // the zoom from the first hit opens the chase card
  await page.locator('#bxhits .bxt').first().click();
  await expect(page.locator('#viewer.on')).toBeVisible();
  await expect(page.locator('#zprice')).toContainText('$136.89');
  await page.keyboard.press('Escape');
  // ranking without prices: rarity order
  expect(await page.evaluate(() => [rRank({rarity: 'Mega Hyper Rare'}) > rRank({rarity: 'Special Illustration Rare'}), rRank({rarity: 'Special Illustration Rare'}) > rRank({rarity: 'Ultra Rare'}), rRank({rarity: 'Ultra Rare'}) > rRank({rarity: 'Illustration Rare'}), rRank({rarity: 'Illustration Rare'}) > rRank({rarity: 'Double Rare'}), rRank({rarity: 'Enchanted'}) > rRank({rarity: 'Epic'}), rRank({rarity: 'Iconic'}) > rRank({rarity: 'Legendary'})])).toEqual([true, true, true, true, true, true]);
  expect(errs.filter(noise)).toEqual([]);
});
