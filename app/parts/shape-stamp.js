// つくる（1年）：opts.mode
//  'stamp'：形を紙に押し当てると面の形が残る（箱→しかく、つつ→まる、ボール→点のような小さなまる）。写った形から元の形を当てる。
//  'town' ：箱・つつ・ボールを積んで、決められた形（タワー・はし）を作る。崩れるかどうかを動きで見せる。
import { S, THREE, tween, wait, alive, easeInOut, easeOutBounce, burst, fitBox, rayFrom, col, disposeObject, plainMaterial, labelSprite, paperTex, objScreen } from '../stage/stage.js';
import { byId, thingMesh, thingSVG, KIND_LABEL } from './_things.js';
import { shuffle } from '../core/text.js';
import { tok } from '../core/theme.js';
import { on, $p, $$p, hintDots } from './_common.js';

export function mount(ctx) { return ctx.opts.mode === 'town' ? town(ctx) : stamp(ctx); }

function stamp(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  const SET = ['tissue', 'can', 'ball'];
  let objs = [], items = {}, stamps = [], phase = 'stamp', busy = false, guess = null, gi = 0, score = 0;
  panel.innerHTML = `<div class="row" data-k="press">${SET.map(id => `<button class="stick" type="button" data-press="${id}">${thingSVG(byId(id))}${byId(id).label}</button>`).join('')}</div>
    <div class="q" data-k="q" hidden><span data-k="qTxt"></span></div>
    <div class="row" data-k="guess" hidden>${SET.map(id => `<button class="btn sub" type="button" data-guess="${id}">${thingSVG(byId(id))}${byId(id).label}</button>`).join('')}</div>
    <div class="row"><span class="status" data-k="st"></span><button class="btn" type="button" data-k="toGuess" hidden>あてっこ する</button><button class="btn small sub" type="button" data-k="again" hidden>${ICONS_UI.again}もういちど</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  const paper = add(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.01, 2.6), new THREE.MeshStandardMaterial({ color: col(tok('sheet-paper')), roughness: 0.95, map: paperTex })));
  paper.position.set(-0.6, 0.005, 0.2); paper.receiveShadow = true;
  const pad = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.2), plainMaterial(tok('sora')))); pad.position.set(3.2, 0.025, 0.2);
  SET.forEach((id, i) => { const m = add(thingMesh(byId(id))); m.position.set(-2.4 + i * 1.9, 0, -1.9); m.userData.home = m.position.clone(); items[id] = m; });
  fitBox(new THREE.Box3(new THREE.Vector3(-3.6, 0, -2.8), new THREE.Vector3(4.2, 1.2, 1.6)), 0.75, 0, 1.03);
  const slots = [[-2.3, 0.2], [-0.6, 0.2], [1.1, 0.2]];
  const status = () => { q$('st').innerHTML = phase === 'stamp' ? `うつした かたち <b>${stamps.length}</b> / 3` : phase === 'guess' ? `あたり <b>${score}</b> / 3` : ''; };
  caption('かたちを えらんで、かみに おしあてよう');
  status();
  async function press(id) {
    if (busy || phase !== 'stamp') return;
    if (stamps.some(s => s.id === id)) { toast('', 'その かたちは もう うつしたよ', 1.8); return; }
    busy = true; sfx.tap();
    const tag = S.token, m = items[id], t = m.userData.thing, slot = slots[stamps.length], p0 = m.position.clone();
    // インクを つけて、かみに おす
    const up = new THREE.Vector3(pad.position.x, 1.4, pad.position.z);
    await tween(0.6, k => { m.position.lerpVectors(p0, up, easeInOut(k)); }); if (!alive(tag)) return;
    await tween(0.2, k => { m.position.y = 1.4 - 1.35 * k; }); await tween(0.2, k => { m.position.y = 0.05 + 1.3 * k; }); if (!alive(tag)) return;
    const above = new THREE.Vector3(slot[0], 1.4, slot[1]);
    await tween(0.5, k => { m.position.lerpVectors(up, above, easeInOut(k)); }); if (!alive(tag)) return;
    await tween(0.22, k => { m.position.y = 1.4 - 1.4 * k * k; }); if (!alive(tag)) return;
    sfx.stamp();
    let g;
    if (t.kind === 'box') g = new THREE.PlaneGeometry(t.dims[0], t.dims[2]);
    else if (t.kind === 'tube') g = new THREE.CircleGeometry(t.r, 40);
    else g = new THREE.CircleGeometry(0.08, 24);
    const st = add(new THREE.Mesh(g, plainMaterial(tok('sora')))); st.rotation.x = -Math.PI / 2; st.position.set(slot[0], 0.012, slot[1]);
    stamps.push({ id, mesh: st, kind: t.kind });
    await tween(0.25, k => { m.position.y = 1.0 * k; }); await tween(0.5, k => { m.position.lerpVectors(new THREE.Vector3(slot[0], 1.0, slot[1]), m.userData.home, easeInOut(k)); }); if (!alive(tag)) return;
    m.position.copy(m.userData.home);
    toast('', t.kind === 'box' ? 'はこは しかくが うつった' : t.kind === 'tube' ? 'つつは まるが うつった' : 'ボールは ちいさな てんが うつった', 2.4);
    ctx.log('stamp', { detail: { thing: id, kind: t.kind } });
    busy = false; status();
    if (stamps.length === 3) { q$('toGuess').hidden = false; caption('うつった かたちから、もとの かたちを あてて みよう'); }
  }
  function nextGuess() {
    if (gi >= 3) { phase = 'end'; q$('guess').hidden = true; q$('q').hidden = true; q$('again').hidden = false; sfx.good(); toast(ICON.HANAMARU, `${score} / 3 あたり！`, 3); ctx.done('stamp'); status(); return; }
    guess = shuffle([...stamps])[0];
    stamps.forEach(s => { s.mesh.material.color.copy(col(s === guess ? tok('ok') : tok('line'))); });
    const text = 'あかい かたちは どれで うつした？'; q$('qTxt').textContent = text; ctx.say(text);
  }
  async function answer(id) {
    if (phase !== 'guess' || busy) return;
    busy = true;
    const ok = id === guess.id; if (ok) score++;
    if (ok) { sfx.good(); toast(ICON.HANAMARU, `あたり！ ${byId(id).label}`, 2); } else { sfx.bad(); toast(ICON.X, `ざんねん。${byId(guess.id).label} だよ`, 2.4); }
    const m = items[guess.id], h0 = m.position.clone();
    await tween(0.3, k => { m.position.y = h0.y + 0.5 * Math.sin(k * Math.PI); });
    ctx.log('stamp-guess', { correct: ok, detail: { thing: guess.id, said: id } });
    gi++; busy = false; status(); nextGuess();
  }
  $$p(panel, '[data-press]').forEach(b => on(b, 'click', () => press(b.dataset.press)));
  $$p(panel, '[data-guess]').forEach(b => on(b, 'click', () => answer(b.dataset.guess)));
  on(q$('toGuess'), 'click', () => { sfx.tap(); phase = 'guess'; gi = 0; score = 0; q$('toGuess').hidden = true; q$('press').hidden = true; q$('guess').hidden = false; q$('q').hidden = false; status(); nextGuess(); });
  on(q$('again'), 'click', () => { sfx.tap(); ctx.restart(); });
  return {
    onTap(e) { if (phase !== 'stamp') return; const h = rayFrom(e).intersectObjects(Object.values(items), true)[0]; if (!h) return; let o = h.object; while (o && !o.userData.thing) o = o.parent; if (o) press(o.userData.thing.id); },
    dispose() {},
    test: { auto() { if (busy) return { wait: 300 }; if (phase === 'end') return { done: true }; if (phase === 'guess') return { click: `data-guess=${guess.id}|` }; const id = SET.find(i => !stamps.some(s => s.id === i)); return id ? { click: `data-press=${id}|` } : { click: 'data-k=toGuess|' }; } },
  };
}

// つみきの まち：下から順に、決められた かたちを のせる
const DESIGNS = [
  { name: 'タワー', slots: [{ p: 'block', x: 0 }, { p: 'block', x: 0 }, { p: 'tube-up', x: 0 }, { p: 'block', x: 0 }] },
  { name: 'はし', slots: [{ p: 'tube-up', x: -0.75 }, { p: 'tube-up', x: 0.75 }, { p: 'snack', x: 0, on: [0, 1] }] },
  { name: 'もん', slots: [{ p: 'block', x: -0.7 }, { p: 'block', x: 0.7 }, { p: 'snack', x: 0, on: [0, 1] }, { p: 'tube-up', x: 0 }] },
];
const PIECE = { block: ['block', 'up'], snack: ['snack', 'up'], 'tube-up': ['can', 'up'], 'tube-side': ['can', 'side'], ball: ['ball', 'up'] };
const PLABEL = { block: 'はこ', snack: 'ながい はこ', 'tube-up': 'つつ（たて）', 'tube-side': 'つつ（よこ）', ball: 'ボール' };
const dmem = { i: 0 };
function town(ctx) {
  const { panel, sfx, toast, caption, ICON, ICONS_UI } = ctx;
  const D = DESIGNS[dmem.i % DESIGNS.length];
  let objs = [], placed = [], busy = false, miss = 0, done = false;
  panel.innerHTML = `<div class="tray">${Object.keys(PIECE).map(k => `<button class="stick" type="button" data-p="${k}">${thingSVG(byId(PIECE[k][0]))}${PLABEL[k]}</button>`).join('')}</div>
    <div class="row"><span class="status" data-k="st"></span><button class="btn small sub" type="button" data-k="shake" hidden>ゆらして みる</button><button class="btn small sub" type="button" data-k="next">${ICONS_UI.again}べつの かたち</button></div>`;
  const q$ = k => $p(panel, `[data-k="${k}"]`);
  const add = o => { S.stage.add(o); objs.push(o); return o; };
  // めあての かたち（うすい かげ）
  const ghosts = [], tops = [];
  D.slots.forEach((s, i) => {
    const m = thingMesh(byId(PIECE[s.p][0]), PIECE[s.p][1]);
    const y = s.on ? Math.max(...s.on.map(j => tops[j])) : (i > 0 && !D.slots[i].on && D.slots[i - 1].x === s.x ? tops[i - 1] : 0);
    m.position.set(s.x, y, -0.5); tops[i] = y + m.userData.height; m.userData.slotY = y;
    m.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(mt => { mt.transparent = true; mt.opacity = 0.22; mt.depthWrite = false; }); } });
    add(m); ghosts.push(m);
  });
  const H = Math.max(...tops);
  fitBox(new THREE.Box3(new THREE.Vector3(-2.2, 0, -1.6), new THREE.Vector3(2.2, H + 0.8, 0.6)), 0.9, 0.5, 1.2);
  const lab = add(labelSprite(D.name, { h: 0.4 })); lab.position.set(0, H + 0.5, -0.5);
  const status = () => { q$('st').innerHTML = done ? `「${D.name}」が できた！` : `のせた かず <b>${placed.length}</b> / ${D.slots.length}`; };
  caption(`うすい かげと おなじ かたちを したから じゅんに のせて「${D.name}」を つくろう`);
  status();
  async function put(k) {
    if (busy || done) return; busy = true;
    const tag = S.token, i = placed.length, s = D.slots[i], g = ghosts[i];
    const m = add(thingMesh(byId(PIECE[k][0]), PIECE[k][1]));
    m.position.set(s.x, g.userData.slotY + 2, -0.5);
    await tween(0.45, t => { m.position.y = g.userData.slotY + 2 * (1 - easeOutBounce(t)); }); if (!alive(tag)) return;
    sfx.land();
    if (k === s.p) {
      placed.push(m); sfx.pop(); g.visible = false;
      if (placed.length === D.slots.length) { done = true; sfx.good(); burst(new THREE.Vector3(0, H, -0.5)); toast(ICON.HANAMARU, `「${D.name}」が できた！`, 2.8); q$('shake').hidden = false; ctx.log('town', { correct: true, detail: { design: D.name, miss } }); ctx.done('town'); }
    } else {
      miss++;
      // まるい物は ころがって落ちる／形が違う物は くずれる
      const dir = i % 2 ? 1 : -1, x0 = m.position.x, y0 = m.position.y;
      await tween(0.8, t => { m.position.x = x0 + dir * 1.8 * t; m.position.y = Math.max(0, y0 * (1 - t * t)); m.rotation.z = -dir * 1.6 * t; }); if (!alive(tag)) return;
      sfx.bad(); toast(ICON.X, (k === 'ball' || k === 'tube-side') ? 'まるい ところが したに なって ころがって おちちゃった' : 'かげと かたちが ちがうよ', 2.6);
      setTimeout(() => { if (m.parent) { S.stage.remove(m); disposeObject(m); } }, 600);
      ctx.log('stack', { correct: false, detail: { piece: k, on: 'town' } });
    }
    busy = false; status();
  }
  $$p(panel, '[data-p]').forEach(b => on(b, 'click', () => { sfx.tap(); put(b.dataset.p); }));
  on(q$('shake'), 'click', async () => {
    if (busy) return; busy = true; sfx.swish(0.6);
    await tween(1.0, k => placed.forEach((m, i) => { m.rotation.z = Math.sin(k * Math.PI * 8) * 0.04 * (1 - k); }));
    toast(ICON.HANAMARU, 'ゆらしても くずれない じょうぶな かたち！', 2.6); busy = false;
  });
  on(q$('next'), 'click', () => { sfx.tap(); dmem.i++; ctx.restart(); });
  return { dispose() {}, test: { auto() { if (busy) return { wait: 300 }; if (done) return { done: true }; if (!this._wrong) { this._wrong = 1; return { click: 'data-p=ball|' }; } return { click: `data-p=${D.slots[placed.length].p}|` }; } } };
}
