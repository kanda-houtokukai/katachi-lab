// ためす「およその かたちと おおきさ」（6年）：身の回りの物（缶・箱・ケーキ・プール）をどの形とみるかを選び、およその体積を選ぶ。
import { S, THREE, tween, wait, alive, burst, fitBox, spinCamera, labelSprite, faceMaterial, disposeObject } from '../stage/stage.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const ITEMS = [
  { id: 'can', label: 'のみものの かん', shape: 'cyl', d: 6, h: 12, dims: 'ちょっけい 6cm・たかさ 12cm', v: 340, unit: 'cm³', calc: '3 × 3 × 3.14 × 12 ＝ 339.12', color: 'face-1' },
  { id: 'snack', label: 'おかしの はこ', shape: 'box', w: 15, dd: 10, h: 4, dims: 'たて 10cm・よこ 15cm・たかさ 4cm', v: 600, unit: 'cm³', calc: '10 × 15 × 4 ＝ 600', color: 'face-6' },
  { id: 'cake', label: 'まるい ケーキ', shape: 'cyl', d: 18, h: 6, dims: 'ちょっけい 18cm・たかさ 6cm', v: 1500, unit: 'cm³', calc: '9 × 9 × 3.14 × 6 ＝ 1526.04', color: 'paper' },
  { id: 'pool', label: 'プール', shape: 'box', w: 25, dd: 10, h: 1.2, dims: 'たて 10m・よこ 25m・ふかさ 1.2m', v: 300, unit: 'm³', calc: '10 × 25 × 1.2 ＝ 300', color: 'water' },
  { id: 'tcake', label: 'さんかくの ケーキ', shape: 'tri', a: 8, b: 6, h: 7, dims: 'そこは ていへん 8cm・たかさ 6cm の さんかくけい、ケーキの たかさ 7cm', v: 170, unit: 'cm³', calc: '8 × 6 ÷ 2 × 7 ＝ 168', color: 'face-2' },
  { id: 'tissue', label: 'ティッシュの はこ', shape: 'box', w: 24, dd: 12, h: 8, dims: 'たて 12cm・よこ 24cm・たかさ 8cm', v: 2300, unit: 'cm³', calc: '12 × 24 × 8 ＝ 2304', color: 'face-4' },
];
const SHAPES = [['box', '<ruby>直方体<rt>ちょくほうたい</rt></ruby>'], ['cyl', '<ruby>円柱<rt>えんちゅう</rt></ruby>'], ['tri', '<ruby>三角柱<rt>さんかくちゅう</rt></ruby>']];
const N = { easy: 3, normal: 4, challenge: 5 };

