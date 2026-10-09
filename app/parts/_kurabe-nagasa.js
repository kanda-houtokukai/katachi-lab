// kurabe・ながさ（N1）：2つの物を指で動かして直接くらべる。はしが そろうと ぴたっと止まり、はみ出た分が光る。
// まがった ひもは まっすぐ のばしてから。ふとさに まどわされない。
// opts.mode：miru（みる）｜align（さわる：ならべて くらべる）｜quiz（ためす：どちらが ながい）｜order（つくる：ながさ ならべ）
// 記録：miru・align・direct（＋direct-done）・order
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, tapOf, pathOf, hanamaru } from './_flat.js';
import { thing, thOf, stringPts, spanOf, drawString, overhang, swatch, NAMES, thingIcon } from './_nagasa.js';
import { makeQuiz } from './_quiz2d.js';
import { rnd, pickR, shuffleR } from './_gen.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const COL = { red: 'face-1', blue: 'face-4', green: 'face-3' };
const CNAME = { red: 'あか', blue: 'あお', green: 'みどり' };
// 物（長さ u は mm のつもり。1年なので数は画面に出さない）
const mk = (id, len, o = {}) => Object.assign({ id, len, x: 0, k: 0, name: NAMES[id] }, o);

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'align';
  const F = ctx.openFlat();
  const st = { objs: [], snapped: false, busy: false, glow: null };
  const G = {};
  // 場所：横の余白 m、1u あたり k px、行の y（物の下の線）
  function geom(n = st.objs.length, maxU = 230) {
    const m = Math.max(18, F.W * 0.06), top = F.top + F.cap + 28, bot = F.bottom - 22;
    const k = Math.min((F.W - m * 2) / maxU, 3.2), rows = [];
    for (let i = 0; i < n; i++) rows.push(top + (bot - top) * (n === 1 ? 0.6 : (i + 0.75) / (n + 0.1)));
    return { m, k, rows, top, bot, rowH: (bot - top) / Math.max(1, n) };
  }
  let g0 = geom(2);
  const X = u => g0.m + u * g0.k;
  const thickOf = o => Math.min(g0.rowH * 0.55, o.h != null ? o.h * g0.k : thOf(o.id, o.len * g0.k));
  // 1つの物を描く（ひもは まがり k で）
  function drawObj(o, i) {
    const g = el('g', { 'data-obj': i }, G.objs), y = g0.rows[i], L = o.len * g0.k;
    o.el = g;
    if (o.id === 'string') { o.pts = stringPts(0, -6, L, o.k, { amp: o.amp ?? 0.85, waves: o.waves ?? 2.2 }); drawString(g, o.pts, { color: C('face-5'), w: Math.max(4, g0.k * 2.2) }); o.span = spanOf(o.pts) / g0.k; }
    else { thing(g, o.id, 0, 0, L, { h: thickOf(o), color: o.color ? C(COL[o.color]) : undefined }); o.span = o.len; }
    g.setAttribute('transform', `translate(${X(o.x)},${y})`);
    return g;
  }
  function draw() {
    g0 = geom();
    F.clearLayers();
    G.guide = F.layer('guide'); G.objs = F.layer('objs'); G.fx = F.layer('fx');
    st.objs.forEach(drawObj);
    if (st.snapped) glowLonger(false);
    extraDraw && extraDraw();
  }
  let extraDraw = null;
  const place = (o, i) => o.el && o.el.setAttribute('transform', `translate(${X(o.x)},${g0.rows[i]})`);
  const longest = () => st.objs.reduce((a, b) => (b.len > a.len ? b : a));
  const shortest = () => st.objs.reduce((a, b) => (b.len < a.len ? b : a));
  // はしを そろえた あとの、はみ出た分を光らせる
  function glowLonger(say = true) {
    clear(G.fx);
    const L = longest(), Sh = shortest(), li = st.objs.indexOf(L);
    const ends = st.objs.map(o => o.x + o.span), right = Math.max(...ends);
    const others = st.objs.filter(o => o !== L).map(o => o.x + o.span), secondEnd = Math.max(...others);
    const th = L.id === 'string' ? 12 : thickOf(L);
    overhang(G.fx, X(secondEnd), X(right), g0.rows[li] - th - (L.id === 'string' ? -2 : 0), th);
    line(G.fx, X(st.objs[0].x), g0.rows[0] - g0.rowH * 0.5, X(st.objs[0].x), g0.rows[g0.rows.length - 1] + 10, { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '5 5' });
    if (say) {
      const nm = o => (o.color ? `${CNAME[o.color]}の ${o.name.replace(/^(あかい|あおい) /, '')}` : o.name);
      ctx.caption(`はしが そろった！ <b>${nm(L)}</b>の ほうが ながい`, 0, `端がそろった。${nm(L).replace(/ /g, '')}のほうが長い`);
    }
    return Sh;
  }
  const api = { dispose() {}, test: {} };
  if (mode !== 'order') F.onResize(draw);

  /* ---------------- みる ---------------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play';
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function slide(o, i, toX, sec = 0.9) { const a = o.x; await tween(sec, k => { o.x = lerp(a, toX, E.io(k)); place(o, i); }); }
    async function run() {
      const tag = S.token, ok = () => alive(tag), say = (h, s) => ctx.caption(h, 0, s);
      phase = 'play'; st.snapped = false;
      // 1. はしが ずれた えんぴつ
      st.objs = [mk('red', 165, { color: 'red', x: 0 }), mk('blue', 140, { color: 'blue', x: 50 })]; draw();
      say('あかい えんぴつと あおい えんぴつ。どちらが ながい？', '赤い鉛筆と青い鉛筆。どちらが長い？'); if (!(await wait(2.4)) || !ok()) return;
      say('あおの ほうが ながく みえる…？', '青のほうが長く見える？'); if (!(await wait(2)) || !ok()) return;
      say('<b>はしを そろえて</b> みよう', '端をそろえてみよう'); await slide(st.objs[1], 1, 0); if (!ok()) return;
      sfx.pop(); st.snapped = true; glowLonger(false); say('はしを そろえると、<b>あか</b>の ほうが ながい！', '端をそろえると、赤のほうが長い'); if (!(await wait(3)) || !ok()) return;
      // 2. まがった ひも
      st.snapped = false; st.objs = [mk('string', 200, { x: 10, k: 0, amp: 1.05 }), mk('stick', 150, { x: 10 })]; draw();
      say('ひもと ぼう。どちらが ながい？', 'ひもと棒。どちらが長い？'); if (!(await wait(2.4)) || !ok()) return;
      say('ひもは まがって いるね。<b>まっすぐ のばして</b> みよう', 'ひもは曲がっているね。まっすぐのばしてみよう'); if (!(await wait(1.6)) || !ok()) return;
      await tween(1.6, k => { st.objs[0].k = E.io(k); draw(); }); if (!ok()) return;
      sfx.pop(); st.snapped = true; glowLonger(false); say('のばすと <b>ひも</b>の ほうが ながい！', '伸ばすと、ひものほうが長い'); if (!(await wait(3)) || !ok()) return;
      // 3. ふとい と ほそい
      st.snapped = false; st.objs = [mk('crayon', 110, { x: 70, h: 26 }), mk('straw', 160, { x: 0 })]; draw();
      say('ふとい クレヨンと ほそい ストロー。どちらが ながい？', '太いクレヨンと細いストロー。どちらが長い？'); if (!(await wait(2.6)) || !ok()) return;
      await slide(st.objs[0], 0, 0); if (!ok()) return;
      sfx.pop(); st.snapped = true; glowLonger(false); say('<b>ふとくても みじかい</b>。ながさは はしから はしまで', '太くても短い。長さは端から端まで'); if (!(await wait(3.2)) || !ok()) return;
      say('つぎは「さわる」で ならべて くらべよう', '次は「さわる」で並べて比べよう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------------- さわる：ならべて くらべる ---------------- */
  if (mode === 'align') {
    const PAIRS = {
      pencil: { label: 'えんぴつ 2ほん', make: () => [mk('red', rnd(150, 175), { color: 'red', x: rnd(0, 40) }), mk('blue', rnd(120, 145), { color: 'blue', x: rnd(55, 85) })] },
      string: { label: 'ひもと ぼう', make: () => [mk('string', rnd(175, 200), { x: rnd(30, 60), k: 0, amp: 1.05 }), mk('stick', rnd(135, 150), { x: rnd(0, 20) })] },
      thick: { label: 'ふとい と ほそい', make: () => [mk('crayon', rnd(95, 115), { x: rnd(70, 100), h: 26 }), mk('straw', rnd(140, 165), { x: rnd(0, 20) })] },
    };
    let pair = opts.pair || 'pencil', aligned = 0;
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="くらべる もの">${Object.entries(PAIRS).map(([k, p]) => `<button type="button" data-pair="${k}" aria-pressed="${k === pair}">${p.label}</button>`).join('')}</div></div>
      <div class="row"><button class="btn sub small" type="button" data-k="straight">まっすぐ のばす</button><button class="btn sub small" type="button" data-k="mix">ばらばらに する</button></div>`;
    const reset = () => { st.objs = PAIRS[pair].make(); st.snapped = false; draw(); ctx.caption('ゆびで うごかして、<b>はしを そろえよう</b>', 0, '指で動かして、端をそろえよう'); };
    $$p(panel, '[data-pair]').forEach(b => on(b, 'click', () => {
      sfx.tap();
      if (b.dataset.pair === pair) { ctx.toast('', `いまは「${PAIRS[pair].label}」だよ`, 1.6); return; }
      pair = b.dataset.pair; $$p(panel, '[data-pair]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pair === pair))); reset();
    }));
    on($p(panel, '[data-k="mix"]'), 'click', () => { sfx.tap(); reset(); });
    on($p(panel, '[data-k="straight"]'), 'click', async () => {
      const s = st.objs.find(o => o.id === 'string');
      if (!s) { sfx.off(); ctx.toast('', 'まがって いる ものは ないよ。「ひもと ぼう」で ためそう', 2.4); return; }
      if (s.k >= 1) { sfx.off(); ctx.toast('', 'もう まっすぐ だよ', 1.6); return; }
      if (st.busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; }
      sfx.tap(); st.busy = true; const tag = S.token;
      await tween(1.2, k => { s.k = E.io(k); draw(); }); st.busy = false; if (!alive(tag)) return;
      ctx.caption('まっすぐ のびた。<b>はしを そろえて</b> くらべよう', 0, 'まっすぐ伸びた。端をそろえて比べよう'); checkSnap(false);
    });
    function checkSnap(fromDrag = true) {
      const [a, b] = st.objs, tol = 12 / g0.k;
      const s = st.objs.find(o => o.id === 'string');
      if (Math.abs(a.x - b.x) < tol) {
        const mover = fromDrag && fromDrag.o ? fromDrag.o : b, other = mover === a ? b : a; mover.x = other.x; st.objs.forEach(place);
        if (s && s.k < 1) { sfx.pop(); st.snapped = false; clear(G.fx); ctx.caption('はしは そろった。でも ひもは <b>まがって いる</b>よ。「まっすぐ のばす」を おそう', 0, '端はそろった。でもひもは曲がっているよ'); return; }
        sfx.pop(); st.snapped = true; glowLonger(); aligned++; ctx.log('align', { detail: { pair } });
      } else { st.snapped = false; clear(G.fx); }
    }
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { let best = null; st.objs.forEach((o, i) => { const y = g0.rows[i], x0 = X(o.x), x1 = X(o.x + o.span); if (p.x > x0 - 16 && p.x < x1 + 16 && Math.abs(p.y - (y - 12)) < Math.max(30, g0.rowH * 0.4)) best = { o, i }; }); return best; },
      start: (p, h) => { if (st.busy) return; ctx.hideHud(); drag = { h, x0: p.x, u0: h.o.x }; clear(G.fx); st.snapped = false; },
      move: p => { if (!drag) return; drag.h.o.x = clamp(drag.u0 + (p.x - drag.x0) / g0.k, -10, (F.W - g0.m) / g0.k - drag.h.o.span * 0.6); place(drag.h.o, drag.h.i); },
      end: () => { if (!drag) return; const d = drag; drag = null; checkSnap({ o: d.h.o }); },
    });
    reset();
    api.test = {
      state: () => ({ pair, aligned, snapped: st.snapped }),
      auto() {
        if (aligned >= 1) return { done: true };
        const s = st.objs.find(o => o.id === 'string'); if (s && s.k < 1) return { click: 'data-k=straight|' };
        const [a, b] = st.objs, y = g0.rows[1] - Math.max(6, thickOf(b) / 2);
        return pathOf(F, [[X(b.x + b.span / 2), y], [X(b.x + b.span / 2 + (a.x - b.x) / 2), y], [X(a.x + b.span / 2), y]]);
      },
    };
    return api;
  }

  /* ---------------- ためす：どちらが ながい ---------------- */
  if (mode === 'quiz') {
    const TYPES = { easy: ['offset', 'thick', 'string', 'offset', 'thick'], normal: ['offset', 'string', 'thick', 'short', 'string'], challenge: ['three', 'string', 'thick', 'short', 'three'] };
    const nm = o => (o.color ? CNAME[o.color] : o.name);
    function gen(level, i) {
      const type = TYPES[level][i % 5]; st.snapped = false; extraDraw = null;
      let objs, ask = 'long', mis = 'L2';
      if (type === 'offset' || type === 'short') {
        const a = rnd(140, 180), b = Math.round(a * (level === 'easy' ? 0.78 : 0.88)), d = a - b + rnd(18, 34);
        const cols = shuffleR(['red', 'blue']);
        objs = shuffleR([mk(cols[0], a, { color: cols[0], x: rnd(0, 10) }), mk(cols[1], b, { color: cols[1] })]);
        const A = objs.find(o => o.len === a), B = objs.find(o => o.len === b); B.x = A.x + d;
        objs.forEach(o => { o.id = o.color === 'red' ? 'red' : 'blue'; });
        if (type === 'short') ask = 'short';
      } else if (type === 'string') {
        const T = rnd(170, 200), s = Math.round(T * (level === 'easy' ? 0.82 : 0.9));
        objs = shuffleR([mk('string', T, { k: 0, amp: 1.05, x: rnd(0, 20) }), mk(pickR(['stick', 'straw', 'chopsticks']), s, { x: rnd(0, 20) })]);
      } else if (type === 'thick') {
        const T = rnd(140, 170), s = Math.round(T * (level === 'easy' ? 0.68 : 0.82));
        objs = shuffleR([mk('crayon', s, { h: 28, x: rnd(30, 60), color: pickR(['red', 'green']) }), mk(pickR(['straw', 'pencil', 'ribbon']), T, { x: rnd(0, 20) })]);
        objs.forEach(o => { if (o.id === 'crayon') { o.name = 'ふとい クレヨン'; delete o.color; } });
        mis = 'thick';
      } else { // three
        const a = rnd(150, 180), b = a - rnd(14, 22), c = b - rnd(14, 22), cols = shuffleR(['red', 'blue', 'green']);
        objs = shuffleR([a, b, c]).map((len, k) => mk('pencil', len, { color: cols[k], x: 0 }));
        objs.forEach(o => { o.id = 'crayon'; o.h = 12; o.name = CNAME[o.color]; });
        const A = objs.find(o => o.len === a); objs.forEach(o => { if (o !== A) o.x = (a - o.len) + rnd(10, 30); }); A.x = 0;
      }
      st.objs = objs; draw();
      const target = ask === 'short' ? shortest() : longest();
      const say = ask === 'short' ? 'みじかいのは どれ？' : type === 'thick' ? 'ながいのは どっち？ ふとさでは ないよ' : 'ながいのは どれ？';
      const sp = say.replace(/ /g, '');
      const label = o => (o.color ? `${swatch(COL[o.color])}${CNAME[o.color]}` : o.id === 'crayon' ? `<span style="display:inline-block;vertical-align:-6px">${thingIcon('crayon', 40, 22, { h: 14 })}</span>ふとい クレヨン` : `<span style="display:inline-block;vertical-align:-6px">${thingIcon(o.id, 46, 22)}</span>${o.name}`);
      const midY = (g0.rows[0] + g0.rows[g0.rows.length - 1]) / 2;
      return {
        say, sp, at: { x: X(target.x + target.len / 2), y: midY, r: Math.min(90, g0.rowH) },
        choices: st.objs.map(o => ({ html: label(o), ok: o === target, mistake: o === target ? null : (type === 'thick' && o.id === 'crayon' ? 'thick' : mis) })),
        detail: { type, ask }, answerText: nm(target),
        hint(k) {
          if (k === 1) ctx.caption(type === 'string' ? 'まがって いる ものは ないかな？' : type === 'thick' ? 'ふとさでは なくて、<b>はしから はしまで</b>' : 'どこと どこを くらべる？', 0, type === 'string' ? '曲がっているものはないかな？' : type === 'thick' ? '太さではなくて、端から端まで' : 'どこと、どこを比べる？');
          if (k === 2) { ctx.caption('<b>はし</b>は そろって いるかな？', 0, '端はそろっているかな？'); extraDraw = () => st.objs.forEach((o, i) => { line(G.guide, X(o.x), g0.rows[i] - g0.rowH * 0.45, X(o.x), g0.rows[i] + 8, { stroke: C('ok'), 'stroke-width': 3, 'stroke-dasharray': '4 4' }); }); draw(); }
          if (k === 3) { ctx.caption(type === 'string' ? 'ひもを まっすぐ のばすと…' : 'はしを そろえると…', 0); const s = st.objs.find(o => o.id === 'string'); if (s) { s.k = 0.6; draw(); } }
        },
        async verify() {
          const tag = S.token, s = st.objs.find(o => o.id === 'string');
          if (s && s.k < 1) { ctx.caption('ひもを <b>まっすぐ</b> のばして…', 0, 'ひもをまっすぐ伸ばして'); const k0 = s.k; await tween(1.1, k => { s.k = lerp(k0, 1, E.io(k)); draw(); }); if (!alive(tag)) return; }
          const x0 = Math.min(...st.objs.map(o => o.x)), from = st.objs.map(o => o.x);
          await tween(0.9, k => { st.objs.forEach((o, i) => { o.x = lerp(from[i], x0, E.io(k)); place(o, i); }); }); if (!alive(tag)) return;
          sfx.pop(); st.snapped = true; glowLonger(false);
          ctx.caption(ask === 'short' ? `はしを そろえると <b>${nm(target)}</b>が いちばん みじかい` : `はしを そろえると <b>${nm(target)}</b>が ${st.objs.length > 2 ? 'いちばん ' : ''}ながい`, 0, `端をそろえると、${nm(target).replace(/ /g, '')}が${ask === 'short' ? '短い' : '長い'}`);
          await wait(1.2);
        },
      };
    }
    const quiz = makeQuiz(ctx, F, { kind: 'direct', n: opts.n || 5, gen });
    quiz.start();
    return { dispose() {}, test: quiz.test };
  }

  /* ---------------- つくる：ながさ ならべ（みじかい じゅんに） ---------------- */
  if (mode === 'order') {
    const IDS = opts.items || ['clip', 'coin1', 'eraser', 'card', 'hagaki', 'pencil', 'tissue', 'notebook'];
    const DRAW = { coin1: 'coin' };
    const lenOf = id => (bench(id) || {}).len_mm || 100;
    let rows = [], placed = 0, miss = 0, done = false;
    function shuffle() {
      rows = shuffleR(IDS.map(id => ({ id, len: lenOf(id), x: 0 })));
      rows.forEach(r => { r.x = rnd(0, 55); });
      placed = 0; miss = 0; done = false;
      drawO();
      ctx.caption('<b>みじかい もの</b>から じゅんに タッチしてね', 0, '短いものから順にタッチしてね');
    }
    function geomO() {
      const n = rows.length, m = Math.max(16, F.W * 0.05), top = F.top + F.cap + 16, bot = F.bottom - 16, rh = (bot - top) / n;
      const k = Math.min((F.W - m * 2) / 312, 3);
      return { n, m, top, bot, rh, k, y: i => top + rh * (i + 0.82), x: u => m + u * k };
    }
    let go = geomO();
    function drawO() {
      go = geomO(); F.clearLayers();
      const gb = F.layer('base'), gi = F.layer('items'), gf = F.layer('fx');
      G.fx = gf;
      rect(gb, go.m - 8, go.top - 4, F.W - go.m * 2 + 16, go.rh * placed + 4, { rx: 10, fill: C('pick-bg'), opacity: placed ? 0.9 : 0 });
      if (placed) line(gb, go.x(0), go.top, go.x(0), go.top + go.rh * placed, { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '5 5' });
      rows.forEach((r, i) => {
        const g = el('g', { 'data-row': i }, gi), L = r.len * go.k, h = Math.min(go.rh * 0.62, Math.max(6, thOf(DRAW[r.id] || r.id, L)));
        r.el = g;
        if ((DRAW[r.id] || r.id) === 'coin') thing(g, 'coin', 0, 0, Math.min(L, go.rh * 0.62));
        else thing(g, DRAW[r.id] || r.id, 0, 0, L, { h });
        g.setAttribute('transform', `translate(${go.x(r.x)},${go.y(i)})`);
        if (i < placed) circle(g, -12, -h / 2, 5, { fill: C('ok') });
      });
      if (done) {
        const pts = rows.map((r, i) => [go.x(r.len), go.y(i) - 4]);
        el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: C('ok'), 'stroke-width': 3, 'stroke-dasharray': '6 5', 'stroke-linejoin': 'round' }, gf);
      }
    }
    // draw() は 2行の場面用。ここでは並べる場面を描く
    F.onResize(drawO);
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="hint">どれが みじかい？</button><button class="btn sub small" type="button" data-k="shuffle">はじめから</button></div>`;
    const rest = () => rows.slice(placed);
    const shortestRest = () => rest().reduce((a, b) => (b.len < a.len ? b : a));
    async function tapRow(i) {
      if (done) { sfx.off(); ctx.toast('', 'ならべおわったよ。「はじめから」で もういちど', 2); return; }
      if (st.busy) return;
      if (i < placed) { sfx.off(); ctx.toast('', 'それは もう ならべたよ', 1.6); return; }
      const r = rows[i], best = shortestRest();
      if (r !== best) {
        sfx.bad(); miss++;
        ctx.toast('', 'もっと <b>みじかい</b> ものが あるよ。はしを そろえて くらべてみよう', 2.6, 'もっと短いものがあるよ');
        st.busy = true; const tag = S.token, a = r.x, j = rows.indexOf(best), b = best.x;
        await tween(0.5, k => { r.x = lerp(a, 0, E.io(k)); best.x = lerp(b, 0, E.io(k)); drawO(); });
        if (!alive(tag)) return;
        overhang(G.fx, go.x(best.len), go.x(r.len), go.y(i) - 14, 14);
        await wait(0.9); st.busy = false; return;
      }
      st.busy = true; sfx.pop(); const tag = S.token;
      const from = r.x;
      await tween(0.45, k => { r.x = lerp(from, 0, E.io(k)); drawO(); });
      if (!alive(tag)) return;
      if (i !== placed) { const t = rows[placed]; rows[placed] = r; rows[i] = t; }
      placed++; drawO(); st.busy = false;
      ctx.caption(`${placed}ばんめ：<b>${bench(r.id).name.replace(/（.*）/, '')}</b>`, 0, `${placed}番目、${bench(r.id).name.replace(/（.*）/, '')}`);
      if (placed === rows.length) {
        done = true; drawO(); sfx.good();
        hanamaru(F.svg, go.x(rows[rows.length - 1].len) - 30, go.y(rows.length - 1) - 30, 40);
        ctx.toast(ICON.HANAMARU, 'みじかい じゅんに ならんだ！ はしが そろって かいだんに なったね', 3.2);
        ctx.log('order', { correct: miss === 0, detail: { n: rows.length, miss } }); ctx.done('order');
      }
    }
    dragOn(F.svg, F, {
      hit: p => { for (let i = 0; i < rows.length; i++) { const r = rows[i], x0 = go.x(r.x), x1 = go.x(r.x + r.len); if (p.x > x0 - 10 && p.x < x1 + 10 && p.y > go.y(i) - go.rh * 0.8 && p.y < go.y(i) + 6) return { i }; } return null; },
      end: (p, h) => tapRow(h.i),
    });
    on($p(panel, '[data-k="shuffle"]'), 'click', () => { sfx.tap(); shuffle(); });
    on($p(panel, '[data-k="hint"]'), 'click', async () => {
      if (done) { sfx.off(); ctx.toast('', 'もう ぜんぶ ならんだよ', 1.6); return; }
      sfx.tap(); const b = shortestRest(), i = rows.indexOf(b);
      ctx.caption('のこりの なかで いちばん みじかいのは これ', 0, '残りの中でいちばん短いのはこれ');
      const g = F.layer('fx'); const ring = rect(g, go.x(b.x) - 8, go.y(i) - go.rh * 0.7, b.len * go.k + 16, go.rh * 0.8, { rx: 10, fill: 'none', stroke: C('yamabuki'), 'stroke-width': 4 });
      await wait(1.4); ring.remove();
    });
    shuffle();
    api.test = {
      state: () => ({ placed, done, miss }),
      auto() {
        if (done) return { done: true };
        if (st.busy) return { wait: 300 };
        const b = shortestRest(), i = rows.indexOf(b);
        return tapOf(F, go.x(b.x + b.len / 2), go.y(i) - Math.min(go.rh * 0.3, 8));
      },
    };
    return api;
  }
  return api;
}
