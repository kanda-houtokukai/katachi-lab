// つくる「うつしとる」（2年）：箱の面をタッチすると紙にスタンプのように写る。同じ形の面を2枚ずつ重ねて確かめ、
// 6枚をつないで箱に戻す（見本v2）。
import { objScreen, toScreen } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeInOut, glow, burst, fitBox, rayFrom, faceMaterial, badge, growSprite, col, paperTex, isPortrait, speedNow } from '../stage/stage.js';
import { makeFoldNet, mountNet, frameBox, foldTo, hop, netBox } from '../stage/foldnet.js';
import { boxCrossLayout } from './_nets.js';
import { assignSlots, cardMesh, slotPlacement } from './_cards.js';
import { tok } from '../core/theme.js';
import { on, $p } from './_common.js';

const BOX = { L: 1.6, W: 1.0, H: 0.6 };
const SIDE_N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(a => new THREE.Vector3(...a));
const SIDE_DIMS = (() => { const { L, W, H } = BOX; return [[W, H], [W, H], [L, W], [L, W], [L, H], [L, H]]; })();
const PAIR_MARKS = ['★', '●', '▲'];

export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  const BOX_COLORS = [tok('face-5'), tok('face-6'), tok('face-1'), tok('face-2'), tok('face-4'), tok('face-3')];
  panel.innerHTML = `<div class="row"><div class="status" data-k="st"></div>
    <button class="btn small sub" type="button" data-k="roll">${ICONS_UI.roll}ころがす</button>
    <button class="btn small" type="button" data-k="assemble" hidden>はこに もどす</button>
    <button class="btn small sub" type="button" data-k="reset" hidden>もういちど</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const U = { group: new THREE.Group(), box: null, mats: [], stamped: [], stamps: [], phase: 'stamp', busy: false, sel: null, pairs: 0, miss: 0, home: null, net: null };
  S.stage.add(U.group);
  const portrait = isPortrait();
  const PAPER = portrait ? { cx: 0, cz: 0.2, w: 4.2, d: 4.8 } : { cx: -1.45, cz: -0.6, w: 6.3, d: 3.4 };
  const SLOTS = portrait ? [[-1, -1.4], [1, -1.4], [-1, 0.2], [1, 0.2], [-1, 1.8], [1, 1.8]].map(([x, z]) => [PAPER.cx + x, PAPER.cz + z]) : [[-3.5, -1.4], [-1.45, -1.4], [0.6, -1.4], [-3.5, 0.25], [-1.45, 0.25], [0.6, 0.25]];
  U.home = portrait ? new THREE.Vector3(PAPER.cx + 0.9, 0, PAPER.cz - PAPER.d / 2 - 1.15) : new THREE.Vector3(3.9, 0, -0.5);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(PAPER.w, 0.01, PAPER.d), new THREE.MeshStandardMaterial({ color: col(tok('sheet-paper')), roughness: 0.95, map: paperTex }));
  paper.position.set(PAPER.cx, 0.005, PAPER.cz); paper.receiveShadow = true; U.group.add(paper);
  U.mats = BOX_COLORS.map(c => faceMaterial(c));
  U.box = new THREE.Mesh(new THREE.BoxGeometry(BOX.L, BOX.H, BOX.W), U.mats);
  U.box.castShadow = U.box.receiveShadow = true;
  U.box.position.set(U.home.x, BOX.H / 2, U.home.z); U.group.add(U.box);
  U.box.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.35);
  const probe = new THREE.Mesh(new THREE.BoxGeometry(BOX.L, BOX.H, BOX.W));
  const restY = q => { probe.quaternion.copy(q); probe.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(probe); return (b.max.y - b.min.y) / 2; };
  function frame() {
    const h = U.home;
    fitBox(new THREE.Box3(new THREE.Vector3(Math.min(PAPER.cx - PAPER.w / 2, h.x - 1.1), 0, Math.min(PAPER.cz - PAPER.d / 2, h.z - 0.9)), new THREE.Vector3(Math.max(PAPER.cx + PAPER.w / 2, h.x + 1.1), 0.8, PAPER.cz + PAPER.d / 2)), portrait ? 0.55 : 0.62, 0.0, 1.04);
  }
  frame();
  const update = () => {
    const n = U.stamped.length, el = q$('st');
    if (U.phase === 'stamp') el.innerHTML = `うつした めん <b>${n}</b> / 6`;
    if (U.phase === 'pair') el.innerHTML = `おなじ かたち <b>${U.pairs}</b> / 3くみ`;
    if (U.phase === 'ready') el.innerHTML = '6まいを つないで みよう';
    if (U.phase === 'done') el.innerHTML = 'はこが できた！';
  };
  update();
  caption('はこの めんを タッチして、かみに うつそう');
  const worldSide = side => SIDE_N[side].clone().applyQuaternion(U.box.quaternion);
  function sideVisible(side) {
    const wn = worldSide(side);
    if (wn.y < -0.3) return false;
    const half = new THREE.Vector3(BOX.L / 2, BOX.H / 2, BOX.W / 2);
    const wp = SIDE_N[side].clone().multiply(half).applyQuaternion(U.box.quaternion).add(U.box.position);
    return wn.dot(S.camera.position.clone().sub(wp)) > 0.05;
  }
  async function stampSide(side) {
    U.busy = true;
    const tag = S.token, box = U.box, q0 = box.quaternion.clone(), p0 = box.position.clone();
    let qt = new THREE.Quaternion().setFromUnitVectors(worldSide(side), new THREE.Vector3(0, -1, 0)).multiply(q0);
    // ながい ほうを よこ（x）に そろえる
    probe.quaternion.copy(qt); probe.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(probe);
    if (bb.max.z - bb.min.z > bb.max.x - bb.min.x + 1e-3) qt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiply(qt);
    const slot = SLOTS[U.stamped.length], ry = restY(qt);
    const above = new THREE.Vector3(slot[0], ry + 1.4, slot[1]);
    await tween(0.28, k => { box.position.y = p0.y + 1.4 * easeInOut(k); }); if (!alive(tag)) return;
    const pa = box.position.clone();
    await tween(0.62, k => { box.position.lerpVectors(pa, above, easeInOut(k)); box.quaternion.copy(q0).slerp(qt, easeInOut(k)); }); if (!alive(tag)) return;
    await tween(0.2, k => { box.position.y = above.y - 1.4 * k * k; }); if (!alive(tag)) return;
    sfx.stamp();
    const [a, b] = SIDE_DIMS[side];
    const st = cardMesh([a, b], BOX_COLORS[side]);
    st.position.set(slot[0], 0.012, slot[1]); st.userData.stamp = U.stamps.length;
    st.scale.set(1.04, 1, 1.04); U.group.add(st);
    U.stamps.push({ mesh: st, side, dims: [a, b], color: BOX_COLORS[side], paired: false }); U.stamped.push(side);
    tween(0.25, k => st.scale.set(1.04 - 0.04 * k, 1, 1.04 - 0.04 * k));
    // つかった めんは インクが うすくなる
    const m = U.mats[side], c0 = m.color.clone(); tween(0.5, k => m.color.copy(c0).lerp(col(tok('quiz-paper')), 0.62 * k));
    await tween(0.22, k => { box.position.y = above.y - 1.4 + 1.4 * easeInOut(k); }); if (!alive(tag)) return;
    const pb = box.position.clone();
    await tween(0.6, k => { box.position.lerpVectors(pb, p0, easeInOut(k)); box.quaternion.copy(qt).slerp(q0, easeInOut(k)); }); if (!alive(tag)) return;
    box.position.copy(p0); box.quaternion.copy(q0);
    U.busy = false; update();
    if (U.stamped.length === 6) {
      U.phase = 'pair'; q$('roll').hidden = true; update();
      if (!(await wait(0.4))) return;
      caption('おなじ かたちの めんを 2まいずつ えらぼう');
    } else if (![0, 1, 2, 3, 4, 5].some(sd => !U.stamped.includes(sd) && sideVisible(sd))) {
      caption('のこりの めんが みえないね。「ころがす」で だして みよう');
    }
  }
  async function rollBox() {
    if (U.busy || U.phase !== 'stamp') return;
    U.busy = true; sfx.swish(0.5);
    const box = U.box, q0 = box.quaternion.clone(), y0 = box.position.y;
    const hidden = [0, 1, 2, 3, 4, 5].filter(s => !U.stamped.includes(s) && !sideVisible(s));
    const qt = hidden.length ? new THREE.Quaternion().setFromUnitVectors(worldSide(hidden[0]), new THREE.Vector3(0, 1, 0)).multiply(q0) : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2).multiply(q0);
    const ry = restY(qt);
    await tween(0.55, k => { box.quaternion.copy(q0).slerp(qt, easeInOut(k)); box.position.y = y0 + (ry - y0) * k + Math.sin(k * Math.PI) * 0.6; });
    box.position.y = ry; sfx.land(); U.busy = false;
  }
  async function pickStamp(rec) {
    if (!U.sel) { U.sel = rec; sfx.pop(); tween(0.15, k => { rec.mesh.position.y = 0.012 + 0.12 * k; }); glow(rec.mesh, tok('glow-white'), 2, 0.5); return; }
    if (U.sel === rec) { U.sel = null; tween(0.15, k => { rec.mesh.position.y = 0.132 - 0.12 * k; }); return; }
    const a = U.sel, b = rec; U.sel = null; U.busy = true;
    const tag = S.token;
    const same = Math.abs(a.dims[0] - b.dims[0]) < 1e-3 && Math.abs(a.dims[1] - b.dims[1]) < 1e-3;
    if (same) {
      const pb = b.mesh.position.clone(), pa = a.mesh.position.clone();
      await tween(0.5, k => { b.mesh.position.lerpVectors(pb, new THREE.Vector3(pa.x, 0.16 + 0.1 * Math.sin(k * Math.PI), pa.z), easeInOut(k)); }); if (!alive(tag)) return;
      sfx.good(); glow(a.mesh, tok('glow-white'), 1, 0.6); glow(b.mesh, tok('glow-white'), 1, 0.6);
      toast(ICON.HANAMARU, 'ぴったり かさなった！', 1.6);
      if (!(await wait(0.9))) return;
      await tween(0.45, k => { b.mesh.position.lerpVectors(new THREE.Vector3(pa.x, 0.16, pa.z), new THREE.Vector3(pb.x, 0.012, pb.z), easeInOut(k)); a.mesh.position.y = 0.132 - 0.12 * k; }); if (!alive(tag)) return;
      a.paired = b.paired = true;
      const mk = PAIR_MARKS[U.pairs];
      [a, b].forEach(r => { const s = badge(mk, '#ffffff', tok('ink')); s.position.set(r.mesh.position.x, 0.3, r.mesh.position.z); U.group.add(s); growSprite(s, 0.34); });
      U.pairs++; update();
      if (U.pairs === 3) {
        U.phase = 'ready'; update();
        if (!(await wait(1.0))) return;
        toast(ICON.HANAMARU, 'むかいあう めんは <b>おなじ かたち</b>が 2まいずつ', 3.4);
        q$('assemble').hidden = false;
        ctx.log('stamp', { detail: { miss: U.miss } });
      }
    } else {
      U.miss++; sfx.bad();
      [a, b].forEach(r => { const x0 = r.mesh.position.x; tween(0.4, k => { r.mesh.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.05 * (1 - k); }); });
      tween(0.2, k => { a.mesh.position.y = 0.132 - 0.12 * k; });
      toast(ICON.X, 'かたちが ちがうよ。かさねたら ぴったり になる めんを さがそう', 2.6);
    }
    U.busy = false;
  }
  on(q$('roll'), 'click', () => { sfx.tap(); rollBox(); });
  on(q$('reset'), 'click', () => { sfx.tap(); ctx.restart(); });
  on(q$('assemble'), 'click', async () => {
    if (U.phase !== 'ready' || U.busy) return;
    sfx.tap(); U.busy = true; q$('assemble').hidden = true;
    const tag = S.token, dims = [BOX.L, BOX.W, BOX.H];
    const L = boxCrossLayout(...dims), origin = new THREE.Vector3(PAPER.cx, 0, PAPER.cz - 0.4), place = slotPlacement(dims);
    const { slots } = assignSlots(U.stamps.map(s => s.dims), dims);
    U.group.children.filter(o => o.isSprite).forEach(s => tween(0.3, k => s.scale.setScalar(Math.max(0.001, 0.34 * (1 - k)))).then(() => U.group.remove(s)));
    { const bx = U.box, p0 = bx.position.clone(); tween(0.6, k => { bx.position.set(p0.x + 3 * k * k, p0.y + 0.6 * Math.sin(k * Math.PI), p0.z); bx.scale.setScalar(1 - 0.7 * k); }).then(() => { bx.visible = false; }); }
    caption('6まいを つないで みよう');
    await Promise.all(slots.map((k, si) => {
      const r = U.stamps[k], p0 = r.mesh.position.clone(), t = origin.clone().add(new THREE.Vector3(place[si].c[0], 0.012, place[si].c[1]));
      return new Promise(res => setTimeout(() => tween(0.7, kk => { const e = easeInOut(kk); r.mesh.position.lerpVectors(p0, t, e); r.mesh.position.y = 0.012 + Math.sin(kk * Math.PI) * 0.5; r.mesh.rotation.y = place[si].rot * e; }).then(res), si * 110 * speedNow()));
    })); if (!alive(tag)) return;
    // 紙の めんを 折れる 網に すりかえる
    slots.forEach(k => { U.stamps[k].mesh.visible = false; });
    const net = U.net = mountNet(makeFoldNet(L, slots.map(k => U.stamps[k].color)), origin.clone());
    net.setProgress(0);
    if (!(await wait(0.3))) return;
    const b = netBox(net); b.max.y += 1; fitBox(b, 0.9, 0.5, 1.2);
    caption('おりあげると…');
    sfx.swish(1.4); await foldTo(net, 1, 2.0); if (!alive(tag)) return;
    frameBox(net, 0.95, S.goal.theta, 2.6);
    await hop(net, 0.4); if (!alive(tag)) return;
    sfx.good(); burst(net.home);
    U.phase = 'done'; update(); U.busy = false;
    toast(ICON.HANAMARU, 'うつした めんで はこが できた！', 3.2);
    q$('reset').hidden = false;
    ctx.log('stamp-box', {});
    ctx.done('stamp');
  });
  return {
    onTap(e) {
      if (U.busy) return;
      if (U.phase === 'stamp') {
        const hit = rayFrom(e).intersectObject(U.box, false)[0]; if (!hit) return;
        const side = hit.face.materialIndex;
        if (U.stamped.includes(side)) { sfx.off(); toast(ICON.X, 'その めんは もう うつしたよ', 1.8); return; }
        caption(''); stampSide(side);
      } else if (U.phase === 'pair') {
        const hit = rayFrom(e).intersectObjects(U.stamps.map(s => s.mesh), false)[0]; if (!hit) return;
        const rec = U.stamps[hit.object.userData.stamp]; if (rec.paired) return;
        pickStamp(rec);
      }
    },
    onResize() { ctx.restart(); },
    dispose() {},
    test: {
      state: () => ({ phase: U.phase, busy: U.busy, stamped: [...U.stamped], pairs: U.pairs, sel: !!U.sel }),
      visibleSides: () => [0, 1, 2, 3, 4, 5].filter(s => !U.stamped.includes(s) && sideVisible(s)),
      sidePoint: s => toScreen(SIDE_N[s].clone().multiply(new THREE.Vector3(BOX.L / 2, BOX.H / 2, BOX.W / 2)).applyQuaternion(U.box.quaternion).add(U.box.position)),
      stamps: () => U.stamps.map((r, i) => ({ i, dims: r.dims, paired: r.paired })),
      stampPoint: i => objScreen(U.stamps[i].mesh),
    },
  };
}
