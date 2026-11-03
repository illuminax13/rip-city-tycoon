const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear} = require('./helpers');

// NEW-hit alerts: a hit you didn't own before this pack -> ribbon + toast on reveal, NEW tags + count in the summary.
test.use({serviceWorkers: 'block'});
const quiet = e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e);

async function setup(page, sets = {}, prefs) {
  await page.route(/api\.pokemontcg\.io|api\.tcgdex\.net\/v2\/en\/cards|api\.lorcast\.com/, r => r.abort());
  await page.addInitScript(([sets, prefs]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rct', JSON.stringify({packs: 25, coll: {}, hist: [], migrated: 1, sets}));
    localStorage.setItem('rctNudge', String(Date.now() + 9e9)); if (prefs) localStorage.setItem('rctPrefs', JSON.stringify(prefs)); }, [sets, prefs]);
  return gotoApp(page);
}
// open a pack on Surging Sparks whose contents are fixed: 9 commons + `kind` last ('dr' = a Double rare off the chase list, 'chase' = #1 chase card, 'none' = a plain Rare)
async function openFixed(page, kind) {
  await chooseSet(page, 12); await skipAndLand(page);
  const hit = await page.evaluate(k => {
    const all = Object.values(cache[set.dex].pools).flat(), ch = nhChase(set);
    const com = all.filter(c => c.tier === 'common').slice(0, 9);
    const h = k === 'chase' ? chRank(set, chCards(cache[set.dex]))[0].c
      : k === 'dr' ? all.find(c => /double rare/i.test(c.rarity) && !ch.has(keyOf(c.id).join('|')))
      : all.find(c => c.tier === 'rare');
    NEXT = {s: set, p: [...com, h].map(c => ({...c}))};
    return {id: h.id, name: h.name, rarity: h.rarity, key: keyOf(h.id)};
  }, kind);
  await tapCenterPack(page); await doTear(page);
  return hit;
}
async function revealWatching(page) {
  await page.evaluate(() => { window.__nhSeen = []; const t0 = () => { const t = document.getElementById('nhtoast'); if (t && t.classList.contains('on')) { const x = t.textContent; if (window.__nhSeen[window.__nhSeen.length - 1] !== x) window.__nhSeen.push(x); } };
    window.__nhPoll = setInterval(t0, 50); });
  await page.locator('#reveal').click();
  await page.waitForSelector('#summary.on', {timeout: 60000});
  await page.waitForTimeout(400);
  return page.evaluate(() => { clearInterval(window.__nhPoll); return {toasts: window.__nhSeen, log: window.__newHits.slice()}; });
}

test('new hit: ribbon + toast on reveal, NEW tag and count in the summary, then it is owned', async ({page}) => {
  const {errs} = await setup(page);
  const hit = await openFixed(page, 'dr');
  // ribbon appears on the card face when flipped (before the summary)
  await page.evaluate(() => { for (let i = 0; i < 9; i++) { flipTop(); sendAway(1); } });
  await page.waitForTimeout(700);
  await page.evaluate(() => flipTop());
  await expect(page.locator('#nhtoast')).toHaveClass(/on/);
  await expect(page.locator('#nhtoast')).toContainText('New hit for your binder!');
  await expect(page.locator('#nhtoast')).toContainText(hit.name);
  await expect(page.locator('#stack .card.flipped .nhrib')).toHaveCount(1);
  expect(await page.evaluate(() => window.__newHits.map(x => [x.name, x.chase]))).toEqual([[hit.name, false]]);
  await page.evaluate(() => sendAway(1));
  await page.waitForSelector('#summary.on', {timeout: 20000});
  await expect(page.locator('#summary .sgrid .card .nhrib')).toHaveCount(1);
  await expect(page.locator('#summary .sgrid .card').nth(9).locator('.nhrib')).toHaveCount(1);
  await expect(page.locator('#summary .nhsum')).toHaveText(/1 new hit for your binder/);
  await expect(page.locator('#summary .nhsum')).not.toContainText('Chase');
  expect(await page.evaluate(k => store.sets[k[0]][k[1]].n, hit.key)).toBe(1);
  expect(errs.filter(quiet)).toEqual([]);
});

