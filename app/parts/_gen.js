// 問題づくりの計算（DOM に触らない。単体テストで確かめる）。選択肢・時刻の生成。
import { kidTime, fun } from '../core/yomi.js';

export const rnd = (a, b, rand = Math.random) => a + Math.floor(rand() * (b - a + 1));
export const pickR = (a, rand = Math.random) => a[Math.floor(rand() * a.length)];
export function shuffleR(a, rand = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// 選択肢：正解1つ＋まちがい（重なりを除く）。wrong：[{ html, mistake }]
export function choices(right, wrong, max = 3, rand = Math.random) {
  const out = [{ html: right, ok: true }], seen = new Set([right]);
  for (const w of wrong) { if (out.length >= max) break; if (w.html == null || seen.has(w.html)) continue; seen.add(w.html); out.push(Object.assign({ ok: false }, w)); }
  return shuffleR(out, rand);
}
export const MIN = t => ((Math.round(t) % 60) + 60) % 60;
export const hour12 = t => { const h = Math.floor(((Math.round(t) % 720) + 720) % 720 / 60); return h === 0 ? 12 : h; };
// 時刻の問題の範囲（やさしい＝ちょうど・はん、ふつう＝5分刻み（45・50・55分を4割以上）、チャレンジ＝1分刻み（56〜59分と12時台を混ぜる））。
// i が 1 の問題には、つまずきの型に当たる時刻（7時55分・1時55分）、チャレンジの i が 3 には 12時台を必ず入れる
export function genTime(level, i = 0, rand = Math.random) {
  let h = rnd(1, 12, rand), m;
  if (level === 'easy') m = pickR([0, 30], rand);
  else if (level === 'normal') m = rand() < 0.45 ? pickR([45, 50, 55], rand) : rnd(1, 11, rand) * 5;
  else { m = rand() < 0.4 ? rnd(56, 59, rand) : rnd(1, 59, rand); if (m % 5 === 0) m += 1; if (rand() < 0.25) h = 12; }
  if (level !== 'easy' && i === 1) { h = pickR([7, 1], rand); m = level === 'normal' ? 55 : pickR([55, 57, 58], rand); }
  if (level === 'challenge' && i === 3) h = 12;
  return h * 60 + m;
}
// 時刻を読む問題の選択肢。T1：近い数字を読む（55分なら次の時）、T2：針の取り違え、T3：長針の数字をそのまま読む
export function readChoices(T, rand = Math.random) {
  const h = hour12(T), m = MIN(T), hp = h === 12 ? 1 : h + 1, hmn = h === 1 ? 12 : h - 1;
  const w = [{ html: kidTime((m >= 30 ? hp : hmn) * 60 + m), mistake: 'T1' }];
  if (m % 5 === 0 && m >= 10) w.push({ html: `${h}じ ${m / 5}${fun(m / 5)}`, mistake: 'T3' });
  { const h2 = Math.round(m / 5) % 12 || 12, m2 = ((h % 12) * 5 + Math.floor(m / 12)) % 60; w.push({ html: kidTime(h2 * 60 + m2), mistake: 'T2' }); }
  w.push({ html: kidTime(hmn * 60 + m), mistake: 'T1' }, { html: kidTime(((h + 5) % 12 || 12) * 60 + m), mistake: 'other' });
  return choices(kidTime(T), w, 3, rand);
}
