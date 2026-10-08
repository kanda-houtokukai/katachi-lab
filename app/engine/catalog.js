// 展開図カタログの読み込みと引き当て（設計書 §2-2・§2-4）。
// data/nets/<solidId>.json（tools/build-catalog.mjs が作る）を読み、番号・レイアウトを返す。
import { solid } from './solids.js';
import { layoutFromTree, canonKey, keyHash } from './nets.js';

const cache = new Map();
let loader = async id => {
  const r = await fetch(new URL(`../../data/nets/${id}.json`, import.meta.url));
  if (!r.ok) throw new Error('catalog ' + id);
  return r.json();
};
export function setCatalogLoader(fn) { loader = fn; }

export async function loadCatalog(id) {
  if (!cache.has(id)) cache.set(id, loader(id).then(j => wrap(j)));
  return cache.get(id);
}

function wrap(j) {
  const P = solid(j.id);
  const E = j.edges.map(([v, f]) => ({ v, f }));
  const byHash = new Map(j.nets.map(n => [n.key, n.no]));
  const layouts = new Map();
  return {
    id: j.id, name: j.name, count: j.count, raw: j, P, E,
    layout(no) {
      if (!layouts.has(no)) { const n = j.nets[no - 1]; layouts.set(no, layoutFromTree(P, E, n.tree, n.root)); }
      return layouts.get(no);
    },
    // 平面の面の並び（多角形の配列）から番号を引く。なければ 0
    lookup(polys) { return byHash.get(keyHash(canonKey(polys))) || 0; },
    lookupHash(h) { return byHash.get(h) || 0; },
    polys(no) { return j.nets[no - 1].p.map(a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; }); },
  };
}
