// ながさ（N1・N2・N2m・N3）の計算と問題づくり。DOM に触らない（単体テストと tools/hakaru-nagasa.mjs が使う）。
// ・ものさしの目もりの位置（実寸：1mm あたりの px＝ppm）・からだものさしの長さ
// ・N3 の地図（区間の長さ m を持つ道のグラフ）と「1km さんぽ」の道の数え上げ
// ・N2m の「1m を つくる」（基準物の長さの組で ちょうど 100cm）の数え上げ
// ・問題の選択肢（誤答に つまずきの型 L1〜L7・thick・choose・route を入れる）
import { rnd, pickR, shuffleR, choices } from './_gen.js';
import { fmtLen } from '../core/yomi.js';

export { rnd, pickR, shuffleR, choices };
// 長さの表し方（画面の文）：mm → 「3cm 5mm」（m を使わない）・「1m 20cm」・m → 「1km 30m」
export const cmmm = mm => fmtLen(mm, { m: false });
export const mcm = mm => fmtLen(mm);
export const kmm = m => { const k = Math.floor(m / 1000), r = m % 1000; return k ? `${k}km` + (r ? ` ${r}m` : '') : `${r}m`; };

/* ---------- ものさし（実寸） ---------- */
// ものさしの左はしから 0 の目もりまでの余白（mm）。目もり i（mm）の位置は x0 + (PAD + i) × ppm
export const RULER_PAD = 4;
export const tickX = (x0, ppm, i, pad = RULER_PAD) => x0 + (pad + i) * ppm;
// 目もりの一覧（i＝0 から cm×10 まで、1mm ごと）。kind：cm（1cm ごと）・half（5mm）・mm
export function rulerTicks(x0, ppm, cm, { pad = RULER_PAD, from = 0 } = {}) {
  const out = [];
  for (let i = from * 10; i <= cm * 10; i++) out.push({ i, x: tickX(x0, ppm, i, pad), kind: i % 10 === 0 ? 'cm' : i % 5 === 0 ? 'half' : 'mm' });
  return out;
}
// ものさしの幅（px）：目もり cm と、両はしの余白
export const rulerW = (cm, ppm, pad = RULER_PAD) => (cm * 10 + pad * 2) * ppm;
// 画面の幅に入る cm の数（両わきに margin px をあける）
export const rulerFit = (W, ppm, margin = 16, max = 30, min = 3) => Math.max(min, Math.min(max, Math.floor(((W - margin * 2) / ppm - RULER_PAD * 2) / 10)));
// 画面上の x（px）を、0 の目もりからの mm に（1mm に丸める）
export const mmAt = (x, zeroX, ppm) => Math.round((x - zeroX) / ppm);

/* ---------- からだものさし ---------- */
// 2つの点（px）のあいだの長さ（mm に丸める）
export const bodyMM = (a, b, ppm) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) / ppm);

