const {test, expect} = require('@playwright/test');
const {gotoApp, chooseSet} = require('./helpers');
// Foil v3: one screened texture x light-band layer per foil; no rainbow wash; commons have no foil.
test('foil tiers', async ({page}) => {
  const {errs} = await gotoApp(page);
  await chooseSet(page, 0);
  const r = await page.evaluate(async () => {
    const S=d=>SETS.find(s=>s.dex===d);
    const mk=async(dex,t,f,extra)=>{const s=S(dex);const d=await getCards(s);const pool=d.pools[t]||[];const c=pool.find(f||(()=>true))||pool[0];const prev=set;set=s;const el=cardEl({...c,tier:t,...(extra||{})},0);set=prev;document.body.appendChild(el);el.classList.add('flipped');return el};
    const els={common:await mk('sv08','common'),wotc:await mk('base1','holo'),mod:await mk('sv08','rare'),rev:await mk('sv08','common',null,{rev:true}),
      mb:await mk('sv08.5','uncommon',null,{rev:true,pat:'mb'}),pb:await mk('sv08.5','common',null,{rev:true,pat:'pb'}),
      ur:await mk('sv08','ultra'),sir:await mk('sv08','sir',c=>/special/i.test(c.rarity)),gold:await mk('sv08','sir',c=>/hyper/i.test(c.rarity))};
    const out={};for(const [k,el] of Object.entries(els)){const a=el.querySelector('.fx .a'),cs=getComputedStyle(a);
      out[k]={cls:el.className,blend:cs.mixBlendMode,bbm:cs.backgroundBlendMode,mask:cs.webkitMaskImage||cs.maskImage,wmask:(s=>s.webkitMaskImage||s.maskImage)(getComputedStyle(el.querySelector('.fx'))),glare:getComputedStyle(el.querySelector('.glare')).mixBlendMode,fx:getComputedStyle(el.querySelector('.fx')).opacity,img:cs.backgroundImage,clip:cs.clipPath,legacy:getComputedStyle(el.querySelector('.foil')).display,spark:getComputedStyle(el.querySelector('.sparkle')).display};el.remove()}
    return out});
  expect(r.common.cls).not.toMatch(/f-(holo|rev|etch)/); expect(r.common.fx).toBe('0');
  expect(r.wotc.cls).toContain('f-holo'); expect(r.wotc.cls).toContain('e-wotc'); expect(r.wotc.cls).toContain('l-cp'); expect(r.wotc.wmask).toContain('svg');
  expect(r.mod.cls).toContain('f-holo'); expect(r.rev.cls).toContain('f-rev'); expect(r.rev.cls).toContain('l-sp'); expect(r.rev.wmask).toContain('evenodd'); expect(r.ur.cls).not.toMatch(/ l-/);
  expect(r.mb.cls).toContain('p-mb'); expect(r.pb.cls).toContain('p-pb');
  expect(r.ur.cls).toContain('f-etch'); expect(r.sir.cls).toContain('t-sir'); expect(r.gold.cls).toContain('t-gold');
  for (const k of ['wotc','mod','rev','mb','pb','ur','sir','gold']) {
    // iOS-safe: no blend modes on the card face; foil only adds white light through a band mask
    expect(r[k].blend).toBe('normal'); expect(r[k].glare).toBe('normal'); expect(r[k].bbm).toMatch(/^normal(, normal)*$/); expect(r[k].mask).toContain('linear-gradient'); expect(r[k].fx).toBe('1');
    expect(r[k].legacy).toBe('none'); expect(r[k].spark).toBe('none');
    // no saturated rainbow stops in the foil layer
    expect(r[k].img).not.toMatch(/rgb\(255, (0|61|79), /); expect(r[k].img).not.toMatch(/rgb\(\d+, \d+, \d+\)/);
  }
  expect(errs.filter(e=>!/Failed to load resource|access.control|Cross-Origin|CORS/i.test(e))).toEqual([]);
});
test('trainer art window + kind tags', async ({page}) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    const s=SETS.find(x=>x.dex==='me02.5');const d=await getCards(s);const all=Object.values(d.pools).flat();
    const f=id=>all.find(c=>c.id===id);const prev=set;set=s;
    const a=cardEl({...f('me02.5-181'),rev:true},0).className, b=cardEl({...f('me02.5-178'),tier:'rare'},0).className;set=prev;
    return {a,b,k:f('me02.5-181').k}});
  expect(r.k).toBe('t'); expect(r.a).toContain('l-st'); expect(r.b).toContain('l-sp');
});

test('new sets: all-foil sets foil every card, CC/GG/WotC holo tiers', async ({page}) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    const S = d => SETS.find(s => s.dex === d), out = {};
    const cls = async (dex, f) => { const s = S(dex); const d = await getCards(s); const c = Object.values(d.pools).flat().find(f); if (!c) return null;
      const prev = set; set = s; const el = cardEl({...c}, 0); set = prev; const k = [...el.querySelectorAll('*')].concat(el).map(e => e.className && e.className.baseVal === undefined ? e.className : '').join(' '); return {r: c.rarity, t: c.tier, k}; };
    out.c30common = await cls('30th', c => c.rarity === 'Common');
    out.c30cc = await cls('30th', c => c.rarity === 'Classic Collection');
    out.c30pk = await cls('30th', c => c.rarity === 'Pikachu Rare');
    out.celCommon = await cls('cel25', c => !/classic/i.test(c.rarity));
    out.celCC = await cls('cel25', c => /classic/i.test(c.rarity));
    out.czGG = await cls('swsh12.5', c => c.rarity === 'Galarian Gallery');
    out.czC = await cls('swsh12.5', c => c.rarity === 'Common');
    out.trHolo = await cls('base5', c => /Dark Raichu/.test(c.name));
    out.neoC = await cls('neo1', c => c.rarity === 'Common');
    return out; });
  console.log(JSON.stringify(r));
  for (const k of ['c30common', 'c30pk', 'celCommon']) expect(r[k].k, k).toMatch(/f-(holo|etch)/);
  for (const k of ['c30cc', 'celCC', 'czGG']) expect(r[k].k, k).toMatch(/f-etch/);
  expect(r.trHolo.k).toMatch(/f-holo/);
  for (const k of ['czC', 'neoC']) expect(r[k].k, k).not.toMatch(/f-(holo|etch)/);
});
