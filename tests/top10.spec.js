const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear} = require('./helpers');

// TOP 10 HITS replaces the home Collection grid: ranking by market price, then rarity tier, then set recency;
// hero #1 + row #2-10, tap opens the zoom; Mega Hyper Rare Scrydex scans everywhere; "New Top 10 hit! #N" toast.
test.use({serviceWorkers: 'block'});
const HADES_X = '1|crd_a9c86e6316084d76a03b32be95977091?1709690747|510148';
const SEED = {
  'me02.5': {'295': {name: 'Mega Dragonite ex', rarity: 'Mega Hyper Rare', n: 1, lid: '295'}, '290': {name: 'Mega Dragonite ex', rarity: 'Special illustration rare', n: 1, lid: '290'}},
  'base1': {'4': {name: 'Charizard', rarity: 'Rare Holo', n: 2, lid: '4'}, '2': {name: 'Blastoise', rarity: 'Rare Holo', n: 1, lid: '2'}, '58': {name: 'Pikachu', rarity: 'Common', n: 5, lid: '58'}},
  'sv03.5': {'199': {name: 'Charizard ex', rarity: 'Special illustration rare', n: 1, lid: '199'}, '205': {name: 'Mew ex', rarity: 'Hyper rare', n: 1, lid: '205'}},
  'neo1': {'9': {name: 'Lugia', rarity: 'Rare Holo', n: 1, lid: '9'}},
  'lorcana-1': {'205': {name: 'Hades - King of Olympus', rarity: 'Enchanted', n: 1, lid: '205', x: HADES_X}},
};
const PRICES = {'me02.5-295': 900, 'base1-4': 400, 'sv03.5-199': 250, 'lorcana-1-205': 120, 'me02.5-290': 60, 'base1-58': 5000};
const ORDER = ['me02.5-295', 'base1-4', 'sv03.5-199', 'lorcana-1-205', 'me02.5-290', /* unpriced: */ 'sv03.5-205', 'neo1-9', 'base1-2'];
const SCRY = /^https:\/\/images\.scrydex\.com\/pokemon\/me2pt5-295\/(large|medium)/;

async function setup(page, sets = SEED, packs = 40) {
  await page.route(/api\.pokemontcg\.io|api\.tcgdex\.net\/v2\/en\/cards|api\.lorcast\.com|px-snap\.json|tcgcsv|tcgplayer/, r => r.abort());
  await page.route(/images\.scrydex\.com/, r => r.fulfill({path: 'assets/card-back.jpg', contentType: 'image/jpeg'}));
  await page.addInitScript(([sets, packs]) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const coll = {}; for (const [d, o] of Object.entries(sets)) for (const [n, e] of Object.entries(o)) coll[d + '-' + n] = {name: e.name, rarity: e.rarity, n: e.n, t: 3, x: e.x};
    localStorage.setItem('rct', JSON.stringify({packs, coll, hist: [], migrated: 1, sets}));
    localStorage.setItem('rctNudge', String(Date.now() + 9e9)); }, [sets, packs]);
  const r = await gotoApp(page);
  await page.evaluate(P => { window.__P = P; window.priceOf = c => (c.id in P ? {v: P[c.id], d: '2026-10-20', via: 'test'} : null); __t10.key = ''; __t10.sig = ''; pxHeader(); }, PRICES);
  await page.waitForTimeout(150);
  return r;
}

