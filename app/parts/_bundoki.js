// 角・分度器・三角定規・おうぎ形の絵（bundoki・bundoki-quiz が使う）。角度は「右向き 0°・反時計回りが正」（算数の向き）。
// 色は tok() の値を属性に入れる。分度器は中心 (0,0)・0の線が +x の向きで描いて、translate＋rotate で置く（回すのは属性1つ）。
import { el, C, txt, line, circle, path, clamp } from './_flat.js';
import { dirPt, norm360 } from './_ahead-gen.js';

export const P = dirPt;
// おうぎ形（a0 から a1 へ反時計回り）。SVG は y が下向きなので sweep=0 が反時計回り
export function sectorD(cx, cy, r, a0, a1) {
  let d = a1 - a0; if (d <= 0.01) return '';
  if (d >= 359.99) return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1);
  return `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${d > 180 ? 1 : 0},0 ${x1},${y1}Z`;
}
export function arcD(cx, cy, r, a0, a1) {
  let d = a1 - a0; if (d <= 0.01) return '';
  if (d >= 359.99) return `M${cx + r},${cy}a${r},${r} 0 1,0 ${-2 * r},0a${r},${r} 0 1,0 ${2 * r},0`;
  const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1);
  return `M${x0},${y0}A${r},${r} 0 ${d > 180 ? 1 : 0},0 ${x1},${y1}`;
}
// ポインタの点 → 中心からの角度（算数の向き、0〜360）
export const angOf = (cx, cy, p) => norm360(Math.atan2(-(p.y - cy), p.x - cx) * 180 / Math.PI);
// 角度の差を −180〜180 に
export const dAng = (a, b) => { let d = norm360(a - b); if (d > 180) d -= 360; return d; };

// 角（2本の辺と頂点、開いた所の扇）。st を変えて update() で描き直す
export function makeAngle(parent, o = {}) {
  const g = el('g', {}, parent), st = Object.assign({ x: 0, y: 0, a0: 0, th: 60, len0: 160, len1: 160, fan: true, fanR: 46, col: C('ok'), mark: true, label: true, w: 7 }, o);
  const fan = path(g, '', { fill: C('ok-soft'), opacity: 0.55 });
  const fanLine = path(g, '', { fill: 'none', stroke: C('ok'), 'stroke-width': 3 });
  const right = path(g, '', { fill: 'none', stroke: C('ok'), 'stroke-width': 2.5 });
  const arm0 = line(g, 0, 0, 0, 0, { stroke: C('ink'), 'stroke-width': st.w });
  const arm1 = line(g, 0, 0, 0, 0, { stroke: C('ink'), 'stroke-width': st.w });
  const tip = circle(g, 0, 0, 0, { fill: C('sora'), stroke: C('paper'), 'stroke-width': 3 });
  const dot = circle(g, 0, 0, 6, { fill: C('ink') });
  const lab = txt(g, 0, 0, '', { 'font-size': 22, fill: C('ok'), class: 'ui', 'font-weight': 900 });
  const api = {
    g, st,
    update() {
      const { x, y, a0, th } = st, a1 = a0 + th;
      const [x0, y0] = P(x, y, st.len0, a0), [x1, y1] = P(x, y, st.len1, a1);
      arm0.setAttribute('x1', x); arm0.setAttribute('y1', y); arm0.setAttribute('x2', x0); arm0.setAttribute('y2', y0);
      arm1.setAttribute('x1', x); arm1.setAttribute('y1', y); arm1.setAttribute('x2', x1); arm1.setAttribute('y2', y1);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      tip.setAttribute('cx', x1); tip.setAttribute('cy', y1); tip.setAttribute('r', st.handle ? 15 : 0);
      const fr = Math.max(0, st.fanR * (th > 300 ? 0.8 : 1));
      fan.setAttribute('d', st.fan ? sectorD(x, y, fr, a0, a1) : '');
      fanLine.setAttribute('d', st.fan && Math.abs(th - 90) > 0.5 ? arcD(x, y, fr, a0, a1) : '');
      // 直角の印
      if (st.mark && Math.abs(th - 90) <= 0.5) { const s = Math.min(26, fr * 0.6), [p1x, p1y] = P(x, y, s, a0), [p2x, p2y] = P(x, y, s, a1), [qx, qy] = P(p1x, p1y, s, a1); right.setAttribute('d', `M${p1x},${p1y}L${qx},${qy}L${p2x},${p2y}`); } else right.setAttribute('d', '');
      if (st.label && th > 0.5) { const [lx, ly] = P(x, y, fr + 26, a0 + th / 2); lab.setAttribute('x', lx); lab.setAttribute('y', ly + 8); lab.textContent = st.text != null ? st.text : `${Math.round(th)}°`; } else lab.textContent = '';
    },
    tipPos() { return P(st.x, st.y, st.len1, st.a0 + st.th); },
  };
  api.update();
  return api;
}

