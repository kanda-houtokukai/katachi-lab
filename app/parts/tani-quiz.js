// たんいの しくみの「ためす」（U3）。opts.type：match（おなじ しくみ・□の 単位・k と m）｜convert（長さ・かさ・重さの かんさん）
// 誤答は W5（単位を別々に覚えている）。答え合わせは、その量の 列で 10ずつ まとめる（わける）動きを 3かい 見せる。
import { zoomScene, QS } from './tani-zoom.js';
import { makeQuiz } from './_quiz2d.js';
import { genMatch, genConvertU } from './_tani-gen.js';
import { wait } from './_flat.js';
import { unitSpeech } from '../core/yomi.js';
import { S, alive } from '../stage/stage.js';

export function mount(ctx) {
  const { opts } = ctx;
  const type = opts.type || 'match';
  const F = ctx.openFlat();
  const z = zoomScene(F, ctx, opts.only);
  const say = (h, s) => ctx.caption(h, 0, s || null);
  const plain = s => String(s).replace(/<[^>]+>/g, '').replace('□', 'しかく');
  const ask = g => {
    z.mode = g.md || 'k'; z.step = 0; z.paint();
    const c = z.cols[Math.min(g.col || 0, z.cols.length - 1)];
    return {
      say: g.q, sp: unitSpeech(plain(g.q)), at: { x: c.cx, y: c.cy, r: c.s * 0.5 }, detail: { type, k: g.k || null, q: plain(g.q) }, answerText: g.right, answerSp: unitSpeech(g.right),
      choices: g.choices,
      hint(k) { const q = QS[g.col || 0]; if (k === 1) say(z.mode === 'm' ? '<b>m（ミリ）</b>は 1000ぶんの1' : '<b>k（キロ）</b>は 1000ばい', z.mode === 'm' ? 'ミリは1000分の1' : 'キロは1000倍'); if (k === 2) say('ながさ・かさ・おもさで おなじ しくみ', '長さ、かさ、重さで同じしくみ'); if (k === 3) { c.eq.textContent = z.mode === 'm' ? q.mEq : q.kEq; say(`<b>${z.mode === 'm' ? q.mEq : q.kEq}</b>`, unitSpeech(z.mode === 'm' ? q.mEq : q.kEq)); } },
      async verify() { const tag = S.token; z.step = 0; z.paint(); for (let k = 0; k < 3; k++) { await z.doStep(g.col || 0, true); if (!alive(tag)) return; } say(`<b>${g.right}</b>`, unitSpeech(g.right)); await wait(0.6); },
    };
  };
  const gen = type === 'convert' ? (lv, i) => ask(genConvertU(lv, i)) : (lv, i) => ask(genMatch(lv, i));
  const kind = opts.kind || (type === 'convert' ? 'convert' : 'match');
  const quiz = makeQuiz(ctx, F, { kind, n: opts.n || 5, gen });
  quiz.start();
  return { dispose() {}, test: quiz.test };
}
