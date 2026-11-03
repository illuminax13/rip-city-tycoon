const {test, expect} = require('@playwright/test');
const {gotoApp} = require('./helpers');
test.use({serviceWorkers: 'block'});
// User bug (iPhone): gold / hyper rares in zoom were a flat yellow block (Mega Dragonite ex) or washed yellow with a big
// yellow halo (Pikachu ex PRE 179); Mega Hyper Rare showed "no price" and hyper rares were labelled "holo".
test('gold / hyper rares: real scans, white sheen, no yellow halo, holofoil price + retry', async ({page}) => {
  let n295 = 0;
  await page.route('https://api.pokemontcg.io/**', r => r.fulfill({status: 500, body: 'down'}));
  await page.route('**/px-snap.json*', r => r.fulfill({status: 404, body: 'nf'}));   // no snapshot: exercise the live lookup + retry
  await page.route('https://api.tcgdex.net/v2/en/cards/**', r => {
    const id = decodeURIComponent(r.request().url().split('/cards/')[1]);
    if (id === 'me02.5-295' && ++n295 === 1) return r.abort();   // first lookup fails (slow mobile network)
    r.fulfill({contentType: 'application/json', body: JSON.stringify({id, pricing: {tcgplayer: {updated: '2026-10-14T22:55:00Z', unit: 'USD', holofoil: {marketPrice: id === 'me02.5-295' ? 159.4 : 44.02}}, cardmarket: {avg: 200}}})});
  });
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    const get = async id => { const s = setOfId(id); const d = await getCards(s); return {s, c: Object.values(d.pools).flat().find(x => x.id === id)}; };
    const out = {};
    for (const id of ['me02.5-295', 'me01-187', 'me05-120', 'sv08.5-179', 'me02.5-200']) { const {s, c} = await get(id); out[id] = {rar: c.rarity, tier: tier(c.rarity), cls: foilCls(c, s.era, s.serie), src: c.imgs[0], ss: srcsetFor(c.imgs[0])}; }
    out.hydr = cardSrcs(setOfId('me02.5-295'), '295')[0];   // binder / collection hydrate path (no data JSON)
    return out;
  });
  for (const id of ['me02.5-295', 'me01-187', 'me05-120']) {
    expect(r[id].tier, id).toBe('sir'); expect(r[id].cls, id).toContain('t-gold');
    expect(r[id].src, id).toMatch(/^https:\/\/images\.scrydex\.com\/pokemon\/me\w*-\d+\/large$/);
    expect(r[id].ss, id).toContain('/medium 367w');
  }
  expect(r.hydr).toBe('https://images.scrydex.com/pokemon/me2pt5-295/large');
  expect(r['sv08.5-179'].cls).toContain('t-gold'); expect(r['sv08.5-179'].src).toMatch(/tcgdex.*high\.webp$/);
  expect(r['me02.5-200'].src).toMatch(/tcgdex/);   // non-gold cards keep TCGdex
  // zoom: gold foil is white-alpha only, no warm halo, no blend modes; price retries and says holofoil
  for (const [id, price] of [['me02.5-295', '$159.40'], ['sv08.5-179', '$44.02']]) {
    const st = await page.evaluate(async id => {
      const s = setOfId(id); const d = await getCards(s); const c = Object.values(d.pools).flat().find(x => x.id === id);
      openZoom([{c: {...c, tier: tier(c.rarity)}, s}], 0); await new Promise(z => setTimeout(z, 300));
      const card = document.querySelector('#vcard .card'), a = card.querySelector('.fx .a'), fr = card.querySelector('.front');
      const all = [card, ...card.querySelectorAll('*')].filter(e => e.offsetParent !== null || e === card).filter(e => getComputedStyle(e).display !== 'none' && !e.closest('.back')).map(e => getComputedStyle(e).mixBlendMode + ':' + e.className);
      return {cls: card.className, tex: getComputedStyle(a).backgroundImage, fo: +getComputedStyle(a).opacity, after: getComputedStyle(card.querySelector('.inner'), '::after').display,
        fshadow: getComputedStyle(fr).boxShadow, blend: all.filter(m => !m.startsWith('normal')), img: card.querySelector('.front img').getAttribute('src')};
    }, id);
    expect(st.cls).toContain('t-gold');
    expect(st.tex).toContain('repeating-linear-gradient');
    for (const m of st.tex.matchAll(/rgba?\(([^)]*)\)/g)) expect(m[1].split(',').slice(0, 3).map(x => +x), st.tex).toEqual([255, 255, 255]);
    expect(st.fo).toBeLessThanOrEqual(0.5);
    expect(st.after).toBe('none');
    expect(st.fshadow).not.toMatch(/rgba\(255, (2[0-9]{2}), (1[0-9]{2}|2[0-4][0-9])/);   // no warm yellow glow
    expect(st.blend).toEqual([]);
    await expect(page.locator('#zprice')).toContainText(price, {timeout: 15000});
    await expect(page.locator('#zprice')).toContainText('holofoil');
    await expect(page.locator('#zprice')).not.toContainText('no price');
    await page.evaluate(() => closeZoom());
  }
  expect(n295).toBe(2);
});
