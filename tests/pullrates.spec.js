const {test, expect} = require('@playwright/test');
const {gotoApp} = require('./helpers');
test('simulated pull rates match data/pullrates.json (10k packs/set)', async ({page}) => {
  test.setTimeout(120000);
  await gotoApp(page);
  const out = await page.evaluate(async () => {
    const cfg = await loadPR(), N = 10000, res = {};
    const key = c => { const r = (c.rarity||'').toLowerCase();
      if (c.pat) return c.pat; if (c.energy) return 'energy';
      return /galarian gallery gold/.test(r)?'ggg':/galarian gallery v/.test(r)?'ggv':/galarian gallery/.test(r)?'gg':/classic collection/.test(r)?'cc':/radiant/.test(r)?'rad':/shiny ultra/.test(r)?'sur':/shiny rare/.test(r)?'sr':/futuristic/.test(r)?'fr':/rgb rare/.test(r)?'rgb':/pikachu rare/.test(r)?'pk':/ace spec/.test(r)?'ace':/special illustration/.test(r)?'sir':/illustration/.test(r)?'ir':/hyper|black white/.test(r)?'hr':/double/.test(r)?'dr':/secret/.test(r)?'sec':/vmax/.test(r)?'vmax':/holo rare v|rare holo v/.test(r)?'v':/ultra/.test(r)?'ur':/holo/.test(r)?'holo':'x'; };
    for (const s of SETS.filter((x, i) => x.game !== 'lor' && i < 25)) { const C = cfg[s.dex]; const d = await getCards(s); const cnt = {}; let bad = 0;
      for (let i = 0; i < N; i++) { const p = buildPack(s, d.pools);
        if (p.length !== (s.era==='wotc'?11:({cel:4,c30:5}[C.structure]||10)) || p.filter(x=>x.energy).length !== (s.dex==='base1'?2:0)) bad++;
        const best = Math.max(...p.map(x => TIERS[x.tier])); if (TIERS[p[p.length-1].tier] !== best) bad++;
        new Set(p.map(key)).forEach(k => cnt[k] = (cnt[k]||0) + 1); }
      const rows = {}; for (const [k, t] of Object.entries(C.rates)) { if (!t) continue; rows[k] = {t, o: (cnt[k]||0)/N}; }
      res[s.dex] = {bad, rows}; }
    return res; });
  const fails = [];
  for (const [set, {bad, rows}] of Object.entries(out)) {
    if (bad) fails.push(`${set}: ${bad} malformed packs`);
    for (const [k, {t, o}] of Object.entries(rows)) { const tol = 4*Math.sqrt(t*(1-t)/10000) + 0.002;
      if (Math.abs(o - t) > tol) fails.push(`${set}.${k}: target ${t.toFixed(4)} observed ${o.toFixed(4)}`); } }
  console.log(JSON.stringify(out));
  expect(fails).toEqual([]);
});

test('god packs: only documented sets, frequency within tolerance, contents rules', async ({page}) => {
  test.setTimeout(120000);
  await gotoApp(page);
  const out = await page.evaluate(async () => {
    const cfg = await loadPR(), res = {fails: [], freq: {}};
    const ALLOWED = ['sv03.5', 'sv08.5', 'sv10.5b', 'sv10.5w', 'me02.5'];
    for (const [k, v] of Object.entries(cfg)) if (v && v.godPacks && !ALLOWED.includes(k)) res.fails.push(`${k}: unexpected godPacks`);
    for (const s of SETS) { const C = cfg[s.dex]; if (!C || !C.godPacks) continue;
      for (const g of C.godPacks) { if (!g.estimated || !g.note || !g.source || !(g.rate > 0)) res.fails.push(`${s.dex}.${g.kind}: missing estimated/note/source/rate`); }
      // frequency of the god-pack roll (cheap) over 2M packs
      const N = 2e6, cnt = {}; for (let i = 0; i < N; i++) { const g = godKind(C); if (g) cnt[g.kind] = (cnt[g.kind]||0) + 1; }
      for (const g of C.godPacks) { const o = (cnt[g.kind]||0)/N, t = g.rate, tol = 4*Math.sqrt(t*(1-t)/N);
        res.freq[`${s.dex}.${g.kind}`] = {t, o}; if (Math.abs(o - t) > tol) res.fails.push(`${s.dex}.${g.kind} freq target ${t} observed ${o}`); }
      // contents: forced packs of every kind
      const d = await getCards(s);
      for (const g of C.godPacks) for (let i = 0; i < 300; i++) { const p = godPack(s, d.pools, g), tag = `${s.dex}.${g.kind}`;
        if (p.length !== 10) { res.fails.push(`${tag}: length ${p.length}`); break; }
        if (!p.god || p.god.kind !== g.kind) { res.fails.push(`${tag}: not tagged`); break; }
        const hits = p.filter(c => c.gh), ids = hits.map(c => c.id);
        if (new Set(ids).size !== ids.length) { res.fails.push(`${tag}: duplicate hits`); break; }
        const best = Math.max(...p.map(c => TIERS[c.tier])); if (TIERS[p[9].tier] !== best) { res.fails.push(`${tag}: best not last`); break; }
        const nIR = hits.filter(c => /^illustration/i.test(c.rarity)).length, nSIR = hits.filter(c => /special illustration/i.test(c.rarity)).length;
        const want = {starter: [3, 2, 1], '3sir': [3, 0, 3], eeveelutions: [10, 0, 9], '9ir1sir': [10, 9, 1], '3ma7sir': [10, 0, 7]}[g.contents];
        if (hits.length !== want[0] || nIR !== want[1] || nSIR !== want[2]) { res.fails.push(`${tag}: hits ${hits.length} IR ${nIR} SIR ${nSIR}`); break; }
        if (g.contents === 'starter' && new Set(hits.map(c => c.name.split(' ')[0])).size !== 3) { res.fails.push(`${tag}: not a single evolution line`); break; }
        if (g.contents === 'eeveelutions' && (p[0].name !== 'Eevee' || p[0].pat !== 'mb' || p[9].name !== 'Umbreon ex')) { res.fails.push(`${tag}: eeveelution layout`); break; }
        if (g.contents === '3ma7sir' && hits.slice(0, 3).some(c => !/^Mega .* ex$/.test(c.name))) { res.fails.push(`${tag}: MA stand-ins`); break; } } }
    return res; });
  console.log(JSON.stringify(out.freq));
  expect(out.fails).toEqual([]);
});
