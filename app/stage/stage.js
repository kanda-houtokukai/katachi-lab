// 3D の土台（マット、光、影、カメラの枠どり、紙ふぶき、アニメーション）。見本v2 から移したもの。
import * as THREE from '../../vendor/three.module.js';
import { tok, faceColors } from '../core/theme.js';
import { R } from '../core/records.js';

export { THREE };
const params = new URLSearchParams(location.search);
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const speedParam = +params.get('speed') || 1;
export const motion = { speed: speedParam };
const SPEED = () => (reduceMotion || R.settings.motion === 'less' ? 0.35 : 1) * motion.speed;
export const col = h => new THREE.Color(h).convertSRGBToLinear();

export const S = {
  THREE, ok: false, renderer: null, scene: null, camera: null, stage: null,
  view: { W: 1, H: 1, top: 70, bottom: 200 },
  rig: { theta: 0.5, phi: 0.95, radius: 10, target: new THREE.Vector3(0, 0, -0.5) },
  goal: { theta: 0.5, phi: 0.95, radius: 10, target: new THREE.Vector3(0, 0, -0.5) },
  allowRotate: true, token: {}, onTap: null, onUserTouch: null, onDrag: null, lastFit: null, camEpoch: 0,
  tweens: new Set(), pulses: new Set(), held: new Set(), ghosts: null, idle: true,
};

/* ---------- アニメーション ---------- */
export function newToken() { S.token = {}; return S.token; }
export const alive = tag => tag === S.token;
export function tween(dur, fn, ease = t => t) {
  const tag = S.token;
  return new Promise(res => { S.tweens.add({ t0: performance.now(), dur: Math.max(1, dur * 1000 * SPEED()), fn, ease, res, tag }); });
}
export const wait = s => { const tag = S.token; return new Promise(r => setTimeout(() => r(tag === S.token), s * 1000 * SPEED())); };
export function killTweens() { for (const t of S.tweens) { S.tweens.delete(t); t.res(); } }
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutBounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
export const speedNow = SPEED;

/* ---------- 光らせる ---------- */
export function glow(mesh, hex, times = 3, strength = 0.55, hold = 0) {
  const m = mesh.material; if (!m || !m.emissive) return null;
  const p = { m, c: col(hex), t0: performance.now(), dur: times * 700, strength, hold }; S.pulses.add(p); return p;
}
export function holdGlow(mesh, hex, strength = 0.38) { const m = mesh.material; if (!m || !m.emissive) return; m.emissive.copy(col(hex)).multiplyScalar(strength); S.held.add(m); }
export function stopGlows() { for (const p of S.pulses) p.m.emissive.setRGB(0, 0, 0); S.pulses.clear(); for (const m of S.held) m.emissive.setRGB(0, 0, 0); S.held.clear(); }

/* ---------- カメラ ---------- */
const isPortrait = () => S.view.H - S.view.top - S.view.bottom > S.view.W * 1.05;
export { isPortrait };
function placeCamera() { S.camera.position.copy(S.rig.target).add(new THREE.Vector3().setFromSphericalCoords(S.rig.radius, S.rig.phi, S.rig.theta)); S.camera.lookAt(S.rig.target); }
// 回転の世代番号：枠どりのたびに進め、古い回転を無効にする（見本v2 の落とし穴）
export function spinCamera(dur, amount) {
  const e = ++S.camEpoch, th0 = S.goal.theta;
  return tween(dur, k => { if (S.camEpoch === e) S.goal.theta = th0 + amount * easeInOut(k); });
}
export function fitBox(box, phi, theta, pad = 1.12, refit = false) {
  if (!refit) { S.camEpoch++; S.lastFit = { box: box.clone(), pad }; }
  const { view, camera, goal } = S;
  const tgt = box.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera();
  cam.position.copy(tgt).add(new THREE.Vector3().setFromSphericalCoords(1, phi, theta)); cam.lookAt(tgt);
  const qi = cam.quaternion.clone().invert();
  const visH = Math.max(120, view.H - view.top - view.bottom), visW = Math.max(120, view.W - 32);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (visH / view.H);
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (view.W / view.H) * (visW / view.W);
  let d = 2; const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(tgt).applyQuaternion(qi);
    d = Math.max(d, p.z + Math.abs(p.x) / tanH, p.z + Math.abs(p.y) / tanV);
  }
  goal.target.copy(tgt); goal.phi = phi; goal.theta = theta; goal.radius = Math.min(34, d * pad);
}
export function snapCamera() { S.rig.theta = S.goal.theta; S.rig.phi = S.goal.phi; S.rig.radius = S.goal.radius; S.rig.target.copy(S.goal.target); }
const raycaster = new THREE.Raycaster();
export function rayFrom(e) {
  const r = S.renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), S.camera);
  return raycaster;
}
// マットの面（y=0）と当たった点
export function groundPoint(e, y = 0) {
  const ray = rayFrom(e).ray, t = (y - ray.origin.y) / ray.direction.y;
  if (!isFinite(t) || t < 0) return null;
  return ray.origin.clone().addScaledVector(ray.direction, t);
}

