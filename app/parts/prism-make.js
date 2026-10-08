// つくる「きまった たいせきの はしら」（6年）：決められた体積の角柱を、底面（めんせきの決まったカード）と高さを選んで作る。
// 作れる組をすべて図鑑に集める（底面積×高さ＝体積 になる組を計算で出して網羅）。
import { S, THREE, tween, wait, alive, burst, fitBox, spinCamera, disposeObject } from '../stage/stage.js';
import { baseShape, plateStack, CM } from './volume-slice.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots } from './_common.js';

export const CARDS = [
  { id: 't3', kind: 'tri', a: 3, b: 2, area: 3 }, { id: 'r4', kind: 'rect', a: 2, b: 2, area: 4 }, { id: 't6', kind: 'tri', a: 4, b: 3, area: 6 },
  { id: 'r8', kind: 'rect', a: 4, b: 2, area: 8 }, { id: 't12', kind: 'tri', a: 6, b: 4, area: 12 },
];
export function combos(V) { return CARDS.filter(c => V % c.area === 0 && V / c.area <= 16).map(c => ({ card: c.id, h: V / c.area })); }
const mem = { V: 24, card: 't6', h: 1 };
const svg = c => { const s = 6, pts = c.kind === 'tri' ? [[0, c.b], [c.a, c.b], [c.a / 2, 0]] : [[0, 0], [c.a, 0], [c.a, c.b], [0, c.b]]; return `<svg class="card" viewBox="-1 -1 ${c.a * s + 2} ${c.b * s + 2}" width="${c.a * s + 2}"><path d="M${pts.map(([x, y]) => `${x * s} ${y * s}`).join('L')}Z" fill="${tok('face-2')}" stroke="${tok('ink')}" stroke-width="1"/></svg>`; };

