// masume の H6（6年 円の面積・およその面積）の場面：みる・円を細かく切って並べかえる（16→32→64）・方眼で数えて見積もる・およその形とみる。
import { el, C, txt, rect, line, path, circle, clear, clamp, tween, wait, E, dim, hanamaru } from './_flat.js';
import { stageBox, wide } from './_masume.js';
import { circlePieces, circleLayout, gridLines, polyD, say, approxOverlay, drawCircleQ } from './_hirosa-fig.js';
import { gridCount, polyArea, leafPts, blob, PI } from './_hirosa-gen.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const cancelAll = () => { newToken(); killTweens(); };
const EN = '<ruby>円<rt>えん</rt></ruby>', MEN = '<ruby>面積<rt>めんせき</rt></ruby>';
const r2 = v => Math.round(v * 100) / 100;

function stripLabels(g, L) {
  const { r, sx, sy } = L;
  dim(g, sx, sy + r + 16, sx + Math.PI * r, sy + r + 16, 'えんしゅうの はんぶん', { dy: 20, size: 14 });
  line(g, sx - 10, sy, sx - 10, sy + r, { stroke: C('sora'), 'stroke-width': 2.5 });
  txt(g, sx - 14, sy + r / 2 + 5, 'はんけい', { 'font-size': 14, class: 'ui', fill: C('sora'), 'text-anchor': 'end' });
}

/* ---------- みる（H6） ---------- */
export function miru(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let phase = 'play';
  async function run() {
    const tag = S.token, ok = () => alive(tag); phase = 'play';
    F.clearLayers(); const box = stageBox(F, { bottom: 10 }), L = circleLayout(F, box);
    say(ctx, `${EN}を こまかく きって ならべかえると…`);
    for (const N of [16, 32, 64]) {
      const g = F.layer('pieces'); clear(g); clear(F.layer('lab'));
      const cp = circlePieces(g, N, L.r, L.cx, L.cy, L.sx, L.sy);
      if (!(await wait(0.8)) || !ok()) return;
      await tween(1.8, e => cp.set(e), E.io); if (!ok()) return;
      say(ctx, `<b>${N}こ</b>に きると ${N === 64 ? 'ほとんど' : 'だんだん'} <ruby>長方形<rt>ちょうほうけい</rt></ruby>`); if (!(await wait(2)) || !ok()) return;
    }
    stripLabels(F.layer('lab'), L);
    say(ctx, `たては <ruby>半径<rt>はんけい</rt></ruby>、よこは <ruby>円周<rt>えんしゅう</rt></ruby>の はんぶん（<ruby>半径<rt>はんけい</rt></ruby> × 3.14）`); if (!(await wait(3.4)) || !ok()) return;
    say(ctx, `${EN}の ${MEN} ＝ <b><ruby>半径<rt>はんけい</rt></ruby> × <ruby>半径<rt>はんけい</rt></ruby> × 3.14</b>`); if (!(await wait(3.2)) || !ok()) return;
    // およその面積
    F.clearLayers();
    const u = Math.min((box.w - 40) / 12, (box.h - 40) / 7, 40), P = leafPts(6, 3.5, 10, 5.4), x0 = box.x + (box.w - 12 * u) / 2, y0 = box.y + (box.h - 7 * u) / 2;
    const g = F.layer('fig'); rect(g, x0, y0, 12 * u, 7 * u, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 }); gridLines(g, x0, y0, 12, 7, u, C('grid-line'));
    path(g, polyD(P.map(([x, y]) => [x0 + x * u, y0 + y * u])), { fill: C('leaf'), 'fill-opacity': 0.35, stroke: C('leaf'), 'stroke-width': 2.5 });
    say(ctx, 'はっぱの <ruby>面積<rt>めんせき</rt></ruby>は？ <b>方眼</b>で かぞえて みよう'); if (!(await wait(2)) || !ok()) return;
    const gc = gridCount(P), fx = F.layer('fx');
    for (const [x, y] of gc.full) { rect(fx, x0 + x * u + 1, y0 + y * u + 1, u - 2, u - 2, { fill: C('face-3'), opacity: 0.6 }); await wait(0.03); if (!ok()) return; }
    say(ctx, `なかに ぜんぶ はいる マスは <b>${gc.full.length}こ</b>`); if (!(await wait(1.6)) || !ok()) return;
    for (const [x, y] of gc.part) { rect(fx, x0 + x * u + 1, y0 + y * u + 1, u - 2, u - 2, { fill: C('face-2'), opacity: 0.45 }); await wait(0.02); if (!ok()) return; }
    say(ctx, `かかって いる マス ${gc.part.length}こは はんぶんと みて、${gc.full.length} ＋ ${gc.part.length} ÷ 2 ＝ <b>やく ${gc.est}cm²</b>`); if (!(await wait(3.6)) || !ok()) return;
    say(ctx, 'つぎは「さわる」で きって ならべて みよう'); ctx.log('miru'); phase = 'done';
  }
  panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); cancelAll(); run(); });
  F.onResize(() => { cancelAll(); run(); });
  run();
  return { dispose() {}, test: { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 500 }) } };
}

