// ためす（1年）：opts.mode
//  'sort'：身の回りの物（10種以上）を、はこ・つつ・ボール の3つのかごに分ける。分けたあと、坂に転がして確かめる。
//  'pick'：「ころがるのは どれ？」「つめるのは どれ？」ぜんぶ選んで答え、動きで確かめる。
import { S, THREE, tween, wait, alive, easeInOut, easeOutBounce, burst, fitBox, rayFrom, glow, stopGlows, col, disposeObject, labelSprite, objScreen, faceMaterial } from '../stage/stage.js';
import { THINGS, byId, thingMesh, thingSVG, kindSVG, KIND_LABEL } from './_things.js';
import { makeSlope, placeOnSlope, release, SLOPE } from './slope-roll.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const KINDS = ['box', 'tube', 'ball'];
export function mount(ctx) { return ctx.opts.mode === 'pick' ? pick(ctx) : sort(ctx); }

function sort(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  let objs = [], items = [], sel = null, miss = 0, phase = 'sort', baskets = {};
  panel.innerHTML = `<div class="row" data-k="bins">${KINDS.map(k => `<button class="btn sub" type="button" data-bin="${k}">${kindSVG(k)}${KIND_LABEL[k]}の なかま</button>`).join('')}</div>
    <div class="row"><span class="status" data-k="st"></span><button class="btn" type="button" data-k="roll" hidden>${ICONS_UI.roll}ころがして たしかめる</button><button class="btn small sub" type="button" data-k="again" hidden>${ICONS_UI.again}もういちど</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  function setup() {
    objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; items = []; sel = null; miss = 0; phase = 'sort'; stopGlows();
    const pick = shuffle([...THINGS]).slice(0, 12);
    pick.forEach((t, i) => { const m = add(thingMesh(t, t.kind === 'tube' && i % 2 ? 'side' : 'up')); const x = (i % 6) * 1.25 - 3.1, z = Math.floor(i / 6) * 1.5 - 2.4; m.position.set(x, 0, z); m.userData.home = m.position.clone(); items.push(m); });
    KINDS.forEach((k, i) => {
      const g = new THREE.Group(); const x = (i - 1) * 2.6, z = 1.4;
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.8, 0.5, 32, 1, true), faceMaterial(tok('wood'), { side: THREE.DoubleSide })); bin.position.y = 0.25; g.add(bin);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), faceMaterial(tok('wood'))); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.01; g.add(bottom);
      const lab = labelSprite(KIND_LABEL[k], { h: 0.34 }); lab.position.set(0, 0.95, 0); g.add(lab);
      g.position.set(x, 0, z); g.userData.bin = k; g.userData.n = 0; add(g); baskets[k] = g;
    });
    fitBox(new THREE.Box3(new THREE.Vector3(-4, 0, -3.1), new THREE.Vector3(4, 1.4, 2.6)), 0.8, 0, 1.03);
    q$('roll').hidden = true; q$('again').hidden = true; q$('bins').hidden = false; status();
    caption('かたちを タッチして、なかまの かごに いれよう');
  }
  const status = () => { const left = items.filter(m => !m.userData.done).length; q$('st').innerHTML = phase === 'sort' ? `のこり <b>${left}</b>` : ''; };
  function select(m) {
    if (phase !== 'sort' || m.userData.done) return;
    if (sel) { const s = sel; tween(0.15, k => { s.position.y = 0.3 * (1 - k); }); }
    if (sel === m) { sel = null; return; }
    sel = m; sfx.pop(); tween(0.15, k => { m.position.y = 0.3 * k; });
  }
  async function put(kind) {
    if (phase !== 'sort') return;
    if (!sel) { toast('', 'さきに かたちを タッチして えらぼう', 2); return; }
    const m = sel, t = m.userData.thing, ok = t.kind === kind; sel = null;
    const b = baskets[kind], p0 = m.position.clone();
    if (ok) {
      const n = b.userData.n++, tgt = b.position.clone().add(new THREE.Vector3((n % 3 - 1) * 0.35, 0.05 + Math.floor(n / 3) * 0.3, (Math.floor(n / 3) % 2 ? 0.2 : -0.2)));
      m.userData.done = true; sfx.pop();
      await tween(0.55, k => { m.position.lerpVectors(p0, tgt, easeInOut(k)); m.position.y += Math.sin(k * Math.PI) * 1.2; m.scale.setScalar(1 - 0.45 * k); });
      sfx.land();
      const isNew = ctx.register('things', t.id);
      if (isNew) toast('', `${t.label}<br><small>ずかんに とうろく</small>`, 1.4);
    } else {
      miss++; sfx.bad();
      await tween(0.5, k => { m.position.lerpVectors(p0, b.position.clone().setY(1.2), Math.sin(k * Math.PI) * 0.6); });
      m.position.copy(m.userData.home);
      toast(ICON.X, t.kind === 'ball' ? `${t.label}は どこも まるいよ` : t.kind === 'tube' ? `${t.label}は たいらな ところと まるい ところが あるよ` : `${t.label}は たいらな ところ だけだよ`, 2.6);
    }
    ctx.log('sort', { correct: ok, detail: { thing: t.id, kind: t.kind, said: kind } });
    status();
    if (items.every(i => i.userData.done)) { phase = 'done'; q$('bins').hidden = true; q$('roll').hidden = false; sfx.good(); toast(ICON.HANAMARU, `ぜんぶ わけられた！${miss ? `（まちがい ${miss}かい）` : ''}`, 3); ctx.log('sort-done', { correct: miss === 0, detail: { miss } }); ctx.done('sort'); }
  }
  $$p(panel, '[data-bin]').forEach(b => on(b, 'click', () => put(b.dataset.bin)));
  on(q$('roll'), 'click', async () => {
    if (phase !== 'done') return; sfx.tap(); phase = 'roll'; q$('roll').hidden = true;
    const tag = S.token;
    objs.forEach(o => { o.visible = false; });
    const slope = add(makeSlope());
    fitBox(new THREE.Box3(new THREE.Vector3(SLOPE.x0 - 0.5, 0, SLOPE.zc - SLOPE.w / 2 - 0.3), new THREE.Vector3(SLOPE.x0 + SLOPE.len + 3.8, SLOPE.h + 1.0, SLOPE.zc + SLOPE.w / 2 + 0.3)), 0.95, S.view.W < 600 ? 1.5 : 0.75, 1.06);
    for (const k of KINDS) {
      const ts = items.filter(i => i.userData.thing.kind === k).slice(0, 3).map(i => i.userData.thing);
      const ms = ts.map((t, j) => { const m = add(thingMesh(t, k === 'tube' ? 'side' : 'up')); placeOnSlope(m, SLOPE.zc - 1 + j); return m; });
      caption(`${KIND_LABEL[k]}の なかまを ころがすと…`);
      await Promise.all(ms.map(m => release(m, 1, sfx))); if (!alive(tag)) return;
      caption(k === 'box' ? 'はこの なかまは すべる' : `${KIND_LABEL[k]}の なかまは ころがる`, 2);
      if (!(await wait(1.6))) return;
      ms.forEach(m => { S.stage.remove(m); disposeObject(m); });
    }
    caption('ボールと つつは ころがる。はこは ころがらないね', 4);
    ctx.log('roll', { detail: { mode: 'sorted' } });
    q$('again').hidden = false; phase = 'end';
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); setup(); });
  setup();
  return {
    onTap(e) {
      const h = rayFrom(e).intersectObjects(objs, true)[0]; if (!h) return;
      let o = h.object; while (o && !o.userData.thing && o.userData.bin == null) o = o.parent;
      if (!o) return;
      if (o.userData.bin) put(o.userData.bin); else select(o);
    },
    dispose() {},
    test: {
      auto() {
        if (phase === 'roll') return { wait: 400 };
        if (phase !== 'sort') return { done: true };
        if (!sel) { const m = items.find(i => !i.userData.done); return { tap: objScreen(m, new THREE.Vector3(0, m.userData.height / 2, 0)) }; }
        return { click: `data-bin=${sel.userData.thing.kind}|` };
      },
    },
  };
}

function pick(ctx) {
  const { panel, sfx, toast, ICON } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let objs = [], items = [], picked = new Set();
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div class="row" data-k="ansRow"><span class="status" data-k="picked"></span><button class="btn big" type="button" data-k="answer">こたえる</button></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; items = []; };
  const N = { easy: 3, normal: 4, challenge: 4 }, Q = { easy: 3, normal: 4, challenge: 5 };
  function mk(type) {
    const n = N[quiz.level], pool = shuffle([...THINGS]);
    const set = [];
    // ころがる・つめるの両方がそろうように、はこ・つつ・ボールを少なくとも1つずつ
    for (const k of KINDS) set.push(pool.find(t => t.kind === k && !set.includes(t)));
    while (set.length < n) set.push(pool.find(t => !set.includes(t)));
    return { type, things: shuffle(set).map((t, i) => ({ t, o: t.kind === 'tube' ? (quiz.level === 'challenge' || i % 2 ? 'up' : 'side') : 'up' })) };
  }
  function start() {
    quiz.list = Array.from({ length: Q[quiz.level] }, (x, i) => mk(i % 2 ? 'stack' : 'roll')); quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    clear(); stopGlows(); quiz.hints = 0; quiz.phase = 'ask'; picked = new Set();
    q$('hd').innerHTML = hintDots(0); q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('ansRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i];
    q.things.forEach(({ t, o }, i) => { const m = add(thingMesh(t, o)); m.position.set((i - (q.things.length - 1) / 2) * 2.0, 0, -0.5); m.userData.idx = i; items.push(m); });
    q.answer = new Set(items.map((m, i) => i).filter(i => (q.type === 'roll' ? items[i].userData.rolls : items[i].userData.flatTop)));
    fitBox(new THREE.Box3(new THREE.Vector3(-q.things.length - 0.2, 0, -1.6), new THREE.Vector3(q.things.length + 0.2, 1.8, 0.6)), 0.85, 0, 1.08);
    const text = q.type === 'roll' ? 'ころがる ものを ぜんぶ タッチしよう' : 'うえに つみきを つめる ものを ぜんぶ タッチしよう';
    q$('qTxt').textContent = text; ctx.say(text); render();
  }
  function render() { q$('picked').innerHTML = `えらんだ <b>${picked.size}</b>`; items.forEach((m, i) => { m.position.y = picked.has(i) ? 0.25 : 0; }); }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (quiz.hints === 1) toast(ICON.HINT, q.type === 'roll' ? 'まるい ところが したに ある ものは ころがるよ' : 'うえが たいらな ものの うえには つめるよ', 3);
    else if (quiz.hints === 2) toast(ICON.HINT, 'つつは おきかたで かわるよ。たて？ よこ？', 3);
    else { const i = [...q.answer].find(k => !picked.has(k)); if (i != null) glow({ material: Array.isArray(items[i].userData.main.material) ? items[i].userData.main.material[0] : items[i].userData.main.material }, tok('glow-blue'), 3, 0.6); toast(ICON.HINT, 'ひかった ものは こたえの 1つ', 2.4); }
  });
  on(q$('answer'), 'click', async () => {
    if (quiz.phase !== 'ask') return;
    if (!picked.size) { toast('', 'タッチして えらんでから こたえよう', 2); return; }
    sfx.tap(); quiz.phase = 'check'; const q = quiz.list[quiz.i], tag = S.token;
    const correct = picked.size === q.answer.size && [...picked].every(i => q.answer.has(i));
    q$('ansRow').hidden = true; q$('hint').hidden = true;
    // うごきで たしかめる
    if (q.type === 'roll') {
      await Promise.all(items.map((m, i) => { if (!m.userData.rolls) return tween(0.6, k => { m.position.x += Math.sin(k * Math.PI * 6) * 0.01; }); const x0 = m.position.x, r = m.userData.radius || 0.4; return tween(1.2, k => { m.position.x = x0 + 1.4 * k; m.userData.main.rotation[m.userData.thing.kind === 'tube' ? 'y' : 'z'] = -1.4 * k / r; }); }));
    } else {
      await Promise.all(items.map(m => { const b = thingMesh(byId('block')); const top = m.userData.height; b.position.set(m.position.x, top + 1.6, -0.5); add(b); return tween(0.5, k => { b.position.y = top + 1.6 * (1 - easeOutBounce(k)); }).then(() => { if (!m.userData.flatTop) return tween(0.6, k => { b.position.x = m.position.x + 1.0 * k; b.position.y = Math.max(0, top * (1 - k * k)); b.rotation.z = -k * 1.4; }); }); }));
    }
    if (!alive(tag)) return;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const mistake = [...picked].some(i => !q.answer.has(i) && items[i].userData.thing.kind === 'tube' && q.type === 'roll' && items[i].userData.orient === 'up') ? 'tube-up' : [...picked].some(i => !q.answer.has(i) && items[i].userData.thing.kind === 'ball' && q.type === 'stack') ? 'ball-stack' : '';
    if (correct) { sfx.good(); burst(new THREE.Vector3(0, 1, -0.5)); toast(ICON.HANAMARU, 'せいかい！', 2.4); }
    else { sfx.bad(); toast(ICON.X, q.type === 'roll' ? 'うごいた ものが ころがる ものだよ' : 'つみきが のった ものが つめる ものだよ', 3); }
    ctx.log('quiz', { correct, hints: quiz.hints, level: quiz.level, detail: { type: q.type, mistake } });
    quiz.phase = 'done'; q$('q').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clear();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('ansRow').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log('quiz-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    onTap(e) {
      if (quiz.phase !== 'ask') return;
      const h = rayFrom(e).intersectObjects(items, true)[0]; if (!h) return;
      let o = h.object; while (o && o.userData.idx == null) o = o.parent; if (!o) return;
      const i = o.userData.idx; if (picked.has(i)) { picked.delete(i); sfx.off(); } else { picked.add(i); sfx.pop(); }
      render();
    },
    dispose() {},
    test: {
      auto() {
        const q = quiz.list[quiz.i]; if (!q) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        if (quiz.phase !== 'ask') return { wait: 300 };
        const wrong = [...picked].find(i => !q.answer.has(i)); const miss = [...q.answer].find(i => !picked.has(i));
        const i = wrong ?? miss;
        if (i == null) return { click: 'data-k=answer|' };
        return { tap: objScreen(items[i], new THREE.Vector3(0, items[i].userData.height / 2, 0)) };
      },
    },
  };
}
