const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf} = require('./helpers');
const FABLED = 33; // SETS index: Pokemon 0-24, Lorcana 25-38 (lorcana-1..14)

test('lorcana: game switch, flow, binders', async ({page}) => {
  const {errs} = await gotoApp(page);
  expect(await page.locator('#sets .tile[data-i]').count()).toBeGreaterThanOrEqual(25);
  await expect(page.locator('#lsets')).toBeHidden();
  await page.locator('#gtabs button[data-g="lor"]').click();
  await expect(page.locator('#lsets')).toBeVisible(); await expect(page.locator('#sets')).toBeHidden();
  await expect(page.locator('#lsets .tile[data-i]')).toHaveCount(14);
  const names = await page.$$eval('#lsets .tile[data-i] h3', t => t.map(x => x.textContent));
  expect(names[0]).toBe('Hyperia City'); expect(names).toContain('The First Chapter');
  // logos are local hi-res, not placeholders
  await page.waitForFunction(() => [...document.querySelectorAll('#lsets .tile[data-i] .logo img')].filter(i => i.complete && i.naturalWidth > 100).length >= 2, null, {timeout: 15000});
  await chooseSet(page, FABLED);
  const art = await page.$$eval('#strip .pk.real img', i => [...new Set(i.map(x => x.dataset.src || x.getAttribute('src')).filter(Boolean))]);
  expect(art.length).toBeGreaterThan(1); expect(art.every(u => /assets\/packs\/lorcana-9\//.test(u))).toBe(true);
  await skipAndLand(page); await tapCenterPack(page);
  expect(await page.$eval('#tear .cardsout img', i => i.getAttribute('src'))).toBe('assets/lorcana-back.jpg');
  await doTear(page);
  await expect(page.locator('#stack .card')).toHaveCount(12);
  expect(await page.$eval('#stack .card .back img', i => i.getAttribute('src'))).toBe('assets/lorcana-back.jpg');
  const foils = await page.$$eval('#stack .card', c => c.filter(x => /f-(cold|ench)/.test(x.className)).length);
  expect(foils).toBeGreaterThanOrEqual(1);
  await page.locator('#stack .card').first().click(); await page.waitForTimeout(500);
  const im = await page.$eval('#stack .card.flipped .front img', i => ({src: i.currentSrc || i.src, w: i.naturalWidth}));
  expect(im.src).toMatch(/dreamborn|lorcast|tcgplayer/);
  await revealAll(page);
  await expect(page.locator('#summary .card')).toHaveCount(12);
  expect(await page.locator('#hist').textContent()).toContain('Fabled');
  await openShelf(page);
  await expect(page.locator('.shelfh button.on')).toHaveText('Disney Lorcana');
  await expect(page.locator('.binder')).toHaveCount(14);
  await page.waitForFunction(() => ![...document.querySelectorAll('[id^=bc]')].some(e => e.classList.contains('loading')), null, {timeout: 30000});
  const fab = page.locator('.binder', {hasText: 'Fabled'}); expect(await fab.locator('.bcount').textContent()).toMatch(/^([1-9]\d*) \/ 243/);
  await fab.click(); await page.waitForSelector('#book .pocket', {timeout: 30000});
  await page.locator('.bfilt button[data-f="owned"]').click(); await page.waitForSelector('#book .pocket.own', {timeout: 15000});
  expect(await page.locator('#bpage').textContent()).toMatch(/[1-9]\d*\/243 collected/);
  await page.evaluate(() => openShelf());
  await page.locator('.shelfh button[data-g="pkm"]').click(); await expect(page.locator('#shelf .era[data-era="sv"]')).toBeVisible(); expect(await page.locator('.binder').count()).toBeGreaterThanOrEqual(25);
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});

test('lorcana: pack structure and pull rates', async ({page}) => {
  test.setTimeout(180000);
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    const cfg = await loadPR(), out = {};
    for (const s of SETS.filter(x => x.game === 'lor')) {
      const C = cfg[s.dex], d = await getCards(s); const N = 20000; let bad = [], en = 0, ep = 0, ic = 0, leg = 0, sr = 0, fl = 0, god = 0, cold = 0;
      for (let i = 0; i < N; i++) { const p = buildPack(s, d.pools); if (p.god) god++;
        const cnt = r => p.filter(c => c.rarity === r).length;
        if (p.length !== 12) bad.push('len ' + p.length);
        if (p.filter(c => c.foil).length !== 1) bad.push('foil slot');
        const best = Math.max(...p.map(x => TIERS[x.tier])); if (TIERS[p[p.length-1].tier] !== best) bad.push('order');
        const nonFoil = p.filter(c => !c.foil);
        if (nonFoil.filter(c => c.rarity === 'Common').length !== 6 || nonFoil.filter(c => c.rarity === 'Uncommon').length !== 3) bad.push('C/U');
        if (nonFoil.filter(c => /^(Rare|Super Rare|Legendary)$/.test(c.rarity)).length !== 2) bad.push('rare slots');
        if (nonFoil.some(c => /Enchanted|Epic|Iconic/.test(c.rarity))) bad.push('special outside foil');
        en += cnt('Enchanted'); ep += cnt('Epic'); ic += cnt('Iconic'); if (nonFoil.some(c => c.rarity === 'Legendary')) leg++; sr += nonFoil.filter(c => c.rarity === 'Super Rare').length;
        const f = p.find(c => c.foil); if (f.rev) cold++; if (f.rev && f.rarity === 'Legendary') fl++;
        if (bad.length) break; }
      out[s.dex] = {n: d.n, src: d.src, bad: bad.slice(0, 3), en: en / N, ep: ep / N, ic: ic / N, leg: leg / N, sr: sr / N, fl: fl / N, god, structure: C && C.structure, src1: C && C.source, gp: C && C.godPacks, ngp: C && C.noGodPacks, rates: C && C.rates, pools: Object.fromEntries(Object.entries(lorPools(d.pools)).map(([k, v]) => [k, v.length]))};
    }
    return out; });
  console.log(JSON.stringify(r));
  expect(Object.keys(r).length).toBe(14);
  for (const [k, v] of Object.entries(r)) {
    expect(v.src, k).toBe('local'); expect(v.bad, k).toEqual([]); expect(v.structure, k).toBe('lor'); expect(v.src1, k).toMatch(/^https:/);
    expect(v.god, k).toBe(0); expect(v.gp, k).toBeUndefined(); expect(v.ngp, k).toBeTruthy();
    expect(Math.abs(v.en - v.rates.en), k).toBeLessThan(0.004);         // ~1/96 (sets 1-8), ~1/100 (Fabled+)
    expect(v.leg, k).toBeGreaterThan(0.15); expect(v.leg, k).toBeLessThan(0.22); // Legendary in ~18% of packs
    expect(v.sr, k).toBeGreaterThan(0.44); expect(v.sr, k).toBeLessThan(0.56);   // 1 SR every 2 packs
    expect(Math.abs(v.fl - 0.024), k).toBeLessThan(0.006);
    const later = +k.split('-')[1] >= 9;
    if (later) { expect(Math.abs(v.ep - 1/16), k).toBeLessThan(0.008); expect(v.ic, k).toBeLessThan(0.003); expect(v.pools.ep, k).toBe(18); expect(v.pools.ic, k).toBe(2); }
    else { expect(v.ep, k).toBe(0); expect(v.ic, k).toBe(0); }
  }
});

