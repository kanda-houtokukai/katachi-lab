/* ---------- ひろさ：かさねる・マスの いくつぶん（H1） ---------- */
SCENES.area = (() => {
  let svg, Wd, Ht, c = 40, ox = 0, oy = 0, cols = 20, rows = 10, shapes = [], layer, fx, drag = null, pairKey = 'thin', busy = false;
  const rect = (w, h) => { const a = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a.push([x, y]); return a; };
  const L6 = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]];
  const PAIRS = {
    thin: { label: 'ほそい と ましかく', a: rect(7, 1), b: rect(3, 3) },
    hook: { label: 'かぎ と ながしかく', a: L6, b: rect(3, 2) },
    two: { label: 'ながしかく 2つ', a: rect(6, 2), b: rect(4, 3) },
    inside: { a: rect(2, 2), b: rect(3, 3) },
    cross: { a: rect(5, 2), b: rect(3, 3) }
  };
  function setPair(k, pos) {
    pairKey = k; const P = PAIRS[k];
    const bw = Math.max(...P.b.map(p => p[0])) + 1, aw = Math.max(...P.a.map(p => p[0])) + 1;
    const ah = Math.max(...P.a.map(p => p[1])) + 1, bh = Math.max(...P.b.map(p => p[1])) + 1;
    const gap = 2, total = aw + gap + bw, sx = Math.max(1, Math.floor((cols - total) / 2)), sy = Math.max(1, Math.floor((rows - Math.max(ah, bh)) / 2));
    shapes = [
      { id: 'a', name: 'あか', color: css('--face-1'), cells: P.a, gx: pos ? pos[0][0] : sx, gy: pos ? pos[0][1] : sy },
      { id: 'b', name: 'あお', color: css('--face-4'), cells: P.b, gx: pos ? pos[1][0] : sx + aw + gap, gy: pos ? pos[1][1] : sy }
    ];
    draw();
  }
  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = '';
    c = Math.floor(Math.min(Wd / 16, (Ht - 70) / 9, 58)); cols = Math.floor((Wd - 24) / c); rows = Math.floor((Ht - 70) / c);
    ox = Math.round((Wd - cols * c) / 2); oy = 62 + Math.round((Ht - 70 - rows * c) / 2);
    const g = S('g', {}, svg);
    S('rect', { x: ox, y: oy, width: cols * c, height: rows * c, fill: '#fbfbf7', stroke: css('--line'), 'stroke-width': 2 }, g);
    for (let i = 1; i < cols; i++) S('line', { x1: ox + i * c, y1: oy, x2: ox + i * c, y2: oy + rows * c, stroke: '#dfe6ee', 'stroke-width': 1 }, g);
    for (let j = 1; j < rows; j++) S('line', { x1: ox, y1: oy + j * c, x2: ox + cols * c, y2: oy + j * c, stroke: '#dfe6ee', 'stroke-width': 1 }, g);
    layer = S('g', {}, svg); fx = S('g', {}, svg);
    if (shapes.length) shapes.forEach(s => { s.gx = clamp(s.gx, 0, cols - 1); s.gy = clamp(s.gy, 0, rows - 1); });
    draw();
  }
  function outline(s) {
    const set = new Set(s.cells.map(p => p.join(','))), segs = [];
    for (const [x, y] of s.cells) {
      if (!set.has([x, y - 1].join(','))) segs.push([x, y, x + 1, y]);
      if (!set.has([x, y + 1].join(','))) segs.push([x, y + 1, x + 1, y + 1]);
      if (!set.has([x - 1, y].join(','))) segs.push([x, y, x, y + 1]);
      if (!set.has([x + 1, y].join(','))) segs.push([x + 1, y, x + 1, y + 1]);
    }
    return segs;
  }
  function draw() {
    if (!layer) return; layer.innerHTML = '';
    for (const s of shapes) {
      const g = S('g', { style: 'cursor:grab', transform: `translate(${ox + s.gx * c + (s.dx || 0)},${oy + s.gy * c + (s.dy || 0)})` }, layer); s.g = g;
      for (const [x, y] of s.cells) S('rect', { x: x * c, y: y * c, width: c, height: c, fill: s.color, opacity: .72 }, g);
      const d = outline(s).map(q => `M${q[0] * c},${q[1] * c}L${q[2] * c},${q[3] * c}`).join('');
      S('path', { d, stroke: s.color, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'square' }, g);
      g.addEventListener('pointerdown', e => { if (busy || App.tab !== 'sawaru') return; e.stopPropagation(); const p = ptr(e); layer.appendChild(g); drag = { s, x0: p.x, y0: p.y, id: e.pointerId }; svg.setPointerCapture(e.pointerId); fx.innerHTML = ''; HUD.hide(); });
    }
  }
  function bind() {
    svg.onpointermove = e => { if (!drag || e.pointerId !== drag.id) return; const p = ptr(e); drag.s.dx = p.x - drag.x0; drag.s.dy = p.y - drag.y0; drag.s.g.setAttribute('transform', `translate(${ox + drag.s.gx * c + drag.s.dx},${oy + drag.s.gy * c + drag.s.dy})`); };
    const end = () => {
      if (!drag) return; const s = drag.s; drag = null;
      const w = Math.max(...s.cells.map(p => p[0])) + 1, h = Math.max(...s.cells.map(p => p[1])) + 1;
      s.gx = clamp(Math.round(s.gx + (s.dx || 0) / c), 0, cols - w); s.gy = clamp(Math.round(s.gy + (s.dy || 0) / c), 0, rows - h); s.dx = s.dy = 0; SFX.pop(); draw();
      const o = overlapInfo(); if (o.over) HUD.say(o.aIn ? '<b>あか</b>が すっぽり はいった。<em>あお</em>の ほうが ひろい' : o.bIn ? '<em>あお</em>が すっぽり はいった。<b>あか</b>の ほうが ひろい' : 'かさねても わからない。<b>マス</b>で かぞえよう');
    };
    svg.onpointerup = end; svg.onpointercancel = end;
  }
  function cellsAbs(s) { return s.cells.map(([x, y]) => (x + s.gx) + ',' + (y + s.gy)); }
  function overlapInfo() {
    const A = cellsAbs(shapes[0]), B = new Set(cellsAbs(shapes[1])), Aset = new Set(A);
    const inter = A.filter(k => B.has(k)).length;
    return { over: inter > 0, aIn: inter === A.length, bIn: inter === B.size && [...B].every(k => Aset.has(k)) };
  }
  async function countTiles(s) {
    let n = 0; const g = S('g', {}, fx);
    for (const [x, y] of s.cells) {
      n++; const X = ox + (s.gx + x) * c, Y = oy + (s.gy + y) * c;
      const t = S('g', {}, g); S('rect', { x: X + 3, y: Y + 3, width: c - 6, height: c - 6, rx: 4, fill: '#fff', stroke: s.color, 'stroke-width': 2 }, t);
      const tx = S('text', { x: X + c / 2, y: Y + c / 2 + c * .14, 'text-anchor': 'middle', 'font-size': c * .4, fill: s.color }, t); tx.textContent = n;
      await tween(150, e => t.setAttribute('transform', `translate(0,${(1 - e) * -14})`), E.out); SFX.tick();
    }
    return n;
  }
  async function perim(s) {
    const segs = outline(s), P = segs.length, g = S('g', {}, fx);
    const d = segs.map(q => `M${ox + (s.gx + q[0]) * c},${oy + (s.gy + q[1]) * c}L${ox + (s.gx + q[2]) * c},${oy + (s.gy + q[3]) * c}`).join('');
    const p = S('path', { d, stroke: css('--ink'), 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round', 'stroke-dasharray': '1 9' }, g);
    const by = oy + rows * c - c * .6, x0 = ox + (s.gx) * c, bw = P * c * .35;
    const bar = S('rect', { x: x0, y: by - 8, width: 0, height: 10, rx: 5, fill: s.color }, g);
    await tween(700, e => bar.setAttribute('width', bw * e));
    const t = S('text', { x: x0 + bw + 8, y: by + 2, 'font-size': 18, fill: s.color }, g); t.textContent = 'まわり ' + P;
    return P;
  }
  async function moveShape(s, gx, gy, ms = 800) { const a = { x: s.gx, y: s.gy }; await tween(ms, e => { s.dx = (gx - a.x) * c * e; s.dy = (gy - a.y) * c * e; s.g.setAttribute('transform', `translate(${ox + a.x * c + s.dx},${oy + a.y * c + s.dy})`); }); s.gx = gx; s.gy = gy; s.dx = s.dy = 0; draw(); }

  async function miru() {
    busy = true; fx.innerHTML = ''; setPair('inside');
    HUD.say('ひろいのは どっち？'); await wait(1800);
    HUD.say('かさねて みよう'); await moveShape(shapes[0], shapes[1].gx, shapes[1].gy);
    HUD.say('<b>あか</b>が すっぽり はいった。はみだした <em>あお</em>の ほうが ひろい'); await wait(3000);
    setPair('thin'); HUD.say('こんどは どっち？'); await wait(1800);
    const home = { x: shapes[0].gx, y: shapes[0].gy };
    await moveShape(shapes[0], shapes[1].gx - 2, shapes[1].gy + 1);
    HUD.say('かさねても わからない…'); await wait(2200);
    await moveShape(shapes[0], home.x, home.y, 600);
    HUD.say('おなじ おおきさの <b>マス</b>で かぞえよう');
    const na = await countTiles(shapes[0]); await wait(300); const nb = await countTiles(shapes[1]);
    HUD.say(`<b>あか ${na}マス</b>、<em>あお ${nb}マス</em>。<em>あお</em>の ほうが ひろい`); await wait(3200);
    HUD.say('まわりの ながさは？'); fx.innerHTML = ''; await perim(shapes[0]); await perim(shapes[1]);
    HUD.say('まわりが ながくても、ひろいとは かぎらない'); busy = false;
  }
  function sawaruPanel(p) {
    busy = false; fx.innerHTML = ''; setPair('thin');
    p.appendChild(H('div', { class: 'row' }, [seg(['thin', 'hook', 'two'].map(k => ({ id: k, label: PAIRS[k].label })), pairKey, k => { cancelRuns(); busy = false; fx.innerHTML = ''; setPair(k); HUD.say('ゆびで うごかして かさねて みよう'); })]));
    p.appendChild(H('div', { class: 'row' }, [
      H('button', { class: 'btn sub small', text: 'マスを かぞえる', onclick: () => { if (busy) return; busy = true; fx.innerHTML = ''; run(async () => { const a = await countTiles(shapes[0]); const b = await countTiles(shapes[1]); HUD.say(`<b>あか ${a}マス</b>、<em>あお ${b}マス</em>` + (a === b ? '。おなじ ひろさ' : a > b ? '。<b>あか</b>の ほうが ひろい' : '。<em>あお</em>の ほうが ひろい')); busy = false; }); } }),
      H('button', { class: 'btn sub small', text: 'まわりの ながさ', onclick: () => { if (busy) return; busy = true; fx.innerHTML = ''; run(async () => { const a = await perim(shapes[0]); const b = await perim(shapes[1]); HUD.say(`まわりは <b>あか ${a}</b>、<em>あお ${b}</em>`); busy = false; }); } }),
      H('button', { class: 'btn sub small', text: 'もとに もどす', onclick: () => { cancelRuns(); busy = false; fx.innerHTML = ''; setPair(pairKey); HUD.hide(); } })
    ]));
    HUD.say('ゆびで うごかして かさねて みよう');
  }
  function gen(level, i) {
    busy = false; fx.innerHTML = '';
    const pool = level === 'easy' ? [['inside'], [{ a: rect(2, 3), b: rect(3, 4) }], [{ a: rect(4, 2), b: rect(3, 1) }]]
      : level === 'normal' ? [['cross'], ['thin'], [{ a: rect(8, 1), b: rect(3, 3) }], [{ a: rect(4, 3), b: rect(5, 2) }]]
        : [['hook'], ['two'], [{ a: rect(8, 1), b: rect(3, 3) }], [{ a: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [0, 4]], b: rect(3, 2) }]];
    const pk = pool[i % pool.length][0];
    if (typeof pk === 'string') setPair(pk); else { PAIRS.q = pk; setPair('q'); }
    const na = shapes[0].cells.length, nb = shapes[1].cells.length;
    const ch = [{ label: 'あか', html: '<span class="sw" style="background:var(--face-1)"></span>あか', ok: na > nb }, { label: 'あお', html: '<span class="sw" style="background:var(--face-4)"></span>あお', ok: nb > na }];
    if (level !== 'easy') ch.push({ label: 'おなじ', ok: na === nb });
    return {
      say: 'ひろいのは どっち？', choices: ch, at: { x: Wd / 2, y: oy + rows * c / 2, r: c * 2.4 },
      hint(s) { if (s === 1) HUD.say(level === 'easy' ? 'かさねて みると？' : 'まわりの ながさで きめて いいかな？'); if (s === 2) HUD.say('おなじ おおきさの マスで かぞえよう'); if (s === 3) HUD.say(`あかは ${na}マス`); },
      async verify() { busy = true; const a = await countTiles(shapes[0]); const b = await countTiles(shapes[1]); HUD.say(`<b>あか ${a}マス</b>、<em>あお ${b}マス</em>`, { speak: false }); busy = false; }
    };
  }
  let quiz = null;
  return {
    title: 'ひろさくらべ', grade: '1ねん',
    mount(cc) { svg = cc.svg; Wd = cc.W; Ht = cc.H; layout(Wd, Ht); setPair('thin'); bind(); },
    layout(w, h) { layout(w, h); },
    unmount() { svg.onpointermove = svg.onpointerup = svg.onpointercancel = null; busy = false; },
    setTab(id, p) {
      busy = false; if (fx) fx.innerHTML = ''; bind();
      if (id === 'miru') { p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); busy = false; run(miru); }, html: ICON.replay + 'もういちど みる' })])); run(miru); }
      if (id === 'sawaru') sawaruPanel(p);
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'area', n: 4, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
