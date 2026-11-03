const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf} = require('./helpers');
// every added main-series set (SETS index >= 39): local data, real pack art, era-correct pack shape, sane pull rates, binder
const GRPS = ['base','neo','ecard','ex','dp','pl','hgss','bw','xy','sm','swsh','sv'];
for (const G of GRPS) test(`allsets ${G}: load, pack shape, rates, binder`, async ({page}) => {
  test.setTimeout(85000);
  await gotoApp(page);
  const r = await page.evaluate(async G => {
    const cfg = await loadPR(), out = {};
    const sets = SETS.map((s, i) => [s, i]).filter(([s, i]) => i >= 39 && s.game !== 'lor' && (s.grp || s.serie) === G);
    for (const [s] of sets) {
      const C = cfg[s.dex] || {}, d = await getCards(s), N = 2500;
      const len = C.structure === 'gen' ? (C.slots || [['c',5],['u',3]]).reduce((a, x) => a + x[1], 0) + (C.rev ?? 1) + (C.rare === 0 ? 0 : 1) : C.structure === 'sv' ? 10 : 11;
      let bad = 0, rev = 0, holo = 0; const key = {}, seen = new Set();
      for (let i = 0; i < N; i++) { const p = buildPack(s, d.pools);
        if (p.length !== len) bad++;
        const best = Math.max(...p.map(x => TIERS[x.tier])); if (TIERS[p[p.length - 1].tier] !== best) bad++;
        if (p.some(x => x.rev)) rev++; if (/holo|shining/i.test(p[p.length - 1].rarity)) holo++;
        const ks = new Set(); p.forEach(x => { seen.add(x.id); if (C.structure === 'gen') ks.add(genKey(x.rarity)); }); ks.forEach(k => key[k] = (key[k] || 0) + 1); }
      const chk = {}; if (C.structure === 'gen') for (const k of [...(C.rareX || []), ...(C.revX || [])]) if (C.rates[k] >= 1/60) chk[k] = [C.rates[k], (key[k] || 0) / N];
      out[s.dex] = {n: d.n ?? (Array.isArray(d.list) ? d.list.length : 0), sn: s.n, src: d.src, bad, art: (PACKART[s.dex] || []).length, era: s.era, st: C.structure, est: C.estimated, revRate: rev / N, revWant: (C.rev ?? 1) ? 1 - (C.revX || []).reduce((a, k) => a + (C.rates[k] || 0), 0) : 0, holoRate: holo / N, chk, uniq: seen.size, rel: !!s.rel};
    }
    return out;
  }, G);
  const ks = Object.keys(r);
  console.log(G, ks.length, JSON.stringify(r));
  test.skip(!ks.length, 'era not added yet');
  for (const [k, v] of Object.entries(r)) {
    expect(v.src, k).toBe('local'); expect(v.bad, k).toBe(0); expect(v.art, k).toBeGreaterThan(0); expect(v.rel, k).toBe(true);
    expect(v.st, k).toBeTruthy(); expect(v.est === true || v.est === false, k).toBe(true);
    expect(v.uniq, k).toBeGreaterThanOrEqual(Math.min(20, v.n));
    for (const [kk, [want, got]] of Object.entries(v.chk)) { expect(got, `${k} ${kk}`).toBeGreaterThan(want * 0.5); expect(got, `${k} ${kk}`).toBeLessThan(want * 1.8 + 0.01); }
    if (v.st === 'wotc') { expect(v.holoRate, k).toBeGreaterThan(0.26); expect(v.holoRate, k).toBeLessThan(0.42); }
    if (v.st === 'gen' && !/^(base|neo)$/.test(G)) expect(v.revRate, k).toBeGreaterThanOrEqual(v.revWant * 0.9);
  }
  // open the newest set of this era through the UI and check its binder
  const i = await page.evaluate(G => { const l = SETS.map((s, i) => [s, i]).filter(([s, i]) => i >= 39 && (s.grp || s.serie) === G && PACKART[s.dex]).sort((a, b) => b[0].rel.localeCompare(a[0].rel)); return l[0][1]; }, G);
  await chooseSet(page, i); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  await openShelf(page);
  const h = page.locator(`#shelf .era[data-era="${G}"]`);
  await expect(h).toBeVisible(); if (await h.evaluate(e => e.classList.contains('shut'))) await h.click();
  const b = page.locator(`.binder[data-i="${i}"]`);
  await expect(b.locator('.bcount')).toHaveText(/^[1-9]\d* \/ \d+/, {timeout: 20000});
  await b.click(); await page.waitForSelector('#book .page', {timeout: 30000});
  await page.locator('.bfilt button[data-f="owned"]').click();
  await expect.poll(() => page.locator('#book .pocket.own').count()).toBeGreaterThan(0);
});

test('set picker: eras collapse, search, started filter', async ({page}) => {
  await gotoApp(page);
  const eras = await page.$$eval('#sets .era', e => e.map(x => x.dataset.era));
  expect(eras[0]).toBe('me'); expect(eras[eras.length - 1]).toBe('base');
  const total = await page.evaluate(() => PKS.length);
  expect(total).toBe(await page.evaluate(() => SETS.filter(s => s.game !== 'lor').length));
  // newest first within an era
  const rels = await page.$$eval('#sets .tile[data-g="sv"]', t => t.map(x => SETS[x.dataset.i].rel));
  expect([...rels].sort().reverse()).toEqual(rels);
  // toggle an era
  const sv = page.locator('#sets .era[data-era="sv"]');
  const n0 = await page.locator('#sets .tile[data-g="sv"]').count(); expect(n0).toBeGreaterThan(5);
  await sv.click(); await expect(page.locator('#sets .tile[data-g="sv"]')).toHaveCount(0);
  await page.reload(); await page.waitForSelector('.tile');
  await expect(page.locator('#sets .era[data-era="sv"]')).toHaveClass(/shut/);
  await page.locator('#sets .era[data-era="sv"]').click(); await expect(page.locator('#sets .tile[data-g="sv"]')).toHaveCount(n0);
  // search finds across collapsed eras
  await page.fill('#setq', 'jungle');
  await expect(page.locator('#sets .tile[data-i] h3')).toHaveText(['Jungle']);
  await page.fill('#setq', '1999');
  await expect.poll(() => page.locator('#sets .tile[data-i]').count()).toBeGreaterThanOrEqual(3);
  await page.fill('#setq', 'zzzz'); await expect(page.locator('.pkempty')).toBeVisible();
  await page.fill('#setq', '');
  // started filter: nothing opened yet
  await page.locator('.pkchips [data-f="own"]').click(); await expect(page.locator('#sets .tile[data-i]')).toHaveCount(0);
  await page.locator('.pkchips [data-f="all"]').click();
  await expect(page.locator('#sets .btile')).toBeVisible(); await expect(page.locator('#sets .atile')).toBeVisible();
});
