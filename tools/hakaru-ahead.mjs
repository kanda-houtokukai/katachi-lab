// 「ちょっと先」の量（A4・E5・S5・EJ）の図鑑の数を計算して data/hakaru/ahead.json に凍結し、単元 JSON の図鑑の items をそこから作る。
// node tools/hakaru-ahead.mjs   （tests/unit/hakaru-ahead.test.mjs が「数え直すと凍結値と一致」「単元の図鑑と一致」を確かめる）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rulerAngles, circles, racers, cones, cmTxt, num } from '../app/parts/_ahead-gen.js';

const ROOT = new URL('..', import.meta.url);
const readJSON = rel => JSON.parse(readFileSync(new URL(rel, ROOT)));
const bench = id => readJSON('data/benchmarks.json').items.find(b => b.id === id) || null;

// 数え方：
//  angles：三角定規（30・60・90 と 45・45・90）から1つずつ角を選び、あわせる（たす）・かさねる（ひく）で できる角のうち、
//          もとの角（30・45・60・90）でないもの（0°より大きく180°まで）→ 15・75・105・120・135・150・180 の7つ
//  circles：いろいろな円 8つ（直径と、転がした円周＝直径×π を 1mm まで）
//  racers：走る物 8つ（時速を決めて、分速・秒速を計算する）
//  cones：母線 12cm の円錐の展開図で、底面の半径が整数（1〜11cm）になる おうぎ形（中心角＝360×半径÷12）→ 11
export function compute() {
  return {
    note: 'tools/hakaru-ahead.mjs が計算して凍結した値。数を変えるときは計算し直す（手で書きかえない）。',
    angles: rulerAngles(),
    circles: circles(bench),
    racers: racers(),
    cones: cones(12),
  };
}
// 単元 JSON の図鑑（id → items を作る関数）
export const ZUKAN = {
  'a4.json': { sankaku: d => d.angles.map(a => ({ id: 'a' + a.deg, label: `${a.deg}°`, fig: `angle:${a.deg}`, val: a.how.map(h => `${h.a}° ${h.op === 'add' ? '＋' : '−'} ${h.b}°`).join('、'), hint: 'さんかくじょうぎで つくろう' })) },
  'e5.json': { en: d => d.circles.map(c => ({ id: c.id, label: c.name, fig: `en:${c.d}`, val: `ちょっけい ${cmTxt(c.d)} → えんしゅう やく ${cmTxt(c.c)}`, hint: 'ころがすと わかる' })) },
  's5.json': { hayasa: d => d.racers.map(r => ({ id: r.id, label: r.name, fig: `racer:${r.id}`, val: `じそく やく ${num(r.kmh)}km・ふんそく やく ${num(r.mpm)}m・びょうそく やく ${num(r.mps)}m`, hint: 'かけっこで くらべると わかる' })) },
  'ej.json': { cone: d => d.cones.map(c => ({ id: c.id, label: `ちゅうしんかく ${c.deg}°`, fig: `sector:${c.deg}`, val: `そこの はんけい ${c.rb}cm`, hint: `そこの はんけい ${c.rb}cm` })) },
};
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const d = compute();
  writeFileSync(new URL('data/hakaru/ahead.json', ROOT), JSON.stringify(d, null, 1) + '\n');
  for (const [file, zs] of Object.entries(ZUKAN)) {
    const p = new URL('app/units/' + file, ROOT);
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p));
    for (const [id, fn] of Object.entries(zs)) { const z = (j.zukan || []).find(x => x.id === id); if (z) z.items = fn(d); }
    writeFileSync(p, JSON.stringify(j, null, 1) + '\n');
  }
  console.log('ahead', { angles: d.angles.length, circles: d.circles.length, racers: d.racers.length, cones: d.cones.length });
}
