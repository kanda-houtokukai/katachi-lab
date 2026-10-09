// ながさの部品で共通に使う 2D の絵（物・ものさし・ひも・はみ出た分の光）。色は tokens.css から（C()）。
// 物は「左はし x・下の線 yb・長さ L（px）・太さ h（px）」で横向きに描く。形と色だけ（商品名・商標は描かない）。
import { el, C, rect, line, circle, path, txt, clamp, lerp, tween, E } from './_flat.js';
import { tickX, RULER_PAD } from './_nagasa-gen.js';

export const NAMES = {
  pencil: 'えんぴつ', red: 'あかい えんぴつ', blue: 'あおい えんぴつ', crayon: 'ふとい クレヨン', eraser: 'けしごむ', clip: 'クリップ', block: 'ブロック', coin: '1えんだま',
  card: 'カード', hagaki: 'はがき', 'hagaki-w': 'はがき', notebook: 'ノート', tissue: 'ティッシュの はこ', ruler30: '30cmものさし', desk: 'つくえ', string: 'ひも',
  straw: 'ストロー', stick: 'ぼう', ribbon: 'リボン', tape: 'テープ', spoon: 'スプーン', chopsticks: 'はし', book: 'ほん', leaf: 'はっぱ', shoe: 'くつ', ruler1m: '1mものさし', paper: 'かみテープ',
};
// 太さ／長さ（既定）。呼ぶ側が h をわたせば そちらを使う
const TH = { pencil: 0.05, red: 0.05, blue: 0.05, crayon: 0.26, eraser: 0.34, clip: 0.3, block: 0.42, coin: 1, card: 0.63, hagaki: 0.68, 'hagaki-w': 0.5, notebook: 0.7, tissue: 0.48, ruler30: 0.1, desk: 0.5, string: 0.03, straw: 0.05, stick: 0.12, ribbon: 0.07, tape: 0.12, spoon: 0.2, chopsticks: 0.03, book: 0.7, leaf: 0.5, shoe: 0.4, paper: 0.12 };
export const thOf = (id, L) => Math.max(5, L * (TH[id] ?? 0.12));

