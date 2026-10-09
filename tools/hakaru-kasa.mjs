// K2「○L○dL を つくる」の注ぎ方を数えて data/hakaru/masu.json に凍結し、app/units/k2.json のずかん（k2-masu）を作り直す。
// node tools/hakaru-kasa.mjs   （tests/unit/hakaru-kasa.test.mjs が「数え直すと凍結値と一致」「単元のずかんと一致」を確かめる）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { masuAll, masuTargets, masuId, dlText, MASU_RULE } from '../app/parts/_water.js';

const ROOT = new URL('../', import.meta.url);
export function buildMasu() {
  const ways = masuAll();
  return { note: 'K2「○L○dL を つくる」の注ぎ方（tools/hakaru-kasa.mjs で計算して凍結）。', rule: MASU_RULE, targets: masuTargets().length, total: ways.length, ways: ways.map(masuId) };
}
// ずかんの項目（つくる かさ → 注ぎ方の順）
export function masuItems(ways = masuAll()) {
  return ways.map(w => ({
    id: masuId(w),
    label: [w.x ? `1Lます ${w.x}かい` : '', w.y ? `1dLます ${w.y}かい` : ''].filter(Boolean).join('＋'),
    val: dlText(w.T),
    fig: `pour:${w.x}:${w.y}`,
    hint: dlText(w.T),
  }));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const m = buildMasu();
  mkdirSync(new URL('data/hakaru/', ROOT), { recursive: true });
  writeFileSync(new URL('data/hakaru/masu.json', ROOT), JSON.stringify(m, null, 1) + '\n');
  const uf = new URL('app/units/k2.json', ROOT);
  if (existsSync(uf)) {
    const u = JSON.parse(readFileSync(uf, 'utf8')), z = (u.zukan || []).find(x => x.id === 'k2-masu');
    if (z) { z.items = masuItems(); writeFileSync(uf, JSON.stringify(u, null, 1) + '\n'); }
  }
  console.log('masu', m.targets, 'targets,', m.total, 'ways');
}
