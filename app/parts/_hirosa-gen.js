// ひろさ（H1・H4・H5・H6）の計算（DOM に触らない。単体テストとビルドの数え上げで使う）。
// マスの形（ポリオミノ）・重ねる判定・まわり・長方形の組・およその面積・問題の生成。
import { choices, rnd, pickR, shuffleR } from './_gen.js';

/* ---------- マスの形 ---------- */
export const rect = (w, h) => { const a = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a.push([x, y]); return a; };
export function bbox(cells) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// 左上を 0,0 にそろえて並べ直す
export function norm(cells) {
  const { x0, y0 } = bbox(cells);
  return cells.map(([x, y]) => [x - x0, y - y0]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
export const keyOf = cells => norm(cells).map(p => p.join('.')).join('_');
export const cellsOfKey = k => k.split('_').map(s => s.split('.').map(Number));
// 回す（画面で時計回りに90°：右→下）・裏返す（左右）。k=0〜3 は回すだけ、4〜7 は裏返してから回す
const rot = ([x, y]) => [-y, x], flip = ([x, y]) => [-x, y];
export function variant(cells, k) { let c = k >= 4 ? cells.map(flip) : cells.map(p => p.slice()); for (let i = 0; i < k % 4; i++) c = c.map(rot); return norm(c); }
// 回したり裏返したりして重なる形は同じ。いちばん小さい鍵を代表にする
export function canon(cells) {
  let best = null;
  for (let k = 0; k < 8; k++) { const v = variant(cells, k), key = keyOf(v); if (!best || key < best.key) best = { key, cells: v, k }; }
  return best;
}
export const sameShape = (a, b) => canon(a).key === canon(b).key;
// a を何番の向きにすると b と同じ並びになるか（-1：同じ形ではない）。回す・裏返すの少ない順に探す
export function matchTransform(a, b) {
  const kb = keyOf(b);
  for (const k of [0, 1, 3, 2, 4, 5, 7, 6]) if (keyOf(variant(a, k)) === kb) return k;
  return -1;
}
export function isConnected(cells) {
  if (!cells.length) return false;
  const set = new Set(cells.map(p => p.join(','))), seen = new Set([cells[0].join(',')]), st = [cells[0]];
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); } } }
  return seen.size === set.size;
}
// マス n こで できる形（回す・裏返すで重なる形は1つ）をすべて。1こから1マスずつ育てて数える
export function polyominoes(n) {
  let cur = new Map([[keyOf([[0, 0]]), [[0, 0]]]]);
  for (let s = 2; s <= n; s++) {
    const next = new Map();
    for (const cells of cur.values()) {
      const set = new Set(cells.map(p => p.join(',')));
      for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = [x + dx, y + dy]; if (set.has(p.join(','))) continue;
        const c = canon([...cells, p]); if (!next.has(c.key)) next.set(c.key, c.cells);
      }
    }
    cur = next;
  }
  return [...cur.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([key, cells]) => ({ key, cells }));
}