/* ---------- さわる：円を切って ならべかえる ---------- */
export function circlecut(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let N = 16, k = 0, cp = null, L = null, busy = false, plays = 0;
  function draw() {
    F.clearLayers(); L = circleLayout(F, stageBox(F, { bottom: 10 }));
    cp = circlePieces(F.layer('pieces'), N, L.r, L.cx, L.cy, L.sx, L.sy); cp.set(k);
    F.layer('lab'); if (k === 1) stripLabels(F.layer('lab'), L);
  }
  async function toggle() {
    if (busy) return; busy = true; ctx.hideHud(); sfx.tap(); const tag = S.token, from = k, to = 1 - k; clear(F.layer('lab'));
    await tween(1.6, e => cp.set(from + (to - from) * e), E.io); if (!alive(tag)) return;
    k = to; busy = false; plays++;
    if (k === 1) { stripLabels(F.layer('lab'), L); say(ctx, N >= 64 ? `${N}こに きると ほとんど <ruby>長方形<rt>ちょうほうけい</rt></ruby>。<ruby>半径<rt>はんけい</rt></ruby> × <ruby>半径<rt>はんけい</rt></ruby> × 3.14` : `${N}こ。もっと こまかく きると？`); ctx.log('circlecut', { detail: { N } }); }
    else say(ctx, `${EN}に もどした`);
    $p(panel, '[data-k="go"]').textContent = k ? 'もどす' : 'ならべかえる';
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="きる かず">${[8, 16, 32, 64].map(n => `<button type="button" data-n="${n}" aria-pressed="${n === N}">${n}こ</button>`).join('')}</div></div>
    <div class="row"><button class="btn big" type="button" data-k="go">ならべかえる</button></div>`;
  $$p(panel, '[data-n]').forEach(b => on(b, 'click', () => { if (+b.dataset.n === N) { sfx.tap(); ctx.toast('', `いまは「${N}こ」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; N = +b.dataset.n; k = 0; $p(panel, '[data-k="go"]').textContent = 'ならべかえる'; $$p(panel, '[data-n]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `${EN}を ${N}こに きったよ`); }));
  on($p(panel, '[data-k="go"]'), 'click', toggle);
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `${EN}を きって ならべかえると、どんな かたちに なるかな`);
  return { dispose() {}, test: { state: () => ({ N, k, plays, busy }), auto: () => (busy ? { wait: 300 } : plays < 2 ? { click: 'data-k=go|' } : { done: true }) } };
}
export { circlecut as circle };

/* ---------- さわる：方眼で かぞえて 見積もる ---------- */
const SHAPES = {
  leaf: { label: 'はっぱ', pts: () => leafPts(6, 3.5, 10, 5.4), col: () => C('leaf') },
  pond: { label: 'いけ', pts: () => blob(5.5, 3.6, 4.6, 2.9, [[3, 0.09, 0.4], [2, 0.06, 1.1], [5, 0.03, 0.2]]), col: () => C('water-deep') },
  circ: { label: 'えん', pts: () => blob(5.5, 3.5, 3, 3, [], 96), col: () => C('hint') },
};
export function estimate(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let sk = 'leaf', gs = 1, busy = false, counts = 0, G = null;
  const W = 11, Hh = 7;
  function draw() {
    F.clearLayers(); const box = stageBox(F, { bottom: 10 }), u = Math.min((box.w - 30) / W, (box.h - 40) / Hh, 46), x0 = box.x + (box.w - W * u) / 2, y0 = box.y + (box.h - 30 - Hh * u) / 2;
    G = { u, x0, y0 }; const g = F.layer('fig');
    rect(g, x0, y0, W * u, Hh * u, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 });
    gridLines(g, x0, y0, W / gs, Hh / gs, u * gs, C('grid-line'));
    const P = SHAPES[sk].pts();
    path(g, polyD(P.map(([x, y]) => [x0 + x * u, y0 + y * u])), { fill: SHAPES[sk].col(), 'fill-opacity': 0.3, stroke: SHAPES[sk].col(), 'stroke-width': 2.5 });
    F.layer('fx');
  }
  async function count() {
    if (busy) return; busy = true; ctx.hideHud(); sfx.tap(); const tag = S.token, fx = F.layer('fx'); clear(fx);
    const P = SHAPES[sk].pts().map(([x, y]) => [x / gs, y / gs]), gc = gridCount(P), c = G.u * gs, per = clamp(1.4 / (gc.full.length + gc.part.length), 0.01, 0.06);
    for (const [x, y] of gc.full) { rect(fx, G.x0 + x * c + 1, G.y0 + y * c + 1, c - 2, c - 2, { fill: C('face-3'), opacity: 0.6 }); if (!(await wait(per)) || !alive(tag)) return; }
    for (const [x, y] of gc.part) { rect(fx, G.x0 + x * c + 1, G.y0 + y * c + 1, c - 2, c - 2, { fill: C('face-2'), opacity: 0.45 }); if (!(await wait(per)) || !alive(tag)) return; }
    const est = r2(gc.est * gs * gs), tru = r2(polyArea(SHAPES[sk].pts()));
    const unit = gs === 1 ? '1cm²' : '0.25cm²';
    say(ctx, `なか ${gc.full.length}こ ＋ かかる ${gc.part.length}こ ÷ 2 ＝ ${gc.est}こ（1こ ${unit}）→ <b>やく ${est}cm²</b>`);
    txt(fx, F.W / 2, G.y0 + Hh * G.u + 24, `みつもり やく ${est}cm²　｜　ほんとうは やく ${Math.round(tru * 10) / 10}cm²`, { 'font-size': 16, class: 'ui', fill: C('ink') });
    counts++; busy = false; ctx.log('estimate-grid', { detail: { shape: sk, gs, est, tru } });
    if (gs === 0.5) setTimeout(() => { if (alive(tag) && !busy) say(ctx, 'マスを ちいさく すると、ほんとうの ひろさに ちかく なる'); }, 2600);
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="かたち">${Object.entries(SHAPES).map(([k, s]) => `<button type="button" data-sh="${k}" aria-pressed="${k === sk}">${s.label}</button>`).join('')}</div><div class="seg" role="group" aria-label="マスの おおきさ"><button type="button" data-gs="1" aria-pressed="true">1cm の マス</button><button type="button" data-gs="0.5" aria-pressed="false">5mm の マス</button></div></div>
    <div class="row"><button class="btn big" type="button" data-k="count">かぞえる</button></div>`;
  $$p(panel, '[data-sh]').forEach(b => on(b, 'click', () => { if (b.dataset.sh === sk) { sfx.tap(); ctx.toast('', `いまは「${SHAPES[sk].label}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; sk = b.dataset.sh; $$p(panel, '[data-sh]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `${SHAPES[sk].label}の ${MEN}を 方眼で みつもろう`); }));
  $$p(panel, '[data-gs]').forEach(b => on(b, 'click', () => { if (+b.dataset.gs === gs) { sfx.tap(); ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; gs = +b.dataset.gs; $$p(panel, '[data-gs]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, gs === 1 ? '1cm の マスで かぞえよう' : 'マスを 5mm に すると？'); }));
  on($p(panel, '[data-k="count"]'), 'click', count);
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `ぜんぶ はいる マスは 1こ、かかる マスは はんぶんと みて ${MEN}を みつもろう`);
  return { dispose() {}, test: { state: () => ({ sk, gs, counts, busy }), auto: () => (busy ? { wait: 300 } : counts < 1 ? { click: 'data-k=count|' } : { done: true }) } };
}

/* ---------- さわる：およその形とみる（いけ＝円・しま＝三角形・はたけ＝平行四辺形） ---------- */
const AQ = {
  pond: { label: 'いけ', shape: { s: 'circle', a: 30, name: 'えん' } },
  island: { label: 'しま', shape: { s: 'tri', a: 12, b: 8, name: 'さんかくけい' } },
  field: { label: 'はたけ', shape: { s: 'para', a: 9, b: 5, name: 'へいこうしへんけい' } },
};
export function approx(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let k = 'pond', d = null, step = 0, busy = false;
  const ansOf = sh => (sh.s === 'circle' ? r2(sh.a * sh.a * PI) : sh.s === 'tri' ? sh.a * sh.b / 2 : sh.a * sh.b);
  function draw() {
    F.clearLayers(); step = 0;
    const box = stageBox(F, { bottom: 12 }), q = { k: 'approx', shape: AQ[k].shape };
    d = drawApproxShape(F, box, q); F.layer('ov'); F.layer('fx');
  }
  async function over() {
    if (busy) return; if (step >= 1) { sfx.off(); ctx.toast('', 'もう かさねたよ。「めんせきを もとめる」を おそう', 1.8); return; }
    busy = true; sfx.tap(); const tag = S.token, g = approxOverlay(F, d, { shape: AQ[k].shape }, 0);
    await tween(0.8, e => g.setAttribute('opacity', e)); if (!alive(tag)) return;
    step = 1; busy = false; const sh = AQ[k].shape;
    say(ctx, `${AQ[k].label}を <b>${sh.name}</b>と みる`);
  }
  async function calc() {
    if (busy) return; if (step < 1) { await over(); if (step < 1) return; }
    busy = true; const tag = S.token, sh = AQ[k].shape, fx = F.layer('fx'), a = ansOf(sh);
    const fill = sh.s === 'circle' ? circle(fx, d.cx, d.cy, d.R, { fill: C('ok'), opacity: 0 }) : path(fx, polyD(d.base), { fill: C('ok'), opacity: 0 });
    await tween(0.7, e => fill.setAttribute('opacity', 0.25 * e)); if (!alive(tag)) return;
    say(ctx, sh.s === 'circle' ? `${sh.a} × ${sh.a} × 3.14 ＝ <b>やく ${a}m²</b>` : sh.s === 'tri' ? `${sh.a} × ${sh.b} ÷ 2 ＝ <b>やく ${a}km²</b>` : `${sh.a} × ${sh.b} ＝ <b>やく ${a}km²</b>`);
    step = 2; busy = false; ctx.log('approx', { detail: { shape: k, a } });
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="ばしょ">${Object.entries(AQ).map(([kk, v]) => `<button type="button" data-ap="${kk}" aria-pressed="${kk === k}">${v.label}</button>`).join('')}</div></div>
    <div class="row"><button class="btn small" type="button" data-k="over">かたちを かさねる</button><button class="btn small" type="button" data-k="calc">めんせきを もとめる</button></div>`;
  $$p(panel, '[data-ap]').forEach(b => on(b, 'click', () => { if (b.dataset.ap === k) { sfx.tap(); ctx.toast('', `いまは「${AQ[k].label}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; k = b.dataset.ap; $$p(panel, '[data-ap]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `${AQ[k].label}は どんな かたちに みえる？`); }));
  on($p(panel, '[data-k="over"]'), 'click', over);
  on($p(panel, '[data-k="calc"]'), 'click', () => { sfx.tap(); calc(); });
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, 'いけや しまの かたちを、かんたんな かたちと みて <ruby>面積<rt>めんせき</rt></ruby>を もとめよう');
  return { dispose() {}, test: { state: () => ({ k, step, busy }), auto: () => (busy ? { wait: 300 } : step < 2 ? { click: 'data-k=calc|' } : { done: true }) } };
}
// 問題（masume-quiz の circle）と同じ絵。重ねる形は「かさねる」まで出さない
function drawApproxShape(F, box, q) { const d = drawCircleQ(F, box, q); clear(F.layer('ov')); return d; }
