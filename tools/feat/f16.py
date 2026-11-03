import re as _re
# 1) markup: the Collection grid section becomes a Top 10 Hits showcase (placed above Recent pulls)
rep('<section><h2>Recent pulls</h2><div id="hist"></div></section>\n<section><h2>Collection</h2><div id="coll"></div></section>',
    '<section id="t10sec" aria-labelledby="t10h"><div class="t10head"><h2 id="t10h">Top 10 Hits</h2><span class="t10sub" id="t10sub"></span></div><div id="top10"></div></section>\n<section><h2>Recent pulls</h2><div id="hist"></div></section>')
# 2) render(): stop building the (removed) grid - it rendered every unique card on each render
_i=s.find(' $("coll").innerHTML=ks.sort(')
if _i>=0:
    _j=s.find('.join("")}',_i)+len('.join("")}')
    s=s[:_i]+' /*f16: collection grid removed (Top 10 Hits)*/}'+s[_j:]
# 3) F3JS hooks that referenced #coll
rep('\n  [...$("coll").children].forEach((d,i)=>{d.dataset.k=i});return r}}','\n  return r}}')
_i=s.find('$("coll").addEventListener("click"')
if _i>=0:
    _j=s.find('+d.dataset.k)});\n',_i)+len('+d.dataset.k)});\n')
    s=s[:_i]+'/*f16: #coll click-to-zoom removed (grid gone; Top 10 has its own)*/\n'+s[_j:]
block('f16css','css',open('/workspace/feat/f16_css.css').read())
block('f16','js',open('/workspace/feat/f16.js').read())
