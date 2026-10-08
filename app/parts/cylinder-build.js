// 円柱の展開図（5年）：opts.mode
//  'match'：ためす「この えんちゅうの そくめんに なる ながしかくは どれ？」（横の長さが違う3枚から選び、巻いて確かめる）
//  'build'：つくる「えんちゅうの てんかいず」（円の大きさを選び、長方形の横の長さをスライダーで合わせる。合えば巻き上がる）
import { S, THREE, tween, wait, alive, easeInOut, easeOutBack, glow, burst, fitBox, rayFrom, spinCamera, faceMaterial, plainMaterial, col, disposeObject, toScreen, objScreen } from '../stage/stage.js';
import { sidePoint } from './cylinder-roll.js';
import { edgeId } from '../engine/fold.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML, sliderRow, setSlider } from './_common.js';

const H = 1.4;
// 横 w の長方形を、半径 r の円に巻きつける（k＝0 平ら → 1 巻ききる）。巻くと横 w の分だけ回る
function wrapGeometry(geo, r, w, h, k, NS) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ix = i % (NS + 1), iy = Math.floor(i / (NS + 1));
    const s = (ix / NS) * w, y = (1 - iy) * h;
    // 接点から片側へ巻く（s＝0 が接点）
    const [x, yy, z] = sidePoint(r, s, y, (1 - k) * 0.9999);
    pos.setXYZ(i, x, yy + 0.006, z);
  }
  pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}
