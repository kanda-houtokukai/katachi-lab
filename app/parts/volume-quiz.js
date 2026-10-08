// ためす「たいせき」（5年・6年）：opts.types の組み合わせで出題する。
//  'box'    ：積み木の箱の体積をテンキーで答える
//  'unit'   ：単位の問題（cm³・m³・L、cm² との取り違え）を選んで答える（opts.units）
//  'compose'：L字の形の体積（2つの箱に分ける／大きな箱からひく）をテンキーで答える
import { S, THREE, tween, wait, alive, burst, fitBox, spinCamera, labelSprite, disposeObject } from '../stage/stage.js';
import { makeBlocks, wireBox, keypadHTML, bindKeypad, U } from './_blocks.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots, quizDots, levelSeg, starsHTML } from './_common.js';

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export function mount(ctx) {
  const { panel, sfx, toast, ICON, opts } = ctx;
  const quiz = { list: [], i: 0, results: [], level: ctx.level(), hints: 0, phase: 'ask' };
  let objs = [];
  panel.innerHTML = `
    <div class="row" data-k="levelRow">${levelSeg(quiz.level)}</div>
    <div class="row" data-k="dotsRow"><div class="dots" data-k="dots"></div><button class="hint-btn" type="button" data-k="hint">ヒント <span data-k="hd"></span></button></div>
    <div class="q" data-k="q"><button class="say" type="button" data-k="say-q" aria-label="もんだいを きく"></button><span data-k="qTxt"></span></div>
    <div data-k="pad">${keypadHTML()}</div>
    <div class="row rchoices" data-k="choices"></div>
    <div class="row" data-k="nextRow" hidden><button class="btn big" type="button" data-k="next">つぎの もんだい</button></div>
    <div class="result" data-k="result" hidden><div class="stars" data-k="stars"></div><div class="score" data-k="score"></div><button class="btn" type="button" data-k="again">もういちど ちょうせん</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  on(q$('say-q'), 'click', () => ctx.say(q$('qTxt').textContent, true));
  const pad = bindKeypad(q$('pad'), v => answer(v), msg => toast('', msg, 1.6));
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const clear = () => { objs.forEach(o => { S.stage.remove(o); disposeObject(o); }); objs = []; };
  function mk(type) {
    if (type === 'box') { const d = ri(2, 4), w = ri(2, 5), h = ri(2, 4); return { type, dims: [d, w, h], ans: d * w * h }; }
    if (type === 'compose') {
      // L字：手前の低い箱＋奥の高い箱（奥行き d はそろえる）
      const d = ri(2, 3), w1 = ri(2, 3), w2 = ri(2, 3), h1 = ri(1, 2), h2 = h1 + ri(1, 2);
      return { type, d, w1, w2, h1, h2, ans: d * w1 * h1 + d * w2 * h2 };
    }
    if (type === 'prism') { const B = ri(3, 8) * 2, h = ri(2, 6); return { type, B, h, ans: B * h }; }
    const u = (opts.units || [])[Math.floor(Math.random() * (opts.units || []).length)];
    return Object.assign({ type: 'unit' }, u, { order: shuffle(u.ch.map((c, i) => i)) });
  }
  function start() {
    quiz.list = shuffle(opts.levels[quiz.level].map(mk)); quiz.i = 0; quiz.results = [];
    $$p(panel, '[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === quiz.level)));
    show();
  }
  function show() {
    clear(); quiz.hints = 0; quiz.phase = 'ask'; q$('hd').innerHTML = hintDots(0); pad.clear();
    q$('result').hidden = true; q$('nextRow').hidden = true; q$('q').hidden = false; q$('dotsRow').hidden = false; q$('hint').hidden = false;
    q$('levelRow').hidden = quiz.i !== 0;
    q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    const q = quiz.list[quiz.i];
    q$('pad').hidden = q.type === 'unit'; q$('choices').hidden = q.type !== 'unit';
    let text;
    if (q.type === 'box') {
      const [d, w, h] = q.dims, B = makeBlocks(80); add(B.mesh); B.set(q.dims, null, new THREE.Vector3(-w * U / 2, 0, -0.5 + d * U / 2)); q.B = B;
      const f = add(wireBox(w * U, h * U, d * U, tok('ink-soft'), 0.012)); f.position.copy(B.origin);
      [['たて', d, new THREE.Vector3(B.origin.x - 0.35, 0, -0.5)], ['よこ', w, new THREE.Vector3(0, 0, B.origin.z + 0.35)], ['たかさ', h, new THREE.Vector3(B.origin.x + w * U + 0.4, h * U / 2, B.origin.z)]].forEach(([n, v, p]) => { const s = add(labelSprite(`${n} ${v}cm`, { h: 0.3 })); s.position.copy(p); });
      fitBox(new THREE.Box3(new THREE.Vector3(-3, 0, -2.4), new THREE.Vector3(3, 2.2, 1.2)), 0.95, 0.55, 1.05);
      text = 'この はこの たいせきは なんcm³？';
    } else if (q.type === 'compose') {
      const { d, w1, w2, h1, h2 } = q, o = new THREE.Vector3(-(w1 + w2) * U / 2, 0, -0.5 + d * U / 2);
      const A = makeBlocks(60, tok('face-4')), Bb = makeBlocks(60, tok('face-4')); add(A.mesh); add(Bb.mesh);
      A.set([d, w1, h1], null, o); Bb.set([d, w2, h2], null, o.clone().add(new THREE.Vector3(w1 * U, 0, 0))); q.A = A; q.Bb = Bb;
      fitBox(new THREE.Box3(new THREE.Vector3(-3, 0, -2.4), new THREE.Vector3(3, 2.2, 1.2)), 0.95, 0.55, 1.05);
      text = 'この かたちの たいせきは なんcm³？';
    } else if (q.type === 'prism') {
      text = `そこの めんせきが ${q.B}cm²、たかさが ${q.h}cm の かくちゅうの たいせきは？`;
      fitBox(new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 1, 1)), 0.95, 0.55, 1.05);
    } else {
      text = q.q;
      q$('choices').innerHTML = q.order.map(i => `<button class="btn sub" type="button" data-ch="${i}">${q.ch[i]}</button>`).join('');
      $$p(panel, '[data-ch]').forEach(b => on(b, 'click', () => answer(+b.dataset.ch)));
      fitBox(new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 1, 1)), 0.95, 0.55, 1.05);
    }
    q$('qTxt').innerHTML = text; ctx.say(text);
  }
  async function answer(v) {
    if (quiz.phase !== 'ask') return;
    quiz.phase = 'done'; const q = quiz.list[quiz.i];
    const correct = q.type === 'unit' ? v === q.a : v === q.ans;
    quiz.results[quiz.i] = { correct, hints: quiz.hints }; q$('dots').innerHTML = quizDots(quiz.list, quiz.results, quiz.i);
    if (q.type === 'unit') $$p(panel, '[data-ch]').forEach(b => { b.disabled = true; if (+b.dataset.ch === q.a) b.classList.add('right'); });
    const right = q.type === 'unit' ? q.ch[q.a] : `${q.ans}cm³`;
    if (correct) { sfx.good(); burst(new THREE.Vector3(0, 1, -0.5)); toast(ICON.HANAMARU, `せいかい！ ${right}`, 3); }
    else {
      sfx.bad();
      const why = q.type === 'box' ? `1だんに ${q.dims[0] * q.dims[1]}こ、${q.dims[2]}だんで ${q.ans}cm³` : q.type === 'compose' ? `2つの はこに わけて ${q.d * q.w1 * q.h1} ＋ ${q.d * q.w2 * q.h2} ＝ ${q.ans}cm³` : q.type === 'prism' ? `そこの めんせき × たかさ ＝ ${q.B} × ${q.h} ＝ ${q.ans}cm³` : `こたえは「${right}」`;
      toast(ICON.X, why, 4);
    }
    if (q.type !== 'unit') spinCamera(2.2, Math.PI * 0.4);
    ctx.log(opts.kind || 'volume', { correct, hints: quiz.hints, level: quiz.level, detail: { type: q.type, ans: q.type === 'unit' ? q.id : q.ans, said: v } });
    q$('q').hidden = true; q$('hint').hidden = true; q$('pad').hidden = true; q$('choices').hidden = true;
    q$('next').textContent = quiz.i < quiz.list.length - 1 ? 'つぎの もんだい' : 'けっかを みる'; q$('nextRow').hidden = false;
  }
  on(q$('hint'), 'click', () => {
    if (quiz.phase !== 'ask') return;
    if (quiz.hints >= 3) { toast(ICON.HINT, 'ヒントは ここまで。じぶんで かんがえて みよう', 2.4); return; }
    sfx.tap(); quiz.hints++; q$('hd').innerHTML = hintDots(quiz.hints);
    const q = quiz.list[quiz.i];
    if (q.type === 'box') {
      if (quiz.hints === 1) toast(ICON.HINT, 'たて × よこ × たかさ だよ', 2.6);
      else if (quiz.hints === 2) { q.B.show(q.dims[0] * q.dims[1]); toast(ICON.HINT, `1だんに ${q.dims[0]} × ${q.dims[1]} こ`, 2.6); }
      else { q.B.show(q.ans); toast(ICON.HINT, `それが ${q.dims[2]}だん`, 2.6); }
    } else if (q.type === 'compose') {
      if (quiz.hints === 1) toast(ICON.HINT, '2つの はこに わけて かんがえよう', 2.6);
      else if (quiz.hints === 2) { q.Bb.mesh.material.color.set(tok('face-1')).convertSRGBToLinear(); toast(ICON.HINT, 'あおい はこと あかい はこに わけたよ', 2.6); }
      else toast(ICON.HINT, `あおは ${q.d}×${q.w1}×${q.h1}、あかは ${q.d}×${q.w2}×${q.h2}`, 3.2);
    } else if (q.type === 'prism') {
      toast(ICON.HINT, quiz.hints === 1 ? 'かくちゅうの たいせきは そこの めんせき × たかさ' : `${q.B} × ${q.h} を けいさん しよう`, 3);
    } else toast(ICON.HINT, q.hint || '1L は 1000cm³、1m³ は 1000000cm³', 3);
  });
  on(q$('next'), 'click', () => {
    sfx.tap(); ctx.hideHud();
    if (quiz.i < quiz.list.length - 1) { quiz.i++; show(); return; }
    clear();
    q$('nextRow').hidden = true; q$('q').hidden = true; q$('dotsRow').hidden = true; q$('pad').hidden = true; q$('choices').hidden = true; q$('result').hidden = false; q$('levelRow').hidden = false;
    const score = quiz.results.filter(r => r.correct).length;
    q$('stars').innerHTML = starsHTML(quiz.results, ICON); q$('score').textContent = `${quiz.list.length}もん中 ${score}もん せいかい`;
    ctx.log((opts.kind || 'volume') + '-done', { level: quiz.level, detail: { n: quiz.list.length, score } });
    ctx.done('tamesu');
    if (score === quiz.list.length) { sfx.good(); toast(ICON.HANAMARU, 'ぜんもん せいかい！', 3); } else ctx.say(`${quiz.list.length}もん中 ${score}もん せいかい`);
  });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.hideHud(); start(); });
  $$p(panel, '[data-level]').forEach(b => on(b, 'click', () => { sfx.tap(); quiz.level = b.dataset.level; ctx.hideHud(); start(); }));
  start();
  return {
    dispose: clear,
    test: {
      state: () => { const q = quiz.list[quiz.i]; return q && { phase: quiz.phase, type: q.type, ans: q.ans, a: q.a }; },
      auto() {
        const q = quiz.list[quiz.i]; if (!q) return { wait: 300 };
        if (!q$('result').hidden) return { done: true };
        if (quiz.phase === 'done') return { click: 'data-k=next|' };
        if (q.type === 'unit') return { clickNth: ['data-ch', q.order.indexOf(q.a)] };
        const want = String(q.ans), have = pad.value;
        if (have === want) return { click: 'data-key=ok|' };
        if (!want.startsWith(have)) return { click: 'data-key=del|' };
        return { click: `data-key=${want[have.length]}|` };
      },
    },
  };
}
