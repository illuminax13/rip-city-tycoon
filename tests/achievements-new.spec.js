const {test, expect} = require('@playwright/test');
const {gotoApp} = require('./helpers');
// set/era achievements added with the full set list; the collection below spans 5 decades-worth of eras
const SEED = {"det1": {"1": {"name": "Bulbasaur", "rarity": "Common", "n": 1}, "2": {"name": "Ludicolo", "rarity": "Rare", "n": 1}, "3": {"name": "Morelull", "rarity": "Common", "n": 1}, "4": {"name": "Charmander", "rarity": "Common", "n": 1}, "5": {"name": "Charizard", "rarity": "Rare Ultra", "n": 1}, "6": {"name": "Arcanine", "rarity": "Rare", "n": 1}, "7": {"name": "Psyduck", "rarity": "Common", "n": 1}, "8": {"name": "Magikarp", "rarity": "Common", "n": 1}, "9": {"name": "Greninja", "rarity": "Rare Ultra", "n": 1}, "10": {"name": "Detective Pikachu", "rarity": "Rare", "n": 1}, "11": {"name": "Mr. Mime", "rarity": "Rare", "n": 1}, "12": {"name": "Mewtwo", "rarity": "Rare Ultra", "n": 1}, "13": {"name": "Machamp", "rarity": "Rare", "n": 1}, "14": {"name": "Jigglypuff", "rarity": "Common", "n": 1}, "15": {"name": "Snubbull", "rarity": "Common", "n": 1}, "16": {"name": "Lickitung", "rarity": "Common", "n": 1}, "17": {"name": "Ditto", "rarity": "Rare Ultra", "n": 1}, "18": {"name": "Slaking", "rarity": "Rare", "n": 1}}, "base1": {"4": {"name": "Charizard", "rarity": "Rare Holo", "n": 1}}, "base4": {"4": {"name": "Charizard", "rarity": "Rare Holo", "n": 1}}, "ex16": {"100": {"name": "Flareon \u2606", "rarity": "Rare Holo Gold Star", "n": 1}}, "ex1": {"96": {"name": "Chansey ex", "rarity": "Rare Holo ex", "n": 1}}, "dp1": {"120": {"name": "Empoleon", "rarity": "Rare Holo LV.X", "n": 1}}, "hgss1": {"105": {"name": "Ampharos", "rarity": "Rare Prime", "n": 1}, "111": {"name": "Ho-Oh LEGEND", "rarity": "LEGEND", "n": 1}}, "neo4": {"106": {"name": "Shining Celebi", "rarity": "Rare Secret Shining", "n": 1}}, "ecard2": {"150": {"name": "Lugia", "rarity": "Rare Holo Crystal", "n": 1}}, "xy1": {"1": {"name": "Venusaur EX", "rarity": "Rare Holo EX", "n": 1}}, "xy8": {"12": {"name": "Chesnaught BREAK", "rarity": "Rare BREAK", "n": 1}}, "sm1": {"12": {"name": "Decidueye GX", "rarity": "Rare Holo GX", "n": 1}, "158": {"name": "Nest Ball", "rarity": "Rare Secret Gold", "n": 1}, "151": {"name": "Lunala GX", "rarity": "Rare Rainbow", "n": 1}}, "sm5": {"58": {"name": "Giratina \u25c7", "rarity": "Rare Prism Star", "n": 1}}, "sm115": {"SV1": {"name": "Scyther", "rarity": "Shiny Rare", "n": 1}}, "bw11": {"RC1": {"name": "Snivy", "rarity": "RC Rare Holo", "n": 1}}, "swsh1": {"50": {"name": "Lapras VMAX", "rarity": "Holo Rare VMAX", "n": 1}}, "swsh4": {"9": {"name": "Celebi", "rarity": "Amazing Rare", "n": 1}}, "swsh9": {"14": {"name": "Shaymin VSTAR", "rarity": "Holo Rare VSTAR", "n": 1}}, "swsh10": {"TG01": {"name": "Abomasnow", "rarity": "Trainer Gallery Rare Holo", "n": 1}, "27": {"name": "Radiant Heatran", "rarity": "Radiant Rare", "n": 1}, "161": {"name": "Beedrill V", "rarity": "Rare Ultra Alternate Art", "n": 1}}, "sv08": {"57": {"name": "Pikachu ex", "rarity": "Double rare", "n": 1}}};
const NEW = ['era5','wotc','decade','done3','wotcfull','eramaster','s25','s50','s100','u500','u1000','u2500','star','shn','cry','exl','lvx','prime','leg','bigex','brk','gx','prism','vmax','vstar','amz','rad','tg','rc','svr','alt','rbw','gold','zard1'];
test('achievements (eras & sets): new list, credited from an existing collection with one quiet summary', async ({page}) => {
  test.setTimeout(80000);
  await page.addInitScript(seed => { if (sessionStorage.__seeded) return; sessionStorage.__seeded = 1;
    window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('achtoast'); if (t && t.classList.contains('on')) { const s = t.querySelector('small'), b = t.querySelector('b'); const x = (s ? s.textContent : '') + '|' + (b ? b.textContent : ''); if (window.__toasts[window.__toasts.length - 1] !== x) window.__toasts.push(x); } }).observe(document, {subtree: true, attributes: true, attributeFilter: ['class'], childList: true});
    // an existing player (achievements from before this update) - new badges must be credited quietly
    localStorage.setItem('rctAch', JSON.stringify({v: 1, u: {p1: Date.now() - 864e5}, bf: {}, st: {boxes: 0, dry: 0}, bt: {}, nw: 0}));
    localStorage.setItem('rct', JSON.stringify({packs: 40, coll: {}, hist: [], migrated: 1, sets: seed})); }, SEED);
  await gotoApp(page);
  const info = await page.evaluate(() => ({n: ACHS.length, ids: ACHS.map(a => a.id), eras: ACH_ERAS.length, cats: ACH_CATS.map(c => c[0])}));
  expect(info.n).toBeGreaterThanOrEqual(41 + 25);
  for (const id of NEW) expect(info.ids, id).toContain(id);
  expect(new Set(info.ids).size).toBe(info.ids.length);
  expect(info.cats).toContain('era'); expect(info.eras).toBe(13);
  const want = ['era5','decade','wotc','star','shn','cry','exl','lvx','prime','leg','bigex','brk','gx','prism','vmax','vstar','amz','rad','tg','rc','svr','alt','rbw','gold','zard1','zard','pika'];
  await expect.poll(() => page.evaluate(w => w.filter(id => !ACH.d.u[id]).join(','), want), {timeout: 20000}).toBe('');
  // Detective Pikachu binder is complete (18/18): one completed binder, in the SM era; not WotC, not 3 binders
  await expect.poll(() => page.evaluate(() => { const S = achAgg(); return [S.done, S.doneEras, S.wotcDone, S.uniq >= 18 + 20]; }), {timeout: 20000}).toEqual([1, 1, 0, true]);
  const u = await page.evaluate(() => ACH.d.u);
  for (const id of ['done3', 'wotcfull', 'eramaster', 's25', 'u500']) expect(u[id], id).toBeFalsy();
  expect(await page.evaluate(() => ACH.d.bf.star && ACH.d.bf.gold && !ACH.d.bf.p1)).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__toasts.length), {timeout: 15000}).toBe(1);
  expect(await page.evaluate(() => window.__toasts[0])).toMatch(/^Credited from your collection\|\d+ achievements unlocked/);
  // view: Eras & sets section with progress
  await page.locator('#achbtn').click(); await expect(page.locator('#vAch.on')).toBeVisible();
  await expect(page.locator('#vAch .achh', {hasText: 'Eras & sets'})).toBeVisible();
  await expect(page.locator('#vAch .ach[data-id="s25"] .achpn')).toHaveText(/^2\d \/ 25$|^1\d \/ 25$/);
  await expect(page.locator('#vAch .ach[data-id="eramaster"] .achpn')).toHaveText('1 / 13');
  await expect(page.locator('#vAch .ach.on[data-id="star"] .achd')).toContainText('from your collection');
  // reload: nothing re-announced, no longer silent
  await page.reload(); await page.waitForSelector('.tile'); await page.waitForTimeout(1500);
  expect(await page.evaluate(() => [ACH.silent, ACH.d.av, window.__toasts ? window.__toasts.length : 0])).toEqual([false, 2, 0]);
});

test('achievements (eras & sets): opening a WotC pack unlocks Old School live', async ({page}) => {
  const {chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');
  await gotoApp(page);
  const i = await page.evaluate(() => SETS.findIndex(s => s.dex === 'base4'));
  await chooseSet(page, i); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  await expect.poll(() => page.evaluate(() => [!!ACH.d.u.wotc, !!ACH.d.bf.wotc])).toEqual([true, false]);
});
