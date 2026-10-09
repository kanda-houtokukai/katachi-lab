// 水の舞台（かさ K1・K2）：横から見た入れ物に水を注ぐ・移しかえる・あふれる・くむ・すてる。
// 見本 v1（reference/hakaru-mock-src/30-water.js）の動きを移したもの。水面はいつも水平（_water.js の waterPoly）、
// 注ぐ角度は水面が口の角にとどく角度（tiltFor）。注ぐ口は、注ぐ先の左右どちらに余白があるかで選ぶ。
// 使う側：const sc = vesselScene(F, ctx, { list:[{ kind, id?, vol?, name?, tag? }], onTap(v) })
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, tapOf } from './_flat.js';
import { S, alive, speedNow } from '../stage/stage.js';
import { polyOf, waterPoly, tiltFor, lipOf } from './_water.js';
import { bench } from '../core/bench.js';
import { hai } from '../core/yomi.js';

// 入れ物の種類（大きさは cm のおよそ。かさは基準物 benchmarks.json の vol_ml から読む）
export const VK = {
  masu1L: { name: '1Lます', shape: 'rect', w: 10, h: 10, cap: 1000, masu: true, marks: 10, tag: '1L' },
  masu1dL: { name: '1dLます', shape: 'rect', w: 4.6, h: 4.6, cap: 100, masu: true, tag: '1dL' },
  cup: { bench: 'cup', shape: 'taper', w: 7, h: 9, k: 0.78 },
  'cup-s': { bench: 'cup-s', shape: 'taper', w: 5.6, h: 7, k: 0.78 },
  donburi: { bench: 'donburi', shape: 'bowl', w: 16, h: 7.5 },
  suito: { bench: 'suito', shape: 'bottle', w: 7.5, h: 20, k: 0.55, deco: 'cap' },
  yakan: { bench: 'yakan', shape: 'kettle', w: 20, h: 15, deco: 'kettle' },
  nabe: { bench: 'nabe', shape: 'rect', w: 22, h: 11, deco: 'pot' },
  bucket: { bench: 'bucket', shape: 'taper', w: 28, h: 26, k: 0.78, deco: 'bucket' },
  pet500: { bench: 'pet500', shape: 'bottle', w: 6.5, h: 20, k: 0.4, deco: 'pet' },
  pet2L: { bench: 'pet2L', name: 'おおきい ペットボトル', shape: 'bottle', w: 10.5, h: 30, k: 0.32, deco: 'pet' },
  milk1L: { bench: 'milk1L', shape: 'rect', w: 7, h: 19.5, deco: 'gable' },
  milk200: { bench: 'milk200', name: 'ちいさい パック', shape: 'rect', w: 5, h: 9, deco: 'gable' },
  // K1 の くらべる 入れ物（せの たかい ほそい・ひくい ふとい）と おなじ コップ
  tall: { name: 'ほそながい いれもの', shape: 'rect', w: 5, h: 18, cap: 450 },
  wide: { name: 'ひくい いれもの', shape: 'rect', w: 12, h: 7.5, cap: 700 },
  glass: { name: 'コップ', shape: 'rect', w: 7.5, h: 11, cap: 500 },
  jar: { name: 'おなじ いれもの', shape: 'rect', w: 8, h: 15, cap: 900 },
  pot: { name: 'おおきい いれもの', shape: 'rect', w: 16, h: 14, cap: 3000 },
};
export function capOf(kind) { const d = VK[kind]; if (!d) return 100; if (d.cap) return d.cap; const b = bench(d.bench); return b && b.vol_ml ? b.vol_ml : 500; }
export function nameOf(kind) { const d = VK[kind]; if (!d) return kind; if (d.name) return d.name; const b = bench(d.bench); return b ? b.name.replace(/（.*）/, '') : kind; }

