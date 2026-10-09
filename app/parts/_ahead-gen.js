// 「ちょっと先」の量（A4 角の大きさ・E5 円周と円周率・S5 単位量あたりの大きさと速さ・EJ おうぎ形）の計算と問題づくり。
// DOM に触らない（tests/unit/hakaru-ahead.test.mjs で確かめる）。角度は「右向きを 0°、反時計回りが正」（算数の向き）。
import { choices, rnd, pickR, shuffleR } from './_gen.js';

export const PI = 3.14;                       // 小学校の円周率
export const r2 = v => Math.round(v * 100) / 100;
export const r1 = v => Math.round(v * 10) / 10;
export const norm360 = a => ((a % 360) + 360) % 360;
// 小数を画面の文に（3.10 → 3.1、末尾の0を出さない）
export const num = v => String(r2(v));

/* ---------------- A4 角の大きさ・分度器 ---------------- */
// 算数の向きの角度 a の方向に r だけ進んだ点（SVG は y が下向きなので sin を引く）
export function dirPt(cx, cy, r, a) { const t = a * Math.PI / 180; return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; }
// 分度器（半円）：中心 (cx,cy)、0の線の向き rot（内側の目もりの 0 がある向き）。
// 内側の目もり＝rot から反時計回りに 0→180、外側の目もり＝反対の端（rot+180）から時計回りに 0→180。
export const innerAt = phi => phi;            // 0の線から反時計回りに phi 度の向きの、内側の目もりの値
export const outerAt = phi => 180 - phi;      // 同じ向きの、外側の目もりの値
// 目もり v（0〜180）が、どの向きにあるか（算数の向き）
export const tickDir = (rot, v, which = 'inner') => norm360(rot + (which === 'inner' ? v : 180 - v));
// 目もり v の線の端の点（分度器の半径 r の円の上）
export function tickPos(cx, cy, r, rot, v, which = 'inner') { return dirPt(cx, cy, r, tickDir(rot, v, which)); }
// 角（頂点 V、辺の向き a0 と a1＝a0+θ、0<θ<180）に分度器を合わせたとき、読む目もりと値。
// 0の線を a0 の辺に合わせる（rot=a0）→ 内側、a1 の辺に合わせる（rot=a1−180）→ 外側。どちらでも θ が読める
export function readAt(rot, a0, th) {
  const a1 = a0 + th, d0 = norm360(a0 - rot), d1 = norm360(a1 - rot);
  // 半円（0〜180）の中に両方の辺がある
  if (d0 > 180.0001 || d1 > 180.0001) return null;
  if (Math.abs(d0) < 1e-6 || Math.abs(d0 - 360) < 1e-6) return { which: 'inner', v: r1(innerAt(d1)), at: a1 };
  if (Math.abs(d1 - 180) < 1e-6) return { which: 'outer', v: r1(outerAt(d0)), at: a0 };
  return { which: null, v: r1(Math.abs(d1 - d0)), at: a1 };   // 0の線が辺に合っていない（目もりの差で読む）
}
// 合わせ方（0の線を どちらの辺に）→ 正しい rot
export const alignRots = (a0, th) => [{ rot: norm360(a0), which: 'inner' }, { rot: norm360(a0 + th - 180), which: 'outer' }];

// 三角定規の角を組み合わせる（あわせる＝たす、かさねる＝ひく）。1組の三角定規（30°・60°・90° と 45°・45°・90°）から
// 1つずつ角を選んで できる角のうち、もとの角（30・45・60・90）でないもの（0°と 180°を こえるものは のぞく）
export const RULER_A = [30, 60, 90], RULER_B = [45, 90];
export function rulerAngles() {
  const single = new Set([...RULER_A, ...RULER_B]), by = new Map();
  for (const a of RULER_A) for (const b of RULER_B) for (const op of ['add', 'sub']) {
    const v = op === 'add' ? a + b : Math.abs(a - b);
    if (v <= 0 || v > 180 || single.has(v)) continue;
    if (!by.has(v)) by.set(v, []);
    by.get(v).push({ a, b, op });
  }
  return [...by.keys()].sort((x, y) => x - y).map(deg => ({ deg, how: by.get(deg) }));
}
export const rulerResult = (a, b, op) => (op === 'add' ? a + b : Math.abs(a - b));

