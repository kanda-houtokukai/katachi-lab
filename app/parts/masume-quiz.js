// ひろさの「ためす」（H1・H4・H5・H6）。opts.type：
//  compare（どちらが ひろい：重ねる／マス／まわりに まどわされる）｜count（マスの いくつぶん・大きさの違うマス）｜mitoshi（見当→かぞえる）
//  ｜area（長方形・L字・まわりが同じ・単位）｜formula（三角形・四角形）｜circle（円・およその面積）
// 誤答の選択肢には つまずきの型（A1・A2・A3・A4…・m2）を必ず混ぜる。答え合わせは、正解でも不正解でも動きで確かめる（重ねる・マスを数える・切って動かす）。
import { el, C, txt, rect, line, path, circle, clear, clamp, tween, wait, E, pathOf, hanamaru, dim } from './_flat.js';
import { makeQuiz } from './_quiz2d.js';
import { stageBox, wide, fitGrid, drawBoard, shapeG, place, countCells, unroll, glowCells, absOf, numberLine } from './_masume.js';
import { bbox, perimeter, genHiroi, genCount, genBlobCells, genArea, genFormula, genCircle } from './_hirosa-gen.js';
import { drawRectTiles, rowTiles, drawFigure, figVerify, drawCircleQ, circleVerify, drawLQ, lVerify, unitDiagram, unitVerify } from './_hirosa-fig.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on, hintDots, levelSeg, starsHTML } from './_common.js';
import { shuffle } from '../core/text.js';

const red = () => C('face-1'), blue = () => C('face-4');
const sw = col => `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="4" fill="${col}"/></svg>`;
const CH = { a: () => `${sw(red())}あか`, b: () => `${sw(blue())}あお`, same: () => 'おなじ' };
const strip = s => String(s).replace(/<[^>]+>/g, '');

