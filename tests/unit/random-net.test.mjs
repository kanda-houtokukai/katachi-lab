// N6：正十二面体・正二十面体のランダム展開（Wilson のアルゴリズム）が、重ならずに組み上がる（各100回）
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng } from './helpers.mjs';
import { solid } from '../../app/engine/solids.js';
import { faceEdges, layoutFromTree, layoutOverlaps, canonKey, keyHash, wilsonTree } from '../../app/engine/nets.js';
import { foldedFaces, edgePairs, overlappingFaces } from '../../app/engine/fold.js';
import { sub, len } from '../../app/engine/vec.js';

for (const id of ['dodeca', 'icosa']) {
  test(`${id}：ランダムな展開図100回が、全域木で・重ならず・折ると閉じる`, () => {
    const P = solid(id), E = faceEdges(P), R = rng(id === 'dodeca' ? 11 : 13), keys = new Set();
    assert.equal(P.F.length, id === 'dodeca' ? 12 : 20);
    assert.equal(E.length, 30);
    for (let t = 0; t < 100; t++) {
      const tree = wilsonTree(P.F.length, E, R);
      assert.equal(tree.length, P.F.length - 1, '辺の数');
      assert.equal(new Set(tree).size, tree.length, '同じ辺を2回使わない');
      const L = layoutFromTree(P, E, tree);
      assert.ok(L.depth.every(d => d >= 0), 'すべての面がつながる');
      const polys = L.faces.map(f => f.pts);
      assert.deepEqual(layoutOverlaps(polys), [], '平面で重ならない');
      const F = foldedFaces(L);
      assert.deepEqual(overlappingFaces(F), [], '折っても面が重ならない');
      // 立体の頂点が、どの面から見ても同じ位置に来る（閉じる）
      const at = new Map();
      L.faces.forEach((f, i) => f.vid.forEach((v, k) => { const p = F[i].pts[k]; if (at.has(v)) assert.ok(len(sub(at.get(v), p)) < 1e-6, '閉じる'); else at.set(v, p); }));
      assert.equal(edgePairs(L, F).length, 30 - (P.F.length - 1), '外周の辺がすべて組になる');
      keys.add(keyHash(canonKey(polys)));
    }
    assert.ok(keys.size > 50, 'いろいろな展開図が出る（' + keys.size + '種類）');
  });
}
