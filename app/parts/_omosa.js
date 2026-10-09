// 重さの計算（O3・U3）。DOM に触らない（単体テストで確かめる）。
// はかりの目もり（3種）、針のばね、1kg を つくる組み合わせ（tools/hakaru-omosa.mjs が data/hakaru/kg.json に凍結）。

// はかりの目もりのつくり（既定値：学校でよく使う はかり。秤量 1kg＝1目もり 5g、2kg＝10g、4kg＝20g）。
// minor：1目もり、mid：中くらいの線、label：数字を書く間かく
export const CAPS = {
  1000: { cap: 1000, minor: 5, mid: 50, label: 100 },
  2000: { cap: 2000, minor: 10, mid: 100, label: 200 },
  4000: { cap: 4000, minor: 20, mid: 100, label: 500 },
};
export const CAP_LIST = [1000, 2000, 4000];
// g が針の何度か（0g が 12時、時計回り。ひとまわりで秤量）
export const degOf = (g, cap) => g / cap * 360;
// 目もりの一覧：{ v（g）, deg, kind: minor|mid|major, label（数字を書くとき） }
export function ticks(cap) {
  const c = CAPS[cap]; const out = [];
  for (let v = 0; v < cap; v += c.minor) {
    const major = v % c.label === 0, mid = v % c.mid === 0;
    out.push({ v, deg: degOf(v, cap), kind: major ? 'major' : mid ? 'mid' : 'minor', label: major ? (v === 0 ? '0' : v % 1000 === 0 ? v / 1000 + 'kg' : String(v % 1000)) : null });
  }
  return out;
}
// 読みの手がかり：いちばん近い「数字の目もり」と、そこからの目もりの数
export function readParts(g, cap) { const c = CAPS[cap], base = Math.floor(g / c.label) * c.label; return { base, n: Math.round((g - base) / c.minor), minor: c.minor }; }

// 針のばね（経過時間 dt 秒で進める。フレーム数に依存しない）。振り切れたら止め金で跳ね返す
export const STOP = 363;
export function springStep(st, target, dt) {
  // 細かく刻んで安定させる
  const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
  for (let i = 0; i < n; i++) {
    st.v += (-90 * (st.a - target) - 11 * st.v) * h; st.a += st.v * h;
    if (st.a > STOP) { st.a = STOP; st.v = -Math.abs(st.v) * 0.3; }
    if (st.a < -2) { st.a = -2; st.v = Math.abs(st.v) * 0.3; }
  }
  return st;
}
export const needleTarget = (g, cap) => (g > cap ? STOP - 1 : degOf(g, cap));
export const settled = (st, target) => Math.abs(st.a - target) < 0.3 && Math.abs(st.v) < 0.8;

/* ---------- 1kg を つくろう（ずかんの総数） ----------
   つかう物：基準物（data/benchmarks.json）から 8しゅ（10しゅ いない）。同じ物は 2こまで。
   ちょうど 1000g に なる組み合わせを すべて（ならべる じゅんばんは くべつしない）。 */
export const KG_ITEMS = ['water1L', 'apple', 'textbook', 'carrot', 'clay', 'banana', 'orange', 'egg'];
export const KG_MAX = 2, KG_TARGET = 1000;
export const KG_RULE = 'つかう物 8しゅ（1Lの みず・りんご・きょうかしょ・にんじん・ねんど・バナナ・みかん・たまご）、同じ物は 2こまで、ちょうど 1000g、じゅんばんは くべつしない';
// items：[{ id, g }]。答え：[{ id: n, ... }]（0 の物は書かない）
export function kgCombos(items, target = KG_TARGET, max = KG_MAX) {
  const out = [], cnt = new Array(items.length).fill(0);
  const rec = (i, sum) => {
    if (sum > target) return;
    if (i === items.length) { if (sum === target) { const o = {}; items.forEach((it, k) => { if (cnt[k]) o[it.id] = cnt[k]; }); out.push(o); } return; }
    for (let c = 0; c <= max; c++) { cnt[i] = c; rec(i + 1, sum + c * items[i].g); }
    cnt[i] = 0;
  };
  rec(0, 0);
  return out;
}
// 組み合わせの id（KG_ITEMS の順に「id*n」を + でつなぐ。例：apple*2+carrot*2）
export const comboId = o => KG_ITEMS.filter(id => o[id]).map(id => `${id}*${o[id]}`).join('+');
export const comboOf = id => Object.fromEntries(String(id).split('+').filter(Boolean).map(s => { const [k, n] = s.split('*'); return [k, +n || 1]; }));

// 重さの表し方（g → 「1kg 30g」、読み上げ「1キログラム30グラム」）
export const gText = g => (g < 1000 ? `${g}g` : `${Math.floor(g / 1000)}kg${g % 1000 ? ' ' + (g % 1000) + 'g' : ''}`);
export const gSpeech = g => (g < 1000 ? `${g}グラム` : `${Math.floor(g / 1000)}キログラム${g % 1000 ? (g % 1000) + 'グラム' : ''}`);
