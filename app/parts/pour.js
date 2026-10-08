// さわる（中1）：錐体と球の体積。
//  'cone'  ：同じ底面・同じ高さの円錐に水を入れて3杯注ぐと、円柱がいっぱいになる（円錐＝円柱の 1/3）。
//  'sphere'：球がちょうど入る円柱。球の体積は円柱の 2/3。
import { squareBox } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeInOut, fitBox, spinCamera, labelSprite, disposeObject, col, burst } from '../stage/stage.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const R = 0.75, H = 1.5;
const glass = () => new THREE.MeshStandardMaterial({ color: col(tok('paper')), transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
const waterMat = () => new THREE.MeshStandardMaterial({ color: col(tok('water')), transparent: true, opacity: 0.8, roughness: 0.2 });
const mem = { mode: 'cone' };
export function mount(ctx) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `<div class="seg" role="group" aria-label="くらべる もの"><button type="button" data-mode="cone" aria-pressed="${mem.mode === 'cone'}">えんすいと えんちゅう</button><button type="button" data-mode="sphere" aria-pressed="${mem.mode === 'sphere'}">きゅうと えんちゅう</button></div>
    <button class="btn" type="button" data-k="go">${ctx.ICONS_UI.play}みずで たしかめる</button><span class="status" data-k="st"></span>`;
  const objs = [];
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs.length = 0; };
  $$p(panel, '[data-mode]').forEach(b => on(b, 'click', () => { sfx.tap(); if (mem.mode === b.dataset.mode) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } mem.mode = b.dataset.mode; ctx.restart(); }));
  let busy = false;
  async function cone() {
    clear(); const tag = S.token, cyX = 0.9, coX = -1.6, h = mem.mode === 'sphere' ? 2 * R : H;
    const cyl = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), glass())); cyl.position.set(cyX, H / 2, -0.5);
    const bottom = add(new THREE.Mesh(new THREE.CircleGeometry(R, 48), glass())); bottom.rotation.x = -Math.PI / 2; bottom.position.set(cyX, 0.005, -0.5);
    const water = add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 1, 48), waterMat())); water.position.set(cyX, 0, -0.5); water.scale.y = 0.0001;
    // 円錐のコップ（さかさま）
    const cup = new THREE.Group(); cup.position.set(coX, 0, -0.5); add(cup);
    const cg = new THREE.Mesh(new THREE.ConeGeometry(R, H, 48, 1, true), glass()); cg.rotation.x = Math.PI; cg.position.y = H / 2; cup.add(cg);
    const cw = new THREE.Mesh(new THREE.ConeGeometry(R * 0.97, H * 0.97, 48), waterMat()); cw.rotation.x = Math.PI; cw.position.y = H / 2; cup.add(cw);
    fitBox(squareBox(new THREE.Box3(new THREE.Vector3(-2.6, 0, -1.4), new THREE.Vector3(2.0, H + 1.4, 0.4))), 0.92, 0.25, 1.0);
    const st = $p(panel, '[data-k="st"]');
    caption('そこと たかさが おなじ えんすいと えんちゅう');
    if (!(await wait(1.0))) return false;
    for (let k = 1; k <= 3; k++) {
      caption(`${k}ばいめ…`);
      const p0 = cup.position.clone(), p1 = new THREE.Vector3(cyX - 0.2, H + 0.5, -0.5);
      await tween(0.7, t => { cup.position.lerpVectors(p0, p1, easeInOut(t)); cup.rotation.z = -1.9 * easeInOut(t); }); if (!alive(tag)) return false;
      sfx.pour(1.2);
      const l0 = (k - 1) / 3 * H, l1 = k / 3 * H;
      await tween(1.1, t => { water.scale.y = Math.max(0.0001, l0 + (l1 - l0) * t); water.position.y = water.scale.y / 2; cw.scale.set(1 - t, 1 - t, 1 - t); }); if (!alive(tag)) return false;
      st.innerHTML = `<b>${k}</b> ばい`;
      await tween(0.6, t => { cup.position.lerpVectors(p1, p0, easeInOut(t)); cup.rotation.z = -1.9 * (1 - easeInOut(t)); }); if (!alive(tag)) return false;
      if (k < 3) { await tween(0.4, t => cw.scale.setScalar(Math.max(0.001, t))); if (!alive(tag)) return false; }
    }
    sfx.good(); burst(new THREE.Vector3(cyX, H, -0.5));
    const lab = add(labelSprite('えんすい ＝ えんちゅうの 1/3', { h: 0.36 })); lab.position.set(cyX - 1, H + 0.9, -0.5);
    caption('3ばいで いっぱい！ えんすいの たいせきは、えんちゅうの 3ぶんの1', 4.4);
    return true;
  }
  async function sphere() {
    clear(); const tag = S.token, h = 2 * R, x = 0;
    const cyl = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 48, 1, true), glass())); cyl.position.set(x, h / 2, -0.5);
    const ball = add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 40, 28), waterMat())); ball.position.set(x, R, -0.5);
    const water = add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 1, 48), waterMat())); water.position.set(x, 0, -0.5); water.scale.y = 0.0001;
    for (const f of [1 / 3, 2 / 3, 1]) { const m = add(new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, 0.012, 6, 48), new THREE.MeshStandardMaterial({ color: col(tok('ink')) }))); m.rotation.x = Math.PI / 2; m.position.set(x, h * f, -0.5); }
    fitBox(new THREE.Box3(new THREE.Vector3(-1.6, 0, -1.6), new THREE.Vector3(1.6, h + 1.2, 0.6)), 0.92, 0.3, 1.15);
    caption('きゅうが ちょうど はいる えんちゅう');
    if (!(await wait(1.2))) return false;
    caption('きゅうを みずに すると…'); sfx.pour(1.6);
    await tween(1.8, t => { ball.scale.setScalar(Math.max(0.001, 1 - t)); ball.position.y = R * (1 - t * 0.6); water.scale.y = Math.max(0.0001, h * 2 / 3 * t); water.position.y = water.scale.y / 2; }); if (!alive(tag)) return false;
    sfx.good();
    const lab = add(labelSprite('きゅう ＝ えんちゅうの 2/3', { h: 0.36 })); lab.position.set(x, h + 0.7, -0.5);
    caption('ちょうど 3ぶんの2！ きゅうの たいせきは、えんちゅうの 3ぶんの2', 4.4);
    $p(panel, '[data-k="st"]').innerHTML = '<b>2/3</b>';
    return true;
  }
  async function go() { if (busy) return; busy = true; const ok = mem.mode === 'sphere' ? await sphere() : await cone(); if (ok) { spinCamera(2, Math.PI * 0.4); ctx.log('pour', { detail: { mode: mem.mode } }); } busy = false; }
  on($p(panel, '[data-k="go"]'), 'click', () => { sfx.tap(); busy = false; go(); });
  go();
  return { dispose: clear };
}
