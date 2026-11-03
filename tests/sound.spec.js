const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');
test('sound + haptics: unlock on first gesture, low default volume, sfx hooks, mute persisted', async ({page}) => {
  await page.addInitScript(() => { window.__vib = []; navigator.vibrate = p => { window.__vib.push(p); return true; }; });
  const {errs} = await gotoApp(page);
  expect(await page.evaluate(() => SND.ctx)).toBeNull();                 // no AudioContext before a gesture
  await chooseSet(page, 13);
  const s0 = await page.evaluate(() => ({ctx: !!SND.ctx, gain: SND.master.gain.value, vol: PREF.vol, sound: PREF.sound}));
  expect(s0.ctx).toBe(true); expect(s0.sound).toBe(true); expect(s0.vol).toBeLessThanOrEqual(0.35); expect(s0.gain).toBeCloseTo(s0.vol * .5, 3);
  await skipAndLand(page);
  expect(await page.evaluate(() => SND.played.filter(k => k === 'tick').length)).toBeGreaterThan(3);   // wheel ticks while spinning
  await tapCenterPack(page); await doTear(page);
  const p = await page.evaluate(() => SND.played.slice());
  expect(p).toContain('crinkle'); expect(p).toContain('rip');
  await page.locator('#stack .card').first().click(); await page.waitForTimeout(200);
  expect(await page.evaluate(() => SND.played[SND.played.length - 1])).toBe('snap');
  expect((await page.evaluate(() => window.__vib)).length).toBeGreaterThan(0);
  // hits chime, scaled by rarity
  const ch = await page.evaluate(() => { const c = SND.ctx, before = SND.n; SND.last = {}; sfx.chime(6); return SND.n - before; });
  expect(ch).toBe(1);
  await revealAll(page);
  // mute: master gain 0, nothing plays, persisted
  await page.locator('#setbtn').click(); await page.locator('#optSound').uncheck();
  const m = await page.evaluate(() => { const n = SND.n; SND.last = {}; sfx.snap(); sfx.fanfare(); return {gain: SND.master.gain.value, played: SND.n - n, saved: JSON.parse(localStorage.ppsPrefs).sound}; });
  expect(m).toEqual({gain: 0, played: 0, saved: false});
  await page.locator('#optSound').check(); await page.locator('#optVol').fill('80');
  const vg = await page.evaluate(() => [PREF.vol, SND.master.gain.value]); expect(vg[0]).toBe(0.8); expect(vg[1]).toBeCloseTo(0.4, 4);
  await page.locator('#optHap').uncheck(); const v = await page.evaluate(() => { const n = window.__vib.length; haptic(10); return window.__vib.length - n; }); expect(v).toBe(0);
  await page.reload(); await page.waitForSelector('.tile');
  expect(await page.evaluate(() => [PREF.sound, PREF.vol, PREF.haptics])).toEqual([true, 0.8, false]);
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});
