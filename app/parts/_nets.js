// 部品が使う展開図の出どころ（立方体の方眼・箱の十字形・カタログ）。
import { box } from '../engine/solids.js';
import { faceEdges, layoutFromTree } from '../engine/nets.js';
import { NETS11, cellsToLayout, normalize } from '../engine/grid.js';
import { loadCatalog } from '../engine/catalog.js';

// 面の組（[i,j] の並び）から全域木を選ぶ
export function treeByPairs(P, E, pairs) {
  return pairs.map(([a, b]) => { const k = E.findIndex(e => (e.f[0] === a && e.f[1] === b) || (e.f[0] === b && e.f[1] === a)); if (k < 0) throw new Error('no edge'); return k; });
}
// 直方体（たて L・よこ W・たかさ H）の十字形。面の順：0そこ 1うえ 2まえ 3みぎ 4うしろ 5ひだり
export function boxCrossLayout(L, W, H) {
  const P = box(L, W, H), E = faceEdges(P);
  const lay = layoutFromTree(P, E, treeByPairs(P, E, [[0, 2], [2, 1], [1, 4], [0, 3], [0, 5]]), 0);
  lay.dims = [L, W, H];
  return lay;
}
// 面の大きさ（2辺）：直方体の面 i の [長いほう, 短いほう]
export function boxFaceDims(L, W, H) { return [[L, W], [L, W], [L, H], [W, H], [L, H], [W, H]].map(([a, b]) => [Math.max(a, b), Math.min(a, b)]); }

export function cubeGridLayout(i, orient = null) { return cellsToLayout(orient ? normalize(orient) : NETS11[i]); }
export async function catalogLayout(solid, no) { const c = await loadCatalog(solid); return c.layout(no); }
export { NETS11 };
