// 時計・空・24時間の帯（見本 v1 の 20-clock を移したもの）。tokei・tokei-quiz・jikan-obi が使う。
// 時刻 t は「0時からの分」（小数でよい。止めたら1分に丸める）。長針は指の角度の差（±30分で折り返し）を足していく。
import { el, C, polar, sector, clamp, lerp, txt, line, circle, path, rect, show, dragOn, tween, E } from './_flat.js';
import { R } from '../core/records.js';
import { sfx } from '../core/sound.js';

export const MIN = t => ((Math.round(t) % 60) + 60) % 60;
export const tod = t => ((Math.round(t) % 1440) + 1440) % 1440;
export const hour12 = t => { const h = Math.floor(((Math.round(t) % 720) + 720) % 720 / 60); return h === 0 ? 12 : h; };

function gearPath(r, n, th) {
  let d = ''; const da = 2 * Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a = i * da, pts = [[a, r - th / 2], [a + da * 0.2, r + th / 2], [a + da * 0.45, r + th / 2], [a + da * 0.65, r - th / 2]];
    for (const [aa, rr] of pts) d += (d ? 'L' : 'M') + (rr * Math.cos(aa)).toFixed(2) + ',' + (rr * Math.sin(aa)).toFixed(2);
  }
  return d + 'Z';
}

