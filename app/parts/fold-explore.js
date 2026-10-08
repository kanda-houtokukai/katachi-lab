// さわる：展開図の開閉・回転・数える・向かい合う面（見本v2）。4年以降の道具（重なる辺と頂点・平行と垂直・見取図）も同じ部品で持つ。
// opts.solids：[{ key, label, src:'grid'|'box'|'catalog', dims, solid, oppGrade }]、opts.tools：使う道具の名前の並び
import { objScreen } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeInOut, easeOutBack, easeOutBounce, glow, holdGlow, stopGlows, badge, growSprite, rayFrom, fitBox, col, disposeObject, reduceMotion, plainMaterial } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, fitLayout, frameBox, frameFlat, foldTo, settleHolder, disposeNet } from '../stage/foldnet.js';
import { cellsToLayout, NETS11 } from '../engine/grid.js';
import { loadCatalog } from '../engine/catalog.js';
import { edgePairs, vertexGroups, outerEdges } from '../engine/fold.js';
import { boxCrossLayout } from './_nets.js';
import { tok } from '../core/theme.js';
import { PAL, on, $p, $$p, sliderRow, setSlider } from './_common.js';
import * as R4 from './_explore-tools.js';

const mem = {};
export function mount(ctx) {
  const { panel, sfx, caption, toast, setCounter, hideCounter, setGrade, ICON, opts, unit } = ctx;
  const solids = opts.solids || [{ key: 'cube', label: 'さいころ', src: 'grid' }];
  const tools = opts.tools || ['count', 'opposite', 'next'];
  const st = mem[unit.id + ctx.actIndex] || (mem[unit.id + ctx.actIndex] = { key: solids[0].key, index: {}, touched: false, tool: tools.includes('opposite') ? 'opposite' : tools.find(t => R4.TOOLS[t]) });
  if (opts.solid) { const s = solids.find(x => x.solid === opts.solid || x.key === opts.solid); if (s) st.key = s.key; }
  if (opts.no) st.index[st.key] = opts.no - 1;
  const cur = () => solids.find(s => s.key === st.key) || solids[0];
  const toolSeg = tools.filter(t => R4.TOOLS[t]);
  panel.innerHTML = `
    ${sliderRow('foldSlider', { value: 65, label: 'はこを ひらく ぐあい' })}
    <div class="chips">
      ${solids.length > 1 ? `<div class="seg" role="group" aria-label="かたちの しゅるい">${solids.map(s => `<button type="button" data-solid="${s.key}" aria-pressed="${s.key === st.key}">${s.label}</button>`).join('')}</div>` : ''}
      ${tools.includes('count') ? `<button class="chip" type="button" data-count="face"><span class="dot" style="background:${tok('face-1')}"></span>めん</button><button class="chip" type="button" data-count="edge"><span class="dot" style="background:${tok('face-2')}"></span>へん</button><button class="chip" type="button" data-count="vertex"><span class="dot" style="background:${tok('face-4')}"></span>ちょうてん</button>` : ''}
      ${tools.includes('next') ? `<button class="chip" type="button" data-k="next">${ctx.ICONS_UI.again}べつの ひらきかた</button>` : ''}
      ${tools.includes('paper') ? `<button class="chip" type="button" data-k="paper">${ctx.ICONS_UI.scissors}かみで つくる</button>` : ''}
      <span class="status" data-k="no"></span>
    </div>
    ${toolSeg.length > 1 ? `<div class="row"><div class="seg" role="group" aria-label="どうぐ">${toolSeg.map(t => `<button type="button" data-tool="${t}" aria-pressed="${t === st.tool}">${R4.TOOLS[t].label}</button>`).join('')}</div></div>` : ''}`;
  const slider = $p(panel, '#foldSlider');
  let net = null, countTag = null, tool = null;
  const syncSlider = p => setSlider(slider, Math.round((1 - p) * 100));

  async function layoutFor(s) {
    const i = st.index[s.key] || 0;
    if (s.src === 'grid') return { L: cellsToLayout(NETS11[((i % 11) + 11) % 11]), snap: true, count: 11, no: (((i % 11) + 11) % 11) + 1 };
    if (s.src === 'box') return { L: boxCrossLayout(...s.dims), snap: false, count: 1, no: 0 };
    const cat = await loadCatalog(s.solid), no = (((i % cat.count) + cat.count) % cat.count) + 1;
    return { L: cat.layout(no), snap: false, count: cat.count, no, cat };
  }
  function nextBtnVisible() {
    const b = $p(panel, '[data-k="next"]'); if (b) b.hidden = cur().src === 'box';
    const s = $p(panel, '[data-k="no"]'); if (s) s.innerHTML = net && net.info.cat ? `No.<b>${net.info.no}</b> / ${net.info.count}` : '';
  }

  async function show(progress = 0.35, play = false) {
    const tag = S.token, s = cur();
    const info = await layoutFor(s); if (!alive(tag)) return;
    if (net) { disposeNet(net); net = null; }
    const L = fitLayout(info.L, ctx.portrait());
    net = mountNet(makeFoldNet(L, PAL(), { id: info.no }), centerBase(L, -0.5, info.snap));
    net.info = info;
    net.setProgress(progress); syncSlider(progress);
    frameFlat(net, 0.62, 0.55);
    nextBtnVisible();
    if (!st.touched) caption('ゆびで まわしたり、めんを タッチしたり してみよう');
    if (tool && tool.leave) tool.leave(); tool = null;
    if (st.tool && R4.TOOLS[st.tool]) tool = R4.TOOLS[st.tool].make(api);
    if (play) {
      net.setProgress(1); syncSlider(1);
      if (!(await wait(0.3))) return; sfx.swish(1.3);
      await tween(1.6, k => { net.setProgress(1 - k); syncSlider(1 - k); });
    }
  }
  const onUserTouch = () => { if (!st.touched) { st.touched = true; caption(''); } };
  S.onUserTouch = onUserTouch;

  function clearCountings() {
    countTag = null; stopGlows();
    if (!net) return;
    net.clearBadges();
    [...net.overlay.children].forEach(o => { net.overlay.remove(o); disposeObject(o); });
    hideCounter();
  }
  async function closeIfNeeded(tag) {
    if (net.progress < 0.999) { sfx.swish(0.9); const from = net.progress; await tween(1.0 * (1 - from), k => { const p = from + (1 - from) * k; net.setProgress(p); syncSlider(p); }); }
    return alive(tag);
  }

  // 数える（めん・へん・ちょうてん）：箱が回って、数える面をこちらへ向ける
  async function runCount(kind) {
    if (!net) return;
    clearCountings(); if (tool && tool.reset) tool.reset();
    const tag = {}; countTag = tag;
    const ok = () => countTag === tag && alive(stTag);
    const stTag = S.token;
    frameBox(net, 0.9, S.goal.theta, 2.0); S.goal.target.y += 0.45;
    if (!(await closeIfNeeded(stTag)) || !ok()) return;
    await settleHolder(net); if (!ok()) return;
    const h = net.holder, lift = 0.6;
    await tween(0.4, k => { h.position.y = net.home.y + lift * easeInOut(k); }); if (!ok()) return;
    const camDir = () => new THREE.Vector3().subVectors(S.camera.position, h.position).normalize();
    const nF = net.L.faces.length, sol = net.solid;
    if (kind === 'face') {
      setCounter('めん', 0, 'つ');
      const order = [...net.L.faces.keys()].sort((a, b) => net.L.depth[a] - net.L.depth[b]);
      for (let k = 0; k < nF; k++) {
        const i = order[k], outward = new THREE.Vector3(...net.folded[i].inward).negate();
        const target = new THREE.Quaternion().setFromUnitVectors(outward, camDir()), q0 = h.quaternion.clone();
        await tween(0.55, t => h.quaternion.copy(q0).slerp(target, t), easeInOut); if (!ok()) return;
        net.addBadge(i, String(k + 1), net.nodes[i].color, '#ffffff', 0.3, false).position.y = -0.2;
        glow(net.nodes[i].mesh, tok('glow-white'), 1, 0.45); sfx.tick(k); setCounter('めん', k + 1, 'つ');
        if (!(await wait(0.35)) || !ok()) return;
      }
      sfx.good(); setCounter('めんは', nF, 'つ'); ctx.say(`めんは ${nF}つ`);
    } else {
      const isEdge = kind === 'edge', c = net.c3;
      const V = sol.verts.map(v => new THREE.Vector3(...v));
      const yMax = Math.max(...V.map(v => v.y)), yMin = Math.min(...V.map(v => v.y));
      let items;
      if (isEdge) {
        const lens = [...new Set(sol.edges.map(e => Math.round(V[e.v[0]].distanceTo(V[e.v[1]]) * 100)))].sort((a, b) => b - a);
        const hexOf = l => (lens.length > 1 ? [tok('face-1'), tok('face-2'), tok('face-4'), tok('face-3'), tok('face-5')][lens.indexOf(l) % 5] : tok('yamabuki'));
        items = sol.edges.map(e => {
          const a = V[e.v[0]], b = V[e.v[1]], m = a.clone().add(b).multiplyScalar(0.5), l = Math.round(a.distanceTo(b) * 100);
          const rank = Math.abs(a.y - yMax) < 1e-3 && Math.abs(b.y - yMax) < 1e-3 ? 0 : (Math.abs(a.y - yMin) < 1e-3 && Math.abs(b.y - yMin) < 1e-3 ? 2 : 1);
          return { a, b, p: m, len: a.distanceTo(b), hex: hexOf(l), rank };
        });
      } else {
        items = V.map(p => ({ p, rank: Math.abs(p.y - yMax) < 1e-3 ? 0 : Math.abs(p.y - yMin) < 1e-3 ? 2 : 1, hex: tok('face-4') }));
      }
      items.sort((x, y) => x.rank - y.rank || Math.atan2(x.p.z - c.z, x.p.x - c.x) - Math.atan2(y.p.z - c.z, y.p.x - c.x));
      setCounter(isEdge ? 'へん' : 'ちょうてん', 0, isEdge ? 'ほん' : 'つ');
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.38, 0, 0.16));
      const spinner = { done: false };
      (async () => {
        const q0 = h.quaternion.clone(), t0 = performance.now(), qt = new THREE.Quaternion(), qy = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
        while (!spinner.done && ok()) { const el = (performance.now() - t0) / 1000; qt.copy(tilt).multiply(qy.setFromAxisAngle(Y, el * 0.9 * (reduceMotion ? 0.3 : 1))); h.quaternion.copy(q0).slerp(qt, Math.min(1, el / 0.7)); await new Promise(r => requestAnimationFrame(r)); }
      })();
      const mats = {};
      const matOf = hex => mats[hex] || (mats[hex] = new THREE.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: 0.35, roughness: 0.5 }));
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        let m;
        if (isEdge) {
          m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, it.len + 0.03, 12), matOf(it.hex));
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), it.b.clone().sub(it.a).normalize());
        } else m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), matOf(it.hex));
        m.position.copy(it.p); m.scale.setScalar(0.001); net.overlay.add(m);
        tween(0.3, t => m.scale.setScalar(Math.max(0.001, t)), easeOutBack);
        const b = badge(String(k + 1), it.hex, tok('ink')); b.position.copy(it.p).add(it.p.clone().sub(c).normalize().multiplyScalar(0.28)); net.overlay.add(b); growSprite(b, 0.24);
        sfx.tick(k % 12); setCounter(isEdge ? 'へん' : 'ちょうてん', k + 1, isEdge ? 'ほん' : 'つ');
        if (!(await wait(isEdge ? 0.42 : 0.5)) || !ok()) { spinner.done = true; return; }
      }
      sfx.good(); setCounter(isEdge ? 'へんは' : 'ちょうてんは', items.length, isEdge ? 'ほん' : 'つ');
      const lens = new Set(items.filter(i => i.len).map(i => Math.round(i.len * 100)));
      if (isEdge && lens.size === 3 && items.length === 12) { if (await wait(1.4) && ok()) toast(ICON.HANAMARU, 'おなじ ながさの へんが <b>4ほん</b>ずつ あるね', 3.6); }
      else ctx.say(isEdge ? `へんは ${items.length}ほん` : `ちょうてんは ${items.length}つ`);
      if (await wait(2.2)) spinner.done = true; else spinner.done = true;
    }
    ctx.log('count', { detail: { kind, what: { face: '面', edge: '辺', vertex: '頂点' }[kind], solid: cur().key } });
  }

  // 向かい合う面（タッチ）
  function tapOpposite(e) {
    const hit = rayFrom(e).intersectObjects(net.meshes(), false)[0];
    if (!hit) return;
    onUserTouch();
    const i = hit.object.userData.face, j = net.analysis.opposite[i];
    if (j == null || j < 0) { toast('', 'この かたちには むかいあう めんが ないよ', 2.2); return; }
    clearCountings(); stopGlows(); sfx.pop();
    glow(net.nodes[i].mesh, tok('glow-white'), 3, 0.6); glow(net.nodes[j].mesh, tok('glow-white'), 3, 0.6);
    [i, j].forEach(f => net.addBadge(f, '★', tok('yamabuki'), tok('ink'), 0.34));
    const g = cur().oppGrade || 4;
    setGrade(g);
    if (g <= 2) toast('', 'むかいあう めんは <b>おなじ かたち</b>・おなじ おおきさ', 3.4);
    else toast(ICON.GRADE(g), 'むかいあう めんは この 2まい', 3.2);
    ctx.log('opp-look', { detail: { solid: cur().key } });
    if (net.progress > 0.5) {
      const tag = S.token;
      (async () => {
        await settleHolder(net); if (!alive(tag)) return; sfx.swish(1);
        const from = net.progress;
        await tween(1.3 * from, k => { const p = from * (1 - k); net.setProgress(p); syncSlider(p); });
        frameFlat(net, 0.62, S.goal.theta);
      })();
    }
  }

  const api = { ctx, get net() { return net; }, syncSlider, clearCountings, onUserTouch, cur };

  on(slider, 'input', () => {
    if (!net) return;
    onUserTouch(); if (countTag) clearCountings();
    if (net.holder.quaternion.angleTo(new THREE.Quaternion()) > 1e-3 || net.holder.position.y !== net.home.y) { net.holder.quaternion.identity(); net.holder.position.y = net.home.y; }
    const v = +slider.value; setSlider(slider, v); net.setProgress(1 - v / 100);
    if (tool && tool.onFold) tool.onFold(net.progress);
  });
  on(slider, 'change', () => sfx.tap());
  $$p(panel, '[data-count]').forEach(b => on(b, 'click', () => { sfx.tap(); onUserTouch(); setGrade(unit.grade); runCount(b.dataset.count); }));
  $$p(panel, '[data-solid]').forEach(b => on(b, 'click', () => {
    if (st.key === b.dataset.solid) { sfx.tap(); ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; }
    sfx.tap(); st.key = b.dataset.solid;
    $$p(panel, '[data-solid]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.solid === st.key)));
    clearCountings(); ctx.hideHud(); show(net ? net.progress : 0.35);
  }));
  $$p(panel, '[data-tool]').forEach(b => on(b, 'click', () => {
    if (st.tool === b.dataset.tool) { sfx.tap(); ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; }
    sfx.tap(); st.tool = b.dataset.tool;
    $$p(panel, '[data-tool]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.tool === st.tool)));
    clearCountings(); stopGlows(); ctx.hideHud();
    if (tool && tool.leave) tool.leave();
    tool = R4.TOOLS[st.tool].make(api);
  }));
  on($p(panel, '[data-k="next"]'), 'click', async () => {
    if (!net) return;
    sfx.tap(); onUserTouch(); clearCountings();
    const tag = S.token, keep = Math.min(net.progress, 0.999);
    await settleHolder(net); if (!alive(tag)) return;
    if (!(await closeIfNeeded(tag))) return;
    await tween(0.22, k => { net.holder.position.y = net.home.y + 0.5 * Math.sin(k * Math.PI / 2); net.holder.scale.setScalar(1 - 0.5 * k); }); if (!alive(tag)) return;
    st.index[st.key] = (st.index[st.key] || 0) + 1;
    await show(1); if (!alive(tag)) return;
    net.holder.scale.setScalar(0.5); net.holder.position.y = net.home.y + 0.5;
    await tween(0.34, k => { net.holder.scale.setScalar(0.5 + 0.5 * easeOutBack(k)); net.holder.position.y = net.home.y + 0.5 * (1 - easeOutBounce(k)); });
    sfx.land(); if (!alive(tag)) return;
    sfx.swish(1.2); frameFlat(net, 0.62, S.goal.theta);
    const to = keep > 0.98 ? 0 : keep;
    await tween(1.4 * (1 - to), k => { const p = 1 - (1 - to) * k; net.setProgress(p); syncSlider(p); });
    if (net.info.cat) toast('', `No.${net.info.no} / ${net.info.count}`, 1.6);
  });

  on($p(panel, '[data-k="paper"]'), 'click', () => {
    if (!net) return; sfx.tap();
    const s = cur(), title = (s.paperTitle || s.label) + ' の てんかいず';
    ctx.openPaper({ layout: net.L, colors: net.colors, title, sub: net.info.cat ? `No.${net.info.no} / ${net.info.count}` : '', unitText: s.src === 'grid' ? '1マス' : 'へんの ながさ 1', foot: ctx.unit.plain, file: `tenkaizu-${s.key}-${net.info.no}` });
    ctx.log('paper', { detail: { solid: s.key, name: s.paperTitle || s.label, id: net.info.no } });
  });
  show(opts.progress != null ? opts.progress : 0.35, !!opts.play);
  return {
    onTap(e) {
      if (!net) return;
      if (tool && tool.onTap && st.tool !== 'opposite') { onUserTouch(); tool.onTap(e); return; }
      if (tools.includes('opposite')) tapOpposite(e);
    },
    onResize() { if (net) { if (net.progress > 0.99) frameBox(net, S.goal.phi, S.goal.theta, 2.1); else frameFlat(net, S.goal.phi, S.goal.theta); } },
    dispose() { if (tool && tool.leave) tool.leave(); },
    test: {
      auto() {
        if (!net) return { wait: 300 };
        const t = tool && tool.test;
        if (st.tool === 'opposite' || !t) { if (!this._opp) { this._opp = 1; return { tap: this.facePoint(0) }; } return { done: true }; }
        if (st.tool === 'paraperp' && !t.ready()) return { wait: 400 };
        if (t.edgePoint && !this['_' + st.tool]) { this['_' + st.tool] = 1; return { tap: st.tool === 'paraperp' ? t.edgePoint(0, 0) : t.edgePoint(0) }; }
        if (t.vertexPoint && !this._v) { this._v = 1; return { tap: t.vertexPoint(0) }; }
        if (t.facePoint && !this._pf) { if (!t.ready()) return { wait: 400 }; this._pf = 1; return { tap: t.facePoint(0) }; }
        return { done: true };
      },
      net: () => net && { progress: net.progress, faces: net.L.faces.length, opposite: net.analysis.opposite, no: net.info.no, count: net.info.count },
      facePoint: i => objScreen(net.nodes[i].mesh, new THREE.Vector3(net.nodes[i].center[0], 0.03, net.nodes[i].center[1])),
      tool: () => tool && tool.test,
    },
  };
}