export function mount(ctx) {
  const { opts } = ctx;
  const type = opts.type || 'compare';
  if (type === 'mitoshi') return mitoshi(ctx);
  const F = ctx.openFlat();
  let draw = null;   // いまの問題の絵（描き直し用）
  F.onResize(() => { draw && draw(); });
  const setDraw = fn => { draw = fn; F.clearLayers(); fn(); };
  const box = () => stageBox(F, { bottom: 10 });

  /* ---------- H1：どちらが ひろい ---------- */
  const qCompare = (level, i) => {
    const q = genHiroi(level, i), st = {};
    setDraw(() => {
      F.clearLayers(); const b = box(), w = wide(F) || b.w > b.h * 1.3;
      const G = st.G = fitGrid(b, w ? 13 : 8, w ? 6 : 9, 52); drawBoard(F.layer('board'), G, { lines: false });
      const ba = bbox(q.a), bb = bbox(q.b), side = ba.w + bb.w + 2 <= G.cols;
      st.pa = side ? [Math.floor((G.cols - ba.w - bb.w - 2) / 2) + 0, Math.floor((G.rows - ba.h) / 2)] : [Math.floor((G.cols - ba.w) / 2), Math.max(0, Math.floor((G.rows - ba.h - bb.h - 1) / 2))];
      st.pb = side ? [st.pa[0] + ba.w + 2, Math.floor((G.rows - bb.h) / 2)] : [Math.floor((G.cols - bb.w) / 2), st.pa[1] + ba.h + 1];
      const L = F.layer('shapes');
      st.ga = shapeG(L, q.a, G.c, { color: red(), op: 0.62, grid: st.grid }); place(st.ga, G.X(st.pa[0]), G.Y(st.pa[1]));
      st.gb = shapeG(L, q.b, G.c, { color: blue(), op: 0.62, grid: st.grid }); place(st.gb, G.X(st.pb[0]), G.Y(st.pb[1]));
      F.layer('fx');
    });
    const ans = q.choices.find(c => c.ok).key, nm = { a: 'あか', b: 'あお', same: 'おなじ' };
    return {
      say: 'ひろいのは どっち？', sp: '広いのはどっち？', at: { x: F.W / 2, y: (F.top + F.bottom) / 2, r: Math.min(F.W, F.h) * 0.16 },
      choices: q.choices.map(c => ({ html: CH[c.key](), ok: c.ok, mistake: c.mistake })),
      detail: { kind: q.kind, na: q.na, nb: q.nb, pa: q.pa, pb: q.pb }, answerText: nm[ans], answerSp: { a: '赤', b: '青', same: '同じ' }[ans],
      hint(k) {
        if (k === 1) ctx.caption(q.kind === 'inside' ? 'かさねて みると？' : 'まわりの ながさで きめて いいかな？', 0, q.kind === 'inside' ? '重ねてみると？' : 'まわりの長さで決めていいかな？');
        if (k === 2) { st.grid = true; draw(); ctx.caption('おなじ おおきさの <b>マス</b>で かぞえよう', 0, '同じ大きさのマスで数えよう'); }
        if (k === 3) { countCells(F.layer('fx'), absOf(q.a, ...st.pa), st.G, red(), { sfx: ctx.sfx, per: 0.06 }); ctx.caption(`あかは ${q.na}マス`, 0, `赤は${q.na}マス`); }
      },
      async verify() {
        const tag = S.token, G = st.G, fx = F.layer('fx'); clear(fx);
        if (q.kind === 'inside') {
          // 小さい方を大きい方に重ねる
          const small = q.na < q.nb ? 'a' : 'b', g = small === 'a' ? st.ga : st.gb, from = small === 'a' ? st.pa : st.pb, to = small === 'a' ? st.pb : st.pa;
          await tween(0.8, e => place(g, G.X(from[0] + (to[0] - from[0]) * e), G.Y(from[1] + (to[1] - from[1]) * e)), E.io); if (!alive(tag)) return;
          const big = small === 'a' ? absOf(q.b, ...st.pb) : absOf(q.a, ...st.pa), sm = new Set((small === 'a' ? absOf(q.a, ...to) : absOf(q.b, ...to)).map(p => p.join(',')));
          glowCells(fx, big.filter(p => !sm.has(p.join(','))), G, small === 'a' ? blue() : red());
          ctx.caption(`すっぽり はいった。はみだした <b>${small === 'a' ? 'あお' : 'あか'}</b>の ほうが ひろい`, 0, `すっぽり入った。はみ出した${small === 'a' ? '青' : '赤'}のほうが広い`);
          await wait(1.4); return;
        }
        st.grid = true; draw();
        const fx2 = F.layer('fx');
        const na = await countCells(fx2, absOf(q.a, ...st.pa), G, red(), { sfx: ctx.sfx, per: 0.07 }); if (!alive(tag)) return;
        const nb = await countCells(fx2, absOf(q.b, ...st.pb), G, blue(), { sfx: ctx.sfx, per: 0.07 }); if (!alive(tag)) return;
        ctx.caption(`<b>あか ${na}マス</b>、<em>あお ${nb}マス</em>` + (q.pa !== q.pb && q.kind !== 'inside' ? `（まわりは あか ${q.pa}・あお ${q.pb}）` : ''), 0, `赤${na}マス、青${nb}マス`);
        await wait(1.2);
      },
    };
  };
  /* ---------- H1：マスの いくつぶん ---------- */
  const qCount = (level, i) => {
    const q = genCount(level, i), st = {};
    if (q.kind === 'count') {
      setDraw(() => {
        F.clearLayers(); const b = box(), ba = bbox(q.a);
        const G = st.G = fitGrid(b, ba.w + 2, ba.h + 2, 60); drawBoard(F.layer('board'), G, { lines: false });
        st.g = shapeG(F.layer('shapes'), q.a, G.c, { color: red(), op: 0.55, grid: true }); place(st.g, G.X(1), G.Y(1));
        F.layer('fx');
      });
      return {
        say: 'あかは マス なんこ ぶん？', sp: '赤はマス何こぶん？', at: { x: F.W / 2, y: (F.top + F.bottom) / 2, r: Math.min(F.W, F.h) * 0.16 },
        choices: q.choices, detail: { kind: 'count', n: q.na }, answerText: `${q.na}こ ぶん`, answerSp: `${q.na}こぶん`,
        hint(k) {
          if (k === 1) ctx.caption('1つずつ ゆびで おさえて かぞえよう', 0, '1つずつ指でおさえて数えよう');
          if (k === 2) { const fx = F.layer('fx'), G = st.G; clear(fx); const rows = [...new Set(q.a.map(p => p[1]))]; rows.forEach((y, j) => q.a.filter(p => p[1] === y).forEach(([x]) => rect(fx, G.X(x + 1), G.Y(y + 1), G.c, G.c, { fill: j % 2 ? C('cell-b') : C('paper'), opacity: 0.45 }))); ctx.caption('よこの れつ ごとに かぞえよう', 0, '横の列ごとに数えよう'); }
          if (k === 3) { const half = q.a.slice(0, Math.ceil(q.na / 2)); countCells(F.layer('fx'), absOf(half, 1, 1), st.G, red(), { sfx: ctx.sfx, per: 0.08 }); ctx.caption(`ここまでで ${half.length}こ`, 0, `ここまでで${half.length}こ`); }
        },
        async verify() { const tag = S.token, fx = F.layer('fx'); clear(fx); const n = await countCells(fx, absOf(q.a, 1, 1), st.G, red(), { sfx: ctx.sfx }); if (!alive(tag)) return; ctx.caption(`<b>${n}こ ぶん</b>`, 0, `${n}こぶん`); await wait(0.8); },
      };
    }
    // 大きさの違うマス（A3）
    setDraw(() => {
      F.clearLayers(); const b = box(), ba = bbox(q.a), bb = bbox(q.b), w = wide(F) || b.w > b.h * 1.2;
      const cols = w ? ba.w + bb.w + 3 : Math.max(ba.w, bb.w) + 2, rows = w ? Math.max(ba.h, bb.h) + 2 : ba.h + bb.h + 3;
      const G = st.G = fitGrid(b, cols, rows, 54); drawBoard(F.layer('board'), G, { lines: false });
      st.pa = [1, w ? 1 + Math.floor((rows - 2 - ba.h) / 2) : 1]; st.pb = w ? [ba.w + 2, 1 + Math.floor((rows - 2 - bb.h) / 2)] : [1, ba.h + 2];
      const L = F.layer('shapes'), c = G.c;
      const ga = el('g', {}, L); place(ga, G.X(st.pa[0]), G.Y(st.pa[1]));
      q.a.forEach(([x, y], k) => { rect(ga, x * c + 2, y * c + 2, c - 4, c - 4, { rx: 5, fill: C('cell-b'), stroke: red(), 'stroke-width': 2 }); txt(ga, x * c + c / 2, y * c + c / 2 + c * 0.15, String(k + 1), { 'font-size': c * 0.4, class: 'ui' }); });
      const gb = el('g', {}, L); place(gb, G.X(st.pb[0]), G.Y(st.pb[1])); st.gb = gb;
      let k = 0; for (const [x, y] of q.b) if (x % 2 === 0 && y % 2 === 0) { k++; rect(gb, x * c + 3, y * c + 3, 2 * c - 6, 2 * c - 6, { rx: 7, fill: C('face-3'), stroke: blue(), 'stroke-width': 2.5 }); txt(gb, (x + 1) * c, (y + 1) * c + c * 0.25, String(k), { 'font-size': c * 0.7, class: 'ui' }); }
      F.layer('fx');
    });
    const ans = q.choices.find(c => c.ok).key;
    return {
      say: `あかは ${q.ta}こ、あおは ${q.tb}こ。ひろいのは どっち？`, sp: `赤は${q.ta}こ、青は${q.tb}こ。広いのはどっち？`, at: { x: F.W / 2, y: (F.top + F.bottom) / 2, r: Math.min(F.W, F.h) * 0.16 },
      choices: q.choices.map(c => ({ html: CH[c.key](), ok: c.ok, mistake: c.mistake })), detail: { kind: 'size', na: q.na, nb: q.nb, ta: q.ta, tb: q.tb }, answerText: { a: 'あか', b: 'あお', same: 'おなじ' }[ans],
      hint(k) {
        if (k === 1) ctx.caption('マスの <b>おおきさ</b>を みて', 0, 'マスの大きさを見て');
        if (k === 2) ctx.caption('あおの マス 1こは、あかの マス なんこ ぶん？', 0, '青のマス1こは、赤のマス何こぶん？');
        if (k === 3) ctx.caption('おおきい マス 1こ ＝ ちいさい マス 4こ', 0, '大きいマス1こは小さいマス4こ');
      },
      async verify() {
        const tag = S.token, c = st.G.c, g = el('g', {}, st.gb);
        for (const [x, y] of q.b) if (x % 2 === 0 && y % 2 === 0) {
          const l1 = line(g, (x + 1) * c, y * c + 4, (x + 1) * c, y * c + 4, { 'stroke-width': 2.5 }), l2 = line(g, x * c + 4, (y + 1) * c, x * c + 4, (y + 1) * c, { 'stroke-width': 2.5 });
          await tween(0.22, e => { l1.setAttribute('y2', y * c + 4 + (2 * c - 8) * e); l2.setAttribute('x2', x * c + 4 + (2 * c - 8) * e); }); if (!alive(tag)) return;
        }
        ctx.caption(`ちいさい マスで くらべると あか <b>${q.na}</b>・あお <b>${q.nb}</b>`, 0, `小さいマスで比べると赤${q.na}、青${q.nb}`);
        await wait(1.4);
      },
    };
  };
  /* ---------- H4：面積 ---------- */
  const qArea = (level, i) => {
    const q = genArea(level, i), st = {};
    if (q.t === 'perim') {
      setDraw(() => { F.clearLayers(); st.d = drawRectTiles(F, box(), [{ h: q.a.h, w: q.a.w, col: red() }, { h: q.b.h, w: q.b.w, col: blue() }], { grid: false, dims: true }); });
      return { say: `まわりは どちらも ${q.P}cm。ひろいのは どっち？`, sp: `まわりはどちらも${q.P}センチメートル。広いのはどっち？`, at: st.d.at, detail: { t: q.t, P: q.P }, answerText: q.choices.find(c => c.ok).html,
        choices: q.choices.map(c => ({ html: c.key === 'same' ? 'おなじ' : CH[c.key](), ok: c.ok, mistake: c.mistake })),
        hint(k) { if (k === 1) ctx.caption('まわりが おなじでも ひろさは おなじ？', 0, 'まわりが同じでも広さは同じ？'); if (k >= 2) ctx.caption('<ruby>面積<rt>めんせき</rt></ruby>は たて × よこ', 0, '面積はたてかけるよこ'); },
        async verify() { const tag = S.token; for (const r of st.d.rects) { await rowTiles(F, r, ctx.sfx); if (!alive(tag)) return; } ctx.caption(`あか ${q.a.h * q.a.w}cm²・あお ${q.b.h * q.b.w}cm²`, 0, unitSpeech(`赤${q.a.h * q.a.w}cm²、青${q.b.h * q.b.w}cm²`)); await wait(1); } };
    }
    if (q.t === 'L' || q.t === 'L2') {
      setDraw(() => { F.clearLayers(); st.d = drawLQ(F, box(), q); });
      return { say: 'この かたちの <ruby>面積<rt>めんせき</rt></ruby>は？', sp: 'この形の面積は？', at: st.d.at, choices: q.choices, detail: { t: 'L', ans: q.ans }, answerText: `${q.ans}cm²`, answerSp: unitSpeech(`${q.ans}cm²`),
        hint(k) { if (k === 1) ctx.caption('2つの ながしかくに わけて みよう', 0, '2つの長方形に分けてみよう'); if (k === 2) ctx.caption('おおきい ながしかくから かけた ところを ひいても いい', 0, '大きい長方形から欠けたところを引いてもいい'); if (k === 3) ctx.caption(`${q.H}×${q.W} − ${q.nh}×${q.nw}`, 0, `${q.H}かける${q.W}ひく${q.nh}かける${q.nw}`); },
        async verify() { await lVerify(F, st.d, q, ctx); } };
    }
    if (q.t === 'unit') {
      setDraw(() => { F.clearLayers(); st.d = unitDiagram(F, box(), q); });
      return { say: q.q, sp: unitSpeech(q.q.replace(/なん/g, '何')), at: st.d.at, choices: q.choices, detail: { t: 'unit', q: q.q }, answerText: q.ans, answerSp: unitSpeech(q.ans),
        hint(k) { if (k === 1) ctx.caption('1ぺんの ながさで かんがえよう', 0, '1辺の長さで考えよう'); if (k === 2) ctx.caption('1m ＝ 100cm。100 × 100 は？', 0, unitSpeech('1mは100cm。100かける100は？')); if (k === 3) ctx.caption('1a は 10m × 10m、1ha は 100m × 100m', 0, unitSpeech('1aは10mかける10m、1haは100mかける100m')); },
        async verify() { await unitVerify(F, st.d, q, ctx); } };
    }
    setDraw(() => { F.clearLayers(); st.d = drawRectTiles(F, box(), [{ h: q.h, w: q.w, col: C('sora'), unit: q.unit === 'm²' ? 'm' : 'cm' }], { grid: q.t === 'grid', dims: true }); });
    const sq = q.t === 'sq';
    return { say: `この ${sq ? '<ruby>正方形<rt>せいほうけい</rt></ruby>' : '<ruby>長方形<rt>ちょうほうけい</rt></ruby>'}の <ruby>面積<rt>めんせき</rt></ruby>は？`, sp: `この${sq ? '正方形' : '長方形'}の面積は？`, at: st.d.at, choices: q.choices, detail: { t: q.t, h: q.h, w: q.w }, answerText: `${q.ans}${q.unit}`, answerSp: unitSpeech(`${q.ans}${q.unit}`),
      hint(k) { if (k === 1) ctx.caption(`1${q.unit} の ましかくが いくつ ぶん？`, 0, unitSpeech(`1${q.unit}の正方形がいくつぶん？`)); if (k === 2) { rowTiles(F, st.d.rects[0], ctx.sfx, { rowsOnly: 1 }); ctx.caption(`1れつに ${q.w}こ`, 0, `1列に${q.w}こ`); } if (k === 3) ctx.caption(`たて × よこ ＝ ${q.h} × ${q.w}`, 0, `たてかけるよこ、${q.h}かける${q.w}`); },
      async verify() { const tag = S.token; await rowTiles(F, st.d.rects[0], ctx.sfx); if (!alive(tag)) return; ctx.caption(`${q.w}こ が ${q.h}れつ。${q.h} × ${q.w} ＝ <b>${q.ans}${q.unit}</b>`, 0, unitSpeech(`${q.w}こが${q.h}列。${q.h}かける${q.w}は${q.ans}${q.unit}`)); await wait(1); } };
  };
  /* ---------- H5：三角形・四角形 ---------- */
  const NAME = { para: ['<ruby>平行四辺形<rt>へいこうしへんけい</rt></ruby>', '平行四辺形'], tri: ['<ruby>三角形<rt>さんかくけい</rt></ruby>', '三角形'], trap: ['<ruby>台形<rt>だいけい</rt></ruby>', '台形'], rhom: ['ひし<ruby>形<rt>がた</rt></ruby>', 'ひし形'] };
  const HINT = { para: ['そこへんと たかさを みよう', '<ruby>底辺<rt>ていへん</rt></ruby> × <ruby>高<rt>たか</rt></ruby>さ'], tri: ['おなじ さんかくけいを 2まい あわせると？', '<ruby>底辺<rt>ていへん</rt></ruby> × <ruby>高<rt>たか</rt></ruby>さ ÷ 2'], trap: ['おなじ だいけいを 2まい あわせると？', '（<ruby>上底<rt>じょうてい</rt></ruby> ＋ <ruby>下底<rt>かてい</rt></ruby>）× <ruby>高<rt>たか</rt></ruby>さ ÷ 2'], rhom: ['たいかくせんで かこむ ながしかくの はんぶん', '<ruby>対角線<rt>たいかくせん</rt></ruby> × <ruby>対角線<rt>たいかくせん</rt></ruby> ÷ 2'] };
  const qFormula = (level, i) => {
    const q = genFormula(level, i), st = {};
    setDraw(() => { F.clearLayers(); st.d = drawFigure(F, box(), q); });
    return { say: `この ${NAME[q.fig][0]}の <ruby>面積<rt>めんせき</rt></ruby>は？`, sp: `この${NAME[q.fig][1]}の面積は？`, at: st.d.at, choices: q.choices, detail: { fig: q.fig, out: !!q.out, ans: q.ans }, answerText: `${q.ans}cm²`, answerSp: unitSpeech(`${q.ans}cm²`),
      hint(k) { if (k === 1) { st.d.hiH && st.d.hiH(); ctx.caption(q.fig === 'rhom' ? 'たいかくせんの ながさを みよう' : `<ruby>高<rt>たか</rt></ruby>さは どこ？${q.out ? ' かたちの そとに ある' : ''}`, 0, q.fig === 'rhom' ? '対角線の長さを見よう' : '高さはどこ？'); } if (k === 2) ctx.caption(HINT[q.fig][0], 0, strip(HINT[q.fig][0])); if (k === 3) ctx.caption(HINT[q.fig][1], 0, strip(HINT[q.fig][1]).replace(/×/g, 'かける').replace(/÷/g, 'わる')); },
      async verify() { await figVerify(F, st.d, q, ctx); } };
  };
  /* ---------- H6：円・およその面積 ---------- */
  const qCircle = (level, i) => {
    const q = genCircle(level, i), st = {};
    setDraw(() => { F.clearLayers(); st.d = drawCircleQ(F, box(), q); });
    const say = q.k === 'approx' ? `この ${q.shape.s === 'circle' ? 'いけ' : 'しま'}を ${q.shape.name}と みると、およその <ruby>面積<rt>めんせき</rt></ruby>は？` : `この ${q.frac === 1 ? '<ruby>円<rt>えん</rt></ruby>' : q.frac === 0.5 ? '<ruby>半円<rt>はんえん</rt></ruby>' : '<ruby>円<rt>えん</rt></ruby>の 4ぶんの1'}の <ruby>面積<rt>めんせき</rt></ruby>は？（<ruby>円周率<rt>えんしゅうりつ</rt></ruby> 3.14）`;
    return { say, sp: strip(say).replace(/（.*）/, ''), at: st.d.at, choices: q.choices, detail: { k: q.k, ans: q.ans }, answerText: `${q.ans}${q.unit || 'cm²'}`, answerSp: unitSpeech(`${q.ans}${q.unit || 'cm²'}`),
      hint(k) {
        if (q.k === 'approx') { if (k === 1) ctx.caption('かたちを かさねて みたよ', 0, '形を重ねてみたよ'); if (k === 2) ctx.caption(q.shape.s === 'circle' ? 'はんけい × はんけい × 3.14' : q.shape.s === 'tri' ? 'ていへん × たかさ ÷ 2' : 'ていへん × たかさ', 0, '公式を思い出そう'); if (k === 3) ctx.caption('ながさを あてはめよう', 0, '長さを当てはめよう'); return; }
        if (k === 1) ctx.caption(q.d ? '<ruby>直径<rt>ちょっけい</rt></ruby>の はんぶんが <ruby>半径<rt>はんけい</rt></ruby>' : '<ruby>半径<rt>はんけい</rt></ruby>を みよう', 0, q.d ? '直径の半分が半径' : '半径を見よう');
        if (k === 2) ctx.caption('<ruby>半径<rt>はんけい</rt></ruby> × <ruby>半径<rt>はんけい</rt></ruby> × 3.14', 0, '半径かける半径かける3.14');
        if (k === 3) ctx.caption(`${q.r} × ${q.r} × 3.14${q.frac < 1 ? ` × ${q.frac === 0.5 ? '1/2' : '1/4'}` : ''}`, 0, `${q.r}かける${q.r}かける3.14`);
      },
      async verify() { await circleVerify(F, st.d, q, ctx); } };
  };
  const gens = { compare: qCompare, count: qCount, area: qArea, formula: qFormula, circle: qCircle };
  const kind = opts.kind || type;
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen: (lv, i) => (gens[type] || qCompare)(lv, i) });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}

