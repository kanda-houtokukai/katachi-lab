// 面積（H4・H5・H6）の図：長方形とタイル・L字・単位の正方形・三角形と四角形・円を切って並べる。
// 長さは cm（など）の単位の座標で持ち、箱に収まる倍率 u で px にする。色は tok() から。
import { el, C, txt, rect, line, path, circle, clear, clamp, lerp, tween, wait, E, dim } from './_flat.js';
import { wide } from './_masume.js';
import { PI } from './_hirosa-gen.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';

export const polyD = P => 'M' + P.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
const sp = s => unitSpeech(String(s).replace(/<[^>]+>/g, '').replace(/×/g, 'かける').replace(/÷/g, 'わる').replace(/＝/g, 'は').replace(/＋/g, 'たす').replace(/−/g, 'ひく'));
export const say = (ctx, html) => ctx.caption(html, 0, sp(html));
// 直角の印
export function rightMark(g, x, y, s, dx = 1, dy = -1, col) { path(g, `M${x + dx * s},${y}L${x + dx * s},${y + dy * s}L${x},${y + dy * s}`, { fill: 'none', stroke: col || C('ink-soft'), 'stroke-width': 1.5 }); }
// 1cm の方眼
export function gridLines(g, x, y, w, h, u, col, op = 1) { const lg = el('g', { opacity: op }, g); for (let i = 0; i <= w + 1e-6; i++) line(lg, x + i * u, y, x + i * u, y + h * u, { stroke: col || C('tile'), 'stroke-width': 1, 'stroke-linecap': 'butt' }); for (let j = 0; j <= h + 1e-6; j++) line(lg, x, y + j * u, x + w * u, y + j * u, { stroke: col || C('tile'), 'stroke-width': 1, 'stroke-linecap': 'butt' }); return lg; }