// A4 の問題（数と選択肢）。type：read（分度器を読む）・cmp（どちらが大きい）・reflex（180°より大きい角）・ruler（三角定規）
// mistake：scale（内側と外側の読みちがい）・tick（となりの目もり）・side（辺の長さで決める）・reflex（小さいほうの角を答える）・ruler（組み合わせの取りちがい）
export function genAngle(level, i = 0, rand = Math.random) {
  if (level === 'easy') return pickR([30, 40, 50, 60, 70, 80, 100, 110, 120, 130, 140, 150], rand);
  if (level === 'normal') { let v = rnd(3, 34, rand) * 5; if (v === 90) v = 95; return v; }
  let v = rnd(11, 169, rand); if (v % 5 === 0) v += 2; return v;
}
export function readQ(level, i = 0, rand = Math.random) {
  const th = genAngle(level, i, rand);
  // ふつう・チャレンジでは、0の線を左の辺（外側の目もり）に合わせる問題を半分まぜる
  const side = level === 'easy' ? 'inner' : (i % 2 === 1 ? 'outer' : 'inner');
  const wrong = [{ html: `${180 - th}°`, mistake: 'scale' }, { html: `${th + 10}°`, mistake: 'tick' }, { html: `${th - 10}°`, mistake: 'tick' }];
  if (level === 'challenge') wrong.splice(1, 0, { html: `${th + 1}°`, mistake: 'tick' });
  return { th, side, choices: choices(`${th}°`, wrong.filter(w => parseInt(w.html, 10) > 0 && parseInt(w.html, 10) < 180), 3, rand), answer: `${th}°` };
}
// どちらの角が大きい？（辺の長さにまどわされる組を必ず入れる：大きい角の辺を短くする）
export function cmpQ(level, i = 0, rand = Math.random) {
  const gap = level === 'easy' ? rnd(25, 40, rand) : level === 'normal' ? rnd(10, 20, rand) : rnd(4, 8, rand);
  const small = rnd(30, 120, rand), big = small + gap;
  const bigFirst = rand() < 0.5;
  const trap = i % 3 !== 2;   // 3問のうち2問は、大きい角の辺が短い
  const A = { th: bigFirst ? big : small, len: 1 }, B = { th: bigFirst ? small : big, len: 1 };
  const bigOne = bigFirst ? A : B, smallOne = bigFirst ? B : A;
  bigOne.len = trap ? 0.5 : 1; smallOne.len = trap ? 1 : 0.6;
  return { A, B, ans: bigFirst ? 'A' : 'B', trap, choices: [
    { html: 'あ', ok: bigFirst, mistake: trap && !bigFirst ? 'side' : 'other' },
    { html: 'い', ok: !bigFirst, mistake: trap && bigFirst ? 'side' : 'other' },
    { html: 'おなじ', ok: false, mistake: 'other' }] };
}
// 180°より大きい角（360°から ひく ／ 180°に たす）
export function reflexQ(level, i = 0, rand = Math.random) {
  const th = level === 'easy' ? pickR([200, 210, 225, 240, 270, 300, 315, 330], rand) : level === 'normal' ? rnd(37, 70, rand) * 5 : rnd(185, 355, rand);
  const small = 360 - th;
  return { th, small, choices: choices(`${th}°`, [{ html: `${small}°`, mistake: 'reflex' }, { html: `${th - 180}°`, mistake: 'reflex' }, { html: `${th + 10}°`, mistake: 'tick' }].filter(w => parseInt(w.html, 10) > 0), 3, rand), answer: `${th}°` };
}
// 三角定規の組み合わせ（あわせる・かさねる）
export function rulerQ(level, i = 0, rand = Math.random) {
  const list = rulerAngles(), it = list[(i + Math.floor(rand() * list.length)) % list.length], how = pickR(it.how, rand);
  const wrong = [
    { html: `${how.op === 'add' ? Math.abs(how.a - how.b) : how.a + how.b}°`, mistake: 'ruler' },
    { html: `${it.deg + 15}°`, mistake: 'other' }, { html: `${Math.max(5, it.deg - 15)}°`, mistake: 'other' }];
  return { a: how.a, b: how.b, op: how.op, deg: it.deg, choices: choices(`${it.deg}°`, wrong.filter(w => parseInt(w.html, 10) !== it.deg), 3, rand), answer: `${it.deg}°` };
}
// 見当で角をつくる（ゆるす ずれ：やさしい 15°・ふつう 10°・チャレンジ 5°）
export const ANG_TOL = { easy: 15, normal: 10, challenge: 5 };
export function estAngleQ(level, i = 0, rand = Math.random) {
  const pool = level === 'easy' ? [30, 45, 60, 90, 120, 150, 180] : level === 'normal' ? [20, 40, 70, 100, 130, 160, 200, 270] : [15, 35, 75, 105, 135, 165, 210, 300];
  return { th: pool[(i * 3 + Math.floor(rand() * pool.length)) % pool.length], tol: ANG_TOL[level] };
}

