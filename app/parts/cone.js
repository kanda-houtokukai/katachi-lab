// 円錐（中1）：opts.mode
//  'open' ：母線の長さと底面の半径をスライダーで変えると、側面のおうぎ形の中心角が変わる。「くみたてる」で巻いて円錐にする。
//  'build'：底面の円に合うよう、おうぎ形の中心角をスライダーで合わせる。合えば ぴったり円錐になる。印刷もできる。
// 中心角＝360°×半径÷母線 の式は、保護者画面と「ちょっと先」の説明でだけ示す（子どもの画面には角度の数だけ）。
import { S, THREE, tween, wait, alive, easeInOut, fitBox, spinCamera, faceMaterial, plainMaterial, labelSprite, disposeObject, burst } from '../stage/stage.js';
import { edgeId } from '../engine/fold.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, sliderRow, setSlider, hintDots } from './_common.js';

// おうぎ形（半径 l・中心角 th）を、巻きぐあい c で円錐に近づける。c＝th/2π で平ら、c＝1 で ぴったり巻ききる
function sectorGeometry(geo, l, th, c, NR = 8, NA = 64) {
  const pos = geo.attributes.position, sb = Math.min(1, th / (2 * Math.PI * c)), cb = Math.sqrt(1 - sb * sb);
  let k = 0;
  for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
    const rho = l * i / NR, psi = th * j / NA, phi = psi * (2 * Math.PI * c / th);
    pos.setXYZ(k++, rho * sb * Math.cos(phi), l * cb - rho * cb + 0.004, rho * sb * Math.sin(phi));
  }
  pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}
function makeSector(l, th, hex) {
  const NR = 8, NA = 64, geo = new THREE.BufferGeometry(), pos = new Float32Array((NR + 1) * (NA + 1) * 3), idx = [];
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, faceMaterial(hex, { side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true;
  sectorGeometry(geo, l, th, th / (2 * Math.PI));
  return m;
}
const disc = (r, hex) => { const g = new THREE.CircleGeometry(r, 48); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, faceMaterial(hex, { side: THREE.DoubleSide })); m.position.y = 0.006; m.castShadow = m.receiveShadow = true; return m; };
const deg = th => Math.round(th * 180 / Math.PI);

export function mount(ctx) { return ctx.opts.mode === 'build' ? build(ctx) : open(ctx); }

function open(ctx) {
  const { panel, sfx, caption } = ctx;
  const st = open.mem || (open.mem = { l: 2.4, r: 0.8 });
  panel.innerHTML = `<div class="fold-row"><span class="end">ぼせん</span><input type="range" min="12" max="30" value="${st.l * 10}" data-dim="l" aria-label="ぼせんの ながさ"><span class="val" data-v="l"></span></div>
    <div class="fold-row"><span class="end">はんけい</span><input type="range" min="3" max="15" value="${st.r * 10}" data-dim="r" aria-label="そこの えんの はんけい"><span class="val" data-v="r"></span></div>
    <div class="row"><span class="status" data-k="st"></span><button class="btn" type="button" data-k="roll">${ctx.ICONS_UI.build}くみたてる</button></div>`;
  let sector = null, base = null, busy = false;
  const narrow = S.view.W < 600, sc = narrow ? 0.6 : 1;
  const ctr = new THREE.Vector3(narrow ? 0 : -0.6, 0, -0.5);
  const grp = new THREE.Group(); grp.position.copy(ctr); grp.scale.setScalar(sc); S.stage.add(grp);
  function render() {
    [sector, base].forEach(o => { if (o) { grp.remove(o); disposeObject(o); } });
    if (st.r >= st.l) st.r = Math.round((st.l - 0.1) * 10) / 10;
    const th = 2 * Math.PI * st.r / st.l;
    // 底面の円は おうぎ形の弧の まん中に 接する（縦長の画面では、弧を手前に向けて円を下に置く）
    sector = makeSector(st.l, th, tok('face-4')); sector.rotation.y = th / 2 - (narrow ? Math.PI / 2 : Math.PI); grp.add(sector);
    base = disc(st.r, tok('face-2')); if (narrow) base.position.set(0, 0, st.l + st.r); else base.position.set(-st.l - st.r, 0, 0); grp.add(base);
    $p(panel, '[data-v="l"]').textContent = st.l.toFixed(1); $p(panel, '[data-v="r"]').textContent = st.r.toFixed(1);
    $$p(panel, '[data-dim]').forEach(s => setSlider(s, st[s.dataset.dim] * 10));
    $p(panel, '[data-k="st"]').innerHTML = `おうぎがたの ちゅうしんかく <b>${deg(th)}</b>°`;
    if (narrow) fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - 3.1 * sc, 0, ctr.z - 3.1 * sc), new THREE.Vector3(ctr.x + 3.1 * sc, 0.6, ctr.z + (3.1 + 3) * sc)), 0.45, 0, 1.0);
    else fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - 6, 0, -3.6), new THREE.Vector3(ctr.x + 3.2, 2.6, 2.6)), 0.85, 0, 1.05);
  }
  $$p(panel, '[data-dim]').forEach(s => on(s, 'input', () => { if (busy) return; st[s.dataset.dim] = +s.value / 10; sfx.tick(+s.value % 12); render(); }));
  on(panel, 'change', () => ctx.log('cone', { detail: { mode: 'open', l: st.l, r: st.r } }));
  on($p(panel, '[data-k="roll"]'), 'click', async () => {
    if (busy) return; busy = true; sfx.tap(); const tag = S.token, th = 2 * Math.PI * st.r / st.l;
    sector.rotation.y = 0;
    const g = sector.geometry, c0 = th / (2 * Math.PI), L = st.l * sc;
    fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - L - 0.4, 0, ctr.z - L - 0.4), new THREE.Vector3(ctr.x + L + 0.4, L + 0.4, ctr.z + L + 0.4)), 0.95, 0.5, 1.2);
    const b0 = base.position.clone(), b1 = new THREE.Vector3();
    sfx.swish(1.6);
    await tween(2.2, k => { sectorGeometry(g, st.l, th, c0 + (1 - c0) * easeInOut(k)); base.position.lerpVectors(b0, b1, easeInOut(k)); }); if (!alive(tag)) return;
    sfx.good(); burst(new THREE.Vector3(ctr.x, 1, ctr.z));
    ctx.caption('ぴったり えんすいに なった！', 3);
    spinCamera(2.2, Math.PI * 0.6);
    ctx.log('cone', { detail: { mode: 'roll', l: st.l, r: st.r } });
    if (!(await wait(2.6))) return;
    busy = false; render();
  });
  render();
  caption('ぼせんと はんけいを かえると、おうぎがたの かどが かわるよ');
  return { dispose() { S.stage.remove(grp); disposeObject(grp); } };
}

