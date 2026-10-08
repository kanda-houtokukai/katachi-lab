// 閉じた立体をそのまま描く（多面体・円柱・円錐・球）。数える・見比べる・体積の活動で使う。
import { THREE, faceMaterial, plainMaterial, col } from './stage.js';

// 多面体 P（頂点 V、面 F）を、面ごとの色で1つのメッシュにする。底が y=0 に来るよう、軸を y にそろえる
export function polyMesh(P, colorOf, opts = {}) {
  const pos = [], groups = [];
  // z を上向きの軸として作った立体を、y が上になるよう置きかえる（x, z→y, y→-z）
  const T = v => [v[0], v[2], -v[1]];
  P.F.forEach((f, fi) => {
    const start = pos.length / 3;
    for (let k = 1; k < f.length - 1; k++) for (const i of [f[0], f[k], f[k + 1]]) pos.push(...T(P.V[i]));
    groups.push([start, pos.length / 3 - start, fi]);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  groups.forEach(([s, c, fi]) => g.addGroup(s, c, fi)); g.computeVertexNormals();
  const mats = P.F.map((f, fi) => (opts.plain ? plainMaterial(colorOf(fi)) : faceMaterial(colorOf(fi), { side: THREE.DoubleSide })));
  const m = new THREE.Mesh(g, mats); m.castShadow = m.receiveShadow = true;
  const box = new THREE.Box3().setFromBufferAttribute(g.getAttribute('position'));
  m.position.y = -box.min.y; m.position.x = -(box.min.x + box.max.x) / 2; m.position.z = -(box.min.z + box.max.z) / 2;
  const grp = new THREE.Group(); grp.add(m);
  grp.userData = { P, T, mesh: m, mats, size: box.getSize(new THREE.Vector3()) };
  return grp;
}
// 頂点（立体の座標）を、polyMesh の中の座標へ
export function polyPoint(grp, v) { const [x, y, z] = grp.userData.T(v); return new THREE.Vector3(x, y, z).add(grp.userData.mesh.position); }

export function cylinderMesh(r, h, sideHex, capHex, seg = 48) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false);
  const m = new THREE.Mesh(g, [faceMaterial(sideHex), faceMaterial(capHex), faceMaterial(capHex)]);
  m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m); return grp;
}
export function coneMesh(r, h, sideHex, capHex, seg = 48) {
  const g = new THREE.ConeGeometry(r, h, seg, 1, false);
  const m = new THREE.Mesh(g, [faceMaterial(sideHex), faceMaterial(capHex)]);
  m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m); return grp;
}
export function sphereMesh(r, hex) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), faceMaterial(hex));
  m.position.y = r; m.castShadow = m.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m); return grp;
}
export function rod(a, b, hex, r = 0.03, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), plainMaterial(hex, Object.assign({ emissive: col(hex), emissiveIntensity: 0.35 }, extra)));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
export function ball(p, hex, r = 0.08) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.4 })); m.position.copy(p); return m; }
