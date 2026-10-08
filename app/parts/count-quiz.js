// ためす「○角柱の ちょうてんは いくつ？」など（5年・中1）：立体を見て、面・辺・頂点の数を答える。
// 答えたあと、数える動き（面に番号・辺と頂点にしるし）で確かめる。opts.solids：[{ gen:{prism:n} } | { solid:'octa' }]、opts.kinds
import { S, THREE, tween, wait, alive, easeOutBack, glow, burst, fitBox, spinCamera, badge, growSprite, disposeObject } from '../stage/stage.js';
import { polyMesh, polyPoint, rod, ball } from '../stage/solidmesh.js';
import { prism, pyramid, solid as solidById } from '../engine/solids.js';
import { faceEdges } from '../engine/nets.js';
import { shuffle, pick } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const NAME = n => ({ 3: 'さんかく', 4: 'しかく', 5: 'ごかく', 6: 'ろっかく', 7: 'ななかく', 8: 'はっかく' }[n]);
const WORD = { face: ['めん', 'つ'], edge: ['へん', 'ほん'], vertex: ['ちょうてん', 'つ'] };
function solidOf(s) {
  if (s.gen && s.gen.prism) return { P: prism(s.gen.prism, { side: 2 * 0.9 * Math.sin(Math.PI / s.gen.prism), h: 1.4 }), name: NAME(s.gen.prism) + 'ちゅう', base: true };
  if (s.gen && s.gen.pyramid) return { P: pyramid(s.gen.pyramid, { side: 2 * 0.9 * Math.sin(Math.PI / s.gen.pyramid), h: 1.4 }), name: NAME(s.gen.pyramid) + 'すい', base: true };
  const P = solidById(s.solid); return { P, name: s.name, base: false };
}
export function mount(ctx) {
  const { panel, sfx, toast, ICON, opts } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let obj = null, marks = [];
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row rchoices" data-k="choices"></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clearMarks = () => { marks.forEach(m => { m.parent && m.parent.remove(m); disposeObject(m); }); marks = []; };
  function start() {
    const pool = opts.levels[quiz.level];
    quiz.list = pool.map(([si, kind]) => {
      const s = opts.solids[si], { P, name } = solidOf(s);
      const ans = kind === 'face' ? P.F.length : kind === 'edge' ? faceEdges(P).length : P.V.length;
      const ch = new Set([ans]); const cand = [ans - 2, ans + 2, ans + (s.gen ? (s.gen.prism || s.gen.pyramid) : 4), ans - 1, ans + 1, ans * 2].filter(x => x > 0);
      for (const c of shuffle(cand)) { if (ch.size >= 3) break; ch.add(c); }
      return { s, P, name: s.label || name, kind, ans, choices: shuffle([...ch]) };
    });
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    clearMarks(); if (obj) { S.stage.remove(obj); disposeObject(obj); obj = null; }
    quiz.hints = 0; quiz.phase = 'ask'; q$('hd').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('choices').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i];
    obj = polyMesh(q.P, fi => (q.s.gen && fi < (q.s.gen.prism ? 2 : 1) ? tok('face-2') : tok('face-4')));
    obj.position.set(0, 0, -0.5); S.stage.add(obj);
    const sz = obj.userData.size, m = Math.max(sz.x, sz.z) / 2 + 0.4;
    S.allowRotate = true; fitBox(new THREE.Box3(new THREE.Vector3(-m, 0, -0.5 - m), new THREE.Vector3(m, sz.y + 0.5, -0.5 + m)), 0.95, 0.6, 1.2);
    const text = `${q.name}の ${WORD[q.kind][0]}は いくつ？`;
    q$('qTxt').innerHTML = text; ctx.say(text);
    q$('choices').innerHTML = q.choices.map((c, i) => `<button class="btn sub" type="button" data-ch="${i}">${c}${WORD[q.kind][1]}</button>`).join('');
    $$p(panel, '[data-ch]').forEach(b => on(b, 'click', () => answer(+b.dataset.ch)));
  }
  async function countShow(q) {
    const tag = S.token, P = q.P;
    obj.updateMatrixWorld(true);
    const W = v => polyPoint(obj, v).add(obj.position);
    const c = new THREE.Vector3(); P.V.forEach(v => c.add(W(v))); c.multiplyScalar(1 / P.V.length);
    let items;
    if (q.kind === 'vertex') items = P.V.map(v => ({ p: W(v), mk: () => ball(W(v), tok('face-4'), 0.07) }));
    else if (q.kind === 'edge') items = faceEdges(P).map(e => { const a = W(P.V[e.v[0]]), b = W(P.V[e.v[1]]); return { p: a.clone().add(b).multiplyScalar(0.5), mk: () => rod(a, b, tok('yamabuki'), 0.03) }; });
    else items = P.F.map((f, fi) => { const p = new THREE.Vector3(); f.forEach(i => p.add(W(P.V[i]))); p.multiplyScalar(1 / f.length); return { p, mk: null, fi }; });
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      if (it.mk) { const m = it.mk(); S.stage.add(m); marks.push(m); }
      else glow({ material: obj.userData.mats[it.fi] }, tok('glow-white'), 1, 0.5);
      const b = badge(String(k + 1), tok('paper'), tok('ink')); b.position.copy(it.p).add(it.p.clone().sub(c).normalize().multiplyScalar(0.3)); S.stage.add(b); marks.push(b); growSprite(b, 0.22);
      sfx.tick(k);
      if (!(await wait(0.16))) return;
    }
  }
  async function answer(i) {
    if (quiz.phase !== 'ask') return;
    quiz.phase = 'fold'; const q = quiz.list[quiz.i], correct = q.choices[i] === q.ans;
    $$p(panel, '[data-ch]').forEach((b, k) => { b.disabled = true; if (q.choices[k] === q.ans) b.classList.add('right'); });
    const tag = S.token;
    spinCamera(q.ans * 0.18 + 1.2, Math.PI * 0.9);
    await countShow(q); if (!alive(tag)) return;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    if (correct) { sfx.good(); burst(new THREE.Vector3(0, 1, -0.5)); toast(ICON.HANAMARU, `せいかい！ ${WORD[q.kind][0]}は ${q.ans}${WORD[q.kind][1]}`, 3); }
    else { sfx.bad(); toast(ICON.X, `${WORD[q.kind][0]}は ${q.ans}${WORD[q.kind][1]}。かぞえて たしかめたよ`, 3.2); }
    ctx.log(opts.kind || 'count-quiz', { correct, hints: quiz.hints, level: quiz.level, detail: { what: q.kind, solid: q.name, ans: q.ans } });
    quiz.phase = 'done'; q$('q').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i], n = q.s.gen ? (q.s.gen.prism || q.s.gen.pyramid) : 0;
    if (quiz.hints === 1) toast(ICON.HINT, 'ゆびで まわして、ぜんぶ みて みよう', 2.6);
    else if (quiz.hints === 2) toast(ICON.HINT, n ? `そこの めんの かどは ${n}つ` : 'うえと したに わけて かぞえよう', 2.8);
    else toast(ICON.HINT, q.kind === 'vertex' ? (q.s.gen && q.s.gen.prism ? `うえに ${n}つ、したに ${n}つ` : 'うえの かどと、まわりの かどを たそう') : q.kind === 'edge' ? (q.s.gen && q.s.gen.prism ? `うえに ${n}ほん、したに ${n}ほん、たてに ${n}ほん` : 'そこの まわりと、ななめの へんを たそう') : (q.s.gen && q.s.gen.prism ? `そこが 2つ、よこが ${n}つ` : 'そこと よこの めんを たそう'), 3.2);
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clearMarks();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('choices').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log((opts.kind || 'count-quiz') + '-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    dispose() { clearMarks(); },
    test: {
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, ans: q.ans, choices: q.choices }; },
      auto() { const q = quiz.list[quiz.i]; if (!q) return { wait: 300 }; if (!q$('result').hidden) return { done: true }; if (quiz.phase === 'done') return { click: 'data-k=next|' }; if (quiz.phase !== 'ask') return { wait: 300 }; return { clickNth: ['data-ch', q.choices.indexOf(q.ans)] }; },
    },
  };
}