/* ---------- 重ねる・まわり ---------- */
// A・B は盤の上の絶対位置のマス。inter：重なったマスの数、aIn：A がすっぽり B に入った、bIn：B が A に入った
export function overlap(A, B) {
  const sb = new Set(B.map(p => p.join(','))), sa = new Set(A.map(p => p.join(',')));
  const inter = A.filter(p => sb.has(p.join(','))).length;
  return { inter, over: inter > 0, aIn: inter === sa.size, bIn: inter === sb.size, aOut: sa.size - inter, bOut: sb.size - inter };
}
// 外まわりの辺（マスの1辺＝1）。穴のない形なら長さ＝まわりの長さ
export function outlineSegs(cells) {
  const set = new Set(cells.map(p => p.join(','))), segs = [];
  for (const [x, y] of cells) {
    if (!set.has(x + ',' + (y - 1))) segs.push([x, y, x + 1, y]);
    if (!set.has((x + 1) + ',' + y)) segs.push([x + 1, y, x + 1, y + 1]);
    if (!set.has(x + ',' + (y + 1))) segs.push([x + 1, y + 1, x, y + 1]);
    if (!set.has((x - 1) + ',' + y)) segs.push([x, y + 1, x, y]);
  }
  return segs;
}
export const perimeter = cells => outlineSegs(cells).length;
// まわりを1周する頂点の列（時計回り。始めの点に戻る）。ひもを伸ばす動きに使う
export function outlineLoop(cells) {
  const segs = outlineSegs(cells); if (!segs.length) return [];
  const from = new Map(); segs.forEach((s, i) => { const k = s[0] + ',' + s[1]; if (!from.has(k)) from.set(k, []); from.get(k).push(i); });
  // 左上のマスの上の辺から回り始める
  let si = segs.reduce((b, s, i) => (s[1] < segs[b][1] || (s[1] === segs[b][1] && s[0] < segs[b][0]) ? i : b), 0);
  const used = new Set(), pts = [[segs[si][0], segs[si][1]]];
  while (!used.has(si)) {
    used.add(si); const s = segs[si]; pts.push([s[2], s[3]]);
    const nx = (from.get(s[2] + ',' + s[3]) || []).filter(i => !used.has(i));
    if (!nx.length) break;
    // くびれ（2つの辺が出る点）は右に曲がる方を選ぶ
    const dx = s[2] - s[0], dy = s[3] - s[1];
    si = nx.length === 1 ? nx[0] : nx.find(i => { const t = segs[i]; return (t[2] - t[0]) === -dy && (t[3] - t[1]) === dx; }) ?? nx[0];
  }
  // 一直線の途中の点は除く
  return pts.filter((p, i) => { if (i === 0 || i === pts.length - 1) return true; const a = pts[i - 1], b = pts[i + 1]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); });
}

/* ---------- 長方形（H4） ---------- */
// 面積が A の長方形（たて≦よこ。縦横を入れかえた形は同じ）
export function rectsOfArea(A) { const o = []; for (let a = 1; a * a <= A; a++) if (A % a === 0) o.push([a, A / a]); return o; }
// まわりの長さが P の長方形（たて≦よこ）と面積
export function rectsOfPerim(P) { const h = P / 2, o = []; for (let a = 1; a <= h / 2; a++) o.push({ h: a, w: h - a, area: a * (h - a) }); return o; }
export const rectKey = (h, w) => `${Math.min(h, w)}x${Math.max(h, w)}`;

/* ---------- およその面積（H6） ---------- */
export function polyArea(P) { let s = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
export function inPoly([x, y], P) { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; } return r; }
// 方眼（1マス＝1）で数える：ぜんぶ入るマス・かかるマス（半分とみる）。k×k の点で調べる
export function gridCount(P, k = 7) {
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]), full = [], part = [];
  for (let gy = Math.floor(Math.min(...ys)); gy < Math.ceil(Math.max(...ys)); gy++) for (let gx = Math.floor(Math.min(...xs)); gx < Math.ceil(Math.max(...xs)); gx++) {
    let n = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (inPoly([gx + (i + 0.5) / k, gy + (j + 0.5) / k], P)) n++;
    if (n === k * k) full.push([gx, gy]); else if (n > 0) part.push([gx, gy]);
  }
  return { full, part, est: full.length + part.length / 2 };
}
// なめらかな形（はっぱ・いけ）の点の列。中心 (cx,cy)・半径 r・でこぼこの係数
export function blob(cx, cy, rx, ry, wob = [], n = 72) {
  const P = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; let k = 1; wob.forEach(([m, amp, ph]) => { k += amp * Math.sin(m * a + ph); }); P.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]); }
  return P;
}
export const leafPts = (cx, cy, L, W) => { const P = []; for (let i = 0; i <= 36; i++) { const t = i / 36; P.push([cx - L / 2 + L * t, cy - W / 2 * Math.sin(Math.PI * t) * (1 - 0.25 * t)]); } for (let i = 35; i > 0; i--) { const t = i / 36; P.push([cx - L / 2 + L * t, cy + W / 2 * Math.sin(Math.PI * t) * (1 - 0.25 * t)]); } return P; };

