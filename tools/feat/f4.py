block('f4css','css',open('/workspace/feat/f4_css.css').read())
block('f4','js',open('/workspace/feat/f4.js').read())
if 'id="sbox"' not in s: rep('<div class="sstats">Packs <b id="scount">','<button id="sbox" class="ghost" aria-label="Open a booster box">📦 Box</button><div class="sstats">Packs <b id="scount">')
block('f4b','js','$("sbox").onclick=()=>openBox(set);')
