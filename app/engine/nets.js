// 展開（全域木）・重なり判定・合同判定キー（設計書 §2-2）。reference/net_counter.py と同じ考え方の JS 版。
import { sub, cross, dot, norm, len } from './vec.js';

// 面の隣接：2つの面が共有する辺（頂点番号の組）の一覧
export function faceEdges(P) {
  const map = new Map();
  P.F.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k], b = f[(k + 1) % f.length];
      const key = a < b ? a + '-' + b : b + '-' + a;
      if (!map.has(key)) map.set(key, { v: a < b ? [a, b] : [b, a], f: [] });
      map.get(key).f.push(fi);
    }
  });
  return [...map.values()].filter(e => e.f.length === 2);
}

export function faceNormal(P, fi) {
  const f = P.F[fi], V = P.V;
  return norm(cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]])));
}

// 面を、外から見て反時計回りの平面座標にする（python の face2d と同じ）
export function face2d(P, fi) {
  const f = P.F[fi], V = P.V, o = V[f[0]];
  const u = norm(sub(V[f[1]], o));
  const n = norm(cross(sub(V[f[1]], o), sub(V[f[2]], o)));
  const w = cross(n, u);
  const out = {};
  for (const i of f) { const d = sub(V[i], o); out[i] = [dot(d, u), dot(d, w)]; }
  return out;
}

// 折る角度＝π−二面角（外向き法線どうしのなす角）
export function foldAngle(P, fi, fj) {
  return Math.acos(Math.max(-1, Math.min(1, dot(faceNormal(P, fi), faceNormal(P, fj)))));
}

// 全域木（辺の番号の配列）を平面に開き、折れる形（レイアウト）にする
// レイアウト：faces[i].pts は立体の面 i の頂点（P.F[i] の順）の平面座標。parent・hinge・fold・depth を持つ。
export function layoutFromTree(P, E, treeIdx, rootHint = null) {
  const nF = P.F.length;
  const adj = Array.from({ length: nF }, () => []);
  for (const k of treeIdx) { const e = E[k]; adj[e.f[0]].push([e.f[1], e.v]); adj[e.f[1]].push([e.f[0], e.v]); }
  const bfs = r => {
    const depth = Array(nF).fill(-1), parent = Array(nF).fill(-1), via = Array(nF).fill(null), order = [r];
    depth[r] = 0;
    for (let q = 0; q < order.length; q++) {
      const u = order[q];
      for (const [v, ev] of adj[u]) if (depth[v] < 0) { depth[v] = depth[u] + 1; parent[v] = u; via[v] = ev; order.push(v); }
    }
    return { depth, parent, via, order };
  };
  let root = rootHint, best = null;
  if (root == null) {
    for (let r = 0; r < nF; r++) {
      const t = bfs(r), maxD = Math.max(...t.depth), score = maxD * 10 + t.depth.reduce((a, b) => a + b, 0) / 10;
      if (!best || score < best.score - 1e-9) best = { score, r };
    }
    root = best.r;
  }
  const t = bfs(root);
  const loc = P.F.map((f, fi) => face2d(P, fi));
  const placed = Array(nF).fill(null);
  placed[root] = loc[root];
  for (const v of t.order) {
    if (v === root) continue;
    const u = t.parent[v], [a, b] = t.via[v];
    const pa = placed[u][a], pb = placed[u][b], la = loc[v][a], lb = loc[v][b];
    const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) - Math.atan2(lb[1] - la[1], lb[0] - la[0]);
    const c = Math.cos(ang), s = Math.sin(ang), out = {};
    for (const i of P.F[v]) { const dx = loc[v][i][0] - la[0], dy = loc[v][i][1] - la[1]; out[i] = [pa[0] + c * dx - s * dy, pa[1] + s * dx + c * dy]; }
    placed[v] = out;
  }
  const faces = P.F.map((f, fi) => ({ pts: f.map(i => placed[fi][i]), vid: [...f], type: P.faceType ? P.faceType[fi] : 'face' }));
  const hinge = t.via.map((ev, i) => (ev ? [placed[i][ev[0]], placed[i][ev[1]]] : null));
  const fold = t.via.map((ev, i) => (ev ? foldAngle(P, i, t.parent[i]) : 0));
  return finishLayout({ faces, root, parent: t.parent, hinge, fold, depth: t.depth, tree: [...treeIdx].sort((a, b) => a - b) });
}

export function finishLayout(L) {
  L.maxDepth = Math.max(...L.depth);
  return L;
}

// 凸多角形どうしの重なり（分離軸）。辺や点で接するだけなら重ならない
export function satOverlap(A, B, eps = 1e-7) {
  for (const P of [A, B]) {
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length];
      const nx = -(q[1] - p[1]), ny = q[0] - p[0];
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const a of A) { const d = a[0] * nx + a[1] * ny; if (d < amin) amin = d; if (d > amax) amax = d; }
      for (const b of B) { const d = b[0] * nx + b[1] * ny; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
      if (amax <= bmin + eps || bmax <= amin + eps) return false;
    }
  }
  return true;
}
export function layoutOverlaps(polys) {
  const out = [];
  for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) if (satOverlap(polys[i], polys[j])) out.push([i, j]);
  return out;
}

