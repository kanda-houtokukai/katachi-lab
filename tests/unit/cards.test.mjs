// N2：直方体54・正四角柱29（と角柱・角錐・正多面体）の全展開図を、カードをつなぐ操作の列にして判定させる。
// カタログにない形を20件以上つくり「ならない」になること。カタログで「なる」と、折って閉じることが一致すること。
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, CATALOG_IDS } from './helpers.mjs';
import { loadCatalog } from '../../app/engine/catalog.js';
import { cardSet, makeBuilder, judge, opsFromLayout, replay } from '../../app/engine/cards.js';

for (const id of ['cuboid', 'sq-prism']) {
  test(`${id}：カタログの全展開図をカード操作で作ると、すべて「なる」・番号一致`, async () => {
    const cat = await loadCatalog(id), set = cardSet(cat.P);
    for (let no = 1; no <= cat.count; no++) {
      const { B, error } = replay(set, opsFromLayout(set, cat.layout(no)));
      assert.equal(error, undefined, `No.${no} ${error}`);
      const j = judge(B, cat);
      assert.equal(j.no, no, `No.${no} の番号`);
      assert.ok(j.closes, `No.${no} が閉じる`);
    }
  });
}

test('角柱・角錐・正多面体のカタログもカード操作で全部再現できる', async () => {
  for (const id of CATALOG_IDS.filter(x => !['cuboid', 'sq-prism'].includes(x))) {
    const cat = await loadCatalog(id), set = cardSet(cat.P);
    for (let no = 1; no <= cat.count; no++) {
      const { B, error } = replay(set, opsFromLayout(set, cat.layout(no)));
      assert.equal(error, undefined, `${id} No.${no} ${error}`);
      assert.equal(judge(B, cat).no, no, `${id} No.${no}`);
    }
  }
});

test('カタログにない形（大きさの合わない辺・並べ方の違い）を20件以上つくり、すべて「ならない」。カタログの判定と、折って閉じるかが一致する', async () => {
  let invalid = 0, valid = 0, rejected = 0;
  for (const id of ['cuboid', 'sq-prism', 'tri-prism', 'right-prism', 'sq-pyramid']) {
    const cat = await loadCatalog(id), set = cardSet(cat.P), R = rng(id.length * 97);
    // 大きさの合わない辺へつなごうとすると、はじかれる
    const B0 = makeBuilder(set); B0.start(0);
    for (let t = 0; t < set.types.length; t++) for (const e of B0.freeEdges()) {
      const r = B0.attach(t, e.card, e.k, 0);
      if (!r.ok && r.reason === 'length') rejected++;
      else if (r.ok) B0.undo();
    }
    // ランダムに並べる
    for (let trial = 0; trial < 400; trial++) {
      const B = makeBuilder(set); B.start(Math.floor(R() * set.types.length));
      let guard = 0;
      while (!B.full() && guard++ < 60) {
        const left = B.left(), types = left.map((n, t) => (n > 0 ? t : -1)).filter(t => t >= 0);
        const t = types[Math.floor(R() * types.length)], fe = B.freeEdges(), e = fe[Math.floor(R() * fe.length)];
        B.attach(t, e.card, e.k, Math.floor(R() * 4));
      }
      if (!B.full()) continue;
      const j = judge(B, cat);
      assert.equal(j.no > 0, j.closes, `${id}：カタログで${j.no > 0 ? 'なる' : 'ならない'}のに、折ると${j.closes ? '閉じる' : '閉じない'}`);
      if (j.no > 0) valid++; else invalid++;
    }
  }
  assert.ok(rejected >= 5, '長さの合わない辺ではじかれた回数 ' + rejected);
  assert.ok(invalid >= 20, 'ならない形 ' + invalid);
  assert.ok(valid >= 5, 'なる形 ' + valid);
});