// 時計の文字盤。st の値を変えて update() で描き直す
export function makeClock(parent, { cx, cy, R: Rr, nums = R.settings.clockNums !== false, five = !!R.settings.clockFive }) {
  const g = el('g', {}, parent), e = {};
  const st = { t: 7 * 60, start: null, room: false, roomFor: null, five, gear: false, ghost: null, minSector: false, nums, laps: true };
  const Rd = Rr;
  circle(g, cx, cy + 6, Rd * 1.06, { fill: C('line') });
  circle(g, cx, cy, Rd * 1.06, { fill: C('ink') });
  // 裏の歯車（なかを みる）
  e.gears = el('g', {}, g);
  const base = Rd * 0.075, gy2 = cy + Rd * 0.2, x1 = cx - Rd * 0.55, x2 = x1 + base + base * 3;
  const ang = -35 * Math.PI / 180, x3 = x2 + base * 5 * Math.cos(ang), y3 = gy2 + base * 5 * Math.sin(ang);
  circle(e.gears, cx, cy, Rd, { fill: C('gear-bg') });
  e.g3 = path(e.gears, gearPath(base * 4, 32, base * 0.5), { fill: C('gear-3') }); e.g3pos = `translate(${x3},${y3})`;
  e.g2 = el('g', {}, e.gears); e.g2pos = `translate(${x2},${gy2})`;
  path(e.g2, gearPath(base * 3, 24, base * 0.5), { fill: C('gear-2') }); path(e.g2, gearPath(base, 8, base * 0.45), { fill: C('gear-2b') });
  e.g1 = path(e.gears, gearPath(base, 8, base * 0.45), { fill: C('gear-1') }); e.g1pos = `translate(${x1},${gy2})`;
  [[x1, gy2, 'gear-1'], [x2, gy2, 'gear-2b'], [x3, y3, 'gear-3']].forEach(([x, y, c]) => circle(e.gears, x, y, base * 0.3, { fill: C('ink'), stroke: C(c), 'stroke-width': 2 }));
  txt(e.gears, x1, gy2 + base * 2.2, 'ながい はり', { 'font-size': Math.max(11, Rd * 0.07), fill: C('gear-ink-1') });
  txt(e.gears, x3 + base * 2.5, y3 - base * 4.6, 'みじかい はり', { 'font-size': Math.max(11, Rd * 0.07), fill: C('gear-ink-3') });
  e.face = circle(g, cx, cy, Rd, { fill: C('paper') });
  e.room = path(g, '', { fill: C('yamabuki'), opacity: 0.38 });
  e.minSec = path(g, '', { fill: C('sora-soft'), opacity: 0.55 });
  e.elapsedFull = circle(g, cx, cy, Rd * 0.86, { fill: C('sora-soft'), opacity: 0.28 });
  e.elapsed = path(g, '', { fill: C('sora'), opacity: 0.32 });
  e.ticks = el('g', {}, g);
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0, [a1, b1] = polar(cx, cy, Rd * 0.95, i * 6), [a2, b2] = polar(cx, cy, Rd * (big ? 0.84 : 0.9), i * 6);
    line(e.ticks, a1, b1, a2, b2, { 'stroke-width': big ? Math.max(2.5, Rd * 0.022) : Math.max(1.2, Rd * 0.009) });
  }
  e.nums = el('g', {}, g);
  for (let k = 1; k <= 12; k++) { const [x, y] = polar(cx, cy, Rd * 0.7, k * 30); txt(e.nums, x, y + Rd * 0.065, String(k), { 'font-size': Rd * 0.19 }); }
  e.five = el('g', {}, g);
  e.fiveCards = [];
  for (let k = 0; k < 12; k++) {
    const [x, y] = polar(cx, cy, Rd * 1.2, k * 30), cg = el('g', { 'data-five': k * 5 }, e.five);
    circle(cg, x, y, Math.max(14, Rd * 0.1), { fill: C('paper'), stroke: C('sora'), 'stroke-width': 2 });
    txt(cg, x, y + Math.max(5, Rd * 0.035), String(k * 5), { 'font-size': Math.max(13, Rd * 0.095), fill: C('sora'), class: 'ui' });
    e.fiveCards.push({ x, y, m: k * 5 });
  }
  e.ghost = line(g, cx, cy, cx, cy, { stroke: C('sora'), 'stroke-width': Math.max(5, Rd * 0.045), opacity: 0.35, 'stroke-dasharray': '2 9' });
  e.hh = line(g, cx, cy, cx, cy - Rd * 0.5, { stroke: C('ok'), 'stroke-width': Math.max(8, Rd * 0.075) });
  e.mh = line(g, cx, cy, cx, cy - Rd * 0.82, { stroke: C('sora'), 'stroke-width': Math.max(5, Rd * 0.045) });
  circle(g, cx, cy, Math.max(6, Rd * 0.05), { fill: C('ink') });
  e.sec = line(g, cx, cy + Rd * 0.12, cx, cy - Rd * 0.88, { stroke: C('ok'), 'stroke-width': 2 }); show(e.sec, false);
  const api = {
    g, st, e, cx, cy, R: Rd,
    update() {
      const t = st.t, ma = (t % 60 + 60) % 60 * 6, ha = (((t % 720) + 720) % 720) * 0.5;
      e.mh.setAttribute('transform', `rotate(${ma} ${cx} ${cy})`);
      e.hh.setAttribute('transform', `rotate(${ha} ${cx} ${cy})`);
      const rh = st.roomFor != null ? st.roomFor : hour12(t);
      e.room.setAttribute('d', (st.room || st.roomFor != null) ? sector(cx, cy, Rd * 0.62, (rh % 12) * 30, (rh % 12) * 30 + 30) : '');
      e.minSec.setAttribute('d', st.minSector ? sector(cx, cy, Rd * 0.9, 0, MIN(t) * 6) : '');
      show(e.five, st.five); show(e.gears, st.gear); show(e.nums, st.nums || st.gear);
      e.face.setAttribute('opacity', st.gear ? 0.22 : 1); e.nums.setAttribute('opacity', st.gear ? 0.55 : 1);
      if (st.gear) {
        e.g1.setAttribute('transform', `${e.g1pos} rotate(${t * 6})`);
        e.g2.setAttribute('transform', `${e.g2pos} rotate(${-t * 2})`);
        e.g3.setAttribute('transform', `${e.g3pos} rotate(${t * 0.5})`);
      }
      if (st.ghost != null) { const [x, y] = polar(cx, cy, Rd * 0.82, (st.ghost % 60) * 6); e.ghost.setAttribute('x2', x); e.ghost.setAttribute('y2', y); show(e.ghost, true); } else show(e.ghost, false);
      if (st.start != null) {
        const d = Math.max(0, t - st.start), laps = Math.floor(d / 60), a0 = (st.start % 60 + 60) % 60 * 6;
        show(e.elapsedFull, laps >= 1 && st.laps);
        e.elapsed.setAttribute('d', sector(cx, cy, Rd * 0.86, a0, a0 + (d % 60) * 6));
      } else { show(e.elapsedFull, false); e.elapsed.setAttribute('d', ''); }
      if (st.secOn) { show(e.sec, true); e.sec.setAttribute('transform', `rotate(${(st.sec || 0) * 6} ${cx} ${cy})`); } else show(e.sec, false);
      api.onUpdate && api.onUpdate(t);
    },
    set(t) { st.t = t; api.update(); },
    hit(p) { return Math.hypot(p.x - cx, p.y - cy) <= Rd * 1.12; },
    angMin(p) { let a = Math.atan2(p.x - cx, -(p.y - cy)) * 180 / Math.PI; if (a < 0) a += 360; return a / 6; },
    // 長針の先の座標（E2E が指でなぞる起点）
    tip(t = st.t) { return polar(cx, cy, Rd * 0.78, (t % 60 + 60) % 60 * 6); },
    // 長針を、いまの位置から目標の分（時計回りか近いほう）まで回すなぞり方（点の列）
    dragPath(target) {
      let d = target - st.t; if (Math.abs(d) > 720) d = ((d % 720) + 720) % 720;
      const n = Math.max(6, Math.ceil(Math.abs(d) / 4)), pts = [];
      for (let i = 0; i <= n; i++) { const tt = st.t + d * i / n; pts.push(polar(cx, cy, Rd * 0.78, (tt % 60 + 60) % 60 * 6)); }
      return pts;
    },
    async moveTo(target, sec, tick = true) {
      const a = st.t; let last = Math.floor(a);
      await tween(sec, k => { st.t = lerp(a, target, k); if (Math.floor(st.t) !== last) { last = Math.floor(st.t); if (tick && sec < 2.5) sfx.tap(); } api.update(); }, E.io);
      st.t = target; api.update();
    },
    reset() { Object.assign(st, { start: null, room: false, roomFor: null, five: !!R.settings.clockFive, gear: false, ghost: null, minSector: false, secOn: false }); api.update(); },
  };
  api.update();
  return api;
}

