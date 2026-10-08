// 折りたたみ（設計書 §2-3〜2-5）。レイアウト（平面の展開図）を、蝶番ごとの角度で折った姿を計算する。
// 平面座標 (x, y) は 3D の (x, 0, y) に置く。面の外側が下（-y）、内側が上（+y）。根の面はマットに置いたまま動かない。
import { I4, mul4, translate4, rotAxis4, apply4, applyDir4, sub, norm, dot, dist, mean } from './vec.js';

const to3 = ([x, y]) => [x, 0, y];

// 子の面が起き上がる（+y へ向かう）回転の向きを、蝶番ごとに決めておく
export function prepareLayout(L) {
  if (L.sign) return L;
  L.sign = L.faces.map((f, i) => {
    if (i === L.root || !L.hinge[i]) return 0;
    const a = to3(L.hinge[i][0]), b = to3(L.hinge[i][1]), axis = norm(sub(b, a));
    const c = to3(mean(f.pts));
    const M = mul4(translate4(...a), mul4(rotAxis4(axis, 0.1), translate4(-a[0], -a[1], -a[2])));
    return apply4(M, c)[1] > 0 ? 1 : -1;
  });
  L.order = [...L.faces.keys()].sort((a, b) => L.depth[a] - L.depth[b]);
  return L;
}

// 各面の行列（平面座標→折った姿）。angles[i] は親に対して起き上がる角（0〜L.fold[i]）
export function worldMatrices(L, angles) {
  prepareLayout(L);
  const W = Array(L.faces.length);
  for (const i of L.order) {
    if (i === L.root || L.parent[i] < 0) { W[i] = I4(); continue; }
    const a = to3(L.hinge[i][0]), b = to3(L.hinge[i][1]), axis = norm(sub(b, a));
    const R = mul4(translate4(...a), mul4(rotAxis4(axis, L.sign[i] * angles[i]), translate4(-a[0], -a[1], -a[2])));
    W[i] = mul4(W[L.parent[i]], R);
  }
  return W;
}

export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 進み具合 p（0〜1）から各面の角度（根から浅い順に少しずつ遅れて起き上がる。見本v2 anglesFor と同じ）
export function anglesFor(L, p, stagger = 0.16) {
  const s = Math.min(stagger, 0.6 / Math.max(1, L.maxDepth));
  const span = 1 - (L.maxDepth - 1) * s;
  return L.depth.map((d, i) => {
    if (d === 0) return 0;
    const t = Math.max(0, Math.min(1, (p - (d - 1) * s) / span));
    return easeInOut(t) * L.fold[i];
  });
}

// 折りきった姿の、面ごとの中心・法線（内向き）と頂点
export function foldedFaces(L, angles = L.fold) {
  const W = worldMatrices(L, angles);
  return L.faces.map((f, i) => {
    const pts = f.pts.map(p => apply4(W[i], to3(p)));
    return { pts, center: mean(pts), inward: norm(applyDir4(W[i], [0, 1, 0])), W: W[i] };
  });
}

// 重なる面（折ったときに同じ場所へ来る面）
export function overlappingFaces(F, eps = 0.02) {
  const out = new Set();
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) if (dist(F[i].center, F[j].center) < eps) { out.add(i); out.add(j); }
  return [...out];
}

// 外周の辺（蝶番でない辺）。{ face, k（面の k 番目の辺）, a, b（平面座標） }
export function outerEdges(L) {
  const hingeSet = new Set();
  L.faces.forEach((f, i) => { if (L.hinge[i]) hingeSet.add(edgeId(L.hinge[i][0], L.hinge[i][1])); });
  const out = [];
  L.faces.forEach((f, i) => {
    for (let k = 0; k < f.pts.length; k++) {
      const a = f.pts[k], b = f.pts[(k + 1) % f.pts.length];
      if (!hingeSet.has(edgeId(a, b))) out.push({ face: i, k, a, b });
    }
  });
  return out;
}
const rk = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
export const edgeId = (a, b) => { const x = rk(a), y = rk(b); return x < y ? x + '|' + y : y + '|' + x; };
const rk3 = p => p.map(v => Math.round(v * 100)).join(',');

// 組み立てたときに重なる外周の辺の組（4年「重なる辺」・のりしろ）
export function edgePairs(L, F = foldedFaces(L)) {
  const edges = outerEdges(L);
  const byKey = new Map();
  edges.forEach((e, n) => {
    const A = F[e.face].pts[e.k], B = F[e.face].pts[(e.k + 1) % L.faces[e.face].pts.length];
    const ka = rk3(A), kb = rk3(B), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(n);
  });
  const pairs = [];
  for (const g of byKey.values()) if (g.length === 2) pairs.push([edges[g[0]], edges[g[1]]]);
  return pairs;
}

// 同じ角に集まる頂点（平面で区別できる頂点を、折った位置でまとめる）
export function vertexGroups(L, F = foldedFaces(L)) {
  const pts2 = new Map();
  L.faces.forEach((f, i) => f.pts.forEach((p, k) => { const id = rk(p); if (!pts2.has(id)) pts2.set(id, { p, at: F[i].pts[k] }); }));
  const groups = new Map();
  for (const v of pts2.values()) { const key = rk3(v.at); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(v.p); }
  return [...groups.values()];
}

// 向かい合う面（法線が逆向き）。なければ -1
export function oppositeFaces(F) {
  return F.map((f, i) => F.findIndex((g, j) => j !== i && dot(f.inward, g.inward) < -0.999));
}

// 折った立体の、面・辺・頂点の位置（数える・平行と垂直・見取図に使う）
export function solidFromFold(F) {
  const verts = [], vkey = new Map();
  const vid = p => { const k = rk3(p); if (!vkey.has(k)) { vkey.set(k, verts.length); verts.push(p); } return vkey.get(k); };
  const faces = F.map(f => f.pts.map(vid));
  const emap = new Map();
  faces.forEach((f, fi) => f.forEach((a, k) => { const b = f[(k + 1) % f.length], key = a < b ? a + '-' + b : b + '-' + a; if (!emap.has(key)) emap.set(key, { v: a < b ? [a, b] : [b, a], f: [] }); emap.get(key).f.push(fi); }));
  return { verts, faces, edges: [...emap.values()] };
}

// レイアウトを平面内で回す（縦長の画面で縦向きに置く等）
export function rotateLayout(L, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), R = p => [c * p[0] - s * p[1], s * p[0] + c * p[1]];
  const out = { ...L, faces: L.faces.map(f => ({ ...f, pts: f.pts.map(R) })), hinge: L.hinge.map(h => (h ? [R(h[0]), R(h[1])] : null)) };
  delete out.sign; delete out.order;
  return out;
}
export function layoutBounds(L) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of L.faces) for (const [x, y] of f.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
// 平行移動
export function shiftLayout(L, dx, dy) {
  const T = p => [p[0] + dx, p[1] + dy];
  const out = { ...L, faces: L.faces.map(f => ({ ...f, pts: f.pts.map(T) })), hinge: L.hinge.map(h => (h ? [T(h[0]), T(h[1])] : null)) };
  delete out.sign; delete out.order;
  return out;
}
