// karada（からだものさし）。
// mode：hand（N2：ひとあた・ゆびの はばを 実寸で。指2本を画面に置く＝マルチタッチ。置けない端末は2つの しるしを動かす）
//       ｜arms（N2m：りょうてを ひろげた ながさは しんちょうと だいたい おなじ。こくばんを りょうてで はかる）
// 実寸の活動なので、合わせていない端末では「がめんの ながさ あわせ」の案内から始める。
// 記録：body（detail：what・mm・cal）・arms。ずかん karada（きろく）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, pathOf, hanamaru } from './_flat.js';
import { realBadge, overhang, badge } from './_nagasa.js';
import { bodyMM, cmmm, mcm } from './_nagasa-gen.js';
import { ppm as getPpm, calibrated } from '../core/calibrate.js';
import { bench } from '../core/bench.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const sp = s => unitSpeech(String(s).replace(/<[^>]+>/g, '')).replace(/ /g, '');
const WHAT = {
  span: { label: 'ひとあた', a: 'おやゆび', b: 'こゆび', say: 'てを おおきく ひらいて、<b>おやゆび</b>と <b>こゆび</b>を がめんに おこう', d: 150 },
  finger: { label: 'ゆび 1ぽんの はば', a: 'ひだりの はし', b: 'みぎの はし', say: '<b>ひとさしゆび</b>を よこに して おき、りょうはしに しるしを あわせよう', d: 15 },
  two: { label: 'ゆび 2ほんの はば', a: 'ひだりの はし', b: 'みぎの はし', say: '<b>ゆび 2ほん</b>を そろえて おき、りょうはしに しるしを あわせよう', d: 30 },
};

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'hand';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };

  /* ---------------- ひとあた・ゆびの はば（実寸・マルチタッチ） ---------------- */
  if (mode === 'hand') {
    let what = 'span', P = getPpm(), cal = calibrated(), started = cal, marks = null, active = new Map(), recs = 0, reads = 0;
    const area = () => ({ top: F.top + F.cap + 30, bot: F.bottom - 44, m: 24 });
    const reset = () => { const a = area(), cx = F.W / 2, cy = (a.top + a.bot) / 2, d = Math.min(WHAT[what].d * P, F.W - 80); marks = [{ x: cx - d / 2, y: cy }, { x: cx + d / 2, y: cy }]; };
    const mm = () => bodyMM(marks[0], marks[1], P);
    function draw() {
      P = getPpm(); cal = calibrated(); F.clearLayers(); const g = F.layer('m'), gb = F.layer('badge');
      const a = area();
      if (!started) {
        // 案内：手の形と 1えんだまの わく
        const cx = F.W / 2, cy = (a.top + a.bot) / 2, s = Math.min(1, (a.bot - a.top) / 300);
        const hg = el('g', { transform: `translate(${cx},${cy}) scale(${s})` }, g);
        path(hg, 'M-60,90 Q-80,20 -110,-30 Q-120,-50 -100,-55 Q-85,-58 -70,-20 L-55,-110 Q-50,-130 -35,-128 Q-22,-125 -24,-105 L-20,-30 L-5,-130 Q0,-148 15,-145 Q28,-140 25,-120 L15,-30 L35,-115 Q42,-132 56,-126 Q68,-120 62,-100 L45,-20 L75,-80 Q85,-95 97,-88 Q107,-80 100,-62 L70,30 Q55,90 40,95 Z', { fill: C('face-6'), opacity: 0.55, stroke: C('ink-soft'), 'stroke-width': 3 });
        txt(g, cx, a.bot - 6, 'まず「がめんの ながさ あわせ」を しよう', { 'font-size': 18, fill: C('ink'), class: 'ui' });
        realBadge(gb, F, cal, () => openCal());
        return;
      }
      if (!marks) reset();
      marks.forEach(p => { p.x = clamp(p.x, 30, F.W - 30); p.y = clamp(p.y, a.top + 20, a.bot - 10); });
      const [p, q] = marks, d = Math.hypot(q.x - p.x, q.y - p.y), ang = Math.atan2(q.y - p.y, q.x - p.x), v = mm();
      line(g, p.x, p.y, q.x, q.y, { stroke: C('ok'), 'stroke-width': 4 });
      for (let i = 10; i < v; i += 10) { const x = p.x + Math.cos(ang) * i * P, y = p.y + Math.sin(ang) * i * P; line(g, x - Math.sin(ang) * 9, y + Math.cos(ang) * 9, x + Math.sin(ang) * 9, y - Math.cos(ang) * 9, { stroke: C('ok'), 'stroke-width': 2 }); }
      [[WHAT[what].a, p], [WHAT[what].b, q]].forEach(([t, m], k) => { circle(g, m.x, m.y, 26, { fill: C('paper'), stroke: active.size && [...active.values()].includes(k) ? C('ok') : C('mat-deep'), 'stroke-width': 3, opacity: 0.92, class: 'grab' }); circle(g, m.x, m.y, 4, { fill: C('ok') }); txt(g, m.x, m.y - 34, t, { 'font-size': 14, fill: C('ink-soft'), class: 'ui' }); });
      const tx = clamp((p.x + q.x) / 2, 80, F.W - 80), ty = Math.max(a.top + 10, Math.min(p.y, q.y) - 48);
      txt(g, tx, ty, cmmm(v), { 'font-size': 34, fill: C('ink') });
      if (!cal) txt(g, tx, ty + 22, '（じっすんでは ない）', { 'font-size': 13, fill: C('ink-soft'), class: 'ui' });
      realBadge(gb, F, cal, () => openCal());
    }
    function openCal() { ctx.openCalib(() => { started = true; P = getPpm(); reset(); draw(); showPanel(); ctx.caption(WHAT[what].say, 0, sp(WHAT[what].say)); }); }
    function readOut() { reads++; const v = mm(); ctx.caption(`${WHAT[what].label}は <b>${cmmm(v)}</b>${cal ? '' : '（じっすんでは ない）'}`, 0, sp(`${WHAT[what].label}は${cmmm(v)}`)); }
    dragOn(F.svg, F, {
      hit: p => {
        if (!started || !marks) return null;
        const used = new Set(active.values());
        let k = [0, 1].filter(i => !used.has(i)).sort((i, j) => Math.hypot(marks[i].x - p.x, marks[i].y - p.y) - Math.hypot(marks[j].x - p.x, marks[j].y - p.y))[0];
        if (k == null) return null;
        // 指を置いた ところへ しるしが とんでくる（マルチタッチ）。マウスでは近い しるしだけ
        if (Math.hypot(marks[k].x - p.x, marks[k].y - p.y) > 70 && active.size === 0 && false) return null;
        return { k };
      },
      start: (p, h, e) => { active.set(e.pointerId, h.k); marks[h.k] = { x: p.x, y: p.y }; ctx.hideHud(); draw(); },
      move: (p, h, a, e) => { marks[h.k] = { x: p.x, y: p.y }; draw(); },
      end: (p, h, a, e) => { active.delete(e.pointerId); draw(); if (!active.size) readOut(); },
    });
    function showPanel() {
      if (!started) {
        // 「このまま はかる」を先に置く（見た目は order で後ろ）。あわせる ボタンは はかる画面と同じ見分け（calib2）
        panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="skip" style="order:2">このまま はかる</button><button class="btn" type="button" data-k="calib2" style="order:1">がめんの ながさ あわせ</button></div>`;
        on($p(panel, '[data-k="calib2"]'), 'click', () => openCal());
        on($p(panel, '[data-k="skip"]'), 'click', () => { sfx.tap(); started = true; reset(); draw(); showPanel(); ctx.caption(`${WHAT[what].say}<br><small>あわせて いないので じっすんでは ないよ</small>`, 0, sp(WHAT[what].say)); });
        ctx.decorate && ctx.decorate(); return;
      }
      panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="はかる ところ">${Object.entries(WHAT).map(([k, w]) => `<button type="button" data-what="${k}" aria-pressed="${k === what}">${w.label}</button>`).join('')}</div></div>
        <div class="row"><button class="btn" type="button" data-k="rec">きろく する</button><button class="btn sub small" type="button" data-k="calib2">ながさ あわせ</button></div>`;
      $$p(panel, '[data-what]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.what === what) { ctx.toast('', `いまは「${WHAT[what].label}」だよ`, 1.6); return; } what = b.dataset.what; $$p(panel, '[data-what]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.what === what))); reset(); draw(); ctx.caption(WHAT[what].say, 0, sp(WHAT[what].say)); }));
      on($p(panel, '[data-k="rec"]'), 'click', () => {
        const v = mm(); if (v < 5) { sfx.off(); ctx.toast('', 'しるしを はなして おこう', 1.6); return; }
        sfx.good(); recs++;
        ctx.register('karada', `${Date.now()}:${WHAT[what].label}:${cmmm(v)}:${v}`); ctx.log('body', { correct: true, detail: { what, mm: v, cal } }); ctx.done('karada');
        ctx.toast(ICON.HANAMARU, `${WHAT[what].label} <b>${cmmm(v)}</b> を ずかんに きろくしたよ`, 2.6, sp(`${WHAT[what].label}${cmmm(v)}を図鑑に記録したよ`));
      });
      on($p(panel, '[data-k="calib2"]'), 'click', () => openCal());
      ctx.decorate && ctx.decorate();
    }
    F.onResize(draw); draw(); showPanel();
    ctx.caption(started ? WHAT[what].say : 'からだものさしは じっすんで はかるよ。さきに <b>がめんの ながさ あわせ</b>を しよう', 0, started ? sp(WHAT[what].say) : 'からだものさしは実寸ではかるよ。先に画面の長さ合わせをしよう');
    api.test = {
      state: () => ({ started, recs, reads, mm: marks ? mm() : null }),
      auto() {
        if (!started) return { click: 'data-k=skip|' };
        if (recs >= 1) return { done: true };
        if (!reads) { const q = marks[1]; return pathOf(F, [[q.x, q.y], [q.x + 12, q.y], [q.x + 24, q.y]]); }
        return { click: 'data-k=rec|' };
      },
    };
    return api;
  }

  /* ---------------- りょうてを ひろげた ながさ（N2m） ---------------- */
  if (mode === 'arms') {
    const st = { H: 125, open: 0, laid: 0, measured: 0, opened: 0 };
    const board = Math.round(((bench('blackboard') || {}).len_mm || 3600) / 10);
    let Lg = {};
    function draw() {
      const m = Math.max(18, F.W * 0.05), top = F.top + F.cap + 16, bot = F.bottom - 24, H = bot - top, W = F.W - m * 2;
      F.clearLayers(); const g = F.layer('scene'), fx = F.layer('fx');
      const land = W > H * 1.3;
      // 人（顔のない かんたんな形）。せの高さ st.H cm
      const s = Math.min(H * (land ? 0.82 : 0.4) / 160, (land ? W * 0.42 : W * 0.9) / 170), px = land ? m + W * 0.22 : F.W / 2, py = land ? bot - 10 : top + H * 0.48;
      const h = st.H * s, head = h * 0.13, sh = py - h + head * 2.1, arm = st.H * s / 2 * st.open + h * 0.18 * (1 - st.open);
      circle(g, px, py - h + head, head, { fill: C('face-2'), stroke: C('ink'), 'stroke-width': 2 });
      rect(g, px - h * 0.11, sh, h * 0.22, h * 0.42, { rx: h * 0.06, fill: C('face-4'), stroke: C('ink'), 'stroke-width': 2 });
      line(g, px - h * 0.06, sh + h * 0.42, px - h * 0.08, py, { stroke: C('ink'), 'stroke-width': Math.max(4, h * 0.05) });
      line(g, px + h * 0.06, sh + h * 0.42, px + h * 0.08, py, { stroke: C('ink'), 'stroke-width': Math.max(4, h * 0.05) });
      const ay = sh + h * 0.06 * (1 - st.open) + h * 0.02, ad = h * 0.3 * (1 - st.open);
      line(g, px, ay, px - arm, ay + ad, { stroke: C('face-4'), 'stroke-width': Math.max(5, h * 0.06) });
      line(g, px, ay, px + arm, ay + ad, { stroke: C('face-4'), 'stroke-width': Math.max(5, h * 0.06) });
      // しんちょうの 線と、りょうての 線
      line(g, px + (land ? -h * 0.5 : h * 0.6), py, px + (land ? -h * 0.5 : h * 0.6), py - h, { stroke: C('sora'), 'stroke-width': 3 });
      txt(g, px + (land ? -h * 0.5 - 8 : h * 0.6 + 8), py - h / 2, `${st.H}cm`, { 'font-size': 16, fill: C('sora'), class: 'ui', 'text-anchor': land ? 'end' : 'start' });
      if (st.open >= 1) { line(g, px - arm, ay - 18, px + arm, ay - 18, { stroke: C('ok'), 'stroke-width': 3 }); txt(g, px, ay - 26, `やく ${st.H}cm`, { 'font-size': 16, fill: C('ok'), class: 'ui' }); }
      // こくばん と りょうての いくつぶん
      const bs = land ? (W * 0.5) / board : (W * 0.9) / board, bx = land ? m + W * 0.48 : m + W * 0.05, by = land ? top + H * 0.4 : top + H * 0.88, bh = Math.min(H * (land ? 0.25 : 0.14), board * bs * 0.3);
      rect(g, bx - 4, by - bh - 4, board * bs + 8, bh + 8, { rx: 3, fill: C('wood') }); rect(g, bx, by - bh, board * bs, bh, { fill: C('mat-deep') });
      txt(g, bx + board * bs / 2, by - bh - 12, 'こくばん', { 'font-size': 15, fill: C('ink-soft'), class: 'ui' });
      for (let i = 0; i < st.laid; i++) { const x0 = bx + i * st.H * bs, w = Math.min(st.H * bs, board * bs - i * st.H * bs + (i === st.laid - 1 ? st.H * bs : 0)); rect(g, x0, by + 8, Math.max(1, st.H * bs - 2), 12, { rx: 6, fill: C('face-4'), opacity: 0.85 }); badge(fx, x0 + st.H * bs / 2, by + 36, String(i + 1), { r: 11 }); }
      Lg = { by };
    }
    const need = () => Math.ceil(board / st.H - 0.05);
    async function openArms() {
      if (st.open >= 1) { sfx.off(); ctx.toast('', 'もう ひろげて いるよ', 1.4); return; }
      sfx.tap(); const tag = S.token; await tween(1, k => { st.open = E.io(k); draw(); }); if (!alive(tag)) return; st.open = 1; draw(); st.opened++;
      ctx.caption(`りょうてを ひろげた ながさは、<b>しんちょうと だいたい おなじ</b>（やく ${st.H}cm）`, 0, sp(`両手を広げた長さは、身長とだいたい同じ。やく${st.H}cm`)); ctx.log('arms', { detail: { H: st.H, kind: 'open' } });
    }
    async function measure() {
      if (st.open < 1) { await openArms(); }
      const tag = S.token; sfx.tap(); st.laid = 0;
      for (let i = 1; i <= need(); i++) { st.laid = i; draw(); sfx.tick(i); if (!(await wait(0.5)) || !alive(tag)) return; }
      const q = board / st.H, n = Math.floor(q), msg = `こくばんは りょうて <b>${q - n > 0.1 ? `${n}こと すこし` : `${Math.round(q)}こ`}</b>ぶん。だいたい <b>${mcm(Math.round(board * 10 / 100) * 100)}</b>`;
      st.measured++; sfx.good(); ctx.caption(msg, 0, sp(msg)); ctx.log('arms', { detail: { H: st.H, kind: 'board', n: q } }); ctx.done('arms');
    }
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="hm" aria-label="せを ひくく">−</button><span class="note" data-k="hv" style="min-width:7em;text-align:center">しんちょう ${st.H}cm</span><button class="btn sub small" type="button" data-k="hp" aria-label="せを たかく">＋</button></div>
      <div class="row"><button class="btn" type="button" data-k="open">りょうてを ひろげる</button><button class="btn sub small" type="button" data-k="board">こくばんを はかる</button></div>`;
    const setH = d => { const n = clamp(st.H + d, 100, 160); if (n === st.H) { sfx.off(); ctx.toast('', d < 0 ? 'これより ひくく できないよ' : 'これより たかく できないよ', 1.6); return; } sfx.tap(); st.H = n; st.laid = 0; $p(panel, '[data-k="hv"]').textContent = `しんちょう ${st.H}cm`; draw(); ctx.caption(`しんちょう <b>${st.H}cm</b>`, 0, sp(`身長${st.H}cm`)); };
    on($p(panel, '[data-k="hm"]'), 'click', () => setH(-5)); on($p(panel, '[data-k="hp"]'), 'click', () => setH(5));
    on($p(panel, '[data-k="open"]'), 'click', openArms); on($p(panel, '[data-k="board"]'), 'click', measure);
    F.onResize(draw); draw();
    ctx.caption('じぶんの しんちょうに あわせて（＋ −）、りょうてを ひろげて みよう', 0, '自分の身長に合わせて、両手を広げてみよう');
    api.test = { state: () => ({ open: st.open, measured: st.measured }), auto: () => (st.measured ? { done: true } : st.open < 1 ? { click: 'data-k=open|' } : { click: 'data-k=board|' }) };
    return api;
  }
  return api;
}