test('chase-list card says "Chase card pulled!"', async ({page}) => {
  await setup(page);
  const hit = await openFixed(page, 'chase');
  const r = await revealWatching(page);
  expect(r.log.map(x => [x.name, x.chase])).toEqual([[hit.name, true]]);
  expect(r.toasts.join('|')).toContain('Chase card pulled!');
  await expect(page.locator('#summary .nhsum')).toContainText('Chase card pulled!');
  await expect(page.locator('#summary .nhrib.chase')).toHaveCount(1);
});

test('duplicate hit shows nothing (subset keys resolve like the binder)', async ({page}) => {
  // own the Double rare that the fixed pack will contain: find it first, seed, reload
  await setup(page);
  await chooseSet(page, 12);
  const k = await page.evaluate(() => { const all = Object.values(cache[set.dex].pools).flat(), ch = nhChase(set);
    return keyOf(all.find(c => /double rare/i.test(c.rarity) && !ch.has(keyOf(c.id).join('|'))).id); });
  await page.evaluate(k => { store.sets[k[0]] = store.sets[k[0]] || {}; store.sets[k[0]][k[1]] = {name: 'x', rarity: 'Double rare', n: 1}; save(); }, k);
  await page.reload(); await page.waitForSelector('.tile');
  const hit = await openFixed(page, 'dr');
  expect(hit.key).toEqual(k);
  const r = await revealWatching(page);
  expect(r.log).toEqual([]); expect(r.toasts).toEqual([]);
  await expect(page.locator('#summary .nhrib, #summary .nhsum')).toHaveCount(0);
  expect(await page.evaluate(k => store.sets[k[0]][k[1]].n, k)).toBe(2);
  // subset cards: an owned 30th Classic Collection card saved under its canonical key is a duplicate, a new one is new
  const sub = await page.evaluate(() => { const S = SETBY['30th'], save0 = store.sets['30th'];
    store.sets['30th'] = {CC02: {n: 2}, CC05: {n: 1}};   // CC02 owned before (+1 now), CC05 first copy now
    const p = [{id: '30th-cc02', name: 'Charizard', rarity: 'Classic Collection', tier: 'ultra'}, {id: '30th-cc05', name: 'X', rarity: 'Classic Collection', tier: 'ultra'}];
    const m = nhMark(p, S); store.sets['30th'] = save0; return [...m.keys()]; });
  expect(sub).toEqual([1]);
});

test('non-hit pulls show nothing', async ({page}) => {
  await setup(page);
  await openFixed(page, 'none');
  const r = await revealWatching(page);
  expect(r.log).toEqual([]); expect(r.toasts).toEqual([]);
  await expect(page.locator('#summary .nhrib, #summary .nhsum')).toHaveCount(0);
});

test('settings toggle turns alerts off (and persists)', async ({page}) => {
  await setup(page);
  await page.locator('#setbtn').click();
  const opt = page.locator('#optNew');
  await expect(opt).toBeChecked();
  await opt.uncheck();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rctPrefs')).newHits)).toBe(false);
  await page.mouse.click(5, 300);
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => PREF.newHits)).toBe(false);
  const hit = await openFixed(page, 'dr');
  const r = await revealWatching(page);
  expect(r.log).toEqual([]); expect(r.toasts).toEqual([]);
  await expect(page.locator('#summary .nhrib, #summary .nhsum')).toHaveCount(0);
  expect(await page.evaluate(k => store.sets[k[0]][k[1]].n, hit.key)).toBe(1);   // still saved, just not announced
});