// 合同判定キー：各面の各辺を、両向き×裏返しありで x 軸に合わせた全配置のうち、
// 面の頂点列（丸め3桁）を並べた最小のもの（python の canon と同じ考え方）
const r3 = v => { const r = Math.round(v * 1000) / 1000; return r === 0 ? 0 : r; };
function cmpArr(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const d = a[i] - b[i]; if (d) return d; }
  return a.length - b.length;
}
function cmpPolys(A, B) {
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) { const d = cmpArr(A[i], B[i]); if (d) return d; }
  return A.length - B.length;
}
export function canonKey(polys) {
  let best = null;
  for (const P of polys) {
    for (let k = 0; k < P.length; k++) {
      const p0 = P[k], p1 = P[(k + 1) % P.length];
      for (const [a, b] of [[p0, p1], [p1, p0]]) {
        const ang = -Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
        for (const flip of [1, -1]) {
          const cand = polys.map(Q => {
            const pts = Q.map(q => { const dx = q[0] - a[0], dy = q[1] - a[1]; return [r3(c * dx - s * dy), r3((s * dx + c * dy) * flip)]; });
            pts.sort((u, v) => u[0] - v[0] || u[1] - v[1]);
            return pts.flat();
          });
          cand.sort(cmpArr);
          if (!best || cmpPolys(cand, best) < 0) best = cand;
        }
      }
    }
  }
  return best.map(p => p.join(',')).join('|');
}
// キーを短い文字列にする（カタログに入れる・記録に残す用）
export function keyHash(key) {
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0; h2 ^= h2 >>> 13;
  }
  return h1.toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

// 全域木の総当たり（辺の組み合わせ＋素集合）。fn(treeIdx) を全域木ごとに呼ぶ
export function forEachSpanningTree(nF, E, fn) {
  const m = E.length, k = nF - 1, idx = [...Array(k).keys()];
  const par = new Array(nF);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  while (true) {
    for (let i = 0; i < nF; i++) par[i] = i;
    let ok = true;
    for (const e of idx) { const a = find(E[e].f[0]), b = find(E[e].f[1]); if (a === b) { ok = false; break; } par[a] = b; }
    if (ok) fn(idx.slice());
    let i = k - 1;
    while (i >= 0 && idx[i] === m - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

// Wilson のアルゴリズム：面の隣接グラフの全域木を一様に1つ選ぶ（正十二面体・正二十面体）
export function wilsonTree(nF, E, rand = Math.random) {
  const nb = Array.from({ length: nF }, () => []);
  E.forEach((e, k) => { nb[e.f[0]].push([e.f[1], k]); nb[e.f[1]].push([e.f[0], k]); });
  const inTree = Array(nF).fill(false), next = Array(nF).fill(-1), nextEdge = Array(nF).fill(-1);
  inTree[Math.floor(rand() * nF)] = true;
  for (let s = 0; s < nF; s++) {
    let u = s;
    while (!inTree[u]) { const [v, k] = nb[u][Math.floor(rand() * nb[u].length)]; next[u] = v; nextEdge[u] = k; u = v; }
    u = s;
    while (!inTree[u]) { inTree[u] = true; u = next[u]; }
  }
  // 根以外の各面から、木へ向かう最後の辺が全域木の辺になる
  const tree = [];
  for (let u = 0; u < nF; u++) if (nextEdge[u] >= 0) tree.push(nextEdge[u]);
  return tree;
}

// 面・辺・頂点の数（オイラーの数え方の確認にも使う）
export function counts(P) { return { faces: P.F.length, edges: faceEdges(P).length, vertices: P.V.length }; }

export function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; }
export function polyCentroid(pts) { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; }

// 面の形の名前（合同な面は同じ名前。裏返しも同じとみる）：カードの種類・二面角の表に使う
export function shapeSig(pts) {
  const n = pts.length, seq = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
    const e = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const t = Math.atan2((a[0] - b[0]) * (c[1] - b[1]) - (a[1] - b[1]) * (c[0] - b[0]), (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]));
    seq.push([Math.round(e * 100), Math.round(Math.abs(t) * 180 / Math.PI)]);
  }
  let best = null;
  const variants = [];
  for (let r = 0; r < n; r++) variants.push(seq.slice(r).concat(seq.slice(0, r)));
  // 裏返し：辺の並びを逆にし、角を辺の前後で入れ替える
  const rev = [];
  for (let i = 0; i < n; i++) rev.push([seq[(n - 1 - i + n - 1) % n][0], seq[(n - 1 - i) % n][1]]);
  for (let r = 0; r < n; r++) variants.push(rev.slice(r).concat(rev.slice(0, r)));
  for (const v of variants) { const s = v.map(x => x.join(':')).join(','); if (best === null || s < best) best = s; }
  return best;
}
export const edgeLen2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export { len };
