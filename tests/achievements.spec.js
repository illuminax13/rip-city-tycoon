const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');
const quiet = e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin|Navigated away/i.test(e);
// records every toast that becomes visible and the max number shown at once
const watchToasts = page => page.addInitScript(() => {
  window.__toasts = []; window.__maxOn = 0;
  new MutationObserver(() => { const t = document.getElementById('achtoast'); if (!t) return;
    const on = document.querySelectorAll('#achtoast.on').length; window.__maxOn = Math.max(window.__maxOn, on);
    if (t.classList.contains('on')) { const b = t.querySelector('b'); const x = b && b.textContent; if (x && window.__toasts[window.__toasts.length - 1] !== x) window.__toasts.push(x); }
  }).observe(document, {subtree: true, attributes: true, attributeFilter: ['class'], childList: true});
});
async function onePack(page, i) {
  await chooseSet(page, i); await skipAndLand(page); await tapCenterPack(page); await doTear(page);
  // nothing may show before the cards are revealed
  expect(await page.evaluate(() => document.getElementById('achtoast').classList.contains('on'))).toBe(false);
  await revealAll(page);
}

test('achievements: first pack unlock, toast after reveal, view, persistence', async ({page}) => {
  await watchToasts(page);
  const {errs} = await gotoApp(page);
  expect(await page.evaluate(() => [ACHS.length >= 30, Object.keys(ACH.d.u).length])).toEqual([true, 0]);
  await onePack(page, 12);
  await expect.poll(() => page.evaluate(() => !!ACH.d.u.p1)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__toasts.join('|')), {timeout: 20000}).toMatch(/First Rip|achievements unlocked/);
  expect(await page.evaluate(() => window.__maxOn)).toBe(1);
  // view from the header
  await page.locator('#achbtn').click();
  await expect(page.locator('#vAch.on')).toBeVisible();
  await expect(page.locator('#vAch .achsum')).toContainText(`/ ${await page.evaluate(() => ACHS.length)} unlocked`);
  await expect(page.locator('#vAch .ach.on[data-id="p1"] .achd')).toContainText('Unlocked');
  await expect(page.locator('#vAch .ach[data-id="p10"] .achpn')).toHaveText('1 / 10');
  await expect(page.locator('#vAch .ach.sec').first()).toContainText('Secret achievement');
  // swipe left -> Pokémon tab
  const b = await page.locator('#vAch .achlist').boundingBox();
  await page.mouse.move(b.x + b.width * .8, b.y + 60); await page.mouse.down(); await page.mouse.move(b.x + b.width * .2, b.y + 64, {steps: 6}); await page.mouse.up();
  await expect(page.locator('#vAch .achtabs button.on')).toHaveText('Pokémon');
  await expect(page.locator('#vAch .ach[data-id="lench"]')).toHaveCount(0);
  // persistence
  const before = await page.evaluate(() => ACH.d.u.p1);
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => [ACH.d.u.p1, ACH.silent])).toEqual([before, false]);
  await expect(page.locator('.atile .achtc').first()).toContainText('UNLOCKED');
  expect(errs.filter(quiet)).toEqual([]);
});

test('achievements: backfill from an existing collection is silent with one summary toast', async ({page}) => {
  await watchToasts(page);
  await page.addInitScript(() => { if (sessionStorage.__seeded) return; sessionStorage.__seeded = 1; localStorage.removeItem('rctAch');
    localStorage.setItem('rct', JSON.stringify({packs: 120, coll: {}, hist: ['👑GOD #3 Prismatic Evolutions: best pull Umbreon ex (Special illustration rare)'], migrated: 1,
      sets: {'sv08': {'1': {name: 'Exeggcute', rarity: 'Common', n: 2, rv: 1}, '57': {name: 'Pikachu ex', rarity: 'Double rare', n: 1}, '238': {name: 'Pikachu ex', rarity: 'Special illustration rare', n: 1}},
             'lorcana-1': {'1': {name: 'Ariel - On Human Legs', rarity: 'Uncommon', n: 1, rv: 1}}}})); });
  const {errs} = await gotoApp(page);
  await expect.poll(() => page.evaluate(() => Object.keys(ACH.d.u).sort().join(','))).toContain('p100');
  const u = await page.evaluate(() => ACH.d.u);
  for (const id of ['p1', 'p10', 'p50', 'p100', 'rev', 'ultra', 'ir', 'sir', 'god', 'pika', 'both', 'lfoil']) expect(u[id], id).toBeTruthy();
  for (const id of ['p500', 'box1', 'demi', 'lench']) expect(u[id], id).toBeFalsy();
  // value achievements can be credited a moment later (once data/px-snap.json prices the collection) - still the same single summary
  await expect.poll(() => page.evaluate(() => window.__toasts.length), {timeout: 15000}).toBe(1);
  const nAll = await page.evaluate(() => Object.keys(ACH.d.u).length);
  expect(nAll).toBeGreaterThanOrEqual(Object.keys(u).length);
  expect(await page.evaluate(() => Object.keys(ACH.d.bf).length)).toBe(nAll);
  expect(await page.evaluate(() => window.__toasts.slice())).toEqual([`${nAll} achievements unlocked`]);
  await expect(page.locator('#achtoast small')).toContainText('Credited from your collection');
  await page.waitForTimeout(4500);
  expect(await page.evaluate(() => [window.__toasts.length, ACH.q.length])).toEqual([1, 0]);
  // reload: no second backfill toast
  await page.reload(); await page.waitForSelector('.tile'); await page.waitForTimeout(2500);
  expect(await page.evaluate(() => [ACH.silent, document.getElementById('achtoast').classList.contains('on')])).toEqual([false, false]);
  expect(errs.filter(quiet)).toEqual([]);
});

