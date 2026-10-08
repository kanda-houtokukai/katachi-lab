// 「はこに なるかな？」の、箱にならない展開図をつくる（カタログ以外の形）。
// ①カードを辺の長さが合う向きでランダムにつなぎ、カタログにないもの ②1枚だけ大きさの合わない辺へ付け替えたもの。
import { cardSet, makeBuilder, judge } from './cards.js';
import { finishLayout, satOverlap } from './nets.js';

function randomFill(set, rand) {
  const B = makeBuilder(set); B.start(Math.floor(rand() * set.types.length));
  let guard = 0;
  while (!B.full() && guard++ < 80) {
    const left = B.left(), types = left.map((n, t) => (n > 0 ? t : -1)).filter(t => t >= 0);
    const t = types[Math.floor(rand() * types.length)], fe = B.freeEdges(), e = fe[Math.floor(rand() * fe.length)];
    B.attach(t, e.card, e.k, Math.floor(rand() * 4));
  }
  return B;
}
// 葉の面を1枚、長さの違う辺の真ん中へ付け替える（大きさの合わない辺がつながった形）
function mismatchFrom(cat, rand) {
  const L0 = cat.layout(1 + Math.floor(rand() * cat.count));
  const n = L0.faces.length, isLeaf = i => i !== L0.root && !L0.parent.includes(i);
  const leaves = [...Array(n).keys()].filter(isLeaf);
  for (let tries = 0; tries < 40; tries++) {
    const leaf = leaves[Math.floor(rand() * leaves.length)];
    const others = L0.faces.map((f, i) => i).filter(i => i !== leaf);
    const host = others[Math.floor(rand() * others.length)], hp = L0.faces[host].pts;
    const k = Math.floor(rand() * hp.length), ta = hp[k], tb = hp[(k + 1) % hp.length], TL = Math.hypot(tb[0] - ta[0], tb[1] - ta[1]);
    const lp = L0.faces[leaf].pts;
    const j = Math.floor(rand() * lp.length), a = lp[j], b = lp[(j + 1) % lp.length], LL = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (Math.abs(LL - TL) < 1e-3) continue;
    // 葉の辺 a→b を、置き先の辺 tb→ta の真ん中にそろえる
    const ang = Math.atan2(ta[1] - tb[1], ta[0] - tb[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
    const mT = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2], mL = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const P = lp.map(([x, y]) => { const dx = x - mL[0], dy = y - mL[1]; return [mT[0] + c * dx - s * dy, mT[1] + s * dx + c * dy]; });
    if (others.some(i => satOverlap(L0.faces[i].pts, P, 1e-6))) continue;
    const half = Math.min(LL, TL) / 2, ux = (tb[0] - ta[0]) / TL, uy = (tb[1] - ta[1]) / TL;
    const faces = L0.faces.map((f, i) => (i === leaf ? Object.assign({}, f, { pts: P }) : f));
    const hinge = L0.hinge.map((h, i) => (i === leaf ? [[mT[0] - ux * half, mT[1] - uy * half], [mT[0] + ux * half, mT[1] + uy * half]] : h));
    const parent = L0.parent.map((p, i) => (i === leaf ? host : p));
    const depth = L0.depth.map((d, i) => (i === leaf ? L0.depth[host] + 1 : d));
    const fold = L0.fold.map((f, i) => (i === leaf ? 0 : f));
    const L = finishLayout({ faces, root: L0.root, parent, hinge, fold, depth });
    L.badHinges = [leaf]; L.mismatch = true;
    return L;
  }
  return null;
}

export function invalidVariants(cat, n, rand = Math.random, mismatch = 0) {
  const set = cardSet(cat.P), out = [];
  const nMis = Math.min(n, typeof mismatch === 'number' ? mismatch : 0);
  for (let i = 0; i < nMis; i++) { const L = mismatchFrom(cat, rand); if (L) out.push(L); }
  let guard = 0;
  while (out.length < n && guard++ < 600) {
    const B = randomFill(set, rand);
    if (!B.full()) continue;
    const j = judge(B, cat);
    if (j.no > 0) continue;
    const L = j.layout; L.badHinges = j.badHinges;
    out.push(L);
  }
  return out;
}
