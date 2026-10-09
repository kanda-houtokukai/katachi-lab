// 円周と円周率（E5）の「ためす」。opts.type：calc（円周・直径を もとめる。半円・車輪も）｜est（みとおし：円周の ながさを テープで 見当→ころがして たしかめる）
// 誤答の選択肢：radius（半径と直径の取りちがい）・inverse（かける・わるの取りちがい）・sense（2倍・4倍の量感）・half（直径の分を足し忘れ）。答え合わせは円を転がして確かめる。
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, dragOn, pathOf, tween, wait, E } from './_flat.js';
import { makeWheel, layDiam, RU } from './korogasu.js';
import { makeQuiz } from './_quiz2d.js';
import { circleQ, CIRC_TOL, circumference, cmTxt, num, r1, r2 } from './_ahead-gen.js';
import { pickR } from './_gen.js';
import { S, alive } from '../stage/stage.js';

export function mount(ctx) {
  const { opts, sfx } = ctx;
  const type = opts.type || 'calc';
  const F = ctx.openFlat();
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);
  const rFit = A => Math.max(16, Math.min((A.w - 40) / (2 * Math.PI + 1.6), A.h * 0.2, 80));
  let scene = null;
  const build = () => { F.clearLayers(); if (scene) scene.draw(area()); };
  F.onResize(build);
  let drag = null;
  dragOn(F.svg, F, {
    hit: p => (scene && scene.hit ? scene.hit(p) : null),
    start: p => { ctx.hideHud(); drag = scene.start ? scene.start(p) : {}; },
    move: p => { if (drag && scene.move) scene.move(p, drag); },
    end: p => { if (drag && scene.end) scene.end(p, drag); drag = null; },
  });
  const at = () => { const A = area(); return { x: A.x0 + A.w / 2, y: A.y0 + A.h * 0.35, r: Math.min(A.w, A.h) * 0.2 }; };

  // 円の絵（車輪）と、問題で示す長さの札
  function wheelScene(q, { show = 'd', half = false } = {}) {
    const sc = { q };
    sc.draw = A => {
      const r = rFit(A), x0 = A.x0 + 8 + r, base = A.y0 + Math.min(A.h * 0.62, r * 2 + 90);
      sc.L = { A, r, x0, base };
      const g = F.layer('w');
      sc.w = makeWheel(g, { x0, base, r });
      const cx = x0, cy = base - r, lg = F.layer('lab');
      if (half) { path(lg, `M${cx - r},${cy}A${r},${r} 0 0,1 ${cx + r},${cy}Z`, { fill: C('face-2'), 'fill-opacity': 0.55, stroke: C('ok'), 'stroke-width': 4 }); }
      if (show === 'd') txt(lg, cx, cy - 10, `${cmTxt(q.d)}`, { 'font-size': 17, class: 'ui', fill: C('sora'), 'font-weight': 900 });
      if (show === 'r') { line(lg, cx, cy, cx + r, cy, { stroke: C('ok'), 'stroke-width': 4 }); txt(lg, cx + r / 2, cy - 10, `${cmTxt(q.r)}`, { 'font-size': 17, class: 'ui', fill: C('ok'), 'font-weight': 900 }); }
      if (show === 'c') { rect(lg, x0, base - 3, 2 * Math.PI * r, 8, { rx: 3, fill: C('face-4') }); txt(lg, x0 + Math.PI * r, base + 30, `えんしゅう ${cmTxt(q.c)}`, { 'font-size': 17, class: 'ui', fill: C('face-4'), 'font-weight': 900 }); txt(lg, cx, cy - 10, '？', { 'font-size': 22, class: 'ui', fill: C('sora'), 'font-weight': 900 }); }
    };
    sc.roll = async (turns = 1) => { const w = sc.w; await tween(1.4, k => w.set(w.full() * k), E.io); };
    return sc;
  }

  const qCalc = (level, i) => {
    const q = circleQ(level, i);
    const show = q.kind === 'cr' ? 'r' : q.kind === 'd' ? 'c' : 'd';
    const sc = scene = wheelScene(q, { show, half: q.kind === 'half' }); build();
    const words = {
      times: [`${RU.en}は ${RU.choku}の なんばい くらい？`, '円周は直径の何倍くらい？'],
      c: [`${RU.choku} ${cmTxt(q.d)}の えんの ${RU.en}は？`, `直径${q.d}センチメートルの円の円周は？`],
      cr: [`${RU.han} ${cmTxt(q.r || 0)}の えんの ${RU.en}は？`, `半径${q.r}センチメートルの円の円周は？`],
      d: [`${RU.en}が ${cmTxt(q.c || 0)}の えん。${RU.choku}は？`, `円周が${q.c}センチメートルの円。直径は？`],
      half: [`${RU.choku} ${cmTxt(q.d)}の はんえん。まわりの ながさは？`, `直径${q.d}センチメートルの半円。まわりの長さは？`],
      wheel: [`${RU.choku} ${cmTxt(q.d)}の しゃりんが ${q.n > 1 ? q.n + 'かいてん' : 'ひとまわり'} すると、なんcm すすむ？`, `直径${q.d}センチメートルの車輪が${q.n > 1 ? q.n + '回転' : 'ひとまわり'}すると、何センチメートル進む？`],
    }[q.kind];
    return {
      say: words[0], sp: words[1], at: at(), choices: q.choices, answerText: q.answer, detail: { type: 'calc', kind: q.kind, d: q.d },
      hint(k) {
        if (k === 1) say(`${RU.en}は ${RU.choku}の やく 3.14ばい`, '円周は直径の約3.14倍');
        if (k === 2) say(q.kind === 'cr' ? `${RU.choku}は ${RU.han}の 2ばい（${q.d}cm）` : q.kind === 'd' ? `${RU.choku} ＝ ${RU.en} ÷ 3.14` : q.kind === 'half' ? `はんえんの まわりは ${RU.en}の はんぶんと ${RU.choku}` : `${RU.en} ＝ ${RU.choku} × 3.14`, 'しきを考えよう');
        if (k === 3 && q.expr) say(q.expr.replace(/＝ .*$/, '＝ ？'), q.expr.replace(/＝ .*$/, ''));
      },
      async verify() {
        const tag = S.token;
        if (q.kind === 'times') { await sc.roll(); if (!alive(tag)) return; await layDiam(F.layer('d'), { x0: sc.L.x0, y: sc.L.base + 22, r: sc.L.r, dur: 0.35 }); say(`${RU.choku}の 3つぶんと すこし（3.14ばい）`, '直径の3つ分と少し、3.14倍'); await wait(1); return; }
        await sc.roll(); if (!alive(tag)) return;
        say(q.expr ? q.expr.replace(/＝ (.*)$/, '＝ <b>$1</b>') : q.answer, q.expr || q.answer); await wait(1.2);
      },
    };
  };

  /* ---------- みとおし：テープで円周の見当 ---------- */
  const qEst = (level, i) => {
    const d = pickR(level === 'easy' ? [10, 20, 4] : level === 'normal' ? [6, 30, 14, 12] : [8, 25, 50, 18], Math.random), c = circumference(d), tol = CIRC_TOL[level];
    const sc = scene = { q: { d, c }, t: 0 };
    sc.draw = A => {
      const r = rFit(A), x0 = A.x0 + 8 + r, base = A.y0 + Math.max(r * 2 + 34, A.h * 0.5);
      sc.L = { A, r, x0, base, ty: base + 34 };
      if (!sc.t) sc.t = 2 * r;
      sc.w = makeWheel(F.layer('w'), { x0, base, r });
      txt(F.layer('lab'), x0, base - r - 10, `${cmTxt(d)}`, { 'font-size': 17, class: 'ui', fill: C('sora'), 'font-weight': 900 });
      const g = F.layer('tape'); clear(g);
      sc.tape = rect(g, x0, sc.L.ty, sc.t, 18, { rx: 4, fill: C('tape'), stroke: C('tape-line'), 'stroke-width': 1.5 });
      sc.knob = circle(g, x0 + sc.t, sc.L.ty + 9, 16, { fill: C('sora'), stroke: C('paper'), 'stroke-width': 3 });
    };
    const setT = t => { sc.t = clamp(t, 10, sc.L.A.x1 - sc.L.x0 - 20); sc.tape.setAttribute('width', Math.max(0, sc.t)); sc.knob.setAttribute('cx', sc.L.x0 + sc.t); };
    sc.hit = p => (Math.abs(p.y - (sc.L.ty + 9)) < 34 && p.x > sc.L.x0 - 10 ? true : null);
    sc.start = p => { setT(p.x - sc.L.x0); return {}; };
    sc.move = p => setT(p.x - sc.L.x0);
    sc.end = () => sfx.tap();
    build();
    const guess = () => r1(sc.t / (2 * sc.L.r) * d);
    return {
      set: true, setLabel: 'これくらい', say: `${RU.choku} ${cmTxt(d)}の えん。${RU.en}は どれくらい？ テープを のばそう`, sp: `直径${d}センチメートルの円。円周はどれくらい？テープを伸ばしてみよう`, at: at(), answerText: `やく ${cmTxt(c)}`, detail: { type: 'est', d },
      check: () => Math.abs(guess() - c) / c <= tol,
      mistakeNow: () => 'sense',
      solve: () => { const pts = [], t0 = sc.t, t1 = 2 * Math.PI * sc.L.r; for (let k = 0; k <= 10; k++) pts.push([sc.L.x0 + lerp(t0, t1, k / 10), sc.L.ty + 9]); return pathOf(F, pts); },
      hint(k) { if (k === 1) say(`${RU.choku}の 3ばいより すこし ながい`, '直径の3倍より少し長い'); if (k === 2) { layDiam(F.layer('h'), { x0: sc.L.x0, y: sc.L.ty + 26, r: sc.L.r, dur: 0.25, label: false }); say(`${RU.choku}の ながさを 3つ ならべたよ`, '直径の長さを3つ並べたよ'); } if (k === 3) say(`${d} × 3.14 で けいさんしても いいよ`, `${d}かける3.14で計算してもいいよ`); },
      async verify(ok) {
        const tag = S.token, g = guess();
        ctx.log('estimate', { correct: ok, level, detail: { q: `ちょっけい ${d}cmの えんしゅう`, guess: g, actual: c, unit: 'cm', qty: 'length' } });
        await tween(1.4, k => sc.w.set(sc.w.full() * k), E.io); if (!alive(tag)) return;
        say(`ころがすと ${cmTxt(c)}。みとおしは ${cmTxt(g)}`, `転がすと${c}センチメートル。見通しは${g}センチメートル`); await wait(1.2);
      },
    };
  };

  const gen = type === 'est' ? qEst : qCalc;
  const kind = opts.kind || (type === 'est' ? 'est' : 'calc');
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen: (lv, i) => { scene = null; return gen(lv, i); } });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
