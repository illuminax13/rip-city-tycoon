const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear} = require('./helpers');
const orient = (page, beta, gamma) => page.evaluate(([b, g]) => { let e; try { e = new DeviceOrientationEvent('deviceorientation', {alpha: 0, beta: b, gamma: g}); } catch (x) { e = new Event('deviceorientation'); Object.defineProperties(e, {alpha: {value: 0}, beta: {value: b}, gamma: {value: g}}); } window.dispatchEvent(e); }, [beta, gamma]);
const ry = page => page.evaluate(() => { const el = topEl(); return {ry: parseFloat(el.style.getPropertyValue('--ry')) || 0, rx: parseFloat(el.style.getPropertyValue('--rx')) || 0, tilting: el.classList.contains('tilting')}; });

test('tilt: iOS permission on first tap, neutral at reveal, smoothed + clamped', async ({page}) => {
  await page.addInitScript(() => { window.__asked = 0; DeviceOrientationEvent.requestPermission = async () => { window.__asked++; return 'granted'; }; });
  const {errs} = await gotoApp(page);
  expect(await page.evaluate(() => GY.st)).toBe('off');
  await chooseSet(page, 12);
  expect(await page.evaluate(() => [window.__asked, GY.st])).toEqual([1, 'on']);
  await skipAndLand(page); await tapCenterPack(page); await doTear(page);
  await page.locator('#stack .card').first().click(); await page.waitForTimeout(400);
  await page.mouse.move(3, 300); await page.waitForTimeout(100);
  await orient(page, 40, 0);              // neutral = how the phone is held at reveal
  await page.waitForTimeout(150); let r = await ry(page); expect(Math.abs(r.ry)).toBeLessThan(0.5);
  await orient(page, 40, 11); await page.waitForTimeout(60); const early = await ry(page);
  await page.waitForTimeout(1500); r = await ry(page);
  expect(r.tilting).toBe(true); expect(r.ry).toBeLessThan(-5.5); expect(r.ry).toBeGreaterThan(-7.05);   // 11/22 -> x=.75 -> -7deg
  expect(Math.abs(early.ry)).toBeLessThan(Math.abs(r.ry));                                         // low-pass: approaches gradually
  await orient(page, 120, 90); await page.waitForTimeout(800); r = await ry(page);
  expect(Math.abs(r.ry)).toBeLessThanOrEqual(14.01); expect(Math.abs(r.rx)).toBeLessThanOrEqual(11.01); // clamped
  // next card: neutral resets to the current angle
  await page.locator('#stack .card').first().click(); await page.waitForTimeout(500);
  await page.locator('#stack .card').first().click(); await page.waitForTimeout(400); await page.mouse.move(3, 300);
  await orient(page, 120, 90); await page.waitForTimeout(500); r = await ry(page); expect(Math.abs(r.ry)).toBeLessThan(0.5);
  // settings toggle off stops it
  await page.locator('#setbtn').click(); await expect(page.locator('#settings')).toBeVisible();
  await page.locator('#optTilt').uncheck(); expect(await page.evaluate(() => [GY.st, PREF.tilt, JSON.parse(localStorage.ppsPrefs).tilt])).toEqual(['off', false, false]);
  await orient(page, 120, 60); await page.waitForTimeout(300); r = await ry(page); expect(r.ry).toBe(0);
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});

test('tilt: permission denied is handled gracefully', async ({page}) => {
  await page.addInitScript(() => { DeviceOrientationEvent.requestPermission = async () => 'denied'; });
  const {errs} = await gotoApp(page);
  await chooseSet(page, 12);
  expect(await page.evaluate(() => GY.st)).toBe('denied');
  expect(await page.evaluate(() => localStorage.ppsGyroPerm)).toBe('denied');
  await skipAndLand(page); await tapCenterPack(page); await doTear(page);
  await expect(page.locator('#stack .card')).toHaveCount(10);
  await page.locator('#setbtn').click(); await expect(page.locator('#tiltNote')).toContainText('denied');
  expect(errs.filter(e => !/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});