/* ---------- 紙ふぶき ---------- */
const CONF_N = 70;
let confetti = null, confT = 0;
const confState = [];
export function burst(at) {
  if (reduceMotion || R.settings.motion === 'less') return;
  confState.forEach(s => {
    s.p.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4));
    const a = Math.random() * Math.PI * 2, sp = 1.4 + Math.random() * 2.2;
    s.v.set(Math.cos(a) * sp, 3.2 + Math.random() * 2.6, Math.sin(a) * sp);
    s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
  });
  confT = 2.6; confetti.visible = true;
}
export function stopConfetti() { confT = 0; if (confetti) confetti.visible = false; }
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1);
function stepConfetti(dt) {
  if (confT <= 0) return;
  confT -= dt;
  confState.forEach((s, i) => {
    s.v.y -= 7.5 * dt; s.v.multiplyScalar(1 - 1.6 * dt); s.p.addScaledVector(s.v, dt);
    if (s.p.y < 0.01) { s.p.y = 0.01; s.v.set(0, 0, 0); s.w.multiplyScalar(0.8); }
    s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
    tmpQ.setFromEuler(s.r); tmpS.setScalar(Math.min(1, confT / 0.6));
    confetti.setMatrixAt(i, tmpM.compose(s.p, tmpQ, tmpS));
  });
  confetti.instanceMatrix.needsUpdate = true;
  if (confT <= 0) confetti.visible = false;
}

/* ---------- 紙の質感・面の材料・番号の札 ---------- */
export let paperTex = null;
export const keepTex = new Set();
function makePaperTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f6f6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 225 + Math.random() * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
  g.globalAlpha = 0.18; g.strokeStyle = '#cfcfcf'; g.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) { const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * Math.PI, l = 4 + Math.random() * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}