/* ---------- じんとり ---------- */
// 盤 B（長さ cols×rows、0＝空き・1＝あか・2＝あお）で、who が ぬれる マス（自分の陣地のとなりの空き）
export function jinMoves(B, cols, rows, who) {
  const out = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (B[y * cols + x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < cols && Y < rows && B[Y * cols + X] === who; })) out.push([x, y]);
  }
  return out;
}
// コンピュータの1手：相手の陣地に近い・空きのとなりが多いマスを選ぶ（少しゆらぎ）
export function jinPick(B, cols, rows, who, rand = Math.random) {
  const mv = jinMoves(B, cols, rows, who); if (!mv.length) return null;
  const other = who === 1 ? 2 : 1;
  const score = ([x, y]) => {
    let s = rand() * 0.8;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue; const v = B[Y * cols + X]; if (!v) s += 1; if (v === other) s += 0.6; }
    s -= Math.hypot(x - (cols - 1) / 2, y - (rows - 1) / 2) * 0.25;
    return s;
  };
  return mv.reduce((b, m) => (score(m) > score(b) ? m : b), mv[0]);
}
export const jinCount = (B, who) => B.filter(v => v === who).length;

/* ---------- 問題の生成（H1） ---------- */
const L6 = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]];
const HOOK7 = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
const T7 = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2]];
// どちらが ひろい：kind＝inside（重ねると決まる）・both（はみ出し方が両方）・perim（まわりが長い方が せまい）・same（同じ広さ）
const HIROI = {
  easy: [{ a: rect(2, 2), b: rect(3, 3), kind: 'inside' }, { a: rect(2, 3), b: rect(3, 4), kind: 'inside' }, { a: rect(4, 3), b: rect(3, 2), kind: 'inside' }, { a: rect(5, 1), b: rect(3, 3), kind: 'perim' }, { a: rect(4, 4), b: rect(2, 4), kind: 'inside' }],
  normal: [{ a: rect(7, 1), b: rect(3, 3), kind: 'perim' }, { a: rect(5, 2), b: rect(3, 3), kind: 'both' }, { a: rect(4, 3), b: rect(5, 2), kind: 'both' }, { a: rect(8, 1), b: rect(3, 3), kind: 'perim' }, { a: L6, b: rect(3, 2), kind: 'same' }],
  challenge: [{ a: HOOK7, b: rect(3, 2), kind: 'perim' }, { a: rect(6, 2), b: rect(4, 3), kind: 'same' }, { a: T7, b: rect(4, 2), kind: 'perim' }, { a: rect(9, 1), b: rect(3, 3), kind: 'perim' }, { a: rect(5, 3), b: rect(4, 4), kind: 'both' }],
};
export function genHiroi(level, i, rand = Math.random) {
  const pool = HIROI[level] || HIROI.normal, base = pool[i % pool.length];
  const sw = rand() < 0.5 && base.kind !== 'inside';
  const a = sw ? base.b : base.a, b = sw ? base.a : base.b;
  const na = a.length, nb = b.length, pa = perimeter(a), pb = perimeter(b);
  // まちがいの型：まわりの長い方を選んだら A1、重ねて決めようとして はみ出しに迷ったら A2
  const mis = k => { const n = k === 'a' ? na : nb, p = k === 'a' ? pa : pb, po = k === 'a' ? pb : pa; return p > po ? 'A1' : base.kind === 'both' || base.kind === 'same' ? 'A2' : 'other'; };
  const ch = [{ key: 'a', ok: na > nb, mistake: na > nb ? null : mis('a') }, { key: 'b', ok: nb > na, mistake: nb > na ? null : mis('b') }];
  if (level !== 'easy' || na === nb) ch.push({ key: 'same', ok: na === nb, mistake: na === nb ? null : 'A2' });
  return { a, b, kind: base.kind, na, nb, pa, pb, choices: ch };
}
// いくつぶん：kind＝count（マスの数）・size（大きさのちがうマス＝A3）
export function genCount(level, i, rand = Math.random) {
  const sizeQ = level !== 'easy' && i % 2 === 1;
  if (sizeQ) {
    // あか：小さいマス、あお：大きいマス（2×2）。数は あか が多いのに、広いのは あお
    const opts = level === 'normal' ? [[rect(3, 3), rect(4, 4)], [rect(5, 2), rect(4, 4)], [rect(3, 4), rect(4, 4)]] : [[rect(4, 3), rect(4, 4)], [rect(7, 2), rect(6, 4)], [HOOK7, rect(4, 2)]];
    const [a, b] = opts[Math.floor(i / 2) % opts.length], ta = a.length, tb = b.length / 4;
    return { kind: 'size', a, b, na: a.length, nb: b.length, ta, tb, choices: [{ key: 'a', ok: a.length > b.length, mistake: 'A3' }, { key: 'b', ok: b.length > a.length, mistake: 'A3' }, { key: 'same', ok: a.length === b.length, mistake: 'A3' }] };
  }
  const shapes = { easy: [rect(3, 2), rect(4, 2), L6, rect(3, 3), rect(5, 1)], normal: [rect(4, 3), HOOK7, T7, rect(5, 2), [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3]]], challenge: [rect(4, 4), [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]], rect(6, 2), T7.concat([[2, 3], [2, 4]]), [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [1, 3], [2, 3], [3, 3], [4, 3]]] }[level];
  const a = shapes[i % shapes.length], n = a.length;
  const w = [{ html: String(n + 1), mistake: 'count' }, { html: String(n - 1), mistake: 'count' }, { html: String(perimeter(a)), mistake: 'A1' }, { html: String(n + 2), mistake: 'count' }];
  shuffleR(w.slice(0, 2), rand);
  return { kind: 'count', a, na: n, choices: choices(String(n), [w[2], w[rand() < 0.5 ? 0 : 1], w[3]], level === 'easy' ? 2 : 3, rand) };
}
// みとおし：マスの数（見当→かぞえる）。形は方眼に沿った かたまり
export function genBlobCells(level, i, rand = Math.random) {
  const n = level === 'easy' ? rnd(6, 12, rand) : level === 'normal' ? rnd(12, 22, rand) : rnd(20, 34, rand);
  const cells = [[0, 0]], set = new Set(['0,0']);
  while (cells.length < n) {
    const [x, y] = pickR(cells, rand), [dx, dy] = pickR([[1, 0], [-1, 0], [0, 1], [0, -1]], rand), X = x + dx, Y = y + dy, k = X + ',' + Y;
    if (set.has(k)) continue;
    // まとまった形にする（となりが2つ以上あるマスを好む）
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => set.has((X + a) + ',' + (Y + b))).length;
    if (nb < 2 && rand() < 0.55 && cells.length > 3) continue;
    const bb = bbox([...cells, [X, Y]]); if (bb.w > 8 || bb.h > 6) continue;
    set.add(k); cells.push([X, Y]);
  }
  return norm(cells);
}

