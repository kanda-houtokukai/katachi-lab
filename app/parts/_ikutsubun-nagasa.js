// ikutsubun・ながさ（N1 任意単位）：クリップ・けしごむ・ブロック・えんぴつ・ゆびを ならべて「いくつぶん」。
// すき間・重なり・大きさ違いを まぜると 数が合わないことを見せる。
// opts.mode：lay（さわる）｜count（ためす：なんこぶん）｜diff（ためす：ちがう もので はかったら）｜mitoshi（ためす：みとおし）｜unit（つくる：じぶんの たんい）
// 記録：lay・iterate（＋iterate-done）・estimate（＋estimate-done）・unit。ずかん ikutsu（物@たんい）
import { el, C, txt, rect, line, circle, path, clear, clamp, lerp, tween, wait, E, dragOn, tapOf, pathOf, hanamaru } from './_flat.js';
import { thing, thOf, overhang, swatch, badge, NAMES, thingIcon } from './_nagasa.js';
import { makeQuiz } from './_quiz2d.js';
import { rnd, pickR, shuffleR, choices } from './_gen.js';
import { unitLen, countText as countTextU, UNAME, UNIT_OBJS, MY_UNITS } from './_nagasa-gen.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { $p, $$p, on, levelSeg, starsHTML } from './_common.js';

const olen = id => (bench(id) || {}).len_mm || 100;
const ulen = u => unitLen(u, id => (bench(id) || {}).len_mm || 30);
const countText = (len, u) => countTextU(len, ulen(u));

function drawUnit(g, u, x, yb, L, h) {
  if (u === 'finger') {
    const fg = el('g', {}, g);
    rect(fg, x + 0.5, yb - h, Math.max(1, L - 1), h, { rx: Math.min(L / 2, 6), fill: C('face-6'), stroke: C('ink-soft'), 'stroke-width': 1 });
    rect(fg, x + L * 0.2, yb - h + 2, L * 0.6, Math.min(h * 0.28, L * 0.7), { rx: 2, fill: C('paper'), opacity: 0.8 });
    return fg;
  }
  return thing(g, u, x, yb, L, { h, sw: 1.2 });
}