// ---- every open path uses the same detection (pre-open ownership snapshot) ----
// booster box with fixed contents: packs 3 and 20 carry the #1 chase card (new -> only the first copy is NEW),
// pack 7 a Double rare that is already owned (dupe -> nothing), pack 11 a new non-chase Double rare.
async function fixedBox(page, land = false) {
  await chooseSet(page, 12); if (land) await skipAndLand(page);
  return page.evaluate(async () => {
    await openBox(set); const all = Object.values(cache[set.dex].pools).flat(), ch = nhChase(set);
    const com = all.filter(c => c.tier === 'common').slice(0, 9), chase = chRank(set, chCards(cache[set.dex]))[0].c;
    const drs = all.filter(c => /double rare/i.test(c.rarity) && !ch.has(keyOf(c.id).join('|')));
    const own = drs[0], fresh = drs.find(c => c.id !== own.id), rare = all.find(c => c.tier === 'rare' && !c.rev);
    const [d, n] = keyOf(own.id); (store.sets[d] = store.sets[d] || {})[n] = {name: own.name, rarity: own.rarity, n: 1, lid: n}; store.coll[own.id] = {name: own.name, rarity: own.rarity, n: 1, t: 4}; save();
    newBox(set, {name: 'Virtual box', n: 36, real: 0});
    BOX.packs = BOX.packs.map((p, k) => [...com.map(c => ({...c})), {...(k === 3 || k === 20 ? chase : k === 7 ? own : k === 11 ? fresh : rare)}]);
    BOX.done = BOX.packs.map(() => 0); BOX.wrap = 1; BOX.lid = 1; boxSave(); boxIntro();
    return {chase: {id: chase.id, name: chase.name}, own: {id: own.id, name: own.name}, fresh: {id: fresh.id, name: fresh.name}};
  });
}
async function watchToasts(page) {
  await page.evaluate(() => { window.__nhSeen = []; window.__nhPoll = setInterval(() => { const t = document.getElementById('nhtoast'); if (t && t.classList.contains('on')) { const x = t.textContent; if (window.__nhSeen[window.__nhSeen.length - 1] !== x) window.__nhSeen.push(x); } }, 40); });
}
const stopToasts = page => page.evaluate(() => { clearInterval(window.__nhPoll); return window.__nhSeen; });

test('booster box Open All: new chase SIR gets NEW ribbons + "Chase card pulled!" callout and ONE toast; dupes do not', async ({page}) => {
  const {errs} = await setup(page);
  const b = await fixedBox(page);
  await watchToasts(page);
  await page.evaluate(() => { window.__hap0 = HAP.n; boxFast(); });
  await page.evaluate(() => document.getElementById('bxskip').click());
  await expect(page.locator('#boxv .bxsum')).toBeVisible();
  await page.waitForTimeout(900);
  const toasts = await stopToasts(page);
  // one toast for the whole box
  expect(toasts.length).toBe(1);
  expect(toasts[0]).toContain('Chase card pulled!');
  expect(toasts[0]).toContain('2 new hits for your binder');
  await expect(page.locator('#boxv .bxsum .nhsum.bxnh')).toContainText('Chase card pulled!');
  await expect(page.locator('#boxv .bxsum .nhsum.bxnh')).toContainText('✦ 2 new hits for your binder');
  const marks = await page.evaluate(() => BOX.hitList.map((x, j) => ({id: x.c.id, k: x.k, rib: !!document.querySelector(`#bxhits .bxt[data-j="${j}"] .nhrib`), chase: !!document.querySelector(`#bxhits .bxt[data-j="${j}"] .nhrib.chase`)})));
  const ch = marks.filter(m => m.id === b.chase.id);
  expect(ch.length).toBe(2);                                         // pulled twice in the box
  expect(ch.filter(m => m.rib).map(m => m.k)).toEqual([3]);          // only the first copy is NEW
  expect(ch.find(m => m.k === 3).chase).toBe(true);
  expect(marks.filter(m => m.id === b.own.id && m.rib)).toEqual([]);  // already owned -> no ribbon
  expect(marks.filter(m => m.id === b.fresh.id && m.rib).length).toBe(1);
  // best pull is the chase card -> ribbon there too
  if (await page.evaluate(id => BOX.best.c.id === id && BOX.best.k === 3, b.chase.id)) await expect(page.locator('#boxv .bbc .nhrib')).toHaveCount(1);
  const log = await page.evaluate(() => window.__newHits.filter(l => l.box));
  expect(log.map(l => l.name).sort()).toEqual([b.chase.name, b.fresh.name].sort());
  expect(await page.evaluate(() => HAP.n >= window.__hap0)).toBe(true);
  // re-opening the box summary later shows the ribbons again but does not re-toast
  await expect(page.locator('#nhtoast')).not.toHaveClass(/\bon\b/, {timeout: 6000});
  await watchToasts(page);
  await page.evaluate(() => boxSummary()); await page.waitForTimeout(600);
  expect(await stopToasts(page)).toEqual([]);
  await expect(page.locator('#bxhits .nhrib')).toHaveCount(2);
  // prices arriving re-sort the HITS grid (bxResort re-renders it): the ribbons must survive
  await page.evaluate(() => { BOX.hitList.reverse(); bxResort(BOX); });
  await expect(page.locator('#bxhits .nhrib')).toHaveCount(2);
  expect(errs.filter(quiet)).toEqual([]);
});

