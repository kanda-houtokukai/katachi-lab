// 単元データ：部品が実在する・地図と一致する・保護者画面の規則が評価できる
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readJSON } from './helpers.mjs';
import { evaluate, labelOf, fill } from '../../app/core/rules.js';

const idx = readJSON('app/units/index.json');
const ready = idx.units.filter(u => u.ready);

test('地図の単元は app/units/ にあり、使う部品はすべて app/parts/ にある', () => {
  assert.ok(ready.length >= 1);
  for (const u of ready) {
    const j = readJSON('app/units/' + u.file);
    for (const [mode, acts] of Object.entries(j.tabs)) {
      assert.ok(['miru', 'sawaru', 'tamesu', 'tsukuru'].includes(mode), u.id + ' ' + mode);
      for (const a of acts) assert.ok(existsSync(new URL(`../../app/parts/${a.part}.js`, import.meta.url)), `${u.id} の部品 ${a.part}`);
    }
    for (const r of j.review || []) { assert.ok(r.ch[r.a] != null, u.id + ' ' + r.id); assert.equal(r.reviewed, false, '思い出し問題は下書き'); }
    for (const x of j.insights || []) assert.equal(x.reviewed, false, '見立ての文面は下書き');
  }
});

test('保護者画面の規則（つまずき・ほめどころ・対応表・記録の文）が記録から評価できる', () => {
  const L = [
    { kind: 'r2.quiz', correct: false, hints: 0, detail: { type: 'valid?', valid: false } },
    { kind: 'r2.quiz', correct: false, hints: 0, detail: { type: 'valid?', valid: false } },
    { kind: 'r2.quiz', correct: true, hints: 0, detail: { type: 'valid?', valid: true } },
    { kind: 'r2.stamp', detail: { miss: 2 } }, { kind: 'r2.hone', detail: { miss: 1 } },
    { kind: 'r2.build', correct: true, detail: { valid: true, id: 3 } }, { kind: 'r2.build', correct: true, detail: { valid: true, id: 3 } },
  ];
  const r2 = readJSON('app/units/r2.json');
  const hit = r2.insights.filter(x => evaluate(x.test, L).ok).map(x => x.key);
  assert.deepEqual(hit, ['overlap', 'cuboid']);
  assert.equal(fill(r2.insights[0].obs, evaluate(r2.insights[0].test, L).vars), '箱にならない形の問題で 2問中2問を「なる」と答えています。');
  assert.equal(evaluate(r2.praises[0].test, L).vars.u, 1);
  assert.equal(labelOf(L[5], r2.labels), '展開図をつくって組み立て成功（No.3）');
  assert.equal(labelOf({ kind: 'r2.quiz', correct: true, hints: 2, detail: { type: 'opp' } }, r2.labels), '向かい合う面の問題：正解（ヒント2回）');
});

test('R5b の図鑑は、体積ごとに すべての たて×よこ×たかさ の組（計算で出したもの）と一致する', async () => {
  // app/parts/_blocks.js の triples と同じ計算（_blocks.js は three を読むので、ここで書き直して照合する）
  const tr = V => { const o = []; for (let a = 1; a <= V; a++) for (let b = a; b <= V; b++) { if (V % (a * b)) continue; const c = V / (a * b); if (c >= b) o.push([a, b, c]); } return o; };
  const j = readJSON('app/units/r5b.json');
  for (const z of j.zukan) { const V = +z.id.slice(3); assert.deepEqual(z.items.map(i => i.id), tr(V).map(t => t.join('x')), z.id); }
  assert.deepEqual(tr(24).length, 6);
});

test('各単元の展開図ずかんの総数が、凍結値（reference/net-counts.json）と一致する', () => {
  const fz = readJSON('reference/net-counts.json');
  for (const u of ready) {
    const j = readJSON('app/units/' + u.file);
    for (const z of j.zukan || []) {
      if (z.kind === 'catalog') assert.equal(z.total, fz.solids.find(s => s.id === z.solid).nets, `${u.id} ${z.id}`);
      if (z.kind === 'counter') assert.equal(z.total, fz.solids.find(s => s.id === z.solid).nets, `${u.id} ${z.id}`);
    }
  }
});

test('R6 の図鑑は、底面積×高さ＝体積 になる組（計算で出したもの）と一致する', () => {
  const CARDS = [['t3', 3], ['r4', 4], ['t6', 6], ['r8', 8], ['t12', 12]];
  const combos = V => CARDS.filter(([, a]) => V % a === 0 && V / a <= 16).map(([c, a]) => `${c}x${V / a}`);
  const j = readJSON('app/units/r6.json');
  for (const z of j.zukan) assert.deepEqual(z.items.map(i => i.id), combos(+z.id.slice(5)), z.id);
});
