// 展開図カタログを作る（設計書 §2-2）。node tools/build-catalog.mjs
// 面の隣接グラフの全域木を総当たり → 平面に開く → 重なり判定 → 合同（回転・裏返し）でまとめる。
// 数は reference/net-counts.json の凍結値と一致しなければならない（tests/unit/catalog.test.mjs）。
import { writeFileSync, readFileSync } from 'node:fs';
import { solid, SOLID_DEFS } from '../app/engine/solids.js';
import { faceEdges, layoutFromTree, layoutOverlaps, canonKey, keyHash, forEachSpanningTree } from '../app/engine/nets.js';
import { NETS11, cellsToLayout } from '../app/engine/grid.js';

const frozen = JSON.parse(readFileSync(new URL('../reference/net-counts.json', import.meta.url)));
const r3 = v => Math.round(v * 1000) / 1000 || 0;

export function enumerate(id) {
  const P = solid(id), E = faceEdges(P);
  const byKey = new Map();
  let trees = 0, overlapping = 0;
  forEachSpanningTree(P.F.length, E, tree => {
    trees++;
    const L = layoutFromTree(P, E, tree);
    const polys = L.faces.map(f => f.pts);
    if (layoutOverlaps(polys).length) { overlapping++; return; }
    const key = canonKey(polys);
    const score = L.maxDepth * 100 + L.depth.reduce((a, b) => a + b, 0);
    const prev = byKey.get(key);
    if (!prev || score < prev.score) byKey.set(key, { key, tree, root: L.root, score, maxDepth: L.maxDepth, L });
  });
  return { P, E, trees, overlapping, nets: [...byKey.values()] };
}

function order(id, nets) {
  if (id === 'cube') {
    const keys = NETS11.map(c => canonKey(cellsToLayout(c).faces.map(f => f.pts)));
    return keys.map(k => { const n = nets.find(x => x.key === k); if (!n) throw new Error('cube net not found'); return n; });
  }
  return nets.slice().sort((a, b) => a.maxDepth - b.maxDepth || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : frozen.solids.filter(s => !SOLID_DEFS[s.id].random).map(s => s.id);
for (const id of ids) {
  const t0 = Date.now();
  const { P, E, trees, overlapping, nets } = enumerate(id);
  const ordered = order(id, nets);
  const fz = frozen.solids.find(s => s.id === id);
  const out = {
    id, name: SOLID_DEFS[id].name, def: fz.def, count: ordered.length, trees, overlapping,
    note: '自動生成（tools/build-catalog.mjs）。手で書き換えない。数は reference/net-counts.json の凍結値とテストで照合する。',
    edges: E.map(e => [e.v, e.f]),
    nets: ordered.map((n, i) => ({ no: i + 1, root: n.root, tree: n.tree, key: keyHash(n.key), p: n.L.faces.map(f => f.pts.flatMap(([x, y]) => [r3(x), r3(y)])) })),
  };
  writeFileSync(new URL(`../data/nets/${id}.json`, import.meta.url), JSON.stringify(out));
  console.log(id, 'trees', trees, 'overlap', overlapping, 'nets', ordered.length, 'frozen', fz.nets, ordered.length === fz.nets ? 'OK' : 'MISMATCH', (Date.now() - t0) + 'ms');
}
