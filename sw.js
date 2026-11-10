const CACHE='rct-v7';
const IMG='rct-img-v1',IMG_MAX=300;
const fail=()=>new Response('',{status:504,statusText:'offline'});
const SHELL=['./','./index.html','./manifest.webmanifest','./assets/card-back.jpg','./assets/lorcana-back.jpg','./assets/icons/favicon-64.png','./assets/icons/apple-touch-icon.png','./data/pullrates.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>/^rct-/.test(k)&&k!==CACHE&&k!==IMG).map(k=>caches.delete(k)))).then(async()=>{await self.clients.claim();const cs=await self.clients.matchAll({type:'window'});cs.forEach(c=>c.postMessage({type:'SW_UPDATED',cache:CACHE}))}))});
let trimming=false;
async function trim(){if(trimming)return;trimming=true;try{const c=await caches.open(IMG),ks=await c.keys();for(let i=0;i<ks.length-IMG_MAX;i++)await c.delete(ks[i])}finally{trimming=false}}
// cache-first, fetch on miss; optional background revalidation
function cacheFirst(req,name,{revalidate=false,put=r=>r.ok,after}={}){
  return caches.open(name).then(async c=>{
    let hit=await c.match(req);if(hit&&hit.type==='opaque'&&req.mode==='cors')hit=null;
    const net=()=>fetch(req).then(r=>{if(r&&put(r))c.put(req,r.clone()).then(()=>after&&after()).catch(()=>{});return r});
    if(hit){if(revalidate)net().catch(()=>{});return hit}
    return net().catch(()=>fail());
  });
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin===location.origin){
    // HTML: stale-while-revalidate (instant warm start). Each deploy bumps CACHE, so the new SW precaches the new
    // index.html and the page shows an "Update available" reload prompt on controllerchange.
    if(req.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/')){
      e.respondWith((async()=>{const c=await caches.open(CACHE);const cached=await c.match(req,{ignoreSearch:true})||await c.match('./index.html');
        const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r});
        if(cached){e.waitUntil(net.catch(()=>{}));return cached}
        return net.catch(()=>fail());})());
      return;
    }
    // data JSON: stale-while-revalidate; static assets (pack art, logos, icons): cache-first
    // price snapshot (refreshed weekly by a GitHub Action): network-first so new prices show without a SW bump; cached copy offline / slow network
    if(/\/data\/px-snap\.json$/.test(u.pathname)){e.respondWith(caches.open(CACHE).then(async c=>{
      const net=fetch(req,{cache:'no-cache'}).then(r=>{if(r.ok)c.put(req,r.clone());return r});
      const hit=await c.match(req,{ignoreSearch:true});if(!hit)return net.catch(()=>fail());
      const slow=new Promise(r=>setTimeout(()=>r(hit),3500));e.waitUntil(net.catch(()=>{}));
      return Promise.race([net.then(r=>r.ok?r:hit).catch(()=>hit),slow])}));return}
    if(/\/data\//.test(u.pathname)){e.respondWith(cacheFirst(req,CACHE,{revalidate:true}));return}
    e.respondWith(cacheFirst(req,CACHE));
    return;
  }
  if(/assets\.tcgdex\.net|images\.scrydex\.com|images\.pokemontcg\.io|cdn\.dreamborn\.ink|cards\.lorcast\.io|tcgplayer-cdn\.tcgplayer\.com/.test(u.hostname)){
    // card images: immutable, cache-first in a size-capped cache that survives app updates
    // <img> requests are no-cors (opaque => status unknown). Try a CORS fetch first so only real 200s get cached;
    // a few TCGdex files send a duplicated ACAO header (CORS fails) -> plain no-cors fetch, not cached (HTTP cache still applies).
    e.respondWith(caches.open(IMG).then(async c=>{
      const hit=await c.match(req.url);if(hit&&hit.type!=='opaque')return hit;
      try{const r=await fetch(req.url,{mode:'cors',credentials:'omit'});if(r.ok){c.put(req.url,r.clone()).then(trim).catch(()=>{});return r}return fail()}
      catch(err){return fetch(req).catch(()=>fail())}
    }));
  }
});