// 分度器（半円・180°）または全円（360°）。set(cx, cy, rot) で置く。hi：'inner'｜'outer'｜null（読む目もりを色で示す）
export function makeProtractor(parent, { R = 150, full = false, handle = false } = {}) {
  const g = el('g', { class: 'grab' }, parent), body = el('g', {}, g);
  const I = C('ink'), soft = C('ink-soft');
  if (full) circle(body, 0, 0, R, { fill: C('glass'), 'fill-opacity': 0.82, stroke: C('glass-line'), 'stroke-width': 2 });
  else path(body, `M${-R * 1.04},${R * 0.07}L${-R * 1.04},0A${R * 1.04},${R * 1.04} 0 0,1 ${R * 1.04},0L${R * 1.04},${R * 0.07}Z`, { fill: C('glass'), 'fill-opacity': 0.84, stroke: C('glass-line'), 'stroke-width': 2 });
  // 内側の くりぬき
  if (full) circle(body, 0, 0, R * 0.36, { fill: 'none', stroke: C('glass-line'), 'stroke-width': 1.5 });
  else path(body, `M${-R * 0.36},0A${R * 0.36},${R * 0.36} 0 0,1 ${R * 0.36},0`, { fill: 'none', stroke: C('glass-line'), 'stroke-width': 1.5 });
  const hiBand = path(body, '', { fill: C('yamabuki'), opacity: 0.35 });
  const n = full ? 360 : 180, fine = R >= 110;
  for (let v = 0; v <= n; v += fine ? 1 : 5) {
    if (full && v === 360) break;
    const big = v % 10 === 0, mid = v % 5 === 0, len = R * (big ? 0.13 : mid ? 0.085 : 0.05);
    const [x1, y1] = P(0, 0, R, v), [x2, y2] = P(0, 0, R - len, v);
    line(body, x1, y1, x2, y2, { stroke: I, 'stroke-width': big ? 1.6 : mid ? 1.1 : 0.7, 'stroke-linecap': 'butt' });
  }
  const fs = Math.max(9, Math.min(15, R * 0.075));
  const rows = { inner: el('g', {}, body), outer: el('g', {}, body) };
  for (let v = 0; v <= (full ? 350 : 180); v += full ? 30 : 10) {
    if (full) { const [x, y] = P(0, 0, R * 0.74, v); txt(rows.inner, x, y + fs * 0.36, String(v), { 'font-size': fs, fill: I, class: 'ui' }); continue; }
    const [xi, yi] = P(0, 0, R * 0.64, v), [xo, yo] = P(0, 0, R * 0.79, v);
    txt(rows.inner, xi, yi + fs * 0.36, String(v), { 'font-size': fs * 0.9, fill: C('sora'), class: 'ui', transform: `rotate(${90 - v} ${xi} ${yi})` });
    txt(rows.outer, xo, yo + fs * 0.36, String(180 - v), { 'font-size': fs, fill: I, class: 'ui', transform: `rotate(${90 - v} ${xo} ${yo})` });
  }
  // 0の線と中心
  line(body, full ? -R : -R * 1.04, 0, full ? R : R * 1.04, 0, { stroke: C('ok'), 'stroke-width': 2, 'stroke-linecap': 'butt' });
  circle(body, 0, 0, 4.5, { fill: 'none', stroke: C('ok'), 'stroke-width': 2 });
  line(body, 0, -9, 0, 9, { stroke: C('ok'), 'stroke-width': 1.5 });
  let hd = null;
  if (handle) {
    hd = el('g', {}, g);
    circle(hd, R * 1.04 + 22, 0, 17, { fill: C('sora'), stroke: C('paper'), 'stroke-width': 3 });
    path(hd, `M${R * 1.04 + 22 - 7},-5A8,8 0 1,1 ${R * 1.04 + 22 - 8},4`, { fill: 'none', stroke: C('paper'), 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    path(hd, `M${R * 1.04 + 22 - 12},-7L${R * 1.04 + 22 - 6},-8L${R * 1.04 + 22 - 7},-2Z`, { fill: C('paper') });
  }
  const api = {
    g, R, full, st: { x: 0, y: 0, rot: 0, hi: null },
    set(x, y, rot) { Object.assign(api.st, { x, y, rot }); g.setAttribute('transform', `translate(${x},${y}) rotate(${-rot})`); },
    // 読む目もりを示す（0から th まで）
    hi(which, th = 0) {
      api.st.hi = which;
      rows.inner.setAttribute('opacity', which === 'outer' ? 0.35 : 1); rows.outer.setAttribute('opacity', which === 'inner' ? 0.35 : 1);
      if (!which || th <= 0) { hiBand.setAttribute('d', ''); return; }
      const r0 = which === 'inner' ? R * 0.56 : R * 0.71, r1 = which === 'inner' ? R * 0.71 : R * 0.86;
      const [s, e] = which === 'inner' ? [0, th] : [180 - th, 180];
      const [a, b] = P(0, 0, r1, s), [c, d] = P(0, 0, r1, e), [f, h] = P(0, 0, r0, e), [i, j] = P(0, 0, r0, s);
      hiBand.setAttribute('d', `M${a},${b}A${r1},${r1} 0 ${e - s > 180 ? 1 : 0},0 ${c},${d}L${f},${h}A${r0},${r0} 0 ${e - s > 180 ? 1 : 0},1 ${i},${j}Z`);
    },
    // ステージの点で、ハンドル・本体にあたるか
    handlePos() { return P(api.st.x, api.st.y, R * 1.04 + 22, api.st.rot); },
    hitHandle(p) { if (!hd) return false; const [x, y] = api.handlePos(); return Math.hypot(p.x - x, p.y - y) < 28; },
    hitBody(p) {
      const dx = p.x - api.st.x, dy = p.y - api.st.y, r = Math.hypot(dx, dy); if (r > R * 1.06) return false;
      if (full) return true;
      const a = norm360(Math.atan2(-dy, dx) * 180 / Math.PI - api.st.rot);
      return a <= 180 || r < R * 0.1 || a > 350;
    },
    // 本体の中の、つかむのに よい点（ステージの座標）
    grabPos() { return P(api.st.x, api.st.y, R * 0.45, api.st.rot + 120); },
  };
  return api;
}

// 三角定規（30°・60°・90° の あ、45°・45°・90° の い）。角 corner を頂点 (x,y) に置き、
// その角の1つの辺を向き dir に、もう1つの辺を反時計回りに corner 度の向きに合わせる
const TRI = {
  A: { pts: [[0, 0], [Math.sqrt(3), 0], [0, 1]], ang: [90, 30, 60] },   // 直角・30°・60°
  B: { pts: [[0, 0], [1, 0], [0, 1]], ang: [90, 45, 45] },
};
export function rulerPoly(kind, corner, x, y, dir, size) {
  const T = TRI[kind], i = T.ang.indexOf(corner);
  const Pi = T.pts[i], j = (i + 1) % 3, k = (i + 2) % 3;
  let u = [T.pts[j][0] - Pi[0], T.pts[j][1] - Pi[1]], w = [T.pts[k][0] - Pi[0], T.pts[k][1] - Pi[1]];
  // 数学の座標で、u から w へ反時計回りに corner 度になるよう並べる
  const cross = u[0] * w[1] - u[1] * w[0];
  if (cross < 0) [u, w] = [w, u];
  const au = Math.atan2(u[1], u[0]), rot = dir * Math.PI / 180 - au, s = size / Math.max(Math.hypot(...u), Math.hypot(...w));
  const tf = ([px, py]) => { const vx = (px - Pi[0]) * s, vy = (py - Pi[1]) * s; const rx = vx * Math.cos(rot) - vy * Math.sin(rot), ry = vx * Math.sin(rot) + vy * Math.cos(rot); return [x + rx, y - ry]; };
  return T.pts.map(tf);
}
export function drawRuler(parent, pts, color) {
  const g = el('g', {}, parent), cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
  const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.42, cy + (y - cy) * 0.42]);
  const d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(',')).join('L') + 'Z M' + inner.map(p => p.map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  path(g, d, { fill: color, 'fill-opacity': 0.55, 'fill-rule': 'evenodd', stroke: C('ink'), 'stroke-width': 2, 'stroke-linejoin': 'round' });
  return g;
}

