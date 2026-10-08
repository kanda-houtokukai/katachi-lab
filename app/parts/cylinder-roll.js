// 円柱（5年）：opts.mode
//  'open'：円柱の展開図の開閉（側面を巻き取る・広げる動き）。スライダーで開閉。
//  'roll'：円柱を紙の上で1回転転がすと側面の長方形が残る。長方形の横の長さが、底面の円のまわりの長さと同じになることを、
//          円周を直線に伸ばす動きで重ねて見せる。
import { S, THREE, tween, wait, alive, easeInOut, fitBox, spinCamera, faceMaterial, plainMaterial, col, disposeObject, labelSprite, paperTex } from '../stage/stage.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, sliderRow, setSlider } from './_common.js';

export const CYL = { r: 0.6, h: 1.4 };
// 側面の巻き取り：s は合わせ目からの弧の長さ、y は高さ。k＝0 で円柱、k＝1 で平ら（接する母線の平面）
export function sidePoint(r, s, y, k) {
  const R = r / Math.max(1e-4, 1 - k);
  return [-r + R * (1 - Math.cos(s / R)), y, R * Math.sin(s / R)];
}
// 円柱の展開図（開閉できる）。p＝1 で閉じた円柱、p＝0 で平らな展開図。底面の中心が原点
export function makeCylinderNet(r, h, colors) {
  const g = new THREE.Group(), NS = 64;
  const side = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, NS, 1), faceMaterial(colors.side, { side: THREE.DoubleSide }));
  side.castShadow = side.receiveShadow = true; g.add(side);
  const capGeo = () => { const c = new THREE.CircleGeometry(r * 0.985, 48); c.rotateX(-Math.PI / 2); return c; };
  const bottom = new THREE.Mesh(capGeo(), faceMaterial(colors.cap, { side: THREE.DoubleSide })); bottom.position.y = 0.012; bottom.castShadow = bottom.receiveShadow = true; g.add(bottom);
  const topPivot = new THREE.Group(), top = new THREE.Mesh(capGeo(), faceMaterial(colors.cap, { side: THREE.DoubleSide }));
  top.castShadow = top.receiveShadow = true; top.position.set(r, 0, 0); topPivot.add(top); g.add(topPivot);
  const fallPivot = new THREE.Group(); g.add(fallPivot);
  const W = 2 * Math.PI * r;
  const net = {
    group: g, side, top, bottom, r, h, W, progress: 1,
    setProgress(p) {
      net.progress = p;
      const u = 1 - p, a = Math.min(1, u / 0.6), b = Math.max(0, (u - 0.6) / 0.4);
      const ea = easeInOut(a), eb = easeInOut(b), beta = eb * Math.PI / 2, cb = Math.cos(beta), sb = Math.sin(beta);
      const pos = side.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const ix = i % (NS + 1), iy = Math.floor(i / (NS + 1));
        const s = (ix / NS - 0.5) * W, y = (1 - iy) * h;
        let [x, yy, z] = sidePoint(r, s, y, ea * 0.9999);
        // 平らになった面を、下の辺を軸にマットへ倒す
        const rx = x + r, ry = yy; x = -r + rx * cb - ry * sb; yy = rx * sb + ry * cb;
        pos.setXYZ(i, x, yy + 0.006, z);
      }
      pos.needsUpdate = true; side.geometry.computeVertexNormals(); side.geometry.computeBoundingSphere();
      // ふた：上の辺の接点を軸に開き（ea）、そのあと面ごと倒れる（eb）
      topPivot.position.set(-r, 0, 0);
      const m = new THREE.Matrix4().makeRotationZ(beta).multiply(new THREE.Matrix4().makeTranslation(0, h, 0)).multiply(new THREE.Matrix4().makeRotationZ(ea * Math.PI / 2));
      topPivot.matrixAutoUpdate = false; topPivot.matrix.copy(new THREE.Matrix4().makeTranslation(-r, 0, 0).multiply(m));
    },
    meshes() { return [side, top, bottom]; },
  };
  net.setProgress(1);
  return net;
}

