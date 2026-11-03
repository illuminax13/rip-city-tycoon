#!/bin/bash
# usage: runall.sh <project>  — every item in items2.txt, one at a time
P=$1; rm -f /tmp/suite/$P.log; mapfile -t IT < /workspace/feat/items2.txt
LEAK_N=4 /workspace/feat/suite2.sh $P "${IT[@]}"
