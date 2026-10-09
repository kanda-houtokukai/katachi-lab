// 思い出し問題・ずかん・カードに使う小さな図（SVG）。色は tokens.css から読む。
import { tok, faceColors } from './theme.js';
import { monoFig, pourFig } from '../parts/_mono.js';   // H4 かさ・おもさ：物の絵（mono:）・ますの注ぎ方（pour:）

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
export function sceneIcon(id) {
  const k = n => tok(n), I = k('ink');
  const body = {
    wake: `<circle cx="20" cy="26" r="9" fill="${k('sun')}"/><path d="M4 30h32" stroke="${I}" stroke-width="2.5"/><path d="M20 8v5M8 14l3 3M32 14l-3 3" stroke="${k('yamabuki')}" stroke-width="2.5" stroke-linecap="round"/>`,
    breakfast: `<path d="M6 20h28a14 12 0 0 1-28 0z" fill="${k('paper')}" stroke="${I}" stroke-width="2"/><circle cx="20" cy="16" r="5" fill="${k('face-2')}"/><path d="M14 10q2-4 0-7M24 10q2-4 0-7" stroke="${k('ink-soft')}" stroke-width="1.6" fill="none"/>`,
    school: `<rect x="8" y="10" width="24" height="24" rx="5" fill="${k('face-1')}" stroke="${I}" stroke-width="2"/><path d="M14 10v-3h12v3" fill="none" stroke="${I}" stroke-width="2"/><rect x="14" y="17" width="12" height="6" rx="2" fill="${k('paper')}"/>`,
    lunch: `<rect x="5" y="14" width="30" height="18" rx="4" fill="${k('face-4')}" stroke="${I}" stroke-width="2"/><circle cx="13" cy="23" r="4" fill="${k('paper')}"/><rect x="20" y="19" width="10" height="8" rx="2" fill="${k('face-3')}"/>`,
    snack: `<circle cx="20" cy="21" r="12" fill="${k('wood')}" stroke="${I}" stroke-width="2"/><circle cx="15" cy="18" r="1.8" fill="${k('wood-dark')}"/><circle cx="24" cy="24" r="1.8" fill="${k('wood-dark')}"/><circle cx="22" cy="15" r="1.5" fill="${k('wood-dark')}"/>`,
    dinner: `<ellipse cx="20" cy="26" rx="15" ry="6" fill="${k('paper')}" stroke="${I}" stroke-width="2"/><path d="M10 25q10-12 20 0z" fill="${k('face-1')}"/><path d="M32 6v14M35 6v14" stroke="${k('ink-soft')}" stroke-width="1.8"/>`,
    bath: `<path d="M5 18h30v8a8 8 0 0 1-8 8H13a8 8 0 0 1-8-8z" fill="${k('water')}" stroke="${I}" stroke-width="2"/><circle cx="14" cy="12" r="3" fill="none" stroke="${k('water-deep')}" stroke-width="1.6"/><circle cx="22" cy="8" r="2.4" fill="none" stroke="${k('water-deep')}" stroke-width="1.6"/>`,
    sleep: `<path d="M26 8a12 12 0 1 0 6 18 10 10 0 0 1-6-18z" fill="${k('moon')}" stroke="${I}" stroke-width="2"/><path d="M8 10h5l-5 6h5" fill="none" stroke="${k('sora')}" stroke-width="1.8"/>`,
  }[id] || '';
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
}

