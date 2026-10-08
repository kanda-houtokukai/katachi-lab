// みる（中1）：回転体。長方形・直角三角形・半円・離れた長方形を、軸のまわりに回すと 円柱・円錐・球・ドーナツの形になる（残像を残しながら回す）。
import { S, THREE, tween, wait, alive, easeInOut, fitBox, spinCamera, faceMaterial, plainMaterial, labelSprite, disposeObject, col } from '../stage/stage.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const SHAPES = [
  { key: 'rect', label: 'ながしかく', solid: 'えんちゅう', pts: [[0, 0], [1, 0], [1, 1.6], [0, 1.6]] },
  { key: 'tri', label: 'ちょっかくさんかくけい', solid: 'えんすい', pts: [[0, 0], [1.1, 0], [0, 1.7]] },
  { key: 'semi', label: 'はんえん', solid: 'きゅう', pts: [...Array(25).keys()].map(i => { const a = -Math.PI / 2 + Math.PI * i / 24; return [Math.cos(a) * 0.9, 0.9 + Math.sin(a) * 0.9]; }) },
  { key: 'ring', label: 'はなれた ながしかく', solid: 'ドーナツの かたち', pts: [[0.6, 0.3], [1.2, 0.3], [1.2, 1.1], [0.6, 1.1]] },
];
const mem = { k: 'rect' };
export function mount(ctx) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `<div class="seg" role="group" aria-label="まわす かたち">${SHAPES.map(s => `<button type="button" data-shape="${s.key}" aria-pressed="${s.key === mem.k}">${s.label}</button>`).join('')}</div>
    <button class="btn" type="button" data-k="spin">${ctx.ICONS_UI.turn}まわす</button>`;
  const objs = [];
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs.length = 0; };
  const base = new THREE.Vector3(0, 0, -0.5);
  fitBox(new THREE.Box3(new THREE.Vector3(-1.8, 0, -2.3), new THREE.Vector3(1.8, 2.2, 1.3)), 0.95, 0.4, 1.2);
  let busy = false;
  function flat(sh, ang, opacity = 1) {
    const s = new THREE.Shape(sh.pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), faceMaterial(tok('face-1'), { side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
    m.position.copy(base); m.rotation.y = -ang; return m;
  }
  async function spin() {
    if (busy) return; busy = true; clear();
    const tag = S.token, sh = SHAPES.find(s => s.key === mem.k);
    const axis = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 8), plainMaterial(tok('ink')))); axis.position.copy(base).setY(1.2);
    const f = add(flat(sh, 0));
    caption(`${sh.label}を じくの まわりに まわすと…`);
    if (!(await wait(0.8))) return;
    const lathePts = sh.key === 'ring' ? [...sh.pts, sh.pts[0]] : sh.pts;
    const pts = lathePts.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y));
    const solidMat = faceMaterial(tok('face-4'), { side: THREE.DoubleSide });
    const sweep = add(new THREE.Mesh(new THREE.LatheGeometry(pts, 4, 0, 0.001), solidMat)); sweep.position.copy(base); sweep.castShadow = true;
    let lastTrail = 0;
    sfx.swish(2);
    await tween(2.6, k => {
      const a = easeInOut(k) * Math.PI * 2;
      f.rotation.y = -a;
      sweep.geometry.dispose(); sweep.geometry = new THREE.LatheGeometry(pts, Math.max(3, Math.round(64 * a / (Math.PI * 2))), 0, Math.max(0.001, a));
      if (a - lastTrail > Math.PI / 6) { lastTrail = a; const t = add(flat(sh, a, 0.25)); }
    }); if (!alive(tag)) return;
    sfx.good();
    const lab = add(labelSprite(sh.solid, { h: 0.42 })); lab.position.copy(base).setY(2.4);
    caption(`${sh.label}を まわすと ${sh.solid}`, 4);
    spinCamera(2.2, Math.PI * 0.4);
    ctx.log('revolve', { detail: { shape: sh.key } });
    busy = false;
  }
  $$p(panel, '[data-shape]').forEach(b => on(b, 'click', () => { sfx.tap(); if (mem.k === b.dataset.shape) { ctx.toast('', `いまは「${b.textContent}」だよ。「まわす」を おそう`, 1.8); return; } mem.k = b.dataset.shape; $$p(panel, '[data-shape]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.shape === mem.k))); busy = false; spin(); }));
  on($p(panel, '[data-k="spin"]'), 'click', () => { sfx.tap(); busy = false; spin(); });
  spin();
  return { dispose: clear };
}
