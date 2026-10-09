// utsusu（N1 間接比較）：動かせない物（つくえ・とびら）の長さを、紙テープに写して運び、別の物に重ねて くらべる。
// opts.pair：desk（つくえの たて と よこ）｜door（つくえの よこ と とびらの はば）。棚で切りかえられる。
// テープの はしを ゆびで のばす → はしまで 来ると「チョキン」→ テープが 運ばれて 重なり、はみ出た分（足りない分）が光る。
// 記録：tape（detail：pair・longer）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, pathOf } from './_flat.js';
import { overhang } from './_nagasa.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

// 形の大きさ（mm のつもり。1年なので数は画面に出さない）
const SIZE = { deskW: 600, deskD: 420, deskH: 700, doorW: 760, doorH: 1900 };
const PAIRS = { desk: 'つくえの たてと よこ', door: 'つくえと とびら' };

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  let pair = opts.pair || 'desk';
  const st = { t: 0, phase: 'pull', cut: false, done: 0 };   // t：のばした テープの長さ（0〜1.15 ×もとの長さ）
  let L = {};
  function layout() {
    const m = Math.max(16, F.W * 0.05), top = F.top + F.cap + 18, bot = F.bottom - 26, H = bot - top, W = F.W - m * 2;
    if (pair === 'desk') {
      const k = Math.min(W / 760, H / 560), w = SIZE.deskW * k, d = SIZE.deskD * k, x = m + (W - w) / 2 + 20 * k, y = top + (H - d) / 2 + 30 * k;
      // テープは たて（左のへり）を 上から下へ写し、よこ（上のへり）に重ねる
      L = { k, desk: { x, y, w, d }, src: { x: x - 10, y, dx: 0, dy: 1, len: d }, dst: { x, y: y - 12, dx: 1, dy: 0, len: w }, srcName: 'つくえの たて', dstName: 'つくえの よこ' };
    } else {
      const k = Math.min(H / 2050, W / (SIZE.deskW + SIZE.doorW + 420)), gy = top + H * 0.97;
      const dw = SIZE.deskW * k, dh = SIZE.deskH * k, ow = SIZE.doorW * k, oh = SIZE.doorH * k, gap = Math.max(40, (W - dw - ow) / 3);
      const dx = m + gap, ox = dx + dw + gap;
      L = { k, gy, desk: { x: dx, y: gy - dh, w: dw, h: dh }, door: { x: ox, y: gy - oh, w: ow, h: oh }, src: { x: dx, y: gy - dh - 10, dx: 1, dy: 0, len: dw }, dst: { x: ox, y: gy - oh * 0.48, dx: 1, dy: 0, len: ow }, srcName: 'つくえの よこ', dstName: 'とびらの はば' };
    }
    L.tw = Math.max(10, 18 * Math.min(1, L.k * 3));   // テープの はば
    draw();
  }
  function draw() {
    F.clearLayers();
    const gb = F.layer('scene'), gt = F.layer('tape'); L.fx = F.layer('fx');
    if (pair === 'desk') {
      const D = L.desk;
      rect(gb, D.x - 6, D.y - 6, D.w + 12, D.d + 12, { rx: 10, fill: C('wood'), stroke: C('wood-deep'), 'stroke-width': 3 });
      rect(gb, D.x, D.y, D.w, D.d, { rx: 6, fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 1.5 });
      for (let i = 1; i < 6; i++) line(gb, D.x + 8, D.y + D.d * i / 6, D.x + D.w - 8, D.y + D.d * i / 6 + 4, { stroke: C('wood'), 'stroke-width': 1, opacity: 0.5 });
      txt(gb, D.x + D.w / 2, D.y + D.d + 36, 'つくえ（うえから みた ところ）', { 'font-size': 15, fill: C('ink-soft'), class: 'ui' });
      txt(gb, D.x - 26, D.y + D.d / 2, 'たて', { 'font-size': 16, fill: C('sora'), class: 'ui', transform: `rotate(-90 ${D.x - 26} ${D.y + D.d / 2})` });
      txt(gb, D.x + D.w / 2, D.y - 22, 'よこ', { 'font-size': 16, fill: C('sora'), class: 'ui' });
    } else {
      const D = L.desk, O = L.door;
      line(gb, F.W * 0.03, L.gy, F.W * 0.97, L.gy, { stroke: C('ink-soft'), 'stroke-width': 3 });
      // つくえ（よこから）
      rect(gb, D.x, D.y, D.w, Math.max(6, D.h * 0.07), { rx: 3, fill: C('wood'), stroke: C('wood-deep'), 'stroke-width': 2 });
      rect(gb, D.x + D.w * 0.04, D.y + D.h * 0.07, Math.max(4, D.w * 0.05), D.h * 0.93, { fill: C('metal-deep') });
      rect(gb, D.x + D.w * 0.91, D.y + D.h * 0.07, Math.max(4, D.w * 0.05), D.h * 0.93, { fill: C('metal-deep') });
      rect(gb, D.x + D.w * 0.12, D.y + D.h * 0.07, D.w * 0.55, D.h * 0.22, { fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 1 });
      txt(gb, D.x + D.w / 2, L.gy + 22, 'つくえ', { 'font-size': 15, fill: C('ink-soft'), class: 'ui' });
      // とびら
      rect(gb, O.x - 8, O.y - 8, O.w + 16, O.h + 8, { fill: C('wood-deep') });
      rect(gb, O.x, O.y, O.w, O.h, { fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 2 });
      rect(gb, O.x + O.w * 0.15, O.y + O.h * 0.08, O.w * 0.7, O.h * 0.3, { rx: 4, fill: C('glass'), stroke: C('glass-line'), 'stroke-width': 2 });
      circle(gb, O.x + O.w * 0.86, O.y + O.h * 0.55, Math.max(4, O.w * 0.04), { fill: C('metal-deep') });
      txt(gb, O.x + O.w / 2, L.gy + 22, 'とびら', { 'font-size': 15, fill: C('ink-soft'), class: 'ui' });
    }
    // テープ（のばす途中 or 運んだあと）
    const T = st.t * L.src.len;
    if (!st.cut) {
      const s = L.src, x2 = s.x + s.dx * T, y2 = s.y + s.dy * T;
      if (T > 0) rect(gt, Math.min(s.x, x2) - (s.dy ? L.tw / 2 : 0), Math.min(s.y, y2) - (s.dx ? L.tw / 2 : 0), s.dx ? T : L.tw, s.dy ? T : L.tw, { fill: C('tape'), stroke: C('tape-line'), 'stroke-width': 1.2, opacity: 0.92 });
      // まき（テープの もと）と、のばす はし
      circle(gt, s.x - s.dx * 16 - s.dy * 20, s.y - s.dy * 16, 14, { fill: C('tape'), stroke: C('tape-line'), 'stroke-width': 2 });
      circle(gt, s.x - s.dx * 16 - s.dy * 20, s.y - s.dy * 16, 5, { fill: C('paper'), stroke: C('tape-line') });
      const hx = x2, hy = y2;
      L.handle = { x: hx, y: hy };
      circle(gt, hx, hy, 16, { fill: C('paper'), stroke: C('ok'), 'stroke-width': 3, class: 'grab' });
      path(gt, s.dy ? `M${hx - 6},${hy - 2}L${hx},${hy + 6}L${hx + 6},${hy - 2}` : `M${hx - 2},${hy - 6}L${hx + 6},${hy}L${hx - 2},${hy + 6}`, { fill: 'none', stroke: C('ok'), 'stroke-width': 3, 'stroke-linecap': 'round' });
      // めあての はし
      const ex = s.x + s.dx * s.len, ey = s.y + s.dy * s.len;
      circle(gt, ex, ey, 7, { fill: 'none', stroke: C('sora'), 'stroke-width': 2, 'stroke-dasharray': '3 3' });
    } else if (st.carry != null) {
      // 運ぶ途中・重ねた あと：src の位置から dst の位置へ（たて→よこ は 回る）
      const s = L.src, d = L.dst, k = st.carry, len = s.len;
      const x = lerp(s.x, d.x, k), y = lerp(s.y, d.y, k) - Math.sin(k * Math.PI) * 40, ang = lerp(Math.atan2(s.dy, s.dx), Math.atan2(d.dy, d.dx), k) * 180 / Math.PI;
      const g = el('g', { transform: `translate(${x},${y}) rotate(${ang})` }, gt);
      rect(g, 0, -L.tw / 2, len, L.tw, { fill: C('tape'), stroke: C('tape-line'), 'stroke-width': 1.2, opacity: 0.94 });
      line(g, len, -L.tw / 2 - 4, len, L.tw / 2 + 4, { stroke: C('ok'), 'stroke-width': 2 });
    }
  }
  const s0 = () => L.src;
  const tOf = p => { const s = s0(); return clamp(((p.x - s.x) * s.dx + (p.y - s.y) * s.dy) / s.len, 0, 1.15); };
  function reset() { st.t = 0; st.cut = false; st.carry = null; st.phase = 'pull'; layout(); ctx.caption(`テープの はし（○）を ゆびで のばして、<b>${L.srcName}</b>を うつそう`, 0, `テープの端を指でのばして、${L.srcName.replace(/ /g, '')}を写そう`); }
  async function cutAndCarry() {
    const tag = S.token; st.phase = 'carry'; st.t = 1; st.cut = true; st.carry = 0; sfx.stamp();
    ctx.caption('チョキン！ テープに うつせたよ', 0, 'チョキン。テープに写せたよ'); draw();
    if (!(await wait(0.8)) || !alive(tag)) return;
    ctx.caption(`<b>${L.dstName}</b>に かさねて みよう`, 0, `${L.dstName.replace(/ /g, '')}に重ねてみよう`);
    await tween(1.4, k => { st.carry = E.io(k); draw(); }); if (!alive(tag)) return;
    sfx.pop(); st.phase = 'done'; st.done++;
    const d = L.dst, longerDst = d.len > L.src.len;
    const yy = d.y - L.tw / 2;
    if (longerDst) overhang(L.fx, d.x + L.src.len, d.x + d.len, yy, L.tw, C('sora-soft'));
    else overhang(L.fx, d.x + d.len, d.x + L.src.len, yy, L.tw);
    const msg = longerDst ? `テープが たりない。<b>${L.dstName}</b>の ほうが ながい` : `テープが はみ出した。<b>${L.srcName}</b>の ほうが ながい`;
    ctx.caption(msg, 0, msg.replace(/<[^>]+>/g, '').replace(/ /g, ''));
    ctx.log('tape', { correct: true, detail: { pair, longer: longerDst ? 'dst' : 'src' } });
    ctx.done('tape');
  }
  let dragging = false;
  dragOn(F.svg, F, {
    hit: p => (st.phase === 'pull' && L.handle && Math.hypot(p.x - L.handle.x, p.y - L.handle.y) < 44 ? true : null),
    start: () => { dragging = true; ctx.hideHud(); },
    move: p => { if (!dragging) return; st.t = tOf(p); draw(); },
    end: p => {
      if (!dragging) return; dragging = false; st.t = tOf(p);
      if (Math.abs(st.t - 1) < 0.07) { cutAndCarry(); return; }
      draw();
      if (st.t > 1) { sfx.off(); ctx.toast('', 'のばしすぎ。<b>はし</b>で とめよう', 2); }
      else if (st.t > 0.05) { sfx.off(); ctx.toast('', 'まだ とちゅう。<b>はし</b>まで のばそう', 2); }
    },
  });
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="くらべる もの">${Object.entries(PAIRS).map(([k, l]) => `<button type="button" data-pair="${k}" aria-pressed="${k === pair}">${l}</button>`).join('')}</div><button class="btn sub small" type="button" data-k="again">もういちど</button></div>`;
  $$p(panel, '[data-pair]').forEach(b => on(b, 'click', () => {
    sfx.tap();
    if (b.dataset.pair === pair) { ctx.toast('', `いまは「${PAIRS[pair]}」だよ`, 1.6); return; }
    if (st.phase === 'carry') { ctx.toast('', 'はこんで いるよ。ちょっと まってね', 1.4); return; }
    pair = b.dataset.pair; $$p(panel, '[data-pair]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pair === pair))); reset();
  }));
  on($p(panel, '[data-k="again"]'), 'click', () => {
    sfx.tap();
    if (st.phase === 'carry') { ctx.toast('', 'はこんで いるよ。ちょっと まってね', 1.4); return; }
    if (st.phase === 'pull' && st.t === 0) { ctx.toast('', 'テープの はし（○）を ゆびで のばして みよう', 1.8); return; }
    reset();
  });
  F.onResize(layout);
  reset();
  return {
    dispose() {},
    test: {
      state: () => ({ pair, phase: st.phase, done: st.done, t: st.t }),
      auto() {
        if (st.done >= 1 && st.phase === 'done') return { done: true };
        if (st.phase !== 'pull') return { wait: 300 };
        const s = s0(), h = L.handle, ex = s.x + s.dx * s.len, ey = s.y + s.dy * s.len;
        return pathOf(F, [[h.x, h.y], [lerp(h.x, ex, 0.5), lerp(h.y, ey, 0.5)], [ex, ey]]);
      },
    },
  };
}
