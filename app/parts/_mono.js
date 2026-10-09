// 物の絵（かさ・おもさ）。形と色だけで描く（商品名・商標・硬貨の実物の模様は描かない）。
// SVG の文字列を返すので、2D の舞台（<g> の innerHTML）にも、ずかん・思い出しの小さな図（figs.js の mono:・pour:）にも使える。
// 原点は物の「底のまん中」、上がマイナス。s はおよその高さ（はば）。色は tokens.css から（tok）。
import { tok } from '../core/theme.js';

const f = n => (Math.round(n * 10) / 10).toString();
const at = o => Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => `${k}="${typeof v === 'number' ? f(v) : v}"`).join(' ');
const R = (x, y, w, h, o = {}) => `<rect ${at(Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, h) }, o))}/>`;
const Ci = (cx, cy, r, o = {}) => `<circle ${at(Object.assign({ cx, cy, r: Math.max(0, r) }, o))}/>`;
const El = (cx, cy, rx, ry, o = {}) => `<ellipse ${at(Object.assign({ cx, cy, rx: Math.max(0, rx), ry: Math.max(0, ry) }, o))}/>`;
const P = (d, o = {}) => `<path ${at(Object.assign({ d }, o))}/>`;
const T = (x, y, s, size, o = {}) => `<text ${at(Object.assign({ x, y, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 700, 'font-family': 'Zen Maru Gothic,sans-serif' }, o))}>${s}</text>`;
const k = n => tok(n);

// 名前（ひらがな）。重さの値は benchmarks.json から読むので、ここには書かない
export const MONO_NAMES = {
  apple: 'りんご', egg: 'たまご', carrot: 'にんじん', banana: 'バナナ', orange: 'みかん', textbook: 'きょうかしょ', clay: 'ねんど', water1L: '1Lの みず',
  potato: 'じゃがいも', pumpkin: 'かぼちゃ', cabbage: 'キャベツ', pencil: 'えんぴつ', eraser: 'けしごむ', coin1: '1えんだま', tsumiki: 'つみき', sponge: 'スポンジ',
  ironball: 'てつの たま', bowl: 'ボウル', bicycle: 'じてんしゃ', child3: '3ねんせい', box: 'にもつ', milk200: 'ぎゅうにゅう', keicar: 'くるま', ruler30: 'ものさし', classroom: 'きょうしつ', road1km: 'みちの ひょうしき', pool: 'プール', tablet: 'くすり',
  cup: 'コップ', 'cup-s': 'ちいさい コップ', donburi: 'どんぶり', suito: 'すいとう', yakan: 'やかん', nabe: 'なべ', bucket: 'バケツ', pet500: 'ペットボトル', pet2L: 'おおきい ペットボトル', milk1L: 'ぎゅうにゅうパック',
};