export function mount(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'shape' };
  let obj = null, labs = [];
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row rchoices" data-k="choices"></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clear = () => { [obj, ...labs].forEach(o => { if (o) { S.stage.remove(o); disposeObject(o); } }); obj = null; labs = []; };
  function start() {
    quiz.list = shuffle([...ITEMS]).slice(0, N[quiz.level]).map(it => ({ it, choices: shuffle([it.v / 10, it.v, it.v * 10]) }));
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function model(it) {
    const g = new THREE.Group(), c = tok(it.color);
    let m;
    if (it.shape === 'cyl') { const s = 1.6 / Math.max(it.d, it.h); m = new THREE.Mesh(new THREE.CylinderGeometry(it.d / 2 * s, it.d / 2 * s, it.h * s, 48), faceMaterial(c)); m.position.y = it.h * s / 2; }
    else if (it.shape === 'box') { const s = 2.6 / Math.max(it.w, it.dd, it.h); m = new THREE.Mesh(new THREE.BoxGeometry(it.w * s, it.h * s, it.dd * s), faceMaterial(c)); m.position.y = it.h * s / 2; }
    else { const s = 1.8 / Math.max(it.a, it.h); const sh = new THREE.Shape([new THREE.Vector2(-it.a / 2 * s, 0), new THREE.Vector2(it.a / 2 * s, 0), new THREE.Vector2(0, it.b * s)]); const geo = new THREE.ExtrudeGeometry(sh, { depth: it.h * s, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, it.b * s / 2); m = new THREE.Mesh(geo, faceMaterial(c)); m.rotation.x = 0; }
    m.castShadow = m.receiveShadow = true; g.add(m); return g;
  }
  function show() {
    clear(); quiz.hints = 0; quiz.phase = 'shape';
    q$('hd').innerHTML = hintDots(0); q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('choices').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i], it = q.it;
    obj = model(it); obj.position.set(0, 0, -0.5); S.stage.add(obj);
    const l1 = labelSprite(it.label, { h: 0.42 }); l1.position.set(0, 2.3, -0.5); S.stage.add(l1); labs.push(l1);
    const l2 = labelSprite(it.dims, { h: 0.3 }); l2.position.set(0, -0.05, 1.3); S.stage.add(l2); labs.push(l2);
    fitBox(new THREE.Box3(new THREE.Vector3(-2.2, 0, -2.2), new THREE.Vector3(2.2, 2.6, 1.6)), 0.95, 0.55, 1.15);
    const text = `${it.label}は どんな かたちと みられる？`;
    q$('qTxt').innerHTML = text; ctx.say(text);
    q$('choices').innerHTML = SHAPES.map(([k, l]) => `<button class="btn sub" type="button" data-shape="${k}">${l}</button>`).join('');
    $$p(panel, '[data-shape]').forEach(b => on(b, 'click', () => pickShape(b.dataset.shape)));
  }
  function pickShape(k) {
    if (quiz.phase !== 'shape') return;
    const q = quiz.list[quiz.i]; q.shapeOk = k === q.it.shape;
    if (q.shapeOk) { sfx.good(); toast(ICON.HANAMARU, 'そう みられるね', 1.6); } else { sfx.bad(); toast(ICON.X, `${q.it.label}は ${SHAPES.find(s => s[0] === q.it.shape)[1]}と みられるよ`, 2.6); }
    quiz.phase = 'vol';
    const text = 'およその たいせきは どれ？';
    q$('qTxt').innerHTML = text; ctx.say(text);
    q$('choices').innerHTML = q.choices.map((v, i) => `<button class="btn sub" type="button" data-ch="${i}">およそ ${v.toLocaleString('ja-JP')}${q.it.unit}</button>`).join('');
    $$p(panel, '[data-ch]').forEach(b => on(b, 'click', () => pickVol(+b.dataset.ch)));
    spinCamera(1.6, Math.PI * 0.4);
  }
  function pickVol(i) {
    if (quiz.phase !== 'vol') return;
    const q = quiz.list[quiz.i], volOk = q.choices[i] === q.it.v, correct = q.shapeOk && volOk;
    quiz.phase = 'done';
    $$p(panel, '[data-ch]').forEach((b, k) => { b.disabled = true; if (q.choices[k] === q.it.v) b.classList.add('right'); });
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    if (volOk) { sfx.good(); burst(new THREE.Vector3(0, 1.4, -0.5)); toast(ICON.HANAMARU, `${q.it.calc}。およそ ${q.it.v.toLocaleString('ja-JP')}${q.it.unit}`, 3.6); }
    else { sfx.bad(); toast(ICON.X, `${q.it.calc}。およそ ${q.it.v.toLocaleString('ja-JP')}${q.it.unit} だよ`, 4); }
    ctx.log('estimate', { correct, hints: quiz.hints, level: quiz.level, detail: { item: q.it.id, shapeOk: q.shapeOk, volOk } });
    q$('q').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase === 'done') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const it = quiz.list[quiz.i].it;
    if (quiz.hints === 1) toast(ICON.HINT, 'そこの めんの かたちを みよう。まる？ しかく？ さんかく？', 3);
    else if (quiz.hints === 2) toast(ICON.HINT, 'たいせきは そこの めんせき × たかさ', 2.8);
    else toast(ICON.HINT, `${it.calc.split('＝')[0]}を けいさん しよう`, 3);
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clear();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('choices').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('estimate-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    dispose: clear,
    test: { auto() { const q = quiz.list[quiz.i]; if (!q) return { wait: 300 }; if (!q$('result').hidden) return { done: true }; if (quiz.phase === 'done') return { click: 'data-k=next|' }; if (quiz.phase === 'shape') return { click: `data-shape=${q.it.shape}|` }; return { clickNth: ['data-ch', q.choices.indexOf(q.it.v)] }; } },
  };
}
