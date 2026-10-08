// 体積（5年）：opts.mode
//  'fill'  （みる）：1cm³ の積み木で箱を1段ずつ埋める。1段の数×段の数＝たて×よこ×たかさ になる。
//  'blocks'（さわる）：たて・よこ・たかさのスライダーで箱を変えると、積み木の数が変わる。
//  'liter' （さわる）：10cm の立方体に水を注ぐと 1L。1000cm³ と同じ。
//  'meter' （さわる）：1m³ の立方体の中に 1cm³ を並べ始めると、とても多い（100万個）。
import { S, THREE, tween, wait, alive, easeOutBounce, easeInOut, fitBox, spinCamera, labelSprite, plainMaterial, col, disposeObject, burst } from '../stage/stage.js';
import { makeBlocks, wireBox, U } from './_blocks.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, sliderRow, setSlider } from './_common.js';

const mem = { dims: [3, 4, 2] };
export function mount(ctx) {
  const mode = ctx.opts.mode || 'fill';
  const objs = [];
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clearObjs = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs.length = 0; };
  if (mode === 'fill') return fill(ctx, add, clearObjs);
  if (mode === 'blocks') return blocks(ctx, add, clearObjs);
  if (mode === 'liter') return liter(ctx, add, clearObjs);
  return meter(ctx, add, clearObjs);
}

function frameBlocks(B, extraY = 0.8) { const b = B.box(); b.max.y += extraY; b.min.x -= 0.6; b.max.x += 0.6; b.min.z -= 0.6; b.max.z += 0.6; fitBox(b, 0.95, 0.55, 1.35); }

function fill(ctx, add, clearObjs) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `<button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again}べつの はこで みる</button><span class="status" data-k="st"></span>`;
  const SETS = [[2, 3, 2], [3, 4, 2], [2, 5, 3], [4, 4, 2], [3, 3, 3]];
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); const i = SETS.findIndex(s => s.join() === mem.dims.join()); mem.dims = SETS[(i + 1) % SETS.length]; ctx.restart(); });
  const [d, w, h] = mem.dims, B = makeBlocks(200);
  const origin = new THREE.Vector3(-w * U / 2, 0, -0.5 + d * U / 2);
  add(B.mesh); B.set(mem.dims, 0, origin);
  const frame = add(wireBox(w * U, h * U, d * U, tok('ink-soft'), 0.012)); frame.position.copy(origin);
  frameBlocks(B);
  (async () => {
    const tag = S.token, st = $p(panel, '[data-k="st"]');
    caption('1cm³ の つみきで はこを うめよう');
    if (!(await wait(0.8))) return;
    const per = d * w;
    for (let y = 0; y < h; y++) {
      for (let k = 0; k < per; k++) { B.show(y * per + k + 1); sfx.tick(k % 12); if (!(await wait(Math.max(0.03, 0.4 / per * 2)))) return; }
      caption(y === 0 ? `1だんに たて ${d} × よこ ${w} ＝ ${per}こ` : `${y + 1}だんで ${per} × ${y + 1} ＝ ${per * (y + 1)}こ`);
      st.innerHTML = `<b>${per * (y + 1)}</b> こ`;
      if (!(await wait(1.4))) return;
    }
    sfx.good();
    const lab = labelSprite(`${d} × ${w} × ${h} ＝ ${d * w * h} cm³`, { h: 0.42 }); lab.position.copy(B.box().getCenter(new THREE.Vector3())).setY(h * U + 0.7); add(lab);
    caption(`たて × よこ × たかさ で ${d * w * h}cm³`, 4);
    spinCamera(2.4, Math.PI * 0.5);
    ctx.log('miru', { detail: { mode: 'fill', v: d * w * h } });
  })();
  return { dispose: clearObjs };
}

function blocks(ctx, add, clearObjs) {
  const { panel, sfx } = ctx;
  const names = ['たて', 'よこ', 'たかさ'];
  panel.innerHTML = names.map((n, i) => `<div class="fold-row"><span class="end">${n}</span><input type="range" min="1" max="6" value="${mem.dims[i]}" data-dim="${i}" aria-label="${n}"><span class="val" data-v="${i}">${mem.dims[i]}</span></div>`).join('') + `<div class="status" data-k="st"></div>`;
  const B = makeBlocks(216); add(B.mesh);
  const frame = { g: null };
  function render(pop) {
    const [d, w, h] = mem.dims, origin = new THREE.Vector3(-w * U / 2, 0, -0.5 + d * U / 2);
    B.set(mem.dims, null, origin);
    if (frame.g) { S.stage.remove(frame.g); disposeObject(frame.g); }
    frame.g = wireBox(w * U, h * U, d * U, tok('ink-soft'), 0.012); frame.g.position.copy(origin); S.stage.add(frame.g);
    $p(panel, '[data-k="st"]').innerHTML = `${d} × ${w} × ${h} ＝ <b>${d * w * h}</b> cm³`;
    $$p(panel, '[data-dim]').forEach(s => { setSlider(s, mem.dims[+s.dataset.dim]); $p(panel, `[data-v="${s.dataset.dim}"]`).textContent = mem.dims[+s.dataset.dim]; });
    fitBox(new THREE.Box3(new THREE.Vector3(-3 * U - 0.5, 0, -0.5 - 3 * U - 0.5), new THREE.Vector3(3 * U + 0.5, 6 * U + 0.4, -0.5 + 3 * U + 0.5)), 0.95, 0.55, 1.15);
  }
  $$p(panel, '[data-dim]').forEach(s => on(s, 'input', () => { mem.dims[+s.dataset.dim] = +s.value; sfx.tick(+s.value); render(); }));
  on(panel, 'change', () => ctx.log('blocks', { detail: { v: mem.dims[0] * mem.dims[1] * mem.dims[2] } }));
  render();
  ctx.caption('スライダーで たて・よこ・たかさを かえて みよう');
  return { dispose() { if (frame.g) { S.stage.remove(frame.g); disposeObject(frame.g); } clearObjs(); } };
}

