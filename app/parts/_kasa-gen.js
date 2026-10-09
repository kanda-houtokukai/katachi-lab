// かさの「ためす」の問題づくり（K1・K2）。DOM に触らない（単体テストで確かめる）。
// 誤答には つまずきの型を入れる：V1（高さで判断）・V2（ちがう コップの杯数）・V3（量感）・V4（数字だけで比べる・10dL＝1L）・V5（目もり）。
import { choices, rnd, pickR, shuffleR } from './_gen.js';
import { dlText } from './_water.js';

// K1 どちらが おおい：あか＝ほそながい（450まで）・あお＝ひくい ふとい（700まで）。
// あかの 水面は いつも あおより 高い（ほそながいので）。i===1 は かならず「高い ほうが すくない」。チャレンジの i===3 は おなじ。
export function genMore(level, i = 0, rand = Math.random) {
  const base = pickR([250, 300, 350], rand), d = level === 'easy' ? pickR([150, 200], rand) : pickR([50, 100], rand);
  let tall, wide;
  if (level === 'challenge' && i === 3) tall = wide = pickR([300, 350, 400], rand);
  else if (i === 1 || rand() < 0.5) { tall = base; wide = base + d; }
  else { tall = Math.min(450, base + d); wide = tall - d; }
  const more = tall > wide ? 'a' : tall < wide ? 'b' : 'eq';
  const ch = [{ key: 'a', html: 'あか', ok: more === 'a', mistake: 'V1' }, { key: 'b', html: 'あお', ok: more === 'b', mistake: 'other' }];
  if (level === 'challenge') ch.push({ key: 'eq', html: 'おなじ', ok: more === 'eq', mistake: 'other' });
  return { tall, wide, more, choices: ch };
}
// K1 なんばいぶん：ならんだ コップを かぞえる（7こ いじょうで かぞえまちがいが ふえる）
export function genCount(level, rand = Math.random) {
  const n = level === 'easy' ? rnd(2, 5, rand) : level === 'normal' ? rnd(4, 8, rand) : rnd(7, 10, rand);
  return { n, choices: choices(`${n}`, [{ html: `${n + 1}`, mistake: 'count' }, { html: `${n - 1}`, mistake: 'count' }, { html: `${n + 2}`, mistake: 'count' }], 3, rand) };
}
// K1 コップの 大きさが ちがう（V2）：あかは ちいさい コップ（1こ 100）で nS はい、あおは おおきい コップ（1こ 200）で nB はい
const CS = [[3, 2], [4, 3], [5, 3], [6, 4], [5, 4], [3, 2]], CS_EQ = [[4, 2], [6, 3]], CS_PLAIN = [[2, 3], [3, 4], [2, 2]];
export function genCupSize(level, i = 0, rand = Math.random) {
  const [nS, nB] = level === 'challenge' && i % 3 === 2 ? pickR(CS_EQ, rand) : (i % 4 === 3 ? pickR(CS_PLAIN, rand) : pickR(CS, rand));
  const a = nS * 100, b = nB * 200, more = a > b ? 'a' : a < b ? 'b' : 'eq';
  const manyA = nS > nB;
  const ch = [{ key: 'a', html: 'あか', ok: more === 'a', mistake: manyA ? 'V2' : 'other' }, { key: 'b', html: 'あお', ok: more === 'b', mistake: manyA ? 'other' : 'V2' }];
  if (level !== 'easy') ch.push({ key: 'eq', html: 'おなじ', ok: more === 'eq', mistake: 'V2' });
  return { nS, nB, a, b, more, choices: ch };
}

