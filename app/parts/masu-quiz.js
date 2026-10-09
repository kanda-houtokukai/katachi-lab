// かさの「ためす」（K1・K2）。opts.type：
//  more（どちらが おおい：高い ほうが すくない 問題を かならず）｜cups（なんばいぶん と コップの 大きさ ちがいを まぜる）｜count｜cupsize
//  read（目もりを よむ）｜compare（数字だけで くらべると まちがえる組）｜calc（かさの けいさん）｜unit（たんい えらび）
// 誤答には つまずきの型（V1〜V5）を入れる。答え合わせは 注いで・目もりを かぞえて 確かめる。
import { vesselScene, nameOf, VK } from './_vessels.js';
import { el, C, txt, rect, line, clear, wait, tween, lerp, clamp } from './_flat.js';
import { makeQuiz } from './_quiz2d.js';
import { genMore, genCount, genCupSize, genReadV, readChoicesV, genUnit, genCompare, genCalc, UNIT_ITEMS } from './_kasa-gen.js';
import { dlText } from './_water.js';
import { hai, unitSpeech } from '../core/yomi.js';
import { bench } from '../core/bench.js';
import { S, alive } from '../stage/stage.js';
import { pick } from '../core/text.js';

export function mount(ctx) {
  const { opts, sfx } = ctx;
  const type = opts.type || 'more';
  const F = ctx.openFlat();
  const RED = C('face-1'), BLUE = C('face-4');
  const sw = col => `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px;background:${col}"></span>`;
  const sc = vesselScene(F, ctx, { topPad: ['cups', 'cupsize', 'unit'].includes(type) ? 40 : 0, onLayout: () => decor() });
  const lines = F.layer('levels'), deco = F.layer('qdeco');
  let decoFn = null;
  function decor() { F.svg.appendChild(lines); F.svg.appendChild(deco); clear(deco); clear(lines); decoFn && decoFn(deco); }
  const say = (h, s) => ctx.caption(h, 0, s || null);
  const V = id => sc.byId(id);
  const relabel = (v, name, col) => { v.name = name; v.tag = col; if (v.label) { v.label.textContent = name; v.label.setAttribute('fill', col); } };
  const levelLines = vs => { for (const v of vs) { if (v.vol <= 0.5) continue; const y = sc.levelY(v); line(lines, 12, y, F.W - 12, y, { stroke: v.tag || C('ok'), 'stroke-width': 2.5, 'stroke-dasharray': '7 6', opacity: 0.85 }); } };
  const centerOf = (...vs) => { const cs = vs.map(v => sc.center(v)); return { x: cs.reduce((a, c) => a + c.x, 0) / cs.length, y: cs.reduce((a, c) => a + c.y, 0) / cs.length, r: Math.max(...cs.map(c => c.r)) }; };
  const distribute = (ms, dl) => ms.forEach((m, j) => { m.vol = clamp(dl - 10 * j, 0, 10) * 100; m.wave = 1; });
  const fx = (a, b, tag) => alive(tag) && a && b;

  /* ---------- K1 ---------- */
  const qMore = (lv, i) => {
    const g = genMore(lv, i);
    sc.set([{ kind: 'tall', id: 'a', name: 'あか', tag: RED, vol: g.tall }, { kind: 'wide', id: 'b', name: 'あお', tag: BLUE, vol: g.wide }, { kind: 'jar', id: 'c1', gap: 5 }, { kind: 'jar', id: 'c2' }]);
    const ans = { a: 'あか', b: 'あお', eq: 'おなじ' }[g.more];
    return {
      say: 'みずが おおいのは どっち？', sp: '水が多いのはどっち？', at: centerOf(V('c1'), V('c2')), detail: { type: 'more', tall: g.tall, wide: g.wide }, answerText: ans,
      choices: g.choices.map(c => Object.assign({}, c, { html: (c.key === 'a' ? sw(RED) : c.key === 'b' ? sw(BLUE) : '') + c.html })),
      hint(k) { if (k === 1) say('たかさだけで きめられるかな？', '高さだけで決められるかな？'); if (k === 2) { clear(lines); levelLines([V('a'), V('b')]); say('ふとさも みてね', '太さも見てね'); } if (k === 3) say('おなじ いれものに うつすと くらべられる', '同じ入れ物にうつすと、くらべられる'); },
      async verify() { const tag = S.token; clear(lines); await sc.pour(V('a'), V('c1'), { fast: true }); if (!alive(tag)) return; relabel(V('c1'), 'あか', RED); await sc.pour(V('b'), V('c2'), { fast: true }); if (!alive(tag)) return; relabel(V('c2'), 'あお', BLUE); levelLines([V('c1'), V('c2')]); say(`おなじ いれもので くらべると <b>${ans}</b>`); await wait(0.9); },
    };
  };
  const qCount = lv => {
    const g = genCount(lv);
    sc.set([{ kind: 'wide', id: 'src', name: 'あお', tag: BLUE, vol: 0 }, ...Array.from({ length: g.n }, (_, j) => ({ kind: 'cup-s', id: 'c' + j, name: j === 0 ? 'コップ' : ' ', vol: 100, gap: j ? 1.2 : 4 }))]);
    return {
      say: '<b>あお</b>の みずを コップに うつしたよ。コップ なんばいぶん？', sp: 'あおの水をコップにうつしたよ。コップ何杯分？', at: centerOf(V('c0'), V('c' + (g.n - 1))), detail: { type: 'count', n: g.n }, answerText: `${g.n}${hai(g.n)}`,
      choices: g.choices.map(c => Object.assign({}, c, { html: `${c.html}${hai(+c.html)}` })),
      hint(k) { if (k === 1) say('ゆびで さしながら かぞえよう', '指でさしながら数えよう'); if (k === 2) say('5こずつ まとめると かぞえやすい', '5個ずつまとめると数えやすい'); if (k === 3) { decoFn = gg => { const c = V('c4') || V('c' + (g.n - 1)); line(gg, c.x + c.w * sc.k * 0.6 + 2, sc.tableY - c.h * sc.k - 6, c.x + c.w * sc.k * 0.6 + 2, sc.tableY + 4, { stroke: C('ok'), 'stroke-width': 3 }); }; decor(); } },
      async verify() { const tag = S.token; for (let j = 0; j < g.n; j++) { const c = V('c' + j); txt(deco, c.x, sc.tableY - c.h * sc.k - 10, String(j + 1), { 'font-size': 18, fill: C('ok'), class: 'ui' }); sfx.tick(j); if (!(await wait(0.22)) || !alive(tag)) return; } say(`コップ <b>${g.n}${hai(g.n)}ぶん</b>`, `コップ${g.n}杯分`); await wait(0.6); },
    };
  };
  const qCupSize = (lv, i) => {
    const g = genCupSize(lv, i);
    sc.set([{ kind: 'donburi', id: 'a', name: 'あか', tag: RED, vol: g.a }, { kind: 'yakan', id: 'b', name: 'あお', tag: BLUE, vol: g.b }, { kind: 'jar', id: 'c1', gap: 5 }, { kind: 'jar', id: 'c2' }]);
    // 上に、つかった コップの 数を ならべる
    decoFn = gg => {
      const y = F.top + F.cap + 2;
      [[V('a'), g.nS, 18, RED], [V('b'), g.nB, 26, BLUE]].forEach(([v, n, s, col]) => { const x0 = clamp(v.x - n * (s + 3) / 2, 6, F.W - n * (s + 3) - 6); for (let j = 0; j < n; j++) { rect(gg, x0 + j * (s + 3), y + (26 - s), s, s * 1.2 - (26 - s) * 0.2, { rx: 3, fill: C('water'), stroke: col, 'stroke-width': 2 }); } });
    };
    decor();
    const ans = { a: 'あか', b: 'あお', eq: 'おなじ' }[g.more];
    return {
      say: `<b>あか</b>は ちいさい コップ ${g.nS}${hai(g.nS)}、<b>あお</b>は おおきい コップ ${g.nB}${hai(g.nB)}。みずが おおいのは？`, sp: `あかは小さいコップ${g.nS}杯、あおは大きいコップ${g.nB}杯。水が多いのは？`,
      at: centerOf(V('c1'), V('c2')), detail: { type: 'cupsize', nS: g.nS, nB: g.nB }, answerText: ans,
      choices: g.choices.map(c => Object.assign({}, c, { html: (c.key === 'a' ? sw(RED) : c.key === 'b' ? sw(BLUE) : '') + c.html })),
      hint(k) { if (k === 1) say('コップの おおきさを みてね', 'コップの大きさを見てね'); if (k === 2) say('おおきい コップ 1ぱいは、ちいさい コップ 2はいぶん', '大きいコップ1杯は、小さいコップ2杯分'); if (k === 3) say(`あおは ちいさい コップなら ${g.nB * 2}はいぶん`, `あおは小さいコップなら${g.nB * 2}杯分`); },
      async verify() { const tag = S.token; await sc.pour(V('a'), V('c1'), { fast: true }); if (!alive(tag)) return; relabel(V('c1'), 'あか', RED); await sc.pour(V('b'), V('c2'), { fast: true }); if (!alive(tag)) return; relabel(V('c2'), 'あお', BLUE); levelLines([V('c1'), V('c2')]); say(`コップの かずが おおくても おおいとは かぎらない。<b>${ans}</b>`); await wait(0.9); },
    };
  };

  /* ---------- K2 ---------- */
  const qRead = lv => {
    const v = genReadV(lv), m = Math.ceil(v / 10);
    sc.set(Array.from({ length: m }, (_, j) => ({ kind: 'masu1L', id: 'm' + j, vol: clamp(v - j * 10, 0, 10) * 100, gap: 3 })));
    const P = V('m' + (m - 1));
    return {
      say: 'みずの かさは どれだけ？', sp: '水のかさはどれだけ？', at: sc.center(P), detail: { type: 'read', dl: v }, answerText: dlText(v), answerSp: unitSpeech(dlText(v)),
      choices: readChoicesV(v),
      hint(k) { if (k === 1) say(m > 1 ? 'いっぱいの 1Lますは 1L' : '1Lますの めもりは 10こに わけて ある', m > 1 ? 'いっぱいの1リットルますは1リットル' : '1リットルますの目もりは、10個に分けてある'); if (k === 2) say('めもり 1つは <b>1dL</b>。したから かぞえよう', '目もり1つは1デシリットル。下から数えよう'); if (k === 3) sc.showNums(P, true); },
      async verify() { const tag = S.token; sc.resetMarks(P); if (m > 1) { say(`いっぱいの 1Lますが ${m - 1}こ → <b>${m - 1}L</b>`, `${m - 1}リットル`); if (!(await wait(0.9)) || !alive(tag)) return; } await sc.countMarks(P, v - (m - 1) * 10, 0.22); if (!alive(tag)) return; say(`<b>${dlText(v)}</b>`, unitSpeech(dlText(v))); await wait(0.6); },
    };
  };
  const qUnit = (lv, i) => {
    const pool = lv === 'easy' ? ['bucket', 'cup', 'milk1L', 'nabe', 'milk200'] : UNIT_ITEMS;
    const id = pool[(i + Math.floor(Math.random() * pool.length)) % pool.length], b = bench((VK[id] || {}).bench || id), ml = b ? b.vol_ml : 1000, g = genUnit(ml);
    sc.set([{ kind: id, id: 'x', vol: ml }, { kind: g.u === 'L' ? 'masu1L' : 'masu1dL', id: 'm', gap: 5 }]);
    return {
      say: `<b>${nameOf(id)}</b>に はいる みずは やく どれだけ？`, sp: `${nameOf(id)}に入る水は、約どれだけ？`, at: sc.center(V('x')), detail: { type: 'unit', id, ml }, answerText: `やく ${g.n}${g.u}`, answerSp: unitSpeech(`約${g.n}${g.u}`),
      choices: g.choices,
      hint(k) { if (k === 1) say('いちばん おおきいのは L、つぎが dL、いちばん ちいさいのが mL', '一番大きいのはリットル、次がデシリットル、一番小さいのがミリリットル'); if (k === 2) say('1Lは ぎゅうにゅうパック 1ぽん。1dLは コップ はんぶんくらい', '1リットルは牛乳パック1本。1デシリットルはコップ半分くらい'); if (k === 3) say(`1${g.u}ますで はかって みよう`, unitSpeech(`1${g.u}ますではかってみよう`)); },
      async verify() {
        const tag = S.token, m = V('m'), s = Math.max(10, Math.min(22, (F.W - 40) / Math.max(10, g.n))), y = F.top + F.cap + 2;
        const cols = Math.min(g.n, Math.floor((F.W - 30) / (s + 3))), x0 = (F.W - cols * (s + 3)) / 2;
        for (let j = 0; j < Math.min(g.n, 40); j++) { rect(deco, x0 + (j % cols) * (s + 3), y + Math.floor(j / cols) * (s + 3), s, s, { rx: 3, fill: C('water'), stroke: C('masu-edge'), 'stroke-width': 1.5 }); sfx.tick(j); if (!(await wait(g.n > 12 ? 0.06 : 0.16)) || !alive(tag)) return; }
        say(`${m.name} ${g.n}${hai(g.n)}ぶん → やく <b>${g.n}${g.u}</b>`, unitSpeech(`約${g.n}${g.u}`)); await wait(0.8);
      },
    };
  };
  const qCompare = (lv, i) => {
    const g = genCompare(lv, i), mA = Math.max(1, Math.ceil(g.a.ml / 1000)), mB = Math.max(1, Math.ceil(g.b.ml / 1000));
    sc.set([...Array.from({ length: mA }, (_, j) => ({ kind: 'masu1L', id: 'a' + j, name: j === 0 ? g.a.html : ' ', tag: RED, gap: 2 })), ...Array.from({ length: mB }, (_, j) => ({ kind: 'masu1L', id: 'b' + j, name: j === 0 ? g.b.html : ' ', tag: BLUE, gap: j === 0 ? 7 : 2 }))]);
    const ans = { a: g.a.html, b: g.b.html, eq: 'おなじ' }[g.more];
    const As = () => Array.from({ length: mA }, (_, j) => V('a' + j)), Bs = () => Array.from({ length: mB }, (_, j) => V('b' + j));
    return {
      say: `<b>${g.a.html}</b>と <b>${g.b.html}</b>、おおいのは どっち？`, sp: unitSpeech(`${g.a.html}と${g.b.html}、多いのはどっち？`), at: centerOf(...As(), ...Bs()), detail: { type: 'compare', a: g.a.ml, b: g.b.ml, kind: g.kind }, answerText: ans, answerSp: unitSpeech(ans),
      choices: g.choices.map(c => Object.assign({}, c, { html: (c.key === 'a' ? sw(RED) : c.key === 'b' ? sw(BLUE) : '') + c.html })),
      hint(k) { if (k === 1) say('かずの おおきさだけで きめて いいかな？ たんいを みてね', '数の大きさだけで決めていいかな？単位を見てね'); if (k === 2) say('1L＝10dL＝1000mL', '1リットルは10デシリットル、1000ミリリットル'); if (k === 3) say(`${g.a.html}は ${dlText(g.a.ml / 100)}、${g.b.html}は ${dlText(g.b.ml / 100)}`, unitSpeech(`${g.a.html}は${dlText(g.a.ml / 100)}、${g.b.html}は${dlText(g.b.ml / 100)}`)); },
      async verify() {
        const tag = S.token, A0 = As(), B0 = Bs();
        await tween(0.9, e => { distribute(A0, g.a.ml / 100 * e); distribute(B0, g.b.ml / 100 * e); sc.draw(); }); if (!alive(tag)) return;
        sfx.pop(); say(`${g.a.html}は ${dlText(g.a.ml / 100)}、${g.b.html}は ${dlText(g.b.ml / 100)} → <b>${ans}</b>`, unitSpeech(`${g.a.html}は${dlText(g.a.ml / 100)}、${g.b.html}は${dlText(g.b.ml / 100)}`)); await wait(1);
      },
    };
  };
  const qCalc = lv => {
    const g = genCalc(lv), M = 3;
    sc.set(Array.from({ length: M }, (_, j) => ({ kind: 'masu1L', id: 'm' + j, gap: 2.5 })));
    const ms = () => Array.from({ length: M }, (_, j) => V('m' + j));
    distribute(ms(), g.a); sc.draw();
    const La = Math.floor(g.a / 10), da = g.a % 10;
    return {
      say: `<b>${g.text} ＝ ？</b>`, sp: unitSpeech(`${g.text.replace('＋', 'たす').replace('−', 'ひく')}は？`), at: centerOf(...ms()), detail: { type: 'calc', a: g.a, b: g.b, op: g.op }, answerText: dlText(g.r), answerSp: unitSpeech(dlText(g.r)),
      choices: g.choices,
      hint(k) {
        if (k === 1) say('1L＝10dL', '1リットルは10デシリットル');
        if (k === 2) say(g.op === '+' ? `dLどうし：${da}dL ＋ ${g.b}dL ＝ ${da + g.b}dL` : `1Lを 10dLに して から ひこう`, g.op === '+' ? unitSpeech(`${da}dLたす${g.b}dLは${da + g.b}dL`) : '1リットルを10デシリットルにしてからひこう');
        if (k === 3) say(g.op === '+' ? (da + g.b >= 10 ? `${da + g.b}dLは 1L ${da + g.b - 10}dL` : `${La}L と ${da + g.b}dL`) : `${La - 1}L ${10 + da}dL − ${g.b}dL`, null);
      },
      async verify() { const tag = S.token, M0 = ms(); sfx.pour && sfx.pour(0.8); await tween(1.1, e => { distribute(M0, lerp(g.a, g.r, e)); sc.draw(); }); if (!alive(tag)) return; say(`${g.text} ＝ <b>${dlText(g.r)}</b>`, unitSpeech(`${dlText(g.r)}`)); await wait(0.8); },
    };
  };

  const gens = {
    more: qMore, count: qCount, cupsize: qCupSize, cups: (lv, i) => (i % 2 === 0 ? qCount(lv) : qCupSize(lv, i)),
    read: qRead, unit: qUnit, compare: qCompare, calc: qCalc,
  };
  const gen = gens[type] || qMore;
  const kind = opts.kind || { more: 'more', count: 'cups', cupsize: 'cups', cups: 'cups', read: 'read', unit: 'choose', compare: 'compare', calc: 'calc' }[type];
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen: (lv, i) => { decoFn = null; clear(deco); clear(lines); return gen(lv, i); } });
  quiz.start();
  void fx; void pick; void el;
  return { dispose() { sc.dispose(); }, test: quiz.test };
}
