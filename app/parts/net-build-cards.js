// つくる「てんかいず（カード）」：面のカードをトレーから選び、すでに置いた面の辺へつなげる。
// 辺の長さが合う向きにだけ吸い付き、合わない辺には付かない（はじかれる動き）。全部つないだら「くみたてる」。
// カタログで判定し、新しければずかんに登録（設計書 R4・R5a・RJ）。opts.solids：[{ key, label, solid }]
import { S, THREE, tween, wait, alive, easeOutBack, easeInOut, burst, fitBox, groundPoint, rayFrom, col, disposeObject, plainMaterial, toScreen, spinCamera, glow } from '../stage/stage.js';
import { makeFoldNet, mountNet, frameBox, foldTo, hop, showOverlap, netBox, settleHolder, disposeNet, plateGeometry, T } from '../stage/foldnet.js';
import { loadCatalog } from '../engine/catalog.js';
import { SOLID_DEFS } from '../engine/solids.js';
import { cardSet, makeBuilder, judge, opsFromLayout } from '../engine/cards.js';
import { layoutBounds } from '../engine/fold.js';
import { polysSVG } from '../core/figs.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p, $$p, hintDots } from './_common.js';

const BASE = new THREE.Vector3(0, 0, -0.5);
const mem = {};
export function mount(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI, opts, unit } = ctx;
  const solids = opts.solids;
  const st = mem[unit.id + ctx.actIndex] || (mem[unit.id + ctx.actIndex] = { key: solids[0].key });
  let cat = null, set = null, B = null, sel = 0, view = null, mode = 'edit', hints = 0, foldNet = null, hintNo = 0;
  const edgeObjs = [];
  const cur = () => solids.find(s => s.key === st.key) || solids[0];
  panel.innerHTML = `
    ${solids.length > 1 ? `<div class="row"><div class="seg" role="group" aria-label="かたちの しゅるい">${solids.map(s => `<button type="button" data-solid="${s.key}" aria-pressed="${s.key === st.key}">${s.label}</button>`).join('')}</div></div>` : ''}
    <div class="row" data-k="edit">
      <div class="tray" data-k="tray"></div>
      <div class="status" data-k="st"></div>
      <button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button>
      <button class="btn small sub" type="button" data-k="turn" hidden>${ICONS_UI.turn}くるっと</button>
      <button class="btn small sub" type="button" data-k="undo" hidden>${ICONS_UI.undo}ひとつ もどす</button>
      <button class="btn small sub" type="button" data-k="clear" hidden>ぜんぶ けす</button>
      <button class="btn big" type="button" data-k="build" hidden>${ICONS_UI.build}くみたてる</button>
    </div>
    <div class="row" data-k="after" hidden>
      <button class="btn small" type="button" data-k="paper">${ICONS_UI.scissors}かみで つくる</button>
      <button class="btn small sub" type="button" data-k="redo">ならべなおす</button>
      <button class="btn small sub" type="button" data-k="new">あたらしく</button>
    </div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);

  async function load() {
    const tag = S.token;
    cat = await loadCatalog(cur().solid); if (!alive(tag)) return;
    set = cardSet(cat.P); B = makeBuilder(set); sel = 0; mode = 'edit'; hints = 0;
    renderTray(); redraw(true); status();
    caption(`カードを えらんで、マットに おこう。${set.total}まい つないだら くみたてよう`);
  }
  function renderTray() {
    const left = B.left(), pal = faceColors();
    q$('tray').innerHTML = set.types.map((t, i) => `<button class="stick" type="button" data-card="${i}" aria-pressed="${i === sel}"${left[i] <= 0 ? ' disabled' : ''}>${polysSVG([t.pts], [pal[i % pal.length]], 'card', { sw: 3 })}<small>のこり ${left[i]}</small></button>`).join('');
    $$p(panel, '[data-card]').forEach(b => on(b, 'click', () => { if (mode !== 'edit') return; sfx.tap(); if (sel === +b.dataset.card) { toast('', B.cards.length ? 'この カードを、てんせんの へんに つなごう' : 'マットを タッチすると この カードを おけるよ', 2); return; } sel = +b.dataset.card; renderTray(); redraw(false); }));
  }
  const colorOf = t => faceColors()[t % 6];
  function clearView() { if (view) { S.stage.remove(view); disposeObject(view); view = null; } edgeObjs.length = 0; }
  // 置いたカードと、いま選んでいるカードが付けられる辺（点線）を描く
  function redraw(frame) {
    clearView();
    view = new THREE.Group(); view.position.copy(BASE); S.stage.add(view);
    B.cards.forEach((c, i) => {
      const m = new THREE.Mesh(plateGeometry(c.pts), plainMaterial(colorOf(c.type), { roughness: 0.86 }));
      m.castShadow = m.receiveShadow = true; m.userData.card = i; view.add(m);
    });
    if (mode === 'edit' && B.cards.length && B.left()[sel] > 0) {
      const lens = set.types[sel].pts.map((p, j, A) => Math.hypot(A[(j + 1) % A.length][0] - p[0], A[(j + 1) % A.length][1] - p[1]));
      for (const e of B.freeEdges()) {
        if (!lens.some(l => Math.abs(l - e.len) < 1e-6)) continue;
        if (!B.candidates(sel, e.card, e.k).length) continue;
        const a = new THREE.Vector3(e.a[0], T + 0.01, e.a[1]), b = new THREE.Vector3(e.b[0], T + 0.01, e.b[1]);
        const n = Math.max(3, Math.round(a.distanceTo(b) / 0.14));
        for (let k = 0; k < n; k += 2) {
          const p = a.clone().lerp(b, k / n), q = a.clone().lerp(b, Math.min(1, (k + 1) / n));
          const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, p.distanceTo(q), 8), plainMaterial(tok('glow-white'), { emissive: col(tok('glow-white')), emissiveIntensity: 0.6 }));
          r.position.copy(p).add(q).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize()); view.add(r);
        }
        edgeObjs.push(e);
      }
    }
    if (frame) frameEdit();
  }
  function frameEdit() {
    // 展開図が広がりそうな大きさ（面の面積の合計から見積もる）
    const area = set.types.reduce((s, t) => s + t.count * Math.abs(t.pts.reduce((a, p, i, A) => a + p[0] * A[(i + 1) % A.length][1] - p[1] * A[(i + 1) % A.length][0], 0) / 2), 0);
    const reach = Math.max(2.6, 1.05 * Math.sqrt(area));
    const b = B.cards.length ? layoutBounds({ faces: B.cards.map(c => ({ pts: c.pts })) }) : { x0: 0, x1: 0, y0: 0, y1: 0 };
    const cx = (b.x0 + b.x1) / 2, cz = (b.y0 + b.y1) / 2, r = Math.max(reach, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 1.2);
    S.allowRotate = false;
    fitBox(new THREE.Box3(new THREE.Vector3(BASE.x + cx - r, 0, BASE.z + cz - r * 0.8), new THREE.Vector3(BASE.x + cx + r, 0.1, BASE.z + cz + r * 0.8)), 0.2, 0, 1.0);
  }
  function status() {
    const n = B.cards.length, left = set.total - n;
    q$('st').innerHTML = mode === 'edit' ? (left ? `あと <b>${left}</b> まい` : `<b>${set.total}</b> まい そろった！`) : q$('st').innerHTML;
    q$('turn').hidden = !(mode === 'edit' && n > 1 && B.cards[n - 1].nVariants > 1);
    q$('undo').hidden = !(mode === 'edit' && n > 0);
    q$('clear').hidden = !(mode === 'edit' && n > 1);
    q$('build').hidden = !(mode === 'edit' && B.full());
    q$('hint').hidden = mode !== 'edit' || B.full();
    q$('hd').innerHTML = hintDots(hints);
  }
  function bounce(e, msg) {
    sfx.bad(); toast(ICON.X, msg, 2.2);
    // はじかれる動き：小さなカードが辺に近づいて跳ね返る
    const p = groundPoint(e, T) || new THREE.Vector3();
    const m = new THREE.Mesh(plateGeometry(set.types[sel].pts.map(([x, y]) => [x * 0.6, y * 0.6])), plainMaterial(colorOf(sel)));
    m.position.copy(p).add(new THREE.Vector3(0, 0.5, 0)); S.stage.add(m);
    tween(0.7, k => { m.position.y = 0.5 - 0.3 * Math.sin(k * Math.PI); m.rotation.y = Math.sin(k * Math.PI * 4) * 0.4; m.scale.setScalar(1 - k * 0.9); }).then(() => { S.stage.remove(m); disposeObject(m); });
  }
  function nearestEdge(e) {
    const p = groundPoint(e, T); if (!p) return null;
    const lp = [p.x - BASE.x, p.z - BASE.z];
    let best = null, bd = 0.32;
    for (const ed of B.freeEdges()) {
      const ax = ed.a[0], ay = ed.a[1], dx = ed.b[0] - ax, dy = ed.b[1] - ay, l2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((lp[0] - ax) * dx + (lp[1] - ay) * dy) / l2)), d = Math.hypot(ax + t * dx - lp[0], ay + t * dy - lp[1]);
      if (d < bd) { bd = d; best = ed; }
    }
    return best;
  }
  function placeAnim(i) {
    const m = view.children.find(o => o.userData.card === i); if (!m) return;
    m.position.y = 0.4; m.scale.setScalar(0.85);
    tween(0.32, k => { m.position.y = 0.4 * (1 - k); m.scale.setScalar(0.85 + 0.15 * easeOutBack(k)); });
  }
  function onTap(e) {
    if (mode !== 'edit' || !B) return;
    if (!B.cards.length) {
      if (B.left()[sel] <= 0) return;
      B.start(sel); sfx.pop(); caption('');
      if (B.left()[sel] <= 0) sel = B.left().findIndex(n => n > 0);
      renderTray(); redraw(true); placeAnim(0); status(); return;
    }
    const ed = nearestEdge(e);
    if (!ed) { toast('', 'おいた カードの へんの ちかくを タッチしよう', 2); return; }
    if (B.left()[sel] <= 0) { toast('', 'その カードは もう ないよ。ほかの カードを えらぼう', 2.2); return; }
    const r = B.attach(sel, ed.card, ed.k, 0);
    if (!r.ok) { bounce(e, r.reason === 'length' ? 'へんの ながさが あわないよ' : r.reason === 'overlap' ? 'ほかの カードに かさなって しまうよ' : 'そこには つけられないよ'); return; }
    sfx.pop(); caption('');
    if (B.left()[sel] <= 0) { const nx = B.left().findIndex(n => n > 0); if (nx >= 0) sel = nx; }
    renderTray(); redraw(false); placeAnim(r.index); status();
    if (r.nVariants > 1) toast('', 'むきを かえたい ときは「くるっと」', 1.8);
    if (B.full()) frameEdit();
  }
  on(q$('turn'), 'click', () => { if (mode !== 'edit') return; const r = B.turnLast(); sfx.tap(); redraw(false); placeAnim(B.cards.length - 1); status(); });
  on(q$('undo'), 'click', () => { if (mode !== 'edit') return; sfx.off(); B.undo(); renderTray(); redraw(false); status(); });
  on(q$('clear'), 'click', () => { if (mode !== 'edit') return; sfx.off(); B.start(0); B.cards.length = 0; renderTray(); redraw(true); status(); });
  on(q$('hint'), 'click', async () => {
    if (mode !== 'edit') return;
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; status();
    if (hints === 1) { toast(ICON.HINT, cat.P.F.length === 6 ? 'むかいあう めんは おなじ かたち。となりに ならべないで みよう' : 'そこに なる めんを まんなかに おいて、まわりに つないで みよう', 3.2); return; }
    // まだ見つけていない展開図の、はじめの何枚かを置いてみせる
    const found = new Set(ctx.zukanList(cur().solid));
    const no = hintNo = [...Array(cat.count).keys()].map(i => i + 1).find(n => !found.has(n)) || 1;
    const ops = opsFromLayout(set, cat.layout(no));
    const upto = hints === 2 ? Math.ceil(ops.length / 2) : ops.length - 1;
    const { replay } = await import('../engine/cards.js');
    const r = replay(set, ops.slice(0, upto)); B = r.B; sel = B.left().findIndex(n => n > 0); if (sel < 0) sel = 0;
    renderTray(); redraw(true); status();
    toast(ICON.HINT, hints === 2 ? 'はんぶん ならべて みたよ。のこりを つなごう' : 'あと 1まい！ どこに つけると はこに なるかな', 3);
  });
  on(q$('build'), 'click', async () => {
    if (mode !== 'edit' || !B.full()) return;
    sfx.tap(); const tag = S.token; mode = 'fold'; status();
    const j = judge(B, cat);
    const colors = B.cards.map(c => colorOf(c.type));
    clearView();
    foldNet = mountNet(makeFoldNet(j.layout, colors, { id: j.no }), BASE.clone());
    foldNet.setProgress(0);
    q$('st').innerHTML = 'くみたて ちゅう…';
    S.allowRotate = true;
    const bb = netBox(foldNet); bb.max.y += 1.2; fitBox(bb, 0.9, 0.45, 1.12);
    if (!(await wait(0.3))) return;
    sfx.swish(1.5); await foldTo(foldNet, 1, 2.0); if (!alive(tag)) return;
    if (j.no) {
      frameBox(foldNet, 0.95, S.goal.theta, 2.2);
      await hop(foldNet, 0.45); if (!alive(tag)) return;
      sfx.good(); burst(foldNet.home);
      const isNew = ctx.register(cur().solid, j.no);
      const n = ctx.zukanList(cur().solid).length;
      toast(ICON.HANAMARU, `${cur().made || 'くみたてられた'}！<br><small>${isNew ? `ずかんに とうろく（${n} / ${cat.count}）` : 'もう みつけた ひらきかた だよ'}</small>`, 3.4);
      q$('st').innerHTML = `<b>No.${j.no}</b> の ひらきかた`; q$('paper').hidden = false;
      if (isNew) ctx.done('build');
    } else {
      sfx.bad();
      if (j.overlaps.length) showOverlap(foldNet, j.overlaps); else spinCamera(3, Math.PI * 0.85);
      j.badHinges.forEach(i => { glow(foldNet.nodes[i].mesh, tok('glow-red'), 3, 0.7, 0.4); S.held.add(foldNet.nodes[i].mat); });
      toast(ICON.X, j.overlaps.length ? 'あかい めんが かさなって、あなが あいたよ' : j.badHinges.length ? 'あかい めんは、となりに つながらない めんだよ' : 'すき間が あいて しまったね', 3.6);
      q$('st').innerHTML = 'べつの ならべかたを ためそう'; q$('paper').hidden = true;
    }
    ctx.log('build', { correct: !!j.no, hints, detail: { valid: !!j.no, id: j.no, solid: cur().solid, name: SOLID_DEFS[cur().solid].name } });
    mode = 'done'; q$('edit').hidden = true; q$('after').hidden = false;
  });
  async function backToEdit(keep) {
    if (!foldNet) return;
    const tag = S.token, n0 = foldNet;
    mode = 'back'; ctx.hideHud(); q$('after').hidden = true; q$('edit').hidden = false;
    await settleHolder(n0); sfx.swish(1.2); frameEdit();
    await foldTo(n0, 0, 1.2); if (!alive(tag)) return;
    disposeNet(n0); foldNet = null;
    if (!keep) { B.cards.length = 0; sel = 0; }
    mode = 'edit'; hints = 0; renderTray(); redraw(true); status();
  }
  on(q$('redo'), 'click', () => { sfx.tap(); backToEdit(true); });
  on(q$('new'), 'click', () => { sfx.tap(); backToEdit(false); });
  on(q$('paper'), 'click', () => {
    if (!foldNet || !foldNet.analysis.id) return; sfx.tap();
    ctx.openPaper({ layout: foldNet.L, colors: foldNet.colors, title: `${cur().paperTitle || cur().label}の てんかいず`, sub: `No.${foldNet.analysis.id} / ${cat.count}`, unitText: 'へんの ながさ 1', foot: unit.plain, file: `tenkaizu-${cur().solid}-${foldNet.analysis.id}` });
    ctx.log('paper', { detail: { solid: cur().solid, name: SOLID_DEFS[cur().solid].name, id: foldNet.analysis.id } });
  });
  $$p(panel, '[data-solid]').forEach(b => on(b, 'click', () => {
    if (st.key === b.dataset.solid) { sfx.tap(); ctx.toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; }
    sfx.tap(); st.key = b.dataset.solid;
    $$p(panel, '[data-solid]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.solid === st.key)));
    if (foldNet) { disposeNet(foldNet); foldNet = null; }
    q$('after').hidden = true; q$('edit').hidden = false; ctx.hideHud();
    load();
  }));
  load();
  return {
    onTap,
    onResize() { if (mode === 'edit' && B) frameEdit(); },
    dispose() { clearView(); },
    test: {
      auto() {
        if (!B) return { wait: 300 };
        if (mode === 'done') return { done: true };
        if (mode !== 'edit') return { wait: 300 };
        if (B.full()) return { click: 'data-k=build|' };
        if (hints < 3) return { click: 'data-k=hint|' };
        // ヒントで並んだ形の、のこり1まいを ほんとうに タッチして つなぐ
        const ops = opsFromLayout(set, cat.layout(hintNo)), last = ops[ops.length - 1];
        if (B.cards.length === ops.length) return { click: 'data-k=turn|' };
        if (sel !== last.type) return { click: `data-card=${last.type}|` };
        return { tap: this.edgePoint(last.card, last.edge[0], last.edge[1]) };
      },
      state: () => B && { hintNo, mode, cards: B.cards.length, total: set.total, full: B.full(), left: B.left(), sel, valid: foldNet ? !!foldNet.analysis.id : null },
      // カタログ No.no を作る操作の列（テストが実際にタップして再現する）
      ops: no => opsFromLayout(set, cat.layout(no)).map(o => ({ op: o.op, type: o.type, card: o.card, edge: o.edge })),
      groundPoint: (x, y) => toScreen(new THREE.Vector3(BASE.x + x, T, BASE.z + y)),
      edgePoint: (card, ha, hb) => { const P = B.cards[card].pts, near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6; const k = P.findIndex((q, j) => { const r = P[(j + 1) % P.length]; return (near(q, ha) && near(r, hb)) || (near(q, hb) && near(r, ha)); }); const a = P[k], b = P[(k + 1) % P.length], c = P.reduce((s, p) => [s[0] + p[0] / P.length, s[1] + p[1] / P.length], [0, 0]); const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const out = [m[0] + (m[0] - c[0]) * 0.06, m[1] + (m[1] - c[1]) * 0.06]; return toScreen(new THREE.Vector3(BASE.x + out[0], T, BASE.z + out[1])); },
      lastVariants: () => B.cards.length ? B.cards[B.cards.length - 1].nVariants : 0,
      wantMatches: (want) => { const c = B.cards[B.cards.length - 1]; return want.every(p => c.pts.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)); },
    },
  };
}