// 長針を指で回す。can() が false のときは動かない。onMove(t)・onEnd(t)
export function bindHand(F, clock, { can = () => true, onMove, onEnd, onStart } = {}) {
  let drag = null;
  return dragOn(F.svg, F, {
    hit: p => (can() && clock.hit(p) ? true : null),
    start: p => { drag = { last: clock.angMin(p) }; onStart && onStart(); },
    move: p => {
      if (!drag) return;
      const m = clock.angMin(p); let d = m - drag.last; if (d > 30) d -= 60; if (d < -30) d += 60;
      const before = Math.floor(clock.st.t); clock.st.t += d;
      if (clock.st.t < 0) clock.st.t += 1440; if (clock.st.t > 1440 * 4) clock.st.t -= 1440;
      if (Math.floor(clock.st.t) !== before) sfx.tap();
      drag.last = m; clock.update(); onMove && onMove(clock.st.t);
    },
    end: () => { if (!drag) return; drag = null; clock.st.t = Math.round(clock.st.t); clock.update(); onEnd && onEnd(clock.st.t); },
  });
}

// 空のまど（時刻で色・太陽・月・星・家の窓が変わる）
const SKY_H = [0, 4.6, 5.6, 6.6, 9, 12, 15, 17, 18.2, 19.3, 24];
const hx = s => { const m = /^#?([0-9a-f]{6})$/i.exec(s.trim()); const v = m ? m[1] : '888888'; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); };
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
export function skyAt(hour) {
  for (let i = 0; i < SKY_H.length - 1; i++) if (hour >= SKY_H[i] && hour <= SKY_H[i + 1]) { const k = (hour - SKY_H[i]) / (SKY_H[i + 1] - SKY_H[i]); return [mix(C(`sky-${i}-t`), C(`sky-${i + 1}-t`), k), mix(C(`sky-${i}-b`), C(`sky-${i + 1}-b`), k)]; }
  return [C('sky-0-t'), C('sky-0-b')];
}
export const dayWord = h => (h >= 5 && h < 10 ? 'あさ' : h >= 10 && h < 15 ? 'ひる' : h >= 15 && h < 18.5 ? 'ゆうがた' : 'よる');
let skyN = 0;
export function makeSky(parent, { x, y, w, h }) {
  const id = 'sky' + (++skyN), g = el('g', {}, parent), e = {};
  const defs = el('defs', {}, g), gr = el('linearGradient', { id: id + 'G', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  e.s0 = el('stop', { offset: '0' }, gr); e.s1 = el('stop', { offset: '1' }, gr);
  const cp = el('clipPath', { id: id + 'C' }, defs); rect(cp, x, y, w, h, { rx: 18 });
  const sky = el('g', { 'clip-path': `url(#${id}C)` }, g);
  rect(sky, x, y, w, h, { fill: `url(#${id}G)` });
  e.stars = el('g', {}, sky);
  for (let i = 0; i < 26; i++) circle(e.stars, x + ((i * 97) % 100) / 100 * w, y + ((i * 37) % 60) / 100 * h, ((i * 13) % 14) / 10 + 0.6, { fill: C('sky-ink-night') });
  e.sun = el('g', {}, sky); circle(e.sun, 0, 0, Math.max(12, h * 0.09), { fill: C('sun') }); circle(e.sun, 0, 0, Math.max(18, h * 0.14), { fill: C('sun'), opacity: 0.25 });
  e.moon = el('g', {}, sky); circle(e.moon, 0, 0, Math.max(10, h * 0.075), { fill: C('moon') }); circle(e.moon, Math.max(4, h * 0.03), -Math.max(3, h * 0.02), Math.max(9, h * 0.07), { fill: `url(#${id}G)` });
  const gy = y + h * 0.8;
  path(sky, `M${x},${gy}Q${x + w * 0.25},${gy - h * 0.12} ${x + w * 0.5},${gy - h * 0.02}T${x + w},${gy - h * 0.06}V${y + h}H${x}Z`, { fill: C('grass') });
  const hxp = x + w * 0.72, hy = gy - h * 0.02, hs = h * 0.16;
  path(sky, `M${hxp - hs},${hy}v${-hs * 0.8}l${hs},${-hs * 0.7}l${hs},${hs * 0.7}v${hs * 0.8}z`, { fill: C('house') });
  e.win = rect(sky, hxp - hs * 0.35, hy - hs * 0.65, hs * 0.7, hs * 0.45, { fill: C('house-win') });
  rect(g, x + 1, y + 1, w - 2, h - 2, { rx: 17, fill: 'none', stroke: C('line'), 'stroke-width': 3 });
  const fs = Math.max(16, Math.min(24, h * 0.13));
  e.word = txt(g, x + 16, y + fs + 10, '', { 'font-size': fs, 'text-anchor': 'start' });
  e.dig = txt(g, x + w - 16, y + fs + 10, '', { 'font-size': fs, 'text-anchor': 'end', class: 'ui' });
  const api = {
    g, digital: false,
    update(t) {
      const hr = (((t % 1440) + 1440) % 1440) / 60, [top, bot] = skyAt(hr);
      e.s0.setAttribute('stop-color', top); e.s1.setAttribute('stop-color', bot);
      const night = hr < 5.4 || hr > 19 ? 1 : hr < 6.4 ? (6.4 - hr) : hr > 18.2 ? (hr - 18.2) / 0.8 : 0;
      e.stars.setAttribute('opacity', clamp(night, 0, 1));
      const arcH = h * 0.62, sp = (hr - 6) / 12;
      show(e.sun, sp > -0.05 && sp < 1.05);
      e.sun.setAttribute('transform', `translate(${x + w * (0.08 + 0.84 * sp)},${gy - Math.sin(Math.PI * clamp(sp, 0, 1)) * arcH + 6})`);
      const mp = (((hr - 18) + 24) % 24) / 12;
      show(e.moon, mp > -0.05 && mp < 1.05);
      e.moon.setAttribute('transform', `translate(${x + w * (0.08 + 0.84 * mp)},${gy - Math.sin(Math.PI * clamp(mp, 0, 1)) * arcH + 6})`);
      e.win.setAttribute('fill', night > 0.5 ? C('house-light') : C('house-win'));
      e.word.textContent = dayWord(hr);
      const ink = night > 0.5 || hr > 17.5 ? C('sky-ink-night') : C('sky-ink-day');
      e.word.setAttribute('fill', ink); e.dig.setAttribute('fill', ink);
      e.dig.textContent = api.digital ? (hr < 12 ? 'ごぜん ' : 'ごご ') + `${Math.floor(hr % 12)}:${String(MIN(t)).padStart(2, '0')}` : '';
    },
  };
  return api;
}

// 24時間の帯（午前・午後の2本）。時計と連動して、いまの時刻の印と、たった時間の帯を出す
export function makeBand(parent, { x, y, w, h }) {
  const g = el('g', {}, parent), e = {};
  // 2本の帯＋目もりの数字が h に収まるように（6＋帯＋22＋帯＋数字24）
  const rowH = Math.max(16, (h - 54) / 2), lab = Math.min(64, w * 0.17);
  const x0 = x + lab, x1 = x + w - 8, rowY = [y + 6, y + 6 + rowH + 22];
  ['ごぜん', 'ごご'].forEach((t, i) => {
    txt(g, x, rowY[i] + rowH * 0.68, t, { 'font-size': Math.min(17, rowH * 0.6), fill: C('ink-soft'), 'text-anchor': 'start' });
    rect(g, x0, rowY[i], x1 - x0, rowH, { rx: 8, fill: i ? C('band-pm') : C('band-am'), stroke: C('line'), 'stroke-width': 1.5 });
    for (let k = 0; k <= 12; k++) {
      const xx = x0 + (x1 - x0) * k / 12;
      line(g, xx, rowY[i] + rowH, xx, rowY[i] + rowH + (k % 3 === 0 ? 8 : 4), { stroke: C('ink-soft'), 'stroke-width': 1.5 });
      if (k % 3 === 0) txt(g, xx, rowY[i] + rowH + 20, String(k), { 'font-size': 12, fill: C('ink-soft'), class: 'ui' });
    }
  });
  e.spans = el('g', {}, g); e.marks = el('g', {}, g);
  e.mark = el('g', {}, g);
  path(e.mark, 'M-7,-10L7,-10L0,0Z', { fill: C('ok') }); line(e.mark, 0, 0, 0, rowH, { stroke: C('ok'), 'stroke-width': 3 });
  e.flash = el('g', {}, g);
  const xOf = T => x0 + (x1 - x0) * (T % 720) / 720;
  const api = {
    g, x0, x1, rowY, rowH, xOf, e,
    rowOf: T => (tod(T) < 720 ? 0 : 1),
    // 帯の上の点 → 時刻（分）
    tAt(p) { const row = p.y > rowY[1] - 11 ? 1 : 0; return row * 720 + clamp(Math.round((p.x - x0) / (x1 - x0) * 720), 0, 719); },
    hit(p) { return p.x >= x0 - 10 && p.x <= x1 + 10 && p.y >= rowY[0] - 12 && p.y <= rowY[1] + rowH + 12; },
    update(t, start = null, flash = null) {
      const T = tod(t), row = T < 720 ? 0 : 1;
      e.mark.setAttribute('transform', `translate(${xOf(T)},${rowY[row]})`);
      while (e.spans.firstChild) e.spans.firstChild.remove();
      if (start != null && t > start) api.span(start, t, C('sora'), 0.45);
      while (e.flash.firstChild) e.flash.firstChild.remove();
      if (flash != null) [0, 1].forEach(r => circle(e.flash, x0 + (x1 - x0) * flash / 12, rowY[r] + rowH / 2, rowH * 0.42, { fill: 'none', stroke: C('yamabuki'), 'stroke-width': 4 }));
    },
    // a〜b の帯（午前・午後をまたぐときは2本に分ける）
    span(a, b, color, op = 0.45, into = e.spans) {
      const out = [];
      while (a < b - 0.01) {
        const ta = tod(a), r = ta < 720 ? 0 : 1, segEnd = Math.min(b, a + (720 - (ta % 720)));
        const xa = xOf(ta), xb = x0 + (x1 - x0) * (((segEnd - a) + (ta % 720)) / 720);
        out.push(rect(into, xa, rowY[r] + 3, Math.max(1, xb - xa), rowH - 6, { rx: 5, fill: color, opacity: op }));
        a = segEnd;
      }
      return out;
    },
    showMark(v) { show(e.mark, v); },
  };
  return api;
}

// 場面の配置：時計（＋空のまど・24時間の帯）。上の帯と下の棚のあいだ（F.top〜F.bottom）に収める
export function clockScene(F, { sky = true, band = true, side = 0, box = 0 } = {}) {
  const g = F.layer('scene'), W = F.W, top = F.top + F.cap, H = F.bottom - F.top - F.cap - 8;
  // 横ならび（時計が左・空と帯が右）は、幅が広く横長のときだけ。スマホ縦では縦に積む
  const land = W >= 640 && W > H * 1.1, L = { land };
  if (!land && H < 380) sky = false;            // 高さが足りないときは空のまどを出さない
  if (!sky && !band) {
    L.R = Math.min(H * 0.38, W * (side ? 0.22 : 0.32)); L.cx = side ? Math.max(L.R * 1.32 + 12, W * 0.3) : W / 2; L.cy = top + H / 2;
  } else if (land) {
    L.R = Math.min(H * 0.36, W * 0.22); L.cx = Math.max(L.R * 1.32 + 12, W * 0.29); L.cy = top + H * 0.5;
    L.sx = L.cx + L.R * 1.32 + Math.max(16, W * 0.03); L.sw = W - L.sx - 20; L.sy = top + 4;
    L.sh = sky || box ? (band ? H * 0.42 : H * 0.7) : 0; L.bx = L.sx; L.bw = L.sw; L.by = L.sy + (L.sh ? L.sh + H * 0.06 : 0); L.bh = Math.min(H * 0.34, 130);
  } else {
    L.bh = band ? (H < 380 ? 88 : 96) : 0; L.by = top + H - L.bh; L.bx = 16; L.bw = W - 32;
    L.sh = box ? Math.max(56, Math.min(H * 0.2, 96)) : sky ? Math.min(H * 0.15, 96) : 0; L.sy = L.by - L.sh - (L.sh ? 10 : 0); L.sx = 16; L.sw = W - 32;
    const avail = L.sy - 8 - top;
    L.R = Math.max(36, Math.min(W * 0.36, avail / 2.3)); L.cx = W / 2; L.cy = top + avail / 2 + 4;
  }
  const out = { g, L };
  if (box && L.sh) out.box = { x: L.sx, y: L.sy, w: L.sw, h: L.sh };
  if (sky && !box && L.sw > 40 && L.sh) out.sky = makeSky(g, { x: L.sx, y: L.sy, w: L.sw, h: L.sh });
  if (band && L.bw > 40) out.band = makeBand(g, { x: L.bx, y: L.by, w: L.bw, h: L.bh });
  out.clock = makeClock(g, { cx: L.cx, cy: L.cy, R: L.R });
  const sync = () => { const t = out.clock.st.t; out.sky && out.sky.update(t); out.band && out.band.update(t, out.clock.st.start, out.flash ?? null); };
  out.clock.onUpdate = sync; out.sync = sync; sync();
  return out;
}

// 生活の場面（わたしの いちにち・せいかつの問題）。絵は形と色だけ（40×40）
export const SCENES = [
  { id: 'wake', label: 'おきる', t: 7 * 60, pm: false },
  { id: 'breakfast', label: 'あさごはん', t: 7 * 60 + 30, pm: false },
  { id: 'school', label: 'がっこうへ', t: 8 * 60, pm: false },
  { id: 'lunch', label: 'きゅうしょく', t: 12 * 60 + 20, pm: true },
  { id: 'snack', label: 'おやつ', t: 15 * 60, pm: true },
  { id: 'dinner', label: 'ゆうごはん', t: 18 * 60 + 30, pm: true },
  { id: 'bath', label: 'おふろ', t: 19 * 60 + 30, pm: true },
  { id: 'sleep', label: 'ねる', t: 21 * 60, pm: true },
];
export { sceneIcon } from '../core/figs.js';
