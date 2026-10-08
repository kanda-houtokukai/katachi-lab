// 2D の舞台（量の部品・D20）。#stage（3D）の上、字幕・お知らせ・数の表示の下に SVG を1枚置く。
// 単位は CSS ピクセル（viewBox は #app の大きさ）。部品は上の帯と下の棚のあいだ（top〜bottom）に描く。
// アニメは stage.js の tween・wait を使う（S.token の打ち切りと「動きの量」の設定がそのまま効く）。
import { S, showMat, measure } from './stage.js';

const NS = 'http://www.w3.org/2000/svg';
let cur = null;

export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function size() {
  measure();
  const W = Math.max(200, Math.round(S.view.W)), H = Math.max(200, Math.round(S.view.H));
  return { W, H, top: Math.round(S.view.top - 54), bottom: Math.round(S.view.H - S.view.bottom + 8) };
}

// 開く。2回目に呼ばれたら前のものを閉じてから開く
export function openFlat(opts = {}) {
  if (cur) cur.close();
  // 前の部品のイベントが残らないよう、毎回まっさらな SVG に差しかえる
  const old = document.getElementById('flat'), svg = old.cloneNode(false);
  old.replaceWith(svg);
  svg.removeAttribute('hidden');   // SVG 要素には .hidden プロパティがないので属性で切りかえる
  showMat(!!opts.mat);
  S.onTap = null; S.allowRotate = false; S.onDrag = null;
  const layers = new Map(), resizers = new Set();
  const F = {
    svg, W: 0, H: 0, top: 0, bottom: 0, open: true,
    cap: 52,   // 字幕・お知らせの分の余白（上の帯のすぐ下に出る）。大事な絵はこの下に描く
    get h() { return F.bottom - F.top; },
    ptr(e) { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * F.W / Math.max(1, r.width), y: (e.clientY - r.top) * F.H / Math.max(1, r.height) }; },
    // 画面の点（clientX/Y）に。E2E が実際にタップする位置を求めるのに使う
    toClient(x, y) { const r = svg.getBoundingClientRect(); return { x: r.left + x * r.width / F.W, y: r.top + y * r.height / F.H }; },
    layer(name) { if (!layers.has(name)) layers.set(name, el('g', { 'data-layer': name }, svg)); return layers.get(name); },
    clearLayers() { layers.forEach(g => g.remove()); layers.clear(); },
    onResize(fn) { resizers.add(fn); return () => resizers.delete(fn); },
    resize() {
      const s = size(), changed = s.W !== F.W || s.H !== F.H || s.top !== F.top || s.bottom !== F.bottom;
      Object.assign(F, s);
      svg.setAttribute('viewBox', `0 0 ${F.W} ${F.H}`);
      if (changed) resizers.forEach(fn => { try { fn(F); } catch (e) { console.error(e); } });
      return changed;
    },
    close() {
      if (!F.open) return;
      F.open = false; resizers.clear(); layers.clear();
      const blank = svg.cloneNode(false); blank.setAttribute('hidden', ''); svg.replaceWith(blank);
      if (cur === F) cur = null;
      showMat(true); S.allowRotate = true;
    },
  };
  Object.assign(F, size());
  svg.setAttribute('viewBox', `0 0 ${F.W} ${F.H}`);
  cur = F;
  return F;
}
export const flatNow = () => cur;
export function closeFlat() { if (cur) cur.close(); }
// 棚の高さや画面の向きが変わったら描き直す（app.js の ResizeObserver と resize から呼ぶ）
export function refitFlat() { if (cur) cur.resize(); }

// 画面に収まっているか（E2E）。SVG の中身の外接矩形を、stage.js の fitCheck と同じ形で返す
export function flatFit() {
  if (!cur) return null;
  const svg = cur.svg, r = svg.getBoundingClientRect();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const g of svg.children) {
    if (g.tagName === 'defs' || g.getAttribute('data-nofit') != null) continue;
    let b; try { b = g.getBBox(); } catch (e) { continue; }
    if (!b || (b.width === 0 && b.height === 0)) continue;
    // 変形（transform）を含めた外接矩形
    const m = g.getCTM && g.getCTM(), sm = svg.getCTM && svg.getCTM();
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => {
      if (m && sm) { const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(sm.inverse().multiply(m)); return [q.x, q.y]; }
      return [x, y];
    });
    for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  if (!isFinite(minX)) return null;
  const k = r.width / cur.W;
  return { minX: r.left + minX * k, maxX: r.left + maxX * k, minY: r.top + minY * k, maxY: r.top + maxY * k, W: r.width, H: r.height, top: cur.top, bottom: cur.bottom, flat: true };
}
