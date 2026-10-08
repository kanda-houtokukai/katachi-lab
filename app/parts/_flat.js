// 量の部品で共通に使う 2D の小道具（SVG の生成、点の座標、扇形、はなまる、矢印、拡大鏡、ドラッグ）。
// 色は tok() で実際の値にしてから属性に入れる（SVG の属性に CSS 変数を書くと色が付かない端末がある）。
import { el } from '../stage/flat.js';
import { tok } from '../core/theme.js';
import { tween, wait, alive, S } from '../stage/stage.js';

export { el, tok, tween, wait, alive };
export const C = name => tok(name);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b, rand = Math.random) => a + Math.floor(rand() * (b - a + 1));
export const E = {
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  lin: t => t,
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
// 時計の角度（12時が0度、時計回り）
export function polar(cx, cy, r, deg) { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
export function sector(cx, cy, r, a0, a1) {
  if (a1 - a0 >= 359.99) return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  if (a1 - a0 <= 0.01) return '';
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${x1},${y1}Z`;
}
export const txt = (parent, x, y, s, a = {}) => { const t = el('text', Object.assign({ x, y, fill: C('ink'), 'text-anchor': 'middle' }, a), parent); t.textContent = s; return t; };
export const rect = (parent, x, y, w, h, a = {}) => el('rect', Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, h) }, a), parent);
export const line = (parent, x1, y1, x2, y2, a = {}) => el('line', Object.assign({ x1, y1, x2, y2, stroke: C('ink'), 'stroke-width': 2, 'stroke-linecap': 'round' }, a), parent);
export const circle = (parent, cx, cy, r, a = {}) => el('circle', Object.assign({ cx, cy, r: Math.max(0, r) }, a), parent);
export const path = (parent, d, a = {}) => el('path', Object.assign({ d }, a), parent);
export const clear = g => { while (g && g.firstChild) g.removeChild(g.firstChild); };
export const show = (e, v) => { if (e) e.style.display = v ? '' : 'none'; };
// 長さを求める（非表示の SVG で getTotalLength は例外になる → 既定値）
export function lengthOf(p, d = 1000) { try { return p.getTotalLength() || d; } catch (e) { return d; } }

// はなまる（見本 v1 と同じ動き）。打ち切られたら消える
export function hanamaru(svg, x, y, r) {
  const g = el('g', { 'pointer-events': 'none', 'data-nofit': '' }, svg);
  const pts = []; const turns = 2.6, n = 90;
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2 - Math.PI / 2, rr = r * (0.35 + 0.65 * t); pts.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a) * 0.92).toFixed(1)); }
  const p = el('polyline', { points: pts.join(' '), fill: 'none', stroke: C('ok'), 'stroke-width': Math.max(5, r * 0.09), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 }, g);
  const L = lengthOf(p, 2000);
  p.setAttribute('stroke-dasharray', L); p.setAttribute('stroke-dashoffset', L);
  const petals = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, px = x + Math.cos(a) * r * 1.08, py = y + Math.sin(a) * r; petals.push(el('ellipse', { cx: px, cy: py, rx: r * 0.16, ry: r * 0.1, transform: `rotate(${a * 180 / Math.PI} ${px} ${py})`, fill: C('ok'), opacity: 0 }, g)); }
  tween(0.65, k => { p.setAttribute('stroke-dashoffset', L * (1 - E.out(k))); petals.forEach((e, i) => e.setAttribute('opacity', clamp(k * 3 - 1.6 - i * 0.1, 0, 0.85))); })
    .then(() => setTimeout(() => g.remove(), 900));
  return g;
}
// 矢印（a→b）
export function arrow(parent, x1, y1, x2, y2, a = {}) {
  const g = el('g', {}, parent), col = a.color || C('ok'), w = a.w || 4;
  line(g, x1, y1, x2, y2, { stroke: col, 'stroke-width': w });
  const ang = Math.atan2(y2 - y1, x2 - x1), s = a.head || 12;
  path(g, `M${x2},${y2}L${x2 - s * Math.cos(ang - 0.45)},${y2 - s * Math.sin(ang - 0.45)}L${x2 - s * Math.cos(ang + 0.45)},${y2 - s * Math.sin(ang + 0.45)}Z`, { fill: col });
  return g;
}
// 寸法線（両矢印＋文字）
export function dim(parent, x1, y1, x2, y2, label, a = {}) {
  const g = el('g', {}, parent), col = a.color || C('sora');
  arrow(g, (x1 + x2) / 2, (y1 + y2) / 2, x1, y1, { color: col, w: 2.5, head: 9 });
  arrow(g, (x1 + x2) / 2, (y1 + y2) / 2, x2, y2, { color: col, w: 2.5, head: 9 });
  const t = txt(g, (x1 + x2) / 2 + (a.dx || 0), (y1 + y2) / 2 + (a.dy ?? -8), label, { fill: col, 'font-size': a.size || 16, class: 'ui' });
  return { g, t };
}
// 拡大鏡：src の中身（<use>）を、中心 (fx,fy) から k 倍にして (x,y) の円に映す
let lensN = 0;
export function loupe(svg, src, { fx, fy, x, y, r, k = 3 }) {
  const id = 'lens' + (++lensN);
  const defs = el('defs', {}, svg), cp = el('clipPath', { id }, defs); circle(cp, x, y, r);
  if (!src.id) src.id = 'src' + lensN;
  const g = el('g', { 'pointer-events': 'none' }, svg);
  circle(g, x, y, r + 2, { fill: C('paper') });
  const inner = el('g', { 'clip-path': `url(#${id})` }, g);
  el('use', { href: '#' + src.id, transform: `translate(${x - fx * k},${y - fy * k}) scale(${k})` }, inner);
  circle(g, x, y, r, { fill: 'none', stroke: C('ink'), 'stroke-width': 4 });
  line(g, x + r * 0.72, y + r * 0.72, x + r * 1.15, y + r * 1.15, { stroke: C('ink'), 'stroke-width': 9 });
  return { g, remove() { g.remove(); defs.remove(); } };
}
// ドラッグ：pointerId ごとに追い、pointer capture と touch-action:none を付ける（iOS の端の pointercancel も end として扱う）
export function dragOn(svgEl, F, { hit, start, move, end }) {
  const act = new Map();
  svgEl.addEventListener('pointerdown', e => {
    const p = F.ptr(e); const h = hit ? hit(p, e) : true; if (!h) return;
    e.preventDefault(); try { svgEl.setPointerCapture(e.pointerId); } catch (err) {}
    act.set(e.pointerId, { h, p0: p, last: p });
    start && start(p, h, e);
  });
  svgEl.addEventListener('pointermove', e => { const a = act.get(e.pointerId); if (!a) return; const p = F.ptr(e); move && move(p, a.h, a, e); a.last = p; });
  const fin = e => { const a = act.get(e.pointerId); if (!a) return; act.delete(e.pointerId); end && end(F.ptr(e), a.h, a, e); };
  svgEl.addEventListener('pointerup', fin); svgEl.addEventListener('pointercancel', fin);
  return { active: () => act.size };
}
// 2D の舞台の点を、画面のタップ位置に（test.auto() から返す）
export const tapOf = (F, x, y) => { const p = F.toClient(x, y); return { tap: { x: p.x, y: p.y } }; };
export const pathOf = (F, pts, hold = 0) => ({ path: pts.map(([x, y]) => { const p = F.toClient(x, y); return [p.x, p.y]; }), hold });
// 画面の文（字幕）を、決まった間だけ出して待つ
export async function step(ctx, html, sec, sp) { if (html) ctx.caption(html, 0, sp); return wait(sec); }
export const token = () => S.token;
