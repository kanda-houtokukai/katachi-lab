// 投影図（中1）：opts.mode
//  'view'：立面図（まえから）と平面図（うえから）を見せ、立体を回して確かめる。
//  'quiz'：投影図から立体を当てる（円柱・円錐・角柱・角錐・球）。答えると立体が出てきて、まえ・うえから見せる。
import { S, THREE, tween, wait, alive, fitBox, spinCamera, disposeObject, burst } from '../stage/stage.js';
import { polyMesh, cylinderMesh, coneMesh, sphereMesh } from '../stage/solidmesh.js';
import { prism, pyramid } from '../engine/solids.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const SOLIDS = [
  { key: 'cyl', label: 'えんちゅう', ruby: '<ruby>円柱<rt>えんちゅう</rt></ruby>' },
  { key: 'cone', label: 'えんすい', ruby: '<ruby>円錐<rt>えんすい</rt></ruby>' },
  { key: 'tprism', label: 'さんかくちゅう', ruby: '<ruby>三角柱<rt>さんかくちゅう</rt></ruby>' },
  { key: 'spyr', label: 'しかくすい', ruby: '<ruby>四角錐<rt>しかくすい</rt></ruby>' },
  { key: 'sphere', label: 'きゅう', ruby: '<ruby>球<rt>きゅう</rt></ruby>' },
];
function make(key) {
  const a = tok('face-4'), b = tok('face-2');
  if (key === 'cyl') return cylinderMesh(0.8, 1.6, a, b);
  if (key === 'cone') return coneMesh(0.9, 1.7, a, b);
  if (key === 'sphere') return sphereMesh(0.9, a);
  if (key === 'tprism') return polyMesh(prism(3, { side: 1.6, h: 1.6 }), i => (i < 2 ? b : a));
  return polyMesh(pyramid(4, { side: 1.5, h: 1.6 }), i => (i === 0 ? b : a));
}
// 投影図（立面図・平面図）の SVG
function views(key) {
  const ink = tok('ink'), f = tok('paper'), st = `fill="${f}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"`;
  const front = { cyl: `<rect x="20" y="10" width="60" height="70" ${st}/>`, cone: `<path d="M50 8L18 80h64z" ${st}/>`, sphere: `<circle cx="50" cy="45" r="36" ${st}/>`, tprism: `<rect x="18" y="10" width="64" height="70" ${st}/><path d="M50 10v70" stroke="${ink}" stroke-width="1.6" stroke-dasharray="5 4"/>`, spyr: `<path d="M50 8L16 80h68z" ${st}/>` }[key];
  const top = { cyl: `<circle cx="50" cy="45" r="32" ${st}/>`, cone: `<circle cx="50" cy="45" r="34" ${st}/><circle cx="50" cy="45" r="2.5" fill="${ink}"/>`, sphere: `<circle cx="50" cy="45" r="36" ${st}/>`, tprism: `<path d="M50 12L84 74H16z" ${st}/>`, spyr: `<rect x="16" y="11" width="68" height="68" ${st}/><path d="M16 11l68 68M84 11L16 79" stroke="${ink}" stroke-width="1.6"/>` }[key];
  return `<div class="row" style="gap:18px"><div style="text-align:center"><svg viewBox="0 0 100 90" width="96" height="86">${front}</svg><div class="rmeta">まえから（りつめんず）</div></div><div style="text-align:center"><svg viewBox="0 0 100 90" width="96" height="86">${top}</svg><div class="rmeta">うえから（へいめんず）</div></div></div>`;
}
const BOX = new THREE.Box3(new THREE.Vector3(-1.4, 0, -1.9), new THREE.Vector3(1.4, 1.9, 0.9));
const VIEW = { slant: [0.95, 0.6], front: [Math.PI / 2 - 0.02, 0], top: [0.04, 0] };

export function mount(ctx) { return ctx.opts.mode === 'quiz' ? quiz(ctx) : view(ctx); }