export function mount(ctx) {
  const { panel, sfx, caption, opts } = ctx;
  const mode = opts.mode || 'open';
  const { r, h } = CYL;
  const objs = [];
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  if (mode === 'open') {
    panel.innerHTML = `${sliderRow('cylSlider', { value: 0, label: 'えんちゅうを ひらく ぐあい' })}<button class="btn sub small" type="button" data-k="play">${ctx.ICONS_UI.play}ひらいて とじる</button>`;
    const slider = $p(panel, '#cylSlider');
    const net = makeCylinderNet(r, h, { side: tok('face-4'), cap: tok('face-2') });
    net.group.position.set(1.4, 0, -0.5); add(net.group);
    fitBox(new THREE.Box3(new THREE.Vector3(-3.6, 0, -0.5 - net.W / 2 - 0.3), new THREE.Vector3(2.2, h + 0.5, -0.5 + net.W / 2 + 0.3)), 0.75, 0.25, 1.05);
    const set = p => { net.setProgress(p); setSlider(slider, Math.round((1 - p) * 100)); };
    on(slider, 'input', () => { ctx.hideHud(); net.setProgress(1 - slider.value / 100); });
    on(slider, 'change', () => { sfx.tap(); if (+slider.value > 95) { caption('そくめんは <b>ながしかく</b>、そこは <b>えん</b> 2つ', 3.4); ctx.log('cyl-open', {}); } });
    const play = async () => {
      const tag = S.token; set(1);
      caption('えんちゅうを ひらいて みよう');
      if (!(await wait(0.6))) return;
      sfx.swish(1.6); await tween(2.4, k => set(1 - k)); if (!alive(tag)) return;
      caption('そくめんは ながしかく、そこの めんは えんが 2つ', 3.2); ctx.log('cyl-open', {});
      if (!(await wait(2.2))) return;
      sfx.swish(1.4); await tween(2.0, k => set(k));
    };
    on($p(panel, '[data-k="play"]'), 'click', () => { sfx.tap(); play(); });
    play();
    return { test: { progress: () => net.progress }, dispose() {} };
  }

  // ころがす
  panel.innerHTML = `<button class="btn" type="button" data-k="roll">${ctx.ICONS_UI.roll}ころがす</button><span class="status" data-k="st"></span>`;
  const W = 2 * Math.PI * r, x0 = -W / 2 - 0.6, zc = -0.5;
  const paper = add(new THREE.Mesh(new THREE.BoxGeometry(W + 2.4, 0.01, h + 1.6), new THREE.MeshStandardMaterial({ color: col(tok('sheet-paper')), roughness: 0.95, map: paperTex })));
  paper.position.set(x0 + W / 2 + 0.4, 0.005, zc); paper.receiveShadow = true;
  let cyl = null, trail = null, ring = null, seam = null;
  const reset = () => {
    [cyl, trail, ring].forEach(o => { if (o) { S.stage.remove(o); disposeObject(o); } });
    cyl = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), [faceMaterial(tok('face-4')), faceMaterial(tok('face-2')), faceMaterial(tok('face-2'))]);
    m.rotation.x = Math.PI / 2; m.castShadow = true; cyl.add(m);
    seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, h + 0.005), plainMaterial(tok('cutline'))); seam.position.set(0, -r + 0.004, 0); m.parent.add(seam);
    cyl.position.set(x0, r + 0.012, zc); add(cyl);
    trail = add(new THREE.Mesh(new THREE.PlaneGeometry(1, h), plainMaterial(tok('face-4'), { transparent: true, opacity: 0.55 })));
    trail.rotation.x = -Math.PI / 2; trail.position.set(x0, 0.013, zc); trail.scale.x = 0.0001;
  };
  reset();
  fitBox(new THREE.Box3(new THREE.Vector3(x0 - 1, 0, zc - h / 2 - 1.2), new THREE.Vector3(x0 + W + 1, 2 * r + 0.4, zc + h / 2 + 0.6)), 0.85, 0, 1.05);
  let busy = false;
  async function roll() {
    if (busy) return; busy = true;
    const tag = S.token; reset(); ctx.hideHud();
    caption('あかい せんを したに して、1かいてん ころがそう');
    if (!(await wait(0.8))) return;
    sfx.roll();
    await tween(3.2, k => { const d = W * easeInOut(k); cyl.position.x = x0 + d; cyl.rotation.z = -d / r; trail.scale.x = Math.max(0.0001, d); trail.position.x = x0 + d / 2; }); if (!alive(tag)) return;
    sfx.land(); caption('ころがった あとに <b>ながしかく</b>が のこったね');
    if (!(await wait(1.6))) return;
    // 底面の円のまわりを、まっすぐに のばして くらべる
    caption('そこの えんの まわりを まっすぐに のばすと…');
    const N = 96, pts = k => { const out = []; for (let i = 0; i <= N; i++) { const s = (i / N) * W, R = r / Math.max(1e-4, 1 - k); out.push(new THREE.Vector3(x0 + R * Math.sin(s / R), 0.03 + R * (1 - Math.cos(s / R)), zc + h / 2 + 0.25)); } return out; };
    const mat = plainMaterial(tok('cutline'), { emissive: col(tok('cutline')), emissiveIntensity: 0.4 });
    ring = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts(0)), N, 0.035, 8, false), mat));
    if (!(await wait(0.6))) return;
    await tween(2.2, k => { ring.geometry.dispose(); ring.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts(easeInOut(k) * 0.9999)), N, 0.035, 8, false); }); if (!alive(tag)) return;
    sfx.good();
    caption('ながしかくの よこの ながさは、えんの まわりの ながさと おなじ！', 4.4);
    $p(panel, '[data-k="st"]').innerHTML = 'よこ ＝ えんの まわり';
    ctx.log('cyl-roll', {}); busy = false;
  }
  on($p(panel, '[data-k="roll"]'), 'click', () => { sfx.tap(); busy = false; roll(); });
  roll();
  return { test: { busy: () => busy }, dispose() {} };
}
