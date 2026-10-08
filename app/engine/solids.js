// 立体の定義（設計書 §2-1）。描画に依存しない。ブラウザと Node の両方で使う。
// 寸法は reference/net-counts.json の def と同じ。変えると展開図の数が変わる（凍結値のテストで止まる）。
import { sub, cross, dot, norm, scale, add, len } from './vec.js';

// 面を外向き反時計回りにそろえる（reference/net_counter.py の make_poly と同じ）
function makePoly(V, F) {
  const c = scale(V.reduce((s, v) => add(s, v), [0, 0, 0]), 1 / V.length);
  const faces = F.map(f => {
    const n = cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]]));
    const m = scale(f.reduce((s, i) => add(s, V[i]), [0, 0, 0]), 1 / f.length);
    return dot(n, sub(m, c)) < 0 ? [...f].reverse() : [...f];
  });
  return { V: V.map(v => [...v]), F: faces };
}

function regularBase(n, side) {
  const R = side / (2 * Math.sin(Math.PI / n));
  return [...Array(n).keys()].map(k => [R * Math.cos(2 * Math.PI * k / n), R * Math.sin(2 * Math.PI * k / n)]);
}

export function prism(n, { side = 1, h = 1.6, base = null } = {}) {
  base = base || regularBase(n, side);
  n = base.length;
  const V = [...base.map(([x, y]) => [x, y, 0]), ...base.map(([x, y]) => [x, y, h])];
  const F = [[...Array(n).keys()], [...Array(n).keys()].map(k => n + k)];
  for (let k = 0; k < n; k++) F.push([k, (k + 1) % n, n + (k + 1) % n, n + k]);
  const p = makePoly(V, F);
  p.faceType = F.map((f, i) => (i < 2 ? 'base' : 'side'));
  return p;
}

export function pyramid(n, { side = 1, h = 1.2, base = null } = {}) {
  base = base || regularBase(n, side);
  n = base.length;
  const V = [...base.map(([x, y]) => [x, y, 0]), [0, 0, h]];
  const F = [[...Array(n).keys()]];
  for (let k = 0; k < n; k++) F.push([k, (k + 1) % n, n]);
  const p = makePoly(V, F);
  p.faceType = F.map((f, i) => (i === 0 ? 'base' : 'side'));
  return p;
}

export function box(a, b, c) {
  const p = prism(4, { base: [[0, 0], [a, 0], [a, b], [0, b]], h: c });
  p.faceType = p.F.map(() => 'rect');
  return p;
}

function tetra() {
  return makePoly([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]);
}
function octa() {
  const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const F = [];
  for (const a of [0, 1]) for (const b of [2, 3]) for (const c of [4, 5]) F.push([a, b, c]);
  return makePoly(V, F);
}
const PHI = (1 + Math.sqrt(5)) / 2;
function icosaVerts() {
  const V = [];
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) { V.push([0, s1, s2 * PHI]); V.push([s1, s2 * PHI, 0]); V.push([s2 * PHI, 0, s1]); }
  return V;
}
// 正二十面体：互いの距離が辺の長さ（2）になる3頂点が面
function icosa() {
  const V = icosaVerts(), F = [], d = (a, b) => len(sub(V[a], V[b]));
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++)
    if (Math.abs(d(i, j) - 2) < 1e-6 && Math.abs(d(j, k) - 2) < 1e-6 && Math.abs(d(i, k) - 2) < 1e-6) F.push([i, j, k]);
  return makePoly(V, F);
}
// 正十二面体：正二十面体の双対（面の重心が頂点、頂点のまわりの5つの面が1つの面）
function dodeca() {
  const I = icosa();
  const V = I.F.map(f => scale(f.reduce((s, i) => add(s, I.V[i]), [0, 0, 0]), 1 / 3));
  const F = I.V.map((v, vi) => {
    const around = I.F.map((f, fi) => (f.includes(vi) ? fi : -1)).filter(x => x >= 0);
    const n = norm(v), c = scale(around.reduce((s, fi) => add(s, V[fi]), [0, 0, 0]), 1 / around.length);
    const u = norm(sub(V[around[0]], c)), w = cross(n, u);
    return around.sort((a, b) => { const pa = sub(V[a], c), pb = sub(V[b], c); return Math.atan2(dot(pa, w), dot(pa, u)) - Math.atan2(dot(pb, w), dot(pb, u)); });
  });
  return makePoly(V, F);
}
function cube() { const p = box(1, 1, 1); return p; }

