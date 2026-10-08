/* ---------- かさ：みずを うつす・ますで はかる（K1・K2） ---------- */
SCENES.water = (() => {
  let svg, Wd, Ht, k = 20, tableY = 400, layer, fx, vs = [], sel = null, busy = false, spill = 0, setName = 'masu', count = 0, loop = 0, quizCups = null;
  const SETS = {
    masu: () => [
      { id: 'dl', name: '1dLます', w: 5, h: 4, cap: 100, vol: 0, masu: true },
      { id: 'l', name: '1Lます', w: 10, h: 10, cap: 1000, vol: 0, masu: true, marks: 10 },
      { id: 'pet', name: 'ペットボトル', w: 6.5, h: 17, cap: 500, vol: 500, bottle: true },
      { id: 'cup', name: 'コップ', w: 7, h: 8.5, cap: 300, vol: 0 }
    ],
    kurabe: () => [
      { id: 'a', name: 'あか', w: 5, h: 18, cap: 450, vol: 350, tag: css('--face-1') },
      { id: 'b', name: 'あお', w: 12, h: 7.5, cap: 700, vol: 450, tag: css('--face-4') },
      { id: 'c1', name: 'コップ', w: 7.5, h: 11, cap: 500, vol: 0 },
      { id: 'c2', name: 'コップ', w: 7.5, h: 11, cap: 500, vol: 0 }
    ]
  };
  /* 多角形の切り取りと面積（水面を水平に保つため） */
  function clipHalf(poly, g, s) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], da = a[0] * g[0] + a[1] * g[1] - s, db = b[0] * g[0] + b[1] * g[1] - s;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  function rectOf(v) { const w = v.w * k, h = v.h * k; return [[-w / 2, -h], [w / 2, -h], [w / 2, 0], [-w / 2, 0]]; }
  function gravity(th) { const r = th * Math.PI / 180; return [Math.sin(r), Math.cos(r)]; }
  function waterPoly(v) {
    const R = rectOf(v), g = gravity(v.rot), f = clamp(v.vol / v.cap, 0, 1); if (f <= 0.0005) return null;
    const target = f * area(R), ds = R.map(p => p[0] * g[0] + p[1] * g[1]);
    let lo = Math.min(...ds), hi = Math.max(...ds);
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (area(clipHalf(R, g, m)) > target) lo = m; else hi = m; }
    return clipHalf(R, g, (lo + hi) / 2);
  }
  function tiltFor(v, sign) {
    const R = rectOf(v), f = clamp(v.vol / v.cap, 0, 1), target = f * area(R), lip = [sign * v.w * k / 2, -v.h * k];
    let lo = 0, hi = 135;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2, g = gravity(sign * m), s = lip[0] * g[0] + lip[1] * g[1]; if (area(clipHalf(R, g, s)) > target) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function setup(name, preset) {
    setName = name; vs = (preset || SETS[name]()).map(v => Object.assign({ rot: 0, lift: 0, wave: 0, sign: 1, px: null, py: null }, v));
    sel = null; spill = 0; count = 0; quizCups = null; layout(Wd, Ht);
  }
  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = '';
    tableY = Ht * (Wd > Ht ? .86 : .82);
    const totalW = vs.reduce((s, v) => s + v.w, 0) + 3.2 * (vs.length - 1), maxH = Math.max(...vs.map(v => v.h));
    k = Math.min((tableY - 96) / (maxH + 2), (Wd - 48) / totalW, 34);
    let x = (Wd - totalW * k) / 2;
    for (const v of vs) { v.x = x + v.w * k / 2; x += (v.w + 3.2) * k; }
    S('rect', { x: 0, y: tableY, width: Wd, height: Ht - tableY, fill: css('--wood-pale') }, svg);
    S('rect', { x: 0, y: tableY, width: Wd, height: 5, fill: css('--wood') }, svg);
    fx = S('g', {}, svg);
    layer = S('g', {}, svg);
    for (const v of vs) build(v);
    draw();
  }
  function build(v) {
    const g = S('g', { class: 'vessel', style: 'cursor:pointer' }, layer); v.g = g;
    const w = v.w * k, h = v.h * k, t = Math.max(3, k * .16);
    v.ring = S('rect', { x: -w / 2 - t - 6, y: -h - 10, width: w + 2 * t + 12, height: h + t + 16, rx: 12, fill: 'none', stroke: css('--yamabuki'), 'stroke-width': 4, opacity: 0 }, g);
    S('rect', { x: -w / 2 - t, y: -h, width: w + 2 * t, height: h + t, rx: v.masu ? 3 : Math.min(10, w * .2), fill: css('--glass'), opacity: .8 }, g);
    v.water = S('path', { fill: css('--water'), opacity: .92 }, g);
    v.surf = S('path', { fill: 'none', stroke: css('--water-deep'), 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
    S('rect', { x: -w / 2 + Math.max(4, w * .1), y: -h + 8, width: Math.max(3, w * .07), height: Math.max(4, h - 18), rx: 3, fill: '#fff', opacity: .55 }, g);
    if (v.marks) {
      v.markG = S('g', {}, g);
      for (let i = 1; i < v.marks; i++) { const y = -h * i / v.marks; S('line', { x1: w / 2 - w * (i === 5 ? .32 : .2), y1: y, x2: w / 2, y2: y, stroke: '#2f5d8a', 'stroke-width': i === 5 ? 3 : 2 }, v.markG); }
      v.markNums = S('g', { opacity: 0 }, g);
      for (let i = 1; i < v.marks; i++) { const tt = S('text', { x: w / 2 - w * .36, y: -h * i / v.marks + 5, 'text-anchor': 'end', 'font-size': Math.max(12, k * .7), fill: '#2f5d8a', class: 'ui' }, v.markNums); tt.textContent = i; }
    }
    const outline = v.masu
      ? `M${-w / 2 - t},${-h - 2}V${t}H${w / 2 + t}V${-h - 2}`
      : `M${-w / 2 - t / 2},${-h - 2}V${-6}Q${-w / 2 - t / 2},${t / 2} ${-w / 2 + 6},${t / 2}H${w / 2 - 6}Q${w / 2 + t / 2},${t / 2} ${w / 2 + t / 2},${-6}V${-h - 2}`;
    S('path', { d: outline, fill: 'none', stroke: v.masu ? '#7d9db3' : '#9fb7c9', 'stroke-width': t, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    if (v.bottle) { S('rect', { x: -w * .22, y: -h - k * 1.4, width: w * .44, height: k * 1.4, rx: 3, fill: css('--face-4') }, g); S('rect', { x: -w / 2 - t / 2, y: -h * .62, width: w + t, height: h * .2, fill: '#fff', stroke: css('--line') }, g); const tt = S('text', { x: 0, y: -h * .52 + 2, 'text-anchor': 'middle', 'font-size': Math.max(11, k * .65), fill: css('--sora'), class: 'ui' }, g); tt.textContent = '500mL'; }
    if (v.tag) S('rect', { x: -w / 2 - t, y: -h * .5 - k * .6, width: k * 1.2, height: k * 1.2, rx: 4, fill: v.tag }, g);
    if (v.masu && v.id === 'l') { const tt = S('text', { x: w / 2 - w * .1, y: -h - 8, 'text-anchor': 'end', 'font-size': Math.max(12, k * .7), fill: '#2f5d8a', class: 'ui' }, g); tt.textContent = '1L'; }
    v.label = S('text', { 'text-anchor': 'middle', 'font-size': Math.max(14, Math.min(20, k * .9)), fill: v.tag ? v.tag : css('--ink-soft') }, svg);
    v.label.textContent = v.name;
    g.addEventListener('pointerdown', e => { e.stopPropagation(); tap(v); });
  }
  function draw() {
    for (const v of vs) {
      const w = v.w * k, h = v.h * k;
      if (v.px == null) { v.g.setAttribute('transform', `translate(${v.x},${tableY - v.lift})`); }
      else { const lx = v.sign * w / 2, ly = -h; v.g.setAttribute('transform', `translate(${v.px},${v.py}) rotate(${v.rot}) translate(${-lx},${-ly})`); }
      v.label.setAttribute('x', v.x); v.label.setAttribute('y', tableY + Math.max(22, Math.min(30, k * 1.3)));
      v.ring.setAttribute('opacity', sel === v ? 1 : 0);
      const P = waterPoly(v);
      if (!P) { v.water.setAttribute('d', ''); v.surf.setAttribute('d', ''); continue; }
      if (Math.abs(v.rot) < .5) {
        const lvl = h * v.vol / v.cap, n = 16, amp = v.wave * Math.min(6, k * .3); let d = `M${-w / 2},0H${w / 2}`, sd = '';
        for (let i = 0; i <= n; i++) { const xx = w / 2 - w * i / n, yy = -lvl + Math.sin(i / n * Math.PI * 2 + loop * .012) * amp * (lvl > 2 ? 1 : 0); d += `L${xx.toFixed(1)},${yy.toFixed(1)}`; sd += (i ? 'L' : 'M') + xx.toFixed(1) + ',' + yy.toFixed(1); }
        v.water.setAttribute('d', d + 'Z'); v.surf.setAttribute('d', sd);
      } else { v.water.setAttribute('d', 'M' + P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z'); v.surf.setAttribute('d', ''); }
    }
  }
  let raf = 0;
  function tick() { loop++; let any = false; for (const v of vs) { if (v.wave > .02) { v.wave *= .965; any = true; } } if (any) draw(); raf = requestAnimationFrame(tick); }
  function tap(v) {
    if (busy || App.tab === 'miru' || (App.tab === 'tamesu' && !quizCups)) return;
    if (!sel) { sel = v; v.lift = 10; draw(); SFX.pop(); HUD.say('どこに いれる？ いれものを タッチ'); return; }
    if (sel === v) { v.lift = 0; sel = null; draw(); HUD.hide(); return; }
    const src = sel; src.lift = 0; sel = null;
    run(async () => { await pour(src, v); afterPour(src, v); });
  }
  function afterPour(src, dst) {
    if (setName === 'masu' && src.id === 'dl' && dst.id === 'l') {
      count++;
      HUD.say(dst.vol >= dst.cap - .5 ? `1dLます <b>${count}${hai(count)}</b> で いっぱい。<b>1L は 10dL</b>` : `1dLます <b>${count}${hai(count)}</b>`);
    } else if (spill > 0 && dst.vol >= dst.cap - .5) HUD.say(`<b>あふれた！</b> ${src.name}の ほうが おおかった`);
    else HUD.hide();
  }
  function surfaceY(v) { return tableY - v.h * k * clamp(v.vol / v.cap, 0, 1); }
  async function pour(src, dst, o = {}) {
    busy = true; SFX.pop();
    const sw = src.w * k, sh = src.h * k, dl = dst.x - dst.w * k / 2, dr = dst.x + dst.w * k / 2, dTop = tableY - dst.h * k;
    src.sign = (dl - sw > 8) ? 1 : -1;
    const lipX0 = src.x + src.sign * sw / 2, lipY0 = tableY - sh;
    src.px = lipX0; src.py = lipY0; layer.appendChild(src.g);
    const tx = src.sign > 0 ? dl + 6 : dr - 6, tyHi = Math.min(dTop - 30, lipY0 - 10), tyLo = dTop - 12;
    await tween(520 * (o.fast ? .6 : 1), e => { src.px = lerp(lipX0, tx, e); src.py = lerp(lipY0, tyHi, e) - Math.sin(e * Math.PI) * 24; draw(); });
    const th0 = tiltFor(src, src.sign);
    await tween(380 * (o.fast ? .6 : 1), e => { src.rot = src.sign * th0 * e; src.py = lerp(tyHi, tyLo, e); draw(); });
    const stream = S('path', { fill: 'none', stroke: css('--water'), 'stroke-width': Math.max(4, k * .35), 'stroke-linecap': 'round', opacity: .9 }, fx);
    SFX.pourStart();
    const rate = Math.max(220, src.cap * .9) * (o.fast ? 1.8 : 1);
    let last = performance.now();
    await new Promise((res, rej) => {
      const id = RUN.id;
      const f = now => {
        if (id !== RUN.id) { stream.remove(); SFX.pourStop(); busy = false; rej(new Cancel()); return; }
        const dt = Math.min(.05, (now - last) / 1000) / SPEED; last = now;
        const dv = Math.min(src.vol, rate * dt);
        src.vol -= dv; dst.vol += dv; dst.wave = 1;
        if (dst.vol > dst.cap) { spill += dst.vol - dst.cap; dst.vol = dst.cap; }
        src.rot = src.sign * (src.vol > .5 ? tiltFor(src, src.sign) + 6 : 125);
        const sy = surfaceY(dst);
        stream.setAttribute('d', `M${src.px},${src.py}Q${src.px + src.sign * 10},${src.py + 6} ${src.px + src.sign * 12},${sy}`);
        drawSpill(dst);
        draw();
        if (src.vol <= .01) { src.vol = 0; res(); } else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    stream.remove(); SFX.pourStop();
    await tween(360 * (o.fast ? .6 : 1), e => { src.rot = src.sign * 125 * (1 - e); src.py = lerp(tyLo, tyHi, e); draw(); });
    await tween(460 * (o.fast ? .6 : 1), e => { src.px = lerp(tx, lipX0, e); src.py = lerp(tyHi, lipY0, e); draw(); });
    src.px = null; src.rot = 0; draw(); busy = false;
  }
  let puddle = null;
  function drawSpill(dst) {
    if (spill <= 0) return;
    if (!puddle) puddle = S('ellipse', { fill: css('--water'), opacity: .55 }, fx);
    if (!puddle.isConnected) fx.appendChild(puddle);
    const r = Math.min(Wd * .2, Math.sqrt(spill) * k * .35);
    puddle.setAttribute('cx', dst.x + dst.w * k * .5); puddle.setAttribute('cy', tableY + 6); puddle.setAttribute('rx', r); puddle.setAttribute('ry', r * .18);
  }
  async function fill(v, to, fast) {
    busy = true; to = to == null ? v.cap : to;
    const top = 0, stream = S('path', { fill: 'none', stroke: css('--water'), 'stroke-width': Math.max(5, k * .35), 'stroke-linecap': 'round' }, fx);
    const tap = S('g', {}, fx); S('rect', { x: v.x - 28, y: -4, width: 56, height: 22, rx: 8, fill: css('--metal'), stroke: css('--metal-deep'), 'stroke-width': 2 }, tap); S('rect', { x: v.x - 6, y: 16, width: 12, height: 12, rx: 3, fill: css('--metal-deep') }, tap);
    SFX.pourStart(); const a = v.vol;
    await tween((fast ? 260 : 500) + (fast ? 200 : 700) * (to - a) / v.cap, e => { v.vol = lerp(a, to, e); v.wave = 1; stream.setAttribute('d', `M${v.x},28V${surfaceY(v)}`); draw(); }, E.lin);
    SFX.pourStop(); stream.remove(); tap.remove(); busy = false;
  }
  async function dump(v) {
    busy = true; const a = v.vol; const sgn = v.x > Wd / 2 ? 1 : -1;
    v.sign = sgn; const w = v.w * k, h = v.h * k; v.px = v.x + sgn * w / 2; v.py = tableY - h;
    SFX.pourStart();
    await tween(900, e => { v.rot = sgn * 110 * Math.sin(Math.min(1, e * 1.4) * Math.PI / 2); v.vol = a * (1 - e); draw(); });
    SFX.pourStop(); v.vol = 0;
    await tween(300, e => { v.rot = sgn * 110 * (1 - e); draw(); });
    v.px = null; v.rot = 0; draw(); busy = false;
  }
  function byId(id) { return vs.find(v => v.id === id); }
  /* 「杯」の読み：1・6・8・10は「ぱい」、3は「ばい」、ほかは「はい」 */
  const hai = n => { const d = n % 10; return d === 0 || d === 1 || d === 6 || d === 8 ? 'ぱい' : d === 3 ? 'ばい' : 'はい'; };

  /* みる */
  async function miru() {
    setup('kurabe'); HUD.say('<b>あか</b>と <em>あお</em>、みずが おおいのは どっち？'); await wait(3200);
    HUD.say('おなじ コップに うつして くらべよう'); await wait(900);
    await pour(byId('a'), byId('c1')); byId('c1').label.textContent = 'あか'; byId('c1').label.setAttribute('fill', css('--face-1'));
    await pour(byId('b'), byId('c2')); byId('c2').label.textContent = 'あお'; byId('c2').label.setAttribute('fill', css('--face-4'));
    HUD.say('ひくく みえた <em>あお</em>の ほうが おおかった！'); await wait(3600);
    setup('masu'); byId('pet').vol = 0; draw();
    HUD.say('1dLますで 1Lますに いれて みよう'); await wait(1600);
    for (let i = 1; i <= 10; i++) {
      await fill(byId('dl'), null, true);
      await pour(byId('dl'), byId('l'), { fast: true });
      HUD.say(`<b>${i}${hai(i)}</b>`, { speech: i + '杯' });
    }
    HUD.say('1dLます <b>10ぱい</b>で 1Lます いっぱい。<b>1L は 10dL</b>', { speech: '1デシリットルます10杯で、1リットルますいっぱい。1リットルは10デシリットル' });
  }
  /* さわる */
  function sawaruPanel(p) {
    setup('masu');
    p.appendChild(H('div', { class: 'row' }, [
      seg([{ id: 'masu', label: 'ます' }, { id: 'kurabe', label: 'くらべる' }], setName, id => { cancelRuns(); busy = false; setup(id); hello(); }),
      H('button', { class: 'btn sub small', text: 'みずを くむ', onclick: () => { if (busy) return; if (!sel) { HUD.say('さきに いれものを タッチ'); return; } const v = sel; v.lift = 0; sel = null; run(() => fill(v)); } }),
      H('button', { class: 'btn sub small', text: 'すてる', onclick: () => { if (busy) return; if (!sel) { HUD.say('すてる いれものを タッチ'); return; } const v = sel; v.lift = 0; sel = null; run(() => dump(v)); } }),
      H('button', { class: 'btn sub small', text: 'もとに もどす', onclick: () => { cancelRuns(); busy = false; setup(setName); hello(); } })
    ]));
    hello();
  }
  function hello() { HUD.say(setName === 'masu' ? 'いれものを タッチして、ほかの いれものに うつそう' : '<b>あか</b>と <em>あお</em>、どっちが おおいか しらべよう'); }

  /* ためす */
  function cupsFor(a, b, done) {
    return async () => {
      const c1 = byId('c1'), c2 = byId('c2');
      await pour(a, c1, { fast: true }); c1.label.textContent = a.name; c1.label.setAttribute('fill', a.tag);
      await pour(b, c2, { fast: true }); c2.label.textContent = b.name; c2.label.setAttribute('fill', b.tag);
      done && done();
    };
  }
  function gen(level, i) {
    const kind = [0, 3].includes(i) ? 'compare' : [1, 4].includes(i) ? 'read' : 'est';
    if (kind === 'compare') {
      let va, vb, eq = level === 'challenge' && Math.random() < .35;
      if (eq) { va = vb = pick([300, 350, 400]); } else { va = pick([250, 300, 350]); vb = va + pick(level === 'easy' ? [150, 200] : [50, 100]); }
      const tallIsA = Math.random() < .5;
      const A = { id: 'a', name: 'あか', w: 5, h: 18, cap: 450, vol: tallIsA ? va : vb, tag: css('--face-1') };
      const B = { id: 'b', name: 'あお', w: 12, h: 7.5, cap: 700, vol: tallIsA ? vb : va, tag: css('--face-4') };
      setup('kurabe', [A, B, { id: 'c1', name: 'コップ', w: 7.5, h: 11, cap: 500, vol: 0 }, { id: 'c2', name: 'コップ', w: 7.5, h: 11, cap: 500, vol: 0 }]);
      const more = A.vol > B.vol ? 'a' : A.vol < B.vol ? 'b' : 'eq';
      const ch = [{ label: 'あか', html: '<span class="sw" style="background:var(--face-1)"></span>あか', ok: more === 'a' }, { label: 'あお', html: '<span class="sw" style="background:var(--face-4)"></span>あお', ok: more === 'b' }];
      if (level === 'challenge') ch.push({ label: 'おなじ', ok: more === 'eq' });
      return {
        say: 'みずが おおいのは どっち？', choices: ch, at: { x: Wd * .72, y: tableY - 11 * k * .6, r: k * 4 },
        hint(s) { if (s === 1) HUD.say('たかさだけで きめられるかな？'); if (s === 2) HUD.say('ふとさも みてね'); if (s === 3) HUD.say('おなじ コップに うつすと くらべられる'); },
        async verify() { await cupsFor(byId('a'), byId('b'))(); }
      };
    }
    if (kind === 'read') {
      const v = level === 'easy' ? rnd(2, 8) : rnd(1, 9);
      setup('masu', [{ id: 'l', name: '1Lます', w: 10, h: 10, cap: 1000, vol: v * 100, masu: true, marks: 10 }]);
      const l = byId('l');
      const opts = [{ label: v + 'dL', ok: true }, { label: (10 - v) + 'dL', ok: false }, { label: v + 'L', ok: false }];
      if (v === 5) opts[1] = { label: '50dL', ok: false };
      return {
        say: 'みずは なんdL？', speech: '水は何デシリットル？', choices: shuffle(opts), at: { x: l.x, y: tableY - 5 * k, r: k * 4 },
        hint(s) { if (s === 1) HUD.say('めもりは 1dL ずつ'); if (s === 2) HUD.say('したから かぞえよう'); if (s === 3) l.markNums.setAttribute('opacity', 1); },
        async verify() { for (let j = 1; j <= v; j++) { const n = l.markNums.children[j - 1]; if (n) { l.markNums.setAttribute('opacity', 1); for (const c of l.markNums.children) c.setAttribute('opacity', 0); for (let q = 0; q < j; q++) l.markNums.children[q] && l.markNums.children[q].setAttribute('opacity', 1); } SFX.tick(); await wait(260); } HUD.say(`<b>${v}dL</b>`, { speech: v + 'デシリットル' }); await wait(500); }
      };
    }
    const big = level === 'easy' ? 'l' : pick(['l', 'pet']);
    const set = [{ id: 'dl', name: '1dLます', w: 5, h: 4, cap: 100, vol: 0, masu: true }, big === 'l' ? { id: 'l', name: '1Lます', w: 10, h: 10, cap: 1000, vol: 0, masu: true, marks: 10 } : { id: 'pet', name: 'ペットボトル', w: 6.5, h: 17, cap: 500, vol: 0, bottle: true }];
    setup('masu', set);
    const nAns = big === 'l' ? 10 : 5;
    return {
      say: big === 'l' ? '1Lますを いっぱいに するには、1dLますで なんばい？' : '500mLの ペットボトルは、1dLますで なんばい？', choices: shuffle([nAns, nAns === 10 ? 100 : 50, nAns === 10 ? 5 : 10].map((n, q) => ({ label: n + hai(n), ok: q === 0 }))),
      at: { x: Wd / 2, y: tableY - 6 * k, r: k * 4 },
      hint(s) { if (s === 1) HUD.say('1dL は 1Lの 10こに わけた 1つぶん'); if (s === 2) HUD.say(big === 'l' ? '1L = 10dL' : '500mL は 1Lの はんぶん'); if (s === 3) HUD.say(big === 'l' ? '10こで 1L' : '10dLの はんぶん'); },
      async verify() { const d = byId('dl'), t = byId(big); for (let j = 1; j <= nAns; j++) { await fill(d, null, true); await pour(d, t, { fast: true }); HUD.say(`<b>${j}${hai(j)}</b>`, { speech: j + '杯', speak: j === nAns }); } }
    };
  }
  let quiz = null;
  return {
    title: 'みずの かさ', grade: '1・2ねん',
    mount(c) { svg = c.svg; Wd = c.W; Ht = c.H; vs = SETS.masu().map(v => Object.assign({ rot: 0, lift: 0, wave: 0, sign: 1, px: null, py: null }, v)); layout(Wd, Ht); raf = requestAnimationFrame(tick); },
    layout(w, h) { if (!busy) layout(w, h); else { Wd = w; Ht = h; } },
    unmount() { cancelAnimationFrame(raf); busy = false; },
    setTab(id, p) {
      busy = false; puddle = null;
      if (id === 'miru') { p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); busy = false; run(miru); }, html: ICON.replay + 'もういちど みる' })])); run(miru); }
      if (id === 'sawaru') sawaruPanel(p);
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'water', n: 5, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