test('collection grid is gone; Top 10 ranks by price, then rarity, then recency; badges, prices, set names', async ({page}) => {
  const {errs} = await setup(page);
  expect(await page.locator('#coll').count()).toBe(0);
  expect(await page.locator('section h2', {hasText: /^Collection$/}).count()).toBe(0);
  await expect(page.locator('#t10sec h2')).toHaveText(/Top 10 Hits/i);
  // header pills still work
  await expect(page.locator('#count')).toHaveText('40');
  await expect(page.locator('#uniq')).toHaveText('9');
  const ids = await page.evaluate(() => window.__top10.map(r => r.id));
  expect(ids).toEqual(ORDER);                      // the $5000 Common is not a hit
  await expect(page.locator('#top10 .t10c')).toHaveCount(8);
  await expect(page.locator('#top10 .t10c.hero')).toHaveCount(1);
  await expect(page.locator('#top10 .t10hinfo .t10name')).toHaveText('Mega Dragonite ex');
  await expect(page.locator('#top10 .t10hinfo .t10v')).toHaveText('$900.00');
  await expect(page.locator('#top10 .t10hinfo .t10set')).toHaveText('Ascended Heroes');
  const row = await page.$$eval('#top10 .t10row .t10c', bs => bs.map(b => [b.querySelector('.t10rk').className, b.querySelector('.t10rk').textContent, b.querySelector('.t10v').textContent, b.querySelector('small').textContent]));
  expect(row[0]).toEqual(['t10rk rk2', '2', '$400.00', 'Base Set']);
  expect(row[1]).toEqual(['t10rk rk3', '3', '$250.00', 'Scarlet & Violet 151']);
  expect(row[2]).toEqual(['t10rk rk4', '4', '$120.00', 'The First Chapter']);
  expect(row[4][2]).toMatch(/hyper rare/i);          // unpriced: shows its rarity instead of a price
  await expect(page.locator('#top10 .t10more')).toContainText('Open packs to fill your Top 10');
  await expect(page.locator('#top10 .t10more')).toContainText('2 spots left');
  // images are lazy
  expect(await page.$$eval('#top10 img', is => is.every(i => i.loading === 'lazy'))).toBe(true);
  // cached: re-rendering the home without changes does not re-rank or rebuild the DOM
  const before = await page.evaluate(() => [__t10.ranks, __t10.renders]);
  await page.evaluate(() => { render(); pxHeader(); pxHeader(); });
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => [__t10.ranks, __t10.renders])).toEqual(before);
  // price change -> recomputed (pxChanged epoch)
  await page.evaluate(() => { __P['neo1-9'] = 2000; pxChanged(); });
  await expect.poll(() => page.evaluate(() => window.__top10[0].id)).toBe('neo1-9');
  await expect(page.locator('#top10 .t10hinfo .t10name')).toHaveText('Lugia');
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e))).toEqual([]);
});

test('fallback without prices: rarity tier, then set recency', async ({page}) => {
  await setup(page);
  const ids = await page.evaluate(() => { window.priceOf = () => null; __t10.key = ''; t10Update(true); return window.__top10.map(r => r.id); });
  // Mega Hyper 100 > Enchanted 95 > Hyper 92 > SIR 85 (2026 set before 2023 set) > Rare Holo (2000 Neo before 1999 Base, Charizard/Blastoise by id)
  expect(ids).toEqual(['me02.5-295', 'lorcana-1-205', 'sv03.5-205', 'me02.5-290', 'sv03.5-199', 'neo1-9', 'base1-2', 'base1-4']);
  await expect(page.locator('#t10sub')).toHaveText('by rarity');
});

test('tap opens the zoom on the right card; swipe row works as a list', async ({page}) => {
  await setup(page);
  await page.locator('#top10 .t10c.hero').scrollIntoViewIfNeeded();
  await page.locator('#top10 .t10c.hero').click();
  await expect(page.locator('#viewer')).toHaveClass(/on/);
  await expect(page.locator('#vinfo')).toContainText('Mega Dragonite ex');
  expect(await page.$eval('#vcard .front img', i => i.getAttribute('src'))).toMatch(SCRY);
  await page.locator('#znext').click();
  await expect(page.locator('#vinfo')).toContainText('Charizard');
  await page.keyboard.press('Escape'); await page.evaluate(() => closeZoom());
  const b = page.locator('#top10 .t10row .t10c[data-i="3"]'); await b.scrollIntoViewIfNeeded(); await b.click();
  await expect(page.locator('#viewer')).toHaveClass(/on/);
  await expect(page.locator('#vinfo')).toContainText('Hades');
  expect(await page.evaluate(() => Z.i)).toBe(3);
});

