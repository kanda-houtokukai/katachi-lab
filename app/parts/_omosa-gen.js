// 重さの「ためす」の問題づくり（O3・U3）。DOM に触らない（単体テストで確かめる）。
// 誤答には つまずきの型を入れる：W1（大きさと重さ）・W2（形を変えると重さが変わる）・W3（はかりの目もり・秤量）・W4（量感）・W5（単位を別々に覚えている）。
import { choices, rnd, pickR } from './_gen.js';
import { CAPS, CAP_LIST, gText } from './_omosa.js';

// 目もりを よむ：やさしい＝1kg・50g きざみ、ふつう＝1kg・5g きざみ（50の倍数でない）、チャレンジ＝2kg・4kg（100の倍数でない）
export function genReadG(level, rand = Math.random) {
  const cap = level === 'challenge' ? pickR([2000, 4000], rand) : 1000, mi = CAPS[cap].minor;
  let m;
  if (level === 'easy') m = rnd(1, 19, rand) * 50;
  else if (level === 'normal') { do m = rnd(10, 190, rand) * 5; while (m % 50 === 0); }
  else { do m = rnd(Math.ceil(300 / mi), Math.floor((cap - 100) / mi), rand) * mi; while (m % 100 === 0); }
  return { cap, m, choices: readChoicesG(m, cap, rand) };
}
export function readChoicesG(m, cap, rand = Math.random) {
  const c = CAPS[cap], base = Math.floor(m / c.label) * c.label, n = Math.round((m - base) / c.minor), w = [];
  // 1目もりを ちがう 大きさだと 思う（1kg の はかりで 1目もり 10g・2kg で 5g など）
  const other = c.minor === 5 ? 10 : c.minor === 10 ? 5 : 10;
  if (n) w.push({ html: gText(base + n * other), mistake: 'W3' });
  w.push({ html: gText(m + c.minor), mistake: 'W3' }, { html: gText(m - c.minor), mistake: 'W3' });
  if (m >= 1000) w.push({ html: `${m}kg`, mistake: 'W5' });
  w.push({ html: gText(m + c.label), mistake: 'other' });
  return choices(gText(m), w.filter(x => !x.html.startsWith('-')), 3, rand);
}
// はかり えらび：いちばん 小さい はかりで はかる（重すぎると 振り切れる）
export function genChooseCap(g) {
  const right = CAP_LIST.find(c => c >= g) || 4000;
  return { g, right, choices: CAP_LIST.map(c => ({ html: `${c / 1000}kgの はかり`, cap: c, ok: c === right, mistake: c < g ? 'W3' : 'other' })) };
}
// たんい えらび（g・kg・t）：物の 重さ（g）から ふさわしい 単位で「やく ○○」
export function unitOfG(g) { if (g >= 1e6) return { n: Math.round(g / 1e6), u: 't' }; if (g >= 1000) return { n: Math.round(g / 1000), u: 'kg' }; return { n: g, u: 'g' }; }
export function genUnitG(g, rand = Math.random) {
  const { n, u } = unitOfG(g);
  return { n, u, choices: choices(`${n}${u}`, ['g', 'kg', 't'].filter(x => x !== u).map(x => ({ html: `${n}${x}`, mistake: 'W4' })), 3, rand) };
}
// 1kg に いちばん ちかいのは（量感 W4）：物の 重さの 一覧 [{ id, g }] から
export function genNear1kg(items, rand = Math.random) {
  const sorted = items.slice().sort((a, b) => Math.abs(a.g - 1000) - Math.abs(b.g - 1000));
  const right = sorted[0], far = sorted.slice(1).filter(x => Math.abs(x.g - 1000) > 300);
  const wrong = []; while (wrong.length < 2 && far.length) wrong.push(far.splice(Math.floor(rand() * far.length), 1)[0]);
  return { right, wrong, all: [right, ...wrong] };
}
// かんさん（W5）
export function genConvert(level, i = 0, rand = Math.random) {
  const kinds = level === 'easy' ? ['kg2g1', 'g2kg1'] : level === 'normal' ? ['kg2g', 'g2kg', 't2kg'] : ['kg2g0', 'g2kg', 'kg2g', 't2kg', 'add'];
  const k = kinds[i % kinds.length];
  if (k === 'kg2g1') { const a = rnd(1, 5, rand); return { k, q: `${a}kgは なんg？`, right: `${a * 1000}g`, g: a * 1000, choices: choices(`${a * 1000}g`, [{ html: `${a * 100}g`, mistake: 'W5' }, { html: `${a * 10}g`, mistake: 'W5' }], 3, rand) }; }
  if (k === 'g2kg1') { const a = rnd(2, 6, rand); return { k, q: `${a * 1000}gは なんkg？`, right: `${a}kg`, g: a * 1000, choices: choices(`${a}kg`, [{ html: `${a * 10}kg`, mistake: 'W5' }, { html: `${a * 100}kg`, mistake: 'W5' }], 3, rand) }; }
  if (k === 'kg2g' || k === 'kg2g0') {
    const a = rnd(1, 3, rand), b = k === 'kg2g0' ? rnd(1, 9, rand) * 10 : rnd(1, 9, rand) * 100, g = a * 1000 + b;
    return { k, q: `${a}kg ${b}gは なんg？`, right: `${g}g`, g, choices: choices(`${g}g`, [{ html: `${a}${b}g`, mistake: 'W5' }, { html: `${a * 100 + b}g`, mistake: 'W5' }, { html: `${a + b}g`, mistake: 'W5' }], 3, rand) };
  }
  if (k === 'g2kg') { const a = rnd(1, 3, rand), b = rnd(1, 9, rand) * 100, g = a * 1000 + b; return { k, q: `${g}gは なんkg なんg？`, right: gText(g), g, choices: choices(gText(g), [{ html: `${Math.floor(g / 100)}kg`, mistake: 'W5' }, { html: `${a}kg ${b / 10}g`, mistake: 'W5' }, { html: `${a * 10}kg ${b}g`, mistake: 'W5' }], 3, rand) }; }
  if (k === 't2kg') { const a = rnd(1, 3, rand); return { k, q: `${a}tは なんkg？`, right: `${a * 1000}kg`, g: a * 1e6, choices: choices(`${a * 1000}kg`, [{ html: `${a * 100}kg`, mistake: 'W5' }, { html: `${a * 10}kg`, mistake: 'W5' }], 3, rand) }; }
  const a = rnd(3, 9, rand) * 100, b = 1000 - a + rnd(1, 4, rand) * 100, s = a + b;
  return { k, q: `${a}g ＋ ${b}g は？`, right: gText(s), g: s, choices: choices(gText(s), [{ html: `${s}kg`, mistake: 'W5' }, { html: `${Math.floor(s / 1000)}kg ${s % 1000 * 10}g`, mistake: 'W5' }, { html: gText(s + 100), mistake: 'other' }], 3, rand) };
}
// かんがえる（W1・W2）
export const THINK = [
  { id: 'big', q: '<b>おおきい スポンジ</b>と <b>ちいさい てつの たま</b>。おもいのは？', l: 'sponge', r: 'ironball', ch: [['てつの たま', true, null], ['スポンジ', false, 'W1'], ['おなじ', false, 'W1']], how: 'balance' },
  { id: 'long', q: 'ねんどを <b>ほそく のばす</b>と、おもさは？', shape: 1, ch: [['かわらない', true, null], ['おもく なる', false, 'W2'], ['かるく なる', false, 'W2']], how: 'clay' },
  { id: 'split', q: 'ねんどを <b>4つに ちぎった</b>。ぜんぶ あわせた おもさは？', shape: 2, ch: [['かわらない', true, null], ['かるく なる', false, 'W2'], ['おもく なる', false, 'W2']], how: 'clay' },
  { id: 'cabbage', q: '<b>キャベツ</b>と <b>りんご</b>。おもいのは？', l: 'cabbage', r: 'apple', ch: [['キャベツ', true, null], ['りんご', false, 'other'], ['おなじ', false, 'other']], how: 'balance' },
  { id: 'book', q: '<b>きょうかしょ</b>と <b>スポンジ</b>。スポンジの ほうが おおきいけれど、おもいのは？', l: 'textbook', r: 'sponge', ch: [['きょうかしょ', true, null], ['スポンジ', false, 'W1'], ['おなじ', false, 'W1']], how: 'balance' },
];
