/* ===== はこ折りエンジン（描画に依存しない計算部分） ===== */
function createHakoEngine(THREE) {
  const NETS11 = [
    // 1-4-1 型（6種）
    [[0,0],[0,1],[1,1],[2,1],[3,1],[0,2]],
    [[0,0],[0,1],[1,1],[2,1],[3,1],[1,2]],
    [[0,0],[0,1],[1,1],[2,1],[3,1],[2,2]],
    [[0,0],[0,1],[1,1],[2,1],[3,1],[3,2]],
    [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]],
    [[1,0],[0,1],[1,1],[2,1],[3,1],[2,2]],
    // 2-3-1 型（3種）
    [[0,0],[1,0],[1,1],[2,1],[3,1],[1,2]],
    [[0,0],[1,0],[1,1],[2,1],[3,1],[2,2]],
    [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2]],
    // 2-2-2 型（階段）
    [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],
    // 3-3 型
    [[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]],
  ];

  // 箱にならない並べ方（クイズ用の候補。実行時にも判定で確かめる）
  const INVALID_CANDIDATES = [
    [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]],       // 一列
    [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],       // 2×3
    [[0,0],[1,0],[2,0],[3,0],[4,0],[1,1]],       // 5つ並び
    [[0,0],[1,0],[2,0],[3,0],[0,1],[2,1]],       // 同じ側に2枚
    [[0,0],[1,0],[2,0],[3,0],[1,1],[3,1]],       // 同じ側に2枚
    [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3]],       // L字
    [[0,0],[1,0],[1,1],[2,1],[2,2],[2,3]],       // 階段くずれ
    [[1,0],[0,1],[1,1],[2,1],[1,2],[2,2]],       // 2×2入り
    [[0,0],[1,0],[2,0],[3,0],[2,1],[2,2]],
  ];

  const key = (x, z) => x + ',' + z;
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];

  function normalize(cells) {
    const mx = Math.min(...cells.map(c => c[0]));
    const mz = Math.min(...cells.map(c => c[1]));
    return cells.map(c => [c[0] - mx, c[1] - mz]);
  }
  function symmetries(cells) {
    const out = [];
    const fs = [
      ([x,z]) => [x,z], ([x,z]) => [-z,x], ([x,z]) => [-x,-z], ([x,z]) => [z,-x],
      ([x,z]) => [-x,z], ([x,z]) => [z,x], ([x,z]) => [x,-z], ([x,z]) => [-z,-x],
    ];
    for (const f of fs) out.push(normalize(cells.map(f)));
    return out;
  }
  function canon(cells) {
    let best = null;
    for (const s of symmetries(cells)) {
      const str = s.slice().sort((a,b) => a[0]-b[0] || a[1]-b[1]).map(c => c.join(':')).join('|');
      if (best === null || str < best) best = str;
    }
    return best;
  }
  const CANON11 = NETS11.map(canon);
  function netId(cells) { return CANON11.indexOf(canon(cells)); }

  function randomOrient(cells) {
    const s = symmetries(cells);
    return s[Math.floor(Math.random() * s.length)];
  }

  function isConnected(cells) {
    if (!cells.length) return false;
    const set = new Set(cells.map(c => key(c[0], c[1])));
    const seen = new Set([key(cells[0][0], cells[0][1])]);
    const q = [cells[0]];
    while (q.length) {
      const [x, z] = q.shift();
      for (const [dx, dz] of DIRS) {
        const k = key(x+dx, z+dz);
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x+dx, z+dz]); }
      }
    }
    return seen.size === cells.length;
  }

  // 根は「いちばん浅い木になる面」を選ぶ（折りの段数が少なく見栄えがよい）
  function buildTree(cells) {
    const idx = new Map(cells.map((c, i) => [key(c[0], c[1]), i]));
    let bestTree = null;
    for (let r = 0; r < cells.length; r++) {
      const parent = Array(cells.length).fill(-1), dir = Array(cells.length).fill(null), depth = Array(cells.length).fill(-1);
      depth[r] = 0;
      const q = [r];
      while (q.length) {
        const i = q.shift();
        const [x, z] = cells[i];
        for (const [dx, dz] of DIRS) {
          const j = idx.get(key(x+dx, z+dz));
          if (j !== undefined && depth[j] < 0) { depth[j] = depth[i] + 1; parent[j] = i; dir[j] = [dx, dz]; q.push(j); }
        }
      }
      const maxD = Math.max(...depth);
      const score = maxD * 10 + depth.reduce((a, b) => a + b, 0) / 10;
      if (!bestTree || score < bestTree.score) bestTree = { root: r, parent, dir, depth, maxDepth: maxD, score };
    }
    return bestTree;
  }

  // 子の面が親に対してどう回るか（親の法線側＝+yへ起き上がる向き）
  function hingeOf(d) {
    const [dx, dz] = d;
    if (dx === 1) return { axis: new THREE.Vector3(0,0,1), sign: 1 };
    if (dx === -1) return { axis: new THREE.Vector3(0,0,1), sign: -1 };
    if (dz === 1) return { axis: new THREE.Vector3(1,0,0), sign: -1 };
    return { axis: new THREE.Vector3(1,0,0), sign: 1 };
  }

  // 角度（ラジアン）の配列から、各面のワールド行列（網の座標系）を求める
  function worldMatrices(cells, tree, angles) {
    const n = cells.length;
    const W = Array(n).fill(null);
    const order = [...Array(n).keys()].sort((a, b) => tree.depth[a] - tree.depth[b]);
    for (const i of order) {
      if (i === tree.root) {
        W[i] = new THREE.Matrix4().makeTranslation(cells[i][0] + 0.5, 0, cells[i][1] + 0.5);
        continue;
      }
      const [dx, dz] = tree.dir[i];
      const h = hingeOf(tree.dir[i]);
      const T1 = new THREE.Matrix4().makeTranslation(dx * 0.5, 0, dz * 0.5);
      const R = new THREE.Matrix4().makeRotationAxis(h.axis, h.sign * angles[i]);
      const T2 = new THREE.Matrix4().makeTranslation(dx * 0.5, 0, dz * 0.5);
      W[i] = W[tree.parent[i]].clone().multiply(T1).multiply(R).multiply(T2);
    }
    return W;
  }

  const r2 = v => Math.round(v * 100) / 100;
  const vkey = v => r2(v.x) + ',' + r2(v.y) + ',' + r2(v.z);

  // 6枚が箱になるか・重なる面・向かい合う面・のりしろ
  function analyze(cells) {
    const res = { count: cells.length, connected: isConnected(cells), valid: false, overlaps: [], opposite: [], tabs: [], tree: null, id: -1 };
    if (cells.length !== 6 || !res.connected) return res;
    const tree = buildTree(cells);
    res.tree = tree;
    const W = worldMatrices(cells, tree, Array(6).fill(Math.PI / 2));
    const centers = W.map(m => new THREE.Vector3().setFromMatrixPosition(m));
    const normals = W.map(m => new THREE.Vector3(0,1,0).transformDirection(m));
    const byKey = new Map();
    centers.forEach((c, i) => { const k = vkey(c); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(i); });
    for (const g of byKey.values()) if (g.length > 1) res.overlaps.push(...g);
    res.overlaps = [...new Set(res.overlaps)];
    res.valid = res.overlaps.length === 0;
    if (!res.valid) return res;
    res.id = netId(cells);
    res.opposite = normals.map((n, i) => normals.findIndex((m, j) => j !== i && n.dot(m) < -0.99));

    // 外周の辺を、組み立てたときに重なる相手と組にする
    const set = new Set(cells.map(c => key(c[0], c[1])));
    const edges = [];
    cells.forEach((c, i) => {
      for (const [dx, dz] of DIRS) {
        if (set.has(key(c[0]+dx, c[1]+dz))) continue;
        // W[i] は面の中心を原点とする座標系なので、辺の中点は (dx/2, 0, dz/2)
        const q = new THREE.Vector3(dx * 0.5, 0, dz * 0.5).applyMatrix4(W[i]);
        edges.push({ face: i, cell: c, side: [dx, dz], k: vkey(q) });
      }
    });
    const pairs = [];
    const byE = new Map();
    edges.forEach((e, ei) => { if (!byE.has(e.k)) byE.set(e.k, []); byE.get(e.k).push(ei); });
    for (const g of byE.values()) if (g.length === 2) pairs.push(g);
    res.edgePairs = pairs.map(([a, b]) => [edges[a], edges[b]]);

    // のりしろ：各組のどちらに付けるかを全通り試し、重なりが最少の配置を選ぶ
    const D = 0.2, C = 0.2;
    const tabPoly = e => {
      const [x, z] = e.cell, [dx, dz] = e.side;
      if (dx === 1)  return [[x+1, z], [x+1+D, z+C], [x+1+D, z+1-C], [x+1, z+1]];
      if (dx === -1) return [[x, z], [x-D, z+C], [x-D, z+1-C], [x, z+1]];
      if (dz === 1)  return [[x, z+1], [x+C, z+1+D], [x+1-C, z+1+D], [x+1, z+1]];
      return [[x, z], [x+C, z-D], [x+1-C, z-D], [x+1, z]];
    };
    const overlapSAT = (A, B) => {
      for (const P of [A, B]) {
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i+1) % P.length];
          const nx = b[1] - a[1], nz = a[0] - b[0];
          const pa = A.map(p => p[0]*nx + p[1]*nz), pb = B.map(p => p[0]*nx + p[1]*nz);
          if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
        }
      }
      return true;
    };
    let best = null;
    const np = res.edgePairs.length;
    for (let mask = 0; mask < (1 << np); mask++) {
      const chosen = res.edgePairs.map((p, i) => p[(mask >> i) & 1]);
      const polys = chosen.map(tabPoly);
      let bad = 0;
      for (let i = 0; i < polys.length; i++) for (let j = i+1; j < polys.length; j++) if (overlapSAT(polys[i], polys[j])) bad++;
      if (!best || bad < best.bad) best = { bad, chosen, polys };
      if (bad === 0) break;
    }
    res.tabs = best ? best.chosen.map((e, i) => ({ face: e.face, cell: e.cell, side: e.side, poly: best.polys[i] })) : [];
    res.tabOverlaps = best ? best.bad : 0;
    return res;
  }

  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  // 全体の進み具合 p（0〜1）から各面の角度を求める（浅い面から順に起き上がる）
  function anglesFor(tree, p, stagger) {
    const s = Math.min(stagger ?? 0.16, 0.6 / Math.max(1, tree.maxDepth));
    const span = 1 - (tree.maxDepth - 1) * s;
    return tree.depth.map(d => {
      if (d === 0) return 0;
      const t = Math.max(0, Math.min(1, (p - (d - 1) * s) / span));
      return easeInOut(t) * Math.PI / 2;
    });
  }

  return { NETS11, INVALID_CANDIDATES, normalize, symmetries, canon, netId, randomOrient, isConnected, buildTree, hingeOf, worldMatrices, analyze, anglesFor, easeInOut };
}
if (typeof module !== 'undefined') module.exports = { createHakoEngine };