export function vesselScene(F, ctx, o = {}) {
  const sc = { vs: [], k: 20, tableY: 0, busy: false, sel: null, spill: 0, onTap: o.onTap || null, alive: true, pending: false, loupe: null };
  let layer = null, fx = null, under = null, puddle = null, raf = 0, loop = 0;
  const mk = (it, i) => {
    const d = VK[it.kind] || VK.glass;
    const v = Object.assign({ id: it.id || it.kind + i, kind: it.kind, name: it.name || nameOf(it.kind), shape: d.shape, w: d.w, h: d.h, k: d.k, cap: it.cap || capOf(it.kind), vol: 0, rot: 0, lift: 0, wave: 0, sign: 1, px: null, py: null, marks: d.marks || 0, masu: !!d.masu, tagText: d.tag || '', deco: d.deco, tag: it.tag || null, gap: it.gap }, it);
    v.Pcm = polyOf(v); v.vol = clamp(it.vol == null ? 0 : it.vol, 0, v.cap);
    return v;
  };
  sc.set = list => { sc.vs = list.map(mk); sc.sel = null; sc.spill = 0; puddle = null; sc.layout(); return sc.vs; };
  sc.byId = id => sc.vs.find(v => v.id === id);
  // 置き方：1列に並べ、いちばん高い入れ物と、注ぐときに持ち上げる高さが入る大きさにする
  sc.layout = () => {
    if (sc.busy) { sc.pending = true; return; }
    sc.pending = false;
    layer = F.layer('vessels'); clear(layer);
    under = F.layer('vfx-under'); clear(under);
    fx = F.layer('vfx'); clear(fx);
    layer.parentNode.insertBefore(under, layer);
    if (sc.loupe) { sc.loupe.remove(); sc.loupe = null; }
    const top = F.top + F.cap + (o.topPad || 0) + (F.W < 500 ? 24 : 0), labH = Math.max(30, Math.min(40, F.h * 0.06));
    sc.tableY = F.bottom - labH;
    const vs = sc.vs; if (!vs.length) return;
    const gaps = vs.reduce((s, v, i) => s + (i ? (v.gap ?? 3.2) : 0), 0), totalW = vs.reduce((s, v) => s + v.w, 0) + gaps;
    const maxH = Math.max(...vs.map(v => v.h)), pourH = Math.max(0, ...vs.filter(v => v.pour !== false).map(v => Math.hypot(v.w, v.h)));
    const room = sc.tableY - top;
    const dstH = Math.max(...vs.map(v => v.h));
    // 注ぐときは、注ぐ先の口のすこし上に口を持っていく → 注ぐ物の体の分だけ上に余白がいる（上の帯の下 40px まで出てよい）
    const kH = Math.min((room - 16) / (maxH + 1), (room + 30) / (dstH + pourH * 0.72 + 1.5));
    sc.k = Math.max(3, Math.min(kH, (F.W - 32) / totalW, o.kMax || 34));
    const k = sc.k; let x = (F.W - totalW * k) / 2;
    vs.forEach((v, i) => { if (i) x += (v.gap ?? 3.2) * k; v.x = x + v.w * k / 2; x += v.w * k; });
    // つくえ
    const tb = F.layer('table'); clear(tb); layer.parentNode.insertBefore(tb, under);
    rect(tb, 0, sc.tableY, F.W, F.bottom - sc.tableY, { fill: C('wood-pale') });
    rect(tb, 0, sc.tableY, F.W, 5, { fill: C('wood') });
    for (const v of vs) build(v);
    sc.draw();
    o.onLayout && o.onLayout(sc);
  };
  const pxPoly = (v, P) => P.map(([x, y]) => [x * sc.k, y * sc.k]);
  const dOf = P => 'M' + P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
  function build(v) {
    const k = sc.k, w = v.w * k, h = v.h * k, t = Math.max(2.5, k * 0.16);
    const g = el('g', { class: 'vessel', style: 'cursor:pointer', 'data-v': v.id }, layer); v.g = g;
    const P = pxPoly(v, v.Pcm);
    v.ring = path(g, dOf(P.map(([x, y]) => [x * 1.08 + (x > 0 ? 8 : -8), y < -1 ? y - 9 : y + 8])), { fill: 'none', stroke: C('yamabuki'), 'stroke-width': 4, 'stroke-linejoin': 'round', opacity: 0 });
    path(g, dOf(P), { fill: C('glass'), opacity: 0.85 });
    v.water = path(g, '', { fill: C('water'), opacity: 0.92 });
    v.surf = path(g, '', { fill: 'none', stroke: C('water-deep'), 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    // 目もり（1Lます：10の目もり。5dL は長い線）
    if (v.marks) {
      v.markG = el('g', {}, g); v.markLines = [];
      for (let i = 1; i < v.marks; i++) { const y = -h * i / v.marks; v.markLines.push(line(v.markG, w / 2 - w * (i === 5 ? 0.34 : 0.2), y, w / 2, y, { stroke: C('masu-mark'), 'stroke-width': i === 5 ? 3 : 2 })); }
      v.markNums = el('g', { opacity: 0 }, g); v.nums = [];
      for (let i = 1; i <= v.marks; i++) v.nums.push(txt(v.markNums, w / 2 - w * 0.4, -h * i / v.marks + 5, `${i}`, { 'text-anchor': 'end', 'font-size': Math.max(11, k * 0.7), fill: C('masu-mark'), class: 'ui' }));
    }
    // 口のあいた ふち（上の辺だけ あける）
    const op = P.slice(1).concat([P[0]]);
    path(g, 'M' + op.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'), { fill: 'none', stroke: v.masu ? C('masu-edge') : C('glass-line'), 'stroke-width': t, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    // ひかり
    const bx = Math.min(...P.map(p => p[0]));
    rect(g, bx + Math.max(3, w * 0.1), -h * 0.85, Math.max(3, w * 0.06), h * 0.6, { rx: 3, fill: C('paper'), opacity: 0.5 });
    deco(v, g, w, h, t);
    if (v.tagText) txt(g, 0, -h - 8, v.tagText, { 'font-size': Math.max(12, Math.min(18, k * 0.7)), fill: C('masu-mark'), class: 'ui' });
    if (v.tag) rect(g, -w / 2 - t - 2, -h * 0.5 - k * 0.6, k * 1.2, k * 1.2, { rx: 4, fill: v.tag });
    v.label = txt(layer, v.x, sc.tableY + Math.max(20, Math.min(26, (F.bottom - sc.tableY) * 0.62)), v.name, { 'font-size': Math.max(12, Math.min(17, k * 0.9)), fill: v.tag || C('ink-soft') });
    g.addEventListener('pointerdown', e => { e.stopPropagation(); if (sc.onTap) sc.onTap(v); });
  }
  function deco(v, g, w, h, t) {
    const ln = C('glass-line');
    if (v.deco === 'cap') rect(g, -w * 0.3, -h - h * 0.07, w * 0.6, h * 0.07, { rx: 3, fill: C('face-1') });
    if (v.deco === 'pet') { rect(g, -w * v.k / 2 - 1, -h - h * 0.05, w * v.k + 2, h * 0.05, { rx: 2, fill: C('face-4') }); rect(g, -w / 2 - t / 2, -h * 0.5, w + t, h * 0.14, { fill: C('paper'), stroke: C('line'), 'stroke-width': 1 }); }
    if (v.deco === 'kettle') { path(g, `M${w / 2},${-h * 0.25}L${w * 0.78},${-h * 0.72}`, { stroke: ln, 'stroke-width': Math.max(4, w * 0.06), 'stroke-linecap': 'round', fill: 'none' }); path(g, `M${-w * 0.26},${-h * 1.02}Q0,${-h * 1.35} ${w * 0.26},${-h * 1.02}`, { stroke: C('ink-soft'), 'stroke-width': Math.max(3, w * 0.03), fill: 'none' }); }
    if (v.deco === 'pot') { rect(g, -w / 2 - w * 0.12, -h * 0.86, w * 0.12, h * 0.1, { rx: 3, fill: C('ink-soft') }); rect(g, w / 2, -h * 0.86, w * 0.12, h * 0.1, { rx: 3, fill: C('ink-soft') }); }
    if (v.deco === 'bucket') path(g, `M${-w / 2},${-h}Q0,${-h * 1.35} ${w / 2},${-h}`, { stroke: C('ink-soft'), 'stroke-width': Math.max(2, w * 0.012), fill: 'none' });
    if (v.deco === 'gable') { path(g, `M${-w / 2},${-h}L${-w * 0.3},${-h - h * 0.12}H${w * 0.3}L${w / 2},${-h}`, { fill: C('paper'), stroke: C('obj-pack-line'), 'stroke-width': 2 }); }
  }
  // 水面（かたむいていないときは なみを つける）
  sc.draw = () => {
    if (!layer) return;
    for (const v of sc.vs) {
      if (!v.g) continue;
      const k = sc.k, h = v.h * k;
      if (v.px == null) v.g.setAttribute('transform', `translate(${v.x.toFixed(1)},${(sc.tableY - v.lift).toFixed(1)})`);
      else { const [lx, ly] = lipOf(pxPoly(v, v.Pcm), v.sign); v.g.setAttribute('transform', `translate(${v.px.toFixed(1)},${v.py.toFixed(1)}) rotate(${v.rot.toFixed(2)}) translate(${(-lx).toFixed(1)},${(-ly).toFixed(1)})`); }
      v.ring.setAttribute('opacity', sc.sel === v ? 1 : 0);
      const W = waterPoly(v.Pcm, v.vol / v.cap, v.rot);
      if (!W) { v.water.setAttribute('d', ''); v.surf.setAttribute('d', ''); continue; }
      const P = pxPoly(v, W);
      if (Math.abs(v.rot) < 0.5) {
        const top = Math.min(...P.map(p => p[1]));
        let i = P.findIndex((p, j) => Math.abs(p[1] - top) < 0.01 && Math.abs(P[(j + 1) % P.length][1] - top) < 0.01);
        if (i < 0) i = P.length - 1;
        const R = P.slice(i + 1).concat(P.slice(0, i + 1));   // 上の辺が「最後→最初」になるように回す
        const a = R[R.length - 1], b = R[0], n = 16, amp = v.wave * Math.min(5, k * 0.3) * (sc.tableY - top > 2 ? 1 : 0);
        let d = 'M' + R.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'), sd = '';
        for (let j = 0; j <= n; j++) { const xx = lerp(a[0], b[0], j / n), yy = top + Math.sin(j / n * Math.PI * 2 + loop * 0.15) * amp * Math.sin(j / n * Math.PI); d += `L${xx.toFixed(1)},${yy.toFixed(1)}`; sd += (j ? 'L' : 'M') + xx.toFixed(1) + ',' + yy.toFixed(1); }
        v.water.setAttribute('d', d + 'Z'); v.surf.setAttribute('d', sd);
      } else { v.water.setAttribute('d', dOf(P)); v.surf.setAttribute('d', ''); }
    }
  };
  // なみが おさまるまで描きなおす（経過時間で）
  let last = performance.now();
  const tick = now => { if (!sc.alive) return; const dt = Math.min(0.05, (now - last) / 1000) / Math.max(0.05, speedNow()); last = now; loop++; let any = false; for (const v of sc.vs) if (v.wave > 0.02) { v.wave *= Math.pow(0.12, dt); any = true; } else v.wave = 0; if (any) sc.draw(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  sc.dispose = () => { sc.alive = false; cancelAnimationFrame(raf); if (sc.loupe) sc.loupe.remove(); };
  sc.select = v => { sc.vs.forEach(x => { x.lift = 0; }); sc.sel = v; if (v) v.lift = 10; sc.draw(); };
  sc.levelY = v => sc.tableY - v.h * sc.k * levelFrac(v);
  const levelFrac = v => { const W = waterPoly(v.Pcm, v.vol / v.cap, 0); if (!W) return 0; return -Math.min(...W.map(p => p[1])) / v.h; };
  sc.tap = v => tapOf(F, v.x, sc.tableY - v.h * sc.k * 0.5 - v.lift);
  sc.center = v => ({ x: v.x, y: sc.tableY - v.h * sc.k * 0.5, r: Math.max(v.w, v.h) * sc.k * 0.55 });
  const done = () => { sc.busy = false; if (sc.pending) sc.layout(); };
  function drawSpill(dst) {
    if (sc.spill <= 0) return;
    if (!puddle || !puddle.isConnected) puddle = el('ellipse', { fill: C('water'), opacity: 0.55 }, under);
    const r = Math.min(F.W * 0.22, Math.sqrt(sc.spill) * sc.k * 0.4);
    puddle.setAttribute('cx', (dst.x + dst.w * sc.k * 0.5).toFixed(1)); puddle.setAttribute('cy', (sc.tableY + 6).toFixed(1)); puddle.setAttribute('rx', Math.max(0, r).toFixed(1)); puddle.setAttribute('ry', Math.max(0, r * 0.18).toFixed(1));
  }
  // 注ぐ：src を持ち上げて dst の上へ。careful：dst が いっぱいに なったら止める（はかるとき）。amount：その量だけ
  sc.pour = async (src, dst, op = {}) => {
    const tag = S.token; sc.busy = true; ctx.sfx.pop();
    src.lift = 0; dst.lift = 0; if (sc.sel) sc.sel = null;
    const k = sc.k, sw = src.w * k, sh = src.h * k, dl = dst.x - dst.w * k / 2, dr = dst.x + dst.w * k / 2, dTop = sc.tableY - dst.h * k;
    src.sign = op.sign || ((dl - sw > 8) ? 1 : (F.W - dr - sw > 8) ? -1 : (src.x < dst.x ? 1 : -1));
    const L0 = lipOf(pxPoly(src, src.Pcm), src.sign), lipX0 = src.x + L0[0], lipY0 = sc.tableY + L0[1];
    src.px = lipX0; src.py = lipY0; layer.appendChild(src.g);
    const tx = src.sign > 0 ? dl + Math.min(10, dst.w * k * 0.2) : dr - Math.min(10, dst.w * k * 0.2), tyLo = dTop - 10;
    // とちゅうの 入れ物の 上を こえて 運ぶ（体の 下が ぶつからない 高さ）
    const x0 = Math.min(src.x, dst.x), x1 = Math.max(src.x, dst.x), mid = sc.vs.filter(v => v !== src && v !== dst && v.x > x0 && v.x < x1);
    let tyHi = Math.min(dTop - 26, lipY0 - 8);
    if (mid.length) tyHi = Math.min(tyHi, Math.min(...mid.map(v => sc.tableY - v.h * k)) - sh - 10);
    tyHi = Math.max(F.top + 6, tyHi);
    const fast = op.fast ? 0.6 : 1;
    await tween(0.5 * fast, e => { src.px = lerp(lipX0, tx, E.io(e)); src.py = lerp(lipY0, tyHi, E.io(e)) - Math.sin(e * Math.PI) * 20; sc.draw(); });
    if (!alive(tag)) return;
    const th0 = tiltFor(src.Pcm, src.vol / src.cap, src.sign);
    await tween(0.36 * fast, e => { src.rot = src.sign * th0 * E.out(e); src.py = lerp(tyHi, tyLo, e); sc.draw(); });
    if (!alive(tag)) return;
    const stream = path(fx, '', { fill: 'none', stroke: C('water'), 'stroke-width': Math.max(4, k * 0.35), 'stroke-linecap': 'round', opacity: 0.9 });
    ctx.sfx.pour && ctx.sfx.pour(0.9);
    const rate = clamp(Math.min(src.cap, dst.cap) * 0.9, 160, 1600) * (op.fast ? 1.8 : 1);
    const room = dst.cap - dst.vol;
    let want = op.amount != null ? Math.min(op.amount, src.vol) : op.careful ? Math.min(src.vol, room) : src.vol, moved = 0;
    await new Promise(res => {
      let t0 = performance.now();
      const f = now => {
        if (!alive(tag) || !sc.alive) return res();
        const dt = Math.min(0.05, (now - t0) / 1000) / Math.max(0.05, speedNow()); t0 = now;
        const dv = Math.min(want - moved, rate * dt);
        src.vol -= dv; dst.vol += dv; moved += dv; dst.wave = 1;
        if (dst.vol > dst.cap) { sc.spill += dst.vol - dst.cap; dst.vol = dst.cap; }
        const left = want - moved;
        src.rot = src.sign * (src.vol > 0.5 ? Math.min(150, tiltFor(src.Pcm, src.vol / src.cap, src.sign) + 6) : 125);
        const sy = Math.min(sc.levelY(dst), sc.tableY - 2);
        stream.setAttribute('d', `M${src.px.toFixed(1)},${src.py.toFixed(1)}Q${(src.px + src.sign * 10).toFixed(1)},${(src.py + 6).toFixed(1)} ${(src.px + src.sign * 12).toFixed(1)},${sy.toFixed(1)}`);
        drawSpill(dst); sc.draw();
        if (left <= 0.01) { src.vol = Math.max(0, src.vol); res(); } else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    stream.remove();
    if (!alive(tag)) return;
    if (src.vol < 0.5) src.vol = 0;
    const r1 = src.rot;
    await tween(0.34 * fast, e => { src.rot = r1 * (1 - E.io(e)); src.py = lerp(tyLo, tyHi, e); sc.draw(); });
    if (!alive(tag)) return;
    await tween(0.44 * fast, e => { src.px = lerp(tx, lipX0, E.io(e)); src.py = lerp(tyHi, lipY0, E.io(e)); sc.draw(); });
    if (!alive(tag)) return;
    src.px = null; src.rot = 0; sc.draw(); done();
    return moved;
  };
  // じゃぐちから くむ（to まで）
  sc.fill = async (v, to, fast) => {
    const tag = S.token; sc.busy = true; to = to == null ? v.cap : clamp(to, 0, v.cap);
    const k = sc.k, topY = Math.max(F.top + F.cap - 30, sc.tableY - v.h * k - 70);
    const tapG = el('g', {}, fx);
    rect(tapG, v.x - 26, topY - 10, 52, 20, { rx: 8, fill: C('metal'), stroke: C('metal-deep'), 'stroke-width': 2 });
    rect(tapG, v.x - 6, topY + 8, 12, 12, { rx: 3, fill: C('metal-deep') });
    const stream = path(fx, '', { fill: 'none', stroke: C('water'), 'stroke-width': Math.max(5, k * 0.35), 'stroke-linecap': 'round' });
    ctx.sfx.pour && ctx.sfx.pour(0.6);
    const a = v.vol;
    await tween((fast ? 0.25 : 0.45) + (fast ? 0.2 : 0.6) * Math.abs(to - a) / v.cap, e => { v.vol = lerp(a, to, e); v.wave = 1; stream.setAttribute('d', `M${v.x.toFixed(1)},${(topY + 20).toFixed(1)}V${sc.levelY(v).toFixed(1)}`); sc.draw(); });
    stream.remove(); tapG.remove();
    if (!alive(tag)) return;
    v.vol = to; sc.draw(); done();
  };
  // すてる（流しへ）
  sc.dump = async (v, fast) => {
    const tag = S.token; sc.busy = true; const a = v.vol, sgn = v.x > F.W / 2 ? 1 : -1;
    v.sign = sgn; const [lx, ly] = lipOf(pxPoly(v, v.Pcm), sgn); v.px = v.x + lx; v.py = sc.tableY + ly;
    ctx.sfx.pour && ctx.sfx.pour(0.5);
    await tween(fast ? 0.4 : 0.8, e => { v.rot = sgn * 105 * Math.sin(Math.min(1, e * 1.4) * Math.PI / 2); v.vol = a * (1 - e); sc.draw(); });
    if (!alive(tag)) return;
    v.vol = 0;
    await tween(0.25, e => { v.rot = sgn * 105 * (1 - e); sc.draw(); });
    if (!alive(tag)) return;
    v.px = null; v.rot = 0; sc.draw(); done();
  };
  // 目もりの数字を下から1つずつ出す（V5：目もりを「1dL のいくつ分」として数える）
  sc.countMarks = async (v, n, sec = 0.28) => {
    if (!v.markNums) return; v.markNums.setAttribute('opacity', 1); v.nums.forEach(t => t.setAttribute('opacity', 0));
    for (let j = 0; j < Math.min(n, v.nums.length); j++) { v.nums[j].setAttribute('opacity', 1); v.markLines[j] && v.markLines[j].setAttribute('stroke', C('ok')); ctx.sfx.tick(j); if (!(await wait(sec))) return; }
  };
  sc.resetMarks = v => { if (!v.markNums) return; v.markNums.setAttribute('opacity', 0); v.markLines.forEach(l => l.setAttribute('stroke', C('masu-mark'))); };
  sc.showNums = (v, on) => { if (!v.markNums) return; v.markNums.setAttribute('opacity', on ? 1 : 0); v.nums.forEach(t => t.setAttribute('opacity', 1)); };
  F.onResize(() => sc.layout());
  if (o.list) sc.set(o.list);
  return sc;
}
export { hai };
