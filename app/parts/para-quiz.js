// ためす「へいこう・すいちょく」（4年）：組み立てた箱で、★の面や辺に平行・垂直な面や辺をタッチして答える。
// 3段の難しさ・ヒント3段。答えたあと、正しい面や辺を光らせて確かめる。
import { S, THREE, tween, wait, alive, rayFrom, glow, stopGlows, burst, fitBox, spinCamera, col, plainMaterial, disposeObject, objScreen, toScreen } from '../stage/stage.js';
import { makeFoldNet, mountNet, frameBox, disposeNet } from '../stage/foldnet.js';
import { loadCatalog } from '../engine/catalog.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = {
  'face-par': { text: '★の めんと へいこうな めんを タッチしよう', what: 'face', rel: 'par' },
  'face-per': { text: '★の めんと すいちょくな めんを ぜんぶ タッチしよう', what: 'face', rel: 'per' },
  'edge-par': { text: '★の へんと へいこうな へんを ぜんぶ タッチしよう', what: 'edge', rel: 'par' },
  'edge-per': { text: '★の へんと すいちょくな へんを ぜんぶ タッチしよう', what: 'edge', rel: 'per' },
};
const SPEC = { easy: [['cube', 'face-par'], ['cuboid', 'face-par'], ['cuboid', 'face-par'], ['cube', 'face-per']], normal: [['cuboid', 'face-par'], ['cuboid', 'face-per'], ['cuboid', 'edge-par'], ['cube', 'edge-par']], challenge: [['cuboid', 'face-per'], ['cuboid', 'edge-par'], ['cuboid', 'edge-per'], ['cube', 'edge-per']] };

function rod(a, b, hex, r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.45 })); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); return m; }