export function faceMaterial(hex, extra = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: 0.86, metalness: 0, map: paperTex, bumpMap: paperTex, bumpScale: 0.0016, emissive: new THREE.Color(0x000000) }, extra));
}
export function plainMaterial(hex, extra = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: 0.7, metalness: 0, emissive: new THREE.Color(0x000000) }, extra)); }
export function badge(text, bg = tok('ink'), fg = '#ffffff') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill(); g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.stroke();
  const fs = String(text).length > 2 ? 44 : 66;
  g.fillStyle = fg; g.font = `600 ${fs}px "Klee One", "Zen Maru Gothic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); s.scale.set(0.001, 0.001, 1); s.renderOrder = 10;
  return s;
}
// 文字の札（横長）
export function labelSprite(text, { bg = tok('paper'), fg = tok('ink'), h = 0.34 } = {}) {
  const c = document.createElement('canvas'), g0 = c.getContext('2d');
  g0.font = '600 56px "Klee One", "Zen Maru Gothic", sans-serif';
  const w = Math.ceil(g0.measureText(text).width) + 48; c.width = w; c.height = 84;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(2, 2, w - 4, 80, 30) : g.rect(2, 2, w - 4, 80); g.fill(); g.lineWidth = 4; g.strokeStyle = tok('line'); g.stroke();
  g.fillStyle = fg; g.font = '600 56px "Klee One", "Zen Maru Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 46);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 12;
  s.scale.set(h * w / 84, h, 1);
  return s;
}
export function growSprite(s, size = 0.32) { return tween(0.32, k => s.scale.setScalar(Math.max(0.001, size * k)), easeOutBack); }
export function disposeObject(o) {
  o.traverse(x => {
    if (x.geometry && !x.geometry.userData.keep) x.geometry.dispose();
    const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : [];
    ms.forEach(m => { if (m.userData && m.userData.keep) return; if (m.map && !keepTex.has(m.map)) m.map.dispose(); m.dispose(); });
  });
}

/* ---------- マット ---------- */
const MAT = { w: 12, d: 9, x0: -6, z0: -5 };
export { MAT };
let matTop = null, matTex = null;
function makeMatTexture() {
  const P = 160, W = MAT.w * P, H = MAT.d * P;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = tok('mat'); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 22000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  const inset = P * 0.2;
  const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 1.6;
  for (let x = inset; x <= W - inset + 1; x += P / 5) line(x, inset, x, H - inset);
  for (let y = inset; y <= H - inset + 1; y += P / 5) line(inset, y, W - inset, y);
  g.strokeStyle = 'rgba(255,255,255,0.36)'; g.lineWidth = 2.6;
  for (let x = P; x <= W - P; x += P) line(x, inset, x, H - inset);
  for (let y = P; y <= H - P; y += P) line(inset, y, W - inset, y);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 2;
  line(inset, H - inset, inset + (H - inset * 2), inset);
  g.save(); g.translate(W - inset, H - inset); g.rotate(-Math.PI / 3); line(0, 0, H * 0.55, 0); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.62)';
  g.font = '700 21px "Zen Maru Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 1; k < MAT.w; k++) g.fillText(String(k * 5), k * P, inset / 2 + 1);
  for (let k = 1; k < MAT.d; k++) { g.save(); g.translate(inset / 2, k * P); g.rotate(-Math.PI / 2); g.fillText(String(k * 5), 0, 1); g.restore(); }
  g.textAlign = 'right'; g.font = '700 16px "Zen Maru Gothic", sans-serif'; g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillText('cm   A2  600 × 450 mm', W - inset - 10, H - inset / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = S.renderer.capabilities.getMaxAnisotropy();
  return t;
}
export const showMat = v => { if (S.matMesh) S.matMesh.visible = v; };

/* ---------- 大きさ ---------- */
export function measure() {
  const app = document.getElementById('app');
  const r = app.getBoundingClientRect();
  S.view.W = r.width; S.view.H = r.height;
  const top = document.getElementById('topBar'), dock = document.getElementById('dock');
  const head = top.hidden ? { bottom: r.top + 60 } : top.getBoundingClientRect();
  const dk = dock.hidden ? { top: r.bottom } : dock.getBoundingClientRect();
  S.view.top = head.bottom - r.top + 54; S.view.bottom = r.bottom - dk.top + 8;
  if (!S.ok) return;
  S.renderer.setSize(S.view.W, S.view.H, false); S.camera.aspect = S.view.W / S.view.H;
  const visCenter = (S.view.top + (S.view.H - S.view.bottom)) / 2;
  S.camera.setViewOffset(S.view.W, S.view.H, 0, S.view.H / 2 - visCenter, S.view.W, S.view.H); S.camera.updateProjectionMatrix();
}

/* ---------- はじまり ---------- */
export function initStage(canvas) {
  try { S.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false }); }
  catch (e) { return false; }
  const { renderer } = S;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = S.scene = new THREE.Scene();
  S.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(col(tok('light-sky')), col(tok('light-ground')), 0.62));
  const sun = new THREE.DirectionalLight(col(tok('light-sun')), 0.88);
  sun.position.set(-4.5, 10, 6.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(col(tok('light-fill')), 0.22); fill.position.set(6, 4, -5); scene.add(fill);
  paperTex = makePaperTex(); keepTex.add(paperTex);
  matTex = makeMatTexture();
  const matSide = new THREE.MeshStandardMaterial({ color: col(tok('mat-side')), roughness: 0.9 });
  matTop = new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.92 });
  const matMesh = S.matMesh = new THREE.Mesh(new THREE.BoxGeometry(MAT.w, 0.06, MAT.d), [matSide, matSide, matTop, matSide, matSide, matSide]);
  matMesh.position.set(MAT.x0 + MAT.w / 2, -0.03, MAT.z0 + MAT.d / 2); matMesh.receiveShadow = true; matMesh.castShadow = true;
  scene.add(matMesh);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.062; catcher.receiveShadow = true; scene.add(catcher);
  S.stage = new THREE.Group(); scene.add(S.stage);
  S.ghosts = new THREE.Group(); scene.add(S.ghosts);
  confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.075, 0.12), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), CONF_N);
  confetti.visible = false; confetti.frustumCulled = false; scene.add(confetti);
  const pal = faceColors();
  for (let i = 0; i < CONF_N; i++) { confetti.setColorAt(i, col(pal[i % pal.length])); confState.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }); }
  confetti.instanceColor.needsUpdate = true;
  setupPointers(canvas);
  S.ok = true;
  // 字体が届いたらマットの文字を描き直す
  const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 21px "Zen Maru Gothic"'), document.fonts.load('600 40px "Klee One"')]).catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(() => { const t2 = makeMatTexture(); matTop.map = t2; matTop.needsUpdate = true; matTex.dispose(); matTex = t2; });
  requestAnimationFrame(frame);
  return true;
}

/* ---------- 指の操作 ---------- */
function setupPointers(canvas) {
  const pointers = new Map(); let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, custom: S.onDrag ? S.onDrag('start', e) : false };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: S.goal.radius }; drag = null; }
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; S.goal.radius = THREE.MathUtils.clamp(pinch.r * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 3, 34); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 9) drag.moved = true;
    if (drag.custom) { S.onDrag && S.onDrag('move', e); return; }
    if (drag.moved && S.allowRotate) {
      S.goal.theta -= dx * 0.009; S.rig.theta = S.goal.theta;
      S.goal.phi = THREE.MathUtils.clamp(S.goal.phi - dy * 0.007, 0.06, 1.38); S.rig.phi = S.goal.phi;
      S.onUserTouch && S.onUserTouch();
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (drag && drag.custom) S.onDrag && S.onDrag('end', e);
    else if (drag && !drag.moved && pointers.size === 0 && S.onTap) S.onTap(e);
    if (pointers.size < 2) pinch = null; if (pointers.size === 0) drag = null;
  });
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.goal.radius = THREE.MathUtils.clamp(S.goal.radius * (1 + e.deltaY * 0.0012), 3, 34); }, { passive: false });
}

/* ---------- 毎フレーム ---------- */
const frameHooks = new Set();
export const onFrame = fn => { frameHooks.add(fn); return () => frameHooks.delete(fn); };
let last = performance.now(), lastCam = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const t of S.tweens) { const k = Math.min(1, (now - t.t0) / t.dur); t.fn(t.ease(k)); if (k >= 1) { S.tweens.delete(t); t.res(); } }
  for (const p of S.pulses) {
    const k = (now - p.t0) / p.dur;
    if (k >= 1) { if (p.hold) p.m.emissive.copy(p.c).multiplyScalar(p.hold); else p.m.emissive.setRGB(0, 0, 0); S.pulses.delete(p); continue; }
    if (p.hold && k > (p.dur - 350) / p.dur) { p.m.emissive.copy(p.c).multiplyScalar(p.hold); continue; }
    p.m.emissive.copy(p.c).multiplyScalar((0.5 - 0.5 * Math.cos(k * p.dur / 700 * Math.PI * 2)) * p.strength);
  }
  for (const g of S.ghosts.children) if (g.material && g.material.userData.pulse) g.material.opacity = 0.22 + 0.16 * (0.5 + 0.5 * Math.sin(now / 380));
  for (const f of frameHooks) f(dt, now);
  // カメラの追従は経過時間で決める（フレーム数に依存させない）
  const f = 1 - Math.exp(-Math.min(0.25, (now - lastCam) / 1000) * 5.5); lastCam = now;
  const { rig, goal } = S;
  rig.theta += (goal.theta - rig.theta) * f; rig.phi += (goal.phi - rig.phi) * f; rig.radius += (goal.radius - rig.radius) * f; rig.target.lerp(goal.target, f);
  placeCamera(); stepConfetti(dt);
  S.renderer.render(S.scene, S.camera);
  S.idle = S.tweens.size === 0 && Math.abs(goal.theta - rig.theta) < 0.01 && Math.abs(goal.phi - rig.phi) < 0.01 && Math.abs(goal.radius - rig.radius) < 0.05 && rig.target.distanceTo(goal.target) < 0.02;
  requestAnimationFrame(frame);
}
