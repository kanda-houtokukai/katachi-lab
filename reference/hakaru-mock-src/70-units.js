/* ---------- たんいの しくみ：k と m（U3） ---------- */
SCENES.units = (() => {
  let svg, Wd, Ht, cols = [], mode = 'k', step = 0, busy = false, land = true;
  const Q = [
    { id: 'naga', name: 'ながさ', color: '--face-1', k: ['1m', '10m', '100m', '1km'], kEq: '1km = 1000m', m: ['1m', '10cm', '1cm', '1mm'], mEq: '1m = 1000mm' },
    { id: 'kasa', name: 'かさ', color: '--face-4', k: ['1L', '10L', '100L', '1kL'], kEq: '1kL = 1000L', m: ['1L', '1dL', '10mL', '1mL'], mEq: '1L = 1000mL' },
    { id: 'omo', name: 'おもさ', color: '--face-3', k: ['1g', '10g', '100g', '1kg'], kEq: '1kg = 1000g', m: ['1g', '', '', '1mg'], mEq: '1g = 1000mg' }
  ];
  function icon(g, q, lv, s, md) {
    const col = css(q.color), dark = '#1f2b27';
    if (q.id === 'naga') {
      const w = s, h = s * .22;
      S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3, fill: '#f4e2b2', stroke: '#c9a06b', 'stroke-width': 1.5 }, g);
      for (let i = 0; i <= 10; i++) S('line', { x1: -w / 2 + w * i / 10, y1: -h / 2, x2: -w / 2 + w * i / 10, y2: -h / 2 + h * (i % 5 ? .35 : .55), stroke: '#5a4220', 'stroke-width': 1 }, g);
      if (md === 'm' && lv === 3) S('line', { x1: 0, y1: -h * 1.2, x2: 0, y2: h * 1.2, stroke: col, 'stroke-width': 3 }, g);
    } else if (q.id === 'kasa') {
      if (md === 'k' && lv === 1) S('path', { d: `M${-s * .32},${-s * .3}H${s * .32}L${s * .25},${s * .3}H${-s * .25}Z`, fill: '#b5d4f4', stroke: '#4f8fc6', 'stroke-width': 2 }, g);
      else if (md === 'k' && lv === 2) S('rect', { x: -s * .5, y: -s * .22, width: s, height: s * .44, rx: s * .12, fill: '#b5d4f4', stroke: '#4f8fc6', 'stroke-width': 2 }, g);
      else if (md === 'k' && lv === 3) { const a = s * .36; S('path', { d: `M0,${-a}L${a * 1.1},${-a * .45}V${a * .7}L0,${a * 1.25}L${-a * 1.1},${a * .7}V${-a * .45}Z`, fill: '#b5d4f4', stroke: '#4f8fc6', 'stroke-width': 2 }, g); S('path', { d: `M${-a * 1.1},${-a * .45}L0,${a * .1}L${a * 1.1},${-a * .45}M0,${a * .1}V${a * 1.25}`, fill: 'none', stroke: '#4f8fc6', 'stroke-width': 2 }, g); }
      else if (md === 'm' && lv === 3) S('path', { d: `M0,${-s * .3}C${s * .2},${-s * .05} ${s * .22},${s * .12} 0,${s * .25}C${-s * .22},${s * .12} ${-s * .2},${-s * .05} 0,${-s * .3}Z`, fill: '#7fb8e6' }, g);
      else { S('rect', { x: -s * .3, y: -s * .3, width: s * .6, height: s * .6, rx: 4, fill: '#f7fbff', stroke: '#7d9db3', 'stroke-width': 2 }, g); S('rect', { x: -s * .28, y: -s * .05, width: s * .56, height: s * .33, fill: '#7fb8e6' }, g); }
    } else {
      if (md === 'k' && lv === 1) for (let i = 0; i < 6; i++) S('ellipse', { cx: 0, cy: s * .2 - i * s * .07, rx: s * .26, ry: s * .08, fill: '#dfe3e6', stroke: '#9aa3a8', 'stroke-width': 1.2 }, g);
      else if (md === 'k' && lv >= 2) { const b = lv === 3 ? s * .5 : s * .36; S('path', { d: `M${-b * .7},${-b * .55}Q0,${-b * .85} ${b * .7},${-b * .55}L${b * .9},${b * .6}Q0,${b * .8} ${-b * .9},${b * .6}Z`, fill: '#e9dcc0', stroke: '#b59b6a', 'stroke-width': 2 }, g); S('path', { d: `M${-b * .3},${-b * .7}Q0,${-b * 1} ${b * .3},${-b * .7}`, fill: 'none', stroke: '#b59b6a', 'stroke-width': 3 }, g); }
      else if (md === 'm' && lv === 3) S('ellipse', { cx: 0, cy: 0, rx: s * .2, ry: s * .1, fill: '#f6f2e8', stroke: '#c9b48a', 'stroke-width': 2 }, g);
      else { S('circle', { cx: 0, cy: 0, r: s * .3, fill: '#dfe3e6', stroke: '#9aa3a8', 'stroke-width': 2 }, g); const t = S('text', { x: 0, y: s * .1, 'text-anchor': 'middle', 'font-size': s * .28, fill: '#6b7478', class: 'ui' }, g); t.textContent = '1'; }
    }
    const lab = (md === 'k' ? q.k : q.m)[lv];
    if (lab) { const t = S('text', { x: 0, y: s * .62 + 14, 'text-anchor': 'middle', 'font-size': Math.max(18, s * .2), fill: dark }, g); t.textContent = lab; }
  }
  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = ''; land = Wd > Ht;
    cols = Q.map((q, i) => {
      const box = land ? { x: 16 + i * (Wd - 32) / 3, y: 64, w: (Wd - 32) / 3, h: Ht - 76 } : { x: 16, y: 60 + i * (Ht - 70) / 3, w: Wd - 32, h: (Ht - 70) / 3 };
      const g = S('g', {}, svg);
      S('rect', { x: box.x + 6, y: box.y, width: box.w - 12, height: box.h, rx: 18, fill: css('--paper'), stroke: css('--line'), 'stroke-width': 2 }, g);
      const chip = S('g', {}, g); S('rect', { x: box.x + 18, y: box.y + 12, width: 82, height: 30, rx: 9, fill: css(q.color) }, chip); const t = S('text', { x: box.x + 59, y: box.y + 33, 'text-anchor': 'middle', 'font-size': 17, fill: '#fff' }, chip); t.textContent = q.name;
      const s = Math.min(box.w * .42, box.h * .42, 150);
      const stage = S('g', {}, g), cx = box.x + box.w / 2, cy = box.y + box.h * (land ? .45 : .55);
      const eq = S('text', { x: cx, y: box.y + box.h - 18, 'text-anchor': 'middle', 'font-size': Math.max(18, Math.min(26, box.w * .08)), fill: css(q.color) }, g);
      const cnt = S('text', { x: box.x + box.w - 22, y: box.y + 34, 'text-anchor': 'end', 'font-size': 20, fill: css('--ink-soft'), class: 'ui' }, g);
      return { q, box, g, stage, cx, cy, s, eq, cnt };
    });
    paint();
  }
  function paint() { for (const c of cols) { c.stage.innerHTML = ''; const g = S('g', { transform: `translate(${c.cx},${c.cy})` }, c.stage); icon(g, c.q, step, c.s, mode); c.eq.textContent = step === 3 ? (mode === 'k' ? c.q.kEq : c.q.mEq) : ''; c.cnt.textContent = ''; } }
  function slots(c) {
    const out = [];
    if (c.q.id === 'naga') { const w = Math.min(c.s * .9, (c.box.w - 40) / 10); for (let i = 0; i < 10; i++) out.push({ x: c.cx - 4.5 * w + i * w, y: c.cy, sc: w / c.s, sy: Math.min(1, w / c.s * 2.6), alt: i % 2 }); }
    else { const sp = Math.min((c.box.w - 40) / 5, c.box.h * .3), sc = Math.min(.42, sp / c.s * .95); for (let i = 0; i < 10; i++) out.push({ x: c.cx + ((i % 5) - 2) * sp, y: c.cy + (Math.floor(i / 5) - .5) * sp * 1.05, sc }); }
    return out;
  }
  /* 3つの量で同じ動き。k：10こ ならべて 1つに まとめる。m：10に わけて 1つを ひろげる。 */
  async function doStep(only, fast) {
    if (step >= 3) return;
    const f = fast ? .45 : 1, which = only != null ? [cols[only]] : cols;
    const groups = which.map(c => { c.stage.innerHTML = ''; const all = S('g', {}, c.stage); const sl = slots(c); return { c, all, sl, items: [] }; });
    if (mode === 'k') {
      for (let i = 0; i < 10; i++) {
        for (const G of groups) { const p = G.sl[i], g = S('g', { transform: `translate(${p.x},${p.y}) scale(${p.sc},${p.sy || p.sc})` }, G.all); icon(g, G.c.q, step, G.c.s, 'k'); g.querySelectorAll('text').forEach(t => t.remove()); if (p.alt) { const r = g.querySelector('rect'); r && r.setAttribute('fill', '#e3c47f'); } G.items.push(g); G.c.cnt.textContent = `×${i + 1}`; }
        SFX.tick(); await wait(110 * f);
      }
      await wait(400 * f);
      await tween(650 * f, e => { for (const G of groups) G.items.forEach((g, i) => { const p = G.sl[i]; g.setAttribute('transform', `translate(${lerp(p.x, G.c.cx, e)},${lerp(p.y, G.c.cy, e)}) scale(${p.sc * (1 - e * .7)},${(p.sy || p.sc) * (1 - e * .7)})`); g.setAttribute('opacity', 1 - e); }); });
      step++; for (const G of groups) { G.c.stage.innerHTML = ''; const g = S('g', {}, G.c.stage); icon(g, G.c.q, step, G.c.s, 'k'); await null; G.g2 = g; }
      await tween(380 * f, e => { for (const G of groups) G.g2.setAttribute('transform', `translate(${G.c.cx},${G.c.cy}) scale(${.4 + .6 * E.back(e)})`); }, E.lin);
    } else {
      for (const G of groups) { const g = S('g', { transform: `translate(${G.c.cx},${G.c.cy})` }, G.all); icon(g, G.c.q, step, G.c.s, 'm'); G.big = g; }
      await wait(250 * f);
      await tween(450 * f, e => { for (const G of groups) G.big.setAttribute('opacity', 1 - e); });
      for (let i = 0; i < 10; i++) { for (const G of groups) { const p = G.sl[i], g = S('g', { transform: `translate(${p.x},${p.y}) scale(${p.sc},${p.sy || p.sc})` }, G.all); icon(g, G.c.q, step, G.c.s, 'm'); g.querySelectorAll('text').forEach(t => t.remove()); G.items.push(g); G.c.cnt.textContent = `${i + 1}/10`; } SFX.tick(); await wait(70 * f); }
      await wait(350 * f);
      await tween(650 * f, e => { for (const G of groups) G.items.forEach((g, i) => { const p = G.sl[i]; if (i === 0) g.setAttribute('transform', `translate(${lerp(p.x, G.c.cx, e)},${lerp(p.y, G.c.cy, e)}) scale(${lerp(p.sc, 1, e)},${lerp(p.sy || p.sc, 1, e)})`); else g.setAttribute('opacity', 1 - e); }); });
      step++;
    }
    for (const G of groups) { G.c.stage.innerHTML = ''; const g = S('g', { transform: `translate(${G.c.cx},${G.c.cy})` }, G.c.stage); icon(g, G.c.q, step, G.c.s, mode); G.c.cnt.textContent = ''; G.c.eq.textContent = step === 3 ? (mode === 'k' ? G.c.q.kEq : G.c.q.mEq) : ''; }
  }
  async function playAll(md) {
    mode = md; step = 0; paint();
    HUD.say(md === 'k' ? '10こ あつめると つぎの たんいへ' : '10に わけて 1つを ちかくで みる'); await wait(1600);
    for (let i = 0; i < 3; i++) { await doStep(); await wait(500); }
    HUD.say(md === 'k' ? '<b>k（キロ）</b>が つくと <b>1000ばい</b>' : '<b>m（ミリ）</b>が つくと <b>1000ぶんの1</b>', { speech: md === 'k' ? 'キロがつくと1000倍' : 'ミリがつくと1000分の1' });
    await wait(3600);
  }
  async function miru() { busy = true; await playAll('k'); await playAll('m'); busy = false; }
  function sawaruPanel(p) {
    mode = 'k'; step = 0; paint(); busy = false;
    const stepBtn = H('button', { class: 'btn', text: '×10', onclick: () => { if (busy) return; if (step >= 3) { HUD.say(mode === 'k' ? '<b>1000ばい</b>に なった' : '<b>1000ぶんの1</b>に なった'); return; } busy = true; run(async () => { await doStep(); busy = false; if (step === 3) HUD.say(mode === 'k' ? '<b>k（キロ）</b>が つくと <b>1000ばい</b>' : '<b>m（ミリ）</b>が つくと <b>1000ぶんの1</b>'); }); } });
    p.appendChild(H('div', { class: 'row' }, [
      seg([{ id: 'k', label: 'k（キロ）' }, { id: 'm', label: 'm（ミリ）' }], mode, id => { cancelRuns(); busy = false; mode = id; step = 0; stepBtn.textContent = id === 'k' ? '×10' : '10に わける'; paint(); HUD.say(id === 'k' ? 'ボタンで 10こずつ あつめよう' : 'ボタンで 10に わけよう'); }),
      stepBtn,
      H('button', { class: 'btn sub small', html: ICON.replay + 'はじめから', onclick: () => { cancelRuns(); busy = false; step = 0; paint(); } })
    ]));
    HUD.say('ボタンで 10こずつ あつめよう');
  }
  const QS = {
    easy: [['1kgは なんg？', ['1000g', '100g', '10g'], 2, 'k'], ['1kmは なんm？', ['1000m', '100m', '10m'], 0, 'k'], ['1Lは なんmL？', ['1000mL', '100mL', '10mL'], 1, 'm'], ['1mは なんmm？', ['1000mm', '100mm', '10mm'], 0, 'm']],
    normal: [['2kgは なんg？', ['2000g', '200g', '20g'], 2, 'k'], ['3kmは なんm？', ['3000m', '300m', '30m'], 0, 'k'], ['1Lは なんdL？', ['10dL', '100dL', '1000dL'], 1, null], ['5000gは なんkg？', ['5kg', '50kg', '500kg'], 2, 'k']],
    challenge: [['2kg300gは なんg？', ['2300g', '2003g', '230g'], 2, 'k'], ['1km200mは なんm？', ['1200m', '1020m', '120m'], 0, 'k'], ['1L5dLは なんdL？', ['15dL', '105dL', '6dL'], 1, null], ['4000mLは なんL？', ['4L', '40L', '400L'], 1, 'm']]
  };
  function gen(level, i) {
    mode = 'k'; step = 0; paint();
    const [q, ch, col, md] = QS[level][i % 4];
    return {
      say: q, choices: shuffle(ch.map((l, j) => ({ label: l, ok: j === 0 }))), at: { x: cols[col].cx, y: cols[col].cy, r: cols[col].s * .5 },
      hint(s) { if (s === 1) HUD.say(md === 'm' ? '<b>m</b>は 1000ぶんの1' : md === 'k' ? '<b>k</b>は 1000ばい' : '1Lは 10dL'); if (s === 2) HUD.say('いくつぶんかを かんがえよう'); if (s === 3) { const e = md === 'm' ? Q[col].mEq : md === 'k' ? Q[col].kEq : '1L = 10dL'; cols[col].eq.textContent = e; HUD.say(`<b>${e}</b>`); } },
      async verify() { if (md) { mode = md; step = 0; paint(); for (let k = 0; k < 3; k++) await doStep(col, true); } HUD.say(`<b>${q.replace('は なん', ' = ').replace(/[gmLkdＬ]*？$/, '')}${ch[0]}</b>`, { speak: false }); await wait(600); }
    };
  }
  let quiz = null;
  return {
    title: 'たんいの しくみ', grade: '3ねん',
    mount(c) { svg = c.svg; layout(c.W, c.H); },
    layout(w, h) { layout(w, h); },
    unmount() { busy = false; },
    setTab(id, p) {
      busy = false;
      if (id === 'miru') { p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); busy = false; run(miru); }, html: ICON.replay + 'もういちど みる' })])); run(miru); }
      if (id === 'sawaru') sawaruPanel(p);
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'units', n: 4, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
