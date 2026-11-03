# f10: subset cards were saved under the wrong binder key (keyOf split ids like 30th-cc01 / 30th-rgb-R / cel25cc-CC001 / swsh12.5gg-GG01 on the last "-")
rep('function keyOf(id){const k=id.lastIndexOf("-");return [id.slice(0,k),id.slice(k+1).replace(/^0+(?=\\w)/,"")]}',
 '/* subset cards carry their own id prefix but live in the parent set\'s binder under the list number: 30th-cc01->30th/CC01, 30th-rgb-R->30th/RGB-R, cel25cc-CC001->cel25/CC001, swsh12.5gg-GG01->swsh12.5/GG01 (hoisted: used while the store loads) */\n'
 'function subKey(d,n){n=String(n);if(d==="30th-rgb")return ["30th","RGB-"+n.toUpperCase()];if(d==="30th"&&/^cc\\d+$/i.test(n))return ["30th","CC"+n.slice(2).padStart(2,"0")];if(d==="cel25cc")return ["cel25",n.toUpperCase()];if(d==="swsh12.5gg")return ["swsh12.5",n.toUpperCase()];return [d,n]}\n'
 'function keyOf(id){id=String(id);const k=id.lastIndexOf("-");return subKey(id.slice(0,k),id.slice(k+1).replace(/^0+(?=\\w)/,""))}\n'
 '/* inverse: the card id (TCGdex / data list id) for a binder entry */\n'
 'function idOf(d,n,lid){n=String(n);if(d==="30th"&&/^RGB-/.test(n))return "30th-rgb-"+n.slice(4);if(d==="30th"&&/^CC\\d+$/.test(n))return "30th-cc"+n.slice(2);if(d==="cel25"&&/^CC\\d+$/.test(n))return "cel25cc-"+n;if(d==="swsh12.5"&&/^GG\\d+$/.test(n))return "swsh12.5gg-"+n;return d+"-"+(lid||n)}')
rep('(store.sets[d]=store.sets[d]||{})[n]={name:c.name,rarity:c.rarity||"",imgs:c.imgs||[c.img],n:c.n}}}\n',
 '(store.sets[d]=store.sets[d]||{})[n]={name:c.name,rarity:c.rarity||"",imgs:c.imgs||[c.img],n:c.n}}}\n'
 '/* move subset pulls saved under the old keys (30th/cc01, 30th-rgb/R, cel25cc/CC001, swsh12.5gg/GG01) to the binder key, merging counts; the moved entries are kept in ppsBak10 */\n'
 '(function fixSubsetKeys(){const S=store.sets,mv=[];for(const [d,o] of Object.entries(S))for(const n of Object.keys(o||{})){const [d2,n2]=subKey(d,n);if(d2!==d||n2!==n)mv.push([d,n,d2,n2])}if(!mv.length)return;\n'
 ' try{const b=JSON.parse(localStorage.getItem("ppsBak10")||"[]");mv.forEach(([d,n])=>b.push([d,n,S[d][n]]));localStorage.setItem("ppsBak10",JSON.stringify(b,(k,v)=>k==="imgs"?undefined:v))}catch(e){}\n'
 ' for(const [d,n,d2,n2] of mv){const e=S[d][n];delete S[d][n];if(!e||typeof e!=="object")continue;if(!e.id)e.id=d+"-"+(e.lid||n);const o2=S[d2]=S[d2]||{},t=o2[n2];if(!t){o2[n2]=e;continue}t.n=(t.n||0)+(e.n||0);if(e.rv)t.rv=(t.rv||0)+e.rv;for(const k of Object.keys(e))if(t[k]==null)t[k]=e[k]}\n'
 ' for(const d of Object.keys(S))if(S[d]&&!Object.keys(S[d]).length)delete S[d];try{localStorage.setItem("pps",JSON.stringify(store,(k,v)=>k==="imgs"?undefined:v))}catch(e){}})();\n')
# record: keep the real card id when it can't be rebuilt from dex+lid (30th-rgb-R)
x='ss[n].lid=c.id.slice(c.id.lastIndexOf("-")+1);'
y='ss[n].lid=c.id.slice(c.id.lastIndexOf("-")+1);if(c.id!==d+"-"+ss[n].lid)ss[n].id=c.id;'
if y not in s: assert s.count(x)==2,s.count(x);s=s.replace(x,y)
# binder list keeps the subset scan; pockets use it (TCGdex has no CC/GG/RGB scans under the parent set)
rep('l=(d.cards||[]).map(c=>({n:c.n,lid:c.lid,name:c.name,k:c.k,x:c.x}))','l=(d.cards||[]).map(c=>({n:c.n,lid:c.lid,name:c.name,k:c.k,x:c.x,pimg:c.pimg}))')
rep('const srcs=own?(B.s.game==="lor"?lorSrcs(B.s,c.lid,c.x):own.imgs):cardSrcs(B.s,c.lid);','const srcs=c.pimg?pimgSrcs(c.pimg):own?(B.s.game==="lor"?lorSrcs(B.s,c.lid,c.x):own.imgs):cardSrcs(B.s,c.lid);')
rep('zItem({id:B.s.dex+"-"+c.lid,name:own.name,rarity:own.rarity,x:c.x||own.x,imgs:B.s.game==="lor"?lorSrcs(B.s,c.lid,c.x||own.x):own.imgs,',
    'zItem({id:own.id||idOf(B.s.dex,c.n,c.lid),name:own.name,rarity:own.rarity,x:c.x||own.x,imgs:B.s.game==="lor"?lorSrcs(B.s,c.lid,c.x||own.x):c.pimg?pimgSrcs(c.pimg):own.imgs,')
rep('const lid=e.lid||n,id=s.dex+"-"+lid,','const lid=e.lid||n,id=e.id||idOf(s.dex,n,lid),')
rep('e.textContent="Binder value: no prices"','e.textContent="Binder value: prices not available yet"')
block('f10','js',open('/workspace/feat/f10.js').read())
