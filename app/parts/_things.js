// 1年「かたちあそび」の身の回りの物。商品名や商標の分かる絵は使わず、形と色だけで作る。
// kind：box（はこ）・tube（つつ）・ball（ボール）。寸法は 3D の単位（1 ≒ 4cm くらいの見え方）。
import { THREE, faceMaterial, plainMaterial, col } from '../stage/stage.js';
import { tok } from '../core/theme.js';

export const THINGS = [
  { id: 'snack', kind: 'box', label: 'おかしの はこ', dims: [1.5, 0.5, 1.0], color: 'face-1', band: 'face-2' },
  { id: 'dice', kind: 'box', label: 'さいころ', dims: [0.7, 0.7, 0.7], color: 'paper', dots: true },
  { id: 'tissue', kind: 'box', label: 'ティッシュの はこ', dims: [1.6, 0.7, 0.9], color: 'face-4', band: 'paper' },
  { id: 'block', kind: 'box', label: 'つみき', dims: [0.8, 0.8, 0.8], color: 'face-3' },
  { id: 'lunch', kind: 'box', label: 'おべんとうばこ', dims: [1.3, 0.5, 0.8], color: 'face-6', band: 'face-5' },
  { id: 'can', kind: 'tube', label: 'かん', r: 0.38, h: 1.0, color: 'face-1', band: 'paper' },
  { id: 'wrap', kind: 'tube', label: 'ラップの しん', r: 0.16, h: 1.9, color: 'wood' },
  { id: 'roll', kind: 'tube', label: 'トイレットペーパー', r: 0.45, h: 0.8, color: 'paper' },
  { id: 'pencil', kind: 'tube', label: 'えんぴつたて', r: 0.32, h: 0.9, color: 'face-3', band: 'face-2' },
  { id: 'ball', kind: 'ball', label: 'ボール', r: 0.45, color: 'face-1', band: 'paper' },
  { id: 'marble', kind: 'ball', label: 'ビーだま', r: 0.18, color: 'face-4' },
  { id: 'orange', kind: 'ball', label: 'みかん', r: 0.35, color: 'face-2' },
  { id: 'beach', kind: 'ball', label: 'ビーチボール', r: 0.6, color: 'face-5', band: 'face-2' },
  { id: 'snow', kind: 'ball', label: 'ゆきだま', r: 0.4, color: 'paper' },
];
export const KIND_LABEL = { box: 'はこ', tube: 'つつ', ball: 'ボール' };
export const byId = id => THINGS.find(t => t.id === id);

// 物の 3D。orient：'up'（つつを立てる）・'side'（つつを寝かせる）。下の面（いちばん低い所）が y=0
export function thingMesh(t, orient = 'up') {
  const g = new THREE.Group(), c = tok(t.color);
  let m;
  if (t.kind === 'box') {
    const [w, h, d] = t.dims;
    m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faceMaterial(c)); m.position.y = h / 2;
    if (t.band) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * 1.002, h * 0.3, d * 1.002), faceMaterial(tok(t.band))); b.position.y = h / 2; g.add(b); }
    if (t.dots) { const dm = plainMaterial(tok('ok')); for (const [x, z] of [[0, 0]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 16), dm); s.position.set(x, h + 0.003, z); g.add(s); } }
    g.userData.flat = [m]; g.userData.curve = [];
  } else if (t.kind === 'tube') {
    const geo = new THREE.CylinderGeometry(t.r, t.r, t.h, 40);
    m = new THREE.Mesh(geo, [faceMaterial(c), faceMaterial(c), faceMaterial(c)]);
    if (t.band) { const b = new THREE.Mesh(new THREE.CylinderGeometry(t.r * 1.01, t.r * 1.01, t.h * 0.35, 40, 1, true), faceMaterial(tok(t.band), { side: THREE.DoubleSide })); m.add(b); }
    if (orient === 'side') { m.rotation.x = Math.PI / 2; m.position.y = t.r; } else m.position.y = t.h / 2;
    g.userData.curveIndex = 0;
  } else {
    m = new THREE.Mesh(new THREE.SphereGeometry(t.r, 40, 28), faceMaterial(c)); m.position.y = t.r;
    if (t.band) { const b = new THREE.Mesh(new THREE.TorusGeometry(t.r * 0.995, t.r * 0.12, 8, 40), faceMaterial(tok(t.band))); m.add(b); }
  }
  m.castShadow = m.receiveShadow = true; g.add(m);
  g.userData.thing = t; g.userData.orient = orient; g.userData.main = m;
  g.userData.height = t.kind === 'box' ? t.dims[1] : t.kind === 'ball' ? t.r * 2 : orient === 'side' ? t.r * 2 : t.h;
  g.userData.radius = t.kind === 'box' ? 0 : t.r;
  // 転がる？ 上に積める？（ボールは転がる・積めない。つつは寝かせると転がる、立てると積める。箱はすべる・積める）
  g.userData.rolls = t.kind === 'ball' || (t.kind === 'tube' && orient === 'side');
  g.userData.flatTop = t.kind === 'box' || (t.kind === 'tube' && orient === 'up');
  return g;
}
// 小さな絵（ずかん・トレー）
export function thingSVG(t) {
  const c = tok(t.color), ink = tok('ink');
  if (t.kind === 'box') return `<svg class="card" viewBox="0 0 60 50" width="56"><g stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"><path d="M10 18l18-8 22 6-18 8z" fill="${c}"/><path d="M10 18l22 6v18L10 36z" fill="${c}" opacity=".85"/><path d="M32 24l18-8v18L32 42z" fill="${c}" opacity=".7"/></g></svg>`;
  if (t.kind === 'tube') return `<svg class="card" viewBox="0 0 60 50" width="56"><g stroke="${ink}" stroke-width="1.4"><path d="M18 12v26a12 4 0 0 0 24 0V12" fill="${c}"/><ellipse cx="30" cy="12" rx="12" ry="4" fill="${c}"/></g></svg>`;
  return `<svg class="card" viewBox="0 0 60 50" width="56"><circle cx="30" cy="25" r="16" fill="${c}" stroke="${ink}" stroke-width="1.4"/></svg>`;
}
export const kindSVG = k => thingSVG({ kind: k, color: k === 'box' ? 'face-1' : k === 'tube' ? 'face-4' : 'face-2' });