export function mount(ctx) {
  const { panel, sfx, toast, ICON, opts } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let net = null, picks = new Set(), marks = [], hitRods = [];
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="ansRow"><span class="status" data-k="picked"></span><button class="btn big" type="button" data-k="answer" disabled>こたえる</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clearMarks = () => { marks.forEach(m => { m.parent && m.parent.remove(m); disposeObject(m); }); marks = []; };

  async function start() {
    const tag = S.token;
    const cats = { cube: await loadCatalog('cube'), cuboid: await loadCatalog('cuboid') }; if (!alive(tag)) return;
    quiz.list = shuffle(SPEC[quiz.level].map(([s, t]) => ({ solid: s, type: t, cat: cats[s] })));
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    stopGlows(); clearMarks(); if (net) { disposeNet(net); net = null; }
    quiz.hints = 0; quiz.phase = 'ask'; picks = new Set();
    q$('hd').innerHTML = hintDots(0); q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('ansRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i], L = q.cat.layout(1 + Math.floor(Math.random() * q.cat.count));
    net = mountNet(makeFoldNet(L, L.faces.map(() => tok('quiz-paper'))), V3(0, 0, 0));
    // 箱を少し浮かせて、指で転がして回せるようにする（底の面も見られる）
    net.setProgress(1); net.holder.position.set(0, net.half.length() + 0.08, -0.5); net.home = net.holder.position.clone();
    const sol = net.solid, V = sol.verts.map(v => V3(...v));
    q.V = V;
    S.allowRotate = true; frameBox(net, 0.95, 0.62, 1.55);
    net.holder.updateMatrixWorld(true);
    const cam = new THREE.Vector3().copy(S.goal.target).add(new THREE.Vector3().setFromSphericalCoords(S.goal.radius, S.goal.phi, S.goal.theta));
    const seen = fi => { const f = net.folded[fi], c = V3(...f.center).applyMatrix4(net.overlay.matrixWorld), nn = V3(...f.inward).negate(); return nn.dot(cam.clone().sub(c)) > 0.05; };
    const front = L.faces.map((f, i) => i).filter(seen);
    q.edges = sol.edges.map(e => ({ a: V[e.v[0]], b: V[e.v[1]] }));
    if (Q[q.type].what === 'face') {
      q.star = front[Math.floor(Math.random() * front.length)];
      const n0 = V3(...net.folded[q.star].inward);
      q.answer = new Set(L.faces.map((f, j) => j).filter(j => j !== q.star && (Q[q.type].rel === 'par' ? Math.abs(n0.dot(V3(...net.folded[j].inward)) + 1) < 1e-3 : Math.abs(n0.dot(V3(...net.folded[j].inward))) < 1e-3)));
      net.addBadge(q.star, '★', tok('yamabuki'), tok('ink'), 0.36);
    } else {
      const vis = sol.edges.map((e, j) => j).filter(j => sol.edges[j].f.some(seen));
      q.star = vis[Math.floor(Math.random() * vis.length)];
      const s = q.edges[q.star], d = s.b.clone().sub(s.a).normalize();
      q.answer = new Set(q.edges.map((e, j) => j).filter(j => {
        if (j === q.star) return false;
        const e = q.edges[j], dd = e.b.clone().sub(e.a).normalize(), touch = [e.a, e.b].some(p => p.distanceTo(s.a) < 1e-3 || p.distanceTo(s.b) < 1e-3);
        return Q[q.type].rel === 'par' ? Math.abs(Math.abs(dd.dot(d)) - 1) < 1e-3 : touch && Math.abs(dd.dot(d)) < 1e-3;
      }));
      const r = rod(s.a, s.b, tok('yamabuki'), 0.05); net.overlay.add(r); marks.push(r);
      const lab = ctx.S && null;
    }
    // 辺をタッチしやすくする見えない太い棒
    hitRods = q.edges.map((e, j) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, e.a.distanceTo(e.b) * 0.86, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(e.a).add(e.b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), e.b.clone().sub(e.a).normalize()); m.userData.edge = j; net.overlay.add(m); marks.push(m); return m; });
    q$('qTxt').textContent = Q[q.type].text; ctx.say(Q[q.type].text);
    renderPicks();
  }
  function renderPicks() {
    const q = quiz.list[quiz.i];
    q$('picked').innerHTML = `えらんだ ${Q[q.type].what === 'face' ? 'めん' : 'へん'} <b>${picks.size}</b>`;
    q$('answer').disabled = picks.size === 0;
    marks.filter(m => m.userData.pick).forEach(m => { m.parent.remove(m); disposeObject(m); });
    marks = marks.filter(m => !m.userData.pick);
    net.nodes.forEach((n, i) => { n.mat.color.copy(col(i === q.star && Q[q.type].what === 'face' ? tok('quiz-paper') : tok('quiz-paper'))); });
    for (const p of picks) {
      if (Q[q.type].what === 'face') net.nodes[p].mat.color.copy(col(tok('sora-soft')));
      else { const e = q.edges[p], r = rod(e.a, e.b, tok('flat-blue'), 0.045); r.userData.pick = true; net.overlay.add(r); marks.push(r); }
    }
  }
  on(q$('hint'), 'click', async () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i], k = Q[q.type];
    if (quiz.hints === 1) toast(ICON.HINT, k.what === 'face' ? (k.rel === 'par' ? 'へいこうな めんは、むかいあって いる めんだよ' : 'すいちょくな めんは、★の めんの となりに あるよ') : (k.rel === 'par' ? 'おなじ むきに のびて いる へんを さがそう' : '★の へんの はしに くっついて いる へんを さがそう'), 3.2);
    else if (quiz.hints === 2) { await spinCamera(2.4, Math.PI); toast(ICON.HINT, 'まわして うらがわも みて みよう', 2.4); }
    else { const one = [...q.answer][0]; if (k.what === 'face') glow(net.nodes[one].mesh, tok('glow-blue'), 3, 0.6); else { const e = q.edges[one], r = rod(e.a, e.b, tok('glow-blue'), 0.03); net.overlay.add(r); marks.push(r); } toast(ICON.HINT, 'ひかった ところは こたえの 1つ', 2.6); }
  });
  on(q$('answer'), 'click', async () => {
    if (quiz.phase !== 'ask' || !picks.size) return;
    sfx.tap(); const q = quiz.list[quiz.i], tag = S.token;
    quiz.phase = 'done';
    const correct = picks.size === q.answer.size && [...picks].every(p => q.answer.has(p));
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    // こたえを見せる：正しいものは青、まちがって選んだものは赤
    if (Q[q.type].what === 'face') {
      q.answer.forEach(j => { glow(net.nodes[j].mesh, tok('flat-blue'), 3, 0.7, 0.4); S.held.add(net.nodes[j].mat); });
      picks.forEach(j => { if (!q.answer.has(j)) { glow(net.nodes[j].mesh, tok('glow-red'), 3, 0.7, 0.4); S.held.add(net.nodes[j].mat); } });
    } else {
      q.answer.forEach(j => { const e = q.edges[j], r = rod(e.a, e.b, tok('flat-blue'), 0.05); net.overlay.add(r); marks.push(r); });
      picks.forEach(j => { if (!q.answer.has(j)) { const e = q.edges[j], r = rod(e.a, e.b, tok('glow-red'), 0.05); net.overlay.add(r); marks.push(r); } });
    }
    spinCamera(3, Math.PI * 0.8);
    if (correct) { sfx.good(); burst(net.home); toast(ICON.HANAMARU, `せいかい！ ${q.answer.size}つ ぜんぶ みつけたね`, 3); }
    else { sfx.bad(); toast(ICON.X, `あおい ところが こたえ（${q.answer.size}つ）だよ`, 3.2); }
    ctx.log('para-perp', { correct, hints: quiz.hints, level: quiz.level, detail: { type: q.type, solid: q.solid, n: q.answer.size, picked: picks.size } });
    q$('q').hidden = true; q$('ansRow').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('ansRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('para-perp-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  // ドラッグで箱を回す（カメラではなく箱を回すので、どの面も前に出せる）
  let last = null;
  S.onDrag = (phase, e) => {
    if (!net) return false;
    if (phase === 'start') { last = { x: e.clientX, y: e.clientY }; return true; }
    if (phase === 'move' && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
      S.camera.updateMatrixWorld(true);
      const right = new THREE.Vector3().setFromMatrixColumn(S.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(S.camera.matrixWorld, 1);
      const qy = new THREE.Quaternion().setFromAxisAngle(up, dx * 0.012), qx = new THREE.Quaternion().setFromAxisAngle(right, dy * 0.012);
      net.holder.quaternion.premultiply(qy).premultiply(qx);
    }
    if (phase === 'end') last = null;
    return true;
  };
  start();
  return {
    onTap(e) {
      if (quiz.phase !== 'ask' || !net) return;
      const q = quiz.list[quiz.i], ray = rayFrom(e);
      let idx = -1;
      if (Q[q.type].what === 'edge') {
        net.overlay.updateMatrixWorld(true); let bd = 0.16 * 0.16;
        q.edges.forEach((x, j) => { const d = ray.ray.distanceSqToSegment(x.a.clone().applyMatrix4(net.overlay.matrixWorld), x.b.clone().applyMatrix4(net.overlay.matrixWorld)); if (d < bd) { bd = d; idx = j; } });
        if (idx === q.star) { toast('', 'それは ★の へんだよ', 1.8); return; }
      }
      else { const h = ray.intersectObjects(net.meshes(), false)[0]; if (h) idx = h.object.userData.face; if (idx === q.star) { toast('', 'それは ★の めんだよ', 1.8); return; } }
      if (idx < 0) return;
      if (picks.has(idx)) { picks.delete(idx); sfx.off(); } else { picks.add(idx); sfx.pop(); }
      renderPicks();
    },
    onResize() { if (net) frameBox(net, S.goal.phi, S.goal.theta, 1.55); },
    dispose() { clearMarks(); },
    test: {
      auto() {
        const q = quiz.list[quiz.i]; if (!q || !net) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        const miss = [...q.answer].find(j => !picks.has(j));
        if (miss == null) return { click: 'data-k=answer|' };
        if (Q[q.type].what === 'face' && this.visibleFace([miss]) == null) return { drag: [150, 0] };
        const p = Q[q.type].what === 'face' ? this.facePoint(miss) : this.edgePoint(miss);
        return { tap: p };
      },
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, type: q.type, what: Q[q.type].what, answer: [...q.answer], picks: [...picks] }; },
      facePoint: i => objScreen(net.nodes[i].mesh, V3(net.nodes[i].center[0], 0.03, net.nodes[i].center[1])),
      edgePoint: j => { const q = quiz.list[quiz.i], e = q.edges[j]; net.overlay.updateMatrixWorld(true); return toScreen(e.a.clone().lerp(e.b, 0.5).applyMatrix4(net.overlay.matrixWorld)); },
      visibleFace: list => { net.overlay.updateMatrixWorld(true); return list.find(i => { const c = V3(...net.folded[i].center).applyMatrix4(net.overlay.matrixWorld), nn = V3(...net.folded[i].inward).negate().transformDirection(net.overlay.matrixWorld); return nn.dot(S.camera.position.clone().sub(c).normalize()) > 0.25; }); },
    },
  };
}
