/* ---------- おもさ：はかりと てんびん（O3） ---------- */
SCENES.scale = (() => {
  let svg, Wd, Ht, el = {}, raf = 0, mode = 'hakari', cap = 1000, lens = false;
  /* 値はおよそ（⚠️要検証。製品では data/benchmarks.json に置く） */
  const ITEMS = {
    apple: { name: 'りんご', g: 280 }, egg: { name: 'たまご', g: 60 }, carrot: { name: 'にんじん', g: 150 },
    book: { name: 'ほん', g: 320 }, clay: { name: 'ねんど', g: 200 }, pack: { name: 'みず 1L', g: 1030 },
    pencil: { name: 'えんぴつ', g: 6 }, eraser: { name: 'けしごむ', g: 20 },
    sponge: { name: 'スポンジ', g: 20 }, iron: { name: 'てつの たま', g: 110 },
    rice: { name: 'おこめ', g: 3000 }, box: { name: 'にもつ', g: 0 }
  };
  const SHELF = ['apple', 'egg', 'carrot', 'book', 'clay', 'pack'];
  let onPlate = [], clayShape = 0, needle = { a: 0, v: 0, said: -1 }, beam = { a: 0, v: 0, hold: false }, left = 'egg', right = null, coins = 0, boxG = 0;
  const mass = () => onPlate.reduce((s, id) => s + (id === 'box' ? boxG : ITEMS[id].g), 0);
  const gfmt = g => g < 1000 ? `${g}g` : `${Math.floor(g / 1000)}kg${g % 1000 ? ' ' + (g % 1000) + 'g' : ''}`;
  const gsp = g => g < 1000 ? `${g}グラム` : `${Math.floor(g / 1000)}キログラム${g % 1000 ? (g % 1000) + 'グラム' : ''}`;
  const TICK = { 1000: [5, 50, 100], 2000: [10, 100, 200], 4000: [20, 100, 500] };

  /* 物の絵（中心が下の真ん中、大きさ s） */
  function drawItem(p, id, s, shape) {
    const g = S('g', {}, p);
    if (id === 'apple') { S('circle', { cx: 0, cy: -s * .45, r: s * .45, fill: '#d9452f' }, g); S('path', { d: `M0,${-s * .85}q${s * .05},${-s * .2} ${s * .02},${-s * .25}`, stroke: '#6b4a2a', 'stroke-width': s * .06, fill: 'none', 'stroke-linecap': 'round' }, g); S('ellipse', { cx: s * .14, cy: -s * 1, rx: s * .14, ry: s * .07, fill: '#8cc152', transform: `rotate(-25 ${s * .14} ${-s})` }, g); S('ellipse', { cx: -s * .16, cy: -s * .6, rx: s * .08, ry: s * .12, fill: '#fff', opacity: .35 }, g); }
    if (id === 'egg') { S('ellipse', { cx: 0, cy: -s * .38, rx: s * .3, ry: s * .38, fill: '#f7ead0', stroke: '#d9c49b', 'stroke-width': 2 }, g); }
    if (id === 'carrot') { S('path', { d: `M${-s * .5},${-s * .2}L${s * .55},${-s * .08}L${-s * .5},${-s * .02}Q${-s * .62},${-s * .11} ${-s * .5},${-s * .2}Z`, fill: '#f08a24' }, g); S('path', { d: `M${-s * .55},${-s * .12}l${-s * .25},${-s * .14}M${-s * .55},${-s * .11}l${-s * .28},${s * .02}M${-s * .55},${-s * .1}l${-s * .2},${s * .14}`, stroke: '#5a9a3a', 'stroke-width': s * .06, 'stroke-linecap': 'round' }, g); }
    if (id === 'book') { S('rect', { x: -s * .5, y: -s * .22, width: s, height: s * .22, rx: 3, fill: '#4f9bd9' }, g); S('rect', { x: -s * .46, y: -s * .18, width: s * .92, height: s * .08, fill: '#fff', opacity: .8 }, g); }
    if (id === 'clay') {
      if (shape === 1) S('rect', { x: -s * .6, y: -s * .2, width: s * 1.2, height: s * .2, rx: s * .1, fill: '#8cc152' }, g);
      else if (shape === 2) [[-.42, .13], [-.12, .16], [.18, .12], [.44, .14]].forEach(([x, r]) => S('circle', { cx: x * s, cy: -r * s, r: r * s, fill: '#8cc152' }, g));
      else S('ellipse', { cx: 0, cy: -s * .3, rx: s * .34, ry: s * .3, fill: '#8cc152' }, g);
    }
    if (id === 'pack') { S('path', { d: `M${-s * .26},0V${-s * .95}l${s * .12},${-s * .14}h${s * .28}l${s * .12},${s * .14}V0Z`, fill: '#fbfbf7', stroke: '#9fb3c9', 'stroke-width': 2 }, g); S('rect', { x: -s * .26, y: -s * .62, width: s * .52, height: s * .3, fill: '#4f9bd9' }, g); const t = S('text', { x: 0, y: -s * .42, 'text-anchor': 'middle', 'font-size': s * .15, fill: '#fff', class: 'ui' }, g); t.textContent = '1L'; }
    if (id === 'pencil') { S('rect', { x: -s * .5, y: -s * .08, width: s * .85, height: s * .08, fill: '#f2b833' }, g); S('path', { d: `M${s * .35},${-s * .08}l${s * .15},${s * .04}l${-s * .15},${s * .04}z`, fill: '#e8cfa0' }, g); }
    if (id === 'eraser') { S('rect', { x: -s * .28, y: -s * .18, width: s * .56, height: s * .18, rx: 3, fill: '#fff', stroke: '#d6dcd5', 'stroke-width': 2 }, g); S('rect', { x: -s * .12, y: -s * .19, width: s * .3, height: s * .2, fill: '#4f9bd9' }, g); }
    if (id === 'sponge') { S('rect', { x: -s * .55, y: -s * .7, width: s * 1.1, height: s * .7, rx: s * .12, fill: '#f6d55c' }, g); [[-.3, -.5], [.1, -.35], [.32, -.55], [-.1, -.2], [.35, -.15]].forEach(([x, y]) => S('circle', { cx: x * s, cy: y * s, r: s * .05, fill: '#d9b23a' }, g)); }
    if (id === 'iron') { S('circle', { cx: 0, cy: -s * .17, r: s * .17, fill: '#4d5659' }, g); S('circle', { cx: -s * .05, cy: -s * .23, r: s * .05, fill: '#fff', opacity: .5 }, g); }
    if (id === 'rice') { S('path', { d: `M${-s * .45},0Q${-s * .5},${-s * .7} ${-s * .3},${-s * .8}H${s * .3}Q${s * .5},${-s * .7} ${s * .45},0Z`, fill: '#f3ecdc', stroke: '#c9b48a', 'stroke-width': 2 }, g); const t = S('text', { x: 0, y: -s * .32, 'text-anchor': 'middle', 'font-size': s * .2, fill: '#8a6d3b', class: 'ui' }, g); t.textContent = 'おこめ'; }
    if (id === 'box') { S('rect', { x: -s * .4, y: -s * .5, width: s * .8, height: s * .5, rx: 3, fill: '#d9b27a', stroke: '#a88350', 'stroke-width': 2 }, g); S('path', { d: `M${-s * .4},${-s * .32}H${s * .4}`, stroke: '#a88350', 'stroke-width': 2 }, g); }
    return g;
  }
  function coin(p, x, y, r) { S('ellipse', { cx: x, cy: y, rx: r, ry: r * .32, fill: '#dfe3e6', stroke: '#9aa3a8', 'stroke-width': 1.2 }, p); }

  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = ''; el = {};
    const land = Wd > Ht * 1.05;
    el.tableY = Ht * .9;
    S('rect', { x: 0, y: el.tableY, width: Wd, height: Ht - el.tableY, fill: css('--wood-pale') }, svg);
    S('rect', { x: 0, y: el.tableY, width: Wd, height: 5, fill: css('--wood') }, svg);
    if (mode === 'hakari') layoutScale(land); else layoutBalance(land);
  }
  function layoutScale(land) {
    const shelfOn = App.tab === 'sawaru';
    const R = land ? Math.min(Ht * .2, Wd * .16) : Math.min(Wd * .3, Ht * (shelfOn ? .16 : .2));
    const cx = land && shelfOn ? Wd * .32 : Wd / 2, bodyB = el.tableY, cy = bodyB - R * 1.3;
    Object.assign(el, { R, cx, cy });
    S('rect', { x: cx - R * 1.38, y: cy - R * 1.42, width: R * 2.76, height: bodyB - cy + R * 1.42, rx: R * .3, fill: '#f2b833', stroke: '#c48a10', 'stroke-width': 4 }, svg);
    el.plateG = S('g', {}, svg);
    el.plateY = cy - R * 1.42 - R * .28;
    S('rect', { x: cx - R * .12, y: el.plateY, width: R * .24, height: R * .3, fill: css('--metal-deep') }, el.plateG);
    S('ellipse', { cx, cy: el.plateY, rx: R * 1.25, ry: R * .16, fill: css('--metal'), stroke: css('--metal-deep'), 'stroke-width': 3 }, el.plateG);
    el.onPlate = S('g', {}, el.plateG);
    const defs = S('defs', {}, svg);
    const dg = S('g', { id: 'dialG' }, defs);
    S('circle', { cx, cy, r: R, fill: css('--paper'), stroke: '#c48a10', 'stroke-width': 3 }, dg);
    const [mi, mid, lab] = TICK[cap], n = cap / mi;
    for (let i = 0; i < n; i++) {
      const v = i * mi, a = v / cap * 2 * Math.PI, major = v % lab === 0, md = v % mid === 0;
      const r1 = R * .95, r2 = R * (major ? .8 : md ? .85 : .9);
      S('line', { x1: cx + r1 * Math.sin(a), y1: cy - r1 * Math.cos(a), x2: cx + r2 * Math.sin(a), y2: cy - r2 * Math.cos(a), stroke: css('--ink'), 'stroke-width': major ? 2.4 : md ? 1.6 : .9 }, dg);
      if (major) { const t = S('text', { x: cx + R * .66 * Math.sin(a), y: cy - R * .66 * Math.cos(a) + R * .045, 'text-anchor': 'middle', 'font-size': R * (v % 1000 === 0 ? .13 : .11), fill: v % 1000 === 0 && v ? css('--ok') : css('--ink'), class: 'ui' }, dg); t.textContent = v === 0 ? '0' : v % 1000 === 0 ? (v / 1000) + 'kg' : (v % 1000); }
    }
    const ct = S('text', { x: cx, y: cy + R * .42, 'text-anchor': 'middle', 'font-size': R * .12, fill: css('--ink-soft'), class: 'ui' }, dg); ct.textContent = cap / 1000 + 'kg';
    el.needle = S('g', {}, dg);
    S('line', { x1: cx, y1: cy + R * .12, x2: cx, y2: cy - R * .9, stroke: css('--ok'), 'stroke-width': Math.max(2.5, R * .025), 'stroke-linecap': 'round' }, el.needle);
    S('circle', { cx, cy, r: R * .06, fill: css('--ok') }, el.needle);
    S('use', { href: '#dialG' }, svg);
    el.hl = S('g', {}, svg);
    el.lensG = S('g', {}, svg);
    /* たな */
    el.shelf = S('g', {}, svg); el.cells = null;
    if (!shelfOn) { drawPlate(); updateNeedle(); drawLens(); return; }
    const cols = 3, sw = land ? Wd - cx - R * 1.6 - 32 : Wd - 32, sx = land ? cx + R * 1.6 + 16 : 16;
    const cellW = sw / cols, cellH = land ? Math.min(Ht * .22, 150) : Math.min(90, (cy - R * 1.9 - 60) / 2), sy = land ? Ht * .2 : 50;
    el.cells = {};
    SHELF.forEach((id, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = sx + c * cellW + cellW / 2, y = sy + r * (cellH + 10);
      const g = S('g', { style: 'cursor:pointer' }, el.shelf);
      S('rect', { x: x - cellW / 2 + 5, y, width: cellW - 10, height: cellH, rx: 14, fill: css('--paper'), stroke: css('--line'), 'stroke-width': 2 }, g);
      const s = Math.min(cellW * .5, cellH * .55);
      const ig = drawItem(g, id, s, 0); ig.setAttribute('transform', `translate(${x},${y + cellH * .7})`);
      const t = S('text', { x, y: y + cellH - 8, 'text-anchor': 'middle', 'font-size': Math.max(12, Math.min(16, cellH * .14)), fill: css('--ink-soft') }, g); t.textContent = ITEMS[id].name;
      el.cells[id] = { g, ig, x, y: y + cellH * .7, s };
      g.addEventListener('pointerdown', () => tapShelf(id));
    });
    drawPlate(); updateNeedle(); drawLens();
  }
  function drawPlate() {
    if (!el.onPlate) return;
    el.onPlate.innerHTML = '';
    const R = el.R, n = onPlate.length, s = R * .62;
    onPlate.forEach((id, i) => {
      const x = el.cx + (i - (n - 1) / 2) * Math.min(R * .7, R * 2.2 / Math.max(1, n)), g = drawItem(el.onPlate, id, id === 'rice' || id === 'pack' ? s * 1.1 : s, id === 'clay' ? clayShape : 0);
      g.setAttribute('transform', `translate(${x},${el.plateY - R * .06})`); g.style.cursor = 'pointer';
      g.addEventListener('pointerdown', () => tapPlate(id));
    });
    if (el.cells) for (const id of SHELF) el.cells[id].ig.setAttribute('opacity', onPlate.includes(id) ? .2 : 1);
  }
  function updateNeedle() { if (el.needle) el.needle.setAttribute('transform', `rotate(${needle.a} ${el.cx} ${el.cy})`); }
  function drawLens() {
    if (!el.lensG) return; el.lensG.innerHTML = '';
    if (!lens || mode !== 'hakari') return;
    const R = el.R, a = needle.a * Math.PI / 180, tx = el.cx + R * .88 * Math.sin(a), ty = el.cy - R * .88 * Math.cos(a), lr = R * .42;
    const lx = el.cx + (R * 1.55) * Math.sin(a), ly = el.cy - (R * 1.55) * Math.cos(a);
    const lxC = clamp(lx, lr + 6, Wd - lr - 6), lyC = clamp(ly, lr + 50, Ht - lr - 6);
    const cpId = 'lensClip'; const d = S('defs', {}, el.lensG); const cp = S('clipPath', { id: cpId }, d); S('circle', { cx: lxC, cy: lyC, r: lr }, cp);
    S('line', { x1: tx, y1: ty, x2: lxC, y2: lyC, stroke: css('--ink-soft'), 'stroke-width': 2, 'stroke-dasharray': '4 4' }, el.lensG);
    const g = S('g', { 'clip-path': `url(#${cpId})` }, el.lensG);
    S('circle', { cx: lxC, cy: lyC, r: lr, fill: css('--paper') }, g);
    S('use', { href: '#dialG', transform: `translate(${lxC},${lyC}) scale(3.2) translate(${-tx},${-ty})` }, g);
    S('circle', { cx: lxC, cy: lyC, r: lr, fill: 'none', stroke: css('--ink'), 'stroke-width': 5 }, el.lensG);
  }
  function layoutBalance(land) {
    const bx = land ? Wd * .4 : Wd / 2, by = Ht * .3, Lb = land ? Math.min(Wd * .26, 300) : Wd * .4;
    Object.assign(el, { bx, by, Lb, str: Ht * .26 });
    S('rect', { x: bx - 9, y: by, width: 18, height: el.tableY - by - 14, fill: '#c9a06b', stroke: '#9c7642', 'stroke-width': 2 }, svg);
    S('path', { d: `M${bx - Lb * .4},${el.tableY}L${bx - Lb * .3},${el.tableY - 18}H${bx + Lb * .3}L${bx + Lb * .4},${el.tableY}Z`, fill: '#c9a06b', stroke: '#9c7642', 'stroke-width': 2 }, svg);
    el.beamG = S('g', {}, svg);
    S('rect', { x: bx - Lb, y: by - 7, width: Lb * 2, height: 14, rx: 7, fill: '#8e979b' }, el.beamG);
    S('circle', { cx: bx, cy: by, r: 12, fill: '#5e6b66' }, el.beamG);
    el.panL = S('g', {}, svg); el.panR = S('g', {}, svg);
    el.pointer = S('path', { d: `M${bx},${by}V${by - 54}`, stroke: css('--ok'), 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    S('path', { d: `M${bx - 26},${by - 62}Q${bx},${by - 70} ${bx + 26},${by - 62}`, fill: 'none', stroke: css('--ink-soft'), 'stroke-width': 2 }, svg);
    S('line', { x1: bx, y1: by - 72, x2: bx, y2: by - 60, stroke: css('--ink-soft'), 'stroke-width': 2 }, svg);
    el.lvl = S('text', { x: bx + Lb * .92, y: by + el.str + Lb * .5 * .35 + 30, 'text-anchor': 'middle', 'font-size': 18, fill: css('--mat-deep') }, svg);
    drawPans();
  }
  function drawPans() {
    if (!el.panL) return;
    const a = beam.a * Math.PI / 180, { bx, by, Lb, str } = el;
    el.beamG.setAttribute('transform', `rotate(${beam.a} ${bx} ${by})`);
    el.pointer.setAttribute('transform', `rotate(${beam.a} ${bx} ${by})`);
    [[el.panL, -1], [el.panR, 1]].forEach(([g, sgn]) => {
      g.innerHTML = '';
      const ex = bx + sgn * Lb * .92 * Math.cos(a), ey = by + sgn * Lb * .92 * Math.sin(a), py = ey + str, pw = Lb * .5;
      S('path', { d: `M${ex},${ey}L${ex - pw * .8},${py}M${ex},${ey}L${ex + pw * .8},${py}`, stroke: '#8e979b', 'stroke-width': 2 }, g);
      S('path', { d: `M${ex - pw},${py}Q${ex},${py + pw * .35} ${ex + pw},${py}Z`, fill: css('--metal'), stroke: css('--metal-deep'), 'stroke-width': 3 }, g);
      const id = sgn < 0 ? left : right;
      if (id) { const ig = drawItem(g, id, pw * .9, 0); ig.setAttribute('transform', `translate(${ex},${py})`); }
      if (sgn > 0 && !right && coins) {
        const cr = pw * .14, cols = Math.ceil(coins / 10);
        for (let c = 0; c < cols; c++) { const cnt = Math.min(10, coins - c * 10), x = ex + (c - (cols - 1) / 2) * cr * 2.15; for (let i = 0; i < cnt; i++) coin(g, x, py - 3 - i * cr * .3, cr); }
      }
    });
    const m = left ? ITEMS[left].g : 0, rr = right ? ITEMS[right].g : coins;
    el.lvl.textContent = !right && coins ? `1えんだま ${coins}まい` : '';
  }
  function physics(dt) {
    if (mode === 'hakari' && el.needle) {
      const m = mass(), over = m > cap, target = over ? 362 : m / cap * 360;
      needle.v += (-90 * (needle.a - target) - 11 * needle.v) * dt; needle.a += needle.v * dt;
      if (needle.a > 363) { needle.a = 363; needle.v = -Math.abs(needle.v) * .3; }
      if (needle.a < -2) { needle.a = -2; needle.v = Math.abs(needle.v) * .3; }
      updateNeedle(); if (lens) drawLens();
      if (Math.abs(needle.a - target) < .25 && Math.abs(needle.v) < .6 && needle.said !== m * 10 + cap) { needle.said = m * 10 + cap; settled(m, over); }
    }
    if (mode === 'tenbin' && el.beamG) {
      const m = left ? ITEMS[left].g : 0, rr = right ? ITEMS[right].g : coins;
      const target = beam.hold ? 0 : clamp((rr - m) / Math.max(m, rr, 10), -1, 1) * 14;
      beam.v += (-40 * (beam.a - target) - 6 * beam.v) * dt; beam.a += beam.v * dt; drawPans();
    }
  }
  let onSettle = null;
  function settled(m, over) {
    if (onSettle) { const f = onSettle; onSettle = null; f(m, over); return; }
    if (App.tab !== 'sawaru' || !m) return;
    if (over) { HUD.say(`<b>はかれない！</b> ${cap / 1000}kgより おもい。おおきい はかりに しよう`); return; }
    let msg = `<b>${gfmt(m)}</b>`, sp = gsp(m);
    if (onPlate.length === 1 && onPlate[0] === 'pack') { msg += '。パックの 30gを ひくと みずは <b>1kg</b>'; sp += '。パックの30グラムを引くと、水は1キログラム'; }
    HUD.say(msg, { speech: sp });
  }
  function loop() { let last = performance.now(); const f = now => { const dt = Math.min(.04, (now - last) / 1000); last = now; physics(dt); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); }
  function tapShelf(id) { if (App.tab !== 'sawaru' || mode !== 'hakari') return; if (onPlate.includes(id)) return tapPlate(id); onPlate.push(id); SFX.thud(); needle.said = -1; drawPlate(); if (id === 'clay') showClayBtn(true); }
  function tapPlate(id) { if (App.tab !== 'sawaru') return; onPlate = onPlate.filter(x => x !== id); SFX.pop(); needle.said = -1; drawPlate(); if (id === 'clay') showClayBtn(false); if (!onPlate.length) HUD.hide(); }
  let clayBtn = null;
  function showClayBtn(v) { if (clayBtn) clayBtn.hidden = !v; }
  function setCap(c) { cap = c; needle.said = -1; layout(Wd, Ht); }
  function setMode(m) { mode = m; layout(Wd, Ht); }

  /* みる */
  async function miru() {
    setMode('tenbin'); left = 'sponge'; right = 'iron'; coins = 0; beam.a = 0; beam.v = 0; beam.hold = true; drawPans();
    HUD.say('おおきい スポンジと ちいさい てつの たま。おもいのは どっち？'); await wait(3000);
    beam.hold = false; await wait(1800);
    HUD.say('おおきい ほうが おもい とは かぎらない'); await wait(2600);
    left = 'egg'; right = null; coins = 0; drawPans();
    HUD.say('たまごと 1えんだまで くらべよう'); await wait(1600);
    for (let i = 0; i < 6; i++) { coins += 10; SFX.clink(); drawPans(); await wait(650); }
    await wait(900);
    HUD.say('1えんだま <b>60まい</b>で つりあった。1えんだま 1まいは <b>1g</b>。たまごは <b>60g</b>', { speech: '1円玉60枚でつりあった。1円玉1枚は1グラム。たまごは60グラム' }); await wait(5200);
    cap = 1000; onPlate = []; needle.a = 0; needle.v = 0; setMode('hakari');
    HUD.say('はかりに のせると…'); await wait(1000);
    onPlate = ['egg']; SFX.thud(); drawPlate(); needle.said = -1;
    await new Promise(r => { onSettle = () => r(); }); await wait(300);
    lens = true; drawLens(); HUD.say('<b>60g</b>。めもり 1つは <b>5g</b>', { speech: '60グラム。目もり1つは5グラム' }); await wait(3800); lens = false; drawLens();
    onPlate = ['clay']; clayShape = 0; SFX.thud(); drawPlate(); needle.said = -1;
    await new Promise(r => { onSettle = () => r(); });
    HUD.say('ねんど <b>200g</b>。かたちを かえると…', { speech: 'ねんど200グラム。形を変えると' }); await wait(2200);
    clayShape = 1; drawPlate(); SFX.pop(); await wait(1600); clayShape = 2; drawPlate(); SFX.pop(); await wait(1600);
    HUD.say('かたちを かえても おもさは おなじ'); await wait(3000);
    onPlate = ['pack']; SFX.thud(); drawPlate(); needle.said = -1;
    await new Promise(r => { onSettle = () => r(); });
    HUD.say('<b>はかれない！</b> 1kgより おもい'); await wait(2600);
    setCap(2000); onPlate = ['pack']; drawPlate(); needle.a = 0; needle.said = -1; HUD.say('2kgまで はかれる はかりに かえよう');
    await new Promise(r => { onSettle = () => r(); });
    HUD.say('<b>1kg 30g</b>。パックの 30gを ひくと、みず 1Lは <b>1kg</b>', { speech: '1キログラム30グラム。パックの30グラムを引くと、水1リットルは1キログラム' });
  }
  /* さわる */
  function sawaruPanel(p) {
    onSettle = null; lens = false; onPlate = []; clayShape = 0; left = 'egg'; right = null; coins = 0; beam.hold = false; needle.said = -1;
    layout(Wd, Ht);
    const row = H('div', { class: 'row' });
    const sub = H('div', { class: 'row' });
    const build = () => {
      sub.innerHTML = '';
      if (mode === 'hakari') {
        sub.appendChild(seg([{ id: 1000, label: '1kg' }, { id: 2000, label: '2kg' }, { id: 4000, label: '4kg' }], cap, c => setCap(c), { label: 'はかり' }));
        sub.appendChild(toggleBtn('むしめがね', lens, v => { lens = v; drawLens(); }));
        clayBtn = H('button', { class: 'btn sub small', text: 'ねんどの かたち', onclick: () => { clayShape = (clayShape + 1) % 3; drawPlate(); SFX.pop(); HUD.say('はりは うごいた？'); } }); clayBtn.hidden = !onPlate.includes('clay');
        sub.appendChild(clayBtn);
        sub.appendChild(H('button', { class: 'btn sub small', text: 'ぜんぶ おろす', onclick: () => { onPlate = []; needle.said = -1; drawPlate(); showClayBtn(false); HUD.hide(); } }));
        HUD.say('たなの ものを タッチして はかりに のせよう');
      } else {
        sub.appendChild(seg([{ id: 'pencil', label: 'えんぴつ' }, { id: 'eraser', label: 'けしごむ' }, { id: 'egg', label: 'たまご' }], left, id => { left = id; coins = 0; drawPans(); HUD.say('1えんだまを のせて つりあわせよう'); }));
        const add = n => { coins = clamp(coins + n, 0, 120); if (n > 0) SFX.clink(); drawPans(); const m = ITEMS[left].g; if (coins === m) HUD.say(`<b>つりあった！</b> 1えんだま ${coins}まいぶん。${ITEMS[left].name}は <b>${m}g</b>`, { speech: `つりあった。1円玉${coins}枚分。${ITEMS[left].name}は${m}グラム` }); else HUD.say(`1えんだま ${coins}まい`, { speak: false }); };
        sub.appendChild(H('button', { class: 'btn sub small', text: '+1まい', onclick: () => add(1) }));
        sub.appendChild(H('button', { class: 'btn sub small', text: '+10まい', onclick: () => add(10) }));
        sub.appendChild(H('button', { class: 'btn sub small', text: '−1まい', onclick: () => add(-1) }));
        HUD.say('1えんだまを のせて つりあわせよう');
      }
    };
    row.appendChild(seg([{ id: 'hakari', label: 'はかり' }, { id: 'tenbin', label: 'てんびん' }], mode, m => { setMode(m); build(); }));
    p.appendChild(row); p.appendChild(sub); build();
  }
  /* ためす */
  function readQ(level) {
    let c = level === 'challenge' ? pick([2000, 4000]) : 1000; const [mi, , lab] = TICK[c];
    let m;
    if (level === 'easy') m = rnd(1, 19) * 50;
    else if (level === 'normal') { do m = rnd(10, 190) * 5; while (m % 50 === 0); }
    else { do m = rnd(Math.ceil(300 / mi), Math.floor((c - 100) / mi)) * mi; while (m % 100 === 0); }
    cap = c; mode = 'hakari'; onPlate = ['box']; boxG = m; needle.a = 0; needle.v = 0; needle.said = -2; lens = false; layout(Wd, Ht);
    const base = Math.floor(m / 100) * 100, ticks = (m - base) / mi;
    const opts = [m, base + ticks, m + mi * 2 <= c ? m + mi * 2 : m - mi * 2].filter((v, i, a) => a.indexOf(v) === i);
    if (opts.length < 3) opts.push(m + 50 <= c ? m + 50 : m - 50);
    return {
      say: `はかりの はりは なんg？（${c / 1000}kgの はかり）`, speech: `はかりの針は何グラム？${c / 1000}キログラムのはかり`,
      choices: shuffle(opts.slice(0, 3).map((v, i) => ({ label: gfmt(v), ok: v === m }))), at: { x: el.cx, y: el.cy, r: el.R * .7 },
      hint(s) { if (s === 1) { lens = true; drawLens(); HUD.say('むしめがねで ちかくを みよう'); } if (s === 2) HUD.say(`めもり 1つは <b>${mi}g</b>`); if (s === 3) HUD.say(`<b>${gfmt(base)}</b> から めもりを かぞえよう`); },
      async verify() { lens = true; drawLens(); HUD.say(`${gfmt(base)} から…`, { speak: false }); for (let k = 1; k <= ticks; k++) { SFX.tick(); await wait(Math.max(120, 900 / ticks)); HUD.say(gfmt(base + k * mi), { speak: false }); } TTS.speak(gsp(m)); HUD.say(`<b>${gfmt(m)}</b>`, { speak: false }); await wait(700); }
    };
  }
  function chooseQ() {
    cap = 1000; mode = 'hakari'; onPlate = ['rice']; needle.a = 0; needle.said = -2; lens = false;
    const rice = ITEMS.rice.g; layout(Wd, Ht); onPlate = []; drawPlate();
    let chosen = 4000;
    return {
      say: '3kgの おこめを はかる はかりは どれ？', speech: '3キログラムのお米をはかるはかりはどれ？',
      choices: [1000, 2000, 4000].map(c => ({ label: c / 1000 + 'kg', ok: c === 4000, c })), at: { x: el.cx, y: el.cy, r: el.R * .7 },
      hint(s) { if (s === 1) HUD.say('はかりに かいて ある おもさまで はかれる'); if (s === 2) HUD.say('3kgより おおきい かずは？'); if (s === 3) HUD.say('4kgまで はかれる はかり'); },
      async verify(ok) {
        for (const c of ok ? [4000] : [1000, 4000]) {
          setCap(c); onPlate = ['rice']; drawPlate(); needle.a = 0; needle.said = -2; SFX.thud();
          await new Promise(r => { onSettle = (m, over) => r(over); });
          HUD.say(c === 4000 ? '<b>3kg</b> ぴったり はかれた' : `<b>はかれない！</b> ${c / 1000}kgの はかりでは たりない`); await wait(1800);
        }
      }
    };
  }
  function estQ() {
    cap = 2000; mode = 'hakari'; onPlate = []; needle.a = 0; needle.said = -2; lens = false; layout(Wd, Ht);
    return {
      say: '1kgに いちばん ちかいのは どれ？', speech: '1キログラムに一番近いのはどれ？',
      choices: shuffle([{ label: 'たまご 1こ', ok: false }, { label: 'みず 1L', ok: true }, { label: 'りんご 1こ', ok: false }]), at: { x: el.cx, y: el.cy, r: el.R * .7 },
      hint(s) { if (s === 1) HUD.say('1kgは 1000g'); if (s === 2) HUD.say('たまごは やく 60g'); if (s === 3) HUD.say('みず 1Lは やく 1kg'); },
      async verify() {
        for (const id of ['egg', 'apple', 'pack']) {
          onPlate = [id]; drawPlate(); SFX.thud(); needle.said = -2;
          await new Promise(r => { onSettle = () => r(); });
          HUD.say(`${ITEMS[id].name} <b>${gfmt(ITEMS[id].g)}</b>`, { speak: false }); await wait(1300);
        }
      }
    };
  }
  function gen(level, i) { onSettle = null; return i === 1 ? chooseQ() : i === 3 ? estQ() : readQ(level); }
  let quiz = null;
  return {
    title: 'おもさ', grade: '3ねん',
    mount(c) { svg = c.svg; Wd = c.W; Ht = c.H; mode = 'hakari'; cap = 1000; layout(Wd, Ht); loop(); },
    layout(w, h) { layout(w, h); },
    unmount() { cancelAnimationFrame(raf); onSettle = null; },
    setTab(id, p) {
      onSettle = null; lens = false;
      if (id === 'miru') { p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); onSettle = null; run(miru); }, html: ICON.replay + 'もういちど みる' })])); run(miru); }
      if (id === 'sawaru') { mode = 'hakari'; cap = 1000; sawaruPanel(p); }
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'scale', n: 5, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
