// デザイン用の変数（app/ui/tokens.css）を JS から読む。3D の色もここを通す（D12）。
const cache = new Map();
export function tok(name) {
  if (!cache.has(name)) {
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); } catch (e) {}
    cache.set(name, v || '#888888');
  }
  return cache.get(name);
}
export const faceColors = () => [1, 2, 3, 4, 5, 6].map(i => tok('face-' + i));
export const avColors = () => [1, 2, 3, 4].map(i => tok('av-' + i));