/* ---------- 問題の生成（H4：面積） ---------- */
const CM2 = 'cm²', M2 = 'm²';
export function genArea(level, i, rand = Math.random) {
  const t = level === 'easy' ? ['grid', 'rect', 'grid', 'rect', 'sq'][i % 5] : level === 'normal' ? ['rect', 'sq', 'perim', 'm', 'rect'][i % 5] : ['L', 'unit', 'L2', 'unit', 'perim'][i % 5];
  if (t === 'grid' || t === 'rect' || t === 'm') {
    const h = rnd(2, level === 'easy' ? 4 : 7, rand), w = rnd(h + 1, level === 'easy' ? 6 : 9, rand), u = t === 'm' ? M2 : CM2, a = h * w;
    return { t, h, w, unit: u, ans: a, choices: choices(`${a}${u}`, [{ html: `${2 * (h + w)}${u}`, mistake: 'A1' }, { html: `${h + w}${u}`, mistake: 'A4' }, { html: `${a + w}${u}`, mistake: 'other' }], 3, rand) };
  }
  if (t === 'sq') { const s = rnd(3, 6, rand), a = s * s; return { t, h: s, w: s, unit: CM2, ans: a, choices: choices(`${a}${CM2}`, [{ html: `${4 * s}${CM2}`, mistake: 'A1' }, { html: `${2 * s}${CM2}`, mistake: 'A4' }], 3, rand) }; }
  if (t === 'perim') {
    // まわりの長さが同じ長方形：広いのは どっち（A1）
    const P = level === 'challenge' ? 24 : 20, R = rectsOfPerim(P), [x, y] = shuffleR(R.slice(), rand).slice(0, 2), big = x.area > y.area ? x : y;
    return { t, P, a: x, b: y, ans: big.area, choices: [{ html: 'あか', key: 'a', ok: x.area > y.area, mistake: 'A1' }, { html: 'あお', key: 'b', ok: y.area > x.area, mistake: 'A1' }, { html: 'おなじ', key: 'same', ok: x.area === y.area, mistake: 'A1' }] };
  }
  if (t === 'L' || t === 'L2') {
    const H = rnd(5, 8, rand), W = rnd(6, 9, rand), nh = rnd(2, H - 2, rand), nw = rnd(2, W - 3, rand), a = H * W - nh * nw;
    return { t, H, W, nh, nw, unit: CM2, ans: a, choices: choices(`${a}${CM2}`, [{ html: `${H * W}${CM2}`, mistake: 'L' }, { html: `${2 * (H + W)}${CM2}`, mistake: 'A1' }, { html: `${a - nh * nw}${CM2}`, mistake: 'L' }], 3, rand) };
  }
  // たんい：1m²＝10000cm²、1a＝100m²、1ha＝100a、1km²＝100ha
  const U = [
    { q: '1m² は なん cm²？', ans: '10000cm²', w: [['100cm²', 'm2'], ['1000cm²', 'm2']] },
    { q: '1a は なん m²？', ans: '100m²', w: [['10m²', 'other'], ['1000m²', 'other']] },
    { q: '1ha は なん m²？', ans: '10000m²', w: [['100m²', 'm2'], ['1000m²', 'other']] },
    { q: '2m² は なん cm²？', ans: '20000cm²', w: [['200cm²', 'm2'], ['2000cm²', 'm2']] },
    { q: '1km² は なん ha？', ans: '100ha', w: [['10ha', 'other'], ['1000ha', 'other']] },
  ];
  const it = U[Math.floor(i / 2) % U.length];
  return { t: 'unit', q: it.q, ans: it.ans, choices: choices(it.ans, it.w.map(([html, mistake]) => ({ html, mistake })), 3, rand) };
}