test('booster box where every hit is already owned: no ribbons, no callout, no toast', async ({page}) => {
  await setup(page);
  const b = await fixedBox(page);
  await page.evaluate(() => { for (const p of BOX.packs) { const own = p[p.length - 1]; const [d, n] = keyOf(own.id); (store.sets[d] = store.sets[d] || {})[n] = {name: own.name, rarity: own.rarity, n: 1, lid: n}; } save(); });
  await watchToasts(page);
  await page.evaluate(() => boxFast()); await page.evaluate(() => document.getElementById('bxskip').click());
  await expect(page.locator('#boxv .bxsum')).toBeVisible(); await page.waitForTimeout(800);
  expect(await stopToasts(page)).toEqual([]);
  await expect(page.locator('#boxv .nhrib')).toHaveCount(0);
  await expect(page.locator('#boxv .nhsum')).toHaveCount(0);
});

test('a single pack opened from the box uses the same detection; its NEW card keeps the ribbon in the box summary', async ({page}) => {
  await setup(page);
  const b = await fixedBox(page, true);
  await page.evaluate(() => boxOne(3));
  await page.waitForSelector('#tear.on', {timeout: 30000}); await doTear(page);
  const {toasts, log} = await revealWatching(page);
  expect(toasts.some(t => t.includes('Chase card pulled!'))).toBe(true);
  expect(log.filter(l => l.name === b.chase.name).length).toBe(1);
  // rest of the box: the second chase copy (pack 20) is a dupe now
  await page.evaluate(() => { boxShell().classList.add('on'); boxFast(); document.getElementById('bxskip').click(); });
  await expect(page.locator('#boxv .bxsum')).toBeVisible();
  const ribs = await page.evaluate(id => BOX.hitList.map((x, j) => [x.c.id, x.k, !!document.querySelector(`#bxhits .bxt[data-j="${j}"] .nhrib`)]).filter(x => x[0] === id), b.chase.id);
  expect(ribs.filter(r => r[2]).map(r => r[1])).toEqual([3]);
  await expect(page.locator('#boxv .nhsum.bxnh')).toContainText('2 new hits');
});

test('Reveal All / skip path and the 20-pack fast flow share the snapshot (NH.pre cleared after each open)', async ({page}) => {
  await setup(page);
  const hit = await openFixed(page, 'chase');
  const {log} = await revealWatching(page);
  expect(log.filter(l => l.name === hit.name).length).toBe(1);
  expect(await page.evaluate(() => [NH.pre, current[current.length - 1].nh && current[current.length - 1].nh.chase])).toEqual([null, true]);
});
