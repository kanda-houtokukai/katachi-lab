// 面のカード（長方形・正方形）を並べて、箱になるかを確かめる（2年「はこの形」の追加の活動）。
import { S, THREE, tween, easeInOut, easeOutBack, glow, holdGlow, faceMaterial, disposeObject } from '../stage/stage.js';
import { plateGeometry } from '../stage/foldnet.js';
import { boxCrossLayout, boxFaceDims } from './_nets.js';

const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
export const norm2 = ([a, b]) => [Math.max(a, b), Math.min(a, b)];
// 6枚の大きさ [長, 短] から箱の [L, W, H] を探す。なければ null
export function boxFromCards(cards) {
  if (cards.length !== 6) return null;
  const ls = [...new Set(cards.flat().map(v => +v.toFixed(3)))];
  for (const L of ls) for (const W of ls) for (const H of ls) {
    const need = boxFaceDims(L, W, H), used = Array(6).fill(false);
    if (need.every(n => { const k = cards.findIndex((c, i) => !used[i] && same(norm2(c), n)); if (k < 0) return false; used[k] = true; return true; })) return [L, W, H];
  }
  return null;
}
// 箱の面の席（十字形の順）へカードを割り当てる。合わない席は -1、余ったカードは extra
export function assignSlots(cards, dims) {
  const need = boxFaceDims(...dims), used = Array(cards.length).fill(false);
  const slots = need.map(n => { const k = cards.findIndex((c, i) => !used[i] && same(norm2(c), n)); if (k >= 0) used[k] = true; return k; });
  return { slots, extra: cards.map((c, i) => (used[i] ? -1 : i)).filter(i => i >= 0) };
}
export function cardMesh(dims, color) {
  const [a, b] = dims, pts = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
  const m = new THREE.Mesh(plateGeometry(pts), faceMaterial(color));
  m.castShadow = m.receiveShadow = true;
  return m;
}
// 席の平面位置（十字形のレイアウトの各面の中心と向き）
export function slotPlacement(dims) {
  const L = boxCrossLayout(...dims);
  return L.faces.map(f => {
    const c = f.pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
    const e = [f.pts[1][0] - f.pts[0][0], f.pts[1][1] - f.pts[0][1]], len0 = Math.hypot(...e), len1 = Math.hypot(f.pts[2][0] - f.pts[1][0], f.pts[2][1] - f.pts[1][1]);
    // カードは長い辺を x に置いているので、面の長い辺の向きへ回す
    const longVec = len0 >= len1 ? e : [f.pts[2][0] - f.pts[1][0], f.pts[2][1] - f.pts[1][1]];
    return { c, rot: -Math.atan2(longVec[1], longVec[0]) };
  });
}
export { same };
