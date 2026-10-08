// 実寸合わせ（hakaru-design.md §1-1）。1円玉（またはカード）を画面に当てて大きさを合わせ、
// 「1mm あたりの CSS ピクセル」を端末ごとに保存する（きょうだいで共有。記録の書き出しには入れない）。
// 画面の大きさか devicePixelRatio が変わったら、合わせ直しを一度だけ促す。
import { store } from './store.js';

export const CSS_PX_PER_MM = 96 / 25.4;          // ブラウザの決まり（1in＝96px）。実際の画面とはずれる
const KEY = 'calib';
// 計算（単体テストで確かめる）
export const pxPerMmFrom = (px, mm) => px / mm;
export const mmToPx = (mm, ppm) => mm * ppm;
export const pxToMm = (px, ppm) => px / ppm;
// 端末の見分け：画面の短い辺・長い辺と devicePixelRatio（向きを変えても同じ値になるよう並べ替える）
export function deviceKey(env = (typeof window !== 'undefined' ? window : {})) {
  const s = env.screen || {}, a = Math.min(s.width || 0, s.height || 0), b = Math.max(s.width || 0, s.height || 0);
  return `${a}x${b}@${(env.devicePixelRatio || 1).toFixed(2)}`;
}
export function load() { return store.get(KEY, null); }
export function save(ppm, mode = 'coin') { const v = { ppm: +ppm.toFixed(4), mode, key: deviceKey(), at: Date.now() }; store.set(KEY, v); return v; }
export function reset() { store.del(KEY); }
// 合わせてある（いまの端末の見分けと一致）
export function calibrated() { const c = load(); return !!(c && c.key === deviceKey()); }
// いまの 1mm あたりの px（合わせていなければブラウザの決まりの値）
export function ppm() { const c = load(); return c && c.key === deviceKey() ? c.ppm : CSS_PX_PER_MM; }
// 合わせたあとで画面が変わった（ブラウザの拡大・別の端末）→ 一度だけ促す
let nagged = false;
export function needsRecheck() { const c = load(); if (!c || c.key === deviceKey() || nagged) return false; nagged = true; return true; }
