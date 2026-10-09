// たんいの しくみ（U3）の 問題づくり。DOM に触らない（単体テストで確かめる）。誤答は W5（単位を別々に覚えている）。
import { choices, rnd, pickR } from './_gen.js';

export const COL = { naga: 0, kasa: 1, omo: 2 };
const K = [{ q: 'naga', a: 'km', b: 'm' }, { q: 'kasa', a: 'kL', b: 'L' }, { q: 'omo', a: 'kg', b: 'g' }];
const M = [{ q: 'naga', a: 'm', b: 'mm' }, { q: 'kasa', a: 'L', b: 'mL' }, { q: 'omo', a: 'g', b: 'mg' }];
const rel = (r, n = 1000) => `1${r.a}＝${n}${r.b}`;
// どの単位と おなじ しくみ？／□に はいる 単位は？／k・m は なんばい？
export function genMatch(level, i = 0, rand = Math.random) {
  const kinds = level === 'easy' ? ['times', 'fillK', 'fillK'] : level === 'normal' ? ['fillK', 'fillM', 'same', 'times'] : ['same', 'fillM', 'same', 'fillK'];
  const k = kinds[i % kinds.length];
  if (k === 'times') {
    const md = i % 2 ? 'm' : 'k';
    return md === 'k'
      ? { k, md, col: 0, q: '<b>k（キロ）</b>が つくと なんばい？', right: '1000ばい', choices: choices('1000ばい', [{ html: '100ばい', mistake: 'W5' }, { html: '10ばい', mistake: 'W5' }], 3, rand) }
      : { k, md, col: 0, q: '<b>m（ミリ）</b>が つくと？', right: '1000ぶんの1', choices: choices('1000ぶんの1', [{ html: '100ぶんの1', mistake: 'W5' }, { html: '10ぶんの1', mistake: 'W5' }], 3, rand) };
  }
  if (k === 'fillK' || k === 'fillM') {
    const list = k === 'fillK' ? (level === 'easy' ? K.filter(r => r.q !== 'kasa') : K) : M, r = pickR(list, rand), md = k === 'fillK' ? 'k' : 'm';
    const units = { naga: ['km', 'm', 'cm', 'mm'], kasa: ['kL', 'L', 'dL', 'mL'], omo: ['kg', 'g', 'mg'] }[r.q].filter(u => u !== r.a && u !== r.b);
    return { k, md, col: COL[r.q], q: `1${r.a}＝1000<b>□</b>。□に はいる たんいは？`, right: r.b, choices: choices(r.b, units.map(u => ({ html: u, mistake: 'W5' })), 3, rand) };
  }
  const md = rand() < 0.5 ? 'k' : 'm', list = md === 'k' ? K : M, a = pickR(list, rand), b = pickR(list.filter(x => x !== a), rand), c = list.find(x => x !== a && x !== b);
  return { k, md, col: COL[b.q], q: `<b>${rel(a)}</b>と おなじ しくみは どれ？`, right: rel(b), choices: choices(rel(b), [{ html: rel(c, 100), mistake: 'W5' }, { html: rel(b, 10), mistake: 'W5' }, { html: rel(b, 100), mistake: 'W5' }], 3, rand) };
}
// かんさん（長さ・かさ・重さを まぜる）
export function genConvertU(level, i = 0, rand = Math.random) {
  const q = ['naga', 'kasa', 'omo'][i % 3], P = { naga: ['km', 'm', 'mm'], kasa: ['L', 'mL'], omo: ['kg', 'g'] }[q];
  if (level === 'easy') {
    const [big, small] = q === 'naga' ? pickR([['km', 'm'], ['m', 'mm']], rand) : P;
    return { q: `1${big}は なん${small}？`, right: `1000${small}`, col: COL[q], md: big === 'm' || big === 'L' ? 'm' : 'k', choices: choices(`1000${small}`, [{ html: `100${small}`, mistake: 'W5' }, { html: `10${small}`, mistake: 'W5' }], 3, rand) };
  }
  const [big, small] = q === 'naga' ? ['km', 'm'] : P, md = q === 'kasa' ? 'm' : 'k';
  if (level === 'normal') {
    const a = rnd(2, 5, rand);
    if (i % 2) return { q: `${a * 1000}${small}は なん${big}？`, right: `${a}${big}`, col: COL[q], md, choices: choices(`${a}${big}`, [{ html: `${a * 10}${big}`, mistake: 'W5' }, { html: `${a * 100}${big}`, mistake: 'W5' }], 3, rand) };
    return { q: `${a}${big}は なん${small}？`, right: `${a * 1000}${small}`, col: COL[q], md, choices: choices(`${a * 1000}${small}`, [{ html: `${a * 100}${small}`, mistake: 'W5' }, { html: `${a * 10}${small}`, mistake: 'W5' }], 3, rand) };
  }
  const a = rnd(1, 3, rand), b = rnd(1, 9, rand) * 100, t = a * 1000 + b;
  if (i % 2) return { q: `${t}${small}は なん${big} なん${small}？`, right: `${a}${big} ${b}${small}`, col: COL[q], md, choices: choices(`${a}${big} ${b}${small}`, [{ html: `${Math.floor(t / 100)}${big}`, mistake: 'W5' }, { html: `${a * 10}${big} ${b}${small}`, mistake: 'W5' }, { html: `${a}${big} ${b / 10}${small}`, mistake: 'W5' }], 3, rand) };
  return { q: `${a}${big} ${b}${small}は なん${small}？`, right: `${t}${small}`, col: COL[q], md, choices: choices(`${t}${small}`, [{ html: `${a * 1000 + b / 10}${small}`, mistake: 'W5' }, { html: `${a * 100 + b}${small}`, mistake: 'W5' }, { html: `${a + b}${small}`, mistake: 'W5' }], 3, rand) };
}