test('Mega Hyper Rare Scrydex scan is enforced in every render path, even with stale tcgdex imgs', async ({page}) => {
  await setup(page);
  const r = await page.evaluate(() => {
    const T = 'https://assets.tcgdex.net/en/me/me02.5/295', stale = [T + '/high.webp', T + '/low.webp', 'https://images.pokemontcg.io/me2pt5/295.png'];
    store.sets['me02.5']['295'].imgs = stale.slice(); store.coll['me02.5-295'].imgs = stale.slice();
    __t10.key = ''; t10Update(true);
    const src = h => { const d = document.createElement('div'); d.innerHTML = h; return d.querySelector('img').getAttribute('src'); };
    const s = SETBY['me02.5'], c = {id: 'me02.5-295', name: 'Mega Dragonite ex', rarity: 'Mega Hyper Rare', imgs: stale.slice(), era: 'me'};
    const prev = set; set = s; const el = cardEl({...c, tier: tier(c.rarity)}, 0); set = prev;            // pack reveal + summary + zoom card
    return {
      top10: document.querySelector('#top10 .t10c.hero img').getAttribute('src'),
      top10srcset: document.querySelector('#top10 .t10c.hero img').getAttribute('srcset'),
      card: el.querySelector('.front img').getAttribute('src'),
      chase: src(img(chThumb(c, s), c.name, c.rarity)),
      pimg: src(img(['https://images.pokemontcg.io/me2pt5/295_hires.png', 'https://images.pokemontcg.io/me2pt5/295.png'], 'x', '')),
      low: src(img([T + '/low.webp'], 'x', '')),
      other: src(img(['https://assets.tcgdex.net/en/me/me02.5/290/high.webp'], 'x', '')),     // the SIR is not overridden
      lor: src(img(lorSrcs(SETBY['lorcana-1'], '205', '1|crd_a|1'), 'x', '')),
      all8: Object.entries({me01: ['187', '188'], me02: ['130'], 'me02.5': ['294', '295'], me03: ['124'], me04: ['122'], me05: ['120']}).flatMap(([d, ns]) => SETBY[d] ? ns.map(n => src(img([`https://assets.tcgdex.net/en/me/${d}/${n}/high.webp`], 'x', ''))) : []),
    };
  });
  for (const k of ['top10', 'card', 'chase', 'pimg', 'low']) expect(r[k], k).toMatch(SCRY);
  expect(r.top10srcset).toContain('/medium 367w');
  expect(r.other).toContain('assets.tcgdex.net');
  expect(r.lor).not.toContain('scrydex');
  expect(r.all8.length).toBeGreaterThanOrEqual(6);
  for (const u of r.all8) expect(u).toMatch(/^https:\/\/images\.scrydex\.com\/pokemon\/me[\dpt]+-\d+\/large$/);
  // binder pocket (stored imgs are the stale tcgdex ones)
  const pocket = await page.evaluate(async () => { await openBinder(SETBY['me02.5']); const i = slots().findIndex(c => c.n === '295'); if (i < 0) return 'no slot';
    const d = document.createElement('div'); d.innerHTML = pageHTML(Math.floor(i / 9)); const im = [...d.querySelectorAll('img')].find(x => x.alt === 'Mega Dragonite ex' && /295/.test(x.getAttribute('src') + x.dataset.srcs)); return im ? im.getAttribute('src') : 'no img'; });
  expect(pocket).toMatch(SCRY);
});

test('a failing Scrydex scan is retried once before the flat tcgdex scan', async ({page}) => {
  await setup(page, {});
  let hits = 0; await page.unroute(/images\.scrydex\.com/);
  await page.route(/images\.scrydex\.com\/pokemon\/me2pt5-294/, r => { hits++; return hits <= 1 ? r.abort() : r.fulfill({path: 'assets/card-back.jpg', contentType: 'image/jpeg'}); });
  const fin = await page.evaluate(async () => { const d = document.createElement('div'); d.innerHTML = img(['https://assets.tcgdex.net/en/me/me02.5/294/high.webp'], 'x', ''); document.body.appendChild(d);
    const i = d.querySelector('img'); await new Promise(r => setTimeout(r, 2500)); return i.currentSrc || i.src; });
  expect(fin).toMatch(/images\.scrydex\.com\/pokemon\/me2pt5-294\/large\?retry=1/);
  expect(hits).toBe(2);
});

