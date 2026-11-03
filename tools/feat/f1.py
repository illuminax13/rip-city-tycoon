block('F1CSS','css',open('/workspace/feat/f1_css.css').read())
rep('<div class="stats"><span>Packs <b id="count">0</b></span>','<button id="setbtn" class="ghost" aria-label="Settings" aria-haspopup="dialog" aria-expanded="false">⚙︎</button><div class="stats"><span>Packs <b id="count">0</b></span>')
if 'id="settings"' not in s: rep('<div id="status">Choose a set to begin.</div>','<div id="settings" role="dialog" aria-label="Settings"><h4>Settings</h4>\n<label>Tilt foils with phone <input type="checkbox" id="optTilt"></label><div class="note" id="tiltNote"></div>\n<!--SETX--></div>\n<div id="status">Choose a set to begin.</div>')
block('F1JS','js',open('/workspace/feat/f1.js').read())
