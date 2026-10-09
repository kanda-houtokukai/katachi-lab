// たんいの しくみ（U3・K2・O3）：k（1000ばい）と m（1000ぶんの1）を、長さ・かさ・重さで おなじ ズームの 動きで見せる。
// 見本 v1（reference/hakaru-mock-src/70-units.js）を移したもの。k：10こ ならべて 1つに まとめる（3かい）。m：10に わけて 1つを ひろげる（3かい）。
// opts.mode：miru｜zoom（さわる。opts.only：['naga','kasa','omo'] の一部、opts.md：k｜m）｜table（単位の表に カードを置く。kL・mg は しょうかい）｜find（つくる：たんい ずかん）
import { el, C, txt, rect, line, circle, path, clear, wait, tween, lerp, E, tapOf, hanamaru } from './_flat.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { monoSVG, contSVG } from './_mono.js';
import { bench } from '../core/bench.js';
import { unitSpeech, fmtLen } from '../core/yomi.js';
import { QS, TABLE, FIND } from './_tani-gen.js';
export { QS, TABLE, FIND };

// 3つの 量の 絵（段 lv＝0〜3、md＝k｜m）
function icon(g, q, lv, s, md, label = true) {
  const col = C(q.color);
  let h = '';
  const R = (x, y, w, hh, a) => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, hh)}" ${a}/>`;
  if (q.id === 'naga') {
    const w = s, hh = s * 0.22;
    h += R(-w / 2, -hh / 2, w, hh, `rx="3" fill="${C('tape')}" stroke="${C('tape-line')}" stroke-width="1.5"`);
    for (let i = 0; i <= 10; i++) h += `<line x1="${-w / 2 + w * i / 10}" y1="${-hh / 2}" x2="${-w / 2 + w * i / 10}" y2="${-hh / 2 + hh * (i % 5 ? 0.35 : 0.55)}" stroke="${C('wood-dark')}" stroke-width="1"/>`;
    if (md === 'm' && lv === 3) h += `<line x1="0" y1="${-hh * 1.2}" x2="0" y2="${hh * 1.2}" stroke="${col}" stroke-width="3"/>`;
    if (md === 'k' && lv === 3) h += `<path d="M${-w / 2},${hh * 0.9}Q0,${hh * 2.2} ${w / 2},${hh * 0.9}" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  } else if (q.id === 'kasa') {
    if (md === 'k' && lv === 1) h += `<path d="M${-s * 0.32},${-s * 0.3}H${s * 0.32}L${s * 0.25},${s * 0.3}H${-s * 0.25}Z" fill="${C('water')}" stroke="${C('water-deep')}" stroke-width="2"/>`;
    else if (md === 'k' && lv === 2) h += R(-s * 0.5, -s * 0.22, s, s * 0.44, `rx="${s * 0.12}" fill="${C('water')}" stroke="${C('water-deep')}" stroke-width="2"`);
    else if (md === 'k' && lv === 3) { const a = s * 0.36; h += `<path d="M0,${-a}L${a * 1.1},${-a * 0.45}V${a * 0.7}L0,${a * 1.25}L${-a * 1.1},${a * 0.7}V${-a * 0.45}Z" fill="${C('water')}" stroke="${C('water-deep')}" stroke-width="2"/><path d="M${-a * 1.1},${-a * 0.45}L0,${a * 0.1}L${a * 1.1},${-a * 0.45}M0,${a * 0.1}V${a * 1.25}" fill="none" stroke="${C('water-deep')}" stroke-width="2"/>`; }
    else if (md === 'm' && lv === 3) h += `<path d="M0,${-s * 0.3}C${s * 0.2},${-s * 0.05} ${s * 0.22},${s * 0.12} 0,${s * 0.25}C${-s * 0.22},${s * 0.12} ${-s * 0.2},${-s * 0.05} 0,${-s * 0.3}Z" fill="${C('water')}"/>`;
    else h += R(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6, `rx="4" fill="${C('glass')}" stroke="${C('masu-edge')}" stroke-width="2"`) + R(-s * 0.28, -s * 0.05, s * 0.56, s * 0.33, `fill="${C('water')}"`);
  } else {
    if (md === 'k' && lv === 1) for (let i = 0; i < 6; i++) h += `<ellipse cx="0" cy="${s * 0.2 - i * s * 0.07}" rx="${s * 0.26}" ry="${s * 0.08}" fill="${C('coin')}" stroke="${C('coin-line')}" stroke-width="1.2"/>`;
    else if (md === 'k' && lv >= 2) { const b = lv === 3 ? s * 0.5 : s * 0.36; h += `<path d="M${-b * 0.7},${-b * 0.55}Q0,${-b * 0.85} ${b * 0.7},${-b * 0.55}L${b * 0.9},${b * 0.6}Q0,${b * 0.8} ${-b * 0.9},${b * 0.6}Z" fill="${C('wood-pale')}" stroke="${C('wood-deep')}" stroke-width="2"/><path d="M${-b * 0.3},${-b * 0.7}Q0,${-b * 1} ${b * 0.3},${-b * 0.7}" fill="none" stroke="${C('wood-deep')}" stroke-width="3"/>`; }
    else if (md === 'm' && lv === 3) h += `<ellipse cx="0" cy="0" rx="${s * 0.2}" ry="${s * 0.1}" fill="${C('paper-2')}" stroke="${C('wood')}" stroke-width="2"/>`;
    else if (md === 'm' && (lv === 1 || lv === 2)) h += `<circle cx="0" cy="0" r="${s * 0.3 * (lv === 1 ? 0.6 : 0.36)}" fill="${C('coin')}" stroke="${C('coin-line')}" stroke-width="2" stroke-dasharray="3 3"/>`;
    else h += `<circle cx="0" cy="0" r="${s * 0.3}" fill="${C('coin')}" stroke="${C('coin-line')}" stroke-width="2"/><text x="0" y="${s * 0.1}" text-anchor="middle" font-size="${s * 0.28}" font-weight="700" fill="${C('ink-soft')}">1</text>`;
  }
  const lab = (md === 'k' ? q.k : q.m)[lv];
  if (label && lab) h += `<text x="0" y="${s * 0.62 + 14}" text-anchor="middle" font-size="${Math.max(18, s * 0.2)}" font-weight="700" fill="${C('ink')}" font-family="Zen Maru Gothic,sans-serif">${lab}</text>`;
  g.innerHTML = h;
}

// 3つの 列の 舞台（U3 の みる・さわる、ためすの 答え合わせ）
export function zoomScene(F, ctx, only) {
  const z = { mode: 'k', step: 0, cols: [], busy: false };
  const qs = only ? QS.filter(q => only.includes(q.id)) : QS;
  let root = null;
  z.layout = () => {
    root = F.layer('zoom'); clear(root);
    const top = F.top + F.cap + (F.W < 500 ? 24 : 0), H = F.bottom - top - 6, W = F.W, land = W >= 640 && qs.length > 1, n = qs.length;
    z.cols = qs.map((q, i) => {
      const box = land ? { x: 16 + i * (W - 32) / n, y: top, w: (W - 32) / n, h: H } : { x: 16, y: top + i * H / n, w: W - 32, h: H / n - 4 };
      const g = el('g', {}, root);
      rect(g, box.x + 6, box.y, box.w - 12, box.h, { rx: 18, fill: C('paper'), stroke: C('line'), 'stroke-width': 2 });
      rect(g, box.x + 18, box.y + 10, 82, 28, { rx: 9, fill: C(q.color) }); txt(g, box.x + 59, box.y + 30, q.name, { 'font-size': 16, fill: C('paper') });
      const s = Math.min(box.w * 0.42, box.h * (land ? 0.42 : 0.5), 150);
      const stage = el('g', {}, g), cx = box.x + box.w / 2, cy = box.y + box.h * (land ? 0.45 : 0.52);
      const eq = txt(g, cx, box.y + box.h - 14, '', { 'font-size': Math.max(16, Math.min(26, box.w * 0.08)), fill: C(q.color), class: 'ui' });
      const cnt = txt(g, box.x + box.w - 22, box.y + 32, '', { 'font-size': 20, fill: C('ink-soft'), class: 'ui', 'text-anchor': 'end' });
      return { q, box, g, stage, cx, cy, s, eq, cnt, land };
    });
    z.paint();
  };
  z.paint = () => { for (const c of z.cols) { clear(c.stage); const g = el('g', { transform: `translate(${c.cx},${c.cy})` }, c.stage); icon(g, c.q, z.step, c.s, z.mode); c.eq.textContent = z.step === 3 ? (z.mode === 'k' ? c.q.kEq : c.q.mEq) : ''; c.cnt.textContent = ''; } };
  const slots = c => {
    const out = [];
    if (c.q.id === 'naga') { const w = Math.min(c.s * 0.9, (c.box.w - 40) / 10); for (let i = 0; i < 10; i++) out.push({ x: c.cx - 4.5 * w + i * w, y: c.cy, sc: w / c.s, sy: Math.min(1, w / c.s * 2.6), alt: i % 2 }); }
    else { const sp = Math.min((c.box.w - 40) / 5, c.box.h * 0.3), sc = Math.min(0.42, sp / c.s * 0.95); for (let i = 0; i < 10; i++) out.push({ x: c.cx + ((i % 5) - 2) * sp, y: c.cy + (Math.floor(i / 5) - 0.5) * sp * 1.05, sc }); }
    return out;
  };
  // 1だん すすめる（only：列の番号）
  z.doStep = async (only2, fast) => {
    if (z.step >= 3) return;
    const tag = S.token, f = fast ? 0.45 : 1, which = only2 != null ? [z.cols[only2]] : z.cols;
    const groups = which.map(c => { clear(c.stage); return { c, all: el('g', {}, c.stage), sl: slots(c), items: [] }; });
    if (z.mode === 'k') {
      for (let i = 0; i < 10; i++) {
        for (const G of groups) { const p = G.sl[i], g = el('g', { transform: `translate(${p.x},${p.y}) scale(${p.sc},${p.sy || p.sc})` }, G.all); icon(g, G.c.q, z.step, G.c.s, 'k', false); G.items.push(g); G.c.cnt.textContent = `×${i + 1}`; }
        ctx.sfx.tick(i); if (!(await wait(0.11 * f)) || !alive(tag)) return;
      }
      if (!(await wait(0.4 * f)) || !alive(tag)) return;
      await tween(0.65 * f, e => { for (const G of groups) G.items.forEach((g, i) => { const p = G.sl[i]; g.setAttribute('transform', `translate(${lerp(p.x, G.c.cx, e)},${lerp(p.y, G.c.cy, e)}) scale(${p.sc * (1 - e * 0.7)},${(p.sy || p.sc) * (1 - e * 0.7)})`); g.setAttribute('opacity', 1 - e); }); });
      if (!alive(tag)) return;
      z.step++;
      for (const G of groups) { clear(G.c.stage); G.g2 = el('g', { transform: `translate(${G.c.cx},${G.c.cy}) scale(0.4)` }, G.c.stage); icon(G.g2, G.c.q, z.step, G.c.s, 'k'); }
      await tween(0.38 * f, e => { for (const G of groups) G.g2.setAttribute('transform', `translate(${G.c.cx},${G.c.cy}) scale(${Math.max(0.01, 0.4 + 0.6 * E.back(e))})`); });
    } else {
      for (const G of groups) { G.big = el('g', { transform: `translate(${G.c.cx},${G.c.cy})` }, G.all); icon(G.big, G.c.q, z.step, G.c.s, 'm'); }
      if (!(await wait(0.25 * f)) || !alive(tag)) return;
      await tween(0.45 * f, e => { for (const G of groups) G.big.setAttribute('opacity', 1 - e); });
      for (let i = 0; i < 10; i++) { for (const G of groups) { const p = G.sl[i], g = el('g', { transform: `translate(${p.x},${p.y}) scale(${p.sc},${p.sy || p.sc})` }, G.all); icon(g, G.c.q, z.step, G.c.s, 'm', false); G.items.push(g); G.c.cnt.textContent = `${i + 1}/10`; } ctx.sfx.tick(i); if (!(await wait(0.07 * f)) || !alive(tag)) return; }
      if (!(await wait(0.35 * f)) || !alive(tag)) return;
      await tween(0.65 * f, e => { for (const G of groups) G.items.forEach((g, i) => { const p = G.sl[i]; if (i === 0) g.setAttribute('transform', `translate(${lerp(p.x, G.c.cx, e)},${lerp(p.y, G.c.cy, e)}) scale(${lerp(p.sc, 1, e)},${lerp(p.sy || p.sc, 1, e)})`); else g.setAttribute('opacity', 1 - e); }); });
      if (!alive(tag)) return;
      z.step++;
    }
    for (const G of groups) { clear(G.c.stage); const g = el('g', { transform: `translate(${G.c.cx},${G.c.cy})` }, G.c.stage); icon(g, G.c.q, z.step, G.c.s, z.mode); G.c.cnt.textContent = ''; G.c.eq.textContent = z.step === 3 ? (z.mode === 'k' ? G.c.q.kEq : G.c.q.mEq) : ''; }
  };
  F.onResize(() => z.layout());
  z.layout();
  return z;
}

const findIcon = (id, s) => (['pet500', 'cup'].includes(id) ? contSVG(id, s) : monoSVG(id, s));

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'zoom';
  const F = ctx.openFlat();
  const say = (h, s) => ctx.caption(h, 0, s || null);
  const api = { dispose() {}, test: {} };

  /* ---------- みる ---------- */
  if (mode === 'miru') {
    const z = zoomScene(F, ctx, opts.only);
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', runId = 0;
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const my = ++runId, tag = S.token; phase = 'play';
      const ok = () => alive(tag) && my === runId, w = async s => (await wait(s)) && ok();
      for (let k = 0; k < 60 && z.busy; k++) await wait(0.1);
      z.busy = true;
      for (const md of ['k', 'm']) {
        z.mode = md; z.step = 0; z.paint();
        say(md === 'k' ? '10こ あつめると つぎの たんいへ' : '10に わけて 1つを ちかくで みる', md === 'k' ? '10個集めると、次の単位へ' : '10に分けて、1つを近くで見る'); if (!(await w(1.6))) { z.busy = false; return; }
        for (let i = 0; i < 3; i++) { await z.doStep(); if (!ok()) { z.busy = false; return; } if (!(await w(0.5))) { z.busy = false; return; } }
        say(md === 'k' ? '<b>k（キロ）</b>が つくと <b>1000ばい</b>。ながさも かさも おもさも おなじ' : '<b>m（ミリ）</b>が つくと <b>1000ぶんの1</b>。これも 3つ おなじ', md === 'k' ? 'キロがつくと1000倍。長さも、かさも、重さも同じ' : 'ミリがつくと1000分の1。これも3つ同じ');
        if (!(await w(3.6))) { z.busy = false; return; }
      }
      z.busy = false; say('つぎは「さわる」で たんいの ひょうを つくろう', '次は「さわる」で、単位の表をつくろう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------- さわる：10ずつ あつめる・わける ---------- */
  if (mode === 'zoom') {
    const z = zoomScene(F, ctx, opts.only);
    z.mode = opts.md || 'k'; z.paint();
    let full = 0;
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="k と m"><button type="button" data-md="k" aria-pressed="${z.mode === 'k'}">k（キロ）</button><button type="button" data-md="m" aria-pressed="${z.mode === 'm'}">m（ミリ）</button></div><button class="btn" type="button" data-k="step"></button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.again} はじめから</button></div>`;
    const sb = $p(panel, '[data-k="step"]');
    const label = () => { sb.textContent = z.mode === 'k' ? '10こ あつめる' : '10に わける'; };
    const hello = () => say(z.mode === 'k' ? 'ボタンで 10こずつ あつめよう' : 'ボタンで 10に わけよう', z.mode === 'k' ? 'ボタンで10個ずつ集めよう' : 'ボタンで10に分けよう');
    label(); hello();
    on(sb, 'click', async () => {
      sfx.tap();
      if (z.busy) { ctx.toast('', 'うごきが おわるまで まってね', 1.4); return; }
      if (z.step >= 3) { ctx.toast('', z.mode === 'k' ? '<b>1000ばい</b>に なったよ。「はじめから」で もういちど' : '<b>1000ぶんの1</b>に なったよ。「はじめから」で もういちど', 2); return; }
      z.busy = true; const tag = S.token; ctx.hideHud();
      await z.doStep(); z.busy = false; if (!alive(tag)) return;
      const labs = z.cols.map(c => (z.mode === 'k' ? c.q.k : c.q.m)[z.step]).filter(Boolean).join('・');
      if (labs) say(`<b>${labs}</b>`, unitSpeech(labs));
      if (z.step === 3) { full++; say(z.mode === 'k' ? '<b>k（キロ）</b>が つくと <b>1000ばい</b>' : '<b>m（ミリ）</b>が つくと <b>1000ぶんの1</b>', z.mode === 'k' ? 'キロがつくと1000倍' : 'ミリがつくと1000分の1'); ctx.log('zoom', { detail: { md: z.mode, only: (opts.only || []).join(',') } }); }
    });
    $$p(panel, '[data-md]').forEach(b => on(b, 'click', () => {
      sfx.tap(); if (b.dataset.md === z.mode) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; }
      if (z.busy) { ctx.toast('', `うごきが おわったら「${b.textContent}」に しよう`, 1.6); return; }
      z.mode = b.dataset.md; z.step = 0; z.paint(); label(); hello(); $$p(panel, '[data-md]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.md === z.mode)));
    }));
    on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); if (z.busy) { ctx.toast('', 'うごきが おわったら もどそう', 1.4); return; } if (!z.step) { ctx.toast('', 'いまは はじめの ところだよ', 1.4); return; } z.step = 0; z.paint(); hello(); });
    api.test = { state: () => ({ step: z.step, mode: z.mode, full, busy: z.busy }), auto: () => (full >= 1 ? { done: true } : z.busy ? { wait: 300 } : z.step >= 3 ? { click: 'data-k=reset|' } : { click: 'data-k=step|' }) };
    return api;
  }

  /* ---------- さわる：単位の表 ---------- */
  if (mode === 'table') {
    const cards = TABLE.rows.flatMap(r => r.cells.filter(Boolean));
    const placed = new Set(); let sel = null, L = {};
    panel.innerHTML = `<div class="chips">${cards.map(u => `<button type="button" class="chip" data-card="${u}" aria-pressed="false">${u}${TABLE.intro.includes(u) ? ' <small>しょうかい</small>' : ''}</button>`).join('')}</div>`;
    const g = F.layer('table');
    function draw() {
      clear(g); const top = F.top + F.cap + 4 + (F.W < 500 ? 24 : 0), W = F.W, H = F.bottom - top - 8, land = W >= 640;
      const nameW = land ? 90 : 56, cw = (W - 24 - nameW) / 7, rh = Math.min(land ? 96 : 74, (H - 40) / 3), x0 = 12 + nameW, y0 = top + 34;
      L = { x0, y0, cw, rh, cells: [] };
      TABLE.cols.forEach((c, i) => txt(g, x0 + i * cw + cw / 2, top + 22, land ? c : c.replace('ぶんの', '/').replace('ばい', 'ばい'), { 'font-size': land ? 14 : 10, fill: i === 0 || i === 6 ? C('ok') : C('ink-soft') }));
      TABLE.rows.forEach((r, j) => {
        const y = y0 + j * rh, q = QS.find(x => x.id === r.id);
        rect(g, 12, y + 4, nameW - 8, rh - 8, { rx: 10, fill: C(q.color) }); txt(g, 12 + (nameW - 8) / 2, y + rh / 2 + 6, r.name, { 'font-size': land ? 16 : 12, fill: C('paper') });
        r.cells.forEach((u, i) => {
          const x = x0 + i * cw, cell = rect(g, x + 3, y + 4, cw - 6, rh - 8, { rx: 10, fill: u ? (placed.has(u) ? C('pick-bg') : C('paper')) : C('paper-2'), stroke: u && sel && sel === u ? C('yamabuki') : C('line'), 'stroke-width': u && sel === u ? 3 : 1.5, 'stroke-dasharray': u ? '' : '4 4', style: u ? 'cursor:pointer' : '' });
          if (u && placed.has(u)) txt(g, x + cw / 2, y + rh / 2 + 8, u, { 'font-size': Math.min(26, cw * 0.4), fill: TABLE.intro.includes(u) ? C('ink-soft') : C('ink'), class: 'ui' });
          L.cells.push({ u, x: x + cw / 2, y: y + rh / 2, row: r.id, i });
          cell.addEventListener('pointerdown', e => { e.stopPropagation(); tapCell(u, i, r.id); });
        });
      });
      // 1000ばいの 矢印
      if (placed.size >= 6) { const y = y0 + 3 * rh + 6; line(g, x0 + cw * 0.5, y, x0 + cw * 3.5, y, { stroke: C('ok'), 'stroke-width': 2.5 }); txt(g, x0 + cw * 2, y + 18, '×1000（k）', { 'font-size': 14, fill: C('ok'), class: 'ui' }); line(g, x0 + cw * 3.5, y, x0 + cw * 6.5, y, { stroke: C('sora'), 'stroke-width': 2.5 }); txt(g, x0 + cw * 5, y + 18, '1000ぶんの1（m）', { 'font-size': 14, fill: C('sora'), class: 'ui' }); }
    }
    function tapCell(u, i, row) {
      if (!sel) { sfx.off(); ctx.toast('', 'さきに したの カードを えらんでね', 1.6); return; }
      if (u === sel) {
        placed.add(sel); ctx.register('u3-tani', sel); sfx.pop();
        const intro = TABLE.intro.includes(sel);
        say(intro ? `<b>${sel}</b>は しょうかい。${sel === 'kL' ? 'プールの みずの かさで つかう' : 'くすりの おもさで つかう'}` : `<b>${sel}</b>は ここ`, unitSpeech(`1${sel}`).slice(1) + (intro ? '。紹介' : ''));
        $$p(panel, `[data-card="${sel}"]`).forEach(b => { b.classList.add('picked'); b.setAttribute('aria-pressed', 'false'); });
        sel = null; draw();
        if (placed.size === cards.length) { sfx.good(); hanamaru(F.svg, F.W / 2, L.y0 + L.rh * 1.5, Math.min(F.W, 300) * 0.25); ctx.toast(ICON.HANAMARU, 'ひょうが できた！ k は 1000ばい、m は 1000ぶんの1。どの りょうも おなじ しくみ', 3.4, 'キロは1000倍、ミリは1000分の1。どの量も同じしくみ'); ctx.log('table', { correct: true, detail: { n: placed.size } }); ctx.done('table'); }
      } else { sfx.bad(); ctx.toast(ICON.X, u ? `そこは <b>${u}</b>の ばしょ` : 'そこには いれる たんいが ないよ', 1.8); ctx.log('table', { correct: false, detail: { card: sel, at: `${row}:${i}`, mistake: 'W5' } }); }
    }
    $$p(panel, '[data-card]').forEach(b => on(b, 'click', () => {
      sfx.tap(); const u = b.dataset.card;
      if (placed.has(u)) { ctx.toast('', `<b>${u}</b>は もう ひょうに あるよ`, 1.6); return; }
      if (sel === u) { ctx.toast('', `いまは「${u}」だよ`, 1.6); return; }
      sel = u; $$p(panel, '[data-card]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.card === u))); draw();
      say(`<b>${u}</b>は ひょうの どこ？`, unitSpeech(`1${u}`).slice(1) + 'は表のどこ？');
    }));
    F.onResize(draw); draw();
    say('カードを えらんで、ひょうの ばしょを タッチしよう', 'カードを選んで、表の場所をタッチしよう');
    api.test = {
      state: () => ({ placed: placed.size, sel }),
      auto() {
        if (placed.size === cards.length) return { done: true };
        if (!sel) { const u = cards.find(c => !placed.has(c)); return { click: `data-card=${u}|` }; }
        const c = L.cells.find(x => x.u === sel); return tapOf(F, c.x, c.y);
      },
    };
    return api;
  }

  /* ---------- つくる：たんい ずかん（身の回りで みつける） ---------- */
  if (mode === 'find') {
    const coll = opts.coll || 'u3-tani';
    const found = () => new Set(ctx.zukanList(coll));
    let L = [];
    panel.innerHTML = `<div class="status" data-k="st"></div>`;
    const g = F.layer('find');
    const status = () => { $p(panel, '[data-k="st"]').innerHTML = `みつけた たんい <b>${FIND.filter(f => found().has(f.u)).length}</b> / ${FIND.length}`; };
    function draw() {
      clear(g); const top = F.top + F.cap + 4 + (F.W < 500 ? 24 : 0), W = F.W, H = F.bottom - top - 6, cols = W >= 640 ? 6 : 3, rows = Math.ceil(FIND.length / cols), cw = (W - 24) / cols, ch = H / rows;
      const f = found(); L = [];
      FIND.forEach((it, i) => {
        const b = bench(it.id) || {}, x = 12 + (i % cols) * cw, y = top + Math.floor(i / cols) * ch, s = Math.min(cw * 0.46, ch * 0.46);
        const cg = el('g', { style: 'cursor:pointer' }, g);
        rect(cg, x + 4, y + 4, cw - 8, ch - 8, { rx: 14, fill: f.has(it.u) ? C('pick-bg') : C('paper'), stroke: C('line'), 'stroke-width': 2 });
        const ig = el('g', { transform: `translate(${x + cw / 2},${y + ch * 0.58})` }, cg); ig.innerHTML = findIcon(it.id, s);
        if (f.has(it.u)) { rect(cg, x + cw / 2 - Math.min(cw * 0.4, 60), y + 10, Math.min(cw * 0.8, 120), 26, { rx: 8, fill: C('yamabuki') }); txt(cg, x + cw / 2, y + 29, it.f(b), { 'font-size': 16, fill: C('ink'), class: 'ui' }); }
        else txt(cg, x + cw / 2, y + 29, '？', { 'font-size': 18, fill: C('ink-soft') });
        txt(cg, x + cw / 2, y + ch - 14, (b.name || '').replace(/（.*）/, ''), { 'font-size': Math.max(10, Math.min(14, cw * 0.1)), fill: C('ink-soft') });
        L.push({ it, x: x + cw / 2, y: y + ch / 2 });
        cg.addEventListener('pointerdown', e => { e.stopPropagation(); tapIt(it); });
      });
      status();
    }
    function tapIt(it) {
      const b = bench(it.id) || {}, v = it.f(b);
      if (found().has(it.u)) { ctx.toast('', `<b>${it.u}</b>は もう みつけたよ`, 1.4); return; }
      sfx.pop(); ctx.register(coll, it.u); draw();
      say(`${(b.name || '').replace(/（.*）/, '')}${it.w ? 'の ' + it.w : ''}は ${b.approx ? 'やく ' : ''}<b>${v}</b>。たんいは <b>${it.u}</b>`, unitSpeech(`${(b.name || '').replace(/（.*）/, '')}は${b.approx ? '約' : ''}${v}`));
      ctx.log('find', { detail: { u: it.u, id: it.id } });
      if (FIND.every(f => found().has(f.u))) { sfx.good(); ctx.toast(ICON.HANAMARU, 'たんいを ぜんぶ みつけた！', 3); ctx.done('tani'); }
    }
    F.onResize(draw); draw();
    say('みの まわりの ものを タッチして、たんいを みつけよう', '身の回りの物をタッチして、単位を見つけよう');
    api.test = { state: () => ({ n: found().size }), auto() { const f = found(), it = L.find(x => !f.has(x.it.u)); return it ? tapOf(F, it.x, it.y) : { done: true }; } };
    return api;
  }
  void circle; void path; void fmtLen;
  return api;
}
