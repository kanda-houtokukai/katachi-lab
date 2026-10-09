// H5〜H7：ひろさ（H1・H4・H5・H6）。形の数・長方形の数（凍結値と数え直し）・重ねる判定・マスの数え・問題の生成
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, rng } from './helpers.mjs';
import * as G from '../../app/parts/_hirosa-gen.js';
import { countShapes, countRects, shapeItems, rectItems } from '../../tools/hakaru-hirosa.mjs';

const shapes = readJSON('data/hakaru/shapes.json'), rects = readJSON('data/hakaru/rects.json');

test('マス4つ・5つの形：回したり裏返したりして重なる形を1つと数えると 5・12（知られている値）。凍結値・数え直し・単元のずかんが一致', () => {
  assert.equal(G.polyominoes(4).length, 5); assert.equal(G.polyominoes(5).length, 12);
  assert.equal(G.polyominoes(3).length, 2); assert.equal(G.polyominoes(6).length, 35, '数え方の確かめ（マス6つは35）');
  assert.equal(shapes['4'].count, 5); assert.equal(shapes['5'].count, 12);
  const S = countShapes();
  for (const n of [4, 5]) {
    assert.deepEqual(S[n], shapes[n], `マス${n}つ：数え直すと凍結値と一致`);
    assert.deepEqual(G.polyominoes(n).map(s => s.key), shapes[n].shapes.map(s => s.key));
    // 凍結した形はどれも つながっていて、回す・裏返すで互いに重ならない
    const keys = new Set();
    for (const s of shapes[n].shapes) { assert.equal(s.cells.length, n); assert.ok(G.isConnected(s.cells)); const k = G.canon(s.cells).key; assert.ok(!keys.has(k)); keys.add(k); }
  }
  const h1 = readJSON('app/units/h1.json');
  for (const n of [4, 5]) {
    const z = h1.zukan.find(x => x.id === 'h1-shape' + n);
    assert.equal(z.items.length, shapes[n].count, `h1 のずかん（マス${n}つ）の数`);
    assert.deepEqual(z.items, shapeItems(n, S));
    for (const it of z.items) assert.equal(G.canon(JSON.parse(it.fig.slice(6))).key, it.key, it.id);
  }
  assert.deepEqual(h1.demoZukan['h1-shape4'].filter(id => !h1.zukan[0].items.some(i => i.id === id)), [], '見本のずかんは実在の形');
});

test('同じ形の判定：回す・裏返すと同じ形になり、matchTransform で決めた向きにすると たなの形と重なる', () => {
  const L = [[0, 0], [0, 1], [0, 2], [1, 2]];
  for (let k = 0; k < 8; k++) {
    const v = G.variant(L, k);
    assert.ok(G.sameShape(L, v), 'L の向き ' + k);
    const t = G.matchTransform(v, G.canon(L).cells); assert.ok(t >= 0);
    assert.equal(G.keyOf(G.variant(v, t)), G.keyOf(G.canon(L).cells));
  }
  assert.ok(!G.sameShape(L, [[0, 0], [1, 0], [2, 0], [1, 1]]), 'L と T は別');
  assert.ok(!G.sameShape([[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]]), 'S と O は別');
  assert.equal(G.matchTransform(L, [[0, 0], [1, 0], [2, 0], [1, 1]]), -1);
  assert.ok(!G.isConnected([[0, 0], [1, 1], [0, 2], [1, 2]]), 'ななめだけでは つながらない');
});

