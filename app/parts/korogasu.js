// 円周と円周率（E5）：円を転がして円周を直線にのばす（2D）。図形側の cylinder-roll は 3D の部品なので代わりにならない。
// opts.mode：miru（ころがす→直径の3つ分と少し→正六角形と正方形ではさむ→いろいろな円で 3.14）・roll（ころがして はかる）・hasamu（はさんで みる）・ratio（つくる：えんしゅうりつを みつけよう）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, dragOn, pathOf, tween, wait, E, hanamaru } from './_flat.js';
import { circles, polyIn, polyOut, cmTxt, num, r2, ratioOf } from './_ahead-gen.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

export const RU = { en: '<ruby>円周<rt>えんしゅう</rt></ruby>', choku: '<ruby>直径<rt>ちょっけい</rt></ruby>', han: '<ruby>半径<rt>はんけい</rt></ruby>', ritsu: '<ruby>円周率<rt>えんしゅうりつ</rt></ruby>', roku: '<ruby>正六角形<rt>せいろっかくけい</rt></ruby>', sei: '<ruby>正方形<rt>せいほうけい</rt></ruby>' };
export const CIRC = () => circles(id => bench(id));

// 転がる円：中心 (x, base−r)。s＝転がった道のり（px）。円周の しるし（あか）と直径（あお）が いっしょに回る
export function makeWheel(parent, { x0, base, r, col }) {
  const g = el('g', {}, parent);
  const tape = rect(g, x0, base - 3, 0, 8, { rx: 3, fill: col || C('face-4') });
  const startMark = line(g, x0, base - 12, x0, base + 14, { stroke: C('ok'), 'stroke-width': 3 });
  const endMark = line(g, x0, base - 12, x0, base + 14, { stroke: C('ok'), 'stroke-width': 3, opacity: 0 });
  const w = el('g', {}, g), inner = el('g', {}, w);
  circle(inner, 0, 0, r, { fill: C('face-4'), 'fill-opacity': 0.22, stroke: C('ink'), 'stroke-width': 3 });
  line(inner, -r, 0, r, 0, { stroke: C('sora'), 'stroke-width': 3 });
  circle(inner, 0, 0, 4, { fill: C('ink') });
  circle(inner, 0, r, 7, { fill: C('ok'), stroke: C('paper'), 'stroke-width': 2 });
  const api = {
    g, r, x0, base, s: 0,
    set(s) { api.s = s; const x = x0 + s; w.setAttribute('transform', `translate(${x},${base - r}) rotate(${s / r * 180 / Math.PI})`); tape.setAttribute('width', Math.max(0, s)); endMark.setAttribute('x1', x0 + s); endMark.setAttribute('x2', x0 + s); endMark.setAttribute('opacity', s >= 2 * Math.PI * r - 0.5 ? 1 : 0); },
    full: () => 2 * Math.PI * r,
    center: () => [x0 + api.s, base - r],
  };
  api.set(0);
  return api;
}
// 直径の棒を 3本 ならべて「3つ分と少し」を見せる
export async function layDiam(g, { x0, y, r, n = 3, dur = 0.5, label = true }) {
  const tag = S.token, d = 2 * r, cols = [C('sora'), C('face-3'), C('face-6')];
  for (let k = 0; k < n; k++) {
    const bar = rect(g, x0 + k * d, y, 0, 10, { rx: 3, fill: cols[k % 3] });
    await tween(dur, t => bar.setAttribute('width', Math.max(0, d * t - 2)), E.out); if (!alive(tag)) return false;
    if (label) txt(g, x0 + k * d + d / 2, y + 30, `${k + 1}`, { 'font-size': 16, class: 'ui', fill: C('ink-soft') });
  }
  const rest = 2 * Math.PI * r - n * d;
  if (rest > 0) { rect(g, x0 + n * d, y, rest, 10, { rx: 3, fill: C('yamabuki') }); if (label) txt(g, x0 + n * d + rest / 2 + 4, y + 30, 'すこし', { 'font-size': 14, class: 'ui', fill: C('hint') }); }
  return true;
}
// 正多角形（円に内接・外接）
export function polyD(cx, cy, r, n, outer = false, rot = -90) {
  const R = outer ? r / Math.cos(Math.PI / n) : r, pts = [];
  for (let i = 0; i < n; i++) { const a = (rot + 360 * i / n + (outer ? 180 / n : 0)) * Math.PI / 180; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
}

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'roll';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);
  const all = CIRC();
  // 円の大きさ（px）：ひとまわり（2πr）と少しが 横に収まる
  const rFit = A => Math.max(16, Math.min((A.w - 40) / (2 * Math.PI + 1.6), A.h * 0.2, 90));

  /* ======================= みる ======================= */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', L = null, wh = null;
    const build = () => { F.clearLayers(); const A = area(), r = rFit(A); L = { A, r, x0: A.x0 + 8 + r, base: A.y0 + A.h * 0.5 }; wh = makeWheel(F.layer('w'), { x0: L.x0, base: L.base, r }); };
    F.onResize(build); build();
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const tag = S.token, ok = () => alive(tag); phase = 'play'; build();
      const { A, r } = L;
      say(`えんの まわりの ながさ（${RU.en}）は？ あかい しるしから ころがして みよう`, '円のまわりの長さ、円周は？赤いしるしから転がしてみよう'); if (!(await wait(1.6)) || !ok()) return;
      await tween(3, k => wh.set(wh.full() * k), E.io); if (!ok()) return;
      say(`ひとまわりで、まわりが まっすぐに のびた。これが ${RU.en}`, '一回りで、まわりがまっすぐに伸びた。これが円周'); if (!(await wait(2.4)) || !ok()) return;
      const g = F.layer('d');
      say(`${RU.choku}（あおい せん）を ならべて くらべよう`, '直径を並べて比べよう');
      if (!(await layDiam(g, { x0: L.x0, y: L.base + 22, r, dur: 0.7 })) || !ok()) return;
      say(`${RU.en}は ${RU.choku}の <b>3つぶんと すこし</b>`, '円周は直径の3つ分と少し'); if (!(await wait(2.8)) || !ok()) return;
      // 正六角形と正方形で はさむ
      F.clearLayers();
      const R = Math.min(A.h * 0.26, A.land ? A.w * 0.13 : A.w * 0.28), cx = A.land ? A.x0 + A.w * 0.16 : A.x0 + A.w / 2, cy = A.land ? A.y0 + A.h * 0.45 : A.y0 + R + 14;
      const hg = F.layer('h');
      circle(hg, cx, cy, R, { fill: C('face-4'), 'fill-opacity': 0.18, stroke: C('ink'), 'stroke-width': 3 });
      const hex = path(hg, polyD(cx, cy, R, 6), { fill: 'none', stroke: C('face-3'), 'stroke-width': 3, opacity: 0 });
      const sq = path(hg, polyD(cx, cy, R, 4, true, 0), { fill: 'none', stroke: C('face-1'), 'stroke-width': 3, opacity: 0 });
      const bx = A.land ? A.x0 + A.w * 0.34 : A.x0 + 8, bw = A.land ? A.w * 0.62 : A.w - 16, by = A.land ? A.y0 + A.h * 0.22 : cy + R + 34, unit = bw / 4.15;
      const bars = barsSet(F.layer('b'), { x: bx, y: by, unit });
      await tween(0.6, k => hex.setAttribute('opacity', k)); if (!ok()) return;
      say(`うちがわの ${RU.roku}。まわりは ${RU.han} 6つぶん＝${RU.choku}の <b>3ばい</b>`, '内側の正六角形。まわりは半径6つ分で、直径の3倍'); await bars.grow(0, 3, C('face-3'), '正六角形 3ばい'); if (!(await wait(1.8)) || !ok()) return;
      await tween(0.6, k => sq.setAttribute('opacity', k)); if (!ok()) return;
      say(`そとがわの ${RU.sei}。まわりは ${RU.choku}の <b>4ばい</b>`, '外側の正方形。まわりは直径の4倍'); await bars.grow(2, 4, C('face-1'), '正方形 4ばい'); if (!(await wait(1.8)) || !ok()) return;
      say(`${RU.en}は その あいだ。3ばいより ながく、4ばいより みじかい`, '円周はそのあいだ。3倍より長く、4倍より短い'); await bars.grow(1, Math.PI, C('face-4'), '円周 3.14ばい'); if (!(await wait(3)) || !ok()) return;
      // いろいろな円で 円周÷直径
      F.clearLayers();
      const tg = F.layer('t'), list = [all[1], all[2], all[4], all[5]];
      const r0 = Math.min(A.h * 0.12, 40), lx = A.x0 + 10, ly0 = A.y0 + r0 + 6, rowH = Math.min((A.h - 20) / 4, r0 * 2 + 24);
      for (let i = 0; i < list.length; i++) {
        const c = list[i], rr = r0 * (0.55 + 0.45 * i / 3), y = ly0 + i * rowH;
        const w2 = makeWheel(tg, { x0: lx + rr + 4, base: y + rr, r: rr, col: C('face-4') });
        await tween(1, k => w2.set(w2.full() * k), E.io); if (!ok()) return;
        const tx = lx + rr + 4 + w2.full() + 16;
        txt(tg, Math.min(tx, A.x1 - 150), y + rr * 0.6, `${cmTxt(c.c)} ÷ ${cmTxt(c.d)} ＝ ${num(c.ratio)}`, { 'font-size': 17, class: 'ui', 'text-anchor': 'start', fill: C('ok'), 'font-weight': 900 });
        say(`${c.name}：${RU.en} ÷ ${RU.choku} ＝ <b>${num(c.ratio)}</b>`, `${c.name}。円周わる直径は${num(c.ratio)}`); if (!(await wait(1.2)) || !ok()) return;
      }
      say(`どんな えんでも ${RU.en} ÷ ${RU.choku} は やく <b>3.14</b>。これを ${RU.ritsu}と いう`, 'どんな円でも、円周わる直径は約3.14。これを円周率という'); if (!(await wait(3.4)) || !ok()) return;
      say(`${RU.en} ＝ ${RU.choku} × 3.14`, '円周は直径かける3.14'); if (!(await wait(2.4)) || !ok()) return;
      say('つぎは「さわる」で えんを ころがそう', '次は「さわる」で円を転がそう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ======================= さわる：ころがして はかる ======================= */
  if (mode === 'roll') {
    let L = null, wh = null, cur = all[2], rolled = 0, laid = false;
    const st = { s: 0 };
    const build = () => {
      F.clearLayers(); const A = area(), r = rFit(A);
      L = { A, r, x0: A.x0 + 8 + r, base: A.y0 + Math.min(A.h * 0.55, r * 2 + 70) };
      const g = F.layer('w');
      txt(g, A.x0 + A.w / 2, A.y0 + 8, `${cur.name}　ちょっけい ${cmTxt(cur.d)}`, { 'font-size': 18, class: 'ui', fill: C('ink') });
      wh = makeWheel(g, { x0: L.x0, base: L.base, r });
      wh.set(st.s);
      F.layer('d'); if (laid) layDiam(F.layer('d'), { x0: L.x0, y: L.base + 22, r, dur: 0.01 });
      label();
    };
    const label = () => {
      const g = F.layer('lab'); clear(g); const full = st.s >= wh.full() - 0.5;
      const v = cur.c * st.s / wh.full();
      if (st.s > 2) txt(g, L.x0 + st.s / 2, L.base - 14 - (full ? 0 : 0), full ? `えんしゅう やく ${cmTxt(cur.c)}` : `やく ${cmTxt(r2(Math.round(v * 10) / 10))}`, { 'font-size': 17, class: 'ui', fill: full ? C('ok') : C('ink-soft'), 'font-weight': 900 });
    };
    F.onResize(build); build();
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { const [cx, cy] = wh.center(); return Math.hypot(p.x - cx, p.y - cy) < wh.r * 1.3 + 10 ? true : null; },
      start: p => { drag = { px: p.x, s0: st.s }; ctx.hideHud(); if (laid) { laid = false; clear(F.layer('d')); } },
      move: p => { if (!drag) return; st.s = clamp(drag.s0 + p.x - drag.px, 0, wh.full()); wh.set(st.s); label(); },
      end: () => {
        if (!drag) return; drag = null;
        if (st.s >= wh.full() - 8) { st.s = wh.full(); wh.set(st.s); label(); finish(); }
        else { label(); say('あかい しるしが したに もどるまで、ひとまわり ころがそう', '赤いしるしが下に戻るまで、ひとまわり転がそう'); }
      },
    });
    const finish = () => {
      rolled++; sfx.good(); ctx.register('en', cur.id);
      ctx.log('roll', { correct: true, detail: { id: cur.id, d: cur.d, c: cur.c } });
      say(`ひとまわり！ ${RU.en}は やく <b>${cmTxt(cur.c)}</b>。${cmTxt(cur.c)} ÷ ${cmTxt(cur.d)} ＝ ${num(cur.ratio)}`, `ひとまわり！円周は約${unitSp(cur.c)}。`);
      $p(panel, '[data-k="again"]').hidden = false;
    };
    panel.innerHTML = `<div class="chips">${all.map(c => `<button type="button" class="chip" data-en="${c.id}" aria-pressed="${c.id === cur.id}">${c.name}</button>`).join('')}</div>
      <div class="row"><button class="btn sub small" type="button" data-k="lay">${RU.choku}を ならべる</button><button class="btn sub small" type="button" data-k="again" hidden>もういちど</button></div>`;
    $$p(panel, '[data-en]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (b.dataset.en === cur.id) { ctx.toast('', `いまは「${cur.name}」だよ`, 1.6); return; }
      cur = all.find(c => c.id === b.dataset.en); st.s = 0; laid = false;
      $$p(panel, '[data-en]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.en === cur.id)));
      $p(panel, '[data-k="again"]').hidden = true; build();
      say(`${cur.name}（${RU.choku} ${cmTxt(cur.d)}）を ころがそう`, `${cur.name}、直径${unitSp(cur.d)}を転がそう`);
    }));
    on($p(panel, '[data-k="lay"]'), 'click', async () => {
      sfx.tap();
      if (st.s < wh.full() - 0.5) { ctx.toast('', 'さきに ひとまわり ころがそう', 2.2, '先にひとまわり転がそう'); return; }
      if (laid) { ctx.toast('', `${RU.choku}の 3つぶんと すこしだよ`, 2, '直径の3つ分と少しだよ'); return; }
      laid = true; const tag = S.token;
      if (!(await layDiam(F.layer('d'), { x0: L.x0, y: L.base + 22, r: L.r }))) return; if (!alive(tag)) return;
      say(`${RU.en}は ${RU.choku}の <b>3つぶんと すこし</b>`, '円周は直径の3つ分と少し'); ctx.log('lay', { detail: { id: cur.id } });
    });
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); st.s = 0; laid = false; $p(panel, '[data-k="again"]').hidden = true; build(); say('もういちど ころがそう', 'もう一度転がそう'); });
    say(`えんを ゆびで みぎへ ころがそう`, '円を指で右へ転がそう');
    api.test = {
      state: () => ({ s: st.s, rolled, full: wh.full() }),
      auto() {
        if (rolled >= 1 && st.s >= wh.full() - 0.5) return { done: true };
        const [cx, cy] = wh.center(), pts = [], rest = wh.full() - st.s + 4, n = Math.max(8, Math.ceil(rest / 18));
        for (let i = 0; i <= n; i++) pts.push([cx + rest * i / n, cy]);
        return pathOf(F, pts);
      },
    };
    return api;
  }

  /* ======================= さわる：はさんで みる ======================= */
  if (mode === 'hasamu') {
    const shown = new Set(); let n = 6, L = null, bars = null;
    const NS = [6, 12, 24, 48, 96];
    const build = () => {
      F.clearLayers(); const A = area();
      const R = Math.min(A.h * (A.land ? 0.36 : 0.22), A.land ? A.w * 0.16 : A.w * 0.3);
      L = { A, R, cx: A.land ? A.x0 + A.w * 0.18 : A.x0 + A.w / 2, cy: A.land ? A.y0 + A.h * 0.48 : A.y0 + R + 12 };
      const g = F.layer('c');
      circle(g, L.cx, L.cy, R, { fill: C('face-4'), 'fill-opacity': 0.18, stroke: C('ink'), 'stroke-width': 3 });
      line(g, L.cx - R, L.cy, L.cx + R, L.cy, { stroke: C('sora'), 'stroke-width': 2.5 });
      if (shown.has('hex')) path(g, polyD(L.cx, L.cy, R, n), { fill: 'none', stroke: C('face-3'), 'stroke-width': 3 });
      if (shown.has('sq')) path(g, polyD(L.cx, L.cy, R, 4, true, 0), { fill: 'none', stroke: C('face-1'), 'stroke-width': 3 });
      const bx = A.land ? A.x0 + A.w * 0.38 : A.x0 + 8, bw = A.land ? A.w * 0.58 : A.w - 16, by = A.land ? A.y0 + A.h * 0.18 : L.cy + R + 30;
      bars = barsSet(F.layer('b'), { x: bx, y: by, unit: bw / 4.15 });
      if (shown.has('hex')) bars.put(0, polyIn(n, 1), C('face-3'), `${n === 6 ? '正六角形' : `正${n}角形`} ${num(r2(polyIn(n, 1)))}ばい`);
      if (shown.has('en')) bars.put(1, Math.PI, C('face-4'), '円周 3.14ばい');
      if (shown.has('sq')) bars.put(2, 4, C('face-1'), '正方形 4ばい');
    };
    F.onResize(build); build();
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="hex">うちがわの ${RU.roku}</button><button class="btn sub small" type="button" data-k="sq">そとがわの ${RU.sei}</button><button class="btn sub small" type="button" data-k="en">${RU.en}</button><button class="btn sub small" type="button" data-k="more">かどを ふやす</button></div>`;
    const show = async (key, fn) => {
      sfx.tap(); const tag = S.token;
      if (shown.has(key) && key !== 'more') { ctx.toast('', 'もう でて いるよ。ほかの ボタンも おしてね', 2); return; }
      shown.add(key); await fn(); if (!alive(tag)) return;
      ctx.log('compare', { detail: { key, n } });
      if (['hex', 'sq', 'en'].every(k => shown.has(k)) && !shown.has('said')) { shown.add('said'); setTimeout(() => alive(tag) && say(`${RU.en}は ${RU.choku}の 3ばいより ながく、4ばいより みじかい`, '円周は直径の3倍より長く、4倍より短い'), 1600); }
    };
    on($p(panel, '[data-k="hex"]'), 'click', () => show('hex', async () => { build(); say(`${RU.roku}の まわり ＝ ${RU.han} × 6 ＝ ${RU.choku} × <b>3</b>`, '正六角形のまわりは、半径かける6、直径かける3'); await bars.grow(0, polyIn(n, 1), C('face-3'), `正六角形 3ばい`); }));
    on($p(panel, '[data-k="sq"]'), 'click', () => show('sq', async () => { build(); say(`${RU.sei}の まわり ＝ ${RU.choku} × <b>4</b>`, '正方形のまわりは直径かける4'); await bars.grow(2, 4, C('face-1'), '正方形 4ばい'); }));
    on($p(panel, '[data-k="en"]'), 'click', () => show('en', async () => { build(); say(`${RU.en}は ${RU.choku}の やく <b>3.14ばい</b>`, '円周は直径の約3.14倍'); await bars.grow(1, Math.PI, C('face-4'), '円周 3.14ばい'); }));
    on($p(panel, '[data-k="more"]'), 'click', () => {
      sfx.tap(); const i = NS.indexOf(n); n = NS[(i + 1) % NS.length]; shown.add('hex'); shown.add('more' + n); build();
      say(n === 6 ? `${RU.roku}に もどしたよ（3ばい）` : `正${n}かくけい：まわりは ${RU.choku}の <b>${num(r2(polyIn(n, 1)))}ばい</b>。かどを ふやすと ${RU.en}に ちかづく`, n === 6 ? '正六角形に戻したよ' : `正${n}角形。まわりは直径の${num(r2(polyIn(n, 1)))}倍`);
      ctx.log('compare', { detail: { key: 'more', n } });
    });
    say('ボタンを おして、えんを はさんで みよう', 'ボタンを押して、円をはさんでみよう');
    api.test = { state: () => ({ shown: [...shown] }), auto: () => (['hex', 'sq', 'en'].every(k => shown.has(k)) ? { done: true } : { click: `data-k=${['hex', 'sq', 'en'].find(k => !shown.has(k))}|` }) };
    return api;
  }

  /* ======================= つくる：えんしゅうりつを みつけよう ======================= */
  if (mode === 'ratio') {
    const list = all.filter(c => c.d <= 80), got = new Map(); let L = null, busy = false;
    const build = () => {
      F.clearLayers(); const A = area();
      const gx = A.land ? A.x0 + A.w * 0.5 : A.x0 + 40, gw = A.land ? A.w * 0.46 : A.w - 54, gy = A.land ? A.y0 + 10 : A.y0 + A.h * 0.36, gh = A.land ? A.h - 46 : A.h * 0.64 - 34;
      L = { A, gx, gy, gw, gh, sx: A.land ? A.x0 + 10 : A.x0 + 10, sy: A.y0 + 6, sw: A.land ? A.w * 0.44 : A.w - 20, sh: A.land ? A.h - 10 : A.h * 0.34 - 10 };
      drawGraph(); drawTable();
    };
    const dMax = 80, cMax = 260;
    const gp = (d, c) => [L.gx + L.gw * d / dMax, L.gy + L.gh - L.gh * c / cMax];
    const drawGraph = () => {
      const g = F.layer('g'); clear(g);
      line(g, L.gx, L.gy + L.gh, L.gx + L.gw, L.gy + L.gh, { stroke: C('ink'), 'stroke-width': 2 }); line(g, L.gx, L.gy, L.gx, L.gy + L.gh, { stroke: C('ink'), 'stroke-width': 2 });
      for (let d = 20; d <= dMax; d += 20) { const [x] = gp(d, 0); line(g, x, L.gy + L.gh, x, L.gy + L.gh + 6, { stroke: C('ink') }); txt(g, x, L.gy + L.gh + 22, String(d), { 'font-size': 13, class: 'ui', fill: C('ink-soft') }); }
      for (let c = 50; c <= cMax; c += 50) { const [, y] = gp(0, c); line(g, L.gx - 6, y, L.gx, y, { stroke: C('ink') }); txt(g, L.gx - 9, y + 5, String(c), { 'font-size': 13, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' }); }
      txt(g, L.gx + L.gw, L.gy + L.gh - 8, 'ちょっけい（cm）', { 'font-size': 13, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'end' });
      txt(g, L.gx + 6, L.gy + 12, 'えんしゅう（cm）', { 'font-size': 13, class: 'ui', fill: C('ink-soft'), 'text-anchor': 'start' });
      if (got.size >= 4) { const [x1, y1] = gp(0, 0), [x2, y2] = gp(dMax, dMax * 3.14); const ln = line(g, x1, y1, x2, Math.max(L.gy, y2), { stroke: C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }); txt(g, x2 - 4, Math.max(L.gy, y2) + 20, '× 3.14', { 'font-size': 16, class: 'ui', fill: C('ok'), 'text-anchor': 'end', 'font-weight': 900 }); }
      for (const c of got.values()) { const [x, y] = gp(c.d, c.c); circle(g, x, y, 7, { fill: C('face-1'), stroke: C('paper'), 'stroke-width': 2 }); }
    };
    const drawTable = () => {
      const g = F.layer('tb'); clear(g); if (L.A.land) {
        const x = L.sx, y = L.sy + L.sh * 0.52, rows = [...got.values()];
        txt(g, x, y, 'ちょっけい　えんしゅう　えんしゅう÷ちょっけい', { 'font-size': 14, class: 'ui', 'text-anchor': 'start', fill: C('ink-soft') });
        rows.forEach((c, i) => txt(g, x, y + 26 + i * 24, `${cmTxt(c.d)}　　${cmTxt(c.c)}　　${num(c.ratio)}`, { 'font-size': 16, class: 'ui', 'text-anchor': 'start', fill: C('ink') }));
      }
    };
    F.onResize(build); build();
    panel.innerHTML = `<div class="chips">${list.map(c => `<button type="button" class="chip" data-en="${c.id}">${c.name}</button>`).join('')}</div>`;
    $$p(panel, '[data-en]').forEach(b => on(b, 'click', async () => {
      const c = list.find(x => x.id === b.dataset.en); sfx.tap();
      if (busy) { ctx.toast('', 'いま ころがして いるよ。まってね', 1.6); return; }
      if (got.has(c.id)) { ctx.toast('', `${c.name}は もう はかったよ（${RU.en} やく ${cmTxt(c.c)}）`, 2, `もう測ったよ`); return; }
      busy = true; const tag = S.token, g = F.layer('roll'); clear(g);
      const r = Math.max(8, Math.min(L.sh * 0.32, (L.sw - 30) / (2 * Math.PI + 1.4)) * (0.35 + 0.65 * c.d / dMax));
      const w = makeWheel(g, { x0: L.sx + 4 + r, base: L.sy + Math.min(L.sh * 0.45, r * 2 + 16), r });
      say(`${c.name}を ころがすと…`, `${c.name}を転がすと`);
      await tween(1.4, k => w.set(w.full() * k), E.io); if (!alive(tag)) return;
      busy = false; got.set(c.id, c); b.classList.add('picked'); ctx.register('en', c.id);
      ctx.log('ratio-step', { detail: { id: c.id, d: c.d, c: c.c, ratio: c.ratio } });
      drawGraph(); drawTable();
      say(`${RU.en} ${cmTxt(c.c)} ÷ ${RU.choku} ${cmTxt(c.d)} ＝ <b>${num(c.ratio)}</b>`, `円周わる直径は${num(c.ratio)}`);
      if (got.size === 4) {
        sfx.good(); const [x, y] = gp(dMax * 0.6, dMax * 0.6 * 3.14); hanamaru(F.svg, x, y, 40);
        ctx.log('ratio', { correct: true, detail: { n: got.size } }); ctx.done('ratio');
        setTimeout(() => alive(tag) && ctx.toast(ICON.HANAMARU, `てんが まっすぐ ならんだ！ ${RU.en} ÷ ${RU.choku} は いつも やく 3.14。${RU.ritsu}`, 3.4, '点がまっすぐ並んだ。円周わる直径はいつも約3.14。円周率'), 1400);
      }
    }));
    say(`えんを えらんで ころがそう。${RU.en} ÷ ${RU.choku} は どう なる？`, '円を選んで転がそう。円周わる直径はどうなる？');
    api.test = { state: () => ({ got: got.size, busy }), auto: () => (busy ? { wait: 300 } : got.size >= 4 ? { done: true } : { click: `data-en=${list.find(c => !got.has(c.id)).id}|` }) };
    return api;
  }
  return api;
}
const unitSp = v => (v >= 100 ? `${num(r2(v / 100))}メートル` : `${num(v)}センチメートル`);

// 直径をもとにした長さの帯（直径の 0〜4ばい の目もり）：put（すぐ）・grow（のびる）
export function barsSet(g, { x, y, unit }) {
  clear(g);
  const rowH = 40;
  for (let k = 0; k <= 4; k++) { line(g, x + k * unit, y - 8, x + k * unit, y + 3 * rowH - 10, { stroke: C('line'), 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }); txt(g, x + k * unit, y + 3 * rowH + 8, k === 0 ? '0' : `${k}ばい`, { 'font-size': 13, class: 'ui', fill: C('ink-soft') }); }
  const mk = (i, v, col, lab, k = 1) => { const yy = y + i * rowH; const r = rect(g, x, yy, Math.max(0, unit * v * k), 16, { rx: 6, fill: col }); const t = txt(g, x + 4, yy - 4, lab, { 'font-size': 13, class: 'ui', 'text-anchor': 'start', fill: C('ink') }); return { r, t }; };
  return {
    put(i, v, col, lab) { mk(i, v, col, lab); },
    async grow(i, v, col, lab) { const o = mk(i, v, col, lab, 0); await tween(1.1, k => o.r.setAttribute('width', Math.max(0, unit * v * k)), E.io); },
  };
}
