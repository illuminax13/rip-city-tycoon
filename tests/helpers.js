const {expect} = require('@playwright/test');

const SETS = [
  {i:0, name:'Base Set', era:"wotc", n:11},
  {i:1, name:'Jungle', era:"wotc", n:11},
  {i:2, name:'Fossil', era:"wotc", n:11},
  {i:5, name:'Evolving Skies', era:'sv', n:10},
  {i:9, name:'Scarlet & Violet 151', era:'sv', n:10},
  {i:12, name:'Surging Sparks', era:'sv', n:10},
  {i:13, name:'Prismatic Evolutions', era:'sv', n:10},
  {i:23, name:'Pitch Black', era:'me', n:10},
  {i:3, name:'Team Rocket', era:'wotc', n:11},
  {i:6, name:'Celebrations', era:'sv', n:4},
  {i:7, name:'Crown Zenith', era:'sv', n:10},
  {i:24, name:'30th Celebration', era:'me', n:5},
];

async function gotoApp(page, path='/', opt={}) {
  // Legacy feature specs exercise packs/boxes, not the economy: give them a deep wallet unless asked not to.
  if (opt.econ !== false) await page.addInitScript(() => { if (!localStorage.getItem('rctEcon')) localStorage.setItem('rctEcon', JSON.stringify({v:1,cash:1e10,start:1e10,since:Date.now(),tx:[],ach:{},ch:{},bonus:{},st:{},welcomed:1})); });
  const errs=[], unhandled=[];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type()==='error') errs.push('console:'+m.text()); });
  page.on('pageerror', ()=>{});
  await page.addInitScript(() => {
    window.__rej = [];
    window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason)));
  });
  await page.goto(path);
  await page.waitForSelector('.tile', {timeout: 30000});
  return {errs, unhandled: () => page.evaluate(() => window.__rej||[])};
}

async function chooseSet(page, i=0) {
  await page.evaluate(i => { if (!document.querySelector(`.tile[data-i="${i}"]`) && window.pkReveal) window.pkReveal(i); }, i);
  await page.locator(`.tile[data-i="${i}"]`).click();
  await page.waitForFunction(() => /Swipe the packs|Tap to open/.test(document.body.innerText), null, {timeout: 60000});
  await page.waitForTimeout(400);
}

async function skipAndLand(page) {
  await page.locator('#skip').click();
  await page.waitForFunction(() => state === 'landed', null, {timeout: 60000});
  await page.waitForTimeout(300);
}

async function tapCenterPack(page) {
  const box = await page.locator('#wheelwrap').boundingBox();
  await page.mouse.click(box.x + box.width/2, box.y + box.height*0.44);
  await page.waitForSelector('#tear.on', {timeout: 10000});
}

async function doTear(page, {partial=false} = {}) {
  await page.waitForSelector('#tear .tp', {timeout: 10000});
  await page.waitForFunction(() => { const tp=document.querySelector('#tear .tp'); return tp && tp.getAnimations().every(x=>x.playState!=='running'); }, null, {timeout: 5000}).catch(()=>{});
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const b = document.querySelector('#tear .tp').getBoundingClientRect();
    return {l:b.left, t:b.top, w:b.width, h:b.height};
  });
  const y = r.t + r.h * 0.07;
  await page.mouse.move(r.l + 4, y);
  await page.mouse.down();
  const frac = partial ? 0.35 : 0.85;
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(r.l + 4 + (r.w * frac - 4) * i / 12, y);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  if (partial) {
    await page.waitForTimeout(700);
    await page.waitForFunction(() => (window.__tearCur||0) < 0.05, null, {timeout: 5000});
    return page.evaluate(() => window.__tearCur);
  }
  await page.waitForFunction(() => document.querySelector('#vPack.on') || document.getElementById('tear').classList.contains('rip'), null, {timeout: 10000});
  await page.waitForSelector('#vPack.on', {timeout: 15000});
  await page.waitForFunction(() => !document.getElementById('tear').classList.contains('on'), null, {timeout: 10000});
  await page.waitForTimeout(1200);
}

async function revealAll(page) {
  await page.locator('#reveal').click();
  await page.waitForSelector('#summary.on', {timeout: 60000});
}

async function openShelf(page) {
  await page.locator('#binders').click();
  await page.waitForSelector('#vShelf.on', {timeout: 10000});
  await page.waitForTimeout(800);
}

module.exports = {SETS, gotoApp, chooseSet, skipAndLand, tapCenterPack, doTear, revealAll, openShelf, expect};
// 3D box gestures
async function boxDrag(page, fx0, fy0, fx1, fy1, steps = 14) {
  const b = await page.locator('#bx3d .bxscene').boundingBox();
  await page.mouse.move(b.x + b.width * fx0, b.y + b.height * fy0); await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(b.x + b.width * (fx0 + (fx1 - fx0) * i / steps), b.y + b.height * (fy0 + (fy1 - fy0) * i / steps)); await page.waitForTimeout(16); }
  await page.mouse.up();
}
async function tearWrap(page) { await boxDrag(page, .08, .5, .95, .52, 18); await page.locator('#bx3d.torn').waitFor(); }
async function openLid(page) { await boxDrag(page, .5, .62, .5, .02, 14); await page.locator('#bx3d.open').waitFor(); await page.waitForTimeout(700); }
module.exports.boxDrag = boxDrag; module.exports.tearWrap = tearWrap; module.exports.openLid = openLid;