/* ---------------- E5 円周と円周率 ---------------- */
export const circumference = d => r2(d * PI);
export const trueCirc = d => d * Math.PI;
// 内側の正 n 角形・外側の正 n 角形のまわりの長さ（直径 d）。n=6 の内側は 3d、n=4 の外側は 4d
export const polyIn = (n, d) => n * d * Math.sin(Math.PI / n);
export const polyOut = (n, d) => n * d * Math.tan(Math.PI / n);
// 転がして はかった円周（cm、1mm まで）。円周÷直径（小数第2位まで）
export const rolled = d_cm => r1(trueCirc(d_cm));
export const ratioOf = (c, d) => r2(c / d);
// いろいろな円（えんしゅう ずかん）。直径は cm。1えんだまは基準物（data/benchmarks.json）から読む。ほかは およその大きさ（下書き）
export const CIRCLES_DEF = [
  { id: 'coin', name: '1えんだま', bench: 'coin1' },
  { id: 'cup', name: 'コップの くち', d: 7 },
  { id: 'plate', name: 'まるい おさら', d: 20 },
  { id: 'clock', name: 'かべの とけい', d: 30 },
  { id: 'tire', name: 'じてんしゃの タイヤ', d: 60 },
  { id: 'ring', name: 'おおきな わ', d: 80 },
  { id: 'pond', name: 'まるい いけ', d: 1000 },
  { id: 'wheel', name: 'かんらんしゃ', d: 5000 },
];
// 円の一覧：直径（cm）・転がして はかった円周（cm、1mm まで）・円周÷直径（小数第2位）
export function circles(benchOf = () => null, def = CIRCLES_DEF) {
  return def.map(c => { const b = c.bench ? benchOf(c.bench) : null, d = b && b.len_mm ? b.len_mm / 10 : c.d, cc = rolled(d); return { id: c.id, name: c.name, d, c: cc, ratio: ratioOf(cc, d) }; });
}
// 長さ（cm）を画面の文に（100cm 以上は m）
export const cmTxt = v => (v >= 100 ? `${num(r2(v / 100))}m` : `${num(v)}cm`);
// E5 の問題。kind：c（直径→円周）・cr（半径→円周）・d（円周→直径）・times（何倍くらい）・half（半円のまわり）・wheel（車輪の進む道のり）
// mistake：radius（半径と直径の取りちがい）・inverse（かける・わるの取りちがい）・sense（直径の2倍・4倍と考える）・half（直径の分を足し忘れ）
export function circleQ(level, i = 0, rand = Math.random) {
  const kinds = level === 'easy' ? ['times', 'c', 'c', 'cr', 'c'] : level === 'normal' ? ['c', 'cr', 'd', 'times', 'wheel'] : ['d', 'half', 'cr', 'wheel', 'd'];
  const kind = kinds[i % kinds.length];
  const d = level === 'easy' ? pickR([2, 3, 4, 5, 10, 20], rand) : level === 'normal' ? pickR([6, 8, 12, 15, 30, 50], rand) : pickR([7, 9, 14, 16, 25, 40], rand);
  const c = circumference(d), u = 'cm';
  if (kind === 'times') return { kind, d, choices: choices('3ばいと すこし', [{ html: '2ばいと すこし', mistake: 'sense' }, { html: '4ばいと すこし', mistake: 'sense' }, { html: 'ちょうど 3ばい', mistake: 'sense' }], 3, rand), answer: '3ばいと すこし（3.14ばい）' };
  if (kind === 'c') return { kind, d, c, choices: choices(`${num(c)}${u}`, [{ html: `${num(circumference(d / 2))}${u}`, mistake: 'radius' }, { html: `${num(r2(d / PI))}${u}`, mistake: 'inverse' }, { html: `${num(d * 2)}${u}`, mistake: 'sense' }], 3, rand), answer: `${num(c)}${u}`, expr: `${d} × 3.14 ＝ ${num(c)}` };
  if (kind === 'cr') { const r = d / 2; return { kind, d, r, c, choices: choices(`${num(c)}${u}`, [{ html: `${num(circumference(r))}${u}`, mistake: 'radius' }, { html: `${num(r2(r * r * PI))}${u}`, mistake: 'other' }, { html: `${num(d * 4)}${u}`, mistake: 'sense' }], 3, rand), answer: `${num(c)}${u}`, expr: `${r} × 2 × 3.14 ＝ ${num(c)}` }; }
  if (kind === 'd') return { kind, d, c, choices: choices(`${d}${u}`, [{ html: `${num(r2(c * PI))}${u}`, mistake: 'inverse' }, { html: `${num(d / 2)}${u}`, mistake: 'radius' }, { html: `${num(r2(c / 3))}${u}`, mistake: 'other' }].filter(w => w.html !== `${d}${u}`), 3, rand), answer: `${d}${u}`, expr: `${num(c)} ÷ 3.14 ＝ ${d}` };
  if (kind === 'half') { const p = r2(c / 2 + d); return { kind, d, c, p, choices: choices(`${num(p)}${u}`, [{ html: `${num(r2(c / 2))}${u}`, mistake: 'half' }, { html: `${num(r2(c + d))}${u}`, mistake: 'other' }, { html: `${num(r2(circumference(d / 2) / 2 + d))}${u}`, mistake: 'radius' }], 3, rand), answer: `${num(p)}${u}`, expr: `${d} × 3.14 ÷ 2 ＋ ${d} ＝ ${num(p)}` }; }
  // wheel：直径 d cm の車輪が ひとまわり すると すすむ道のり
  const n = level === 'challenge' ? pickR([2, 3, 10], rand) : 1, w = r2(c * n);
  return { kind: 'wheel', d, c, n, choices: choices(`${num(w)}${u}`, [{ html: `${num(r2(d * n))}${u}`, mistake: 'sense' }, { html: `${num(r2(circumference(d / 2) * n))}${u}`, mistake: 'radius' }, { html: `${num(r2(w * 2))}${u}`, mistake: 'other' }], 3, rand), answer: `${num(w)}${u}`, expr: n > 1 ? `${d} × 3.14 × ${n} ＝ ${num(w)}` : `${d} × 3.14 ＝ ${num(w)}` };
}
// 円周の見当（テープをのばす）：ゆるす ずれ（相対）
export const CIRC_TOL = { easy: 0.15, normal: 0.1, challenge: 0.06 };

