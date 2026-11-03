const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');

test('collection persists across reload; migration from old coll format', async ({page}) => {
  // migrate old format
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
    localStorage.setItem('rct', JSON.stringify({
      packs: 2,
      hist: ['#1 Base Set: best pull Charizard (Rare Holo)'],
      coll: {'base1-4':{name:'Charizard',rarity:'Rare Holo',imgs:['assets/card-back.jpg'],n:2,t:3}}
    }));
  });
  await gotoApp(page);
  const migrated = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('rct'));
    return s.sets && s.sets.base1 && s.sets.base1['4'] && s.sets.base1['4'].n === 2;
  });
  expect(migrated).toBeTruthy();

  await chooseSet(page, 0);
  await skipAndLand(page);
  await tapCenterPack(page);
  await doTear(page);
  await revealAll(page);
  const packsBefore = await page.locator('#count').textContent();
  await page.reload();
  await page.waitForSelector('.tile');
  expect(await page.locator('#count').textContent()).toBe(packsBefore);
});

test('reset clears collection', async ({page}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1');
    localStorage.setItem('rct', JSON.stringify({packs:5,coll:{},hist:[],sets:{base1:{'4':{name:'Z',rarity:'R',imgs:[],n:1}}}}));
  });
  await gotoApp(page);
  page.once('dialog', d => d.accept());
  await Promise.all([page.waitForEvent('load'), page.locator('#reset').click()]);
  await page.waitForSelector('.tile');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('rct')||'{}'));
  expect(st.packs||0).toBe(0);
  expect(Object.keys(st.sets||{}).length).toBe(0);
  expect(await page.locator('#count').textContent()).toBe('0');
});
