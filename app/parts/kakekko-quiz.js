// 単位量あたりの大きさ・速さ（S5）の「ためす」。opts.type：
//  compare（こみぐあい・はやさくらべを交互）｜calc（時速・分速・秒速の行き来と、はやさ・道のり・時間を交互）
// 誤答の選択肢：total（人数だけ・道のりだけで決める）・slow（時間が長いほうを はやいとする）・inverse（わる向き）・conv（×60 と ÷60）・unit（km と m）。
// 答え合わせは、ならして くらべる・走らせる・60ばいずつ ならべる 動きで確かめる。
import { C, txt, clear, wait } from './_flat.js';
import { drawMats, makeLanes, runRace, secMarks, convRows, RU, RAC } from './kakekko.js';
import { makeQuiz } from './_quiz2d.js';
import { komiQ, spdQ, convQ, calcQ, perMat, spdKid, spdSp, SPD, num, r1 } from './_ahead-gen.js';
import { S, alive } from '../stage/stage.js';

export function mount(ctx) {
  const { opts } = ctx;
  const type = opts.type || 'compare';
  const F = ctx.openFlat();
  const area = () => { const y0 = F.top + F.cap, y1 = F.bottom - 10; return { x0: 14, x1: F.W - 14, y0, y1, w: F.W - 28, h: y1 - y0, land: F.W >= 640 }; };
  const say = (h, s) => ctx.caption(h, 0, s);
  let draw = null;
  const build = () => { F.clearLayers(); draw && draw(area()); };
  F.onResize(build);
  const at = () => { const A = area(); return { x: A.x0 + A.w / 2, y: A.y0 + A.h * 0.4, r: Math.min(A.w, A.h) * 0.2 }; };
  const boxes = A => A.land ? [{ x: A.x0 + A.w * 0.06, y: A.y0, w: A.w * 0.4, h: A.h }, { x: A.x0 + A.w * 0.54, y: A.y0, w: A.w * 0.4, h: A.h }] : [{ x: A.x0, y: A.y0, w: A.w, h: A.h / 2 - 4 }, { x: A.x0, y: A.y0 + A.h / 2 + 4, w: A.w, h: A.h / 2 - 4 }];

  const qKomi = (level, i) => {
    const q = komiQ(level, i); let lv = false;
    draw = A => { const g = F.layer('m'), bx = boxes(A); drawMats(g, Object.assign({}, bx[0], { mats: q.ma, people: q.pa, col: C('face-1'), leveled: lv, title: `あ：マット ${q.ma}まいに ${q.pa}にん`, hi: lv && q.ans === 'A' })); drawMats(g, Object.assign({}, bx[1], { mats: q.mb, people: q.pb, col: C('face-4'), leveled: lv, title: `い：マット ${q.mb}まいに ${q.pb}にん`, hi: lv && q.ans === 'B' })); };
    build();
    return {
      say: 'こんで いるのは どっち？', sp: 'こんでいるのはどっち？', at: at(), choices: q.choices, answerText: q.ans === 'A' ? 'あ' : 'い', detail: { type: 'komi', a: [q.ma, q.pa], b: [q.mb, q.pb] },
      hint(k) { if (k === 1) say('ひとの かずだけで きめないで、マットの かずも みよう', '人の数だけで決めないで、マットの数も見よう'); if (k === 2) say('マット 1まい あたりの にんずうに ならそう', 'マット1枚あたりの人数にならそう'); if (k === 3) say(`あ ${q.pa}÷${q.ma}、い ${q.pb}÷${q.mb}`, `あ、${q.pa}わる${q.ma}。い、${q.pb}わる${q.mb}`); },
      async verify() { lv = true; build(); say(`1まい あたり あ ${num(q.ka)}にん、い ${num(q.kb)}にん`, `1枚あたり、あ${num(q.ka)}人、い${num(q.kb)}人`); await wait(1.6); },
    };
  };
  const qSpd = (level, i) => {
    const q = spdQ(level, i), vs = [q.va, q.vb], Dmax = Math.max(q.A.d, q.B.d) * 1.1;
    let ln = null;
    draw = A => { const h = Math.min(A.h * 0.75, 220); ln = makeLanes(F.layer('l'), { x: A.x0, y: A.y0 + (A.h - h) / 2, w: A.w, h, names: ['', ''], ids: ['hashiru', 'hashiru'], Dmax }); ln.lanes[0].set(q.A.d, `${q.A.d}m を ${q.A.t}びょう`); ln.lanes[1].set(q.B.d, `${q.B.d}m を ${q.B.t}びょう`); };
    build();
    return {
      say: 'はやいのは どっち？', sp: 'はやいのはどっち？', at: at(), choices: q.choices, answerText: q.ans === 'A' ? 'あ' : 'い', detail: { type: 'spd', kind: q.kind, A: q.A, B: q.B },
      hint(k) { if (k === 1) say(q.kind === 'sameT' ? 'じかんが おなじ。どちらが ながく すすんだ？' : q.kind === 'sameD' ? 'みちのりが おなじ。どちらが みじかい じかん？' : 'どちらも ちがう。1びょう あたりで くらべよう', 'くらべかたを考えよう'); if (k === 2) say(`${RU.haya} ＝ ${RU.mi} ÷ ${RU.ji}`, '速さは道のりわる時間'); if (k === 3) say(`あ ${q.A.d}÷${q.A.t}、い ${q.B.d}÷${q.B.t}`, `あ、${q.A.d}わる${q.A.t}。い、${q.B.d}わる${q.B.t}`); },
      async verify() {
        const tag = S.token; ln.lanes.forEach(L => L.set(0, ''));
        const t = await runRace(ln, vs, { times: [q.A.t, q.B.t], dur: 2.2 }); if (!t || !alive(tag)) return;
        secMarks(ln, vs, Dmax);
        say(`${RU.bs}：あ ${num(q.va)}m、い ${num(q.vb)}m`, `秒速、あ${num(q.va)}メートル、い${num(q.vb)}メートル`); await wait(1.4);
      },
    };
  };
  const qConv = (level, i) => {
    const q = convQ(level, i), k = { mps: 1, mpm: 2, kmh: 3 }[q.from];
    draw = A => convRows(F.layer('c'), A, q.r, new Set([k]), q.from);
    build();
    const fromKid = spdKid(q.v, q.from), toName = { mps: RU.bs, mpm: RU.fs, kmh: RU.js }[q.to];
    return {
      say: `${q.r.name}は ${fromKid}。${toName}に なおすと？`, sp: `${q.r.name}は${spdSp(q.v, q.from)}。${SPD[q.to][1]}になおすと？`, at: at(), choices: q.choices, answerText: q.answer, detail: { type: 'conv', from: q.from, to: q.to, id: q.r.id },
      hint(kk) { if (kk === 1) say('1ぷんは 60びょう、1じかんは 60ぷん', '1分は60秒、1時間は60分'); if (kk === 2) say(q.big === 'mul' ? 'ながい じかんに なおすから、かずは ふえる（×60）' : 'みじかい じかんに なおすから、かずは へる（÷60）', q.big === 'mul' ? '長い時間に直すから、数は増える' : '短い時間に直すから、数は減る'); if (kk === 3) say('1km ＝ 1000m', '1キロメートルは1000メートル'); },
      async verify() { const tag = S.token; const ord = q.from === 'kmh' ? [3, 2, 1] : q.from === 'mpm' ? [2, 1, 3] : [1, 2, 3], vis = new Set(); for (const o of ord) { vis.add(o); clear(F.layer('c')); convRows(F.layer('c'), area(), q.r, vis, q.from); if (!(await wait(0.6)) || !alive(tag)) return; } say(`${fromKid} ＝ <b>${spdKid(q.right, q.to)}</b>`, `${spdSp(q.v, q.from)}は${spdSp(q.right, q.to)}`); await wait(1); },
    };
  };
  const qCalc = (level, i) => {
    const q = calcQ(level, i);
    // 道のり・時間・はやさ を 1本の レーンで
    const unitT = q.kind === 'time' ? 'ふん' : q.kind === 'dist' ? 'ふん' : 'びょう';
    const v = q.kind === 'spd' ? q.v : q.v;   // spd：秒速、dist・time：分速
    let ln = null;
    draw = A => { const h = Math.min(A.h * 0.6, 200); ln = makeLanes(F.layer('l'), { x: A.x0, y: A.y0 + (A.h - h) / 2, w: A.w, h, names: ['', ''], ids: ['jitensha', 'aruku'], Dmax: q.d * 1.1 }); ln.lanes[0].set(q.kind === 'dist' ? 0 : q.d, q.kind === 'dist' ? '' : `${q.d}m`); ln.lanes[1].set(0, ''); };
    build();
    const words = {
      spd: [`${q.d}mを ${q.t}びょうで はしった。${RU.bs}は？`, `${q.d}メートルを${q.t}秒で走った。秒速は？`],
      dist: [`${RU.fs} ${q.v}mで ${q.t}ふん すすむと？`, `分速${q.v}メートルで${q.t}分進むと？`],
      time: [`${RU.fs} ${q.v}mで ${q.d}m すすむには なんぷん？`, `分速${q.v}メートルで${q.d}メートル進むには何分？`],
    }[q.kind];
    return {
      say: words[0], sp: words[1], at: at(), choices: q.choices, answerText: q.answer, detail: { type: 'calc', kind: q.kind },
      hint(k) { if (k === 1) say(q.kind === 'spd' ? `${RU.haya} ＝ ${RU.mi} ÷ ${RU.ji}` : q.kind === 'dist' ? `${RU.mi} ＝ ${RU.haya} × ${RU.ji}` : `${RU.ji} ＝ ${RU.mi} ÷ ${RU.haya}`, 'しきを考えよう'); if (k === 2) say(q.kind === 'spd' ? '1びょう あたりに すすむ みちのり' : '1ぷんで すすむ みちのりが いくつぶん？', '1あたりで考えよう'); if (k === 3) say(q.expr.replace(/＝ .*$/, '＝ ？'), q.expr.replace(/＝ .*$/, '')); },
      async verify() {
        const tag = S.token; ln.lanes[0].set(0, '');
        const per = q.kind === 'spd' ? q.v : q.v, T = q.t;
        await runRace(ln, [per, 0.0001], { times: [T, 0], dur: 1.8 }); if (!alive(tag)) return;
        ln.lanes[0].set(q.d, `${q.d}m・${T}${unitT}`); ln.ticks(0, per, T, `1${unitT === 'ふん' ? 'ぷん' : 'びょう'}ごと ${per}m`);
        say(q.expr.replace(/＝ (.*)$/, '＝ <b>$1</b>'), q.expr); await wait(1.2);
      },
    };
  };
  const gens = {
    compare: (lv, i) => (i % 2 === 0 ? qKomi(lv, i) : qSpd(lv, i)),
    calc: (lv, i) => (i % 2 === 0 ? qConv(lv, i) : qCalc(lv, i)),
    komi: qKomi, spd: qSpd, conv: qConv,
  };
  const kind = opts.kind || { compare: 'compare', calc: 'calc', komi: 'komi', spd: 'spd', conv: 'conv' }[type] || type;
  const gen = gens[type] || gens.compare;
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 6, gen: (lv, i) => { draw = null; return gen(lv, i); } });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