/* ---------- N3 の地図（m）。x・y は北が上の m。区間の長さは まっすぐの長さ（きょり）より長い ---------- */
export const NODES = [
  { id: 'H', name: 'いえ', sp: '家', icon: 'house', x: 45, y: 234 },
  { id: 'M', name: 'おみせ', sp: 'お店', icon: 'shop', x: 59, y: 81 },
  { id: 'P', name: 'こうえん', sp: '公園', icon: 'park', x: 180, y: 194 },
  { id: 'L', name: 'としょかん', sp: '図書館', icon: 'book', x: 212, y: 59 },
  { id: 'S', name: 'がっこう', sp: '学校', icon: 'school', x: 342, y: 72 },
  { id: 'E', name: 'えき', sp: '駅', icon: 'station', x: 419, y: 234 },
  { id: 'J', name: 'じんじゃ', sp: '神社', icon: 'shrine', x: 297, y: 288 },
  { id: 'Y', name: 'ゆうびんきょく', sp: '郵便局', icon: 'post', x: 149, y: 324 },
  { id: 'Q', name: 'プール', sp: 'プール', icon: 'pool', x: 441, y: 81 },
];
export const EDGES = [
  ['H', 'M', 200], ['H', 'P', 200], ['H', 'Y', 150], ['M', 'L', 200], ['M', 'P', 200], ['P', 'L', 150], ['P', 'J', 200],
  ['Y', 'J', 200], ['L', 'S', 150], ['S', 'Q', 150], ['Q', 'E', 200], ['J', 'E', 150], ['P', 'S', 250], ['S', 'E', 200],
].map(([a, b, len], i) => ({ i, a, b, len }));
export const START = 'H';
export const nodeOf = id => NODES.find(n => n.id === id);
export const edgeOf = (a, b) => EDGES.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)) || null;
export const otherEnd = (e, n) => (e.a === n ? e.b : e.b === n ? e.a : null);
export const neighbors = n => EDGES.filter(e => e.a === n || e.b === n).map(e => otherEnd(e, n));
// まっすぐの長さ（m）。10m に丸める（画面では「やく」）
export const straight = (a, b) => { const p = nodeOf(a), q = nodeOf(b); return Math.round(Math.hypot(p.x - q.x, p.y - q.y) / 10) * 10; };
// 地点の列 → 区間の番号の列（となりでなければ null）
export function edgesOfPath(nodes) {
  const out = [];
  for (let k = 1; k < nodes.length; k++) { const e = edgeOf(nodes[k - 1], nodes[k]); if (!e) return null; out.push(e.i); }
  return out;
}
export const pathLen = nodes => { const es = edgesOfPath(nodes); return es ? es.reduce((s, i) => s + EDGES[i].len, 0) : NaN; };
// 同じ区間を2回 通っていないか
export const noRepeat = es => new Set(es).size === es.length;
// 道の見分け（START から。区間の番号の列）。START に もどる道（ひとまわり）は、向きが逆でも同じ道とみる
export function routeKey(es, start = START) {
  let n = start; for (const i of es) n = otherEnd(EDGES[i], n);
  const key = es.join('-');
  if (n === start && es.length) { const rev = es.slice().reverse().join('-'); return rev < key ? rev : key; }
  return key;
}
export function keyNodes(key, start = START) { const out = [start]; let n = start; for (const i of String(key).split('-').map(Number)) { n = otherEnd(EDGES[i], n); out.push(n); } return out; }
// 1km さんぽ：START から、同じ区間を2回 通らずに、ちょうど total m になる道を すべて（見分けは routeKey）
export function walks(total = 1000, start = START) {
  const res = new Set();
  (function rec(node, used, sum, seq) {
    if (sum === total) { res.add(routeKey(seq, start)); return; }
    for (const e of EDGES) {
      if (used.has(e.i)) continue;
      const nx = otherEnd(e, node); if (!nx || sum + e.len > total) continue;
      used.add(e.i); rec(nx, used, sum + e.len, [...seq, e.i]); used.delete(e.i);
    }
  })(start, new Set(), 0, []);
  return [...res].sort((a, b) => a.split('-').length - b.split('-').length || (a < b ? -1 : a > b ? 1 : 0));
}

/* ---------- N2m「1m を つくる」：基準物の長さで ちょうど 1000mm。8種・同じ物は3つまで ---------- */
export const ONEM_IDS = ['desk', 'ruler30', 'notebook', 'tissue', 'pencil', 'hagaki-w', 'eraser', 'clip'];
export const ONEM_MAX = 3;
// lenOf(id) → mm。並び ONEM_IDS の順に「id*こ」を + でつなぐ（例 "ruler30*3+hagaki-w*1"）
export function onemKey(cnt) { return ONEM_IDS.filter(id => cnt[id]).map(id => `${id}*${cnt[id]}`).join('+'); }
export function parseOnem(key) { const o = {}; for (const p of String(key).split('+')) { const [id, n] = p.split('*'); if (id) o[id] = +n; } return o; }
export function onemSum(cnt, lenOf) { return Object.entries(cnt).reduce((s, [id, n]) => s + lenOf(id) * n, 0); }
export function onemCombos(lenOf, total = 1000, ids = ONEM_IDS, max = ONEM_MAX) {
  const out = [];
  (function rec(k, sum, cnt) {
    if (sum === total) { out.push(onemKey(cnt)); return; }
    if (k >= ids.length) return;
    const L = lenOf(ids[k]);
    for (let c = 0; c <= max; c++) { const s = sum + c * L; if (s > total) break; const nc = Object.assign({}, cnt); if (c) nc[ids[k]] = c; rec(k + 1, s, nc); }
  })(0, 0, {});
  return out;
}

