// ながさ（N1・N2m・N3）の ずかんの数を計算して凍結する。ビルド時に1回だけ実行する（実行中のアプリは計算しない）。
//   node tools/hakaru-nagasa.mjs
// ・data/hakaru/routes.json：N3「1km さんぽ」。地図（app/parts/_nagasa-gen.js の NODES・EDGES）で、いえ から 同じ区間を2回 通らずに
//   ちょうど 1000m になる道を すべて。向きの違いは「いえ に もどる ひとまわり」だけ同じとみる（ほかは始点が いえ なので向きは1つ）
// ・data/hakaru/onem.json：N2m「1m を つくる」。基準物 8種（ONEM_IDS）を 同じ物は3つまで使って、ちょうど 1000mm になる組を すべて
// ・単元の ずかん（n1 ikutsu・n2m onem・n3 walk）の items を ここから作って書きこむ
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { walks, keyNodes, EDGES, nodeOf, routeKey, onemCombos, parseOnem, ONEM_IDS, ONEM_MAX, UNIT_OBJS, MY_UNITS, UNAME, unitLen, countText, MONO_IDS, LONG_IDS, cmmm, mcm } from '../app/parts/_nagasa-gen.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const B = JSON.parse(readFileSync(join(ROOT, 'data/benchmarks.json'))).items, by = Object.fromEntries(B.map(b => [b.id, b]));
const lenOf = id => { const b = by[id]; if (!b || !(b.len_mm > 0)) throw new Error('基準物に長さがない: ' + id); return b.len_mm; };
const nm = id => (/^hagaki/.test(id) ? by[id].name.replace('（', ' ').replace('）', '') : by[id].name.replace(/（.*）/, ''));

export function buildRoutes() {
  const keys = walks(1000);
  return keys.map((key, i) => {
    const nodes = keyNodes(key), len = key.split('-').reduce((s, e) => s + EDGES[+e].len, 0);
    return { no: i + 1, key, nodes, len, pts: nodes.map(n => [nodeOf(n).x, nodeOf(n).y]) };
  });
}
export function buildOnem() {
  return onemCombos(lenOf).map((key, i) => ({ no: i + 1, key, cnt: parseOnem(key), sum: Object.entries(parseOnem(key)).reduce((s, [id, n]) => s + lenOf(id) * n, 0) }));
}
export function buildIkutsu() {
  const out = [];
  for (const o of UNIT_OBJS) for (const u of MY_UNITS) out.push({ id: `${o}@${u}`, label: nm(o), val: `${UNAME[u]} ${countText(lenOf(o), unitLen(u, lenOf))}`, fig: `bar:${lenOf(o)}:600`, hint: `${UNAME[u]}で` });
  return out;
}
export function buildMono() { return MONO_IDS.map(id => ({ id, label: nm(id), val: `${by[id].approx ? 'やく ' : ''}${cmmm(Math.round(lenOf(id)))}`, fig: `ruler:${Math.round(lenOf(id))}`, hint: 'じっすん ものさしで' })); }
export function buildLong() { const L = { desk: 'つくえの よこ', blackboard: 'こくばんの よこ', door: 'とびらの たかさ', classroom: 'きょうしつの よこ' }; return LONG_IDS.map(id => ({ id, label: L[id], val: `やく ${mcm(Math.round(lenOf(id) / 10) * 10)}`, fig: `bar:${lenOf(id)}:8000`, hint: '1mものさしで' })); }
const routeItem = r => ({ id: r.key, label: `No.${r.no} ${nodeOf(r.nodes[r.nodes.length - 1]).name}まで`, val: `${r.nodes.length - 1}くかん`, fig: 'route:' + JSON.stringify(r.pts), hint: `No.${r.no}` });
const onemItem = c => ({ id: c.key, label: ONEM_IDS.filter(id => c.cnt[id]).map(id => `${nm(id)}×${c.cnt[id]}`).join('・'), fig: 'segs:' + ONEM_IDS.filter(id => c.cnt[id]).flatMap(id => Array(c.cnt[id]).fill(lenOf(id))).join(','), hint: `No.${c.no}` });

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(join(ROOT, 'data/hakaru'), { recursive: true });
  const routes = buildRoutes(), onem = buildOnem();
  writeFileSync(join(ROOT, 'data/hakaru/routes.json'), JSON.stringify({ note: 'N3「1km さんぽ」：いえ から、同じ区間を2回 通らずに ちょうど 1000m になる道。いえ に もどる ひとまわりは 向きが逆でも同じ道とみる。tools/hakaru-nagasa.mjs が計算（凍結値）', start: 'H', total: 1000, count: routes.length, routes }, null, 1) + '\n');
  writeFileSync(join(ROOT, 'data/hakaru/onem.json'), JSON.stringify({ note: 'N2m「1m を つくる」：基準物 8種を 同じ物は3つまで使って ちょうど 1000mm になる組。tools/hakaru-nagasa.mjs が計算（凍結値）', items: ONEM_IDS, max: ONEM_MAX, total_mm: 1000, count: onem.length, combos: onem }, null, 1) + '\n');
  const patch = (file, zid, items) => {
    const p = join(ROOT, 'app/units', file); if (!existsSync(p)) return console.log('（まだない）', file);
    const j = JSON.parse(readFileSync(p)); const z = (j.zukan || []).find(x => x.id === zid); if (!z) return console.log('ずかんがない', file, zid);
    z.items = items; writeFileSync(p, JSON.stringify(j, null, 1) + '\n'); console.log(file, zid, items.length);
  };
  patch('n1.json', 'ikutsu', buildIkutsu());
  patch('n2.json', 'mono', buildMono());
  patch('n2m.json', 'onem', onem.map(onemItem));
  patch('n2m.json', 'nagai', buildLong());
  patch('n3.json', 'walk', routes.map(routeItem));
  console.log('routes', routes.length, 'onem', onem.length);
}
export { routeItem, onemItem, routeKey };
