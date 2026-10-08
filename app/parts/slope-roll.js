// 坂（1年）：opts.mode
//  'demo'（みる）：坂の上に ボール・よこの つつ・たての つつ・はこ を置いて順に放す。ボールは転がる、つつは横向きなら転がり縦向きならすべる、箱はすべる。ゆっくり再生できる。
//  'try' （さわる）：物と置く向きを選んで坂に置き、放して確かめる。
// 物理エンジンは使わず、決まった動き（転がる＝回りながら速くなり遠くまで行く／すべる＝回らずにゆっくり、すぐ止まる）で見せる。
import { S, THREE, tween, wait, alive, fitBox, faceMaterial, plainMaterial, col, disposeObject, labelSprite } from '../stage/stage.js';
import { THINGS, byId, thingMesh, thingSVG, KIND_LABEL } from './_things.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p } from './_common.js';

export const SLOPE = { x0: -4.2, len: 4, h: 1.6, zc: -0.5, w: 3.4 };
const TH = Math.atan2(SLOPE.h, SLOPE.len), L = Math.hypot(SLOPE.h, SLOPE.len);
export function makeSlope() {
  const { x0, len, h, zc, w } = SLOPE;
  const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.translate(x0, 0, zc - w / 2);
  const m = new THREE.Mesh(g, faceMaterial(tok('wood'))); m.castShadow = m.receiveShadow = true;
  return m;
}
// 坂の上の点（s：坂の上からの距離）
const onSlope = s => new THREE.Vector3(SLOPE.x0 + s * Math.cos(TH), SLOPE.h - s * Math.sin(TH), 0);
// 物を坂に置く（いちばん上）
export function placeOnSlope(obj, z) {
  obj.userData.s = 0.25 + (obj.userData.radius || 0);
  pose(obj, obj.userData.s, z, 0, true);
}
function pose(obj, s, z, ang, onIncline) {
  const ud = obj.userData, m = ud.main;
  if (s <= L) {
    // 坂の上：面に沿って傾ける。転がる物は中心が面から半径だけ浮く
    const p = onSlope(s), n = new THREE.Vector3(Math.sin(TH), Math.cos(TH), 0);
    obj.position.copy(p).setZ(z);
    obj.rotation.set(0, 0, -TH);
    if (ud.rolls) { if (ud.thing.kind === 'tube') m.rotation.y = ang; else m.rotation.z = ang; }
  } else {
    obj.position.set(SLOPE.x0 + SLOPE.len + (s - L), 0, z); obj.rotation.set(0, 0, 0);
    if (ud.rolls) { if (ud.thing.kind === 'tube') m.rotation.y = ang; else m.rotation.z = ang; }
  }
}
// 放す：転がる物は加速して遠くまで、すべる物はゆっくりで、すぐ止まる。slow で時間をのばす
export function release(obj, slow = 1, sfx) {
  const ud = obj.userData, rolls = ud.rolls, z = obj.position.z, s0 = ud.s;
  const a = rolls ? 2.4 : 0.85, dec = rolls ? 0.55 : 3.2;
  const tSlope = Math.sqrt(2 * (L - s0) / a), v = a * tSlope, run = Math.min(rolls ? 3.6 : 0.5, v * v / (2 * dec)), tRun = v / dec;
  const total = (tSlope + Math.min(tRun, run / Math.max(0.01, v) * 2)) * slow;
  const r = ud.radius || 1;
  if (rolls && sfx) sfx.roll();
  return tween(total, k => {
    const t = k * total / slow;
    let s;
    if (t < tSlope) s = s0 + 0.5 * a * t * t;
    else { const u = Math.min(t - tSlope, tRun); s = L + Math.min(run, v * u - 0.5 * dec * u * u); }
    pose(obj, s, z, rolls ? -(s - s0) / r : 0);
  });
}

