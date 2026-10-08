// 1cm³ の積み木（InstancedMesh）と、数字を入れるテンキー（5年・6年の体積）。
import { S, THREE, faceMaterial, plainMaterial, col, disposeObject } from '../stage/stage.js';
import { tok } from '../core/theme.js';

export const U = 0.42; // 1cm を 3D の何単位で描くか
// 積み木の箱：dims [たて(z), よこ(x), たかさ(y)]。count で見せる数を変えられる（下の段から順に）
export function makeBlocks(maxN = 400, hex = tok('face-4')) {
  const g = new THREE.BoxGeometry(U * 0.94, U * 0.94, U * 0.94);
  const m = new THREE.InstancedMesh(g, faceMaterial(hex), maxN);
  m.castShadow = m.receiveShadow = true; m.count = 0; m.frustumCulled = false;
  const tmp = new THREE.Matrix4();
  const api = {
    mesh: m, dims: [1, 1, 1], origin: new THREE.Vector3(),
    // 置く順：下の段から、手前の列から（「1だんに たて×よこ こ」が見えるように）
    set(dims, shown = null, origin = api.origin) {
      api.dims = dims; api.origin = origin.clone();
      const [d, w, h] = dims, n = Math.min(maxN, d * w * h); let k = 0;
      for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
        if (k >= n) break;
        tmp.makeTranslation(origin.x + (x + 0.5) * U, origin.y + (y + 0.5) * U, origin.z - (z + 0.5) * U);
        m.setMatrixAt(k++, tmp);
      }
      m.count = shown == null ? n : Math.min(n, shown);
      m.instanceMatrix.needsUpdate = true;
      return n;
    },
    show(n) { m.count = Math.max(0, Math.min(n, api.dims[0] * api.dims[1] * api.dims[2], maxN)); },
    box() { const [d, w, h] = api.dims; return new THREE.Box3(api.origin.clone().add(new THREE.Vector3(0, 0, -d * U)), api.origin.clone().add(new THREE.Vector3(w * U, h * U, 0))); },
  };
  return api;
}
// 箱のわく（ガラスの入れ物・はかる箱）
export function wireBox(w, h, d, hex = tok('ink'), r = 0.015) {
  const g = new THREE.Group(), mat = plainMaterial(hex);
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const E = [[P(0, 0, 0), P(w, 0, 0)], [P(0, 0, -d), P(w, 0, -d)], [P(0, h, 0), P(w, h, 0)], [P(0, h, -d), P(w, h, -d)], [P(0, 0, 0), P(0, 0, -d)], [P(w, 0, 0), P(w, 0, -d)], [P(0, h, 0), P(0, h, -d)], [P(w, h, 0), P(w, h, -d)], [P(0, 0, 0), P(0, h, 0)], [P(w, 0, 0), P(w, h, 0)], [P(0, 0, -d), P(0, h, -d)], [P(w, 0, -d), P(w, h, -d)]];
  for (const [a, b] of E) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m); }
  return g;
}
// テンキー（大きなボタン）。onEnter(数) を呼ぶ
export function keypadHTML(decimal = false) {
  return `<div class="row"><span class="entry" data-k="entry"></span><span class="status" data-k="unitw">cm³</span></div>
  <div class="keypad" style="grid-template-columns:repeat(${decimal ? 7 : 6},minmax(40px,1fr))">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button type="button" data-key="${n}">${n}</button>`).join('')}${decimal ? '<button type="button" data-key="dot" aria-label="てん">.</button>' : ''}<button type="button" data-key="del" aria-label="けす">⌫</button><button type="button" data-key="ok" style="grid-column:span 1;background:var(--mat-deep);color:var(--paper)">OK</button></div>`;
}
export function bindKeypad(panel, onEnter, warn = () => {}, max = 6) {
  let v = '';
  const entry = panel.querySelector('[data-k="entry"]');
  const render = () => { entry.textContent = v || ' '; };
  panel.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.key;
    if (k === 'del') { if (!v) { warn('まだ なにも はいって いないよ'); return; } v = v.slice(0, -1); }
    else if (k === 'ok') { if (v) onEnter(+v); else warn('すうじを いれてから OK を おそう'); return; }
    else if (k === 'dot') { if (v.includes('.')) { warn('てんは 1つだけ'); return; } v = (v || '0') + '.'; }
    else if (v.length >= max) { warn('これ いじょう いれられないよ'); return; }
    else v = (v === '0' ? '' : v) + k;
    render();
  }));
  render();
  return { clear() { v = ''; render(); }, get value() { return v; }, set(x) { v = String(x); render(); } };
}
export function triples(V) {
  const out = [];
  for (let a = 1; a <= V; a++) for (let b = a; b <= V; b++) { if ((V / a) % b) continue; const c = V / a / b; if (Number.isInteger(c) && c >= b) out.push([a, b, c]); }
  return out;
}
export { disposeObject };
