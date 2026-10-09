// masume の H4（4年 面積）の場面：みる・cm²タイル（たて×よこ）・ズーム（1m²＝10000cm²、a・ha・km²）・まわりが同じ長方形・L字・面積が決まった長方形。
import { el, C, txt, rect, line, path, circle, clear, clamp, lerp, tween, wait, E, hanamaru, tapOf } from './_flat.js';
import { stageBox, wide } from './_masume.js';
import { rectsOfArea, rectsOfPerim, rectKey } from './_hirosa-gen.js';
import { drawRectTiles, rowTiles, drawLQ, lVerify, unitDiagram, unitVerify, gridLines, polyD, say } from './_hirosa-fig.js';
import { bench, yaku } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive, newToken, killTweens } from '../stage/stage.js';
import { $p, $$p, on, sliderRow, setSlider } from './_common.js';

const MEN = '<ruby>面積<rt>めんせき</rt></ruby>';
const cancelAll = () => { newToken(); killTweens(); };

/* ---------- みる（H4） ---------- */
export function miru(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let phase = 'play';
  async function run() {
    const tag = S.token, ok = () => alive(tag); phase = 'play';
    F.clearLayers(); const box = stageBox(F, { bottom: 10 });
    // 1cm²
    { const g = F.layer('fig'), s = Math.min(90, box.h * 0.4), x = box.x + box.w / 2 - s / 2, y = box.y + box.h / 2 - s / 2;
      const t = rect(g, x, y, s, s, { fill: C('cell-b'), stroke: C('hint'), 'stroke-width': 2, opacity: 0 });
      txt(g, x + s / 2, y + s + 24, '1cm', { 'font-size': 16, class: 'ui', fill: C('ink-soft') }); txt(g, x - 10, y + s / 2 + 5, '1cm', { 'font-size': 16, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
      await tween(0.6, e => t.setAttribute('opacity', e)); if (!ok()) return; }
    say(ctx, `1ぺんが 1cm の ましかくの ひろさを <b>1cm²</b>（1へいほうセンチメートル）と いう`); if (!(await wait(3.4)) || !ok()) return;
    F.clearLayers();
    const d = drawRectTiles(F, box, [{ h: 3, w: 4, col: C('sora') }], { grid: false, dims: true });
    say(ctx, `この <ruby>長方形<rt>ちょうほうけい</rt></ruby>に 1cm² の タイルを しいて みよう`); if (!(await wait(1.6)) || !ok()) return;
    await rowTiles(F, d.rects[0], sfx); if (!ok()) return;
    say(ctx, `4こ が 3れつ。<b>たて × よこ ＝ 3 × 4 ＝ 12cm²</b>`); if (!(await wait(3.4)) || !ok()) return;
    F.clearLayers();
    const U = unitDiagram(F, box, { q: '1m² は なん cm²？' });
    say(ctx, `1ぺんが 1m の ましかくは <b>1m²</b>。なかに 1cm² は いくつ？`); if (!(await wait(2.6)) || !ok()) return;
    await unitVerify(F, U, { q: '1m² は なん cm²？' }, ctx); if (!ok()) return;
    say(ctx, `1m² ＝ <b>10000cm²</b>。100cm² では ない`); if (!(await wait(3)) || !ok()) return;
    // まわりが同じでも
    F.clearLayers();
    const g = F.layer('fig'), u = Math.min((box.w - 120) / 9, (box.h - 80) / 5, 40), x0 = box.x + (box.w - 9 * u) / 2, y0 = box.y + 20;
    const r = rect(g, x0, y0, 9 * u, u, { fill: C('face-3'), 'fill-opacity': 0.25, stroke: C('face-3'), 'stroke-width': 3 }), lab = txt(g, box.x + box.w / 2, y0 + 5 * u + 40, '', { 'font-size': 18, class: 'ui' });
    let gl = null;
    const setR = (h, w) => { r.setAttribute('width', Math.max(0, w * u)); r.setAttribute('height', Math.max(0, h * u)); lab.textContent = `まわり 20cm・${Math.round(h * w)}cm²`; };
    say(ctx, `まわりの ながさが どれも 20cm の <ruby>長方形<rt>ちょうほうけい</rt></ruby>`);
    for (const [h0, w0, h1, w1] of [[1, 9, 3, 7], [3, 7, 5, 5]]) {
      setR(h0, w0); if (!(await wait(1.4)) || !ok()) return;
      await tween(1.4, e => setR(lerp(h0, h1, e), lerp(w0, w1, e)), E.io); if (!ok()) return;
      if (gl) gl.remove(); gl = gridLines(g, x0, y0, w1, h1, u, C('ink'), 0.2);
      say(ctx, `たて ${h1} × よこ ${w1} ＝ <b>${h1 * w1}cm²</b>`);
    }
    if (!(await wait(2)) || !ok()) return;
    say(ctx, `まわりが おなじでも ${MEN}は ちがう。<ruby>正方形<rt>せいほうけい</rt></ruby>が いちばん ひろい`); if (!(await wait(3.2)) || !ok()) return;
    say(ctx, `つぎは「さわる」で タイルを しいて みよう`); ctx.log('miru'); phase = 'done';
  }
  panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); cancelAll(); run(); });
  F.onResize(() => { cancelAll(); run(); });
  run();
  return { dispose() {}, test: { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 500 }) } };
}

