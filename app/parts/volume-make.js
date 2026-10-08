// つくる「きまった たいせきの はこ」（5年）：決められた体積になる箱を、たて・よこ・たかさを選んで作る。
// いくつ作れるかを図鑑に集める（すべての組を計算で出して網羅する）。
import { S, THREE, tween, wait, alive, burst, fitBox, spinCamera, labelSprite, disposeObject } from '../stage/stage.js';
import { makeBlocks, wireBox, triples, U } from './_blocks.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots } from './_common.js';

const mem = { V: 24 };
export function mount(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI, opts } = ctx;
  const VS = opts.volumes || [12, 24, 36];
  let dims = [1, 1, 1], hints = 0, B = null, frame = null, busy = false, lastDone = false;
  const names = ['たて', 'よこ', 'たかさ'];
  panel.innerHTML = `
    <div class="row"><div class="seg" role="group" aria-label="つくる たいせき">${VS.map(v => `<button type="button" data-vol="${v}" aria-pressed="${v === mem.V}">${v}cm³</button>`).join('')}</div></div>
    <div class="row">${names.map((n, i) => `<span class="chip">${n}<button type="button" class="btn small sub" data-dec="${i}" aria-label="${n}を へらす">−</button><b data-val="${i}">1</b><button type="button" class="btn small sub" data-inc="${i}" aria-label="${n}を ふやす">＋</button></span>`).join('')}</div>
    <div class="row"><span class="status" data-k="st"></span><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button><button class="btn big" type="button" data-k="make">${ICONS_UI.build}つくる</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const coll = () => 'vol' + mem.V;
  const keyOf = d => [...d].sort((a, b) => a - b).join('x');
  function render() {
    dims.forEach((v, i) => { $p(panel, `[data-val="${i}"]`).textContent = v; });
    const found = ctx.zukanList(coll()).length, all = triples(mem.V).length;
    q$('st').innerHTML = `${dims.join(' × ')} ＝ <b>${dims[0] * dims[1] * dims[2]}</b>　みつけた ${found} / ${all}`;
    q$('hd').innerHTML = hintDots(hints);
  }
  let grp = null;
  function show(d) {
    if (grp) { S.stage.remove(grp); disposeObject(grp); }
    const [a, b, c] = d, s = Math.min(1, 6 / Math.max(a, b, c));   // 長い箱は小さく描く
    grp = new THREE.Group(); grp.position.set(0, 0, -0.5); grp.scale.setScalar(s); S.stage.add(grp);
    B = makeBlocks(400); grp.add(B.mesh);
    B.set([a, b, c], 0, new THREE.Vector3(-b * U / 2, 0, a * U / 2));
    frame = wireBox(b * U, c * U, a * U, tok('ink-soft'), 0.012); frame.position.copy(B.origin); grp.add(frame);
    const hx = b * U / 2 * s + 0.6, hz = a * U / 2 * s + 0.6, m = Math.max(hx, hz, 1.5);
    fitBox(new THREE.Box3(new THREE.Vector3(-m, 0, -0.5 - m), new THREE.Vector3(m, Math.max(c * U * s + 0.6, 1.5), -0.5 + m)), 0.95, 0.55, 1.1);
  }
  const clamp = v => Math.max(1, Math.min(36, v));
  $$p(panel, '[data-inc]').forEach(b => on(b, 'click', () => { if (busy) return; const i = +b.dataset.inc; if (dims[i] >= 36) { toast('', 'それ いじょうは おおきく できないよ', 1.6); return; } sfx.tick(dims[i]); dims[i] = clamp(dims[i] + 1); render(); }));
  $$p(panel, '[data-dec]').forEach(b => on(b, 'click', () => { if (busy) return; const i = +b.dataset.dec; if (dims[i] <= 1) { toast('', '1より ちいさく できないよ', 1.6); return; } sfx.tick(dims[i]); dims[i] = clamp(dims[i] - 1); render(); }));
  $$p(panel, '[data-vol]').forEach(b => on(b, 'click', () => { sfx.tap(); if (+b.dataset.vol === mem.V) { toast('', `いまは「${mem.V}cm³」の はこを つくって いるよ`, 1.8); return; } mem.V = +b.dataset.vol; $$p(panel, '[data-vol]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.vol === mem.V))); hints = 0; dims = [1, 1, 1]; render(); ctx.caption(`${mem.V}cm³ の はこを ぜんぶ みつけよう`); }));
  on(q$('hint'), 'click', () => {
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; render();
    const found = new Set(ctx.zukanList(coll())), t = triples(mem.V).find(x => !found.has(x.join('x'))) || triples(mem.V)[0];
    if (hints === 1) toast(ICON.HINT, `かけて ${mem.V}に なる 3つの かずを さがそう`, 3);
    else if (hints === 2) toast(ICON.HINT, `たてを ${t[0]}に して みよう`, 2.6);
    else { dims = [...t]; render(); toast(ICON.HINT, 'たて・よこ・たかさを あわせたよ。「つくる」を おそう', 3); }
  });
  on(q$('make'), 'click', async () => {
    if (busy) return;
    sfx.tap(); busy = true; const tag = S.token, v = dims[0] * dims[1] * dims[2];
    if (v > 400) { busy = false; toast(ICON.X, `${v}こは おおすぎて ならべられないよ`, 2.4); return; }
    show(dims);
    await tween(Math.min(2.2, 0.6 + v * 0.03), k => B.show(Math.round(v * k))); if (!alive(tag)) return;
    if (v === mem.V) {
      const isNew = ctx.register(coll(), keyOf(dims));
      sfx.good(); burst(new THREE.Vector3(0, 1, -0.5));
      toast(ICON.HANAMARU, `${mem.V}cm³ の はこが できた！${isNew ? '<br><small>ずかんに とうろく</small>' : '<br><small>もう みつけた はこ だよ</small>'}`, 3);
      if (isNew) ctx.done('vol-make');
    } else { sfx.bad(); toast(ICON.X, `${v}cm³ に なったよ。${v < mem.V ? 'もっと おおきく' : 'もっと ちいさく'} しよう`, 3); }
    spinCamera(2.2, Math.PI * 0.5);
    ctx.log('make', { correct: v === mem.V, hints, detail: { V: mem.V, dims: dims.join('x') } });
    busy = false; lastDone = true; render();
  });
  render(); show([2, 3, 4]); B.show(0);
  ctx.caption(`${mem.V}cm³ の はこを ぜんぶ みつけよう`);
  return {
    dispose() {},
    test: {
      auto() {
        if (busy) return { wait: 300 };
        if (lastDone && this._n) return { done: true };
        const found = new Set(ctx.zukanList(coll())), t = triples(mem.V).find(x => !found.has(x.join('x')));
        if (!t) return { done: true };
        for (let i = 0; i < 3; i++) { if (dims[i] < t[i]) return { click: `data-inc=${i}|` }; if (dims[i] > t[i]) return { click: `data-dec=${i}|` }; }
        this._n = 1; return { click: 'data-k=make|' };
      },
    },
  };
}