/* ---------- 問題の生成（H5：三角形・四角形の面積） ---------- */
// fig：para（平行四辺形）・tri（三角形）・trap（台形）・rhom（ひし形）。off：上の頂点のずれ（高さが外に出るとき out）
export function genFormula(level, i, rand = Math.random) {
  const kinds = level === 'easy' ? ['para', 'tri', 'para', 'tri', 'para'] : level === 'normal' ? ['tri', 'trap', 'para', 'rhom', 'tri'] : ['triOut', 'trap', 'paraOut', 'rhom', 'triOut'];
  const k = kinds[i % kinds.length];
  const b = rnd(4, 9, rand), h = rnd(3, 7, rand);
  const side = (dx, hh) => Math.round(Math.hypot(dx, hh) * 10) / 10;
  if (k === 'para' || k === 'paraOut') {
    const off = k === 'paraOut' ? b + rnd(1, 3, rand) : rnd(1, b - 1, rand), s = side(off, h), a = b * h;
    return { fig: 'para', b, h, off, s: Math.round(s), out: k === 'paraOut', ans: a, choices: choices(`${a}cm²`, [{ html: `${b * Math.round(s)}cm²`, mistake: 'A4h' }, { html: `${a / 2}cm²`, mistake: 'A4half' }, { html: `${2 * (b + Math.round(s))}cm²`, mistake: 'A1' }].filter(w => w.html !== `${a}cm²`), 3, rand) };
  }
  if (k === 'tri' || k === 'triOut') {
    let bb = b; if ((bb * h) % 2) bb += 1;
    const off = k === 'triOut' ? bb + rnd(1, 3, rand) : rnd(1, bb - 1, rand), s = Math.round(side(bb - off, h)), a = bb * h / 2;
    return { fig: 'tri', b: bb, h, off, s, out: k === 'triOut', ans: a, choices: choices(`${a}cm²`, [{ html: `${bb * h}cm²`, mistake: 'A4half' }, { html: `${bb * s / 2}cm²`, mistake: 'A4h' }, { html: `${bb + h}cm²`, mistake: 'other' }].filter(w => w.html !== `${a}cm²`), 3, rand) };
  }
  if (k === 'trap') {
    let up = 2, bb = b, hh = h;
    for (let t = 0; t < 30; t++) { bb = rnd(5, 10, rand); up = rnd(2, bb - 2, rand); hh = rnd(3, 7, rand); if (((up + bb) * hh) % 2 === 0) break; }
    if (((up + bb) * hh) % 2) hh = 4;
    const off = rnd(1, bb - up - 1 > 1 ? bb - up - 1 : 1, rand), s = Math.round(side(off, hh)), a = (up + bb) * hh / 2;
    return { fig: 'trap', b: bb, up, h: hh, off, s, ans: a, choices: choices(`${a}cm²`, [{ html: `${(up + bb) * hh}cm²`, mistake: 'A4half' }, { html: `${(up + bb) * s / 2}cm²`, mistake: 'A4h' }, { html: `${bb * hh}cm²`, mistake: 'A4' }].filter(w => w.html !== `${a}cm²`), 3, rand) };
  }
  // ひし形：対角線 d1・d2
  let d1 = rnd(4, 10, rand), d2 = rnd(4, 8, rand); if ((d1 * d2) % 2) d1 += 1;
  const a = d1 * d2 / 2;
  return { fig: 'rhom', d1, d2, ans: a, choices: choices(`${a}cm²`, [{ html: `${d1 * d2}cm²`, mistake: 'A4half' }, { html: `${(d1 + d2) * 2}cm²`, mistake: 'A1' }, { html: `${d1 + d2}cm²`, mistake: 'A4' }].filter(w => w.html !== `${a}cm²`), 3, rand) };
}

