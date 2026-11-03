rep('<!--SETX--></div>','<label>Sound <input type="checkbox" id="optSound"></label><label>Volume <input type="range" id="optVol" min="0" max="100" step="5" aria-label="Volume"></label><label>Haptics <input type="checkbox" id="optHap"></label><div class="note" id="hapNote"></div>\n<!--SETX--></div>')
block('F2JS','js',open('/workspace/feat/f2.js').read())