// K2 目もりを よむ（dL の数 v）：やさしい 2〜9dL、ふつう 1L1dL〜1L9dL、チャレンジ 2L1dL〜2L9dL
export function genReadV(level, rand = Math.random) {
  return level === 'easy' ? rnd(2, 9, rand) : level === 'normal' ? rnd(11, 19, rand) : rnd(21, 29, rand);
}
export function readChoicesV(v, rand = Math.random) {
  const r = v % 10, L = Math.floor(v / 10), w = [];
  w.push({ html: dlText(L * 10 + (10 - r)), mistake: 'V5' });          // 上から 数えた
  w.push({ html: dlText(v + 1), mistake: 'V5' }, { html: dlText(v - 1), mistake: 'V5' });   // 目もりを 1つ 数えちがえた
  w.push({ html: `${v}L`, mistake: 'V4' });                              // dL の 数を L と書く
  const out = choices(dlText(v), r === 5 ? [w[3], w[1], w[2]] : [w[0], w[3], w[1], w[2]], 3, rand);
  return out;
}
// K2 たんい えらび（V3）：入れ物の かさ（mL）から、いちばん ふさわしい 単位で「やく ○○」
export const UNIT_ITEMS = ['bucket', 'cup', 'milk1L', 'pet500', 'donburi', 'nabe', 'yakan', 'suito', 'milk200', 'pet2L'];
export function unitOf(ml) { return ml >= 1000 && ml % 1000 === 0 ? { n: ml / 1000, u: 'L' } : { n: ml / 100, u: 'dL' }; }
export function genUnit(ml, rand = Math.random) {
  const { n, u } = unitOf(ml);
  const others = ['L', 'dL', 'mL'].filter(x => x !== u);
  return { n, u, choices: choices(`${n}${u}`, others.map(x => ({ html: `${n}${x}`, mistake: 'V3' })), 3, rand) };
}
// K2 どちらが おおい（数字だけで くらべると まちがえる組・V4）。量は mL
export function genCompare(level, i = 0, rand = Math.random) {
  let a, b;
  const kind = level === 'easy' ? pickR(['dL-L', 'mL-L'], rand) : level === 'normal' ? pickR(['mL-L', 'dL-LdL', 'dL-L'], rand) : pickR(['dL-LdL', 'eq', 'mL-dL', 'mL-LdL'], rand);
  if (kind === 'dL-L') { const x = rnd(2, 9, rand); a = { ml: x * 100, html: `${x}dL` }; b = { ml: 1000, html: '1L' }; }
  else if (kind === 'mL-L') { const x = rnd(3, 9, rand) * 100; a = { ml: x, html: `${x}mL` }; b = { ml: 1000, html: '1L' }; }
  else if (kind === 'dL-LdL') { let x, y; do { x = rnd(11, 19, rand); y = rnd(1, 9, rand); } while (x - 10 === y || x === 10 + y); a = { ml: x * 100, html: `${x}dL` }; b = { ml: 1000 + y * 100, html: `1L ${y}dL` }; }
  else if (kind === 'eq') { const y = rnd(1, 9, rand); a = { ml: (10 + y) * 100, html: `${10 + y}dL` }; b = { ml: 1000 + y * 100, html: `1L ${y}dL` }; }
  else if (kind === 'mL-dL') { const x = rnd(3, 8, rand), y = x + pickR([1, 2, -1, -2], rand); a = { ml: y * 100, html: `${y * 100}mL` }; b = { ml: x * 100, html: `${x}dL` }; if (rand() < 0.5) [a, b] = [b, a]; }
  else { const y = rnd(2, 8, rand), x = rnd(3, 9, rand) * 100; a = { ml: x, html: `${x}mL` }; b = { ml: 1000 + y * 100, html: `1L ${y}dL` }; }
  if (rand() < 0.5 && kind !== 'mL-dL') [a, b] = [b, a];
  const num = s => +String(s).replace(/[^0-9 ]/g, ' ').trim().split(/\s+/).reduce((p, q) => p + +q, 0);
  const more = a.ml > b.ml ? 'a' : a.ml < b.ml ? 'b' : 'eq';
  // 数字だけで くらべると どちらを えらぶか（数の 大きい ほう）
  const naive = num(a.html) > num(b.html) ? 'a' : num(a.html) < num(b.html) ? 'b' : 'eq';
  const ch = [{ key: 'a', html: a.html, ok: more === 'a', mistake: naive === 'a' ? 'V4' : 'other' }, { key: 'b', html: b.html, ok: more === 'b', mistake: naive === 'b' ? 'V4' : 'other' }];
  if (level !== 'easy') ch.push({ key: 'eq', html: 'おなじ', ok: more === 'eq', mistake: 'V4' });
  return { a, b, more, kind, choices: ch };
}
// K2 かさの けいさん（dL の数で）。やさしい：くり上がりなし、ふつう：1L に くり上がる、チャレンジ：ひき算（くり下がり）
export function genCalc(level, rand = Math.random) {
  let a, b, op;
  if (level === 'easy') { const L = rnd(1, 2, rand), x = rnd(1, 5, rand), y = rnd(1, 9 - x - 0, rand); a = L * 10 + x; b = Math.min(y, 9 - x); if (b < 1) b = 1; op = '+'; }
  else if (level === 'normal') { const L = 1, x = rnd(3, 9, rand), y = rnd(10 - x, 9, rand); a = L * 10 + x; b = y; op = '+'; }
  else { const L = rnd(1, 2, rand) + 1, x = rnd(0, 4, rand), y = rnd(x + 1, 9, rand); a = L * 10 + x; b = y; op = '-'; }
  const r = op === '+' ? a + b : a - b;
  const La = Math.floor(a / 10), da = a % 10;
  const naive = op === '+' ? `${La}L ${da + b}dL` : `${La}L ${Math.abs(da - b)}dL`;
  const w = [];
  if (op === '+' && da + b >= 10) w.push({ html: naive, mistake: 'V4' });
  if (op === '-') w.push({ html: naive, mistake: 'V4' });
  w.push({ html: dlText(op === '+' ? r + 10 : r - 10 > 0 ? r - 10 : r + 10), mistake: 'V4' }, { html: dlText(r + 1), mistake: 'other' }, { html: dlText(Math.max(1, r - 1)), mistake: 'other' });
  return { a, b, op, r, text: `${dlText(a)} ${op === '+' ? '＋' : '−'} ${dlText(b)}`, choices: choices(dlText(r), w, 3, rand) };
}
export { shuffleR };
