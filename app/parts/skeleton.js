// つくる「ほねぐみ」（2年）：長さの違うひご3種とねんど玉で箱の骨組みを作る。長さを間違えるとはじかれる（見本v2）。
import { toScreen } from '../stage/stage.js';
import { S, THREE, tween, alive, easeInOut, easeOutBack, easeOutBounce, burst, fitBox, rayFrom, col } from '../stage/stage.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const BOX = { L: 1.6, W: 1.0, H: 0.6 };
export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON } = ctx;
  const TAPE = { L: tok('face-1'), W: tok('face-2'), H: tok('face-4') };
  const STICK_LEN = { L: BOX.L, W: BOX.W, H: BOX.H };
  const stickSvg = (t, w) => `<svg viewBox="0 0 ${w} 12" width="${w}"><rect x="1" y="3" width="${w - 2}" height="6" rx="3" fill="${tok('wood')}"/><rect x="${w / 2 - 8}" y="2" width="16" height="8" rx="2" fill="${TAPE[t]}"/></svg>`;
  panel.innerHTML = `<div class="row">
    <div class="tray">
      <button class="stick" type="button" data-t="L" aria-pressed="true">${stickSvg('L', 96)}ながい <small>のこり 4</small></button>
      <button class="stick" type="button" data-t="W" aria-pressed="false">${stickSvg('W', 60)}ちゅうくらい <small>のこり 4</small></button>
      <button class="stick" type="button" data-t="H" aria-pressed="false">${stickSvg('H', 36)}みじかい <small>のこり 4</small></button>
    </div>
    <div class="status" data-k="st"></div>
    <button class="btn small sub" type="button" data-k="reset" hidden>もういちど</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const woodMat = new THREE.MeshStandardMaterial({ color: col(tok('wood')), roughness: 0.7 });
  const clayColors = ['#f6c6c0', '#f9e1a7', '#cfe6b8', '#bcd8f2', '#dccdf0', '#f8d0df', '#f3d2b5', '#d5ebe5'];
  const Hn = { group: new THREE.Group(), edges: [], balls: new Map(), sel: 'L', left: { L: 4, W: 4, H: 4 }, placed: 0, miss: 0, done: false, center: new THREE.Vector3(0, BOX.H / 2 + 0.08, -0.5) };
  Hn.group.position.copy(Hn.center); S.stage.add(Hn.group);
  const hx = BOX.L / 2, hy = BOX.H / 2, hz = BOX.W / 2;
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const add = (type, ax, p, len) => {
    const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 6), ghostMat);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, len * 0.9, 6), hitMat);
    [ghost, hit].forEach(m => { m.position.copy(p); if (ax === 'x') m.rotation.z = Math.PI / 2; if (ax === 'z') m.rotation.x = Math.PI / 2; Hn.group.add(m); });
    Hn.edges.push({ type, ax, p, len, ghost, hit, placed: false });
  };
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) add('L', 'x', new THREE.Vector3(0, sy * hy, sz * hz), BOX.L);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('H', 'y', new THREE.Vector3(sx * hx, 0, sz * hz), BOX.H);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add('W', 'z', new THREE.Vector3(sx * hx, sy * hy, 0), BOX.W);
  fitBox(new THREE.Box3(new THREE.Vector3(-hx - 0.5, 0, -0.5 - hz - 0.5), new THREE.Vector3(hx + 0.5, BOX.H + 0.4, -0.5 + hz + 0.5)), 0.88, 0.6, 1.25);
  const renderTray = () => $$p(panel, '.stick').forEach(b => { const t = b.dataset.t; b.setAttribute('aria-pressed', String(Hn.sel === t)); b.disabled = Hn.left[t] === 0; b.querySelector('small').textContent = `のこり ${Hn.left[t]}`; });
  const updateH = () => { q$('st').innerHTML = `ひご <b>${Hn.placed}</b>/12　ねんど <b>${Hn.balls.size}</b>/8`; };
  renderTray(); updateH();
  caption('ひごを えらんで、てんせんの ところを タッチしよう');
  $$p(panel, '.stick').forEach(b => on(b, 'click', () => { if (Hn.left[b.dataset.t] === 0) return; sfx.tap(); Hn.sel = b.dataset.t; renderTray(); }));
  on(q$('reset'), 'click', () => { sfx.tap(); ctx.restart(); });
  function makeStick(type, len) {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len - 0.1, 10), woodMat); s.castShadow = true; g.add(s);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.12, 10), new THREE.MeshStandardMaterial({ color: col(TAPE[type]), roughness: 0.6 })));
    return g;
  }
  function ballAt(v) {
    const k = [v.x, v.y, v.z].map(n => n.toFixed(2)).join(',');
    if (Hn.balls.has(k)) return;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), new THREE.MeshStandardMaterial({ color: col(clayColors[Hn.balls.size % 8]), roughness: 0.85 }));
    m.position.copy(v); m.castShadow = true; m.scale.setScalar(0.001); Hn.group.add(m); Hn.balls.set(k, m);
    tween(0.3, t => m.scale.setScalar(Math.max(0.001, t)), easeOutBack); sfx.pop();
  }
  async function placeEdge(e) {
    const tag = S.token;
    if (Hn.sel !== e.type) {
      Hn.miss++; sfx.bad();
      const wrong = makeStick(Hn.sel, STICK_LEN[Hn.sel]); wrong.position.copy(e.p); if (e.ax === 'x') wrong.rotation.z = Math.PI / 2; if (e.ax === 'z') wrong.rotation.x = Math.PI / 2;
      wrong.position.y += 0.5; Hn.group.add(wrong);
      tween(0.7, k => { wrong.position.y = e.p.y + 0.5 - 0.3 * Math.sin(k * Math.PI); wrong.rotation.y = Math.sin(k * Math.PI * 4) * 0.2; wrong.scale.setScalar(1 - k * 0.9); }).then(() => Hn.group.remove(wrong));
      toast(ICON.X, 'ながさが ちがうよ。ほかの ひごを えらんで みよう', 2.4);
      return;
    }
    e.placed = true; e.ghost.visible = false; Hn.left[e.type]--; Hn.placed++;
    const st = makeStick(e.type, e.len); if (e.ax === 'x') st.rotation.z = Math.PI / 2; if (e.ax === 'z') st.rotation.x = Math.PI / 2;
    st.position.copy(e.p).add(new THREE.Vector3(0, 0.9, 0)); Hn.group.add(st);
    sfx.tap();
    await tween(0.35, k => { st.position.y = e.p.y + 0.9 * (1 - easeOutBounce(k)); }); if (!alive(tag)) return;
    const dir = new THREE.Vector3(e.ax === 'x' ? 1 : 0, e.ax === 'y' ? 1 : 0, e.ax === 'z' ? 1 : 0).multiplyScalar(e.len / 2);
    ballAt(e.p.clone().add(dir)); ballAt(e.p.clone().sub(dir));
    if (Hn.left[Hn.sel] === 0) { const nx = ['L', 'W', 'H'].find(t => Hn.left[t] > 0); if (nx) Hn.sel = nx; }
    renderTray(); updateH();
    if (Hn.placed === 12) {
      Hn.done = true; sfx.good();
      burst(Hn.group.position.clone());
      const r0 = Hn.group.rotation.y; tween(2.4, k => { Hn.group.rotation.y = r0 + Math.PI * 2 * easeInOut(k); });
      toast(ICON.HANAMARU, 'できた！ ひごは <b>12ほん</b>、ねんどは <b>8こ</b>。おなじ ながさの ひごが 4ほんずつ', 4);
      q$('reset').hidden = false;
      ctx.log('hone', { detail: { miss: Hn.miss } }); ctx.done('hone');
    }
  }
  return {
    onTap(e) {
      if (Hn.done) return;
      const ray = rayFrom(e).ray;
      let best = null, bd = 0.2 * 0.2;
      Hn.group.updateMatrixWorld(true);
      for (const x of Hn.edges) {
        if (x.placed) continue;
        const dir = new THREE.Vector3(x.ax === 'x' ? 1 : 0, x.ax === 'y' ? 1 : 0, x.ax === 'z' ? 1 : 0).multiplyScalar(x.len / 2 - 0.06);
        const a = x.p.clone().add(dir).add(Hn.group.position), b = x.p.clone().sub(dir).add(Hn.group.position);
        const d = ray.distanceSqToSegment(a, b);
        if (d < bd) { bd = d; best = x; }
      }
      if (!best) return;
      caption(''); placeEdge(best);
    },
    dispose() {},
    test: {
      edges: () => Hn.edges.map((e, i) => ({ i, type: e.type, placed: e.placed })),
      edgePoint: i => { Hn.group.updateMatrixWorld(true); const e = Hn.edges[i], d = new THREE.Vector3(e.ax === 'x' ? 1 : 0, e.ax === 'y' ? 1 : 0, e.ax === 'z' ? 1 : 0).multiplyScalar(e.len * 0.2); return toScreen(e.p.clone().add(d).applyMatrix4(Hn.group.matrixWorld)); },
      state: () => ({ placed: Hn.placed, done: Hn.done, sel: Hn.sel }),
    },
  };
}