test('重ねる判定：すっぽり入る・ぴったり・はみ出し方が両方・重ならない', () => {
  const abs = (c, x, y) => c.map(([a, b]) => [a + x, b + y]);
  let o = G.overlap(abs(G.rect(2, 2), 1, 1), abs(G.rect(3, 3), 1, 1));
  assert.deepEqual([o.over, o.aIn, o.bIn, o.bOut], [true, true, false, 5], '2×2 が 3×3 にすっぽり（はみ出しは5マス）');
  o = G.overlap(abs(G.rect(3, 3), 0, 0), abs(G.rect(3, 3), 0, 0)); assert.ok(o.aIn && o.bIn, 'ぴったり');
  o = G.overlap(abs(G.rect(7, 1), 0, 1), abs(G.rect(3, 3), 2, 0)); assert.deepEqual([o.over, o.aIn, o.bIn, o.aOut, o.bOut], [true, false, false, 4, 6], '両方はみ出す');
  o = G.overlap(abs(G.rect(2, 2), 0, 0), abs(G.rect(2, 2), 5, 5)); assert.equal(o.over, false);
  // まわして重ねる：4×2 は 3×4 に入らないが、まわすと入る
  const rot = c => { const { h } = G.bbox(c); return c.map(([x, y]) => [h - 1 - y, x]); };
  assert.equal(G.overlap(abs(G.rect(4, 2), 0, 0), abs(G.rect(3, 4), 0, 0)).aIn, false);
  assert.equal(G.overlap(abs(rot(G.rect(4, 2)), 0, 0), abs(G.rect(3, 4), 0, 0)).aIn, true);
});

test('マスの数え：数・まわり（外まわりの1周）・方眼で数える見積もり', () => {
  assert.equal(G.rect(4, 3).length, 12);
  assert.equal(G.perimeter(G.rect(7, 1)), 16); assert.equal(G.perimeter(G.rect(3, 3)), 12); assert.equal(G.perimeter(G.rect(8, 1)), 18);
  for (const n of [4, 5]) for (const s of shapes[n].shapes) {
    const loop = G.outlineLoop(s.cells); let L = 0;
    for (let i = 1; i < loop.length; i++) L += Math.abs(loop[i][0] - loop[i - 1][0]) + Math.abs(loop[i][1] - loop[i - 1][1]);
    assert.equal(L, G.perimeter(s.cells), s.id + ' のまわりを1周');
    assert.deepEqual(loop[0], loop[loop.length - 1]);
  }
  // 見積もり：なか＋かかる÷2 は ほんとうの面積に近い（1マス＝1）
  const P = G.blob(6, 5, 4, 3, [[3, 0.08, 0.3]]), gc = G.gridCount(P), A = G.polyArea(P);
  assert.ok(Math.abs(gc.est - A) / A < 0.08, `見積もり ${gc.est} / ほんとう ${A.toFixed(1)}`);
  const sq = [[1, 1], [4, 1], [4, 3], [1, 3]]; assert.equal(G.polyArea(sq), 6); assert.deepEqual([G.gridCount(sq).full.length, G.gridCount(sq).part.length], [6, 0]);
  // じんとり：自分の陣地のとなりの空きだけ ぬれる
  const B = [1, 0, 0, 0, 0, 0, 0, 0, 2];
  assert.deepEqual(G.jinMoves(B, 3, 3, 1), [[1, 0], [0, 1]]);
  assert.deepEqual(G.jinMoves(B, 3, 3, 2), [[2, 1], [1, 2]]);
  assert.ok(G.jinMoves(B, 3, 3, 1).some(m => String(m) === String(G.jinPick(B, 3, 3, 1, rng(3)))));
});

test('面積が決まった長方形の図鑑：12→3、24→4、36→5（縦横を入れかえた形は同じ）。凍結値・数え直し・単元のずかんが一致', () => {
  assert.deepEqual([12, 24, 36].map(a => G.rectsOfArea(a).length), [3, 4, 5]);
  assert.deepEqual(G.rectsOfArea(24), [[1, 24], [2, 12], [3, 8], [4, 6]]);
  assert.deepEqual(rects.counts, { 12: 3, 24: 4, 36: 5 });
  const R = countRects();
  assert.deepEqual(R.counts, rects.counts); assert.deepEqual(R.areas, rects.areas); assert.deepEqual(R.perims, rects.perims);
  const h4 = readJSON('app/units/h4.json'), z = h4.zukan.find(x => x.id === 'h4-rects');
  assert.deepEqual(z.items, rectItems(R));
  for (const A of [12, 24, 36]) assert.equal(z.items.filter(i => i.id.startsWith(A + ':')).length, rects.counts[A], `${A}cm² の数`);
  // まわりの長さが決まった長方形で いちばん広いのは 正方形
  for (const P of [16, 20, 24]) { const b = rects.perims[P].bestRect; assert.equal(b.h, b.w, `まわり${P}cm`); assert.equal(b.area, (P / 4) ** 2); }
  assert.equal(G.rectKey(4, 3), '3x4');
});

