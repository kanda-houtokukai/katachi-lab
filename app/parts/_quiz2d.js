// 量の「ためす」の進め方（全部品で共通・見本 v1 の makeQuiz を移したもの）。
// 部品は gen(level, i) で問題を返す：
//   { say, sp, choices:[{ html, ok, mistake }] | set:true, setLabel, check(), solve()→auto の1手, hint(k), verify(ok), at:{x,y,r}, after, detail }
// まちがえたら1回めはヒントを1段すすめてもう一度。2回めは動きで確かめて次へ。正解でも動きで確かめる。
// 記録：1問ごとに <kind>（correct・hints・level・detail.mistake・detail.miss）、終わりに <kind>-done（n・score）。
import { hintDots, levelSeg, starsHTML, $p, $$p, on } from './_common.js';
import { hanamaru } from './_flat.js';
import { S, alive } from '../stage/stage.js';
import { pick } from '../core/text.js';

const LV = ['easy', 'normal', 'challenge'], LVN = { easy: 'やさしい', normal: 'ふつう', challenge: 'チャレンジ' };
export function makeQuiz(ctx, F, o) {
  const { panel, sfx, ICON } = ctx;
  const Q = { level: o.level || ctx.level(), i: 0, res: [], cur: null, hint: 0, miss: 0, phase: 'ask', first: null, n: 0 };
  const nOf = lv => (typeof o.n === 'function' ? o.n(lv) : o.n || 5);
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row rchoices" data-k="choices"></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><div class="row"><button class="btn sub" type="button" data-k="again">もういちど</button><button class="btn" type="button" data-k="up"></button></div></div>
    ${o.extra || ''}`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const dots = () => { q$('dots').innerHTML = Array.from({ length: Q.n }, (_, k) => `<i class="${Q.res[k] ? Q.res[k] : k === Q.i ? 'now' : ''}"></i>`).join(''); };
  on(q$('say-q'), 'click', () => ctx.say(Q.cur && (Q.cur.sp || Q.cur.say), true));
  function start() {
    Q.i = 0; Q.res = []; Q.n = nOf(Q.level);
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level)));
    o.onStart && o.onStart(Q.level);
    show();
  }
  function show() {
    Q.hint = 0; Q.miss = 0; Q.first = null; Q.phase = 'ask';
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('choices').hidden = false;
    q$('levelRow').hidden = Q.i !== 0;
    q$('hd').innerHTML = hintDots(0); dots();
    const q = Q.cur = o.gen(Q.level, Q.i);
    q$('qTxt').innerHTML = q.say; ctx.caption(q.say, 0, q.sp);
    const ch = q$('choices');
    if (q.set) ch.innerHTML = `<button class="btn big" type="button" data-k="set">${q.setLabel || 'できた'}</button>`;
    else ch.innerHTML = q.choices.map((c, i) => `<button class="btn sub" type="button" data-ch="${i}">${c.html}</button>`).join('');
    $$p(panel, '[data-ch]').forEach(b => on(b, 'click', () => answer(+b.dataset.ch)));
    on(q$('set'), 'click', () => answer(null));
    ctx.decorate && ctx.decorate();
  }
  async function useHint() {
    if (Q.phase !== 'ask') return;
    if (Q.hint >= 3) { ctx.toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); Q.hint++; q$('hd').innerHTML = hintDots(Q.hint);
    try { await (Q.cur.hint && Q.cur.hint(Q.hint)); } catch (e) { console.error(e); }
  }
  async function answer(ci) {
    if (Q.phase !== 'ask') return;
    const q = Q.cur, c = ci == null ? null : q.choices[ci];
    const ok = c ? !!c.ok : !!q.check();
    const tag = S.token;
    if (ok) {
      Q.phase = 'busy';
      $$p(panel, '[data-ch],[data-k="set"]').forEach(b => { b.disabled = true; });
      if (c) $$p(panel, '[data-ch]')[ci].classList.add('right');
      try { if (q.verify) await q.verify(true); } catch (e) { console.error(e); }
      if (!alive(tag)) return;
      sfx.good(); const at = q.at || { x: F.W / 2, y: (F.top + F.bottom) / 2, r: Math.min(F.W, F.h) * 0.18 };
      hanamaru(F.svg, at.x, at.y, at.r);
      Q.res[Q.i] = Q.hint || Q.miss ? 'okh' : 'ok';
      ctx.toast(ICON.HANAMARU, pick(['せいかい！', 'できたね！', 'ぴったり！']) + (q.after ? ' ' + q.after : ''), 3, q.afterSp ? 'せいかい！ ' + q.afterSp : null);
      finishQ(true);
    } else {
      sfx.bad(); Q.miss++;
      if (Q.first == null) Q.first = c ? (c.mistake || 'other') : (q.mistakeNow ? q.mistakeNow() : 'other');
      if (c) { const b = $$p(panel, '[data-ch]')[ci]; b.disabled = true; b.classList.add('ng'); }
      if (Q.miss < 2) {
        ctx.toast(ICON.X, 'もう いちど。ヒントを みてね', 2.4);
        if (Q.hint < 3) { Q.hint++; q$('hd').innerHTML = hintDots(Q.hint); try { await (q.hint && q.hint(Q.hint)); } catch (e) { console.error(e); } }
      } else {
        Q.phase = 'busy';
        $$p(panel, '[data-ch],[data-k="set"]').forEach(b => { b.disabled = true; });
        ctx.caption('うごかして たしかめよう');
        try { if (q.verify) await q.verify(false); } catch (e) { console.error(e); }
        if (!alive(tag)) return;
        Q.res[Q.i] = 'ng';
        if (q.choices) q.choices.forEach((cc, k) => { if (cc.ok) $$p(panel, '[data-ch]')[k].classList.add('right'); });
        ctx.toast(ICON.X, q.answerText ? `こたえは ${q.answerText}` : 'こんどは できるよ', 3, q.answerSp ? `答えは ${q.answerSp}` : null);
        finishQ(false);
      }
    }
  }
  function finishQ(correct) {
    const q = Q.cur;
    ctx.log(o.kind, { correct, hints: Q.hint, level: Q.level, detail: Object.assign({}, q.detail || {}, { mistake: Q.first, miss: Q.miss }) });
    Q.phase = 'done'; dots();
    q$('hint').hidden = true;
    q$('next').textContent = Q.i < Q.n - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  function finish() {
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('choices').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = Q.res.filter(r => r === 'ok' || r === 'okh').length;
    q$('stars').innerHTML = starsHTML(Q.res.map(r => ({ correct: r !== 'ng', hints: r === 'okh' })), ICON);
    q$('score').textContent = `${Q.n}もん中 ${score}もん できた`;
    const li = LV.indexOf(Q.level), up = q$('up');
    up.textContent = li < 2 ? `${LVN[LV[li + 1]]} へ` : 'やさしい から';
    ctx.log(o.kind + '-done', { level: Q.level, detail: { n: Q.n, score } });
    ctx.done('tamesu');
    o.onFinish && o.onFinish(score);
    if (score === Q.n) { sfx.good(); ctx.toast(ICON.HANAMARU, 'ぜんぶ できたね！', 3); } else ctx.caption(`${Q.n}もん中 ${score}もん できた`);
  }
  on(q$('hint'), 'click', useHint);
  on(q$('next'), 'click', () => { sfx.tap(); ctx.hideHud(); o.onNext && o.onNext(); if (Q.i < Q.n - 1) { Q.i++; show(); } else finish(); });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  on(q$('up'), 'click', () => { sfx.tap(); ctx.hideHud(); const li = LV.indexOf(Q.level); Q.level = LV[(li + 1) % 3]; start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (b.dataset.level === Q.level) { sfx.tap(); ctx.toast('', `いまは「${LVN[Q.level]}」だよ`, 1.6); return; } sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
  return {
    Q, start,
    test: {
      state: () => ({ phase: Q.phase, i: Q.i, n: Q.n, level: Q.level, set: !!(Q.cur && Q.cur.set), ok: Q.cur && Q.cur.set ? !!Q.cur.check() : null }),
      auto() {
        if (!q$('result').hidden) return { done: true };
        if (Q.phase === 'done') return { click: 'data-k=next|' };
        if (Q.phase !== 'ask' || !Q.cur) return { wait: 300 };
        const q = Q.cur;
        if (q.set) { if (q.check()) return { click: 'data-k=set|' }; const a = q.solve && q.solve(); return a || { wait: 200 }; }
        return { clickNth: ['data-ch', q.choices.findIndex(c => c.ok)] };
      },
    },
  };
}
export { choices } from './_gen.js';
