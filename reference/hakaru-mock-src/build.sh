#!/bin/sh
# 部品をつないで1枚のHTMLにする
cd "$(dirname "$0")"
OUT=../reference/hakaru-mock-v1.html
mkdir -p ../reference
{ cat 00-head.html; echo '<script>'; for f in 10-core.js 2*.js 3*.js 4*.js 5*.js 6*.js 7*.js 99-boot.js; do [ -f "$f" ] && cat "$f"; done; echo '</script>'; } > "$OUT"
echo "built $OUT ($(wc -c < "$OUT") bytes)"
