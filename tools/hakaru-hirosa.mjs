// ひろさ（H1・H4）の図鑑の数をビルド時に数えて凍結する。数え方は app/parts/_hirosa-gen.js と同じ。
//   node tools/hakaru-hirosa.mjs
// 出力：data/hakaru/shapes.json（マス4つ・5つの形。回したり裏返したりして重なる形は1つ）
//       data/hakaru/rects.json（面積が 12・24・36cm² の長方形。縦横を入れかえた形は1つ。まわりの長さが決まった長方形）
// 単元 JSON（app/units/h1.json・h4.json）のずかんの items も、ここから作り直す。
// tests/unit/hakaru-hirosa.test.mjs が「数え直すと凍結値と一致」「単元のずかんと一致」を確かめる。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { polyominoes, canon, rectsOfArea, rectsOfPerim, rectKey } from '../app/parts/_hirosa-gen.js';

const ROOT = new URL('..', import.meta.url);
// 形の名前（子ども向け。かっこの中は保護者向けのよび名）。名前は表から当てるだけで、数は数え上げで決める
const NAMES = {
  4: [['ぼう', 'I', [[0, 0], [0, 1], [0, 2], [0, 3]]], ['ましかく', 'O', [[0, 0], [1, 0], [0, 1], [1, 1]]], ['かぎ', 'L', [[0, 0], [0, 1], [0, 2], [1, 2]]], ['でっぱり', 'T', [[0, 0], [1, 0], [2, 0], [1, 1]]], ['かいだん', 'S', [[1, 0], [2, 0], [0, 1], [1, 1]]]],
  5: [['ながい ぼう', 'I', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]], ['ながい かぎ', 'L', [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]], ['いす', 'P', [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]],
    ['ずれた ぼう', 'N', [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]]], ['かなづち', 'T', [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]], ['うつわ', 'U', [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]],
    ['おおきな かど', 'V', [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]], ['かいだん', 'W', [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]]], ['じゅうじ', 'X', [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
    ['えだ', 'Y', [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]]], ['いなずま', 'Z', [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]]], ['はね', 'F', [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]]]],
};
export const AREAS = [12, 24, 36], PERIMS = [16, 20, 24];

export function countShapes() {
  const out = {};
  for (const n of [4, 5]) {
    const list = polyominoes(n), names = NAMES[n].map(([name, letter, cells]) => ({ name, letter, key: canon(cells).key }));
    out[n] = {
      count: list.length,
      shapes: list.map((s, i) => {
        const nm = names.filter(x => x.key === s.key);
        if (nm.length !== 1) throw new Error(`マス${n}つの形 ${s.key} の名前が1つに決まらない`);
        return { id: `p${n}-${nm[0].letter}`, name: nm[0].name, letter: nm[0].letter, key: s.key, cells: s.cells };
      }),
    };
  }
  return out;
}
export function countRects() {
  const areas = {}, perims = {};
  for (const A of AREAS) areas[A] = rectsOfArea(A).map(([h, w]) => ({ id: `${A}:${rectKey(h, w)}`, h, w }));
  for (const P of PERIMS) { const R = rectsOfPerim(P), best = Math.max(...R.map(r => r.area)); perims[P] = { rects: R, best, bestRect: R.find(r => r.area === best) }; }
  return { areas, counts: Object.fromEntries(AREAS.map(A => [A, areas[A].length])), perims };
}
// 単元 JSON のずかんの items
export function shapeItems(n, S) { return S[n].shapes.map(s => ({ id: s.id, label: s.name, key: s.key, fig: `cells:${JSON.stringify(s.cells)}`, hint: `マス${n}つ` })); }
export function rectItems(R) { return AREAS.flatMap(A => R.areas[A].map(r => ({ id: r.id, label: `たて ${r.h}cm・よこ ${r.w}cm`, fig: `rect:${r.h}:${r.w}`, hint: `${A}cm²` }))); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const S = countShapes(), R = countRects();
  mkdirSync(new URL('data/hakaru/', ROOT), { recursive: true });
  writeFileSync(new URL('data/hakaru/shapes.json', ROOT), JSON.stringify({ note: 'マス4つ・5つの形（回したり裏返したりして重なる形は1つ）。tools/hakaru-hirosa.mjs で数えた凍結値', '4': S[4], '5': S[5] }, null, 1) + '\n');
  writeFileSync(new URL('data/hakaru/rects.json', ROOT), JSON.stringify({ note: '面積が決まった長方形（たて≦よこ。縦横を入れかえた形は1つ）と、まわりの長さが決まった長方形。tools/hakaru-hirosa.mjs で数えた凍結値', counts: R.counts, areas: R.areas, perims: R.perims }, null, 1) + '\n');
  const patch = (file, fn) => { const p = new URL('app/units/' + file, ROOT); if (!existsSync(p)) return; const j = JSON.parse(readFileSync(p, 'utf8')); fn(j); writeFileSync(p, JSON.stringify(j, null, 1) + '\n'); };
  patch('h1.json', j => { for (const z of j.zukan || []) { if (z.id === 'h1-shape4') z.items = shapeItems(4, S); if (z.id === 'h1-shape5') z.items = shapeItems(5, S); } });
  patch('h4.json', j => { for (const z of j.zukan || []) if (z.id === 'h4-rects') z.items = rectItems(R); });
  console.log('shapes', S[4].count, S[5].count, 'rects', JSON.stringify(R.counts));
}