/* ---------- さわる：cm²タイル（たて × よこ） ---------- */
export function tile(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let h = 3, w = 5, d = null, busy = false, tiled = 0, changed = 0, maxH = 6, maxW = 10;
  function draw() {
    F.clearLayers(); const box = stageBox(F, { bottom: 10 });
    maxW = wide(F) ? 12 : 7; maxH = wide(F) ? 6 : 8; h = clamp(h, 1, maxH); w = clamp(w, 1, maxW);
    // 方眼（1cm）の上に長方形。大きさを変えても マスの大きさは同じ
    const u = Math.max(14, Math.min((box.w - 130) / maxW, (box.h - 70) / maxH, 46)), x0 = box.x + (box.w - maxW * u) / 2 + 30, y0 = box.y + (box.h - maxH * u) / 2 - 10;
    const g = F.layer('fig');
    rect(g, x0, y0, maxW * u, maxH * u, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 });
    gridLines(g, x0, y0, maxW, maxH, u, C('grid-line'));
    d = { x: x0, y: y0, u, h, w, col: C('sora') };
    d.g = el('g', {}, g);
    rect(d.g, x0, y0, w * u, h * u, { fill: C('sora'), 'fill-opacity': 0.12, stroke: C('sora'), 'stroke-width': 3 });
    txt(d.g, x0 + w * u / 2, y0 - 10, `よこ ${w}cm`, { 'font-size': 16, class: 'ui', fill: C('ink-soft') });
    txt(d.g, x0 - 10, y0 + h * u / 2 + 5, `たて ${h}cm`, { 'font-size': 16, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
    d.tl = el('g', {}, d.g);
    d.f = txt(F.layer('fx'), box.x + box.w / 2, y0 + maxH * u + 34, '', { 'font-size': 20, class: 'ui', 'font-weight': 700 });
  }
  async function doTile() {
    if (busy) return; busy = true; ctx.hideHud(); const tag = S.token; sfx.tap();
    await rowTiles(F, d, sfx); if (!alive(tag)) return;
    d.f.textContent = `たて × よこ ＝ ${h} × ${w} ＝ ${h * w}cm²`;
    say(ctx, `${w}こ が ${h}れつ。${h} × ${w} ＝ <b>${h * w}cm²</b>`);
    tiled++; busy = false; ctx.log('tile', { detail: { h, w } });
  }
  const step = (k, v) => { if (busy) return; sfx.tap(); if (k === 'h') { const n = clamp(h + v, 1, maxH); if (n === h) { ctx.toast('', v > 0 ? 'これより ながく できないよ' : '1cm より みじかく できないよ', 1.6); return; } h = n; } else { const n = clamp(w + v, 1, maxW); if (n === w) { ctx.toast('', v > 0 ? 'これより ながく できないよ' : '1cm より みじかく できないよ', 1.6); return; } w = n; } changed++; draw(); ctx.caption(`たて ${h}cm、よこ ${w}cm。「タイルを しく」で しらべよう`, 0, `たて${h}センチ、よこ${w}センチ`); };
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="たて"><button type="button" data-dim="h" data-d="-1">たて −</button><button type="button" data-dim="h" data-d="1">たて ＋</button></div><div class="seg" role="group" aria-label="よこ"><button type="button" data-dim="w" data-d="-1">よこ −</button><button type="button" data-dim="w" data-d="1">よこ ＋</button></div></div>
    <div class="row"><button class="btn big" type="button" data-k="tile">タイルを しく</button></div>`;
  $$p(panel, '[data-dim]').forEach(b => on(b, 'click', () => step(b.dataset.dim, +b.dataset.d)));
  on($p(panel, '[data-k="tile"]'), 'click', doTile);
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  ctx.caption(`1cm² の タイルを しいて、${MEN}を しらべよう`, 0, '1平方センチメートルのタイルを敷いて、面積を調べよう');
  return { dispose() {}, test: { state: () => ({ h, w, tiled, changed, busy }), auto: () => (busy ? { wait: 300 } : !tiled ? { click: 'data-k=tile|' } : { done: true }) } };
}

/* ---------- さわる：ズーム（1m²＝10000cm²・a・ha・km²） ---------- */
const LADDER = {
  cm: [{ side: '1cm', area: '1cm²', n: 1 }, { side: '10cm', area: '100cm²' }, { side: '1m（100cm）', area: '1m²＝10000cm²' }],
  m: [{ side: '1m', area: '1m²' }, { side: '10m', area: '1a（アール）＝100m²', ex: 'classroom' }, { side: '100m', area: '1ha（ヘクタール）＝100a＝10000m²', ex: 'schoolyard' }, { side: '1km（1000m）', area: '1km²＝100ha', ex: 'town' }],
};
export function zoom(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let sc = ctx.opts.scale || 'cm', lv = 0, busy = false, moves = 0;
  const L = () => LADDER[sc];
  function geo() { const box = stageBox(F, { bottom: 10 }), s = Math.max(100, Math.min(box.h - 76, box.w - 60, 360)); return { box, s, x: box.x + (box.w - s) / 2, y: box.y + 6 }; }
  function draw() {
    F.clearLayers(); const { box, s, x, y } = geo(), g = F.layer('fig'), it = L()[lv];
    rect(g, x, y, s, s, { fill: C('paper'), stroke: C('ink'), 'stroke-width': 3 });
    if (lv > 0) { gridLines(g, x, y, 10, 10, s / 10, C('tile')); rect(g, x, y, s / 10, s / 10, { fill: C('cell-b'), stroke: C('hint'), 'stroke-width': 1.5 }); }
    else rect(g, x + 2, y + 2, s - 4, s - 4, { fill: C('cell-b'), opacity: 0.6 });
    // 例（基準物の広さ）
    if (it.ex && it.ex !== 'town') { const b = bench(it.ex); if (b && b.area_cm2) { const m2 = b.area_cm2 / 10000, sideM = sc === 'm' ? [1, 10, 100, 1000][lv] : 1, k = Math.sqrt(m2) / sideM, rw = Math.min(0.95, k) * s, rh = rw; rect(g, x + s - rw - 6, y + s - rh - 6, rw, rh, { fill: C('face-3'), opacity: 0.35, stroke: C('leaf'), 'stroke-width': 2 }); txt(g, x + s - rw / 2 - 6, y + s - rh / 2, `${b.name}`, { 'font-size': 14, class: 'ui', fill: C('ink') }); txt(g, x + s - rw / 2 - 6, y + s - rh / 2 + 18, `${yaku(b)}${m2}m²`, { 'font-size': 13, class: 'ui', fill: C('ink-soft') }); } }
    if (it.ex === 'town') { for (let i = 0; i < 7; i++) { const hx = x + s * (0.15 + 0.1 * i), hy = y + s * (0.6 + 0.05 * Math.sin(i * 2)); rect(g, hx, hy, s * 0.06, s * 0.05, { fill: C('house'), stroke: C('ink-soft'), 'stroke-width': 1 }); } txt(g, x + s * 0.5, y + s * 0.5, 'まちの いちぶ', { 'font-size': 15, class: 'ui', fill: C('ink-soft') }); }
    txt(g, x + s / 2, y + s + 24, `1ぺん ${it.side}`, { 'font-size': 16, class: 'ui', fill: C('ink-soft') });
    txt(g, x + s / 2, y + s + 50, it.area, { 'font-size': 19, class: 'ui', 'font-weight': 700, fill: C('ink') });
    if (lv > 0) txt(g, x + s / 10 + 6, y + s / 20 + 5, L()[lv - 1].area.split('＝')[0], { 'font-size': 12, class: 'ui', fill: C('hint-ink'), 'text-anchor': 'start' });
    F.layer('fx');
  }
  async function go(d) {
    if (busy) return; const n = lv + d;
    if (n < 0 || n >= L().length) { sfx.off(); ctx.toast('', d > 0 ? 'これより はなれられないよ' : 'これより ちかづけないよ', 1.6); return; }
    busy = true; ctx.hideHud(); sfx.tap(); const tag = S.token, { s, x, y } = geo();
    const fx = F.layer('fx'), fr = rect(fx, x, y, s, s, { fill: 'none', stroke: C('ok'), 'stroke-width': 4 });
    // はなれる：いまの正方形が 左上の1マスに ちぢむ／ちかづく：左上の1マスが ひろがる
    await tween(0.9, e => { const k = d > 0 ? lerp(1, 0.1, e) : lerp(0.1, 1, e); fr.setAttribute('width', Math.max(0, s * k)); fr.setAttribute('height', Math.max(0, s * k)); }, E.io);
    if (!alive(tag)) return;
    lv = n; moves++; draw(); busy = false;
    const it = L()[lv];
    say(ctx, lv === 0 ? `1ぺん ${it.side} の ましかくが <b>${it.area}</b>` : `1ぺん ${it.side} の ましかくには、${L()[lv - 1].area.split('＝')[0]} が 10 × 10 ＝ <b>100こ</b>。${it.area}`);
    ctx.log('zoom', { detail: { sc, lv } });
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="たんい"><button type="button" data-sc="cm" aria-pressed="${sc === 'cm'}">cm² と m²</button><button type="button" data-sc="m" aria-pressed="${sc === 'm'}">a・ha・km²</button></div></div>
    <div class="row"><button class="btn sub small" type="button" data-k="in">ちかづく</button><button class="btn small" type="button" data-k="out">はなれる</button><button class="btn sub small" type="button" data-k="count">100こを かぞえる</button></div>`;
  $$p(panel, '[data-sc]').forEach(b => on(b, 'click', () => { if (b.dataset.sc === sc) { sfx.tap(); ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; sc = b.dataset.sc; lv = 0; $$p(panel, '[data-sc]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `1ぺん ${L()[0].side} の ましかく。「はなれる」で ひろく して いこう`); }));
  on($p(panel, '[data-k="in"]'), 'click', () => go(-1));
  on($p(panel, '[data-k="out"]'), 'click', () => go(1));
  on($p(panel, '[data-k="count"]'), 'click', async () => {
    if (busy) return; if (lv === 0) { sfx.off(); ctx.toast('', 'さきに「はなれる」を おしてね', 1.6); return; }
    busy = true; sfx.tap(); const tag = S.token, { s, x, y } = geo(), fx = F.layer('fx'), c = s / 10; clear(fx);
    for (let j = 0; j < 10; j++) { for (let i = 0; i < 10; i++) rect(fx, x + i * c + 1, y + j * c + 1, c - 2, c - 2, { fill: C('cell-b'), opacity: 0.6 }); sfx.tick(j); txt(fx, x + s + 8, y + j * c + c * 0.7, `${(j + 1) * 10}`, { 'font-size': 12, class: 'ui', fill: C('hint-ink'), 'text-anchor': 'start' }); if (!(await wait(0.16)) || !alive(tag)) return; }
    busy = false; say(ctx, `10こ × 10れつ ＝ <b>100こ</b>`);
  });
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, sc === 'cm' ? '1cm² から 「はなれる」で ひろく して いこう' : '1m² から 「はなれる」で ひろく して いこう');
  return { dispose() {}, test: { state: () => ({ sc, lv, moves, busy }), auto: () => (busy ? { wait: 300 } : lv < L().length - 1 ? { click: 'data-k=out|' } : { done: true }) } };
}

/* ---------- さわる／つくる：まわりの長さが同じ長方形（スライダー）・いちばん広い形 ---------- */
export function sameperim(ctx) {
  const { panel, sfx, ICON, opts } = ctx;
  const F = ctx.openFlat();
  const goal = !!opts.goal;
  let P = 20, w = 1, found = false, moves = 0, best = 0;
  const R = () => rectsOfPerim(P);
  function draw() {
    F.clearLayers(); const box = stageBox(F, { bottom: 10 }), h = P / 2 - w, side = wide(F) || box.w > box.h * 1.3, maxS = P / 2 - 1;
    const area = side ? { x: box.x, y: box.y, w: box.w * 0.6, h: box.h } : { x: box.x, y: box.y, w: box.w, h: box.h * 0.62 };
    const u = Math.max(8, Math.min((area.w - 70) / maxS, (area.h - 60) / maxS, 34)), x0 = area.x + (area.w - w * u) / 2 + 16, y0 = area.y + (area.h - h * u) / 2 - 6;
    const g = F.layer('fig');
    rect(g, x0, y0, w * u, h * u, { fill: C('face-3'), 'fill-opacity': 0.22, stroke: C('leaf'), 'stroke-width': 3 });
    gridLines(g, x0, y0, w, h, u, C('ink'), 0.18);
    txt(g, x0 + w * u / 2, y0 - 10, `よこ ${w}cm`, { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
    txt(g, x0 - 8, y0 + h * u / 2 + 5, `たて ${h}cm`, { 'font-size': 15, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
    // ぼうグラフ（よこの長さごとの面積）
    const all = []; for (let k = 1; k <= maxS; k++) all.push({ w: k, a: k * (P / 2 - k) });
    best = Math.max(...all.map(x => x.a));
    const gb = side ? { x: box.x + box.w * 0.63, y: box.y + 28, w: box.w * 0.35, h: box.h - 58 } : { x: box.x + 10, y: box.y + box.h * 0.66 + 16, w: box.w - 20, h: box.h * 0.32 - 42 };
    const bw = gb.w / all.length;
    const bg = F.layer('graph');
    line(bg, gb.x, gb.y + gb.h, gb.x + gb.w, gb.y + gb.h, { stroke: C('ink-soft'), 'stroke-width': 1.5 });
    for (const [i, x] of all.entries()) {
      const bh = Math.max(0, gb.h * x.a / best), cur = x.w === w;
      rect(bg, gb.x + i * bw + 2, gb.y + gb.h - bh, Math.max(0, bw - 4), bh, { rx: 3, fill: cur ? C('leaf') : C('face-3'), opacity: cur ? 0.95 : 0.35 });
      if (bw >= 16) txt(bg, gb.x + i * bw + bw / 2, gb.y + gb.h + 16, String(x.w), { 'font-size': 11, class: 'ui', fill: C('ink-soft') });
    }
    txt(bg, gb.x, gb.y - 10, 'めんせき', { 'font-size': 12, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'start' });
    txt(F.layer('fx'), area.x + area.w / 2, area.y + area.h - 6, `まわり ${P}cm・${w * h}cm²`, { 'font-size': 18, class: 'ui', 'font-weight': 700 });
  }
  function set(v, fromSlider) {
    const nw = clamp(Math.round(v), 1, P / 2 - 1); if (nw === w && fromSlider) return;
    w = nw; moves++; draw();
    const h = P / 2 - w, a = w * h;
    if (goal && a === best && !found) {
      found = true; sfx.good(); hanamaru(F.svg, F.W / 2, (F.top + F.bottom) / 2, 60);
      ctx.toast(ICON.HANAMARU, `いちばん ひろいのは たて ${h}cm・よこ ${w}cm の <ruby>正方形<rt>せいほうけい</rt></ruby>（${a}cm²）`, 3.4, unitSpeech(`一番広いのはたて${h}cm、よこ${w}cmの正方形。${a}cm²`));
      ctx.log('maxrect', { correct: true, detail: { P, h, w, a } }); ctx.done('maxrect');
    } else ctx.caption(`たて ${h}cm × よこ ${w}cm ＝ <b>${a}cm²</b>`, 0, unitSpeech(`たて${h}cm、よこ${w}cm、${a}cm²`));
    if (!goal) ctx.log('perim', { detail: { P, w, a } });
  }
  const PS = [16, 20, 24];
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="まわりの ながさ">${PS.map(p => `<button type="button" data-p="${p}" aria-pressed="${p === P}">まわり ${p}cm</button>`).join('')}</div></div>
    ${sliderRow('hsl', { left: 'ほそい', right: 'ふとい', leftIcon: '', rightIcon: '', min: 1, max: P / 2 - 1, value: w, label: 'よこの ながさ' })}`;
  const sl = $p(panel, '#hsl');
  const syncSl = () => { sl.max = P / 2 - 1; setSlider(sl, w); };
  on(sl, 'input', () => { setSlider(sl, +sl.value); set(+sl.value, true); });
  $$p(panel, '[data-p]').forEach(b => on(b, 'click', () => { if (+b.dataset.p === P) { sfx.tap(); ctx.toast('', `いまは「まわり ${P}cm」だよ`, 1.6); return; } sfx.tap(); P = +b.dataset.p; w = 1; found = false; $$p(panel, '[data-p]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); syncSl(); draw(); ctx.caption(goal ? `まわり ${P}cm で いちばん ひろい <ruby>長方形<rt>ちょうほうけい</rt></ruby>を さがそう` : `まわり ${P}cm の <ruby>長方形<rt>ちょうほうけい</rt></ruby>。スライダーで かえて みよう`, 0, `まわり${P}センチの長方形`); }));
  F.onResize(draw);
  syncSl(); draw();
  ctx.caption(goal ? `まわりが ${P}cm で いちばん ひろい <ruby>長方形<rt>ちょうほうけい</rt></ruby>を さがそう` : `まわりの ながさは おなじ ${P}cm。スライダーで かたちを かえて みよう`, 0, goal ? `まわりが${P}センチで一番広い長方形を探そう` : 'まわりの長さは同じ。スライダーで形を変えてみよう');
  return { dispose() {}, test: { state: () => ({ P, w, found, moves }), auto: () => (goal ? (found ? { done: true } : { slider: ['#hsl', P / 4 === Math.floor(P / 4) ? P / 4 : Math.floor(P / 4)] }) : moves >= 2 ? { done: true } : { slider: ['#hsl', moves ? 2 : P / 4] }) } };
}

/* ---------- さわる：L字の形（わける・ひく） ---------- */
const LS = [{ H: 6, W: 8, nh: 2, nw: 3 }, { H: 7, W: 6, nh: 3, nw: 2 }, { H: 5, W: 9, nh: 2, nw: 4 }];
export function lshape(ctx) {
  const { panel, sfx } = ctx;
  const F = ctx.openFlat();
  let li = 0, how = 'v', d = null, busy = false, plays = 0;
  const q = () => Object.assign({ ans: LS[li].H * LS[li].W - LS[li].nh * LS[li].nw }, LS[li]);
  function draw() { F.clearLayers(); const Q = q(); d = drawLQ(F, stageBox(F, { bottom: 16 }), Q); const gg = F.layer('grid'); gridLines(gg, d.x0, d.y0, Q.W - Q.nw, Q.H, d.u, C('ink'), 0.14); gridLines(gg, d.x0 + (Q.W - Q.nw) * d.u, d.y0 + Q.nh * d.u, Q.nw, Q.H - Q.nh, d.u, C('ink'), 0.14); F.layer('fx'); }
  async function play() {
    if (busy) return; busy = true; ctx.hideHud(); sfx.tap(); const tag = S.token, Q = q(), { H, W, nh, nw } = Q, { x0, y0, u } = d, fx = F.layer('fx'); clear(fx);
    if (how === 'v') { await lVerifyPart(fx, d, Q, 'v', tag); if (!alive(tag)) return; say(ctx, `${W - nw}×${H} ＋ ${nw}×${H - nh} ＝ <b>${Q.ans}cm²</b>`); }
    else if (how === 'h') { await lVerifyPart(fx, d, Q, 'h', tag); if (!alive(tag)) return; say(ctx, `${W - nw}×${nh} ＋ ${W}×${H - nh} ＝ <b>${Q.ans}cm²</b>`); }
    else {
      const big = rect(fx, x0, y0, W * u, H * u, { fill: 'none', stroke: C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '6 5', opacity: 0 }), notch = rect(fx, x0 + (W - nw) * u, y0, nw * u, nh * u, { fill: C('ok'), opacity: 0 });
      await tween(0.8, e => { big.setAttribute('opacity', e); notch.setAttribute('opacity', 0.3 * e); }); if (!alive(tag)) return;
      say(ctx, `おおきい <ruby>長方形<rt>ちょうほうけい</rt></ruby>から ひく。${H}×${W} − ${nh}×${nw} ＝ <b>${Q.ans}cm²</b>`);
    }
    plays++; busy = false; ctx.log('lshape', { detail: { how, ans: Q.ans } });
  }
  const HOW = { v: 'たてに わける', h: 'よこに わける', sub: 'ひく' };
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="もとめかた">${Object.entries(HOW).map(([k, l]) => `<button type="button" data-how="${k}" aria-pressed="${k === how}">${l}</button>`).join('')}</div></div>
    <div class="row"><button class="btn big" type="button" data-k="play">やって みる</button><button class="btn sub small" type="button" data-k="shape">かたちを かえる</button></div>`;
  $$p(panel, '[data-how]').forEach(b => on(b, 'click', () => { if (b.dataset.how === how) { sfx.tap(); ctx.toast('', `いまは「${HOW[how]}」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; how = b.dataset.how; $$p(panel, '[data-how]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); play(); }));
  on($p(panel, '[data-k="play"]'), 'click', play);
  on($p(panel, '[data-k="shape"]'), 'click', () => { sfx.tap(); cancelAll(); busy = false; li = (li + 1) % LS.length; draw(); say(ctx, `この かたちの ${MEN}は？「${HOW[how]}」で もとめよう`); });
  F.onResize(() => { cancelAll(); busy = false; draw(); });
  draw();
  say(ctx, `L の かたちの ${MEN}。<ruby>長方形<rt>ちょうほうけい</rt></ruby>に わけたり、ひいたり して もとめよう`);
  return { dispose() {}, test: { state: () => ({ how, plays, busy }), auto: () => (busy ? { wait: 300 } : plays < 1 ? { click: 'data-k=play|' } : { done: true }) } };
}
async function lVerifyPart(fx, d, Q, how, tag) {
  const { H, W, nh, nw } = Q, { x0, y0, u } = d;
  const v = how === 'v', cut = v ? line(fx, x0 + (W - nw) * u, y0 + nh * u, x0 + (W - nw) * u, y0 + nh * u, { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' }) : line(fx, x0, y0 + nh * u, x0, y0 + nh * u, { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
  await tween(0.6, e => { if (v) cut.setAttribute('y2', y0 + nh * u + (H - nh) * u * e); else cut.setAttribute('x2', x0 + (W - nw) * u * e); }, E.io); if (!alive(tag)) return;
  const A = v ? rect(fx, x0, y0, (W - nw) * u, H * u, { fill: C('face-2'), opacity: 0.4 }) : rect(fx, x0, y0, (W - nw) * u, nh * u, { fill: C('face-2'), opacity: 0.4 });
  const B = v ? rect(fx, x0 + (W - nw) * u, y0 + nh * u, nw * u, (H - nh) * u, { fill: C('face-3'), opacity: 0.45 }) : rect(fx, x0, y0 + nh * u, W * u, (H - nh) * u, { fill: C('face-3'), opacity: 0.45 });
  await tween(0.5, e => B.setAttribute('transform', v ? `translate(${10 * e},0)` : `translate(0,${10 * e})`), E.io);
}

/* ---------- つくる：面積が決まった長方形をすべて ---------- */
export function rects(ctx) {
  const { panel, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let A = 12, h = 2, w = 3, busy = false, made = 0, autoStep = 0, shelf = [];
  const st = {};
  const items = () => ((ctx.unit.zukan || []).find(z => z.id === 'h4-rects') || { items: [] }).items.filter(it => it.id.startsWith(A + ':'));
  const found = () => new Set(ctx.zukanList('h4-rects'));
  function draw() {
    F.clearLayers(); const box = stageBox(F, { bottom: 10 }), side = wide(F) || box.w > box.h * 1.3;
    const area = side ? { x: box.x, y: box.y, w: box.w * 0.64, h: box.h } : { x: box.x, y: box.y, w: box.w, h: box.h * 0.66 };
    const u = Math.max(4, Math.min((area.w - 90) / Math.max(w, 6), (area.h - 70) / Math.max(h, 4), 40)), x0 = area.x + (area.w - w * u) / 2 + 20, y0 = area.y + (area.h - h * u) / 2 - 8;
    const g = F.layer('fig'), ok = h * w === A;
    rect(g, x0, y0, w * u, h * u, { fill: ok ? C('face-3') : C('sora'), 'fill-opacity': 0.22, stroke: ok ? C('leaf') : C('sora'), 'stroke-width': 3 });
    if (u >= 6) gridLines(g, x0, y0, w, h, u, C('ink'), 0.18);
    txt(g, x0 + w * u / 2, y0 - 10, `よこ ${w}cm`, { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
    txt(g, x0 - 8, y0 + h * u / 2 + 5, `たて ${h}cm`, { 'font-size': 15, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
    txt(g, area.x + area.w / 2, area.y + area.h - 4, `${h} × ${w} ＝ ${h * w}cm²${ok ? '' : `（めあて ${A}cm²）`}`, { 'font-size': 18, class: 'ui', 'font-weight': 700, fill: ok ? C('leaf') : C('ink') });
    // たな
    const its = items(), f = found(), sb = side ? { x: box.x + box.w * 0.67, y: box.y + 4, w: box.w * 0.33, h: box.h - 8 } : { x: box.x, y: box.y + box.h * 0.7, w: box.w, h: box.h * 0.3 };
    const n = its.length, cols = side ? 1 : n, rows = side ? n : 1, sw = sb.w / cols, sh = Math.min(sb.h / rows, side ? 90 : sb.h);
    const sg = F.layer('shelf'); shelf = [];
    its.forEach((it, i) => {
      const cx = sb.x + (i % cols) * sw + sw / 2, cy = sb.y + Math.floor(i / cols) * sh + sh / 2, [hh, ww] = it.id.split(':')[1].split('x').map(Number), has = f.has(it.id);
      rect(sg, cx - sw / 2 + 3, cy - sh / 2 + 3, sw - 6, sh - 6, { rx: 10, fill: has ? C('paper') : C('paper-2'), stroke: C('line'), 'stroke-dasharray': has ? null : '5 4' });
      if (has) { const k = Math.min((sw - 24) / ww, (sh - 30) / hh); rect(sg, cx - ww * k / 2, cy - hh * k / 2 - 7, ww * k, hh * k, { fill: C('face-3'), opacity: 0.6, stroke: C('leaf'), 'stroke-width': 1.5 }); txt(sg, cx, cy + sh / 2 - 9, `${hh}×${ww}`, { 'font-size': 12, class: 'ui', fill: C('ink-soft') }); }
      else txt(sg, cx, cy + 6, '？', { 'font-size': 20, fill: C('ink-soft') });
      shelf.push({ it, cx, cy, sw, sh });
    });
    F.layer('fx');
  }
  const step = (k, v) => { if (busy) return; sfx.tap(); ctx.hideHud(); if (k === 'h') { const n = clamp(h + v, 1, A); if (n === h) { ctx.toast('', '1cm より みじかく できないよ', 1.6); return; } h = n; } else { const n = clamp(w + v, 1, A); if (n === w) { ctx.toast('', '1cm より みじかく できないよ', 1.6); return; } w = n; } draw(); };
  async function check() {
    if (busy) return;
    if (h * w !== A) { sfx.off(); ctx.toast('', `いまは ${h * w}cm²。${A}cm² に なるように しよう`, 2.2, unitSpeech(`今は${h * w}cm²。${A}cm²になるようにしよう`)); return; }
    busy = true; const tag = S.token, id = `${A}:${rectKey(h, w)}`, isNew = !found().has(id), swapped = h > w;
    if (swapped) {
      say(ctx, 'たてと よこを いれかえると…');
      const g = F.layer('fig'); await tween(0.7, e => g.setAttribute('opacity', 1 - 0.6 * Math.sin(e * Math.PI)), E.io); if (!alive(tag)) return;
      [h, w] = [w, h]; draw();
    }
    ctx.register('h4-rects', id); ctx.log('rect', { correct: true, detail: { A, h, w, isNew, swapped } }); made++;
    draw();
    const sl = shelf.find(s => s.it.id === id), got = items().filter(it => found().has(it.id)).length, tot = items().length;
    if (isNew) { sfx.good(); if (sl) hanamaru(F.svg, sl.cx, sl.cy, Math.min(sl.sw, sl.sh) * 0.4); ctx.toast(ICON.HANAMARU, `みつけた！ たて ${h}cm・よこ ${w}cm（${got}/${tot}）`, 3, `見つけた！たて${h}センチ、よこ${w}センチ`); }
    else ctx.caption(swapped ? `たてと よこを いれかえた だけ。<b>おなじ <ruby>長方形<rt>ちょうほうけい</rt></ruby></b>だよ` : 'その ながしかくは もう みつけたよ', 0, swapped ? 'たてとよこを入れかえただけ。同じ長方形だよ' : 'その長方形はもう見つけたよ');
    if (isNew && got === tot) { ctx.done('rects'); setTimeout(() => { if (alive(tag)) say(ctx, `${A}cm² の <ruby>長方形<rt>ちょうほうけい</rt></ruby>は ぜんぶで <b>${tot}しゅるい</b>`); }, 2600); }
    busy = false;
  }
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="めんせき">${[12, 24, 36].map(a => `<button type="button" data-a="${a}" aria-pressed="${a === A}">${a}cm²</button>`).join('')}</div></div>
    <div class="row"><div class="seg" role="group" aria-label="たて"><button type="button" data-dim="h" data-d="-1">たて −</button><button type="button" data-dim="h" data-d="1">たて ＋</button></div><div class="seg" role="group" aria-label="よこ"><button type="button" data-dim="w" data-d="-1">よこ −</button><button type="button" data-dim="w" data-d="1">よこ ＋</button></div><button class="btn small" type="button" data-k="check">できた</button></div>`;
  $$p(panel, '[data-a]').forEach(b => on(b, 'click', () => { if (+b.dataset.a === A) { sfx.tap(); ctx.toast('', `いまは「${A}cm²」だよ`, 1.6); return; } sfx.tap(); cancelAll(); busy = false; A = +b.dataset.a; autoStep = 0; st.tg = st.tg2 = null; $$p(panel, '[data-a]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); say(ctx, `${MEN}が ${A}cm² の <ruby>長方形<rt>ちょうほうけい</rt></ruby>を ぜんぶ みつけよう`); }));
  $$p(panel, '[data-dim]').forEach(b => on(b, 'click', () => step(b.dataset.dim, +b.dataset.d)));
  on($p(panel, '[data-k="check"]'), 'click', () => { sfx.tap(); check(); });
  F.onResize(draw);
  draw();
  say(ctx, `${MEN}が 12cm² に なる <ruby>長方形<rt>ちょうほうけい</rt></ruby>は なんしゅるい？ たてと よこを かえて つくろう`);
  return {
    dispose() {},
    test: {
      state: () => ({ A, h, w, made, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (autoStep >= 2) return { done: true };
        const f = found(), its = items(), un = its.filter(it => !f.has(it.id)), cur = [h, w];
        const dims = it => it.id.split(':')[1].split('x').map(Number);
        if (autoStep === 0 && !st.tg) st.tg = un.length ? un.map(dims).sort((a, b) => Math.abs(a[0] - cur[0]) + Math.abs(a[1] - cur[1]) - Math.abs(b[0] - cur[0]) - Math.abs(b[1] - cur[1]))[0] : dims(its[its.length - 1]);
        if (autoStep === 1 && !st.tg2) st.tg2 = [st.tg ? st.tg[1] : w, st.tg ? st.tg[0] : h];
        const tg = autoStep === 0 ? st.tg : st.tg2;
        if (h !== tg[0]) return { click: `data-dim=h&data-d=${h < tg[0] ? 1 : -1}|` };
        if (w !== tg[1]) return { click: `data-dim=w&data-d=${w < tg[1] ? 1 : -1}|` };
        autoStep++; return { click: 'data-k=check|' };
      },
    },
  };
}