// おうぎ形（EJ）：中心 (x,y)・半径 r・中心角 th（0の向きは a0）
export function makeSector(parent, o = {}) {
  const g = el('g', {}, parent), st = Object.assign({ x: 0, y: 0, r: 120, th: 90, a0: 90, ghost: true }, o);
  const ghost = circle(g, 0, 0, 0, { fill: 'none', stroke: C('line'), 'stroke-width': 2, 'stroke-dasharray': '5 6' });
  const body = path(g, '', { fill: C('face-2'), 'fill-opacity': 0.7, stroke: C('ink'), 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
  const arc = path(g, '', { fill: 'none', stroke: C('face-1'), 'stroke-width': 7, 'stroke-linecap': 'round' });
  const ang = path(g, '', { fill: 'none', stroke: C('ok'), 'stroke-width': 2.5 });
  const lab = txt(g, 0, 0, '', { 'font-size': 18, fill: C('ok'), class: 'ui', 'font-weight': 900 });
  const knob = circle(g, 0, 0, 0, { fill: C('sora'), stroke: C('paper'), 'stroke-width': 3 });
  const dot = circle(g, 0, 0, 4.5, { fill: C('ink') });
  const api = {
    g, st,
    update() {
      const { x, y, r, th, a0 } = st, a1 = a0 + th;
      ghost.setAttribute('cx', x); ghost.setAttribute('cy', y); ghost.setAttribute('r', st.ghost ? Math.max(0, r) : 0);
      body.setAttribute('d', sectorD(x, y, Math.max(0, r), a0, a1));
      arc.setAttribute('d', arcD(x, y, Math.max(0, r), a0, a1));
      ang.setAttribute('d', th > 1 && th < 359.5 ? arcD(x, y, Math.min(34, r * 0.3), a0, a1) : '');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      const [kx, ky] = P(x, y, r, a1); knob.setAttribute('cx', kx); knob.setAttribute('cy', ky); knob.setAttribute('r', st.handle ? 15 : 0);
      if (th > 1) { const [lx, ly] = P(x, y, Math.min(34, r * 0.3) + 20, a0 + th / 2); lab.setAttribute('x', lx); lab.setAttribute('y', ly + 6); lab.textContent = `${Math.round(th)}°`; } else lab.textContent = '';
    },
    knobPos() { return P(st.x, st.y, st.r, st.a0 + st.th); },
  };
  api.update();
  return api;
}
export { clamp };