function rectMesh(w, hex) {
  const NS = 72, g = new THREE.PlaneGeometry(1, 1, NS, 1);
  const m = new THREE.Mesh(g, faceMaterial(hex, { side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true;
  m.userData.NS = NS; m.userData.w = w;
  // 平らに置いた形
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const ix = i % (NS + 1), iy = Math.floor(i / (NS + 1)); pos.setXYZ(i, (ix / NS) * w, 0.006, (iy - 0.5) * H); }
  pos.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  return m;
}
function disc(r, hex) { const c = new THREE.CircleGeometry(r, 48); c.rotateX(-Math.PI / 2); const m = new THREE.Mesh(c, faceMaterial(hex, { side: THREE.DoubleSide })); m.position.y = 0.01; m.castShadow = m.receiveShadow = true; return m; }

// 巻いて確かめる：円の上に立てて巻く。結果 'ok' | 'gap' | 'over'
async function wrapCheck(ctx, base, r, w, hex, objs) {
  const tag = S.token;
  const NS = 72, g = new THREE.PlaneGeometry(1, 1, NS, 1);
  const m = new THREE.Mesh(g, faceMaterial(hex, { side: THREE.DoubleSide })); m.castShadow = true;
  // 円の中心が原点、接点は (-r, 0, 0)
  m.position.copy(base); S.stage.add(m); objs.push(m);
  // 立てる：はじめは接点の平面に立った長方形
  wrapGeometry(g, r, w, H, 0, NS);
  ctx.sfx.swish(1.2);
  await tween(1.8, k => wrapGeometry(g, r, w, H, easeInOut(k), NS)); if (!alive(tag)) return null;
  const C = 2 * Math.PI * r, d = w - C;
  return Math.abs(d) < 0.12 ? 'ok' : d < 0 ? 'gap' : 'over';
}

export function mount(ctx) {
  return ctx.opts.mode === 'build' ? build(ctx) : match(ctx);
}

function match(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const SPEC = { easy: [[1, 2 / Math.PI, 0.5 / Math.PI]], normal: [[1, 2 / Math.PI, 0.5]], challenge: [[1, 3 / (2 * Math.PI), 1.25]] };
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let objs = [], rects = [];
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt">この えんに あう そくめんは どれ？</span></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; rects = []; };
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  function start() {
    quiz.list = Array.from({ length: 4 }, () => { const r = [0.45, 0.55, 0.65][Math.floor(Math.random() * 3)], f = SPEC[quiz.level][0]; return { r, widths: shuffle(f.map(x => x * 2 * Math.PI * r)) }; });
    quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    clear(); quiz.hints = 0; quiz.phase = 'ask'; q$('hd').innerHTML = hintDots(0);
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i];
    // 円を2つ（えんちゅうの そこと ふた）
    const c1 = add(disc(q.r, tok('face-2'))); c1.position.set(-3.6, 0.01, -1.3);
    const c2 = add(disc(q.r, tok('face-2'))); c2.position.set(-3.6, 0.01, 0.3);
    const cols = [tok('face-4'), tok('face-3'), tok('face-6')];
    q.widths.forEach((w, i) => { const m = add(rectMesh(w, cols[i])); m.position.set(-2.4, 0, -1.9 + i * 1.65); m.userData.pick = i; rects.push(m); });
    S.allowRotate = false;
    fitBox(new THREE.Box3(new THREE.Vector3(-4.4, 0, -2.8), new THREE.Vector3(-2.4 + Math.max(...q.widths) + 0.4, 0.2, 1.8)), 0.3, 0, 1.05);
    ctx.say('この えんに あう そくめんは どれ？');
  }
  async function pick(i) {
    if (quiz.phase !== 'ask') return;
    quiz.phase = 'fold'; sfx.pop();
    const q = quiz.list[quiz.i], w = q.widths[i], C = 2 * Math.PI * q.r, correct = Math.abs(w - C) < 1e-6;
    const tag = S.token;
    rects.forEach((m, k) => { if (k !== i) tween(0.4, t => { m.position.y = -0.3 * t; }); });
    S.allowRotate = true; fitBox(new THREE.Box3(new THREE.Vector3(-1.4, 0, -1.9), new THREE.Vector3(1.4, H + 0.4, 1.0)), 0.95, 0.5, 1.4);
    rects[i].visible = false;
    const base = add(disc(q.r, tok('face-2'))); base.position.set(0, 0.01, -0.5);
    const res = await wrapCheck(ctx, new THREE.Vector3(0, 0, -0.5), q.r, w, [tok('face-4'), tok('face-3'), tok('face-6')][i], objs); if (!res || !alive(tag)) return;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    if (correct) { sfx.good(); burst(new THREE.Vector3(0, H, -0.5)); toast(ICON.HANAMARU, 'せいかい！ ぴったり まけたね', 3); }
    else { sfx.bad(); toast(ICON.X, res === 'gap' ? 'すき間が あいたね。よこが みじかいよ' : 'かさなって しまったね。よこが ながいよ', 3.4); }
    spinCamera(2.6, Math.PI * 0.7);
    ctx.log('cyl-match', { correct, hints: quiz.hints, level: quiz.level, detail: { res } });
    quiz.phase = 'done'; q$('q').hidden = true; q$('hint').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (quiz.hints === 1) toast(ICON.HINT, 'そくめんの よこの ながさは、えんの まわりの ながさと おなじ', 3.2);
    else if (quiz.hints === 2) toast(ICON.HINT, 'えんの まわりは、ちょっけいの 3ばいより すこし ながいよ', 3.2);
    else { const i = q.widths.findIndex(w => Math.abs(w - 2 * Math.PI * q.r) > 1e-6 && w < 2 * Math.PI * q.r); if (i >= 0) { tween(0.4, t => { rects[i].position.y = -0.3 * t; }); toast(ICON.HINT, 'いちばん みじかい 1まいは ちがうよ', 2.6); } }
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clear();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('cyl-match-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    onTap(e) { const h = rayFrom(e).intersectObjects(rects, false)[0]; if (h) pick(h.object.userData.pick); },
    dispose() { clear(); },
    test: {
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, i: quiz.i, n: quiz.list.length, answer: q.widths.findIndex(w => Math.abs(w - 2 * Math.PI * q.r) < 1e-6) }; },
      rectPoint: i => { const m = rects[i]; return toScreen(m.position.clone().add(new THREE.Vector3(m.userData.w / 2, 0, 0))); },
      auto() { const q = quiz.list[quiz.i]; if (!q) return { wait: 300 }; if (!q$('result').hidden) return { done: true }; if (quiz.phase === 'done') return { click: 'data-k=next|' }; if (quiz.phase !== 'ask') return { wait: 300 }; return { tap: this.rectPoint(this.state().answer) }; },
    },
  };
}