// 物を描く（g の中に新しい g を作って返す）
export function thing(parent, id, x, yb, L, o = {}) {
  const g = el('g', { 'data-thing': id }, parent);
  const h = o.h ?? thOf(id, L), y = yb - h, I = C('ink'), sw = o.sw ?? 1.6;
  L = Math.max(1, L);
  switch (id) {
    case 'pencil': case 'red': case 'blue': {
      const body = id === 'red' ? C('face-1') : id === 'blue' ? C('face-4') : (o.color || C('yamabuki')), tip = Math.min(L * 0.18, h * 3.2);
      rect(g, x, y, L - tip, h, { fill: body, stroke: I, 'stroke-width': sw * 0.7 });
      rect(g, x, y + h * 0.36, L - tip, h * 0.26, { fill: C('paper'), opacity: 0.35 });
      path(g, `M${x + L - tip},${y}L${x + L - tip * 0.28},${y + h * 0.36}V${y + h * 0.64}L${x + L - tip},${yb}Z`, { fill: C('wood-pale'), stroke: I, 'stroke-width': sw * 0.6 });
      path(g, `M${x + L - tip * 0.28},${y + h * 0.36}L${x + L},${y + h / 2}L${x + L - tip * 0.28},${y + h * 0.64}Z`, { fill: id === 'pencil' ? I : body });
      break;
    }
    case 'crayon': {
      const tip = Math.min(L * 0.2, h * 0.9);
      rect(g, x, y, L - tip, h, { rx: h * 0.18, fill: o.color || C('face-3'), stroke: I, 'stroke-width': sw });
      rect(g, x + (L - tip) * 0.2, y + 1, (L - tip) * 0.55, h - 2, { fill: C('paper'), opacity: 0.55 });
      path(g, `M${x + L - tip},${y + h * 0.1}L${x + L},${y + h * 0.4}V${y + h * 0.6}L${x + L - tip},${y + h * 0.9}Z`, { fill: o.color || C('face-3'), stroke: I, 'stroke-width': sw * 0.8 });
      break;
    }
    case 'eraser':
      rect(g, x, y, L, h, { rx: Math.min(4, h * 0.2), fill: C('paper'), stroke: C('ink-soft'), 'stroke-width': sw });
      rect(g, x + L * 0.32, y - 1, L * 0.5, h + 2, { fill: o.color || C('face-4') });
      break;
    case 'clip': {
      const r = h / 2, s = Math.max(1.5, h * 0.16);
      path(g, `M${x + L - r},${y}H${x + r}a${r},${r} 0 0,0 0,${h}H${x + L - r * 1.4}a${r * 0.7},${r * 0.7} 0 0,0 0,${-h * 0.7}H${x + r * 1.8}`, { fill: 'none', stroke: o.color || C('metal-deep'), 'stroke-width': s, 'stroke-linecap': 'round' });
      break;
    }
    case 'block': {
      const n = Math.max(1, Math.round(L / h * 0.9)), bw = L / n;
      rect(g, x, y + h * 0.2, L, h * 0.8, { rx: 2, fill: o.color || C('face-1'), stroke: I, 'stroke-width': sw });
      for (let k = 0; k < n; k++) rect(g, x + bw * (k + 0.22), y, bw * 0.56, h * 0.24, { rx: 1.5, fill: o.color || C('face-1'), stroke: I, 'stroke-width': sw * 0.7 });
      break;
    }
    case 'coin':
      circle(g, x + L / 2, yb - L / 2, L / 2, { fill: C('coin'), stroke: C('coin-line'), 'stroke-width': sw });
      circle(g, x + L / 2, yb - L / 2, L * 0.36, { fill: 'none', stroke: C('coin-line'), 'stroke-width': 1, opacity: 0.6 });
      break;
    case 'card':
      rect(g, x, y, L, h, { rx: Math.min(6, L * 0.04), fill: o.color || C('sora-soft'), stroke: I, 'stroke-width': sw });
      rect(g, x + L * 0.1, y + h * 0.3, L * 0.18, h * 0.22, { rx: 2, fill: C('yamabuki') });
      break;
    case 'hagaki': case 'hagaki-w':
      rect(g, x, y, L, h, { fill: C('paper'), stroke: C('ink-soft'), 'stroke-width': sw });
      rect(g, x + L * 0.78, y + h * 0.1, L * 0.14, h * 0.24, { fill: 'none', stroke: C('ok'), 'stroke-width': 1.2 });
      for (let k = 1; k <= 3; k++) line(g, x + L * 0.12, y + h * (0.35 + k * 0.15), x + L * 0.6, y + h * (0.35 + k * 0.15), { stroke: C('line'), 'stroke-width': 1.2 });
      break;
    case 'notebook': case 'book':
      rect(g, x, y, L, h, { rx: 3, fill: o.color || (id === 'book' ? C('face-5') : C('face-3')), stroke: I, 'stroke-width': sw });
      rect(g, x, y, Math.max(3, L * 0.07), h, { fill: C('ink'), opacity: 0.35 });
      rect(g, x + L * 0.25, y + h * 0.18, L * 0.5, h * 0.22, { rx: 2, fill: C('paper') });
      break;
    case 'tissue':
      rect(g, x, y, L, h, { rx: 3, fill: C('face-6'), stroke: I, 'stroke-width': sw });
      path(g, `M${x + L * 0.3},${y + h * 0.15}h${L * 0.4}v${h * 0.12}h${-L * 0.4}Z`, { fill: C('paper'), stroke: C('ink-soft'), 'stroke-width': 1 });
      path(g, `M${x + L * 0.42},${y + h * 0.16}q${L * 0.08},${-h * 0.5} ${L * 0.16},0`, { fill: C('paper'), stroke: C('ink-soft'), 'stroke-width': 1 });
      break;
    case 'ruler30': case 'ruler1m': {
      rect(g, x, y, L, h, { rx: 2, fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': sw });
      const n = id === 'ruler30' ? 30 : 100, st = n > 40 ? 10 : 1;
      for (let k = 0; k <= n; k += st) { const xx = x + L * (0.02 + 0.96 * k / n); line(g, xx, y, xx, y + h * (k % (st * 5) === 0 ? 0.55 : 0.32), { stroke: C('wood-dark'), 'stroke-width': 0.9 }); }
      break;
    }
    case 'desk': {
      const top = Math.max(4, h * 0.16);
      rect(g, x, y, L, top, { rx: 2, fill: C('wood'), stroke: C('wood-deep'), 'stroke-width': sw });
      rect(g, x + L * 0.05, y + top, Math.max(3, L * 0.05), h - top, { fill: C('metal-deep') });
      rect(g, x + L * 0.9, y + top, Math.max(3, L * 0.05), h - top, { fill: C('metal-deep') });
      rect(g, x + L * 0.12, y + top, L * 0.5, h * 0.28, { fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 1 });
      break;
    }
    case 'string':
      line(g, x, yb - h / 2, x + L, yb - h / 2, { stroke: o.color || C('face-5'), 'stroke-width': Math.max(3, h) });
      break;
    case 'straw':
      rect(g, x, y, L, h, { rx: h / 2, fill: C('paper'), stroke: o.color || C('face-6'), 'stroke-width': sw });
      for (let k = 0.15; k < 1; k += 0.2) line(g, x + L * k, y + 1, x + L * k + h * 0.6, yb - 1, { stroke: o.color || C('face-6'), 'stroke-width': 1.6 });
      break;
    case 'stick': case 'chopsticks':
      rect(g, x, y, L, h, { rx: h / 2, fill: o.color || C('wood'), stroke: C('wood-deep'), 'stroke-width': sw });
      break;
    case 'ribbon':
      rect(g, x, y, L, h, { fill: o.color || C('face-6'), stroke: C('ink-soft'), 'stroke-width': 1 });
      break;
    case 'spoon':
      rect(g, x, yb - h * 0.6, L * 0.68, h * 0.22, { rx: h * 0.1, fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 1 });
      el('ellipse', { cx: x + L * 0.84, cy: yb - h * 0.5, rx: L * 0.16, ry: h * 0.5, fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 1.2 }, g);
      break;
    case 'leaf':
      path(g, `M${x},${yb - h / 2}Q${x + L * 0.5},${y - h * 0.3} ${x + L},${yb - h / 2}Q${x + L * 0.5},${yb + h * 0.3} ${x},${yb - h / 2}Z`, { fill: C('leaf'), stroke: I, 'stroke-width': sw * 0.7 });
      line(g, x, yb - h / 2, x + L * 0.95, yb - h / 2, { stroke: C('paper'), 'stroke-width': 1, opacity: 0.6 });
      break;
    case 'shoe':
      path(g, `M${x},${yb}V${y + h * 0.3}Q${x + L * 0.05},${y} ${x + L * 0.35},${y + h * 0.1}L${x + L * 0.55},${y + h * 0.45}Q${x + L},${y + h * 0.5} ${x + L},${yb - h * 0.15}V${yb}Z`, { fill: o.color || C('face-4'), stroke: I, 'stroke-width': sw });
      rect(g, x, yb - h * 0.18, L, h * 0.18, { fill: C('paper'), stroke: I, 'stroke-width': 1 });
      break;
    default:   // tape・paper
      rect(g, x, y, L, h, { rx: Math.min(2, h * 0.2), fill: o.color || C('tape'), stroke: o.line || C('tape-line'), 'stroke-width': 1.2 });
  }
  return g;
}
// 物の絵だけの小さな SVG（棚のボタン・選択肢に使う）
export function thingIcon(id, w = 44, h = 22, o = {}) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('aria-hidden', 'true');
  const L = id === 'coin' ? h - 4 : w - 4, th = Math.min(h - 4, o.h ?? thOf(id, L));
  thing(svg, id, id === 'coin' ? (w - L) / 2 : 2, h - 2 - (h - 4 - th) / 2, L, Object.assign({ h: th, sw: 1.2 }, o));
  return svg.outerHTML;
}
// 色の見本（選択肢の「あか」「あお」）
export const swatch = tokName => `<span class="sw" style="display:inline-block;width:18px;height:18px;border-radius:5px;vertical-align:-3px;margin-right:4px;background:var(--${tokName})"></span>`;

// ものさし（上のへりに目もり）。x は ものさしの左はし、y は上のへり。cm は目もりの数。ppm は 1mm あたりの px。
// cut：左はしが欠けた ものさし（はじめの cut cm がない）。返り値の zeroX は 0 の目もりの x、xOf(mm) は mm の目もりの x
export function ruler(parent, { x, y, cm, ppm, h, cut = 0, unit = 'cm', mm = true, labelSize } = {}) {
  const g = el('g', { 'data-ruler': '' }, parent), pad = RULER_PAD;
  h = h ?? Math.max(40, 13 * ppm);
  const x0 = x - cut * 10 * ppm, w = (cm * 10 + pad * 2) * ppm - cut * 10 * ppm;
  if (cut) path(g, `M${x},${y}H${x + w}V${y + h}H${x}l${-3},${-h * 0.2}l${6},${-h * 0.2}l${-6},${-h * 0.25}l${5},${-h * 0.2}Z`, { fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 2 });
  else rect(g, x, y, w, h, { rx: 4, fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 2 });
  rect(g, x + 2, y + h * 0.74, Math.max(0, w - 4), h * 0.24, { rx: 3, fill: C('wood'), opacity: 0.35 });
  const fs = labelSize ?? clamp(ppm * 3.1, 11, 22);
  for (let i = cut * 10; i <= cm * 10; i++) {
    const big = i % 10 === 0, half = i % 5 === 0;
    if (!big && !half && !mm) continue;
    if (!big && ppm < 2.2 && !half) continue;   // 小さすぎる画面では mm を省く
    const xx = tickX(x0, ppm, i, pad), L = big ? h * 0.48 : half ? h * 0.34 : h * 0.22;
    line(g, xx, y, xx, y + L, { stroke: C('wood-dark'), 'stroke-width': big ? 1.6 : 1, 'stroke-linecap': 'butt' });
    if (big) txt(g, xx, y + h * 0.48 + fs * 0.95, String(i / 10), { 'font-size': fs, fill: C('wood-dark'), class: 'ui' });
  }
  if (unit) txt(g, x + w - 6, y + h - 6, unit, { 'font-size': Math.max(10, fs * 0.6), fill: C('wood-deep'), class: 'ui', 'text-anchor': 'end' });
  return { g, x, y, w, h, zeroX: tickX(x0, ppm, 0, pad), xOf: mmv => tickX(x0, ppm, mmv, pad) };
}

// まがった ひも：長さ T を n 本の短い線でつなぐ。k=0 で まがり、k=1 で まっすぐ（どの k でも長さは T のまま）
export function stringPts(x, y, T, k = 0, { n = 28, amp = 0.9, waves = 2.2, phase = 0 } = {}) {
  const seg = T / n, pts = [[x, y]]; let px = x, py = y;
  for (let i = 0; i < n; i++) { const th = amp * Math.sin((i + 0.5) / n * Math.PI * 2 * waves + phase) * (1 - k); px += seg * Math.cos(th); py += seg * Math.sin(th); pts.push([px, py]); }
  return pts;
}
export const spanOf = pts => pts[pts.length - 1][0] - pts[0][0];
export function drawString(parent, pts, o = {}) {
  return el('polyline', { points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: 'none', stroke: o.color || C('face-5'), 'stroke-width': o.w || 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
}
// はみ出た分を光らせる（x1〜x2、y〜y+h）。何回か明るくなって、薄く残る
export function overhang(parent, x1, x2, y, h, color = C('yamabuki')) {
  const g = el('g', { 'pointer-events': 'none' }, parent);
  const r = rect(g, Math.min(x1, x2) - 2, y - 3, Math.abs(x2 - x1) + 4, h + 6, { rx: 6, fill: color, opacity: 0 });
  tween(1.4, k => r.setAttribute('opacity', (0.25 + 0.4 * Math.abs(Math.sin(k * Math.PI * 3))).toFixed(3)), E.lin).then(() => { if (r.isConnected) r.setAttribute('opacity', 0.45); });
  return g;
}
// 物をなめらかに動かす（transform の translate）
export function moveTo(g, from, to, sec = 0.6, ease = E.io) {
  return tween(sec, k => g.setAttribute('transform', `translate(${lerp(from[0], to[0], ease(k)).toFixed(1)},${lerp(from[1], to[1], ease(k)).toFixed(1)})`));
}
// 小さな番号札（数える動き）
export function badge(parent, x, y, s, o = {}) {
  const g = el('g', { 'pointer-events': 'none' }, parent), r = o.r || 13;
  circle(g, x, y, r, { fill: o.fill || C('paper'), stroke: o.stroke || C('sora'), 'stroke-width': 2 });
  txt(g, x, y + r * 0.38, s, { 'font-size': r * 1.05, fill: o.color || C('sora'), class: 'ui' });
  return g;
}
// 画面に収まるかの判定（flatFit）から外す層。むしめがねは ここに置く（clip で切った中身の外接矩形が大きいため）
export function nofitLayer(F, name = 'lens') { const g = F.layer(name); g.setAttribute('data-nofit', ''); return g; }
// むしめがね：src（id のある g）の (fx,fy) を k 倍にして (x,y) の円に映す。外接矩形の判定からは外す（clip で切った中身が大きいため）
let lensN = 0;
export function lens(parent, src, { fx, fy, x, y, r, k = 3 }) {
  if (!src.id) src.id = 'nsrc' + (++lensN);
  const id = 'nlens' + (++lensN), g = el('g', { 'pointer-events': 'none', 'data-nofit': '' }, parent);
  const cp = el('clipPath', { id }, el('defs', {}, g)); circle(cp, x, y, r);
  circle(g, x, y, r + 3, { fill: C('paper') });
  el('use', { href: '#' + src.id, transform: `translate(${x},${y}) scale(${k}) translate(${-fx},${-fy})`, 'clip-path': `url(#${id})` }, g);
  circle(g, x, y, r, { fill: 'none', stroke: C('ink'), 'stroke-width': 4 });
  line(g, fx, fy, x + (fx - x) * 0, y + r * (fy > y ? 1 : -1), { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
  return g;
}
// 実寸か どうかの札（右下）。押すと「がめんの ながさ あわせ」
export function realBadge(parent, F, ok, onTap) {
  const g = el('g', { class: 'grab', 'data-k': 'calib-badge' }, parent);
  const s = ok ? 'じっすん（あわせ ずみ）' : 'じっすんでは ない（ながさ あわせ）', fs = 13, w = s.length * fs * 0.98 + 20;
  const x = F.W - w - 10, y = F.bottom - 34;
  rect(g, x, y, w, 26, { rx: 13, fill: ok ? C('pick-bg') : C('warn-bg'), stroke: ok ? C('mat') : C('warn-line'), 'stroke-width': 1.5 });
  txt(g, x + w / 2, y + 18, s, { 'font-size': fs, fill: ok ? C('mat-deep') : C('ink-soft'), class: 'ui' });
  if (onTap) g.addEventListener('pointerdown', e => { e.stopPropagation(); onTap(); });
  return { g, x, y, w, h: 26 };
}
