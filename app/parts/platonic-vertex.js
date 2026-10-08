// みる（中1）：正多面体が5種類しかないこと。1つの頂点に正三角形を3・4・5枚、正方形を3枚、正五角形を3枚集めるとできる。
// 正三角形6枚・正方形4枚・正六角形3枚では平らになり、立体にならない（集める動き）。
import { squareBox } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeInOut, fitBox, spinCamera, faceMaterial, labelSprite, disposeObject, burst } from '../stage/stage.js';
import { polyMesh } from '../stage/solidmesh.js';
import { solid } from '../engine/solids.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p } from './_common.js';

const CASES = [
  { m: 3, n: 3, solid: 'tetra', name: 'せいしめんたい' }, { m: 3, n: 4, solid: 'octa', name: 'せいはちめんたい' }, { m: 3, n: 5, solid: 'icosa', name: 'せいにじゅうめんたい' },
  { m: 3, n: 6, flat: true }, { m: 4, n: 3, solid: 'cube', name: 'りっぽうたい' }, { m: 4, n: 4, flat: true }, { m: 5, n: 3, solid: 'dodeca', name: 'せいじゅうにめんたい' }, { m: 6, n: 3, flat: true },
];
const SHAPE = { 3: 'せいさんかくけい', 4: 'ましかく', 5: 'せいごかくけい', 6: 'せいろっかくけい' };
const mem = { i: 0 };
// 頂点 O に n 枚の正 m 角形を集める。t＝0 で平ら（すき間あり）、t＝1 で かどが できる
function corner(m, n, t, colors, grp) {
  const alpha = Math.PI - 2 * Math.PI / m;                                     // 正 m 角形の内角
  const sinPhi = Math.min(1, Math.sin(alpha / 2) / Math.sin(Math.PI / n)), phiF = Math.asin(sinPhi);
  const dir = k => { const th = (1 - t) * k * alpha + t * (2 * Math.PI * k / n), ph = (1 - t) * Math.PI / 2 + t * phiF; return new THREE.Vector3(Math.sin(ph) * Math.cos(th), -Math.cos(ph), Math.sin(ph) * Math.sin(th)); };
  while (grp.children.length) { const c = grp.children.pop(); disposeObject(c); }
  for (let k = 0; k < n; k++) {
    const u = dir(k), v2 = dir((k + 1) % n === 0 && t < 1 ? n : k + 1);
    const w = v2.clone().sub(u.clone().multiplyScalar(v2.dot(u))).normalize();
    // 正 m 角形：O から u 方向へ1、そこから外角ずつ曲がる
    const pts = [[0, 0]]; let x = 0, y = 0, a = 0;
    for (let j = 0; j < m - 1; j++) { x += Math.cos(a); y += Math.sin(a); pts.push([x, y]); a += Math.PI - alpha; }
    // 2つめの辺（O へ戻る辺）が w の側に来るよう、y を w 方向にとる
    const P = pts.map(([px, py]) => u.clone().multiplyScalar(px).add(w.clone().multiplyScalar(py)));
    const geo = new THREE.BufferGeometry(), pos = [];
    for (let j = 1; j < P.length - 1; j++) pos.push(...P[0].toArray(), ...P[j].toArray(), ...P[j + 1].toArray());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, faceMaterial(colors[k % colors.length], { side: THREE.DoubleSide })); mesh.castShadow = true; grp.add(mesh);
  }
}
export function mount(ctx) {
  const { panel, sfx, caption } = ctx;
  const C = CASES[mem.i % CASES.length];
  panel.innerHTML = `<span class="status" data-k="st">${C.n}まいの ${SHAPE[C.m]}</span><button class="btn" type="button" data-k="next">${ctx.ICONS_UI.play}つぎを みる</button><button class="btn sub small" type="button" data-k="again">${ctx.ICONS_UI.again}もういちど</button>`;
  on($p(panel, '[data-k="next"]'), 'click', () => { sfx.tap(); mem.i++; ctx.restart(); });
  on($p(panel, '[data-k="again"]'), 'click', () => { sfx.tap(); ctx.restart(); });
  const grp = new THREE.Group(); grp.position.set(-1.6, 1.4, -0.5); S.stage.add(grp);
  const colors = faceColors();
  corner(C.m, C.n, 0, colors, grp);
  fitBox(squareBox(new THREE.Box3(new THREE.Vector3(-3.4, 0, -2.4), new THREE.Vector3(3.0, 2.4, 1.4))), 0.85, 0.3, 1.0);
  (async () => {
    const tag = S.token;
    caption(`1つの かどに ${SHAPE[C.m]}を ${C.n}まい あつめると…`);
    if (!(await wait(1.4))) return;
    if (C.flat) {
      grp.position.y = 0.02; corner(C.m, C.n, 0, colors, grp);
      sfx.swish(0.6); await tween(1.2, k => { grp.rotation.x = Math.sin(k * Math.PI * 3) * 0.05 * (1 - k); }); if (!alive(tag)) return;
      caption('すき間が なくて たいらに なって しまう。かどが できないね', 4);
      ctx.log('platonic', { detail: { m: C.m, n: C.n, flat: true } });
      return;
    }
    sfx.swish(1.2);
    await tween(1.8, k => corner(C.m, C.n, easeInOut(k), colors, grp)); if (!alive(tag)) return;
    sfx.good();
    caption(`かどが できた！ これを くりかえすと…`);
    if (!(await wait(1.0))) return;
    const P = solid(C.solid), m = polyMesh(P, i => colors[i % colors.length]);
    const sz = m.userData.size, sc = 1.8 / Math.max(sz.x, sz.y, sz.z); m.scale.setScalar(sc); m.position.set(1.8, 0, -0.5); S.stage.add(m);
    m.scale.setScalar(0.001); await tween(0.5, k => m.scale.setScalar(Math.max(0.001, sc * k)));
    const lab = labelSprite(C.name, { h: 0.4 }); lab.position.set(1.8, sz.y * sc + 0.5, -0.5); S.stage.add(lab);
    burst(new THREE.Vector3(1.8, 1, -0.5));
    caption(`<ruby>正多面体<rt>せいためんたい</rt></ruby>の 1つ、${C.name}`, 4);
    spinCamera(2.6, Math.PI * 0.5);
    ctx.log('platonic', { detail: { m: C.m, n: C.n, solid: C.solid } });
  })();
  return { dispose() {} };
}
