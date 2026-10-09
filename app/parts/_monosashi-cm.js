// monosashi・cm と mm（N2）：実寸の ものさし。目もりは ppm（1mm あたりの CSS px。がめんの ながさ あわせ の値）で描く。
// 合わせていない端末では「じっすんでは ない」の札を出す。本物を測る活動は、合わせ方の案内から始める。
// mode：miru（みる）｜ruler（さわる：じっすん ものさし）｜zero（さわる：0から はかる）｜estimate（ためす：線の みとおし）｜draw（つくる：ちょくせんを ひく）｜find10（つくる：10cm さがし）
// 記録：miru・measure・real・zero・estimate（＋estimate-done）・draw・find10。ずかん mono（物）・mine（ほんものを はかった きろく）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, tapOf, pathOf, hanamaru } from './_flat.js';
import { thing, ruler, overhang, badge, lens, nofitLayer, realBadge, NAMES, thingIcon } from './_nagasa.js';
import { cmmm, rulerFit, rulerW, mmAt, rnd, pickR, shuffleR, MONO_IDS } from './_nagasa-gen.js';
import { ppm as getPpm, calibrated } from '../core/calibrate.js';
import { bench, yaku } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on, levelSeg, starsHTML } from './_common.js';

// 物の 本当の太さ（mm）。画面では 上の余白に入るよう ちぢめる
const REAL_H = { coin1: 20, clip: 8, eraser: 22, card: 54, 'hagaki-w': 70, hagaki: 60, pencil: 7, tissue: 60, notebook: 80 };
const DRAW_ID = { coin1: 'coin', 'hagaki-w': 'hagaki' };
const spLen = mm => unitSpeech(cmmm(mm)).replace(/ /g, '');
const bname0 = id => (bench(id) || {}).name || NAMES[id] || id;
// はがきは たて・よこ を残す（2つ あるため）
const bname = id => (/^hagaki/.test(id) ? bname0(id).replace('（', ' ').replace('）', '') : bname0(id));

