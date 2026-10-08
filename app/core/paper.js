// かみで つくる（設計書 §2-6）：のりしろ付きの展開図を A4 に実寸で出す。印刷画面と PDF 保存（jsPDF を同梱）。
// 1単位＝4.5cm を上限に、A4 に収まる最大の縮尺を自動で決める。収まらない形は向きを変えてから縮める。
import { $ } from './text.js';
import { sfx, hush } from './sound.js';
import { hideHud, toast, ICON } from './hud.js';
import { glueTabs } from '../engine/tabs.js';
import { foldedFaces, edgeId } from '../engine/fold.js';
import { tok, faceColors } from './theme.js';

const sheet = () => $('paperSheet');
let current = null;
export function setupPaper() {
  const close = () => { sheet().hidden = true; };
  $('pClose').addEventListener('click', () => { sfx.tap(); close(); });
  $('pDone').addEventListener('click', () => { sfx.tap(); close(); });
  sheet().addEventListener('click', e => { if (e.target === sheet()) close(); });
  $('pPrint').addEventListener('click', () => { sfx.tap(); printSheet(); });
  $('pSave').addEventListener('click', () => { sfx.tap(); savePDF(); });
}

// レイアウト（平面の展開図）→ 紙に描くもの
export function layoutToShapes(L, colors) {
  const F = foldedFaces(L), g = glueTabs(L, F);
  const folds = new Set();
  L.faces.forEach((f, i) => { if (L.hinge[i]) folds.add(edgeId(L.hinge[i][0], L.hinge[i][1])); });
  g.tabs.forEach(t => folds.add(edgeId(t.a, t.b)));
  const pal = colors || faceColors();
  return { polys: L.faces.map((f, i) => ({ pts: f.pts, fill: pal[i % pal.length] })), tabs: g.tabs.map(t => t.poly), folds, circles: [], sectors: [] };
}

