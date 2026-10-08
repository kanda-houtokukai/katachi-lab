// 角柱と円柱の体積（6年）：opts.mode
//  'stack'（みる）：底面を薄い板として、高さの分だけ積み重ねる（三角柱・円柱）。体積＝底面積×高さ。
//  'play' （さわる）：底面の形と大きさ・高さを変えると体積が変わる。円柱は底面の円の面積（半径×半径×3.14）を板で示す。
import { S, THREE, tween, wait, alive, fitBox, spinCamera, faceMaterial, plainMaterial, col, disposeObject, labelSprite } from '../stage/stage.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, sliderRow, setSlider } from './_common.js';

export const CM = 0.3;   // 1cm を 3D の何単位で描くか
// 底面（cm の座標）：tri（底辺 a・高さ b の三角形）、rect（a×b）、hex（1辺 a の正六角形）、circle（半径 a）
export function baseShape(kind, a, b) {
  if (kind === 'circle') return { area: 3.14 * a * a, shape: null, r: a };
  let pts;
  if (kind === 'tri') pts = [[-a / 2, -b / 3], [a / 2, -b / 3], [0, (2 * b) / 3]];
  else if (kind === 'rect') pts = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
  else pts = [...Array(6).keys()].map(k => [a * Math.cos(Math.PI / 3 * k), a * Math.sin(Math.PI / 3 * k)]);
  let ar = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; ar += p[0] * q[1] - p[1] * q[0]; }
  return { area: Math.abs(ar) / 2, pts };
}
export function plateGeo(base, thick) {
  let g;
  if (base.r) { g = new THREE.CylinderGeometry(base.r * CM, base.r * CM, thick, 48); g.translate(0, thick / 2, 0); return g; }
  const sh = new THREE.Shape(base.pts.map(([x, y]) => new THREE.Vector2(x * CM, y * CM)));
  g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  return g;
}
// 板の山（下から n 枚）
export function plateStack(base, h, color) {
  const grp = new THREE.Group(), geo = plateGeo(base, CM * 0.96);
  const mats = [faceMaterial(color), faceMaterial(tok('face-2'))];
  for (let k = 0; k < h; k++) { const m = new THREE.Mesh(geo, mats[k === 0 ? 1 : 0]); m.position.y = k * CM; m.castShadow = m.receiveShadow = true; m.visible = false; grp.add(m); }
  grp.userData.show = n => grp.children.forEach((m, k) => { m.visible = k < n; });
  return grp;
}
const fmt = v => (Math.round(v * 100) / 100).toString();

export function mount(ctx) { return ctx.opts.mode === 'play' ? play(ctx) : stackShow(ctx); }

function stackShow(ctx) {
  const { panel, sfx, caption } = ctx;
  const mem = mount.mem || (mount.mem = { i: 0 });
  const SETS = [['tri', 6, 4, 6, 'さんかくちゅう'], ['circle', 3, 0, 5, 'えんちゅう']];
  const [kind, a, b, h, name] = SETS[mem.i % 2];
  panel.innerHTML = `<button class="btn sub" type="button" data-k="again">${ctx.ICONS_UI.again}${mem.i % 2 ? 'さんかくちゅうで' : 'えんちゅうで'} みる</button><span class="status" data-k="st"></span>`;
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); mem.i++; ctx.restart(); });
  const base = baseShape(kind, a, b), st = plateStack(base, h, tok('face-4'));
  st.position.set(0, 0, -0.5); S.stage.add(st);
  const R = (base.r || Math.max(a, b)) * CM;
  fitBox(new THREE.Box3(new THREE.Vector3(-R - 0.8, 0, -0.5 - R - 0.8), new THREE.Vector3(R + 0.8, h * CM + 1.2, -0.5 + R + 0.8)), 0.95, 0.55, 1.25);
  (async () => {
    const tag = S.token, el = $p(panel, '[data-k="st"]');
    caption(`${name}の そこの めんを うすい いたに すると…`);
    st.userData.show(1); sfx.pop();
    if (!(await wait(1.2))) return;
    caption(`いた 1まいの たいせきは そこの めんせき × 1cm ＝ ${fmt(base.area)}cm³`);
    el.innerHTML = `そこの めんせき <b>${fmt(base.area)}</b>cm²`;
    if (!(await wait(1.8))) return;
    for (let k = 2; k <= h; k++) { st.userData.show(k); sfx.tick(k); el.innerHTML = `${k}まい → <b>${fmt(base.area * k)}</b>cm³`; if (!(await wait(0.5))) return; }
    sfx.good();
    const lab = labelSprite(`${fmt(base.area)} × ${h} ＝ ${fmt(base.area * h)} cm³`, { h: 0.4 }); lab.position.set(0, h * CM + 0.6, -0.5); S.stage.add(lab);
    caption('たいせき ＝ そこの めんせき × たかさ', 4.4);
    spinCamera(2.4, Math.PI * 0.5);
    ctx.log('miru', { detail: { mode: 'slice', base: kind } });
  })();
  return { dispose() {} };
}

