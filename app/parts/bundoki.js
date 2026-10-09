// 角の大きさ（A4）と おうぎ形（EJ）。角を「回転の大きさ」として開く・分度器（0の線を合わせる・内側と外側の目もり）・180°・360°・三角定規。
// おうぎ形は同じ部品のモードにする（中心角を動かすと、弧の長さと面積が中心角に比例して変わる・円錐の展開図へ）。
// opts.mode：miru（opts.script：a4｜ej）・open（かどを ひらく）・measure（ぶんどきで はかる）・sankaku（三角定規。opts.goal で つくる）・ogi（おうぎ形）・cone（えんすいの てんかいず）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, dragOn, tapOf, pathOf, tween, wait, E, hanamaru } from './_flat.js';
import { makeAngle, makeProtractor, rulerPoly, drawRuler, makeSector, sectorD, arcD, angOf, dAng, P } from './_bundoki.js';
import { alignRots, readAt, rulerAngles, rulerResult, norm360, arcK, areaK, piTxt, arcLen, sectorArea, frac, num, r1, cones } from './_ahead-gen.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on } from './_common.js';

const deg = v => `${Math.round(v)}°`;
const RU = { chok: '<ruby>直角<rt>ちょっかく</rt></ruby>', bun: '<ruby>分度器<rt>ぶんどき</rt></ruby>', cho: '<ruby>頂点<rt>ちょうてん</rt></ruby>', hen: '<ruby>辺<rt>へん</rt></ruby>', ko: '<ruby>弧<rt>こ</rt></ruby>', men: '<ruby>面積<rt>めんせき</rt></ruby>', chu: '<ruby>中心角<rt>ちゅうしんかく</rt></ruby>', han: '<ruby>半径<rt>はんけい</rt></ruby>', en: '<ruby>円錐<rt>えんすい</rt></ruby>', ten: '<ruby>展開図<rt>てんかいず</rt></ruby>', bo: '<ruby>母線<rt>ぼせん</rt></ruby>', kai: '<ruby>回転<rt>かいてん</rt></ruby>' };

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'open';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);

  /* ======================= みる（A4） ======================= */
  if (mode === 'miru' && opts.script !== 'ej') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', L = null, ang = null, ang2 = null, pro = null;
    const build = () => {
      F.clearLayers(); const A = area(), g = F.layer('m');
      const len = Math.max(60, Math.min(A.h * 0.42, A.w * (A.land ? 0.26 : 0.42), 230));
      L = { A, len, vx: A.x0 + A.w / 2, vy: A.y0 + A.h * 0.55 };
      pro = makeProtractor(g, { R: len * 0.8 }); pro.g.setAttribute('opacity', 0); pro.set(L.vx, L.vy, 0);
      ang2 = makeAngle(g, { x: L.vx, y: L.vy, a0: 0, th: 0, len0: len * 0.5, len1: len * 0.5, fan: true, fanR: 30, label: true }); ang2.g.setAttribute('opacity', 0);
      ang = makeAngle(g, { x: L.vx, y: L.vy, a0: 0, th: 0, len0: len, len1: len, fanR: Math.min(60, len * 0.3) });
    };
    F.onResize(() => { build(); });
    build();
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    const tw = (o, key, to, sec, fn) => { const from = o.st[key]; return tween(sec, k => { o.st[key] = lerp(from, to, k); o.update(); fn && fn(); }, E.io); };
    async function run() {
      const tag = S.token, ok = () => alive(tag); phase = 'play'; build();
      const A = L.A, len = L.len;
      say('2ほんの ぼうを ひらくと…', '2本の棒を開くと'); if (!(await wait(1.2)) || !ok()) return;
      await tw(ang, 'th', 60, 2); if (!ok()) return;
      say(`<b>かど</b>が できる。ひらいた おおきさ（${RU.kai}の おおきさ）が かどの おおきさ`, '角ができる。開いた大きさ、回転の大きさが角の大きさ'); if (!(await wait(2.8)) || !ok()) return;
      // 辺の長さに まどわされない
      const x2 = A.land ? A.x0 + A.w * 0.72 : L.vx, y2 = A.land ? L.vy : L.vy;
      if (A.land) { await tween(1, k => { ang.st.x = lerp(L.vx, A.x0 + A.w * 0.28, k); ang.st.th = lerp(60, 40, k); ang.update(); }, E.io); }
      else { await tween(1, k => { ang.st.th = lerp(60, 40, k); ang.st.len0 = ang.st.len1 = lerp(len, len * 1.0, k); ang.update(); }, E.io); }
      if (!ok()) return;
      ang2.st.x = A.land ? x2 : L.vx; ang2.st.y = A.land ? y2 : L.vy; ang2.st.th = 70; ang2.st.a0 = A.land ? 0 : 0; ang2.st.col = C('sora'); ang2.update();
      if (!A.land) { ang.st.a0 = 0; ang2.st.a0 = 0; ang2.st.y = L.vy; }
      await tween(0.6, k => ang2.g.setAttribute('opacity', k)); if (!ok()) return;
      say('へんが ながい ほうが おおきい？', '辺が長いほうが大きい？'); if (!(await wait(2.2)) || !ok()) return;
      if (A.land) { const sx = ang2.st.x; await tween(1.2, k => { ang2.st.x = lerp(sx, ang.st.x, k); ang2.update(); }, E.io); if (!ok()) return; }
      say(`かさねると、へんが みじかい ほうが おおきい。${RU.hen}の ながさでは なく、ひらきぐあいで くらべる`, '重ねると、辺が短いほうが大きい。辺の長さではなく、開きぐあいで比べる'); if (!(await wait(3.4)) || !ok()) return;
      await tween(0.5, k => ang2.g.setAttribute('opacity', 1 - k)); if (!ok()) return;
      // 回転の大きさ：直角・180°・360°
      if (A.land) { await tween(0.8, k => { ang.st.x = lerp(ang.st.x, L.vx, k); ang.update(); }); if (!ok()) return; }
      ang.st.x = L.vx; ang.st.len0 = ang.st.len1 = len; ang.update();
      await tw(ang, 'th', 90, 1.2); if (!ok()) return;
      say(`まっすぐ たてまで まわすと ${RU.chok}。<b>90°</b>（90ど）`, '真っすぐ縦まで回すと直角。90度'); if (!(await wait(2.6)) || !ok()) return;
      // 1°：直角を 90こに わける
      const fg = F.layer('fan'); clear(fg);
      for (let i = 1; i < 90; i++) { const [x, y] = P(ang.st.x, ang.st.y, ang.st.len0 * 0.9, i); line(fg, ang.st.x, ang.st.y, x, y, { stroke: C('sora'), 'stroke-width': 0.8, opacity: 0 }); }
      await tween(1.4, k => [...fg.children].forEach((e, i) => e.setAttribute('opacity', k * 90 > i ? 0.7 : 0))); if (!ok()) return;
      say('直角を 90こに わけた 1つぶんが <b>1°</b>（1ど）。かどの おおきさの たんい', '直角を90個に分けた1つ分が1度。角の大きさの単位'); if (!(await wait(3)) || !ok()) return;
      clear(fg);
      await tw(ang, 'th', 180, 1.4); if (!ok()) return;
      say(`はんかいてん、${RU.chok} 2つぶんで <b>180°</b>。いっちょくせんに なる`, '半回転、直角2つ分で180度。一直線になる'); if (!(await wait(2.6)) || !ok()) return;
      await tw(ang, 'th', 360, 2); if (!ok()) return;
      say(`ひとまわり（1${RU.kai}）で <b>360°</b>`, 'ひとまわり、1回転で360度'); if (!(await wait(2.4)) || !ok()) return;
      // 分度器で はかる（0の線を合わせる・内側と外側）
      await tw(ang, 'th', 50, 1.4); if (!ok()) return;
      const sx0 = Math.min(A.x1 - pro.R, L.vx + pro.R * 0.4), sy0 = L.vy + pro.R * 0.3;
      pro.set(sx0, sy0, -25); pro.g.setAttribute('opacity', 1);
      say(`${RU.bun}で はかろう。まず まんなかを かどの ${RU.cho}に`, '分度器で測ろう。まず真ん中を角の頂点に'); if (!(await wait(1.6)) || !ok()) return;
      await tween(1.3, k => pro.set(lerp(sx0, L.vx, k), lerp(sy0, L.vy, k), -25), E.io); if (!ok()) return;
      say(`つぎに <b>0の せん</b>を ${RU.hen}に あわせる`, '次に0の線を辺に合わせる'); if (!(await wait(1.4)) || !ok()) return;
      await tween(1.1, k => pro.set(L.vx, L.vy, lerp(-25, 0, k)), E.io); if (!ok()) return;
      for (let v = 0; v <= 50; v += 10) { pro.hi('inner', Math.max(0.1, v)); say(`${v}`, String(v)); sfx.tap(); if (!(await wait(0.45)) || !ok()) return; }
      say('0から かぞえる <b>うちがわ</b>の めもりで <b>50°</b>', '0から数える内側の目もりで50度'); if (!(await wait(2.4)) || !ok()) return;
      pro.hi('outer', 130);
      say('そとがわの めもりは 130。<b>0から はじまる ほう</b>を よもう', '外側の目もりは130。0から始まるほうを読もう'); if (!(await wait(3)) || !ok()) return;
      pro.hi(null);
      say('つぎは「さわる」で かどを ひらいて みよう', '次は「さわる」で角を開いてみよう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ======================= みる（EJ） ======================= */
  if (mode === 'miru' && opts.script === 'ej') {
    panel.innerHTML = `<div class="row"><button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again} もういちど みる</button></div>`;
    let phase = 'play', sec = null, L = null, bars = null;
    const build = () => {
      F.clearLayers(); const A = area(), g = F.layer('s');
      const R = A.land ? Math.min(A.h * 0.4, A.w * 0.2) : Math.min(A.w * 0.32, A.h * 0.26);
      L = { A, R, cx: A.land ? A.x0 + A.w * 0.28 : A.x0 + A.w / 2, cy: A.land ? A.y0 + A.h * 0.5 : A.y0 + R + 26 };
      sec = makeSector(g, { x: L.cx, y: L.cy, r: R, th: 0, a0: 90 });
      bars = drawBars(F.layer('bars'), A.land ? { x: A.x0 + A.w * 0.52, y: A.y0 + A.h * 0.22, w: A.w * 0.44 } : { x: A.x0 + 6, y: L.cy + R + 30, w: A.w - 12 });
      bars.set(0, 6);
    };
    F.onResize(build); build();
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); run(); });
    async function run() {
      const tag = S.token, ok = () => alive(tag); phase = 'play'; build();
      const set = th => { sec.st.th = th; sec.update(); bars.set(th, 6); };
      say(`${RU.han} 6cmの えん。${RU.chu}を ひろげて いくと…`, '半径6センチメートルの円。中心角を広げていくと'); if (!(await wait(1.6)) || !ok()) return;
      await tween(3.2, k => set(360 * k), E.io); if (!ok()) return;
      say(`${RU.chu} 360°で えん ぜんぶ。${RU.ko}は えんしゅう、${RU.men}は えんの めんせき`, '中心角360度で円全部。弧は円周、面積は円の面積'); if (!(await wait(3)) || !ok()) return;
      for (const [th, f, fs] of [[90, '1/4', '4分の1'], [180, '1/2', '2分の1'], [60, '1/6', '6分の1']]) {
        await tween(1.4, k => set(lerp(sec.st.th, th, k)), E.io); if (!ok()) return;
        say(`${RU.chu} ${th}°は 360°の <b>${f}</b>。${RU.ko}も ${RU.men}も <b>${f}</b>`, `中心角${th}度は360度の${fs}。弧も面積も${fs}`); if (!(await wait(2.8)) || !ok()) return;
      }
      await tween(1, k => set(lerp(60, 120, k)), E.io); if (!ok()) return;
      say(`${RU.chu}が 2ばいに なると、${RU.ko}も ${RU.men}も 2ばい。<b>ひれい</b>する`, '中心角が2倍になると、弧も面積も2倍。比例する'); if (!(await wait(3)) || !ok()) return;
      bars.formula(true);
      say(`${RU.ko} ＝ 2π × ${RU.han} × <sup>${RU.chu}</sup>⁄<sub>360</sub>、${RU.men} ＝ π × ${RU.han}² × <sup>${RU.chu}</sup>⁄<sub>360</sub>`, '弧は、2πかける半径かける、360分の中心角。面積は、πかける半径の2乗かける、360分の中心角'); if (!(await wait(4)) || !ok()) return;
      bars.formula(false);
      // 円錐の展開図へ
      say(`この おうぎがたを まるめると ${RU.en}の よこの めんに なる`, 'このおうぎ形を丸めると円錐の横の面になる'); if (!(await wait(1.4)) || !ok()) return;
      const cg = F.layer('cone'); clear(cg);
      const Lc = L.R, rb = Lc * 120 / 360, cx = L.cx, top = L.cy - L.R * 0.9;
      await coneMorph(cg, sec, { L: Lc, th: 120, cx, top, rb }, 2.2); if (!ok()) return;
      say(`${RU.chu} 120°なら そこの ${RU.han}は ${RU.bo}の 1/3。かたちの「空間図形」で ${RU.ten}を くみたてて みよう`, '中心角120度なら、底の半径は母線の3分の1。かたちの空間図形で展開図を組み立ててみよう'); if (!(await wait(3.6)) || !ok()) return;
      say('つぎは「さわる」で おうぎがたを うごかそう', '次は「さわる」でおうぎ形を動かそう'); ctx.log('miru'); phase = 'done';
    }
    run();
    api.test = { state: () => ({ phase }), auto: () => (phase === 'done' ? { done: true } : { wait: 400 }) };
    return api;
  }

  /* ======================= さわる：かどを ひらく ======================= */
  if (mode === 'open') {
    let ang = null, pro = null, L = null, turns = 0, long = false, showPro = false;
    const st = { th: opts.th ?? 40 };
    const build = () => {
      F.clearLayers(); const A = area(), g = F.layer('a');
      const len = Math.max(60, Math.min(A.w / 2 - 12, A.h / 2 - 16, 230));
      L = { A, len, vx: A.x0 + A.w / 2, vy: A.y0 + A.h / 2 };
      pro = makeProtractor(g, { R: len * 0.86, full: true }); pro.set(L.vx, L.vy, 0); pro.g.setAttribute('opacity', showPro ? 0.95 : 0);
      ang = makeAngle(F.layer('b'), { x: L.vx, y: L.vy, a0: 0, th: st.th, len0: len * (long ? 1 : 0.62), len1: len * (long ? 1 : 0.62), handle: true, fanR: Math.min(64, len * 0.32) });
    };
    F.onResize(build); build();
    const setTh = th => { st.th = th; ang.st.th = th; ang.update(); };
    const word = th => th === 90 ? `${RU.chok}（<b>90°</b>）` : th === 180 ? `${RU.chok} 2つぶん、<b>180°</b>。いっちょくせん` : th === 270 ? `${RU.chok} 3つぶん、<b>270°</b>` : th === 360 ? `ひとまわり、<b>360°</b>` : th === 0 ? '0°' : `<b>${th}°</b>`;
    const wordSp = th => th === 90 ? '直角、90度' : th === 180 ? '直角2つ分、180度。一直線' : th === 270 ? '直角3つ分、270度' : th === 360 ? 'ひとまわり、360度' : `${th}度`;
    const sayTh = () => say(word(Math.round(st.th)), wordSp(Math.round(st.th)));
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { const r = Math.hypot(p.x - L.vx, p.y - L.vy); return r > 22 && r < L.len * 1.25 ? true : null; },
      start: p => { drag = { last: angOf(L.vx, L.vy, p) }; ctx.hideHud(); },
      move: p => { if (!drag) return; const a = angOf(L.vx, L.vy, p); let th = st.th + dAng(a, drag.last); drag.last = a; th = clamp(th, 0, 360); const b = Math.floor(st.th / 10); setTh(th); if (Math.floor(th / 10) !== b) sfx.tap(); },
      end: () => { if (!drag) return; drag = null; let th = Math.round(st.th); for (const s of [0, 90, 180, 270, 360]) if (Math.abs(th - s) <= 3) th = s; setTh(th); turns++; sayTh(); if ([90, 180, 360].includes(th)) sfx.good(); ctx.log('turn', { detail: { th } }); },
    });
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-go="90">${RU.chok}（90°）</button><button class="btn sub small" type="button" data-go="180">180°</button><button class="btn sub small" type="button" data-go="360">360°</button></div>
      <div class="row"><div class="seg" role="group" aria-label="みかた"><button type="button" data-tg="long" aria-pressed="false">へんを のばす</button><button type="button" data-tg="pro" aria-pressed="false">${RU.bun}</button></div></div>`;
    $$p(panel, '[data-go]').forEach(b => on(b, 'click', async () => {
      const to = +b.dataset.go; sfx.tap();
      if (Math.round(st.th) === to) { ctx.toast('', `いまは ${to}°だよ`, 1.6, `今は${to}度だよ`); return; }
      const tag = S.token, from = st.th; ctx.hideHud();
      await tween(Math.min(1.6, 0.5 + Math.abs(to - from) / 300), k => setTh(lerp(from, to, k)), E.io); if (!alive(tag)) return;
      setTh(to); sayTh(); ctx.log('turn', { detail: { th: to, jump: true } });
    }));
    $$p(panel, '[data-tg]').forEach(b => on(b, 'click', async () => {
      sfx.tap(); const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v));
      const tag = S.token;
      if (b.dataset.tg === 'long') {
        long = v; const f0 = ang.st.len0, f1 = L.len * (v ? 1 : 0.62);
        await tween(0.6, k => { ang.st.len0 = ang.st.len1 = lerp(f0, f1, k); ang.update(); }, E.io); if (!alive(tag)) return;
        say(`へんを ${v ? 'のばしても' : 'みじかく しても'}、かどの おおきさは ${Math.round(st.th)}°の まま`, `辺を${v ? '伸ばしても' : '短くしても'}、角の大きさは${Math.round(st.th)}度のまま`);
      } else {
        showPro = v; pro.g.setAttribute('opacity', v ? 0.95 : 0);
        if (v) say(`ぜんえん（360°）の ${RU.bun}。0から かぞえると ${Math.round(st.th)}°`, `全円、360度の分度器。0から数えると${Math.round(st.th)}度`); else sayTh();
      }
    }));
    say('あおい まるを ゆびで まわして、かどを ひらこう', '青い丸を指で回して、角を開こう');
    api.test = {
      state: () => ({ th: st.th, turns }),
      auto() {
        if (turns >= 1) return { done: true };
        const pts = []; for (let k = 0; k <= 14; k++) pts.push(P(L.vx, L.vy, ang.st.len1 * 0.9, st.th + k * 5));
        return pathOf(F, pts);
      },
    };
    return api;
  }

  /* ======================= さわる：ぶんどきで はかる ======================= */
  if (mode === 'measure') {
    let L = null, ang = null, pro = null, measured = 0, k = 0;
    const st = { phase: 'place', a0: 0, th: 60, side: 'right', px: 0, py: 0, rot: 0 };
    const newAngle = () => {
      const th = [[50, 'right'], [125, 'left'], [75, 'right'], [140, 'left'], [35, 'right'], [100, 'left']][k % 6];
      st.th = th[0] + (k >= 6 ? 5 : 0); st.side = th[1];
      const tilt = [8, -12, 15, -6, 0, 10][k % 6];
      st.a0 = st.side === 'right' ? tilt : 180 - st.th + tilt;
      st.phase = 'place'; k++;
    };
    const park = () => { const A = L.A; st.rot = A.land ? [20, -15, 30, -25][k % 4] : [10, -8, 12, -10][k % 4]; const dip = L.R * 1.04 * Math.sin(Math.abs(st.rot) * Math.PI / 180); if (A.land) { st.px = Math.min(A.x1 - L.R * 1.08, A.x0 + A.w * 0.76); st.py = Math.min(A.y1 - L.R * 0.1 - dip, L.vy); } else { st.px = L.vx; st.py = Math.min(A.y1 - L.R * 0.1 - dip, L.vy + L.R * 1.2); } };
    const build = () => {
      F.clearLayers(); const A = area();
      const R = A.land ? clamp(Math.min(A.w * 0.22, (A.h - 30) / 1.5), 70, 190) : clamp(Math.min((A.w - 24) / 2.3, (A.h - 40) / 2.75), 70, 190);
      L = { A, R, vx: A.land ? A.x0 + A.w * 0.3 : A.x0 + A.w / 2, vy: A.land ? A.y0 + R * 1.25 + 24 : A.y0 + R * 1.2 + 24 };
      if (A.land) L.vy = Math.min(L.vy, A.y1 - R * 0.2);
      pro = makeProtractor(F.layer('p'), { R });
      ang = makeAngle(F.layer('a'), { x: L.vx, y: L.vy, a0: st.a0, th: st.th, len0: R * 1.22, len1: R * 1.22, fan: false, label: false, w: 5 });
      if (st.phase === 'place' && !st.placed) park();
      deco();
      pro.set(st.px, st.py, st.rot);
      if (st.phase !== 'place') { const a = alignNow(); pro.hi(a ? a.which : null, st.phase === 'read' ? st.th : 0); }
    };
    // 動かし方の しるし（まんなか＝うごかす、ふち＝まわす）
    const deco = () => {
      const g = el('g', { 'pointer-events': 'none' }, pro.g), R = L.R;
      path(g, `M${-R * 0.18},${-R * 0.2}h${R * 0.36}M0,${-R * 0.38}v${R * 0.36}`, { stroke: C('sora'), 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55 });
      for (const a of [25, 155]) { const [x, y] = P(0, 0, R * 0.93, a); circle(g, x, y, 11, { fill: C('sora'), opacity: 0.85 }); path(g, arcD(x, y, 6, 20, 290), { fill: 'none', stroke: C('paper'), 'stroke-width': 2.2 }); }
    };
    const centered = () => Math.hypot(st.px - L.vx, st.py - L.vy) < 1;
    const alignNow = () => { if (!centered()) return null; for (const r of alignRots(st.a0, st.th)) if (Math.abs(dAng(st.rot, r.rot)) < 0.6) return r; return null; };
    newAngle(); F.onResize(() => build()); build();
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { if (st.phase === 'reading' || !pro.hitBody(p)) return null; const r = Math.hypot(p.x - st.px, p.y - st.py); return r > L.R * 0.62 ? 'rot' : 'move'; },
      start: (p, h) => { ctx.hideHud(); drag = h === 'rot' ? { h, a0: angOf(st.px, st.py, p), rot0: st.rot } : { h, ox: st.px - p.x, oy: st.py - p.y }; st.placed = true; if (st.phase !== 'place') { st.phase = 'place'; pro.hi(null); } },
      move: p => { if (!drag) return; if (drag.h === 'move') { st.px = p.x + drag.ox; st.py = p.y + drag.oy; } else st.rot = norm360(drag.rot0 + dAng(angOf(st.px, st.py, p), drag.a0)); pro.set(st.px, st.py, st.rot); },
      end: async () => {
        if (!drag) return; const h = drag.h; drag = null; const tag = S.token;
        if (h === 'move' && !centered() && Math.hypot(st.px - L.vx, st.py - L.vy) < L.R * 0.16 + 14) {
          const x0 = st.px, y0 = st.py; await tween(0.25, k2 => { st.px = lerp(x0, L.vx, k2); st.py = lerp(y0, L.vy, k2); pro.set(st.px, st.py, st.rot); }); if (!alive(tag)) return;
          st.px = L.vx; st.py = L.vy; sfx.pop();
        }
        if (!centered()) { say(`${RU.bun}の まんなかを、かどの ${RU.cho}（くろい てん）に あわせよう`, '分度器の真ん中を、角の頂点に合わせよう'); return; }
        // 0の線を辺に（近ければ ぴたっと）
        const near = alignRots(st.a0, st.th).find(r => Math.abs(dAng(st.rot, r.rot)) < 8);
        if (near) {
          const r0 = st.rot, d = dAng(near.rot, r0); await tween(0.25, k2 => { st.rot = norm360(r0 + d * k2); pro.set(st.px, st.py, st.rot); }); if (!alive(tag)) return;
          st.rot = near.rot; pro.set(st.px, st.py, st.rot); st.phase = 'aligned'; sfx.good(); pro.hi(near.which, 0);
          say(`0の せんが ${RU.hen}に ぴったり！ 「めもりを よむ」を おしてね`, '0の線が辺にぴったり！目盛りを読む、を押してね');
          return;
        }
        const wrongSide = [st.a0 + 180, st.a0 + st.th].some(r => Math.abs(dAng(st.rot, r)) < 10);
        if (wrongSide) say(`${RU.bun}が はんたいむき。ふちを もって はんぶん まわそう`, '分度器が反対向き。ふちを持って半分回そう');
        else say(`まんなかは ぴったり。つぎは ふちを もって まわし、<b>0の せん</b>を ${RU.hen}に あわせよう`, '真ん中はぴったり。次はふちを持って回し、0の線を辺に合わせよう');
      },
    });
    panel.innerHTML = `<div class="row"><button class="btn" type="button" data-k="read">めもりを よむ</button><button class="btn sub small" type="button" data-k="next">つぎの かど</button><button class="btn sub small" type="button" data-k="back">${RU.bun}を もどす</button></div>`;
    on($p(panel, '[data-k="read"]'), 'click', async () => {
      sfx.tap();
      if (st.phase === 'reading') return;
      const a = alignNow();
      if (!a) { if (!centered()) ctx.toast('', `まず ${RU.bun}の まんなかを、かどの ${RU.cho}に あわせよう`, 2.4, 'まず分度器の真ん中を、角の頂点に合わせよう'); else ctx.toast('', `つぎは 0の せんを ${RU.hen}に あわせよう（ふちを もって まわす）`, 2.4, '次は0の線を辺に合わせよう'); return; }
      if (st.phase === 'read') { pro.hi(a.which, st.th); say(`${a.which === 'inner' ? 'うちがわ' : 'そとがわ'}の めもりで <b>${st.th}°</b>`, `${a.which === 'inner' ? '内側' : '外側'}の目もりで${st.th}度`); return; }
      st.phase = 'reading'; const tag = S.token;
      for (let v = 0; v <= st.th; v += 10) { pro.hi(a.which, Math.max(0.5, v)); say(String(v), String(v)); sfx.tap(); if (!(await wait(0.35)) || !alive(tag)) return; }
      pro.hi(a.which, st.th);
      st.phase = 'read'; measured++; sfx.good();
      const other = 180 - st.th;
      say(`0から かぞえる <b>${a.which === 'inner' ? 'うちがわ' : 'そとがわ'}</b>の めもりで <b>${st.th}°</b>。${a.which === 'inner' ? 'そとがわ' : 'うちがわ'}の ${other}は よまない`, `0から数える${a.which === 'inner' ? '内側' : '外側'}の目もりで${st.th}度。${a.which === 'inner' ? '外側' : '内側'}の${other}は読まない`);
      ctx.log('measure', { correct: true, detail: { th: st.th, scale: a.which } });
    });
    on($p(panel, '[data-k="next"]'), 'click', () => { sfx.tap(); newAngle(); st.placed = false; build(); ctx.caption(`この かどを ${RU.bun}で はかろう`, 0, 'この角を分度器で測ろう'); });
    on($p(panel, '[data-k="back"]'), 'click', () => { sfx.tap(); if (st.phase === 'reading') return; st.phase = 'place'; st.placed = false; park(); pro.hi(null); pro.set(st.px, st.py, st.rot); say(`${RU.bun}を もとの ばしょに もどしたよ`, '分度器を元の場所に戻したよ'); });
    say(`${RU.bun}の まんなかを もって うごかし、ふちを もって まわそう`, '分度器の真ん中を持って動かし、ふちを持って回そう');
    api.test = {
      state: () => ({ phase: st.phase, measured, rot: st.rot, centered: centered() }),
      auto() {
        if (st.phase === 'reading') return { wait: 400 };
        if (st.phase === 'read') return measured >= 2 ? { done: true } : { click: 'data-k=next|' };
        if (st.phase === 'aligned') return { click: 'data-k=read|' };
        if (!centered()) { const [gx, gy] = pro.grabPos(), dx = L.vx - st.px, dy = L.vy - st.py, pts = []; for (let i = 0; i <= 10; i++) pts.push([gx + dx * i / 10, gy + dy * i / 10]); return pathOf(F, pts); }
        const t = alignRots(st.a0, st.th)[0].rot, d = dAng(t, st.rot), pts = [], base = st.rot + 60;
        for (let i = 0; i <= 12; i++) pts.push(P(st.px, st.py, L.R * 0.85, base + d * i / 12));
        return pathOf(F, pts);
      },
    };
    return api;
  }

  /* ======================= さわる・つくる：さんかくじょうぎ ======================= */
  if (mode === 'sankaku') {
    const goal = !!opts.goal, list = rulerAngles(), targets = goal ? list.map(x => x.deg) : [];
    const sel = { a: 30, b: 45, op: 'add' };
    let L = null, made = 0, done = new Set(), ti = 0, busy = false, last = null;
    const build = () => {
      F.clearLayers(); const A = area();
      const s = Math.max(70, Math.min(A.w / 2 - 20, A.h * 0.62, 220));
      L = { A, s, vx: A.x0 + A.w / 2, vy: A.y0 + A.h * 0.8 };
      L.vy = Math.min(A.y1 - 18, A.y0 + (A.h + s * 1.05) / 2 + 10);
      line(F.layer('base'), L.vx - s * 1.1, L.vy, L.vx + s * 1.1, L.vy, { stroke: C('line'), 'stroke-width': 2, 'stroke-dasharray': '6 6' });
      if (last) drawPlaced(last, 1);
      else drawParked();
    };
    const pose = (kind, corner, dir, x, y) => rulerPoly(kind, corner, x, y, dir, L.s);
    const drawParked = () => {
      const g = F.layer('r'); clear(g);
      const A = L.A;
      drawRuler(g, pose('A', 90, 0, L.vx - L.s * 0.95, L.vy - 4), C('face-4'));
      drawRuler(g, pose('B', 90, 90, L.vx + L.s * 0.95, L.vy - 4), C('face-2'));
    };
    // 置き方：あ の角 a を頂点に、0°〜a。あわせる：い の角 b を a〜a+b。かさねる：い を 0°〜b
    const target = c => ({ A: [c.a, 0], B: c.op === 'add' ? [c.b, c.a] : [c.b, 0] });
    const drawPlaced = (c, k) => {
      const g = F.layer('r'); clear(g); const t = target(c);
      const ax = lerp(L.vx - L.s * 0.95, L.vx, k), bx = lerp(L.vx + L.s * 0.95, L.vx, k);
      drawRuler(g, pose('A', t.A[0], lerp(0, t.A[1], k), ax, L.vy), C('face-4'));
      drawRuler(g, pose('B', t.B[0], lerp(-30, t.B[1], k), bx, L.vy), C('face-2'));
      if (k >= 1) {
        const v = rulerResult(c.a, c.b, c.op), lo = c.op === 'add' ? 0 : Math.min(c.a, c.b);
        const fg = F.layer('res'); clear(fg);
        path(fg, sectorD(L.vx, L.vy, L.s * 0.32, lo, lo + v), { fill: C('ok'), opacity: 0.35 });
        path(fg, arcD(L.vx, L.vy, L.s * 0.32, lo, lo + v), { fill: 'none', stroke: C('ok'), 'stroke-width': 4 });
        const [x1, y1] = P(L.vx, L.vy, L.s * 1.05, lo), [x2, y2] = P(L.vx, L.vy, L.s * 1.05, lo + v);
        line(fg, L.vx, L.vy, x1, y1, { stroke: C('ok'), 'stroke-width': 3 }); line(fg, L.vx, L.vy, x2, y2, { stroke: C('ok'), 'stroke-width': 3 });
        const [lx, ly] = P(L.vx, L.vy, L.s * 0.32 + 30, lo + v / 2);
        txt(fg, lx, ly + 9, `${v}°`, { 'font-size': 26, fill: C('ok'), 'font-weight': 900, class: 'ui' });
        circle(fg, L.vx, L.vy, 6, { fill: C('ink') });
      }
    };
    F.onResize(build); build();
    const seg = (k, vals, cur, lab) => `<div class="seg" role="group" aria-label="${lab}">${vals.map(v => `<button type="button" data-${k}="${v}" aria-pressed="${v === cur}">${typeof v === 'number' ? v + '°' : v === 'add' ? 'あわせる' : 'かさねる'}</button>`).join('')}</div>`;
    panel.innerHTML = `<div class="row"><span>あ</span>${seg('ra', [30, 60, 90], sel.a, 'あの かど')}<span>い</span>${seg('rb', [45, 90], sel.b, 'いの かど')}</div>
      <div class="row">${seg('op', ['add', 'sub'], sel.op, 'くみあわせかた')}<button class="btn" type="button" data-k="place">ならべる</button></div>`;
    const pressed = () => { $$p(panel, '[data-ra]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ra === sel.a))); $$p(panel, '[data-rb]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.rb === sel.b))); $$p(panel, '[data-op]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.op === sel.op))); };
    const pick = (k, v, lab) => { sfx.tap(); if (sel[k] === v) { ctx.toast('', `いまは「${lab}」だよ`, 1.6); return; } sel[k] = v; pressed(); last = null; F.layer('res') && clear(F.layer('res')); drawParked(); say(`あ ${sel.a}°・い ${sel.b}°を ${sel.op === 'add' ? 'あわせる' : 'かさねる'}と？`, `あ${sel.a}度と、い${sel.b}度を${sel.op === 'add' ? '合わせる' : '重ねる'}と？`); };
    $$p(panel, '[data-ra]').forEach(b => on(b, 'click', () => pick('a', +b.dataset.ra, b.textContent)));
    $$p(panel, '[data-rb]').forEach(b => on(b, 'click', () => pick('b', +b.dataset.rb, b.textContent)));
    $$p(panel, '[data-op]').forEach(b => on(b, 'click', () => pick('op', b.dataset.op, b.textContent)));
    const goalSay = () => { if (!goal) return; const t = targets[ti]; say(`さんかくじょうぎで <b>${t}°</b>を つくろう（${done.size} / ${targets.length}）`, `三角定規で${t}度をつくろう`); };
    on($p(panel, '[data-k="place"]'), 'click', async () => {
      if (busy) return; sfx.pop(); busy = true; const tag = S.token, c = Object.assign({}, sel);
      clear(F.layer('res'));
      await tween(1.1, k => drawPlaced(c, k), E.io); if (!alive(tag)) return;
      last = c; drawPlaced(c, 1); busy = false; made++;
      const v = rulerResult(c.a, c.b, c.op), isNew = list.some(x => x.deg === v);
      const expr = `${c.a}° ${c.op === 'add' ? '＋' : '−'} ${c.b}° ＝ <b>${v}°</b>`, exprSp = `${c.a}度${c.op === 'add' ? 'たす' : 'ひく'}${c.b}度は${v}度`;
      if (isNew) ctx.register('sankaku', 'a' + v);
      ctx.log(goal ? 'make-step' : 'ruler-try', { correct: goal ? v === targets[ti] : null, detail: { a: c.a, b: c.b, op: c.op, deg: v } });
      if (c.op === 'sub' && c.a === c.b) { say('おなじ かどを かさねると 0°。かどが できない', '同じ角を重ねると0度。角ができない'); return; }
      if (goal) {
        if (v === targets[ti]) {
          done.add(v); sfx.good(); hanamaru(F.svg, L.vx, L.vy - L.s * 0.5, Math.min(70, L.s * 0.4));
          ctx.toast(ICON.HANAMARU, `${expr}　できた！`, 2.6, exprSp + '。できた');
          if (done.size === targets.length) { ctx.log('ruler-all', { correct: true, detail: { n: done.size } }); ctx.done('sankaku'); setTimeout(() => alive(tag) && say('ぜんぶの かどが できた！ ずかんを みてね', '全部の角ができた！図鑑を見てね'), 2700); return; }
          ti = targets.findIndex(t => !done.has(t)); setTimeout(() => alive(tag) && goalSay(), 2700);
        } else { sfx.bad(); ctx.toast('', `${expr}。めあては ${targets[ti]}°`, 2.8, `${exprSp}。めあては${targets[ti]}度`); }
      } else say(expr + (isNew ? '　（ずかんに のったよ）' : ''), exprSp);
    });
    if (goal) goalSay(); else say('かどを えらんで「ならべる」を おしてね', '角を選んで、並べる、を押してね');
    api.test = {
      state: () => ({ made, done: done.size, busy }),
      auto() {
        if (busy) return { wait: 300 };
        if (!goal) return made >= 1 ? { done: true } : { click: 'data-k=place|' };
        if (done.size === targets.length) return { done: true };
        const it = list.find(x => x.deg === targets[ti]), h = it.how[0];
        if (sel.a !== h.a) return { click: `data-ra=${h.a}|` };
        if (sel.b !== h.b) return { click: `data-rb=${h.b}|` };
        if (sel.op !== h.op) return { click: `data-op=${h.op}|` };
        if (last && rulerResult(last.a, last.b, last.op) === targets[ti]) return { wait: 400 };
        return { click: 'data-k=place|' };
      },
    };
    return api;
  }

  /* ======================= さわる：おうぎがた（EJ） ======================= */
  if (mode === 'ogi') {
    const st = { th: 60, r: 6 };
    let L = null, sec = null, bars = null, drags = 0;
    const build = () => {
      F.clearLayers(); const A = area();
      const R = A.land ? Math.min(A.h * 0.42, A.w * 0.21) : Math.min(A.w * 0.34, A.h * 0.27);
      L = { A, R, cx: A.land ? A.x0 + A.w * 0.27 : A.x0 + A.w / 2, cy: A.land ? A.y0 + A.h * 0.52 : A.y0 + R + 24 };
      sec = makeSector(F.layer('s'), { x: L.cx, y: L.cy, r: R * st.r / 12 * 1.6, th: st.th, a0: 90, handle: true });
      bars = drawBars(F.layer('bars'), A.land ? { x: A.x0 + A.w * 0.52, y: A.y0 + A.h * 0.16, w: A.w * 0.46 } : { x: A.x0 + 6, y: L.cy + R + 28, w: A.w - 12 });
      upd();
    };
    const rPx = () => L.R * st.r / 12 * 1.6;
    const upd = () => { sec.st.r = Math.min(L.R * 1.25, rPx()); sec.st.th = st.th; sec.update(); bars.set(st.th, st.r, true); };
    F.onResize(build); build();
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { const [kx, ky] = sec.knobPos(); return Math.hypot(p.x - kx, p.y - ky) < 34 || (Math.hypot(p.x - L.cx, p.y - L.cy) < sec.st.r * 1.1 && Math.hypot(p.x - L.cx, p.y - L.cy) > 20) ? true : null; },
      start: p => { drag = { last: angOf(L.cx, L.cy, p) }; ctx.hideHud(); },
      move: p => { if (!drag) return; const a = angOf(L.cx, L.cy, p); st.th = clamp(st.th + dAng(a, drag.last), 1, 360); drag.last = a; upd(); },
      end: () => { if (!drag) return; drag = null; st.th = clamp(Math.round(st.th / 5) * 5, 5, 360); upd(); drags++; tell(); ctx.log('turn', { detail: { th: st.th, r: st.r } }); },
    });
    const tell = () => { const A = arcK(st.r, st.th), S2 = areaK(st.r, st.th), f = frac(st.th, 360); say(`${RU.chu} ${st.th}°（${f[0]}/${f[1]}）：${RU.ko} ${piTxt(A)}cm、${RU.men} ${piTxt(S2)}cm²`, `中心角${st.th}度、${f[1]}分の${f[0]}。弧は${spPi(A)}センチメートル、面積は${spPi(S2)}平方センチメートル`); };
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="x2">${RU.chu} ×2</button><button class="btn sub small" type="button" data-k="h2">${RU.chu} ÷2</button><button class="btn sub small" type="button" data-k="rp">${RU.han} ＋1</button><button class="btn sub small" type="button" data-k="rm">${RU.han} −1</button></div>`;
    const anim = async (th, r) => { const tag = S.token, t0 = st.th, r0 = st.r; await tween(0.9, k => { st.th = lerp(t0, th, k); st.r = lerp(r0, r, k); upd(); }, E.io); if (!alive(tag)) return false; st.th = th; st.r = r; upd(); return true; };
    on($p(panel, '[data-k="x2"]'), 'click', async () => { sfx.tap(); if (st.th * 2 > 360) { ctx.toast('', `${RU.chu}は 360°まで`, 2, '中心角は360度まで'); return; } const a0 = arcK(st.r, st.th); if (!(await anim(st.th * 2, st.r))) return; say(`${RU.chu}が 2ばい → ${RU.ko}も ${piTxt(a0)} から <b>${piTxt(arcK(st.r, st.th))}</b> へ 2ばい`, `中心角が2倍、弧も2倍`); ctx.log('turn', { detail: { th: st.th, r: st.r, x2: true } }); });
    on($p(panel, '[data-k="h2"]'), 'click', async () => { sfx.tap(); if (st.th / 2 < 5) { ctx.toast('', 'これより ちいさく できないよ', 2); return; } if (!(await anim(st.th / 2, st.r))) return; say(`${RU.chu}が 1/2 → ${RU.ko}も ${RU.men}も 1/2`, '中心角が2分の1、弧も面積も2分の1'); ctx.log('turn', { detail: { th: st.th, r: st.r } }); });
    on($p(panel, '[data-k="rp"]'), 'click', async () => { sfx.tap(); if (st.r >= 12) { ctx.toast('', `${RU.han}は 12cmまで`, 2, '半径は12センチメートルまで'); return; } if (!(await anim(st.th, st.r + 1))) return; tell(); });
    on($p(panel, '[data-k="rm"]'), 'click', async () => { sfx.tap(); if (st.r <= 2) { ctx.toast('', `${RU.han}は 2cmから`, 2, '半径は2センチメートルから'); return; } if (!(await anim(st.th, st.r - 1))) return; tell(); });
    say(`あおい まるを うごかして ${RU.chu}を かえよう`, '青い丸を動かして中心角を変えよう');
    api.test = {
      state: () => ({ th: st.th, r: st.r, drags }),
      auto() { if (drags >= 1) return { done: true }; const pts = []; for (let i = 0; i <= 12; i++) pts.push(P(L.cx, L.cy, sec.st.r, 90 + st.th + i * 5)); return pathOf(F, pts); },
    };
    return api;
  }

  /* ======================= つくる：えんすいの てんかいず（EJ） ======================= */
  if (mode === 'cone') {
    const Lm = 12, list = cones(Lm), order = [6, 3, 4, 9, 2, 8, 1, 10, 5, 7, 11].filter(r => list.some(c => c.rb === r));
    const st = { th: 90, ti: 0 }, doneSet = new Set();
    let L = null, sec = null, busy = false, built = false, drags = 0;
    const tgt = () => list.find(c => c.rb === order[st.ti]);
    const build = () => {
      F.clearLayers(); const A = area();
      const R = A.land ? Math.min(A.h * 0.4, A.w * 0.2) : Math.min(A.w * 0.3, A.h * 0.24);
      L = { A, R, cx: A.land ? A.x0 + A.w * 0.27 : A.x0 + A.w / 2, cy: A.land ? A.y0 + A.h * 0.55 : A.y0 + R + 34,
        coneX: A.land ? A.x0 + A.w * 0.72 : A.x0 + A.w / 2, coneTop: A.land ? A.y0 + A.h * 0.12 : A.y0 + R * 2 + 40 };
      sec = makeSector(F.layer('s'), { x: L.cx, y: L.cy, r: R, th: st.th, a0: 90, handle: true });
      drawTarget();
      built = false;
    };
    // めあての円錐（そこの円を点線で）
    const drawTarget = () => {
      const g = F.layer('t'); clear(g); const t = tgt(), s = L.R / Lm, rb = t.rb * s, h = Math.sqrt(Math.max(0, L.R * L.R - rb * rb)), by = L.coneTop + h;
      el('ellipse', { cx: L.coneX, cy: by, rx: rb, ry: Math.max(2, rb * 0.28), fill: 'none', stroke: C('sora'), 'stroke-width': 2.5, 'stroke-dasharray': '6 5' }, g);
      txt(g, L.coneX, by + rb * 0.28 + 26, `めあて：そこの ${t.rb}cm`, { 'font-size': 16, fill: C('sora'), class: 'ui' });
    };
    F.onResize(build); build();
    const sayGoal = () => { const t = tgt(); say(`そこの ${RU.han} <b>${t.rb}cm</b>の ${RU.en}（${RU.bo} 12cm）を つくろう`, `母線12センチメートル。底の半径が${t.rb}センチメートルの円錐をつくろう。中心角は何度？`); };
    let drag = null;
    dragOn(F.svg, F, {
      hit: p => { if (busy) return null; const [kx, ky] = sec.knobPos(); const r = Math.hypot(p.x - L.cx, p.y - L.cy); return Math.hypot(p.x - kx, p.y - ky) < 34 || (r < L.R * 1.1 && r > 20) ? true : null; },
      start: p => { drag = { last: angOf(L.cx, L.cy, p) }; ctx.hideHud(); if (built) { clear(F.layer('cone')); sec.g.setAttribute('opacity', 1); built = false; } },
      move: p => { if (!drag) return; const a = angOf(L.cx, L.cy, p); st.th = clamp(st.th + dAng(a, drag.last), 5, 355); drag.last = a; sec.st.th = st.th; sec.update(); },
      end: () => { if (!drag) return; drag = null; st.th = clamp(Math.round(st.th / 5) * 5, 5, 355); sec.st.th = st.th; sec.update(); drags++; say(`${RU.chu} ${st.th}°`, `中心角${st.th}度`); },
    });
    panel.innerHTML = `<div class="row"><button class="btn sub small" type="button" data-k="m5">−5°</button><button class="btn sub small" type="button" data-k="p5">＋5°</button><button class="btn" type="button" data-k="build">まるめる</button></div>`;
    const nudge = d => { sfx.tap(); if (busy) return; if (built) { clear(F.layer('cone')); sec.g.setAttribute('opacity', 1); built = false; } const v = clamp(st.th + d, 5, 355); if (v === st.th) { ctx.toast('', `${RU.chu}は 5°から 355°まで`, 2); return; } st.th = v; sec.st.th = v; sec.update(); say(`${RU.chu} ${v}°`, `中心角${v}度`); };
    on($p(panel, '[data-k="m5"]'), 'click', () => nudge(-5));
    on($p(panel, '[data-k="p5"]'), 'click', () => nudge(5));
    on($p(panel, '[data-k="build"]'), 'click', async () => {
      if (busy) return; sfx.pop(); busy = true; const tag = S.token, t = tgt();
      const s = L.R / Lm, rbNow = Lm * st.th / 360, cg = F.layer('cone'); clear(cg);
      await coneMorph(cg, sec, { L: L.R, th: st.th, cx: L.coneX, top: L.coneTop, rb: rbNow * s, keep: true }, 1.6); if (!alive(tag)) return;
      busy = false; built = true;
      const ok = st.th === t.deg;
      ctx.log('cone', { correct: ok, detail: { th: st.th, rb: t.rb, got: r1(rbNow) } });
      if (ok) {
        sfx.good(); doneSet.add(t.id); ctx.register('cone', t.id);
        hanamaru(F.svg, L.coneX, L.coneTop + L.R * 0.55, Math.min(60, L.R * 0.5));
        ctx.toast(ICON.HANAMARU, `ぴったり！ 360° × ${t.rb}/12 ＝ ${t.deg}°`, 3, `ぴったり！360度かける12分の${t.rb}で${t.deg}度`);
        if (doneSet.size === 1) ctx.done('cone');
        if (doneSet.size >= order.length) { setTimeout(() => alive(tag) && say(`ぜんぶ できた！ かたちの「空間図形」で ${RU.en}を くみたてて みよう`, '全部できた！かたちの空間図形で円錐を組み立ててみよう'), 3100); return; }
        setTimeout(() => { if (!alive(tag)) return; st.ti = order.findIndex(r => !doneSet.has('r' + r)); clear(cg); sec.g.setAttribute('opacity', 1); built = false; drawTarget(); sayGoal(); }, 3100);
      } else {
        sfx.bad();
        say(`そこの ${RU.han}は やく ${num(r1(rbNow))}cm。めあての ${t.rb}cmより ${rbNow > t.rb ? 'おおきい' : 'ちいさい'}。${RU.chu}を ${rbNow > t.rb ? 'ちいさく' : 'おおきく'} しよう`, `底の半径はやく${num(r1(rbNow))}センチメートル。めあてより${rbNow > t.rb ? '大きい' : '小さい'}`);
      }
    });
    sayGoal();
    api.test = {
      state: () => ({ th: st.th, done: doneSet.size, busy, built }),
      auto() {
        if (busy) return { wait: 300 };
        if (doneSet.size >= 2) return { done: true };
        const t = tgt();
        if (built && st.th === t.deg) return { wait: 500 };
        if (st.th !== t.deg) { const d = t.deg - st.th, pts = []; for (let i = 0; i <= Math.max(6, Math.ceil(Math.abs(d) / 6)); i++) { const n = Math.max(6, Math.ceil(Math.abs(d) / 6)); pts.push(P(L.cx, L.cy, L.R * 0.92, 90 + st.th + d * i / n)); } return pathOf(F, pts); }
        return { click: 'data-k=build|' };
      },
    };
    return api;
  }
  return api;
}