export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const mode = opts.mode || 'lay';
  const F = ctx.openFlat();
  const api = { dispose() {}, test: {} };
  // 場所：物の行（y1）と、たんいを ならべる行（y2）。maxMm の物が横に入る
  let L = {};
  function geom(maxMm) {
    const m = Math.max(18, F.W * 0.06), top = F.top + F.cap + 20, bot = F.bottom - 24, H = bot - top;
    const k = Math.min((F.W - m * 2) / (maxMm * 1.12), 4);
    L = { m, k, top, bot, H, x0: m + 8, y1: top + H * 0.36, y2: top + H * 0.62, X: mm => m + 8 + mm * k };
    return L;
  }
  const uh = u => Math.min(L.H * 0.16, Math.max(7, (u === 'finger' ? 1.2 : u === 'pencil' ? 0.06 : u === 'block' ? 0.45 : u === 'clip' ? 0.32 : 0.38) * ulen(u) * L.k));

  /* ---------------- さわる：ならべて いくつぶん ---------------- */
  if (mode === 'lay') {
    const target = { id: opts.target || 'pencil', len: olen(opts.target || 'pencil') };
    let unit = 'clip', how = 'fit';
    const laid = [];   // { u, x }（mm）
    let counted = 0;
    const draw = () => {
      geom(target.len); F.clearLayers();
      const go = F.layer('obj'), gl = F.layer('lane'); L.fx = F.layer('fx');
      thing(go, target.id, L.X(0), L.y1, target.len * L.k, { h: Math.max(8, Math.min(22, thOf(target.id, target.len * L.k))) });
      line(go, L.X(0), L.y1 - 30, L.X(0), L.y2 + 12, { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      line(go, L.X(target.len), L.y1 - 30, L.X(target.len), L.y2 + 12, { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      rect(gl, L.X(0) - 6, L.y2 - L.H * 0.17, F.W - L.X(0) - L.m + 12, L.H * 0.2, { rx: 10, fill: C('paper-2'), stroke: C('line'), 'stroke-width': 1.2 });
      laid.forEach((d, i) => { drawUnit(gl, d.u, L.X(d.x), L.y2, ulen(d.u) * L.k, uh(d.u)); });
    };
    const endX = () => (laid.length ? Math.max(...laid.map(d => d.x + ulen(d.u))) : 0);
    function put() {
      const e = endX();
      if (e >= target.len - 2) { sfx.off(); ctx.toast('', 'もう はしまで きたよ。「かぞえる」を おそう', 2.2); return false; }
      const gap = how === 'gap' ? ulen(unit) * 0.45 : how === 'over' ? -ulen(unit) * 0.35 : 0;
      laid.push({ u: unit, x: Math.max(0, laid.length ? e + gap : 0) }); counted = 0; sfx.pop(); draw();
      ctx.caption(`${laid.length}こ`, 0, `${laid.length}個`);
      return true;
    }
    async function count() {
      if (!laid.length) { sfx.off(); ctx.toast('', 'さきに「1こ おく」で ならべよう', 2); return; }
      const tag = S.token; sfx.tap();
      for (let i = 0; i < laid.length; i++) { const d = laid[i]; badge(L.fx, L.X(d.x + ulen(d.u) / 2), L.y2 + 22, String(i + 1)); sfx.tick(i); if (!(await wait(0.22)) || !alive(tag)) return; }
      const kinds = new Set(laid.map(d => d.u)), gaps = laid.some((d, i) => i && d.x > laid[i - 1].x + ulen(laid[i - 1].u) + 0.5), over = laid.some((d, i) => i && d.x < laid[i - 1].x + ulen(laid[i - 1].u) - 0.5);
      const reach = endX() >= target.len - ulen(laid[laid.length - 1].u) * 0.5;
      const right = countText(target.len, unit);
      let msg, sp;
      if (kinds.size > 1) { msg = `おおきさの ちがう ものが まざって いる。これでは <b>いくつぶん</b>か いえない`; sp = '大きさの違うものが混ざっている。これでは、いくつ分か言えない'; }
      else if (gaps) { msg = `<b>すきま</b>が あると かずが へる。ぴったりなら <b>${right}</b>`; sp = `すきまがあると数が減る。ぴったりなら${right.replace(/ /g, '')}`; }
      else if (over) { msg = `<b>かさなる</b>と かずが ふえる。ぴったりなら <b>${right}</b>`; sp = `重なると数が増える。ぴったりなら${right.replace(/ /g, '')}`; }
      else if (!reach) { msg = `まだ <b>はし</b>まで とどいて いないよ`; sp = 'まだ端まで届いていないよ'; }
      else { msg = `${NAMES[target.id]}は ${UNAME[unit]} <b>${right}</b>`; sp = `${NAMES[target.id]}は、${UNAME[unit]}${right.replace(/ /g, '')}`; sfx.good(); }
      ctx.caption(msg, 0, sp); counted++;
      ctx.log('lay', { detail: { unit, n: laid.length, gaps, over, mixed: kinds.size > 1 } });
    }
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="たんい">${['clip', 'eraser', 'block'].map(u => `<button type="button" data-unit="${u}" aria-pressed="${u === unit}">${UNAME[u]}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="ならべかた"><button type="button" data-how="fit" aria-pressed="true">ぴったり</button><button type="button" data-how="gap" aria-pressed="false">すきま</button><button type="button" data-how="over" aria-pressed="false">かさねる</button></div></div>
      <div class="row"><button class="btn" type="button" data-k="put">1こ おく</button><button class="btn sub small" type="button" data-k="take">1こ とる</button><button class="btn sub small" type="button" data-k="count">かぞえる</button><button class="btn sub small" type="button" data-k="clear">はじめから</button></div>`;
    $$p(panel, '[data-unit]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.unit === unit) { ctx.toast('', `いまは「${UNAME[unit]}」だよ`, 1.6); return; } unit = b.dataset.unit; $$p(panel, '[data-unit]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.unit === unit))); ctx.caption(laid.length ? `つぎから <b>${UNAME[unit]}</b>を おくよ` : `<b>${UNAME[unit]}</b>で はかろう`, 0); }));
    $$p(panel, '[data-how]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.how === how) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } how = b.dataset.how; $$p(panel, '[data-how]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.how === how))); ctx.caption(how === 'fit' ? '<b>ぴったり</b> くっつけて おく' : how === 'gap' ? '<b>すきま</b>を あけて おいて みよう' : '<b>かさねて</b> おいて みよう', 0); }));
    on($p(panel, '[data-k="put"]'), 'click', put);
    on($p(panel, '[data-k="take"]'), 'click', () => { if (!laid.length) { sfx.off(); ctx.toast('', 'まだ なにも おいて いないよ', 1.6); return; } sfx.tap(); laid.pop(); draw(); ctx.caption(`${laid.length}こ`, 0, `${laid.length}個`); });
    on($p(panel, '[data-k="count"]'), 'click', count);
    on($p(panel, '[data-k="clear"]'), 'click', () => { sfx.tap(); if (!laid.length) { ctx.toast('', 'まだ なにも おいて いないよ', 1.6); return; } laid.length = 0; draw(); ctx.caption('<b>はし</b>から ならべよう', 0, '端から並べよう'); });
    dragOn(F.svg, F, { hit: p => (Math.abs(p.y - (L.y2 - uh(unit) / 2)) < Math.max(34, L.H * 0.12) ? true : null), end: () => put() });
    F.onResize(draw); draw();
    ctx.caption(`${NAMES[target.id]}の したに <b>${UNAME[unit]}</b>を ならべて、いくつぶんか しらべよう`, 0, `${NAMES[target.id]}の下に${UNAME[unit]}を並べて、いくつ分か調べよう`);
    api.test = { state: () => ({ laid: laid.length, counted }), auto: () => (counted ? { done: true } : endX() >= target.len - 2 ? { click: 'data-k=count|' } : tapOf(F, L.X(endX() + 5), L.y2 - 6)) };
    return api;
  }

  /* ---------------- ためす：なんこぶん（すきま・かさなりの わなを まぜる） ---------------- */
  if (mode === 'count') {
    const TYPES = { easy: ['count', 'count', 'which', 'count', 'gap'], normal: ['count', 'gap', 'which', 'count', 'gap'], challenge: ['count', 'gap', 'over', 'which', 'count'] };
    const OBJS = ['tape', 'ribbon', 'straw', 'stick', 'paper'];
    let cur = null;
    function drawQ() {
      const q = cur; geom(q.len); F.clearLayers();
      if (q.rows) { q.rows[0].y = L.y2 - 6; q.rows[1].y = L.y2 + L.H * 0.2; }
      const go = F.layer('obj'), gl = F.layer('lane'); L.fx = F.layer('fx');
      const rows = q.rows || [{ y: L.y2, laid: q.laid }];
      thing(go, q.obj, L.X(0), L.y1, q.len * L.k, { h: 16, color: C('face-1') });
      line(go, L.X(0), L.y1 - 26, L.X(0), L.y2 + (q.rows ? L.H * 0.3 : 12), { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      line(go, L.X(q.len), L.y1 - 26, L.X(q.len), L.y2 + (q.rows ? L.H * 0.3 : 12), { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      rows.forEach((r, ri) => {
        if (q.rows) { txt(gl, L.X(0) - 6, r.y - uh(q.u) / 2 + 6, ri ? 'い' : 'あ', { 'font-size': 18, fill: C('sora'), 'text-anchor': 'end', class: 'ui' }); }
        r.laid.forEach(x => drawUnit(gl, q.u, L.X(x), r.y, ulen(q.u) * L.k, uh(q.u)));
      });
    }
    function gen(level, i) {
      const type = TYPES[level][i % 5], u = level === 'easy' ? pickR(['clip', 'eraser'], Math.random) : pickR(['clip', 'eraser', 'block']);
      const [a, b] = level === 'easy' ? [2, 5] : level === 'normal' ? [4, 8] : [6, 10];
      const n = rnd(a, b), len = n * ulen(u), obj = pickR(OBJS);
      cur = { type, u, n, len, obj, laid: Array.from({ length: n }, (_, k) => k * ulen(u)) };
      const nm = UNAME[u];
      if (type === 'gap' || type === 'over') {
        // すきま：見えている数は n より少ない。かさなり：多い
        const shown = type === 'gap' ? Math.max(2, n - rnd(1, 2)) : n + rnd(1, 2), step = (len - ulen(u)) / (shown - 1);
        cur.laid = Array.from({ length: shown }, (_, k) => k * step); cur.shown = shown;
        drawQ();
        return {
          say: `${type === 'gap' ? 'すきまが あいて いるね。' : 'かさなって いるね。'}ほんとうは ${nm} なんこぶん？`, sp: `${type === 'gap' ? 'すきまがあいているね。' : '重なっているね。'}本当は、${nm}何個分？`,
          choices: choices(`${n}こぶん`, [{ html: `${shown}こぶん`, mistake: 'L3' }, { html: `${n + (type === 'gap' ? 1 : -1)}こぶん`, mistake: 'count' }, { html: `${n + 2}こぶん`, mistake: 'other' }]),
          detail: { type, n, shown, unit: u }, answerText: `${n}こぶん`, at: { x: L.X(len / 2), y: L.y2 - 20, r: Math.min(90, len * L.k * 0.4) },
          hint: k => { if (k === 1) ctx.caption(type === 'gap' ? '<b>すきま</b>を つめたら どうなる？' : '<b>かさならない</b> ように したら？', 0); if (k === 2) ctx.caption(`${nm}を <b>ぴったり</b> ならべて かぞえよう`, 0); if (k === 3) { overhang(L.fx, L.X(0), L.X(ulen(u)), L.y2 - uh(u), uh(u)); ctx.caption(`${nm} 1こぶんは この ながさ`, 0); } },
          async verify() { const tag = S.token, from = cur.laid.slice(); await tween(0.9, k => { cur.laid = from.map((x, j) => lerp(x, Math.min(j, n - 1) * ulen(u), E.io(k))); drawQ(); }); if (!alive(tag)) return; cur.laid = Array.from({ length: n }, (_, k) => k * ulen(u)); drawQ(); await countUp(cur.laid, u, L.y2); },
        };
      }
      if (type === 'which') {
        const bad = rnd(0, 1) && n > 2 ? 'gap' : 'over', shown = bad === 'gap' ? n - 1 : n + 1, step = (len - ulen(u)) / (shown - 1);
        const good = cur.laid.slice(), wrong = Array.from({ length: shown }, (_, k) => k * step), first = rnd(0, 1);
        cur.rows = [{ y: L.y2 - 6, laid: first ? good : wrong }, { y: L.y2 + L.H * 0.2, laid: first ? wrong : good }];
        drawQ();
        const okRow = first ? 0 : 1;
        return {
          say: `${nm}で ただしく はかって いるのは どっち？`, sp: `${nm}で正しくはかっているのはどっち？`,
          choices: [{ html: 'あ', ok: okRow === 0, mistake: 'L3' }, { html: 'い', ok: okRow === 1, mistake: 'L3' }],
          detail: { type, bad, unit: u }, answerText: okRow ? 'い' : 'あ', at: { x: L.X(len / 2), y: cur.rows[okRow].y - 10, r: Math.min(80, len * L.k * 0.35) },
          hint: k => { if (k === 1) ctx.caption('<b>すきま</b>や <b>かさなり</b>は ないかな？', 0); if (k >= 2) ctx.caption('ぴったり くっついて いるのが ただしい', 0); },
          async verify() { const r = cur.rows[1 - okRow]; overhang(L.fx, L.X(0), L.X(len), r.y - uh(u), uh(u), C('ok-soft')); ctx.caption(bad === 'gap' ? 'すきまが あると かずが へって しまう' : 'かさなると かずが ふえて しまう', 0); await countUp(cur.rows[okRow].laid, u, cur.rows[okRow].y); },
        };
      }
      // count：ぴったり ならんだ たんいを かぞえる（7こ以上は まちがえやすい）
      drawQ();
      return {
        say: `${NAMES[obj]}は ${nm} なんこぶん？`, sp: `${NAMES[obj]}は、${nm}何個分？`,
        choices: choices(`${n}こぶん`, [{ html: `${n - 1}こぶん`, mistake: 'count' }, { html: `${n + 1}こぶん`, mistake: 'count' }, { html: `${n + 2}こぶん`, mistake: 'other' }]),
        detail: { type, n, unit: u }, answerText: `${n}こぶん`, at: { x: L.X(len / 2), y: L.y2 - 20, r: Math.min(90, len * L.k * 0.4) },
        hint: k => { if (k === 1) ctx.caption('はしから じゅんに かぞえよう', 0); if (k === 2) { cur.laid.slice(0, 5).forEach((x, j) => badge(L.fx, L.X(x + ulen(u) / 2), L.y2 + 22, String(j + 1))); ctx.caption('5こまで かぞえたよ', 0); } if (k === 3) ctx.caption('5の つぎは 6、7、8…', 0); },
        async verify() { await countUp(cur.laid, u, L.y2); },
      };
    }
    async function countUp(xs, u, y) { const tag = S.token; clear(L.fx); for (let j = 0; j < xs.length; j++) { badge(L.fx, L.X(xs[j] + ulen(u) / 2), y + 22, String(j + 1)); sfx.tick(j); if (!(await wait(0.2)) || !alive(tag)) return; } }
    F.onResize(() => cur && drawQ());
    const quiz = makeQuiz(ctx, F, { kind: 'iterate', n: opts.n || 5, gen });
    quiz.start();
    return { dispose() {}, test: quiz.test };
  }

  /* ---------------- ためす：ちがう もので はかったら（L3 大きさ違い） ---------------- */
  if (mode === 'diff') {
    let cur = null;
    const PAIRS = { easy: [['clip', 'eraser']], normal: [['clip', 'eraser'], ['eraser', 'block'], ['clip', 'block']], challenge: [['clip', 'eraser'], ['eraser', 'block'], ['clip', 'block']] };
    function drawQ(showUnits = 1) {
      const q = cur; geom(Math.max(q.a.len, q.b.len)); F.clearLayers();
      const g = F.layer('obj'); L.fx = F.layer('fx');
      const ya = L.top + L.H * 0.3, yb = L.top + L.H * 0.72;
      [[q.a, ya, 'face-1'], [q.b, yb, 'face-4']].forEach(([t, y, col]) => {
        thing(g, 'tape', L.X(t.x), y - uh(t.u) - 6, t.len * L.k, { h: 16, color: C(col), line: C('ink-soft') });
        const n = Math.round(t.len / ulen(t.u));
        for (let k = 0; k < n * showUnits; k++) drawUnit(g, t.u, L.X(t.x + k * ulen(t.u)), y, ulen(t.u) * L.k, uh(t.u));
      });
      q.ya = ya; q.yb = yb;
    }
    function gen(level, i) {
      const [ua, ub] = shuffleR(pickR(PAIRS[level]).slice());
      const same = level === 'challenge' && i % 3 === 1;
      let na, nb;
      for (let t = 0; t < 60; t++) {
        na = rnd(3, 8); nb = rnd(2, 7);
        const la = na * ulen(ua), lb = nb * ulen(ub);
        if (same ? la === lb : (na > nb && lb > la + 12) || (nb > na && la > lb + 12)) break;
      }
      if (same) { const l = ulen(ua) * ulen(ub) / gcd(ulen(ua), ulen(ub)); na = l / ulen(ua); nb = l / ulen(ub); if (na > 8 || nb > 8) { na = 5; nb = 3; } }
      cur = { a: { u: ua, n: na, len: na * ulen(ua), x: 0 }, b: { u: ub, n: nb, len: nb * ulen(ub), x: rnd(0, 1) ? 0 : 20 } };
      drawQ(1);
      const longer = cur.a.len > cur.b.len ? 'a' : cur.b.len > cur.a.len ? 'b' : 'same', more = na > nb ? 'a' : 'b';
      const ch = [{ html: `${swatch('face-1')}あか`, ok: longer === 'a', mistake: more === 'a' ? 'L3' : 'other' }, { html: `${swatch('face-4')}あお`, ok: longer === 'b', mistake: more === 'b' ? 'L3' : 'other' }];
      if (level === 'challenge') ch.push({ html: 'おなじ ながさ', ok: longer === 'same', mistake: 'L3' });
      return {
        say: `あかは ${UNAME[ua]} ${na}こぶん、あおは ${UNAME[ub]} ${nb}こぶん。ながいのは？`, sp: `赤は${UNAME[ua]}${na}個分、青は${UNAME[ub]}${nb}個分。長いのは？`,
        choices: ch, detail: { type: 'diff', na, nb, ua, ub }, answerText: longer === 'same' ? 'おなじ' : longer === 'a' ? 'あか' : 'あお',
        at: { x: L.X(Math.max(cur.a.len, cur.b.len) / 2), y: (cur.ya + cur.yb) / 2, r: 70 },
        hint: k => { if (k === 1) ctx.caption('かずだけで くらべて いいかな？', 0, '数だけで比べていいかな？'); if (k === 2) ctx.caption(`${UNAME[ua]}と ${UNAME[ub]}は おおきさが ちがう`, 0); if (k === 3) ctx.caption('テープの はしを そろえて みよう', 0); },
        async verify() {
          const tag = S.token, bx = cur.b.x;
          await tween(0.6, k => { cur.b.x = lerp(bx, 0, E.io(k)); drawQ(1 - k * 0.999); }); if (!alive(tag)) return;
          cur.b.x = 0; drawQ(0);
          const y1 = cur.ya - uh(cur.a.u) - 22, y2 = cur.yb - uh(cur.b.u) - 22;
          if (longer !== 'same') { const lo = Math.min(cur.a.len, cur.b.len), hi = Math.max(cur.a.len, cur.b.len); overhang(L.fx, L.X(lo), L.X(hi), (longer === 'a' ? y1 : y2) - 2, 20); }
          ctx.caption(longer === 'same' ? 'はしを そろえると <b>おなじ ながさ</b>。かずが ちがっても おなじ！' : `はしを そろえると <b>${longer === 'a' ? 'あか' : 'あお'}</b>が ながい。たんいが ちがうと かずでは くらべられない`, 0);
          await wait(1.2);
        },
      };
    }
    F.onResize(() => cur && drawQ(1));
    const quiz = makeQuiz(ctx, F, { kind: 'iterate', n: opts.n || 5, gen });
    quiz.start();
    return { dispose() {}, test: quiz.test };
  }

  /* ---------------- ためす：みとおし（なんこぶんか けんとうを つけてから ならべる） ---------------- */
  if (mode === 'mitoshi') {
    const POOL = [['pencil', 'clip'], ['notebook', 'eraser'], ['tissue', 'clip'], ['hagaki', 'block'], ['ruler30', 'eraser'], ['notebook', 'block'], ['card', 'clip'], ['tissue', 'block']];
    const TOL = { easy: 2, normal: 1, challenge: 1 }, LV = ['easy', 'normal', 'challenge'], LVN = { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' };
    const Q = { level: ctx.level(), i: 0, n: opts.n || 5, res: [], list: [], cur: null, guess: 0, phase: 'ask' };
    const MAX = 12;
    panel.innerHTML = `<div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
      <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div></div>
      <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
      <div class="row" data-k="ctl"><button class="btn sub small" type="button" data-k="minus" aria-label="1こ へらす">−</button><button class="btn big" type="button" data-k="guess">これくらい</button><button class="btn sub small" type="button" data-k="plus" aria-label="1こ ふやす">＋</button></div>
      <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎ</button></div>
      <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><div class="row"><button class="btn sub" type="button" data-k="again">もういちど</button><button class="btn" type="button" data-k="up"></button></div></div>`;
    const q$ = k => $p(panel, `[data-k="${k}"]`);
    const nlX = v => L.nx0 + (L.nx1 - L.nx0) * v / MAX;
    function drawM(laidN = 0) {
      const c = Q.cur; geom(c.len); F.clearLayers();
      const g = F.layer('obj'), gn = F.layer('nl'); L.fx = F.layer('fx');
      L.y1 = L.top + L.H * 0.2; L.y2 = L.top + L.H * 0.4;
      thing(g, c.obj, L.X(0), L.y1, c.len * L.k, { h: Math.max(8, Math.min(26, thOf(c.obj, c.len * L.k))) });
      drawUnit(g, c.u, L.X(0), L.y2, ulen(c.u) * L.k, uh(c.u));
      for (let k = 1; k < laidN; k++) drawUnit(g, c.u, L.X(k * ulen(c.u)), L.y2, ulen(c.u) * L.k, uh(c.u));
      // 数直線
      L.nx0 = Math.max(36, F.W * 0.08); L.nx1 = F.W - Math.max(46, F.W * 0.08); L.ny = L.top + L.H * 0.8;
      line(gn, L.nx0, L.ny, L.nx1, L.ny, { 'stroke-width': 4 });
      for (let v = 0; v <= MAX; v++) { const x = nlX(v); line(gn, x, L.ny - 9, x, L.ny + 9, { 'stroke-width': v % 5 === 0 ? 2.6 : 1.4 }); txt(gn, x, L.ny + 30, String(v), { 'font-size': 15, fill: C('ink-soft'), class: 'ui' }); }
      txt(gn, L.nx1 + 22, L.ny + 30, 'こ', { 'font-size': 15, fill: C('ink-soft'), class: 'ui' });
      const mk = el('g', { class: 'grab', transform: `translate(${nlX(Q.guess)},${L.ny})` }, gn);
      path(mk, 'M-14,-34L14,-34L0,-12Z', { fill: C('sora') }); line(mk, 0, -12, 0, 14, { stroke: C('sora'), 'stroke-width': 4 });
      txt(mk, 0, -42, `${Q.guess}こ`, { 'font-size': 20, fill: C('sora'), class: 'ui' });
      if (Q.phase === 'done') { const am = el('g', { transform: `translate(${nlX(c.n)},${L.ny})` }, gn); path(am, 'M-12,30L12,30L0,12Z', { fill: C('ok') }); txt(am, 0, 54, `${c.n}こ`, { 'font-size': 18, fill: C('ok'), class: 'ui' }); }
    }
    const dotsHTML = () => Array.from({ length: Q.n }, (_, k) => `<i class="${Q.res[k] || (k === Q.i ? 'now' : '')}"></i>`).join('');
    function start() { Q.i = 0; Q.res = []; Q.list = shuffleR(POOL.slice()); $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level))); show(); }
    function show() {
      const [obj, u] = Q.list[Q.i % Q.list.length], len = olen(obj);
      Q.cur = { obj, u, len, n: Math.round(len / ulen(u)) }; Q.guess = 0; Q.phase = 'ask';
      q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('ctl').hidden = false; q$('dotsRow').hidden = false; q$('levelRow').hidden = Q.i !== 0;
      q$('dots').innerHTML = dotsHTML();
      const s = `${bench(obj).name.replace(/（.*）/, '')}は ${UNAME[u]} なんこぶんくらい？`;
      q$('qTxt').innerHTML = s; Q.say = s; drawM(1);
      ctx.caption(`${s} <small>▼を うごかして けんとうを つけてね</small>`, 0, s.replace(/ /g, ''));
    }
    const setG = v => { Q.guess = clamp(Math.round(v), 0, MAX); drawM(1); };
    dragOn(F.svg, F, { hit: p => (Q.phase === 'ask' && Math.abs(p.y - L.ny) < 60 ? true : null), start: p => setG((p.x - L.nx0) / (L.nx1 - L.nx0) * MAX), move: p => setG((p.x - L.nx0) / (L.nx1 - L.nx0) * MAX), end: () => sfx.tap() });
    async function go() {
      if (Q.phase !== 'ask') return;
      if (Q.guess <= 0) { sfx.off(); ctx.toast('', 'すうちょくせんの ▼を うごかして、けんとうを きめてね', 2.4); return; }
      Q.phase = 'busy'; sfx.pop(); q$('ctl').hidden = true; const tag = S.token, c = Q.cur;
      ctx.caption('ならべて たしかめよう', 0);
      for (let k = 1; k <= Math.ceil(c.len / ulen(c.u) - 0.12); k++) { drawM(k); badge(L.fx, L.X((k - 0.5) * ulen(c.u)), L.y2 + 22, String(k)); sfx.tick(k); if (!(await wait(0.26)) || !alive(tag)) return; }
      Q.phase = 'done'; drawM(Math.ceil(c.len / ulen(c.u) - 0.12));
      const close = Math.abs(Q.guess - c.n) <= TOL[Q.level]; Q.res[Q.i] = close ? 'ok' : 'ng';
      ctx.log('estimate', { correct: close, level: Q.level, detail: { q: Q.say, guess: Q.guess, actual: c.n, unit: 'こ', qty: 'length' } });
      const msg = `${countText(c.len, c.u)}ぶん。みとおしは ${Q.guess}こ`;
      if (close) { sfx.good(); hanamaru(F.svg, nlX(c.n), L.ny - 40, 40); ctx.toast(ICON.HANAMARU, `ちかい！ ${msg}`, 3); }
      else ctx.toast('', `${msg}。${Q.guess > c.n ? 'おおきく みすぎ' : 'ちいさく みすぎ'}`, 3.2);
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
    const nudge = d => { if (Q.phase !== 'ask') { ctx.toast('', 'ちょっと まってね', 1.2); return; } if ((d < 0 && Q.guess <= 0) || (d > 0 && Q.guess >= MAX)) { sfx.off(); ctx.toast('', d < 0 ? 'これより すくなく できないよ' : 'これより おおく できないよ', 1.6); return; } sfx.tap(); setG(Q.guess + d); };
    on(q$('say-q'), 'click', () => ctx.say(Q.say && Q.say.replace(/ /g, ''), true));
    on(q$('minus'), 'click', () => nudge(-1)); on(q$('plus'), 'click', () => nudge(1)); on(q$('guess'), 'click', go);
    on(q$('next'), 'click', () => { sfx.tap(); ctx.hideHud(); if (Q.i < Q.n - 1) { Q.i++; show(); } else finish(); });
    on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
    on(q$('up'), 'click', () => { sfx.tap(); ctx.hideHud(); Q.level = LV[(LV.indexOf(Q.level) + 1) % 3]; start(); });
    $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (b.dataset.level === Q.level) { sfx.tap(); ctx.toast('', `いまは「${LVN[Q.level]}」だよ`, 1.6); return; } sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
    F.onResize(() => Q.cur && drawM(1));
    start();
    api.test = {
      state: () => ({ phase: Q.phase, i: Q.i, guess: Q.guess }),
      auto() {
        if (!q$('result').hidden) return { done: true };
        if (Q.phase === 'done') return { click: 'data-k=next|' };
        if (Q.phase !== 'ask') return { wait: 300 };
        if (Q.guess !== Q.cur.n) return pathOf(F, [[nlX(Q.guess), L.ny - 10], [nlX((Q.guess + Q.cur.n) / 2), L.ny - 10], [nlX(Q.cur.n), L.ny - 10]]);
        return { click: 'data-k=guess|' };
      },
    };
    return api;
  }

  /* ---------------- つくる：じぶんの たんい（いくつぶん ずかん） ---------------- */
  if (mode === 'unit') {
    let unit = 'block', obj = UNIT_OBJS[0], laid = 0, measured = 0, busy = false;
    const draw = () => {
      const len = olen(obj); geom(Math.max(len, 300)); F.clearLayers();
      const g = F.layer('obj'), gl = F.layer('lane'); L.fx = F.layer('fx');
      thing(g, obj, L.X(0), L.y1, len * L.k, { h: Math.min(L.H * 0.22, Math.max(8, thOf(obj, len * L.k))) });
      line(g, L.X(len), L.y1 - L.H * 0.24, L.X(len), L.y2 + 12, { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      line(g, L.X(0), L.y1 - L.H * 0.24, L.X(0), L.y2 + 12, { stroke: C('ink-soft'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      for (let k = 0; k < laid; k++) drawUnit(gl, unit, L.X(k * ulen(unit)), L.y2, ulen(unit) * L.k, uh(unit));
    };
    const need = () => Math.ceil(olen(obj) / ulen(unit) - 0.12);
    async function finishMeasure() {
      busy = true; const tag = S.token, len = olen(obj), n = Math.floor(len / ulen(unit) + 1e-6);
      for (let k = 0; k < laid; k++) { badge(L.fx, L.X((k + 0.5) * ulen(unit)), L.y2 + 22, String(k + 1), { r: Math.min(13, Math.max(8, ulen(unit) * L.k * 0.45)) }); sfx.tick(k); if (!(await wait(Math.max(0.06, 0.24 - laid * 0.004))) || !alive(tag)) { busy = false; return; } }
      const t = countText(len, unit), name = bench(obj).name.replace(/（.*）/, '');
      sfx.good(); ctx.toast(ICON.HANAMARU, `${name}は ${UNAME[unit]} <b>${t}</b>ぶん`, 3, `${name}は、${UNAME[unit]}${t.replace(/ /g, '')}分`);
      ctx.register('ikutsu', `${obj}@${unit}`); ctx.log('unit', { correct: true, detail: { obj, unit, n } }); ctx.done('unit');
      measured++; busy = false;
    }
    function put(all = false) {
      if (busy) { ctx.toast('', 'かぞえて いるよ', 1.2); return; }
      if (laid >= need()) { sfx.off(); ctx.toast('', 'はしまで ならんだよ。べつの ものも はかろう', 2); return; }
      sfx.pop(); laid = all ? need() : laid + 1; draw();
      if (laid >= need()) finishMeasure(); else ctx.caption(`${laid}こ`, 0, `${laid}個`);
    }
    const chips = UNIT_OBJS.map(id => `<button type="button" class="chip" data-obj="${id}" aria-pressed="${id === obj}">${thingIcon(id === 'coin1' ? 'coin' : id, 34, 20)}${bench(id).name.replace(/（.*）/, '')}</button>`).join('');
    panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="じぶんの たんい">${MY_UNITS.map(u => `<button type="button" data-unit="${u}" aria-pressed="${u === unit}">${UNAME[u]}</button>`).join('')}</div></div>
      <div class="chips">${chips}</div>
      <div class="row"><button class="btn" type="button" data-k="put">1こ おく</button><button class="btn sub small" type="button" data-k="all">まとめて ならべる</button></div>`;
    const select = () => { laid = 0; draw(); ctx.caption(`<b>${bench(obj).name.replace(/（.*）/, '')}</b>を <b>${UNAME[unit]}</b>で はかろう。したの ところを タッチ`, 0, `${bench(obj).name.replace(/（.*）/, '')}を${UNAME[unit]}ではかろう`); };
    $$p(panel, '[data-unit]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.unit === unit) { ctx.toast('', `いまは「${UNAME[unit]}」だよ`, 1.6); return; } if (busy) { ctx.toast('', 'かぞえて いるよ', 1.2); return; } unit = b.dataset.unit; $$p(panel, '[data-unit]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.unit === unit))); select(); }));
    $$p(panel, '[data-obj]').forEach(b => on(b, 'click', () => { sfx.tap(); if (b.dataset.obj === obj) { ctx.toast('', `いまは「${bench(obj).name.replace(/（.*）/, '')}」だよ`, 1.6); return; } if (busy) { ctx.toast('', 'かぞえて いるよ', 1.2); return; } obj = b.dataset.obj; $$p(panel, '[data-obj]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.obj === obj))); select(); }));
    on($p(panel, '[data-k="put"]'), 'click', () => put(false));
    on($p(panel, '[data-k="all"]'), 'click', () => put(true));
    dragOn(F.svg, F, { hit: p => (Math.abs(p.y - (L.y2 - 8)) < Math.max(34, L.H * 0.12) ? true : null), end: () => put(false) });
    F.onResize(draw); select();
    api.test = { state: () => ({ measured, laid, busy }), auto: () => (measured >= 1 && !busy ? { done: true } : busy ? { wait: 300 } : tapOf(F, L.X(laid * ulen(unit) + 4), L.y2 - 6)) };
    return api;
  }
  return api;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
