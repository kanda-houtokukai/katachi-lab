// 重さの舞台（O3・U3）：はかり（秤量 1kg・2kg・4kg、むしめがね、振り切れ＝止め金で跳ね返す、0に合わせる・正味）と てんびん（傾き・1円玉・つみき）。
// 見本 v1（reference/hakaru-mock-src/40-scale.js）の動きを移したもの。針は ばねの式を経過時間で進める（_omosa.js の springStep）。
// 物の重さは data/benchmarks.json（bench）から読む。画面に値を直接書かない。
import { el, C, txt, rect, line, circle, path, clear, clamp, polar } from './_flat.js';
import { S, speedNow } from '../stage/stage.js';
import { bench } from '../core/bench.js';
import { CAPS, ticks, springStep, needleTarget, settled, STOP } from './_omosa.js';
import { monoSVG, MONO_NAMES } from './_mono.js';

export const massOf = (id, box = 0) => (id === 'box' ? box : ((bench(id) || {}).mass_g || 0));
export const nameOfM = id => MONO_NAMES[id] || ((bench(id) || {}).name || id);
const putIcon = (parent, id, x, y, s, shape = 0) => { const g = el('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` }, parent); g.innerHTML = monoSVG(id, s, shape); return g; };
let lensN = 0;

/* ---------- はかり ---------- */
export function scaleScene(F, ctx, o = {}) {
  const sc = { cap: o.cap || 1000, plate: [], tare: 0, lens: false, clay: 0, box: 0, needle: { a: 0, v: 0 }, shelf: o.shelf || null, max: o.max || 1, L: {}, alive: true, key: null, onSettle: o.onSettle || null, onTapShelf: o.onTapShelf || null, onTapPlate: o.onTapPlate || null };
  let raf = 0, root = null;
  sc.mass = () => sc.plate.reduce((s, id) => s + massOf(id, sc.box), 0);
  sc.reading = () => sc.mass() - sc.tare;
  sc.count = id => sc.plate.filter(x => x === id).length;
  sc.layout = () => {
    root = F.layer('scale'); clear(root);
    const top = F.top + F.cap + (F.W < 500 ? 24 : 0), bot = F.bottom, W = F.W, L = sc.L = {};
    L.tableY = bot - 6;
    rect(root, 0, L.tableY, W, bot - L.tableY + 2, { fill: C('wood-pale') }); rect(root, 0, L.tableY, W, 4, { fill: C('wood') });
    const n = sc.shelf ? sc.shelf.length : 0, land = n && W >= 640;
    // たな（横長は右、縦長は上）
    let cols = 0, cellW = 0, cellH = 0, shelfH = 0;
    if (n) {
      if (land) { cols = n > 8 ? 3 : 2; cellW = Math.min(150, (W * 0.5 - 30) / cols); cellH = Math.min(116, (bot - top - 20) / Math.ceil(n / cols) - 8); }
      else { cols = Math.min(n, 6); cellW = (W - 24) / cols; cellH = Math.min(78, Math.max(56, (bot - top) * 0.13)); shelfH = Math.ceil(n / cols) * (cellH + 6) + 4; }
    }
    const avail = bot - top - shelfH - 12;
    const R = Math.max(30, Math.min(avail / 3.9, land ? W * 0.17 : W * 0.3, 170));
    const cx = land ? W * 0.27 : W / 2, cy = L.tableY - R * 1.3;
    Object.assign(L, { R, cx, cy, land });
    // 本体
    rect(root, cx - R * 1.38, cy - R * 1.42, R * 2.76, L.tableY - cy + R * 1.42, { rx: R * 0.3, fill: C('scale-body'), stroke: C('scale-edge'), 'stroke-width': 4 });
    // 0に あわせる ねじ
    L.knob = circle(root, cx + R * 1.12, cy + R * 1.08, Math.max(7, R * 0.08), { fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 2 });
    // さら
    L.plateY = cy - R * 1.42 - R * 0.26;
    rect(root, cx - R * 0.12, L.plateY, R * 0.24, R * 0.28, { fill: C('metal-deep') });
    el('ellipse', { cx, cy: L.plateY, rx: R * 1.25, ry: R * 0.16, fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 3 }, root);
    L.onPlate = el('g', {}, root);
    // 目もり盤（むしめがねで映すので id を付ける）
    L.dial = el('g', { id: 'dial' + (++lensN) }, root);
    circle(L.dial, cx, cy, R, { fill: C('paper'), stroke: C('scale-edge'), 'stroke-width': 3 });
    for (const t of ticks(sc.cap)) {
      const r1 = R * 0.95, r2 = R * (t.kind === 'major' ? 0.8 : t.kind === 'mid' ? 0.85 : 0.9), [x1, y1] = polar(cx, cy, r1, t.deg), [x2, y2] = polar(cx, cy, r2, t.deg);
      line(L.dial, x1, y1, x2, y2, { stroke: C('ink'), 'stroke-width': t.kind === 'major' ? 2.4 : t.kind === 'mid' ? 1.6 : 0.9, 'stroke-linecap': 'butt' });
      if (t.label) { const [x, y] = polar(cx, cy, R * 0.66, t.deg); txt(L.dial, x, y + R * 0.045, t.label, { 'font-size': R * (t.v % 1000 === 0 ? 0.13 : 0.11), fill: t.v % 1000 === 0 && t.v ? C('ok') : C('ink'), class: 'ui' }); }
    }
    txt(L.dial, cx, cy + R * 0.42, `${sc.cap / 1000}kg`, { 'font-size': R * 0.12, fill: C('ink-soft'), class: 'ui' });
    // 止め金（ふりきれ）
    const [sx, sy] = polar(cx, cy, R * 0.92, STOP + 2); circle(L.dial, sx, sy, Math.max(2.5, R * 0.025), { fill: C('metal-dark') });
    L.needle = el('g', {}, L.dial);
    line(L.needle, cx, cy + R * 0.12, cx, cy - R * 0.9, { stroke: C('ok'), 'stroke-width': Math.max(2.5, R * 0.025) });
    circle(L.needle, cx, cy, R * 0.06, { fill: C('ok') });
    L.hl = el('g', {}, root);
    L.lensG = el('g', { 'pointer-events': 'none' }, root);
    // たな
    L.cells = {};
    if (n) {
      const sx0 = land ? W * 0.52 : 12, sy0 = land ? top + 6 : top + 2;
      sc.shelf.forEach((id, i) => {
        const c = i % cols, r = Math.floor(i / cols), x = sx0 + c * cellW + cellW / 2, y = sy0 + r * (cellH + (land ? 8 : 6));
        const g = el('g', { style: 'cursor:pointer', 'data-item': id }, root);
        rect(g, x - cellW / 2 + 4, y, cellW - 8, cellH, { rx: 12, fill: C('paper'), stroke: C('line'), 'stroke-width': 2 });
        const s = Math.min(cellW * 0.48, cellH * 0.5);
        const ig = putIcon(g, id, x, y + cellH * 0.66, s);
        txt(g, x, y + cellH - 7, nameOfM(id), { 'font-size': Math.max(11, Math.min(15, cellH * 0.15)), fill: C('ink-soft') });
        L.cells[id] = { g, ig, x, y: y + cellH * 0.5 };
        g.addEventListener('pointerdown', e => { e.stopPropagation(); sc.onTapShelf && sc.onTapShelf(id); });
      });
    }
    sc.drawPlate(); sc.updateNeedle(); sc.drawLens();
    o.onLayout && o.onLayout(sc);
  };
  const slot = (i, n) => { const L = sc.L, R = L.R, s = R * Math.min(0.62, 2.1 / Math.max(1, n)), dx = Math.min(R * 0.7, R * 2.3 / Math.max(1, n)); return { x: L.cx + (i - (n - 1) / 2) * dx, y: L.plateY - R * 0.06, s }; };
  sc.drawPlate = () => {
    const L = sc.L; if (!L.onPlate) return; clear(L.onPlate);
    const R = L.R, n = sc.plate.length;
    // ボウル（入れ物）は さらの まん中に 大きく、中の物は その上に
    if (sc.plate[0] === 'bowl') {
      putIcon(L.onPlate, 'bowl', L.cx, L.plateY - R * 0.04, R * 1.5);
      sc.plate.slice(1).forEach((id, i, arr) => { const g = putIcon(L.onPlate, id, L.cx + (i - (arr.length - 1) / 2) * R * 0.55, L.plateY - R * 0.36, R * 0.5); g.style.cursor = 'pointer'; g.addEventListener('pointerdown', e => { e.stopPropagation(); sc.onTapPlate && sc.onTapPlate(id, i + 1); }); });
      for (const id in L.cells) L.cells[id].ig.setAttribute('opacity', sc.count(id) >= sc.max ? 0.22 : 1);
      return;
    }
    // 物が多いときは 小さくして 1れつに ならべる
    sc.plate.forEach((id, i) => {
      const p = slot(i, n), big = ['water1L', 'pumpkin', 'cabbage', 'bowl', 'box'].includes(id);
      const g = putIcon(L.onPlate, id, p.x, p.y, big ? p.s * 1.1 : p.s, id === 'clay' ? sc.clay : 0); g.style.cursor = 'pointer'; g.setAttribute('data-plate', String(i));
      g.addEventListener('pointerdown', e => { e.stopPropagation(); sc.onTapPlate && sc.onTapPlate(id, i); });
    });
    for (const id in L.cells) L.cells[id].ig.setAttribute('opacity', sc.count(id) >= sc.max ? 0.22 : 1);
  };
  sc.updateNeedle = () => { const L = sc.L; if (L.needle) L.needle.setAttribute('transform', `rotate(${sc.needle.a.toFixed(2)} ${L.cx.toFixed(1)} ${L.cy.toFixed(1)})`); };
  // むしめがね：針の先を 3ばいに して 映す
  let lens = null;
  sc.drawLens = () => {
    const L = sc.L; if (!L.lensG) return;
    if (!sc.lens) { clear(L.lensG); lens = null; return; }
    const R = L.R, a = sc.needle.a, [tx, ty] = polar(L.cx, L.cy, R * 0.88, a), lr = Math.max(40, R * 0.44);
    let [lx, ly] = polar(L.cx, L.cy, R * 1.62, a);
    lx = clamp(lx, lr + 6, F.W - lr - 6); ly = clamp(ly, F.top + F.cap + lr, L.tableY - lr - 4);
    if (!lens || !lens.g.isConnected) {
      clear(L.lensG); const id = 'lensc' + (++lensN), defs = el('defs', {}, L.lensG), cp = el('clipPath', { id }, defs);
      lens = { cc: circle(cp, 0, 0, lr), g: el('g', {}, L.lensG) };
      lens.line = line(lens.g, 0, 0, 0, 0, { stroke: C('ink-soft'), 'stroke-width': 2, 'stroke-dasharray': '4 4' });
      lens.bg = circle(lens.g, 0, 0, lr, { fill: C('paper') });
      const inner = el('g', { 'clip-path': `url(#${id})` }, lens.g);
      lens.use = el('use', { href: '#' + L.dial.id }, inner);
      lens.ring = circle(lens.g, 0, 0, lr, { fill: 'none', stroke: C('ink'), 'stroke-width': 5 });
    }
    const set = (e, a2) => { for (const k in a2) e.setAttribute(k, typeof a2[k] === 'number' ? a2[k].toFixed(1) : a2[k]); };
    set(lens.cc, { cx: lx, cy: ly }); set(lens.bg, { cx: lx, cy: ly }); set(lens.ring, { cx: lx, cy: ly });
    set(lens.line, { x1: tx, y1: ty, x2: lx, y2: ly });
    lens.use.setAttribute('transform', `translate(${lx.toFixed(1)},${ly.toFixed(1)}) scale(3) translate(${(-tx).toFixed(1)},${(-ty).toFixed(1)})`);
  };
  sc.setCap = c => { sc.cap = c; sc.key = null; sc.layout(); };
  sc.target = () => needleTarget(sc.reading(), sc.cap);
  sc.isSettled = () => settled(sc.needle, sc.target());
  // 目もりの1つを光らせる（数えるとき）
  sc.mark = g => { const L = sc.L; clear(L.hl); if (g == null) return; const [x1, y1] = polar(L.cx, L.cy, L.R * 0.98, g / sc.cap * 360), [x2, y2] = polar(L.cx, L.cy, L.R * 0.78, g / sc.cap * 360); line(L.hl, x1, y1, x2, y2, { stroke: C('sora'), 'stroke-width': 4 }); };
  let last = performance.now();
  const loop = now => {
    if (!sc.alive) return;
    const dt = Math.min(0.04, (now - last) / 1000) / Math.max(0.05, speedNow()); last = now;
    const tg = sc.target(), before = sc.needle.a;
    springStep(sc.needle, tg, Math.min(0.12, dt));
    if (Math.abs(before - sc.needle.a) > 0.001) { sc.updateNeedle(); if (sc.lens) sc.drawLens(); }
    const key = sc.reading() + ':' + sc.cap + ':' + sc.plate.join(',') + ':' + sc.tare;
    if (sc.key !== key && settled(sc.needle, tg)) { sc.key = key; const m = sc.reading(); sc.onSettle && sc.onSettle(m, m > sc.cap); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  // つぎに 針が 止まるのを 待つ
  sc.waitSettle = () => new Promise(res => { const prev = sc.onSettle, tag = S.token; sc.key = null; sc.onSettle = (m, over) => { sc.onSettle = prev; res({ m, over }); }; const chk = () => { if (tag !== S.token || !sc.alive) { sc.onSettle = prev; res(null); } else setTimeout(chk, 200); }; chk(); });
  sc.tapShelf = id => { const c = sc.L.cells[id]; return c ? F.toClient(c.x, c.y) : null; };
  sc.tapPlate = i => { const p = slot(i, sc.plate.length); return F.toClient(p.x, p.y - p.s * 0.2); };
  sc.center = () => ({ x: sc.L.cx, y: sc.L.cy, r: sc.L.R * 0.7 });
  sc.dispose = () => { sc.alive = false; cancelAnimationFrame(raf); };
  F.onResize(() => { if (sc.alive) sc.layout(); });
  sc.layout();
  return sc;
}

/* ---------- てんびん ---------- */
export const TSUMIKI = 'tsumiki';
export function balanceScene(F, ctx, o = {}) {
  const bal = { L: o.L || [], R: o.R || [], coins: 0, blocks: 0, hold: false, beam: { a: 0, v: 0 }, alive: true, E: {}, key: null, onSettle: o.onSettle || null };
  let raf = 0;
  bal.mL = () => bal.L.reduce((s, id) => s + massOf(id), 0);
  bal.mR = () => bal.R.reduce((s, id) => s + massOf(id), 0) + bal.coins * massOf('coin1') + bal.blocks * massOf(TSUMIKI);
  bal.layout = () => {
    const g = F.layer('balance'); clear(g);
    const top = F.top + F.cap + (F.W < 500 ? 24 : 0), bot = F.bottom, W = F.W, E = bal.E = { g };
    E.tableY = bot - 6;
    rect(g, 0, E.tableY, W, 8, { fill: C('wood-pale') }); rect(g, 0, E.tableY, W, 4, { fill: C('wood') });
    const avail = E.tableY - top;
    const bx = W / 2, by = top + avail * 0.22 + 20, Lb = Math.min(W * 0.36, 300, avail * 0.75), str = avail * 0.32;
    Object.assign(E, { bx, by, Lb, str, pw: Math.min(Lb * 0.5, avail * 0.3) });
    rect(g, bx - 9, by, 18, E.tableY - by - 14, { fill: C('balance'), stroke: C('balance-edge'), 'stroke-width': 2 });
    path(g, `M${bx - Lb * 0.4},${E.tableY}L${bx - Lb * 0.3},${E.tableY - 18}H${bx + Lb * 0.3}L${bx + Lb * 0.4},${E.tableY}Z`, { fill: C('balance'), stroke: C('balance-edge'), 'stroke-width': 2 });
    // めもり（つりあいの 目じるし）
    path(g, `M${bx - 26},${by - 62}Q${bx},${by - 70} ${bx + 26},${by - 62}`, { fill: 'none', stroke: C('ink-soft'), 'stroke-width': 2 });
    line(g, bx, by - 72, bx, by - 60, { stroke: C('ink-soft'), 'stroke-width': 2 });
    E.beamG = el('g', {}, g);
    rect(E.beamG, bx - Lb, by - 7, Lb * 2, 14, { rx: 7, fill: C('metal-deep') });
    circle(E.beamG, bx, by, 12, { fill: C('metal-dark') });
    E.pointer = line(g, bx, by, bx, by - 54, { stroke: C('ok'), 'stroke-width': 4 });
    E.panL = el('g', {}, g); E.panR = el('g', {}, g);
    E.lab = txt(g, Math.min(W - 70, bx + Lb * 0.92), Math.min(E.tableY - 12, by + str + E.pw * 0.5 + 34), '', { 'font-size': 18, fill: C('mat-deep'), class: 'ui' });
    bal.draw();
    o.onLayout && o.onLayout(bal);
  };
  const panXY = sgn => { const E = bal.E, a = bal.beam.a * Math.PI / 180, ex = E.bx + sgn * E.Lb * 0.92 * Math.cos(a), ey = E.by + sgn * E.Lb * 0.92 * Math.sin(a); return { ex, ey, py: ey + E.str }; };
  bal.draw = () => {
    const E = bal.E; if (!E.beamG) return;
    E.beamG.setAttribute('transform', `rotate(${bal.beam.a.toFixed(2)} ${E.bx} ${E.by})`);
    E.pointer.setAttribute('transform', `rotate(${bal.beam.a.toFixed(2)} ${E.bx} ${E.by})`);
    [[E.panL, -1, bal.L], [E.panR, 1, bal.R]].forEach(([g, sgn, ids]) => {
      clear(g); const { ex, ey, py } = panXY(sgn), pw = E.pw;
      path(g, `M${ex},${ey}L${ex - pw * 0.8},${py}M${ex},${ey}L${ex + pw * 0.8},${py}`, { stroke: C('metal-deep'), 'stroke-width': 2 });
      path(g, `M${ex - pw},${py}Q${ex},${py + pw * 0.35} ${ex + pw},${py}Z`, { fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 3 });
      ids.forEach((id, i) => putIcon(g, id, ex + (i - (ids.length - 1) / 2) * pw * 0.6, py, pw * (ids.length > 1 ? 0.62 : 0.9)));
      if (sgn > 0 && bal.coins) {
        const cr = pw * 0.13, cols = Math.ceil(bal.coins / 10);
        for (let c = 0; c < cols; c++) { const cnt = Math.min(10, bal.coins - c * 10), x = ex + (c - (cols - 1) / 2) * cr * 2.1 * (cols > 7 ? 7 / cols : 1); for (let i = 0; i < cnt; i++) el('ellipse', { cx: x.toFixed(1), cy: (py - 3 - i * cr * 0.3).toFixed(1), rx: cr.toFixed(1), ry: (cr * 0.32).toFixed(1), fill: C('coin'), stroke: C('coin-line'), 'stroke-width': 1.2 }, g); }
      }
      if (sgn > 0 && bal.blocks) {
        const bs = pw * 0.22, cols = Math.ceil(bal.blocks / 4);
        for (let c = 0; c < cols; c++) { const cnt = Math.min(4, bal.blocks - c * 4), x = ex + (c - (cols - 1) / 2) * bs * 1.05; for (let i = 0; i < cnt; i++) rect(g, x - bs / 2, py - 2 - (i + 1) * bs, bs, bs, { rx: 2, fill: C('obj-block'), stroke: C('ink'), 'stroke-width': 1 }); }
      }
    });
  };
  bal.setLabel = s => { if (bal.E.lab) bal.E.lab.textContent = s; };
  bal.target = () => { if (bal.hold) return 0; const m = bal.mL(), r = bal.mR(); return clamp((r - m) / Math.max(m, r, 10), -1, 1) * 14; };
  let last = performance.now();
  const loop = now => {
    if (!bal.alive) return;
    const dt = Math.min(0.04, (now - last) / 1000) / Math.max(0.05, speedNow()); last = now;
    const tg = bal.target(), n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, a0 = bal.beam.a;
    for (let i = 0; i < n; i++) { bal.beam.v += (-40 * (bal.beam.a - tg) - 6 * bal.beam.v) * h; bal.beam.a += bal.beam.v * h; }
    if (Math.abs(a0 - bal.beam.a) > 0.002) bal.draw();
    const key = bal.L.join() + '|' + bal.R.join() + '|' + bal.coins + '|' + bal.blocks + '|' + bal.hold;
    if (bal.key !== key && Math.abs(bal.beam.a - tg) < 0.3 && Math.abs(bal.beam.v) < 0.8) { bal.key = key; bal.onSettle && bal.onSettle(bal.mL() - bal.mR()); }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  bal.waitSettle = () => new Promise(res => { const prev = bal.onSettle, tag = S.token; bal.key = null; bal.onSettle = d => { bal.onSettle = prev; res(d); }; const chk = () => { if (tag !== S.token || !bal.alive) { bal.onSettle = prev; res(null); } else setTimeout(chk, 200); }; chk(); });
  bal.center = () => ({ x: bal.E.bx, y: bal.E.by, r: bal.E.Lb * 0.4 });
  bal.dispose = () => { bal.alive = false; cancelAnimationFrame(raf); };
  F.onResize(() => { if (bal.alive) bal.layout(); });
  bal.layout();
  return bal;
}
// 手で もつ（みる）：重い ほうの 手が 下がる
export function handsScene(F, a, b) {
  const g = F.layer('hands'); clear(g);
  const top = F.top + F.cap, bot = F.bottom, W = F.W, cy = top + (bot - top) * 0.55, s = Math.min(90, W * 0.16), dx = Math.min(W * 0.25, 220);
  const ma = massOf(a), mb = massOf(b), d = clamp((ma - mb) / Math.max(ma, mb, 1), -1, 1) * 24;
  const hand = (x, y, id, heavy) => {
    const h = el('g', { transform: `translate(${x},${y})` }, g), col = C('obj-child');
    path(h, `M${-s * 0.62},${-s * 0.02}Q${-s * 0.66},${s * 0.3} ${-s * 0.2},${s * 0.34}H${s * 0.3}Q${s * 0.62},${s * 0.3} ${s * 0.6},${s * 0.04}Z`, { fill: col });
    [-0.46, -0.24, -0.02, 0.2].forEach(fx => el('ellipse', { cx: (s * fx).toFixed(1), cy: (s * 0.02).toFixed(1), rx: (s * 0.1).toFixed(1), ry: (s * 0.07).toFixed(1), fill: col }, h));
    path(h, `M${s * 0.52},${s * 0.06}q${s * 0.16},${-s * 0.12} ${s * 0.2},${-s * 0.02}`, { stroke: col, 'stroke-width': s * 0.12, 'stroke-linecap': 'round', fill: 'none' });
    path(h, `M${-s * 0.1},${s * 0.32}L${s * 0.05},${s * 1.1}H${s * 0.35}L${s * 0.28},${s * 0.32}Z`, { fill: col });
    const ic = el('g', {}, h); ic.innerHTML = monoSVG(id, s * 0.8);
    if (heavy) { path(h, `M${s * 0.95},${-s * 0.3}V${s * 0.35}`, { stroke: C('ok'), 'stroke-width': 4, 'stroke-linecap': 'round' }); path(h, `M${s * 0.83},${s * 0.22}L${s * 0.95},${s * 0.4}L${s * 1.07},${s * 0.22}`, { stroke: C('ok'), 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
    return h;
  };
  hand(W / 2 - dx, cy + d, a, ma > mb); hand(W / 2 + dx, cy - d, b, mb > ma);
  txt(g, W / 2 - dx, cy + s * 1.5 + d, nameOfM(a), { 'font-size': 16, fill: C('ink-soft') });
  txt(g, W / 2 + dx, cy + s * 1.5 - d, nameOfM(b), { 'font-size': 16, fill: C('ink-soft') });
  return { clear: () => clear(g) };
}