test('ためすの問題：正解がちょうど1つ・選択肢が重ならない・誤答に つまずきの型（A1・A2・A3・A4・m2・A4half・A4h・A4d・A4c）が入る', () => {
  const r = rng(21), seen = {};
  const add = (k, ch) => { seen[k] = seen[k] || new Set(); ch.filter(c => !c.ok).forEach(c => seen[k].add(c.mistake)); };
  for (const lv of ['easy', 'normal', 'challenge']) for (let i = 0; i < 30; i++) {
    const h = G.genHiroi(lv, i, r); assert.equal(h.choices.filter(c => c.ok).length, 1, `hiroi ${lv} ${i}`); add('h1', h.choices);
    assert.equal(h.choices.find(c => c.ok).key, h.na > h.nb ? 'a' : h.nb > h.na ? 'b' : 'same');
    const c = G.genCount(lv, i, r); assert.equal(c.choices.filter(x => x.ok).length, 1, `count ${lv} ${i}`); add('h1', c.choices);
    if (c.kind === 'count') { assert.equal(c.choices.find(x => x.ok).html, String(c.na)); assert.equal(new Set(c.choices.map(x => x.html)).size, c.choices.length); }
    else assert.ok(c.ta > c.tb && c.nb >= c.na, '大きさの違うマス：数の多い方が広いとは限らない');
    const b = G.genBlobCells(lv, i, r); assert.ok(G.isConnected(b)); assert.ok(b.length >= 6 && b.length <= 34);
    for (const [k, q] of [['h4', G.genArea(lv, i, r)], ['h5', G.genFormula(lv, i, r)], ['h6', G.genCircle(lv, i, r)]]) {
      assert.equal(q.choices.filter(x => x.ok).length, 1, `${k} ${lv} ${i}`);
      assert.equal(new Set(q.choices.map(x => x.html)).size, q.choices.length, `${k} 重なりなし ${JSON.stringify(q.choices)}`);
      assert.ok(q.choices.length >= 2);
      add(k, q.choices);
    }
  }
  for (const t of ['A1', 'A2', 'A3']) assert.ok(seen.h1.has(t), 'H1 ' + t);
  for (const t of ['A1', 'A4', 'm2']) assert.ok(seen.h4.has(t), 'H4 ' + t);
  for (const t of ['A4half', 'A4h']) assert.ok(seen.h5.has(t), 'H5 ' + t);
  for (const t of ['A4d', 'A4c']) assert.ok(seen.h6.has(t), 'H6 ' + t);
  // 答えの計算
  const f = G.genFormula('easy', 1, rng(5)); assert.equal(f.ans, f.b * f.h / 2);
  const cc = G.genCircle('easy', 0, rng(5)); assert.equal(cc.ans, Math.round(cc.r * cc.r * 3.14 * 100) / 100);
  // 単元の見立ては、問題が記録する つまずきの型を数える
  for (const [u, types] of [['h1', ['A1', 'A2', 'A3']], ['h4', ['A1', 'A4', 'm2']], ['h5', ['A4half', 'A4h']], ['h6', ['A4d', 'A4c']]]) {
    const j = readJSON(`app/units/${u}.json`), ins = j.insights.map(x => x.type);
    for (const t of types) assert.ok(ins.includes(t), `${u} の見立て ${t}`);
  }
});