/* ---------------- S5 単位量あたりの大きさ・速さ ---------------- */
// 速さの単位：kmh（時速○km）・mpm（分速○m）・mps（秒速○m）。中では「分速（m）」にそろえて計算する
export const toMpm = (v, u) => (u === 'kmh' ? v * 1000 / 60 : u === 'mps' ? v * 60 : v);
export const fromMpm = (x, u) => (u === 'kmh' ? x * 60 / 1000 : u === 'mps' ? x / 60 : x);
export const convSpeed = (v, from, to) => fromMpm(toMpm(v, from), to);
export const SPD = { kmh: ['じそく', '時速', 'km'], mpm: ['ふんそく', '分速', 'm'], mps: ['びょうそく', '秒速', 'm'] };
// 画面の文（ルビつき）と読み上げの文
export const spdKid = (v, u) => `<ruby>${SPD[u][1]}<rt>${SPD[u][0]}</rt></ruby> ${num(v)}${SPD[u][2]}`;
export const spdTxt = (v, u) => `${SPD[u][1]} ${num(v)}${SPD[u][2]}`;
export const spdSp = (v, u) => `${SPD[u][1]}${num(v)}${SPD[u][2] === 'km' ? 'キロメートル' : 'メートル'}`;
// 走る物（はやさ ずかん）。値は およその速さ（下書き・要確認）。tools/hakaru-ahead.mjs が data/hakaru/ahead.json に凍結する
export const RACERS_DEF = [
  { id: 'aruku', name: 'あるく ひと', kmh: 4.8 },
  { id: 'hashiru', name: 'はしる こども', kmh: 14.4 },
  { id: 'jitensha', name: 'じてんしゃ', kmh: 18 },
  { id: 'uma', name: 'うま', kmh: 54 },
  { id: 'kuruma', name: 'じどうしゃ', kmh: 60 },
  { id: 'densha', name: 'でんしゃ', kmh: 72 },
  { id: 'cheetah', name: 'チーター', kmh: 108 },
  { id: 'hikouki', name: 'ひこうき', kmh: 900 },
];
export function racers(def = RACERS_DEF) {
  return def.map(r => { const mpm = toMpm(r.kmh, 'kmh'), mps = fromMpm(mpm, 'mps'); return { id: r.id, name: r.name, kmh: r.kmh, mpm: r1(mpm), mps: r1(mps), exact: Math.abs(mps - Math.round(mps)) < 1e-9 && Math.abs(mpm - Math.round(mpm)) < 1e-9 }; });
}
// こみぐあい：1まい あたりの人数・1人あたりの まい数
export const perMat = (people, mats) => r2(people / mats);
export const perPerson = (mats, people) => r2(mats / people);

