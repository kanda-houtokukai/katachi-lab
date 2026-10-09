// ます（かさ K1・K2）：水を注ぐ・移しかえる・あふれる・ますの目もり。見本 v1 の 30-water を移したもの。
// opts.mode：
//   miru（opts.script：k1｜k2）
//   measure（1Lます・1dLますで 身の回りの入れ物を はかる。opts.list：入れ物、opts.register：ずかんの id）
//   meter（目もりの ある 1Lますに いれて 目もりを よむ。むしめがね）
//   make（つくる「○L○dL を つくる」。注ぎ方を ずかん k2-masu に あつめる）
//   same（つくる「おなじ かさを つくる」：形の ちがう 入れ物に おなじ かさを入れ、おなじ コップに うつして たしかめる）
import { vesselScene, capOf, nameOf } from './_vessels.js';
import { el, C, txt, rect, line, clear, wait, tween, E, lerp, hanamaru, loupe } from './_flat.js';
import { masuTargets, masuWays, dlText } from './_water.js';
import { hai, count, fmtVol, unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';
import { pick } from '../core/text.js';

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'measure';
  const F = ctx.openFlat();
  let sc = null;
  const api = { dispose() { sc && sc.dispose(); }, test: {} };
  const say = (h, s) => ctx.caption(h, 0, s || null);
  const RED = () => C('face-1'), BLUE = () => C('face-4');
  // 水面の高さの線（くらべる）
  const lines = F.layer('levels');
  const levelLines = vs => {
    clear(lines);
    for (const v of vs) { if (v.vol <= 0.5) continue; const y = sc.levelY(v); line(lines, 12, y, F.W - 12, y, { stroke: v.tag || C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '7 6', opacity: 0.85 }); }
  };
  const relabel = (v, name, col) => { v.name = name; v.tag = col; if (v.label) { v.label.textContent = name; v.label.setAttribute('fill', col); } };

  /* ---------- みる ---------- */
  if (mode === 'miru') {
    sc = vesselScene(F, ctx, {});
    F.onResize(() => clear(lines));
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', runId = 0;
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const my = ++runId, tag = S.token; phase = 'play';
      for (let k = 0; k < 60 && sc.busy; k++) { await wait(0.1); }
      const ok = () => alive(tag) && my === runId, w = async s => (await wait(s)) && ok();
      clear(lines);
      if (opts.script === 'k2') {
        sc.set([{ kind: 'masu1dL', id: 'd' }, { kind: 'masu1L', id: 'L', gap: 6 }]);
        const d = sc.byId('d'), L = sc.byId('L');
        say('みずの かさを はかる <b>1dLます</b>と <b>1Lます</b>', '水のかさをはかる、1デシリットルますと、1リットルます'); if (!(await w(2.6))) return;
        for (let i = 1; i <= 10; i++) {
          await sc.fill(d, null, true); if (!ok()) return;
          await sc.pour(d, L, { fast: true }); if (!ok()) return;
          say(`1dLます <b>${i}${hai(i)}</b>`, `${i}杯`);
        }
        sc.showNums(L, true);
        say('1dLます 10ぱいで 1Lます いっぱい。<b>1L＝10dL</b>', '1デシリットルます10杯で、1リットルますいっぱい。1リットルは10デシリットル'); if (!(await w(3.4))) return;
        await zoomML(L, ok); if (!ok()) return;
        say('つぎは「さわる」で いろいろな いれものを はかろう', '次は「さわる」で、いろいろな入れ物をはかろう');
      } else {
        const A = () => sc.byId('a'), B = () => sc.byId('b');
        sc.set([{ kind: 'tall', id: 'a', vol: 350, name: 'あか', tag: RED() }, { kind: 'wide', id: 'b', vol: 450, name: 'あお', tag: BLUE() }, { kind: 'glass', id: 'c1', gap: 5 }, { kind: 'glass', id: 'c2' }]);
        say('<b>あか</b>と <b>あお</b>、みずが おおいのは どっち？', 'あかとあお、水が多いのはどっち？'); if (!(await w(2.8))) return;
        levelLines([A(), B()]); say('みずの たかさは あかの ほうが たかい。でも…', '水の高さは、あかのほうが高い。でも'); if (!(await w(2.6))) return;
        clear(lines); say('おなじ コップに うつして くらべよう', '同じコップにうつして、くらべよう'); if (!(await w(1.2))) return;
        await sc.pour(A(), sc.byId('c1')); if (!ok()) return; relabel(sc.byId('c1'), 'あか', RED());
        await sc.pour(B(), sc.byId('c2')); if (!ok()) return; relabel(sc.byId('c2'), 'あお', BLUE());
        levelLines([sc.byId('c1'), sc.byId('c2')]);
        say('ひくく みえた <b>あお</b>の ほうが おおかった！', '低く見えた、あおのほうが多かった'); if (!(await w(3.4))) return;
        clear(lines);
        sc.set([{ kind: 'tall', id: 'a', vol: 450, name: 'あか', tag: RED() }, { kind: 'wide', id: 'b', vol: 0, name: 'あお', tag: BLUE(), gap: 8 }]);
        say('いっぱいの <b>あか</b>の みずを <b>あお</b>に うつすと…', 'いっぱいのあかの水を、あおにうつすと'); if (!(await w(1.8))) return;
        await sc.pour(A(), B()); if (!ok()) return;
        say('あおは まだ はいる。<b>あお</b>の ほうが たくさん はいる', 'あおはまだ入る。あおのほうがたくさん入る'); if (!(await w(3))) return;
        sc.set([{ kind: 'wide', id: 'b', vol: 400, name: 'あお', tag: BLUE() }, { kind: 'cup-s', id: 'cup', name: 'コップ', gap: 6 }]);
        say('コップで なんばいぶんか かぞえよう', 'コップで何杯分か、数えよう'); if (!(await w(1.6))) return;
        for (let i = 1; i <= 4; i++) {
          await sc.pour(B(), sc.byId('cup'), { careful: true, fast: true }); if (!ok()) return;
          say(`<b>${i}${hai(i)}</b>`, `${i}杯`); await sc.dump(sc.byId('cup'), true); if (!ok()) return;
        }
        say('あおは コップ <b>4はいぶん</b>', 'あおはコップ4杯分'); if (!(await w(2.6))) return;
        say('つぎは「さわる」で うつして みよう', '次は「さわる」で、うつしてみよう');
      }
      ctx.log('miru'); phase = 'done';
    }
    // 1dL を 100こに わけた 1つぶんが 1mL（ズーム）
    async function zoomML(L, ok) {
      const g = F.layer('zoom'); clear(g);
      const k = sc.k, w = L.w * k, h = L.h * k, x0 = L.x - w / 2, y0 = sc.tableY - h / 10;
      const top = F.top + F.cap + 14 + (F.W < 500 ? 24 : 0), bh = Math.min(sc.tableY - top - 46, F.W * 0.5), bw = Math.min(F.W - 40, bh * 1.5), bx = (F.W - bw) / 2, by = top + 4;
      const bg = rect(g, 0, 0, F.W, F.H, { fill: C('paper'), opacity: 0 });
      const box = rect(g, x0, y0, w, h / 10, { fill: C('water'), stroke: C('masu-mark'), 'stroke-width': 3 });
      say('1dL（目もり 1つぶん）を おおきく して みると…', '1デシリットルを大きくしてみると');
      await tween(0.9, e => { const t = E.io(e); bg.setAttribute('opacity', 0.82 * t); box.setAttribute('x', lerp(x0, bx, t)); box.setAttribute('y', lerp(y0, by, t)); box.setAttribute('width', Math.max(0, lerp(w, bw, t))); box.setAttribute('height', Math.max(0, lerp(h / 10, bh, t))); });
      if (!ok()) return;
      txt(g, bx + bw / 2, by + bh + 22, '1dL', { 'font-size': 18, fill: C('masu-mark'), class: 'ui' });
      say('100こに わけると…', '100個に分けると');
      for (let i = 1; i < 10; i++) { line(g, bx + bw * i / 10, by, bx + bw * i / 10, by + bh, { stroke: C('masu-mark'), 'stroke-width': 1.2 }); line(g, bx, by + bh * i / 10, bx + bw, by + bh * i / 10, { stroke: C('masu-mark'), 'stroke-width': 1.2 }); sfx.tick(i); if (!(await wait(0.12)) || !ok()) return; }
      rect(g, bx, by + bh * 0.9, bw / 10, bh / 10, { fill: C('ok'), opacity: 0.85 });
      say('1つぶんが <b>1mL</b>。1dL＝100mL、<b>1L＝1000mL</b>', '1つ分が1ミリリットル。1デシリットルは100ミリリットル、1リットルは1000ミリリットル');
      if (!(await wait(3.6)) || !ok()) return;
      await tween(0.5, e => { g.setAttribute('opacity', 1 - e); });
      clear(g); g.setAttribute('opacity', 1);
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ---------- さわる・つくる：1Lます・1dLますで はかる ---------- */
  if (mode === 'measure') {
    const list = opts.list || ['pet500', 'milk1L', 'donburi'];
    let cur = list[0];
    const st = { L: 0, d: 0, done: false, demo: false };
    panel.innerHTML = `<div class="chips" data-k="conts">${list.map(id => `<button type="button" class="chip" data-cont="${id}" aria-pressed="${id === cur}">${nameOf(id)}</button>`).join('')}</div>
      <div class="status" data-k="tally"></div>
      <div class="row"><button class="btn sub small" type="button" data-k="demo">おてほん</button><button class="btn sub small" type="button" data-k="reset">${ctx.ICONS_UI.again} もとに もどす</button></div>`;
    const tally = () => { $p(panel, '[data-k="tally"]').innerHTML = `1Lます <b>${st.L}</b>${hai(st.L)}　1dLます <b>${st.d}</b>${hai(st.d)}`; };
    const hello = () => say(`<b>${nameOf(cur)}</b>を タッチして、ますに うつそう`, `${nameOf(cur)}をタッチして、ますにうつそう`);
    const setup = () => { sc.set([{ kind: cur, id: 'src', vol: capOf(cur) }, { kind: 'masu1L', id: 'L', gap: 5 }, { kind: 'masu1dL', id: 'd' }]); st.L = 0; st.d = 0; st.done = false; st.demo = false; tally(); };
    sc = vesselScene(F, ctx, { onTap: v => tapV(v) });
    setup(); hello();
    const V = id => sc.byId(id);
    function tapV(v) {
      if (sc.busy || st.demo) return;
      if (st.done) { ctx.toast('', '「もとに もどす」で もういちど はかれるよ', 2); return; }
      if (!sc.sel) { if (v.vol <= 0.5) { sfx.off(); ctx.toast('', `${v.name}は からっぽ`, 1.6); return; } sfx.tap(); sc.select(v); say('どこに うつす？ ますを タッチ', 'どこにうつす？ますをタッチ'); return; }
      if (sc.sel === v) { sc.select(null); hello(); return; }
      const src = sc.sel; sc.select(null); go(src, v);
    }
    async function go(src, dst) {
      const tag = S.token;
      await sc.pour(src, dst, { careful: dst.masu, fast: st.demo }); if (!alive(tag)) return;
      if (dst.masu && dst.vol >= dst.cap - 0.5) {
        if (dst.id === 'L') st.L++; else st.d++;
        tally(); const n = dst.id === 'L' ? st.L : st.d;
        say(`${dst.name} <b>${n}${hai(n)}</b>`, `${unitSpeech(dst.name)}${n}杯`);
        await sc.dump(dst, true); if (!alive(tag)) return;
      } else if (dst.id === 'L' && V('src').vol < 0.5 && dst.vol > 0.5) say('1Lますが いっぱいに ならない。<b>1dLます</b>で はかろう', '1リットルますがいっぱいにならない。1デシリットルますではかろう');
      if (V('src').vol < 0.5 && V('L').vol < 0.5 && V('d').vol < 0.5) finish();
    }
    function finish() {
      st.done = true; st.demo = false;
      const ml = st.L * 1000 + st.d * 100, b = cur;
      const extra = st.d >= 10 ? `（1dLます 10ぱいで 1L）` : '';
      sfx.good(); const c = sc.center(V('L')); hanamaru(F.svg, c.x, c.y, c.r);
      ctx.toast(ICON.HANAMARU, `${nameOf(b)}は <b>${fmtVol(ml)}</b>${extra}`, 3.2, unitSpeech(`${nameOf(b)}は${fmtVol(ml)}`));
      ctx.log('measure', { correct: true, detail: { id: b, ml, L: st.L, dL: st.d } });
      if (opts.register) { ctx.register(opts.register, b); ctx.done('kasa'); }
    }
    $$p(panel, '[data-cont]').forEach(bt => on(bt, 'click', () => {
      sfx.tap();
      if (bt.dataset.cont === cur) { ctx.toast('', `いまは「${nameOf(cur)}」だよ`, 1.6); return; }
      if (sc.busy || st.demo) { ctx.toast('', `みずが とまってから「${nameOf(bt.dataset.cont)}」に してね`, 1.8); return; }
      cur = bt.dataset.cont; $$p(panel, '[data-cont]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cont === cur))); setup(); hello();
    }));
    on($p(panel, '[data-k="reset"]'), 'click', () => { sfx.tap(); if (sc.busy || st.demo) { ctx.toast('', 'みずが とまってから もどすね', 1.8); return; } setup(); ctx.toast('', `${nameOf(cur)}に みずを いれなおしたよ`, 1.8); });
    on($p(panel, '[data-k="demo"]'), 'click', async () => {
      sfx.tap(); if (sc.busy || st.demo) { ctx.toast('', 'いま おてほんを して いるよ', 1.6); return; }
      if (st.done) setup();
      st.demo = true; say('みててね。1Lますから はかるよ', '見ててね。1リットルますからはかるよ');
      const tag = S.token;
      for (let n = 0; n < 60 && !st.done && alive(tag); n++) { const s = V('src').vol > 0.5 ? V('src') : V('L'); const d = s.id === 'src' && s.vol >= 999.5 ? V('L') : V('d'); await go(s, d); }
    });
    api.test = {
      state: () => ({ cur, L: st.L, d: st.d, done: st.done, busy: sc.busy }),
      auto() {
        if (st.done) return { done: true };
        if (sc.busy || st.demo) return { wait: 300 };
        const s = V('src'), L = V('L'), d = V('d');
        if (!sc.sel) return sc.tap(s.vol > 0.5 ? s : L.vol > 0.5 ? L : d);
        if (sc.sel === s) return sc.tap(s.vol >= 999.5 ? L : d);
        return sc.tap(d);
      },
    };
    return api;
  }

  /* ---------- さわる：目もりを よむ（V5） ---------- */
  if (mode === 'meter') {
    let v = 0, counted = false, lens = false, lp = null, last = 0;
    panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="fill">みずを いれる</button><button class="btn sub small" type="button" data-k="count">めもりを かぞえる</button><button class="btn sub small" type="button" data-k="lens" aria-pressed="false">むしめがね</button><button class="btn sub small" type="button" data-k="dump">${ctx.ICONS_UI.trash} すてる</button></div>`;
    sc = vesselScene(F, ctx, { onLayout: () => drawLens() });
    sc.set([{ kind: 'masu1L', id: 'a' }, { kind: 'masu1L', id: 'b', gap: 4 }]);
    const A = () => sc.byId('a'), B = () => sc.byId('b');
    const partial = () => (v > 10 ? B() : A());
    function drawLens() {
      if (lp) { lp.remove(); lp = null; }
      if (!lens || !sc || v === 0 || sc.busy) return;
      const P = partial(), k = sc.k, x = P.x + P.w * k / 2 - 4, y = sc.levelY(P), r = Math.min(70, Math.max(44, F.W * 0.08));
      const lx = Math.min(F.W - r - 10, P.x + P.w * k / 2 + r + 16), ly = Math.max(F.top + F.cap + r + 4, y - r * 0.6);
      lp = loupe(F.svg, P.g, { fx: x, fy: y, x: lx > P.x + P.w * k / 2 ? lx : Math.max(r + 10, P.x - P.w * k / 2 - r - 16), y: ly, r, k: 2.6 });
    }
    const tag0 = S.token;
    on($p(panel, '[data-k="fill"]'), 'click', async () => {
      sfx.tap(); if (sc.busy) { ctx.toast('', 'いま みずを いれて いるよ', 1.4); return; }
      let n; do n = 2 + Math.floor(Math.random() * 17); while (n === last || n === 10); last = n;
      v = n; counted = false; sc.resetMarks(A()); sc.resetMarks(B()); drawLens(); ctx.hideHud();
      A().vol = 0; B().vol = 0; sc.draw();
      await sc.fill(A(), Math.min(10, n) * 100, true); if (!alive(tag0)) return;
      if (n > 10) { await sc.fill(B(), (n - 10) * 100, true); if (!alive(tag0)) return; }
      drawLens(); say('なんL なんdL かな？「めもりを かぞえる」で たしかめよう', '何リットル何デシリットルかな？目もりを数えるで、確かめよう');
    });
    on($p(panel, '[data-k="count"]'), 'click', async () => {
      sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから かぞえよう', 1.4); return; }
      if (!v) { sfx.off(); ctx.toast('', 'さきに「みずを いれる」を おしてね', 2); return; }
      const tag = S.token; sc.busy = true;
      if (v >= 10) { say('ひとつめの 1Lますは いっぱい → <b>1L</b>', 'ひとつめの1リットルますはいっぱい。1リットル'); sc.showNums(A(), true); await wait(1.2); if (!alive(tag)) return; }
      const P = partial(), n = v % 10 || (v >= 10 ? 0 : 10);
      if (v !== 10) { await sc.countMarks(P, v > 10 ? v - 10 : v, 0.3); if (!alive(tag)) return; }
      sc.busy = false; counted = true;
      say(`<b>${dlText(v)}</b>${v > 10 ? `（${v}dL）` : ''}`, unitSpeech(dlText(v)));
      ctx.log('meter', { detail: { dl: v } });
    });
    on($p(panel, '[data-k="lens"]'), 'click', e => { sfx.tap(); lens = !lens; e.currentTarget.setAttribute('aria-pressed', String(lens)); drawLens(); if (lens) say(v ? 'みずの めんと めもりを ちかくで みよう' : 'みずを いれると むしめがねで みられるよ', v ? '水の面と目もりを近くで見よう' : '水を入れると、虫めがねで見られるよ'); else ctx.hideHud(); });
    on($p(panel, '[data-k="dump"]'), 'click', async () => {
      sfx.tap(); if (sc.busy) { ctx.toast('', 'みずが とまってから すてよう', 1.4); return; }
      if (!v) { sfx.off(); ctx.toast('', 'ますは からっぽだよ', 1.6); return; }
      v = 0; counted = false; drawLens(); sc.resetMarks(A()); sc.resetMarks(B());
      if (B().vol > 0) await sc.dump(B(), true); if (A().vol > 0) await sc.dump(A(), true);
      say('からっぽに なった', '空っぽになった');
    });
    say('「みずを いれる」を おして、めもりを よもう', '「水を入れる」を押して、目もりを読もう');
    api.test = { state: () => ({ v, counted, busy: sc.busy }), auto: () => (counted ? { done: true } : sc.busy ? { wait: 300 } : !v ? { click: 'data-k=fill|' } : { click: 'data-k=count|' }) };
    return api;
  }

  /* ---------- つくる：○L○dL を つくる（注ぎ方を ずかんに） ---------- */
  if (mode === 'make') {
    const coll = opts.coll || 'k2-masu';
    const st = { T: 13, x: 0, y: 0, q: [], run: false, ok: false, poured: 0 };
    panel.innerHTML = `<div class="status" data-k="goal"></div>
      <div class="row"><button class="btn small" type="button" data-k="addL">1Lますで いれる</button><button class="btn small" type="button" data-k="addD">1dLますで いれる</button></div>
      <div class="row"><button class="btn sub small" type="button" data-k="redo">${ctx.ICONS_UI.undo} やりなおす</button><button class="btn sub small" type="button" data-k="check">できた</button><button class="btn sub small" type="button" data-k="next">つぎの かさ</button></div>`;
    sc = vesselScene(F, ctx, {});
    sc.set([{ kind: 'masu1L', id: 'L' }, { kind: 'masu1dL', id: 'd' }, { kind: 'pot', id: 'p', gap: 6 }]);
    const V = id => sc.byId(id);
    const found = () => new Set(ctx.zukanList(coll));
    const goal = () => { $p(panel, '[data-k="goal"]').innerHTML = `つくる かさ <b>${dlText(st.T)}</b>　<small>1Lます ${st.x}かい・1dLます ${st.y}かい</small>`; };
    const newTarget = () => {
      const f = found(), left = masuTargets().filter(T => masuWays(T).some(w => !f.has(`${w.T}:${w.x}:${w.y}`) && w.T !== st.T));
      st.T = left.length ? pick(left) : pick(masuTargets().filter(T => T !== st.T));
      st.x = 0; st.y = 0; st.ok = false; goal();
      say(`<b>${dlText(st.T)}</b>を つくろう。1Lますと 1dLますで いれてね`, unitSpeech(`${dlText(st.T)}をつくろう。1Lますと1dLますで入れてね`));
    };
    async function process() {
      if (st.run) return; st.run = true; const tag = S.token;
      while (st.q.length && alive(tag)) {
        const kind = st.q.shift(), m = V(kind);
        await sc.fill(m, null, true); if (!alive(tag)) return;
        await sc.pour(m, V('p'), { fast: true }); if (!alive(tag)) return;
        st.poured++;
      }
      st.run = false;
    }
    const add = kind => {
      sfx.tap();
      if (st.ok) { ctx.toast('', 'できたね！「つぎの かさ」を おしてね', 1.8); return; }
      if (kind === 'L') st.x++; else st.y++;
      goal(); st.q.push(kind); process();
    };
    on($p(panel, '[data-k="addL"]'), 'click', () => add('L'));
    on($p(panel, '[data-k="addD"]'), 'click', () => add('d'));
    const empty = async () => { const tag = S.token; st.q = []; for (let n = 0; n < 40 && st.run; n++) await wait(0.1); if (!alive(tag)) return; if (V('p').vol > 0) await sc.dump(V('p'), true); };
    on($p(panel, '[data-k="redo"]'), 'click', async () => {
      sfx.tap(); if (!st.x && !st.y && !V('p').vol) { ctx.toast('', 'まだ なにも いれて いないよ', 1.6); return; }
      st.x = 0; st.y = 0; st.ok = false; goal(); say('からっぽに して やりなおそう', '空っぽにしてやりなおそう'); await empty();
    });
    on($p(panel, '[data-k="next"]'), 'click', async () => { sfx.tap(); newTarget(); await empty(); });
    on($p(panel, '[data-k="check"]'), 'click', () => {
      sfx.tap();
      if (st.run || sc.busy) { ctx.toast('', 'みずが とまってから「できた」を おしてね', 1.8); return; }
      if (st.ok) { ctx.toast('', 'もう できて いるよ。「つぎの かさ」へ', 1.8); return; }
      const tot = st.x * 10 + st.y;
      if (!tot) { sfx.off(); ctx.toast('', 'ますで みずを いれてね', 1.6); return; }
      if (tot === st.T) {
        st.ok = true; const id = `${st.T}:${st.x}:${st.y}`, isNew = !found().has(id);
        ctx.register(coll, id); sfx.good(); const c = sc.center(V('p')); hanamaru(F.svg, c.x, c.y, c.r);
        const how = [st.x ? `1Lます ${st.x}かい` : '', st.y ? `1dLます ${st.y}かい` : ''].filter(Boolean).join('＋');
        ctx.toast(ICON.HANAMARU, `${dlText(st.T)} できた！ ${how}${isNew ? '' : '<br><small>この そそぎかたは もう ずかんに あるよ</small>'}`, 3.2, unitSpeech(`${dlText(st.T)}できた`));
        ctx.log('make', { correct: true, detail: { T: st.T, x: st.x, y: st.y, isNew } }); ctx.done('make');
        const rest = masuWays(st.T).filter(w => !found().has(`${w.T}:${w.x}:${w.y}`));
        setTimeout(() => { if (alive(tag0) && st.ok) say(rest.length ? `${dlText(st.T)}は ほかの そそぎかたも あるよ` : 'つぎの かさに ちょうせん しよう'); }, 3300);
      } else {
        sfx.bad(); const mistake = tot === Math.floor(st.T / 10) + st.T % 10 ? 'V4' : 'other';
        ctx.toast(ICON.X, `いまは ${dlText(tot)}。${tot > st.T ? 'おおすぎる' : 'たりない'}よ`, 2.6, unitSpeech(`今は${dlText(tot)}`));
        ctx.log('make', { correct: false, detail: { T: st.T, x: st.x, y: st.y, mistake } });
      }
    });
    const tag0 = S.token;
    newTarget();
    api.test = {
      state: () => ({ T: st.T, x: st.x, y: st.y, ok: st.ok, run: st.run }),
      auto() {
        if (st.ok) return { done: true };
        if (st.run || sc.busy) return { wait: 300 };
        const tot = st.x * 10 + st.y;
        if (tot > st.T) return { click: 'data-k=redo|' };
        if (tot === st.T) return { click: 'data-k=check|' };
        return { click: st.T - tot >= 10 ? 'data-k=addL|' : 'data-k=addD|' };
      },
    };
    return api;
  }

  /* ---------- つくる：おなじ かさを つくる（K1） ---------- */
  if (mode === 'same') {
    const PAIRS = [['tall', 'wide', 300], ['wide', 'tall', 350], ['glass', 'donburi', 250], ['donburi', 'glass', 400], ['suito', 'wide', 300]];
    let pi = 0, want = 0, phase = 'ask', solved = 0;
    panel.innerHTML = `<div class="row"><button class="btn small" type="button" data-k="more">たくさん いれる</button><button class="btn sub small" type="button" data-k="bit">すこし いれる</button><button class="btn sub small" type="button" data-k="less">すこし へらす</button></div>
      <div class="row"><button class="btn" type="button" data-k="cmp">くらべる</button><button class="btn sub small" type="button" data-k="nextp">つぎの もんだい</button></div>`;
    sc = vesselScene(F, ctx, {});
    const V = id => sc.byId(id);
    const setup = () => {
      const [a, b, amt] = PAIRS[pi % PAIRS.length]; want = amt; phase = 'ask'; clear(lines);
      sc.set([{ kind: a, id: 's', vol: amt, name: 'みほん', tag: RED() }, { kind: b, id: 't', vol: 0, name: 'つくる', tag: BLUE() }, { kind: 'glass', id: 'c1', gap: 5 }, { kind: 'glass', id: 'c2' }]);
      say('<b>みほん</b>と おなじ かさを、<b>つくる</b>に いれよう', '見本と同じかさを、つくるに入れよう');
    };
    setup();
    const tag0 = S.token;
    const addW = async d => {
      sfx.tap();
      if (sc.busy || phase !== 'ask') { ctx.toast('', phase === 'done' ? 'できたね！「つぎの もんだい」へ' : 'うごきが おわるまで まってね', 1.6); return; }
      const t = V('t'), to = Math.max(0, Math.min(t.cap, t.vol + d));
      if (to === t.vol) { sfx.off(); ctx.toast('', d < 0 ? 'もう からっぽだよ' : 'もう いっぱいだよ', 1.6); return; }
      if (d > 0) await sc.fill(t, to, true); else { t.vol = to; t.wave = 1; sc.draw(); }
      if (!alive(tag0)) return; ctx.hideHud();
    };
    on($p(panel, '[data-k="more"]'), 'click', () => addW(100));
    on($p(panel, '[data-k="bit"]'), 'click', () => addW(50));
    on($p(panel, '[data-k="less"]'), 'click', () => addW(-50));
    on($p(panel, '[data-k="nextp"]'), 'click', () => { sfx.tap(); if (sc.busy) { ctx.toast('', 'うごきが おわったら つぎへ', 1.6); return; } pi++; setup(); });
    on($p(panel, '[data-k="cmp"]'), 'click', async () => {
      sfx.tap();
      if (sc.busy || phase !== 'ask') { ctx.toast('', phase === 'done' ? 'できたね！「つぎの もんだい」へ' : 'うごきが おわるまで まってね', 1.6); return; }
      const t = V('t'); if (t.vol <= 0) { sfx.off(); ctx.toast('', 'さきに「つくる」に みずを いれてね', 1.8); return; }
      phase = 'busy'; const tag = S.token, got = t.vol;
      say('おなじ コップに うつして くらべよう', '同じコップにうつして、くらべよう');
      await sc.pour(V('s'), V('c1'), { fast: true }); if (!alive(tag)) return; relabel(V('c1'), 'みほん', RED());
      await sc.pour(t, V('c2'), { fast: true }); if (!alive(tag)) return; relabel(V('c2'), 'つくる', BLUE());
      levelLines([V('c1'), V('c2')]);
      const ok = Math.abs(got - want) < 1;
      ctx.log('make', { correct: ok, detail: { want, got, pair: PAIRS[pi % PAIRS.length].slice(0, 2).join('-'), mistake: ok ? null : 'V1' } });
      if (ok) {
        phase = 'done'; solved++; sfx.good(); const c = sc.center(V('c2')); hanamaru(F.svg, c.x, c.y, c.r);
        ctx.toast(ICON.HANAMARU, 'おなじ たかさ！ かたちが ちがっても おなじ かさ', 3, '同じ高さ！形が違っても同じかさ'); ctx.done('same');
      } else {
        sfx.bad(); ctx.toast(ICON.X, got > want ? '<b>つくる</b>の ほうが おおい。すこし へらそう' : '<b>つくる</b>の ほうが すくない。もうすこし いれよう', 2.8);
        if (!(await wait(2.4)) || !alive(tag)) return;
        // もとに もどす
        V('s').vol = want; t.vol = got; V('c1').vol = 0; V('c2').vol = 0; relabel(V('c1'), 'コップ', C('ink-soft')); relabel(V('c2'), 'コップ', C('ink-soft')); clear(lines); sc.draw(); phase = 'ask';
        say('もとに もどしたよ。もう いちど', 'もとに戻したよ。もう一度');
      }
    });
    api.test = {
      state: () => ({ phase, want, got: sc && V('t') ? V('t').vol : 0, solved }),
      auto() {
        if (phase === 'done') return { done: true };
        if (sc.busy || phase !== 'ask') return { wait: 300 };
        const d = want - V('t').vol;
        if (Math.abs(d) < 1) return { click: 'data-k=cmp|' };
        return { click: d >= 100 ? 'data-k=more|' : d > 0 ? 'data-k=bit|' : 'data-k=less|' };
      },
    };
    return api;
  }
  return api;
}