function build(ctx) {
  const { panel, sfx, toast, ICON, ICONS_UI } = ctx;
  const RS = [0.45, 0.6, 0.75];
  let ri = 1, w = 2.5, mode = 'edit', hints = 0, objs = [], rect = null;
  panel.innerHTML = `
    <div class="row"><div class="seg" role="group" aria-label="えんの おおきさ">${RS.map((r, i) => `<button type="button" data-r="${i}" aria-pressed="${i === ri}">${['ちいさい', 'ちゅうくらい', 'おおきい'][i]} えん</button>`).join('')}</div></div>
    ${sliderRow('wSlider', { left: 'みじかい', right: 'ながい', leftIcon: '', rightIcon: '', min: 10, max: 60, value: 25, label: 'ながしかくの よこの ながさ' })}
    <div class="row" data-k="edit"><span class="status" data-k="st"></span><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button><button class="btn big" type="button" data-k="wrap">${ICONS_UI.build}まいて みる</button></div>
    <div class="row" data-k="after" hidden><button class="btn small" type="button" data-k="paper">${ICONS_UI.scissors}かみで つくる</button><button class="btn small sub" type="button" data-k="redo">やりなおす</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`), slider = $p(panel, '#wSlider');
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; };
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  function layout() {
    clear(); const r = RS[ri];
    const c1 = add(disc(r, tok('face-2'))); c1.position.set(-2.6, 0.01, -0.5 - H / 2 - r);
    const c2 = add(disc(r, tok('face-2'))); c2.position.set(-2.6, 0.01, -0.5 + H / 2 + r);
    rect = add(rectMesh(w, tok('face-4'))); rect.position.set(-2.6 - 0.0, 0, -0.5);
    rect.scale.x = 1;
    S.allowRotate = false;
    fitBox(new THREE.Box3(new THREE.Vector3(-3.6, 0, -0.5 - H / 2 - 2 * r - 0.3), new THREE.Vector3(-2.6 + 6.2, 0.2, -0.5 + H / 2 + 2 * r + 0.3)), 0.3, 0, 1.04);
    q$('st').innerHTML = `よこ <b>${w.toFixed(1)}</b>`;
    q$('hd').innerHTML = hintDots(hints);
  }
  const setW = v => { w = v; rect.geometry.dispose(); const m = rectMesh(w, tok('face-4')); rect.geometry = m.geometry; m.material.dispose(); q$('st').innerHTML = `よこ <b>${w.toFixed(1)}</b>`; };
  on(slider, 'input', () => { if (mode !== 'edit') return; setSlider(slider, +slider.value); setW(+slider.value / 10); });
  $$p(panel, '[data-r]').forEach(b => on(b, 'click', () => { if (mode !== 'edit') return; sfx.tap(); if (+b.dataset.r === ri) { toast('', `いまは「${b.textContent.trim()}」だよ`, 1.6); return; } ri = +b.dataset.r; $$p(panel, '[data-r]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.r === ri))); layout(); }));
  on(q$('hint'), 'click', () => {
    if (mode !== 'edit') return;
    if (hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。いろいろ ためして みよう', 2.4); return; }
    sfx.tap(); hints++; q$('hd').innerHTML = hintDots(hints);
    const r = RS[ri], C = 2 * Math.PI * r;
    if (hints === 1) toast(ICON.HINT, 'よこの ながさを、えんの まわりの ながさに あわせよう', 3);
    else if (hints === 2) toast(ICON.HINT, `ちょっけいは ${(2 * r).toFixed(1)}。まわりは その 3ばいより すこし ながい`, 3.4);
    else { const v = Math.round((C + 0.4) * 10); setSlider(slider, v); setW(v / 10); toast(ICON.HINT, 'ちかくまで のばしたよ。あと すこし', 2.6); }
  });
  on(q$('wrap'), 'click', async () => {
    if (mode !== 'edit') return;
    sfx.tap(); mode = 'fold'; const tag = S.token, r = RS[ri];
    rect.visible = false;
    S.allowRotate = true; fitBox(new THREE.Box3(new THREE.Vector3(1.2, 0, -1.6), new THREE.Vector3(3.8, H + 0.4, 0.6)), 0.95, 0.5, 1.5);
    const b = add(disc(r, tok('face-2'))); b.position.set(2.5, 0.01, -0.5);
    const res = await wrapCheck(ctx, new THREE.Vector3(2.5, 0, -0.5), r, w, tok('face-4'), objs); if (!res || !alive(tag)) return;
    if (res === 'ok') {
      const top = add(disc(r, tok('face-2'))); top.position.set(2.5, H + 0.4, -0.5); tween(0.5, k => { top.position.y = H + 0.4 - 0.4 * k + 0.006; }).then(() => sfx.land());
      sfx.good(); burst(new THREE.Vector3(2.5, H, -0.5)); toast(ICON.HANAMARU, 'ぴったり！ えんちゅうが できた', 3.2);
      ctx.register('cylinder', ri + 1); ctx.done('cylinder'); q$('paper').hidden = false;
    } else { sfx.bad(); toast(ICON.X, res === 'gap' ? 'すき間が あいたね。よこを もっと ながく' : 'かさなって しまったね。よこを みじかく', 3.2); q$('paper').hidden = true; }
    spinCamera(2.4, Math.PI * 0.6);
    ctx.log('cyl-build', { correct: res === 'ok', hints, detail: { r, w: +w.toFixed(2) } });
    mode = 'done'; q$('edit').hidden = true; q$('after').hidden = false;
  });
  on(q$('redo'), 'click', () => { sfx.tap(); ctx.hideHud(); mode = 'edit'; hints = 0; q$('edit').hidden = false; q$('after').hidden = true; layout(); });
  on(q$('paper'), 'click', () => {
    sfx.tap(); const r = RS[ri];
    // 長方形と2つの円。円は長方形の長い辺の真ん中に接する。のりしろは長方形の短い辺と、円のまわりのギザギザ
    const W = 2 * Math.PI * r, rectPts = [[0, 0], [W, 0], [W, H], [0, H]];
    const zig = []; for (const cy of [-r, H + r]) for (let k = 0; k < 16; k++) { const a0 = (k / 16) * Math.PI * 2, a1 = ((k + 0.5) / 16) * Math.PI * 2, a2 = ((k + 1) / 16) * Math.PI * 2, R2 = r + 0.12; zig.push([[W / 2 + r * Math.cos(a0), cy + r * Math.sin(a0)], [W / 2 + R2 * Math.cos(a1), cy + R2 * Math.sin(a1)], [W / 2 + r * Math.cos(a2), cy + r * Math.sin(a2)]]); }
    ctx.openPaper({ title: 'えんちゅうの てんかいず', sub: `ちょっけい ${(2 * r).toFixed(1)}`, unitText: 'ながさ 1', foot: ctx.unit.plain, file: 'enchu-tenkaizu',
      shapes: { polys: [{ pts: rectPts, fill: tok('face-4') }], tabs: [[[W, 0], [W + 0.18, 0.15], [W + 0.18, H - 0.15], [W, H]]], circleTabs: zig.filter((z, k) => k % 2 === 0), folds: new Set([edgeId([W, 0], [W, H])]), circles: [{ c: [W / 2, -r], r, fill: tok('face-2'), tab: 0.12 }, { c: [W / 2, H + r], r, fill: tok('face-2'), tab: 0.12 }] } });
    ctx.log('paper', { detail: { solid: 'cylinder', name: '円柱', id: ri + 1 } });
  });
  layout();
  return {
    dispose() { clear(); },
    test: {
      state: () => ({ mode, w, C: 2 * Math.PI * RS[ri] }),
      auto() { if (mode === 'done') return { done: true }; if (mode !== 'edit') return { wait: 300 }; const C = 2 * Math.PI * RS[ri]; if (Math.abs(w - C) > 0.1) return { slider: ['#wSlider', Math.round(C * 10)] }; return { click: 'data-k=wrap|' }; },
    },
  };
}