// S5 の問題。kind：komi（どちらが こんでいる）・perm（1まい あたり）・spd（どちらが はやい）・calc（はやさを もとめる）・conv（時速・分速・秒速）・dist（道のり）・time（時間）
// mistake：total（人数だけ・道のりだけで決める）・inverse（わる向きの取りちがい）・conv（×60 と ÷60 の取りちがい）・unit（km と m の取りちがい）・slow（時間が長いほうを はやいとする）
export function komiQ(level, i = 0, rand = Math.random) {
  // 人数が多いほうが こんでいない組（total のわな）を まぜる
  const sets = level === 'easy'
    ? [[6, 9, 6, 7], [8, 10, 8, 12], [6, 8, 9, 8], [5, 10, 8, 10]]
    : level === 'normal' ? [[6, 9, 8, 10], [10, 15, 8, 14], [12, 18, 10, 14], [4, 7, 6, 9]] : [[6, 10, 9, 14], [15, 24, 12, 20], [8, 13, 10, 16], [16, 20, 12, 16]];
  const [ma, pa, mb, pb] = sets[(i + Math.floor(rand() * sets.length)) % sets.length];
  const ka = pa / ma, kb = pb / mb, aMore = ka > kb;
  const totalTrap = (pa > pb) !== aMore;
  return { ma, pa, mb, pb, ka: r2(ka), kb: r2(kb), ans: aMore ? 'A' : 'B', choices: [
    { html: 'あ', ok: aMore, mistake: !aMore && pa > pb ? 'total' : 'other' },
    { html: 'い', ok: !aMore, mistake: aMore && pb > pa ? 'total' : 'other' }], trap: totalTrap };
}
export function spdQ(level, i = 0, rand = Math.random) {
  // 道のりと時間（秒）。やさしい＝時間か道のりがそろう、ふつう・チャレンジ＝どちらも ちがう（1びょう あたりで くらべる）
  const kind = level === 'easy' ? (i % 2 ? 'sameD' : 'sameT') : (i % 3 === 0 ? (rand() < 0.5 ? 'sameD' : 'sameT') : 'diff');
  let A, B;
  if (kind === 'sameT') { const t = pickR([5, 8, 10], rand), va = pickR([4, 5, 6], rand), vb = va + pickR([-2, -1, 1, 2], rand); A = { d: va * t, t }; B = { d: vb * t, t }; }
  else if (kind === 'sameD') { const d = pickR([40, 60, 100], rand), ta = pickR([8, 10, 12, 20], rand), tb = ta + pickR([-4, -2, 2, 4], rand); A = { d, t: ta }; B = { d, t: tb }; }
  else { const pairs = [[60, 12, 40, 10], [100, 20, 54, 9], [90, 15, 56, 8], [120, 24, 63, 9], [75, 15, 48, 8]]; const [d1, t1, d2, t2] = pickR(pairs, rand); if (rand() < 0.5) { A = { d: d1, t: t1 }; B = { d: d2, t: t2 }; } else { A = { d: d2, t: t2 }; B = { d: d1, t: t1 }; } }
  const va = A.d / A.t, vb = B.d / B.t, aFast = va > vb;
  const misA = !aFast ? (A.d > B.d ? 'total' : A.t > B.t ? 'slow' : 'other') : 'other';
  const misB = aFast ? (B.d > A.d ? 'total' : B.t > A.t ? 'slow' : 'other') : 'other';
  return { kind, A, B, va: r2(va), vb: r2(vb), ans: aFast ? 'A' : 'B', choices: [{ html: 'あ', ok: aFast, mistake: misA }, { html: 'い', ok: !aFast, mistake: misB }] };
}
export function convQ(level, i = 0, rand = Math.random) {
  const pairs = level === 'easy' ? [['mps', 'mpm'], ['mpm', 'mps']] : level === 'normal' ? [['kmh', 'mpm'], ['mpm', 'kmh'], ['mps', 'mpm']] : [['kmh', 'mps'], ['mps', 'kmh'], ['kmh', 'mpm']];
  const [from, to] = pairs[i % pairs.length];
  // 秒速が整数にならない物（あるく ひと・じどうしゃ）は、時速と分速の行き来だけに使う
  const usesS = from === 'mps' || to === 'mps';
  const R = racers().filter(r => r.id !== 'hikouki' && (r.exact || (!usesS && Number.isInteger(r.mpm))) && (level !== 'easy' || ['jitensha', 'densha', 'cheetah', 'uma', 'hashiru'].includes(r.id)));
  const r = pickR(R, rand);
  const v = { kmh: r.kmh, mpm: r.mpm, mps: r.mps }, right = v[to], x = v[from];
  // まちがい：×60 と ÷60 の取りちがい（conv）、km と m の取りちがい（unit）
  const W = {
    'mps>mpm': [[x / 60, 'conv']], 'mpm>mps': [[x * 60, 'conv']],
    'kmh>mpm': [[x * 1000 * 60, 'conv'], [x / 60, 'unit']], 'mpm>kmh': [[x * 60, 'unit'], [x / 60, 'conv']],
    'kmh>mps': [[x * 1000 / 60, 'conv'], [x / 3600, 'unit']], 'mps>kmh': [[x * 60, 'conv'], [x * 3600, 'unit']],
  }[from + '>' + to];
  const wrongs = W.filter(([w]) => r1(w) > 0).map(([w, m]) => ({ html: spdTxt(r1(w), to), mistake: m }));
  wrongs.push({ html: spdTxt(r1(right * 2), to), mistake: 'other' }, { html: spdTxt(r1(right * 10), to), mistake: 'other' });
  const big = to === 'mpm' && from === 'mps' || to === 'kmh' ? 'mul' : 'div';
  return { r, from, to, v: v[from], right, big, choices: choices(spdTxt(right, to), wrongs.filter(w => w.html !== spdTxt(right, to)), 3, rand), answer: spdTxt(right, to) };
}
// 道のり＝はやさ×時間・時間＝道のり÷はやさ・はやさ＝道のり÷時間（チャレンジ）
export function calcQ(level, i = 0, rand = Math.random) {
  const kinds = level === 'easy' ? ['spd', 'spd', 'dist'] : level === 'normal' ? ['spd', 'dist', 'time'] : ['dist', 'time', 'spd', 'time'];
  const kind = kinds[i % kinds.length];
  if (kind === 'spd') { const t = pickR([4, 5, 8, 10, 20], rand), v = pickR([3, 4, 5, 6, 15, 20], rand), d = v * t; return { kind, d, t, v, choices: choices(`秒速 ${v}m`, [{ html: `秒速 ${d * t}m`, mistake: 'inverse' }, { html: `秒速 ${d}m`, mistake: 'total' }, { html: `秒速 ${v + 2}m`, mistake: 'other' }], 3, rand), answer: `秒速 ${v}m`, expr: `${d} ÷ ${t} ＝ ${v}` }; }
  if (kind === 'dist') { const v = pickR([40, 50, 60, 80], rand), t = pickR([3, 5, 10, 15], rand), d = v * t; return { kind, d, t, v, choices: choices(`${d}m`, [{ html: `${num(r2(v / t))}m`, mistake: 'inverse' }, { html: `${v + t}m`, mistake: 'other' }, { html: `${d * 60}m`, mistake: 'conv' }], 3, rand), answer: `${d}m`, expr: `${v} × ${t} ＝ ${d}` }; }
  const v = pickR([60, 80, 200, 300], rand), t = pickR([5, 6, 10, 12], rand), d = v * t;
  return { kind: 'time', d, t, v, choices: choices(`${t}ふん`, [{ html: `${d * v}ふん`, mistake: 'inverse' }, { html: `${t * 60}ふん`, mistake: 'conv' }, { html: `${t + 5}ふん`, mistake: 'other' }], 3, rand), answer: `${t}ふん`, expr: `${d} ÷ ${v} ＝ ${t}` };
}

