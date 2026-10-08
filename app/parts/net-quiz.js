// ためす：「はこに なるかな？」・「★と むかいあう めんは？」・「★と かさなる へんは？」・「★と あつまる ちょうてんは？」
// 難しさ3段・ヒント3段（答えは言わない）。答えたあと実際に組み立てて確かめ、重なる面は赤く残す（見本v2）。
// opts.levels：{ easy:[...], normal:[...], challenge:[...] }。各項目 { type, src:'grid'|'catalog', valid, pool, from, solid, n, coll }
import { objScreen } from '../stage/stage.js';
import { S, THREE, tween, wait, alive, easeOutBack, easeOutBounce, glow, holdGlow, stopGlows, burst, rayFrom, groundPoint, fitBox, spinCamera, col, badge, growSprite, disposeObject, plainMaterial } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, fitLayout, frameBox, frameFlat, foldTo, hop, showOverlap, netBox, disposeNet, T } from '../stage/foldnet.js';
import { cellsToLayout, NETS11, INVALID_CANDIDATES, randomOrient, netId } from '../engine/grid.js';
import { foldedFaces, overlappingFaces, edgePairs, vertexGroups, outerEdges, edgeId, layoutBounds } from '../engine/fold.js';
import { loadCatalog } from '../engine/catalog.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const INVALID_GRID = INVALID_CANDIDATES.filter(c => overlappingFaces(foldedFaces(cellsToLayout(c))).length > 0);
let levelMem = null;

async function makeQuestions(spec, rand = Math.random) {
  const out = [];
  for (const it of spec) {
    if (it.src === 'grid' || !it.src) {
      if (it.type === 'valid?' && it.valid === false) {
        const pool = INVALID_GRID.slice(it.from || 0, it.to || undefined);
        shuffle([...pool], rand).slice(0, it.n).forEach(c => out.push({ type: 'valid?', L: cellsToLayout(randomOrient(c, rand)), valid: false, no: 0, coll: it.coll }));
      } else {
        const pool = it.pool || [...Array(11).keys()];
        shuffle([...pool], rand).slice(0, it.n).forEach(i => out.push({ type: it.type, L: cellsToLayout(randomOrient(NETS11[i], rand)), valid: true, no: i + 1, coll: it.coll }));
      }
    } else {
      const cat = await loadCatalog(it.solid);
      if (it.type === 'valid?' && it.valid === false) {
        const { invalidVariants } = await import('../engine/variants.js');
        invalidVariants(cat, it.n, rand, it.mismatch).forEach(L => out.push({ type: 'valid?', L, valid: false, no: 0, solid: it.solid }));
      } else {
        const nos = shuffle([...Array(cat.count).keys()].map(i => i + 1), rand).slice(0, it.n);
        nos.forEach(no => out.push({ type: it.type, L: cat.layout(no), valid: true, no, solid: it.solid, coll: it.coll }));
      }
    }
  }
  return shuffle(out, rand);
}

