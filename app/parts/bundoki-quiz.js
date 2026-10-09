// 角の大きさ（A4）と おうぎ形（EJ）の「ためす」。opts.type：
//  read（分度器を よむ。チャレンジは 180°より大きい角も）｜cmpset（どちらが大きい・分度器で かどを つくる）｜ruler（三角定規の組み合わせ）｜est（みとおし：見当で ひらいてから はかる）｜ogi（おうぎ形の弧と面積）
// 誤答の選択肢には つまずきの型（scale・tick・side・reflex・ruler・est、EJ は ratio・radius・arcarea）を必ず混ぜる。答え合わせは分度器を当てて数える・おうぎ形を広げて確かめる。
import { el, C, txt, line, circle, path, clear, clamp, lerp, dragOn, pathOf, tween, wait, E } from './_flat.js';
import { makeAngle, makeProtractor, rulerPoly, drawRuler, makeSector, sectorD, arcD, angOf, dAng, P } from './_bundoki.js';
import { drawBars, spPi } from './bundoki.js';
import { makeQuiz } from './_quiz2d.js';
import { readQ, cmpQ, reflexQ, rulerQ, estAngleQ, alignRots, rulerResult, norm360, sectorQ, arcK, areaK, piTxt, frac } from './_ahead-gen.js';
import { rnd } from './_gen.js';
import { S, alive } from '../stage/stage.js';

const RU = { bun: '<ruby>分度器<rt>ぶんどき</rt></ruby>', hen: '<ruby>辺<rt>へん</rt></ruby>', ko: '<ruby>弧<rt>こ</rt></ruby>', men: '<ruby>面積<rt>めんせき</rt></ruby>', chu: '<ruby>中心角<rt>ちゅうしんかく</rt></ruby>', han: '<ruby>半径<rt>はんけい</rt></ruby>', ensh: '<ruby>円周<rt>えんしゅう</rt></ruby>' };