test('achievements: toast queue never overlaps', async ({page}) => {
  await watchToasts(page);
  await gotoApp(page);
  await page.waitForFunction(() => ACH.d && !ACH.idle);
  await page.evaluate(() => { ACH.silent = false; ['p10', 'p50'].forEach(id => achToast({a: ACHBY[id]})); achToast({multi: [ACHBY.holo, ACHBY.rev, ACHBY.ultra]}); });
  await expect.poll(() => page.evaluate(() => window.__toasts.slice()), {timeout: 20000}).toEqual(['Warming Up', 'Regular', '3 achievements unlocked']);
  expect(await page.evaluate(() => window.__maxOn)).toBe(1);
  // swipe dismiss
  await page.evaluate(() => achToast({a: ACHBY.p100}));
  await page.waitForSelector('#achtoast.on');
  const t = await page.locator('#achtoast').boundingBox();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2); await page.mouse.down(); await page.mouse.move(t.x + t.width / 2 + 120, t.y + t.height / 2, {steps: 5}); await page.mouse.up();
  await expect(page.locator('#achtoast')).not.toHaveClass(/on/, {timeout: 1500});
});

test('achievements: god pack via ?god=1 on Prismatic Evolutions', async ({page}) => {
  await watchToasts(page);
  const {errs} = await gotoApp(page, '/?god=1');
  await onePack(page, 13);
  await expect.poll(() => page.evaluate(() => [!!ACH.d.u.god, !!ACH.d.u.sir, !!ACH.d.u.p1])).toEqual([true, true, true]);
  await expect.poll(() => page.evaluate(() => window.__toasts.join('|')), {timeout: 20000}).toMatch(/achievements unlocked|God Pack/);
  expect(errs.filter(quiet)).toEqual([]);
});

test('achievements: Open All batches unlocks into the box summary', async ({page}) => {
  await watchToasts(page);
  const {errs} = await gotoApp(page);
  await chooseSet(page, 7); // Crown Zenith -> 10-pack ETB
  await page.evaluate(async () => { await openBox(set); newBox(set, boxProducts(set)[0]); BOX.wrap = 1; BOX.lid = 1; boxFast(); });
  expect(await page.evaluate(() => [window.__toasts.length, ACH.q.length])).toEqual([0, 1]); // held during the flight
  await page.locator('#bxskip').click({force: true});
  await expect(page.locator('#boxv .bxach')).toContainText('Achievements unlocked');
  await expect(page.locator('#boxv .bxach')).toContainText('Open All');
  expect(await page.evaluate(() => [!!ACH.d.u.openall, !!ACH.d.u.box1, !!ACH.d.u.p10, ACH.d.st.boxes])).toEqual([true, true, true, 1]);
  await expect.poll(() => page.evaluate(() => window.__toasts.slice()), {timeout: 15000}).toEqual([expect.stringMatching(/achievements? unlocked/)]);
  await expect(page.locator('#achtoast small')).toContainText('Unlocked in this box');
  expect(errs.filter(quiet)).toEqual([]);
});

test('achievements: binder % uses every card; missing secret rares does not unlock Set Complete, old b100 revoked', async ({page}) => {
  const all = require('../data/sv08.json').cards;
  const secret = c => /illustration|hyper|secret|gold/i.test(c.rarity);
  const base = all.filter(c => !secret(c)), have = Object.fromEntries(base.map(c => [c.n, {name: c.name, rarity: c.rarity, n: 1}]));
  expect(base.length).toBeLessThan(all.length);
  await page.addInitScript(([have]) => { if (sessionStorage.__seeded) return; sessionStorage.__seeded = 1;
    localStorage.setItem('rct', JSON.stringify({packs: 30, coll: {}, hist: [], migrated: 1, sets: {sv08: have}}));
    // unlocked under the old base-only rule
    localStorage.setItem('rctAch', JSON.stringify({v: 1, u: {p1: 1, b25: 2, b50: 3, b100: 4}, bf: {b100: 1}, st: {boxes: 0, dry: 0}, bt: {sv08: 191}, nw: 0})); }, [have]);
  const {errs} = await gotoApp(page);
  await expect.poll(() => page.evaluate(() => ACH.d.binv)).toBe(2);
  const pct = Math.floor(base.length / all.length * 1000) / 10;
  expect(await page.evaluate(() => [!!ACH.d.u.b25, !!ACH.d.u.b50, !!ACH.d.u.b100, !!ACH.d.bf.b100, achAgg().bin])).toEqual([true, true, false, false, pct]);
  await page.locator('#achbtn').click();
  await expect(page.locator('#vAch .ach.off[data-id="b100"] .achpn')).toContainText(`${pct}% · Surging Sparks`);
  // the binder screen agrees
  await page.locator('#binders').click(); await expect(page.locator('#vShelf.on')).toBeVisible();
  await expect(page.locator('.binder', {hasText: 'Surging Sparks'}).locator('.bcount')).toContainText(`${base.length} / ${all.length}`);
  // collect the secret rares too -> Set Complete unlocks
  await page.evaluate(sec => { sec.forEach(c => { store.sets.sv08[c.n] = {name: c.name, rarity: c.rarity, n: 1}; }); ACH.dirty.add('sv08'); achEval(); }, all.filter(secret).map(c => ({n: c.n, name: c.name, rarity: c.rarity})));
  expect(await page.evaluate(() => [!!ACH.d.u.b100, achAgg().bin])).toEqual([true, 100]);
  expect(errs.filter(quiet)).toEqual([]);
});
