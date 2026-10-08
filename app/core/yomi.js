// 読みの道具（量の単元）。画面の文（ひらがなの分かち書き）と、読み上げの文（漢字。端末の声は漢字のほうが正しく読む）を分けて作る。
// DOM に触らない（単体テストで確かめる）。

// 分の読み：1・3・4・6・8・10分（下1けたが 0・1・3・4・6・8）は「ぷん」、それ以外は「ふん」
export const fun = m => ([0, 1, 3, 4, 6, 8].includes(((m % 10) + 10) % 10) ? 'ぷん' : 'ふん');
// 杯の読み：1・6・8・10 →ぱい、3 →ばい、ほかは はい（下1けたで決める。0 は「ぱい」）
export function hai(n) { const d = n % 10; return [1, 6, 8, 0].includes(d) ? 'ぱい' : d === 3 ? 'ばい' : 'はい'; }
// 本の読み：1・6・8・10 →ぽん、3 →ぼん、ほかは ほん
export function hon(n) { const d = n % 10; return [1, 6, 8, 0].includes(d) ? 'ぽん' : d === 3 ? 'ぼん' : 'ほん'; }
// 回の読み：1・6・8・10 →っかい（いっかい・ろっかい・はっかい・じゅっかい）。数字で書くときは「かい」で足りる
export const kai = () => 'かい';
export const mai = () => 'まい';
export const ko = () => 'こ';
// 数＋助数詞（画面の文）
export const count = (n, k) => n + ({ hai, hon, kai, mai, ko }[k] || (() => k))(n);

const h12 = t => { const h = Math.floor((((t % 720) + 720) % 720) / 60); return h === 0 ? 12 : h; };
const mm = t => ((Math.round(t) % 60) + 60) % 60;
// 時刻（0時からの分）→ 画面の文「7じ 55ふん」「7じはん」「7じ」
export function kidTime(t, { half = true } = {}) {
  const m = mm(t), h = h12(t);
  if (m === 0) return `${h}じ`;
  if (m === 30 && half) return `${h}じはん`;
  return `${h}じ ${m}${fun(m)}`;
}
// 読み上げの文「7時55分」「7時半」
export function spTime(t, { half = true } = {}) {
  const m = mm(t), h = h12(t);
  if (m === 0) return `${h}時`;
  if (m === 30 && half) return `${h}時半`;
  return `${h}時${m}分`;
}
// 午前・午後つき（0〜1439）
export const ampm = t => ((((Math.round(t) % 1440) + 1440) % 1440) < 720 ? 'ごぜん' : 'ごご');
export const ampmSp = t => (ampm(t) === 'ごぜん' ? '午前' : '午後');
// 時間（分）→「1じかん 20ぷん」・読み上げ「1時間20分」
export function kidDur(d) {
  d = Math.max(0, Math.round(d)); const h = Math.floor(d / 60), m = d % 60;
  if (!h && !m) return '0ぷん';
  return (h ? `${h}じかん` : '') + (m ? `${h ? ' ' : ''}${m}${fun(m)}` : '');
}
export function spDur(d) {
  d = Math.max(0, Math.round(d)); const h = Math.floor(d / 60), m = d % 60;
  if (!h && !m) return '0分';
  return (h ? `${h}時間` : '') + (m ? `${m}分` : '');
}
// 秒
export const kidSec = s => { const m = Math.floor(s / 60), r = s % 60; return (m ? `${m}${fun(m)}` : '') + (r || !m ? `${m ? ' ' : ''}${r}びょう` : ''); };
export const spSec = s => { const m = Math.floor(s / 60), r = s % 60; return (m ? `${m}分` : '') + (r || !m ? `${r}秒` : ''); };

// 単位の読み上げ（長いものから置きかえる）
const UNITS = [
  ['km²', '平方キロメートル'], ['m²', '平方メートル'], ['cm²', '平方センチメートル'], ['cm³', '立方センチメートル'], ['m³', '立方メートル'],
  ['km', 'キロメートル'], ['mm', 'ミリメートル'], ['cm', 'センチメートル'], ['kg', 'キログラム'], ['mg', 'ミリグラム'],
  ['kL', 'キロリットル'], ['mL', 'ミリリットル'], ['dL', 'デシリットル'], ['ha', 'ヘクタール'],
  ['m', 'メートル'], ['g', 'グラム'], ['t', 'トン'], ['L', 'リットル'], ['a', 'アール'], ['°', '度'],
];
const UNIT_RE = new RegExp('(\\d[\\d.,]*\\s*)(' + UNITS.map(u => u[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z²³])', 'g');
// 数のうしろの単位記号だけを読みに直す（「1dL」→「1デシリットル」）。数のつかない単位（表の見出し）は unitName を使う
export function unitSpeech(text) {
  return String(text).replace(UNIT_RE, (m, num, u) => num + UNITS.find(x => x[0] === u)[1]);
}
export const unitName = u => (UNITS.find(x => x[0] === u) || [u, u])[1];

// 量の表し方（画面の文）：長さ mm → 「1m 20cm」「3cm 5mm」など
export function fmtLen(mmv, { m = true, mmUnit = true } = {}) {
  mmv = Math.round(mmv);
  const km = Math.floor(mmv / 1e6), rem = mmv % 1e6;
  if (km) { const mm2 = Math.round(rem / 1000); return `${km}km` + (mm2 ? ` ${mm2}m` : ''); }
  const M = m ? Math.floor(mmv / 1000) : 0, cm = Math.floor((mmv - M * 1000) / 10), r = mmv % 10;
  const out = [];
  if (M) out.push(M + 'm');
  if (cm) out.push(cm + 'cm');
  if (r && mmUnit) out.push(r + 'mm');
  return out.join(' ') || '0cm';
}
// かさ mL → 「1L 5dL」（dL より細かいものは mL）
export function fmtVol(ml) {
  ml = Math.round(ml);
  const L = Math.floor(ml / 1000), dl = Math.floor((ml % 1000) / 100), r = ml % 100;
  if (r) return (L ? `${L}L ` : '') + `${ml % 1000}mL`;
  return [L ? L + 'L' : '', dl ? dl + 'dL' : ''].filter(Boolean).join(' ') || '0dL';
}
// 重さ g → 「2kg 300g」
export function fmtMass(g) {
  g = Math.round(g);
  const t = Math.floor(g / 1e6); if (t && g % 1e6 === 0) return `${t}t`;
  const kg = Math.floor(g / 1000), r = g % 1000;
  return [kg ? kg + 'kg' : '', r ? r + 'g' : ''].filter(Boolean).join(' ') || '0g';
}