test('lorcana: foil treatments (cold foil, enchanted shimmer, non-foil legendary)', async ({page}) => {
  const {errs} = await gotoApp(page);
  const r = await page.evaluate(async () => {
    const s = SETS.find(x => x.dex === 'lorcana-9'), d = await getCards(s), m = lorPools(d.pools), prev = set; set = s;
    const mk = (c, extra) => { const el = cardEl({...c, ...(extra || {})}, 0); el.classList.add('flipped'); document.body.appendChild(el); return el };
    const els = {coldC: mk(m.c[0], {rev: true, foil: true}), coldL: mk(m.l[0], {rev: true, foil: true}), leg: mk(m.l[0]), sr: mk(m.sr[0]), ench: mk(m.en[0], {foil: true}), epic: mk(m.ep[0], {foil: true}), icon: mk(m.ic[0], {foil: true}), common: mk(m.c[1])};
    set = prev; const out = {};
    for (const [k, el] of Object.entries(els)) { const fx = el.querySelector('.fx'), a = el.querySelector('.fx .a'), cs = getComputedStyle(a), fcs = getComputedStyle(fx);
      out[k] = {cls: el.className, fx: fcs.opacity, wmask: fcs.webkitMaskImage || fcs.maskImage, band: cs.webkitMaskImage || cs.maskImage, blend: cs.mixBlendMode, bbm: cs.backgroundBlendMode, filt: cs.filter, ffilt: fcs.filter, img: cs.backgroundImage, glare: getComputedStyle(el.querySelector('.glare')).mixBlendMode, tag: el.querySelector('.tag').textContent, back: el.querySelector('.back img').getAttribute('src')}; }
    return out; });
  for (const k of ['coldC', 'coldL', 'epic']) { expect(r[k].cls, k).toContain('f-cold'); expect(r[k].cls, k).toContain('l-n'); }
  for (const k of ['ench', 'icon']) expect(r[k].cls, k).toContain('f-ench');
  for (const k of ['leg', 'sr', 'common']) { expect(r[k].cls, k).not.toMatch(/f-(cold|ench|holo|rev|etch)/); expect(r[k].fx, k).toBe('0'); }
  expect(r.coldC.tag).toContain('(Foil)'); expect(r.leg.tag).not.toContain('Foil'); expect(r.common.back).toBe('assets/lorcana-back.jpg');
  for (const k of ['coldC', 'coldL', 'ench', 'epic', 'icon']) {
    expect(r[k].fx, k).toBe('1'); expect(r[k].wmask, k).toBe('none');            // whole card
    expect(r[k].band, k).toContain('linear-gradient');                            // moving light band
    expect(r[k].blend, k).toBe('normal'); expect(r[k].glare, k).toBe('normal'); expect(r[k].bbm, k).toMatch(/^normal(, normal)*$/);
    expect(r[k].filt, k).toBe('none'); expect(r[k].ffilt, k).toBe('none');
    expect(r[k].img, k).toContain('svg'); expect(r[k].img, k).not.toMatch(/rgb\(\d+, \d+, \d+\)/); // white-only texture
  }
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});