const MAX_MM = 45, A4W = 210, A4H = 297, AREA = { x: 12, y: 36, w: 186, h: 240 };
function bounds(sh, rot) {
  const c = Math.cos(rot), s = Math.sin(rot), R = ([x, y]) => [c * x - s * y, s * x + c * y];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const addP = p => { const [x, y] = R(p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  sh.polys.forEach(p => p.pts.forEach(addP)); sh.tabs.forEach(t => t.forEach(addP));
  (sh.circles || []).forEach(ci => { const m = (ci.r + (ci.tab || 0)); addP([ci.c[0] - m, ci.c[1] - m]); addP([ci.c[0] + m, ci.c[1] + m]); addP([ci.c[0] - m, ci.c[1] + m]); addP([ci.c[0] + m, ci.c[1] - m]); });
  (sh.sectors || []).forEach(se => { for (let k = 0; k <= 24; k++) { const a = se.a0 + (se.a1 - se.a0) * k / 24; addP([se.c[0] + Math.cos(a) * se.r, se.c[1] + Math.sin(a) * se.r]); } addP(se.c); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, R };
}
// 縮尺と向き：まず 0°・90°、収まらなければ 15° きざみで最大になる向き
export function planSheet(sh) {
  let best = null;
  const tryRot = rot => { const b = bounds(sh, rot), s = Math.min(MAX_MM, AREA.w / b.w, AREA.h / b.h); if (!best || s > best.s + 1e-6) best = { s, rot, b }; };
  tryRot(0); tryRot(Math.PI / 2);
  if (best.s < MAX_MM - 1e-6) for (let d = 15; d < 180; d += 15) if (d !== 90) tryRot(d * Math.PI / 180);
  return best;
}

export function drawSheet(ctx, M, spec) {
  const sh = spec.shapes, plan = planSheet(sh), { s, b } = plan, R = b.R;
  const ox = AREA.x + (AREA.w - b.w * s) / 2, oy = AREA.y + (AREA.h - b.h * s) / 2;
  const P = p => { const [x, y] = R(p); return [ox + (x - b.x0) * s, oy + (y - b.y0) * s]; };
  const INK = tok('ink'), SOFT = tok('ink-soft'), TAB = '#ececec';
  ctx.save(); ctx.scale(M, M); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, A4W, A4H);
  ctx.lineJoin = 'round';
  const path = pts => { ctx.beginPath(); pts.forEach((p, i) => { const [X, Y] = P(p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); };
  // のりしろ
  sh.tabs.forEach(t => {
    path(t); ctx.fillStyle = TAB; ctx.fill(); ctx.lineWidth = 0.5; ctx.strokeStyle = INK; ctx.setLineDash([]); ctx.stroke();
    const [A, B] = [P(t[0]), P(t[3])], cx = (P(t[0])[0] + P(t[1])[0] + P(t[2])[0] + P(t[3])[0]) / 4, cy = (P(t[0])[1] + P(t[1])[1] + P(t[2])[1] + P(t[3])[1]) / 4;
    ctx.save(); ctx.translate(cx, cy); let a = Math.atan2(B[1] - A[1], B[0] - A[0]); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; ctx.rotate(a);
    ctx.fillStyle = '#8a948f'; ctx.font = `700 ${Math.min(3.6, s * 0.08)}px "Zen Maru Gothic", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('のり', 0, 0.2); ctx.restore();
  });
  (sh.circleTabs || []).forEach(t => { path(t); ctx.fillStyle = TAB; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = INK; ctx.stroke(); });
  // 面
  sh.polys.forEach(p => { path(p.pts); ctx.globalAlpha = 0.22; ctx.fillStyle = p.fill; ctx.fill(); ctx.globalAlpha = 1; });
  (sh.circles || []).forEach(ci => { const [X, Y] = P(ci.c); ctx.beginPath(); ctx.arc(X, Y, ci.r * s, 0, Math.PI * 2); ctx.globalAlpha = 0.22; ctx.fillStyle = ci.fill; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 0.6; ctx.strokeStyle = INK; ctx.setLineDash([]); ctx.stroke(); });
  (sh.sectors || []).forEach(se => {
    const pts = [se.c]; for (let k = 0; k <= 48; k++) { const a = se.a0 + (se.a1 - se.a0) * k / 48; pts.push([se.c[0] + Math.cos(a) * se.r, se.c[1] + Math.sin(a) * se.r]); }
    path(pts); ctx.globalAlpha = 0.22; ctx.fillStyle = se.fill; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 0.6; ctx.strokeStyle = INK; ctx.setLineDash([]); ctx.stroke();
  });
  // 辺：おる線は点線、きる線は実線（2枚の面が共有する辺は1回だけ描く）
  const drawn = new Set();
  sh.polys.forEach(p => {
    const n = p.pts.length;
    for (let k = 0; k < n; k++) {
      const a = p.pts[k], c = p.pts[(k + 1) % n], id = edgeId(a, c);
      if (drawn.has(id)) continue; drawn.add(id);
      const fold = sh.folds.has(id);
      const [x1, y1] = P(a), [x2, y2] = P(c);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = fold ? 0.4 : 0.6; ctx.strokeStyle = INK; ctx.setLineDash(fold ? [2, 1.6] : []); ctx.stroke();
    }
  });
  ctx.setLineDash([]);
  // 見出し・凡例・縮尺
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 8px "Klee One", "Zen Maru Gothic", sans-serif'; ctx.fillText(spec.title || 'てんかいず', 16, 22);
  ctx.font = '700 4px "Zen Maru Gothic", sans-serif'; ctx.fillStyle = SOFT; ctx.fillText(spec.sub || '', 16, 29);
  const lx = 112; ctx.lineWidth = 0.6; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(lx, 19); ctx.lineTo(lx + 10, 19); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = '700 4px "Zen Maru Gothic", sans-serif'; ctx.fillText('きる', lx + 12, 20.4);
  ctx.setLineDash([2, 1.6]); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(lx + 26, 19); ctx.lineTo(lx + 36, 19); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillText('おる', lx + 38, 20.4);
  ctx.fillStyle = TAB; ctx.fillRect(lx + 52, 16.6, 8, 4.8); ctx.strokeRect(lx + 52, 16.6, 8, 4.8);
  ctx.fillStyle = INK; ctx.fillText('のりしろ', lx + 62, 20.4);
  ctx.font = '700 3.4px "Zen Maru Gothic", sans-serif'; ctx.fillStyle = '#8a948f';
  const cm = (s / 10).toFixed(s % 10 === 0 ? 1 : 2).replace(/0$/, '');
  ctx.fillText(`${spec.unitText || '1マス'} ${cm}cm${spec.foot ? '　／　' + spec.foot : ''}`, 16, 286);
  ctx.restore();
  return plan;
}

// spec: { title, sub, foot, unitText, layout, colors } または { shapes }
export function openPaper(spec) {
  hideHud(); hush();
  if (spec.layout) spec = Object.assign({}, spec, { shapes: layoutToShapes(spec.layout, spec.colors) });
  current = spec;
  const app = $('app'), c = $('paperCanvas'), dpr = Math.min(2, window.devicePixelRatio || 1), cssW = Math.max(220, Math.min(360, app.clientWidth - 64));
  c.style.width = cssW + 'px'; c.style.height = (cssW * A4H / A4W) + 'px';
  c.width = Math.round(cssW * dpr); c.height = Math.round(cssW * dpr * A4H / A4W);
  const plan = drawSheet(c.getContext('2d'), c.width / A4W, spec);
  $('pNote').textContent = `A4に じっさいの おおきさ（${spec.unitText || '1マス'} ${(plan.s / 10).toFixed(1)}cm）で いんさつ できます`;
  $('pTitle').textContent = 'かみで つくる';
  sheet().hidden = false;
  return plan;
}
function bigCanvas() {
  const M = 8, c = document.createElement('canvas'); c.width = A4W * M; c.height = A4H * M;
  drawSheet(c.getContext('2d'), M, current); return c;
}
function printSheet() {
  if (!current) return;
  const area = $('printArea');
  area.innerHTML = `<img alt="" src="${bigCanvas().toDataURL('image/png')}">`;
  setTimeout(() => { try { window.print(); } catch (e) {} }, 60);
}
function loadJsPDF() {
  return new Promise((res, rej) => {
    if (window.jspdf) return res(window.jspdf);
    const s = document.createElement('script'); s.src = new URL('../../vendor/jspdf.umd.min.js', import.meta.url).href;
    s.onload = () => res(window.jspdf); s.onerror = rej; document.head.appendChild(s);
  });
}
async function savePDF() {
  if (!current) return;
  const btn = $('pSave'); btn.disabled = true;
  try {
    const jspdf = await loadJsPDF();
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    doc.addImage(bigCanvas().toDataURL('image/png'), 'PNG', 0, 0, A4W, A4H);
    doc.save((current.file || 'katachi-tenkaizu') + '.pdf');
    toast(ICON.BOX, 'PDFを ほぞん しました', 2.4);
  } catch (e) { toast(ICON.X, 'ほぞん できませんでした', 2.4); }
  finally { btn.disabled = false; }
}