// 物の絵（重さの単元）。shape：ねんどの形（0 まる・1 ぼう・2 ちぎる）
export function monoSVG(id, s, shape = 0) {
  const I = k('ink');
  switch (id) {
    case 'apple': return Ci(0, -s * 0.45, s * 0.45, { fill: k('obj-apple') }) + P(`M0,${-s * 0.86}q${s * 0.05},${-s * 0.18} ${s * 0.02},${-s * 0.24}`, { stroke: k('obj-stem'), 'stroke-width': s * 0.06, fill: 'none', 'stroke-linecap': 'round' }) + El(s * 0.15, -s * 1.0, s * 0.14, s * 0.07, { fill: k('leaf'), transform: `rotate(-25 ${f(s * 0.15)} ${f(-s)})` }) + El(-s * 0.16, -s * 0.6, s * 0.08, s * 0.12, { fill: k('paper'), opacity: 0.35 });
    case 'egg': return El(0, -s * 0.38, s * 0.3, s * 0.38, { fill: k('obj-egg'), stroke: k('obj-egg-line'), 'stroke-width': Math.max(1.5, s * 0.03) });
    case 'carrot': return P(`M${-s * 0.5},${-s * 0.22}L${s * 0.55},${-s * 0.09}L${-s * 0.5},${-s * 0.02}Q${-s * 0.62},${-s * 0.12} ${-s * 0.5},${-s * 0.22}Z`, { fill: k('obj-carrot') }) + P(`M${-s * 0.55},${-s * 0.13}l${-s * 0.25},${-s * 0.14}M${-s * 0.55},${-s * 0.12}l${-s * 0.28},${s * 0.02}M${-s * 0.55},${-s * 0.11}l${-s * 0.2},${s * 0.12}`, { stroke: k('leaf'), 'stroke-width': s * 0.06, 'stroke-linecap': 'round', fill: 'none' });
    case 'banana': return P(`M${-s * 0.5},${-s * 0.42}Q${-s * 0.3},${-s * 0.02} ${s * 0.48},${-s * 0.18}Q${s * 0.12},${-s * 0.2} ${-s * 0.42},${-s * 0.5}Z`, { fill: k('obj-banana'), stroke: k('obj-banana-line'), 'stroke-width': Math.max(1.2, s * 0.025), 'stroke-linejoin': 'round' }) + P(`M${-s * 0.5},${-s * 0.42}l${-s * 0.06},${-s * 0.06}`, { stroke: k('obj-stem'), 'stroke-width': s * 0.05, 'stroke-linecap': 'round' });
    case 'orange': return El(0, -s * 0.3, s * 0.36, s * 0.3, { fill: k('obj-orange') }) + El(0, -s * 0.58, s * 0.06, s * 0.03, { fill: k('leaf') });
    case 'textbook': return R(-s * 0.5, -s * 0.22, s, s * 0.22, { rx: 3, fill: k('obj-book') }) + R(-s * 0.46, -s * 0.18, s * 0.92, s * 0.07, { fill: k('paper'), opacity: 0.8 });
    case 'clay':
      if (shape === 1) return R(-s * 0.62, -s * 0.2, s * 1.24, s * 0.2, { rx: s * 0.1, fill: k('obj-clay') });
      if (shape === 2) return [[-0.42, 0.13], [-0.12, 0.16], [0.18, 0.12], [0.44, 0.14]].map(([x, r]) => Ci(x * s, -r * s, r * s, { fill: k('obj-clay') })).join('');
      return El(0, -s * 0.3, s * 0.34, s * 0.3, { fill: k('obj-clay') });
    case 'water1L': case 'milk1L': return P(`M${-s * 0.26},0V${-s * 0.9}l${s * 0.12},${-s * 0.14}h${s * 0.28}l${s * 0.12},${s * 0.14}V0Z`, { fill: k('paper'), stroke: k('obj-pack-line'), 'stroke-width': Math.max(1.5, s * 0.03) }) + R(-s * 0.26, -s * 0.6, s * 0.52, s * 0.28, { fill: k('water') }) + T(0, -s * 0.41, '1L', s * 0.16, { fill: k('paper') });
    case 'milk200': return P(`M${-s * 0.2},0V${-s * 0.55}l${s * 0.08},${-s * 0.1}h${s * 0.24}l${s * 0.08},${s * 0.1}V0Z`, { fill: k('paper'), stroke: k('obj-pack-line'), 'stroke-width': Math.max(1.5, s * 0.03) }) + R(-s * 0.2, -s * 0.38, s * 0.4, s * 0.18, { fill: k('water') });
    case 'potato': return El(0, -s * 0.22, s * 0.36, s * 0.22, { fill: k('obj-potato') }) + Ci(-s * 0.1, -s * 0.26, s * 0.025, { fill: k('wood-deep') }) + Ci(s * 0.14, -s * 0.18, s * 0.025, { fill: k('wood-deep') });
    case 'pumpkin': return El(0, -s * 0.34, s * 0.46, s * 0.34, { fill: k('obj-pumpkin') }) + P(`M0,${-s * 0.68}v${-s * 0.12}`, { stroke: k('obj-stem'), 'stroke-width': s * 0.07 });
    case 'cabbage': return Ci(0, -s * 0.42, s * 0.42, { fill: k('obj-cabbage') }) + P(`M${-s * 0.25},${-s * 0.6}Q0,${-s * 0.3} ${s * 0.25},${-s * 0.62}`, { stroke: k('leaf'), 'stroke-width': s * 0.04, fill: 'none' });
    case 'pencil': return R(-s * 0.5, -s * 0.08, s * 0.85, s * 0.08, { fill: k('yamabuki') }) + P(`M${s * 0.35},${-s * 0.08}l${s * 0.15},${s * 0.04}l${-s * 0.15},${s * 0.04}z`, { fill: k('wood-pale') });
    case 'eraser': return R(-s * 0.28, -s * 0.18, s * 0.56, s * 0.18, { rx: 3, fill: k('paper'), stroke: k('line'), 'stroke-width': 2 }) + R(-s * 0.12, -s * 0.19, s * 0.3, s * 0.2, { fill: k('obj-book') });
    case 'coin1': return El(0, -s * 0.1, s * 0.3, s * 0.1, { fill: k('coin'), stroke: k('coin-line'), 'stroke-width': 1.2 });
    case 'tsumiki': return R(-s * 0.22, -s * 0.44, s * 0.44, s * 0.44, { rx: 3, fill: k('obj-block'), stroke: I, 'stroke-width': 1.2 });
    case 'sponge': return R(-s * 0.55, -s * 0.7, s * 1.1, s * 0.7, { rx: s * 0.12, fill: k('obj-sponge') }) + [[-0.3, -0.5], [0.1, -0.35], [0.32, -0.55], [-0.1, -0.2], [0.35, -0.15]].map(([x, y]) => Ci(x * s, y * s, s * 0.05, { fill: k('obj-sponge-dot') })).join('');
    case 'ironball': return Ci(0, -s * 0.17, s * 0.17, { fill: k('metal-dark') }) + Ci(-s * 0.05, -s * 0.23, s * 0.05, { fill: k('paper'), opacity: 0.5 });
    case 'bowl': return P(`M${-s * 0.55},${-s * 0.42}H${s * 0.55}Q${s * 0.5},0 0,0Q${-s * 0.5},0 ${-s * 0.55},${-s * 0.42}Z`, { fill: k('metal-pale'), stroke: k('metal-deep'), 'stroke-width': Math.max(1.5, s * 0.03) });
    case 'box': return R(-s * 0.4, -s * 0.5, s * 0.8, s * 0.5, { rx: 3, fill: k('wood'), stroke: k('wood-deep'), 'stroke-width': 2 }) + P(`M${-s * 0.4},${-s * 0.32}H${s * 0.4}`, { stroke: k('wood-deep'), 'stroke-width': 2 });
    case 'child3': return Ci(0, -s * 0.86, s * 0.13, { fill: k('obj-child') }) + P(`M${-s * 0.2},0V${-s * 0.42}Q${-s * 0.2},${-s * 0.7} 0,${-s * 0.7}Q${s * 0.2},${-s * 0.7} ${s * 0.2},${-s * 0.42}V0Z`, { fill: k('obj-child') });
    case 'bicycle': return Ci(-s * 0.36, -s * 0.24, s * 0.22, { fill: 'none', stroke: I, 'stroke-width': Math.max(2, s * 0.04) }) + Ci(s * 0.36, -s * 0.24, s * 0.22, { fill: 'none', stroke: I, 'stroke-width': Math.max(2, s * 0.04) }) + P(`M${-s * 0.36},${-s * 0.24}L${-s * 0.1},${-s * 0.56}H${s * 0.22}L${s * 0.36},${-s * 0.24}M${-s * 0.1},${-s * 0.56}L${s * 0.04},${-s * 0.24}L${s * 0.22},${-s * 0.56}M${-s * 0.16},${-s * 0.66}h${s * 0.14}M${s * 0.22},${-s * 0.56}l${s * 0.02},${-s * 0.14}h${s * 0.1}`, { fill: 'none', stroke: k('face-1'), 'stroke-width': Math.max(2, s * 0.045), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    case 'ruler30': return `<rect x="${-s * 0.6}" y="${-s * 0.18}" width="${s * 1.2}" height="${s * 0.18}" rx="2" fill="${tok('ruler')}" stroke="${tok('ruler-edge')}" stroke-width="2"/>` + Array.from({ length: 13 }, (_, i) => `<line x1="${-s * 0.55 + i * s * 0.092}" y1="${-s * 0.18}" x2="${-s * 0.55 + i * s * 0.092}" y2="${-s * (i % 5 ? 0.12 : 0.08)}" stroke="${tok('ink')}" stroke-width="1"/>`).join('');
    case 'classroom': return `<rect x="${-s * 0.55}" y="${-s * 0.6}" width="${s * 1.1}" height="${s * 0.6}" fill="${tok('house')}" stroke="${tok('ink-soft')}" stroke-width="2"/><rect x="${-s * 0.4}" y="${-s * 0.5}" width="${s * 0.5}" height="${s * 0.22}" fill="${tok('mat')}"/><path d="M${-s * 0.55},${-s * 0.02}H${s * 0.55}" stroke="${tok('face-1')}" stroke-width="3"/>`;
    case 'road1km': return `<rect x="-2" y="${-s * 0.9}" width="4" height="${s * 0.9}" fill="${tok('metal-deep')}"/><rect x="${-s * 0.5}" y="${-s * 0.95}" width="${s}" height="${s * 0.45}" rx="5" fill="${tok('sora')}"/><path d="M${-s * 0.3},${-s * 0.72}H${s * 0.3}l${-s * 0.1},${-s * 0.08}M${s * 0.3},${-s * 0.72}l${-s * 0.1},${s * 0.08}" stroke="${tok('paper')}" stroke-width="3" fill="none"/>`;
    case 'pool': return `<rect x="${-s * 0.6}" y="${-s * 0.32}" width="${s * 1.2}" height="${s * 0.32}" rx="4" fill="${tok('water')}" stroke="${tok('water-deep')}" stroke-width="2"/>` + [0.2, 0.4, 0.6, 0.8].map(t => `<path d="M${-s * 0.6 + s * 1.2 * t},${-s * 0.3}V0" stroke="${tok('paper')}" stroke-width="1.5" stroke-dasharray="3 3"/>`).join('');
    case 'tablet': return `<rect x="${-s * 0.4}" y="${-s * 0.5}" width="${s * 0.8}" height="${s * 0.5}" rx="4" fill="${tok('paper')}" stroke="${tok('line')}" stroke-width="2"/><rect x="${-s * 0.4}" y="${-s * 0.5}" width="${s * 0.8}" height="${s * 0.12}" fill="${tok('face-6')}"/><ellipse cx="${s * 0.5}" cy="${-s * 0.08}" rx="${s * 0.1}" ry="${s * 0.06}" fill="${tok('face-6')}"/>`;
    case 'keicar': return R(-s * 0.6, -s * 0.42, s * 1.2, s * 0.3, { rx: s * 0.08, fill: k('face-4') }) + P(`M${-s * 0.36},${-s * 0.42}L${-s * 0.24},${-s * 0.66}H${s * 0.3}L${s * 0.42},${-s * 0.42}Z`, { fill: k('face-4') }) + Ci(-s * 0.32, -s * 0.12, s * 0.12, { fill: I }) + Ci(s * 0.32, -s * 0.12, s * 0.12, { fill: I });
    default: return contSVG(id, s);
  }
}

// 入れ物の絵（ずかん用。水を入れた形）。f：水の割合
export function contSVG(id, s, fw = 0.7) {
  const gl = k('glass'), ln = k('glass-line'), wa = k('water');
  const body = (pts, extra = '') => { const d = 'M' + pts.map(p => p.map(f).join(',')).join('L') + 'Z'; return P(d, { fill: gl, stroke: ln, 'stroke-width': Math.max(1.5, s * 0.04), 'stroke-linejoin': 'round' }) + extra; };
  const water = (pts, lv) => { const top = Math.min(...pts.map(p => p[1])), y = top * lv; const cl = pts.map(([x, yy]) => [x, Math.max(yy, y)]); return P('M' + cl.map(p => p.map(f).join(',')).join('L') + 'Z', { fill: wa, opacity: 0.9 }); };
  const shapes = {
    cup: [[-s * 0.24, -s * 0.62], [s * 0.24, -s * 0.62], [s * 0.19, 0], [-s * 0.19, 0]],
    'cup-s': [[-s * 0.18, -s * 0.42], [s * 0.18, -s * 0.42], [s * 0.14, 0], [-s * 0.14, 0]],
    donburi: [[-s * 0.5, -s * 0.46], [s * 0.5, -s * 0.46], [s * 0.42, -s * 0.2], [s * 0.22, 0], [-s * 0.22, 0], [-s * 0.42, -s * 0.2]],
    suito: [[-s * 0.12, -s * 0.95], [s * 0.12, -s * 0.95], [s * 0.2, -s * 0.8], [s * 0.2, 0], [-s * 0.2, 0], [-s * 0.2, -s * 0.8]],
    yakan: [[-s * 0.22, -s * 0.7], [s * 0.22, -s * 0.7], [s * 0.42, -s * 0.32], [s * 0.42, 0], [-s * 0.42, 0], [-s * 0.42, -s * 0.32]],
    nabe: [[-s * 0.55, -s * 0.5], [s * 0.55, -s * 0.5], [s * 0.55, 0], [-s * 0.55, 0]],
    bucket: [[-s * 0.45, -s * 0.8], [s * 0.45, -s * 0.8], [s * 0.34, 0], [-s * 0.34, 0]],
    pet500: [[-s * 0.08, -s * 0.95], [s * 0.08, -s * 0.95], [s * 0.18, -s * 0.72], [s * 0.18, 0], [-s * 0.18, 0], [-s * 0.18, -s * 0.72]],
    pet2L: [[-s * 0.09, -s * 1], [s * 0.09, -s * 1], [s * 0.28, -s * 0.74], [s * 0.28, 0], [-s * 0.28, 0], [-s * 0.28, -s * 0.74]],
    masu1L: [[-s * 0.4, -s * 0.8], [s * 0.4, -s * 0.8], [s * 0.4, 0], [-s * 0.4, 0]],
    masu1dL: [[-s * 0.2, -s * 0.36], [s * 0.2, -s * 0.36], [s * 0.2, 0], [-s * 0.2, 0]],
  };
  const pts = shapes[id];
  if (!pts) return monoSVG('box', s);
  let extra = '';
  if (id === 'yakan') extra = P(`M${s * 0.42},${-s * 0.2}L${s * 0.62},${-s * 0.55}`, { stroke: ln, 'stroke-width': s * 0.07, 'stroke-linecap': 'round' }) + P(`M${-s * 0.2},${-s * 0.72}Q0,${-s * 0.95} ${s * 0.2},${-s * 0.72}`, { stroke: ln, 'stroke-width': s * 0.05, fill: 'none' });
  if (id === 'nabe') extra = R(-s * 0.68, -s * 0.44, s * 0.13, s * 0.06, { rx: 2, fill: ln }) + R(s * 0.55, -s * 0.44, s * 0.13, s * 0.06, { rx: 2, fill: ln });
  if (id === 'bucket') extra = P(`M${-s * 0.45},${-s * 0.8}Q0,${-s * 1.15} ${s * 0.45},${-s * 0.8}`, { stroke: ln, 'stroke-width': s * 0.04, fill: 'none' });
  if (id === 'suito') extra = R(-s * 0.14, -s * 1.02, s * 0.28, s * 0.1, { rx: 2, fill: k('face-1') });
  return body(pts) + water(pts, fw) + extra;
}

// ずかん・思い出しの小さな図：「apple*2+carrot」（物を並べる。, でも区切れる）・「cont:suito」（入れ物）
export function monoFig(spec) {
  if (String(spec).startsWith('cont:')) { const id = spec.slice(5); return `<svg viewBox="-40 -48 80 52" aria-hidden="true">${contSVG(id, 44)}</svg>`; }
  const list = [];
  for (const part of String(spec).split(/[,+]/).filter(Boolean)) { const [id, n] = part.split('*'); for (let i = 0; i < (+n || 1); i++) list.push(id); }
  const cw = 34, W = Math.max(1, list.length) * cw;
  return `<svg viewBox="0 -40 ${W} 46" aria-hidden="true">${list.map((id, i) => `<g transform="translate(${i * cw + cw / 2},2)">${monoSVG(id, 30)}</g>`).join('')}</svg>`;
}
// 「1Lます x かい ＋ 1dLます y かい」の図
export function pourFig(x, y) {
  x = +x; y = +y;
  const big = 30, sm = 9, gap = 4, cols = 10, rows = Math.ceil(y / cols) || 0;
  const W = Math.max(big + gap, x * (big + gap)) + (y ? Math.min(y, cols) * (sm + 2) + gap : 0) + 4, H = Math.max(big, rows * (sm + 2)) + 6;
  let s = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  for (let i = 0; i < x; i++) s += R(2 + i * (big + gap), H - big - 2, big, big, { fill: k('water'), stroke: k('masu-edge'), 'stroke-width': 2 });
  const x0 = 2 + x * (big + gap);
  for (let j = 0; j < y; j++) s += R(x0 + (j % cols) * (sm + 2), H - 2 - (Math.floor(j / cols) + 1) * (sm + 2) + 2, sm, sm, { fill: k('water'), stroke: k('masu-edge'), 'stroke-width': 1.2 });
  return s + '</svg>';
}
