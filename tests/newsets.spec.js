const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet} = require('./helpers');
test('picker grouped by era newest first, all new sets load with real pack art', async ({page}) => {
  await gotoApp(page);
  const eras = await page.$$eval('#sets .era', e => e.map(x => x.dataset.era));
  const ORDER = ['me','sv','swsh','sm','xy','bw','hgss','pl','dp','ex','ecard','neo','base'];
  expect(eras).toEqual(ORDER.filter(g => eras.includes(g)));
  expect(eras.slice(0,3)).toEqual(['me','sv','swsh']); expect(eras[eras.length-1]).toBe('base');
  const n = await page.$$eval('#sets .tile[data-i]', t => t.length);
  expect(n).toBeGreaterThanOrEqual(25);
  const r = await page.evaluate(async () => {
    const out = {}, cfg = await loadPR(), LEN = s => s.era==='wotc'?11:({cel:4,c30:5}[(cfg[s.dex]||{}).structure]||10);
    for (const s of SETS.slice(0,25)) {
      const c = await getCards(s); const pools = c.pools; let bad = 0, hits = {};
      for (let i = 0; i < 2000; i++) { const p = buildPack(s, pools);
        if (p.length !== LEN(s) || p.filter(x=>x.energy).length !== (s.dex==='base1'?2:0)) bad++;
        const best = Math.max(...p.map(x => TIERS[x.tier])); if (TIERS[p[p.length-1].tier] !== best) bad++;
        p.forEach(x => { hits[x.rarity] = (hits[x.rarity]||0) + 1 }); }
      out[s.dex] = {n: c.n, src: c.src, bad, art: (PACKART[s.dex]||[]).length, hits, ir: /^(sv|me)$/.test(s.serie) && s.dex!=='sv04.5'};
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) {
    expect(v.src, k).toBe('local'); expect(v.bad, k).toBe(0); expect(v.art, k).toBeGreaterThan(0);
    if (v.ir) expect(v.hits['Illustration rare'] || v.hits['Special illustration rare'], k).toBeGreaterThan(0);
  }
  console.log(JSON.stringify(r));
  for (const u of ['assets/packs/me05/mega-darkrai.webp','assets/packs/30th/pikachu.webp','assets/packs/30th/pikachu.jpg','assets/logos/30th.webp','assets/logos/base5-480.webp']) { const resp = await page.request.get(u); expect(resp.ok(), u).toBeTruthy(); }
  const t30 = await page.evaluate(async () => { const s = SETBY['30th'] || SETS.find(x=>x.dex==='30th'); const d = await getCards(s); let pk = 0, nf = 0;
    for (let i = 0; i < 500; i++) { const p = buildPack(s, d.pools); if (p.some(c => /pikachu rare/i.test(c.rarity))) pk++; }
    return {pk, cc: (d.pools.cc||[]).length, rgb: (d.pools.rgb||[]).length, allFoil: !!s.allFoil}; });
  expect(t30.pk).toBe(500); expect(t30.allFoil).toBe(true);
});
