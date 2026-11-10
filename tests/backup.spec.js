const {test, expect} = require('@playwright/test');
const {gotoApp} = require('./helpers');
test.use({serviceWorkers: 'block'});

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const coll = (packs, sets) => JSON.stringify({packs, coll: {}, hist: ['#' + packs + ' x'], migrated: 1, sets});
const DEVICE = {
  rct: coll(30, {base1: {'4': {name: 'Charizard', rarity: 'Rare Holo', n: 1, lid: '4'}, '58': {name: 'Pikachu', rarity: 'Common', n: 5, lid: '58'}}}),
  rctAch: JSON.stringify({v: 1, u: {first: 1000}, bf: {}, st: {boxes: 1}, bt: {}, nw: 0, since: 1000}),
  rctPrefs: JSON.stringify({sound: false}),
  rctPrice: '{"big":"cache"}',
};
const BACKUP = {app: 'rctycoon', kind: 'backup', v: 1, exported: '2026-10-01T12:00:00.000Z', data: {
  rct: coll(5530, {base1: {'4': {name: 'Charizard', rarity: 'Rare Holo', n: 3, lid: '4'}}, '30th': {CC01: {name: 'Pikachu', rarity: 'Classic Collection', n: 2, lid: 'cc01'}}}),
  rctAch: JSON.stringify({v: 1, u: {first: 500, b25: 900}, bf: {}, st: {boxes: 4}, bt: {}, nw: 0, since: 500}),
}};

async function seed(page, kv) {
  await page.addInitScript(kv => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, kv);
}
async function openSettings(page) {
  await page.locator('#setbtn').click();
  await expect(page.locator('#settings.on')).toBeVisible();
}
async function importFile(page, obj, mode) {
  await openSettings(page);
  await page.locator('#bkFile').setInputFiles({name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj))});
  await expect(page.locator('#bkdlg.on')).toBeVisible();
  await expect(page.locator('#bkdlg table')).toContainText('5,530');
  await page.locator(`#bkdlg input[value="${mode}"]`).check();
  await Promise.all([page.waitForEvent('load'), page.locator('#bkGo').click()]);
  await page.waitForSelector('.tile');
}
const sets = page => page.evaluate(() => JSON.parse(localStorage.getItem('rct')));

test('export makes one versioned file of the app data (no caches)', async ({page}) => {
  await seed(page, DEVICE);
  await gotoApp(page);
  await openSettings(page);
  await expect(page.locator('#bkNote')).toContainText('No backup yet');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#bkExp').click()]);
  expect(dl.suggestedFilename()).toMatch(/^rip-city-tycoon-backup-\d{4}-\d\d-\d\d\.json$/);
  const j = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  expect(j).toMatchObject({app: 'rctycoon', kind: 'backup', v: 1, counts: {packs: 30, unique: 2, sets: 1}});
  expect(j.counts.ach).toBeGreaterThanOrEqual(1);
  expect(Object.keys(j.data)).toEqual(expect.arrayContaining(['rct', 'rctAch', 'rctPrefs']));
  expect(j.data.rctPrice).toBeUndefined();
  expect(JSON.parse(j.data.rct).sets.base1['58'].n).toBe(5);
  await expect(page.locator('#bkNote')).toContainText('today');
});

test('import merge keeps both collections (higher count wins) and can be undone', async ({page}) => {
  await seed(page, DEVICE);
  await gotoApp(page);
  await importFile(page, BACKUP, 'merge');
  const s = await sets(page);
  expect(s.packs).toBe(5530);
  expect(s.sets.base1['4'].n).toBe(3);      // max(1,3), not 4
  expect(s.sets.base1['58'].n).toBe(5);     // only on device
  expect(s.sets['30th'].CC01.n).toBe(2);    // only in backup
  const ach = await page.evaluate(() => JSON.parse(localStorage.getItem('rctAch')));
  expect(ach.u).toMatchObject({first: 500, b25: 900});
  expect(ach.st.boxes).toBe(4);
  expect(await page.evaluate(() => localStorage.getItem('rctPrefs'))).toBe(DEVICE.rctPrefs);
  await expect(page.locator('#count')).toHaveText('5530');
  await expect(page.locator('#bktoast.on')).toContainText('merged');
  await Promise.all([page.waitForEvent('load'), page.locator('#bktAct').click()]);
  await page.waitForSelector('.tile');
  const u = await sets(page);
  expect(u.packs).toBe(30);
  expect(u.sets['30th']).toBeUndefined();
});

test('import replace restores the backup exactly; bad files are rejected', async ({page}) => {
  await seed(page, DEVICE);
  await gotoApp(page);
  await openSettings(page);
  await page.locator('#bkFile').setInputFiles({name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}')});
  await expect(page.locator('#bktoast.on')).toContainText("isn't a Rip City Tycoon backup");
  await expect(page.locator('#bkdlg.on')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 400);
  await importFile(page, BACKUP, 'replace');
  const s = await sets(page);
  expect(s.packs).toBe(5530);
  expect(s.sets.base1['58']).toBeUndefined();
  expect(s.sets.base1['4'].n).toBe(3);
  expect(await page.evaluate(() => localStorage.getItem('rctPrefs'))).toBeNull();
  await expect(page.locator('#bktoast.on')).toContainText('restored');
  // undo is offered in settings too
  await openSettings(page);
  await Promise.all([page.waitForEvent('load'), page.locator('#bkUndo').click()]);
  await page.waitForSelector('.tile');
  expect((await sets(page)).packs).toBe(30);
});

test.describe('Home Screen nudge', () => {
  test.use({userAgent: IPHONE_UA});
  test('shows on iOS Safari after 20 packs, snoozes 7 days', async ({page}) => {
    await seed(page, {rct: coll(25, {})});
    await gotoApp(page);
    await expect(page.locator('#a2hs.on')).toBeVisible({timeout: 8000});
    await expect(page.locator('#a2hs')).toContainText('Add to Home Screen');
    await page.locator('#a2x').click();
    await expect(page.locator('#a2hs')).toHaveCount(0);
    const until = await page.evaluate(() => +localStorage.getItem('rctNudge') - Date.now());
    expect(until).toBeGreaterThan(6.9 * 864e5);
    await page.reload(); await page.waitForSelector('.tile'); await page.waitForTimeout(3500);
    await expect(page.locator('#a2hs')).toHaveCount(0);
    // snooze over -> back
    await page.evaluate(() => localStorage.setItem('rctNudge', String(Date.now() - 1)));
    await page.reload(); await page.waitForSelector('.tile');
    await expect(page.locator('#a2hs.on')).toBeVisible({timeout: 8000});
  });
  test('never in standalone, not before 20 packs', async ({page}) => {
    await seed(page, {rct: coll(10, {})});
    await gotoApp(page);
    await page.waitForTimeout(3500);
    await expect(page.locator('#a2hs')).toHaveCount(0);
    await page.evaluate(() => { localStorage.setItem('rct', JSON.stringify({...JSON.parse(localStorage.getItem('rct')), packs: 50})); });
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', {get: () => true}));
    await page.reload(); await page.waitForSelector('.tile'); await page.waitForTimeout(3500);
    await expect(page.locator('#a2hs')).toHaveCount(0);
  });
});
