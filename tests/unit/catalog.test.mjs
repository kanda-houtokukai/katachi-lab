// N1：凍結値14件・折りたたみ・合同判定キー・のりしろ・立方体の番号
import test from 'node:test';
import assert from 'node:assert/strict';
import { frozen, CATALOG_IDS, readJSON, rng } from './helpers.mjs';
import { loadCatalog } from '../../app/engine/catalog.js';
import { solid } from '../../app/engine/solids.js';
import { faceEdges, forEachSpanningTree, layoutFromTree, layoutOverlaps, canonKey, keyHash, faceNormal } from '../../app/engine/nets.js';
import { foldedFaces, edgePairs } from '../../app/engine/fold.js';
import { glueTabs } from '../../app/engine/tabs.js';
import { NETS11, cellsToLayout, netId, randomOrient } from '../../app/engine/grid.js';
import { sub, dot, cross, norm, len, mean } from '../../app/engine/vec.js';

test('凍結値14件：カタログの件数・全域木の数・重なり0 が reference/net-counts.json と一致する', async () => {
  assert.equal(CATALOG_IDS.length, 14);
  for (const id of CATALOG_IDS) {
    const fz = frozen.solids.find(s => s.id === id), j = readJSON(`data/nets/${id}.json`);
    assert.equal(j.count, fz.nets, id + ' count');
    assert.equal(j.nets.length, fz.nets, id + ' nets.length');
    assert.equal(j.trees, fz.trees, id + ' trees');
    assert.equal(j.overlapping, 0, id + ' overlapping');
    assert.equal(j.def, fz.def, id + ' def');
  }
});

test('カタログはいまのエンジンで数え直した結果と同じ（数え直しで凍結値と一致・キーも一致）', () => {
  for (const id of CATALOG_IDS) {
    const P = solid(id), E = faceEdges(P), keys = new Set();
    let trees = 0, ov = 0;
    forEachSpanningTree(P.F.length, E, t => { trees++; const L = layoutFromTree(P, E, t); const polys = L.faces.map(f => f.pts); if (layoutOverlaps(polys).length) ov++; else keys.add(keyHash(canonKey(polys))); });
    const fz = frozen.solids.find(s => s.id === id), j = readJSON(`data/nets/${id}.json`);
    assert.equal(keys.size, fz.nets, id);
    assert.equal(trees, fz.trees, id);
    assert.equal(ov, 0, id);
    assert.deepEqual(new Set(j.nets.map(n => n.key)), keys, id + ' keys');
  }
});

// 折った姿が、立体と同じ形・同じ面の位置になる（回転で重ねて、面の中心と法線を比べる）
function frameOf(a, b, c) { const u = norm(sub(b, a)), n = norm(cross(sub(b, a), sub(c, a))), w = cross(n, u); return { o: a, u, w, n }; }
const toLocal = (F, p) => { const d = sub(p, F.o); return [dot(d, F.u), dot(d, F.w), dot(d, F.n)]; };
const dirLocal = (F, d) => [dot(d, F.u), dot(d, F.w), dot(d, F.n)];

test('各カタログの全展開図を折りたたむと、立体の面の位置にすべて重なる（面の中心と法線が一致）', async () => {
  for (const id of CATALOG_IDS) {
    const cat = await loadCatalog(id), P = cat.P;
    for (let no = 1; no <= cat.count; no++) {
      const L = cat.layout(no), F = foldedFaces(L);
      // 立体の頂点が、どの面から見ても同じ位置に来る
      const at = new Map();
      L.faces.forEach((f, i) => f.vid.forEach((v, k) => { const p = F[i].pts[k]; if (at.has(v)) assert.ok(len(sub(at.get(v), p)) < 1e-6, `${id} No.${no} 頂点${v}が閉じない`); else at.set(v, p); }));
      assert.equal(at.size, P.V.length);
      // 3頂点で座標系を合わせ、全ての面の中心と法線を比べる
      const f0 = P.F[0], A = frameOf(P.V[f0[0]], P.V[f0[1]], P.V[f0[2]]), B = frameOf(at.get(f0[0]), at.get(f0[1]), at.get(f0[2]));
      P.F.forEach((f, i) => {
        const c0 = toLocal(A, mean(f.map(v => P.V[v]))), c1 = toLocal(B, F[i].center);
        assert.ok(len(sub(c0, c1)) < 1e-6, `${id} No.${no} 面${i}の中心`);
        const n0 = dirLocal(A, faceNormal(P, i)), n1 = dirLocal(B, F[i].inward.map(v => -v));
        assert.ok(len(sub(n0, n1)) < 1e-6, `${id} No.${no} 面${i}の法線`);
      });
    }
  }
});

test('合同判定キーは、展開図をランダムに回転・裏返し・平行移動しても変わらない', async () => {
  const R = rng(7);
  for (const id of CATALOG_IDS) {
    const cat = await loadCatalog(id);
    for (let no = 1; no <= cat.count; no++) {
      const polys = cat.layout(no).faces.map(f => f.pts), h = keyHash(canonKey(polys));
      assert.equal(h, cat.raw.nets[no - 1].key);
      for (let t = 0; t < 2; t++) {
        const a = R() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), fl = R() < 0.5 ? -1 : 1, dx = R() * 10 - 5, dy = R() * 10 - 5;
        const moved = polys.map(P => P.map(([x, y]) => [c * x - s * y * fl + dx, s * x + c * y * fl + dy])).reverse();
        assert.equal(cat.lookup(moved), no, `${id} No.${no}`);
      }
    }
  }
});

test('のりしろが面にも互いにも重ならない（全カタログ）', async () => {
  for (const id of CATALOG_IDS) {
    const cat = await loadCatalog(id), P = cat.P, nE = faceEdges(P).length;
    for (let no = 1; no <= cat.count; no++) {
      const L = cat.layout(no), F = foldedFaces(L), g = glueTabs(L, F);
      assert.equal(g.overlaps, 0, `${id} No.${no}`);
      assert.equal(g.tabs.length, nE - (P.F.length - 1), `${id} No.${no} 組の数`);
      assert.equal(edgePairs(L, F).length, g.tabs.length);
    }
  }
});

test('立方体の番号が見本の11種の並び（NETS11）と一致する', async () => {
  const cat = await loadCatalog('cube');
  NETS11.forEach((cells, i) => {
    assert.equal(cat.lookup(cellsToLayout(cells).faces.map(f => f.pts)), i + 1);
    const R = rng(i + 1);
    for (let t = 0; t < 4; t++) { const o = randomOrient(cells, R); assert.equal(netId(o), i); assert.equal(cat.lookup(cellsToLayout(o).faces.map(f => f.pts)), i + 1); }
  });
});
