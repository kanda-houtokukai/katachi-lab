// H2：じかん（T1・T2・T3）。時刻の問題の生成・選択肢・ずかんの数
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, rng } from './helpers.mjs';
import { genTime, readChoices, MIN, hour12, choices } from '../../app/parts/_gen.js';
import { kidTime, fun } from '../../app/core/yomi.js';

test('時刻の問題：難しさごとの範囲（やさしい＝ちょうど・はん、ふつう＝5分刻みで45・50・55分が4割以上、チャレンジ＝1分刻み）と、つまずきの時刻が必ず入る', () => {
  const r = rng(7);
  for (let k = 0; k < 400; k++) { const t = genTime('easy', k % 6, r); assert.ok([0, 30].includes(MIN(t))); }
  let late = 0, N = 600;
  for (let k = 0; k < N; k++) { const t = genTime('normal', 0, r), m = MIN(t); assert.equal(m % 5, 0); assert.notEqual(m, 0); if (m >= 45) late++; }
  assert.ok(late / N >= 0.4, '45・50・55分の割合 ' + late / N);
  let late2 = 0, twelve = 0;
  for (let k = 0; k < N; k++) { const t = genTime('challenge', 0, r), m = MIN(t); assert.notEqual(m % 5, 0, '1分刻み'); if (m >= 56) late2++; if (hour12(t) === 12) twelve++; }
  assert.ok(late2 > N * 0.2 && twelve > N * 0.1, `56〜59分 ${late2}・12時台 ${twelve}`);
  for (let k = 0; k < 50; k++) {
    const t = genTime('normal', 1, r); assert.ok([7, 1].includes(hour12(t)) && MIN(t) === 55, '7時55分・1時55分');
    assert.equal(hour12(genTime('challenge', 3, r)), 12, '12時台');
  }
});

test('読む問題の選択肢：正解がちょうど1つ（全720の時刻）。誤答に T1・T2・T3 の型が入る', () => {
  const r = rng(11), seen = new Set();
  for (let t = 0; t < 720; t++) {
    const ch = readChoices(t, r);
    assert.equal(ch.filter(c => c.ok).length, 1, kidTime(t));
    assert.equal(ch.find(c => c.ok).html, kidTime(t));
    assert.equal(new Set(ch.map(c => c.html)).size, ch.length, '重なりなし ' + kidTime(t));
    assert.ok(ch.length === 3, '3択');
    ch.filter(c => !c.ok).forEach(c => seen.add(c.mistake));
  }
  for (const ty of ['T1', 'T2', 'T3']) assert.ok(seen.has(ty), ty);
  // 7時55分 → 8時55分（T1）、7時11分（T3）
  const c = readChoices(7 * 60 + 55, rng(3));
  assert.ok(c.some(x => x.html === '8じ 55ふん' && x.mistake === 'T1'));
  assert.ok(c.some(x => x.html === '7じ 11ぷん' && x.mistake === 'T3'));
  // 分の読み（全60）
  for (let m = 1; m < 60; m++) assert.match(kidTime(3 * 60 + m), new RegExp(`${m}${fun(m)}$|はん$`));
  assert.equal(choices('a', [{ html: 'a' }, { html: 'b' }, { html: 'b' }, { html: 'c' }]).length, 3);
});

test('T1 のずかん：とけい ずかん＝ちょうど12＋はん12＝24、ふん ずかん＝0〜59 の60。T2 は1日の場面8', () => {
  const t1 = readJSON('app/units/t1.json');
  const tk = t1.zukan.find(z => z.id === 'tokei'), fz = t1.zukan.find(z => z.id === 'fun');
  assert.equal(tk.items.length, 24); assert.equal(new Set(tk.items.map(i => i.id)).size, 24);
  for (let h = 1; h <= 12; h++) { assert.ok(tk.items.some(i => i.id === `${h}:00`)); assert.ok(tk.items.some(i => i.id === `${h}:30`)); }
  assert.equal(fz.items.length, 60); assert.deepEqual(fz.items.map(i => i.id), Array.from({ length: 60 }, (_, m) => 'm' + m));
  const t2 = readJSON('app/units/t2.json');
  assert.equal(t2.zukan[0].items.length, 8);
});
