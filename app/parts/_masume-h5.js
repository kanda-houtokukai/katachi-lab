// masume の H5（5年 面積）の場面：みる・平行四辺形を切って動かす・2まいで平行四辺形（三角形・台形）・ひし形は長方形の半分・頂点を動かす（高さが外）。
import { el, C, txt, rect, line, path, circle, clear, clamp, lerp, tween, wait, E, hanamaru, dragOn, pathOf } from './_flat.js';
import { stageBox, wide } from './_masume.js';
import { drawFigure, figVerify, figPts, gridLines, polyD, rightMark, say } from './_hirosa-fig.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on, sliderRow, setSlider } from './_common.js';

const cancelAll = () => { newToken(); killTweens(); };
const NM = { para: '<ruby>平行四辺形<rt>へいこうしへんけい</rt></ruby>', tri: '<ruby>三角形<rt>さんかくけい</rt></ruby>', trap: '<ruby>台形<rt>だいけい</rt></ruby>', rhom: 'ひし<ruby>形<rt>がた</rt></ruby>' };
const ans = q => (q.fig === 'para' ? q.b * q.h : q.fig === 'tri' ? q.b * q.h / 2 : q.fig === 'trap' ? (q.up + q.b) * q.h / 2 : q.d1 * q.d2 / 2);

// 平行四辺形の左の三角形を切って、右へ動かす（長方形になる）
async function cutMove(F, d, q, tag) {
  const { X, Y } = d, fx = F.layer('fx');
  const cut = line(fx, X(q.off), Y(0), X(q.off), Y(0), { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
  await tween(0.6, e => cut.setAttribute('y2', Y(q.h * e)), E.io); if (!alive(tag)) return false;
  const tri = path(fx, polyD([[X(0), Y(q.h)], [X(q.off), Y(q.h)], [X(q.off), Y(0)]]), { fill: C('face-2'), 'fill-opacity': 0.7, stroke: C('hint'), 'stroke-width': 2 });
  await tween(1.1, e => tri.setAttribute('transform', `translate(${q.b * d.u * e},0)`), E.io);
  return alive(tag);
}

/* ---------- みる（H5） ---------- */
export function miru(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let phase = 'play';
  async function run() {
    const tag = S.token, ok = () => alive(tag); phase = 'play';
    const box = stageBox(F, { bottom: 10 });
    F.clearLayers();
    let q = { fig: 'para', b: 6, h: 4, off: 2 }, d = drawFigure(F, box, q, { grid: true });
    say(ctx, `${NM.para}の <ruby>面積<rt>めんせき</rt></ruby>は？ <ruby>高<rt>たか</rt></ruby>さの せんで きって みよう`); if (!(await wait(2.2)) || !ok()) return;
    if (!(await cutMove(F, d, q, tag))) return;
    say(ctx, `<ruby>長方形<rt>ちょうほうけい</rt></ruby>に なった。<b><ruby>底辺<rt>ていへん</rt></ruby> × <ruby>高<rt>たか</rt></ruby>さ ＝ 6 × 4 ＝ 24cm²</b>`); if (!(await wait(3.4)) || !ok()) return;
    for (const nq of [{ fig: 'tri', b: 6, h: 4, off: 2 }, { fig: 'trap', b: 6, up: 3, h: 4, off: 1 }, { fig: 'rhom', d1: 6, d2: 4 }]) {
      F.clearLayers(); q = nq; d = drawFigure(F, box, q, { grid: true });
      say(ctx, `${NM[q.fig]}は？`); if (!(await wait(1.6)) || !ok()) return;
      await figVerify(F, d, Object.assign({ ans: ans(q) }, q), ctx); if (!ok()) return;
      if (!(await wait(1.6)) || !ok()) return;
    }
    F.clearLayers(); q = { fig: 'tri', b: 4, h: 4, off: 7, out: true }; d = drawFigure(F, box, q, { grid: true });
    say(ctx, `<ruby>高<rt>たか</rt></ruby>さが かたちの <b>そと</b>に ある ときも、<ruby>底辺<rt>ていへん</rt></ruby>を のばして はかる`); if (!(await wait(3.2)) || !ok()) return;
    d.hiH && d.hiH();
    say(ctx, `4 × 4 ÷ 2 ＝ <b>8cm²</b>`); if (!(await wait(2.6)) || !ok()) return;
    say(ctx, 'つぎは「さわる」で きって うごかして みよう'); ctx.log('miru'); phase = 'done';
  }
  panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); cancelAll(); run(); });
  F.onResize(() => { cancelAll(); run(); });
  run();
  return { dispose() {}, test: { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 500 }) } };
}