// 走る物の小さな絵（S5 かけっこ・はやさ ずかん）。右向き。人は顔のない簡単な形（run-02 §5）
export function racerIcon(id) {
  const k = n => tok(n), I = k('ink');
  const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k('paper')}" stroke="${I}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="1.4" fill="${I}"/>`;
  const body = {
    aruku: `<circle cx="20" cy="8" r="4.5" fill="${k('face-4')}"/><path d="M20 13v13" stroke="${k('face-4')}" stroke-width="6" stroke-linecap="round"/><path d="M19 26l-5 10M21 26l5 10M20 17l-6 6M20 17l6 5" stroke="${I}" stroke-width="2.6" stroke-linecap="round"/>`,
    hashiru: `<circle cx="24" cy="8" r="4.5" fill="${k('face-1')}"/><path d="M22 13l-4 12" stroke="${k('face-1')}" stroke-width="6" stroke-linecap="round"/><path d="M18 25l-9 6M18 25l8 4 2 7M21 16l-9 2M21 16l7 5" stroke="${I}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
    jitensha: `${wheel(9, 29, 7)}${wheel(31, 29, 7)}<path d="M9 29l8-11h11l3 11M17 18l4 11h-12M28 18l-1-4h4" fill="none" stroke="${k('face-3')}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="20" cy="8" r="3.6" fill="${k('face-4')}"/><path d="M19 12l-2 6" stroke="${k('face-4')}" stroke-width="4" stroke-linecap="round"/>`,
    uma: `<ellipse cx="18" cy="20" rx="12" ry="6" fill="${k('wood')}" stroke="${I}" stroke-width="1.6"/><path d="M27 17l6-9 4 2-3 6" fill="${k('wood')}" stroke="${I}" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 25l-2 11M15 25l1 11M23 25l-1 11M27 24l3 11" stroke="${k('wood-deep')}" stroke-width="2.4" stroke-linecap="round"/><path d="M6 18q-4 2-3 9" stroke="${k('wood-dark')}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    kuruma: `<path d="M3 26v-6l5-1 5-7h13l6 7 5 1v6z" fill="${k('face-1')}" stroke="${I}" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 14h10l4 5H12z" fill="${k('glass')}"/>${wheel(11, 28, 5)}${wheel(30, 28, 5)}`,
    densha: `<rect x="2" y="10" width="36" height="18" rx="5" fill="${k('face-3')}" stroke="${I}" stroke-width="1.8"/><rect x="6" y="14" width="7" height="6" rx="1.5" fill="${k('glass')}"/><rect x="16" y="14" width="7" height="6" rx="1.5" fill="${k('glass')}"/><rect x="26" y="14" width="8" height="6" rx="1.5" fill="${k('glass')}"/><path d="M16 10l4-5h4" stroke="${I}" stroke-width="1.6" fill="none"/>${wheel(10, 30, 3.5)}${wheel(30, 30, 3.5)}`,
    cheetah: `<ellipse cx="19" cy="20" rx="13" ry="5" fill="${k('yamabuki')}" stroke="${I}" stroke-width="1.6"/><circle cx="33" cy="16" r="4.5" fill="${k('yamabuki')}" stroke="${I}" stroke-width="1.6"/><path d="M9 24l-5 9M14 24l2 10M24 24l-2 10M28 23l5 9" stroke="${k('wood-deep')}" stroke-width="2.2" stroke-linecap="round"/><path d="M6 19q-5-1-5-8" stroke="${k('yamabuki')}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="14" cy="19" r="1.3" fill="${I}"/><circle cx="20" cy="21" r="1.3" fill="${I}"/><circle cx="25" cy="18" r="1.3" fill="${I}"/>`,
    hikouki: `<path d="M3 21q0-4 6-4h22q7 0 7 4t-7 4H9q-6 0-6-4z" fill="${k('paper')}" stroke="${I}" stroke-width="1.8"/><path d="M16 17l6-10h4l-3 10zM16 25l6 9h4l-3-9zM4 18l-1-8h4l4 7" fill="${k('face-4')}" stroke="${I}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="33" cy="20" r="1.4" fill="${k('glass-line')}"/>`,
  }[id] || '';
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
}

