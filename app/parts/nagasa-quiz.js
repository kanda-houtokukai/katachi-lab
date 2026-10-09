// ながさの「ためす」（N2・N2m・N3）。opts.type：
//  read（めもりを よむ・L1）｜cmp（どちらが ながい・L4。5問目は 10cmくらいの物）｜calc（cm・mm の けいさん・L4）
//  ｜choose（たんいえらび・choose）｜mconv（m と cm・L5）｜mcalc（m・cm の けいさん・L5）
//  ｜kconv（km と m・L5）｜tool（どうぐえらび・L6／まきじゃくの 0・L7）
// 誤答の選択肢には つまずきの型を必ず混ぜる（_nagasa-gen.js）。答え合わせは 0に合わせる・ならべる・まくなど 動きで確かめる。
// cm・mm の問題は実寸の ものさし（ppm）、m・km の問題は ちぢめた絵。
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, polar } from './_flat.js';
import { thing, ruler, overhang, badge, lens, nofitLayer, swatch, thingIcon } from './_nagasa.js';
import { makeQuiz } from './_quiz2d.js';
import { readQ, cmpQ, calcQ, mconvQ, mcalcQ, kconvQ, chooseQ, CHOOSE, TOOLS, TOOL_NAME, ZERO_Q, cmmm, mcm, kmm, rulerFit, rulerW, rnd, pickR, shuffleR } from './_nagasa-gen.js';
import { ppm as getPpm } from '../core/calibrate.js';
import { bench } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';

const sp = s => unitSpeech(String(s).replace(/<[^>]+>/g, '')).replace(/ /g, '');
const lenOf = id => (bench(id) || {}).len_mm || 100;
const COLS = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5', 'face-6'];

