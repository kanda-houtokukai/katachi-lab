// monosashi・m と まきじゃく（N2m・N3）：長い物は ちぢめた絵（実寸ではない）で はかる。
// mode：miru-m（みる：30cmものさしと 1mものさし）｜m1（さわる：1mものさしで はかる）｜fold（さわる：120cmの テープ）
//       ｜make1m（つくる：1m を つくる）｜maki（さわる：まきじゃく。ひきだす・きの まわり・0の いち）
// 記録：miru・measure・fold・make・maki。ずかん nagai（はかった 長い物）・onem（1m の組）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, tapOf, pathOf, hanamaru, polar } from './_flat.js';
import { thing, thOf, overhang, badge, NAMES, thingIcon } from './_nagasa.js';
import { mcm, onemCombos, onemKey, ONEM_IDS, ONEM_MAX, rnd, pickR } from './_nagasa-gen.js';
import { bench } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const sp = s => unitSpeech(String(s).replace(/<[^>]+>/g, '')).replace(/ /g, '');
const bname = id => ((bench(id) || {}).name || NAMES[id] || id).replace(/（.*）/, '');
const cmOf = id => Math.round(((bench(id) || {}).len_mm || 1000) / 10);
// 長い物（m1）：向き h（よこ）・v（たて）
const LONG = { desk: { o: 'h', label: 'つくえの よこ' }, blackboard: { o: 'h', label: 'こくばんの よこ' }, door: { o: 'v', label: 'とびらの たかさ' }, classroom: { o: 'h', label: 'きょうしつの よこ' } };
const LONG_IDS = Object.keys(LONG);
const TOOL = { ruler30: { cm: 30, label: '30cmものさし' }, ruler1m: { cm: 100, label: '1mものさし' } };

// 長い物の絵（ローカルの よこ向き：左はし 0、下の線 0、長さ L px、高さ h px）
function drawLong(g, id, L, h) {
  if (id === 'blackboard') { rect(g, -6, -h - 6, L + 12, h + 12, { rx: 4, fill: C('wood'), stroke: C('wood-deep'), 'stroke-width': 2 }); rect(g, 0, -h, L, h, { fill: C('mat-deep') }); line(g, L * 0.1, -h * 0.6, L * 0.3, -h * 0.55, { stroke: C('paper'), 'stroke-width': 2, opacity: 0.6 }); rect(g, L * 0.05, -4, L * 0.9, 4, { fill: C('wood-pale') }); }
  else if (id === 'door') { rect(g, 0, -h, L, h, { fill: C('wood-pale'), stroke: C('wood-deep'), 'stroke-width': 2 }); rect(g, L * 0.08, -h * 0.85, L * 0.3, h * 0.7, { rx: 3, fill: C('glass'), stroke: C('glass-line'), 'stroke-width': 1.5 }); circle(g, L * 0.55, -h * 0.15, Math.max(3, h * 0.05), { fill: C('metal-deep') }); }
  else if (id === 'classroom') { rect(g, 0, -h, L, h, { fill: C('paper-2'), stroke: C('ink-soft'), 'stroke-width': 2 }); for (let i = 1; i < 6; i++) for (let j = 1; j < 3; j++) rect(g, L * i / 6 - 8, -h * j / 3 - 6, 16, 10, { rx: 2, fill: C('wood') }); }
  else thing(g, id, 0, 0, L, { h });
}
function tool(g, id, x, y, L, h, o = {}) { return thing(g, id, x, y, L, Object.assign({ h }, o)); }

