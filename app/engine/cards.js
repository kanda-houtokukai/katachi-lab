// 面のカードを辺につないで展開図を作る（設計書 R4「てんかいず（直方体）」、以降の角柱・角錐・正多面体でも使う）。
// 辺の長さが合う向きにだけ吸い付く。描画に依存しない（単体テストでカタログの全展開図を再現して確かめる）。
import { face2d, faceEdges, foldAngle, shapeSig, satOverlap, canonKey, keyHash, finishLayout } from './nets.js';
import { foldedFaces, overlappingFaces, edgePairs, outerEdges } from './fold.js';

const EPS = 1e-6;
const elen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const same = (P, Q) => P.length === Q.length && P.every(p => Q.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6));

// 立体から、カードの種類（合同な面をまとめる）と、辺でつながる2種類の組ごとの折る角度を作る
export function cardSet(P) {
  const types = [], faceType = [];
  P.F.forEach((f, fi) => {
    const loc = face2d(P, fi), pts = f.map(i => loc[i]), sig = shapeSig(pts);
    let t = types.findIndex(x => x.sig === sig);
    if (t < 0) { t = types.length; types.push({ sig, pts, count: 0, name: P.faceType ? P.faceType[fi] : 'face' }); }
    types[t].count++; faceType[fi] = t;
  });
  const fold = new Map();
  for (const e of faceEdges(P)) {
    const [fi, fj] = e.f, L = Math.round(Math.hypot(...[0, 1, 2].map(k => P.V[e.v[0]][k] - P.V[e.v[1]][k])) * 1000);
    const a = faceType[fi], b = faceType[fj], key = (a < b ? a + ':' + b : b + ':' + a) + '|' + L;
    if (!fold.has(key)) fold.set(key, foldAngle(P, fi, fj));
  }
  return { types, faceType, fold, total: P.F.length };
}
export const foldKey = (a, b, len) => (a < b ? a + ':' + b : b + ':' + a) + '|' + Math.round(len * 1000);

function transform(pts, a, b, mirror, ta, tb) {
  // カードの辺 a→b を、置いた先の辺 ta→tb に重ねる（裏返しは x を反転してから並びを戻す）
  let P = pts.map(p => [...p]);
  let A = a, B = b;
  if (mirror) { P = P.map(([x, y]) => [-x, y]); A = [-a[0], a[1]]; B = [-b[0], b[1]]; }
  const ang = Math.atan2(tb[1] - ta[1], tb[0] - ta[0]) - Math.atan2(B[1] - A[1], B[0] - A[0]);
  const c = Math.cos(ang), s = Math.sin(ang);
  P = P.map(([x, y]) => { const dx = x - A[0], dy = y - A[1]; return [ta[0] + c * dx - s * dy, ta[1] + s * dx + c * dy]; });
  if (mirror) P.reverse();
  return P;
}
const area = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };

export function makeBuilder(set) {
  const B = {
    set, cards: [], // { type, pts（反時計回り）, parent, hinge:[a,b], pEdge }
    left() { const n = set.types.map(t => t.count); B.cards.forEach(c => n[c.type]--); return n; },
    start(type, pts = null) {
      B.cards = [{ type, pts: (pts || set.types[type].pts).map(p => [...p]), parent: -1, hinge: null, pEdge: -1 }];
      return { ok: true };
    },
    freeEdges() {
      const used = new Set();
      B.cards.forEach((c, i) => { if (c.parent >= 0) { used.add(c.parent + ':' + c.pEdge); used.add(i + ':' + c.myEdge); } });
      const out = [];
      B.cards.forEach((c, i) => c.pts.forEach((p, k) => { if (!used.has(i + ':' + k)) out.push({ card: i, k, a: p, b: c.pts[(k + 1) % c.pts.length], len: elen(p, c.pts[(k + 1) % c.pts.length]) }); }));
      return out;
    },
    // その辺に、その種類のカードを付けられる置き方（重ならないものだけ）
    candidates(type, card, k) {
      const tgt = B.cards[card], ta = tgt.pts[k], tb = tgt.pts[(k + 1) % tgt.pts.length], L = elen(ta, tb);
      const src = set.types[type].pts, out = [];
      for (let j = 0; j < src.length; j++) {
        const a = src[j], b = src[(j + 1) % src.length];
        if (Math.abs(elen(a, b) - L) > EPS) continue;
        for (const mirror of [false, true]) {
          // 置いた先の辺の外側に付ける：表向きはカードの a→b を tb→ta に、裏返しは（向きが逆になるので）ta→tb に重ねる
          const P = mirror ? transform(src, a, b, true, ta, tb) : transform(src, a, b, false, tb, ta);
          if (area(P) < 0) continue;
          if (out.some(o => same(o.pts, P))) continue;
          const myEdge = P.findIndex((p, i) => { const q = P[(i + 1) % P.length]; return (Math.hypot(p[0] - tb[0], p[1] - tb[1]) < 1e-6 && Math.hypot(q[0] - ta[0], q[1] - ta[1]) < 1e-6); });
          if (B.cards.some(c => satOverlap(c.pts, P, 1e-6))) continue;
          out.push({ pts: P, myEdge });
        }
      }
      return out;
    },
    // つなぐ。長さが合わない・重なる・残りがない ときは ok:false と理由
    attach(type, card, k, variant = 0) {
      if (B.left()[type] <= 0) return { ok: false, reason: 'none' };
      const tgt = B.cards[card], L = elen(tgt.pts[k], tgt.pts[(k + 1) % tgt.pts.length]);
      if (!set.types[type].pts.some((p, j, A) => Math.abs(elen(p, A[(j + 1) % A.length]) - L) < EPS)) return { ok: false, reason: 'length' };
      const used = B.freeEdges().some(e => e.card === card && e.k === k);
      if (!used) return { ok: false, reason: 'used' };
      const cands = B.candidates(type, card, k);
      if (!cands.length) return { ok: false, reason: 'overlap' };
      const c = cands[variant % cands.length];
      B.cards.push({ type, pts: c.pts, parent: card, hinge: [tgt.pts[k], tgt.pts[(k + 1) % tgt.pts.length]], pEdge: k, myEdge: c.myEdge, variant: variant % cands.length, nVariants: cands.length });
      return { ok: true, index: B.cards.length - 1, nVariants: cands.length };
    },
    // 最後に付けたカードの置き方を次へ（くるっと回す・裏返す）
    turnLast() {
      const i = B.cards.length - 1, c = B.cards[i]; if (i <= 0) return { ok: false };
      B.cards.pop();
      const cands = B.candidates(c.type, c.parent, c.pEdge);
      const v = (c.variant + 1) % cands.length, n = cands[v];
      B.cards.push(Object.assign({}, c, { pts: n.pts, myEdge: n.myEdge, variant: v, nVariants: cands.length }));
      return { ok: true, changed: cands.length > 1 };
    },
    undo() { if (B.cards.length) B.cards.pop(); },
    full() { return B.cards.length === set.total && B.left().every(n => n === 0); },
    polys() { return B.cards.map(c => c.pts); },
    // 折れる形にする。種類の組に決まった角度がない蝶番は bad に入れ、角度 0（折らない）
    layout() {
      const bad = [];
      const depth = B.cards.map(() => 0);
      B.cards.forEach((c, i) => { if (c.parent >= 0) depth[i] = depth[c.parent] + 1; });
      const fold = B.cards.map((c, i) => {
        if (c.parent < 0) return 0;
        const k = foldKey(B.cards[c.parent].type, c.type, elen(c.hinge[0], c.hinge[1]));
        if (!set.fold.has(k)) { bad.push(i); return 0; }
        return set.fold.get(k);
      });
      const L = finishLayout({ faces: B.cards.map(c => ({ pts: c.pts, type: set.types[c.type].name, card: c.type })), root: 0, parent: B.cards.map(c => c.parent), hinge: B.cards.map(c => c.hinge), fold, depth });
      L.badHinges = bad;
      return L;
    },
  };
  return B;
}

