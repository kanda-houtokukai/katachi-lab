// ためす「この 6まいで はこが できる？」（2年）：面のカード6枚を見て、箱になるかを答える。
// 答えたあと、カードが組み上がって確かめる（なる／すき間があく）。違う大きさが混じる・同じ形が2枚ずつそろわない問題を入れる。
import { S, THREE, tween, wait, alive, easeInOut, easeOutBack, glow, holdGlow, stopGlows, burst, fitBox, spinCamera, disposeObject, col } from '../stage/stage.js';
import { makeFoldNet, mountNet, centerBase, frameBox, foldTo, hop, disposeNet } from '../stage/foldnet.js';
import { boxCrossLayout, boxFaceDims } from './_nets.js';
import { boxFromCards, assignSlots, cardMesh, slotPlacement, norm2 } from './_cards.js';
import { shuffle, pick } from '../core/text.js';
import { tok, faceColors } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const BOXES = [[1.6, 1.0, 0.6], [1.2, 1.2, 0.8], [1, 1, 1], [1.4, 0.8, 0.8], [1.8, 1.0, 0.5], [1.4, 1.0, 0.7]];
const ODD = [[1.2, 0.4], [0.9, 0.9], [1.5, 0.7], [1.3, 1.1]];
function makeQ(kind, rand) {
  const dims = pick(BOXES, rand), cards = boxFaceDims(...dims).map(d => [...d]);
  if (kind === 'odd') { let o; do { o = pick(ODD, rand); } while (cards.some(c => Math.abs(c[0] - o[0]) < 1e-6 && Math.abs(c[1] - o[1]) < 1e-6)); cards[Math.floor(rand() * 6)] = [...o]; }
  if (kind === 'three') {
    const groups = [[0, 1], [2, 4], [3, 5]], g = shuffle([...groups], rand);
    if (Math.abs(cards[g[0][0]][0] - cards[g[1][0]][0]) < 1e-6 && Math.abs(cards[g[0][0]][1] - cards[g[1][0]][1]) < 1e-6) return makeQ(kind, rand);
    cards[g[1][0]] = [...cards[g[0][0]]];
  }
  if (kind === 'pairs') {
    // 2枚ずつそろっているが、3つめの組の長さが合わない
    const [L, W, H] = dims, K = +(H + 0.35).toFixed(2);
    const c2 = [[L, W], [L, W], [L, H], [W, K], [L, H], [W, K]].map(norm2);
    if (boxFromCards(c2)) return makeQ(kind, rand);
    return { cards: shuffle(c2, rand), valid: false, dims, kind };
  }
  const valid = !!boxFromCards(cards);
  return { cards: shuffle(cards, rand), valid, dims, kind };
}
const SPEC = { easy: [['ok', 2], ['odd', 2]], normal: [['ok', 3], ['odd', 1], ['three', 1]], challenge: [['ok', 3], ['three', 1], ['pairs', 2]] };

