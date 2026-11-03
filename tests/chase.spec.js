const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet} = require('./helpers');

// Chase lists: top cards per set by market price (fallback rarity), owned state, per-card pull odds, zoom.
test.use({serviceWorkers: 'block'});
const SEED = {packs: 30, coll: {}, hist: [], migrated: 1, sets: {
  'sv08.5': {'161': {name: 'Umbreon ex', rarity: 'Special Illustration Rare', n: 2, lid: '161'}},
  '30th': {'CC02': {name: 'Charizard', rarity: 'Classic Collection', n: 1, lid: 'CC02'}}}};

async function setup(page) {
  // live price APIs off: prices come from data/px-snap.json, so the order is deterministic
  await page.route(/api\.pokemontcg\.io|api\.tcgdex\.net\/v2\/en\/cards|api\.lorcast\.com/, r => r.abort());
  await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rct', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(SEED));
  return gotoApp(page);
}
async function binderChase(page, dex) {
  await page.evaluate(d => { window.__chase = null; return openBinder(SETBY[d]); }, dex);
  await page.locator('.bfilt button[data-f="chase"]').click();
  await page.waitForFunction(d => window.__chase && window.__chase.dex === d && window.__chase.odds, dex, {timeout: 30000});
  return page.evaluate(() => window.__chase);
}

test('binder chase tab: price order, owned state, per-card odds', async ({page}) => {
  const {errs} = await setup(page);
  const c = await binderChase(page, 'sv08.5');
  expect(c.rows.length).toBe(15);
  const v = c.rows.map(r => r.v || 0);
  expect(v.slice().sort((a, b) => b - a)).toEqual(v);       // most valuable first
  expect(v[0]).toBeGreaterThan(50);
  expect(await page.locator('#bwrap').isVisible()).toBe(false); // the book is swapped for the list
  const rows = page.locator('#bchase .chrow');
  await expect(rows).toHaveCount(15);
  const ui = c.rows.findIndex(r => r.name === 'Umbreon ex' && r.own === 2);
  expect(ui).toBeGreaterThanOrEqual(0);
  await expect(rows.nth(ui)).toHaveClass(/own/);
  await expect(rows.nth(ui).locator('.chown')).toHaveText('Owned ×2');
  await expect(page.locator('#bchase .chrow.miss').first().locator('.chown')).toHaveText('Missing');
  await expect(page.locator('#bchase .chhead')).toContainText('1/15 owned');
  // odds: every row has '≈1 in N packs'; SIRs from the simulation are about the published SIR rate / number of SIRs
  const odds = await page.locator('#bchase .chodds').allTextContents();
  odds.forEach(t => expect(t).toMatch(/≈1 in [\d,.]+ packs|rarer than/));
  const sir = await page.evaluate(() => { const r = PR['sv08.5'].rates.sir, n = chCards(cache['sv08.5']).filter(c => chKey(c.rarity) === 'sir').length; return {exp: n / r, got: 1 / +document.querySelector('#bchase .chrow .chodds').dataset.p}; });
  expect(sir.got).toBeGreaterThan(sir.exp * 0.6);
  expect(sir.got).toBeLessThan(sir.exp * 1.6);
  // back to the book
  await page.locator('.bfilt button[data-f="all"]').click();
  await expect(page.locator('#bwrap')).toBeVisible();
  await expect(page.locator('#book .pocket').first()).toBeVisible();
  // only network noise allowed (set symbols that 404 upstream, the blocked live price APIs)
  expect(errs.filter(e => !/Failed to load resource|net::|ERR_|CORS|access.control|Cross-Origin/i.test(e))).toEqual([]);
});

test('chase odds use the published rate for ultra-rare groups (30th RGB Mew) and owned subset cards count', async ({page}) => {
  await setup(page);
  const c = await binderChase(page, '30th');
  const rgb = c.rows.filter(r => r.rarity === 'RGB Rare');
  expect(rgb.length).toBe(3);
  expect(c.rows.slice(0, 3).every(r => r.rarity === 'RGB Rare')).toBe(true);   // the three Mews are the top chase
  const t = await page.locator('#bchase .chrow').first().locator('.chodds');
  const exp = await page.evaluate(() => 3 / PR['30th'].rates.rgb);
  expect(+(await t.getAttribute('data-p'))).toBeCloseTo(1 / exp, 8);
  await expect(t).toHaveText(/≈1 in 12,000 packs/);
  const ch = c.rows.find(r => r.name === 'Charizard' && r.rarity === 'Classic Collection');
  expect(ch && ch.own).toBe(1);
});

test('tap a chase row opens the zoom on that card, swipe through the list', async ({page}) => {
  await setup(page);
  const c = await binderChase(page, 'sv08.5');
  await page.locator('#bchase .chrow').nth(1).click();
  await expect(page.locator('#viewer')).toHaveClass(/on/);
  await expect(page.locator('#vinfo')).toContainText(c.rows[1].name);
  await expect(page.locator('#vinfo')).toContainText('2 / 15');
});

test('set page: ★ Chase opens a bottom sheet (Pokémon + Lorcana), backdrop closes it', async ({page}) => {
  await setup(page);
  await chooseSet(page, 13);   // Prismatic Evolutions
  await page.locator('#schase').click();
  await expect(page.locator('#chsheet')).toHaveClass(/on/);
  await expect(page.locator('#chtitle')).toContainText('Prismatic Evolutions');
  await expect(page.locator('#chbody .chrow')).toHaveCount(15, {timeout: 20000});
  await page.locator('#chbody .chrow').first().click();
  await expect(page.locator('#viewer')).toHaveClass(/on/);
  await page.evaluate(() => closeZoom());
  await expect(page.locator('#viewer')).not.toHaveClass(/on/);
  await expect(page.locator('#chsheet')).toHaveClass(/on/);   // closing the zoom returns to the sheet
  await page.locator('#chsheet .chback').click({position: {x: 20, y: 20}});
  await expect(page.locator('#chsheet')).not.toHaveClass(/on/);
  // Lorcana: no live prices here -> falls back to rarity (Enchanted first)
  await page.evaluate(() => { window.__chase = null; chaseOpen(SETBY['lorcana-4']); });
  await page.waitForFunction(() => window.__chase && window.__chase.dex === 'lorcana-4', null, {timeout: 30000});
  const l = await page.evaluate(() => window.__chase.rows.map(r => r.rarity));
  expect(l.length).toBe(15);
  expect(l.slice(0, 5).every(r => r === 'Enchanted')).toBe(true);
  await expect(page.locator('#chbody .chrow').first().locator('img')).toHaveAttribute('src', /.+/);
});
