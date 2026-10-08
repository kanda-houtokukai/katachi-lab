// さわる（1年）：opts.mode
//  'stack'：積み木のように積む。ボールの上には積めない（落ちる）、つつは平らな面を上にすれば積める。
//  'feel' ：形をタッチすると、平らなところ（青）と まるいところ（黄）が光る。
import { S, THREE, tween, wait, alive, easeOutBounce, easeInOut, fitBox, rayFrom, glow, holdGlow, stopGlows, spinCamera, col, disposeObject, objScreen } from '../stage/stage.js';
import { byId, thingMesh, thingSVG } from './_things.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const PIECES = [
  { key: 'block', id: 'block', o: 'up', label: 'はこ' },
  { key: 'snack', id: 'snack', o: 'up', label: 'ながい はこ' },
  { key: 'tube-up', id: 'can', o: 'up', label: 'つつ（たて）' },
  { key: 'tube-side', id: 'can', o: 'side', label: 'つつ（よこ）' },
  { key: 'ball', id: 'ball', o: 'up', label: 'ボール' },
];
export function mount(ctx) { return ctx.opts.mode === 'feel' ? feel(ctx) : stack(ctx); }

function stack(ctx) {
  const { panel, sfx, toast, caption, ICON } = ctx;
  const tower = [], fallen = [];
  let busy = false, topY = 0;
  panel.innerHTML = `<div class="tray">${PIECES.map(p => `<button class="stick" type="button" data-piece="${p.key}">${thingSVG(byId(p.id))}${p.label}</button>`).join('')}</div>
    <div class="row"><span class="status" data-k="st"></span><button class="btn small sub" type="button" data-k="reset">${ctx.ICONS_UI.again}くずす</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const status = () => { q$('st').innerHTML = `つんだ かず <b>${tower.length}</b>`; q$('reset').hidden = !tower.length && !fallen.length; };
  const frame = () => fitBox(new THREE.Box3(new THREE.Vector3(-2.2, 0, -1.8), new THREE.Vector3(2.2, Math.max(2.4, topY + 1.2), 0.8)), 0.92, 0.5, 1.15);
  frame(); status();
  caption('かたちを えらんで つんで みよう');
  async function drop(p) {
    if (busy) return;
    if (tower.length >= 6) { toast('', 'たかく なりすぎたね。「くずす」で もういちど', 2.2); return; }
    busy = true; sfx.tap();
    const tag = S.token, m = thingMesh(byId(p.id), p.o); S.stage.add(m);
    const top = tower[tower.length - 1];
    const hTop = topY, h = m.userData.height;
    m.position.set(0, hTop + 2.2, -0.5);
    // 置く：真上から落とす
    await tween(0.45, k => { m.position.y = hTop + 2.2 * (1 - easeOutBounce(k)); }); if (!alive(tag)) return;
    sfx.land();
    const baseOk = !top || top.userData.flatTop, pieceOk = m.userData.flatTop || (!top && m.userData.thing.kind !== 'ball' && !m.userData.rolls);
    if (!baseOk || !m.userData.flatTop) {
      // 落ちる：まるい所の上は不安定／まるい物は転がって落ちる
      const dir = Math.random() < 0.5 ? -1 : 1, x0 = m.position.x, y0 = m.position.y;
      if (!top && m.userData.rolls) {
        // 床の上：ボールや よこの つつは 転がって いってしまう
        await tween(0.9, k => { m.position.x = x0 + dir * 1.8 * k; if (m.userData.main) m.userData.main.rotation.z -= dir * 0.08; });
        toast(ICON.X, 'ころころ ころがって いっちゃった', 2.2);
      } else {
        await tween(0.75, k => { m.position.x = x0 + dir * 1.6 * k; m.position.y = Math.max(0, y0 * (1 - k * k)); m.rotation.z = -dir * 1.4 * k; });
        sfx.bad();
        toast(ICON.X, !baseOk ? 'まるい ところの うえには つめないね' : 'まるい ところが したに なると ころがって おちちゃう', 2.8);
      }
      fallen.push(m);
      ctx.log('stack', { correct: false, detail: { piece: p.key, on: top ? top.userData.key : 'floor' } });
    } else {
      m.userData.key = p.key; tower.push(m); topY = hTop + h;
      sfx.good();
      if (tower.length >= 3) toast(ICON.HANAMARU, `${tower.length}こ つめた！`, 1.8);
      ctx.log('stack', { correct: true, detail: { piece: p.key, n: tower.length } });
      if (tower.length === 4) ctx.done('stack');
    }
    frame(); status(); busy = false;
  }
  $$p(panel, '[data-piece]').forEach(b => on(b, 'click', () => drop(PIECES.find(p => p.key === b.dataset.piece))));
  on(q$('reset'), 'click', async () => {
    if (busy) return; sfx.swish(0.8); busy = true;
    const all = [...tower, ...fallen];
    await tween(0.6, k => all.forEach((m, i) => { m.rotation.z = (i % 2 ? 1 : -1) * k * 1.2; m.position.y = Math.max(0, m.position.y * (1 - k)); m.position.x += (i % 2 ? 0.03 : -0.03); }));
    all.forEach(m => { S.stage.remove(m); disposeObject(m); }); tower.length = 0; fallen.length = 0; topY = 0; busy = false; frame(); status();
  });
  return { dispose() {}, test: { auto() { if (busy) return { wait: 300 }; if (this._n) return { done: true }; this._n = 1; return { click: 'data-piece=block|' }; } } };
}

function feel(ctx) {
  const { panel, sfx, caption, toast } = ctx;
  panel.innerHTML = `<button class="btn sub" type="button" data-k="spin">${ctx.ICONS_UI.turn}まわして みる</button><span class="status" data-k="st"></span>`;
  const items = [['snack', 'up', -2.2], ['can', 'up', 0], ['ball', 'up', 2.2]].map(([id, o, x]) => { const m = thingMesh(byId(id), o); m.position.set(x, 0, -0.5); S.stage.add(m); return m; });
  fitBox(new THREE.Box3(new THREE.Vector3(-3.2, 0, -1.6), new THREE.Vector3(3.2, 1.4, 0.6)), 0.85, 0.35, 1.12);
  caption('かたちを タッチしよう。たいらな ところは あお、まるい ところは きいろ');
  const seen = new Set();
  function light(m) {
    stopGlows();
    const t = m.userData.thing, main = m.userData.main, mats = Array.isArray(main.material) ? main.material : [main.material];
    const blue = tok('flat-blue'), yellow = tok('curve-yellow');
    if (t.kind === 'box') mats.forEach(mt => { glow({ material: mt }, blue, 3, 0.8, 0.5); S.held.add(mt); });
    else if (t.kind === 'tube') { glow({ material: mats[0] }, yellow, 3, 0.8, 0.5); S.held.add(mats[0]); [1, 2].forEach(i => { glow({ material: mats[i] }, blue, 3, 0.8, 0.5); S.held.add(mats[i]); }); }
    else mats.forEach(mt => { glow({ material: mt }, yellow, 3, 0.8, 0.5); S.held.add(mt); });
    sfx.pop();
    const say = t.kind === 'box' ? 'はこは たいらな ところ だけ' : t.kind === 'tube' ? 'つつは たいらな ところと まるい ところが ある' : 'ボールは まるい ところ だけ';
    toast('', say, 3); seen.add(t.kind);
    $p(panel, '[data-k="st"]').textContent = `しらべた かたち ${seen.size} / 3`;
    ctx.log('feel', { detail: { kind: t.kind } });
  }
  on($p(panel, '[data-k="spin"]'), 'click', () => { sfx.tap(); spinCamera(2.4, Math.PI * 0.8); toast('', 'いろいろな むきから みて みよう', 2); });
  return {
    onTap(e) { const h = rayFrom(e).intersectObjects(items, true)[0]; if (!h) return; let o = h.object; while (o && !o.userData.thing) o = o.parent; if (o) light(o); },
    dispose() {},
    test: { point: i => objScreen(items[i], new THREE.Vector3(0, items[i].userData.height / 2, 0)), auto() { if (seen.size >= 3) return { done: true }; const i = [0, 1, 2].find(k => !seen.has(items[k].userData.thing.kind)); return { tap: this.point(i) }; } },
  };
}
