// kurabe（かさ）：注ぎ移して くらべる（K1）。kurabe.js が opts.qty='kasa' のときに読む。
// opts.mode：pour（うつしかえる：いっぱいの 水を もう一方へ。あふれたら 注いだ方が おおい）｜cups（おなじ コップに うつして 水面の 高さで くらべる）
import { vesselScene } from './_vessels.js';
import { C, line, clear, wait, hanamaru } from './_flat.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { pick } from '../core/text.js';

const PAIRS = [
  { id: 'tw', a: 'tall', b: 'wide', label: 'ほそながい と ひくい' },
  { id: 'dg', a: 'donburi', b: 'glass', label: 'どんぶり と コップ' },
  { id: 'sc', a: 'suito', b: 'cup', label: 'すいとう と コップ' },
];
export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'pour';
  const F = ctx.openFlat();
  const RED = C('face-1'), BLUE = C('face-4');
  const say = (h, s) => ctx.caption(h, 0, s || null);
  let sc = null;
  const lines = F.layer('levels');
  const levelLines = vs => { clear(lines); for (const v of vs) { if (v.vol <= 0.5) continue; const y = sc.levelY(v); line(lines, 12, y, F.W - 12, y, { stroke: v.tag || C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '7 6', opacity: 0.85 }); } };
  const relabel = (v, name, col) => { v.name = name; v.tag = col; if (v.label) { v.label.textContent = name; v.label.setAttribute('fill', col); } };
  const api = { dispose() { sc && sc.dispose(); }, test: {} };
  const tag0 = S.token;

  /* ---------- うつしかえる ---------- */
  if (mode === 'pour') {
    let pair = PAIRS[0], rev = false, result = null, tries = 0;
    panel.innerHTML = `<div class="chips">${PAIRS.map(p => `<button type="button" class="chip" data-pair="${p.id}" aria-pressed="${p === pair}">${p.label}</button>`).join('')}</div>
      <div class="row"><button class="btn sub small" type="button" data-k="rev">ぎゃくに する</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.again} もとに もどす</button></div>`;
    sc = vesselScene(F, ctx, { onTap: v => tap(v) });
    F.onResize(() => { if (result) levelLines([]); });
    const setup = () => {
      result = null; clear(lines);
      const full = rev ? pair.b : pair.a, empty = rev ? pair.a : pair.b;
      sc.set([{ kind: full, id: 'a', name: 'あか', tag: RED, vol: 0 }, { kind: empty, id: 'b', name: 'あお', tag: BLUE, vol: 0, gap: 7 }]);
      const a = sc.byId('a'); a.vol = a.cap; sc.draw();
      say('いっぱいの <b>あか</b>を タッチ → <b>あお</b>を タッチして うつそう', 'いっぱいのあかをタッチ、あおをタッチして、うつそう');
    };
    setup();
    async function tap(v) {
      if (sc.busy) return;
      if (result) { ctx.toast('', '「もとに もどす」で もういちど', 1.6); return; }
      const a = sc.byId('a'), b = sc.byId('b');
      if (!sc.sel) { if (v !== a) { sfx.off(); ctx.toast('', 'さきに いっぱいの <b>あか</b>を タッチ', 1.8); return; } sfx.tap(); sc.select(a); say('<b>あお</b>を タッチ', 'あおをタッチ'); return; }
      if (v === a) { sc.select(null); say('いっぱいの <b>あか</b>を タッチ'); return; }
      sc.select(null); const tag = S.token;
      await sc.pour(a, b); if (!alive(tag)) return;
      tries++;
      const over = sc.spill > 1;
      result = over ? 'a' : b.vol >= b.cap - 0.5 ? 'same' : 'b';
      if (over) { sfx.good(); ctx.toast(ICON.HANAMARU, '<b>あふれた！</b> <b>あか</b>の ほうが たくさん はいる', 3, 'あふれた！あかのほうがたくさん入る'); }
      else if (result === 'same') ctx.toast('', 'ちょうど いっぱい。おなじ かさ', 3);
      else { levelLines([b]); sfx.good(); ctx.toast(ICON.HANAMARU, '<b>あお</b>は まだ はいる。<b>あお</b>の ほうが たくさん はいる', 3.2, 'あおはまだ入る。あおのほうがたくさん入る'); }
      ctx.log('pour', { correct: true, detail: { pair: pair.id, rev, result } });
    }
    $$p(panel, '[data-pair]').forEach(bt => on(bt, 'click', () => {
      sfx.tap(); const p = PAIRS.find(x => x.id === bt.dataset.pair);
      if (p === pair) { ctx.toast('', `いまは「${p.label}」だよ`, 1.6); return; }
      if (sc.busy) { ctx.toast('', `みずが とまってから「${p.label}」に してね`, 1.8); return; }
      pair = p; rev = false; $$p(panel, '[data-pair]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pair === p.id))); setup();
    }));
    on($p(panel, '[data-k="rev"]'), 'click', () => { sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから ぎゃくに しよう', 1.6); return; } rev = !rev; setup(); ctx.toast('', 'こんどは ぎゃくの いれものを いっぱいに したよ', 1.8); });
    on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから もどすね', 1.6); return; } setup(); ctx.toast('', 'みずを もとに もどしたよ', 1.6); });
    api.test = {
      state: () => ({ pair: pair.id, result, tries, busy: sc.busy }),
      auto() { if (result) return { done: true }; if (sc.busy) return { wait: 300 }; return sc.tap(sc.sel ? sc.byId('b') : sc.byId('a')); },
    };
    return api;
  }

  /* ---------- おなじ コップに うつす ---------- */
  let st = { from: {}, done: false };
  panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="new">ほかの みずで</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.again} もとに もどす</button></div>`;
  sc = vesselScene(F, ctx, { onTap: v => tap(v) });
  F.onResize(() => { if (st.done) levelLines([sc.byId('c1'), sc.byId('c2')]); });
  let amt = [300, 400];
  const setup = () => {
    st = { from: {}, done: false }; clear(lines);
    sc.set([{ kind: 'tall', id: 'a', name: 'あか', tag: RED, vol: amt[0] }, { kind: 'wide', id: 'b', name: 'あお', tag: BLUE, vol: amt[1] }, { kind: 'glass', id: 'c1', gap: 5 }, { kind: 'glass', id: 'c2' }]);
    say('<b>あか</b>と <b>あお</b>を、おなじ コップに うつして くらべよう', 'あかとあおを、同じコップにうつして、くらべよう');
  };
  setup();
  async function tap(v) {
    if (sc.busy) return;
    if (st.done) { ctx.toast('', '「もとに もどす」か「ほかの みずで」', 1.6); return; }
    if (!sc.sel) { if (v.vol <= 0.5) { sfx.off(); ctx.toast('', `${v.name}は からっぽ`, 1.4); return; } if (v.id.startsWith('c')) { sfx.off(); ctx.toast('', 'さきに <b>あか</b>か <b>あお</b>を タッチ', 1.6); return; } sfx.tap(); sc.select(v); say('どの コップに うつす？', 'どのコップにうつす？'); return; }
    if (sc.sel === v) { sc.select(null); return; }
    if (!v.id.startsWith('c')) { sfx.off(); ctx.toast('', 'コップを タッチしてね', 1.4); return; }
    if (v.vol > 0.5) { sfx.off(); ctx.toast('', 'その コップは もう つかったよ', 1.4); return; }
    const src = sc.sel; sc.select(null); const tag = S.token;
    await sc.pour(src, v); if (!alive(tag)) return;
    st.from[v.id] = src.id; relabel(v, src.name, src.tag);
    if (Object.keys(st.from).length === 2) {
      st.done = true; const c1 = sc.byId('c1'), c2 = sc.byId('c2'); levelLines([c1, c2]);
      const ia = st.from.c1 === 'a' ? c1 : c2, ib = ia === c1 ? c2 : c1, more = ia.vol > ib.vol + 1 ? 'あか' : ib.vol > ia.vol + 1 ? 'あお' : null;
      sfx.good(); const c = sc.center(more === 'あか' ? ia : ib); hanamaru(F.svg, c.x, c.y, c.r);
      ctx.toast(ICON.HANAMARU, more ? `おなじ コップで くらべると <b>${more}</b>の ほうが おおい` : 'おなじ たかさ。おなじ かさ', 3.2);
      ctx.log('same-cup', { correct: true, detail: { a: amt[0], b: amt[1] } });
    } else say('もう ひとつも うつそう', 'もうひとつもうつそう');
  }
  on($p(panel, '[data-k="new"]'), 'click', () => { sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから かえよう', 1.6); return; } const prev = amt.join(); do amt = pick([[300, 400], [350, 450], [400, 300], [250, 350], [300, 300], [400, 450]]); while (amt.join() === prev); setup(); ctx.toast('', 'みずの りょうを かえたよ', 1.6); });
  on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから もどすね', 1.6); return; } setup(); ctx.toast('', 'みずを もとに もどしたよ', 1.6); });
  api.test = {
    state: () => ({ done: st.done, n: Object.keys(st.from).length, busy: sc.busy }),
    auto() {
      if (st.done) return { done: true }; if (sc.busy) return { wait: 300 };
      const used = new Set(Object.values(st.from)), src = ['a', 'b'].find(id => !used.has(id)), cup = ['c1', 'c2'].find(id => !st.from[id]);
      return sc.tap(sc.sel ? sc.byId(cup) : sc.byId(src));
    },
  };
  void tag0;
  return api;
}
