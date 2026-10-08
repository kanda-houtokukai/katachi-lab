// 折れる展開図（汎用）：レイアウト（app/engine の平面の展開図）を、紙の面として 3D に出し、進み具合 p で折る。
// 見本v2 の buildFoldable を任意の多角形・任意の二面角へ一般化したもの。
import { S, THREE, tween, faceMaterial, glow, holdGlow, spinCamera, fitBox, easeOutBounce, easeInOut, col, badge, growSprite, disposeObject } from './stage.js';
import { anglesFor, worldMatrices, foldedFaces, overlappingFaces, oppositeFaces, solidFromFold, layoutBounds, rotateLayout } from '../engine/fold.js';
import { sfx } from '../core/sound.js';
import { tok } from '../core/theme.js';

export const T = 0.028;
const to3 = ([x, y], h = 0) => new THREE.Vector3(x, h, y);

// 凸多角形を内側へ d だけ縮める（隣の面とのすき間）
export function insetPoly(pts, d) {
  const n = pts.length, lines = [];
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - a[1] * b[0]; }
  const s = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    const nx = -ey / L * s, ny = ex / L * s; // 内向き
    lines.push([[a[0] + nx * d, a[1] + ny * d], [ex, ey]]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const [p, r] = lines[(i + n - 1) % n], [q, t] = lines[i];
    const den = r[0] * t[1] - r[1] * t[0];
    if (Math.abs(den) < 1e-9) { out.push(q); continue; }
    const u = ((q[0] - p[0]) * t[1] - (q[1] - p[1]) * t[0]) / den;
    out.push([p[0] + r[0] * u, p[1] + r[1] * u]);
  }
  return out;
}
// 平面の多角形を、厚さ T の紙の板にする（平面の (x,y) は 3D の (x, *, y)。厚みは +y 側）
export function plateGeometry(pts, thick = T, gap = 0.016) {
  const P = insetPoly(pts, gap);
  const shape = new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, thick, 0);
  return g;
}

export function makeFoldNet(L, colors, opts = {}) {
  const group = new THREE.Group(), nodes = [];
  L.faces.forEach((f, i) => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const mat = faceMaterial(colors[i % colors.length]);
    const mesh = new THREE.Mesh(plateGeometry(f.pts, opts.thick || T), mat);
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData.face = i;
    g.add(mesh); group.add(g);
    const c = f.pts.reduce((s, p) => [s[0] + p[0] / f.pts.length, s[1] + p[1] / f.pts.length], [0, 0]);
    nodes[i] = { g, mesh, mat, color: colors[i % colors.length], center: c, flips: [] };
  });
  const F = foldedFaces(L);
  const solid = solidFromFold(F);
  const vs = solid.verts.map(v => new THREE.Vector3(...v));
  const bb = new THREE.Box3().setFromPoints(vs), c3 = bb.getCenter(new THREE.Vector3()), half = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const ov = overlappingFaces(F);
  const net = {
    L, group, nodes, progress: 0, folded: F, solid, c3, half, colors,
    analysis: { valid: ov.length === 0, overlaps: ov, opposite: oppositeFaces(F), id: opts.id || 0 },
    setProgress(p) {
      net.progress = p;
      const W = worldMatrices(L, anglesFor(L, p));
      nodes.forEach((nd, i) => {
        nd.g.matrix.fromArray(W[i]); nd.g.matrixWorldNeedsUpdate = true;
        for (const b of nd.flips) b.position.y = p > 0.5 ? -b.userData.off : b.userData.off;
      });
    },
    meshes() { return nodes.map(n => n.mesh); },
    // 面の中心に札をつける（開閉に合わせて面の表と裏で入れ替える）
    addBadge(i, text, bg, fg, size = 0.34, flip = true) {
      const n = nodes[i], b = badge(text, bg, fg), off = 0.24;
      b.userData.off = off; b.position.set(n.center[0], net.progress > 0.5 ? -off : off, n.center[1]);
      n.g.add(b); if (flip) n.flips.push(b); growSprite(b, size); return b;
    },
    clearBadges() { nodes.forEach(n => { n.flips = []; n.g.children.filter(o => o.isSprite).forEach(s => { n.g.remove(s); disposeObject(s); }); }); },
    faceWorldNormal(i) { const n = nodes[i]; n.g.updateMatrixWorld(true); return new THREE.Vector3(0, 1, 0).transformDirection(n.g.matrixWorld); },
  };
  net.setProgress(0);
  return net;
}