export function mount(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI, opts } = ctx;
  const VS = opts.volumes || [24, 36, 48];
  let obj = null, busy = false, hints = 0, made = false;
  panel.innerHTML = `
    <div class="row"><div class="seg" role="group" aria-label="つくる たいせき">${VS.map(v => `<button type="button" data-vol="${v}" aria-pressed="${v === mem.V}">${v}cm³</button>`).join('')}</div></div>
    <div class="tray">${CARDS.map(c => `<button class="stick" type="button" data-card="${c.id}" aria-pressed="${c.id === mem.card}">${svg(c)}<small>${c.area}cm²</small></button>`).join('')}</div>
    <div class="row"><span class="chip">たかさ<button type="button" class="btn small sub" data-k="dec" aria-label="たかさを へらす">−</button><b data-k="h">${mem.h}</b>cm<button type="button" class="btn small sub" data-k="inc" aria-label="たかさを ふやす">＋</button></span>
    <span class="status" data-k="st"></span><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button><button class="btn big" type="button" data-k="make">${ICONS_UI.build}つくる</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const coll = () => 'prism' + mem.V, card = () => CARDS.find(c => c.id === mem.card);
  function render() {
    q$('h').textContent = mem.h;
    const B = card().area, all = combos(mem.V).length, found = ctx.zukanList(coll()).length;
    q$('st').innerHTML = `${B} × ${mem.h} ＝ <b>${B * mem.h}</b>　みつけた ${found} / ${all}`;
    q$('hd').innerHTML = hintDots(hints);
    $$p(panel, '[data-card]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.card === mem.card)));
    $$p(panel, '[data-vol]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.vol === mem.V)));
  }
  function frame() { fitBox(new THREE.Box3(new THREE.Vector3(-1.4, 0, -1.9), new THREE.Vector3(1.4, Math.max(1.6, mem.h * CM + 0.6), 0.9)), 0.95, 0.55, 1.15); }
  $$p(panel, '[data-vol]').forEach(b => on(b, 'click', () => { sfx.tap(); if (+b.dataset.vol === mem.V) { toast('', `いまは ${mem.V}cm³ の はしらを つくって いるよ`, 1.8); return; } mem.V = +b.dataset.vol; hints = 0; render(); ctx.caption(`${mem.V}cm³ の はしらを ぜんぶ みつけよう`); }));
  $$p(panel, '[data-card]').forEach(b => on(b, 'click', () => { if (busy) return; sfx.tap(); if (b.dataset.card === mem.card) { toast('', `この そこの めんせきは ${card().area}cm²`, 1.8); return; } mem.card = b.dataset.card; render(); }));
  on(q$('inc'), 'click', () => { if (busy) return; if (mem.h >= 16) { toast('', 'それ いじょう たかく できないよ', 1.6); return; } sfx.tick(mem.h); mem.h++; render(); });
  on(q$('dec'), 'click', () => { if (busy) return; if (mem.h <= 1) { toast('', '1より ひくく できないよ', 1.6); return; } sfx.tick(mem.h); mem.h--; render(); });
  on(q$('hint'), 'click', () => {
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; render();
    const found = new Set(ctx.zukanList(coll())), t = combos(mem.V).find(x => !found.has(x.card + 'x' + x.h)) || combos(mem.V)[0];
    if (hints === 1) toast(ICON.HINT, `そこの めんせき × たかさ が ${mem.V} に なる くみを さがそう`, 3);
    else if (hints === 2) toast(ICON.HINT, `そこが ${CARDS.find(c => c.id === t.card).area}cm² の カードなら、たかさは？`, 3);
    else { mem.card = t.card; mem.h = t.h; render(); toast(ICON.HINT, 'カードと たかさを あわせたよ。「つくる」を おそう', 3); }
  });
  on(q$('make'), 'click', async () => {
    if (busy) return; sfx.tap(); busy = true; const tag = S.token, c = card(), v = c.area * mem.h;
    if (obj) { S.stage.remove(obj); disposeObject(obj); }
    obj = plateStack(baseShape(c.kind, c.a, c.b), mem.h, tok('face-4')); obj.position.set(0, 0, -0.5); S.stage.add(obj); frame();
    await tween(Math.min(2, 0.4 + mem.h * 0.12), k => obj.userData.show(Math.max(1, Math.round(mem.h * k)))); if (!alive(tag)) return;
    if (v === mem.V) {
      const isNew = ctx.register(coll(), c.id + 'x' + mem.h);
      sfx.good(); burst(new THREE.Vector3(0, mem.h * CM, -0.5));
      toast(ICON.HANAMARU, `${mem.V}cm³ の はしらが できた！${isNew ? '<br><small>ずかんに とうろく</small>' : '<br><small>もう みつけた くみ だよ</small>'}`, 3);
      if (isNew) ctx.done('prism-make');
    } else { sfx.bad(); toast(ICON.X, `${v}cm³ に なったよ。${v < mem.V ? 'もっと おおきく' : 'もっと ちいさく'} しよう`, 3); }
    spinCamera(2.2, Math.PI * 0.5);
    ctx.log('make', { correct: v === mem.V, hints, detail: { V: mem.V, combo: c.id + 'x' + mem.h } });
    busy = false; made = true; render();
  });
  render(); frame();
  ctx.caption(`${mem.V}cm³ の はしらを ぜんぶ みつけよう`);
  return {
    dispose() {},
    test: {
      auto() {
        if (busy) return { wait: 300 };
        if (made && this._n) return { done: true };
        const found = new Set(ctx.zukanList(coll())), t = combos(mem.V).find(x => !found.has(x.card + 'x' + x.h));
        if (!t) return { done: true };
        if (mem.card !== t.card) return { click: `data-card=${t.card}|` };
        if (mem.h < t.h) return { click: 'data-k=inc|' };
        if (mem.h > t.h) return { click: 'data-k=dec|' };
        this._n = 1; return { click: 'data-k=make|' };
      },
    },
  };
}
