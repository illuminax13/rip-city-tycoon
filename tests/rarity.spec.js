const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet} = require('./helpers');

test('rarity distribution over 1000 packs', async ({page}) => {
  await gotoApp(page);
  await chooseSet(page, 0); // Base Set wotc
  const stats = await page.evaluate(() => {
    const s = set, pools = cache[s.dex].pools;
    let badTop=0, badBottom=0, badLen=0, n=1000;
    for (let i=0;i<n;i++) {
      const p = buildPack(s, pools);
      if (p.length !== 11) badLen++;
      if (p.filter(x=>x.energy).length !== 2) badTop++;
      const last = p[p.length-1];
      if (!(last.tier==='rare' || last.tier==='holo' || last.tier==='ultra' || last.tier==='illus' || last.tier==='sir')) badBottom++;
    }
    // SV set
    const sv = SETS[5];
    // load sv pools
    let holo=0;for(let i=0;i<1000;i++){const p=buildPack(s,pools);if(p[p.length-1].tier==='holo')holo++}
    return {badTop, badBottom, badLen, n, holo};
  });
  expect(stats.badLen).toBe(0);
  expect(stats.badTop).toBe(0);
  expect(stats.badBottom).toBe(0);
  expect(stats.holo).toBeGreaterThan(200);
  expect(stats.holo).toBeLessThan(470);

  // also SV
  await page.locator('#sback').click();
  await page.waitForSelector('#vPick.on');
  await chooseSet(page, 5); // Evolving Skies
  const sv = await page.evaluate(() => {
    const s = set, pools = cache[s.dex].pools;
    let badTop=0, badBottom=0, badLen=0;
    for (let i=0;i<1000;i++) {
      const p = buildPack(s, pools);
      if (p.length !== 10) badLen++;
      if (p.some(x=>x.energy)) badTop++;
      const last = p[p.length-1];
      const ok = ['rare','holo','ultra','illus','sir'].includes(last.tier);
      if (!ok) badBottom++;
    }
    return {badTop, badBottom, badLen};
  });
  expect(sv.badLen).toBe(0);
  expect(sv.badTop).toBe(0);
  expect(sv.badBottom).toBe(0);
});