export function mount(ctx) {
  const { opts, sfx } = ctx;
  const type = opts.type || 'read';
  const F = ctx.openFlat();
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);
  let scene = null;          // いまの問題の絵（build で描き直す）
  const build = () => { F.clearLayers(); if (scene) scene.draw(area()); };
  F.onResize(build);
  let drag = null;
  dragOn(F.svg, F, {
    hit: p => (scene && scene.hit ? scene.hit(p) : null),
    start: p => { ctx.hideHud(); drag = scene && scene.start ? scene.start(p) : null; },
    move: p => { if (drag && scene.move) scene.move(p, drag); },
    end: p => { if (drag && scene.end) scene.end(p, drag); drag = null; },
  });
  const at = () => { const A = area(); return { x: A.x0 + A.w / 2, y: A.y0 + A.h * 0.4, r: Math.min(A.w, A.h) * 0.22 }; };

  /* ---------- 角の絵（頂点・2本の辺・分度器） ---------- */
  function angleScene({ a0, th, pro = null, len = 1.22, fan = false, draggable = false, label = false, full = false }) {
    const sc = { a0, th, pro, ang: null, P: null, L: null, made: draggable ? 0 : th };
    sc.draw = A => {
      const big = sc.big;
      const R = clamp(big ? Math.min((A.w - 20) / 2.6, (A.h - 24) / 2.6) : A.land ? Math.min(A.w * 0.24, (A.h - 40) / 1.6) : Math.min((A.w - 24) / 2.6, (A.h - 40) / 1.6), 60, 200);
      sc.L = { R, vx: A.x0 + A.w / 2, vy: big ? A.y0 + A.h / 2 + 6 : Math.min(A.y1 - R * 0.34, A.y0 + R * 1.25 + 26) };
      if (pro) { sc.P = makeProtractor(F.layer('p'), { R, full }); sc.P.set(sc.L.vx, sc.L.vy, pro.rot); if (pro.hi) sc.P.hi(pro.hi, pro.hiTh || 0); }
      sc.ang = makeAngle(F.layer('a'), { x: sc.L.vx, y: sc.L.vy, a0: sc.a0, th: draggable ? sc.made : sc.th, len0: R * len, len1: R * len, fan, label, handle: draggable, w: 5, fanR: Math.min(50, R * 0.3) });
    };
    if (draggable) {
      sc.hit = p => { const r = Math.hypot(p.x - sc.L.vx, p.y - sc.L.vy); return r > 22 && r < sc.L.R * 1.4 ? true : null; };
      sc.start = p => ({ last: angOf(sc.L.vx, sc.L.vy, p) });
      sc.move = (p, d) => { const a = angOf(sc.L.vx, sc.L.vy, p); sc.made = clamp(sc.made + dAng(a, d.last), 0, 360); d.last = a; sc.ang.st.th = sc.made; sc.ang.update(); };
      sc.end = () => { sc.made = Math.round(sc.made / (sc.step || 1)) * (sc.step || 1); sc.ang.st.th = sc.made; sc.ang.update(); sfx.tap(); if (sc.onEnd) sc.onEnd(); };
      sc.pathTo = t => { const pts = [], n = Math.max(6, Math.ceil(Math.abs(t - sc.made) / 5)); for (let i = 0; i <= n; i++) pts.push(P(sc.L.vx, sc.L.vy, sc.L.R * 1.1, sc.a0 + sc.made + (t - sc.made) * i / n)); return pts; };
    }
    return sc;
  }
  // 分度器の目もりを 0から th まで数える（答え合わせの動き）
  async function countUp(sc, which, th) {
    const tag = S.token; sc.P.hi(which, 0.5);
    const stepV = th > 100 ? 20 : 10;
    for (let v = stepV; v < th; v += stepV) { sc.P.hi(which, v); sfx.tap(); if (!(await wait(0.28)) || !alive(tag)) return; }
    sc.P.hi(which, th);
  }

  /* ---------- A4：分度器を よむ ---------- */
  const qRead = (level, i) => {
    const reflex = level === 'challenge' && i >= 3;
    if (reflex) return qReflex(level, i);
    const q = readQ(level, i), tilt = rnd(-15, 15);
    const a0 = q.side === 'inner' ? tilt : 180 - q.th + tilt;
    const al = alignRots(a0, q.th).find(r => r.which === q.side);
    const sc = scene = angleScene({ a0, th: q.th, pro: { rot: al.rot } }); build();
    return {
      say: `この かどは なんど？`, sp: 'この角は何度？', at: at(), choices: q.choices, answerText: q.answer, answerSp: `${q.th}度`, detail: { type: 'read', th: q.th, scale: q.side },
      hint(k) {
        if (k === 1) { const arm = q.side === 'inner' ? 0 : 1; const [x, y] = P(sc.L.vx, sc.L.vy, sc.L.R * 1.1, arm ? a0 + q.th : a0); circle(F.layer('h'), x, y, 14, { fill: C('yamabuki'), opacity: 0.8 }); say(`0の せんが ある ${RU.hen}は どっち？ そこから かぞえる`, '0の線がある辺はどっち？そこから数える'); }
        if (k === 2) { sc.P.hi(q.side, 0.5); say(`${q.side === 'inner' ? 'うちがわ' : 'そとがわ'}の めもりが 0から はじまって いる`, `${q.side === 'inner' ? '内側' : '外側'}の目もりが0から始まっている`); }
        if (k === 3) { sc.P.hi(q.side, Math.floor(q.th / 10) * 10); say(`10ずつ かぞえると ${Math.floor(q.th / 10) * 10}。そこから ${q.th % 10 ? 'こまかい めもりを かぞえよう' : 'ぴったり'}`, `10ずつ数えると${Math.floor(q.th / 10) * 10}`); }
      },
      async verify() { await countUp(sc, q.side, q.th); say(`0から かぞえて <b>${q.th}°</b>`, `0から数えて${q.th}度`); await wait(0.8); },
    };
  };
  // 180°より大きい角：小さいほうを はかって 360°から ひく
  const qReflex = (level, i) => {
    const q = reflexQ(level, i), a0 = rnd(-10, 10);
    const sc = scene = angleScene({ a0, th: q.th, fan: true }); sc.big = true; build();
    return {
      say: 'この かど（いろの ところ）は なんど？', sp: '色のところの角は何度？', at: at(), choices: q.choices, answerText: q.answer, answerSp: `${q.th}度`, detail: { type: 'reflex', th: q.th },
      hint(k) { if (k === 1) say('180°より おおきい かどだよ', '180度より大きい角だよ'); if (k === 2) say(`のこりの ちいさい かどは ${q.small}°`, `残りの小さい角は${q.small}度`); if (k === 3) say(`ひとまわり 360°から ひこう`, 'ひとまわり360度から引こう'); },
      async verify() {
        const g = F.layer('v'); clear(g); const { vx, vy, R } = sc.L;
        const pr = makeProtractor(g, { R: R * 0.9 }), rot = alignRots(a0 + q.th, q.small)[0].rot; pr.set(vx, vy, rot);
        pr.hi('inner', q.small); await wait(1.2);
        say(`360° − ${q.small}° ＝ <b>${q.th}°</b>`, `360度ひく${q.small}度は${q.th}度`); await wait(1.2);
      },
    };
  };
  /* ---------- A4：どちらが大きい・分度器で つくる ---------- */
  const qCmp = (level, i) => {
    const q = cmpQ(level, i);
    let pos = 0;
    const sc = scene = { draw(A) {
      const R = A.land ? Math.min(A.w * 0.2, A.h * 0.6) : Math.min(A.w * 0.3, A.h * 0.26);
      const pts = A.land ? [[A.x0 + A.w * 0.12, A.y0 + A.h * 0.78], [A.x0 + A.w * 0.58, A.y0 + A.h * 0.78]] : [[A.x0 + A.w * 0.5, A.y0 + A.h * 0.42], [A.x0 + A.w * 0.5, A.y0 + A.h * 0.88]];
      sc.R = R; sc.pts = pts;
      const g = F.layer('a');
      sc.A = makeAngle(g, { x: pts[0][0], y: pts[0][1], a0: 0, th: q.A.th, len0: R * 1.3 * q.A.len + 30, len1: R * 1.3 * q.A.len + 30, label: false, fanR: 26, w: 5 });
      sc.B = makeAngle(g, { x: lerp(pts[1][0], pts[0][0], pos), y: lerp(pts[1][1], pts[0][1], pos), a0: 0, th: q.B.th, len0: R * 1.3 * q.B.len + 30, len1: R * 1.3 * q.B.len + 30, label: false, fanR: 34, w: 5 });
      sc.B.g.setAttribute('opacity', 0.85);
      txt(g, pts[0][0] - 2, pts[0][1] + 30, 'あ', { 'font-size': 22, class: 'ui' }); txt(g, pts[1][0] - 2, pts[1][1] + 30, 'い', { 'font-size': 22, class: 'ui' });
    } };
    build();
    return {
      say: 'おおきい かどは どっち？', sp: '大きい角はどっち？', at: at(), choices: q.choices, answerText: q.ans === 'A' ? 'あ' : 'い', detail: { type: 'cmp', a: q.A.th, b: q.B.th, trap: q.trap },
      hint(k) { if (k === 1) say(`${RU.hen}の ながさでは なく、ひらきぐあいを みよう`, '辺の長さではなく、開きぐあいを見よう'); if (k === 2) say('ちょうてんを かさねて くらべると わかる', '頂点を重ねて比べるとわかる'); if (k === 3) { sc.A.st.label = true; sc.B.st.label = true; sc.A.update(); sc.B.update(); } },
      async verify() {
        say('ちょうてんを かさねて みよう', '頂点を重ねてみよう');
        await tween(1.2, k => { pos = k; sc.B.st.x = lerp(sc.pts[1][0], sc.pts[0][0], k); sc.B.st.y = lerp(sc.pts[1][1], sc.pts[0][1], k); sc.B.update(); }, E.io);
        sc.A.st.label = true; sc.B.st.label = true; sc.A.update(); sc.B.update();
        say(`あ ${q.A.th}°、い ${q.B.th}°。ひらきが おおきい ${q.ans === 'A' ? 'あ' : 'い'}が おおきい`, `あ${q.A.th}度、い${q.B.th}度`); await wait(1.4);
      },
    };
  };
  const qSet = (level, i) => {
    const th = level === 'easy' ? [40, 60, 120, 150, 30][i % 5] : level === 'normal' ? [35, 75, 105, 145, 65][i % 5] : [28, 73, 117, 152, 46][i % 5];
    const step = level === 'challenge' ? 1 : 5;
    const sc = scene = angleScene({ a0: 0, th, pro: { rot: 0 }, draggable: true }); sc.made = 20 + (th > 90 ? 0 : 100); sc.step = step; build();
    return {
      set: true, setLabel: 'できた', say: `${RU.bun}を つかって <b>${th}°</b>の かどを つくろう`, sp: `分度器を使って${th}度の角をつくろう`, at: at(), answerText: `${th}°`, detail: { type: 'set', th },
      check: () => Math.round(sc.made) === th,
      mistakeNow: () => (Math.abs(Math.round(sc.made) - (180 - th)) <= step ? 'scale' : 'tick'),
      solve: () => pathOf(F, sc.pathTo(th)),
      hint(k) { if (k === 1) { sc.P.hi('inner', 0.5); say('みぎの 0から はじまる うちがわの めもりを みよう', '右の0から始まる内側の目もりを見よう'); } if (k === 2) { sc.P.hi('inner', Math.floor(th / 10) * 10); say(`10ずつ かぞえて ${Math.floor(th / 10) * 10}`, `10ずつ数えて${Math.floor(th / 10) * 10}`); } if (k === 3) { const [x, y] = P(sc.L.vx, sc.L.vy, sc.L.R * 1.1, th); circle(F.layer('h'), x, y, 12, { fill: C('yamabuki'), opacity: 0.8 }); say('ここまで ひらこう', 'ここまで開こう'); } },
      async verify(ok) { if (!ok) { const m0 = sc.made; await tween(1, k => { sc.made = lerp(m0, th, k); sc.ang.st.th = sc.made; sc.ang.update(); }, E.io); sc.made = th; } await countUp(sc, 'inner', th); say(`<b>${th}°</b>`, `${th}度`); await wait(0.6); },
    };
  };
  /* ---------- A4：三角定規 ---------- */
  const qRuler = (level, i) => {
    const q = rulerQ(level, i);
    const sc = scene = { draw(A) {
      const s = Math.max(70, Math.min(A.w / 2 - 20, A.h * 0.62, 210)), vx = A.x0 + A.w / 2, vy = Math.min(A.y1 - 18, A.y0 + s * 1.05 + 30);
      sc.L = { s, vx, vy };
      const g = F.layer('r');
      drawRuler(g, rulerPoly('A', q.a, vx, vy, 0, s), C('face-4'));
      drawRuler(g, rulerPoly('B', q.b, vx, vy, q.op === 'add' ? q.a : 0, s), C('face-2'));
      const lo = q.op === 'add' ? 0 : Math.min(q.a, q.b);
      path(g, sectorD(vx, vy, s * 0.55, lo, lo + q.deg), { fill: C("ok"), opacity: 0.32 }); path(g, arcD(vx, vy, s * 0.55, lo, lo + q.deg), { fill: "none", stroke: C("ok"), "stroke-width": 4 });
      circle(g, vx, vy, 6, { fill: C('ink') });
    } };
    build();
    return {
      say: `さんかくじょうぎを ${q.op === 'add' ? 'あわせた' : 'かさねた'}。あかい かどは なんど？`, sp: `三角定規を${q.op === 'add' ? '合わせた' : '重ねた'}。赤い角は何度？`, at: at(), choices: q.choices, answerText: q.answer, answerSp: `${q.deg}度`, detail: { type: 'ruler', a: q.a, b: q.b, op: q.op, deg: q.deg },
      hint(k) { if (k === 1) say(`あおい さんかくじょうぎの かどは ${q.a}°`, `青い三角定規の角は${q.a}度`); if (k === 2) say(`きいろの さんかくじょうぎの かどは ${q.b}°`, `黄色の三角定規の角は${q.b}度`); if (k === 3) say(q.op === 'add' ? 'あわせたら たす' : 'かさねたら ひく', q.op === 'add' ? '合わせたら足す' : '重ねたら引く'); },
      async verify() {
        const { vx, vy, s } = sc.L, g = F.layer('v'); clear(g); const lo = q.op === 'add' ? 0 : Math.min(q.a, q.b);
        const fan = path(g, '', { fill: C('ok'), opacity: 0.4 });
        await tween(1, k => fan.setAttribute('d', sectorD(vx, vy, s * 0.3, lo, lo + q.deg * k)), E.io);
        say(`${q.a}° ${q.op === 'add' ? '＋' : '−'} ${q.b}° ＝ <b>${q.deg}°</b>`, `${q.a}度${q.op === 'add' ? 'たす' : 'ひく'}${q.b}度は${q.deg}度`); ctx.register('sankaku', 'a' + q.deg); await wait(1.2);
      },
    };
  };
  /* ---------- A4：みとおし（見当で ひらいてから、分度器で はかる） ---------- */
  const qEst = (level, i) => {
    const q = estAngleQ(level, i);
    const sc = scene = angleScene({ a0: 0, th: q.th, draggable: true }); sc.made = 0; sc.big = q.th > 180; build();
    return {
      set: true, setLabel: 'これくらい', say: `${RU.bun}を つかわずに <b>${q.th}°</b>くらいに ひらこう`, sp: `分度器を使わずに${q.th}度くらいに開こう`, at: at(), answerText: `${q.th}°（ちかければ よい）`, detail: { type: 'est', th: q.th },
      check: () => sc.made > 0 && Math.abs(sc.made - q.th) <= q.tol,
      mistakeNow: () => 'est',
      solve: () => pathOf(F, sc.pathTo(q.th)),
      hint(k) { if (k === 1) say('90°（直角）は まっすぐ たて', '90度、直角は真っすぐ縦'); if (k === 2) say('180°は いっちょくせん', '180度は一直線'); if (k === 3) say(`${q.th}°は ${q.th < 90 ? '直角より ちいさい' : q.th < 180 ? '直角と 180°の あいだ' : '180°より おおきい'}`, `${q.th}度`); },
      async verify(ok) {
        const g = F.layer('v'); clear(g); const { vx, vy, R } = sc.L, made = Math.round(sc.made);
        ctx.log('estimate', { correct: ok, level, detail: { q: `${q.th}°くらいに ひらく`, guess: made, actual: q.th, unit: '°', qty: 'angle' } });
        const pr = makeProtractor(g, { R: R * 0.95, full: true }); pr.set(vx, vy, 0); pr.g.setAttribute('opacity', 0);
        await tween(0.5, k => pr.g.setAttribute('opacity', k * 0.92));
        const gh = makeAngle(g, { x: vx, y: vy, a0: 0, th: q.th, len0: R * 1.2, len1: R * 1.2, fan: false, label: false, w: 4 }); gh.g.setAttribute('opacity', 0.5);
        say(`はかると ${made}°。めあては ${q.th}°。ずれは ${Math.abs(made - q.th)}°`, `測ると${made}度。めあては${q.th}度。ずれは${Math.abs(made - q.th)}度`); await wait(1.4);
      },
    };
  };
  /* ---------- EJ：おうぎ形 ---------- */
  const qOgi = (level, i) => {
    const useSet = level !== 'easy' && i % 3 === 2;
    const q = sectorQ(level, i);
    const sc = scene = { th: useSet ? 30 : q.a, draw(A) {
      const R = A.land ? Math.min(A.h * 0.4, A.w * 0.2) : Math.min(A.w * 0.3, A.h * 0.25);
      sc.L = { R, cx: A.land ? A.x0 + A.w * 0.28 : A.x0 + A.w / 2, cy: A.land ? A.y0 + A.h * 0.52 : A.y0 + R + 22 };
      sc.sec = makeSector(F.layer('s'), { x: sc.L.cx, y: sc.L.cy, r: R, th: sc.th, a0: 90, handle: useSet });
      const g = F.layer('d'), [ex, ey] = P(sc.L.cx, sc.L.cy, R, 90);
      line(g, sc.L.cx - 0.5, sc.L.cy, ex - 0.5, ey, { stroke: C('sora'), 'stroke-width': 3 });
      txt(g, sc.L.cx - 30, (sc.L.cy + ey) / 2 + 6, `${q.r}cm`, { 'font-size': 17, fill: C('sora'), class: 'ui', 'font-weight': 900 });
      sc.bars = drawBars(F.layer('bars'), A.land ? { x: A.x0 + A.w * 0.52, y: A.y0 + A.h * 0.2, w: A.w * 0.44 } : { x: A.x0 + 6, y: sc.L.cy + R + 28, w: A.w - 12 });
      sc.bars.set(0, q.r, false);
    } };
    build();
    const pi = x => piTxt(x);
    const showAll = async th => { const t0 = 0; await tween(1.2, k => { sc.th = lerp(t0, th, k); sc.sec.st.th = sc.th; sc.sec.update(); sc.bars.set(sc.th, q.r, true); }, E.io); };
    const base = { at: at(), detail: { type: 'ogi', kind: q.kind, r: q.r, a: q.a },
      hint(k) {
        const f = frac(q.a, 360);
        if (k === 1) say(`${q.a}°は 360°の <b>${f[0]}/${f[1]}</b>`, `${q.a}度は360度の${f[1]}分の${f[0]}`);
        if (k === 2) say(`えん ぜんぶなら ${RU.ensh} ${pi(arcK(q.r, 360))}cm、${RU.men} ${pi(areaK(q.r, 360))}cm²`, `円全部なら円周${spPi(arcK(q.r, 360))}、面積${spPi(areaK(q.r, 360))}`);
        if (k === 3) say(q.kind === 'area' ? `π × ${q.r}² × ${q.a}/360` : q.kind === 'deg' ? `${pi(q.arc)} は ${pi(arcK(q.r, 360))} の なんぶんの いくつ？` : `2π × ${q.r} × ${q.a}/360`, 'しきに あてはめよう');
      },
    };
    if (useSet) {
      const want = q.a, tgtArc = arcK(q.r, want);
      sc.hit = p => { const r = Math.hypot(p.x - sc.L.cx, p.y - sc.L.cy); return r > 20 && r < sc.L.R * 1.25 ? true : null; };
      sc.start = p => ({ last: angOf(sc.L.cx, sc.L.cy, p) });
      sc.move = (p, d) => { const a = angOf(sc.L.cx, sc.L.cy, p); sc.th = clamp(sc.th + dAng(a, d.last), 1, 360); d.last = a; sc.sec.st.th = sc.th; sc.sec.update(); sc.bars.set(sc.th, q.r, false); };
      sc.end = () => { sc.th = clamp(Math.round(sc.th / 15) * 15, 15, 360); sc.sec.st.th = sc.th; sc.sec.update(); sc.bars.set(sc.th, q.r, true); sfx.tap(); };
      return Object.assign(base, {
        set: true, setLabel: 'できた', say: `${RU.han} ${q.r}cm。${RU.ko}が <b>${pi(tgtArc)}cm</b>に なるように ${RU.chu}を うごかそう`, sp: `半径${q.r}センチメートル。弧が${spPi(tgtArc)}センチメートルになるように中心角を動かそう`, answerText: `${want}°`, answerSp: `${want}度`,
        check: () => Math.round(sc.th) === want,
        mistakeNow: () => (Math.round(sc.th) === want * 2 || Math.round(sc.th) * 2 === want ? 'radius' : 'ratio'),
        solve: () => { const pts = [], n = Math.max(6, Math.ceil(Math.abs(want - sc.th) / 5)); for (let k = 0; k <= n; k++) pts.push(P(sc.L.cx, sc.L.cy, sc.L.R * 0.9, 90 + sc.th + (want - sc.th) * k / n)); return pathOf(F, pts); },
        async verify(ok) { if (!ok) { const t0 = sc.th; await tween(1, k => { sc.th = lerp(t0, want, k); sc.sec.st.th = sc.th; sc.sec.update(); sc.bars.set(sc.th, q.r, true); }, E.io); } say(`2π × ${q.r} × ${want}/360 ＝ <b>${pi(tgtArc)}</b>`, `${spPi(tgtArc)}`); await wait(1); },
      });
    }
    const word = { ratio: `${RU.chu} ${q.a}°の おうぎがたは、えんの なんぶんの いくつ？`, arc: `${RU.han} ${q.r}cm・${RU.chu} ${q.a}°。${RU.ko}の ながさは？`, area: `${RU.han} ${q.r}cm・${RU.chu} ${q.a}°。${RU.men}は？`, deg: `${RU.han} ${q.r}cm、${RU.ko}が ${pi(q.arc || [0, 1])}cm。${RU.chu}は？` }[q.kind];
    if (q.kind === 'deg') { sc.th = 0; build(); }
    return Object.assign(base, {
      say: word, sp: word.replace(/<rt>[^<]*<\/rt>|<[^>]+>/g, ''), choices: q.choices, answerText: q.answer,
      async verify() { await showAll(q.a); say(q.expr ? q.expr.replace(/＝ (.*)$/, '＝ <b>$1</b>') : `${q.a}°は 360°の ${q.answer}`, q.answer); await wait(1.2); },
    });
  };

  const gens = {
    read: qRead, ruler: qRuler, est: qEst, ogi: qOgi,
    cmpset: (lv, i) => (i % 2 === 0 ? qCmp(lv, i) : qSet(lv, i)),
  };
  const kind = opts.kind || { read: 'read', ruler: 'ruler', est: 'est', ogi: 'ogi', cmpset: 'make' }[type] || type;
  const gen = gens[type] || qRead;
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen: (lv, i) => { scene = null; return gen(lv, i); } });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