/* ---------- 問題の選択肢 ---------- */
// 目もりを読む（N2）：テープの長さ L（mm）、左はしの位置 off（mm。0 でなければ L1 のわな）
export function readQ(level, cm, rand = Math.random) {
  const maxMm = (cm - 1) * 10;
  let off = 0, L;
  if (level === 'easy') L = rnd(2, Math.max(3, Math.min(9, cm - 2)), rand) * 10;
  else if (level === 'normal') { if (rand() < 0.5) L = rnd(2, Math.max(2, Math.min(8, cm - 3)), rand) * 10 + rnd(1, 9, rand); else { off = rnd(1, 2, rand) * 10; L = rnd(2, Math.max(2, Math.min(7, cm - 4)), rand) * 10; } }
  else { off = rnd(1, 2, rand) * 10 + (rand() < 0.3 ? 5 : 0); L = rnd(1, Math.max(1, Math.min(6, cm - 5)), rand) * 10 + rnd(1, 9, rand); }
  L = Math.max(5, Math.min(L, maxMm - off));
  const w = [];
  if (off) w.push({ html: cmmm(off + L), mistake: 'L1' });                    // 右はしの目もりを そのまま読む
  else w.push({ html: cmmm(L + 10), mistake: 'L1' });                         // はしを 1 から数える
  if (L % 10) w.push({ html: cmmm(Math.floor(L / 10) * 10 + (10 - L % 10)), mistake: 'mm' });   // mm の数え違い
  w.push({ html: cmmm(L + (L % 10 ? 1 : 5)), mistake: 'other' }, { html: cmmm(Math.max(5, L - 10)), mistake: 'other' });
  return { L, off, choices: choices(cmmm(L), w, 3, rand) };
}
// どちらが ながい（N2・L4）：数字だけで比べると まちがえる組（2cm と 9mm など）
export function cmpQ(level, rand = Math.random) {
  const E = [[20, 9], [30, 18], [15, 8], [40, 25], [10, 7]];
  const N = [[35, 28], [50, 45], [62, 58], [44, 39], [70, 65]];
  const C = [[56, 60], [48, 50], [71, 68], [80, 79], [93, 90]];
  const [a, b] = pickR(level === 'easy' ? E : level === 'normal' ? N : C, rand);
  // 見せ方：easy は「2cm」と「9mm」。normal は「3cm 5mm」と「28mm」。challenge は「5cm 6mm」と「60mm」
  const show = (mm, asMm) => (asMm ? `${mm}mm` : cmmm(mm));
  const aMm = level === 'challenge' ? rand() < 0.5 : false;
  return { a, b, aTxt: show(a, aMm), bTxt: show(b, !aMm) };
}
// 長さの けいさん（N2）：単位をそろえる。誤答 L4 は cm と mm を まぜて たす・ひく
export function calcQ(level, rand = Math.random) {
  let a, b, op;
  if (level === 'easy') { a = rnd(2, 6, rand) * 10 + rnd(1, 8, rand); b = rnd(1, 3, rand) * 10; op = '+'; }
  else if (level === 'normal') { op = rand() < 0.5 ? '+' : '-'; a = rnd(3, 7, rand) * 10 + rnd(1, 8, rand); b = op === '+' ? rnd(1, 2, rand) * 10 + rnd(1, 9 - (a % 10), rand) : rnd(1, 2, rand) * 10 + rnd(1, Math.max(1, a % 10), rand); }
  else { op = rand() < 0.5 ? '+' : '-'; a = rnd(3, 7, rand) * 10 + rnd(1, 8, rand); if (op === '+') b = rnd(1, 2, rand) * 10 + rnd(10 - (a % 10), 9, rand); else { a = rnd(4, 7, rand) * 10; b = rnd(1, 2, rand) * 10 + rnd(1, 9, rand); } }
  if (op === '-' && b >= a) b = Math.max(1, a - 15);
  const ans = op === '+' ? a + b : a - b;
  const bTxt = cmmm(b);
  const w = [];
  if (op === '+') { if ((a % 10) + (b % 10) >= 10) w.push({ html: `${Math.floor(a / 10) + Math.floor(b / 10)}cm ${(a % 10) + (b % 10)}mm`, mistake: 'L4' }); w.push({ html: cmmm(a + Math.floor(b / 10) + (b % 10)), mistake: 'L4' }); }
  else { const c = Math.floor(a / 10) - Math.floor(b / 10), m = Math.abs((a % 10) - (b % 10)); if ((a % 10) < (b % 10)) w.push({ html: m ? `${c}cm ${m}mm` : `${c}cm`, mistake: 'L4' }); w.push({ html: cmmm(Math.max(1, a - Math.floor(b / 10) - (b % 10))), mistake: 'L4' }); }
  w.push({ html: cmmm(ans + 10), mistake: 'other' }, { html: cmmm(Math.max(1, ans - 10)), mistake: 'other' }, { html: cmmm(ans + 1), mistake: 'other' });
  return { a, b, op, ans, aTxt: cmmm(a), bTxt, choices: choices(cmmm(ans), w, 3, rand) };
}
// m と cm（N2m・L5）：1m＝100cm
export function mconvQ(level, rand = Math.random) {
  const toCm = rand() < 0.5;
  const m = rnd(1, level === 'easy' ? 3 : 4, rand);
  const c = level === 'easy' ? rnd(1, 9, rand) * 10 : level === 'normal' ? rnd(1, 9, rand) * 10 + (rand() < 0.4 ? rnd(1, 9, rand) : 0) : rnd(1, 9, rand) * (rand() < 0.5 ? 1 : 10);
  const total = m * 100 + c, mc = `${m}m ${c}cm`;
  if (toCm) return { total, toCm, say: `${mc} は なんcm？`, sp: `${m}メートル${c}センチメートルは、何センチメートル？`, answer: `${total}cm`,
    choices: choices(`${total}cm`, [{ html: `${m * 10 + c}cm`, mistake: 'L5' }, { html: `${m + c}cm`, mistake: 'L5' }, { html: `${total + 100}cm`, mistake: 'other' }], 3, rand) };
  const w = [{ html: c % 10 === 0 ? `${total / 10}m` : `${Math.floor(total / 10)}m ${total % 10}cm`, mistake: 'L5' }, { html: `${total}m`, mistake: 'L5' }, { html: `${m + 1}m ${c}cm`, mistake: 'other' }];
  return { total, toCm, say: `${total}cm は なんm なんcm？`, sp: `${total}センチメートルは、何メートル何センチメートル？`, answer: mc, choices: choices(mc, w, 3, rand) };
}
// m・cm の けいさん（N2m・L5）：くり上がり・くり下がりで 100cm＝1m
export function mcalcQ(level, rand = Math.random) {
  let a, b, op = level === 'easy' ? '+' : rand() < 0.5 ? '+' : '-';
  if (level === 'easy') { a = 100 + rnd(1, 4, rand) * 10; b = rnd(1, 5, rand) * 10; }
  else if (op === '+') { a = rnd(1, 2, rand) * 100 + rnd(5, 9, rand) * 10; b = rnd(2, 6, rand) * 10; if (level === 'normal' && (a % 100) + b < 100) b = 100 - (a % 100) + rnd(1, 3, rand) * 10; }
  else { a = rnd(2, 3, rand) * 100 + rnd(1, 4, rand) * 10; b = rnd(5, 9, rand) * 10; if (level === 'challenge') a = rnd(2, 3, rand) * 100; }
  const ans = op === '+' ? a + b : a - b, f = v => mcm(v * 10);
  const w = [];
  if (op === '+') { if ((a % 100) + b >= 100) w.push({ html: `${Math.floor(a / 100)}m ${(a % 100) + b}cm`, mistake: 'L5' }); w.push({ html: `${Math.floor(a / 100) + Math.floor(b / 10)}m ${a % 100}cm`, mistake: 'L5' }); }
  else { w.push({ html: mcm((Math.floor(a / 100) * 100 + Math.abs((a % 100) - b)) * 10), mistake: 'L5' }); w.push({ html: mcm(Math.max(10, a - Math.floor(b / 10)) * 10), mistake: 'L5' }); }
  w.push({ html: f(ans + 100), mistake: 'other' }, { html: f(Math.max(10, ans - 10)), mistake: 'other' }, { html: f(ans + 10), mistake: 'other' });
  return { a, b, op, ans, aTxt: f(a), bTxt: f(b), answer: f(ans), choices: choices(f(ans), w.filter(x => x.html !== f(ans)), 3, rand) };
}
// km と m（N3・L5）：1km＝1000m。1km 30m − 50m のような ひき算も
export function kconvQ(level, rand = Math.random) {
  const k = rnd(1, 3, rand);
  const r = level === 'easy' ? rnd(1, 9, rand) * 100 : level === 'normal' ? rnd(1, 9, rand) * 10 + (rand() < 0.5 ? rnd(1, 9, rand) * 100 : 0) : rnd(1, 8, rand) * 10;
  const total = k * 1000 + r, kind = level === 'challenge' ? pickR(['sub', 'sub', 'toM', 'toKm'], rand) : rand() < 0.5 ? 'toM' : 'toKm';
  if (kind === 'sub') {
    const b = rnd(r / 10 + 1, 9, rand) * 10, ans = total - b;
    return { kind, total, b, ans, answer: kmm(ans), say: `${kmm(total)} − ${b}m は？`, sp: `${k}キロメートル${r}メートル、ひく、${b}メートルは？`,
      choices: choices(kmm(ans), [{ html: `${k}km ${b - r}m`, mistake: 'L5' }, { html: kmm((k - 1) * 1000 + b - r), mistake: 'L5' }, { html: kmm(ans + 100), mistake: 'other' }], 3, rand) };
  }
  if (kind === 'toM') return { kind, total, ans: total, answer: `${total}m`, say: `${kmm(total)} は なんm？`, sp: `${k}キロメートル${r}メートルは、何メートル？`,
    choices: choices(`${total}m`, [{ html: `${k * 100 + r}m`, mistake: 'L5' }, { html: `${k}${r}m`, mistake: 'L5' }, { html: `${total + 1000}m`, mistake: 'other' }], 3, rand) };
  return { kind, total, ans: total, answer: kmm(total), say: `${total}m は なんkm なんm？`, sp: `${total}メートルは、何キロメートル何メートル？`,
    choices: choices(kmm(total), [{ html: r % 100 === 0 ? `${total / 100}km` : `${k * 10 + Math.floor(r / 100)}km ${r % 100}m`, mistake: 'L5' }, { html: `${total}km`, mistake: 'L5' }, { html: kmm(total + 1000), mistake: 'other' }], 3, rand) };
}
// 単位えらび（N2m・choose）：基準物の長さに合う単位。lenOf(id) → mm
export const CHOOSE = [
  { id: 'classroom', unit: 'm', q: 'きょうしつの よこの ながさ' }, { id: 'desk', unit: 'cm', q: 'つくえの よこの ながさ' },
  { id: 'pencil', unit: 'cm', q: 'えんぴつの ながさ' }, { id: 'door', unit: 'm', q: 'とびらの たかさ' },
  { id: 'clip', unit: 'cm', q: 'クリップの ながさ' }, { id: 'pool', unit: 'm', q: 'プールの ながさ' },
  { id: 'notebook', unit: 'cm', q: 'ノートの たての ながさ' }, { id: 'ruler1m', unit: 'm', q: '1mものさしの ながさ' },
];
export function chooseQ(i, lenOf, rand = Math.random) {
  const it = CHOOSE[i % CHOOSE.length], mm = lenOf(it.id);
  const v = it.unit === 'm' ? Math.round(mm / 1000) : Math.round(mm / 10);
  const units = ['m', 'cm', 'mm'];
  return { it, v, mm, choices: shuffleR(units.map(u => ({ html: `${v}${u}`, ok: u === it.unit, mistake: u === it.unit ? null : 'choose' })), rand) };
}
// 道具えらび（N3・L6 曲がった物・L7 道具の 0 の位置）
export const TOOLS = [
  { q: 'きの みきの まわりを はかる', sp: '木のみきのまわりをはかる', a: 'maki', w: { ruler30: 'L6', ruler1m: 'L6' }, scene: 'tree' },
  { q: 'ボールの まわりを はかる', sp: 'ボールのまわりをはかる', a: 'maki', w: { ruler30: 'L6', ruler1m: 'L6' }, scene: 'ball' },
  { q: 'プールの たての ながさを はかる', sp: 'プールのたての長さをはかる', a: 'maki', w: { ruler30: 'choose', ruler1m: 'choose' }, scene: 'pool' },
  { q: 'ノートの よこの ながさを はかる', sp: 'ノートの横の長さをはかる', a: 'ruler30', w: { maki: 'choose', ruler1m: 'choose' }, scene: 'note' },
  { q: 'きょうしつの とびらの はばを はかる', sp: '教室のとびらの幅をはかる', a: 'ruler1m', w: { ruler30: 'choose', maki: 'other' }, scene: 'door', alt: ['maki'] },
  { q: 'あたまの まわりを はかる', sp: '頭のまわりをはかる', a: 'maki', w: { ruler30: 'L6', ruler1m: 'L6' }, scene: 'head' },
];
export const TOOL_NAME = { maki: 'まきじゃく', ruler30: '30cmものさし', ruler1m: '1mものさし' };
// まきじゃくの 0 の位置（L7）：先の かなぐの はしが 0。わっかの まんなか・1 の目もりは まちがい
export const ZERO_Q = [{ html: 'かなぐの はし', ok: true }, { html: 'かなぐの わっかの まんなか', mistake: 'L7' }, { html: '1の めもり', mistake: 'L7' }];

/* ---------- N1「いくつぶん」：任意単位の長さ（mm）。基準物にない物（ブロック・ゆび）は絵の大きさ ---------- */
export const UNIT_FIXED = { block: 40, finger: 16 };
export const UNAME = { clip: 'クリップ', eraser: 'けしごむ', block: 'ブロック', pencil: 'えんぴつ', finger: 'ゆび' };
export const unitLen = (u, lenOf) => UNIT_FIXED[u] ?? lenOf(u);
// 「6こと すこし」（はみ出しが 1こ の 12% より大きければ「すこし」）
export function countText(len, ul) { const q = len / ul, n = Math.floor(q + 1e-6), r = q - n; return r > 0.12 ? `${n}こと すこし` : `${Math.round(q)}こ`; }
export const UNIT_OBJS = ['notebook', 'tissue', 'hagaki', 'card', 'ruler30', 'desk'];
export const MY_UNITS = ['block', 'pencil', 'finger'];

/* ---------- ずかんの物（N2 はかった物・N2m 長い物） ---------- */
export const MONO_IDS = ['coin1', 'clip', 'eraser', 'card', 'hagaki-w', 'hagaki', 'pencil'];
export const LONG_IDS = ['desk', 'blackboard', 'door', 'classroom'];
