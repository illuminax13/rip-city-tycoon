# bug-pass fixes
rep('<button id="sbox" class="ghost" aria-label="Open a booster box">📦 Box</button>','<button id="sbox" class="ghost" aria-label="Open a booster box">📦 Box</button><button id="ssetbtn" class="ghost" aria-label="Settings">⚙︎</button>')
block('f6css','css','#vWheel.stage #ssetbtn{background:rgba(255,255,255,.75);color:#24324a;border:1px solid rgba(30,50,80,.12);box-shadow:0 2px 8px rgba(30,50,80,.12);padding:7px 11px;line-height:1}')
block('f6','js','$("ssetbtn").onclick=e=>$("setbtn").onclick(e);')