/* ---------- 長方形とタイル（H4） ---------- */
// rects：[{ h, w, col, unit }]。横に並べるか縦に積むか、箱で決める
export function drawRectTiles(F, box, rects, { grid = false, dims = true, maxU = 56 } = {}) {
  const g = F.layer('fig'), pad = dims ? 56 : 16, n = rects.length;
  const tw = rects.reduce((a, r) => a + r.w, 0), mh = Math.max(...rects.map(r => r.h)), mw = Math.max(...rects.map(r => r.w)), th = rects.reduce((a, r) => a + r.h, 0);
  const lp = dims ? 96 : 16, uS = Math.min((box.w - lp * n - 20 * (n - 1)) / tw, (box.h - pad) / mh), uV = Math.min((box.w - lp) / mw, (box.h - pad * n) / th);
  const side = n === 1 || uS >= uV, u = Math.max(4, Math.min(maxU, side ? uS : uV));
  const out = [];
  let cx = box.x + (box.w - (side ? tw * u + (lp + 20) * (n - 1) : mw * u)) / 2 + (dims ? 36 : 0), cy = box.y + (box.h - (side ? mh * u : th * u + pad * (n - 1))) / 2 - (dims ? 10 : 0);
  for (const r of rects) {
    const x = side ? cx : box.x + (box.w - r.w * u) / 2 + (dims ? 36 : 0), y = side ? cy + (mh - r.h) * u / 2 : cy;
    const rg = el('g', {}, g);
    rect(rg, x, y, r.w * u, r.h * u, { fill: r.col, 'fill-opacity': 0.12, stroke: r.col, 'stroke-width': 3 });
    if (grid) gridLines(rg, x, y, r.w, r.h, u, C('ink'), 0.25);
    const un = r.unit || 'cm';
    if (dims) {
      txt(rg, x + r.w * u / 2, y + r.h * u + 26, `よこ ${r.w}${un}`, { 'font-size': 16, class: 'ui', fill: C('ink-soft') });
      txt(rg, x - 12, y + r.h * u / 2 + 5, `たて ${r.h}${un}`, { 'font-size': 16, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
    }
    const tl = el('g', {}, rg);
    out.push({ x, y, u, h: r.h, w: r.w, col: r.col, g: rg, tl });
    if (side) cx += r.w * u + lp + 20; else cy += r.h * u + pad;
  }
  const b0 = out[0], bl = out[out.length - 1];
  return { rects: out, at: { x: (b0.x + bl.x + bl.w * bl.u) / 2, y: (b0.y + bl.y + bl.h * bl.u) / 2, r: Math.min(90, Math.max(30, b0.u * Math.min(b0.w, b0.h) * 0.5)) } };
}
// タイルを1れつ しいてから、そのれつを たてに かさねていく（たて×よこ の動き）
export async function rowTiles(F, r, sfx, { rowsOnly = 0, unit = 'cm²', label = true } = {}) {
  const tag = S.token, { x, y, u, h, w } = r; clear(r.tl);
  const row = el('g', {}, r.tl), per = clamp(1 / w, 0.04, 0.14);
  for (let i = 0; i < w; i++) {
    const t = el('g', { opacity: 0 }, row);
    rect(t, x + i * u + 1.5, y + 1.5, u - 3, u - 3, { rx: Math.min(5, u * 0.15), fill: C('cell-b'), stroke: C('hint'), 'stroke-width': 1.2 });
    if (u >= 20 && label) txt(t, x + i * u + u / 2, y + u / 2 + u * 0.15, String(i + 1), { 'font-size': Math.min(16, u * 0.42), class: 'ui' });
    sfx && sfx.tick(i);
    await tween(per, e => { t.setAttribute('opacity', e); t.setAttribute('transform', `translate(0,${(1 - e) * -u * 0.5})`); }, E.out);
    if (!alive(tag)) return;
  }
  if (rowsOnly) return;
  const per2 = clamp(1.2 / h, 0.08, 0.3);
  for (let j = 1; j < h; j++) {
    const cp = row.cloneNode(true); cp.querySelectorAll('text').forEach(tt => tt.remove()); r.tl.appendChild(cp);
    sfx && sfx.tap();
    await tween(per2, e => cp.setAttribute('transform', `translate(0,${u * (j - 1) + u * e})`), E.io);
    if (!alive(tag)) return;
  }
  if (label && h > 1) {
    const lx = x + w * u + 10;
    const lg = el('g', {}, r.tl);
    txt(lg, lx, y + u * 0.7, `${w}こ`, { 'font-size': 15, class: 'ui', fill: C('hint-ink'), 'text-anchor': 'start' });
    txt(lg, lx, y + h * u / 2 + 6, `× ${h}れつ`, { 'font-size': 15, class: 'ui', fill: C('hint-ink'), 'text-anchor': 'start' });
  }
}

/* ---------- L字の形（H4） ---------- */
export function drawLQ(F, box, q) {
  const g = F.layer('fig'), { H, W, nh, nw } = q, u = Math.max(8, Math.min((box.w - 120) / W, (box.h - 70) / H, 44));
  const x0 = box.x + (box.w - W * u) / 2, y0 = box.y + (box.h - H * u) / 2 - 6;
  const P = [[0, 0], [W - nw, 0], [W - nw, nh], [W, nh], [W, H], [0, H]].map(([x, y]) => [x0 + x * u, y0 + y * u]);
  const fg = el('g', {}, g);
  path(fg, polyD(P), { fill: C('sora'), 'fill-opacity': 0.14, stroke: C('sora'), 'stroke-width': 3, 'stroke-linejoin': 'round' });
  const T = (x, y, s, a = {}) => txt(fg, x, y, s, Object.assign({ 'font-size': 15, class: 'ui', fill: C('ink-soft') }, a));
  T(x0 + W * u / 2, y0 + H * u + 24, `${W}cm`); T(x0 - 10, y0 + H * u / 2 + 5, `${H}cm`, { 'text-anchor': 'end' });
  T(x0 + (W - nw) * u / 2, y0 - 10, `${W - nw}cm`); T(x0 + W * u + 10, y0 + (nh + H) * u / 2 + 5, `${H - nh}cm`, { 'text-anchor': 'start' });
  return { g: fg, x0, y0, u, P, at: { x: x0 + W * u / 2, y: y0 + H * u / 2, r: Math.min(80, H * u * 0.4) } };
}
export async function lVerify(F, d, q, ctx) {
  const tag = S.token, { H, W, nh, nw } = q, { x0, y0, u } = d, fx = F.layer('fx'); clear(fx);
  // わける：たての線で 左と右に
  const cut = line(fx, x0 + (W - nw) * u, y0 + nh * u, x0 + (W - nw) * u, y0 + nh * u, { stroke: C('cutline'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
  await tween(0.6, e => cut.setAttribute('y2', y0 + nh * u + (H - nh) * u * e), E.io); if (!alive(tag)) return;
  const A = rect(fx, x0, y0, (W - nw) * u, H * u, { fill: C('face-2'), opacity: 0.4 }), Bp = rect(fx, x0 + (W - nw) * u, y0 + nh * u, nw * u, (H - nh) * u, { fill: C('face-3'), opacity: 0.45 });
  await tween(0.5, e => Bp.setAttribute('transform', `translate(${10 * e},0)`), E.io); if (!alive(tag)) return;
  say(ctx, `${W - nw}×${H} ＋ ${nw}×${H - nh} ＝ <b>${q.ans}cm²</b>`);
  if (!(await wait(1.6))) return;
  // ひく：大きな長方形から
  Bp.setAttribute('transform', ''); A.setAttribute('opacity', 0);
  const big = rect(fx, x0, y0, W * u, H * u, { fill: 'none', stroke: C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '6 5', opacity: 0 });
  const notch = rect(fx, x0 + (W - nw) * u, y0, nw * u, nh * u, { fill: C('ok'), opacity: 0 });
  await tween(0.6, e => { big.setAttribute('opacity', e); notch.setAttribute('opacity', 0.25 * e); }); if (!alive(tag)) return;
  say(ctx, `${H}×${W} − ${nh}×${nw} ＝ <b>${q.ans}cm²</b>（ひいても おなじ）`);
  await wait(1.4);
}

/* ---------- 単位の正方形（H4） ---------- */
const UNITQ = {
  '1m² は なん cm²？': { side: '1m（100cm）', n: 100, cell: '1cm²', of: 'cm²', tot: '10000cm²' },
  '2m² は なん cm²？': { side: '1m（100cm）', n: 100, cell: '1cm²', of: 'cm²', tot: '20000cm²', two: true },
  '1a は なん m²？': { side: '10m', n: 10, cell: '1m²', of: 'm²', tot: '100m²' },
  '1ha は なん m²？': { side: '100m', n: 100, cell: '1m²', of: 'm²', tot: '10000m²' },
  '1km² は なん ha？': { side: '1km（1000m）', n: 10, cell: '1ha', of: 'ha', tot: '100ha' },
};
export function unitDiagram(F, box, q) {
  const g = F.layer('fig'), U = UNITQ[q.q] || UNITQ['1m² は なん cm²？'], two = !!U.two;
  const s = Math.max(80, Math.min(box.h - 70, (box.w - 60) / (two ? 2.3 : 1), 320)), x0 = box.x + (box.w - s * (two ? 2.15 : 1)) / 2, y0 = box.y + (box.h - s) / 2 - 8;
  const sq = [];
  for (let k = 0; k < (two ? 2 : 1); k++) {
    const x = x0 + k * s * 1.15, sg = el('g', {}, g);
    rect(sg, x, y0, s, s, { fill: C('paper'), stroke: C('ink'), 'stroke-width': 3 });
    gridLines(sg, x, y0, 10, 10, s / 10, C('tile'));
    txt(sg, x + s / 2, y0 + s + 24, U.side, { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
    sq.push({ x, y: y0, s, g: sg });
  }
  txt(g, sq[0].x - 8, y0 + s / 2, U.side.split('（')[0], { 'font-size': 15, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
  return { U, sq, at: { x: x0 + s / 2, y: y0 + s / 2, r: s * 0.3 } };
}
export async function unitVerify(F, d, q, ctx) {
  const tag = S.token, { U, sq } = d, fx = F.layer('fx'); clear(fx);
  for (const s of sq) {
    const c = s.s / 10, per = U.n === 100 ? 0.05 : 0.04;
    // 1れつ（よこ）が光ってから、ぜんぶ
    const row = el('g', {}, fx);
    for (let i = 0; i < 10; i++) { rect(row, s.x + i * c + 1, s.y + 1, c - 2, c - 2, { fill: C('cell-b'), opacity: 0.75 }); await wait(per); if (!alive(tag)) return; }
    if (U.n === 100) {
      // 1マスの中は さらに 10×10
      const z = el('g', {}, fx); gridLines(z, s.x, s.y, 10, 10, c / 10, C('hint'), 0.8);
      say(ctx, `1れつに ${U.cell.replace(/^1/, '')} が <b>${U.n}こ</b>`);
    } else say(ctx, `1れつに ${U.cell} が <b>${U.n}こ</b>`);
    for (let j = 1; j < 10; j++) { const cp = row.cloneNode(true); fx.appendChild(cp); cp.setAttribute('transform', `translate(0,${j * c})`); await wait(0.06); if (!alive(tag)) return; }
  }
  say(ctx, `${U.n} × ${U.n} ＝ <b>${U.n * U.n}</b>${sq.length > 1 ? ' が 2つ' : ''}。こたえは <b>${U.tot}</b>`);
  await wait(1.4);
}

/* ---------- 三角形・四角形（H5） ---------- */
// cm 単位の頂点。y は下向き（0 が上、h が底辺）
export function figPts(q) {
  const { b, h, off = 0 } = q;
  if (q.fig === 'para') return [[0, h], [b, h], [off + b, 0], [off, 0]];
  if (q.fig === 'tri') return [[0, h], [b, h], [off, 0]];
  if (q.fig === 'trap') return [[0, h], [b, h], [off + q.up, 0], [off, 0]];
  const { d1, d2 } = q; return [[0, d2 / 2], [d1 / 2, 0], [d1, d2 / 2], [d1 / 2, d2]];
}
export function drawFigure(F, box, q, { grid = false, col } = {}) {
  const g = F.layer('fig'), P = figPts(q), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  // 三角形・台形は 答え合わせで もう1まいを 右に回して つなぐので、その分も あける
  const ext = q.fig === 'tri' ? q.b + q.off : q.fig === 'trap' ? q.b + q.off + q.up : 0;
  const mx = Math.min(0, ...xs), Mx = Math.max(...xs, ext, q.fig === 'tri' || q.fig === 'para' ? q.b : 0), My = Math.max(...ys), wU = Mx - mx, hU = My;
  const u = Math.max(8, Math.min((box.w - 110) / (wU + (grid ? 2 : 0)), (box.h - 70) / (hU + (grid ? 1 : 0)), 50));
  const ox = box.x + (box.w - wU * u) / 2 - mx * u, oy = box.y + (box.h - hU * u) / 2 - 4;
  const X = x => ox + x * u, Y = y => oy + y * u, Pp = P.map(([x, y]) => [X(x), Y(y)]);
  const fg = el('g', {}, g), color = col || C('face-5');
  if (grid) { const gx0 = Math.floor(mx) - 1, gw = Math.ceil(Mx) - gx0 + 1; rect(fg, X(gx0), Y(-0.5), gw * u, (hU + 1) * u, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 }); gridLines(fg, X(gx0), Y(-0.5), gw, hU + 1, u, C('grid-line'), 0.8); }
  const body = path(fg, polyD(Pp), { fill: color, 'fill-opacity': 0.2, stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round' });
  const T = (x, y, s, a = {}) => txt(fg, x, y, s, Object.assign({ 'font-size': 15, class: 'ui', fill: C('ink-soft') }, a));
  const hg = el('g', {}, fg);
  let hiH = null;
  if (q.fig === 'rhom') {
    line(hg, X(0), Y(q.d2 / 2), X(q.d1), Y(q.d2 / 2), { stroke: C('sora'), 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    line(hg, X(q.d1 / 2), Y(0), X(q.d1 / 2), Y(q.d2), { stroke: C('sora'), 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    T(X(q.d1 * 0.75), Y(q.d2 / 2) - 8, `${q.d1}cm`, { fill: C('sora') }); T(X(q.d1 / 2) + 8, Y(q.d2 * 0.28), `${q.d2}cm`, { fill: C('sora'), 'text-anchor': 'start' });
  } else {
    const { b, h, off } = q;
    // 高さ（点線）。外に出るときは底辺をのばす
    const hx = off;
    if (hx > b || hx < 0) line(hg, X(Math.min(b, hx)), Y(h), X(Math.max(b, hx)), Y(h), { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
    const hl = line(hg, X(hx), Y(0), X(hx), Y(h), { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    rightMark(hg, X(hx), Y(h), 9, hx > b ? -1 : 1, -1);
    T(X(hx) + (hx > b ? 10 : -8), Y(h / 2) + 5, `${h}cm`, { fill: C('ok'), 'text-anchor': hx > b ? 'start' : 'end' });
    T(X(b / 2), Y(h) + 24, `${b}cm`);
    if (q.fig === 'trap') T(X(off + q.up / 2), Y(0) - 10, `${q.up}cm`);
    // ななめの辺（まどわせる長さ）
    if (q.s) { const sx = q.fig === 'tri' ? (b + off) / 2 : q.fig === 'trap' ? (b + off + q.up) / 2 : off / 2 + (q.out ? 0 : 0), sy = h / 2; const sxx = q.fig === 'para' ? (b + off + b) / 2 : sx; T(X(sxx) + 12, Y(sy), `${q.s}cm`, { 'text-anchor': 'start' }); }
    hiH = () => { tween(1.2, e => hl.setAttribute('stroke-width', 2 + 3 * Math.sin(e * Math.PI * 3) ** 2)); };
  }
  return { g: fg, body, X, Y, u, P, Pp, color, hiH, at: { x: X((mx + Mx) / 2), y: Y(hU / 2), r: Math.min(80, hU * u * 0.4) } };
}
// 答え合わせ：平行四辺形は ずらして長方形、三角形・台形は もう1まいを180°まわして平行四辺形、ひし形は長方形の半分
export async function figVerify(F, d, q, ctx) {
  const tag = S.token, fx = F.layer('fx'); clear(fx);
  const { X, Y, P } = d;
  if (q.fig === 'para') {
    const p = path(fx, polyD(d.Pp), { fill: C('face-2'), 'fill-opacity': 0.45, stroke: C('hint'), 'stroke-width': 2.5 });
    await tween(1.1, e => { const o = q.off * (1 - e); p.setAttribute('d', polyD([[0, q.h], [q.b, q.h], [o + q.b, 0], [o, 0]].map(([x, y]) => [X(x), Y(y)]))); }, E.io); if (!alive(tag)) return;
    say(ctx, `ずらすと <ruby>長方形<rt>ちょうほうけい</rt></ruby>。${q.b} × ${q.h} ＝ <b>${q.ans}cm²</b>`);
    await wait(1.4); return;
  }
  if (q.fig === 'rhom') {
    const r = rect(fx, X(0), Y(0), q.d1 * d.u, q.d2 * d.u, { fill: 'none', stroke: C('sora'), 'stroke-width': 2.5, 'stroke-dasharray': '6 5', opacity: 0 });
    await tween(0.6, e => r.setAttribute('opacity', e)); if (!alive(tag)) return;
    const c4 = [[[0, 0], [q.d1 / 2, 0], [0, q.d2 / 2]], [[q.d1 / 2, 0], [q.d1, 0], [q.d1, q.d2 / 2]], [[q.d1, q.d2 / 2], [q.d1, q.d2], [q.d1 / 2, q.d2]], [[0, q.d2 / 2], [q.d1 / 2, q.d2], [0, q.d2]]];
    for (const t of c4) { path(fx, polyD(t.map(([x, y]) => [X(x), Y(y)])), { fill: C('face-2'), opacity: 0.45 }); ctx.sfx.tap(); await wait(0.2); if (!alive(tag)) return; }
    say(ctx, `かこむ <ruby>長方形<rt>ちょうほうけい</rt></ruby>の はんぶん。${q.d1} × ${q.d2} ÷ 2 ＝ <b>${q.ans}cm²</b>`);
    await wait(1.4); return;
  }
  // 三角形・台形：右の辺のまん中で 180° まわした もう1まい
  const A = q.fig === 'tri' ? P[2] : P[2], Bv = P[1], M = [X((A[0] + Bv[0]) / 2), Y((A[1] + Bv[1]) / 2)];
  const cp = path(fx, polyD(d.Pp), { fill: C('face-2'), 'fill-opacity': 0.5, stroke: C('hint'), 'stroke-width': 2.5 });
  await tween(1.2, e => cp.setAttribute('transform', `rotate(${180 * e} ${M[0]} ${M[1]})`), E.io); if (!alive(tag)) return;
  const base = q.fig === 'tri' ? `${q.b}` : `（${q.up} ＋ ${q.b}）`;
  say(ctx, `2まいで <ruby>平行四辺形<rt>へいこうしへんけい</rt></ruby>。${base} × ${q.h} ÷ 2 ＝ <b>${q.ans}cm²</b>`);
  await wait(1.5);
}

/* ---------- 円を切って並べる（H6） ---------- */
// N 等分した扇形を、円の位置から長方形に近い並びへ（k=0 円、k=1 並べた形）
export function sectorD(r, th) { const a = th / 2, x = r * Math.sin(a), y = r * Math.cos(a); return `M0,0L${(-x).toFixed(2)},${y.toFixed(2)}A${r},${r} 0 0,0 ${x.toFixed(2)},${y.toFixed(2)}Z`; }
export function circlePieces(g, N, r, cx, cy, sx, sy) {
  const th = 2 * Math.PI / N, deg = 360 / N, half = N / 2, pieces = [];
  for (let k = 0; k < N; k++) {
    const lower = k < half, j = lower ? k : k - half;
    // 下半分（下向き）は 右→左、上半分（上向き）は 左→右 の角度の順
    const a0 = lower ? -90 + deg / 2 + (half - 1 - j) * deg : 90 + deg / 2 + j * deg;
    const slot = lower ? 2 * j : 2 * j + 1, px = sx + slot * Math.PI * r / N, py = lower ? sy : sy + r * Math.cos(th / 2);
    const a1 = lower ? 0 : 180;
    const pg = el('g', {}, g);
    path(pg, sectorD(r, th), { fill: lower ? C('face-2') : C('face-4'), stroke: C('paper'), 'stroke-width': N > 32 ? 0.6 : 1.2, 'fill-opacity': 0.85 });
    pieces.push({ g: pg, a0, a1: a1 + Math.round((a0 - a1) / 360) * 360, p0: [cx, cy], p1: [px, py] });
  }
  const set = k => pieces.forEach(p => p.g.setAttribute('transform', `translate(${lerp(p.p0[0], p.p1[0], k)},${lerp(p.p0[1], p.p1[1], k)}) rotate(${lerp(p.a0, p.a1, k)})`));
  set(0);
  return { pieces, set };
}
// 円と並べた形の置き場所（横長は左右・縦長は上下）
export function circleLayout(F, box, extra = 0) {
  const w = wide(F) || box.w > box.h * 1.35;
  const r = w ? Math.min(box.h / 2.6, (box.w - 60) / 5.6, 150) : Math.min((box.w - 30) / 3.5, (box.h - 100 - extra) / 3.3, 120);
  if (w) { const tot = 2 * r + 50 + Math.PI * r + 10; const x0 = box.x + (box.w - tot) / 2; return { r, cx: x0 + r, cy: box.y + box.h / 2 - 6, sx: x0 + 2 * r + 50 + r * 0.1, sy: box.y + box.h / 2 - r / 2 - 6, w }; }
  return { r, cx: box.x + box.w / 2, cy: box.y + r + 8, sx: box.x + (box.w - Math.PI * r) / 2 + 4, sy: box.y + 2 * r + 46, w };
}
export function drawCircleQ(F, box, q) {
  const g = F.layer('fig');
  if (q.k === 'approx') { const d = drawApprox(F, box, q); approxOverlay(F, d, q, 1); return d; }
  const L = circleLayout(F, box), { r, cx, cy } = L, fr = q.frac;
  const fg = el('g', {}, g);
  if (fr === 1) circle(fg, cx, cy, r, { fill: C('face-2'), 'fill-opacity': 0.25, stroke: C('hint'), 'stroke-width': 3 });
  else path(fg, fr === 0.5 ? `M${cx - r},${cy}A${r},${r} 0 0,1 ${cx + r},${cy}Z` : `M${cx},${cy}L${cx + r},${cy}A${r},${r} 0 0,0 ${cx},${cy - r}Z`, { fill: C('face-2'), 'fill-opacity': 0.25, stroke: C('hint'), 'stroke-width': 3 });
  circle(fg, cx, cy, 3.5, { fill: C('ink') });
  if (q.d && fr === 1) { line(fg, cx - r, cy, cx + r, cy, { stroke: C('ok'), 'stroke-width': 2.5 }); txt(fg, cx, cy - 10, `${q.r * 2}cm`, { 'font-size': 16, class: 'ui', fill: C('ok') }); }
  else { line(fg, cx, cy, cx + r, cy, { stroke: C('ok'), 'stroke-width': 2.5 }); txt(fg, cx + r / 2, cy + 22, `${q.r}cm`, { 'font-size': 16, class: 'ui', fill: C('ok') }); }
  return { L, at: { x: cx, y: cy, r: r * 0.6 } };
}
export async function circleVerify(F, d, q, ctx) {
  const tag = S.token, fx = F.layer('fx'); clear(fx);
  if (q.k === 'approx') { await approxVerify(F, d, q, ctx); return; }
  const { r, cx, cy, sx, sy } = d.L, cp = circlePieces(fx, 16, r, cx, cy, sx, sy);
  await tween(1.6, e => cp.set(e), E.io); if (!alive(tag)) return;
  const lg = el('g', {}, fx);
  dim(lg, sx, sy + r + 18, sx + Math.PI * r, sy + r + 18, 'はんけい×3.14', { dy: 20, size: 14 });
  txt(lg, sx - 8, sy + r / 2 + 5, 'はんけい', { 'font-size': 14, class: 'ui', fill: C('sora'), 'text-anchor': 'end' });
  const f = q.frac === 1 ? '' : q.frac === 0.5 ? ' ÷ 2' : ' ÷ 4';
  say(ctx, `ならべると ほぼ <ruby>長方形<rt>ちょうほうけい</rt></ruby>。${q.r} × ${q.r} × 3.14${f} ＝ <b>${q.ans}cm²</b>`);
  await wait(1.6);
}
// およその形：いけ（円）・しま（三角形・平行四辺形）。km・m のめやすの線
function drawApprox(F, box, q) {
  const g = F.layer('fig'), sh = q.shape, cx = box.x + box.w / 2, cy = box.y + box.h / 2 - 8, s = Math.min(box.w - 80, box.h - 60);
  const fg = el('g', {}, g);
  let P;
  if (sh.s === 'circle') { const R = s * 0.42; P = []; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, k = 1 + 0.07 * Math.sin(3 * a + 0.6) + 0.04 * Math.sin(5 * a + 1.3); P.push([cx + R * k * Math.cos(a), cy + R * k * Math.sin(a)]); } path(fg, polyD(P), { fill: C('water'), 'fill-opacity': 0.55, stroke: C('water-deep'), 'stroke-width': 2.5 }); return { P, fg, sh, cx, cy, R, at: { x: cx, y: cy, r: R * 0.6 } }; }
  const W = s * 0.85, Hh = W * sh.b / sh.a * (sh.s === 'tri' ? 1 : 1);
  const hh = Math.min(Hh, s * 0.75), u = Math.min(W / sh.a, hh / sh.b), bw = sh.a * u, bh = sh.b * u, x0 = cx - bw / 2, y0 = cy + bh / 2;
  const base = sh.s === 'tri' ? [[x0, y0], [x0 + bw, y0], [x0 + bw * 0.4, y0 - bh]] : [[x0, y0], [x0 + bw * 0.82, y0], [x0 + bw, y0 - bh], [x0 + bw * 0.18, y0 - bh]];
  // でこぼこの しま
  P = []; const n = base.length;
  for (let i = 0; i < n; i++) { const a = base[i], b = base[(i + 1) % n]; for (let t = 0; t < 10; t++) { const k = t / 10, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1, w = Math.sin(k * Math.PI) * (0.04 * Math.sin(i * 3 + t * 1.7)) * L; P.push([a[0] + (b[0] - a[0]) * k + nx / L * w, a[1] + (b[1] - a[1]) * k + ny / L * w]); } }
  path(fg, polyD(P), { fill: C('grass'), 'fill-opacity': 0.5, stroke: C('leaf'), 'stroke-width': 2.5 });
  return { P, fg, sh, base, u, x0, y0, bw, bh, at: { x: cx, y: cy, r: Math.min(bw, bh) * 0.4 } };
}
export function approxOverlay(F, d, q, op = 1) {
  const fx = F.layer('ov'); clear(fx); const sh = q.shape, g = el('g', { opacity: op }, fx);
  if (sh.s === 'circle') { circle(g, d.cx, d.cy, d.R, { fill: 'none', stroke: C('ok'), 'stroke-width': 3, 'stroke-dasharray': '8 6' }); line(g, d.cx, d.cy, d.cx + d.R, d.cy, { stroke: C('ok'), 'stroke-width': 2.5 }); txt(g, d.cx + d.R / 2, d.cy - 10, `${sh.a}m`, { 'font-size': 16, class: 'ui', fill: C('ok') }); return g; }
  path(g, polyD(d.base), { fill: 'none', stroke: C('ok'), 'stroke-width': 3, 'stroke-dasharray': '8 6' });
  txt(g, d.x0 + d.bw / 2, d.y0 + 24, `${sh.a}km`, { 'font-size': 16, class: 'ui', fill: C('ok') });
  const hx = sh.s === 'tri' ? d.base[2][0] : d.base[2][0];
  line(g, hx, d.y0, hx, d.y0 - d.bh, { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '5 4' });
  txt(g, hx + 10, d.y0 - d.bh / 2, `${sh.b}km`, { 'font-size': 16, class: 'ui', fill: C('ok'), 'text-anchor': 'start' });
  return g;
}
async function approxVerify(F, d, q, ctx) {
  const tag = S.token, fx = F.layer('fx'), sh0 = q.shape;
  const fill = sh0.s === 'circle' ? circle(fx, d.cx, d.cy, d.R, { fill: C('ok'), opacity: 0 }) : path(fx, polyD(d.base), { fill: C('ok'), opacity: 0 });
  await tween(0.8, e => fill.setAttribute('opacity', 0.3 * e)); if (!alive(tag)) return;
  const sh = q.shape;
  say(ctx, sh.s === 'circle' ? `${sh.a} × ${sh.a} × 3.14 ＝ <b>${q.ans}m²</b>` : sh.s === 'tri' ? `${sh.a} × ${sh.b} ÷ 2 ＝ <b>${q.ans}km²</b>` : `${sh.a} × ${sh.b} ＝ <b>${q.ans}km²</b>`);
  await wait(1.5);
}
export { PI };
