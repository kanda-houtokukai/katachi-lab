// 立方体の方眼（見本v2 reference/engine-v2-cube.js を描画から切り離して移したもの）。
// マスの並び（cells）を汎用のレイアウトに変えて、汎用の折りたたみで動かす。
import { finishLayout } from './nets.js';

export const NETS11 = [
  // 1-4-1 型（6種）
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  // 2-3-1 型（3種）
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  // 2-2-2 型（階段）
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  // 3-3 型
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

// 箱にならない並べ方（クイズ用の候補。実行時にも判定で確かめる）
export const INVALID_CANDIDATES = [
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [3, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [2, 3]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [2, 2]],
];

const key = (x, z) => x + ',' + z;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function normalize(cells) {
  const mx = Math.min(...cells.map(c => c[0])), mz = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0] - mx, c[1] - mz]);
}
export function symmetries(cells) {
  const fs = [
    ([x, z]) => [x, z], ([x, z]) => [-z, x], ([x, z]) => [-x, -z], ([x, z]) => [z, -x],
    ([x, z]) => [-x, z], ([x, z]) => [z, x], ([x, z]) => [x, -z], ([x, z]) => [-z, -x],
  ];
  return fs.map(f => normalize(cells.map(f)));
}
export function canonCells(cells) {
  let best = null;
  for (const s of symmetries(cells)) {
    const str = s.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(c => c.join(':')).join('|');
    if (best === null || str < best) best = str;
  }
  return best;
}
const CANON11 = NETS11.map(canonCells);
export function netId(cells) { return CANON11.indexOf(canonCells(cells)); }
export function randomOrient(cells, rand = Math.random) { const s = symmetries(cells); return s[Math.floor(rand() * s.length)]; }

export function isConnected(cells) {
  if (!cells.length) return false;
  const set = new Set(cells.map(c => key(c[0], c[1])));
  const seen = new Set([key(cells[0][0], cells[0][1])]);
  const q = [cells[0]];
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of DIRS) { const k = key(x + dx, z + dz); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x + dx, z + dz]); } }
  }
  return seen.size === cells.length;
}

// 根は「いちばん浅い木になる面」を選ぶ（折りの段数が少なく見栄えがよい。見本v2 buildTree と同じ）
export function buildTree(cells) {
  const idx = new Map(cells.map((c, i) => [key(c[0], c[1]), i]));
  let best = null;
  for (let r = 0; r < cells.length; r++) {
    const parent = Array(cells.length).fill(-1), dir = Array(cells.length).fill(null), depth = Array(cells.length).fill(-1);
    depth[r] = 0;
    const q = [r];
    while (q.length) {
      const i = q.shift(), [x, z] = cells[i];
      for (const [dx, dz] of DIRS) { const j = idx.get(key(x + dx, z + dz)); if (j !== undefined && depth[j] < 0) { depth[j] = depth[i] + 1; parent[j] = i; dir[j] = [dx, dz]; q.push(j); } }
    }
    const maxD = Math.max(...depth), score = maxD * 10 + depth.reduce((a, b) => a + b, 0) / 10;
    if (!best || score < best.score) best = { root: r, parent, dir, depth, maxDepth: maxD, score };
  }
  return best;
}

// マスの並び → 汎用レイアウト（1マス＝1単位の正方形。蝶番は 90°）
export function cellsToLayout(cells) {
  const t = buildTree(cells);
  const faces = cells.map(([x, z]) => ({ pts: [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], type: 'rect', cell: [x, z] }));
  const hinge = cells.map((c, i) => {
    if (t.parent[i] < 0) return null;
    const [dx, dz] = t.dir[i], [x, z] = cells[t.parent[i]];
    if (dx === 1) return [[x + 1, z], [x + 1, z + 1]];
    if (dx === -1) return [[x, z], [x, z + 1]];
    if (dz === 1) return [[x, z + 1], [x + 1, z + 1]];
    return [[x, z], [x + 1, z]];
  });
  return finishLayout({ faces, root: t.root, parent: t.parent, hinge, fold: cells.map((c, i) => (t.parent[i] < 0 ? 0 : Math.PI / 2)), depth: t.depth, cells: cells.map(c => [...c]) });
}
