const {test, expect} = require('@playwright/test');
const {gotoApp, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');

// Subset cards (30th Classic Collection / RGB Mew, Celebrations Classic Collection, Crown Zenith Galarian Gallery)
// used to be saved under keys the binder never looks up (30th/cc01, 30th-rgb/R, cel25cc/CC001, swsh12.5gg/GG01).
test.use({serviceWorkers: 'block'});

const OLD = {packs: 7, coll: {}, hist: [], migrated: 1, sets: {
  '30th': {'1': {name: 'Exeggcute', rarity: 'Common', n: 2, lid: '001'},
           'cc01': {name: 'Pikachu', rarity: 'Classic Collection', n: 2, rv: 1, lid: 'cc01'},
           'CC01': {name: 'Pikachu', rarity: 'Classic Collection', n: 1, lid: 'cc01'},
           'cc09': {name: 'Dark Tyranitar', rarity: 'Classic Collection', n: 1, lid: 'cc09'}},
  '30th-rgb': {'R': {name: 'Mew', rarity: 'RGB Rare', n: 1, lid: 'R'}},
  'cel25cc': {'CC001': {name: 'Blastoise', rarity: 'Classic Collection', n: 1, lid: 'CC001'}},
  'swsh12.5gg': {'GG01': {name: 'Hisuian Voltorb', rarity: 'Galarian Gallery', n: 3, lid: 'GG01'}},
  'lorcana-4': {'1': {name: 'Ariel', rarity: 'Common', n: 1, lid: '001'}}}};

async function quiet(page) {
  // live price APIs are not needed (the subset prices come from data/px-snap.json)
  await page.route(/api\.pokemontcg\.io|api\.tcgdex\.net\/v2\/en\/cards|api\.lorcast\.com/, r => r.abort());
}
async function ownedInBinder(page, dex) {
  return page.evaluate(async d => {
    await openBinder(SETBY[d]);
    document.querySelector('.bfilt button[data-f="owned"]').click();
    await new Promise(r => setTimeout(r, 400));
    const all = [];
    for (let i = 0; i < 40; i++) {
      document.querySelectorAll('#book .pocket.own').forEach(p => all.includes(p.dataset.n) || all.push(p.dataset.n));
      const nx = document.getElementById('bnext');
      if (!nx || nx.disabled || /(\d+) of \1\b/.test(document.getElementById('bpage').textContent)) break;
      nx.click(); await new Promise(r => setTimeout(r, 350));
    }
    return {own: all, page: document.getElementById('bpage').textContent};
  }, dex);
}

test('old subset keys are migrated and show as owned', async ({page}) => {
  await quiet(page);
  await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rct', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(OLD));
  await gotoApp(page);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('rct')).sets);
  expect(Object.keys(st).sort()).toEqual(['30th', 'cel25', 'lorcana-4', 'swsh12.5']);
  expect(st['30th'].CC01).toMatchObject({n: 3, rv: 1, name: 'Pikachu'});   // cc01 (2, 1 reverse) + CC01 (1) merged
  expect(st['30th'].CC09.n).toBe(1);
  expect(st['30th']['RGB-R']).toMatchObject({n: 1, id: '30th-rgb-R'});
  expect(st['30th'].cc01).toBeUndefined();
  expect(st.cel25.CC001.n).toBe(1);
  expect(st['swsh12.5'].GG01.n).toBe(3);
  expect(st['lorcana-4']['1'].n).toBe(1);                                     // untouched
  const bak = await page.evaluate(() => JSON.parse(localStorage.getItem('rctBak10') || '[]'));
  expect(bak.length).toBe(5);

  const b30 = await ownedInBinder(page, '30th');
  expect(b30.own).toEqual(expect.arrayContaining(['1', 'CC01', 'CC09', 'RGB-R']));
  expect(b30.page).toMatch(/4\/191/);
  // Classic Collection pocket shows its real scan (not the TCGdex path rebuilt from the parent set)
  await page.evaluate(() => { document.querySelector('.bfilt button[data-f="all"]').click(); });
  await expect(page.locator('#bvalb')).toContainText('$', {timeout: 15000});
  expect((await ownedInBinder(page, 'cel25')).own).toContain('CC001');
  expect((await ownedInBinder(page, 'swsh12.5')).own).toContain('GG01');

  // achievements see the migrated cards (binder % for 30th = 4/191 -> 2%)
  const per = await page.evaluate(() => ACH.per['30th']);
  expect(per.any).toBe(1);

  // reload: nothing moves twice, counts stay
  await page.reload(); await page.waitForSelector('.tile');
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('rct')).sets['30th']);
  expect(st2.CC01.n).toBe(3);
});

test('pulling a 30th Classic Collection card fills its binder pocket', async ({page}) => {
  await quiet(page);
  await gotoApp(page);
  await page.evaluate(() => {
    const ob = buildPack;
    window.buildPack = buildPack = function (s, p) {
      const r = ob.apply(this, arguments);
      if (s.dex === '30th') { const cc = Object.values(p).flat().find(c => c && c.id === '30th-cc02'); if (cc) r[0] = {...cc}; }
      return r;
    };
  });
  await page.locator('.tile[data-i="24"]').click();
  await page.waitForFunction(() => /Swipe the packs|Tap to open/.test(document.body.innerText), null, {timeout: 60000});
  await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('rct')).sets);
  expect(st['30th'].CC02.n).toBe(1);
  expect(st['30th'].cc02).toBeUndefined();
  const b = await ownedInBinder(page, '30th');
  expect(b.own).toContain('CC02');
  const src = await page.evaluate(() => { const p = [...document.querySelectorAll('#book .pocket.own')].find(p => p.dataset.n === 'CC02'); return p && p.querySelector('img') && p.querySelector('img').getAttribute('src'); });
  expect(src).toMatch(/scrydex\.com\/pokemon\/me55c-/);
});
