// ikutsubun（かさ）：おなじ コップで なんばいぶん（K1・任意単位）。ikutsubun.js が opts.qty='kasa' のときに読む。
// 大きさの ちがう コップで はかると、杯数が 多い ほうが 少ないことが おきる（V2）。
// はかった 入れ物は ずかん（opts.coll、既定 k1-cups）に「入れ物:コップ」で のこす。
import { vesselScene, capOf, nameOf } from './_vessels.js';
import { C, el, rect, clear, hanamaru } from './_flat.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { hai } from '../core/yomi.js';

const CUPS = { s: { kind: 'cup-s', label: 'ちいさい コップ' }, b: { kind: 'cup', label: 'おおきい コップ' } };
export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  const list = opts.list || ['suito', 'donburi', 'pet500', 'milk1L', 'milk200', 'cup'];
  const coll = opts.coll || 'k1-cups';
  let cont = list[0], cup = 's';
  const st = { n: 0, part: false, done: false, used: {} };
  const say = (h, s) => ctx.caption(h, 0, s || null);
  panel.innerHTML = `<div class="chips">${list.map(id => `<button type="button" class="chip" data-cont="${id}" aria-pressed="${id === cont}">${nameOf(id)}</button>`).join('')}</div>
    <div class="row"><div class="seg" role="group" aria-label="コップ">${Object.entries(CUPS).map(([k, c]) => `<button type="button" data-cup="${k}" aria-pressed="${k === cup}">${c.label}</button>`).join('')}</div><span class="status" data-k="n"></span></div>`;
  const sc = vesselScene(F, ctx, { onTap: v => tap(v), onLayout: () => drawRow(), topPad: 36 });
  const row = F.layer('cuprow');
  // つかった コップを 上に ならべる（数が 見える）
  function drawRow() {
    clear(row); if (!sc.vs.length) return;
    const n = st.n + (st.part ? 1 : 0); if (!n) return;
    const s = Math.min(26, (F.W - 40) / Math.max(10, n)), y = F.top + F.cap + 4, x0 = (F.W - n * (s + 4)) / 2;
    for (let i = 0; i < n; i++) { const g = el('g', { transform: `translate(${x0 + i * (s + 4)},${y})` }, row); rect(g, 0, 0, s, s * 1.15, { rx: 3, fill: C('glass'), stroke: C('glass-line'), 'stroke-width': 1.5 }); const f = i < st.n ? 1 : 0.45; rect(g, 1.5, s * 1.15 * (1 - f) + 1, s - 3, s * 1.15 * f - 2, { fill: C('water') }); }
  }
  const status = () => { $p(panel, '[data-k="n"]').innerHTML = `<b>${st.n}</b>${hai(st.n)}${st.part ? 'と すこし' : ''}`; };
  const setup = () => {
    st.n = 0; st.part = false; st.done = false;
    sc.set([{ kind: cont, id: 'src', vol: capOf(cont) }, { kind: CUPS[cup].kind, id: 'cup', name: CUPS[cup].label, gap: 6 }]);
    status(); drawRow();
    say(`<b>${nameOf(cont)}</b>の みずは、${CUPS[cup].label} なんばいぶん？ ${nameOf(cont)}を タッチ → コップを タッチ`, `${nameOf(cont)}の水は、${CUPS[cup].label}何杯分？`);
  };
  setup();
  async function tap(v) {
    if (sc.busy) return;
    if (st.done) { ctx.toast('', 'ほかの いれものか コップに かえて みよう', 1.8); return; }
    const src = sc.byId('src'), c = sc.byId('cup');
    if (!sc.sel) { if (v !== src) { sfx.off(); ctx.toast('', `さきに ${nameOf(cont)}を タッチ`, 1.6); return; } sfx.tap(); sc.select(src); say('コップを タッチ', 'コップをタッチ'); return; }
    if (v === src) { sc.select(null); return; }
    sc.select(null); const tag = S.token;
    await sc.pour(src, c, { careful: true }); if (!alive(tag)) return;
    if (c.vol >= c.cap - 0.5) { st.n++; status(); drawRow(); say(`<b>${st.n}${hai(st.n)}</b>`, `${st.n}杯`); await sc.dump(c, true); if (!alive(tag)) return; }
    if (src.vol < 0.5) {
      if (c.vol > 0.5) { st.part = true; status(); drawRow(); }
      finish();
    }
  }
  function finish() {
    st.done = true;
    const txtN = `${st.n}${hai(st.n)}${st.part ? 'と すこし' : ''}`;
    st.used[cont] = Object.assign(st.used[cont] || {}, { [cup]: txtN });
    ctx.register(coll, `${cont}:${cup}`);
    sfx.good(); const ce = sc.center(sc.byId('cup')); hanamaru(F.svg, ce.x, ce.y, ce.r);
    const both = st.used[cont].s && st.used[cont].b;
    ctx.toast(ICON.HANAMARU, both ? `${nameOf(cont)}：ちいさい コップで ${st.used[cont].s}、おおきい コップで ${st.used[cont].b}。<br>コップが ちがうと かずも ちがう` : `${nameOf(cont)}は ${CUPS[cup].label} <b>${txtN}ぶん</b>`, 3.6);
    ctx.log('cups', { correct: true, detail: { cont, cup, n: st.n, part: st.part } });
    if (both) ctx.log('cupsize', { detail: { cont, s: st.used[cont].s, b: st.used[cont].b } });
  }
  $$p(panel, '[data-cont]').forEach(bt => on(bt, 'click', () => {
    sfx.tap(); if (bt.dataset.cont === cont) { ctx.toast('', `いまは「${nameOf(cont)}」だよ`, 1.6); return; }
    if (sc.busy) { ctx.toast('', `みずが とまってから「${nameOf(bt.dataset.cont)}」に してね`, 1.8); return; }
    cont = bt.dataset.cont; $$p(panel, '[data-cont]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cont === cont))); setup();
  }));
  $$p(panel, '[data-cup]').forEach(bt => on(bt, 'click', () => {
    sfx.tap(); if (bt.dataset.cup === cup) { ctx.toast('', `いまは「${CUPS[cup].label}」だよ`, 1.6); return; }
    if (sc.busy) { ctx.toast('', `みずが とまってから「${CUPS[bt.dataset.cup].label}」に してね`, 1.8); return; }
    cup = bt.dataset.cup; $$p(panel, '[data-cup]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cup === cup))); setup();
  }));
  return {
    dispose() { sc.dispose(); },
    test: {
      state: () => ({ cont, cup, n: st.n, done: st.done, busy: sc.busy }),
      auto() { if (st.done) return { done: true }; if (sc.busy) return { wait: 300 }; return sc.tap(sc.sel ? sc.byId('cup') : sc.byId('src')); },
    },
  };
}
