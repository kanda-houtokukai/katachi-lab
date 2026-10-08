// みる（4年以降）：opts.mode
//  'kinds'：いくつかの立体を並べ、面の形で見分ける（直方体と立方体／角柱の底面と側面 など）
//  'cut'  ：箱を辺にそって切り開くと展開図になる。切る辺を変えると違う展開図になる（切る辺を赤く示しながら開く）
import { S, THREE, tween, wait, alive, easeOutBounce, glow, holdGlow, spinCamera, fitBox, labelSprite, plainMaterial, col, growSprite } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, frameBox, frameFlat, foldTo, hop, fitLayout, T } from '../stage/foldnet.js';
import { loadCatalog } from '../engine/catalog.js';
import { outerEdges, edgePairs } from '../engine/fold.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

const isSquare = pts => pts.length === 4 && pts.every((p, i) => { const q = pts[(i + 1) % 4], r = pts[(i + 2) % 4]; return Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1]) - Math.hypot(r[0] - q[0], r[1] - q[1])) < 1e-6; });
const mem = {};
export function mount(ctx) {
  const { panel, sfx, caption, opts, unit } = ctx;
  const st = mem[unit.id + ctx.actIndex] || (mem[unit.id + ctx.actIndex] = { i: 0, no: 1 });
  if (opts.mode === 'kinds') { kinds(ctx, st); return {}; }
  return cut(ctx, st);
}

async function kinds(ctx, st) {
  const { panel, sfx, caption, opts } = ctx;
  panel.innerHTML = `<button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again}もういちど みる</button>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); ctx.restart(); });
  const tag = S.token, items = opts.items;
  const cats = await Promise.all(items.map(it => loadCatalog(it.solid))); if (!alive(tag)) return {};
  const gap = opts.gap || 3.3, portrait = ctx.portrait();
  const nets = items.map((it, i) => {
    const L = cats[i].layout(1), colors = L.faces.map(f => (it.colorBy === 'type' ? (f.type === 'base' ? tok('face-2') : tok('face-4')) : isSquare(f.pts) ? tok('face-2') : tok('face-4')));
    const net = mountNet(makeFoldNet(L, colors), new THREE.Vector3(0, 0, 0));
    net.setProgress(1);
    const x = portrait ? (items.length > 2 && i === items.length - 1 ? 0 : (i % 2 ? 1.3 : -1.3)) : (i - (items.length - 1) / 2) * gap;
    const z = portrait ? (items.length > 2 && i === items.length - 1 ? 1.6 : -1.2) : -0.4;
    // 立体の中心が (x, 高さの半分, z) に来るよう置き直す
    net.holder.position.set(x, net.half.y, z); net.home = net.holder.position.clone();
    net.holder.position.y += 3;
    return net;
  });
  const all = new THREE.Box3(); nets.forEach(n => all.expandByPoint(n.home.clone().sub(n.half).setY(0)).expandByPoint(n.home.clone().add(n.half).add(new THREE.Vector3(0, 0.8, 0))));
  // カメラが回っても収まるよう、横と奥行きをそろえた枠にする
  const c = all.getCenter(new THREE.Vector3()), sz = all.getSize(new THREE.Vector3()), m = Math.max(sz.x, sz.z) / 2;
  all.min.x = c.x - m; all.max.x = c.x + m; all.min.z = c.z - m; all.max.z = c.z + m;
  fitBox(all, 0.95, 0.35, portrait ? 1.22 : 1.05);
  caption(opts.intro || 'はこを くらべて みよう');
  for (let i = 0; i < nets.length; i++) {
    const n = nets[i];
    tween(0.75, k => { n.holder.position.y = n.home.y + 3 * (1 - easeOutBounce(k)); }).then(() => sfx.land());
    if (!(await wait(0.25))) return {};
  }
  if (!(await wait(1.0))) return {};
  await spinCamera(1.6, Math.PI * 0.5); if (!alive(tag)) return {};
  for (let i = 0; i < nets.length; i++) {
    const it = items[i], n = nets[i];
    caption(it.say);
    n.nodes.forEach((nd, j) => { if (it.glowType ? n.L.faces[j].type === it.glowType : isSquare(n.L.faces[j].pts)) glow(nd.mesh, tok('glow-white'), 2, 0.55); });
    const lab = labelSprite(it.label, { h: 0.42 }); lab.position.copy(n.home).add(new THREE.Vector3(0, n.half.y + 0.55, 0)); S.stage.add(lab);
    sfx.tick(i * 3);
    if (!(await wait(2.6))) return {};
  }
  caption(opts.outro, 5);
  ctx.log('miru', { detail: { mode: 'kinds' } });
  return {};
}

function cut(ctx, st) {
  const { panel, sfx, caption, opts } = ctx;
  const solids = opts.solids;
  panel.innerHTML = `
    ${solids.length > 1 ? `<div class="seg" role="group" aria-label="かたち">${solids.map((s, i) => `<button type="button" data-i="${i}" aria-pressed="${i === st.i}">${s.label}</button>`).join('')}</div>` : ''}
    <button class="btn sub" type="button" data-k="next">${ctx.ICONS_UI.scissors}ちがう きりかた</button>`;
  $$p(panel, '[data-i]').forEach(b => on(b, 'click', () => { if (+b.dataset.i === st.i) { sfx.tap(); ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; } sfx.tap(); st.i = +b.dataset.i; st.no = 1; ctx.restart(); }));
  on($p(panel, '[data-k="next"]'), 'click', () => { sfx.tap(); st.no++; ctx.restart(); });
  (async () => {
    const tag = S.token, s = solids[st.i];
    const cat = await loadCatalog(s.solid); if (!alive(tag)) return;
    const no = ((st.no - 1) % cat.count) + 1;
    const L = fitLayout(cat.layout(no), ctx.portrait());
    const pal = faceColors();
    const net = mountNet(makeFoldNet(L, L.faces.map((f, i) => pal[i % 6])), centerBase(L, -0.5));
    net.setProgress(1);
    frameBox(net, 0.95, 0.6, 1.9);
    caption(st.no > 1 ? 'こんどは ちがう へんを きって みよう' : 'あかい へんに そって はさみで きって みよう');
    if (!(await wait(0.8))) return;
    // 切る辺（外周の辺の組ごとに1本）を赤く示す
    const pairs = edgePairs(L, net.folded);
    for (let k = 0; k < pairs.length; k++) {
      const e = pairs[k][0], g = net.nodes[e.face].g;
      const a = new THREE.Vector3(e.a[0], T + 0.01, e.a[1]), b = new THREE.Vector3(e.b[0], T + 0.01, e.b[1]);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b), 10), plainMaterial(tok('cutline'), { emissive: col(tok('cutline')), emissiveIntensity: 0.5 }));
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      m.scale.set(1, 0.001, 1); g.add(m); tween(0.3, t => m.scale.set(1, Math.max(0.001, t), 1));
      sfx.tick(k);
      if (!(await wait(0.38))) return;
    }
    caption(`きった へんは ${pairs.length}ほん。ひらくと…`);
    if (!(await wait(0.8))) return;
    sfx.swish(1.6); frameFlat(net, 0.45, S.goal.theta);
    await foldTo(net, 0, 2.6); if (!alive(tag)) return;
    caption(`てんかいずに なった！（No.${no} / ${cat.count}）`);
    sfx.good();
    ctx.log('miru', { detail: { mode: 'cut', solid: s.solid, no } });
    if (!(await wait(2.4))) return;
    caption('「ちがう きりかた」で べつの てんかいずも みて みよう', 4);
  })();
  return {};
}