const mem = { thing: 'ball', orient: 'side', slow: 1 };
export function mount(ctx) {
  const { panel, sfx, caption, opts } = ctx;
  const objs = [];
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs.length = 0; };
  const frame = () => fitBox(new THREE.Box3(new THREE.Vector3(SLOPE.x0 - 0.5, 0, SLOPE.zc - SLOPE.w / 2 - 0.3), new THREE.Vector3(SLOPE.x0 + SLOPE.len + 3.8, SLOPE.h + 1.0, SLOPE.zc + SLOPE.w / 2 + 0.3)), 0.95, S.view.W < 600 ? 1.5 : 0.75, 1.06);   // 縦長の画面では、坂を奥から手前へ転がる向きで映す
  const slopeMesh = add(makeSlope());
  frame();
  if (opts.mode === 'demo') {
    panel.innerHTML = `<button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again}もういちど</button><button class="btn sub" type="button" data-k="slow">${ctx.ICONS_UI.play}ゆっくり みる</button>`;
    on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); mem.slow = 1; ctx.restart(); });
    on($p(panel, '[data-k="slow"]'), 'click', () => { sfx.tap(); mem.slow = 3; ctx.restart(); });
    const set = [['ball', 'up', 'ボールは ころがる'], ['can', 'side', 'よこに おいた つつは ころがる'], ['can', 'up', 'たてに おいた つつは すべる'], ['snack', 'up', 'はこは すべる']];
    const items = set.map(([id, o], i) => { const m = add(thingMesh(byId(id), o)); placeOnSlope(m, SLOPE.zc - 1.15 + i * 0.95); return m; });
    (async () => {
      const tag = S.token;
      caption(mem.slow > 1 ? 'ゆっくり みて みよう' : 'さかの うえから はなすと どうなるかな');
      if (!(await wait(1.2))) return;
      for (let i = 0; i < items.length; i++) {
        caption(set[i][2]); await release(items[i], mem.slow, sfx); if (!alive(tag)) return;
        sfx.land(); if (!(await wait(0.6))) return;
      }
      caption('ころがる かたちと、すべる かたちが あるね', 4);
      ctx.log('miru', { detail: { mode: 'slope', slow: mem.slow > 1 } });
      mem.slow = 1;
    })();
    return { dispose: clear };
  }
  // ためす：物と向きを選んで、さかで ためす
  const list = opts.things || ['ball', 'can', 'snack', 'dice', 'wrap', 'orange'];
  panel.innerHTML = `<div class="tray">${list.map(id => `<button class="stick" type="button" data-thing="${id}" aria-pressed="${id === mem.thing}">${thingSVG(byId(id))}${byId(id).label}</button>`).join('')}</div>
    <div class="row"><div class="seg" role="group" aria-label="おきかた" data-k="orient"><button type="button" data-o="up" aria-pressed="${mem.orient === 'up'}">たてに おく</button><button type="button" data-o="side" aria-pressed="${mem.orient === 'side'}">よこに おく</button></div>
    <button class="btn" type="button" data-k="go">${ctx.ICONS_UI.play}はなす</button></div>`;
  let cur = null, busy = false;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  function put() {
    if (cur) { S.stage.remove(cur); disposeObject(cur); objs.splice(objs.indexOf(cur), 1); }
    const t = byId(mem.thing);
    cur = add(thingMesh(t, t.kind === 'tube' ? mem.orient : 'up')); placeOnSlope(cur, SLOPE.zc);
    $$p(panel, '[data-thing]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.thing === mem.thing)));
    $$p(panel, '[data-o]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.o === mem.orient)));
  }
  $$p(panel, '[data-thing]').forEach(b => on(b, 'click', () => { if (busy) return; sfx.tap(); if (mem.thing === b.dataset.thing) { ctx.toast('', `いまは「${byId(mem.thing).label}」だよ。「はなす」を おそう`, 1.8); return; } mem.thing = b.dataset.thing; put(); }));
  $$p(panel, '[data-o]').forEach(b => on(b, 'click', () => {
    if (busy) return; sfx.tap();
    if (mem.orient === b.dataset.o) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; }
    mem.orient = b.dataset.o; put();
    const t = byId(mem.thing); if (t.kind !== 'tube') ctx.toast('', t.kind === 'ball' ? 'ボールは どの むきに おいても おなじ' : 'はこは むきを かえても たいらな ところが したに なるよ', 2.2);
  }));
  on(q$('go'), 'click', async () => {
    if (busy) return; sfx.tap(); busy = true;
    const tag = S.token, t = byId(mem.thing), rolls = cur.userData.rolls;
    await release(cur, 1, sfx); if (!alive(tag)) return;
    sfx.land();
    caption(rolls ? `${t.label}は ころがった！` : `${t.label}は すべった`, 3);
    ctx.log('roll', { detail: { thing: t.id, kind: t.kind, orient: t.kind === 'tube' ? mem.orient : '', rolls } });
    if (!(await wait(1.2))) return;
    put(); busy = false;
  });
  put(); frame();
  caption('かたちを えらんで、さかで ためして みよう');
  return { dispose: clear, test: { auto() { if (busy) return { wait: 300 }; if (this._n) return { done: true }; this._n = 1; return { click: 'data-k=go|' }; } } };
}
