// kurabe（おもさ）：てんびんで 直接くらべる（O3）。kurabe.js が opts.qty='omosa' のときに読む。
// 大きさと 重さは ちがう（W1）：大きい スポンジより 小さい てつの たまが 重い。
import { balanceScene, nameOfM, massOf } from './_scale.js';
import { $p, $$p, on } from './_common.js';
import { S, alive } from '../stage/stage.js';

const LEFT = ['sponge', 'apple', 'textbook', 'cabbage'], RIGHT = ['ironball', 'orange', 'egg', 'banana'];
export function mount(ctx) {
  const { panel, opts, sfx } = ctx;
  const F = ctx.openFlat();
  const Ls = opts.left || LEFT, Rs = opts.right || RIGHT;
  let l = Ls[0], r = Rs[0], n = 0;
  const say = (h, s) => ctx.caption(h, 0, s || null);
  const seg = (side, list, cur) => `<div class="seg" role="group" aria-label="${side === 'l' ? 'ひだり' : 'みぎ'}">${list.map(id => `<button type="button" data-${side}="${id}" aria-pressed="${id === cur}">${nameOfM(id)}</button>`).join('')}</div>`;
  panel.innerHTML = `<div class="row"><span class="status">ひだり</span>${seg('l', Ls, l)}</div><div class="row"><span class="status">みぎ</span>${seg('r', Rs, r)}</div>`;
  const bal = balanceScene(F, ctx, { L: [l], R: [r], onSettle: d => result(d) });
  function result(d) {
    const heavy = d > 0 ? l : d < 0 ? r : null;
    if (!heavy) say('つりあった。おなじ おもさ', '釣り合った。同じ重さ');
    else {
      const big = id => ['sponge', 'cabbage', 'textbook'].includes(id), light = heavy === l ? r : l;
      say(`<b>${nameOfM(heavy)}</b>の ほうが おもい${big(light) && !big(heavy) ? '。おおきい ほうが おもい とは かぎらない' : ''}`, `${nameOfM(heavy)}のほうが重い`);
    }
    n++; ctx.log('balance', { correct: true, detail: { l, r, heavy } });
  }
  const pickSide = (side, id) => {
    sfx.tap(); const curId = side === 'l' ? l : r;
    if (id === curId) { ctx.toast('', `いまは「${nameOfM(id)}」だよ`, 1.6); return; }
    if (side === 'l') { l = id; bal.L = [id]; } else { r = id; bal.R = [id]; }
    $$p(panel, `[data-${side}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[side] === id)));
    bal.hold = true; bal.draw(); ctx.hideHud();
    const tag = S.token; setTimeout(() => { if (alive(tag)) bal.hold = false; }, 500);
  };
  $$p(panel, '[data-l]').forEach(b => on(b, 'click', () => pickSide('l', b.dataset.l)));
  $$p(panel, '[data-r]').forEach(b => on(b, 'click', () => pickSide('r', b.dataset.r)));
  say('てんびんに のせて くらべよう。さがった ほうが おもい', 'てんびんにのせてくらべよう。下がったほうが重い');
  void massOf;
  return {
    dispose() { bal.dispose(); },
    test: { state: () => ({ l, r, n }), auto: () => (n >= 2 ? { done: true } : n >= 1 && r === Rs[0] ? { click: `data-r=${Rs[1]}|` } : { wait: 400 }) },
  };
}