export function mount(ctx) {
  const { opts, sfx } = ctx;
  const type = opts.type || 'read';
  const F = ctx.openFlat();
  let P = getPpm(), redraw = () => {};
  const area = () => { const m = Math.max(18, F.W * 0.05), top = F.top + F.cap + 14, bot = F.bottom - 22; return { m, top, bot, W: F.W - m * 2, H: bot - top }; };
  const real = () => { P = getPpm(); const a = area(), cm = rulerFit(F.W, P, 16, 30, 4), w = rulerW(cm, P), h = clamp(12 * P, 40, 72); return Object.assign(a, { cm, w, h, rx: (F.W - w) / 2, ry: a.top + a.H * 0.6 - h / 2 }); };
  const drawWith = fn => { redraw = fn; fn(); };
  F.onResize(() => redraw());
  // ちぢめた絵の帯（長さ v を、seg ごとに色をかえて）
  function bar(g, x, y, v, s, h, seg, o = {}) {
    const n = Math.ceil(v / seg - 1e-9);
    for (let i = 0; i < n; i++) { const w = Math.min(seg, v - i * seg) * s; rect(g, x + i * seg * s, y - h, Math.max(0.5, w - (o.gap ?? 1.2)), h, { fill: C(o.color || (i % 2 ? 'face-4' : 'sora-soft')), opacity: o.op ?? 0.9 }); }
    rect(g, x, y - h, v * s, h, { fill: 'none', stroke: C('ink-soft'), 'stroke-width': 1.2 });
  }

  /* ---------- めもりを よむ（L1：はしが 0 でない） ---------- */
  function qRead(level) {
    let R0 = real(); const q = readQ(level, R0.cm), st = { off: q.off, lens: false };
    drawWith(() => {
      const R = real(); F.clearLayers(); const W = F.layer('world'); W.id = 'nqWorld'; const fx = F.layer('fx');
      const Ru = ruler(W, { x: R.rx, y: R.ry, cm: R.cm, ppm: P, h: R.h });
      thing(W, 'tape', Ru.xOf(st.off), R.ry - 2, q.L * P, { h: Math.min(16, 6 * P), color: C('face-1'), line: C('ink-soft') });
      if (st.lens) { const tx = Ru.xOf(st.off + q.L), r = clamp(22 * P, 60, 100); lens(nofitLayer(F), W, { fx: tx, fy: R.ry + 6, x: clamp(tx, r + 8, F.W - r - 8), y: Math.max(R.top + r, R.ry - r - 20), r, k: 2.6 }); }
      R0 = R; R0.Ru = Ru;
    });
    return {
      say: 'あかい テープの ながさは？', sp: '赤いテープの長さは？', choices: q.choices, detail: { type: 'read', L: q.L, off: q.off }, answerText: cmmm(q.L), answerSp: sp(cmmm(q.L)),
      at: { x: R0.Ru.xOf(st.off + q.L / 2), y: R0.ry - 20, r: Math.max(50, q.L * P * 0.35) },
      hint(k) {
        if (k === 1) ctx.caption(q.off ? 'テープの はしは <b>0</b>に ある？' : '1cmが いくつ ある？', 0);
        if (k === 2) { st.lens = true; redraw(); ctx.caption('はしの めもりを ちかくで みよう', 0); }
        if (k === 3) ctx.caption(q.off ? `はしは <b>${cmmm(q.off)}</b>の ところ。そこから かぞえよう` : 'mmの めもりも かぞえよう', 0);
      },
      async verify() {
        const tag = S.token;
        if (st.off) { ctx.caption('テープを <b>0</b>に あわせて みよう', 0, 'テープを0に合わせてみよう'); const a = st.off; await tween(0.9, k => { st.off = lerp(a, 0, E.io(k)); redraw(); }); if (!alive(tag)) return; st.off = 0; }
        st.lens = true; redraw(); ctx.caption(`<b>${cmmm(q.L)}</b>`, 0, sp(cmmm(q.L))); await wait(0.9);
      },
    };
  }
  /* ---------- どちらが ながい（L4） ---------- */
  function qCmp(level) {
    const q = cmpQ(level), redFirst = rnd(0, 1) === 1, red = redFirst ? q.a : q.b, blue = redFirst ? q.b : q.a, rT = redFirst ? q.aTxt : q.bTxt, bT = redFirst ? q.bTxt : q.aTxt;
    const st = { k: 0 }; let R0 = real();
    drawWith(() => {
      const R = real(); F.clearLayers(); const W = F.layer('world'); const fx = F.layer('fx');
      const Ru = ruler(W, { x: R.rx, y: R.ry, cm: R.cm, ppm: P, h: R.h }); Ru.g.setAttribute('opacity', 0.25 + 0.75 * st.k);
      const th = Math.min(16, 6 * P), y0 = R.top + 56, k = st.k;
      const t = [[red, 'face-1', rT, R.m + 10, y0], [blue, 'face-4', bT, F.W / 2 + 10, y0 + (F.W < 640 ? 60 : 0)]];
      if (F.W < 640) t[1][3] = R.m + 10;
      t.forEach(([mm, col, label, x, y], i) => {
        const X = lerp(x, Ru.zeroX, k), Y = lerp(y, R.ry - 2 - i * (th + 6), k);
        thing(W, 'tape', X, Y, mm * P, { h: th, color: C(col), line: C('ink-soft') });
        if (k < 0.5) txt(W, X + mm * P / 2, Y - th - 8, label, { 'font-size': 22, fill: C(col) });
      });
      if (st.k >= 1) { const lo = Math.min(red, blue), hi = Math.max(red, blue); overhang(fx, Ru.xOf(lo), Ru.xOf(hi), R.ry - 2 - (red > blue ? 0 : th + 6) - th, th); }
      R0 = R; R0.Ru = Ru;
    });
    const redBig = parseInt(rT, 10) > parseInt(bT, 10);
    return {
      say: 'ながいのは どっち？', sp: '長いのはどっち？',
      choices: [{ html: `${swatch('face-1')}${rT}`, ok: red > blue, mistake: redBig ? 'L4' : 'other' }, { html: `${swatch('face-4')}${bT}`, ok: blue > red, mistake: !redBig ? 'L4' : 'other' }],
      detail: { type: 'cmp', red, blue }, answerText: red > blue ? rT : bT, at: { x: F.W / 2, y: R0.ry - 40, r: 70 },
      hint(k) { if (k === 1) ctx.caption('かずだけで くらべて いいかな？', 0, '数だけで比べていいかな？'); if (k === 2) ctx.caption('<b>1cm＝10mm</b>。たんいを そろえよう', 0, '1センチメートルは10ミリメートル'); if (k === 3) ctx.caption(`${rT} は ${red}mm、${bT} は ${blue}mm`, 0); },
      async verify() { const tag = S.token; await tween(1, k => { st.k = E.io(k); redraw(); }); if (!alive(tag)) return; st.k = 1; redraw(); ctx.caption(`<b>${cmmm(Math.max(red, blue))}</b>の ほうが ながい`, 0, sp(`${cmmm(Math.max(red, blue))}のほうが長い`)); await wait(0.8); },
    };
  }
  /* ---------- 10cmくらいの ものは どれ？（量感） ---------- */
  function qTen() {
    const right = 'hagaki-w', wrong = shuffleR(['clip', 'pencil', 'notebook', 'eraser']).slice(0, 2), all = shuffleR([right, ...wrong]);
    const st = { show: false }; let R0 = real();
    drawWith(() => {
      const R = real(); F.clearLayers(); const W = F.layer('world');
      const Ru = ruler(W, { x: R.rx, y: R.ry, cm: R.cm, ppm: P, h: R.h });
      const ten = Ru.xOf(Math.min(100, R.cm * 10)); rect(W, Ru.zeroX, R.ry - 10, ten - Ru.zeroX, 8, { fill: C('yamabuki') }); txt(W, (Ru.zeroX + ten) / 2, R.ry - 16, '10cm', { 'font-size': 16, fill: C('hint'), class: 'ui' });
      if (st.show) all.forEach((id, i) => { const mm = lenOf(id), k = mm * P > F.W - 30 ? (F.W - 30) / mm : P; thing(W, id === 'hagaki-w' ? 'hagaki' : id, Ru.zeroX, R.top + 30 + i * ((R.ry - R.top - 40) / 3), mm * k, { h: Math.min(18, (R.ry - R.top) / 6) }); });
      R0 = R;
    });
    const nm = id => (bench(id) || {}).name.replace(/（.*）/, '');
    return {
      say: '10cmくらいの ものは どれ？', sp: '10センチメートルくらいのものはどれ？',
      choices: all.map(id => ({ html: `<span style="display:inline-block;vertical-align:-6px">${thingIcon(id === 'hagaki-w' ? 'hagaki' : id, 40, 22)}</span>${nm(id)}`, ok: id === right, mistake: 'est' })),
      detail: { type: 'ten' }, answerText: nm(right), at: { x: F.W / 2, y: R0.ry - 60, r: 60 },
      hint(k) { if (k === 1) ctx.caption('きいろの ところが 10cm', 0, '黄色のところが10センチメートル'); if (k >= 2) ctx.caption('ゆび 1ぽんの はばは やく 1cm。10ぽんぶん くらい', 0); },
      async verify() { st.show = true; redraw(); ctx.caption(`${nm(right)}は やく 10cm`, 0, sp(`${nm(right)}は約10cm`)); await wait(1.2); },
    };
  }
  /* ---------- cm・mm の けいさん（L4） ---------- */
  function qCalc(level) {
    const q = calcQ(level), st = { k: 0 }; let R0 = real();
    drawWith(() => {
      const R = real(); F.clearLayers(); const W = F.layer('world'); const fx = F.layer('fx');
      const big = Math.max(q.a, q.op === '+' ? q.a + q.b : q.a);
      const k = big * P > R.w - 8 * P ? (R.w - 8 * P) / big : P;
      const Ru = ruler(W, { x: R.rx, y: R.ry, cm: R.cm, ppm: k, h: R.h });
      const th = Math.min(16, 6 * k), y1 = R.ry - 2;
      thing(W, 'tape', Ru.zeroX, y1, q.a * k, { h: th, color: C('face-1'), line: C('ink-soft') });
      txt(W, Ru.zeroX + q.a * k / 2, R.top + 30, q.aTxt, { 'font-size': 20, fill: C('face-1') });
      if (q.op === '+') { const x = lerp(Ru.zeroX + 20, Ru.zeroX + q.a * k, st.k), y = lerp(R.top + 70, y1, st.k); thing(W, 'tape', x, y, q.b * k, { h: th, color: C('face-4'), line: C('ink-soft') }); txt(W, x + q.b * k / 2, y - th - 8, q.bTxt, { 'font-size': 18, fill: C('face-4') }); }
      else { const x = Ru.zeroX + (q.a - q.b) * k; rect(W, x, y1 - th - lerp(30, 0, st.k), q.b * k, th, { fill: C('paper'), stroke: C('face-4'), 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0.9 }); txt(W, x + q.b * k / 2, y1 - th - 38, `${q.bTxt} きる`, { 'font-size': 18, fill: C('face-4') }); }
      if (st.k >= 1) { const ans = q.ans; line(W, Ru.xOf(0), y1 + 6, Ru.xOf(0) + ans * k, y1 + 6, { stroke: C('ok'), 'stroke-width': 4 }); }
      R0 = R;
    });
    const sayTxt = `${q.aTxt} ${q.op === '+' ? '＋' : '−'} ${q.bTxt} は？`;
    return {
      say: sayTxt, sp: sp(`${q.aTxt}${q.op === '+' ? 'たす' : 'ひく'}${q.bTxt}は？`), choices: q.choices, detail: { type: 'calc', a: q.a, b: q.b, op: q.op }, answerText: cmmm(q.ans), answerSp: sp(cmmm(q.ans)),
      at: { x: F.W / 2, y: R0.ry - 50, r: 60 },
      hint(k) { if (k === 1) ctx.caption('<b>cm</b>は cmどうし、<b>mm</b>は mmどうしで', 0, 'センチメートルはセンチメートルどうし、ミリメートルはミリメートルどうしで'); if (k === 2) ctx.caption('10mmで 1cmに なるよ', 0, '10ミリメートルで1センチメートルになるよ'); if (k === 3) ctx.caption(`${q.a}mm ${q.op === '+' ? '＋' : '−'} ${q.b}mm と かんがえても いい`, 0); },
      async verify() { const tag = S.token; await tween(1, k => { st.k = E.io(k); redraw(); }); if (!alive(tag)) return; st.k = 1; redraw(); ctx.caption(`<b>${cmmm(q.ans)}</b>`, 0, sp(cmmm(q.ans))); await wait(0.8); },
    };
  }
  /* ---------- たんいえらび（choose） ---------- */
  const chooseOrder = shuffleR(CHOOSE.map((_, i) => i));
  function qChoose(level, i) {
    const q = chooseQ(chooseOrder[i % CHOOSE.length], lenOf), st = { n: 0 };
    const unitMm = q.it.unit === 'm' ? 1000 : 10;
    drawWith(() => {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      const s = Math.min(a.W / (q.mm * 1.05), 4), x = a.m + (a.W - q.mm * s) / 2, y = a.top + a.H * 0.5, h = Math.min(a.H * 0.25, Math.max(14, q.mm * s * 0.2));
      if (['pencil', 'clip', 'notebook', 'desk', 'ruler1m'].includes(q.it.id)) thing(g, q.it.id, x, y, q.mm * s, { h: Math.min(h, Math.max(10, q.mm * s * ({ pencil: 0.06, clip: 0.3, notebook: 0.7, desk: 0.5, ruler1m: 0.08 }[q.it.id]))) });
      else rect(g, x, y - h, q.mm * s, h, { rx: 4, fill: C(q.it.id === 'pool' ? 'water' : 'wood-pale'), stroke: C('wood-deep'), 'stroke-width': 2 });
      txt(g, x + q.mm * s / 2, y - h - 12, q.it.q.replace(/の ながさ$|の たかさ$|の ながさ/, ''), { 'font-size': 17, fill: C('ink-soft'), class: 'ui' });
      for (let k = 0; k < st.n; k++) { rect(g, x + k * unitMm * s, y + 8, Math.max(1, unitMm * s - 2), 14, { rx: 4, fill: C(k % 2 ? 'face-4' : 'sora-soft') }); }
      if (st.n) badge(fx, x + Math.min(st.n, q.v) * unitMm * s - unitMm * s / 2, y + 40, String(st.n), { r: 12 });
    });
    return {
      say: `${q.it.q}は やく ${q.v} □。□に はいる たんいは？`, sp: `${q.it.q.replace(/ /g, '')}は約${q.v}。入る単位は？`, choices: q.choices, detail: { type: 'choose', obj: q.it.id, unit: q.it.unit }, answerText: `${q.v}${q.it.unit}`,
      at: { x: F.W / 2, y: area().top + area().H * 0.4, r: 70 },
      hint(k) { if (k === 1) ctx.caption('1cmは ゆび 1ぽんの はばくらい、1mは りょうてを ひろげた くらい', 0); if (k === 2) ctx.caption(`${q.v}cm、${q.v}m、${q.v}mm。どれが ちかい？`, 0); if (k === 3) ctx.caption(q.it.unit === 'm' ? '1mものさしで はかるような ながさ' : 'ものさしで はかれる ながさ', 0); },
      async verify() { const tag = S.token; for (let k = 1; k <= q.v; k++) { st.n = k; redraw(); sfx.tick(k); if (!(await wait(Math.max(0.08, 0.6 / q.v))) || !alive(tag)) return; } ctx.caption(`1${q.it.unit}が ${q.v}こ。<b>${q.v}${q.it.unit}</b>`, 0, sp(`1${q.it.unit}が${q.v}個。${q.v}${q.it.unit}`)); await wait(0.8); },
    };
  }
  /* ---------- m と cm（L5）・m・cm の けいさん ---------- */
  function mBars(cm1, cm2, op, stRef) {
    drawWith(() => {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      const tot = op === '+' ? cm1 + cm2 : cm1, s = a.W * 0.9 / Math.max(tot, 100), x = a.m + a.W * 0.05, y = a.top + a.H * 0.45, h = Math.min(30, a.H * 0.12);
      const k = stRef.k;
      // 1m ごとの区切り
      for (let m = 100; m <= tot; m += 100) { line(g, x + m * s, y - h - 14, x + m * s, y + 10, { stroke: C('ok'), 'stroke-width': 2, opacity: k }); txt(g, x + m * s - 50 * s, y + 30, `${m / 100}m`, { 'font-size': 16, fill: C('ok'), class: 'ui', opacity: k }); }
      bar(g, x, y, cm1, s, h, 10, { color: 'face-1' });
      if (op === '+' && cm2) { const bx = lerp(x + 10, x + cm1 * s, k), by = lerp(y + h + 40, y, k); bar(g, bx, by, cm2, s, h, 10, { color: 'face-4' }); }
      if (op === '-' && cm2) rect(g, x + (cm1 - cm2) * s, y - h - lerp(24, 0, k), cm2 * s, h, { fill: C('paper'), stroke: C('face-4'), 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0.9 });
    });
  }
  function qMconv(level) {
    const q = mconvQ(level), st = { k: 0 }; mBars(q.total, 0, '+', st);
    return {
      say: q.say, sp: q.sp, choices: q.choices, detail: { type: 'mconv', total: q.total }, answerText: q.answer, answerSp: sp(q.answer), at: { x: F.W / 2, y: area().top + area().H * 0.35, r: 60 },
      hint(k) { if (k === 1) ctx.caption('<b>1m＝100cm</b>', 0, '1メートルは100センチメートル'); if (k === 2) { st.k = 0.6; mBars(q.total, 0, '+', st); ctx.caption('1mの くぎりを みてね', 0); } if (k === 3) ctx.caption(q.toCm ? `${Math.floor(q.total / 100)}mは ${Math.floor(q.total / 100) * 100}cm` : `${q.total}cmの なかに 100cmが いくつ？`, 0); },
      async verify() { const tag = S.token; await tween(0.8, k => { st.k = k; mBars(q.total, 0, '+', st); }); if (!alive(tag)) return; ctx.caption(`<b>${q.toCm ? q.answer : q.answer}</b>`, 0, sp(q.answer)); await wait(0.8); },
    };
  }
  function qMcalc(level) {
    const q = mcalcQ(level), st = { k: 0 }; mBars(q.a, q.b, q.op, st);
    return {
      say: `${q.aTxt} ${q.op === '+' ? '＋' : '−'} ${q.bTxt} は？`, sp: sp(`${q.aTxt}${q.op === '+' ? 'たす' : 'ひく'}${q.bTxt}は？`), choices: q.choices, detail: { type: 'mcalc', a: q.a, b: q.b, op: q.op }, answerText: q.answer, answerSp: sp(q.answer),
      at: { x: F.W / 2, y: area().top + area().H * 0.35, r: 60 },
      hint(k) { if (k === 1) ctx.caption('m は mどうし、cm は cmどうし', 0); if (k === 2) ctx.caption('<b>100cmに なったら 1m</b>', 0, '100センチメートルになったら1メートル'); if (k === 3) ctx.caption(`ぜんぶ cmに すると ${q.a}cm ${q.op === '+' ? '＋' : '−'} ${q.b}cm`, 0); },
      async verify() { const tag = S.token; await tween(1, k => { st.k = E.io(k); mBars(q.a, q.b, q.op, st); }); if (!alive(tag)) return; ctx.caption(`<b>${q.answer}</b>`, 0, sp(q.answer)); await wait(0.8); },
    };
  }
  /* ---------- km と m（L5） ---------- */
  function kBars(total, sub, stRef) {
    drawWith(() => {
      const a = area(); F.clearLayers(); const g = F.layer('scene');
      const s = a.W * 0.9 / Math.max(total, 1000), x = a.m + a.W * 0.05, y = a.top + a.H * 0.48, h = Math.min(28, a.H * 0.1), k = stRef.k;
      bar(g, x, y, total, s, h, 100, { color: 'face-3' });
      for (let m = 1000; m <= total; m += 1000) { line(g, x + m * s, y - h - 14, x + m * s, y + 10, { stroke: C('ok'), 'stroke-width': 3, opacity: k }); txt(g, x + m * s - 500 * s, y + 30, `${m / 1000}km`, { 'font-size': 16, fill: C('ok'), class: 'ui', opacity: k }); }
      txt(g, x + 50 * s, y - h - 8, '100m', { 'font-size': 12, fill: C('ink-soft'), class: 'ui' });
      if (sub) rect(g, x + (total - sub) * s, y - h - lerp(24, 0, k), sub * s, h, { fill: C('paper'), stroke: C('face-4'), 'stroke-width': 2, 'stroke-dasharray': '5 4' });
    });
  }
  function qKconv(level) {
    const q = kconvQ(level), st = { k: 0 }; kBars(q.total, q.b || 0, st);
    return {
      say: q.say, sp: q.sp, choices: q.choices, detail: { type: 'kconv', kind: q.kind, total: q.total }, answerText: q.answer, answerSp: sp(q.answer), at: { x: F.W / 2, y: area().top + area().H * 0.35, r: 60 },
      hint(k) { if (k === 1) ctx.caption('<b>1km＝1000m</b>', 0, '1キロメートルは1000メートル'); if (k === 2) { st.k = 0.6; kBars(q.total, q.b || 0, st); ctx.caption('1kmは 100mの 10こぶん', 0, '1キロメートルは100メートルの10個分'); } if (k === 3) ctx.caption(q.kind === 'sub' ? `${q.total}m − ${q.b}m と かんがえよう` : `1kmの くぎりを かぞえよう`, 0); },
      async verify() { const tag = S.token; await tween(0.9, k => { st.k = k; kBars(q.total, q.b || 0, st); }); if (!alive(tag)) return; ctx.caption(`<b>${q.answer}</b>`, 0, sp(q.answer)); await wait(0.8); },
    };
  }
  /* ---------- どうぐえらび（L6）・まきじゃくの 0（L7） ---------- */
  const toolOrder = shuffleR(TOOLS.map((_, i) => i));
  function sceneTool(it, stRef) {
    drawWith(() => {
      const a = area(); F.clearLayers(); const g = F.layer('scene');
      const cx = F.W / 2, cy = a.top + a.H * 0.5, R = Math.min(a.W, a.H) * 0.28, k = stRef.k;
      if (['tree', 'ball', 'head'].includes(it.scene)) {
        circle(g, cx, cy, R, { fill: C(it.scene === 'tree' ? 'wood' : it.scene === 'ball' ? 'face-1' : 'face-2'), stroke: C('ink'), 'stroke-width': 2 });
        if (it.scene === 'tree') for (let r = 1; r < 4; r++) circle(g, cx, cy, R * r / 4, { fill: 'none', stroke: C('wood-deep'), opacity: 0.5 });
        if (k > 0) { const ang = 359.9 * k, [x1, y1] = polar(cx, cy, R + 7, 0), [x2, y2] = polar(cx, cy, R + 7, ang); path(g, `M${x1},${y1}A${R + 7},${R + 7} 0 ${ang > 180 ? 1 : 0},1 ${x2},${y2}`, { fill: 'none', stroke: C('yamabuki'), 'stroke-width': 12 }); }
      } else {
        const L = a.W * (it.scene === 'note' ? 0.4 : 0.85), x = cx - L / 2, h = it.scene === 'pool' ? a.H * 0.3 : it.scene === 'door' ? a.H * 0.4 : a.H * 0.25;
        rect(g, x, cy - h / 2, L, h, { rx: 6, fill: C(it.scene === 'pool' ? 'water' : it.scene === 'door' ? 'wood-pale' : 'face-3'), stroke: C('ink-soft'), 'stroke-width': 2 });
        if (k > 0) { const tl = it.a === 'maki' ? L : it.a === 'ruler1m' ? L : L; thing(g, it.a === 'maki' ? 'tape' : it.a, x, cy + h / 2 + 18, tl * k, { h: 14, color: it.a === 'maki' ? C('yamabuki') : undefined }); }
      }
    });
  }
  function qTool(level, i) {
    if (i === 2 || (level === 'challenge' && i === 4)) {
      // まきじゃくの 0（L7）
      drawWith(() => {
        const a = area(); F.clearLayers(); const g = F.layer('scene'), y = a.top + a.H * 0.5, th = Math.min(70, a.H * 0.26), x0 = a.m + a.W * 0.25, s = Math.min(a.W / 8, 60);
        rect(g, x0, y - th / 2, a.W * 0.7, th, { fill: C('yamabuki'), stroke: C('hint'), 'stroke-width': 2 });
        for (let mmv = 0; mmv * s / 10 < a.W * 0.7; mmv++) { const X = x0 + mmv * s / 10, big = mmv % 10 === 0; line(g, X, y - th / 2, X, y - th / 2 + (big ? th * 0.55 : th * 0.25), { stroke: C('ink'), 'stroke-width': big ? 2 : 1 }); if (big && mmv) txt(g, X + 4, y + th / 2 - 8, String(mmv / 10), { 'font-size': 20, fill: C('ok'), class: 'ui', 'text-anchor': 'start' }); }
        rect(g, x0 - th * 0.3, y - th / 2 - 12, th * 0.3, th + 24, { fill: C('metal-deep'), stroke: C('metal-dark'), 'stroke-width': 2 });
        circle(g, x0 + th * 0.35, y - th / 2 - 2, 6, { fill: C('paper'), stroke: C('metal-dark'), 'stroke-width': 2 });
      });
      return {
        say: 'まきじゃくの <b>0</b>は どこ？', sp: '巻き尺の0はどこ？', choices: shuffleR(ZERO_Q.map(z => Object.assign({}, z))), detail: { type: 'zero' }, answerText: 'かなぐの はし',
        at: { x: area().m + area().W * 0.25, y: area().top + area().H * 0.5, r: 50 },
        hint(k) { if (k === 1) ctx.caption('かなぐも ながさに はいるよ', 0); if (k >= 2) ctx.caption('かなぐの <b>そとがわの はし</b>を みてね', 0); },
        async verify() { const a = area(), x = a.m + a.W * 0.25 - Math.min(70, a.H * 0.26) * 0.3; const g = F.layer('fx'); line(g, x, a.top + a.H * 0.2, x, a.top + a.H * 0.8, { stroke: C('ok'), 'stroke-width': 4, 'stroke-dasharray': '6 4' }); ctx.caption('まきじゃくの 0は <b>かなぐの はし</b>', 0, '巻き尺の0は金具の端'); await wait(1); },
      };
    }
    const it = TOOLS[toolOrder[i % TOOLS.length]], st = { k: 0 }; sceneTool(it, st);
    const ids = shuffleR(['maki', 'ruler30', 'ruler1m']);
    const icon = id => `<span style="display:inline-block;vertical-align:-6px">${thingIcon(id === 'maki' ? 'tape' : id, 40, 22, id === 'maki' ? { color: 'var(--yamabuki)' } : {})}</span>`;
    return {
      say: `${it.q}には どの どうぐ？`, sp: `${it.sp}には、どの道具？`,
      choices: ids.map(id => ({ html: `${icon(id)}${TOOL_NAME[id]}`, ok: id === it.a || (it.alt || []).includes(id), mistake: it.w[id] || 'choose' })),
      detail: { type: 'tool', scene: it.scene }, answerText: TOOL_NAME[it.a], at: { x: F.W / 2, y: area().top + area().H * 0.5, r: 70 },
      hint(k) { if (k === 1) ctx.caption(['tree', 'ball', 'head'].includes(it.scene) ? '<b>まがって いる</b> ところを はかるね' : 'どれくらいの ながさかな？', 0); if (k === 2) ctx.caption('まきじゃくは まげられる。ものさしは まっすぐ', 0); if (k === 3) ctx.caption(it.scene === 'note' ? '30cmより みじかい' : it.scene === 'pool' ? '25mも ある！' : 'まわりに まきつけられる', 0); },
      async verify() { const tag = S.token; await tween(1.2, k => { st.k = E.io(k); sceneTool(it, st); }); if (!alive(tag)) return; ctx.caption(`<b>${TOOL_NAME[it.a]}</b>で はかる`, 0, `${TOOL_NAME[it.a]}ではかる`); await wait(0.8); },
    };
  }

  const gens = {
    read: qRead, cmp: (lv, i) => (i === 4 ? qTen() : qCmp(lv)), calc: qCalc, choose: qChoose, mconv: qMconv, mcalc: qMcalc, kconv: qKconv, tool: qTool,
  };
  const KIND = { read: 'read', cmp: 'compare', calc: 'calc', choose: 'choose', mconv: 'convert', mcalc: 'calc', kconv: 'convert', tool: 'tool' };
  const quiz = makeQuiz(ctx, F, { kind: opts.kind || KIND[type], n: opts.n || 5, gen: (lv, i) => (gens[type] || qRead)(lv, i) });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
