// ためす「みとりずを かんせい させよう」（4年）：見えない辺をタッチして点線にする。こたえあわせで箱を回して確かめる。
import { S, THREE, tween, wait, alive, rayFrom, stopGlows, burst, fitBox, spinCamera, col, plainMaterial, disposeObject, toScreen, snapCamera } from '../stage/stage.js';
import { makeFoldNet, mountNet, frameBox, disposeNet } from '../stage/foldnet.js';
import { loadCatalog } from '../engine/catalog.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SPEC = { easy: ['cube', 'cuboid'], normal: ['cube', 'cuboid', 'sq-prism'], challenge: ['cuboid', 'sq-prism', 'cuboid', 'cube'] };
const VIEWS = [[0.95, 0.62], [0.9, -0.7], [1.05, 2.4], [0.85, 3.6]];

export function mount(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let net = null, objs = [], edges = [], dashed = new Set();
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt">みえない へんを タッチして てんせんに しよう</span></div>
    <div class="row" data-k="ansRow"><span class="status" data-k="picked"></span><button class="btn big" type="button" data-k="answer">こたえあわせ</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clear = () => { objs.forEach(o => { o.parent && o.parent.remove(o); disposeObject(o); }); objs = []; };
  const ink = () => tok('ink');
  function rodMesh(a, b, hex, r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), plainMaterial(hex, { depthTest: false })); m.renderOrder = 20; m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); return m; }

  async function start() {
    const tag = S.token, cats = {};
    for (const s of new Set(SPEC[quiz.level])) cats[s] = await loadCatalog(s);
    if (!alive(tag)) return;
    quiz.list = SPEC[quiz.level].map((s, i) => ({ solid: s, cat: cats[s], view: VIEWS[(i + Math.floor(Math.random() * 4)) % 4] }));
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    stopGlows(); clear(); if (net) { disposeNet(net); net = null; }
    quiz.hints = 0; quiz.phase = 'ask'; dashed = new Set();
    q$('hd').innerHTML = hintDots(0); q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('ansRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i], L = q.cat.layout(1);
    net = mountNet(makeFoldNet(L, L.faces.map(() => tok('paper'))), V3(0, 0, 0));
    net.setProgress(1); net.holder.position.set(0, net.half.y, -0.5); net.home = net.holder.position.clone();
    net.nodes.forEach(n => { n.mat.transparent = true; n.mat.opacity = 0.35; n.mat.depthWrite = false; });
    const V = net.solid.verts.map(v => V3(...v));
    edges = net.solid.edges.map((e, j) => {
      const a = V[e.v[0]], b = V[e.v[1]], g = new THREE.Group();
      const solid = rodMesh(a, b, ink(), 0.022); g.add(solid);
      const dash = new THREE.Group(), n = Math.max(3, Math.round(a.distanceTo(b) / 0.16));
      for (let k = 0; k < n; k += 2) dash.add(rodMesh(a.clone().lerp(b, k / n), a.clone().lerp(b, Math.min(1, (k + 1) / n)), ink(), 0.022));
      dash.visible = false; g.add(dash);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, a.distanceTo(b) * 0.8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(a).add(b).multiplyScalar(0.5); hit.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); hit.userData.edge = j; g.add(hit);
      net.overlay.add(g); objs.push(g);
      return { e, a, b, solid, dash, hit };
    });
    S.allowRotate = false; frameBox(net, q.view[0], q.view[1], 1.6); snapCamera();
    // 今の見え方で隠れる辺（どちらの面も向こうを向いている辺）
    net.holder.updateMatrixWorld(true);
    const camPos = new THREE.PerspectiveCamera(); camPos.position.copy(S.goal.target).add(new THREE.Vector3().setFromSphericalCoords(S.goal.radius, S.goal.phi, S.goal.theta));
    const front = fi => { const f = net.folded[fi], c = V3(...f.center).applyMatrix4(net.overlay.matrixWorld), nn = V3(...f.inward).negate(); return nn.dot(camPos.position.clone().sub(c)) > 1e-3; };
    q.hidden = new Set(edges.map((x, j) => j).filter(j => !edges[j].e.f.some(front)));
    q$('picked').innerHTML = `てんせん <b>0</b>`;
    ctx.say('みえない へんを タッチして てんせんに しよう');
  }
  function toggle(j) {
    const x = edges[j]; if (dashed.has(j)) dashed.delete(j); else dashed.add(j);
    x.dash.visible = dashed.has(j); x.solid.visible = !dashed.has(j);
    q$('picked').innerHTML = `てんせん <b>${dashed.size}</b>`;
  }
  on(q$('hint'), 'click', async () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (quiz.hints === 1) toast(ICON.HINT, `みえない へんは ${q.hidden.size}ほん あるよ`, 2.8);
    else if (quiz.hints === 2) {
      // 面を いっしゅん 不透明にして、かくれる辺を見せる
      net.nodes.forEach(n => { n.mat.opacity = 1; n.mat.depthWrite = true; });
      edges.forEach(x => { x.solid.material.depthTest = true; x.dash.children.forEach(c => (c.material.depthTest = true)); });
      toast(ICON.HINT, 'かべで かくれる へんは どれかな', 2.4);
      const tag = S.token; if (!(await wait(1.6)) || !alive(tag)) return;
      net.nodes.forEach(n => { n.mat.opacity = 0.35; n.mat.depthWrite = false; });
      edges.forEach(x => { x.solid.material.depthTest = false; x.dash.children.forEach(c => (c.material.depthTest = false)); });
    } else { const j = [...q.hidden].find(k => !dashed.has(k)); if (j != null) { toggle(j); toast(ICON.HINT, '1ほん てんせんに したよ', 2.2); } }
  });
  on(q$('answer'), 'click', async () => {
    if (quiz.phase !== 'ask') return;
    sfx.tap(); const q = quiz.list[quiz.i];
    quiz.phase = 'done';
    const correct = dashed.size === q.hidden.size && [...dashed].every(j => q.hidden.has(j));
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    edges.forEach((x, j) => { const want = q.hidden.has(j), got = dashed.has(j); if (want !== got) { x.dash.children.forEach(c => c.material.color.copy(col(tok('glow-red')))); x.solid.material.color.copy(col(tok('glow-red'))); } });
    edges.forEach((x, j) => { x.dash.visible = q.hidden.has(j); x.solid.visible = !q.hidden.has(j); });
    S.allowRotate = true; spinCamera(3.2, Math.PI * 0.6);
    if (correct) { sfx.good(); burst(net.home); toast(ICON.HANAMARU, 'せいかい！ みとりずが かけたね', 3); }
    else { sfx.bad(); toast(ICON.X, `みえない へんは ${q.hidden.size}ほん。あかい へんを みなおそう`, 3.2); }
    ctx.log('sketch', { correct, hints: quiz.hints, level: quiz.level, detail: { solid: q.solid, hidden: q.hidden.size, picked: dashed.size } });
    q$('q').hidden = true; q$('ansRow').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('ansRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('sketch-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    onTap(e) {
      if (quiz.phase !== 'ask' || !net) return;
      // 画面の上で、タッチした所にいちばん近い辺をえらぶ（手前の辺に吸われないように）
      const ray = rayFrom(e).ray; net.overlay.updateMatrixWorld(true);
      let best = -1, bd = 0.16 * 0.16;
      edges.forEach((x, j) => { const a = x.a.clone().applyMatrix4(net.overlay.matrixWorld), b = x.b.clone().applyMatrix4(net.overlay.matrixWorld); const d = ray.distanceSqToSegment(a, b); if (d < bd) { bd = d; best = j; } });
      if (best < 0) return;
      sfx.pop(); toggle(best);
    },
    onResize() { if (net) frameBox(net, S.goal.phi, S.goal.theta, 1.6); },
    dispose() { clear(); },
    test: {
      auto() {
        const q = quiz.list[quiz.i]; if (!q || !net) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        const wrong = [...dashed].find(j => !q.hidden.has(j)); if (wrong != null) return { tap: this.edgePoint(wrong) };
        const miss = [...q.hidden].find(j => !dashed.has(j)); if (miss != null) return { tap: this.edgePoint(miss) };
        return { click: 'data-k=answer|' };
      },
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, hidden: [...q.hidden], dashed: [...dashed] }; },
      edgePoint: j => { net.overlay.updateMatrixWorld(true); const x = edges[j]; return toScreen(x.a.clone().lerp(x.b, 0.5).applyMatrix4(net.overlay.matrixWorld)); },
    },
  };
}
