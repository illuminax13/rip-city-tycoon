#!/bin/bash
# usage: suite2.sh <project> <item>...   item = spec[@grep]   (one at a time, logs /tmp/suite/<project>.log)
P=$1; shift; cd /workspace/pokemon-packs
for it in "$@"; do
  s=${it%%@*}; g=""; [[ "$it" == *@* ]] && g=${it#*@}
  out="/tmp/suite/$P-$s-$(echo "$g" | tr -cd 'A-Za-z0-9' | cut -c1-20).txt"
  curl -s -o /dev/null -m 3 http://127.0.0.1:8765/ || (nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 0.5
  if [ -n "$g" ]; then timeout 115 npx playwright test tests/$s.spec.js --project=$P -g "$g" --reporter=line > "$out" 2>&1; else timeout 115 npx playwright test tests/$s.spec.js --project=$P --reporter=line > "$out" 2>&1; fi; rc=$?
  echo "$s@$g rc=$rc $(grep -Eo '[0-9]+ (passed|failed|skipped|flaky)' "$out" | tr '\n' ' ')" >> /tmp/suite/$P.log
done
echo DONE >> /tmp/suite/$P.log