function play(ctx) {
  const { panel, sfx } = ctx;
  const st = play.mem || (play.mem = { kind: 'tri', a: 6, b: 4, h: 5 });
  const KINDS = [['tri', 'さんかく'], ['rect', 'しかく'], ['hex', 'ろっかく'], ['circle', 'えん']];
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="そこの かたち">${KINDS.map(([k, l]) => `<button type="button" data-base="${k}" aria-pressed="${k === st.kind}">${l}</button>`).join('')}</div></div>
    <div class="fold-row"><span class="end" data-k="aLab">おおきさ</span><input type="range" min="1" max="8" value="${st.a}" data-dim="a" aria-label="そこの おおきさ"><span class="val" data-v="a"></span></div>
    <div class="fold-row"><span class="end">たかさ</span><input type="range" min="1" max="10" value="${st.h}" data-dim="h" aria-label="たかさ"><span class="val" data-v="h"></span></div>
    <div class="status" data-k="st"></div>`;
  let obj = null;
  function render() {
    if (obj) { S.stage.remove(obj); disposeObject(obj); }
    const base = baseShape(st.kind, st.a, st.kind === 'tri' ? st.a * 0.7 + 1 : st.kind === 'rect' ? Math.max(1, st.a - 1) : 0);
    obj = plateStack(base, st.h, tok('face-4')); obj.position.set(0, 0, -0.5); obj.userData.show(st.h); S.stage.add(obj);
    $p(panel, '[data-v="a"]').textContent = st.kind === 'circle' ? `はんけい ${st.a}` : st.a;
    $p(panel, '[data-v="h"]').textContent = st.h + 'cm';
    $$p(panel, '[data-dim]').forEach(s => setSlider(s, st[s.dataset.dim]));
    const B = fmt(base.area), V = fmt(base.area * st.h);
    $p(panel, '[data-k="st"]').innerHTML = st.kind === 'circle'
      ? `そこ ${st.a} × ${st.a} × 3.14 ＝ <b>${B}</b>cm²　たいせき ${B} × ${st.h} ＝ <b>${V}</b>cm³`
      : `そこの めんせき <b>${B}</b>cm²　たいせき ${B} × ${st.h} ＝ <b>${V}</b>cm³`;
    fitBox(new THREE.Box3(new THREE.Vector3(-8 * CM - 0.4, 0, -0.5 - 8 * CM - 0.4), new THREE.Vector3(8 * CM + 0.4, 10 * CM + 0.6, -0.5 + 8 * CM + 0.4)), 0.95, 0.55, 1.1);
  }
  $$p(panel, '[data-base]').forEach(b => on(b, 'click', () => { sfx.tap(); if (st.kind === b.dataset.base) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } st.kind = b.dataset.base; $$p(panel, '[data-base]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.base === st.kind))); render(); ctx.log('slice', { detail: { base: st.kind } }); }));
  $$p(panel, '[data-dim]').forEach(s => on(s, 'input', () => { st[s.dataset.dim] = +s.value; sfx.tick(+s.value); render(); }));
  render();
  ctx.caption('そこの かたちと おおきさ、たかさを かえて みよう');
  return { dispose() {} };
}