// マットに置く。base は平面座標の原点のワールド位置。holder は折りあがった立体の中心で回る
export function mountNet(net, base, scale = 1) {
  const holder = new THREE.Group();
  net.baseScale = scale;
  const c = net.c3.clone();
  holder.position.copy(base).add(c.clone().multiplyScalar(scale));
  holder.scale.setScalar(scale);
  net.group.position.copy(c).multiplyScalar(-1);
  holder.add(net.group); S.stage.add(holder);
  net.holder = holder; net.base = base.clone(); net.home = holder.position.clone();
  net.overlay = new THREE.Group(); net.overlay.position.copy(c).multiplyScalar(-1); holder.add(net.overlay);
  return net;
}
// 平面の形がマットの真ん中（少し奥）に来る base
export function centerBase(L, z = -0.5, snap = false) {
  const b = layoutBounds(L);
  let x = -(b.x0 + b.x1) / 2, y = z - (b.y0 + b.y1) / 2;
  if (snap) { x = Math.round(x); y = Math.round(y); }
  return new THREE.Vector3(x, 0, y);
}
// 縦長の画面では、横長の形を縦向きに回してから置く
export function fitLayout(L, portrait) {
  const b = layoutBounds(L);
  return portrait && b.w > b.h * 1.05 ? rotateLayout(L, Math.PI / 2) : L;
}
export function disposeNet(net) { if (net && net.holder) { S.stage.remove(net.holder); disposeObject(net.holder); net.dead = true; net.holder = net.dummy || (net.dummy = new THREE.Group()); } }
export function netBox(net) { net.holder.updateMatrixWorld(true); return new THREE.Box3().setFromObject(net.group); }
export function foldTo(net, to, dur) { const from = net.progress; if (Math.abs(to - from) < 1e-3) return Promise.resolve(); return tween(dur * Math.abs(to - from), k => net.setProgress(from + (to - from) * k)); }
export function frameFlat(net, phi = 0.42, theta = 0.25, pad = 1.08) { const p = net.progress; net.setProgress(0); const b = netBox(net); net.setProgress(p); b.max.y += 0.2; fitBox(b, phi, theta, pad); }
export function frameBox(net, phi = 0.98, theta = 0.62, pad = 1.6) {
  const c = net.home.clone(), h = net.half.clone().multiplyScalar(net.baseScale || 1).addScalar(0.12);
  fitBox(new THREE.Box3(c.clone().sub(h), c.clone().add(h)), phi, theta, pad);
}
export async function hop(net, height = 0.5) {
  const h = net.holder, y0 = net.home.y;
  const b = net.baseScale || 1;
  await tween(0.22, k => { h.position.y = y0 + height * Math.sin(k * Math.PI / 2); h.scale.set(b * (1 - 0.06 * (1 - k)), b * (1 + 0.08 * (1 - k)), b * (1 - 0.06 * (1 - k))); });
  await tween(0.34, k => { h.position.y = y0 + height * (1 - easeOutBounce(k)); h.scale.setScalar(b); });
  sfx.land();
  await tween(0.18, k => { const s = Math.sin(k * Math.PI) * 0.07; h.scale.set(b * (1 + s), b * (1 - s), b * (1 + s)); });
}
export function wobble(net, faces) {
  const base = faces.map(f => net.nodes[f].mesh.rotation.clone());
  return tween(1.1, k => { faces.forEach((f, i) => { const m = net.nodes[f].mesh, a = Math.sin(k * Math.PI * 7) * (1 - k) * 0.03; m.position.y = a; }); });
}
// 重なった面を赤く残し、ほかの面をうすくする（見本v2 showOverlap）
export function showOverlap(net, faces = net.analysis.overlaps) {
  const ov = new Set(faces), pale = col(tok('quiz-paper'));
  net.nodes.forEach((n, i) => { if (ov.has(i)) return; const c0 = n.mat.color.clone(); tween(0.6, k => n.mat.color.copy(c0).lerp(pale, 0.78 * k)); });
  faces.forEach(f => { glow(net.nodes[f].mesh, tok('glow-red'), 3, 0.75, 0.38); S.held.add(net.nodes[f].mesh.material); });
  // 重なりが見えるよう、少しずらす
  faces.forEach((f, k) => { net.nodes[f].mesh.position.y = 0.004 * (k + 1); });
  wobble(net, faces);
  spinCamera(3.2, Math.PI * 0.85);
}
export function settleHolder(net) {
  if (!net || !net.holder) return Promise.resolve();
  const h = net.holder, q0 = h.quaternion.clone(), y0 = h.position.y;
  if (q0.angleTo(new THREE.Quaternion()) < 1e-3 && Math.abs(y0 - net.home.y) < 1e-3) return Promise.resolve();
  const qi = new THREE.Quaternion();
  return tween(0.5, k => { h.quaternion.copy(q0).slerp(qi, k); h.position.y = y0 + (net.home.y - y0) * k; }, easeInOut);
}
export { holdGlow };