export function mountM(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode;
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  const area = () => { const m = Math.max(18, F.W * 0.05), top = F.top + F.cap + 16, bot = F.bottom - 22; return { m, top, bot, W: F.W - m * 2, H: bot - top }; };

  /* ---------------- みる：30cmものさしで こくばん → 1mものさし → 1m＝100cm ---------------- */
  if (mode === 'miru-m') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play';
    const st = { scene: 'board', n: 0, tool: 'ruler30', seg: 0, fold: 0 };
    const board = cmOf('blackboard');
    function draw() {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      if (st.scene === 'board') {
        const s = a.W / board, L = board * s, x = a.m, y = a.top + a.H * 0.62, h = Math.min(a.H * 0.42, L * 0.3);
        const bg = el('g', { transform: `translate(${x},${y})` }, g); drawLong(bg, 'blackboard', L, h);
        const tl = TOOL[st.tool].cm * s, th = Math.max(8, Math.min(20, tl * 0.08));
        for (let i = 0; i < st.n; i++) { tool(g, st.tool, x + Math.min(i * tl, L - 1), y + 14 + th, Math.min(tl, L - i * tl), th, { sw: 1 }); badge(fx, x + Math.min(i * tl + tl / 2, L - 6), y + th + 36, String(i + 1), { r: Math.min(13, Math.max(8, tl * 0.3)) }); }
      } else {
        const T = st.scene === 'tape' ? 100 : 120, s = a.W / 130, x = a.m + a.W * 0.04, y = a.top + a.H * 0.55, th = Math.max(16, Math.min(34, a.H * 0.1));
        if (st.fold > 0) tool(g, 'ruler1m', x, y - th - 18, 100 * s, Math.max(10, th * 0.5));
        const cols = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5', 'face-6', 'face-1', 'face-2', 'face-3', 'face-4', 'face-5', 'face-6'];
        for (let i = 0; i < Math.min(st.seg, T / 10); i++) { rect(g, x + i * 10 * s, y - th, 10 * s - 1.5, th, { fill: C(cols[i]), opacity: 0.9 }); if (i === 9) line(g, x + 100 * s, y - th - 8, x + 100 * s, y + 8, { stroke: C('ok'), 'stroke-width': 3 }); }
        if (st.seg >= 10) txt(g, x + 50 * s, y + 30, '1m＝100cm', { 'font-size': 22, fill: C('ok'), class: 'ui' });
        if (st.seg > 10) txt(g, x + 110 * s, y + 30, '20cm', { 'font-size': 18, fill: C('ink-soft'), class: 'ui' });
      }
    }
    async function run() {
      const tag = S.token, ok = () => alive(tag), say = (h, s) => ctx.caption(h, 0, s || sp(h));
      phase = 'play'; Object.assign(st, { scene: 'board', n: 0, tool: 'ruler30', seg: 0, fold: 0 }); draw();
      say('こくばんの よこの ながさを、30cmものさしで はかると…', '黒板の横の長さを、30センチメートルのものさしではかると'); if (!(await wait(2)) || !ok()) return;
      const n30 = Math.ceil(board / 30 - 0.01);
      for (let i = 1; i <= n30; i++) { st.n = i; draw(); sfx.tick(i); if (!(await wait(0.28)) || !ok()) return; }
      say(`${n30}かいも おきなおした。たいへん！`, `${n30}回も置き直した。大変`); if (!(await wait(2.2)) || !ok()) return;
      st.tool = 'ruler1m'; st.n = 0; draw(); say('<b>1mものさし</b>なら？', '1メートルのものさしなら？'); if (!(await wait(1.4)) || !ok()) return;
      const n1 = Math.ceil(board / 100 - 0.01);
      for (let i = 1; i <= n1; i++) { st.n = i; draw(); sfx.tick(i); if (!(await wait(0.6)) || !ok()) return; }
      say(`${Math.floor(board / 100)}かいと すこし。<b>${mcm(board * 10)}</b>`, `${Math.floor(board / 100)}回と少し。${sp(mcm(board * 10))}`); if (!(await wait(2.6)) || !ok()) return;
      st.scene = 'tape'; st.seg = 0; draw(); say('1mの テープを 10cmずつ いろで ぬると…', '1メートルのテープを10センチメートルずつ色でぬると'); if (!(await wait(1.4)) || !ok()) return;
      for (let i = 1; i <= 10; i++) { st.seg = i; draw(); sfx.tick(i); if (!(await wait(0.3)) || !ok()) return; }
      say('10cmが 10こで <b>1m</b>。<b>1m＝100cm</b>', '10センチメートルが10個で1メートル。1メートルは100センチメートル'); if (!(await wait(2.8)) || !ok()) return;
      st.scene = 'tape120'; st.fold = 1; for (let i = 11; i <= 12; i++) { st.seg = i; draw(); sfx.tick(i); if (!(await wait(0.4)) || !ok()) return; }
      say('120cmは 1mと 20cm。<b>1m 20cm</b>と かく', '120センチメートルは1メートルと20センチメートル。1メートル20センチメートルと書く'); if (!(await wait(3)) || !ok()) return;
      say('つぎは「さわる」で 1mものさしを つかおう', '次は「さわる」で1メートルのものさしを使おう'); ctx.log('miru'); phase = 'done';
    }
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    F.onResize(draw); run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------------- さわる：1mものさしで はかる（30cmものさしとも くらべる） ---------------- */
  if (mode === 'm1') {
    let obj = opts.obj || 'blackboard', tl = 'ruler1m', n = 0, results = 0, busy = false;
    const need = () => Math.ceil(cmOf(obj) / TOOL[tl].cm - 1e-6);
    let Lg = {};
    function draw() {
      const a = area(), Lcm = cmOf(obj), o = LONG[obj].o; F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx'); Lg.fx = fx;
      const avail = o === 'h' ? a.W * 0.94 : a.H * 0.86, s = avail / Lcm, L = Lcm * s, h = o === 'h' ? Math.min(a.H * 0.36, Math.max(30, L * (obj === 'desk' ? 0.12 : 0.28))) : Math.min(a.W * 0.32, L * 0.45);
      const ox = o === 'h' ? a.m + (a.W - L) / 2 : a.m + a.W * 0.5 - h / 2, oy = o === 'h' ? a.top + a.H * 0.55 : a.top + a.H * 0.93;
      // ローカル座標（よこ）。たては 左はしを下に して -90° 回す
      const G = el('g', { transform: o === 'h' ? `translate(${ox},${oy})` : `translate(${ox + h},${oy}) rotate(-90)` }, g);
      if (o === 'v') { const dg = el('g', { transform: `translate(0,0)` }, G); drawLong(dg, 'door', L, h); } else drawLong(G, obj, L, h);
      const T = TOOL[tl].cm * s, th = Math.max(8, Math.min(22, T * 0.1));
      for (let i = 0; i < n; i++) { const x = i * T; tool(G, tl, Math.min(x, L), 12 + th, Math.min(T, Math.max(1, L - x + (i === need() - 1 ? T : 0))), th, { sw: 1 }); }
      const tc = el('g', {}, fx);
      for (let i = 0; i < n; i++) { const c = o === 'h' ? [ox + Math.min(i * T + T / 2, L - 8), oy + 12 + th + 24] : [ox + h + 12 + th + 24, oy - Math.min(i * T + T / 2, L - 8)]; badge(tc, c[0], c[1], String(i + 1), { r: Math.min(13, Math.max(8, T * 0.3)) }); }
      if (n >= need()) { const rem = Lcm - (need() - 1) * TOOL[tl].cm; const x0 = (need() - 1) * T; if (rem < TOOL[tl].cm) overhang(G, x0 + rem * s, x0 + T, 12, th, C('ok-soft')); }
      Lg = { a, s, L, h, o, ox, oy, fx };
    }
    async function place(all) {
      if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; }
      if (n >= need()) { sfx.off(); ctx.toast('', 'はしまで おいたよ。ほかの ものや どうぐでも はかろう', 2.2); return; }
      const tag = S.token; busy = true;
      do { n++; draw(); sfx.tick(n); if (all && !(await wait(Math.max(0.05, 0.25 - need() * 0.006)))) break; } while (all && n < need() && alive(tag));
      busy = false; if (!alive(tag)) return;
      if (n < need()) { ctx.caption(`${TOOL[tl].label} ${n}かい`, 0, sp(`${TOOL[tl].label}${n}回`)); return; }
      const Lcm = cmOf(obj), full = Math.floor(Lcm / TOOL[tl].cm + 1e-6), rem = Lcm - full * TOOL[tl].cm;
      const msg = `${LONG[obj].label}は ${TOOL[tl].label} ${full}こぶん${rem ? `と ${rem}cm` : ''} → <b>${mcm(Lcm * 10)}</b>${tl === 'ruler30' ? `（${need()}かい おいた）` : ''}`;
      sfx.good(); ctx.caption(msg, 0, sp(msg)); results++;
      ctx.register('nagai', obj); ctx.log('measure', { detail: { obj, tool: tl, n: need(), cm: Lcm } });
    }
    const chips = LONG_IDS.map(id => `<button type="button" class="chip" data-obj="${id}" aria-pressed="${id === obj}">${LONG[id].label}</button>`).join('');
    panel.innerHTML = `<div class="chips">${chips}</div><div class="row"><div class="seg" role="group" aria-label="どうぐ">${Object.entries(TOOL).map(([k, t]) => `<button type="button" data-tool="${k}" aria-pressed="${k === tl}">${t.label}</button>`).join('')}</div></div>
      <div class="row"><button class="btn" type="button" data-k="put">1かい おく</button><button class="btn sub small" type="button" data-k="all">はしまで おく</button><button class="btn sub small" type="button" data-k="clear">はじめから</button></div>`;
    const sel = () => { n = 0; draw(); ctx.caption(`<b>${LONG[obj].label}</b>を <b>${TOOL[tl].label}</b>で はかろう`, 0); };
    $$p(panel, '[data-obj]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.obj === obj) { ctx.toast('', `いまは「${LONG[obj].label}」だよ`, 1.6); return; } if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; } obj = b.dataset.obj; $$p(panel, '[data-obj]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.obj === obj))); sel(); }));
    $$p(panel, '[data-tool]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.tool === tl) { ctx.toast('', `いまは「${TOOL[tl].label}」だよ`, 1.6); return; } if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; } tl = b.dataset.tool; $$p(panel, '[data-tool]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tool === tl))); sel(); }));
    on($p(panel, '[data-k="put"]'), 'click', () => place(false));
    on($p(panel, '[data-k="all"]'), 'click', () => place(true));
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); if (!n) { ctx.toast('', 'まだ おいて いないよ', 1.6); return; } if (busy) { ctx.toast('', 'ちょっと まってね', 1.2); return; } sel(); });
    F.onResize(draw); sel();
    api.test = { state: () => ({ obj, tool: tl, n, results }), auto: () => (results ? { done: true } : busy ? { wait: 300 } : { click: 'data-k=all|' }) };
    return api;
  }

  /* ---------------- さわる：120cmの テープ（1mで おる） ---------------- */
  if (mode === 'fold') {
    const st = { T: 120, fold: 0, count: 0, folds: 0 };
    function draw() {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      const s = a.W / 200, x = a.m + a.W * 0.02, y = a.top + a.H * 0.62, th = Math.max(18, Math.min(34, a.H * 0.1));
      tool(g, 'ruler1m', x, y - th - 16, 100 * s, Math.max(12, th * 0.55));
      txt(g, x + 50 * s, y - th - 16 - Math.max(12, th * 0.55) - 8, '1mものさし', { 'font-size': 15, fill: C('wood-deep'), class: 'ui' });
      const cols = ['face-1', 'face-2', 'face-3', 'face-4', 'face-5', 'face-6'];
      const n = Math.ceil(st.T / 10);
      for (let i = 0; i < n; i++) {
        const c0 = i * 10, c1 = Math.min(st.T, c0 + 10), w = (c1 - c0) * s;
        let X0 = x + c0 * s, Y = y - th;
        if (c0 >= 100 && st.fold > 0) { const f = st.fold, rel = c0 - 100, X = x + 100 * s - (rel * s + w) * f + rel * s * (1 - f) - 0 * f; X0 = lerp(x + c0 * s, x + 100 * s - (rel + (c1 - c0)) * s, f); Y = y - th + th * 1.15 * Math.sin(f * Math.PI / 2); }
        rect(g, X0, Y, w - 1.2, th, { fill: C(cols[i % 6]), opacity: 0.9, stroke: C('ink-soft'), 'stroke-width': 0.6 });
        if (st.count > i) badge(fx, X0 + w / 2, Y + th + 18, String((i + 1) * 10 > st.T ? st.T : (i + 1) * 10), { r: 13 });
      }
      line(g, x + 100 * s, y - th - 24, x + 100 * s, y + th * 1.3, { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '5 4' });
      if (st.fold >= 1) { const r = st.T - 100; txt(g, x + 50 * s, y + th * 1.15 + 34, '1m', { 'font-size': 22, fill: C('ok'), class: 'ui' }); if (r > 0) txt(g, x + 100 * s - r * s / 2, y + th * 2.3 + 30, `${r}cm`, { 'font-size': 18, fill: C('sora'), class: 'ui' }); }
    }
    async function doFold() {
      if (st.fold >= 1) { sfx.off(); ctx.toast('', 'もう おったよ。「べつの テープ」で ためそう', 2); return; }
      if (st.T <= 100) { sfx.off(); ctx.toast('', 'このテープは 1mより みじかいよ', 2); return; }
      sfx.tap(); const tag = S.token; st.count = 0;
      await tween(1.1, k => { st.fold = E.io(k); draw(); }); if (!alive(tag)) return; st.fold = 1; draw(); st.folds++;
      const r = st.T - 100, msg = `${st.T}cmは <b>1mと ${r}cm</b>。<b>1m ${r}cm</b>と かく`;
      sfx.pop(); ctx.caption(msg, 0, sp(`${st.T}cmは1mと${r}cm`)); ctx.log('fold', { detail: { T: st.T } });
    }
    async function count() {
      const tag = S.token; sfx.tap(); st.fold = 0;
      for (let i = 1; i <= Math.ceil(st.T / 10); i++) { st.count = i; draw(); sfx.tick(i); ctx.caption(`${Math.min(st.T, i * 10)}cm${i * 10 === 100 ? '＝<b>1m</b>' : ''}`, 0); if (!(await wait(i === 10 ? 0.9 : 0.32)) || !alive(tag)) return; }
    }
    panel.innerHTML = `<div class="row"><button class="btn" type="button" data-k="fold">1mで おる</button><button class="btn sub small" type="button" data-k="count">10cmずつ かぞえる</button><button class="btn sub small" type="button" data-k="new">べつの テープ</button></div>`;
    on($p(panel, '[data-k="fold"]'), 'click', doFold);
    on($p(panel, '[data-k="count"]'), 'click', count);
    on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); const b = st.T; st.T = pickR([110, 130, 140, 150, 160, 170, 180, 125, 135, 145]); if (st.T === b) st.T = b + 10; st.fold = 0; st.count = 0; draw(); ctx.caption(`${st.T}cmの テープ。なんm なんcm？`, 0, sp(`${st.T}cmのテープ。何m何cm？`)); });
    F.onResize(draw); draw();
    ctx.caption('120cmの テープ。1mものさしと くらべて みよう', 0, sp('120cmのテープ。1mのものさしと比べてみよう'));
    api.test = { state: () => ({ T: st.T, folds: st.folds }), auto: () => (st.folds ? { done: true } : { click: 'data-k=fold|' }) };
    return api;
  }

  /* ---------------- つくる：1m を つくる（基準物を ならべて ちょうど 100cm） ---------------- */
  if (mode === 'make1m') {
    const lenOf = id => (bench(id) || {}).len_mm || 100;
    const DRAW = { desk: 'desk', 'hagaki-w': 'hagaki' };
    const list = [];   // 置いた順の id
    let made = 0;
    const cnt = () => { const c = {}; list.forEach(id => { c[id] = (c[id] || 0) + 1; }); return c; };
    const sum = () => list.reduce((s, id) => s + lenOf(id), 0);
    let Lg = {};
    function draw() {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      const s = a.W * 0.84 / 1000, x = a.m + a.W * 0.05, y = a.top + a.H * 0.6, lh = Math.min(70, a.H * 0.28);
      Lg = { s, x, y, lh, fx };
      // 1m の わく（10cm ごと）
      rect(g, x, y - lh, 1000 * s, lh, { rx: 6, fill: C('paper-2'), stroke: C('sora'), 'stroke-width': 2, 'stroke-dasharray': '6 4' });
      for (let i = 0; i <= 10; i++) line(g, x + i * 100 * s, y, x + i * 100 * s, y + (i % 5 === 0 ? 14 : 8), { stroke: C('sora'), 'stroke-width': i % 5 === 0 ? 2 : 1 });
      txt(g, x, y + 32, '0', { 'font-size': 14, fill: C('sora'), class: 'ui' }); txt(g, x + 500 * s, y + 32, '50cm', { 'font-size': 14, fill: C('sora'), class: 'ui' }); txt(g, x + 1000 * s, y + 32, '1m', { 'font-size': 16, fill: C('ok'), class: 'ui' });
      let cx = x; Lg.items = [];
      list.forEach((id, i) => { const L = lenOf(id) * s, h = Math.min(lh - 8, Math.max(8, thOf(DRAW[id] || id, L))); const ig = thing(g, DRAW[id] || id, cx, y - 4, L, { h, sw: 1 }); ig.setAttribute('data-i', i); Lg.items.push({ x0: cx, x1: cx + L }); cx += L; });
      const tot = sum();
      if (tot > 1000) overhang(fx, x + 1000 * s, x + tot * s, y - lh, lh, C('ok-soft'));
      txt(g, x + Math.min(tot, 1000) * s, y - lh - 12, tot ? mcm(tot) : '', { 'font-size': 20, fill: tot === 1000 ? C('ok') : C('ink'), class: 'ui', 'text-anchor': tot > 850 ? 'end' : 'middle' });
    }
    function check() {
      const tot = sum();
      if (tot === 1000) {
        const key = onemKey(cnt()); made++; sfx.good(); hanamaru(F.svg, Lg.x + 500 * Lg.s, Lg.y - Lg.lh / 2, 46);
        ctx.toast(ICON.HANAMARU, 'ぴったり <b>1m</b>！ ずかんに のったよ', 3, 'ぴったり1メートル');
        ctx.register('onem', key); ctx.log('make', { correct: true, detail: { key, n: list.length } }); ctx.done('make1m');
      } else if (tot > 1000) { sfx.bad(); ctx.toast('', `${mcm(tot - 1000)} はみだした。どれかを とろう`, 2.4, sp(`${mcm(tot - 1000)}はみだした`)); ctx.log('make', { correct: false, detail: { over: tot - 1000 } }); }
      else ctx.caption(`いま <b>${mcm(tot)}</b>。あと <b>${mcm(1000 - tot)}</b>`, 0, sp(`今${mcm(tot)}。あと${mcm(1000 - tot)}`));
    }
    const chips = ONEM_IDS.map(id => `<button type="button" class="chip" data-item="${id}">${thingIcon(DRAW[id] || id, 34, 20)}${bname(id)}</button>`).join('');
    panel.innerHTML = `<div class="chips">${chips}</div><div class="row"><button class="btn sub small" type="button" data-k="undo">1つ もどす</button><button class="btn sub small" type="button" data-k="clear">はじめから</button></div>`;
    $$p(panel, '[data-item]').forEach(b => on(b, 'click', () => {
      const id = b.dataset.item;
      if (sum() >= 1000) { sfx.off(); ctx.toast('', sum() === 1000 ? 'もう 1mに なったよ。「はじめから」で ちがう くみあわせを さがそう' : 'はみだして いるよ。「1つ もどす」で とろう', 2.4); return; }
      if ((cnt()[id] || 0) >= ONEM_MAX) { sfx.off(); ctx.toast('', `おなじ ものは ${ONEM_MAX}つまで`, 1.8); return; }
      sfx.pop(); list.push(id); draw(); check();
    }));
    on($p(panel, '[data-k="undo"]'), 'click', () => { if (!list.length) { sfx.off(); ctx.toast('', 'まだ なにも ないよ', 1.6); return; } sfx.tap(); list.pop(); draw(); check(); if (!list.length) ctx.caption('ものを えらんで ならべよう', 0); });
    on($p(panel, '[data-k="clear"]'), 'click', () => { if (!list.length) { sfx.off(); ctx.toast('', 'まだ なにも ないよ', 1.6); return; } sfx.tap(); list.length = 0; draw(); ctx.caption('ものを えらんで、ぴったり <b>1m</b>を つくろう', 0); });
    dragOn(F.svg, F, {
      hit: p => { if (!Lg.items) return null; const k = Lg.items.findIndex(it => p.x >= it.x0 && p.x <= it.x1 && p.y > Lg.y - Lg.lh && p.y < Lg.y + 4); return k >= 0 ? { k } : null; },
      end: (p, h) => { sfx.tap(); list.splice(h.k, 1); draw(); check(); },
    });
    F.onResize(draw); draw();
    ctx.caption('ものを えらんで ならべ、ぴったり <b>1m</b>を つくろう（おなじ ものは 3つまで）', 0, '物を選んで並べ、ぴったり1メートルを作ろう');
    let combos = null;
    api.test = {
      state: () => ({ list: list.slice(), sum: sum(), made }),
      auto() {
        if (made >= 1) return { done: true };
        combos = combos || onemCombos(lenOf);
        const have = new Set(ctx.zukanList('onem')), target = combos.find(k => !have.has(k)) || combos[0];
        const want = Object.fromEntries(target.split('+').map(p => p.split('*')).map(([id, n]) => [id, +n])), c = cnt();
        if (Object.entries(c).some(([id, n]) => n > (want[id] || 0))) return { click: 'data-k=clear|' };
        const next = ONEM_IDS.find(id => (c[id] || 0) < (want[id] || 0));
        return next ? { click: `data-item=${next}|` } : { wait: 200 };
      },
    };
    return api;
  }

  /* ---------------- さわる：まきじゃく（N3）：ひきだす・きの まわり・0の いち ---------------- */
  if (mode === 'maki') {
    const st = { view: 'pull', t: 30, wrap: 0, unroll: 0, C: 94, tries: 0, done: { pull: 0, tree: 0, zero: 0 } };
    let Lg = {};
    function tapePath(g, x0, y, t, s, th) {
      rect(g, x0, y - th / 2, t * s, th, { fill: C('yamabuki'), stroke: C('hint'), 'stroke-width': 1 });
      for (let c = 0; c <= t; c++) { if (s < 2.2 && c % 5) continue; const X = x0 + c * s, big = c % 10 === 0; line(g, X, y - th / 2, X, y - th / 2 + (big ? th * 0.6 : th * 0.3), { stroke: C('ink'), 'stroke-width': big ? 1.4 : 0.7 }); if (big && c) txt(g, X, y + th / 2 - 3, String(c), { 'font-size': Math.min(13, th * 0.45), fill: C('ok'), class: 'ui' }); }
    }
    function drawCase(g, x, y, r) { rect(g, x - r, y - r, r * 2, r * 2, { rx: r * 0.35, fill: C('face-1'), stroke: C('ink'), 'stroke-width': 2 }); circle(g, x, y, r * 0.42, { fill: C('paper'), stroke: C('ink-soft'), 'stroke-width': 2 }); }
    function drawHook(g, x, y, th) { rect(g, x, y - th / 2 - 4, Math.max(5, th * 0.3), th + 8, { fill: C('metal-deep'), stroke: C('metal-dark'), 'stroke-width': 1 }); }
    function draw() {
      const a = area(); F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      if (st.view === 'pull') {
        const r = Math.min(36, a.H * 0.12), cx = a.m + r, y = a.top + a.H * 0.55, s = (a.W - r * 2 - 30) / 150, th = Math.max(16, Math.min(28, a.H * 0.08)), x0 = cx + r;
        drawCase(g, cx, y, r); tapePath(g, x0, y, st.t, s, th); drawHook(g, x0 + st.t * s, y, th);
        txt(g, x0 + st.t * s, y - th - 16, st.t ? mcm(st.t * 10) : '', { 'font-size': 20, fill: C('ok'), class: 'ui' });
        const hx = x0 + st.t * s; circle(g, hx + 10, y + th + 22, 15, { fill: C('paper'), stroke: C('ok'), 'stroke-width': 3, class: 'grab' }); path(g, `M${hx + 6},${y + th + 16}L${hx + 14},${y + th + 22}L${hx + 6},${y + th + 28}`, { fill: 'none', stroke: C('ok'), 'stroke-width': 3 });
        Lg = { x0, s, y, th, hx };
      } else if (st.view === 'tree') {
        const R0 = Math.min(a.W * 0.2, a.H * 0.3), cx = a.m + a.W * 0.32, cy = a.top + a.H * 0.48, th = Math.max(12, Math.min(20, a.H * 0.06));
        // 木の みき（うえから）
        circle(g, cx, cy, R0 * 1.25, { fill: C('leaf'), opacity: 0.25 }); circle(g, cx, cy, R0, { fill: C('wood'), stroke: C('wood-deep'), 'stroke-width': 3 });
        for (let k = 1; k < 4; k++) circle(g, cx, cy, R0 * k / 4, { fill: 'none', stroke: C('wood-deep'), 'stroke-width': 1, opacity: 0.5 });
        const Rt = R0 + th / 2, s = (2 * Math.PI * Rt) / st.C;   // 1cm の px（まわり ひとまわり＝C cm）
        const ang = 360 * st.wrap, u = st.unroll;
        // まく：上の点から 時計まわり。のばす：まっすぐの線へ うつる
        const pts = []; const N = 80;
        for (let i = 0; i <= N; i++) { const c = st.C * st.wrap * i / N, a0 = c * s / Rt * 180 / Math.PI, [px, py] = polar(cx, cy, Rt, a0); const lx = cx + c * s, ly = cy - Rt; pts.push([lerp(px, lx, u), lerp(py, ly, u)]); }
        el('polyline', { points: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), fill: 'none', stroke: C('yamabuki'), 'stroke-width': th, 'stroke-linejoin': 'round' }, g);
        for (let c = 10; c <= st.C * st.wrap; c += 10) { const a0 = c * s / Rt * 180 / Math.PI, [px, py] = polar(cx, cy, Rt, a0), [qx, qy] = [cx + c * s, cy - Rt]; const X = lerp(px, qx, u), Y = lerp(py, qy, u); circle(g, X, Y, 2.5, { fill: C('ok') }); }
        const [hx0, hy0] = polar(cx, cy, Rt, 0); drawHook(g, hx0 - 3, hy0, th);
        if (st.wrap >= 1) { const ex = lerp(polar(cx, cy, Rt, 360)[0], cx + st.C * s, u), ey = lerp(polar(cx, cy, Rt, 360)[1], cy - Rt, u); circle(g, ex, ey, 7, { fill: 'none', stroke: C('ok'), 'stroke-width': 3 }); txt(g, Math.min(ex + 10, F.W - 60), ey - 18, `${st.C}cm`, { 'font-size': 22, fill: C('ok'), class: 'ui', 'text-anchor': 'start' }); }
        Lg = { cx, cy, R0 };
      } else {
        // 0の いち：先の かなぐを 大きく
        const y = a.top + a.H * 0.5, th = Math.min(80, a.H * 0.3), s = Math.min(a.W / 9, 70), x0 = a.m + a.W * 0.22;
        rect(g, x0, y - th / 2, a.W * 0.74, th, { fill: C('yamabuki'), stroke: C('hint'), 'stroke-width': 2 });
        for (let mmv = 0; mmv * s / 10 < a.W * 0.74; mmv++) { const X = x0 + mmv * s / 10, big = mmv % 10 === 0; line(g, X, y - th / 2, X, y - th / 2 + (big ? th * 0.55 : mmv % 5 ? th * 0.22 : th * 0.36), { stroke: C('ink'), 'stroke-width': big ? 2 : 1 }); if (big) txt(g, X + 4, y + th / 2 - 8, String(mmv / 10), { 'font-size': 22, fill: C('ok'), class: 'ui', 'text-anchor': 'start' }); }
        rect(g, x0 - th * 0.28, y - th / 2 - 14, th * 0.28, th + 28, { fill: C('metal-deep'), stroke: C('metal-dark'), 'stroke-width': 2 });
        circle(g, x0 + th * 0.35, y - th / 2 - 4, 6, { fill: C('paper'), stroke: C('metal-dark'), 'stroke-width': 2 });
        line(g, x0 - th * 0.28, y - th / 2 - 40, x0 - th * 0.28, y + th / 2 + 40, { stroke: C('ok'), 'stroke-width': 3, 'stroke-dasharray': '6 4' });
        txt(g, x0 - th * 0.28, y - th / 2 - 48, '0は ここ（かなぐの そとの はし）', { 'font-size': 17, fill: C('ok'), class: 'ui', 'text-anchor': 'start' });
        Lg = {};
      }
    }
    async function wrap() {
      const tag = S.token; sfx.tap(); st.C = pickR([62, 75, 88, 94, 110, 126]); st.wrap = 0; st.unroll = 0; draw();
      ctx.caption('まきじゃくを みきに まいて いくよ', 0, '巻き尺をみきに巻いていくよ');
      await tween(2, k => { st.wrap = E.io(k); draw(); }); if (!alive(tag)) return; st.wrap = 1; draw();
      st.done.tree++; sfx.pop(); ctx.caption(`みきの まわりは <b>${st.C}cm</b>。まがった ものは まきじゃくで はかれる`, 0, sp(`みきのまわりは${st.C}cm。曲がったものは巻き尺ではかれる`)); ctx.log('maki', { detail: { kind: 'tree', cm: st.C } });
    }
    async function unroll() {
      if (st.view !== 'tree' || st.wrap < 1) { sfx.off(); ctx.toast('', 'さきに「きの まわり」で まいてね', 1.8); return; }
      if (st.unroll >= 1) { sfx.off(); ctx.toast('', 'もう のばしたよ', 1.4); return; }
      const tag = S.token; sfx.tap(); await tween(1.4, k => { st.unroll = E.io(k); draw(); }); if (!alive(tag)) return; st.unroll = 1; draw();
      ctx.caption(`まっすぐ のばしても <b>${st.C}cm</b>。まわりの ながさが まっすぐに なった`, 0, sp(`まっすぐ伸ばしても${st.C}cm`));
    }
    const VIEWS = { pull: 'ひきだす', tree: 'きの まわり', zero: '0の いち' };
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="まきじゃく">${Object.entries(VIEWS).map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${k === st.view}">${l}</button>`).join('')}</div></div>
      <div class="row"><button class="btn sub small" type="button" data-k="pull1m">1m ひきだす</button><button class="btn sub small" type="button" data-k="wrap">まく</button><button class="btn sub small" type="button" data-k="unroll">まっすぐ のばす</button><button class="btn sub small" type="button" data-k="back">もどす</button></div>`;
    const setView = v => { st.view = v; $$p(panel, '[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === v))); };
    $$p(panel, '[data-view]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (b.dataset.view === st.view) { ctx.toast('', `いまは「${VIEWS[st.view]}」だよ`, 1.6); return; }
      setView(b.dataset.view);
      if (st.view === 'tree') { wrap(); return; }
      draw();
      if (st.view === 'zero') { st.done.zero++; ctx.caption('まきじゃくの <b>0</b>は、さきの <b>かなぐの はし</b>。かなぐも ながさに はいって いる', 0, '巻き尺の0は、先の金具の端。金具も長さに入っている'); ctx.log('maki', { detail: { kind: 'zero' } }); }
      else ctx.caption('かなぐを ゆびで ひっぱって、まきじゃくを ひきだそう', 0, '金具を指でひっぱって、巻き尺を引き出そう');
    }));
    on($p(panel, '[data-k="wrap"]'), 'click', () => { if (st.view !== 'tree') setView('tree'); wrap(); });
    on($p(panel, '[data-k="unroll"]'), 'click', unroll);
    on($p(panel, '[data-k="pull1m"]'), 'click', async () => {
      if (st.view !== 'pull') setView('pull');
      if (st.t === 100) { sfx.off(); ctx.toast('', 'もう 1m でて いるよ', 1.4); draw(); return; }
      sfx.tap(); const tag = S.token, a0 = st.t; await tween(0.8, k => { st.t = Math.round(lerp(a0, 100, E.io(k))); draw(); }); if (!alive(tag)) return;
      st.done.pull++; ctx.caption('<b>1m</b>＝100cm。まきじゃくは もっと ながく でるよ', 0, '1メートルは100センチメートル。巻き尺はもっと長く出るよ'); ctx.log('maki', { detail: { kind: 'pull', cm: 100 } });
    });
    on($p(panel, '[data-k="back"]'), 'click', () => {
      if (st.view === 'pull' && st.t === 0) { sfx.off(); ctx.toast('', 'もう しまって あるよ', 1.4); return; }
      sfx.tap(); st.t = 0; st.wrap = 0; st.unroll = 0; setView('pull'); draw(); ctx.caption('シュルッ。まきじゃくを しまったよ', 0, 'しゅるっ。巻き尺をしまったよ');
    });
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => (st.view === 'pull' && Lg.hx != null && Math.abs(p.x - Lg.hx) < 40 && Math.abs(p.y - Lg.y) < Lg.th + 40 ? true : null),
      start: p => { drag = { x0: p.x, t0: st.t }; ctx.hideHud(); },
      move: p => { if (!drag) return; st.t = clamp(Math.round(drag.t0 + (p.x - drag.x0) / Lg.s), 0, 150); draw(); },
      end: () => { if (!drag) return; drag = null; st.done.pull++; ctx.caption(`<b>${mcm(st.t * 10)}</b> ひきだした`, 0, sp(`${mcm(st.t * 10)}ひきだした`)); ctx.log('maki', { detail: { kind: 'pull', cm: st.t } }); },
    });
    F.onResize(draw); draw();
    ctx.caption('かなぐを ゆびで ひっぱって、まきじゃくを ひきだそう', 0, '金具を指でひっぱって、巻き尺を引き出そう');
    api.test = {
      state: () => ({ view: st.view, t: st.t, done: st.done }),
      auto() {
        if (st.done.pull >= 1) return { done: true };
        if (st.view !== 'pull') return { click: 'data-view=pull|' };
        return pathOf(F, [[Lg.hx + 2, Lg.y], [Lg.hx + 40, Lg.y], [Lg.hx + 80, Lg.y]]);
      },
    };
    return api;
  }
  return api;
}
