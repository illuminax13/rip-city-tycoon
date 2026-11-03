const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll} = require('./helpers');
const idx = (page, dex) => page.evaluate(d => SETS.findIndex(s => s.dex === d), dex);
async function openPack(page, dex) { const i = await idx(page, dex); await chooseSet(page, i); await skipAndLand(page); await tapCenterPack(page); await doTear(page); await revealAll(page); await page.waitForTimeout(6000); }
test('shot picker', async ({page}) => { test.setTimeout(85000); await gotoApp(page);
  console.log('ERAS', JSON.stringify(await page.evaluate(() => { const o = {}; SETS.forEach(s => { if (s.game === 'lor') return; const g = s.grp || s.serie; o[g] = (o[g] || 0) + 1; }); return {n: SETS.filter(s => s.game !== 'lor').length, o, hdr: [...document.querySelectorAll('h2.era')].map(h => h.textContent.trim())}; })));
  const x = page.locator('.pkchips button[data-x]'); await x.click(); await page.waitForTimeout(200);
  if (await page.evaluate(() => [...document.querySelectorAll('h2.era')].some(h => !h.classList.contains('c') && !h.matches('[aria-expanded="false"]')))) { /* expanded all; collapse all */ await x.click(); }
  await page.waitForTimeout(600); await page.screenshot({path: 'screenshot-setpicker-all.png'}); });
test('shot achievements', async ({page}) => { test.setTimeout(85000); await gotoApp(page);
  await openPack(page, 'base2');
  await page.goto('/'); await page.waitForTimeout(800);
  await page.locator('.atile:visible').first().click(); await page.waitForTimeout(800);
  const h = page.getByText('Eras & sets', {exact: false}).first(); await h.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await page.screenshot({path: 'screenshot-achievements-new.png'}); });
test('shot wotc', async ({page}) => { test.setTimeout(85000); await gotoApp(page); await openPack(page, 'base2'); await page.screenshot({path: 'screenshot-wotc-pack.png'}); });
test('shot modern', async ({page}) => { test.setTimeout(85000); await gotoApp(page); await openPack(page, 'swsh12'); await page.screenshot({path: 'screenshot-modern-new.png'}); });
