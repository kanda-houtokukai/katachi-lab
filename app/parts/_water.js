// 水の計算（かさ K1・K2・U3）。DOM に触らない（単体テストで確かめる）。
// 見本 v1（reference/hakaru-mock-src/30-water.js）の多角形の切り取りと二分探索（waterPoly・tiltFor）を、
// 長方形だけでなく凸多角形の入れ物（どんぶり・バケツ・ペットボトル など）に広げたもの。
// 座標は入れ物の「底のまん中」が原点、上がマイナス（SVG と同じ向き）。単位は cm（見た目の大きさ）。

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 多角形 poly のうち、g・p ≥ s の側（重力の向きの「下」）を残す
export function clipHalf(poly, g, s) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = a[0] * g[0] + a[1] * g[1] - s, db = b[0] * g[0] + b[1] * g[1] - s;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
export function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
// 入れ物が th 度（時計回り）かたむいたときの、入れ物から見た重力の向き
export function gravity(th) { const r = th * Math.PI / 180; return [Math.sin(r), Math.cos(r)]; }

// 入れ物の内側の形（凸多角形）。w・h は cm
export const SHAPES = {
  rect: (w, h) => [[-w / 2, -h], [w / 2, -h], [w / 2, 0], [-w / 2, 0]],
  // 上が広い（バケツ・コップ）／せまい（やかん）台形
  taper: (w, h, bot = 0.75) => [[-w / 2, -h], [w / 2, -h], [w * bot / 2, 0], [-w * bot / 2, 0]],
  // どんぶり：底がせまく、横がふくらむ
  bowl: (w, h) => [[-w / 2, -h], [w / 2, -h], [w * 0.43, -h * 0.42], [w * 0.24, 0], [-w * 0.24, 0], [-w * 0.43, -h * 0.42]],
  // ペットボトル・すいとう：肩がすぼまって口になる
  bottle: (w, h, neck = 0.42, sh = 0.78) => [[-w * neck / 2, -h], [w * neck / 2, -h], [w / 2, -h * sh], [w / 2, 0], [-w / 2, 0], [-w / 2, -h * sh]],
  // やかん：下が広く、上がすぼまる
  kettle: (w, h) => [[-w * 0.3, -h], [w * 0.3, -h], [w / 2, -h * 0.45], [w / 2, 0], [-w / 2, 0], [-w / 2, -h * 0.45]],
};
export function polyOf(v) { return (SHAPES[v.shape || 'rect'] || SHAPES.rect)(v.w, v.h, v.k); }

// 水の多角形：入れ物の形 P の中で、面積が f（0〜1）の割合になる位置で、重力に垂直に切る（二分探索）
export function waterPoly(P, f, rot = 0) {
  f = clamp(f, 0, 1); if (f <= 0.0005) return null;
  if (f >= 0.9995) return P.slice();
  const g = gravity(rot), target = f * area(P), ds = P.map(p => p[0] * g[0] + p[1] * g[1]);
  let lo = Math.min(...ds), hi = Math.max(...ds);
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (area(clipHalf(P, g, m)) > target) lo = m; else hi = m; }
  return clipHalf(P, g, (lo + hi) / 2);
}
// 水面の高さ（かたむいていないとき）。底から上へ（cm）
export function levelOf(P, f) { const W = waterPoly(P, f, 0); if (!W) return 0; return -Math.min(...W.map(p => p[1])); }
// 口の角（sign：+1 右・−1 左）。いちばん上の点のうち、その側の端
export function lipOf(P, sign) { const top = Math.min(...P.map(p => p[1])); const cand = P.filter(p => Math.abs(p[1] - top) < 1e-6); return cand.reduce((a, b) => (sign * b[0] > sign * a[0] ? b : a)); }
// 注ぐ角度：水面が口の角にとどく角度（二分探索）。これより傾けると水が出る
export function tiltFor(P, f, sign) {
  const target = clamp(f, 0, 1) * area(P), lip = lipOf(P, sign);
  let lo = 0, hi = 150;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, g = gravity(sign * m), s = lip[0] * g[0] + lip[1] * g[1]; if (area(clipHalf(P, g, s)) > target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/* ---------- K2「○L○dL を つくる」の注ぎ方（ずかんの総数。tools/hakaru-kasa.mjs が data/hakaru/masu.json に凍結） ----------
   つくる かさ：1L1dL〜2L9dL（L は 1・2、dL は 1〜9）の 18とおり。
   注ぎ方：1Lますで x かい、1dLますで y かい いれて、ちょうど その かさに する（x・y は 0 いじょう。x×10＋y＝dL の かず）。
   注ぐ じゅんばんは くべつしない。1Lますを つかわずに 1dLますだけで いれるのも 1つの 注ぎ方（10dL＝1L に 気づく）。 */
export const MASU_RULE = 'つくる かさ 1L1dL〜2L9dL（18とおり）。1Lますで x かい・1dLますで y かい（x×10＋y＝dL、x・y≧0、じゅんばんは くべつしない）';
export function masuTargets() { const t = []; for (let L = 1; L <= 2; L++) for (let d = 1; d <= 9; d++) t.push(L * 10 + d); return t; }
export function masuWays(T) { const w = []; for (let x = Math.floor(T / 10); x >= 0; x--) w.push({ T, x, y: T - 10 * x }); return w; }
export function masuAll() { return masuTargets().flatMap(masuWays); }
export const masuId = w => `${w.T}:${w.x}:${w.y}`;
// 「1L 3dL」（dL の数から）
export const dlText = d => [Math.floor(d / 10) ? Math.floor(d / 10) + 'L' : '', d % 10 ? (d % 10) + 'dL' : ''].filter(Boolean).join(' ') || '0dL';
