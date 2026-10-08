// みとおし（全単元の「ためす」）：見当を数直線に置いてから、実際にはかる動きを見せ、ずれを記録する。
// opts.items：[{ q（画面の文）, sp, qty: length|volume|mass|time|area, unit, actual | bench+field(+div) | range:[a,b], max, step }]
// 記録：<単元>.estimate（detail: { q, guess, actual, unit, qty }）。難しさで「ちかい」の幅が変わる（やさしい 40%・ふつう 25%・チャレンジ 15%）。
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, dragOn, pathOf, tween, wait, E, rnd } from './_flat.js';
import { hanamaru } from './_flat.js';
import { bench, yaku } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive, motion } from '../stage/stage.js';
import { $p, $$p, on, hintDots, levelSeg, starsHTML } from './_common.js';
import { shuffle } from '../core/text.js';

const TOL = { easy: 0.4, normal: 0.25, challenge: 0.15 };
const LVN = { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' }, LV = ['easy', 'normal', 'challenge'];
export function valueOf(it, level = 'normal', rand = Math.random) {
  if (it.actual != null) return it.actual;
  if (it.bench) { const b = bench(it.bench); if (b && b[it.field] != null) return Math.round(b[it.field] / (it.div || 1) * 100) / 100; }
  if (it.range) { const [a, b] = it.range; const k = { easy: 0.5, normal: 0.75, challenge: 1 }[level]; return rnd(a, Math.round(a + (b - a) * k), rand); }
  return 0;
}

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  const Q = { level: ctx.level(), i: 0, list: [], res: [], phase: 'ask', guess: 0, cur: null };
  const n = opts.n || 5;
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="ctl"><button class="btn sub small" type="button" data-k="minus" aria-label="すこし へらす">−</button><button class="btn big" type="button" data-k="guess">これくらい</button><button class="btn sub small" type="button" data-k="plus" aria-label="すこし ふやす">＋</button><button class="btn sub small" type="button" data-k="replay" hidden>もういちど みる</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎ</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><div class="row"><button class="btn sub" type="button" data-k="again">もういちど</button><button class="btn" type="button" data-k="up"></button></div></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const L = {};
  // 数直線と、上の「もの」の場所
  function layout() {
    F.clearLayers();
    const H = F.bottom - F.top, W = F.W;
    L.nx0 = Math.max(40, W * 0.08); L.nx1 = W - Math.max(70, W * 0.1); L.ny = F.top + H * 0.78;
    L.obj = { x: L.nx0, y: F.top + F.cap, w: L.nx1 - L.nx0, h: H * 0.62 - F.cap };
    L.g = F.layer('nl'); L.og = F.layer('obj');
    if (Q.cur) { drawLine(); drawObj(); }
  }
  const xOf = v => L.nx0 + (L.nx1 - L.nx0) * clamp(v / Q.cur.max, 0, 1);
  const vOf = x => { const st = Q.cur.step; return clamp(Math.round(((x - L.nx0) / (L.nx1 - L.nx0) * Q.cur.max) / st) * st, 0, Q.cur.max); };
  function drawLine() {
    const g = L.g; clear(g); const q = Q.cur;
    line(g, L.nx0, L.ny, L.nx1, L.ny, { 'stroke-width': 4 });
    const major = q.major || q.max / 5;
    for (let v = 0; v <= q.max + 1e-9; v += q.minor || major / 5) {
      const big = Math.abs(v / major - Math.round(v / major)) < 1e-6, x = xOf(v);
      line(g, x, L.ny - (big ? 12 : 6), x, L.ny + (big ? 12 : 6), { 'stroke-width': big ? 2.5 : 1.2 });
      if (big) txt(g, x, L.ny + 34, String(Math.round(v * 100) / 100), { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
    }
    txt(g, L.nx1 + 4, L.ny + 34, q.unit, { 'font-size': 15, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'start' });
    L.act = el('g', {}, g);
    L.mark = el('g', { class: 'grab' }, g);
    path(L.mark, 'M-14,-34L14,-34L0,-12Z', { fill: C('sora') }); line(L.mark, 0, -12, 0, 14, { stroke: C('sora'), 'stroke-width': 4 });
    L.mtxt = txt(L.mark, 0, -42, '', { 'font-size': 20, fill: C('sora'), class: 'ui' });
    setGuess(Q.guess);
  }
  function setGuess(v) { Q.guess = v; if (!L.mark) return; L.mark.setAttribute('transform', `translate(${xOf(v)},${L.ny})`); L.mtxt.textContent = `${v}${Q.cur.unit}`; }
  // 「もの」の絵（量ごと）
  function drawObj(k = 0) {
    const g = L.og; clear(g); const q = Q.cur, o = L.obj, cx = o.x + o.w / 2;
    txt(g, cx, o.y + 24, q.name || '', { 'font-size': 20 });
    if (q.qty === 'length') { const w = Math.min(o.w * 0.9, o.w * clamp(q.actual / q.max, 0.15, 1)); rect(g, cx - w / 2, o.y + o.h * 0.45, w, 26, { rx: 8, fill: C('face-1'), stroke: C('ink'), 'stroke-width': 2 }); if (k > 0) rect(g, cx - w / 2, o.y + o.h * 0.45 + 32, w * k, 14, { fill: C('tape'), stroke: C('tape-line') }); }
    else if (q.qty === 'volume') { const bw = Math.min(140, o.w * 0.3), bh = o.h * 0.62, x = cx - bw / 2, y = o.y + o.h * 0.3; rect(g, x, y + bh * (1 - k), bw, bh * k, { fill: C('water') }); path(g, `M${x} ${y}V${y + bh}H${x + bw}V${y}`, { fill: 'none', stroke: C('water-deep'), 'stroke-width': 4 }); }
    else if (q.qty === 'mass') { const r = Math.min(o.h * 0.32, 80), y = o.y + o.h * 0.6; circle(g, cx, y, r, { fill: C('paper'), stroke: C('hint'), 'stroke-width': 3 }); const a = k * Math.min(1, q.actual / q.max) * 330 - 165, ra = a * Math.PI / 180; line(g, cx, y, cx + r * 0.85 * Math.sin(ra), y - r * 0.85 * Math.cos(ra), { stroke: C('ok'), 'stroke-width': 4 }); }
    else if (q.qty === 'area') { const s = Math.min(o.h * 0.6, o.w * 0.3), x = cx - s / 2, y = o.y + o.h * 0.32; path(g, `M${x} ${y + s * 0.2}Q${x + s * 0.5} ${y - s * 0.1} ${x + s} ${y + s * 0.15}L${x + s * 0.9} ${y + s}Q${x + s * 0.4} ${y + s * 1.1} ${x} ${y + s * 0.85}Z`, { fill: C('cell-a'), opacity: 0.6 }); if (k > 0) { const c = Math.max(3, Math.round(Math.sqrt(q.actual))); for (let i = 0; i <= c; i++) { line(g, x + s * i / c, y, x + s * i / c, y + s, { stroke: C('ink'), 'stroke-width': 1, opacity: k }); line(g, x, y + s * i / c, x + s, y + s * i / c, { stroke: C('ink'), 'stroke-width': 1, opacity: k }); } } }
    else if (q.qty === 'time') { const y = o.y + o.h * 0.62; line(g, o.x, y + 18, o.x + o.w, y + 18, { stroke: C('ink-soft'), 'stroke-width': 3 }); L.ball = circle(g, o.x + 20 + (o.w - 40) * k, y, 18, { fill: C('face-4'), stroke: C('ink'), 'stroke-width': 2 }); }
  }
  async function playTime() {
    const tag = S.token, q = Q.cur; Q.phase = 'play'; q$('ctl').hidden = true; ctx.caption('みていてね…', 0, '見ていてね');
    const t0 = performance.now(), dur = q.actual * 1000 * motion.speed;
    await new Promise(res => { const f = () => { if (!alive(tag)) return res(); const k = Math.min(1, (performance.now() - t0) / dur); drawObj(k); if (k < 1) requestAnimationFrame(f); else res(); }; f(); });
    if (!alive(tag)) return;
    Q.phase = 'ask'; q$('ctl').hidden = false; q$('replay').hidden = false; ctx.caption(q.say, 0, q.sp);
  }
  dragOn(F.svg, F, {
    hit: p => (Q.phase === 'ask' && L.mark && Math.abs(p.y - L.ny) < 60 && p.x > L.nx0 - 30 && p.x < L.nx1 + 30 ? true : null),
    move: p => { setGuess(vOf(p.x)); }, start: p => { setGuess(vOf(p.x)); }, end: p => { setGuess(vOf(p.x)); sfx.tap(); },
  });
  function start() {
    Q.i = 0; Q.res = []; Q.list = [];
    const items = opts.items || [];
    const order = shuffle(items.slice());
    for (let k = 0; k < n; k++) Q.list.push(order[k % order.length]);
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level)));
    show();
  }
  function show() {
    const it = Q.list[Q.i], actual = valueOf(it, Q.level), b = it.bench ? bench(it.bench) : null;
    Q.cur = Object.assign({ unit: '', step: 1 }, it, { actual, name: it.name || (b ? b.name : ''), say: it.q, sp: it.sp || unitSpeech(String(it.q).replace(/<[^>]+>/g, '')) });
    if (!Q.cur.max) Q.cur.max = Math.max(5, Math.ceil(actual * 2 / Q.cur.step) * Q.cur.step);
    Q.phase = 'ask'; Q.guess = 0;
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('ctl').hidden = false; q$('dotsRow').hidden = false;
    q$('levelRow').hidden = Q.i !== 0; q$('replay').hidden = true;
    q$('dots').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${Q.res[k] || (k === Q.i ? 'now' : '')}"></i>`).join('');
    q$('qTxt').innerHTML = Q.cur.say;
    layout();
    if (Q.cur.qty === 'time') playTime(); else ctx.caption(Q.cur.say, 0, Q.cur.sp);
  }
  async function guess() {
    if (Q.phase !== 'ask') return;
    if (Q.guess <= 0) { sfx.off(); ctx.toast('', 'すうちょくせんの ▼を うごかして、けんとうを きめてね', 2.4); return; }
    Q.phase = 'busy'; sfx.pop(); q$('ctl').hidden = true;
    const tag = S.token, q = Q.cur, g = L.act;
    // じっさいの りょうが のびてくる
    const bar = rect(g, L.nx0, L.ny - 8, 0, 16, { rx: 8, fill: C('ok'), opacity: 0.75 });
    await tween(1.6, k => { bar.setAttribute('width', Math.max(0, (xOf(q.actual) - L.nx0) * k)); drawObj(q.qty === 'time' ? 1 : k); }, E.io);
    if (!alive(tag)) return;
    const am = el('g', { transform: `translate(${xOf(q.actual)},${L.ny})` }, g);
    path(am, 'M-12,28L12,28L0,10Z', { fill: C('ok') }); txt(am, 0, 52, `${q.actual}${q.unit}`, { 'font-size': 18, fill: C('ok'), class: 'ui' });
    const err = Math.abs(Q.guess - q.actual) / q.actual, close = err <= TOL[Q.level];
    Q.res[Q.i] = close ? 'ok' : 'ng';
    ctx.log('estimate', { correct: close, level: Q.level, detail: { q: String(q.say).replace(/<[^>]+>/g, ''), guess: Q.guess, actual: q.actual, unit: q.unit, qty: q.qty } });
    const yk = q.bench ? yaku(bench(q.bench)) : '';
    const msg = `${yk}${q.actual}${q.unit}。みとおしは ${Q.guess}${q.unit}`;
    if (close) { sfx.good(); hanamaru(F.svg, xOf(q.actual), L.ny - 40, 40); ctx.toast(ICON.HANAMARU, `ちかい！ ${msg}`, 3, unitSpeech(`近い！${q.actual}${q.unit}`)); }
    else ctx.toast('', `${msg}。${Q.guess > q.actual ? 'おおきく みすぎ' : 'ちいさく みすぎ'}`, 3.2, unitSpeech(`${q.actual}${q.unit}。見通しは${Q.guess}${q.unit}`));
    Q.phase = 'done'; q$('dots').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${Q.res[k] || (k === Q.i ? 'now' : '')}"></i>`).join('');
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
  const nudge = d => { if (Q.phase !== 'ask') return; sfx.tap(); setGuess(clamp(Math.round((Q.guess + d * Q.cur.step) / Q.cur.step) * Q.cur.step, 0, Q.cur.max)); };
  on(q$('say-q'), 'click', () => ctx.say(Q.cur && Q.cur.sp, true));
  on(q$('minus'), 'click', () => nudge(-1)); on(q$('plus'), 'click', () => nudge(1));
  on(q$('guess'), 'click', guess);
  on(q$('replay'), 'click', () => { sfx.tap(); playTime(); });
  on(q$('next'), 'click', () => { sfx.tap(); ctx.hideHud(); if (Q.i < n - 1) { Q.i++; show(); } else finish(); });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  on(q$('up'), 'click', () => { sfx.tap(); ctx.hideHud(); Q.level = LV[(LV.indexOf(Q.level) + 1) % 3]; start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (b.dataset.level === Q.level) { sfx.tap(); ctx.toast('', `いまは「${LVN[Q.level]}」だよ`, 1.6); return; } sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
  F.onResize(layout);
  start();
  return {
    dispose() {},
    test: {
      state: () => ({ phase: Q.phase, i: Q.i, guess: Q.guess, actual: Q.cur && Q.cur.actual }),
      auto() {
        if (!q$('result').hidden) return { done: true };
        if (Q.phase === 'done') return { click: 'data-k=next|' };
        if (Q.phase === 'play') return { wait: 900 };
        if (Q.phase !== 'ask') return { wait: 300 };
        const want = Q.cur.actual;
        if (Math.abs(Q.guess - want) > Q.cur.step) { const y = L.ny; return pathOf(F, [[xOf(Q.guess), y - 20], [xOf((Q.guess + want) / 2), y - 20], [xOf(want), y - 20]]); }
        return { click: 'data-k=guess|' };
      },
    },
  };
}