export function mount(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let meshes = [], net = null;
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hintDots"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt">この 6まいで はこが できる？</span></div>
    <div class="row" data-k="answers"><button class="btn big answer yes" type="button" data-ans="1">${ICONS_UI.yes}できる</button><button class="btn big answer no" type="button" data-ans="0">${ICONS_UI.no}できない</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on($p(panel, '.say'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clearAll = () => { stopGlows(); meshes.forEach(m => { S.stage.remove(m); disposeObject(m); }); meshes = []; if (net) { disposeNet(net); net = null; } };

  function start() {
    quiz.list = shuffle(SPEC[quiz.level].flatMap(([k, n]) => Array.from({ length: n }, () => makeQ(k, Math.random))), Math.random);
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function trayPos(i) {
    const portrait = ctx.portrait();
    return portrait ? new THREE.Vector3((i % 2) * 2.1 - 1.05, 0, Math.floor(i / 2) * 1.55 - 2.0) : new THREE.Vector3((i % 3) * 2.2 - 2.2, 0, Math.floor(i / 3) * 1.7 - 1.35);
  }
  function frameTray() {
    const b = new THREE.Box3(); meshes.forEach(m => b.expandByPoint(m.position.clone().add(new THREE.Vector3(1, 0, 0.8))).expandByPoint(m.position.clone().add(new THREE.Vector3(-1, 0.2, -0.8))));
    fitBox(b, 0.35, 0, 1.05);
  }
  function show() {
    clearAll(); ctx.hideHud();
    quiz.hints = 0; quiz.phase = 'ask'; q$('hintDots').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('answers').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i], pal = faceColors();
    q.cards.forEach((c, i) => {
      const m = cardMesh(c, tok('quiz-paper')); m.position.copy(trayPos(i)); m.rotation.y = 0; m.userData.card = i;
      m.position.y = 0.4; m.scale.setScalar(0.7); S.stage.add(m); meshes.push(m);
      setTimeout(() => tween(0.36, k => { m.position.y = 0.4 * (1 - k); m.scale.setScalar(0.7 + 0.3 * easeOutBack(k)); }), i * 60);
    });
    S.allowRotate = false; frameTray();
    ctx.say('この 6まいで はこが できる？');
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hintDots').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (quiz.hints === 1) { toast(ICON.HINT, 'はこの むかいあう めんは、おなじ かたちが 2まいずつ だったね', 3); return; }
    // おなじ形のカードを同じ色にする（2段め）・そろわないカードを示す（3段め）
    const pal = faceColors(), groups = [];
    q.cards.forEach((c, i) => { let g = groups.findIndex(G => Math.abs(q.cards[G[0]][0] - c[0]) < 1e-6 && Math.abs(q.cards[G[0]][1] - c[1]) < 1e-6); if (g < 0) { groups.push([i]); } else groups[g].push(i); });
    groups.forEach((G, gi) => G.forEach(i => { const m = meshes[i].material, c0 = m.color.clone(), c1 = col(pal[gi % pal.length]); tween(0.5, k => m.color.copy(c0).lerp(c1, k * 0.8)); }));
    if (quiz.hints === 2) toast(ICON.HINT, 'おなじ かたちの カードを おなじ いろに したよ', 3);
    else { groups.filter(G => G.length !== 2).forEach(G => G.forEach(i => glow(meshes[i], tok('glow-red'), 3, 0.5))); toast(ICON.HINT, groups.every(G => G.length % 2 === 0) ? '2まいずつ そろって いるね。ながさも あうかな？' : 'ひかった カードを よく みよう', 3); }
  });
  $$p(panel, '[data-ans]').forEach(b => on(b, 'click', () => answer(b.dataset.ans === '1')));
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { if (quiz.phase === 'fold') return; sfx.tap(); quiz.level = b.dataset.level; start(); }));

  async function answer(saysValid) {
    if (quiz.phase !== 'ask') return;
    sfx.tap();
    const q = quiz.list[quiz.i], correct = saysValid === q.valid, tag = S.token;
    quiz.phase = 'fold'; q$('answers').hidden = true; q$('hint').hidden = true;
    q$('qTxt').textContent = 'くみたてて たしかめよう'; ctx.say('くみたてて たしかめよう');
    await assemble(q, tag); if (!alive(tag)) return;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    ctx.log('card-quiz', { correct, hints: quiz.hints, level: quiz.level, detail: { valid: q.valid, kind: q.kind, said: saysValid } });
    if (q.valid) { if (correct) { sfx.good(); burst(net.home); toast(ICON.HANAMARU, 'せいかい！ はこが できたね', 3); } else { sfx.bad(); toast(ICON.BOX, 'ほんとうは はこが できるよ', 3); } }
    else { if (correct) sfx.good(); else sfx.bad(); toast(correct ? ICON.HANAMARU : ICON.X, (correct ? 'せいかい！ ' : '') + 'すき間が あいて、はこに ならないね', 3.4); }
    quiz.phase = 'done'; q$('q').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  // カードを十字形に並べて折る。合わない席はすき間のまま、余ったカードは赤く光る
  async function assemble(q, tag) {
    const dims = boxFromCards(q.cards) || q.dims;
    const { slots, extra } = assignSlots(q.cards, dims);
    const L = boxCrossLayout(...dims), base = centerBase(L, -0.3), place = slotPlacement(dims);
    S.allowRotate = true;
    const all = new THREE.Box3(new THREE.Vector3(-4, 0, -3.5), new THREE.Vector3(4, 1.2, 3)); fitBox(all, 0.62, 0.3, 1.0);
    await Promise.all(slots.map((ci, si) => {
      if (ci < 0) return Promise.resolve();
      const m = meshes[ci], p0 = m.position.clone(), r0 = m.rotation.y, t = base.clone().add(new THREE.Vector3(place[si].c[0], 0, place[si].c[1]));
      return new Promise(res => setTimeout(() => tween(0.7, k => { const e = easeInOut(k); m.position.lerpVectors(p0, t, e); m.position.y = Math.sin(k * Math.PI) * 0.5; m.rotation.y = r0 + (place[si].rot - r0) * e; }).then(res), si * 90));
    }));
    if (!alive(tag)) return;
    extra.forEach((ci, k) => { const m = meshes[ci], p0 = m.position.clone(), t = new THREE.Vector3(3.6, 0, -2 + k * 1.3); tween(0.6, kk => { m.position.lerpVectors(p0, t, easeInOut(kk)); }); });
    const pal = faceColors();
    net = mountNet(makeFoldNet(L, slots.map((ci, si) => pal[si % 6])), base);
    slots.forEach((ci, si) => { if (ci < 0) net.nodes[si].mesh.visible = false; else meshes[ci].visible = false; });
    net.setProgress(0);
    if (!(await wait(0.3))) return;
    ctx.sfx.swish(1.4); await foldTo(net, 1, 2.0); if (!alive(tag)) return;
    frameBox(net, 0.95, S.goal.theta, 2.6);
    if (q.valid) await hop(net, 0.4);
    else { extra.forEach(ci => { glow(meshes[ci], tok('glow-red'), 3, 0.7, 0.35); S.held.add(meshes[ci].material); }); spinCamera(3, Math.PI * 0.8); }
  }
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clearAll();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('card-quiz-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); start(); });
  start();
  return { test: { state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, valid: q.valid, i: quiz.i, n: quiz.list.length }; } }, onResize() { if (quiz.phase === 'ask') { meshes.forEach((m, i) => m.position.copy(trayPos(i))); frameTray(); } }, dispose() {} };
}
export { makeQ };
