// 時間の帯（T2・T3）。時計と連動し、正時・正午で区切る。午前・午後の2本で1日24時間。
// opts.mode：ampm（帯をタッチして時刻へ）・miru（T3：ちょうどの じで くぎって たす）・split（くぎりを おく）・plan（えんそくの けいかく）
import { clockScene, bindHand, MIN, hour12, tod } from './_clock.js';
import { el, C, txt, rect, line, clear, dragOn, tapOf, pathOf, wait, rnd } from './_flat.js';
import { kidTime, spTime, kidDur, spDur, ampm, ampmSp } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { pick } from '../core/text.js';

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'ampm';
  const F = ctx.openFlat();
  let sc = null, deco = null, canDrag = mode === 'ampm' || mode === 'plan';
  const build = () => {
    const keep = sc ? Object.assign({}, sc.clock.st) : null;
    F.clearLayers(); sc = clockScene(F, { sky: true, band: true });
    if (keep) Object.assign(sc.clock.st, keep); else sc.clock.st.t = opts.t ?? 7 * 60;
    sc.clock.update(); redraw();
  };
  const redraw = () => { const g = F.layer('deco'); clear(g); deco && deco(g); };
  F.onResize(build); build();
  const c = () => sc.clock, b = () => sc.band;
  bindHand(F, { hit: p => sc.clock.hit(p), angMin: p => sc.clock.angMin(p), get st() { return sc.clock.st; }, update: () => sc.clock.update() }, { can: () => canDrag, onStart: () => ctx.hideHud(), onEnd: t => { if (mode === 'ampm') sayAt(t); } });
  const full = t => `${ampm(t)} ${kidTime(t)}`, fullSp = t => ampmSp(t) + spTime(t);
  const sayAt = t => ctx.caption(tod(t) === 720 ? 'ひるの 12じ ＝ <b>しょうご</b>' : full(t), 0, tod(t) === 720 ? '昼の12時は正午' : fullSp(t));
  const api = { dispose() {}, test: {} };

  /* ---------- さわる：ごぜん・ごご（帯をタッチ） ---------- */
  if (mode === 'ampm') {
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-go="420">あさの 7じ</button><button class="btn sub small" type="button" data-go="1140">よるの 7じ</button><button class="btn sub small" type="button" data-go="720">しょうご</button><button class="btn sub small" type="button" data-go="0">よなかの 12じ</button></div>`;
    let taps = 0;
    const go = async T => { const tag = S.token, cur = c().st.t; let d = T - tod(cur); await c().moveTo(cur + d, Math.min(2.4, 0.5 + Math.abs(d) / 400)); if (!alive(tag)) return; c().st.t = T; c().update(); sayAt(T); if (T === 420 || T === 1140) { sc.flash = 7; sc.sync(); setTimeout(() => { if (alive(tag)) { sc.flash = null; sc.sync(); } }, 1600); } };
    $$p(panel, '[data-go]').forEach(x => on(x, 'click', () => { sfx.tap(); go(+x.dataset.go); ctx.log('band', { detail: { t: +x.dataset.go } }); }));
    dragOn(F.svg, F, { hit: p => (b().hit(p) ? true : null), end: p => { taps++; const T = Math.round(b().tAt(p) / 5) * 5; go(T); ctx.log('band', { detail: { t: T } }); } });
    ctx.caption('したの おびを タッチすると、その じこくに なるよ', 0, '下の帯をタッチすると、その時刻になるよ');
    api.test = { state: () => ({ taps }), auto: () => { if (taps >= 2) return { done: true }; const B = b(), T = taps ? 19 * 60 : 7 * 60, row = T < 720 ? 0 : 1; return tapOf(F, B.xOf(T), B.rowY[row] + B.rowH / 2); } };
    return api;
  }

  // ちょうどの じで くぎる絵（a〜h：青、h〜e：黄、くぎりの線）
  const drawSplit = (s, e, hh, g) => { const B = b(); B.span(s, hh, C('sora'), 0.55, g); B.span(hh, e, C('face-2'), 0.75, g); const x = B.xOf(tod(hh)), y = B.rowY[B.rowOf(tod(hh) === 0 ? 0 : hh)]; rect(g, x - 2, y - 8, 4, B.rowH + 16, { fill: C('ok') }); };

  /* ---------- みる（T3）：ちょうどの じで くぎって たす ---------- */
  if (mode === 'miru') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play';
    async function run() {
      const tag = S.token, ok = () => alive(tag); phase = 'play';
      for (const [s, e, noon] of [[8 * 60 + 40, 9 * 60 + 15, false], [10 * 60 + 50, 11 * 60 + 30, false], [11 * 60 + 30, 13 * 60 + 10, true]]) {
        deco = null; redraw(); c().reset(); c().st.t = s; c().st.start = s; c().update();
        ctx.caption(`${noon ? full(s) : kidTime(s)} から ${noon ? full(e) : kidTime(e)} まで、なんぷん？`, 0, `${noon ? fullSp(s) : spTime(s)}から${noon ? fullSp(e) : spTime(e)}まで、何分？`);
        if (!(await wait(2.4)) || !ok()) return;
        const hh = noon ? 720 : s - MIN(s) + 60;
        await c().moveTo(hh, 1.6); if (!ok()) return;
        deco = g => drawSplit(s, e, hh, g); redraw();
        ctx.caption(`${noon ? 'しょうご' : `ちょうどの ${hour12(hh)}じ`}で くぎる。ここまで <b>${kidDur(hh - s)}</b>`, 0, `${noon ? '正午' : `ちょうどの${hour12(hh)}時`}で区切る。ここまで${spDur(hh - s)}`);
        if (!(await wait(2.6)) || !ok()) return;
        await c().moveTo(e, 1.6); if (!ok()) return;
        ctx.caption(`ここから <b>${kidDur(e - hh)}</b>。あわせて <b>${kidDur(e - s)}</b>`, 0, `ここから${spDur(e - hh)}。合わせて${spDur(e - s)}`);
        if (!(await wait(3)) || !ok()) return;
      }
      ctx.caption('「さわる」で くぎりを おいて みよう'); ctx.log('miru'); phase = 'done';
    }
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------- さわる（T3）：くぎりを おく ---------- */
  if (mode === 'split') {
    let s, e, cut = null, solved = 0;
    const fresh = () => {
      cut = null; c().reset();
      s = rnd(7, 15) * 60 + rnd(7, 11) * 5; e = s + rnd(3, 10) * 5; if (Math.floor(e / 60) === Math.floor(s / 60)) e = s - MIN(s) + 60 + rnd(1, 5) * 5;
      if (pick([0, 0, 1])) { s = rnd(10, 11) * 60 + pick([20, 30, 40]); e = rnd(12, 13) * 60 + pick([10, 20, 40]); }
      c().st.t = e; c().st.start = s; c().update();
      deco = g => { b().span(s, e, C('sora'), 0.3, g); }; redraw();
      ctx.caption(`${full(s)} から ${full(e)} まで。おびの <b>ちょうどの じ</b>を タッチして くぎろう`, 0, `${fullSp(s)}から${fullSp(e)}まで。帯のちょうどの時をタッチして区切ろう`);
    };
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="new">つぎの もんだい</button><button class="btn sub small" type="button" data-k="clear">くぎりを けす</button></div>`;
    on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); fresh(); });
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); cut = null; deco = g => { b().span(s, e, C('sora'), 0.3, g); }; redraw(); ctx.caption('くぎりを けしたよ。もういちど タッチしてね'); });
    dragOn(F.svg, F, {
      hit: p => (b().hit(p) ? true : null),
      end: async p => {
        const raw = b().tAt(p), day = Math.floor(s / 1440) * 1440;
        let T = Math.round(raw / 60) * 60 + day;
        if (T <= s || T >= e) { sfx.off(); ctx.caption('くぎりは はじめと おわりの あいだに おいてね'); return; }
        if (Math.abs(raw - T) > 20) { sfx.off(); ctx.caption('<b>ちょうどの じ</b>（めもりの ところ）で くぎると わかりやすいよ'); return; }
        cut = T; sfx.pop(); deco = g => drawSplit(s, e, T, g); redraw();
        const tag = S.token; c().st.t = s; c().update(); await c().moveTo(T, 1); if (!alive(tag)) return; await c().moveTo(e, 1); if (!alive(tag)) return;
        solved++;
        ctx.caption(`${kidDur(T - s)} ＋ ${kidDur(e - T)} ＝ <b>${kidDur(e - s)}</b>`, 0, `${spDur(T - s)}たす${spDur(e - T)}で${spDur(e - s)}`);
        ctx.log('split', { correct: true, detail: { s, e, cut: T } });
      },
    });
    fresh();
    api.test = { state: () => ({ solved, s, e }), auto: () => { if (solved >= 1) return { done: true }; const T = Math.floor(s / 60) * 60 + 60 === 720 && e > 720 && s < 720 ? 720 : s - MIN(s) + 60, B = b(); return tapOf(F, B.xOf(tod(T)), B.rowY[B.rowOf(T)] + B.rowH / 2); } };
    return api;
  }

  /* ---------- つくる（T3）：えんそくの けいかく ---------- */
  if (mode === 'plan') {
    const LEGS = [['こうえんに つく', 'あるいて'], ['おべんとうを たべおわる', 'あそんで おべんとう'], ['こうえんを でる', 'やすんで'], ['がっこうに もどる', 'あるいて']];
    let plan, k = 0;
    const make = () => {
      const s = pick([8 * 60 + 40, 9 * 60 + 10, 9 * 60 + 30]);
      const ds = [pick([35, 40, 50]), pick([80, 100, 130]), pick([25, 40]), pick([35, 45, 50])];
      const ts = [s]; ds.forEach(d => ts.push(ts[ts.length - 1] + d));
      plan = { s, ds, ts }; k = 0;
    };
    const drawPlan = g => {
      const B = b(); const cols = [C('face-4'), C('face-2'), C('face-3'), C('face-5')];
      for (let i = 0; i < k; i++) B.span(plan.ts[i], plan.ts[i + 1], cols[i], 0.7, g);
      for (let i = 0; i <= k; i++) { const T = plan.ts[i], x = B.xOf(tod(T)), y = B.rowY[B.rowOf(T)]; rect(g, x - 1.5, y - 6, 3, B.rowH + 12, { fill: C('ink') }); }
    };
    const ask = () => {
      const [what, how] = LEGS[k], from = plan.ts[k], d = plan.ds[k];
      c().st.start = from; c().st.t = from; c().update(); deco = drawPlan; redraw();
      ctx.caption(`${full(from)}から ${how} <b>${kidDur(d)}</b>。<b>${what}</b>のは なんじ なんぷん？ とけいを あわせて「おく」`, 0, `${fullSp(from)}から${how}${spDur(d)}。${what}のは何時何分？時計を合わせて置く`);
    };
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-step="-60">−1じかん</button><button class="btn sub small" type="button" data-step="60">＋1じかん</button><button class="btn sub small" type="button" data-step="-5">−5ふん</button><button class="btn sub small" type="button" data-step="5">＋5ふん</button><button class="btn" type="button" data-k="put">おく</button><button class="btn sub small" type="button" data-k="new">べつの けいかく</button></div>`;
    $$p(panel, '[data-step]').forEach(x => on(x, 'click', () => { sfx.tap(); const tag = S.token; c().moveTo(c().st.t + +x.dataset.step, 0.35).then(() => { if (alive(tag)) ctx.caption(full(c().st.t), 0, fullSp(c().st.t)); }); }));
    on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); make(); ask(); });
    let done = 0, miss = 0;
    on($p(panel, '[data-k="put"]'), 'click', async () => {
      const want = plan.ts[k + 1], got = Math.round(c().st.t), tag = S.token;
      if (tod(got) !== tod(want)) {
        sfx.bad(); miss++;
        const from = plan.ts[k], hh = from - MIN(from) + 60;
        deco = g => { drawPlan(g); if (want > hh) drawSplit(from, want, hh, g); }; redraw();
        ctx.toast(ICON.X, `ちょうどの ${hour12(hh)}じで くぎって みよう。${kidTime(from)}から ${hour12(hh)}じ まで ${kidDur(hh - from)}`, 3.6);
        ctx.log('plan-step', { correct: false, detail: { from, d: plan.ds[k], got, want, mistake: Math.floor(got / 60) !== Math.floor(want / 60) && MIN(got) === MIN(want) ? 'T7' : 'other' } });
        return;
      }
      sfx.good(); k++; deco = drawPlan; redraw();
      ctx.log('plan-step', { correct: true, detail: { from: plan.ts[k - 1], d: plan.ds[k - 1] } });
      if (k >= LEGS.length) {
        done++; ctx.toast(ICON.HANAMARU, `けいかくが できた！ ぜんぶで ${kidDur(plan.ts[4] - plan.ts[0])}`, 3.2);
        ctx.log('plan', { correct: miss === 0, detail: { total: plan.ts[4] - plan.ts[0], miss } }); ctx.done('plan'); miss = 0;
        if (!(await wait(2.6)) || !alive(tag)) return; make(); ask(); return;
      }
      ask();
    });
    make(); ask();
    api.test = {
      state: () => ({ k, done }),
      auto() {
        if (done >= 1) return { done: true };
        const want = plan.ts[k + 1], cur = Math.round(c().st.t);
        if (Math.abs(want - cur) >= 60) return { click: `data-step=${want > cur ? 60 : -60}|` };
        if (want !== cur) return pathOf(F, c().dragPath(want));
        return { click: 'data-k=put|' };
      },
    };
    return api;
  }
  return api;
}