/* ---------- さわる：平行四辺形を切って動かす（指で三角形を運ぶ） ---------- */
const PQ = [{ fig: 'para', b: 6, h: 4, off: 2 }, { fig: 'para', b: 5, h: 3, off: 3 }, { fig: 'para', b: 7, h: 4, off: 1 }];
export function para(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let qi = 0, d = null, piece = null, cut = false, done = 0, busy = false;
  const q = () => PQ[qi];
  function draw() {
    F.clearLayers(); d = drawFigure(F, stageBox(F, { bottom: 12 }), q(), { grid: true }); F.layer('piece'); F.layer('fx'); piece = null;
    if (cut) makePiece(0);
  }
  function makePiece(dx) {
    const Q = q(), { X, Y } = d, g = F.layer('piece'); clear(g);
    d.body.setAttribute('d', polyD([[X(Q.off), Y(Q.h)], [X(Q.b), Y(Q.h)], [X(Q.off + Q.b), Y(0)], [X(Q.off), Y(0)]]));
    // 本体（切ったあとの残り）を薄く、三角形を動かせるように
    piece = { dx, g: el('g', { class: 'grab' }, g) };
    path(piece.g, polyD([[X(0), Y(Q.h)], [X(Q.off), Y(Q.h)], [X(Q.off), Y(0)]]), { fill: C('face-2'), 'fill-opacity': 0.75, stroke: C('hint'), 'stroke-width': 2.5 });
    line(F.layer('piece'), X(Q.off), Y(0), X(Q.off), Y(Q.h), { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
    piece.g.setAttribute('transform', `translate(${dx},0)`);
  }
  async function doCut() {
    if (busy) return; if (cut) { sfx.off(); ctx.toast('', 'もう きったよ。さんかくを ゆびで みぎへ うごかそう', 2); return; }
    busy = true; sfx.tap(); const tag = S.token, { X, Y } = d, Q = q(), fx = F.layer('fx');
    const l = line(fx, X(Q.off), Y(0), X(Q.off), Y(0), { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
    await tween(0.6, e => l.setAttribute('y2', Y(Q.h * e)), E.io); if (!alive(tag)) return;
    clear(fx); cut = true; makePiece(0); busy = false;
    say(ctx, '<ruby>高<rt>たか</rt></ruby>さの せんで きった。さんかくを ゆびで <b>みぎ</b>へ うごかそう');
  }
  function snapDone() {
    const Q = q(); done++; sfx.good();
    hanamaru(F.svg, d.X(Q.b / 2 + Q.off), d.Y(Q.h / 2), Math.min(80, Q.h * d.u * 0.45));
    say(ctx, `<ruby>長方形<rt>ちょうほうけい</rt></ruby>に なった！ <ruby>底辺<rt>ていへん</rt></ruby> × <ruby>高<rt>たか</rt></ruby>さ ＝ ${Q.b} × ${Q.h} ＝ <b>${Q.b * Q.h}cm²</b>`);
    ctx.log('para', { correct: true, detail: { b: Q.b, h: Q.h } });
  }
  async function autoMove() {
    if (busy) return; if (!cut) { await doCut(); if (!cut) return; }
    busy = true; const tag = S.token, x0 = piece.dx, to = q().b * d.u;
    await tween(1, e => { piece.dx = lerp(x0, to, e); piece.g.setAttribute('transform', `translate(${piece.dx},0)`); }, E.io); if (!alive(tag)) return;
    busy = false; snapDone();
  }
  dragOn(F.svg, F, {
    hit: p => { if (busy || !cut || !piece) return null; const Q = q(), x = p.x - piece.dx; return x >= d.X(0) - 10 && x <= d.X(Q.off) + 10 && p.y >= d.Y(0) - 10 && p.y <= d.Y(Q.h) + 10 ? { x0: piece.dx } : null; },
    start: () => ctx.hideHud(),
    move: (p, h, a) => { piece.dx = clamp(h.x0 + p.x - a.p0.x, -20, q().b * d.u + 40); piece.g.setAttribute('transform', `translate(${piece.dx},0)`); },
    end: (p, h) => {
      const to = q().b * d.u;
      if (Math.abs(piece.dx - to) < d.u * 0.8) { piece.dx = to; piece.g.setAttribute('transform', `translate(${to},0)`); sfx.pop(); snapDone(); }
      else { sfx.tap(); ctx.caption('ぴったり あう ところまで うごかそう', 0, 'ぴったり合うところまで動かそう'); }
    },
  });
  panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="cut">${ctx.ICONS_UI.scissors} きる</button><button class="btn sub small" type="button" data-k="move">うごかして みせて</button><button class="btn sub small" type="button" data-k="next">${ctx.ICONS_UI.again} べつの かたち</button></div>`;
  on($p(panel, '[data-k="cut"]'), 'click', doCut);
  on($p(panel, '[data-k="move"]'), 'click', () => { sfx.tap(); autoMove(); });
  on($p(panel, '[data-k="next"]'), 'click', () => { sfx.tap(); cancelAll(); busy = false; cut = false; qi = (qi + 1) % PQ.length; draw(); say(ctx, `${NM.para}を <ruby>長方形<rt>ちょうほうけい</rt></ruby>に できるかな？「きる」を おそう`); });
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `${NM.para}を きって うごかすと？「きる」を おそう`);
  return {
    dispose() {},
    test: {
      state: () => ({ cut, done, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (done >= 1) return { done: true };
        if (!cut) return { click: 'data-k=cut|' };
        const Q = q(), sx = d.X(Q.off * 0.7) + piece.dx, sy = d.Y(Q.h * 0.8), to = Q.b * d.u - piece.dx;
        return pathOf(F, [[sx, sy], [sx + to / 2, sy], [sx + to, sy]]);
      },
    },
  };
}

/* ---------- さわる：おなじ かたちを 2まいで 平行四辺形（三角形・台形） ---------- */
const DQ = { tri: { fig: 'tri', b: 6, h: 4, off: 2 }, trap: { fig: 'trap', b: 6, up: 3, h: 4, off: 1 } };
export function double(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let k = ctx.opts.fig || 'tri', d = null, busy = false, plays = 0;
  function draw() { F.clearLayers(); d = drawFigure(F, stageBox(F, { bottom: 12 }), DQ[k], { grid: true }); F.layer('fx'); }
  async function play() {
    if (busy) return; busy = true; ctx.hideHud(); sfx.tap(); const tag = S.token, Q = Object.assign({ ans: ans(DQ[k]) }, DQ[k]);
    draw(); say(ctx, `おなじ ${NM[k]}を もう1まい。まわして くっつけると…`);
    if (!(await wait(1)) || !alive(tag)) return;
    await figVerify(F, d, Q, ctx); if (!alive(tag)) return;
    plays++; busy = false; ctx.log('double', { detail: { fig: k } });
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="かたち"><button type="button" data-fig="tri" aria-pressed="${k === 'tri'}">さんかくけい</button><button type="button" data-fig="trap" aria-pressed="${k === 'trap'}">だいけい</button></div><button class="btn big" type="button" data-k="play">2まいで ならべる</button></div>`;
  $$p(panel, '[data-fig]').forEach(b => on(b, 'click', () => { if (b.dataset.fig === k) { sfx.tap(); ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; k = b.dataset.fig; $$p(panel, '[data-fig]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `${NM[k]}の <ruby>面積<rt>めんせき</rt></ruby>は？「2まいで ならべる」を おそう`); }));
  on($p(panel, '[data-k="play"]'), 'click', play);
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `${NM[k]}の <ruby>面積<rt>めんせき</rt></ruby>は？ おなじ かたちを 2まい ならべて みよう`);
  return { dispose() {}, test: { state: () => ({ k, plays, busy }), auto: () => (busy ? { wait: 300 } : plays < 1 ? { click: 'data-k=play|' } : { done: true }) } };
}

/* ---------- さわる：ひし形は 長方形の半分（おりこむ） ---------- */
export function rhom(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  const Q = { fig: 'rhom', d1: 8, d2: 6 };
  let d = null, busy = false, step = 0;
  function draw() { F.clearLayers(); d = drawFigure(F, stageBox(F, { bottom: 12 }), Q, { grid: true }); F.layer('fx'); step = 0; }
  async function surround() {
    if (busy) return; if (step >= 1) { sfx.off(); ctx.toast('', 'もう かこんだよ。「おりこむ」を おそう', 1.8); return; }
    busy = true; sfx.tap(); const tag = S.token, { X, Y, u } = d, fx = F.layer('fx');
    const r = rect(fx, X(0), Y(0), Q.d1 * u, Q.d2 * u, { fill: 'none', stroke: C('sora'), 'stroke-width': 3, 'stroke-dasharray': '7 5', opacity: 0 });
    await tween(0.6, e => r.setAttribute('opacity', e)); if (!alive(tag)) return;
    d.corners = [[[0, 0], [Q.d1 / 2, 0], [0, Q.d2 / 2]], [[Q.d1 / 2, 0], [Q.d1, 0], [Q.d1, Q.d2 / 2]], [[Q.d1, Q.d2 / 2], [Q.d1, Q.d2], [Q.d1 / 2, Q.d2]], [[0, Q.d2 / 2], [Q.d1 / 2, Q.d2], [0, Q.d2]]].map(t => path(fx, polyD(t.map(([x, y]) => [X(x), Y(y)])), { fill: C('face-2'), opacity: 0.55, stroke: C('hint'), 'stroke-width': 1.5 }));
    step = 1; busy = false;
    say(ctx, `<ruby>対角線<rt>たいかくせん</rt></ruby>で かこむ <ruby>長方形<rt>ちょうほうけい</rt></ruby>。${Q.d1} × ${Q.d2} ＝ ${Q.d1 * Q.d2}cm²`);
  }
  async function fold() {
    if (busy) return; if (step < 1) { await surround(); if (step < 1) return; }
    if (step >= 2) { sfx.off(); ctx.toast('', 'もう おりこんだよ', 1.6); return; }
    busy = true; const tag = S.token, { X, Y } = d;
    // 角の三角形を、ひし形の辺で 折りかえす
    const edges = [[[Q.d1 / 2, 0], [0, Q.d2 / 2]], [[Q.d1 / 2, 0], [Q.d1, Q.d2 / 2]], [[Q.d1, Q.d2 / 2], [Q.d1 / 2, Q.d2]], [[0, Q.d2 / 2], [Q.d1 / 2, Q.d2]]];
    for (let i = 0; i < 4; i++) {
      const [[ax, ay], [bx, by]] = edges[i], mx = X((ax + bx) / 2), my = Y((ay + by) / 2), ang = Math.atan2(Y(by) - Y(ay), X(bx) - X(ax)) * 180 / Math.PI, t = d.corners[i];
      sfx.tap();
      await tween(0.5, e => t.setAttribute('transform', `translate(${mx},${my}) rotate(${ang}) scale(1,${1 - 2 * e}) rotate(${-ang}) translate(${-mx},${-my})`), E.io); if (!alive(tag)) return;
    }
    step = 2; busy = false;
    say(ctx, `おりこむと ぴったり。ひし<ruby>形<rt>がた</rt></ruby>は <ruby>長方形<rt>ちょうほうけい</rt></ruby>の はんぶん。${Q.d1} × ${Q.d2} ÷ 2 ＝ <b>${Q.d1 * Q.d2 / 2}cm²</b>`);
    ctx.log('rhom', { detail: { d1: Q.d1, d2: Q.d2 } });
  }
  panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="sur">かこむ</button><button class="btn small" type="button" data-k="fold">おりこむ</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.undo} もとに もどす</button></div>`;
  on($p(panel, '[data-k="sur"]'), 'click', surround);
  on($p(panel, '[data-k="fold"]'), 'click', () => { sfx.tap(); fold(); });
  on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); cancelAll(); busy = false; draw(); say(ctx, 'もとに もどしたよ'); });
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `ひし<ruby>形<rt>がた</rt></ruby>の <ruby>面積<rt>めんせき</rt></ruby>は？ <ruby>対角線<rt>たいかくせん</rt></ruby>で かこんで みよう`);
  return { dispose() {}, test: { state: () => ({ step, busy }), auto: () => (busy ? { wait: 300 } : step < 2 ? { click: 'data-k=fold|' } : { done: true }) } };
}

/* ---------- さわる：頂点を動かす（高さが外に出ても 面積は同じ） ---------- */
export function shear(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let k = 'tri', off = 2, moves = 0, outSeen = false;
  const B = 4, H = 4, MIN = -2, MAX = 9;
  function draw() {
    F.clearLayers(); const box = stageBox(F, { bottom: 12 }), g = F.layer('fig');
    const wU = MAX + (k === 'para' ? B : 0) - MIN + 1, u = Math.max(10, Math.min((box.w - 80) / wU, (box.h - 110) / H, 44));
    const ox = box.x + (box.w - wU * u) / 2 - MIN * u, oy = box.y + (box.h - H * u) / 2 - 26, X = x => ox + x * u, Y = y => oy + y * u;
    rect(g, X(MIN), Y(0), wU * u, H * u, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 });
    gridLines(g, X(MIN), Y(0), wU, H, u, C('grid-line'), 0.8);
    const P = k === 'tri' ? [[0, H], [B, H], [off, 0]] : [[0, H], [B, H], [off + B, 0], [off, 0]];
    path(g, polyD(P.map(([x, y]) => [X(x), Y(y)])), { fill: C('face-5'), 'fill-opacity': 0.22, stroke: C('face-5'), 'stroke-width': 3, 'stroke-linejoin': 'round' });
    const out = off < 0 || off > B;
    if (out) line(g, X(Math.min(0, off)), Y(H), X(Math.max(B, off)), Y(H), { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    line(g, X(off), Y(0), X(off), Y(H), { stroke: C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '6 5' });
    rightMark(g, X(off), Y(H), 9, off > B ? -1 : 1, -1);
    circle(g, X(off), Y(0), 9, { fill: C('ok'), stroke: C('paper'), 'stroke-width': 2 });
    txt(g, X(B / 2), Y(H) + 24, `${B}cm`, { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
    txt(g, X(off) + 10, Y(H / 2), `${H}cm`, { 'font-size': 15, class: 'ui', fill: C('ok'), 'text-anchor': 'start' });
    const a = k === 'tri' ? B * H / 2 : B * H;
    txt(F.layer('fx'), box.x + box.w / 2, Y(H) + 52, `${k === 'tri' ? `${B} × ${H} ÷ 2` : `${B} × ${H}`} ＝ ${a}cm²`, { 'font-size': 19, class: 'ui', 'font-weight': 700 });
    return out;
  }
  function set(v) {
    const n = clamp(Math.round(v), MIN, MAX); if (n === off) return; off = n; moves++;
    const out = draw();
    if (out && !outSeen) { outSeen = true; say(ctx, `<ruby>高<rt>たか</rt></ruby>さが かたちの <b>そと</b>に でた。<ruby>底辺<rt>ていへん</rt></ruby>を のばして はかる。<ruby>面積<rt>めんせき</rt></ruby>は かわらない`); ctx.log('shear', { detail: { k, off, out } }); }
    else if (!out) ctx.caption('<ruby>底辺<rt>ていへん</rt></ruby>と <ruby>高<rt>たか</rt></ruby>さが おなじなら、<ruby>面積<rt>めんせき</rt></ruby>も おなじ', 0, '底辺と高さが同じなら、面積も同じ');
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="かたち"><button type="button" data-fig="tri" aria-pressed="true">さんかくけい</button><button type="button" data-fig="para" aria-pressed="false">へいこうしへんけい</button></div></div>
    ${sliderRow('shSl', { left: 'ひだり', right: 'みぎ', leftIcon: '', rightIcon: '', min: MIN, max: MAX, value: off, label: 'ちょうてんの いち' })}`;
  const sl = $p(panel, '#shSl');
  on(sl, 'input', () => { setSlider(sl, +sl.value); set(+sl.value); });
  $$p(panel, '[data-fig]').forEach(b => on(b, 'click', () => { if (b.dataset.fig === k) { sfx.tap(); ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } sfx.tap(); k = b.dataset.fig; outSeen = false; $$p(panel, '[data-fig]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, 'スライダーで ちょうてんを うごかして みよう'); }));
  F.onResize(draw);
  setSlider(sl, off); draw();
  say(ctx, 'スライダーで ちょうてんを うごかすと、<ruby>面積<rt>めんせき</rt></ruby>は かわる？');
  return { dispose() {}, test: { state: () => ({ k, off, moves, outSeen }), auto: () => (outSeen ? { done: true } : { slider: ['#shSl', moves ? MAX : 6] }) } };
}
