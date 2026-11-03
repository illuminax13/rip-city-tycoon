// Foil tier comparison grid: node tools/shot_foil.js out.png [chromium|webkit]
const pw=require('@playwright/test');
const out=process.argv[2]||'screenshot-foil-real.png',bn=process.argv[3]||'chromium';
(async()=>{const b=await pw[bn].launch(bn==='chromium'?{executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
 const page=await b.newPage({viewport:{width:1300,height:1500},deviceScaleFactor:+(process.env.DSF||1)});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8765/')+'?nosw=1');await page.waitForSelector('.tile');
 await page.evaluate(async()=>{
  const byDex=d=>SETS.find(s=>s.dex===d);
  const pick=async(dex,t,f,extra)=>{const s=byDex(dex);const d=await getCards(s);const pool=d.pools[t]||[];const c=pool.find(f||(()=>true))||pool[0];return c?{s,c:{...c,tier:t,...(extra||{})}}:null};
  const rows=[
   ['Common (no foil)',await pick('sv08','common')],
   ['Classic holo (Base)',await pick('base1','holo',c=>/Charizard|Blastoise|Venusaur/.test(c.name))],
   ['Modern holo rare',await pick('sv08','rare')],
   ['Reverse holo',await pick('sv08','common',null,{rev:true})],
   ['Poké Ball reverse',await pick('sv08.5','common',null,{rev:true,pat:'pb'})],
   ['Master Ball reverse',await pick('sv08.5','uncommon',null,{rev:true,pat:'mb'})],
   ['Double rare ex',await pick('sv08','ultra',c=>/double/i.test(c.rarity))],
   ['Ultra rare full art',await pick('sv08','ultra',c=>/^ultra/i.test(c.rarity))],
   ['Illustration rare',await pick('sv08','illus')],
   ['Special illustration',await pick('sv08','sir',c=>/special/i.test(c.rarity))],
   ['Hyper / gold',await pick('sv08','sir',c=>/hyper|gold/i.test(c.rarity))],
   ['Classic holo (Fossil)',await pick('base3','holo')],
   ['Mega Hyper Rare',await pick('me02.5','sir',c=>/mega hyper/i.test(c.rarity)&&/Dragonite/.test(c.name))],
   ['Hyper rare (Prismatic)',await pick('sv08.5','sir',c=>/Pikachu ex/.test(c.name)&&/hyper/i.test(c.rarity))],
  ];
  const w=document.createElement('div');w.id='foiltest';w.style.cssText='position:fixed;inset:0;z-index:9999;background:#1d2030;display:grid;grid-template-columns:1fr 1fr;gap:6px 30px;padding:14px;align-content:start;font:600 13px system-ui;color:#cfd5f5';
  document.body.appendChild(w);
  const states=[['rest',null],['tilt L','28%','30%',-14,8],['tilt R','74%','68%',14,-8]];
  for(const [label,p] of rows){const g=document.createElement('div');g.innerHTML=`<div style="margin:2px 0 4px">${label}${p?` — ${p.c.name} (${p.c.rarity})`:' — n/a'}</div>`;const r=document.createElement('div');r.style.cssText='display:flex;gap:14px;perspective:900px';g.appendChild(r);w.appendChild(g);if(!p)continue;
   for(const [sl,mx,my,ry,rx] of states){const prev=set;set=p.s;const el=cardEl(p.c,0);set=prev;el.style.width='130px';el.style.height='181px';el.style.marginBottom='0';el.style.animation='none';el.classList.add('flipped');
    if(mx){el.classList.add('tilting');el.style.setProperty('--ry',ry+'deg');el.style.setProperty('--rx',rx+'deg');el.style.setProperty('--mx',mx);el.style.setProperty('--my',my)}
    el.querySelector('.tag').style.display='none';r.appendChild(el)}}
 });
 await page.waitForFunction(()=>[...document.querySelectorAll('#foiltest img')].every(i=>i.complete),null,{timeout:60000}).catch(()=>{});
 await page.waitForTimeout(3500);await page.screenshot({path:out});if(process.env.CROPS){const cs=await page.$$('#foiltest .card');for(let i=0;i<cs.length;i++)await cs[i].screenshot({path:process.env.CROPS+'/fc-'+i+'.png'})}await b.close()})();
