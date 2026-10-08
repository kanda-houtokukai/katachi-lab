// ためす「いちの あらわしかた」（4年）：平面（よこ・たて）と空間（よこ・たて・たかさ）。
// 玉の位置を答える／指定の位置に玉を置く（平面はマスの交わる点をタッチ、空間は ア・イ・ウ の玉から選ぶ）。
import { S, THREE, tween, wait, alive, easeOutBounce, burst, fitBox, groundPoint, rayFrom, col, plainMaterial, disposeObject, labelSprite, toScreen } from '../stage/stage.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const W = 6, D = 4, H = 3, O = V3(-3, 0, 1.5);   // 原点（左手前）。よこ＝+x、たて＝-z（奥へ）、たかさ＝+y
const SPEC = { easy: ['plane-read', 'plane-put', 'plane-read', 'plane-put'], normal: ['plane-read', 'plane-put', 'space-read', 'space-pick'], challenge: ['space-read', 'space-pick', 'space-read', 'space-pick', 'plane-put'] };
const ri = n => Math.floor(Math.random() * n);
const txt = (p, space) => space ? `（よこ ${p[0]}、たて ${p[1]}、たかさ ${p[2]}）` : `（よこ ${p[0]}、たて ${p[1]}）`;

export function mount(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let objs = [], balls = [], placed = null;
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="choices"></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; balls = []; placed = null; };
  const P = (x, z, y = 0) => V3(O.x + x, y, O.z - z);
  function rod(a, b, hex, r = 0.025) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), plainMaterial(hex)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); return m; }
  function ball(p, hex) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), plainMaterial(hex, { emissive: col(hex), emissiveIntensity: 0.15 })); m.position.copy(p); m.castShadow = true; return m; }
  function drawBoard(space) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, D), plainMaterial(tok('sheet-paper'))); board.position.copy(P(W / 2, D / 2, 0.01)); board.receiveShadow = true; add(board);
    for (let x = 0; x <= W; x++) add(rod(P(x, 0, 0.03), P(x, D, 0.03), tok('line'), 0.012));
    for (let z = 0; z <= D; z++) add(rod(P(0, z, 0.03), P(W, z, 0.03), tok('line'), 0.012));
    add(rod(P(0, 0, 0.04), P(W + 0.4, 0, 0.04), tok('ink'), 0.03)); add(rod(P(0, 0, 0.04), P(0, D + 0.4, 0.04), tok('ink'), 0.03));
    for (let x = 1; x <= W; x++) { const s = labelSprite(String(x), { h: 0.3 }); s.position.copy(P(x, -0.45, 0.05)); add(s); }
    for (let z = 1; z <= D; z++) { const s = labelSprite(String(z), { h: 0.3 }); s.position.copy(P(-0.45, z, 0.05)); add(s); }
    const lx = labelSprite('よこ', { h: 0.34 }); lx.position.copy(P(W + 0.9, 0, 0.05)); add(lx);
    const lz = labelSprite('たて', { h: 0.34 }); lz.position.copy(P(0, D + 0.8, 0.05)); add(lz);
    const o = labelSprite('0', { h: 0.3 }); o.position.copy(P(-0.35, -0.35, 0.05)); add(o);
    if (space) {
      add(rod(P(0, 0, 0), P(0, 0, H + 0.4), tok('ink'), 0.03));
      for (let y = 1; y <= H; y++) { const s = labelSprite(String(y), { h: 0.3 }); s.position.copy(P(-0.4, 0, y)); add(s); }
      const ly = labelSprite('たかさ', { h: 0.34 }); ly.position.copy(P(0, 0, H + 0.8)); add(ly);
      // へやの わく（上の面のふち）
      const c = [[0, 0], [W, 0], [W, D], [0, D]];
      c.forEach(([x, z], k) => { const [x2, z2] = c[(k + 1) % 4]; add(rod(P(x, z, H), P(x2, z2, H), tok('ink-soft'), 0.012)); add(rod(P(x, z, 0), P(x, z, H), tok('ink-soft'), 0.012)); });
    }
    S.allowRotate = space;
    fitBox(new THREE.Box3(P(-1, -1, 0).setY(0), P(W + 1.2, D + 1, space ? H + 1 : 0.4)), space ? 0.95 : 0.5, space ? 0.5 : 0, 1.05);
  }
  function mkQuestion(type) {
    const space = type.startsWith('space');
    const pos = () => [1 + ri(W - 1), 1 + ri(D - 1), space ? 1 + ri(H) : 0];
    const p = pos();
    if (type.endsWith('read')) {
      const opts = [p, [p[1], p[0], p[2]], space ? [p[0], p[2], p[1]] : [p[0] === 1 ? 2 : p[0] - 1, p[1], 0]];
      const uniq = []; for (const o of opts) if (!uniq.some(u => u.join() === o.join())) uniq.push(o);
      while (uniq.length < 3) { const o = pos(); if (!uniq.some(u => u.join() === o.join())) uniq.push(o); }
      return { type, space, p, opts: shuffle(uniq) };
    }
    if (type === 'space-pick') {
      const others = [[p[1] <= W ? p[1] : 1, p[0] <= D ? p[0] : 1, p[2]], [p[0], p[1], p[2] === H ? 1 : p[2] + 1]].filter(o => o.join() !== p.join() && o[0] <= W && o[1] <= D);
      while (others.length < 2) { const o = pos(); if (o.join() !== p.join() && !others.some(u => u.join() === o.join())) others.push(o); }
      return { type, space, p, balls: shuffle([p, ...others.slice(0, 2)]) };
    }
    return { type, space, p };
  }
  function start() {
    quiz.list = SPEC[quiz.level].map(mkQuestion); quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    clear(); quiz.hints = 0; quiz.phase = 'ask'; q$('hd').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('choices').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i];
    drawBoard(q.space);
    let text;
    if (q.type.endsWith('read')) {
      const b = add(ball(P(q.p[0], q.p[1], q.p[2] + 0.2), tok('face-1'))); balls.push(b);
      if (q.space) { add(rod(P(q.p[0], q.p[1], 0.03), P(q.p[0], q.p[1], q.p[2]), tok('ink-soft'), 0.01)); }
      b.position.y += 2; tween(0.6, k => { b.position.y = q.p[2] + 0.2 + 2 * (1 - easeOutBounce(k)); });
      text = q.space ? 'あかい 玉の いちは どれ？' : 'あかい 玉の いちは どれ？';
      q$('choices').innerHTML = q.opts.map((o, i) => `<button class="btn sub" type="button" data-ch="${i}">${txt(o, q.space)}</button>`).join('');
      $$p(panel, '[data-ch]').forEach(b => on(b, 'click', () => answer(q.opts[+b.dataset.ch].join() === q.p.join(), +b.dataset.ch)));
    } else if (q.type === 'plane-put') {
      text = `${txt(q.p, false)} に 玉を おこう`; q$('choices').innerHTML = '';
    } else {
      text = `${txt(q.p, true)} の 玉は どれ？`;
      const names = ['ア', 'イ', 'ウ'];
      q.balls.forEach((p, i) => { const b = add(ball(P(p[0], p[1], p[2] + 0.2), [tok('face-1'), tok('face-4'), tok('face-3')][i])); b.userData.pick = i; balls.push(b); add(rod(P(p[0], p[1], 0.03), P(p[0], p[1], p[2]), tok('ink-soft'), 0.01)); const s = labelSprite(names[i], { h: 0.34 }); s.position.copy(P(p[0], p[1], p[2] + 0.75)); add(s); });
      q$('choices').innerHTML = '';
    }
    q$('qTxt').innerHTML = text; ctx.say(text);
  }
  async function answer(correct, pick) {
    if (quiz.phase !== 'ask') return;
    quiz.phase = 'done'; const q = quiz.list[quiz.i];
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    $$p(panel, '[data-ch]').forEach((b, i) => { b.disabled = true; if (q.opts && q.opts[i].join() === q.p.join()) b.classList.add('right'); });
    // 正しい位置まで、よこ→たて→たかさ の順に線をのばして見せる
    const a = P(0, 0, 0.06), b1 = P(q.p[0], 0, 0.06), b2 = P(q.p[0], q.p[1], 0.06), b3 = P(q.p[0], q.p[1], q.p[2]);
    const seg = async (p, r, hex) => { const m = add(rod(p, p.clone().add(V3(0.001, 0.001, 0.001)), hex, 0.04)); await tween(0.5, k => { const e = p.clone().lerp(r, k); m.geometry.dispose(); m.geometry = new THREE.CylinderGeometry(0.04, 0.04, Math.max(0.001, p.distanceTo(e)), 8); m.position.copy(p).add(e).multiplyScalar(0.5); if (p.distanceTo(r) > 1e-6) m.quaternion.setFromUnitVectors(V3(0, 1, 0), r.clone().sub(p).normalize()); }); };
    await seg(a, b1, tok('face-1')); await seg(b1, b2, tok('face-4')); if (q.space) await seg(b2, b3, tok('face-3'));
    if (correct) { ctx.sfx.good(); burst(b3); toast(ICON.HANAMARU, `せいかい！ ${txt(q.p, q.space)}`, 3); }
    else { ctx.sfx.bad(); toast(ICON.X, `こたえは ${txt(q.p, q.space)}。よこ → たて${q.space ? ' → たかさ' : ''} の じゅんに かぞえよう`, 3.6); }
    ctx.log('position', { correct, hints: quiz.hints, level: quiz.level, detail: { type: q.type, p: q.p.join(','), pick } });
    q$('q').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    ctx.sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (quiz.hints === 1) toast(ICON.HINT, `0 から、よこに いくつ・たてに いくつ${q.space ? '・うえに いくつ' : ''} すすむかな`, 3.2);
    else if (quiz.hints === 2) { add(rod(P(0, 0, 0.07), P(q.p[0], 0, 0.07), tok('face-1'), 0.035)); toast(ICON.HINT, `よこは ${q.p[0]}`, 2.4); }
    else { add(rod(P(q.p[0], 0, 0.07), P(q.p[0], q.p[1], 0.07), tok('face-4'), 0.035)); toast(ICON.HINT, `たては ${q.p[1]}`, 2.4); }
  });
  on(q$('next'), 'click', () => {
    ctx.sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clear();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('choices').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('position-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { ctx.sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { ctx.sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { ctx.sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    onTap(e) {
      if (quiz.phase !== 'ask') return;
      const q = quiz.list[quiz.i];
      if (q.type === 'plane-put') {
        const g = groundPoint(e, 0.03); if (!g) return;
        const x = Math.round(g.x - O.x), z = Math.round(O.z - g.z);
        if (x < 0 || z < 0 || x > W || z > D) return;
        if (placed) { S.stage.remove(placed); }
        placed = add(ball(P(x, z, 0.2), tok('face-1'))); ctx.sfx.pop();
        answer(x === q.p[0] && z === q.p[1], x + ',' + z);
      } else if (q.type === 'space-pick') {
        const h = rayFrom(e).intersectObjects(balls, false)[0]; if (!h) return;
        ctx.sfx.pop(); const i = h.object.userData.pick; answer(q.balls[i].join() === q.p.join(), i);
      }
    },
    onResize() { const q = quiz.list[quiz.i]; if (q && quiz.phase === 'ask') fitBox(new THREE.Box3(P(-1, -1, 0).setY(0), P(W + 1.2, D + 1, q.space ? H + 1 : 0.4)), S.goal.phi, S.goal.theta, 1.05); },
    dispose() { clear(); },
    test: {
      auto() {
        const q = quiz.list[quiz.i]; if (!q) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        if (q.type.endsWith('read')) return { clickNth: ['data-ch', q.opts.findIndex(o => o.join() === q.p.join())] };
        if (q.type === 'plane-put') return { tap: this.gridPoint(q.p[0], q.p[1]) };
        return { tap: this.ballPoint(q.balls.findIndex(b => b.join() === q.p.join())) };
      },
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, type: q.type, p: q.p, opts: q.opts, balls: q.balls }; },
      gridPoint: (x, z) => toScreen(P(x, z, 0.03)),
      ballPoint: i => toScreen(balls[i].position),
    },
  };
}