/* ---------- H1：みとおし（マスの いくつぶん を 見当してから かぞえる） ---------- */
const TOL = { easy: 0.4, normal: 0.25, challenge: 0.15 }, LV = ['easy', 'normal', 'challenge'], LVN = { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' };
function mitoshi(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  const n = ctx.opts.n || 5, Q = { level: ctx.level(), i: 0, res: [], phase: 'ask', guess: 0, cells: null, max: 30 };
  const L = {};
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="ctl"><button class="btn sub small" type="button" data-k="minus" aria-label="すこし へらす">−</button><button class="btn big" type="button" data-k="guess">これくらい</button><button class="btn sub small" type="button" data-k="plus" aria-label="すこし ふやす">＋</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎ</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><div class="row"><button class="btn sub" type="button" data-k="again">もういちど</button><button class="btn" type="button" data-k="up"></button></div></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const say = 'この かたちは マス なんこ ぶん？ みとおしを たてよう';
  function layout() {
    F.clearLayers(); if (!Q.cells) return;
    const b = stageBox(F, { bottom: 8 }), bb = bbox(Q.cells), w = wide(F) || b.w > b.h * 1.3;
    const top = { x: b.x, y: b.y, w: b.w, h: b.h - 78 };
    const G = L.G = fitGrid(top, bb.w + (w ? 5 : 2), bb.h + (w ? 2 : 3), 46);
    L.at = [w ? 1 : 1, 1];
    drawBoard(F.layer('board'), G, { lines: false });
    // 見本の マス 1こ
    const sg = F.layer('sample');
    if (w) { rect(sg, G.X(bb.w + 2.5), G.Y(1), G.c, G.c, { fill: C('cell-b'), stroke: C('ink'), 'stroke-width': 1.5 }); txt(sg, G.X(bb.w + 3), G.Y(1) + G.c + 20, 'マス 1こ', { 'font-size': 14, fill: C('ink-soft') }); }
    else { const sx = G.X(G.cols - 1) + G.c * 0.15, sy = G.Y(G.rows - 1) + G.c * 0.15; rect(sg, sx, sy, G.c * 0.7, G.c * 0.7, { fill: C('cell-b'), stroke: C('ink'), 'stroke-width': 1.5 }); txt(sg, sx - 6, sy + G.c * 0.45, 'マス 1こ', { 'font-size': 13, fill: C('ink-soft'), 'text-anchor': 'end' }); }
    L.sh = shapeG(F.layer('shape'), Q.cells, G.c, { color: C('cell-a'), op: 0.55, sw: 3 }); place(L.sh, G.X(L.at[0]), G.Y(L.at[1]));
    // 数直線
    const ny = b.y + b.h - 44, x0 = Math.max(30, F.W * 0.07), x1 = F.W - Math.max(60, F.W * 0.09);
    L.ny = ny; const nl = F.layer('nl');
    L.xOf = numberLine(nl, x0, x1, ny, Q.max, { major: 5, minor: 1, unit: 'こ' }); L.x0 = x0; L.x1 = x1;
    L.act = el('g', {}, nl);
    L.mark = el('g', { class: 'grab' }, nl);
    path(L.mark, 'M-14,-34L14,-34L0,-12Z', { fill: C('sora') }); line(L.mark, 0, -12, 0, 14, { stroke: C('sora'), 'stroke-width': 4 });
    L.mt = txt(L.mark, 0, -42, '', { 'font-size': 20, fill: C('sora'), class: 'ui' });
    F.layer('fx');
    setGuess(Q.guess);
  }
  const vOf = x => clamp(Math.round((x - L.x0) / (L.x1 - L.x0) * Q.max), 0, Q.max);
  function setGuess(v) { Q.guess = v; if (!L.mark) return; L.mark.setAttribute('transform', `translate(${L.xOf(v)},${L.ny})`); L.mt.textContent = v ? `${v}こ` : ''; }
  F.svg.addEventListener('pointerdown', e => { if (Q.phase !== 'ask' || !L.mark) return; const p = F.ptr(e); if (Math.abs(p.y - L.ny) > 60) return; e.preventDefault(); try { F.svg.setPointerCapture(e.pointerId); } catch (er) {} Q.drag = e.pointerId; setGuess(vOf(p.x)); });
  F.svg.addEventListener('pointermove', e => { if (Q.drag !== e.pointerId || Q.phase !== 'ask') return; setGuess(vOf(F.ptr(e).x)); });
  const up = e => { if (Q.drag === e.pointerId) { Q.drag = null; sfx.tap(); } };
  F.svg.addEventListener('pointerup', up); F.svg.addEventListener('pointercancel', up);
  function dotsHTML() { return Array.from({ length: n }, (_, k) => `<i class="${Q.res[k] || (k === Q.i ? 'now' : '')}"></i>`).join(''); }
  function start() { Q.i = 0; Q.res = []; $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level))); show(); }
  function show() {
    Q.cells = genBlobCells(Q.level, Q.i); Q.max = Q.level === 'easy' ? 20 : Q.level === 'normal' ? 30 : 40; Q.guess = 0; Q.phase = 'ask';
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('ctl').hidden = false; q$('dotsRow').hidden = false; q$('levelRow').hidden = Q.i !== 0;
    q$('dots').innerHTML = dotsHTML(); q$('qTxt').innerHTML = say;
    layout(); ctx.caption(say, 0, 'この形はマス何こぶん？見通しを立てよう');
  }
  async function guess() {
    if (Q.phase !== 'ask') return;
    if (Q.guess <= 0) { sfx.off(); ctx.toast('', 'すうちょくせんの ▼を うごかして、みとおしを きめてね', 2.4); return; }
    Q.phase = 'busy'; sfx.pop(); q$('ctl').hidden = true; const tag = S.token, actual = Q.cells.length, G = L.G;
    // マスの線が出て、1こずつ数える
    const lg = el('g', { opacity: 0 }, F.layer('fx'));
    for (const [x, y] of Q.cells) rect(lg, G.X(x + L.at[0]) + 0.5, G.Y(y + L.at[1]) + 0.5, G.c - 1, G.c - 1, { fill: 'none', stroke: C('ink'), 'stroke-width': 1, opacity: 0.6 });
    await tween(0.5, e => lg.setAttribute('opacity', e)); if (!alive(tag)) return;
    const bar = rect(L.act, L.x0, L.ny - 8, 0, 16, { rx: 8, fill: C('ok'), opacity: 0.7 });
    let k = 0; const per = clamp(2 / actual, 0.04, 0.12);
    const fx = F.layer('fx');
    for (const [x, y] of Q.cells) { k++; await countCells(fx, [[x + L.at[0], y + L.at[1]]], G, C('cell-a'), { from: k - 1, per, sfx }); if (!alive(tag)) return; bar.setAttribute('width', Math.max(0, L.xOf(k) - L.x0)); }
    const am = el('g', { transform: `translate(${L.xOf(actual)},${L.ny})` }, L.act);
    path(am, 'M-12,28L12,28L0,10Z', { fill: C('ok') }); txt(am, 0, 52, `${actual}こ`, { 'font-size': 18, fill: C('ok'), class: 'ui' });
    const err = Math.abs(Q.guess - actual) / actual, close = err <= TOL[Q.level];
    Q.res[Q.i] = close ? 'ok' : 'ng';
    ctx.log('estimate', { correct: close, level: Q.level, detail: { q: 'マス なんこ ぶん', guess: Q.guess, actual, unit: 'マス', qty: 'area' } });
    const msg = `${actual}マス。みとおしは ${Q.guess}マス`;
    if (close) { sfx.good(); hanamaru(F.svg, L.xOf(actual), L.ny - 40, 40); ctx.toast(ICON.HANAMARU, `ちかい！ ${msg}`, 3, `近い！${actual}マス`); }
    else ctx.toast('', `${msg}。${Q.guess > actual ? 'おおきく みすぎ' : 'ちいさく みすぎ'}`, 3.2, `${actual}マス。見通しは${Q.guess}マス`);
    Q.phase = 'done'; q$('dots').innerHTML = dotsHTML();
    q$('next').textContent = Q.i < n - 1 ? 'つぎ' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  function finish() {
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('ctl').hidden = true; q$('dotsRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = Q.res.filter(r => r === 'ok').length;
    q$('stars').innerHTML = starsHTML(Q.res.map(r => ({ correct: r === 'ok', hints: 0 })), ICON);
    q$('score').textContent = `${n}もん中 ${score}もん ちかかった`;
    const li = LV.indexOf(Q.level); q$('up').textContent = li < 2 ? `${LVN[LV[li + 1]]} へ` : 'やさしい から';
    ctx.log('estimate-done', { level: Q.level, detail: { n, score } }); ctx.done('tamesu');
    ctx.caption(`${n}もん中 ${score}もん ちかかった`);
  }
  const nudge = d => { if (Q.phase !== 'ask') return; const v = clamp(Q.guess + d, 0, Q.max); if (v === Q.guess) { sfx.off(); ctx.toast('', d < 0 ? 'これより すくなく できないよ' : 'これより おおく できないよ', 1.6); return; } sfx.tap(); setGuess(v); };
  on(q$('say-q'), 'click', () => ctx.say('この形はマス何こぶん？', true));
  on(q$('minus'), 'click', () => nudge(-1)); on(q$('plus'), 'click', () => nudge(1));
  on(q$('guess'), 'click', guess);
  on(q$('next'), 'click', () => { sfx.tap(); ctx.hideHud(); if (Q.i < n - 1) { Q.i++; show(); } else finish(); });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  on(q$('up'), 'click', () => { sfx.tap(); ctx.hideHud(); Q.level = LV[(LV.indexOf(Q.level) + 1) % 3]; start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (b.dataset.level === Q.level) { sfx.tap(); ctx.toast('', `いまは「${LVN[Q.level]}」だよ`, 1.6); return; } sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
  F.onResize(layout);
  start();
  return {
    dispose() {},
    test: {
      state: () => ({ phase: Q.phase, i: Q.i, guess: Q.guess, actual: Q.cells && Q.cells.length }),
      auto() {
        if (!q$('result').hidden) return { done: true };
        if (Q.phase === 'done') return { click: 'data-k=next|' };
        if (Q.phase !== 'ask') return { wait: 300 };
        const want = Q.cells.length + (Q.i % 2 ? 3 : -2);
        if (Math.abs(Q.guess - want) > 1) return pathOf(F, [[L.xOf(Q.guess), L.ny - 10], [L.xOf((Q.guess + want) / 2), L.ny - 10], [L.xOf(want), L.ny - 10]]);
        return { click: 'data-k=guess|' };
      },
    },
  };
}
