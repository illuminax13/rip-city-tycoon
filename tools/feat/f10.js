/* f10: subset cards (30th Classic Collection + RGB Mew, Celebrations Classic Collection, Crown Zenith Galarian Gallery) */
/* 1) price snapshot fallback for cards the live sources don't price (data/px-snap.json, built by tools/build_prices.py) */
const PXS={p:null,l:null};
function pxSnapLoad(){return PXS.l||(PXS.l=fetchT("data/px-snap.json",12000).then(j=>{PXS.p=j||{};pxChanged();return PXS.p}).catch(()=>{PXS.l=null;return null}))}
{const po=priceOf;priceOf=function(c,s){const r=po.apply(this,arguments);if(r)return r;s=s||setOfId(c.id);const S=s&&PXS.p&&PXS.p[s.dex],e=S&&S.p[pxNum(c)];const q=e&&pxPick(e,c,s);return q?{...q,d:S.d,via:S.src,e}:r}}
{const pf=pxFetchOwned;pxFetchOwned=async function(){await pxSnapLoad();return pf.apply(this,arguments)}}
pxSnapLoad();
/* 2) owned subset cards: their scans come from the set list (pimg), not the TCGdex path rebuilt at startup */
(function subsetImgs(){for(const d of ["30th","cel25","swsh12.5"]){const o=store.sets[d],s=SETBY[d];if(!o||!s||!Object.keys(o).some(n=>/^(CC|GG|RGB-)/.test(n)))continue;
 setList(s).then(l=>{let ch=0;for(const c of l){if(!c.pimg||!o[c.n])continue;const im=pimgSrcs(c.pimg),e=o[c.n];if(e.imgs&&e.imgs[0]===im[0])continue;e.imgs=im;ch=1;const k=e.id||idOf(d,c.n,e.lid);if(store.coll&&store.coll[k])store.coll[k].imgs=im}
  if(ch&&$("vBinder")&&$("vBinder").classList.contains("on")&&typeof B!=="undefined"&&B.s===s&&typeof renderBook==="function")renderBook()}).catch(()=>{})}})();
