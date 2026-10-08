// のりしろ（設計書 §2-6）：外周の辺の組ごとに、どちらか一方へ台形ののりしろを付ける。
// のりしろどうし・のりしろと面が重ならない付け方を、組ごとに試して探す（見本v2の方法を多角形へ一般化）。
import { satOverlap } from './nets.js';
import { edgePairs, foldedFaces } from './fold.js';

const D = 0.2, C = 0.2;

// 辺 a→b の外側（面の外）に台形を作る。面は反時計回りなので外側は右手側
export function tabPoly(a, b, depth = D) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
  const ux = ex / L, uy = ey / L, nx = uy, ny = -ux; // 右手側
  const c = Math.min(C, L * 0.3), d = Math.min(depth, L * 0.35);
  return [a, [a[0] + ux * c + nx * d, a[1] + uy * c + ny * d], [b[0] - ux * c + nx * d, b[1] - uy * c + ny * d], b];
}

export function glueTabs(L, F = foldedFaces(L)) {
  const pairs = edgePairs(L, F);
  const faces = L.faces.map(f => f.pts);
  const options = pairs.map(p => p.map(e => ({ face: e.face, k: e.k, a: e.a, b: e.b, poly: tabPoly(e.a, e.b) })));
  const okWithFaces = options.map(op => op.map(t => faces.every(f => !satOverlap(t.poly, f))));
  const chosen = [];
  let steps = 0;
  const LIMIT = 200000;
  // 制約の強い組から決める
  const order = [...pairs.keys()].sort((x, y) => okWithFaces[x].filter(Boolean).length - okWithFaces[y].filter(Boolean).length);
  function dfs(n) {
    if (n === order.length) return true;
    if (++steps > LIMIT) return false;
    const pi = order[n];
    for (const s of [0, 1]) {
      if (!okWithFaces[pi][s]) continue;
      const t = options[pi][s];
      if (chosen.some(c => satOverlap(c.poly, t.poly))) continue;
      chosen.push(t);
      if (dfs(n + 1)) return true;
      chosen.pop();
    }
    return false;
  }
  if (dfs(0)) return { tabs: chosen.slice(), overlaps: 0, pairs: pairs.length };
  // 見つからないとき：重なりが最少になるよう貪欲に付ける（テストで 0 を確かめる）
  const greedy = [];
  let bad = 0;
  for (const pi of order) {
    const sc = options[pi].map((t, s) => (okWithFaces[pi][s] ? 0 : 1) + greedy.filter(c => satOverlap(c.poly, t.poly)).length);
    const s = sc[0] <= sc[1] ? 0 : 1;
    bad += sc[s]; greedy.push(options[pi][s]);
  }
  return { tabs: greedy, overlaps: bad, pairs: pairs.length };
}
