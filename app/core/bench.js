// 基準物（data/benchmarks.json）。全単元で使い回す身の回りの物の大きさ。値は画面に直接書かず、ここから読む。
let ITEMS = [], BY = new Map();
export async function loadBench() {
  try { const j = await (await fetch(new URL('../../data/benchmarks.json', import.meta.url))).json(); setBench(j.items); }
  catch (e) { console.error(e); }
}
export function setBench(items) { ITEMS = items || []; BY = new Map(ITEMS.map(b => [b.id, b])); }
export const bench = id => BY.get(id) || null;
export const benchAll = () => ITEMS;
// 「やく」を付けるか
export const yaku = b => (b && b.approx ? 'やく ' : '');
