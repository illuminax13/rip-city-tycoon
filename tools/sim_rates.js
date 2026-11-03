// node tools/sim_rates.js <baseURL> [N] [dexes]  -> per-set hit stats using the app's own buildPack
const pw=require('@playwright/test');(async()=>{const base=process.argv[2],N=+(process.argv[3]||100000),only=process.argv[4];
const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage();await p.goto(base+'?nosw=1');await p.waitForSelector('.tile');
const r=await p.evaluate(async([N,only])=>{const out={};for(const s of SETS){if(only&&!only.split(',').includes(s.dex))continue;const d=await getCards(s);
 const pc={};for(const k in d.pools)pc[k]=d.pools[k].length;let hit=0,god=0;const last={},h9={},rar={};
 for(let i=0;i<N;i++){const pk=buildPack(s,d.pools);if(pk.god){god++;continue}let mx=0;pk.forEach(c=>{const t=c.tier||tier(c.rarity);mx=Math.max(mx,TIERS[t])});if(mx>=4)hit++;
  const L=pk[pk.length-1];last[L.rarity]=(last[L.rarity]||0)+1;if(pk.length>=10){const H=pk[pk.length-2];const k=(H.rev?'rev ':'')+H.rarity;h9[k]=(h9[k]||0)+1}}
 const n=N-god;const f=o=>Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>[k,+(v/n).toFixed(4)]));
 out[s.dex]={pools:pc,hitPerPack:+(hit/n).toFixed(4),no10:+Math.pow(1-hit/n,10).toFixed(4),last:f(last),slot9:f(h9),god}}return out},[N,only]);
console.log(JSON.stringify(r));await b.close()})();
