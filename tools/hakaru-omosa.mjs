// O3「1kg を つくろう」の組み合わせを数えて data/hakaru/kg.json に凍結し、app/units/o3.json のずかん（o3-kg）を作り直す。
// 物の重さは data/benchmarks.json から読む（ランドセルは使わない＝massRef:false）。
// node tools/hakaru-omosa.mjs   （tests/unit/hakaru-kasa.test.mjs が「数え直すと凍結値と一致」「単元のずかんと一致」を確かめる）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KG_ITEMS, KG_MAX, KG_TARGET, KG_RULE, kgCombos, comboId } from '../app/parts/_omosa.js';
import { MONO_NAMES } from '../app/parts/_mono.js';

const ROOT = new URL('../', import.meta.url);
export function kgItemsFrom(bench) {
  const by = Object.fromEntries(bench.map(b => [b.id, b]));
  return KG_ITEMS.map(id => { const b = by[id]; if (!b || typeof b.mass_g !== 'number' || b.massRef === false) throw new Error('重さの基準に使えない物: ' + id); return { id, g: b.mass_g }; });
}
export function buildKg(bench) {
  const items = kgItemsFrom(bench), combos = kgCombos(items, KG_TARGET, KG_MAX);
  return { note: 'O3「1kg を つくろう」の組み合わせ（tools/hakaru-omosa.mjs で計算して凍結）。重さは data/benchmarks.json。', rule: KG_RULE, items, max: KG_MAX, target: KG_TARGET, total: combos.length, combos: combos.map(comboId) };
}
export function kgItems(bench) {
  const items = kgItemsFrom(bench);
  return kgCombos(items).map(o => {
    const id = comboId(o), kinds = Object.keys(o).length;
    return { id, label: KG_ITEMS.filter(k => o[k]).map(k => `${MONO_NAMES[k]}${o[k] > 1 ? '×' + o[k] : ''}`).join('・'), fig: 'mono:' + id, hint: `${kinds}しゅるい` };
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bench = JSON.parse(readFileSync(new URL('data/benchmarks.json', ROOT), 'utf8')).items;
  const k = buildKg(bench);
  mkdirSync(new URL('data/hakaru/', ROOT), { recursive: true });
  writeFileSync(new URL('data/hakaru/kg.json', ROOT), JSON.stringify(k, null, 1) + '\n');
  const uf = new URL('app/units/o3.json', ROOT);
  if (existsSync(uf)) {
    const u = JSON.parse(readFileSync(uf, 'utf8')), z = (u.zukan || []).find(x => x.id === 'o3-kg');
    if (z) { z.items = kgItems(bench); writeFileSync(uf, JSON.stringify(u, null, 1) + '\n'); }
  }
  console.log('kg', k.items.length, 'items,', k.total, 'combos');
}