/* ---------- 問題の生成（H6：円の面積・およその面積） ---------- */
export const PI = 3.14;
const r2 = v => Math.round(v * 100) / 100;
export function genCircle(level, i, rand = Math.random) {
  const kinds = level === 'easy' ? ['r', 'r', 'r', 'r', 'r'] : level === 'normal' ? ['r', 'd', 'r', 'half', 'd'] : ['d', 'half', 'approx', 'quarter', 'approx'];
  const k = kinds[i % kinds.length];
  if (k === 'approx') {
    const sh = pickR([{ s: 'tri', a: rnd(6, 12, rand) * 2, b: rnd(4, 9, rand), name: 'さんかくけい' }, { s: 'para', a: rnd(5, 10, rand), b: rnd(3, 7, rand), name: 'へいこうしへんけい' }, { s: 'circle', a: rnd(2, 5, rand) * 10, name: 'えん' }], rand);
    const ans = sh.s === 'tri' ? sh.a * sh.b / 2 : sh.s === 'para' ? sh.a * sh.b : r2(sh.a * sh.a * PI);
    const u = sh.s === 'circle' ? 'm²' : 'km²';
    const w = sh.s === 'tri' ? [[sh.a * sh.b, 'A4half'], [sh.a + sh.b, 'A4']] : sh.s === 'para' ? [[sh.a * sh.b / 2, 'A4half'], [2 * (sh.a + sh.b), 'A1']] : [[r2(sh.a * 2 * PI), 'A4c'], [r2(sh.a * sh.a * 4 * PI), 'A4d']];
    return { k, shape: sh, unit: u, ans, choices: choices(`${ans}${u}`, w.map(([v, m]) => ({ html: `${v}${u}`, mistake: m })), 3, rand) };
  }
  const r = level === 'easy' ? rnd(2, 6, rand) : rnd(2, 10, rand), base = r2(r * r * PI);
  const frac = k === 'half' ? 0.5 : k === 'quarter' ? 0.25 : 1, ans = r2(base * frac);
  const w = [{ html: `${r2(r * 2 * PI * frac)}cm²`, mistake: 'A4c' }, { html: `${r2(r * r * 4 * PI * frac)}cm²`, mistake: 'A4d' }];
  if (frac < 1) w.push({ html: `${base}cm²`, mistake: 'frac' }); else w.push({ html: `${r * r * 3}cm²`, mistake: 'pi' });
  return { k, r, d: k === 'd', frac, ans, choices: choices(`${ans}cm²`, w.filter(x => x.html !== `${ans}cm²`), 3, rand) };
}
