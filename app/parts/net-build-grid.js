// つくる「てんかいず」（立方体・方眼）：マスに6まい ならべて くみたてる。箱になれば ずかんに登録し、
// のりしろ付きの展開図を A4 に実寸で出せる（見本v2）。ヒント3段（まだ見つけていない開き方をうすく示す）。
import { toScreen } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeOutBack, easeOutBounce, burst, fitBox, rayFrom, faceMaterial, disposeObject, col, isPortrait } from '../stage/stage.js';
import { makeFoldNet, mountNet, frameBox, foldTo, hop, showOverlap, netBox, settleHolder, disposeNet, plateGeometry } from '../stage/foldnet.js';
import { cellsToLayout, isConnected, NETS11, netId } from '../engine/grid.js';
import { loadCatalog } from '../engine/catalog.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p, hintDots } from './_common.js';

const GRID = { w: 6, h: 5, x0: -3, z0: -3 };
export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI, opts } = ctx;
  const coll = opts.coll || 'cube';
  panel.innerHTML = `
    <div class="row" data-k="edit"><div class="status" data-k="st"></div>
      <button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button>
      <button class="btn big" type="button" data-k="build" hidden>${ICONS_UI.build}くみたてる</button>
      <button class="btn small sub" type="button" data-k="clear2" hidden>ぜんぶ けす</button></div>
    <div class="row" data-k="after" hidden>
      <button class="btn small" type="button" data-k="paper">${ICONS_UI.scissors}かみで つくる</button>
      <button class="btn small sub" type="button" data-k="redo">ならべなおす</button>
      <button class="btn small sub" type="button" data-k="new">あたらしく</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  // 方眼（点線のマス）
  const P = 128, c = document.createElement('canvas'); c.width = GRID.w * P; c.height = GRID.h * P;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 0, c.width, c.height);
  g.setLineDash([10, 9]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.55)';
  for (let x = 0; x < GRID.w; x++) for (let z = 0; z < GRID.h; z++) { const r = 14, X = x * P + 12, Z = z * P + 12, Sz = P - 24; g.beginPath(); g.moveTo(X + r, Z); g.arcTo(X + Sz, Z, X + Sz, Z + Sz, r); g.arcTo(X + Sz, Z + Sz, X, Z + Sz, r); g.arcTo(X, Z + Sz, X, Z, r); g.arcTo(X, Z, X + Sz, Z, r); g.closePath(); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  const area = new THREE.Mesh(new THREE.PlaneGeometry(GRID.w, GRID.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  area.rotation.x = -Math.PI / 2; area.position.set(GRID.x0 + GRID.w / 2, 0.003, GRID.z0 + GRID.h / 2); S.stage.add(area);
  const tiles = new Map();
  let state = 'edit', hints = 0, net = null;
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }); ghostMat.userData.pulse = true;
  const clearGhosts = () => { [...S.ghosts.children].forEach(o => { S.ghosts.remove(o); o.geometry.dispose(); }); };
  const clearTiles = () => { for (const t of tiles.values()) { S.stage.remove(t.mesh); disposeObject(t.mesh); } tiles.clear(); };
  const nextColor = () => { const used = new Set([...tiles.values()].map(t => t.color)); const pal = faceColors(); return pal.find(c => !used.has(c)) || pal[tiles.size % 6]; };
  function addTile(x, z, color, animate = true) {
    const mesh = new THREE.Mesh(plateGeometry([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]), faceMaterial(color)); mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(GRID.x0 + x + 0.5, 0, GRID.z0 + z + 0.5); S.stage.add(mesh);
    tiles.set(x + ',' + z, { mesh, color, x, z });
    if (animate) { mesh.position.y = 0.45; mesh.scale.setScalar(0.6); tween(0.38, k => { mesh.position.y = 0.45 * (1 - easeOutBounce(k)); mesh.scale.setScalar(0.6 + 0.4 * easeOutBack(Math.min(1, k * 1.3))); }); }
  }
  const frameGrid = () => fitBox(new THREE.Box3(new THREE.Vector3(GRID.x0, 0, GRID.z0), new THREE.Vector3(GRID.x0 + GRID.w, 0.1, GRID.z0 + GRID.h)), 0.16, isPortrait() ? Math.PI / 2 : 0, 1.04);
  const tileCells = () => [...tiles.values()].map(t => [t.x, t.z]);
  function updateStatus() {
    const n = tiles.size, st = q$('st');
    q$('build').hidden = true;
    if (n < 6) st.innerHTML = n === 0 ? 'めんを <b>6</b> まい ならべよう' : `あと <b>${6 - n}</b> まい`;
    else if (!isConnected(tileCells())) st.innerHTML = 'はなれている めんが あるよ';
    else { st.innerHTML = '<b>6</b> まい そろった！'; q$('build').hidden = false; }
    q$('clear2').hidden = n === 0; q$('hint').hidden = n === 6 && isConnected(tileCells());
  }
  function enter() {
    state = 'edit'; hints = 0; q$('hd').innerHTML = hintDots(0); area.visible = true; S.allowRotate = false;
    q$('after').hidden = true; q$('edit').hidden = false;
    frameGrid(); updateStatus();
    caption('マスを タッチして めんを 6まい ならべよう');
  }
  on(q$('hint'), 'click', () => {
    if (state !== 'edit') return;
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; q$('hd').innerHTML = hintDots(hints);
    if (hints === 1) { toast(ICON.HINT, 'まず 4まいを 1れつに ならべて みよう', 3); return; }
    // まだ ずかんに ない ひらきかたを うすく みせる
    clearGhosts();
    const found = new Set([5, ...ctx.zukanList(coll)]);
    const id = [...Array(11).keys()].find(i => !found.has(i + 1)) ?? Math.floor(Math.random() * 11);
    let cells = NETS11[id];
    const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    if (w > GRID.w || h > GRID.h) cells = cells.map(([x, z]) => [z, x]);
    (hints === 2 ? cells.slice(0, 4) : cells).forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), ghostMat); m.rotation.x = -Math.PI / 2; m.position.set(GRID.x0 + x + 0.5, 0.008, GRID.z0 + z + 0.5); S.ghosts.add(m); });
    toast(ICON.HINT, hints === 2 ? 'しろい ところに ならべて、のこりの 2まいを かんがえよう' : 'しろい ところに ならべると はこに なるよ', 3.2);
  });
  on(q$('build'), 'click', async () => {
    if (state !== 'edit' || tiles.size !== 6) return;
    sfx.tap();
    const tag = S.token; state = 'fold';
    const list = [...tiles.values()], cells = list.map(t => [t.x, t.z]), colors = list.map(t => t.color);
    clearTiles(); clearGhosts();
    const L = cellsToLayout(cells);
    net = mountNet(makeFoldNet(L, colors), new THREE.Vector3(GRID.x0, 0, GRID.z0)); net.setProgress(0);
    net.cells = cells;
    q$('build').hidden = true; q$('clear2').hidden = true; q$('hint').hidden = true;
    q$('st').innerHTML = 'くみたて ちゅう…';
    S.allowRotate = true;
    const b = netBox(net); b.max.y += 1; fitBox(b, 0.9, S.goal.theta + 0.45, 1.12);
    if (!(await wait(0.35))) return;
    sfx.swish(1.5); await foldTo(net, 1, 1.9); if (!alive(tag)) return;
    const a = net.analysis, id = a.valid ? netId(cells) + 1 : 0;
    if (a.valid) {
      frameBox(net, 0.95, S.goal.theta, 2.2);
      await hop(net, 0.45); if (!alive(tag)) return;
      sfx.good(); burst(net.home);
      const isNew = ctx.register(coll, id);
      const n = new Set([5, ...ctx.zukanList(coll)]).size;
      toast(ICON.HANAMARU, `はこに なった！<br><small>${isNew ? `ずかんに とうろく（${n} / 11）` : 'もう みつけた ひらきかた だよ'}</small>`, 3.4);
      q$('st').innerHTML = `<b>No.${id}</b> の ひらきかた`; q$('paper').hidden = false;
      if (isNew) ctx.done('build');
    } else {
      sfx.bad(); showOverlap(net);
      toast(ICON.X, 'あかい めんが かさなって、あなが あいたよ', 3.6);
      q$('st').innerHTML = 'べつの ならべかたを ためそう'; q$('paper').hidden = true;
    }
    ctx.log('build', { correct: a.valid, hints, detail: { valid: a.valid, id, solid: 'cube', name: '立方体' } });
    state = 'done'; q$('after').hidden = false;
  });
  async function backToEdit(keep) {
    if (!net) return;
    const tag = S.token, n0 = net;
    state = 'back'; ctx.hideHud(); q$('after').hidden = true;
    frameGrid(); S.allowRotate = false;
    await settleHolder(n0); sfx.swish(1.2);
    await foldTo(n0, 0, 1.4); if (!alive(tag)) return;
    disposeNet(n0); net = null;
    if (keep) n0.cells.forEach((c, i) => addTile(c[0], c[1], n0.colors[i], false));
    state = 'edit'; hints = 0; q$('hd').innerHTML = hintDots(0); updateStatus();
  }
  on(q$('redo'), 'click', () => { sfx.tap(); backToEdit(true); });
  on(q$('new'), 'click', () => { sfx.tap(); backToEdit(false); });
  on(q$('clear2'), 'click', () => {
    sfx.off();
    for (const t of tiles.values()) { const m = t.mesh; tween(0.2, s => m.scale.setScalar(Math.max(0.001, 1 - s))).then(() => { S.stage.remove(m); disposeObject(m); }); }
    tiles.clear(); updateStatus();
  });
  on(q$('paper'), 'click', () => {
    if (!net || !net.analysis.valid) return;
    sfx.tap();
    const id = netId(net.cells) + 1;
    ctx.openPaper({ layout: net.L, colors: net.colors, title: 'はこの てんかいず', sub: `No.${id} / 11`, unitText: '1マス', foot: '2ねん「はこの形」　4ねん「直方体と立方体」', file: `hako-tenkaizu-${id}` });
    ctx.log('paper', { detail: { solid: 'cube', name: '立方体', id } });
  });
  enter();
  return {
    onTap(e) {
      if (state !== 'edit') return;
      const hit = rayFrom(e).intersectObject(area, false)[0]; if (!hit) return;
      const x = Math.floor(hit.point.x - GRID.x0), z = Math.floor(hit.point.z - GRID.z0);
      if (x < 0 || z < 0 || x >= GRID.w || z >= GRID.h) return;
      caption('');
      const k = x + ',' + z;
      if (tiles.has(k)) { const t = tiles.get(k); tiles.delete(k); sfx.off(); tween(0.18, s => { t.mesh.scale.setScalar(Math.max(0.001, 1 - s)); }).then(() => { S.stage.remove(t.mesh); disposeObject(t.mesh); }); }
      else if (tiles.size >= 6) {
        sfx.bad(); toast(ICON.X, 'めんは 6まいまで だよ', 1.8);
        for (const t of tiles.values()) { const m = t.mesh, x0 = m.position.x; tween(0.4, s => { m.position.x = x0 + Math.sin(s * Math.PI * 6) * 0.04 * (1 - s); }); }
        return;
      } else { addTile(x, z, nextColor()); sfx.pop(); }
      updateStatus();
    },
    onResize() { if (state === 'edit') frameGrid(); },
    dispose() { clearGhosts(); },
    test: { auto() {
        if (state === 'done') return { done: true };
        if (state !== 'edit') return { wait: 300 };
        const want = [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]], have = new Set([...tiles.keys()]);
        const extra = [...tiles.values()].find(t => !want.some(([x, z]) => x === t.x && z === t.z));
        if (extra) return { tap: this.cellPoint(extra.x, extra.z) };
        const next = want.find(([x, z]) => !have.has(x + ',' + z));
        return next ? { tap: this.cellPoint(next[0], next[1]) } : { click: 'data-k=build|' };
      }, cellPoint: (x, z) => toScreen(new THREE.Vector3(GRID.x0 + x + 0.5, 0.01, GRID.z0 + z + 0.5)), state: () => ({ state, tiles: tiles.size, valid: net ? net.analysis.valid : null }) },
  };
}
