/* ---------- じかん：とけい（T1・T2） ---------- */
SCENES.clock = (() => {
  const st = { t: 7 * 60 + 55, start: null, room: false, roomFor: null, five: false, digital: false, gear: false, ghost: null, minSector: false, drag: null, canDrag: true, flash: null };
  let svg, Wd, Ht, L = {}, el = {};
  const MIN = t => ((Math.round(t) % 60) + 60) % 60;
  const tod = t => ((Math.round(t) % 1440) + 1440) % 1440;
  function hour12(t) { const h = Math.floor((((Math.round(t)) % 720) + 720) % 720 / 60); return h === 0 ? 12 : h; }
  const fun = m => [0, 1, 3, 4, 6, 8].includes(m % 10) ? 'ぷん' : 'ふん';
  function kidTime(t) { const m = MIN(t), h = hour12(t); return m === 0 ? `${h}じ` : m === 30 ? `${h}じはん` : `${h}じ ${m}${fun(m)}`; }
  function spTime(t) { const m = MIN(t), h = hour12(t); return m === 0 ? `${h}時` : m === 30 ? `${h}時半` : `${h}時${m}分`; }
  function durKid(d) { d = Math.max(0, Math.round(d)); const h = Math.floor(d / 60), m = d % 60; return (h ? `${h}じかん` : '') + (m ? `${h ? ' ' : ''}${m}${fun(m)}` : (h ? '' : '0ぷん')); }
  function polar(cx, cy, r, deg) { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
  function sector(cx, cy, r, a0, a1) {
    if (a1 - a0 >= 359.99) return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
    if (a1 - a0 <= 0.01) return '';
    const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
    return `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0},1 ${x1},${y1}Z`;
  }
  function gearPath(r, n, th) {
    let d = ''; const da = 2 * Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = i * da, pts = [[a, r - th / 2], [a + da * .2, r + th / 2], [a + da * .45, r + th / 2], [a + da * .65, r - th / 2]];
      for (const [aa, rr] of pts) d += (d ? 'L' : 'M') + (rr * Math.cos(aa)).toFixed(2) + ',' + (rr * Math.sin(aa)).toFixed(2);
    }
    return d + 'Z';
  }
  /* 空の色（時刻→上と下の色） */
  const SKY = [[0, '#16213d', '#2b3a63'], [4.6, '#1c2a4d', '#3a4a78'], [5.6, '#3b4f86', '#e7a37c'], [6.6, '#6fa7da', '#f6d6a8'], [9, '#7fc0ec', '#d6eefc'], [12, '#6db6ea', '#cfeafb'], [15, '#7cbbe6', '#e2f1fb'], [17, '#e8a06e', '#f8d9a6'], [18.2, '#59558e', '#e48f6b'], [19.3, '#22305a', '#46497a'], [24, '#16213d', '#2b3a63']];
  const hx = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
  function skyAt(hour) { for (let i = 0; i < SKY.length - 1; i++) { const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1]; if (hour >= h0 && hour <= h1) { const k = (hour - h0) / (h1 - h0); return [mix(t0, t1, k), mix(b0, b1, k)]; } } return [SKY[0][1], SKY[0][2]]; }
  const word = h => h >= 5 && h < 10 ? 'あさ' : h >= 10 && h < 15 ? 'ひる' : h >= 15 && h < 18.5 ? 'ゆうがた' : 'よる';

  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = '';
    const land = Wd > Ht * 1.1;
    if (land) {
      L.R = Math.min(Ht * .36, Wd * .22); L.cx = Math.max(L.R * 1.32 + 12, Wd * .29); L.cy = Ht * .52;
      L.sx = L.cx + L.R + Math.max(28, Wd * .04); L.sw = Wd - L.sx - 20; L.sy = Math.max(64, Ht * .14); L.sh = Ht * .4;
      L.bx = L.sx; L.bw = L.sw; L.by = L.sy + L.sh + Ht * .06; L.bh = Math.min(Ht * .32, 130);
    } else {
      L.bh = 86; L.by = Ht - L.bh - 4; L.bx = 16; L.bw = Wd - 32;
      L.sh = Math.min(Ht * .15, 96); L.sy = L.by - L.sh - 10; L.sx = 16; L.sw = Wd - 32;
      const top = 54, avail = L.sy - 8 - top;
      L.R = Math.min(Wd * .33, avail / 2.7); L.cx = Wd / 2; L.cy = top + avail / 2;
    }
    const R = L.R, cx = L.cx, cy = L.cy;
    const defs = S('defs', {}, svg);
    const gr = S('linearGradient', { id: 'skyG', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el.s0 = S('stop', { offset: '0' }, gr); el.s1 = S('stop', { offset: '1' }, gr);
    const cp = S('clipPath', { id: 'skyClip' }, defs); S('rect', { x: L.sx, y: L.sy, width: L.sw, height: L.sh, rx: 18 }, cp);
    /* 空のまど */
    const sky = S('g', { 'clip-path': 'url(#skyClip)' }, svg);
    S('rect', { x: L.sx, y: L.sy, width: L.sw, height: L.sh, fill: 'url(#skyG)' }, sky);
    el.stars = S('g', {}, sky);
    for (let i = 0; i < 26; i++) S('circle', { cx: L.sx + Math.random() * L.sw, cy: L.sy + Math.random() * L.sh * .6, r: Math.random() * 1.4 + .6, fill: '#fff' }, el.stars);
    el.sun = S('g', {}, sky); S('circle', { r: Math.max(12, L.sh * .09), fill: '#ffd25a' }, el.sun); S('circle', { r: Math.max(18, L.sh * .14), fill: '#ffd25a', opacity: .25 }, el.sun);
    el.moon = S('g', {}, sky); S('circle', { r: Math.max(10, L.sh * .075), fill: '#f4f1df' }, el.moon); S('circle', { cx: Math.max(4, L.sh * .03), cy: -Math.max(3, L.sh * .02), r: Math.max(9, L.sh * .07), fill: 'url(#skyG)' }, el.moon);
    const gy = L.sy + L.sh * .8;
    S('path', { d: `M${L.sx},${gy}Q${L.sx + L.sw * .25},${gy - L.sh * .12} ${L.sx + L.sw * .5},${gy - L.sh * .02}T${L.sx + L.sw},${gy - L.sh * .06}V${L.sy + L.sh}H${L.sx}Z`, fill: '#5d8a5a' }, sky);
    const hxp = L.sx + L.sw * .72, hy = gy - L.sh * .02, hs = L.sh * .16;
    S('path', { d: `M${hxp - hs},${hy}v${-hs * .8}l${hs},${-hs * .7}l${hs},${hs * .7}v${hs * .8}z`, fill: '#efe3cf' }, sky);
    el.win = S('rect', { x: hxp - hs * .35, y: hy - hs * .65, width: hs * .7, height: hs * .45, fill: '#7a8a8f' }, sky);
    S('rect', { x: L.sx + 1, y: L.sy + 1, width: L.sw - 2, height: L.sh - 2, rx: 17, fill: 'none', stroke: css('--line'), 'stroke-width': 3 }, svg);
    el.word = S('text', { x: L.sx + 16, y: L.sy + 34, 'font-size': Math.max(18, L.sh * .13), fill: '#fff' }, svg);
    el.dig = S('text', { x: L.sx + L.sw - 16, y: L.sy + 34, 'text-anchor': 'end', 'font-size': Math.max(18, L.sh * .13), fill: '#fff', class: 'ui' }, svg);
    /* 24じかんの おび */
    const band = S('g', {}, svg); el.band = band;
    const rowH = Math.max(22, (L.bh - 50) / 2), lab = Math.min(64, L.bw * .17);
    L.bx0 = L.bx + lab; L.bx1 = L.bx + L.bw - 8; L.rowY = [L.by + 6, L.by + 6 + rowH + 22]; L.rowH = rowH;
    ['ごぜん', 'ごご'].forEach((t, i) => {
      S('text', { x: L.bx, y: L.rowY[i] + rowH * .68, 'font-size': Math.min(17, rowH * .6), fill: css('--ink-soft') }, band).textContent = t;
      S('rect', { x: L.bx0, y: L.rowY[i], width: L.bx1 - L.bx0, height: rowH, rx: 8, fill: i ? '#e9e6f3' : '#fbf1d9', stroke: css('--line'), 'stroke-width': 1.5 }, band);
      for (let k = 0; k <= 12; k++) {
        const x = L.bx0 + (L.bx1 - L.bx0) * k / 12;
        S('line', { x1: x, y1: L.rowY[i] + rowH, x2: x, y2: L.rowY[i] + rowH + (k % 3 === 0 ? 8 : 4), stroke: css('--ink-soft'), 'stroke-width': 1.5 }, band);
        if (k % 3 === 0) { const tx = S('text', { x, y: L.rowY[i] + rowH + 20, 'text-anchor': 'middle', 'font-size': 12, fill: css('--ink-soft'), class: 'ui' }, band); tx.textContent = k; }
      }
    });
    el.bandEl = S('g', {}, band);
    el.mark = S('g', {}, band);
    S('path', { d: 'M-7,-10L7,-10L0,0Z', fill: css('--ok') }, el.mark); S('line', { x1: 0, y1: 0, x2: 0, y2: rowH, stroke: css('--ok'), 'stroke-width': 3 }, el.mark);
    el.bandFlash = S('g', {}, band);
    /* とけい */
    const ck = S('g', {}, svg); el.clock = ck;
    S('circle', { cx, cy: cy + 6, r: R * 1.06, fill: css('--line') }, ck);
    S('circle', { cx, cy, r: R * 1.06, fill: css('--ink') }, ck);
    el.gears = S('g', {}, ck);
    const base = R * .075, gy2 = cy + R * .2, x1 = cx - R * .55, x2 = x1 + base + base * 3;
    const ang = -35 * Math.PI / 180, x3 = x2 + base * 5 * Math.cos(ang), y3 = gy2 + base * 5 * Math.sin(ang);
    S('circle', { cx, cy, r: R, fill: '#2b3733' }, el.gears);
    el.g3 = S('path', { d: gearPath(base * 4, 32, base * .5), fill: '#b3463a', transform: `translate(${x3},${y3})` }, el.gears);
    el.g2 = S('g', { transform: `translate(${x2},${gy2})` }, el.gears);
    S('path', { d: gearPath(base * 3, 24, base * .5), fill: '#c8a24a' }, el.g2); S('path', { d: gearPath(base, 8, base * .45), fill: '#8d7330' }, el.g2);
    el.g1 = S('path', { d: gearPath(base, 8, base * .45), fill: '#5c86c4', transform: `translate(${x1},${gy2})` }, el.gears);
    [[x1, gy2, '#5c86c4'], [x2, gy2, '#8d7330'], [x3, y3, '#b3463a']].forEach(([x, y, c]) => S('circle', { cx: x, cy: y, r: base * .3, fill: '#1f2b27', stroke: c, 'stroke-width': 2 }, el.gears));
    el.gl1 = S('text', { x: x1, y: gy2 + base * 2.2, 'text-anchor': 'middle', 'font-size': Math.max(11, R * .07), fill: '#cfe0ff' }, el.gears); el.gl1.textContent = 'ながい はり';
    el.gl3 = S('text', { x: x3 + base * 2.5, y: y3 - base * 4.6, 'text-anchor': 'middle', 'font-size': Math.max(11, R * .07), fill: '#ffd5cf' }, el.gears); el.gl3.textContent = 'みじかい はり';
    el.face = S('circle', { cx, cy, r: R, fill: css('--paper') }, ck);
    el.room = S('path', { fill: css('--yamabuki'), opacity: .38 }, ck);
    el.minSec = S('path', { fill: css('--sora-soft'), opacity: .55 }, ck);
    el.elapsedFull = S('circle', { cx, cy, r: R * .86, fill: css('--sora-soft'), opacity: .28 }, ck);
    el.elapsed = S('path', { fill: css('--sora'), opacity: .32 }, ck);
    el.ticks = S('g', {}, ck);
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0; const [a1, b1] = polar(cx, cy, R * .95, i * 6), [a2, b2] = polar(cx, cy, R * (big ? .84 : .9), i * 6);
      S('line', { x1: a1, y1: b1, x2: a2, y2: b2, stroke: css('--ink'), 'stroke-width': big ? Math.max(2.5, R * .022) : Math.max(1.2, R * .009), 'stroke-linecap': 'round' }, el.ticks);
    }
    el.nums = S('g', {}, ck);
    for (let k = 1; k <= 12; k++) { const [x, y] = polar(cx, cy, R * .7, k * 30); const t = S('text', { x, y: y + R * .065, 'text-anchor': 'middle', 'font-size': R * .19, fill: css('--ink') }, el.nums); t.textContent = k; }
    el.five = S('g', {}, svg);
    for (let k = 0; k < 12; k++) {
      const [x, y] = polar(cx, cy, R * 1.2, k * 30);
      S('circle', { cx: x, cy: y, r: Math.max(14, R * .1), fill: css('--paper'), stroke: css('--sora'), 'stroke-width': 2 }, el.five);
      const t = S('text', { x, y: y + Math.max(5, R * .035), 'text-anchor': 'middle', 'font-size': Math.max(13, R * .095), fill: css('--sora'), class: 'ui' }, el.five); t.textContent = k * 5;
    }
    el.ghost = S('line', { x1: cx, y1: cy, stroke: css('--sora'), 'stroke-width': Math.max(5, R * .045), 'stroke-linecap': 'round', opacity: .35, 'stroke-dasharray': '2 9' }, ck);
    el.hh = S('line', { x1: cx, y1: cy, x2: cx, y2: cy - R * .5, stroke: css('--ok'), 'stroke-width': Math.max(8, R * .075), 'stroke-linecap': 'round' }, ck);
    el.mh = S('line', { x1: cx, y1: cy, x2: cx, y2: cy - R * .82, stroke: css('--sora'), 'stroke-width': Math.max(5, R * .045), 'stroke-linecap': 'round' }, ck);
    S('circle', { cx, cy, r: Math.max(6, R * .05), fill: css('--ink') }, ck);
    el.elTxt = S('text', { x: cx, y: cy + R * 1.06 + (land ? -R * .2 : 0), 'text-anchor': 'middle', 'font-size': Math.max(16, R * .11), fill: css('--sora') }, svg);
    if (land) { el.elTxt.setAttribute('x', L.sx + L.sw / 2); el.elTxt.setAttribute('y', Math.min(Ht - 12, L.by + L.bh + 28)); }
    else { el.elTxt.setAttribute('x', Wd - 16); el.elTxt.setAttribute('text-anchor', 'end'); el.elTxt.setAttribute('y', L.sy - 6); el.elTxt.setAttribute('font-size', 15); }
    update();
  }
  function update() {
    const t = st.t, R = L.R, cx = L.cx, cy = L.cy;
    const ma = (t % 60) * 6, ha = (((t % 720) + 720) % 720) * .5;
    el.mh.setAttribute('transform', `rotate(${ma} ${cx} ${cy})`);
    el.hh.setAttribute('transform', `rotate(${ha} ${cx} ${cy})`);
    const rh = st.roomFor != null ? st.roomFor : hour12(t);
    el.room.setAttribute('d', (st.room || st.roomFor != null) ? sector(cx, cy, R * .62, (rh % 12) * 30, (rh % 12) * 30 + 30) : '');
    el.minSec.setAttribute('d', st.minSector ? sector(cx, cy, R * .9, 0, ((Math.round(t) % 60) + 60) % 60 * 6) : '');
    el.five.style.display = st.five ? '' : 'none';
    el.gears.style.display = st.gear ? '' : 'none';
    el.face.setAttribute('opacity', st.gear ? .22 : 1);
    el.nums.setAttribute('opacity', st.gear ? .55 : 1);
    if (st.gear) {
      el.g1.setAttribute('transform', el.g1.getAttribute('transform').replace(/ rotate\([^)]*\)/, '') + ` rotate(${t * 6})`);
      el.g2.setAttribute('transform', el.g2.getAttribute('transform').replace(/ rotate\([^)]*\)/, '') + ` rotate(${-t * 2})`);
      el.g3.setAttribute('transform', el.g3.getAttribute('transform').replace(/ rotate\([^)]*\)/, '') + ` rotate(${t * .5})`);
    }
    if (st.ghost != null) { const [x, y] = polar(cx, cy, R * .82, (st.ghost % 60) * 6); el.ghost.setAttribute('x2', x); el.ghost.setAttribute('y2', y); el.ghost.style.display = ''; } else el.ghost.style.display = 'none';
    /* たった じかん */
    if (st.start != null) {
      const d = Math.max(0, t - st.start), laps = Math.floor(d / 60), a0 = (st.start % 60) * 6;
      el.elapsedFull.style.display = laps >= 1 ? '' : 'none';
      el.elapsed.setAttribute('d', sector(cx, cy, R * .86, a0, a0 + (d % 60) * 6));
      el.elTxt.textContent = durKid(d) + ' たった';
    } else { el.elapsedFull.style.display = 'none'; el.elapsed.setAttribute('d', ''); el.elTxt.textContent = ''; }
    /* 空 */
    const hr = (((t % 1440) + 1440) % 1440) / 60, [top, bot] = skyAt(hr);
    el.s0.setAttribute('stop-color', top); el.s1.setAttribute('stop-color', bot);
    const night = hr < 5.4 || hr > 19 ? 1 : hr < 6.4 ? (6.4 - hr) : hr > 18.2 ? (hr - 18.2) / .8 : 0;
    el.stars.setAttribute('opacity', clamp(night, 0, 1));
    const gy = L.sy + L.sh * .8, arcH = L.sh * .62;
    const sp = (hr - 6) / 12; el.sun.style.display = sp > -.05 && sp < 1.05 ? '' : 'none';
    el.sun.setAttribute('transform', `translate(${L.sx + L.sw * (.08 + .84 * sp)},${gy - Math.sin(Math.PI * clamp(sp, 0, 1)) * arcH + 6})`);
    const mp = (((hr - 18) + 24) % 24) / 12; el.moon.style.display = mp > -.05 && mp < 1.05 ? '' : 'none';
    el.moon.setAttribute('transform', `translate(${L.sx + L.sw * (.08 + .84 * mp)},${gy - Math.sin(Math.PI * clamp(mp, 0, 1)) * arcH + 6})`);
    el.win.setAttribute('fill', night > .5 ? '#ffd56a' : '#7a8a8f');
    el.word.textContent = word(hr);
    el.word.setAttribute('fill', night > .5 || hr > 17.5 ? '#fff' : '#1f3b5a');
    el.dig.setAttribute('fill', el.word.getAttribute('fill'));
    el.dig.textContent = st.digital ? (hr < 12 ? 'ごぜん ' : 'ごご ') + `${Math.floor(hr % 12)}:${String(MIN(t)).padStart(2, '0')}` : '';
    /* おびの しるし */
    const T = tod(t), row = T < 720 ? 0 : 1, x = L.bx0 + (L.bx1 - L.bx0) * (T % 720) / 720;
    el.mark.setAttribute('transform', `translate(${x},${L.rowY[row]})`);
    el.bandEl.innerHTML = '';
    if (st.start != null && t > st.start) {
      let a = st.start, b = t;
      while (a < b - .01) {
        const ta = ((a % 1440) + 1440) % 1440, r = ta < 720 ? 0 : 1, segEnd = Math.min(b, a + (720 - (ta % 720)));
        const xa = L.bx0 + (L.bx1 - L.bx0) * (ta % 720) / 720, xb = L.bx0 + (L.bx1 - L.bx0) * (((segEnd - a) + (ta % 720)) / 720);
        S('rect', { x: xa, y: L.rowY[r] + 3, width: Math.max(1, xb - xa), height: L.rowH - 6, rx: 5, fill: css('--sora'), opacity: .45 }, el.bandEl);
        a = segEnd;
      }
    }
    el.bandFlash.innerHTML = '';
    if (st.flash != null) [0, 1].forEach(r => { const x = L.bx0 + (L.bx1 - L.bx0) * st.flash / 12; S('circle', { cx: x, cy: L.rowY[r] + L.rowH / 2, r: L.rowH * .42, fill: 'none', stroke: css('--yamabuki'), 'stroke-width': 4 }, el.bandFlash); });
  }
  /* 指で長針を回す */
  function bind() {
    svg.onpointerdown = e => {
      if (!st.canDrag) return;
      const p = ptr(e), d = Math.hypot(p.x - L.cx, p.y - L.cy);
      if (d > L.R * 1.12) return;
      svg.setPointerCapture(e.pointerId);
      st.drag = { last: angMin(p), id: e.pointerId }; HUD.hide();
    };
    svg.onpointermove = e => {
      if (!st.drag || e.pointerId !== st.drag.id) return;
      const m = angMin(ptr(e)); let d = m - st.drag.last; if (d > 30) d -= 60; if (d < -30) d += 60;
      const before = Math.floor(st.t); st.t += d; if (st.t < 0) st.t += 1440; if (st.t > 1440 * 4) st.t -= 1440;
      if (Math.floor(st.t) !== before) SFX.tick();
      st.drag.last = m; update();
    };
    const end = e => {
      if (!st.drag) return; st.drag = null; st.t = Math.round(st.t); update();
      if (App.tab === 'sawaru') sayNow();
    };
    svg.onpointerup = end; svg.onpointercancel = end;
  }
  function angMin(p) { let a = Math.atan2(p.x - L.cx, -(p.y - L.cy)) * 180 / Math.PI; if (a < 0) a += 360; return a / 6; }
  function sayNow() {
    let html = kidTime(st.t), sp = spTime(st.t);
    if (st.digital) { html = (tod(st.t) < 720 ? 'ごぜん ' : 'ごご ') + html; sp = (tod(st.t) < 720 ? '午前' : '午後') + sp; }
    if (st.start != null) { const d = Math.max(0, st.t - st.start); html += `　<em>${durKid(d)} たった</em>`; }
    HUD.say(html, { speech: sp });
  }
  async function moveTo(target, ms) {
    const a = st.t; let last = Math.floor(a);
    await tween(ms, k => { st.t = lerp(a, target, k); if (Math.floor(st.t) !== last) { last = Math.floor(st.t); if (ms < 2500) SFX.tick(); } update(); });
    st.t = target; update();
  }
  function reset() { Object.assign(st, { start: null, room: false, roomFor: null, five: false, digital: false, gear: false, ghost: null, minSector: false, flash: null, canDrag: true }); }

  /* みる */
  async function miru() {
    reset(); st.canDrag = false; st.t = 7 * 60; st.gear = true; st.start = 7 * 60; update();
    HUD.say('ながい はりが ひとまわり すると…'); await wait(1200);
    await moveTo(8 * 60, 5200);
    HUD.say('みじかい はりは つぎの かずまで すすむ。<b>1じかん</b> は <b>60ぷん</b>'); await wait(3200);
    st.gear = false; st.start = null; update();
    HUD.say('おひるの 12じ。ここから <b>ごご</b>'); await moveTo(12 * 60, 3200); await wait(1800);
    HUD.say('よるの 7じ。あさの 7じと おなじ とけいの かたち'); await moveTo(19 * 60, 3400);
    st.flash = 7; update(); await wait(3000); st.flash = null;
    HUD.say('みじかい はりが 2かい まわると <b>1にち</b>。<b>24じかん</b>'); await moveTo(24 * 60 + 7 * 60, 3800);
    st.t = 7 * 60; update(); st.canDrag = true;
  }
  function miruPanel(p) {
    p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); run(miru); }, html: ICON.replay + 'もういちど みる' })]));
  }
  /* さわる */
  function sawaruPanel(p) {
    reset(); update();
    const step = (d) => { cancelRuns(); run(async () => { await moveTo(Math.max(0, st.t + d), d === 60 ? 900 : 360); sayNow(); }); };
    const hb = H('button', { class: 'btn sub small', text: 'はかる', 'aria-pressed': 'false', 'aria-label': 'じかんを はかる', onclick: () => { st.start = st.start == null ? st.t : null; hb.setAttribute('aria-pressed', String(st.start != null)); hb.textContent = st.start != null ? 'やめる' : 'はかる'; update(); HUD.say(st.start != null ? 'はりを うごかしてね。うごいた ぶんが <em>じかん</em>' : kidTime(st.t)); } });
    p.appendChild(H('div', { class: 'row' }, [
      H('button', { class: 'btn sub small', text: '−5ふん', onclick: () => step(-5) }),
      H('button', { class: 'btn sub small', text: '+5ふん', onclick: () => step(5) }),
      H('button', { class: 'btn sub small', text: '+1じかん', onclick: () => step(60) }),
      hb
    ]));
    p.appendChild(H('div', { class: 'row' }, [multiSeg([
      { label: 'へや', on: st.room, f: v => { st.room = v; update(); if (v) HUD.say('みじかい はりが いる <b>へや</b>。ちいさい ほうの かずを よむ'); } },
      { label: '5とび', on: st.five, f: v => { st.five = v; update(); } },
      { label: 'デジタル', on: st.digital, f: v => { st.digital = v; update(); } },
      { label: 'なかを みる', on: st.gear, f: v => { st.gear = v; update(); if (v) HUD.say('なかの はぐるまが つながって いるから、いっしょに うごく'); } }
    ])]));
    HUD.say('ながい はりを ゆびで まわしてね');
  }
  /* ためす */
  function genTime(level) {
    let h = rnd(1, 12), m;
    if (level === 'easy') m = pick([0, 30]);
    else if (level === 'normal') m = Math.random() < .45 ? pick([45, 50, 55]) : rnd(1, 11) * 5;
    else { m = Math.random() < .4 ? rnd(56, 59) : rnd(1, 59); if (m % 5 === 0) m += 1; if (Math.random() < .25) h = 12; }
    return h * 60 + m;
  }
  function readChoices(T) {
    const h = hour12(T), m = MIN(T), out = [{ label: kidTime(T), ok: true }];
    const hp = h === 12 ? 1 : h + 1, hm = h === 1 ? 12 : h - 1;
    out.push({ label: kidTime((m >= 30 ? hp : hm) * 60 + m), ok: false });
    let b;
    if (m % 5 === 0 && m >= 10) b = `${h}じ ${m / 5}${fun(m / 5)}`;
    else { const h2 = Math.round(m / 5) % 12 || 12, m2 = ((h % 12) * 5 + Math.floor(m / 12)) % 60; b = kidTime(h2 * 60 + m2); }
    if (out.some(o => o.label === b)) b = kidTime(hm * 60 + m);
    if (out.some(o => o.label === b)) b = kidTime(((h + 5) % 12 || 12) * 60 + m);
    out.push({ label: b, ok: false });
    return shuffle(out);
  }
  function gen(level, i) {
    reset(); st.canDrag = false;
    const T = genTime(level), at = { x: L.cx, y: L.cy, r: L.R * .7 };
    if (i % 2 === 0) {
      st.t = T < 6 * 60 ? T + 720 : T; update();
      return {
        say: 'なんじ なんぷん？', at, choices: readChoices(T),
        hint(k) { if (k === 1) { st.room = true; HUD.say('みじかい はりの <b>へや</b>を みてね'); } if (k === 2) { st.five = true; HUD.say('ながい はりは <em>5とび</em>で かぞえる'); } if (k === 3) { st.minSector = true; HUD.say(`ながい はりは <em>${MIN(T)}${fun(MIN(T))}</em>`); } update(); },
        async verify() { st.digital = true; st.room = true; update(); TTS.speak(spTime(T)); await wait(900); }
      };
    }
    let s0 = T + pick([-1, 1]) * rnd(110, 260); while (s0 < 6 * 60) s0 += 720; while (s0 > 21 * 60) s0 -= 720; st.t = s0; st.canDrag = true; update();
    const target = T;
    return {
      set: true, say: `<b>${kidTime(target)}</b> に あわせてね`, speech: spTime(target) + 'に合わせてね', at,
      check() { return ((Math.round(st.t) % 720) + 720) % 720 === target % 720; },
      hint(k) { if (k === 1) { st.roomFor = hour12(target); HUD.say(`みじかい はりは <b>${hour12(target)}</b> の へや`); } if (k === 2) { st.five = true; HUD.say('ながい はりは <em>5とび</em>で かぞえる'); } if (k === 3) { st.ghost = MIN(target); HUD.say('ながい はりは この ばしょ'); } update(); },
      async verify(ok) {
        st.canDrag = false;
        if (!ok) { let tt = target % 720; const cur = st.t % 720; let d = tt - cur; if (d > 360) d -= 720; if (d < -360) d += 720; await moveTo(st.t + d, 1400); }
        st.digital = true; st.roomFor = null; st.room = true; update(); TTS.speak(spTime(target)); await wait(700);
      }
    };
  }
  let quiz = null;
  return {
    title: 'とけい', grade: '1・2ねん',
    mount(c) { svg = c.svg; layout(c.W, c.H); bind(); },
    layout(w, h) { layout(w, h); },
    unmount() { svg.onpointerdown = svg.onpointermove = svg.onpointerup = svg.onpointercancel = null; },
    setTab(id, p) {
      if (id === 'miru') { miruPanel(p); run(miru); }
      if (id === 'sawaru') sawaruPanel(p);
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'clock', n: 6, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