export function mount(ctx) {
  const { panel, sfx, toast, setGrade, ICON, ICONS_UI, opts } = ctx;
  const quiz = { list: [], i: 0, results: [], level: levelMem || ctx.level(), hints: 0, phase: 'ask', star: -1, net: null };
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hintDots"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="answers">
      <button class="btn big answer yes" type="button" data-ans="1">${ICONS_UI.yes}${opts.yes || 'なる'}</button>
      <button class="btn big answer no" type="button" data-ans="0">${ICONS_UI.no}${opts.no || 'ならない'}</button>
    </div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on($p(panel, '.say'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const setQ = text => { q$('qTxt').innerHTML = text; ctx.say(text); };
  const renderDots = () => { q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i); };
  const overlays = [];
  const clearOverlays = () => { overlays.forEach(o => { o.parent && o.parent.remove(o); disposeObject(o); }); overlays.length = 0; };

  let seq = 0;
  async function start() {
    const tag = S.token, my = ++seq;
    const list = await makeQuestions(opts.levels[quiz.level] || opts.levels.normal); if (!alive(tag) || my !== seq) return;
    quiz.list = list;
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    showQuestion();
  }
  function showQuestion() {
    stopGlows(); clearOverlays();
    if (quiz.net) { disposeNet(quiz.net); quiz.net = null; }
    quiz.hints = 0; quiz.phase = 'ask'; q$('hintDots').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    const q = quiz.list[quiz.i];
    q$('answers').hidden = q.type !== 'valid?';
    renderDots();
    const L = fitLayout(q.L, ctx.portrait());
    q.Lshown = L;
    const bb = layoutBounds(L), big = Math.max(bb.w, bb.h), sc = S.view.W < 600 && big > 5.2 ? 5.2 / big : 1;
    const base = centerBase(L, -0.5, false).multiplyScalar(sc).setZ(-0.5 - ((bb.y0 + bb.y1) / 2) * sc);
    const net = quiz.net = mountNet(makeFoldNet(L, Array(L.faces.length).fill(tok('quiz-paper')), { id: q.no }), base, sc);
    if (q.valid === false) net.analysis.valid = false;
    net.setProgress(0); frameFlat(net, 0.18, 0); S.allowRotate = false;
    net.holder.position.y = net.home.y + 0.3; net.holder.scale.setScalar(0.85 * sc);
    tween(0.4, k => { net.holder.position.y = net.home.y + 0.3 * (1 - k); net.holder.scale.setScalar(sc * (0.85 + 0.15 * easeOutBack(k))); });
    if (q.type === 'opp') {
      const cands = L.faces.map((f, i) => i).filter(i => net.analysis.opposite[i] >= 0);
      quiz.star = cands[Math.floor(Math.random() * cands.length)];
      net.addBadge(quiz.star, '★', tok('yamabuki'), tok('ink'), 0.36);
      setQ('★と むかいあう めんを タッチしよう');
    } else if (q.type === 'edge') {
      q.pairs = edgePairs(L, net.folded); q.outer = outerEdges(L);
      const p = q.pairs[Math.floor(Math.random() * q.pairs.length)];
      quiz.star = p[0]; quiz.answer = p[1];
      markEdge(net, quiz.star, tok('yamabuki'), true);
      setQ('★の へんと かさなる へんを タッチしよう');
    } else if (q.type === 'vertex') {
      q.groups = vertexGroups(L, net.folded).filter(g => g.length >= 2);
      const g = q.groups[Math.floor(Math.random() * q.groups.length)];
      quiz.star = g[0]; quiz.answer = g.slice(1);
      markVertex(net, quiz.star, tok('yamabuki'), true);
      setQ('★の ちょうてんと あつまる ちょうてんを タッチしよう');
    } else setQ(opts.question || 'はこに なるかな？');
  }
  // 辺・頂点のしるし（面と一緒に折れるよう、面の中に入れる）
  function faceOfEdge(net, e) { return e.face; }
  function markEdge(net, e, hex, star) {
    const g = net.nodes[faceOfEdge(net, e)].g;
    const a = new THREE.Vector3(e.a[0], T + 0.012, e.a[1]), b = new THREE.Vector3(e.b[0], T + 0.012, e.b[1]);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b) * 0.92, 10), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.4 }));
    m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m); overlays.push(m);
    if (star) {
      const c = net.nodes[e.face].center, mid = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2];
      const s = badge('★', tok('yamabuki'), tok('ink')); s.position.set(mid[0] + (c[0] - mid[0]) * 0.35, 0.2, mid[1] + (c[1] - mid[1]) * 0.35); g.add(s); growSprite(s, 0.3); overlays.push(s);
    }
    return m;
  }
  function markVertex(net, p, hex, star) {
    // その点を持つ面のどれか1つに入れる
    const fi = net.L.faces.findIndex(f => f.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6));
    const g = net.nodes[fi].g;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 12), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.4 }));
    m.position.set(p[0], T + 0.03, p[1]); g.add(m); overlays.push(m);
    if (star) { const s = badge('★', tok('yamabuki'), tok('ink')); s.position.set(p[0], 0.32, p[1]); g.add(s); growSprite(s, 0.28); overlays.push(s); }
    return m;
  }

  on(q$('hint'), 'click', async () => {
    const net = quiz.net;
    if (quiz.phase !== 'ask' || !net) return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hintDots').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i], L = q.Lshown;
    if (quiz.hints === 1) {
      if (q.type === 'opp') {
        // ★の となりの めんは むかいあわない
        const ids = new Set(); const s = L.faces[quiz.star];
        s.pts.forEach((a, k) => ids.add(edgeId(a, s.pts[(k + 1) % s.pts.length])));
        L.faces.forEach((f, i) => { if (i === quiz.star) return; if (f.pts.some((a, k) => ids.has(edgeId(a, f.pts[(k + 1) % f.pts.length])))) { const m = net.nodes[i].mat; tween(0.5, k => m.color.copy(col(tok('quiz-paper'))).lerp(col(tok('gray-face')), k)); } });
        toast(ICON.HINT, '★の となりの めんは むかいあわないよ', 3);
      } else if (q.type === 'edge' || q.type === 'vertex') {
        glow(net.nodes[q.type === 'edge' ? quiz.star.face : 0].mesh, tok('glow-blue'), 2, 0.4);
        toast(ICON.HINT, q.type === 'edge' ? '★の へんの ある めんを おりあげると どこに くるかな' : 'この ちょうてんに あつまる めんは いくつ あるかな', 3);
      } else {
        glow(net.nodes[L.root].mesh, tok('glow-blue'), 3, 0.5, 0.25); S.held.add(net.nodes[L.root].mat);
        toast(ICON.HINT, 'あおい めんを そこに して、まわりを おりあげて みよう', 3.2);
      }
    } else {
      const to = quiz.hints === 2 ? 0.45 : 0.82;
      S.allowRotate = true;
      const b = netBox(net); b.max.y += 0.8; fitBox(b, 0.75, 0.35, 1.15);
      sfx.swish(0.8); await foldTo(net, to, 1.0);
      toast(ICON.HINT, quiz.hints === 2 ? 'とちゅうまで おって みたよ' : 'もう すこしで わかるかな', 2.4);
      if (q.type !== 'valid?') {
        // タッチして こたえるので、見せたあとは ひらいた 形に もどす
        const tag = S.token; if (!(await wait(1.4)) || !alive(tag) || quiz.phase !== 'ask') return;
        sfx.swish(0.6); await foldTo(net, 0, 0.9); frameFlat(net, 0.18, 0); S.allowRotate = false;
      }
    }
  });
  $$p(panel, '[data-ans]').forEach(b => on(b, 'click', () => answer(b.dataset.ans === '1')));
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => {
    if (quiz.phase === 'fold') return;
    sfx.tap(); quiz.level = levelMem = b.dataset.level; ctx.hideHud(); start();
  }));

  async function verify(correct, extra) {
    const tag = S.token, net = quiz.net, q = quiz.list[quiz.i];
    quiz.phase = 'fold'; q$('answers').hidden = true; q$('hint').hidden = true; setQ('くみたてて たしかめよう');
    S.allowRotate = true;
    const b = netBox(net); b.max.y += 1; fitBox(b, 0.92, 0.5, 1.15);
    sfx.swish(1.4); await foldTo(net, 1, 1.9 * (1 - net.progress) + 0.2); if (!alive(tag)) return null;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; renderDots();
    ctx.log((opts.kinds && opts.kinds[q.type]) || 'quiz', { correct, hints: quiz.hints, level: quiz.level, detail: Object.assign({ type: q.type, valid: q.valid, id: q.no, solid: q.solid || 'cube' }, extra) });
    return tag;
  }
  async function answer(saysValid) {
    const net = quiz.net;
    if (!net || quiz.phase !== 'ask') return;
    const q = quiz.list[quiz.i]; if (q.type !== 'valid?') return;
    sfx.tap();
    const correct = saysValid === q.valid;
    const tag = await verify(correct, { said: saysValid }); if (!tag || !alive(tag)) return;
    if (q.valid) {
      await hop(net, 0.35); if (!alive(tag)) return;
      if (correct) { sfx.good(); burst(net.home); const isNew = q.coll ? ctx.register(q.coll, q.no) : false; toast(ICON.HANAMARU, `せいかい！ ${opts.okText || 'はこに なったね'}${isNew ? '<br><small>ずかんに とうろく しました</small>' : ''}`, 3); }
      else { sfx.bad(); toast(ICON.BOX, opts.wrongValid || 'ほんとうは はこに なるよ', 3); }
    } else {
      if (correct) sfx.good(); else sfx.bad();
      const ov = net.analysis.overlaps.length ? net.analysis.overlaps : [];
      const bad = q.Lshown.badHinges || [];
      if (ov.length) showOverlap(net, ov); else spinCamera(3.2, Math.PI * 0.85);
      bad.forEach(i => { glow(net.nodes[i].mesh, tok('glow-red'), 3, 0.75, 0.4); S.held.add(net.nodes[i].mat); });
      const what = bad.length ? 'あかい めんは、へんの ながさが あわなくて となりあわないよ' : ov.length ? 'あかい めんが かさなって、あなが あいたよ' : 'めんが ぴったり あわないね';
      toast(correct ? ICON.HANAMARU : ICON.X, correct ? `せいかい！ ${what}` : what, 3.6);
    }
    afterAnswer();
  }
  async function answerPick(correct, pickInfo, show) {
    const tag = await verify(correct, pickInfo); if (!tag || !alive(tag)) return;
    show();
    if (correct) { sfx.good(); burst(quiz.net.home); } else sfx.bad();
    spinCamera(3, Math.PI * 0.9);
    afterAnswer();
  }
  function afterAnswer() {
    quiz.phase = 'done';
    q$('q').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる';
    q$('nextRow').hidden = false;
  }
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; showQuestion(); return; }
    stopGlows(); clearOverlays(); if (quiz.net) { disposeNet(quiz.net); quiz.net = null; }
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('hint').hidden = true; q$('dotsRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const L = cellsToLayout(NETS11[4]);
    const done = quiz.net = mountNet(makeFoldNet(L, Array(6).fill(tok('quiz-paper'))), centerBase(L, -0.5, true)); done.setProgress(1); frameBox(done, 0.95, 0.5, 2.0);
    done.holder.position.y = done.home.y + 2.4;
    tween(0.7, k => { done.holder.position.y = done.home.y + 2.4 * (1 - easeOutBounce(k)); }).then(() => sfx.land());
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON);
    q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log(opts.doneKind || 'quiz-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); burst(done.home); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });

  function nearestOuter(e, q) {
    const p = groundPoint(e, T); if (!p) return null;
    const net = quiz.net, s = net.baseScale || 1, lp = [(p.x - net.base.x) / s, (p.z - net.base.z) / s];
    let best = null, bd = 0.28;
    for (const ed of q.outer) {
      const ax = ed.a[0], ay = ed.a[1], bx = ed.b[0], by = ed.b[1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((lp[0] - ax) * dx + (lp[1] - ay) * dy) / l2)), d = Math.hypot(ax + t * dx - lp[0], ay + t * dy - lp[1]);
      if (d < bd) { bd = d; best = ed; }
    }
    return best;
  }
  function nearestVertex(e, q) {
    const p = groundPoint(e, T); if (!p) return null;
    const net = quiz.net, s = net.baseScale || 1, lp = [(p.x - net.base.x) / s, (p.z - net.base.z) / s];
    let best = null, bd = 0.3;
    for (const g of vertexGroups(q.Lshown, net.folded)) for (const v of g) { const d = Math.hypot(v[0] - lp[0], v[1] - lp[1]); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  start();
  return {
    onTap(e) {
      const net = quiz.net;
      if (!net || quiz.phase !== 'ask') return;
      const q = quiz.list[quiz.i];
      if (q.type === 'opp') {
        const hit = rayFrom(e).intersectObjects(net.meshes(), false)[0]; if (!hit) return;
        const f = hit.object.userData.face;
        if (f === quiz.star) { toast(ICON.HINT, 'それは ★の めんだよ。むかいあう めんを さがそう', 2.4); return; }
        sfx.pop(); glow(net.nodes[f].mesh, tok('glow-blue'), 2, 0.6);
        const o = net.analysis.opposite[quiz.star], correct = f === o;
        answerPick(correct, { pick: f }, () => {
          net.addBadge(o, '★', tok('yamabuki'), tok('ink'), 0.34);
          [quiz.star, o].forEach(i => glow(net.nodes[i].mesh, tok('glow-white'), 3, 0.6));
          toast(correct ? ICON.HANAMARU : ICON.X, correct ? 'せいかい！ ★の めんが むかいあったね' : 'ざんねん。★が ついた 2まいが むかいあう めんだよ', 3.4);
        });
      } else if (q.type === 'edge') {
        const ed = nearestOuter(e, q); if (!ed) return;
        if (edgeId(ed.a, ed.b) === edgeId(quiz.star.a, quiz.star.b) && ed.face === quiz.star.face) { toast(ICON.HINT, 'それは ★の へんだよ', 2); return; }
        sfx.pop();
        const correct = ed.face === quiz.answer.face && ed.k === quiz.answer.k;
        markEdge(net, ed, tok('glow-blue'));
        answerPick(correct, { pick: ed.face + ':' + ed.k }, () => {
          markEdge(net, quiz.answer, tok('yamabuki'));
          toast(correct ? ICON.HANAMARU : ICON.X, correct ? 'せいかい！ ★の へんと ぴったり かさなったね' : 'ざんねん。きいろの 2ほんが かさなる へんだよ', 3.4);
        });
      } else if (q.type === 'vertex') {
        const v = nearestVertex(e, q); if (!v) return;
        if (Math.hypot(v[0] - quiz.star[0], v[1] - quiz.star[1]) < 1e-6) { toast(ICON.HINT, 'それは ★の ちょうてんだよ', 2); return; }
        sfx.pop();
        const correct = quiz.answer.some(a => Math.hypot(a[0] - v[0], a[1] - v[1]) < 1e-6);
        markVertex(net, v, tok('glow-blue'));
        answerPick(correct, { pick: v.map(x => +x.toFixed(2)).join(',') }, () => {
          quiz.answer.forEach(a => markVertex(net, a, tok('yamabuki')));
          toast(correct ? ICON.HANAMARU : ICON.X, correct ? `せいかい！ ${quiz.answer.length + 1}つの ちょうてんが 1つの かどに あつまったね` : 'ざんねん。きいろの ちょうてんが あつまるよ', 3.4);
        });
      }
    },
    onResize() { if (quiz.net) { if (quiz.phase === 'ask') frameFlat(quiz.net, 0.18, 0); else frameBox(quiz.net, S.goal.phi, S.goal.theta, 2.0); } },
    dispose() { clearOverlays(); },
    test: {
      auto() {
        const q = quiz.list[quiz.i]; if (!q || !quiz.net) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        if (quiz.phase !== 'ask') return { wait: 300 };
        if (q.type === 'valid?') return { click: q.valid ? 'data-ans=1|' : 'data-ans=0|' };
        if (q.type === 'opp') return { tap: this.facePoint(quiz.net.analysis.opposite[quiz.star]) };
        if (q.type === 'edge') return { tap: this.edgePoint('answer') };
        return { tap: this.vertexPoint('answer') };
      },
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, type: q.type, valid: q.valid, star: quiz.star && quiz.star.face != null ? { face: quiz.star.face, k: quiz.star.k } : quiz.star, opposite: quiz.net && quiz.net.analysis.opposite, faces: q.Lshown.faces.length }; },
      facePoint: i => objScreen(quiz.net.nodes[i].mesh, new THREE.Vector3(quiz.net.nodes[i].center[0], 0.03, quiz.net.nodes[i].center[1])),
      edgePoint: which => { const e = which === 'answer' ? quiz.answer : quiz.list[quiz.i].outer.find(x => !(x.face === quiz.answer.face && x.k === quiz.answer.k) && !(x.face === quiz.star.face && x.k === quiz.star.k)); return objScreen(quiz.net.nodes[e.face].g, new THREE.Vector3((e.a[0] + e.b[0]) / 2, T, (e.a[1] + e.b[1]) / 2)); },
      vertexPoint: which => { const L = quiz.list[quiz.i].Lshown, p = which === 'answer' ? quiz.answer[0] : vertexGroups(L, quiz.net.folded).find(g => !g.some(v => Math.hypot(v[0] - quiz.star[0], v[1] - quiz.star[1]) < 1e-6))[0]; const fi = L.faces.findIndex(f => f.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6)); return objScreen(quiz.net.nodes[fi].g, new THREE.Vector3(p[0], T, p[1])); },
    },
  };
}
