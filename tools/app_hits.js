const pw=require('@playwright/test');(async()=>{const b=await pw.webkit.launch();const ctx=await b.newContext({...pw.devices['iPhone 13']});const p=await ctx.newPage();
await p.goto(process.argv[2]);await p.waitForSelector('.tile');
const res=[];for(const dex of ['me02.5','me02','sv08.5','sv08']){
 const r=await p.evaluate(async(dex)=>{const s=SETS.find(x=>x.dex===dex);await chooseSet(s);await getCards(s);let hits=0,dom=0,mis=[],pr=!!(PR&&PR[dex]);
  for(let i=0;i<50;i++){NEXT=null;prepPack();openPack();await new Promise(r=>setTimeout(r,30));const g=current.some(c=>TIERS[c.tier||tier(c.rarity)]>=4);if(g)hits++;
   const els=[...document.querySelectorAll('#stack .card')];const big=els.some(e=>e.classList.contains('big'));if(big)dom++;
   current.forEach((c,j)=>{const t=tier(c.rarity);if(c.tier&&c.tier!==t)mis.push(c.rarity+':'+c.tier)})}
  return {dex,pr,hits,domBig:dom,stack:document.querySelectorAll('#stack .card').length,mis:mis.slice(0,5)}},dex);res.push(r)}
console.log(JSON.stringify(res));await b.close()})();