// 判定：カタログにあれば番号。なければ 0。あわせて、折ったときに閉じるか（重なり・すき間）を返す
export function judge(B, cat) {
  const polys = B.polys(), no = B.full() ? (cat ? cat.lookup(polys) : 0) : 0;
  const L = B.layout();
  const F = foldedFaces(L), ov = overlappingFaces(F), pairs = edgePairs(L, F), outer = outerEdges(L);
  const closes = B.full() && !L.badHinges.length && ov.length === 0 && pairs.length * 2 === outer.length;
  return { no, closes, overlaps: ov, badHinges: L.badHinges, layout: L, key: B.full() ? keyHash(canonKey(polys)) : null };
}

// カタログの展開図を、カードをつなぐ操作の列に直す（テスト・ヒント用）
export function opsFromLayout(set, L) {
  const ops = [], idx = new Map();
  const order = [...L.faces.keys()].sort((a, b) => L.depth[a] - L.depth[b]);
  const typeOf = pts => set.types.findIndex(t => t.sig === shapeSig(pts));
  for (const i of order) {
    const pts = L.faces[i].pts, type = typeOf(pts);
    if (i === L.root) { ops.push({ op: 'start', type, pts }); idx.set(i, 0); continue; }
    const p = L.parent[i], ppts = L.faces[p].pts, [ha, hb] = L.hinge[i];
    const k = ppts.findIndex((q, j) => { const r = ppts[(j + 1) % ppts.length]; return (Math.hypot(q[0] - ha[0], q[1] - ha[1]) < 1e-6 && Math.hypot(r[0] - hb[0], r[1] - hb[1]) < 1e-6) || (Math.hypot(q[0] - hb[0], q[1] - hb[1]) < 1e-6 && Math.hypot(r[0] - ha[0], r[1] - ha[1]) < 1e-6); });
    ops.push({ op: 'attach', type, card: idx.get(p), k, edge: [ha, hb], want: pts });
    idx.set(i, ops.length - 1);
  }
  return ops;
}
export function replay(set, ops) {
  const B = makeBuilder(set);
  for (let o of ops) {
    if (o.op === 'start') { B.start(o.type, o.pts); continue; }
    // 辺は端の点で探す（カードの頂点の並びの始まりは置き方で変わる）
    if (o.edge) {
      const P = B.cards[o.card].pts, [ha, hb] = o.edge, near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6;
      o = Object.assign({}, o, { k: P.findIndex((q, j) => { const r = P[(j + 1) % P.length]; return (near(q, ha) && near(r, hb)) || (near(q, hb) && near(r, ha)); }) });
    }
    const cands = B.candidates(o.type, o.card, o.k);
    const v = o.want ? cands.findIndex(c => same(c.pts, o.want)) : (o.variant || 0);
    if (v < 0) return { B, error: 'no-candidate' };
    const r = B.attach(o.type, o.card, o.k, v);
    if (!r.ok) return { B, error: r.reason };
  }
  return { B };
}
