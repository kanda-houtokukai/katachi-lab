/* ---------- ながさ：じっすんの ものさし（N2） ----------
   画面の1mmを、1円玉（直径20mm）かカード（85.60mm）で合わせる。⚠️要検証の値は data/benchmarks.json へ移す。 */
const CAL = {
  pm: store.get('pm', null),
  get v() { return this.pm || 96 / 25.4; },
  get ok() { return !!this.pm; }
};
function openCalib(after) {
  let pm = CAL.v, ref = 'coin';
  openSheet((card, close) => {
    card.appendChild(H('div', { class: 'sheet-head' }, [H('h2', { text: 'がめんの ながさ あわせ' }), close]));
    card.appendChild(H('p', { text: '1えんだまを まるの うえに おいて、ふちが ぴったり かさなるように うごかしてね。おうちのひとと いっしょに。' }));
    const box = H('div', { class: 'calib-box' }); const sv = S('svg', { width: '100%', height: 170 }); box.appendChild(sv); card.appendChild(box);
    const draw = () => {
      sv.innerHTML = ''; const w = box.clientWidth || 300;
      sv.setAttribute('viewBox', `0 0 ${w} 170`);
      if (ref === 'coin') {
        const r = 10 * pm; S('circle', { cx: w / 2, cy: 85, r, fill: '#e9edf0', stroke: css('--ink'), 'stroke-width': 2 }, sv);
        S('line', { x1: w / 2 - r, y1: 85, x2: w / 2 + r, y2: 85, stroke: css('--ok'), 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, sv);
        const t = S('text', { x: w / 2, y: 85 + r + 18, 'text-anchor': 'middle', 'font-size': 13, fill: css('--ink-soft'), class: 'ui' }, sv); t.textContent = 'ちょっけい 20mm';
      } else {
        const cw = 85.6 * pm, ch = 53.98 * pm, x = Math.max(4, (w - cw) / 2);
        S('rect', { x, y: 85 - ch / 2, width: cw, height: ch, rx: 3.2 * pm, fill: '#e9edf0', stroke: css('--ink'), 'stroke-width': 2 }, sv);
      }
    };
    const rng = H('input', { type: 'range', id: 'calRange', min: '2', max: '9', step: '0.01', value: String(pm), 'aria-label': 'おおきさ' });
    rng.addEventListener('input', () => { pm = +rng.value; draw(); });
    const nudge = d => { pm = clamp(pm + d, 2, 9); rng.value = pm; draw(); };
    card.appendChild(H('div', { class: 'calib-row' }, [H('button', { class: 'btn sub small', text: '−', 'aria-label': 'ちいさく', onclick: () => nudge(-.01) }), rng, H('button', { class: 'btn sub small', text: '+', 'aria-label': 'おおきく', onclick: () => nudge(.01) })]));
    card.appendChild(H('div', { class: 'row' }, [seg([{ id: 'coin', label: '1えんだま' }, { id: 'card', label: 'カード' }], ref, id => { ref = id; card.querySelector('p').textContent = id === 'coin' ? '1えんだまを まるの うえに おいて、ふちが ぴったり かさなるように うごかしてね。おうちのひとと いっしょに。' : 'ポイントカードなど、ふつうの おおきさの カードを かさねて、かどが ぴったり あうように うごかしてね。'; draw(); })]));
    card.appendChild(H('div', { class: 'row' }, [
      H('button', { class: 'btn sub', text: 'あわせない', onclick: () => { CAL.pm = null; store.set('pm', null); closeSheet(); after && after(); } }),
      H('button', { class: 'btn', text: 'これで OK', onclick: () => { CAL.pm = pm; store.set('pm', pm); closeSheet(); SFX.good(); after && after(); } })
    ]));
    requestAnimationFrame(draw);
  });
}

SCENES.ruler = (() => {
  let svg, Wd, Ht, el = {}, mode = 'ruler', item = 'pencil', rx = 0, ox = 0, drag = null, lens = false, cm = 15, fixed = false, objLen = 96, tapes = null, blocks = null, rulerAlpha = 1;
  const OBJ = { pencil: { name: 'えんぴつ', len: 96, h: 7 }, eraser: { name: 'けしごむ', len: 43, h: 12 }, clip: { name: 'クリップ', len: 32, h: 8 }, coin: { name: '1えんだま', len: 20, h: 20 }, tape: { name: 'テープ', len: 50, h: 6 } };
  const pmm = () => CAL.v;
  const fmt = mm => { const c = Math.floor(mm / 10), m = Math.round(mm % 10); return c && m ? `${c}cm ${m}mm` : c ? `${c}cm` : `${m}mm`; };
  const fsp = mm => { const c = Math.floor(mm / 10), m = Math.round(mm % 10); return (c ? c + 'センチ' : '') + (m ? m + 'ミリ' : ''); };
  function zeroX() { return rx + 4 * pmm(); }
  function layout(w, h) {
    Wd = w; Ht = h; svg.innerHTML = ''; el = {};
    const pm = pmm();
    cm = clamp(Math.floor((Wd - 32) / pm / 10) - 1, 4, 20);
    el.rw = (cm * 10 + 8) * pm; el.rh = Math.max(44, 14 * pm);
    el.ry = Math.round(Ht * .52);
    if (mode === 'ruler') { if (!drag && !fixed) { rx = (Wd - el.rw) / 2; } }
    S('rect', { x: 0, y: 0, width: Wd, height: Ht, fill: '#f8f6ef', opacity: .6 }, svg);
    el.badge = S('g', { style: 'cursor:pointer' }, svg);
    const bt = S('text', { x: Wd - 16, y: Ht - 14, 'text-anchor': 'end', 'font-size': 13, fill: CAL.ok ? css('--mat-deep') : css('--ink-soft'), class: 'ui' }, el.badge); bt.textContent = CAL.ok ? 'じっすん（あわせ ずみ）' : 'じっすんでは ない（ながさ あわせ）';
    el.badge.addEventListener('pointerdown', e => { e.stopPropagation(); openCalib(() => layout(Wd, Ht)); });
    if (mode === 'body') { layoutBody(); return; }
    const defs = S('defs', {}, svg);
    el.world = S('g', { id: 'rulerWorld' }, defs);
    el.rulerG = S('g', {}, el.world);
    el.objG = S('g', {}, el.world);
    el.extra = S('g', {}, el.world);
    S('use', { href: '#rulerWorld' }, svg);
    el.lensG = S('g', {}, svg);
    drawRuler(); drawObj(); drawLens();
  }
  function drawRuler() {
    const g = el.rulerG, pm = pmm(); g.innerHTML = ''; g.setAttribute('opacity', rulerAlpha);
    g.setAttribute('transform', `translate(${rx},${el.ry})`);
    S('rect', { x: 0, y: 0, width: el.rw, height: el.rh, rx: 4, fill: '#f4e2b2', stroke: '#c9a06b', 'stroke-width': 2 }, g);
    S('rect', { x: 0, y: el.rh * .72, width: el.rw, height: el.rh * .28, rx: 3, fill: '#ecd59a' }, g);
    for (let i = 0; i <= cm * 10; i++) {
      const x = (4 + i) * pm, L = i % 10 === 0 ? el.rh * .5 : i % 5 === 0 ? el.rh * .36 : el.rh * .22;
      S('line', { x1: x, y1: 0, x2: x, y2: L, stroke: '#5a4220', 'stroke-width': i % 10 === 0 ? 1.6 : 1 }, g);
      if (i % 10 === 0) { const t = S('text', { x, y: el.rh * .5 + Math.max(13, pm * 3.4), 'text-anchor': 'middle', 'font-size': Math.max(12, pm * 3.2), fill: '#5a4220', class: 'ui' }, g); t.textContent = i / 10; }
    }
    const u = S('text', { x: el.rw - 6, y: el.rh - 6, 'text-anchor': 'end', 'font-size': 11, fill: '#8a6d3b', class: 'ui' }, g); u.textContent = 'cm';
  }
  function drawItem(g, id, x, yb, len) {
    const pm = pmm(), L = len * pm, o = OBJ[id], h = o.h * pm;
    if (id === 'pencil') {
      const tip = 14 * pm;
      S('rect', { x, y: yb - h, width: L - tip, height: h, fill: '#f2b833', stroke: '#c48a10', 'stroke-width': 1 }, g);
      S('rect', { x, y: yb - h * .62, width: L - tip, height: h * .24, fill: '#f7cf5e' }, g);
      S('path', { d: `M${x + L - tip},${yb - h}L${x + L - tip * .25},${yb - h * .62}V${yb - h * .38}L${x + L - tip},${yb}Z`, fill: '#ead2a8', stroke: '#c9a06b', 'stroke-width': 1 }, g);
      S('path', { d: `M${x + L - tip * .25},${yb - h * .62}L${x + L},${yb - h / 2}L${x + L - tip * .25},${yb - h * .38}Z`, fill: '#3b3b3b' }, g);
    } else if (id === 'eraser') {
      S('rect', { x, y: yb - h, width: L, height: h, rx: 2, fill: '#fff', stroke: '#c8cdc9', 'stroke-width': 1.5 }, g);
      S('rect', { x: x + L * .3, y: yb - h - 1, width: L * .55, height: h + 2, fill: '#4f9bd9' }, g);
    } else if (id === 'clip') {
      const r = h / 2; S('path', { d: `M${x + L - r},${yb - h}H${x + r}a${r},${r} 0 0,0 0,${h}H${x + L - r * 1.4}a${r * .7},${r * .7} 0 0,0 0,${-h * .7}H${x + r * 1.8}`, fill: 'none', stroke: '#8e979b', 'stroke-width': Math.max(1.5, pm * .7), 'stroke-linecap': 'round' }, g);
    } else if (id === 'coin') {
      S('circle', { cx: x + L / 2, cy: yb - L / 2, r: L / 2, fill: '#e3e7ea', stroke: '#9aa3a8', 'stroke-width': 1.5 }, g);
    } else {
      S('rect', { x, y: yb - h, width: L, height: h, rx: 2, fill: o.color || css('--face-1') }, g);
    }
  }
  function drawObj() {
    const g = el.objG; g.innerHTML = '';
    if (tapes) { tapes.forEach(t => { OBJ.tape.color = t.color; drawItem(g, 'tape', t.x, t.y, t.len); }); return; }
    if (!item) return;
    if (item === 'tape') OBJ.tape.color = css('--face-1');
    drawItem(g, item, ox, el.ry - 3, objLen);
  }
  function drawLens() {
    el.lensG.innerHTML = ''; if (!lens || !item) return;
    const pm = pmm(), tx = ox + objLen * pm, ty = el.ry + 6, lr = Math.max(84, 20 * pm);
    const lx = clamp(tx, lr + 6, Wd - lr - 6), ly = Math.max(lr + 72, el.ry - lr - 30 - 10 * pm);
    const d = S('defs', {}, el.lensG), cp = S('clipPath', { id: 'rlens' }, d); S('circle', { cx: lx, cy: ly, r: lr }, cp);
    S('line', { x1: tx, y1: ty, x2: lx, y2: ly + lr, stroke: css('--ink-soft'), 'stroke-width': 2, 'stroke-dasharray': '4 4' }, el.lensG);
    const g = S('g', { 'clip-path': 'url(#rlens)' }, el.lensG);
    S('circle', { cx: lx, cy: ly, r: lr, fill: '#f8f6ef' }, g);
    S('use', { href: '#rulerWorld', transform: `translate(${lx},${ly}) scale(2.6) translate(${-tx},${-ty})` }, g);
    S('circle', { cx: lx, cy: ly, r: lr, fill: 'none', stroke: css('--ink'), 'stroke-width': 5 }, el.lensG);
  }
  function placeObj() { const pm = pmm(), L = objLen * pm; ox = clamp(rx + 40 * pm, 8, Wd - L - 8); }
  function measured() { return Math.abs(ox - zeroX()) < .6 ? objLen : null; }
  function bind() {
    svg.onpointerdown = e => {
      if (mode !== 'ruler' || fixed || App.tab !== 'sawaru') return;
      const p = ptr(e), pm = pmm();
      const onObj = item && p.x >= ox - 10 && p.x <= ox + objLen * pm + 10 && p.y >= el.ry - (OBJ[item].h + 6) * pm - 16 && p.y <= el.ry + 2;
      const onRuler = p.x >= rx && p.x <= rx + el.rw && p.y >= el.ry && p.y <= el.ry + el.rh + 10;
      if (!onObj && !onRuler) return;
      svg.setPointerCapture(e.pointerId); drag = { what: onObj ? 'obj' : 'ruler', x0: p.x, a: onObj ? ox : rx, id: e.pointerId }; HUD.hide();
    };
    svg.onpointermove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = ptr(e), nx = drag.a + (p.x - drag.x0);
      if (drag.what === 'obj') ox = clamp(nx, 4, Wd - objLen * pmm() - 4); else rx = clamp(nx, -el.rw + 60, Wd - 60);
      drawRuler(); drawObj(); drawLens();
    };
    const end = () => {
      if (!drag) return; drag = null;
      const pm = pmm();
      if (Math.abs(ox - zeroX()) < 2 * pm) { ox = zeroX(); SFX.pop(); drawObj(); drawLens(); }
      const m = measured();
      if (m != null) HUD.say(`${OBJ[item].name}は <b>${fmt(m)}</b>`, { speech: OBJ[item].name + 'は' + fsp(m) });
      else if (ox + objLen * pm > rx && ox < rx + el.rw) HUD.say('はしを <b>0</b>に あわせよう');
    };
    svg.onpointerup = end; svg.onpointercancel = end;
  }
  /* からだものさし：指2本の あいだ */
  let touches = new Map(), hands = null;
  function layoutBody() {
    const pm = pmm();
    if (!hands) hands = [{ x: Wd / 2 - 65 * pm, y: Ht * .5 }, { x: Wd / 2 + 65 * pm, y: Ht * .5 }];
    hands.forEach(h => { h.x = clamp(h.x, 30, Wd - 30); h.y = clamp(h.y, 70, Ht - 40); });
    el.bodyG = S('g', {}, svg); drawBody();
    svg.onpointerdown = e => {
      if (mode !== 'body') return; const p = ptr(e);
      if (touches.size >= 2) return;
      let idx = hands.findIndex((h, i) => ![...touches.values()].includes(i) && Math.hypot(h.x - p.x, h.y - p.y) < 60);
      if (idx < 0) idx = [0, 1].find(i => ![...touches.values()].includes(i));
      if (idx == null) return;
      touches.set(e.pointerId, idx); hands[idx] = p; svg.setPointerCapture(e.pointerId); drawBody();
    };
    svg.onpointermove = e => { if (!touches.has(e.pointerId)) return; hands[touches.get(e.pointerId)] = ptr(e); drawBody(); };
    const end = e => { if (!touches.has(e.pointerId)) return; touches.delete(e.pointerId); if (!touches.size) { const mm = Math.round(dist() / pmm()); HUD.say(CAL.ok ? `<b>${fmt(mm)}</b>` : `<b>${fmt(mm)}</b>（じっすんでは ない）`, { speech: fsp(mm) }); } };
    svg.onpointerup = end; svg.onpointercancel = end;
  }
  const dist = () => Math.hypot(hands[0].x - hands[1].x, hands[0].y - hands[1].y);
  function drawBody() {
    const g = el.bodyG; g.innerHTML = ''; const [a, b] = hands, pm = pmm(), mm = dist() / pm;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    S('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: css('--ok'), 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    for (let i = 10; i < mm; i += 10) { const x = a.x + Math.cos(ang) * i * pm, y = a.y + Math.sin(ang) * i * pm; S('line', { x1: x - Math.sin(ang) * 8, y1: y + Math.cos(ang) * 8, x2: x + Math.sin(ang) * 8, y2: y - Math.cos(ang) * 8, stroke: css('--ok'), 'stroke-width': 2 }, g); }
    [['おやゆび', a], ['こゆび', b]].forEach(([t, p]) => { S('circle', { cx: p.x, cy: p.y, r: 26, fill: css('--paper'), stroke: css('--mat-deep'), 'stroke-width': 3 }, g); const tt = S('text', { x: p.x, y: p.y - 34, 'text-anchor': 'middle', 'font-size': 14, fill: css('--ink-soft'), class: 'ui' }, g); tt.textContent = t; });
    const tx = S('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 40, 'text-anchor': 'middle', 'font-size': 34, fill: css('--ink') }, g); tx.textContent = fmt(Math.round(mm));
  }

  /* みる */
  async function miru() {
    mode = 'ruler'; item = 'pencil'; objLen = 96; fixed = true; lens = false; tapes = null; rulerAlpha = 0; layout(Wd, Ht);
    const pm = pmm(); rx = (Wd - el.rw) / 2; ox = zeroX(); drawRuler(); drawObj();
    const ex = el.extra; ex.innerHTML = '';
    HUD.say('えんぴつの ながさを つたえるには？'); await wait(1800);
    const row = (id, n, y) => { const g = S('g', {}, ex); for (let i = 0; i < n; i++) drawItem(g, id, ox + i * OBJ[id].len * pm, y, OBJ[id].len); return g; };
    const r1 = row('clip', 3, el.ry + 18 * pm); r1.setAttribute('opacity', 0); await tween(500, e => r1.setAttribute('opacity', e));
    HUD.say('クリップなら <b>3こぶん</b>'); await wait(1800);
    const r2 = row('eraser', 2, el.ry + 36 * pm); r2.setAttribute('opacity', 0); await tween(500, e => r2.setAttribute('opacity', e));
    HUD.say('けしごむなら <b>2こと すこし</b>。はかる ものが ちがうと つたわらない'); await wait(3200);
    await tween(400, e => { r1.setAttribute('opacity', 1 - e); r2.setAttribute('opacity', 1 - e); }); ex.innerHTML = '';
    HUD.say('だれが はかっても おなじ <b>1cm</b>を つかおう');
    const bg = S('g', {}, ex);
    for (let i = 0; i < 9; i++) {
      const b = S('rect', { x: ox + i * 10 * pm, y: el.ry + 2, width: 10 * pm - 1.5, height: 10 * pm, fill: i % 2 ? css('--face-4') : css('--sora-soft'), opacity: 0 }, bg);
      await tween(160, e => { b.setAttribute('opacity', e); b.setAttribute('y', el.ry + 2 + (1 - e) * 30); }, E.out); SFX.tick();
    }
    HUD.say('1cmが <b>9こと すこし</b>'); await wait(2000);
    HUD.say('1cmを ならべると <b>ものさし</b>'); await tween(900, e => { rulerAlpha = e; drawRuler(); bg.setAttribute('opacity', 1 - e); }); bg.remove(); await wait(800);
    lens = true; drawLens(); HUD.say('1cmを 10に わけた 1つが <b>1mm</b>'); await wait(3000);
    HUD.say(`えんぴつは <b>${fmt(96)}</b>`, { speech: 'えんぴつは' + fsp(96) }); await wait(1500);
    fixed = false; rulerAlpha = 1;
  }
  /* さわる */
  function sawaruPanel(p) {
    fixed = false; tapes = null; lens = false; rulerAlpha = 1;
    if (OBJ[item].len * pmm() > Wd - 40) item = 'eraser'; objLen = OBJ[item].len;
    layout(Wd, Ht); placeObj(); drawObj();
    const sub = H('div', { class: 'row' });
    const build = () => {
      sub.innerHTML = '';
      if (mode === 'ruler') {
        sub.appendChild(seg(['pencil', 'eraser', 'clip', 'coin'].map(id => ({ id, label: OBJ[id].name })), item, id => { item = id; objLen = OBJ[id].len; placeObj(); drawObj(); drawLens(); HUD.say('はしを <b>0</b>に あわせて はかろう'); }));
        sub.appendChild(toggleBtn('むしめがね', lens, v => { lens = v; drawLens(); }));
        HUD.say('ものさしか えんぴつを ゆびで うごかして、はしを <b>0</b>に あわせよう');
      } else HUD.say(CAL.ok ? 'てを ひろげて、おやゆびと こゆびを がめんに おいてね' : 'さきに <b>がめんの ながさ あわせ</b>を すると、ほんとうの ながさが わかる');
    };
    p.appendChild(H('div', { class: 'row' }, [
      seg([{ id: 'ruler', label: 'ものさし' }, { id: 'body', label: 'からだものさし' }], mode, m => { mode = m; hands = null; svg.onpointerdown = null; layout(Wd, Ht); if (m === 'ruler') { bind(); placeObj(); drawObj(); } build(); }),
      H('button', { class: 'btn sub small', text: 'ながさ あわせ', onclick: () => openCalib(() => { layout(Wd, Ht); if (mode === 'ruler') { placeObj(); drawObj(); } }) })
    ]));
    p.appendChild(sub); build();
  }
  /* ためす */
  function readQ(level) {
    mode = 'ruler'; fixed = true; lens = false; tapes = null; rulerAlpha = 1; layout(Wd, Ht);
    const pm = pmm(), maxMm = (cm - 1) * 10;
    let off = 0, L;
    if (level === 'easy') L = rnd(3, Math.min(12, cm - 2)) * 10;
    else if (level === 'normal') { if (Math.random() < .5) { L = rnd(2, Math.min(10, cm - 3)) * 10 + rnd(1, 9); } else { off = rnd(1, 3) * 10; L = rnd(3, Math.min(9, cm - 5)) * 10; } }
    else { off = rnd(1, 3) * 10 + (Math.random() < .3 ? 5 : 0); L = rnd(2, Math.min(8, cm - 6)) * 10 + rnd(1, 9); }
    L = Math.min(L, maxMm - off);
    item = 'tape'; objLen = L; rx = (Wd - el.rw) / 2; drawRuler(); ox = zeroX() + off * pm; drawObj();
    const right = off + L;
    let alt = [L, off ? right : L + 10, Math.floor(L / 10) * 10 === L ? L + 1 : Math.floor(L / 10) * 10 + (L % 10 === 9 ? 0 : 10)];
    alt = alt.filter((v, i, a) => a.indexOf(v) === i); while (alt.length < 3) alt.push(L + 10 * alt.length);
    return {
      say: 'あかい テープの ながさは？', choices: shuffle(alt.slice(0, 3).map((v, i) => ({ label: fmt(v), ok: v === L }))), at: { x: ox + L * pm / 2, y: el.ry - 10, r: Math.max(60, L * pm * .35) },
      hint(s) { if (s === 1) HUD.say(off ? 'テープの はしは <b>0</b>に ある？' : '1cmが いくつ ある？'); if (s === 2) { lens = true; drawLens(); HUD.say('はしの めもりを ちかくで みよう'); } if (s === 3) HUD.say(off ? `はしは <b>${fmt(off)}</b>の ところ。そこから かぞえよう` : 'mmの めもりも かぞえよう'); },
      async verify() {
        if (off) { const a = ox, b = zeroX(); HUD.say('テープを <b>0</b>に あわせて みよう', { speak: false }); await tween(900, e => { ox = lerp(a, b, e); drawObj(); drawLens(); }); }
        lens = true; drawLens(); TTS.speak(fsp(L)); HUD.say(`<b>${fmt(L)}</b>`, { speak: false }); await wait(800);
      }
    };
  }
  function compareQ() {
    mode = 'ruler'; fixed = true; lens = false; rulerAlpha = 1; item = null; layout(Wd, Ht);
    const pm = pmm(), a = pick([[20, 9], [30, 18], [15, 8], [40, 25]]), redFirst = Math.random() < .5;
    const red = redFirst ? a[0] : a[1], blue = redFirst ? a[1] : a[0];
    tapes = [{ len: red, color: css('--face-1'), x: Wd * .2, y: el.ry - 60 }, { len: blue, color: css('--face-4'), x: Wd * .58, y: el.ry - 60 }];
    rulerAlpha = .25; drawRuler(); drawObj();
    const ex = el.extra; ex.innerHTML = '';
    [[tapes[0], red], [tapes[1], blue]].forEach(([t, v]) => { const tt = S('text', { x: t.x + t.len * pm / 2, y: t.y - 14, 'text-anchor': 'middle', 'font-size': 22, fill: t.color }, ex); tt.textContent = fmt(v); });
    return {
      say: 'ながいのは どっち？', choices: [{ label: 'あか', html: '<span class="sw" style="background:var(--face-1)"></span>' + fmt(red), ok: red > blue }, { label: 'あお', html: '<span class="sw" style="background:var(--face-4)"></span>' + fmt(blue), ok: blue > red }],
      at: { x: Wd / 2, y: el.ry - 40, r: 70 },
      hint(s) { if (s === 1) HUD.say('かずだけで くらべて いいかな？'); if (s === 2) HUD.say('1cm は 10mm'); if (s === 3) HUD.say('ものさしに ならべて みよう'); },
      async verify() {
        ex.innerHTML = ''; const z = zeroX(), t0 = tapes.map(t => ({ x: t.x, y: t.y }));
        await tween(900, e => { rulerAlpha = .25 + .75 * e; drawRuler(); tapes[0].x = lerp(t0[0].x, z, e); tapes[0].y = lerp(t0[0].y, el.ry - 3, e); tapes[1].x = lerp(t0[1].x, z, e); tapes[1].y = lerp(t0[1].y, el.ry - 3 - 14 * pm, e); drawObj(); });
        HUD.say(`<b>${fmt(Math.max(red, blue))}</b> の ほうが ながい`); await wait(700);
      }
    };
  }
  function gen(level, i) { return i === 2 ? compareQ() : readQ(level); }
  let quiz = null;
  return {
    title: 'ながさの たんい', grade: '2ねん',
    mount(c) { svg = c.svg; Wd = c.W; Ht = c.H; layout(Wd, Ht); bind(); },
    layout(w, h) { layout(w, h); if (mode === 'ruler') { ox = clamp(ox, 4, Wd - 40); drawObj(); } },
    unmount() { svg.onpointerdown = svg.onpointermove = svg.onpointerup = svg.onpointercancel = null; touches.clear(); },
    setTab(id, p) {
      tapes = null; fixed = false; touches.clear(); if (mode === 'body' && id !== 'sawaru') { mode = 'ruler'; }
      bind();
      if (id === 'miru') { p.appendChild(H('div', { class: 'row' }, [H('button', { class: 'btn', onclick: () => { cancelRuns(); run(miru); }, html: ICON.replay + 'もういちど みる' })])); run(miru); }
      if (id === 'sawaru') { if (!item || item === 'tape') item = 'pencil'; sawaruPanel(p); }
      if (id === 'tamesu') { quiz = makeQuiz({ key: 'ruler', n: 5, gen, panel: () => $('#panel') }); quiz.start(); }
    }
  };
})();