// 量の図（ずかん・思い出し問題）。clock:H:M ／ masu:dL ／ scale:g:秤量 ／ ruler:mm ／ rect:たて:よこ ／ route:[[x,y],...] ／ angle:度 ／ sector:度 ／ bar:値:最大
const pol = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
const QFIGS = {
  clock(h, m) {
    h = +h; m = +m; const cx = 50, cy = 50, R = 44, I = ink();
    let s = `<svg viewBox="0 0 100 100"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${tok('paper')}" stroke="${I}" stroke-width="3"/>`;
    for (let i = 0; i < 60; i++) { const big = i % 5 === 0, [x1, y1] = pol(cx, cy, R - 2, i * 6), [x2, y2] = pol(cx, cy, R - (big ? 8 : 5), i * 6); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${I}" stroke-width="${big ? 2 : 0.8}"/>`; }
    for (let k = 1; k <= 12; k++) { const [x, y] = pol(cx, cy, R * 0.68, k * 30); s += `<text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${I}" font-family="Zen Maru Gothic,sans-serif">${k}</text>`; }
    const [hx, hy] = pol(cx, cy, R * 0.5, ((h % 12) + m / 60) * 30), [mx, my] = pol(cx, cy, R * 0.8, m * 6);
    s += `<line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${tok('ok')}" stroke-width="5.5" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="${tok('sora')}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="${I}"/></svg>`;
    return s;
  },
  masu(dl) {
    dl = +dl; const L = Math.floor(dl / 10), r = dl % 10, n = L + (r ? 1 : 0) || 1, w = 34, g = 8, W = n * (w + g) + g;
    let s = `<svg viewBox="0 0 ${W} 70">`;
    for (let i = 0; i < n; i++) {
      const x = g + i * (w + g), f = i < L ? 1 : r / 10, top = 8, hh = 54;
      s += `<rect x="${x}" y="${top + hh * (1 - f)}" width="${w}" height="${hh * f}" fill="${tok('water')}"/><path d="M${x} ${top}V${top + hh}H${x + w}V${top}" fill="none" stroke="${tok('water-deep')}" stroke-width="2.4"/>`;
      if (i >= L) for (let k = 1; k < 10; k++) s += `<line x1="${x + w - 7}" y1="${top + hh * k / 10}" x2="${x + w}" y2="${top + hh * k / 10}" stroke="${tok('water-deep')}" stroke-width="1"/>`;
    }
    return s + '</svg>';
  },
  scale(g, cap) {
    g = +g; cap = +cap || 1000; const cx = 50, cy = 56, R = 36, I = ink(), a = Math.min(1.03, g / cap) * 360;
    let s = `<svg viewBox="0 0 100 100"><rect x="10" y="18" width="80" height="78" rx="14" fill="${tok('yamabuki')}" stroke="${tok('hint')}" stroke-width="2"/><rect x="18" y="6" width="64" height="9" rx="4" fill="${tok('metal')}" stroke="${tok('metal-deep')}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="${tok('paper')}" stroke="${tok('hint')}" stroke-width="1.5"/>`;
    for (let i = 0; i < 20; i++) { const [x1, y1] = pol(cx, cy, R - 2, i * 18), [x2, y2] = pol(cx, cy, R - (i % 2 ? 5 : 9), i * 18); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${I}" stroke-width="${i % 2 ? 0.8 : 1.6}"/>`; }
    const [nx, ny] = pol(cx, cy, R - 6, a);
    return s + `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${tok('ok')}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="3" fill="${I}"/></svg>`;
  },
  ruler(mm) {
    mm = +mm; const span = Math.max(50, Math.ceil(mm / 10) * 10 + 10), W = 120, k = (W - 10) / span, I = ink();
    let s = `<svg viewBox="0 0 ${W} 50"><rect x="2" y="24" width="${W - 4}" height="22" rx="3" fill="${tok('ruler')}" stroke="${tok('ruler-edge')}" stroke-width="1.5"/>`;
    for (let i = 0; i <= span; i += span > 200 ? 10 : 1) { const x = 5 + i * k, big = i % 10 === 0, mid = i % 5 === 0; if (span > 200 && !big) continue; s += `<line x1="${x.toFixed(1)}" y1="24" x2="${x.toFixed(1)}" y2="${24 + (big ? 9 : mid ? 6 : 4)}" stroke="${I}" stroke-width="${big ? 1.2 : 0.6}"/>`; }
    return s + `<rect x="5" y="9" width="${(mm * k).toFixed(1)}" height="10" rx="3" fill="${tok('face-1')}"/></svg>`;
  },
  rect(h, w) {
    h = +h; w = +w; const u = Math.min(100 / w, 70 / h), I = ink();
    let s = `<svg viewBox="0 0 ${(w * u + 4).toFixed(1)} ${(h * u + 4).toFixed(1)}"><rect x="2" y="2" width="${(w * u).toFixed(1)}" height="${(h * u).toFixed(1)}" fill="${tok('cell-a')}" fill-opacity=".35" stroke="${I}" stroke-width="1.6"/>`;
    if (u >= 3) { for (let i = 1; i < w; i++) s += `<line x1="${(2 + i * u).toFixed(1)}" y1="2" x2="${(2 + i * u).toFixed(1)}" y2="${(2 + h * u).toFixed(1)}" stroke="${I}" stroke-width=".5" opacity=".5"/>`; for (let j = 1; j < h; j++) s += `<line x1="2" y1="${(2 + j * u).toFixed(1)}" x2="${(2 + w * u).toFixed(1)}" y2="${(2 + j * u).toFixed(1)}" stroke="${I}" stroke-width=".5" opacity=".5"/>`; }
    return s + '</svg>';
  },
  route(pts) {
    const P = JSON.parse(pts), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(1, Math.max(...xs) - x0), hh = Math.max(1, Math.max(...ys) - y0), k = Math.min(100 / w, 70 / hh);
    const q = P.map(([x, y]) => [(6 + (x - x0) * k).toFixed(1), (6 + (y - y0) * k).toFixed(1)]);
    return `<svg viewBox="0 0 ${(w * k + 12).toFixed(1)} ${(hh * k + 12).toFixed(1)}"><polyline points="${q.map(p => p.join(',')).join(' ')}" fill="none" stroke="${tok('face-1')}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>${q.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 0 || i === q.length - 1 ? 5 : 3}" fill="${i === 0 ? tok('mat') : tok('paper')}" stroke="${ink()}" stroke-width="1.5"/>`).join('')}</svg>`;
  },
  angle(deg) {
    deg = +deg; const cx = 20, cy = 70, R = 60, a = deg * Math.PI / 180, x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
    const big = deg > 180 ? 1 : 0, ax = cx + 18 * Math.cos(a), ay = cy - 18 * Math.sin(a);
    return `<svg viewBox="-50 -0 140 100"><path d="M${cx + 18} ${cy}A18 18 0 ${big} 0 ${ax.toFixed(1)} ${ay.toFixed(1)}" fill="none" stroke="${tok('ok')}" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${ink()}" stroke-width="3" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${ink()}" stroke-width="3" stroke-linecap="round"/></svg>`;
  },
  sector(deg) {
    deg = +deg; const cx = 50, cy = 50, R = 42, [x1, y1] = pol(cx, cy, R, 0), [x2, y2] = pol(cx, cy, R, deg);
    return `<svg viewBox="0 0 100 100"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${tok('line')}" stroke-width="2" stroke-dasharray="3 3"/><path d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z" fill="${tok('face-2')}" stroke="${ink()}" stroke-width="2"/></svg>`;
  },
  scene(id) { return sceneIcon(id); },
  // en:直径(cm)：円と直径、その下に のばした円周（直径の3つ分と すこし）
  en(d) {
    const I = ink(), R = 24, cx = 30, cy = 30, L = Math.PI * 2 * R / 3.2;
    let s = `<svg viewBox="0 0 130 74"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${tok('face-4')}" fill-opacity=".25" stroke="${I}" stroke-width="2"/><line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${tok('ok')}" stroke-width="2.5"/>`;
    s += `<rect x="62" y="22" width="${(L).toFixed(1)}" height="6" rx="3" fill="${tok('face-4')}"/>`;
    for (let k = 0; k < 3; k++) s += `<rect x="${(62 + k * 2 * R / 3.2).toFixed(1)}" y="32" width="${(2 * R / 3.2 - 1.5).toFixed(1)}" height="5" rx="2" fill="${tok('ok')}"/>`;
    return s + `<text x="96" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="${I}" font-family="Zen Maru Gothic,sans-serif">${+d >= 100 ? (+d / 100) + 'm' : d + 'cm'}</text></svg>`;
  },
  racer(id) { return racerIcon(id); },
  // H4：物の絵（mono:apple*2+carrot ・ mono:cont:suito）・1Lます x かい＋1dLます y かい（pour:x:y）
  mono: (...a) => monoFig(a.join(':')),
  pour: (x, y) => pourFig(x, y),
  // 長さの組（N2m「1m を つくる」）：segs:300,300,300,100 → 合計を はばいっぱいに、色をかえて ならべる
  segs(list) { const v = String(list).split(',').map(Number).filter(x => x > 0), tot = v.reduce((a, b) => a + b, 0) || 1, cols = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5', 'face-6']; let x = 4; return `<svg viewBox="0 0 120 30"><rect x="3" y="8" width="114" height="14" rx="3" fill="${tok('paper-2')}" stroke="${tok('line')}"/>${v.map((w, i) => { const ww = 112 * w / tot, s = `<rect x="${x.toFixed(1)}" y="9" width="${Math.max(0.5, ww - 0.6).toFixed(1)}" height="12" rx="1.5" fill="${tok(cols[i % 6])}"/>`; x += ww; return s; }).join('')}</svg>`; },
  bar(v, mx) { v = +v; mx = +mx || 100; return `<svg viewBox="0 0 120 30"><rect x="4" y="9" width="112" height="12" rx="6" fill="${tok('paper-2')}" stroke="${tok('line')}"/><rect x="4" y="9" width="${(112 * Math.min(1, v / mx)).toFixed(1)}" height="12" rx="6" fill="${tok('sora')}"/></svg>`; },
};
export function figSVG(name) {
  if (!name) return '';
  if (name.startsWith('cells:')) return cellsSVG(JSON.parse(name.slice(6)), Array(6).fill(tok('quiz-paper')));
  const i = name.indexOf(':');
  if (i > 0 && QFIGS[name.slice(0, i)]) { const k = name.slice(0, i), rest = name.slice(i + 1); return k === 'route' ? QFIGS.route(rest) : QFIGS[k](...rest.split(':')); }
  return (FIGS[name] || FIGS.box)();
}