export function mountCm(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'ruler';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  let P = getPpm(), cal = calibrated();
  const G = {};
  // 実寸の場所：ものさしの cm 数・左はし・上のへり
  function geom(extra = {}) {
    P = getPpm(); cal = calibrated();
    const cm = rulerFit(F.W, P, 16, extra.max || 30, 3), w = rulerW(cm, P), h = clamp(12 * P, 40, 72);
    const top = F.top + F.cap + 10, bot = F.bottom - 40;
    const ry = extra.ry != null ? extra.ry : top + (bot - top) * (extra.yk ?? 0.58) - h / 2;
    return { cm, w, h, top, bot, ry, rx: (F.W - w) / 2 };
  }
  let g = geom();
  const objH = id => Math.min((REAL_H[id] || 10) * P, Math.max(14, (g.ry - g.top) * 0.62));
  function badgeCal() { realBadge(F.layer('badge'), F, cal, () => ctx.openCalib(() => { redraw(); ctx.caption(calibrated() ? 'がめんの ながさを あわせたよ。<b>じっすん</b>で はかれる' : 'じっすんでは ないけれど、はかりかたは おなじ', 0); })); }
  let redraw = () => {};
  // 合わせ方の案内（本物を測る活動のはじめ）
  function guideRow() { return cal ? '' : `<div class="row" data-k="guide"><button class="btn" type="button" data-k="calib">がめんの ながさ あわせ</button></div>`; }
  function bindGuide(after) { on($p(panel, '[data-k="calib"]'), 'click', () => ctx.openCalib(() => { redraw(); after && after(); })); }

  /* ---------------- みる：だれが はかっても おなじ 1cm ---------------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play';
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    const st = { L: 96, rulerA: 0, lens: false, rows: [], blocks: 0 };
    redraw = () => {
      g = geom({ yk: 0.5 }); st.L = Math.min(96, (g.cm - 1) * 10 + 6);
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const R = ruler(W, { x: g.rx, y: g.ry, cm: g.cm, ppm: P, h: g.h }); R.g.setAttribute('opacity', st.rulerA);
      g.z = R.zeroX;
      thing(W, 'pencil', R.zeroX, g.ry - 2, st.L * P, { h: Math.max(6, 7 * P) });
      st.rows.forEach((u, k) => { const ul = (bench(u) || {}).len_mm, n = Math.ceil(st.L / ul - 0.1), y = g.ry + g.h + 14 + k * 26 + 18; for (let i = 0; i < n; i++) thing(W, u, R.zeroX + i * ul * P, y, ul * P, { h: u === 'clip' ? 8 * P > 16 ? 16 : 8 * P : Math.min(18, 12 * P), sw: 1 }); });
      for (let i = 0; i < st.blocks; i++) rect(W, R.zeroX + i * 10 * P, g.ry - 2 - 10 * P - 8 * P, 10 * P - 1.5, 10 * P, { fill: i % 2 ? C('face-4') : C('sora-soft'), opacity: Math.max(0, 1 - st.rulerA) });
      badgeCal();
      if (st.lens) { const tx = R.xOf(st.L), ty = g.ry + 4, r = clamp(26 * P, 70, 120); lens(nofitLayer(F), W, { fx: tx, fy: ty, x: clamp(tx, r + 8, F.W - r - 8), y: Math.max(g.top + r, g.ry - r - 24), r, k: 2.6 }); }
    };
    async function run() {
      const tag = S.token, ok = () => alive(tag), say = (h, s) => ctx.caption(h, 0, s);
      phase = 'play'; Object.assign(st, { rulerA: 0, lens: false, rows: [], blocks: 0 }); redraw();
      say('この えんぴつの ながさを、ともだちに つたえるには？', 'この鉛筆の長さを、友だちに伝えるには？'); if (!(await wait(2.4)) || !ok()) return;
      st.rows = ['clip']; redraw(); sfx.pop();
      say(`クリップなら <b>${countTxt(st.L, 'clip')}</b>`, `クリップなら${countTxt(st.L, 'clip').replace(/ /g, '')}`); if (!(await wait(2.2)) || !ok()) return;
      st.rows = ['clip', 'eraser']; redraw(); sfx.pop();
      say(`けしごむなら <b>${countTxt(st.L, 'eraser')}</b>。はかる ものが ちがうと つたわらない`, `消しゴムなら${countTxt(st.L, 'eraser').replace(/ /g, '')}。はかるものが違うと伝わらない`); if (!(await wait(3.2)) || !ok()) return;
      st.rows = []; redraw();
      say('だれが はかっても おなじ <b>1cm</b>を つかおう', 'だれがはかっても同じ1センチメートルを使おう');
      const n = Math.floor(st.L / 10);
      for (let i = 1; i <= n; i++) { st.blocks = i; redraw(); sfx.tick(i); if (!(await wait(0.32)) || !ok()) return; }
      say(`1cmが <b>${n}こと すこし</b>`, `1センチメートルが${n}個と少し`); if (!(await wait(2)) || !ok()) return;
      say('1cmを ならべると <b>ものさし</b>', '1センチメートルを並べると、ものさし');
      await tween(1, k => { st.rulerA = k; redraw(); }); if (!ok()) return;
      st.lens = true; redraw(); say('1cmを 10に わけた 1つが <b>1mm</b>', '1センチメートルを10に分けた1つが1ミリメートル'); if (!(await wait(3.2)) || !ok()) return;
      say(`えんぴつは <b>${cmmm(st.L)}</b>`, `えんぴつは${spLen(st.L)}`); if (!(await wait(2.2)) || !ok()) return;
      say('つぎは「さわる」で じっすんの ものさしを つかおう', '次は「さわる」で実寸のものさしを使おう'); ctx.log('miru'); phase = 'done';
    }
    const countTxt = (L, u) => { const ul = (bench(u) || {}).len_mm, q = L / ul, n2 = Math.floor(q); return q - n2 > 0.12 ? `${n2}こと すこし` : `${Math.round(q)}こぶん`; };
    F.onResize(() => redraw()); run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------------- さわる：じっすん ものさし（物を 0 に合わせて はかる・ほんものを はかる） ---------------- */
  if (mode === 'ruler') {
    const st = { item: opts.item || 'eraser', rx: null, ox: null, lens: false, real: false, mark: null, measured: 0, readings: 0 };
    const fits = id => (bench(id) || {}).len_mm <= (g.cm - 1) * 10 && (bench(id) || {}).len_mm * P < F.W - 40;
    const lenOf = id => (bench(id) || {}).len_mm || 50;
    redraw = () => {
      g = geom({ yk: 0.62 });
      if (st.rx == null || st.rx + 40 > F.W || st.rx + g.w < 40) st.rx = g.rx;
      if (!st.real && !fits(st.item)) st.item = MONO_IDS.filter(fits).pop() || 'clip';
      if (st.ox == null) st.ox = clamp(st.rx + 34 * P, 8, F.W - lenOf(st.item) * P - 8);
      st.ox = clamp(st.ox, 4, Math.max(4, F.W - lenOf(st.item) * P - 4));
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const R = ruler(W, { x: st.rx, y: g.ry, cm: g.cm, ppm: P, h: g.h }); G.R = R;
      if (!st.real) { const id = st.item; thing(W, DRAW_ID[id] || id, st.ox, g.ry - 2, lenOf(id) * P, { h: objH(id) }); }
      else {
        // ほんものを 画面に おいて、あかい しるしを はしに あわせる
        if (st.mark == null) st.mark = R.xOf(50);
        const mx = st.mark; rect(W, R.zeroX, g.ry - 6, Math.max(0, mx - R.zeroX), 6, { fill: C('ok'), opacity: 0.5 });
        const mg = el('g', { class: 'grab' }, W); line(mg, mx, g.ry - Math.min(120, (g.ry - g.top) * 0.8), mx, g.ry + g.h * 0.6, { stroke: C('ok'), 'stroke-width': 3 });
        path(mg, `M${mx - 14},${g.ry - Math.min(120, (g.ry - g.top) * 0.8) - 18}h28l-14,18z`, { fill: C('ok') });
        line(W, R.zeroX, g.ry - Math.min(120, (g.ry - g.top) * 0.8), R.zeroX, g.ry, { stroke: C('ok'), 'stroke-width': 2, 'stroke-dasharray': '4 4' });
        txt(W, (R.zeroX + mx) / 2, g.ry - Math.min(120, (g.ry - g.top) * 0.8) - 6, cmmm(Math.max(0, mmAt(mx, R.zeroX, P))), { 'font-size': 22, fill: C('ok'), class: 'ui' });
      }
      badgeCal();
      if (st.lens) { const tx = st.real ? st.mark : st.ox + lenOf(st.item) * P, ty = g.ry + 6, r = clamp(24 * P, 64, 110); lens(nofitLayer(F), W, { fx: tx, fy: ty, x: clamp(tx, r + 8, F.W - r - 8), y: Math.max(g.top + r + 4, g.ry - r - 30), r, k: 2.6 }); }
    };
    const measured = () => !st.real && Math.abs(st.ox - G.R.zeroX) < 0.6;
    function readNow() {
      if (st.real) {
        const mm = Math.max(0, mmAt(st.mark, G.R.zeroX, P));
        ctx.caption(`ほんものの ながさは <b>${cmmm(mm)}</b>${cal ? '' : '（じっすんでは ない）'}`, 0, `${spLen(mm)}`);
        if (mm >= 5) { st.readings++; ctx.register('mine', `${Date.now()}:${cmmm(mm)}:${mm}`); ctx.log('real', { detail: { mm, cal } }); }
        return;
      }
      const id = st.item, mm = lenOf(id);
      if (measured()) {
        st.measured++;
        ctx.caption(`${bname(id).replace(/（.*）/, '')}は ${yaku(bench(id))}<b>${cmmm(Math.round(mm))}</b>${cal ? '' : '<small>（じっすんでは ない）</small>'}`, 0, `${bname(id).replace(/（.*）/, '')}は${yaku(bench(id)) ? 'やく' : ''}${spLen(Math.round(mm))}`);
        ctx.register('mono', id); ctx.log('measure', { detail: { obj: id, mm: Math.round(mm), cal } });
      } else if (st.ox + mm * P > st.rx && st.ox < st.rx + g.w) ctx.caption('はしを <b>0</b>に あわせよう', 0, '端を0に合わせよう');
    }
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => {
        if (st.real) { if (Math.abs(p.x - st.mark) < 34 && p.y > g.top && p.y < g.ry + g.h) return 'mark'; if (p.y >= g.ry && p.y <= g.ry + g.h + 10) return 'ruler'; return null; }
        const L = lenOf(st.item) * P, h = objH(st.item);
        if (p.x >= st.ox - 12 && p.x <= st.ox + L + 12 && p.y >= g.ry - h - 18 && p.y <= g.ry + 2) return 'obj';
        if (p.x >= st.rx && p.x <= st.rx + g.w && p.y >= g.ry && p.y <= g.ry + g.h + 10) return 'ruler';
        return null;
      },
      start: (p, h) => { ctx.hideHud(); drag = { h, x0: p.x, a: h === 'obj' ? st.ox : h === 'mark' ? st.mark : st.rx }; },
      move: p => {
        if (!drag) return; const nx = drag.a + (p.x - drag.x0);
        if (drag.h === 'obj') st.ox = clamp(nx, 4, F.W - lenOf(st.item) * P - 4);
        else if (drag.h === 'mark') st.mark = clamp(nx, G.R.zeroX, G.R.xOf(g.cm * 10));
        else st.rx = clamp(nx, -g.w + 80, F.W - 80);
        redraw();
      },
      end: () => {
        if (!drag) return; const h = drag.h; drag = null;
        if (h === 'mark') { st.mark = G.R.xOf(Math.max(0, mmAt(st.mark, G.R.zeroX, P))); redraw(); readNow(); return; }
        if (!st.real && Math.abs(st.ox - G.R.zeroX) < 2.5 * P) { st.ox = G.R.zeroX; sfx.pop(); redraw(); }
        readNow();
      },
    });
    const chips = MONO_IDS.map(id => `<button type="button" class="chip" data-item="${id}" aria-pressed="${id === st.item}">${thingIcon(DRAW_ID[id] || id, 34, 20)}${bname(id).replace(/（.*）/, '')}</button>`).join('') + `<button type="button" class="chip" data-item="real" aria-pressed="false">ほんもの</button>`;
    panel.innerHTML = `<div class="chips">${chips}</div><div class="row"><button type="button" class="btn sub small" data-k="lens" aria-pressed="false">むしめがね</button><button type="button" class="btn sub small" data-k="zero">0に あわせる</button><button type="button" class="btn sub small" data-k="calib2">ながさ あわせ</button></div>`;
    const setPressed = () => $$p(panel, '[data-item]').forEach(b => b.setAttribute('aria-pressed', String(st.real ? b.dataset.item === 'real' : b.dataset.item === st.item)));
    $$p(panel, '[data-item]').forEach(b => on(b, 'click', () => {
      sfx.tap(); const id = b.dataset.item;
      if ((id === 'real' && st.real) || (!st.real && id === st.item)) { ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; }
      if (id === 'real') {
        st.real = true; st.mark = null; setPressed(); redraw();
        ctx.caption(cal ? 'ほんものの けしごむなどを ものさしの <b>0</b>に あわせて おき、あかい しるしを はしに うごかそう' : 'さきに <b>がめんの ながさ あわせ</b>を すると、ほんとうの ながさが わかるよ', 0);
        if (!cal) ctx.toast('', '「ながさ あわせ」で 1えんだまか カードを つかって あわせよう', 2.6);
        return;
      }
      if (!fits(id)) { sfx.off(); ctx.toast('', 'この がめんには はいりきらないよ', 2); return; }
      st.real = false; st.item = id; st.ox = null; setPressed(); redraw(); ctx.caption('ものさしか ものを ゆびで うごかして、はしを <b>0</b>に あわせよう', 0, '端を0に合わせよう');
    }));
    // 入りきらない物のボタンは うすく
    const markFit = () => $$p(panel, '[data-item]').forEach(b => { if (b.dataset.item !== 'real') b.style.opacity = fits(b.dataset.item) ? '' : '0.45'; });
    on($p(panel, '[data-k="lens"]'), 'click', e => { sfx.tap(); st.lens = !st.lens; e.currentTarget.setAttribute('aria-pressed', String(st.lens)); redraw(); if (st.lens) ctx.caption('はしの めもりを ちかくで みよう。1mmの めもりも よめる', 0); });
    on($p(panel, '[data-k="zero"]'), 'click', async () => {
      if (st.real) { sfx.off(); ctx.toast('', 'ほんものを ものさしの 0に あわせて おいてね', 2); return; }
      if (measured()) { sfx.off(); ctx.toast('', 'もう 0に あって いるよ', 1.6); return; }
      sfx.tap(); const tag = S.token, a = st.ox, b = G.R.zeroX; await tween(0.6, k => { st.ox = lerp(a, b, E.io(k)); redraw(); }); if (!alive(tag)) return; st.ox = G.R.zeroX; redraw(); readNow();
    });
    on($p(panel, '[data-k="calib2"]'), 'click', () => ctx.openCalib(() => { redraw(); markFit(); ctx.caption(calibrated() ? 'がめんの ながさを あわせたよ。<b>じっすん</b>で はかれる' : 'じっすんでは ないけれど、はかりかたは おなじ', 0); }));
    F.onResize(() => { redraw(); markFit(); }); redraw(); markFit();
    ctx.caption('ものさしか ものを ゆびで うごかして、はしを <b>0</b>に あわせよう', 0, '物差しか物を指で動かして、端を0に合わせよう');
    api.test = {
      state: () => ({ item: st.item, real: st.real, measured: st.measured, readings: st.readings }),
      auto() {
        if (st.measured >= 1) return { done: true };
        if (st.real) return { click: `data-item=${MONO_IDS.find(fits)}|` };
        const y = g.ry - Math.min(objH(st.item) / 2, 10), L = lenOf(st.item) * P;
        return pathOf(F, [[st.ox + L / 2, y], [(st.ox + G.R.zeroX) / 2 + L / 2, y], [G.R.zeroX + L / 2, y]]);
      },
    };
    return api;
  }

  /* ---------------- さわる：0から はかる（はしを 1 に合わせると 1cm 多い・かけた ものさし） ---------------- */
  if (mode === 'zero') {
    const st = { L: 40, off: 10, cut: 0, counted: 0, boxes: 0 };
    const newTape = () => { st.L = rnd(3, Math.max(3, Math.min(6, g.cm - 3))) * 10; st.off = 10; st.boxes = 0; };
    redraw = () => {
      g = geom({ yk: 0.62 });
      if (st.off + st.L > g.cm * 10) { st.off = st.cut ? st.cut * 10 : 10; st.L = Math.min(st.L, (g.cm - 1) * 10 - st.off); }
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const x = g.rx + st.cut * 10 * P, R = ruler(W, { x, y: g.ry, cm: g.cm, ppm: P, h: g.h, cut: st.cut }); G.R = R;
      const th = Math.min(16, 6 * P);
      thing(W, 'tape', R.xOf(st.off), g.ry - 2, st.L * P, { h: th, color: C('face-1'), line: C('ink-soft') });
      for (let i = 0; i < st.boxes; i++) { rect(W, R.xOf(st.off + i * 10) + 1, g.ry - th - 4 - 10 * P, 10 * P - 2, 10 * P, { rx: 3, fill: i % 2 ? C('face-4') : C('sora-soft'), opacity: 0.85 }); txt(W, R.xOf(st.off + i * 10 + 5), g.ry - th - 8 - 10 * P * 0.4, String(i + 1), { 'font-size': clamp(4 * P, 12, 20), fill: C('ink'), class: 'ui' }); }
      badgeCal();
    };
    async function countUp() {
      const tag = S.token; st.boxes = 0;
      for (let i = 1; i <= st.L / 10; i++) { st.boxes = i; redraw(); sfx.tick(i); if (!(await wait(0.35)) || !alive(tag)) return; }
      st.counted++; ctx.caption(`1cmが <b>${st.L / 10}こ</b>。だから <b>${st.L / 10}cm</b>`, 0, `1センチメートルが${st.L / 10}個。だから${st.L / 10}センチメートル`);
      ctx.log('zero', { detail: { off: st.off, L: st.L, cut: st.cut } });
    }
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="readEnd">はしの めもりを よむ</button><button class="btn" type="button" data-k="count">1cmを かぞえる</button><button class="btn sub small" type="button" data-k="to0">0に あわせる</button></div>
      <div class="row"><button class="btn sub small" type="button" data-k="cut" aria-pressed="false">かけた ものさし</button><button class="btn sub small" type="button" data-k="new">べつの テープ</button></div>`;
    on($p(panel, '[data-k="readEnd"]'), 'click', () => {
      sfx.tap(); const end = (st.off + st.L) / 10;
      if (st.off === 0) { ctx.caption(`はしが 0に あるから、みぎの はしの <b>${end}</b>が そのまま ながさ。<b>${end}cm</b>`, 0, `端が0にあるから、右の端の${end}がそのまま長さ。${end}センチメートル`); return; }
      ctx.caption(`みぎの はしは <b>${end}</b>。でも ひだりの はしは ${st.off / 10}。<b>${end}cm</b>では ないよ！`, 0, `右の端は${end}。でも左の端は${st.off / 10}。${end}センチメートルではないよ`);
      overhang(G.fx, G.R.zeroX, G.R.xOf(st.off), g.ry - 2 - 12, 12, C('ok-soft'));
    });
    on($p(panel, '[data-k="count"]'), 'click', () => { sfx.tap(); countUp(); });
    on($p(panel, '[data-k="to0"]'), 'click', async () => {
      if (st.cut) { sfx.off(); ctx.toast('', 'かけた ものさしには 0が ないよ。1cmを かぞえよう', 2.2); return; }
      if (st.off === 0) { sfx.off(); ctx.toast('', 'もう 0に あって いるよ', 1.6); return; }
      sfx.tap(); const tag = S.token, a = st.off; st.boxes = 0;
      await tween(0.7, k => { st.off = lerp(a, 0, E.io(k)); redraw(); }); if (!alive(tag)) return;
      st.off = 0; redraw(); sfx.pop(); ctx.caption(`0に あわせると、みぎの はしの めもりが ながさ。<b>${st.L / 10}cm</b>`, 0, `0に合わせると、右の端の目もりが長さ。${st.L / 10}センチメートル`);
    });
    on($p(panel, '[data-k="cut"]'), 'click', e => {
      sfx.tap(); st.cut = st.cut ? 0 : 2; e.currentTarget.setAttribute('aria-pressed', String(!!st.cut)); st.off = st.cut ? 30 : 10; st.boxes = 0; redraw();
      ctx.caption(st.cut ? 'はしが かけた ものさし。0が ない！ <b>1cmの いくつぶん</b>で はかろう' : 'ふつうの ものさしに もどしたよ', 0);
    });
    on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); const before = st.L; newTape(); if (st.L === before) st.L = before === 30 ? 40 : 30; st.off = st.cut ? 30 : 10; redraw(); ctx.caption('あたらしい テープ。ながさは？', 0); });
    g = geom({ yk: 0.62 }); newTape(); F.onResize(redraw); redraw();
    ctx.caption('テープの はしが <b>1</b>に ある。ながさは？', 0, 'テープの端が1にある。長さは？');
    api.test = { state: () => ({ counted: st.counted, off: st.off, cut: st.cut }), auto: () => (st.counted ? { done: true } : { click: 'data-k=count|' }) };
    return api;
  }

  /* ---------------- ためす：みとおし（線の ながさを 見当 → ものさしで はかる） ---------------- */
  if (mode === 'estimate') {
    const TOL = { easy: 0.3, normal: 0.2, challenge: 0.12 }, LV = ['easy', 'normal', 'challenge'], LVN = { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' };
    const Q = { level: ctx.level(), i: 0, n: opts.n || 5, res: [], cur: null, guess: 0, phase: 'ask', rx: 0 };
    panel.innerHTML = `<div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
      <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div></div>
      <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
      <div class="row" data-k="ctl"><button class="btn sub small" type="button" data-k="minus" aria-label="1cm へらす">−</button><span class="btn sub small" data-k="gv" style="min-width:5.5em;pointer-events:none">? cm</span><button class="btn sub small" type="button" data-k="plus" aria-label="1cm ふやす">＋</button><button class="btn big" type="button" data-k="guess">これくらい</button></div>
      <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎ</button></div>
      <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><div class="row"><button class="btn sub" type="button" data-k="again">もういちど</button><button class="btn" type="button" data-k="up"></button></div></div>`;
    const q$ = k => $p(panel, `[data-k="${k}"]`);
    redraw = () => {
      if (!Q.cur) return; g = geom({ yk: 0.7 });
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const c = Q.cur, lx = (F.W - c.L * P) / 2, ly = g.top + (F.W < 640 ? 76 : 40);
      c.lx = lx; c.ly = ly;
      line(W, lx, ly, lx + c.L * P, ly, { stroke: C('face-1'), 'stroke-width': Math.max(4, 1.2 * P) });
      circle(W, lx, ly, 4, { fill: C('ink') }); circle(W, lx + c.L * P, ly, 4, { fill: C('ink') });
      if (Q.phase !== 'ask') {
        const R = ruler(W, { x: Q.rx, y: ly + Math.max(4, 0.6 * P), cm: g.cm, ppm: P, h: g.h }); G.R = R;
        if (Q.phase === 'done') { const ex = lx + c.L * P; line(W, ex, ly - 16, ex, ly + g.h * 0.6, { stroke: C('ok'), 'stroke-width': 2.5 }); txt(W, clamp(ex, 50, F.W - 50), ly - 22, cmmm(c.L), { 'font-size': 20, fill: C('ok'), class: 'ui' }); }
      }
      // 見当の数直線（実寸ではない。0〜cm を はばいっぱいに）
      const nx0 = Math.max(36, F.W * 0.08), nx1 = F.W - Math.max(50, F.W * 0.1), ny = Math.max(ly + g.h + 74, Math.min(g.bot - 24, ly + g.h + 140)), mx = g.cm;
      Q.nl = { nx0, nx1, ny, mx };
      const gn = F.layer('nl'), xv = v => nx0 + (nx1 - nx0) * v / mx;
      line(gn, nx0, ny, nx1, ny, { 'stroke-width': 4 });
      const stp = mx > 20 ? 5 : mx > 10 ? 2 : 1;
      for (let v = 0; v <= mx; v++) { const big = v % stp === 0; line(gn, xv(v), ny - (big ? 10 : 5), xv(v), ny + (big ? 10 : 5), { 'stroke-width': big ? 2.4 : 1.2 }); if (big) txt(gn, xv(v), ny + 30, String(v), { 'font-size': 14, fill: C('ink-soft'), class: 'ui' }); }
      txt(gn, nx1 + 26, ny + 30, 'cm', { 'font-size': 14, fill: C('ink-soft'), class: 'ui' });
      const mk = el('g', { class: 'grab', transform: `translate(${xv(Q.guess)},${ny})` }, gn);
      path(mk, 'M-14,-34L14,-34L0,-12Z', { fill: C('sora') }); line(mk, 0, -12, 0, 14, { stroke: C('sora'), 'stroke-width': 4 });
      txt(mk, 0, -42, Q.guess ? `${Q.guess}cm` : '?', { 'font-size': 20, fill: C('sora'), class: 'ui' });
      if (Q.phase === 'done') { const am = el('g', { transform: `translate(${xv(c.L / 10)},${ny})` }, gn); path(am, 'M-12,30L12,30L0,12Z', { fill: C('ok') }); }
      badgeCal();
    };
    const dotsHTML = () => Array.from({ length: Q.n }, (_, k) => `<i class="${Q.res[k] || (k === Q.i ? 'now' : '')}"></i>`).join('');
    const maxCm = () => g.cm - 1;
    function start() { Q.i = 0; Q.res = []; $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level))); show(); }
    function show() {
      g = geom({ yk: 0.7 });
      const hi = Math.max(3, maxCm()), lo = Math.min(2, hi);
      const L = Q.level === 'easy' ? rnd(lo, hi) * 10 : Q.level === 'normal' ? rnd(lo, hi) * 10 + pickR([0, 5]) : rnd(lo * 10 + 3, hi * 10);
      Q.cur = { L: Math.min(L, hi * 10) }; Q.guess = 0; Q.phase = 'ask';
      q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('ctl').hidden = false; q$('dotsRow').hidden = false; q$('levelRow').hidden = Q.i !== 0;
      q$('dots').innerHTML = dotsHTML(); q$('gv').textContent = '? cm';
      q$('qTxt').innerHTML = 'あかい せんの ながさは なんcmくらい？'; redraw();
      ctx.caption('あかい せんの ながさは なんcmくらい？ ▼を うごかして みとおしを きめてね', 0, '赤い線の長さは何センチメートルくらい？');
    }
    const setG = v => { Q.guess = clamp(Math.round(v), 0, g.cm); q$('gv').textContent = `${Q.guess} cm`; redraw(); };
    const vAt = p => (p.x - Q.nl.nx0) / (Q.nl.nx1 - Q.nl.nx0) * Q.nl.mx;
    dragOn(F.svg, F, { hit: p => (Q.phase === 'ask' && Q.nl && Math.abs(p.y - Q.nl.ny) < 56 ? true : null), start: p => setG(vAt(p)), move: p => setG(vAt(p)), end: () => sfx.tap() });
    async function go() {
      if (Q.phase !== 'ask') return;
      if (Q.guess <= 0) { sfx.off(); ctx.toast('', 'すうちょくせんの ▼を うごかして、みとおしを きめてね', 2.2); return; }
      Q.phase = 'busy'; sfx.pop(); q$('ctl').hidden = true; const tag = S.token, c = Q.cur;
      ctx.caption('ものさしで はかって みよう', 0, 'ものさしではかってみよう');
      const target = c.lx - 4 * P, from = -rulerW(g.cm, P);
      await tween(1, k => { Q.rx = lerp(from, target, E.out(k)); redraw(); }); if (!alive(tag)) return;
      Q.rx = target; Q.phase = 'done'; redraw();
      const act = c.L / 10, err = Math.abs(Q.guess - act) / act, close = err <= TOL[Q.level];
      Q.res[Q.i] = close ? 'ok' : 'ng';
      ctx.log('estimate', { correct: close, level: Q.level, detail: { q: 'せんの ながさ', guess: Q.guess, actual: act, unit: 'cm', qty: 'length' } });
      const msg = `<b>${cmmm(c.L)}</b>。みとおしは ${Q.guess}cm`;
      if (close) { sfx.good(); hanamaru(F.svg, c.lx + c.L * P / 2, c.ly - 30, 36); ctx.toast(ICON.HANAMARU, `ちかい！ ${msg}`, 3, `近い！${spLen(c.L)}`); }
      else ctx.toast('', `${msg}。${Q.guess > act ? 'ながく みすぎ' : 'みじかく みすぎ'}`, 3.2, `${spLen(c.L)}。見通しは${Q.guess}センチメートル`);
      q$('dots').innerHTML = dotsHTML(); q$('next').textContent = Q.i < Q.n - 1 ? 'つぎ' : 'けっかを みる'; q$('nextRow').hidden = false;
    }
    function finish() {
      q$('nextRow').hidden = true; q$('q').hidden = true; q$('ctl').hidden = true; q$('dotsRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
      const score = Q.res.filter(r => r === 'ok').length;
      q$('stars').innerHTML = starsHTML(Q.res.map(r => ({ correct: r === 'ok', hints: 0 })), ICON);
      q$('score').textContent = `${Q.n}もん中 ${score}もん ちかかった`;
      const li = LV.indexOf(Q.level); q$('up').textContent = li < 2 ? `${LVN[LV[li + 1]]} へ` : 'やさしい から';
      ctx.log('estimate-done', { level: Q.level, detail: { n: Q.n, score } }); ctx.done('tamesu'); ctx.caption(`${Q.n}もん中 ${score}もん ちかかった`);
    }
    const nudge = d => { if (Q.phase !== 'ask') { ctx.toast('', 'ちょっと まってね', 1.2); return; } if ((d < 0 && Q.guess <= 0) || (d > 0 && Q.guess >= g.cm)) { sfx.off(); ctx.toast('', d < 0 ? 'これより みじかく できないよ' : 'これより ながく できないよ', 1.6); return; } sfx.tap(); setG(Q.guess + d); };
    on(q$('say-q'), 'click', () => ctx.say('赤い線の長さは何センチメートルくらい？', true));
    on(q$('minus'), 'click', () => nudge(-1)); on(q$('plus'), 'click', () => nudge(1)); on(q$('guess'), 'click', go);
    on(q$('next'), 'click', () => { sfx.tap(); ctx.hideHud(); if (Q.i < Q.n - 1) { Q.i++; show(); } else finish(); });
    on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
    on(q$('up'), 'click', () => { sfx.tap(); ctx.hideHud(); Q.level = LV[(LV.indexOf(Q.level) + 1) % 3]; start(); });
    $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (b.dataset.level === Q.level) { sfx.tap(); ctx.toast('', `いまは「${LVN[Q.level]}」だよ`, 1.6); return; } sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
    F.onResize(() => redraw()); start();
    api.test = {
      state: () => ({ phase: Q.phase, i: Q.i, guess: Q.guess }),
      auto() {
        if (!q$('result').hidden) return { done: true };
        if (Q.phase === 'done') return { click: 'data-k=next|' };
        if (Q.phase !== 'ask') return { wait: 300 };
        const want = Math.round(Q.cur.L / 10), n = Q.nl, xv = v => n.nx0 + (n.nx1 - n.nx0) * v / n.mx;
        if (Q.guess !== want) return pathOf(F, [[xv(Q.guess), n.ny - 8], [xv((Q.guess + want) / 2), n.ny - 8], [xv(want), n.ny - 8]]);
        return { click: 'data-k=guess|' };
      },
    };
    return api;
  }

  /* ---------------- つくる：ちょくせんを ひく（ものさしに そって 0 から） ---------------- */
  if (mode === 'draw') {
    const st = { T: 50, line: null, drawing: null, ok: 0, round: 0 };
    const newT = () => { const hi = Math.max(3, g.cm - 1); st.T = st.ok >= 3 ? rnd(2, hi - 1) * 10 + rnd(1, 9) : rnd(2, hi) * 10; st.line = null; st.round++; };
    redraw = () => {
      g = geom({ yk: 0.62 });
      if (st.T > (g.cm - 1) * 10) st.T = (g.cm - 1) * 10;
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const R = ruler(W, { x: g.rx, y: g.ry, cm: g.cm, ppm: P, h: g.h }); G.R = R;
      // 紙
      rect(W, g.rx, g.top + 6, g.w, g.ry - g.top - 10, { rx: 8, fill: C('paper'), stroke: C('line'), 'stroke-width': 1.5 });
      const ly = g.ry - 8;
      if (st.line) line(W, st.line[0], ly, st.line[1], ly, { stroke: C('ink'), 'stroke-width': Math.max(3, 0.7 * P) });
      if (st.drawing) line(W, st.drawing[0], ly, st.drawing[1], ly, { stroke: C('sora'), 'stroke-width': Math.max(3, 0.7 * P) });
      // えんぴつの さき
      const px = st.drawing ? st.drawing[1] : st.line ? st.line[1] : R.zeroX;
      const pl = Math.min(140, 30 * P), ph = Math.max(7, 2 * P), pg = el('g', { 'pointer-events': 'none', transform: `translate(${px},${ly}) rotate(120)` }, W); thing(pg, 'pencil', -pl, ph / 2, pl, { h: ph });
      txt(W, F.W / 2, g.top + 34, `${cmmm(st.T)}の せんを ひこう`, { 'font-size': 22, fill: C('ink'), class: 'ui' });
      badgeCal();
    };
    const ly = () => g.ry - 8;
    let dr = null;
    dragOn(F.svg, F, {
      hit: p => (p.y > g.top && p.y < g.ry + g.h && p.x > g.rx - 20 && p.x < g.rx + g.w + 20 ? true : null),
      start: p => { ctx.hideHud(); const x0 = Math.abs(p.x - G.R.zeroX) < 3 * P ? G.R.zeroX : G.R.xOf(Math.max(0, mmAt(p.x, G.R.zeroX, P))); dr = { x0 }; st.drawing = [x0, x0]; st.line = null; redraw(); },
      move: p => { if (!dr) return; st.drawing = [dr.x0, G.R.xOf(clamp(mmAt(p.x, G.R.zeroX, P), 0, g.cm * 10))]; redraw(); },
      end: () => {
        if (!dr) return; dr = null; const [a, b] = st.drawing; st.drawing = null; st.line = [a, b]; redraw();
        const s = mmAt(a, G.R.zeroX, P), e = mmAt(b, G.R.zeroX, P), len = e - s;
        if (len < 3) { sfx.off(); ctx.toast('', 'ものさしに そって、ひだりから みぎへ なぞろう', 2); return; }
        const right = len === st.T;
        ctx.log('draw', { correct: right, detail: { target: st.T, got: len, start: s, mistake: right ? null : s !== 0 && e === st.T ? 'L1' : 'other' } });
        if (right) { st.ok++; sfx.good(); hanamaru(F.svg, (a + b) / 2, ly() - 40, 34); ctx.toast(ICON.HANAMARU, `ぴったり <b>${cmmm(len)}</b>！`, 2.6, `ぴったり${spLen(len)}`); ctx.done('draw'); }
        else if (s !== 0) { sfx.bad(); ctx.toast('', `<b>0</b>から ひこう。いまは ${s / 10 % 1 ? cmmm(s) : s / 10}の めもりから ${cmmm(len)}`, 2.8); }
        else { sfx.bad(); ctx.toast('', `${cmmm(len)}。あと ${cmmm(Math.abs(st.T - len))} ${len < st.T ? 'のばそう' : 'みじかく'}`, 2.6); }
      },
    });
    panel.innerHTML = `<div class="row"><button class="btn" type="button" data-k="nextT">つぎの ながさ</button><button class="btn sub small" type="button" data-k="erase">けす</button><button class="btn sub small" type="button" data-k="calib3">ながさ あわせ</button></div>`;
    on($p(panel, '[data-k="nextT"]'), 'click', () => { sfx.tap(); const b = st.T; newT(); if (st.T === b) st.T = b === 30 ? 40 : 30; redraw(); ctx.caption(`ものさしの <b>0</b>から、${cmmm(st.T)}の せんを ひこう`, 0, `0から${spLen(st.T)}の線を引こう`); });
    on($p(panel, '[data-k="erase"]'), 'click', () => { if (!st.line) { sfx.off(); ctx.toast('', 'まだ せんが ないよ', 1.6); return; } sfx.tap(); st.line = null; redraw(); ctx.caption('けしたよ。<b>0</b>から もういちど', 0); });
    on($p(panel, '[data-k="calib3"]'), 'click', () => ctx.openCalib(() => { redraw(); ctx.caption(calibrated() ? 'じっすんで せんが ひけるよ' : 'じっすんでは ないけれど、ひきかたは おなじ', 0); }));
    g = geom({ yk: 0.62 }); newT(); F.onResize(redraw); redraw();
    ctx.caption(`ものさしの <b>0</b>から、ゆびで なぞって ${cmmm(st.T)}の せんを ひこう`, 0, `ものさしの0から、指でなぞって${spLen(st.T)}の線を引こう`);
    api.test = { state: () => ({ ok: st.ok, T: st.T }), auto: () => (st.ok >= 1 ? { done: true } : pathOf(F, [[G.R.zeroX, ly()], [G.R.xOf(st.T / 2), ly()], [G.R.xOf(st.T), ly()]])) };
    return api;
  }

  /* ---------------- つくる：10cm さがし ---------------- */
  if (mode === 'find10') {
    const IDS = ['clip', 'eraser', 'card', 'hagaki-w', 'hagaki', 'pencil', 'tissue', 'notebook'];
    const st = { item: null, real: !!opts.real, mark: null, found: 0, looked: 0 };
    redraw = () => {
      g = geom({ yk: 0.66 });
      F.clearLayers(); const W = F.layer('world'); W.id = 'msWorld'; G.fx = F.layer('fx');
      const R = ruler(W, { x: g.rx, y: g.ry, cm: g.cm, ppm: P, h: g.h }); G.R = R;
      const tenX = R.xOf(Math.min(100, g.cm * 10));
      rect(W, R.zeroX, g.ry - 10, tenX - R.zeroX, 8, { fill: C('yamabuki'), opacity: 0.85 });
      txt(W, (R.zeroX + tenX) / 2, g.ry - 16, g.cm >= 10 ? '10cm' : `${g.cm}cm（10cmは はいりきらない）`, { 'font-size': 16, fill: C('hint'), class: 'ui' });
      if (st.real) {
        if (st.mark == null) st.mark = R.xOf(Math.min(80, g.cm * 10));
        const top = g.top + 8; line(W, st.mark, top, st.mark, g.ry + g.h * 0.6, { stroke: C('ok'), 'stroke-width': 3 }); path(W, `M${st.mark - 14},${top}h28l-14,18z`, { fill: C('ok'), class: 'grab' });
        txt(W, st.mark, top - 6 + 40, cmmm(Math.max(0, mmAt(st.mark, R.zeroX, P))), { 'font-size': 20, fill: C('ok'), class: 'ui', 'text-anchor': st.mark > F.W * 0.7 ? 'end' : 'start', dx: st.mark > F.W * 0.7 ? -8 : 8 });
      } else if (st.item) {
        const id = st.item, mm = (bench(id) || {}).len_mm, fit = mm * P <= F.W - 24, k = fit ? P : (F.W - 40) / mm;
        thing(W, DRAW_ID[id] || id, R.zeroX, g.ry - 22, mm * k, { h: Math.min((REAL_H[id] || 10) * k, (g.ry - g.top) * 0.45) });
        if (!fit) txt(W, F.W / 2, g.top + 20, '（がめんに はいらないので ちいさく して いるよ）', { 'font-size': 14, fill: C('ink-soft'), class: 'ui' });
      }
      badgeCal();
    };
    const verdict = (mm, name) => {
      const d = mm - 100, near = Math.abs(d) <= 20;
      const s = near ? `<b>10cmに ちかい！</b>（${cmmm(mm)}）` : d < 0 ? `10cmより ${cmmm(-d)} みじかい` : `10cmより ${cmmm(d)} ながい`;
      ctx.caption(`${name}：${s}`, 0, unitSpeech(`${name}、${s.replace(/<[^>]+>/g, '')}`).replace(/ /g, ''));
      return near;
    };
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => (st.real && Math.abs(p.x - st.mark) < 34 ? true : null),
      start: p => { drag = { x0: p.x, a: st.mark }; ctx.hideHud(); },
      move: p => { if (!drag) return; st.mark = clamp(drag.a + p.x - drag.x0, G.R.zeroX, G.R.xOf(g.cm * 10)); redraw(); },
      end: () => {
        if (!drag) return; drag = null; const mm = Math.max(0, mmAt(st.mark, G.R.zeroX, P)); st.mark = G.R.xOf(mm); redraw();
        if (mm < 5) return;
        st.looked++; const near = verdict(mm, 'ほんもの');
        ctx.register('mine', `${Date.now()}:${cmmm(mm)}:${mm}`); ctx.log('find10', { correct: near, detail: { mm, real: true, cal } }); if (near) { st.found++; sfx.good(); ctx.done('find10'); }
      },
    });
    const chips = IDS.map(id => `<button type="button" class="chip" data-item="${id}" aria-pressed="false">${thingIcon(DRAW_ID[id] || id, 34, 20)}${bname(id).replace(/（.*）/, '')}</button>`).join('') + `<button type="button" class="chip" data-item="real" aria-pressed="false">ほんものを はかる</button>`;
    panel.innerHTML = `<div class="chips">${chips}</div>${guideRow()}`;
    bindGuide(() => { const gr = $p(panel, '[data-k="guide"]'); if (gr && calibrated()) gr.remove(); });
    $$p(panel, '[data-item]').forEach(b => on(b, 'click', () => {
      sfx.tap(); const id = b.dataset.item;
      if ((id === 'real' && st.real) || (!st.real && id === st.item)) { ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; }
      $$p(panel, '[data-item]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (id === 'real') { st.real = true; st.mark = null; redraw(); ctx.caption(cal ? 'みのまわりの ものを ものさしの <b>0</b>に あわせて おき、あかい しるしを はしまで うごかそう' : 'さきに 「がめんの ながさ あわせ」を しよう。あわせないと ほんとうの ながさに ならないよ', 0); return; }
      st.real = false; st.item = id; redraw(); st.looked++;
      const mm = Math.round((bench(id) || {}).len_mm), near = verdict(mm, bname(id).replace(/（.*）/, ''));
      ctx.log('find10', { correct: near, detail: { obj: id, mm } }); if (near) { st.found++; ctx.register('mono', id); sfx.good(); ctx.done('find10'); }
    }));
    F.onResize(redraw); redraw();
    ctx.caption('10cmに ちかい ものは どれかな？ ものを えらんで くらべよう', 0, '10センチメートルに近いものはどれかな？');
    api.test = { state: () => ({ found: st.found, looked: st.looked }), auto: () => (st.found ? { done: true } : { click: 'data-item=hagaki-w|' }) };
    return api;
  }
  return api;
}
