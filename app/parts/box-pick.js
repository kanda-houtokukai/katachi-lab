// つくる「はこを えらぶ」（2年）：大きさの違う面のカード12枚から6枚を選んで箱を作る（同じ形が2枚ずつ）。
import { objScreen } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeInOut, easeOutBack, glow, stopGlows, burst, fitBox, spinCamera, disposeObject, col, rayFrom } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, frameBox, foldTo, hop, disposeNet } from '../stage/foldnet.js';
import { boxCrossLayout, boxFaceDims } from './_nets.js';
import { boxFromCards, assignSlots, cardMesh, slotPlacement } from './_cards.js';
import { shuffle, pick } from '../core/text.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p } from './_common.js';

const TARGETS = [[1.6, 1.0, 0.6], [1.4, 1.0, 0.7], [1.2, 1.2, 0.8], [1.8, 0.9, 0.6]];
const DISTRACT = [[1.6, 0.8], [1.0, 0.8], [1.2, 0.6], [1.4, 0.6], [0.9, 0.7], [1.6, 1.2], [1.1, 1.1], [1.8, 0.5]];

export function mount(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI, caption } = ctx;
  let cards = [], meshes = [], picked = new Set(), net = null, busy = false, target = null;
  panel.innerHTML = `<div class="row"><div class="status" data-k="st"></div>
    <button class="btn big" type="button" data-k="build" hidden>${ICONS_UI.build}くみたてる</button>
    <button class="btn small sub" type="button" data-k="clear" hidden>${ICONS_UI.undo}えらびなおす</button>
    <button class="btn small sub" type="button" data-k="again" hidden>${ICONS_UI.again}べつの カードで</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const status = () => {
    q$('st').innerHTML = net ? '' : `えらんだ カード <b>${picked.size}</b> / 6`;
    q$('build').hidden = net || picked.size !== 6; q$('clear').hidden = net || picked.size === 0; q$('again').hidden = !net;
  };
  function setup() {
    meshes.forEach(m => { S.stage.remove(m); disposeObject(m); }); meshes = []; if (net) { disposeNet(net); net = null; }
    stopGlows(); picked.clear(); busy = false;
    target = pick(TARGETS);
    const need = boxFaceDims(...target);
    const extra = shuffle(DISTRACT.filter(d => !need.some(n => Math.abs(n[0] - d[0]) < 1e-6 && Math.abs(n[1] - d[1]) < 1e-6))).slice(0, 6);
    cards = shuffle([...need, ...extra].map(d => [...d]));
    const portrait = ctx.portrait(), cols = portrait ? 3 : 4;
    cards.forEach((c, i) => {
      const m = cardMesh(c, faceColors()[i % 6]); m.userData.card = i;
      const x = (i % cols) * 2.0 - (cols - 1), z = Math.floor(i / cols) * 1.45 - (portrait ? 2.6 : 1.9);
      m.position.set(x, 0.4, z); m.userData.home = new THREE.Vector3(x, 0, z); m.scale.setScalar(0.7);
      S.stage.add(m); meshes.push(m);
      setTimeout(() => tween(0.36, k => { m.position.y = 0.4 * (1 - k); m.scale.setScalar(0.7 + 0.3 * easeOutBack(k)); }), i * 40);
    });
    const b = new THREE.Box3(); meshes.forEach(m => b.expandByPoint(m.userData.home.clone().add(new THREE.Vector3(1.0, 0.2, 0.75))).expandByPoint(m.userData.home.clone().add(new THREE.Vector3(-1.0, 0, -0.75))));
    S.allowRotate = false; fitBox(b, 0.3, 0, 1.04);
    status();
    caption('はこに なる 6まいを えらぼう');
  }
  function toggle(i) {
    const m = meshes[i];
    if (picked.has(i)) { picked.delete(i); sfx.off(); tween(0.15, k => { m.position.y = 0.14 * (1 - k); }); m.material.emissive.setRGB(0, 0, 0); }
    else {
      if (picked.size >= 6) { sfx.bad(); toast(ICON.X, '6まいまで だよ', 1.6); return; }
      picked.add(i); sfx.pop(); tween(0.15, k => { m.position.y = 0.14 * k; }); m.material.emissive.copy(col(tok('glow-white'))).multiplyScalar(0.25);
    }
    status();
  }
  on(q$('clear'), 'click', () => { sfx.tap(); [...picked].forEach(i => toggle(i)); });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); setup(); });
  on(q$('build'), 'click', async () => {
    if (busy || picked.size !== 6) return;
    sfx.tap(); busy = true; const tag = S.token;
    const sel = [...picked], chosen = sel.map(i => cards[i]);
    const dims = boxFromCards(chosen), ok = !!dims, use = dims || target;
    const { slots, extra } = assignSlots(chosen, use);
    const L = boxCrossLayout(...use), base = centerBase(L, -0.2), place = slotPlacement(use);
    // 選ばなかったカードは奥へよける
    meshes.forEach((m, i) => { if (!picked.has(i)) { const p0 = m.position.clone(); tween(0.5, k => { m.position.lerpVectors(p0, new THREE.Vector3(p0.x * 1.1, -0.2, -4.6), easeInOut(k)); m.scale.setScalar(1 - 0.4 * k); }); } });
    S.allowRotate = true; fitBox(new THREE.Box3(new THREE.Vector3(-3.6, 0, -3.2), new THREE.Vector3(3.6, 1.2, 3)), 0.62, 0.3, 1.0);
    await Promise.all(slots.map((k, si) => {
      if (k < 0) return Promise.resolve();
      const m = meshes[sel[k]], p0 = m.position.clone(), t = base.clone().add(new THREE.Vector3(place[si].c[0], 0, place[si].c[1]));
      return new Promise(res => setTimeout(() => tween(0.7, kk => { const e = easeInOut(kk); m.position.lerpVectors(p0, t, e); m.position.y = Math.sin(kk * Math.PI) * 0.5; m.rotation.y = place[si].rot * e; }).then(res), si * 90));
    }));
    if (!alive(tag)) return;
    extra.forEach((k, j) => { const m = meshes[sel[k]], p0 = m.position.clone(); tween(0.6, kk => m.position.lerpVectors(p0, new THREE.Vector3(3.8, 0, -1.5 + j * 1.3), easeInOut(kk))); });
    net = mountNet(makeFoldNet(L, slots.map(k => (k >= 0 ? faceColors()[sel[k] % 6] : tok('quiz-paper')))), base);
    slots.forEach((k, si) => { if (k < 0) net.nodes[si].mesh.visible = false; else meshes[sel[k]].visible = false; });
    net.setProgress(0);
    if (!(await wait(0.3))) return;
    sfx.swish(1.4); await foldTo(net, 1, 2.0); if (!alive(tag)) return;
    frameBox(net, 0.95, S.goal.theta, 2.6);
    if (ok) { await hop(net, 0.4); if (!alive(tag)) return; sfx.good(); burst(net.home); toast(ICON.HANAMARU, 'えらんだ 6まいで はこが できた！', 3.2); ctx.done('pick'); }
    else { sfx.bad(); extra.forEach(k => glow(meshes[sel[k]], tok('glow-red'), 3, 0.7, 0.35)); spinCamera(3, Math.PI * 0.8); toast(ICON.X, 'すき間が あいたね。おなじ かたちが 2まいずつ そろうかな', 3.6); }
    ctx.log('box-pick', { correct: ok, detail: { miss: extra.length } });
    status();
  });
  setup();
  return {
    onTap(e) {
      if (net || busy) return;
      const h = rayFrom(e).intersectObjects(meshes, false)[0]; if (!h) return;
      toggle(h.object.userData.card);
    },
    onResize() { if (!net) { const b = new THREE.Box3(); meshes.forEach(m => b.expandByPoint(m.userData.home.clone().add(new THREE.Vector3(1.0, 0.2, 0.75))).expandByPoint(m.userData.home.clone().add(new THREE.Vector3(-1.0, 0, -0.75)))); fitBox(b, 0.3, 0, 1.04); } },
    dispose() {},
    test: { auto() {
        if (busy && !net) return { wait: 300 };
        if (net) return { done: true };
        const need = [[target[0], target[1]], [target[0], target[1]], [target[0], target[2]], [target[0], target[2]], [target[1], target[2]], [target[1], target[2]]].map(([a, b]) => [Math.max(a, b), Math.min(a, b)].join('x'));
        const want = []; for (const n of need) { const i = cards.findIndex((c, k) => c.join('x') === n && !want.includes(k)); want.push(i); }
        const wrong = [...picked].find(i => !want.includes(i)); if (wrong != null) return { tap: objScreen(meshes[wrong]) };
        const add = want.find(i => !picked.has(i)); if (add != null) return { tap: objScreen(meshes[add]) };
        return { click: 'data-k=build|' };
      }, cards: () => cards.map((d, i) => ({ i, dims: d, picked: picked.has(i) })), target: () => target, cardPoint: i => objScreen(meshes[i]), state: () => ({ built: !!net, busy, picked: picked.size }) },
  };
}