// π の係数を読み上げの文に
export const spPi = ([n, d]) => (d === 1 ? `${n === 1 ? '' : n}パイ` : `${d}分の${n}パイ`);

// 弧の長さと面積の帯（全体＝円周・円の面積に対する割合）。set(th, r, withText)
export function drawBars(g, { x, y, w }) {
  clear(g);
  const rowH = 46, bw = Math.max(80, w - 8);
  const mk = (k, label, col) => {
    const yy = y + k * (rowH + 22);
    txt(g, x, yy - 6, label, { 'font-size': 16, 'text-anchor': 'start', class: 'ui', fill: C('ink') });
    rect(g, x, yy, bw, 18, { rx: 9, fill: C('paper-2'), stroke: C('line'), 'stroke-width': 1.5 });
    const fill = rect(g, x, yy, 0, 18, { rx: 9, fill: col });
    const t = txt(g, x + bw, yy - 6, '', { 'font-size': 16, 'text-anchor': 'end', class: 'ui', fill: C('ok'), 'font-weight': 900 });
    return { fill, t };
  };
  const a = mk(0, 'こ（弧）の ながさ', C('face-1')), s = mk(1, 'めんせき', C('face-2'));
  for (let i = 1; i < 4; i++) [0, 1].forEach(k => line(g, x + bw * i / 4, y + k * (rowH + 22), x + bw * i / 4, y + k * (rowH + 22) + 18, { stroke: C('ink-soft'), 'stroke-width': 1, opacity: 0.5 }));
  const fz = txt(g, x, y + 2 * (rowH + 22) + 4, '', { 'font-size': 15, 'text-anchor': 'start', class: 'ui', fill: C('ink-soft') });
  return {
    set(th, r, withText = true) {
      const k = clamp(th / 360, 0, 1);
      a.fill.setAttribute('width', Math.max(0, bw * k)); s.fill.setAttribute('width', Math.max(0, bw * k));
      if (withText) {
        const rr = Math.round(r), tt = Math.round(th);
        a.t.textContent = `${piTxt(arcK(rr, tt))}cm（やく ${num(r1(arcLen(rr, tt)))}cm）`;
        s.t.textContent = `${piTxt(areaK(rr, tt))}cm²`;
        const f = frac(tt, 360); fz.textContent = `${tt}° は 360° の ${f[0]}/${f[1]}　・　はんけい ${rr}cm`;
      }
    },
    formula(on) { fz.textContent = on ? 'こ ＝ 2π × はんけい × ちゅうしんかく/360　めんせき ＝ π × はんけい² × ちゅうしんかく/360' : ''; },
  };
}

