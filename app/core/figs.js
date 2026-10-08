// 思い出し問題・ずかん・カードに使う小さな図（SVG）。色は tokens.css から読む。
import { tok, faceColors } from './theme.js';

// 多角形の並び（展開図）を SVG にする
export function polysSVG(polys, colors, cls = 'net', opts = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const P of polys) for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0, hh = y1 - y0, s = 100 / Math.max(w, hh), pad = 2;
  const pal = colors || faceColors();
  const path = P => 'M' + P.map(([x, y]) => `${((x - x0) * s + pad).toFixed(1)} ${((y - y0) * s + pad).toFixed(1)}`).join('L') + 'Z';
  return `<svg class="${cls}" viewBox="0 0 ${(w * s + pad * 2).toFixed(1)} ${(hh * s + pad * 2).toFixed(1)}" aria-hidden="true">` +
    polys.map((P, i) => `<path d="${path(P)}" fill="${Array.isArray(pal) ? pal[i % pal.length] : pal}" stroke="${tok('ink')}" stroke-width="${opts.sw || 1.6}" stroke-linejoin="round"/>`).join('') + '</svg>';
}
export function cellsSVG(cells, colors, cls = 'net') {
  return polysSVG(cells.map(([x, z]) => [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]), colors, cls);
}

const ink = () => tok('ink');
const F = () => faceColors();
// 見取図ふうの小さな立体
const FIGS = {
  box: () => `<svg viewBox="0 0 100 90"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M20 30l30-14 30 14-30 14z" fill="${F()[4]}"/><path d="M20 30l30 14v34L20 64z" fill="${F()[5]}"/><path d="M50 44l30-14v34L50 78z" fill="${F()[3]}"/></g></svg>`,
  cuboid: () => `<svg viewBox="0 0 120 80"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M14 30l40-14 56 12-40 16z" fill="${F()[1]}"/><path d="M14 30l56 14v26L14 56z" fill="${F()[0]}"/><path d="M70 44l40-16v26L70 70z" fill="${F()[3]}"/></g></svg>`,
  can: () => `<svg viewBox="0 0 80 90"><g stroke="${ink()}" stroke-width="1.6"><path d="M15 18v54a25 9 0 0 0 50 0V18" fill="${F()[3]}"/><ellipse cx="40" cy="18" rx="25" ry="9" fill="${F()[1]}"/></g></svg>`,
  ball: () => `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="30" fill="${F()[0]}" stroke="${ink()}" stroke-width="1.6"/><path d="M18 30q22 12 44 0" fill="none" stroke="${ink()}" stroke-width="1.2" opacity=".5"/></svg>`,
  slope: () => `<svg viewBox="0 0 120 70"><path d="M8 62h104L8 18z" fill="${tok('line')}" stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="30" cy="20" r="9" fill="${F()[0]}" stroke="${ink()}" stroke-width="1.4"/></svg>`,
  triprism: () => `<svg viewBox="0 0 110 90"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M20 70l20-44 50 0-20 44z" fill="${F()[2]}"/><path d="M40 26l50 0 10 30-30 14z" fill="${F()[3]}"/><path d="M20 70l50 0 30-14" fill="none"/></g></svg>`,
  cylinder: () => `<svg viewBox="0 0 80 100"><g stroke="${ink()}" stroke-width="1.6"><path d="M12 20v60a28 10 0 0 0 56 0V20" fill="${F()[2]}"/><ellipse cx="40" cy="20" rx="28" ry="10" fill="${F()[1]}"/></g></svg>`,
  cone: () => `<svg viewBox="0 0 80 100"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M40 10L12 80a28 10 0 0 0 56 0z" fill="${F()[4]}"/></g></svg>`,
  pyramid: () => `<svg viewBox="0 0 100 90"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M50 10L15 66l35 14z" fill="${F()[0]}"/><path d="M50 10l35 56-35 14z" fill="${F()[1]}"/></g></svg>`,
  sphere: () => FIGS.ball(),
  cubes: () => `<svg viewBox="0 0 110 80"><g stroke="${ink()}" stroke-width="1.2" fill="${F()[3]}">${[0, 1, 2].map(i => `<path d="M${15 + i * 26} 40l13-7 13 7v16l-13 7-13-7z"/>`).join('')}${[0, 1].map(i => `<path d="M${28 + i * 26} 24l13-7 13 7v16l-13 7-13-7z" fill="${F()[1]}"/>`).join('')}</g></svg>`,
  octa: () => `<svg viewBox="0 0 90 100"><g stroke="${ink()}" stroke-width="1.6" stroke-linejoin="round"><path d="M45 8L15 50l30 12z" fill="${F()[3]}"/><path d="M45 8l30 42-30 12z" fill="${F()[1]}"/><path d="M15 50l30 42 0-30z" fill="${F()[0]}"/><path d="M75 50L45 92V62z" fill="${F()[2]}"/></g></svg>`,
};
export function figSVG(name) {
  if (!name) return '';
  if (name.startsWith('cells:')) return cellsSVG(JSON.parse(name.slice(6)), Array(6).fill(tok('quiz-paper')));
  return (FIGS[name] || FIGS.box)();
}
