# katachi-lab 台帳アーカイブ（2026-10）

`HANDOFF.md` の記録が10件を超えたときに、最も古いものから原文のまま移したもの。

---

### 記録 2026-10-08 立ち上げ（Chat）
- 見本 v1（アニメーションの水準を確認）・v2（網羅表の不足分を追加）を Artifact で公開。アニメーションはユーザーが合格と判断（D7）。
- 有料サービス約25本を調査し、網羅表を作成（`docs/coverage.md`）。
- 展開図の数を総当たりで計算し、文献値（2・11・11・54）と一致することを確認して凍結（`reference/net-counts.json`）。
- 立体の領域の設計書と夜間の指示書を作成。
- ★ 数は計算で決める。手で数えた数を画面に書かない。


### 記録 2026-10-08 N0 準備（Code・夜の自走）
- `git init -b main` と最初の commit（f67514f）。`gh repo create --public` は自動判定で止められたため、手元だけで進める（朝の確認事項の先頭に1行の操作を記載）。
- 殻：`index.html`（地図と単元画面）、`app/ui/tokens.css`（デザインの値を1か所に・D12）、`app/ui/base.css`。
- PWA：`manifest.webmanifest`、`sw.js`（版番号つきキャッシュ・全ファイルを事前キャッシュ。版と一覧は `tools/build-precache.mjs` が作る）、仮アイコン（`tools/make-icons.mjs` で Canvas から PNG）。
- 検索除け：`robots.txt` Disallow、全ページ `noindex,nofollow`、`.nojekyll`。
- 汎用エンジン（`app/engine/`）と展開図カタログ（`data/nets/`）を先に作り、凍結値14件と一致（全域木の数・重なり0も一致）。
- テスト：単体 9件 PASS（凍結値・数え直し・折りたたみ・合同キー・のりしろ・立方体の番号・検索除け・外部読み込み・事前キャッシュ）。
- 公開 URL の確認：未検証（push 前のため）。手元 `http://localhost:5310/?nosw` で地図の表示と「じゅんび中」の反応を確認。
- SHA：a0a09d9（push なし）