export function platonic(name) {
  const p = { tetrahedron: tetra, cube, octahedron: octa, dodecahedron: dodeca, icosahedron: icosa }[name]();
  // 辺の長さを 1 にそろえる（見た目の大きさを他の立体と合わせる。数には影響しない）
  const e = edgeLength(p);
  const c = scale(p.V.reduce((s, v) => add(s, v), [0, 0, 0]), 1 / p.V.length);
  p.V = p.V.map(v => scale(sub(v, c), 1 / e));
  p.faceType = p.F.map(() => 'face');
  return p;
}
function edgeLength(p) { const f = p.F[0]; return len(sub(p.V[f[1]], p.V[f[0]])); }

// 凍結値つきの立体（reference/net-counts.json の id と一致させる）
export const SOLID_DEFS = {
  tetra: { name: '正四面体', ruby: '<ruby>正四面体<rt>せいしめんたい</rt></ruby>', make: () => platonic('tetrahedron'), family: 'platonic' },
  cube: { name: '立方体', ruby: '<ruby>立方体<rt>りっぽうたい</rt></ruby>', make: () => box(1, 1, 1), family: 'box' },
  cuboid: { name: '直方体', ruby: '<ruby>直方体<rt>ちょくほうたい</rt></ruby>', make: () => box(1, 1.5, 2.2), family: 'box' },
  'sq-prism': { name: '正四角柱', ruby: '<ruby>正四角柱<rt>せいしかくちゅう</rt></ruby>', make: () => box(1, 1, 1.7), family: 'box' },
  'tri-prism': { name: '正三角柱', ruby: '<ruby>正三角柱<rt>せいさんかくちゅう</rt></ruby>', make: () => prism(3, { side: 1, h: 1.6 }), family: 'prism' },
  'iso-prism': { name: '二等辺三角形の三角柱', ruby: '<ruby>二等辺三角形<rt>にとうへんさんかくけい</rt></ruby>の<ruby>三角柱<rt>さんかくちゅう</rt></ruby>', make: () => prism(3, { base: [[0, 0], [1.2, 0], [0.6, 1.3]], h: 1.6 }), family: 'prism' },
  'right-prism': { name: '直角三角形の三角柱', ruby: '<ruby>直角三角形<rt>ちょっかくさんかくけい</rt></ruby>の<ruby>三角柱<rt>さんかくちゅう</rt></ruby>', make: () => prism(3, { base: [[0, 0], [1.2, 0], [0, 0.9]], h: 1.6 }), family: 'prism' },
  'pent-prism': { name: '正五角柱', ruby: '<ruby>正五角柱<rt>せいごかくちゅう</rt></ruby>', make: () => prism(5, { side: 1, h: 1.6 }), family: 'prism' },
  'hex-prism': { name: '正六角柱', ruby: '<ruby>正六角柱<rt>せいろっかくちゅう</rt></ruby>', make: () => prism(6, { side: 1, h: 1.6 }), family: 'prism' },
  'tri-pyramid': { name: '正三角錐', ruby: '<ruby>正三角錐<rt>せいさんかくすい</rt></ruby>', make: () => pyramid(3, { side: 1, h: 1.3 }), family: 'pyramid' },
  'sq-pyramid': { name: '正四角錐', ruby: '<ruby>正四角錐<rt>せいしかくすい</rt></ruby>', make: () => pyramid(4, { side: 1, h: 1.2 }), family: 'pyramid' },
  'pent-pyramid': { name: '正五角錐', ruby: '<ruby>正五角錐<rt>せいごかくすい</rt></ruby>', make: () => pyramid(5, { side: 1, h: 1.2 }), family: 'pyramid' },
  'hex-pyramid': { name: '正六角錐', ruby: '<ruby>正六角錐<rt>せいろっかくすい</rt></ruby>', make: () => pyramid(6, { side: 1, h: 1.2 }), family: 'pyramid' },
  octa: { name: '正八面体', ruby: '<ruby>正八面体<rt>せいはちめんたい</rt></ruby>', make: () => platonic('octahedron'), family: 'platonic' },
  dodeca: { name: '正十二面体', ruby: '<ruby>正十二面体<rt>せいじゅうにめんたい</rt></ruby>', make: () => platonic('dodecahedron'), family: 'platonic', random: true },
  icosa: { name: '正二十面体', ruby: '<ruby>正二十面体<rt>せいにじゅうめんたい</rt></ruby>', make: () => platonic('icosahedron'), family: 'platonic', random: true },
};
const cache = new Map();
export function solid(id) {
  if (!cache.has(id)) {
    const d = SOLID_DEFS[id];
    if (!d) throw new Error('unknown solid ' + id);
    const p = d.make();
    p.id = id;
    cache.set(id, p);
  }
  return cache.get(id);
}