function build(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI } = ctx;
  const PRESETS = [[2.4, 0.8], [2.0, 1.0], [3.0, 0.75]];
  const st = build.mem || (build.mem = { p: 0, ang: 90 });
  let objs = [], busy = false, hints = 0, ok = false;
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="えんすいの おおきさ">${PRESETS.map((p, i) => `<button type="button" data-p="${i}" aria-pressed="${i === st.p}">${['ふつう', 'ひくい', 'たかい'][i]}</button>`).join('')}</div></div>
    ${sliderRow('angSlider', { left: 'せまい', right: 'ひろい', leftIcon: '', rightIcon: '', min: 30, max: 330, value: st.ang, label: 'おうぎがたの かどの おおきさ' })}
    <div class="row" data-k="edit"><span class="status" data-k="st"></span><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button><button class="btn big" type="button" data-k="roll">${ICONS_UI.build}まいて みる</button></div>
    <div class="row" data-k="after" hidden><button class="btn small" type="button" data-k="paper">${ICONS_UI.scissors}かみで つくる</button><button class="btn small sub" type="button" data-k="redo">やりなおす</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`), slider = $p(panel, '#angSlider');
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; };
  const narrow = S.view.W < 600, sc = narrow ? 0.62 : 1;
  const ctr = new THREE.Vector3(narrow ? 0 : 0.6, 0, -0.5);
  let sector = null;
  function layout() {
    clear(); const [l, r] = PRESETS[st.p], th = st.ang * Math.PI / 180;
    const grp = add(new THREE.Group()); grp.position.copy(ctr); grp.scale.setScalar(sc);
    sector = makeSector(l, th, tok('face-4')); sector.rotation.y = th / 2 - (narrow ? Math.PI / 2 : Math.PI); grp.add(sector);
    const b = disc(r, tok('face-2')); if (narrow) b.position.set(0, 0, l + r); else b.position.set(-l - r, 0, 0); grp.add(b); grp.userData.base = b;
    q$('st').innerHTML = `かどの おおきさ <b>${st.ang}</b>°`; q$('hd').innerHTML = hintDots(hints); setSlider(slider, st.ang);
    S.allowRotate = false;
    if (narrow) fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - (l + 0.3) * sc, 0, ctr.z - (l + 0.3) * sc), new THREE.Vector3(ctr.x + (l + 0.3) * sc, 0.4, ctr.z + (l + 2 * r + 0.3) * sc)), 0.35, 0, 1.0);
    else fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - l - 2 * r - 0.4, 0, ctr.z - l - 0.4), new THREE.Vector3(ctr.x + l + 0.4, 0.4, ctr.z + l + 0.4)), 0.35, 0, 1.05);
  }
  on(slider, 'input', () => { if (busy) return; st.ang = +slider.value; layout(); });
  $$p(panel, '[data-p]').forEach(b => on(b, 'click', () => { if (busy) return; sfx.tap(); if (+b.dataset.p === st.p) { toast('', `いまは「${b.textContent}」の えんすいだよ`, 1.6); return; } st.p = +b.dataset.p; hints = 0; $$p(panel, '[data-p]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.p === st.p))); layout(); }));
  on(q$('hint'), 'click', () => {
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; q$('hd').innerHTML = hintDots(hints);
    const [l, r] = PRESETS[st.p], want = Math.round(360 * r / l);
    if (hints === 1) toast(ICON.HINT, 'おうぎがたの まるい ところの ながさを、そこの えんの まわりの ながさに あわせよう', 3.4);
    else if (hints === 2) toast(ICON.HINT, `そこの えんが ちいさいほど、かどは せまく なるよ`, 3);
    else { st.ang = want + (want > 200 ? -10 : 10); layout(); toast(ICON.HINT, 'ちかくまで あわせたよ。あと すこし', 2.6); }
  });
  on(q$('roll'), 'click', async () => {
    if (busy) return; busy = true; sfx.tap(); const tag = S.token, [l, r] = PRESETS[st.p], th = st.ang * Math.PI / 180, want = 360 * r / l;
    sector.rotation.y = 0; S.allowRotate = true;
    const Ls = l * sc;
    fitBox(new THREE.Box3(new THREE.Vector3(ctr.x - Ls - 0.4, 0, ctr.z - Ls - 0.4), new THREE.Vector3(ctr.x + Ls + 0.4, Ls + 0.4, ctr.z + Ls + 0.4)), 0.95, 0.5, 1.2);
    const b = objs[0].userData.base, b0 = b.position.clone(), c0 = th / (2 * Math.PI);
    sfx.swish(1.6);
    await tween(2.0, k => { sectorGeometry(sector.geometry, l, th, c0 + (1 - c0) * easeInOut(k)); b.position.lerpVectors(b0, new THREE.Vector3(), easeInOut(k)); }); if (!alive(tag)) return;
    ok = Math.abs(st.ang - want) <= 4;
    if (ok) { sfx.good(); burst(new THREE.Vector3(ctr.x, 1, ctr.z)); toast(ICON.HANAMARU, 'ぴったり！ えんすいが できた', 3); ctx.done('cone'); ctx.register('cone', st.p + 1); }
    else { sfx.bad(); toast(ICON.X, st.ang < want ? 'そこの えんより ちいさく なったね。かどを ひろく しよう' : 'そこの えんより おおきく なったね。かどを せまく しよう', 3.4); }
    spinCamera(2.2, Math.PI * 0.6);
    ctx.log('cone', { correct: ok, hints, detail: { mode: 'build', ang: st.ang, want: Math.round(want) } });
    q$('edit').hidden = true; q$('after').hidden = false; q$('paper').hidden = !ok; busy = false;
  });
  on(q$('redo'), 'click', () => { sfx.tap(); ctx.hideHud(); q$('edit').hidden = false; q$('after').hidden = true; layout(); });
  on(q$('paper'), 'click', () => {
    sfx.tap(); const [l, r] = PRESETS[st.p], th = 2 * Math.PI * r / l;
    // おうぎ形（中心が原点、弧は下向き）と、弧のまん中に接する円。のりしろは おうぎ形の片方の半径
    const a0 = Math.PI / 2 - th / 2, a1 = Math.PI / 2 + th / 2, end = [Math.cos(a1) * l, Math.sin(a1) * l];
    const tab = [[0, 0], [end[0] * 0.15 - Math.sin(a1) * 0.18, end[1] * 0.15 + Math.cos(a1) * 0.18], [end[0] * 0.85 - Math.sin(a1) * 0.18, end[1] * 0.85 + Math.cos(a1) * 0.18], end];
    const zig = []; for (let k = 0; k < 16; k += 2) { const b0 = (k / 16) * Math.PI * 2, b1 = ((k + 0.5) / 16) * Math.PI * 2, b2 = ((k + 1) / 16) * Math.PI * 2, R2 = r + 0.12, cy = l + r; zig.push([[r * Math.cos(b0), cy + r * Math.sin(b0)], [R2 * Math.cos(b1), cy + R2 * Math.sin(b1)], [r * Math.cos(b2), cy + r * Math.sin(b2)]]); }
    ctx.openPaper({ title: 'えんすいの てんかいず', sub: `ぼせん ${l}・はんけい ${r}`, unitText: 'ながさ 1', foot: ctx.unit.plain, file: 'ensui-tenkaizu',
      shapes: { polys: [], sectors: [{ c: [0, 0], r: l, a0, a1, fill: tok('face-4') }], tabs: [tab], circleTabs: zig, folds: new Set([edgeId([0, 0], end)]), circles: [{ c: [0, l + r], r, fill: tok('face-2'), tab: 0.12 }] } });
    ctx.log('paper', { detail: { solid: 'cone', name: '円錐' } });
  });
  layout();
  ctx.caption('そこの えんに あう ように、おうぎがたの かどを あわせよう');
  return {
    dispose: clear,
    test: { auto() { if (busy) return { wait: 300 }; if (!q$('after').hidden) return { done: true }; const [l, r] = PRESETS[st.p], want = Math.round(360 * r / l); if (Math.abs(st.ang - want) > 2) return { slider: ['#angSlider', want] }; return { click: 'data-k=roll|' }; } },
  };
}
