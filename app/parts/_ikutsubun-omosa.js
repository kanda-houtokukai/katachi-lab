// ikutsubun（おもさ）：1円玉・つみきの いくつぶんで つりあわせる（O3・任意単位）。ikutsubun.js が opts.qty='omosa' のときに読む。
// 1円玉 1まい＝1g（基準物 coin1）。つみきで はかると 数が ちがう（もとに する物が ちがうと くらべられない）。
import { balanceScene, nameOfM, massOf, TSUMIKI } from './_scale.js';
import { hanamaru } from './_flat.js';
import { $p, $$p, on } from './_common.js';

const OBJ = ['egg', 'orange', 'banana', 'pencil'];
export function mount(ctx) {
  const { panel, opts, sfx, ICON } = ctx;
  const F = ctx.openFlat();
  const objs = opts.list || OBJ;
  let obj = objs[0], unit = 'coin', got = {}, done = 0;
  const say = (h, s) => ctx.caption(h, 0, s || null);
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="のせる もの">${objs.map(id => `<button type="button" data-obj="${id}" aria-pressed="${id === obj}">${nameOfM(id)}</button>`).join('')}</div><div class="seg" role="group" aria-label="たんい"><button type="button" data-unit="coin" aria-pressed="true">1えんだま</button><button type="button" data-unit="block" aria-pressed="false">つみき</button></div></div>
    <div class="row"><button class="btn sub small" type="button" data-add="1">＋1</button><button class="btn sub small" type="button" data-add="10">＋10</button><button class="btn sub small" type="button" data-add="-1">−1</button><button class="btn sub small" type="button" data-add="-10">−10</button><span class="status" data-k="n"></span></div>`;
  const bal = balanceScene(F, ctx, { L: [obj], R: [], onSettle: d => settle(d) });
  const unitG = () => massOf(unit === 'coin' ? 'coin1' : TSUMIKI), cnt = () => (unit === 'coin' ? bal.coins : bal.blocks);
  const uname = () => (unit === 'coin' ? '1えんだま' : 'つみき'), uc = () => (unit === 'coin' ? 'まい' : 'こ');
  const status = () => { $p(panel, '[data-k="n"]').innerHTML = `${uname()} <b>${cnt()}</b>${uc()}`; };
  function settle(d) {
    const m = massOf(obj), n = cnt(); if (!n) return;
    if (Math.abs(d) < 1e-6) {
      got[obj] = Object.assign(got[obj] || {}, { [unit]: n });
      sfx.good(); const c = bal.center(); hanamaru(F.svg, c.x, c.y, c.r);
      const both = got[obj].coin && got[obj].block;
      ctx.toast(ICON.HANAMARU, unit === 'coin' ? `つりあった！ 1えんだま ${n}まい。${nameOfM(obj)}は <b>${n}g</b>` : `つりあった！ つみき ${n}こぶん${both ? `。1えんだまでは ${got[obj].coin}まい。もとに する ものが ちがうと かずが ちがう` : ''}`, 3.4, unit === 'coin' ? `つりあった。1円玉${n}枚。${nameOfM(obj)}は${n}グラム` : `つりあった。つみき${n}個分`);
      ctx.log('coins', { correct: true, detail: { obj, unit, n, g: m } }); done++;
    } else if (d < 0 && n * unitG() - unitG() < m) say(`${uname()} ${n}${uc()}では おもすぎ、${n - 1}${uc()}では かるすぎ。ぴったりには ならない`, null);
  }
  const add = k => {
    sfx.tap(); const before = cnt(), mx = unit === 'coin' ? 300 : 40, v = Math.max(0, Math.min(mx, before + k));
    if (v === before) { sfx.off(); ctx.toast('', k < 0 ? `${uname()}は もう のって いないよ` : 'これいじょう のせられないよ', 1.6); return; }
    if (unit === 'coin') bal.coins = v; else bal.blocks = v;
    if (k > 0) sfx.tick(v); bal.draw(); status(); ctx.hideHud();
  };
  $$p(panel, '[data-add]').forEach(b => on(b, 'click', () => add(+b.dataset.add)));
  $$p(panel, '[data-obj]').forEach(b => on(b, 'click', () => {
    sfx.tap(); if (b.dataset.obj === obj) { ctx.toast('', `いまは「${nameOfM(obj)}」だよ`, 1.6); return; }
    obj = b.dataset.obj; bal.L = [obj]; bal.coins = 0; bal.blocks = 0; bal.draw(); status();
    $$p(panel, '[data-obj]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.obj === obj))); say(`${nameOfM(obj)}と つりあう ${uname()}は なん${uc()}？`, null);
  }));
  $$p(panel, '[data-unit]').forEach(b => on(b, 'click', () => {
    sfx.tap(); if (b.dataset.unit === unit) { ctx.toast('', `いまは「${uname()}」だよ`, 1.6); return; }
    unit = b.dataset.unit; bal.coins = 0; bal.blocks = 0; bal.draw(); status();
    $$p(panel, '[data-unit]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.unit === unit))); say(`こんどは ${uname()}で はかろう`, null);
  }));
  status(); say(`${nameOfM(obj)}と つりあう 1えんだまは なんまい？`, `${nameOfM(obj)}と釣り合う1円玉は何枚？`);
  return {
    dispose() { bal.dispose(); },
    test: {
      state: () => ({ obj, unit, n: cnt(), done }),
      auto() {
        if (done >= 1) return { done: true };
        const m = massOf(obj), need = Math.round(m / unitG()), n = cnt();
        if (m % unitG()) return { click: 'data-obj=egg|' };
        if (n === need) return { wait: 400 };
        const d = need - n; return { click: `data-add=${Math.abs(d) >= 10 ? (d > 0 ? 10 : -10) : (d > 0 ? 1 : -1)}|` };
      },
    },
  };
}