// おうぎ形を まるめて円錐にする（2Dの形の変化）。sec は makeSector。L＝母線（px）、rb＝底の半径（px）
export async function coneMorph(g, sec, { L, th, cx, top, rb, keep = false }, dur = 2) {
  clear(g);
  const n = 40, sx = sec.st.x, sy = sec.st.y, a0 = sec.st.a0;
  const h = Math.sqrt(Math.max(0, L * L - rb * rb)), by = top + h, ry = Math.max(2, rb * 0.28);
  const src = [[sx, sy]], dst = [[cx, top]];
  for (let i = 0; i <= n; i++) { const u = i / n; src.push(P(sx, sy, L, a0 + th * u)); const t = Math.PI * 2 * u; dst.push([cx - rb * Math.sin(t), by + ry * Math.cos(t)]); }
  const body = path(g, '', { fill: C('face-2'), 'fill-opacity': 0.75, stroke: C('ink'), 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
  const base = el('ellipse', { cx, cy: by, rx: rb, ry, fill: 'none', stroke: C('ink'), 'stroke-width': 2, opacity: 0 }, g);
  if (!keep) sec.g.setAttribute('opacity', 0.35);
  await tween(dur, k => {
    const pts = src.map(([x, y], i) => [lerp(x, dst[i][0], k), lerp(y, dst[i][1], k)]);
    body.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z');
    base.setAttribute('opacity', clamp(k * 2 - 1, 0, 1));
  }, E.io);
  // 見える形（三角＋そこの楕円）に整える
  body.setAttribute('d', `M${cx},${top}L${cx - rb},${by}A${rb},${ry} 0 0,0 ${cx + rb},${by}Z`);
  base.setAttribute('opacity', 1);
  return true;
}
