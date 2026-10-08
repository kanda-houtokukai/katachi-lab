# katachi-lab 台帳（HANDOFF）

引き継ぎの入口はこの台帳1本。最初に「現在地サマリ」を読む。

---

## 現在地サマリ

- **今どこ**：P1 の夜間自走中（2026-10-08 夜）。N0 完了（手元のみ。GitHub への push と Pages は朝の確認事項の先頭）。
- **直近の決定**：
  - [DECISION] D9 内容の種類と数もすべて網羅する（立体は小1〜中1。展開図の数は計算で確定）
  - [DECISION] D10 kanda-houtokukai に公開リポジトリ `katachi-lab`、GitHub Pages、正式公開まで検索除け
  - [DECISION] D11 今夜は止まらずに自走。判断は既定の選択で進めて「朝の確認事項」に記録
  - [DECISION] D12 デザインは見本v2の見た目を仮に使い、`app/ui/tokens.css` に集めて後で差し替える
- **次の一手**：`docs/night-run-01.md` の N1（骨格と汎用エンジン、R2 の移植）。
- **ブロッカー**：公開リポジトリの作成（`gh repo create --public`）が Claude Code の自動判定で止められた。手元で全段を進め、push と Pages は朝にユーザーが1回の操作で行う（朝の確認事項の先頭）。

### ファイルの地図と正本

| ファイル | 中身 | 正本 |
|---|---|---|
| `docs/decisions.md` | 決定事項リスト（D1〜D12、提案、やらないこと、根拠） | ○ |
| `docs/rittai-design.md` | 立体の領域の設計書（単元・活動・数・判定・記録） | ○ |
| `docs/night-run-01.md` | 今夜の実装指示書 | ○ |
| `docs/coverage.md` | 有料サービスとの網羅表 | ○ |
| `reference/mock-v2.html` | 見本v2（Artifact で公開したもの）。移植の手本 | 参照用（書き換えない） |
| `reference/engine-v2-cube.js` | 見本の立方体エンジン（11種の番号の並び） | 参照用 |
| `reference/net_counter.py` | 展開図の数を数えた検証済みプログラム | 参照用 |
| `reference/net-counts.json` | 展開図の数の凍結値と寸法 | 凍結（計算し直さずに変えない） |

### 生きている注意事項

- 展開図の数（凍結値）：正四面体2、立方体11、直方体54、正四角柱29、正三角柱9、二等辺三角形の三角柱23、直角三角形の三角柱42、正五角柱99、正六角柱354、正三角錐4、正四角錐8、正五角錐15、正六角錐33、正八面体11。正十二面体・正二十面体は文献値43,380（カタログを作らずランダム生成）。
- 実行中に外部 API を呼ばない（D3）。広告・課金・登録・送信・解析なし。
- 正式公開まで検索除けを外さない。
- 落とし穴は `docs/night-run-01.md` §5。
- 見本v2の保護者向け文面・思い出し問題は下書き（`reviewed:false`）。正式公開の前にユーザーが教科書と照らして確認する。

---

## 朝の確認事項

- **【最初にお願いする操作・1回】GitHub への公開と Pages の有効化**：今夜は `gh repo create kanda-houtokukai/katachi-lab --public` が Claude Code の自動判定（公開面の作成）で止められたため、手元の commit だけで全段を進めた。ターミナルで次の1行を実行すると、リポジトリ作成・全 commit の push・Pages の有効化まで終わる（1〜2分後に `https://kanda-houtokukai.github.io/katachi-lab/` で開ける）。
  `cd ~/dev/katachi-lab && gh repo create kanda-houtokukai/katachi-lab --public --source=. --remote=origin --push --description "うごかして わかる 学習アプリ（試作）" && gh api -X POST repos/kanda-houtokukai/katachi-lab/pages -f "source[branch]=main" -f "source[path]=/"`
  - 今後 Code に任せる場合は、Claude Code の権限設定で `gh repo create` を許可する（変えるのは `~/.claude/settings.json`）。
- **npm install は端末の設定で止まっている**ため、three r128 と jsPDF 2.5.1 は npm 登録の tarball から必要な1ファイルだけ取り出して `vendor/` に置いた（shasum は npm 登録の値と一致）。E2E の Playwright は `~/dev/yugure-no-sato/node_modules/playwright` を借りている（`tools/pw.mjs`。`KATACHI_PW` で差し替え可）。自前で持たせるなら `npm i -D playwright` を一度だけ許可する。
- **手元確認のサーバ**：`node tools/serve.mjs 5310`（`~/.claude/launch.json` に `katachi-lab` を追加した）。service worker が効くと古いファイルが出るので、手元では `?nosw` を付けて開く。

---

## 朝の報告

（N7 で書く。指示書 §6 の5項目）

---

## 記録

### 記録 2026-10-08 N0 準備（Code・夜の自走）
- `git init -b main` と最初の commit（f67514f）。`gh repo create --public` は自動判定で止められたため、手元だけで進める（朝の確認事項の先頭に1行の操作を記載）。
- 殻：`index.html`（地図と単元画面）、`app/ui/tokens.css`（デザインの値を1か所に・D12）、`app/ui/base.css`。
- PWA：`manifest.webmanifest`、`sw.js`（版番号つきキャッシュ・全ファイルを事前キャッシュ。版と一覧は `tools/build-precache.mjs` が作る）、仮アイコン（`tools/make-icons.mjs` で Canvas から PNG）。
- 検索除け：`robots.txt` Disallow、全ページ `noindex,nofollow`、`.nojekyll`。
- 汎用エンジン（`app/engine/`）と展開図カタログ（`data/nets/`）を先に作り、凍結値14件と一致（全域木の数・重なり0も一致）。
- テスト：単体 9件 PASS（凍結値・数え直し・折りたたみ・合同キー・のりしろ・立方体の番号・検索除け・外部読み込み・事前キャッシュ）。
- 公開 URL の確認：未検証（push 前のため）。手元 `http://localhost:5310/?nosw` で地図の表示と「じゅんび中」の反応を確認。
- SHA：a0a09d9（push なし）

### 記録 2026-10-08 立ち上げ（Chat）
- 見本 v1（アニメーションの水準を確認）・v2（網羅表の不足分を追加）を Artifact で公開。アニメーションはユーザーが合格と判断（D7）。
- 有料サービス約25本を調査し、網羅表を作成（`docs/coverage.md`）。
- 展開図の数を総当たりで計算し、文献値（2・11・11・54）と一致することを確認して凍結（`reference/net-counts.json`）。
- 立体の領域の設計書と夜間の指示書を作成。
- ★ 数は計算で決める。手で数えた数を画面に書かない。