/* ---------------- EJ おうぎ形の弧の長さと面積 ---------------- */
// π を文字のまま：弧＝2πr×a/360 → π の係数 r·a/180、面積＝πr²×a/360 → 係数 r²·a/360
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export function frac(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
export const arcK = (r, a) => frac(r * a, 180);
export const areaK = (r, a) => frac(r * r * a, 360);
export const piTxt = ([n, d]) => (n === 0 ? '0' : d === 1 ? `${n === 1 ? '' : n}π` : `${n}/${d}π`);
export const arcLen = (r, a) => 2 * Math.PI * r * a / 360;
export const sectorArea = (r, a) => Math.PI * r * r * a / 360;
// 円錐の展開図：母線 L、底面の半径 rb → おうぎ形の中心角
export const coneAngle = (L, rb) => 360 * rb / L;
export function cones(L = 12) { const o = []; for (let rb = 1; rb < L; rb++) { const a = coneAngle(L, rb); if (Number.isInteger(a)) o.push({ id: 'r' + rb, L, rb, deg: a }); } return o; }
// EJ の問題。kind：arc（弧の長さ）・area（面積）・deg（中心角を求める）・ratio（比例）
// mistake：ratio（a/360 をかけ忘れ）・radius（直径を使う）・arcarea（弧と面積の式の取りちがい）
const OK_A = [30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300];
export function sectorQ(level, i = 0, rand = Math.random) {
  const kinds = level === 'easy' ? ['ratio', 'arc', 'arc', 'area', 'ratio'] : level === 'normal' ? ['arc', 'area', 'arc', 'area', 'ratio'] : ['deg', 'area', 'arc', 'deg', 'area'];
  const kind = kinds[i % kinds.length];
  let r, a;
  for (let k = 0; k < 200; k++) {
    r = level === 'easy' ? pickR([2, 3, 4, 6], rand) : rnd(2, 12, rand);
    a = level === 'easy' ? pickR([90, 180, 60, 120], rand) : pickR(OK_A, rand);
    if (arcK(r, a)[1] === 1 && areaK(r, a)[1] === 1) break;
  }
  const A = arcK(r, a), S = areaK(r, a);
  if (kind === 'ratio') {
    const part = frac(a, 360), f = x => `${x[0]}/${x[1]}`;
    const w = [{ html: f(frac(a, 180)), mistake: 'ratio' }, { html: f(frac(360 - a, 360)), mistake: 'other' }, { html: f(frac(a, 720)), mistake: 'ratio' }, { html: '1/3', mistake: 'other' }];
    return { kind, r, a, choices: choices(f(part), w.filter(x => x.html !== f(part) && !/\/1$/.test(x.html) && !/^0\//.test(x.html)), 3, rand), answer: f(part) };
  }
  if (kind === 'arc') return { kind, r, a, choices: choices(`${piTxt(A)}cm`, [{ html: `${piTxt(frac(2 * r, 1))}cm`, mistake: 'ratio' }, { html: `${piTxt(arcK(2 * r, a))}cm`, mistake: 'radius' }, { html: `${piTxt(S)}cm`, mistake: 'arcarea' }].filter(w => w.html !== `${piTxt(A)}cm`), 3, rand), answer: `${piTxt(A)}cm`, expr: `2π × ${r} × ${a}/360 ＝ ${piTxt(A)}` };
  if (kind === 'area') return { kind, r, a, choices: choices(`${piTxt(S)}cm²`, [{ html: `${piTxt(frac(r * r, 1))}cm²`, mistake: 'ratio' }, { html: `${piTxt(areaK(2 * r, a))}cm²`, mistake: 'radius' }, { html: `${piTxt(A)}cm²`, mistake: 'arcarea' }].filter(w => w.html !== `${piTxt(S)}cm²`), 3, rand), answer: `${piTxt(S)}cm²`, expr: `π × ${r}² × ${a}/360 ＝ ${piTxt(S)}` };
  // deg：半径と弧の長さから中心角
  return { kind: 'deg', r, a, arc: A, choices: choices(`${a}°`, [{ html: `${Math.round(a / 2)}°`, mistake: 'radius' }, { html: `${a * 2 <= 360 ? a * 2 : a - 30}°`, mistake: a * 2 <= 360 ? 'radius' : 'other' }, { html: `${A[0]}°`, mistake: 'ratio' }].filter(w => w.html !== `${a}°`), 3, rand), answer: `${a}°`, expr: `${piTxt(A)} ÷ (2π × ${r}) × 360 ＝ ${a}` };
}
export { shuffleR };