function view(ctx) {
  const { panel, sfx } = ctx;
  const st = view.mem || (view.mem = { key: 'cyl', v: 'slant' });
  panel.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="りったい">${SOLIDS.map(s => `<button type="button" data-solid="${s.key}" aria-pressed="${s.key === st.key}">${s.label}</button>`).join('')}</div></div>
    <div data-k="views"></div>
    <div class="row"><div class="seg" role="group" aria-label="みる むき">${[['front', 'まえから'], ['top', 'うえから'], ['slant', 'ななめから']].map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${k === st.v}">${l}</button>`).join('')}</div></div>`;
  let obj = null;
  function render() {
    if (obj) { S.stage.remove(obj); disposeObject(obj); }
    obj = make(st.key); obj.position.set(0, 0, -0.5); S.stage.add(obj);
    $p(panel, '[data-k="views"]').innerHTML = views(st.key);
    $$p(panel, '[data-solid]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.solid === st.key)));
    $$p(panel, '[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === st.v)));
    S.allowRotate = true; fitBox(BOX, ...VIEW[st.v], 1.25);
  }
  $$p(panel, '[data-solid]').forEach(b => on(b, 'click', () => { sfx.tap(); if (st.key === b.dataset.solid) { ctx.toast('', `いまは「${b.textContent}」だよ`, 1.6); return; } st.key = b.dataset.solid; render(); ctx.log('projection-look', { detail: { solid: st.key } }); }));
  $$p(panel, '[data-view]').forEach(b => on(b, 'click', () => { sfx.tap(); if (st.v === b.dataset.view) { spinCamera(1.6, Math.PI * 0.25); return; } st.v = b.dataset.view; render(); ctx.toast('', st.v === 'front' ? 'まえから みると りつめんずの かたち' : st.v === 'top' ? 'うえから みると へいめんずの かたち' : 'ゆびで まわして たしかめよう', 2.2); }));
  render();
  ctx.caption('まえから・うえから みた かたちを くらべよう');
  return { dispose() {} };
}

function quiz(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const POOL = { easy: ['cyl', 'cone', 'sphere'], normal: ['cyl', 'cone', 'sphere', 'tprism'], challenge: ['cone', 'spyr', 'tprism', 'cyl', 'sphere'] };
  const Q = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let obj = null;
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(Q.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt">この とうえいずの りったいは どれ？</span></div>
    <div data-k="views"></div>
    <div class="row rchoices" data-k="choices">${SOLIDS.map(s => `<button class="btn sub" type="button" data-pick="${s.key}">${s.ruby}</button>`).join('')}</div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  function start() { Q.list = shuffle([...POOL[Q.level]]); Q.i = 0; Q.results = []; $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === Q.level))); show(); }
  function show() {
    if (obj) { S.stage.remove(obj); disposeObject(obj); obj = null; }
    Q.hints = 0; Q.phase = 'ask'; q$('hd').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false; q$('choices').hidden = false; q$('views').hidden = false;
    q$('levelRow').hidden = Q.i !== 0; q$('dots').innerHTML = quizDots(Q.list, Q.results, Q.i);
    q$('views').innerHTML = views(Q.list[Q.i]);
    $$p(panel, '[data-pick]').forEach(b => { b.disabled = false; b.classList.remove('right'); });
    fitBox(BOX, ...VIEW.slant, 1.25);
    ctx.say('この とうえいずの りったいは どれ？');
  }
  async function pick(key) {
    if (Q.phase !== 'ask') return;
    Q.phase = 'done'; const ans = Q.list[Q.i], correct = key === ans, tag = S.token;
    $$p(panel, '[data-pick]').forEach(b => { b.disabled = true; if (b.dataset.pick === ans) b.classList.add('right'); });
    Q.results[Q.i] = { correct, hints: Q.hints }; q$('dots').innerHTML = quizDots(Q.list, Q.results, Q.i);
    obj = make(ans); obj.position.set(0, 0, -0.5); S.stage.add(obj); obj.scale.setScalar(0.001);
    await tween(0.4, k => obj.scale.setScalar(Math.max(0.001, k))); if (!alive(tag)) return;
    if (correct) { sfx.good(); burst(new THREE.Vector3(0, 1.4, -0.5)); toast(ICON.HANAMARU, `せいかい！ ${SOLIDS.find(s => s.key === ans).ruby}`, 2.6); }
    else { sfx.bad(); toast(ICON.X, `こたえは ${SOLIDS.find(s => s.key === ans).ruby}`, 2.6); }
    ctx.log('projection', { correct, hints: Q.hints, level: Q.level, detail: { solid: ans, said: key } });
    // まえ・うえから見せて確かめる
    fitBox(BOX, ...VIEW.front, 1.25); if (!(await wait(1.4))) return;
    fitBox(BOX, ...VIEW.top, 1.25); if (!(await wait(1.4))) return;
    fitBox(BOX, ...VIEW.slant, 1.25);
    q$('q').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = Q.i < Q.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  $$p(panel, '[data-pick]').forEach(b => on(b, 'click', () => { sfx.tap(); pick(b.dataset.pick); }));
  on(q$('hint'), 'click', () => {
    if (Q.phase !== 'ask') return;
    if (Q.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); Q.hints++; q$('hd').innerHTML = hintDots(Q.hints);
    const ans = Q.list[Q.i];
    toast(ICON.HINT, Q.hints === 1 ? 'うえから みた かたちが そこの めんの かたちだよ' : Q.hints === 2 ? 'まえから みて とがって いれば すい、しかくなら ちゅう' : (ans === 'sphere' ? 'どこから みても まる' : ans === 'cone' || ans === 'cyl' ? 'そこは まる' : 'そこは まるでは ないよ'), 3);
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (Q.i < Q.list.length - 1) { Q.i++; show(); return; }
    if (obj) { S.stage.remove(obj); disposeObject(obj); obj = null; }
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('choices').hidden = true; q$('views').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = Q.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(Q.results, ICON); q$('score').textContent = `${Q.list.length}もん中 ${score}もん せいかい`;
    ctx.log('projection-done', { level: Q.level, detail: { n: Q.list.length, score } });
    ctx.done('tamesu');
    if (score === Q.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${Q.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); Q.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return { dispose() {}, test: { auto() { if (!Q.list.length) return { wait: 300 }; if (!q$('result').hidden) return { done: true }; if (Q.phase === 'done') return q$('nextRow').hidden ? { wait: 300 } : { click: 'data-k=next|' }; return { click: `data-pick=${Q.list[Q.i]}|` }; } } };
}