test('empty and small states', async ({page}) => {
  await setup(page, {});
  await expect(page.locator('#top10 .t10more.empty')).toHaveText('No hits yet. Open packs to fill your Top 10.');
  await expect(page.locator('#top10 .t10c')).toHaveCount(0);
});

async function openFixed(page, kind) {
  await chooseSet(page, 12); await skipAndLand(page);
  const hit = await page.evaluate(k => {
    const all = Object.values(cache[set.dex].pools).flat();
    const com = all.filter(c => c.tier === 'common').slice(0, 9);
    const h = all.find(c => /double rare/i.test(c.rarity));
    NEXT = {s: set, p: [...com, h].map(c => ({...c}))};
    return {id: h.id, name: h.name};
  }, kind);
  await tapCenterPack(page); await doTear(page);
  return hit;
}
async function revealWatching(page) {
  await page.evaluate(() => { window.__nhSeen = []; window.__t10Busy = []; window.__nhPoll = setInterval(() => { const t = document.getElementById('nhtoast'); if (t && t.classList.contains('on')) { const x = t.querySelector('b').textContent; if (window.__nhSeen[window.__nhSeen.length - 1] !== x) window.__nhSeen.push(x); }
    if (!document.querySelector('#summary.on')) window.__t10Busy.push(document.querySelector('#top10').textContent.includes(window.__hitName)); }, 50); });
  await page.locator('#reveal').click();
  await page.waitForSelector('#summary.on', {timeout: 60000});
  await page.waitForTimeout(400);
  return page.evaluate(() => { clearInterval(window.__nhPoll); return {toasts: window.__nhSeen, log: window.__newHits.slice(), spoiled: window.__t10Busy.some(Boolean), polls: window.__t10Busy.length}; });
}

test('a pulled card that cracks a full Top 10 says "New Top 10 hit! #N"; the showcase waits for the summary', async ({page}) => {
  const ten = {'base1': {}}; for (let i = 1; i <= 10; i++) ten.base1[String(i)] = {name: 'Holo ' + i, rarity: 'Rare Holo', n: 1, lid: String(i)};
  await setup(page, ten);
  await page.evaluate(() => { window.priceOf = c => (/^sv08-/.test(c.id) ? {v: 77} : /^base1-/.test(c.id) ? {v: 10} : null); __t10.key = ''; t10Update(true); });
  const hit = await openFixed(page, 'dr');
  await page.evaluate(n => { window.__hitName = n; }, hit.name);
  const {toasts, log, spoiled} = await revealWatching(page);
  expect(toasts).toContain('New Top 10 hit! #1');
  expect(log.find(l => l.name === hit.name).top).toBe(1);
  await expect(page.locator('#summary .nhsum .t10s')).toHaveText('New Top 10 hit! #1');
  expect(spoiled).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__top10[0].id)).toBe(hit.id);
});

test('a new hit that does not crack the Top 10 keeps the normal new-hit toast', async ({page}) => {
  const ten = {'base1': {}}; for (let i = 1; i <= 10; i++) ten.base1[String(i)] = {name: 'Holo ' + i, rarity: 'Rare Holo', n: 1, lid: String(i)};
  await setup(page, ten);
  await page.evaluate(() => { window.priceOf = c => (/^base1-/.test(c.id) ? {v: 500} : {v: 1}); __t10.key = ''; t10Update(true); });
  await expect(page.locator('#top10 .t10c')).toHaveCount(10);
  await expect(page.locator('#top10 .t10more')).toHaveCount(0);
  const hit = await openFixed(page, 'dr');
  const {toasts, log} = await revealWatching(page);
  expect(toasts).toContain('New hit for your binder!');
  expect(toasts.some(t => /Top 10/.test(t))).toBe(false);
  expect(log.find(l => l.name === hit.name).top).toBeUndefined();
});
