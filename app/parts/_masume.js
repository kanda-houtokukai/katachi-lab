// ひろさの部品（masume・kurabe-hirosa・ikutsubun-hirosa・masume-quiz）で共通に使う方眼の小道具。
// 盤の大きさはいつも F.top・F.bottom・F.W から計算する（棚の高さが変わると描き直される）。
import { el, C, txt, rect, line, path, clear, clamp, lerp, tween, wait, E } from './_flat.js';
import { outlineSegs, outlineLoop, bbox } from './_hirosa-gen.js';
import { alive, S } from '../stage/stage.js';

// 絵を描いてよい箱（上の字幕の下〜棚の上）
// 縦長の画面は字幕が2行になりやすいので、上を少しあける
export function stageBox(F, { side = 12, top = 0, bottom = 12 } = {}) {
  const y = F.top + F.cap + top + (F.W < 600 ? 24 : 0);
  return { x: side, y, w: Math.max(120, F.W - side * 2), h: Math.max(90, F.bottom - bottom - y) };
}
export const wide = F => F.W >= 640;
// 箱の中に cols×rows の方眼を置く（マスの大きさ c は maxC まで）
export function fitGrid(box, cols, rows, maxC = 56, minC = 6) {
  const c = Math.max(minC, Math.floor(Math.min(box.w / cols, box.h / rows, maxC)));
  return { c, cols, rows, ox: Math.round(box.x + (box.w - cols * c) / 2), oy: Math.round(box.y + (box.h - rows * c) / 2), X(gx) { return this.ox + gx * this.c; }, Y(gy) { return this.oy + gy * this.c; } };
}
// 箱いっぱいに方眼を敷く（マスの大きさから cols・rows を決める）
export function fillGrid(box, c) {
  const cols = Math.max(1, Math.floor(box.w / c)), rows = Math.max(1, Math.floor(box.h / c));
  return fitGrid(box, cols, rows, c, c);
}
export function cellAt(G, p) { const gx = Math.floor((p.x - G.ox) / G.c), gy = Math.floor((p.y - G.oy) / G.c); return gx >= 0 && gy >= 0 && gx < G.cols && gy < G.rows ? [gx, gy] : null; }
// 盤（紙と方眼の線）
export function drawBoard(g, G, { lines = true, fill, stroke, lineCol, opacity = 1 } = {}) {
  const b = el('g', {}, g);
  rect(b, G.ox, G.oy, G.cols * G.c, G.rows * G.c, { fill: fill || C('paper'), stroke: stroke || C('line'), 'stroke-width': 2, rx: 4 });
  if (lines) {
    const lg = el('g', { opacity }, b), col = lineCol || C('tile');
    for (let i = 1; i < G.cols; i++) line(lg, G.ox + i * G.c, G.oy, G.ox + i * G.c, G.oy + G.rows * G.c, { stroke: col, 'stroke-width': 1, 'stroke-linecap': 'butt' });
    for (let j = 1; j < G.rows; j++) line(lg, G.ox, G.oy + j * G.c, G.ox + G.cols * G.c, G.oy + j * G.c, { stroke: col, 'stroke-width': 1, 'stroke-linecap': 'butt' });
    b.lines = lg;
  }
  return b;
}
export const outlineD = (cells, c) => outlineSegs(cells).map(q => `M${q[0] * c},${q[1] * c}L${q[2] * c},${q[3] * c}`).join('');
// マスの形（左上が 0,0 のローカル座標）。grid：中のマスの線を出す
export function shapeG(parent, cells, c, { color, op = 0.72, sw = 3, grid = false, dash = null } = {}) {
  const g = el('g', {}, parent);
  for (const [x, y] of cells) rect(g, x * c, y * c, c, c, { fill: color, opacity: op });
  if (grid) for (const [x, y] of cells) rect(g, x * c + 0.5, y * c + 0.5, c - 1, c - 1, { fill: 'none', stroke: C('paper'), 'stroke-width': 1, opacity: 0.7 });
  path(g, outlineD(cells, c), { stroke: color, 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'square', 'stroke-dasharray': dash });
  return g;
}
export const place = (g, x, y, extra = '') => g.setAttribute('transform', `translate(${x},${y})${extra}`);
// 1こずつ番号の札をのせて数える（数えた数を返す）。abs：盤の上のマス [gx,gy]
export async function countCells(fx, abs, G, color, { from = 0, per, sfx, size = 1 } = {}) {
  const tag = S.token, g = el('g', {}, fx), n0 = abs.length, dt = per ?? clamp(2.2 / Math.max(1, n0), 0.05, 0.16);
  let n = from;
  for (const [x, y] of abs) {
    n++; const X = G.X(x), Y = G.Y(y), c = G.c * size, t = el('g', { opacity: 0 }, g);
    rect(t, X + c * 0.08, Y + c * 0.08, c * 0.84, c * 0.84, { rx: Math.max(2, c * 0.12), fill: C('paper'), stroke: color, 'stroke-width': Math.max(1.5, c * 0.05) });
    txt(t, X + c / 2, Y + c / 2 + c * 0.15, String(n), { 'font-size': Math.max(9, c * 0.42), fill: color, class: 'ui', 'font-weight': 700 });
    sfx && sfx.tick(n);
    await tween(dt, e => { t.setAttribute('opacity', Math.min(1, e * 1.6)); t.setAttribute('transform', `translate(0,${(1 - e) * -c * 0.3})`); }, E.out);
    if (!alive(tag)) return n;
  }
  return n;
}
// まわりの ひも：形のまわりを1周なぞってから、まっすぐに のばす（長さ＝まわりの数）。abs の左上 (gx,gy)
export async function unroll(fx, cells, G, gx, gy, color, { y0, x0, k = 1, label = '', hold = 0.3 } = {}) {
  const tag = S.token, loop = outlineLoop(cells), g = el('g', {}, fx);
  const P0 = loop.map(([x, y]) => [G.X(gx + x), G.Y(gy + y)]);
  const cum = [0]; for (let i = 1; i < P0.length; i++) cum.push(cum[i - 1] + Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]));
  const L = cum[cum.length - 1];
  const pl = el('polyline', { points: P0.map(p => p.join(',')).join(' '), fill: 'none', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': `${L} ${L}`, 'stroke-dashoffset': L }, g);
  await tween(0.9, e => pl.setAttribute('stroke-dashoffset', L * (1 - e)), E.io);
  if (!alive(tag)) return 0;
  if (hold && !(await wait(hold))) return 0;
  const P1 = cum.map(s => [x0 + s * k, y0]);
  await tween(1.1, e => pl.setAttribute('points', P0.map((p, i) => [lerp(p[0], P1[i][0], e), lerp(p[1], P1[i][1], e)].join(',')).join(' ')), E.io);
  if (!alive(tag)) return 0;
  // 1マスの辺ごとの目もり
  const n = Math.round(L / G.c);
  for (let i = 0; i <= n; i++) line(g, x0 + i * G.c * k, y0 - 6, x0 + i * G.c * k, y0 + 6, { stroke: color, 'stroke-width': 1.6 });
  if (label) txt(g, x0 + L * k + 8, y0 + 6, label, { 'font-size': 17, fill: color, class: 'ui', 'text-anchor': 'start', 'font-weight': 700 });
  return n;
}
// 光る（はみ出した マス など）。数回 点滅して残る
export function glowCells(fx, abs, G, color, { times = 3, op = 0.55 } = {}) {
  const g = el('g', { opacity: 0 }, fx);
  for (const [x, y] of abs) rect(g, G.X(x) + 2, G.Y(y) + 2, G.c - 4, G.c - 4, { rx: 4, fill: 'none', stroke: color, 'stroke-width': 4 });
  for (const [x, y] of abs) rect(g, G.X(x), G.Y(y), G.c, G.c, { fill: color, opacity: 0.25 });
  tween(0.5 * times, e => g.setAttribute('opacity', (0.5 - 0.5 * Math.cos(e * times * Math.PI * 2)) * (1 - op) + op * e));
  return g;
}
export const absOf = (cells, gx, gy) => cells.map(([x, y]) => [x + gx, y + gy]);
export { bbox, clear };
// 数直線（見当）の目もり
export function numberLine(g, x0, x1, y, max, { major = 5, minor = 1, unit = '' } = {}) {
  line(g, x0, y, x1, y, { 'stroke-width': 4 });
  const xOf = v => x0 + (x1 - x0) * clamp(v / max, 0, 1);
  for (let v = 0; v <= max + 1e-9; v += minor) {
    const big = Math.abs(v / major - Math.round(v / major)) < 1e-6, x = xOf(v);
    line(g, x, y - (big ? 12 : 6), x, y + (big ? 12 : 6), { 'stroke-width': big ? 2.5 : 1.2 });
    if (big) txt(g, x, y + 32, String(v), { 'font-size': 15, class: 'ui', fill: C('ink-soft') });
  }
  if (unit) txt(g, x1 + 6, y + 32, unit, { 'font-size': 15, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'start' });
  return xOf;
}