function liter(ctx, add, clearObjs) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `<button class="btn" type="button" data-k="pour">${ctx.ICONS_UI.play}みずを いれる</button><span class="status" data-k="st"></span>`;
  const S10 = 10 * U * 0.32, origin = new THREE.Vector3(-S10 / 2, 0, -0.5 + S10 / 2);   // 10cm（ここでは小さめに描く）
  const glass = add(new THREE.Mesh(new THREE.BoxGeometry(S10, S10, S10), new THREE.MeshStandardMaterial({ color: col(tok('paper')), transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false })));
  glass.position.set(0, S10 / 2, -0.5);
  const fr = add(wireBox(S10, S10, S10, tok('ink'), 0.012)); fr.position.copy(origin);
  // 1cm ごとの目盛り
  for (let k = 1; k < 10; k++) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.006), plainMaterial(tok('ink')))); m.position.set(origin.x - 0.03, k * S10 / 10, origin.z); }
  const water = add(new THREE.Mesh(new THREE.BoxGeometry(S10 * 0.98, 1, S10 * 0.98), new THREE.MeshStandardMaterial({ color: col(tok('water')), transparent: true, opacity: 0.75, roughness: 0.2 })));
  water.position.set(0, 0, -0.5); water.scale.y = 0.0001;
  const lab = add(labelSprite('10cm', { h: 0.3 })); lab.position.set(0, -0.05, origin.z + 0.35);
  fitBox(new THREE.Box3(new THREE.Vector3(-S10, 0, -0.5 - S10), new THREE.Vector3(S10, S10 + 0.8, -0.5 + S10)), 0.95, 0.55, 1.2);
  async function pour() {
    const tag = S.token; water.scale.y = 0.0001;
    caption('たて 10cm、よこ 10cm、たかさ 10cm の いれものに みずを いれると…');
    if (!(await wait(0.6))) return;
    sfx.pour(2.2);
    await tween(2.6, k => { water.scale.y = Math.max(0.0001, S10 * 0.98 * k); water.position.y = S10 * 0.98 * k / 2; }); if (!alive(tag)) return;
    sfx.good(); caption('ちょうど 1L！ 10 × 10 × 10 ＝ 1000cm³ と おなじ', 4.4);
    $p(panel, '[data-k="st"]').innerHTML = '1L ＝ <b>1000</b> cm³';
    ctx.log('liter', {});
  }
  on($p(panel, '[data-k="pour"]'), 'click', () => { sfx.tap(); pour(); });
  pour();
  return { dispose: clearObjs };
}

function meter(ctx, add, clearObjs) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `<button class="btn" type="button" data-k="go">${ctx.ICONS_UI.play}つみきで うめて みる</button><span class="status" data-k="st"></span>`;
  const M = 3.2, c = M / 100;  // 1m を 3.2 単位で描く → 1cm は 0.032
  const origin = new THREE.Vector3(-M / 2, 0, -0.5 + M / 2);
  const fr = add(wireBox(M, M, M, tok('ink'), 0.018)); fr.position.copy(origin);
  const lab = add(labelSprite('1m', { h: 0.34 })); lab.position.set(0, -0.05, origin.z + 0.4);
  const g = new THREE.BoxGeometry(c * 0.9, c * 0.9, c * 0.9), inst = new THREE.InstancedMesh(g, plainMaterial(tok('face-4')), 10000); inst.count = 0; inst.frustumCulled = false; add(inst);
  const tmp = new THREE.Matrix4(); let k = 0;
  for (let z = 0; z < 100; z++) for (let x = 0; x < 100; x++) { tmp.makeTranslation(origin.x + (x + 0.5) * c, c / 2, origin.z - (z + 0.5) * c); inst.setMatrixAt(k++, tmp); }
  inst.instanceMatrix.needsUpdate = true;
  fitBox(new THREE.Box3(new THREE.Vector3(-M / 2 - 0.3, 0, -0.5 - M / 2 - 0.3), new THREE.Vector3(M / 2 + 0.3, M + 0.3, -0.5 + M / 2 + 0.3)), 0.95, 0.6, 1.1);
  async function go() {
    const tag = S.token, st = $p(panel, '[data-k="st"]'); inst.count = 0;
    caption('1m³ の はこに、1cm³ の つみきを ならべると…');
    if (!(await wait(0.6))) return;
    await tween(1.6, t => { inst.count = Math.max(1, Math.round(100 * t)); st.innerHTML = `<b>${inst.count}</b> こ`; }); if (!alive(tag)) return;
    caption('1れつに 100こ'); if (!(await wait(1.2))) return;
    await tween(2.4, t => { inst.count = Math.max(100, Math.round(10000 * t)); st.innerHTML = `<b>${inst.count.toLocaleString('ja-JP')}</b> こ`; }); if (!alive(tag)) return;
    caption('1だんで 100 × 100 ＝ 10000こ'); sfx.tick(5); if (!(await wait(1.6))) return;
    caption('それが 100だん… 100 × 100 × 100 ＝ 1000000こ！', 5); sfx.good();
    st.innerHTML = '1m³ ＝ <b>1000000</b> cm³';
    ctx.log('meter', {});
  }
  on($p(panel, '[data-k="go"]'), 'click', () => { sfx.tap(); go(); });
  go();
  return { dispose: clearObjs };
}
