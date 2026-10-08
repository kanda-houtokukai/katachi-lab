// みる（5年「角柱と円柱」）：底面の形を三角形→四角形→…→八角形と変えると角柱が育つ。底面は2つ、側面は長方形。
// n を大きくしていくと円柱に近づき、なめらかな円柱へ変わる。スライダーで n＝3〜8 と えんちゅう を行き来できる。
import { S, THREE, tween, wait, alive, easeOutBack, glow, fitBox, spinCamera, disposeObject, labelSprite } from '../stage/stage.js';
import { polyMesh, cylinderMesh } from '../stage/solidmesh.js';
import { prism } from '../engine/solids.js';
import { tok } from '../core/theme.js';
import { on, $p, sliderRow, setSlider } from './_common.js';

const NAMES = { 3: ['さんかくちゅう', '<ruby>三角柱<rt>さんかくちゅう</rt></ruby>', 'さんかくけい'], 4: ['しかくちゅう', '<ruby>四角柱<rt>しかくちゅう</rt></ruby>', 'しかくけい'], 5: ['ごかくちゅう', '<ruby>五角柱<rt>ごかくちゅう</rt></ruby>', 'ごかくけい'], 6: ['ろっかくちゅう', '<ruby>六角柱<rt>ろっかくちゅう</rt></ruby>', 'ろっかくけい'], 7: ['ななかくちゅう', '<ruby>七角柱<rt>ななかくちゅう</rt></ruby>', 'ななかくけい'], 8: ['はっかくちゅう', '<ruby>八角柱<rt>はっかくちゅう</rt></ruby>', 'はっかくけい'], 9: ['えんちゅう', '<ruby>円柱<rt>えんちゅう</rt></ruby>', 'えん'] };
export function mount(ctx) {
  const { panel, sfx, caption } = ctx;
  panel.innerHTML = `${sliderRow('nSlider', { left: '3', right: 'えんちゅう', leftIcon: '', rightIcon: '', min: 3, max: 9, value: 3, label: 'そこの めんの かどの かず' })}
    <div class="row"><span class="status" data-k="name"></span><button class="btn sub small" type="button" data-k="play">${ctx.ICONS_UI.play}そだつ ところを みる</button></div>`;
  const slider = $p(panel, '#nSlider'), q$ = k => $p(panel, `[data-k="${k}"]`);
  let obj = null, n = 3, label = null;
  const R = 0.9, H = 1.6;
  function build(k, pop = true) {
    if (obj) { S.stage.remove(obj); disposeObject(obj); }
    if (label) { S.stage.remove(label); disposeObject(label); label = null; }
    n = k;
    if (k <= 8 || k > 9) {
      const nn = k > 9 ? k : k;
      const side = 2 * R * Math.sin(Math.PI / nn);
      const P = prism(nn, { side, h: H });
      obj = polyMesh(P, fi => (fi < 2 ? tok('face-2') : tok('face-4')));
    } else obj = cylinderMesh(R, H, tok('face-4'), tok('face-2'));
    obj.position.set(0, 0, -0.5); S.stage.add(obj);
    if (pop) { obj.scale.setScalar(0.85); tween(0.35, t => obj.scale.setScalar(0.85 + 0.15 * easeOutBack(t))); }
    const nm = NAMES[Math.min(k, 9)];
    label = labelSprite(k > 9 ? 'えんに ちかづく' : nm[0], { h: 0.42 }); label.position.set(0, H + 0.6, -0.5); S.stage.add(label);
    q$('name').innerHTML = k > 9 ? '' : `${nm[1]}　そこの めんは <b>${nm[2]}</b>`;
    setSlider(slider, Math.min(9, k));
  }
  function frame() { fitBox(new THREE.Box3(new THREE.Vector3(-R - 0.4, 0, -0.5 - R - 0.4), new THREE.Vector3(R + 0.4, H + 1.0, -0.5 + R + 0.4)), 1.0, 0.6, 1.25); }
  async function play() {
    const tag = S.token;
    for (let k = 3; k <= 8; k++) {
      build(k); sfx.tick(k);
      const nm = NAMES[k];
      caption(k === 3 ? `そこの めんが ${nm[2]}の はしらは ${nm[1]}` : `そこが ${nm[2]}なら ${nm[1]}`);
      if (k === 3) { await wait(0.6); obj.userData.mats && [0, 1].forEach(i => glow({ material: obj.userData.mats[i] }, tok('glow-white'), 2, 0.6)); caption('そこの めんは 2つ。よこの めん（そくめん）は ながしかく'); }
      if (!(await wait(1.8))) return;
    }
    caption('かどを どんどん ふやすと…');
    for (const k of [12, 20, 36]) { build(k, false); sfx.tick(k % 12); if (!(await wait(0.7))) return; }
    build(9); sfx.good();
    caption('なめらかな <ruby>円柱<rt>えんちゅう</rt></ruby>に ちかづくね。そこの めんは えん', 4);
    spinCamera(2.4, Math.PI * 0.6);
    ctx.log('miru', { detail: { mode: 'prism-grow' } });
  }
  on(slider, 'input', () => { const k = +slider.value; if (k !== n) { ctx.hideHud(); build(k); sfx.tick(k); } });
  on(q$('play'), 'click', () => { sfx.tap(); ctx.restart(); });
  build(3, false); frame();
  play();
  return { onResize: frame, dispose() {} };
}