// 3つの 量の 列（tani-zoom の 絵と 式）
export const QS = [
  { id: 'naga', name: 'ながさ', color: 'face-1', k: ['1m', '10m', '100m', '1km'], kEq: '1km＝1000m', m: ['1m', '10cm', '1cm', '1mm'], mEq: '1m＝1000mm' },
  { id: 'kasa', name: 'かさ', color: 'face-4', k: ['1L', '10L', '100L', '1kL'], kEq: '1kL＝1000L', m: ['1L', '1dL', '10mL', '1mL'], mEq: '1L＝1000mL' },
  { id: 'omo', name: 'おもさ', color: 'face-3', k: ['1g', '10g', '100g', '1kg'], kEq: '1kg＝1000g', m: ['1g', '', '', '1mg'], mEq: '1g＝1000mg' },
];

// 単位の表（3年）：1000ばい・100ばい・10ばい・もと・10ぶんの1・100ぶんの1・1000ぶんの1
export const TABLE = {
  cols: ['1000ばい', '100ばい', '10ばい', '1', '10ぶんの1', '100ぶんの1', '1000ぶんの1'],
  rows: [{ id: 'naga', name: 'ながさ', cells: ['km', '', '', 'm', '', 'cm', 'mm'] }, { id: 'kasa', name: 'かさ', cells: ['kL', '', '', 'L', 'dL', '', 'mL'] }, { id: 'omo', name: 'おもさ', cells: ['kg', '', '', 'g', '', '', 'mg'] }],
  intro: ['kL', 'mg'],
};

// たんい ずかん（つくる）：身の回りの 場面で 見つける。値は基準物から
export const FIND = [
  { u: 'mm', id: 'coin1', f: b => `${b.len_mm}mm`, w: 'はば' },
  { u: 'cm', id: 'ruler30', f: b => `${b.len_mm / 10}cm`, w: '' },
  { u: 'm', id: 'classroom', f: b => `${b.len_mm / 1000}m`, w: 'よこ' },
  { u: 'km', id: 'road1km', f: b => `${b.len_mm / 1e6}km`, w: 'ひょうしき' },
  { u: 'mL', id: 'pet500', f: b => `${b.vol_ml}mL`, w: '' },
  { u: 'dL', id: 'cup', f: b => `${b.vol_ml / 100}dL`, w: '' },
  { u: 'L', id: 'milk1L', f: b => `${b.vol_ml / 1000}L`, w: '' },
  { u: 'kL', id: 'pool', f: b => `${b.vol_ml / 1e6}kL`, w: '' },
  { u: 'mg', id: 'tablet', f: b => `${Math.round(b.mass_g * 1000)}mg`, w: '1つぶ' },
  { u: 'g', id: 'egg', f: b => `${b.mass_g}g`, w: '' },
  { u: 'kg', id: 'water1L', f: b => `${b.mass_g / 1000}kg`, w: '' },
  { u: 't', id: 'keicar', f: b => `${b.mass_g / 1e6}t`, w: '' },
];
