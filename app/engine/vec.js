// 小さなベクトル計算（配列 [x,y,z] / [x,y]）。描画に依存しない。
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, s) => a.map(v => v * s);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.sqrt(dot(a, a));
export const norm = a => { const l = len(a); return l ? scale(a, 1 / l) : a; };
export const dist = (a, b) => len(sub(a, b));
export const mean = pts => scale(pts.reduce((s, p) => add(s, p), pts[0].map(() => 0)), 1 / pts.length);

// 4×4 行列（列優先、three.js の Matrix4.elements と同じ並び）
export const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function mul4(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
export function translate4(x, y, z) { const m = I4(); m[12] = x; m[13] = y; m[14] = z; return m; }
// 軸 (ax,ay,az)（単位ベクトル）まわりに角 t だけ回す
export function rotAxis4([x, y, z], t) {
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  return [
    x * x * C + c, y * x * C + z * s, z * x * C - y * s, 0,
    x * y * C - z * s, y * y * C + c, z * y * C + x * s, 0,
    x * z * C + y * s, y * z * C - x * s, z * z * C + c, 0,
    0, 0, 0, 1,
  ];
}
export const apply4 = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
export const applyDir4 = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
